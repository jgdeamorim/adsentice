
// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/discovery-search
// Bridge: client → EVO-API MCP :7700 → DataForSEO LIVE
// L0 search ($0.015) + L1 enrichment ($0.0054/lead top N) +
// Scoring + 3-layer persistence (Supabase + Redis + Memory)
// ══════════════════════════════════════════════════════════════════

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { businessListingsSearch, businessProfileGmb, onPageInstantAudit, domainTechnologies, extractDomain, parseWebsiteContacts } from "@/lib/provider-core-adapter"
import {
  getCached, setCache, trackCost, persistResults, getPersistedResults,
  getCostToday, getCostTotal, getCostLast,
} from "@/lib/discovery-cache"
import type { ScoringInput, ScoreData, ScoreDistribution } from "@/lib/scoring"
import { scoreLeads, computeDistribution, detectContactMethods } from "@/lib/scoring"
import { saveDiscoverySearch } from "@/lib/discovery-persistence"
import { scoreContentGap, generateContentGapRecommendations } from "@/lib/content-gap"
import { vaultWriteBatch } from "@/lib/r2-vault"
import { appendMarketHolds } from "@/lib/provider-core-adapter"
import { pushEvent } from "@/lib/telemetry"
import { getAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** L1: Enrich ALL leads with full 27-field GMB profiles ($0.0054/lead). */
async function enrichTopLeads(
  listings: any[],
  scores: ScoreData[],
  maxEnrich: number = 50
): Promise<{ enrichedListings: any[]; enrichedScores: ScoreData[]; enrichmentCost: number }> {
  const enrichedListings = [...listings]
  const enrichedScores = [...scores]

  // Prioriza por score mas enriquece TODOS que têm title
  const toEnrich = listings
    .map((l, i) => ({ listing: l, score: scores[i], index: i }))
    .filter(({ listing }) => !!listing.title)
    .sort((a, b) => b.score.compound - a.score.compound)
    .slice(0, maxEnrich)

  // DataForSEO limits: 2000 req/min, max 30 simultaneous, 20 tasks/POST, max 5 same-domain URLs
  // Strategy: batch 20 tasks per POST (API limit), cap concurrency at 30
  const CONCURRENCY = 50  // DataForSEO allows 30 concurrent; we batch via POST tasks
  let enrichmentCost = 0

  const results = await Promise.allSettled(
    toEnrich.slice(0, CONCURRENCY).map(async ({ listing, index }) => {
      const profile = await businessProfileGmb({
        keyword: listing.title,
        location_code: 2076,
        language_code: "pt",
      })
      return { profile, listing, index }
    })
  )

  for (const r of results) {
    if (r.status === 'rejected') { continue }
    const { profile, listing, index } = r.value
    if (!profile || !profile.place_id) continue
    enrichmentCost += 0.0054

    const enriched: any = {
      ...listing,
      phone: profile.phone || listing.phone,
      website: profile.website,
      total_photos: profile.total_photos,
      description: profile.description,
      business_status: profile.business_status,
      main_image: profile.main_image,
      city: profile.city || listing.city,
      categories: profile.categories,
      price_level: profile.price_level,
      district: profile.district,
      postal_code: profile.postal_code,
      country_code: profile.country_code,
      types: profile.types,
    }

    const input: ScoringInput = {
      title: enriched.title, category: enriched.category,
      categories: enriched.categories, address: enriched.address,
      rating_value: enriched.rating_value, rating_votes: enriched.rating_votes,
      place_id: enriched.place_id, cid: enriched.cid,
      latitude: enriched.latitude, longitude: enriched.longitude,
      is_claimed: enriched.is_claimed, phone: enriched.phone,
      website: enriched.website, total_photos: enriched.total_photos,
      description: enriched.description, business_status: enriched.business_status,
    }

    const newScores = scoreLeads([input])
    enriched.contact_methods = detectContactMethods(input)
    enriched.enrichment_level = 1
    enrichedListings[index] = enriched
    enrichedScores[index] = newScores[0]
  }

  console.log(`[enrichment] L1: ${toEnrich.length} leads enriched, cost $${enrichmentCost.toFixed(4)}`)
  return { enrichedListings, enrichedScores, enrichmentCost }
}

// ── L2: Website & SEO técnico (ADR-0024) ──
// on_page_instant_audit + domain_technologies. $0.010125/lead.
// Puramente SEO: onpage score, meta tags, CMS, analytics, word count.
// Redes sociais e contatos foram extraídos para L3.

async function enrichTopLeadsL2(
  listings: any[],
  scores: ScoreData[],
  maxEnrich: number = 30
): Promise<{ l2EnrichedListings: any[]; l2EnrichedScores: ScoreData[]; l2Cost: number }> {
  const l2EnrichedListings = [...listings]
  const l2EnrichedScores = [...scores]

  const toEnrich = listings
    .map((l, i) => ({ listing: l, score: scores[i], index: i }))
    .filter(({ listing }) => !!listing.website)
    .sort((a, b) => b.score.compound - a.score.compound)
    .slice(0, maxEnrich)

  if (toEnrich.length === 0) return { l2EnrichedListings, l2EnrichedScores, l2Cost: 0 }

  let l2Cost = 0
  // 🔥 Parallelize ALL (50 at once — DataForSEO handles concurrency)
  const results = await Promise.allSettled(
    toEnrich.map(async ({ listing, index }) => {
      const domain = extractDomain(listing.website)
      const cacheKey = `l2:audit:${domain || listing.website}`
      // Try Redis cache first (website audits don't change frequently)
      let cachedAudit: any = null; let cachedTech: any = null
      try {
        const { execSync } = await import("child_process")
        const cached = execSync(`redis-cli -p 6396 --no-auth-warning GET "${cacheKey}"`, { timeout: 1000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
        if (cached && cached !== "") {
          const parsed = JSON.parse(cached)
          cachedAudit = parsed.audit; cachedTech = parsed.tech
        }
      } catch {}

      if (cachedAudit && cachedTech) {
        return { audit: cachedAudit, tech: cachedTech, listing, index, domain, fromCache: true }
      }

      const [audit, tech] = await Promise.allSettled([
        onPageInstantAudit(listing.website),
        domain ? domainTechnologies(domain) : Promise.resolve(null),
      ])

      const auditResult = audit.status === "fulfilled" ? audit.value : null
      const techResult = tech.status === "fulfilled" ? tech.value : null

      // Cache for 30 days (TTL 2592000s)
      if (auditResult) {
        try {
          const { execSync } = await import("child_process")
          execSync(`redis-cli -p 6396 --no-auth-warning SETEX "${cacheKey}" 2592000 '${JSON.stringify({audit: auditResult, tech: techResult}).replace(/'/g, "'\\''")}'`, { timeout: 1000, stdio: "ignore" })
        } catch {}
      }

      return { audit: auditResult, tech: techResult, listing, index, domain, fromCache: false }
    })
  )

  for (const r of results) {
      if (r.status === "rejected") continue
      const { audit, tech, listing, index } = r.value
      if (!audit) continue

      const costPerLead = 0.000125 + (tech ? 0.01 : 0)
      l2Cost += costPerLead

      const l2_https = listing.website?.startsWith("https") ?? false
      const hasAnalytics = tech ? !!(tech.technologies?.marketing?.analytics?.length || tech.technologies?.advertising?.analytics?.length) : null
      const cmsName: string | null = (() => { const cms = tech?.technologies?.content?.cms || tech?.technologies?.cms; return Array.isArray(cms) && cms.length > 0 ? cms[0] : null })()
      const techCategories = tech ? Object.keys(tech.technologies || {}).filter(k => Object.keys(tech.technologies[k] || {}).length > 0) : null

      const enriched: any = {
        ...listing,
        l2_onpage_score: audit.onpage_score,
        l2_meta_title: audit.meta?.title || null,
        l2_meta_description: audit.meta?.description || null,
        l2_word_count: audit.content?.word_count || 0,
        l2_internal_links_count: audit.content?.internal_links_count || 0,
        l2_external_links_count: audit.content?.external_links_count || 0,
        l2_images_count: audit.content?.images_count || 0,
        l2_seo_checks: audit.checks,
        l2_cms: cmsName,
        l2_has_analytics: hasAnalytics,
        l2_technology_categories: techCategories,
        l2_domain_rank: tech?.domain_rank || null,
        l2_country_iso_code: tech?.country_iso_code || null,
        l2_enriched_at: new Date().toISOString(),
        l2_cost_usd: (listing.l2_cost_usd || 0) + costPerLead,
        enrichment_level: 2,
      }

      const input: ScoringInput = {
        title: enriched.title, category: enriched.category,
        categories: enriched.categories || enriched.categories_arr,
        address: enriched.address,
        rating_value: enriched.rating_value, rating_votes: enriched.rating_votes,
        place_id: enriched.place_id, cid: enriched.cid,
        latitude: enriched.latitude, longitude: enriched.longitude,
        is_claimed: enriched.is_claimed,
        phone: enriched.phone, website: enriched.website,
        total_photos: enriched.total_photos, description: enriched.description,
        business_status: enriched.business_status,
        l2_onpage_score: audit.onpage_score,
        l2_https,
        l2_has_title: !!audit.meta?.title,
        l2_has_description: !!audit.meta?.description,
        l2_has_analytics: hasAnalytics ?? null,
        l2_cms: cmsName,
        l2_word_count: audit.content?.word_count ?? null,
        l2_internal_links_count: audit.content?.internal_links_count ?? null,
        l2_external_links_count: audit.content?.external_links_count ?? null,
        l2_images_count: audit.content?.images_count ?? null,
        l2_seo_checks: audit.checks || null,
        l2_domain_rank: tech?.domain_rank || null,
      }

      const newScores = scoreLeads([input])
      l2EnrichedListings[index] = enriched
      l2EnrichedScores[index] = newScores[0]
  }

  console.log(`[enrichment] L2: ${toEnrich.length} leads with website enriched, cost $${l2Cost.toFixed(4)}`)
  return { l2EnrichedListings, l2EnrichedScores, l2Cost }
}

// ── L3: Social & Contacts (ADR-0024) ──
// parseWebsiteContacts + domain_technologies phone/email merge. $0.0005/content_parsing.
// Extrai redes sociais (Instagram, Facebook, WhatsApp, etc.), emails e telefones
// do HTML do website. WhatsApp é campo SEPARADO (l3_whatsapp), não misturado com phone.
// Preenche gaps do GMB (phone, email ausentes).

async function enrichTopLeadsL3(
  listings: any[],
  scores: ScoreData[],
  maxEnrich: number = 30
): Promise<{ l3EnrichedListings: any[]; l3EnrichedScores: ScoreData[]; l3Cost: number }> {
  const l3EnrichedListings = [...listings]
  const l3EnrichedScores = [...scores]

  const toEnrich = listings
    .map((l, i) => ({ listing: l, score: scores[i], index: i }))
    .filter(({ listing }) => !!listing.website)
    .sort((a, b) => b.score.compound - a.score.compound)
    .slice(0, maxEnrich)

  if (toEnrich.length === 0) return { l3EnrichedListings, l3EnrichedScores, l3Cost: 0 }

  let l3Cost = 0
  // 🔥 Parallelize ALL + reuse L2 cache for domain_technologies
  const results = await Promise.allSettled(
    toEnrich.map(async ({ listing, index }) => {
      const domain = extractDomain(listing.website)
      const l2CacheKey = `l2:audit:${domain || listing.website}`

      // Try Redis cache (same key as L2 — domain_technologies already cached)
      let cachedTech: any = null
      try {
        const { execSync } = await import("child_process")
        const cached = execSync(`redis-cli -p 6396 --no-auth-warning GET "${l2CacheKey}"`, { timeout: 1000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
        if (cached && cached !== "") {
          cachedTech = JSON.parse(cached).tech
        }
      } catch {}

      const [tech, contacts] = await Promise.allSettled([
        cachedTech ? Promise.resolve(cachedTech) : (domain ? domainTechnologies(domain) : Promise.resolve(null)),
        parseWebsiteContacts(listing.website),
      ])
      return { tech: tech.status === "fulfilled" ? tech.value : null, contacts: contacts.status === "fulfilled" ? contacts.value : null, listing, index, fromCache: !!cachedTech }
    })
  )

  for (const r of results) {
      if (r.status === "rejected") continue
      const { tech, contacts, listing, index } = r.value

      // ── Phone (voz/fixo): prioridade GMB → domain tech → content parsing ──
      let mergedPhone = listing.phone  // GMB phone (L1) — primeira prioridade
      let mergedWhatsApp: string | null = null
      let mergedEmails: string[] = []
      let mergedSocials: { platform: string; url: string }[] = []

      if (tech) {
        const techPhones = (tech.phone_numbers || []).filter((p: string) => p.length >= 10)
        const techEmails = tech.emails || []
        // Só preenche phone se GMB não tem
        if (!mergedPhone && techPhones.length > 0) mergedPhone = techPhones[0]
        mergedEmails.push(...techEmails)
      }

      if (contacts) {
        mergedSocials.push(...contacts.social_links)
        for (const e of contacts.emails) { if (!mergedEmails.includes(e)) mergedEmails.push(e) }
        // WhatsApp: campo SEPARADO (não joga no phone)
        if (contacts.whatsapp_numbers.length > 0) {
          mergedWhatsApp = contacts.whatsapp_numbers[0]
        }
        // Phone (voz/fixo): só do content_parsing.phones, NÃO do whatsapp_numbers
        if (!mergedPhone && contacts.phones.length > 0) {
          mergedPhone = contacts.phones[0]
        }
      }

      mergedEmails = [...new Set(mergedEmails)].slice(0, 5)
      mergedSocials = mergedSocials.slice(0, 10)

      const costPerLead = (tech ? 0.01 : 0) + (contacts ? 0.0005 : 0)
      l3Cost += costPerLead

      const enriched: any = {
        ...listing,
        l3_emails: mergedEmails.length > 0 ? mergedEmails : null,
        l3_social_links: mergedSocials.length > 0 ? mergedSocials : null,
        l3_whatsapp: mergedWhatsApp,  // campo SEPARADO de phone
        phone: mergedPhone || listing.phone,
        enrichment_level: Math.max(listing.enrichment_level || 0, 3),
      }

      l3EnrichedListings[index] = enriched
  }

  console.log(`[enrichment] L3: ${toEnrich.length} leads crawled for social/contacts, cost $${l3Cost.toFixed(4)}`)
  return { l3EnrichedListings, l3EnrichedScores, l3Cost }
}

// ── L4: Market Context (ADR-0024) ──
// IBGE panorama + income via Supabase. $0/lead.
// Enriquece TODOS os leads com PIB per capita, renda média, densidade,
// população do município onde o negócio está localizado.

async function enrichTopLeadsL4(
  listings: any[],
  scores: ScoreData[],
): Promise<{ l4EnrichedListings: any[]; l4EnrichedScores: ScoreData[]; l4Cost: number }> {
  const l4EnrichedListings = [...listings]
  const l4EnrichedScores = [...scores]

  // Build city→IBGE cache (1 query, não N queries)
  const citySet = new Set<string>()
  for (const l of listings) { if (l.city) citySet.add(l.city.toLowerCase().trim()) }

  let ibgeByCity: Record<string, any> = {}
  try {
    const supabase = getAdminClient()
    const { data: panoramaRows } = await supabase.from("ibge_panorama").select("municipio_nome,populacao,pib_per_capita,densidade_demografica,uf").limit(500)
    if (panoramaRows) {
      for (const r of panoramaRows) {
        ibgeByCity[r.municipio_nome?.toLowerCase()?.trim()] = r
      }
    }

    // Income by UF
    const { data: incomeRows } = await supabase.from("ibge_income").select("uf,avg_household_income").limit(30)
    const incomeByUf: Record<string, number> = {}
    if (incomeRows) { for (const r of incomeRows) incomeByUf[r.uf] = r.avg_household_income }

    // Enrich each listing
    for (let i = 0; i < listings.length; i++) {
      const l = listings[i]
      if (!l.city) continue
      const key = l.city.toLowerCase().trim()
      const ibge = ibgeByCity[key]

      if (ibge) {
        const enriched: any = {
          ...l,
          l4_ibge_populacao: ibge.populacao || null,
          l4_ibge_pib_per_capita: ibge.pib_per_capita || null,
          l4_ibge_densidade: ibge.densidade_demografica || null,
          l4_ibge_renda_media: ibge.uf ? (incomeByUf[ibge.uf] || null) : null,
        }
        l4EnrichedListings[i] = enriched
      }
    }
  } catch (e: any) { console.warn("[enrichment] L4 IBGE offline:", e.message) }

  console.log(`[enrichment] L4: IBGE context enriched for ${Object.keys(ibgeByCity).length} cities ($0)`)
  return { l4EnrichedListings, l4EnrichedScores, l4Cost: 0 }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { categories, lat, lng, radiusKm, limit, force, enrich, order_by, offset, filters } = body

  if (!categories?.length) {
    return NextResponse.json({ error: "categories required" }, { status: 400 })
  }

  const cacheKey = `discovery:${categories.sort().join(',')}:${lat}:${lng}:${radiusKm}`

  // ═══ CACHE CHECK ═══
  if (!force) {
    const cached = getCached(cacheKey) || getPersistedResults(cacheKey)

    if (cached) {
      return NextResponse.json({ ...(cached as object), fromCache: true, costToday: getCostToday(), costTotal: getCostTotal() })
    }
  }

  // ═══ L0: LIVE SEARCH ($0.015) ═══
  let t0 = Date.now()
  try {
    // Direct fetch — bypass adapter singleton issues
    const login = process.env.DATAFORSEO_LOGIN || ""
    const password = process.env.DATAFORSEO_PASSWORD || ""
    const dfAuth = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`
    const dfCoord = `${(lat || -23.5505).toFixed(4)},${(lng || -46.6333).toFixed(4)},${radiusKm || 10}`
    const dfBody = JSON.stringify([{ categories, location_coordinate: dfCoord, language_code: "pt", limit: limit || 50 }])

    const dfRes = await fetch("https://api.dataforseo.com/v3/business_data/business_listings/search/live", {
      method: "POST",
      headers: { Authorization: dfAuth, "Content-Type": "application/json" },
      body: dfBody,
    })

    if (!dfRes.ok) {
      const errText = await dfRes.text().catch(() => "")
      throw new Error(`DataForSEO HTTP ${dfRes.status}: ${errText.slice(0, 300)}`)
    }

    const dfData = await dfRes.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[], items_count?: number }> }> }
    const items = (dfData.tasks?.[0]?.result?.[0]?.items || []).map((item: Record<string, unknown>) => {
      const rating = (item.rating || {}) as Record<string, unknown>
      const addrInfo = (item.address_info || {}) as Record<string, unknown>
      return {
        title: (item.title as string) || null,
        category: (item.category as string) || null,
        address: (item.address as string) || null,
        rating_value: (rating.value as number) ?? null,
        rating_votes: (rating.votes_count as number) ?? null,
        place_id: (item.place_id as string) || null,
        cid: (item.cid as string) || null,
        latitude: (item.latitude as number) ?? null,
        longitude: (item.longitude as number) ?? null,
        is_claimed: (item.is_claimed as boolean) ?? null,
        // Extra fields from address_info (L0 já tem borough e city!)
        city: (addrInfo.city as string) || null,
        district: (addrInfo.borough as string) || null,
        website: (item.url as string) || null,
      }
    })

    const totalCount = dfData.tasks?.[0]?.result?.[0]?.items_count || items.length
    const result = { total_count: totalCount, listings: items, cost_usd: 0.015 }

    const l0Latency = Date.now() - t0
    console.log(`[discovery:L0:inline] ${result.listings.length}/${totalCount} listings in ${l0Latency}ms, first: ${result.listings[0]?.title?.slice(0,40)}`)
    pushEvent({ route: "/api/discovery-search", status: 200, latency_ms: l0Latency, provider: "DataForSEO", detail: `${result.listings.length}/${totalCount} listings` })

    const searchCost = result.cost_usd || 0

    // Track cost
    trackCost({
      categories, lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10,
      costUsd: searchCost, totalCount: result.total_count,
    })

    // ═══ L0 SCORING (11-field search results) ═══
    let scores: ScoreData[] = scoreLeads(result.listings)
    let listings = result.listings
    let enrichmentCost = 0
    let enrichedCount = 0
    console.log(`[discovery] L0: ${listings.length} listings, first score: ${scores[0]?.compound ?? 'none'}, first listing: ${listings[0]?.title?.slice(0,40)}`)
    let l2Cost = 0
    let l3Cost = 0

    // ═══ L1: ENRICHMENT (27-field GMB profile, $0.0054/lead, ALL 50) ═══
    const shouldEnrich = enrich || force

    if (shouldEnrich) {
      const enriched = await enrichTopLeads(listings, scores, 50)

      listings = enriched.enrichedListings
      scores = enriched.enrichedScores
      enrichmentCost = enriched.enrichmentCost
      enrichedCount = listings.filter((l: any) => l.phone || l.website || l.total_photos != null).length

      if (enrichmentCost > 0) {
        trackCost({
          categories: [...categories, "L1_enrichment"],
          lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10,
          costUsd: enrichmentCost, totalCount: 50,
        })
      }

      // ═══ L2: WEBSITE & SEO TÉCNICO (ADR-0024 · $0.010125/lead, ALL com website) ═══
      if (enrichedCount > 0) {
        const l2Result = await enrichTopLeadsL2(listings, scores, 30)
        listings = l2Result.l2EnrichedListings
        scores = l2Result.l2EnrichedScores
        l2Cost = l2Result.l2Cost
        if (l2Cost > 0) { trackCost({ categories: [...categories, "L2_enrichment"], lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10, costUsd: l2Cost, totalCount: 30 }) }
      }

      // ═══ L3: SOCIAL & CONTACTS (ADR-0024 · $0.0005/lead) ═══
      if (enrichedCount > 0) {
        const l3Result = await enrichTopLeadsL3(listings, scores, 30)
        listings = l3Result.l3EnrichedListings
        scores = l3Result.l3EnrichedScores
        l3Cost = l3Result.l3Cost
        if (l3Cost > 0) { trackCost({ categories: [...categories, "L3_social"], lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10, costUsd: l3Cost, totalCount: 30 }) }
      }

      // ═══ L4: IBGE MARKET CONTEXT (ADR-0024 · $0/lead) ═══
      const l4Result = await enrichTopLeadsL4(listings, scores)
      listings = l4Result.l4EnrichedListings
      scores = l4Result.l4EnrichedScores
    }

    // ═══ FINAL SCORING + DISTRIBUTION ═══
    const distribution: ScoreDistribution = computeDistribution(scores)

    // Persist score stats to Redis for admin dashboard (fast cache, 24h TTL)
    try {
      const { execSync } = await import("child_process")

      const statsJson = JSON.stringify({
        total: listings.length,
        regionalTotal: result.total_count,
        enrichedCount,
        enrichmentCost,
        l2Cost,
        l2EnrichedCount: listings.filter((l: any) => l.enrichment_level >= 2).length,
        l3EnrichedCount: listings.filter((l: any) => l.enrichment_level >= 3).length,
        avgScore: distribution.avgScore,
        unaware: distribution.unaware, problemAware: distribution.problemAware,
        solutionAware: distribution.solutionAware, productAware: distribution.productAware,
        mostAware: distribution.mostAware,
      })

      execSync(`redis-cli -p 6396 --no-auth-warning SETEX adsentice:discovery:last_score_stats 86400 '${statsJson.replace(/'/g, "'\\''")}'`, { timeout: 2000, stdio: "ignore" })
    } catch { /* Redis offline — degrade gracefully */ }

    // ═══ SUPABASE PERSISTENCE (durável — dados pagos NUNCA perdidos) ═══
    // Compute contact_methods + content gap for ALL listings before saving
    // Attach scores + contact_methods + content_gap to listings IN-PLACE (no .map)
    const enrichedListings: any[] = []
    for (let i = 0; i < listings.length; i++) {
      const l: any = listings[i]
      const input: ScoringInput = {
        title: l.title, category: l.category, address: l.address,
        rating_value: l.rating_value, rating_votes: l.rating_votes,
        place_id: l.place_id, cid: l.cid, latitude: l.latitude, longitude: l.longitude,
        is_claimed: l.is_claimed, phone: l.phone, website: l.website,
        total_photos: l.total_photos, description: l.description,
        business_status: l.business_status,
        // L2 fields for content gap analysis
        l2_onpage_score: l.l2_onpage_score,
        l2_https: l.website?.startsWith("https") ?? null,
        l2_has_title: !!l.l2_meta_title,
        l2_has_description: !!l.l2_meta_description,
        l2_has_analytics: l.l2_has_analytics ?? null,
        l2_cms: l.l2_cms || null,
        l2_word_count: l.l2_word_count ?? null,
        l2_internal_links_count: l.l2_internal_links_count ?? null,
        l2_external_links_count: l.l2_external_links_count ?? null,
        l2_seo_checks: l.l2_seo_checks || null,
      }

      const enrichLevel = l.enrichment_level >= 2 ? 2
        : (l.website || l.phone || l.total_photos != null) ? 1 : 0

      // Compute content gap for L2-enriched leads
      const contentGap = l.enrichment_level >= 2 ? scoreContentGap(input) : null
      const l2_content_maturity = contentGap?.maturity?.level ?? null
      const l2_content_gaps = contentGap ? {
        maturity_score: contentGap.maturityScore,
        pain_score: contentGap.painScore,
        level: contentGap.maturity.level,
        label: contentGap.maturity.label,
        gaps: contentGap.gapsDetected,
        recommendations: generateContentGapRecommendations(input, contentGap),
      } : null

      // Mutate in-place (like L4 does — preserves all existing fields)
      l.score = scores[i]
      l.contact_methods = detectContactMethods(input)
      l.l2_content_maturity = l2_content_maturity
      l.l2_content_gaps = l2_content_gaps
      enrichedListings.push(l)
    }

    const payload = {
      ...result,  // total_count, cost_usd
      listings,   // enriched listings (sobrescreve result.listings)
      scores, distribution,
      enrichedCount, enrichmentCost, l2Cost, l3Cost,
      l2EnrichedCount: listings.filter((l: any) => l.enrichment_level >= 2).length,
      l3EnrichedCount: listings.filter((l: any) => l.enrichment_level >= 3).length,
      totalCost: searchCost + enrichmentCost + l2Cost + l3Cost,
      fromCache: false,
      costToday: getCostToday(), costTotal: getCostTotal(), costLast: getCostLast(),
    }

    // ═══ 3-LAYER PERSISTENCE (dados pagos NUNCA são perdidos) ═══
    // Layer 1: REDIS CONTINGENCY (imediato ~1ms, TTL 7 dias)
    // Guarda payload COMPLETO — se Supabase/R2 falharem, recupera daqui
    setCache(cacheKey, payload)
    persistResults(cacheKey, payload)

    // Layer 2: R2 VAULT (write-ahead blob — imutável, ~500ms)
    // Se Supabase falhar, o blob no R2 é a verdade. Restaurável.
    const searchIdForVault = `search_${Date.now().toString(36)}`
    try {
      const r2Result = await vaultWriteBatch(searchIdForVault, listings)
      if (r2Result.succeeded > 0) console.log(`[r2-vault] ${r2Result.succeeded}/${r2Result.attempted} blobs saved`)
    } catch { /* R2 offline — Redis já tem o payload */ }

    // Layer 3: SUPABASE (durável, ~2s)
    // Fonte primária de verdade. Se falhar, Redis e R2 são fallback.
    const saved = await saveDiscoverySearch({
      categories,
      lat: lat || -23.55,
      lng: lng || -46.63,
      radiusKm: radiusKm || 10,
      totalCount: result.total_count,
      costUsd: searchCost + enrichmentCost + l2Cost + l3Cost,
      listings: listings,
      distribution,
    }).catch((err) => {
      console.error("[persistence] Supabase FAILED — dados salvos no Redis (7d) + R2:", err.message)
      return null
    })
    if (saved) {
      // Market holds — time-series snapshot a cada busca
      if (categories.length === 1) {
        const cat = categories[0].toLowerCase().replace(/\s+/g, "_")
        const cityCounts = new Map<string, number>()
        for (const l of listings) {
          const c = (l as any).city
          if (c) cityCounts.set(c, (cityCounts.get(c) || 0) + 1)
        }
        const city = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Brasil"
        appendMarketHolds([
          { category: cat, city, metric: "avg_score", value: distribution.avgScore, searchId: saved?.searchId },
          { category: cat, city, metric: "total_businesses", value: result.total_count, searchId: saved?.searchId },
          { category: cat, city, metric: "claimed_pct", value: listings.filter((l: any) => l.is_claimed).length / Math.max(listings.length, 1) * 100, searchId: saved?.searchId },
        ]).catch(() => {})
      }

      for (let i = 0; i < listings.length; i++) {
        (listings[i] as any).l2_content_maturity = enrichedListings[i].l2_content_maturity
        ;(listings[i] as any).l2_content_gaps = enrichedListings[i].l2_content_gaps
      }

      console.log(`[discovery-persistence] Saved ${saved.savedCount} listings to Supabase (search ${saved.searchId})`)
    } else {
      console.log("[discovery-persistence] ⚠️ Supabase offline — dados salvos no Redis (7d) + R2 vault")
    }

    return NextResponse.json(payload)
  } catch (e: any) {
    const errLatency = Date.now() - t0
    pushEvent({ route: "/api/discovery-search", status: 500, latency_ms: errLatency, provider: "DataForSEO", error: e.message, detail: String(e.stack).slice(0, 500) })
    return NextResponse.json(
      { error: e.message || "DataForSEO API unavailable" },
      { status: 500 }
    )
  }
}
