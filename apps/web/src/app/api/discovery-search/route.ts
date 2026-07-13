
// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/discovery-search
// Bridge: client → EVO-API MCP :7700 → DataForSEO LIVE
// L0 search ($0.015) + L1 enrichment ($0.0054/lead top N) +
// Scoring + 3-layer persistence (Supabase + Redis + Memory)
// ══════════════════════════════════════════════════════════════════

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { businessListingsSearch, businessProfileGmb, onPageInstantAudit, domainTechnologies, extractDomain } from "@/lib/evo-mcp"
import {
  getCached, setCache, trackCost, persistResults, getPersistedResults,
  getCostToday, getCostTotal, getCostLast,
} from "@/lib/discovery-cache"
import type { ScoringInput, ScoreData, ScoreDistribution } from "@/lib/scoring"
import { scoreLeads, computeDistribution, detectContactMethods } from "@/lib/scoring"
import { saveDiscoverySearch } from "@/lib/discovery-persistence"
import { scoreContentGap, generateContentGapRecommendations } from "@/lib/content-gap"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Enrich leads with full 27-field GMB profiles in parallel ($0.0054/lead each). */
async function enrichTopLeads(
  listings: any[],
  scores: ScoreData[],
  maxEnrich: number = 5
): Promise<{ enrichedListings: any[]; enrichedScores: ScoreData[]; enrichmentCost: number }> {
  const enrichedListings = [...listings]
  const enrichedScores = [...scores]

  // Rank by compound score and take top N
  const toEnrich = listings
    .map((l, i) => ({ listing: l, score: scores[i], index: i }))
    .filter(({ listing }) => !!listing.title)
    .sort((a, b) => b.score.compound - a.score.compound)
    .slice(0, maxEnrich)

  // Enrich in parallel batches of 5 (EVO-API rate limit friendly)
  const BATCH_SIZE = 5
  let enrichmentCost = 0

  for (let batch = 0; batch < toEnrich.length; batch += BATCH_SIZE) {
    const batchItems = toEnrich.slice(batch, batch + BATCH_SIZE)

    const results = await Promise.allSettled(
      batchItems.map(async ({ listing, index }) => {
        const profile = await businessProfileGmb({
          keyword: listing.title,
          location_code: 2076,
          language_code: "pt",
        })

        return { profile, listing, index }
      })
    )

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('[enrichment] Batch item failed:', (r.reason as any)?.message)
        continue
      }

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
  }

  return { enrichedListings, enrichedScores, enrichmentCost }
}

/** L2 Website+SEO enrichment: on_page_instant_audit + domain_technologies ($0.010125/lead). */
async function enrichTopLeadsL2(
  listings: any[],
  scores: ScoreData[],
  maxEnrich: number = 3
): Promise<{ l2EnrichedListings: any[]; l2EnrichedScores: ScoreData[]; l2Cost: number }> {
  const l2EnrichedListings = [...listings]
  const l2EnrichedScores = [...scores]

  // Filter: leads with website + L1 enriched + score >= 30 (ADR-0008 spending rule)
  const toEnrich = listings
    .map((l, i) => ({ listing: l, score: scores[i], index: i }))
    .filter(({ listing, score }) =>
      !!listing.website &&
      (listing.enrichment_level >= 1 || listing.phone || listing.total_photos != null) &&
      score.compound >= 30
    )
    .sort((a, b) => b.score.compound - a.score.compound)
    .slice(0, maxEnrich)

  if (toEnrich.length === 0) return { l2EnrichedListings, l2EnrichedScores, l2Cost: 0 }

  // Batch in groups of 3 (domain_technologies is $0.01/call — conservative)
  const BATCH_SIZE = 3
  let l2Cost = 0

  for (let batch = 0; batch < toEnrich.length; batch += BATCH_SIZE) {
    const batchItems = toEnrich.slice(batch, batch + BATCH_SIZE)

    const results = await Promise.allSettled(
      batchItems.map(async ({ listing, index }) => {
        const domain = extractDomain(listing.website)
        const [audit, tech] = await Promise.allSettled([
          onPageInstantAudit(listing.website),
          domain ? domainTechnologies(domain) : Promise.resolve(null),
        ])

        return {
          audit: audit.status === "fulfilled" ? audit.value : null,
          tech: tech.status === "fulfilled" ? tech.value : null,
          listing,
          index,
          domain,
        }
      })
    )

    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[enrichment-l2] Batch item failed:", (r.reason as any)?.message)
        continue
      }

      const { audit, tech, listing, index } = r.value

      // Require at least audit to succeed (tech is bonus)
      if (!audit) continue

      const costPerLead = 0.000125 + (tech ? 0.01 : 0)
      l2Cost += costPerLead

      // Extract L2 signals from audit
      const l2_https = listing.website?.startsWith("https") ?? false
      const hasAnalytics = tech
        ? !!(tech.technologies?.marketing?.analytics?.length || tech.technologies?.advertising?.analytics?.length)
        : null
      const cmsName: string | null = (() => {
        const cms = tech?.technologies?.content?.cms || tech?.technologies?.cms
        return Array.isArray(cms) && cms.length > 0 ? cms[0] : null
      })()
      const techCategories = tech
        ? Object.keys(tech.technologies || {}).filter(k => Object.keys(tech.technologies[k] || {}).length > 0)
        : null

      // Build L2-enriched listing
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
        l2_cost_usd: costPerLead,
        enrichment_level: 2,
      }

      // Re-score with full L2 data
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
        // L2 signals
        l2_onpage_score: audit.onpage_score,
        l2_https,
        l2_has_title: !!audit.meta?.title,
        l2_has_description: !!audit.meta?.description,
        l2_has_analytics: hasAnalytics,
        l2_cms: cmsName,
        l2_word_count: audit.content?.word_count || 0,
        l2_lighthouse_performance: null, // reserved for future lighthouse batch
        l2_has_schema: audit.checks?.no_jsonld_schema === true ? false : null,
      }

      const newScores = scoreLeads([input])

      l2EnrichedListings[index] = enriched
      l2EnrichedScores[index] = newScores[0]
    }
  }

  return { l2EnrichedListings, l2EnrichedScores, l2Cost }
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
  try {
    const result = await businessListingsSearch({
      categories,
      lat: lat || -23.5505,
      lng: lng || -46.6333,
      radiusKm: radiusKm || 10,
      limit: limit || 50,
      offset: offset || undefined,
      order_by: order_by || undefined,
      filters: filters || undefined,
    })

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
    let l2Cost = 0

    // ═══ L1: ENRICHMENT (27-field profiles, $0.0054/lead) ═══
    // Always enrich top N leads — dados pagos precisam de contexto para valer
    const shouldEnrich = enrich || force
    const maxEnrich = typeof enrich === 'number' ? enrich : 5

    if (shouldEnrich) {
      const enriched = await enrichTopLeads(listings, scores, maxEnrich)

      listings = enriched.enrichedListings
      scores = enriched.enrichedScores
      enrichmentCost = enriched.enrichmentCost
      enrichedCount = listings.filter((l: any) => l.phone || l.website || l.total_photos != null).length

      // Track enrichment cost
      if (enrichmentCost > 0) {
        trackCost({
          categories: [...categories, "L1_enrichment"],
          lat: lat || -23.55,
          lng: lng || -46.63,
          radiusKm: radiusKm || 10,
          costUsd: enrichmentCost,
          totalCount: maxEnrich,
        })
      }

      // ═══ L2: WEBSITE+SEO ENRICHMENT ($0.010125/lead) ═══
      // Only for leads that passed L1 and have websites + score >= 30
      if (enrichedCount > 0) {
        const l2Result = await enrichTopLeadsL2(listings, scores, Math.min(typeof enrich === 'number' ? enrich : 3, 3))

        listings = l2Result.l2EnrichedListings
        scores = l2Result.l2EnrichedScores
        l2Cost = l2Result.l2Cost

        if (l2Cost > 0) {
          trackCost({
            categories: [...categories, "L2_enrichment"],
            lat: lat || -23.55,
            lng: lng || -46.63,
            radiusKm: radiusKm || 10,
            costUsd: l2Cost,
            totalCount: Math.min(typeof enrich === 'number' ? enrich : 3, 3),
          })
        }
      }
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
        avgScore: distribution.avgScore,
        unaware: distribution.unaware, problemAware: distribution.problemAware,
        solutionAware: distribution.solutionAware, productAware: distribution.productAware,
        mostAware: distribution.mostAware,
      })

      execSync(`redis-cli -p 6396 --no-auth-warning SETEX adsentice:discovery:last_score_stats 86400 '${statsJson.replace(/'/g, "'\\''")}'`, { timeout: 2000, stdio: "ignore" })
    } catch { /* Redis offline — degrade gracefully */ }

    // ═══ SUPABASE PERSISTENCE (durável — dados pagos NUNCA perdidos) ═══
    // Compute contact_methods + content gap for ALL listings before saving
    const enrichedListings = listings.map((l: any, i: number) => {
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

      return {
        ...l,
        score: scores[i],
        contact_methods: detectContactMethods(input),
        enrichment_level: enrichLevel,
        l2_content_maturity,
        l2_content_gaps,
      }
    })

    saveDiscoverySearch({
      categories,
      lat: lat || -23.55,
      lng: lng || -46.63,
      radiusKm: radiusKm || 10,
      totalCount: result.total_count,
      costUsd: searchCost + enrichmentCost + l2Cost,
      listings: enrichedListings,
      distribution,
    }).then((saved) => {

      // Also add content gap to response listings array (listings was modified in-place)
      for (let i = 0; i < enrichedListings.length; i++) {
        (listings[i] as any).l2_content_maturity = enrichedListings[i].l2_content_maturity
        ;(listings[i] as any).l2_content_gaps = enrichedListings[i].l2_content_gaps
      }

      if (saved) console.log(`[discovery-persistence] Saved ${saved.savedCount} listings to Supabase (search ${saved.searchId})`)
    }).catch((err) => {
      console.error("[discovery-persistence] Supabase save failed (data preserved in Redis):", err.message)
    })

    // Persist + cache (Redis + memory)
    const payload = {
      ...result, scores, distribution,
      enrichedCount, enrichmentCost, l2Cost,
      l2EnrichedCount: listings.filter((l: any) => l.enrichment_level >= 2).length,
      totalCost: searchCost + enrichmentCost + l2Cost,
      fromCache: false,
      costToday: getCostToday(), costTotal: getCostTotal(), costLast: getCostLast(),
    }

    setCache(cacheKey, payload)
    persistResults(cacheKey, payload)

    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "EVO-API MCP unavailable" },
      { status: 500 }
    )
  }
}
