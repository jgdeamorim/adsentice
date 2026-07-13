
// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/discovery-search
// Bridge: client → EVO-API MCP :7700 → DataForSEO LIVE
// L0 search ($0.015) + L1 enrichment ($0.0054/lead top N) +
// Scoring + 3-layer persistence (Supabase + Redis + Memory)
// ══════════════════════════════════════════════════════════════════

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { businessListingsSearch, businessProfileGmb } from "@/lib/evo-mcp"
import {
  getCached, setCache, trackCost, persistResults, getPersistedResults,
  getCostToday, getCostTotal, getCostLast,
} from "@/lib/discovery-cache"
import type { ScoringInput, ScoreData, ScoreDistribution } from "@/lib/scoring"
import { scoreLeads, computeDistribution, detectContactMethods } from "@/lib/scoring"
import { saveDiscoverySearch } from "@/lib/discovery-persistence"

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
        avgScore: distribution.avgScore,
        unaware: distribution.unaware, problemAware: distribution.problemAware,
        solutionAware: distribution.solutionAware, productAware: distribution.productAware,
        mostAware: distribution.mostAware,
      })

      execSync(`redis-cli -p 6396 --no-auth-warning SETEX adsentice:discovery:last_score_stats 86400 '${statsJson.replace(/'/g, "'\\''")}'`, { timeout: 2000, stdio: "ignore" })
    } catch { /* Redis offline — degrade gracefully */ }

    // ═══ SUPABASE PERSISTENCE (durável — dados pagos NUNCA perdidos) ═══
    // Compute contact_methods for ALL listings before saving
    const enrichedListings = listings.map((l: any, i: number) => {
      const input: ScoringInput = {
        title: l.title, category: l.category, address: l.address,
        rating_value: l.rating_value, rating_votes: l.rating_votes,
        place_id: l.place_id, cid: l.cid, latitude: l.latitude, longitude: l.longitude,
        is_claimed: l.is_claimed, phone: l.phone, website: l.website,
        total_photos: l.total_photos, description: l.description,
        business_status: l.business_status,
      }

      return { ...l, score: scores[i], contact_methods: detectContactMethods(input), enrichment_level: (l.website || l.phone || l.total_photos != null) ? 1 : 0 }
    })

    saveDiscoverySearch({
      categories,
      lat: lat || -23.55,
      lng: lng || -46.63,
      radiusKm: radiusKm || 10,
      totalCount: result.total_count,
      costUsd: searchCost + enrichmentCost,
      listings: enrichedListings,
      distribution,
    }).then((saved) => {
      if (saved) console.log(`[discovery-persistence] Saved ${saved.savedCount} listings to Supabase (search ${saved.searchId})`)
    }).catch((err) => {
      console.error("[discovery-persistence] Supabase save failed (data preserved in Redis):", err.message)
    })

    // Persist + cache (Redis + memory)
    const payload = {
      ...result, scores, distribution,
      enrichedCount, enrichmentCost,
      totalCost: searchCost + enrichmentCost,
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
