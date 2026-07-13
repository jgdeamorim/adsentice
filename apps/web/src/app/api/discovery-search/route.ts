
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

/** Enrich up to N leads with full 27-field GMB profiles ($0.0054/lead). */
async function enrichTopLeads(
  listings: any[],
  scores: ScoreData[],
  maxEnrich: number = 5
): Promise<{ enrichedListings: any[]; enrichedScores: ScoreData[]; enrichmentCost: number }> {
  let enrichmentCost = 0
  const enrichedListings = [...listings]
  const enrichedScores = [...scores]

  // Enrich top N by compound score (those with highest potential)
  const ranked = listings
    .map((l, i) => ({ listing: l, score: scores[i], index: i }))
    .sort((a, b) => b.score.compound - a.score.compound)

  for (let rank = 0; rank < Math.min(maxEnrich, ranked.length); rank++) {
    const { listing, index } = ranked[rank]

    // Skip if listing has no title to search by
    if (!listing.title) continue

    try {
      const profile = await businessProfileGmb({
        keyword: listing.title,
        location_code: 2076, // Brazil
        language_code: "pt",
      })

      if (profile && profile.place_id) {
        enrichmentCost += 0.0054

        // Merge full profile fields into the listing
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

        // Re-score with full 27-field data
        const input: ScoringInput = {
          title: enriched.title,
          category: enriched.category,
          categories: enriched.categories,
          address: enriched.address,
          rating_value: enriched.rating_value,
          rating_votes: enriched.rating_votes,
          place_id: enriched.place_id,
          cid: enriched.cid,
          latitude: enriched.latitude,
          longitude: enriched.longitude,
          is_claimed: enriched.is_claimed,
          phone: enriched.phone,
          website: enriched.website,
          total_photos: enriched.total_photos,
          description: enriched.description,
          business_status: enriched.business_status,
        }

        const newScores = scoreLeads([input])

        // Detect contact methods for communication strategy
        enriched.contact_methods = detectContactMethods(input)
        enriched.enrichment_level = 1

        enrichedListings[index] = enriched
        enrichedScores[index] = newScores[0]
      }
    } catch (err: any) {
      console.error(`[enrichment] Failed to enrich ${listing.title}:`, err.message)

      // Continue with original data — enrichment is best-effort
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
    // Only enrich if explicitly requested or if results are few (to save money)
    const shouldEnrich = enrich === true || force === true

    if (shouldEnrich) {
      const maxEnrich = typeof enrich === 'number' ? enrich : 5
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
