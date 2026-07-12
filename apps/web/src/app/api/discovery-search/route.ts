
// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/discovery-search
// Bridge: client → EVO-API MCP :7700 → DataForSEO LIVE
// Com cache (30min TTL), persistência Redis (24h), e cost tracking
// ══════════════════════════════════════════════════════════════════

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { businessListingsSearch } from "@/lib/evo-mcp"
import {
  getCached, setCache, trackCost, persistResults, getPersistedResults,
  getCostToday, getCostTotal, getCostLast,
} from "@/lib/discovery-cache"
import { scoreLeads, computeDistribution, type ScoreData, type ScoreDistribution } from "@/lib/scoring"
import { saveDiscoverySearch } from "@/lib/discovery-persistence"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { categories, lat, lng, radiusKm, limit, force } = body

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

  // ═══ LIVE SEARCH ═══
  try {
    const result = await businessListingsSearch({
      categories,
      lat: lat || -23.5505,
      lng: lng || -46.6333,
      radiusKm: radiusKm || 10,
      limit: limit || 50,
    })

    // Track cost
    trackCost({
      categories, lat: lat || -23.55, lng: lng || -46.63, radiusKm: radiusKm || 10,
      costUsd: result.cost_usd, totalCount: result.total_count,
    })

    // ═══ SCORING PASS ═══
    const scores: ScoreData[] = scoreLeads(result.listings)
    const distribution: ScoreDistribution = computeDistribution(scores)

    // Persist score stats to Redis for admin dashboard (fast cache, 24h TTL)
    try {
      const { execSync } = await import("child_process")

      const statsJson = JSON.stringify({
        total: result.listings.length, // scored listings count (matches sum of distribution)
        regionalTotal: result.total_count, // total businesses in radius (for reference)
        avgScore: distribution.avgScore,
        unaware: distribution.unaware, problemAware: distribution.problemAware,
        solutionAware: distribution.solutionAware, productAware: distribution.productAware,
        mostAware: distribution.mostAware,
      })

      execSync(`redis-cli -p 6396 --no-auth-warning SETEX adsentice:discovery:last_score_stats 86400 '${statsJson.replace(/'/g, "'\\''")}'`, { timeout: 2000, stdio: "ignore" })
    } catch { /* Redis offline — degrade gracefully */ }

    // ═══ SUPABASE PERSISTENCE (durável — dados pagos NUNCA perdidos) ═══
    // Fire-and-forget: não bloqueia a resposta se Supabase estiver offline
    const enrichedListings = result.listings.map((l, i) => ({ ...l, score: scores[i] }))

    saveDiscoverySearch({
      categories,
      lat: lat || -23.55,
      lng: lng || -46.63,
      radiusKm: radiusKm || 10,
      totalCount: result.total_count,
      costUsd: result.cost_usd,
      listings: enrichedListings,
      distribution,
    }).then((saved) => {
      if (saved) console.log(`[discovery-persistence] Saved ${saved.savedCount} listings to Supabase (search ${saved.searchId})`)
    }).catch((err) => {
      console.error("[discovery-persistence] Supabase save failed (data preserved in Redis):", err.message)
    })

    // Persist + cache (Redis + memory)
    const payload = { ...result, scores, distribution, fromCache: false, costToday: getCostToday(), costTotal: getCostTotal(), costLast: getCostLast() }

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
