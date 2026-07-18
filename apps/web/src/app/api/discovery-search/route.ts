
// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/discovery-search
// Bridge: client → EVO-API MCP :7700 → DataForSEO LIVE
// L0 search ($0.015) + L1 enrichment ($0.0054/lead top N) +
// Scoring + 3-layer persistence (Supabase + Redis + Memory)
// ══════════════════════════════════════════════════════════════════

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { businessListingsSearch, businessProfileGmb, businessProfileGmbBatch, onPageInstantAudit, domainTechnologies, extractDomain, parseWebsiteContacts , appendMarketHolds } from "@/lib/provider-core-adapter"
import {
  getCached, setCache, trackCost, persistResults, getPersistedResults,
  getCostToday, getCostTotal, getCostLast,
} from "@/lib/discovery-cache"
import type { ScoringInput, ScoreData, ScoreDistribution } from "@/lib/scoring"
import { scoreLeads, computeDistribution, detectContactMethods } from "@/lib/scoring"
import { saveDiscoverySearch } from "@/lib/discovery-persistence"
import { scoreContentGap, generateContentGapRecommendations } from "@/lib/content-gap"
import { reverseGeocode } from "@/lib/geo-resolver"
import { vaultWriteBatch } from "@/lib/r2-vault"
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

  // 🔥 BATCH L1: 1 POST com até 100 keywords (doc DataForSEO: max 100 tasks/POST)
  // Antes: 50 chamadas individuais (~8s). Agora: 1 chamada HTTP (~1s)
  const keywords = toEnrich.map(e => e.listing.title)
  const batchResult = await businessProfileGmbBatch(keywords)
  const profiles = batchResult.profiles
  const enrichmentCost = batchResult.cost_usd  // custo REAL da API, não hardcoded

  for (let i = 0; i < toEnrich.length; i++) {
    const { listing, index } = toEnrich[i]
    const profile = profiles[i]

    if (!profile || !profile.place_id) continue

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

  const actualEnriched = enrichedListings.filter((l: any) => (l.enrichment_level || 0) >= 1).length

  console.log(`[enrichment] L1: ${actualEnriched}/${toEnrich.length} leads enriched (1 POST batch), cost $${enrichmentCost.toFixed(4)}`)
  
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
    .filter(({ listing }) => !!listing.website && (listing.enrichment_level || 0) < 2)  // não re-pagar já-L2 (fix v089)
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

      if (cachedAudit) {
        // tech null é resultado LEGÍTIMO (domínio sem dados) — exigir ambos re-pagava o audit p/ sempre (fix v089)
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

      // fromCache = $0 (já pago em rodada anterior — fix v089: custo contava cache como novo)
      const costPerLead = r.value.fromCache ? 0 : 0.000125 + (tech ? 0.01 : 0)

      l2Cost += costPerLead

      const l2_https = listing.website?.startsWith("https") ?? false
      const hasAnalytics = tech ? !!(tech.technologies?.marketing?.analytics?.length || tech.technologies?.advertising?.analytics?.length) : null

      const cmsName: string | null = (() => { const cms = tech?.technologies?.content?.cms || tech?.technologies?.cms;

 

return Array.isArray(cms) && cms.length > 0 ? cms[0] : null })()

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
    .filter(({ listing }) => !!listing.website && (listing.enrichment_level || 0) < 3)  // não re-pagar já-L3 (fix v089)
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

      // tech do cache L2 = $0 (a promessa "20× mais barato" — fix v089)
      const costPerLead = (tech && !r.value.fromCache ? 0.01 : 0) + (contacts ? 0.0005 : 0)

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

  const ibgeByCity: Record<string, any> = {}

  try {
    const supabase = getAdminClient()
    const { data: panoramaRows } = await supabase.from("ibge_panorama").select("municipio_nome,populacao,pib_per_capita,densidade_demografica,uf").limit(500)

    if (panoramaRows) {
      for (const r of panoramaRows as any[]) {
        ibgeByCity[r.municipio_nome?.toLowerCase()?.trim()] = r
      }
    }

    // Income by UF
    const { data: incomeRows } = await supabase.from("ibge_income").select("uf,avg_household_income").limit(30)
    const incomeByUf: Record<string, number> = {}

    if (incomeRows) { for (const r of incomeRows as any[]) incomeByUf[r.uf] = r.avg_household_income }

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
  const { categories, lat, lng, radiusKm, limit, force, enrich, paginate, offset: bodyOffset, batchId, preflight, layers: bodyLayers, city: bodyCity } = body
  const shouldPaginate = paginate !== false  // default true — paginate all pages
  const startOffset = bodyOffset || 0       // 0 on first request, N on "Continuar"

  // ═══ LAYERS: seleção livre L0-L4 (retrocompat: sem body.layers = comportamento legado) ═══
  const layers = {
    l0: bodyLayers ? bodyLayers.l0 !== false : true,
    l1: bodyLayers ? bodyLayers.l1 === true : !!(enrich || force),
    l2: bodyLayers?.l2 === true,
    l3: bodyLayers?.l3 === true,
    l4: bodyLayers ? bodyLayers.l4 !== false : true,
  }

  if (!categories?.length) {
    return NextResponse.json({ error: "categories required" }, { status: 400 })
  }

  // ═══ MODO RE-ENRICH (layers.l0=false): enriquece leads JÁ EXISTENTES no Supabase ═══
  // Zero custo de search. Carrega por categoria+cidade (dedup place_id — a tabela é
  // SÉRIE, 1 row por search — memory 624d599c), roda L2/L3/L4 selecionados.
  // L2/L3 persistem via PATCH próprio; L1 refresh exige nova busca (não suportado aqui).
  if (!layers.l0) {
    if (!bodyCity) return NextResponse.json({ error: "city required no modo re-enrich (L0 desmarcado)" }, { status: 400 })
    const t0re = Date.now()
    try {
      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
      const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      const catFilter = categories.map((c: string) => `"${c}"`).join(",")
      const res = await fetch(
        `${supaUrl}/rest/v1/discovery_listings?select=*&category=in.(${encodeURIComponent(catFilter)})&city=eq.${encodeURIComponent(bodyCity)}&order=enrichment_level.desc.nullslast,created_at.desc&limit=400`,
        { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }, cache: "no-store" }
      )
      if (!res.ok) return NextResponse.json({ error: `Supabase ${res.status}` }, { status: 502 })
      const rows = await res.json() as any[]
      // dedup por place_id (1ª row = maior enrichment_level pela ordenação)
      const byPid = new Map<string, any>()
      for (const r of rows) if (r.place_id && !byPid.has(r.place_id)) byPid.set(r.place_id, r)
      let listings = [...byPid.values()]
      if (!listings.length) return NextResponse.json({ error: "nenhum lead existente p/ categoria+cidade", mode: "re-enrich" }, { status: 404 })

      // ── BASE PREFLIGHT ($0): a VERDADE da base antes de pagar — popup mostra números exatos ──
      if (preflight) {
        const withWebsite = listings.filter((l: any) => !!l.website).length
        const jaL2 = listings.filter((l: any) => (l.enrichment_level || 0) >= 2).length
        const jaL3 = listings.filter((l: any) => (l.enrichment_level || 0) >= 3).length
        const maxN0 = enrich || 50
        const l2Candidates = Math.min(maxN0, listings.filter((l: any) => !!l.website && (l.enrichment_level || 0) < 2).length)
        const l3Candidates = Math.min(maxN0, listings.filter((l: any) => !!l.website && (l.enrichment_level || 0) < 3).length)
        return NextResponse.json({
          mode: "re-enrich", preflight: true, city: bodyCity,
          base: listings.length, withWebsite, jaL2, jaL3,
          l2Candidates, l3Candidates,
          // custo exato: candidatos novos × preço (cache de rodadas anteriores pode reduzir ainda mais)
          l2ExactCost: Math.round(l2Candidates * 0.010125 * 10000) / 10000,
          l3ExactCost: Math.round(l3Candidates * 0.0005 * 10000) / 10000,
        })
      }

      let scores: ScoreData[] = scoreLeads(listings)

      let l2Cost = 0, l3Cost = 0
      const maxN = enrich || 50
      if (layers.l2) {
        const r2 = await enrichTopLeadsL2(listings, scores, maxN)
        listings = r2.l2EnrichedListings; scores = r2.l2EnrichedScores; l2Cost = r2.l2Cost
      }
      if (layers.l3) {
        const r3 = await enrichTopLeadsL3(listings, scores, maxN)
        listings = r3.l3EnrichedListings; scores = r3.l3EnrichedScores; l3Cost = r3.l3Cost
      }
      if (layers.l4) {
        const r4 = await enrichTopLeadsL4(listings, scores)
        listings = r4.l4EnrichedListings; scores = r4.l4EnrichedScores
      }
      // ── PERSISTÊNCIA (as funções L2/L3 só atualizam in-memory; no fluxo L0 o
      //    persistDiscovery grava — aqui gravamos PATCH por id da row carregada) ──
      const L2L3_COLS = new Set(["enrichment_level","l2_onpage_score","l2_lighthouse_seo","l2_lighthouse_pwa","l2_enriched_at","l2_cost_usd","l2_content_maturity","l2_content_gaps","l2_social_links","l3_social_links","l2_word_count","l2_internal_links_count","l2_external_links_count","l2_images_count","l2_seo_checks","l2_has_analytics","l2_domain_rank","l2_lighthouse_performance","l2_lighthouse_accessibility","l2_lighthouse_best_practices","l2_meta_title","l2_meta_description","l3_whatsapp","l2_technology_categories","l3_emails","l2_country_iso_code","l2_emails","l2_cms"])
      // colunas INTEGER no Postgres — a API manda decimais (onpage_score 98.9) → arredondar (fix 22P02, medido)
      const INT_COLS = new Set(["enrichment_level","l2_onpage_score","l2_word_count","l2_internal_links_count","l2_external_links_count","l2_images_count","l2_domain_rank","l2_content_maturity"])
      let persisted = 0
      const toSave = listings.filter((l: any) => l.id && (l.enrichment_level || 0) >= 2)
      await Promise.allSettled(toSave.map(async (l: any) => {
        const patch: Record<string, unknown> = {}
        for (const k of Object.keys(l)) {
          if (!L2L3_COLS.has(k) || l[k] === undefined) continue
          patch[k] = INT_COLS.has(k) && typeof l[k] === "number" ? Math.round(l[k]) : l[k]
        }
        if (!Object.keys(patch).length) return
        const pr = await fetch(`${supaUrl}/rest/v1/discovery_listings?id=eq.${l.id}`, {
          method: "PATCH",
          headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(patch),
        })
        if (pr.ok) persisted++
        else console.warn(`[re-enrich] PATCH ${l.place_id}: ${pr.status} ${(await pr.text().catch(() => "")).slice(0, 120)}`)
      }))

      const totalCost = l2Cost + l3Cost
      if (totalCost > 0) {
        // ADR-0024 Parte 3: o universo do re-enrich é a BASE por place_id — sem lógica de raio.
        // Coordenadas do tracker = centroide REAL dos leads da base (só informativo no Redis).
        const withGeo = listings.filter((l: any) => l.latitude && l.longitude)
        const cLat = withGeo.length ? withGeo.reduce((s: number, l: any) => s + l.latitude, 0) / withGeo.length : 0
        const cLng = withGeo.length ? withGeo.reduce((s: number, l: any) => s + l.longitude, 0) / withGeo.length : 0
        trackCost({ categories: [...categories, "re-enrich"], lat: cLat, lng: cLng, radiusKm: 0, costUsd: totalCost, totalCount: listings.length })
      }
      console.log(`[discovery:re-enrich] ${listings.length} existentes · L2 $${l2Cost.toFixed(4)} · L3 $${l3Cost.toFixed(4)} · ${Date.now() - t0re}ms`)
      return NextResponse.json({
        mode: "re-enrich", layers, city: bodyCity,
        total_count: listings.length,
        l2EnrichedCount: listings.filter((l: any) => (l.enrichment_level || 0) >= 2).length,
        l3EnrichedCount: listings.filter((l: any) => (l.enrichment_level || 0) >= 3).length,
        withWebsite: listings.filter((l: any) => !!l.website).length,
        persisted,
        l2Cost, l3Cost, cost_usd: totalCost, totalCost,
        latency_ms: Date.now() - t0re,
        costToday: getCostToday(), costTotal: getCostTotal(),
      })
    } catch (e: any) {
      return NextResponse.json({ error: e.message, mode: "re-enrich" }, { status: 500 })
    }
  }

  const cacheKey = `discovery:${categories.sort().join(',')}:${lat}:${lng}:${radiusKm}`

  // ═══ CACHE CHECK ═══
  // Continuation requests (offset > 0) skip cache — always fetch fresh page
  if (!force && startOffset === 0) {
    const cached = getCached(cacheKey) || getPersistedResults(cacheKey)

    if (cached) {
      return NextResponse.json({ ...(cached as object), fromCache: true, costToday: getCostToday(), costTotal: getCostTotal() })
    }
  }

  // ═══ L0: LIVE SEARCH via provider-core ($0.0003/listing) ═══
  // Usa businessListingsSearch do provider-core-adapter (shape, tipos, custo).
  // DataForSEO: limit default 100, max 1000. Offset pagination disponível.
  const t0 = Date.now()

  try {
    const searchParams = {
      categories,
      lat: lat || -23.5505,
      lng: lng || -46.6333,
      radiusKm: radiusKm || 10,
      limit: limit || 100,  // doc oficial: default=100, max=1000
      offset: startOffset,
      language_code: "pt",
    }

    const searchResult = await businessListingsSearch(searchParams)
    const items = searchResult.listings
    const totalCount = searchResult.total_count

    const result = { total_count: totalCount, listings: items as any[], cost_usd: searchResult.cost_usd || 0.015 }

    // ── Cost estimate from 1st page total_count ──
    // L0: $0.048/página. L1: $0.0054 flat rate (1 POST batch).
    const estimatedPages = Math.ceil(totalCount / (limit || 100))
    const estimatedL0Cost = estimatedPages * 0.048
    const estimatedL1Cost = enrich ? 0.0054 : 0
    ;(result as any).estimatedPages = estimatedPages
    ;(result as any).estimatedL0Cost = estimatedL0Cost
    ;(result as any).estimatedL1Cost = estimatedL1Cost
    ;(result as any).estimatedTotalCost = estimatedL0Cost + estimatedL1Cost

    // ═══ PAGINATION: fetch remaining pages (offset 100,200...) ═══
    // DataForSEO max 100 per call. RJ 5km = 538 dentists = 5 pages.
    // Tracker: search_metadata records what pages were fetched and how many remain.
    const searchMetadata = {
      tracker_id: `discovery_${Date.now().toString(36)}`,
      batch_id: batchId || null,
      preflight: !!preflight,
      total_in_region: totalCount,
      fetched_count: items.length,
      pages_fetched: 1,
      remaining: Math.max(0, totalCount - items.length),
      offsets_used: [startOffset],
    }

    let pagOffset = (limit || 100)
    const seenPids = new Set(items.map((i: any) => i.place_id).filter(Boolean))

    if (shouldPaginate) {
      while (result.listings.length >= (limit || 100) && pagOffset < totalCount) {
        const nextResult = await businessListingsSearch({ ...searchParams, offset: pagOffset })
        const newItems = nextResult.listings.filter((i: any) => i.place_id && !seenPids.has(i.place_id))

        for (const i of newItems) seenPids.add(i.place_id)
        result.listings.push(...newItems)
        result.cost_usd += nextResult.cost_usd || 0
        searchMetadata.offsets_used.push(pagOffset)
        pagOffset += (limit || 100)
        searchMetadata.pages_fetched++
        searchMetadata.fetched_count += nextResult.listings.length
        searchMetadata.remaining = Math.max(0, totalCount - searchMetadata.fetched_count)
        if (nextResult.listings.length < (limit || 100)) break
      }
    }

    // Attach metadata to result (survives to response + persistence)
    ;(result as any).search_metadata = searchMetadata
    console.log(`[discovery:L0] tracker=${searchMetadata.tracker_id} · ${searchMetadata.fetched_count}/${totalCount} fetched in ${searchMetadata.pages_fetched} pages · ${searchMetadata.remaining} remaining`)

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
    const shouldEnrich = !preflight && (layers.l1 || enrich || force)

    if (shouldEnrich) {
      const enriched = await enrichTopLeads(listings, scores, enrich || 50)

      listings = enriched.enrichedListings
      scores = enriched.enrichedScores
      enrichmentCost = enriched.enrichmentCost
      enrichedCount = listings.filter((l: any) => (l.enrichment_level || 0) >= 1).length

      if (enrichmentCost > 0) {
        trackCost({
          categories: [...categories, "L1_enrichment"],
          lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10,
          costUsd: enrichmentCost, totalCount: enrichedCount,
        })
      }

      // ═══ L2 + L3: por SELEÇÃO (v088 — antes adiados p/ pós-conversão, agora livres) ═══
    }

    // L2 Website+SEO ($0.010125/lead c/ website) — independente do L1
    if (!preflight && layers.l2) {
      const r2 = await enrichTopLeadsL2(listings, scores, enrich || 50)
      listings = r2.l2EnrichedListings; scores = r2.l2EnrichedScores; l2Cost = r2.l2Cost
      if (l2Cost > 0) trackCost({ categories: [...categories, "L2_enrichment"], lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10, costUsd: l2Cost, totalCount: listings.filter((l: any) => (l.enrichment_level || 0) >= 2).length })
    }

    // L3 Social & Contatos ($0.0005/lead c/ cache L2 · $0.0105 sem) — independente do L1
    if (!preflight && layers.l3) {
      const r3 = await enrichTopLeadsL3(listings, scores, enrich || 50)
      listings = r3.l3EnrichedListings; scores = r3.l3EnrichedScores; l3Cost = r3.l3Cost
      if (l3Cost > 0) trackCost({ categories: [...categories, "L3_enrichment"], lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10, costUsd: l3Cost, totalCount: listings.filter((l: any) => (l.enrichment_level || 0) >= 3).length })
    }

    // ═══ City Fallback: Nominatim reverse geocode para listings sem city ═══
    // Roda SEMPRE após L0 (independente de L1), custo $0.
    // DataForSEO às vezes retorna address_info.city = null (ex: perfis GMB incompletos).
    // Sem city, o L4 IBGE não consegue fazer match → listing fica sem contexto.
    // Modo L0+L4 (sem L1): essencial — é o único fallback de city disponível.
    let cityFallbackCount = 0
    for (let i = 0; i < listings.length; i++) {
      const l = listings[i] as any
      if (!l.city && l.latitude && l.longitude) {
        try {
          const geo = await reverseGeocode(l.latitude, l.longitude)
          if (geo?.city) {
            l.city = geo.city
            l.district = geo.district || l.district
            cityFallbackCount++
          }
        } catch { /* Nominatim offline — prossegue sem city */ }
      }
    }
    if (cityFallbackCount > 0) {
      console.log(`[enrichment] City fallback: ${cityFallbackCount}/${listings.length} listings filled via Nominatim`)
    }

    // ═══ L4: IBGE MARKET CONTEXT (ADR-0024 · $0/lead) ═══
    // Por seleção (v088) — default ON ($0, contexto de mercado).
    if (layers.l4) {
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

      const _enrichLevel = l.enrichment_level >= 2 ? 2
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
      fetchedCount: searchMetadata.fetched_count,  // total real de listings nesta busca (todas as páginas ou página única)
      costToday: getCostToday(), costTotal: getCostTotal(), costLast: getCostLast(),
    }

    // ═══ 3-LAYER PERSISTENCE (skip for preflight — only need total_count) ═══
    if (!preflight) {
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
      searchMetadata,
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
    } // end if (!preflight)
    else {
      // Pre-flight: salva APENAS metadata no Supabase (sem listings/cache/R2).
      // Session Log precisa desta row para mostrar o pre-flight no historico.
      const supabasePf = getAdminClient()
      supabasePf.from("discovery_searches" as any).insert({
        categories, lat: lat || -23.55, lng: lng || -46.63,
        radius_km: radiusKm || 10, total_count: result.total_count,
        cost_usd: searchCost, search_metadata: searchMetadata,
      }).select("id").single().then((r: any) => {
        if (r.data) console.log(`[preflight] Saved metadata · total_count=${result.total_count} · cost=$${searchCost.toFixed(6)}`)
      }).catch(() => {})
      // Track cost
      trackCost({ categories: [...categories, "preflight"], lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10, costUsd: searchCost, totalCount: result.total_count })
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
