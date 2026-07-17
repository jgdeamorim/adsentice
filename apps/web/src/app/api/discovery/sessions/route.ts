// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/discovery/sessions
// Retorna histórico de buscas com cache TTL do Redis.
// $0/request — Supabase + Redis local :6396, sem DataForSEO.
// ADR-0029 · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"
import { execSync } from "child_process"

function redisCli(cmd: string): string {
  try {
    return execSync(`redis-cli -p 6396 ${cmd}`, { encoding: "utf8", timeout: 3000 }).trim()
  } catch {
    return ""
  }
}

export async function GET() {
  try {
    const supabase = getAdminClient()

    // 1. Query recent discovery_searches
    const { data: searches, error } = await supabase
      .from("discovery_searches")
      .select("id,categories,lat,lng,radius_km,total_count,cost_usd,avg_score,created_at,search_metadata")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error || !searches) {
      return NextResponse.json({ sessions: [], summary: { totalSearches: 0, totalCost: 0, activeCaches: 0 } })
    }

    // 2. For each search, check Redis cache TTL + listing count
    const sessions = await Promise.all(searches.map(async (s: any) => {
      const cats = (s.categories || []).sort().join(",")
      const cacheKey = `discovery:${cats}:${s.lat}:${s.lng}:${s.radius_km}`

      // Redis TTL (segundos restantes, -1 = sem TTL, -2 = key não existe)
      const ttlRaw = redisCli(`TTL ${cacheKey}`)
      const cacheTtl = ttlRaw ? parseInt(ttlRaw, 10) : null
      const cacheActive = cacheTtl !== null && cacheTtl > 0

      // Listing count from Supabase
      let listingsSaved = 0
      try {
        const { count } = await supabase
          .from("discovery_listings")
          .select("id", { count: "exact", head: true })
          .eq("search_id", s.id)
        listingsSaved = count || 0
      } catch { /* supabase offline */ }

      // Extract full pagination metadata from search_metadata JSONB
      let trackerId = ""; let fetchedCount = 0; let remaining = 0
      let pagesFetched = 0; let offsetsUsed: number[] = []
      try {
        const meta = typeof s.search_metadata === "string"
          ? JSON.parse(s.search_metadata)
          : s.search_metadata
        trackerId = meta?.tracker_id || ""
        fetchedCount = meta?.fetched_count || 0
        remaining = meta?.remaining || 0
        pagesFetched = meta?.pages_fetched || 1
        offsetsUsed = meta?.offsets_used || [0]
      } catch { /* no metadata */ }

      // incomplete = ainda tem dados não buscados (remaining > 0)
      const isIncomplete = remaining > 0

      return {
        id: s.id,
        categories: s.categories || [],
        lat: s.lat,
        lng: s.lng,
        radiusKm: s.radius_km || 10,
        totalCount: s.total_count || 0,
        costUsd: s.cost_usd || 0,
        avgScore: s.avg_score || 0,
        listingsSaved,
        cacheTtl: cacheActive ? cacheTtl : null,
        cacheActive,
        trackerId,
        fetchedCount,
        remaining,
        pagesFetched,
        offsetsUsed,
        isIncomplete,
        createdAt: s.created_at,
      }
    }))

    // 3. Summary
    const totalCost = sessions.reduce((sum, s) => sum + (s.costUsd || 0), 0)
    const activeCaches = sessions.filter(s => s.cacheActive).length
    const incompleteSearches = sessions.filter(s => s.isIncomplete).length

    return NextResponse.json({
      sessions,
      summary: {
        totalSearches: sessions.length,
        totalCost: Math.round(totalCost * 10000) / 10000,
        activeCaches,
        incompleteSearches,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { sessions: [], summary: { totalSearches: 0, totalCost: 0, activeCaches: 0 }, error: e.message },
      { status: 500 }
    )
  }
}
