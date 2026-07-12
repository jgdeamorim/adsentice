// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Persistence — Supabase (durável) + Redis (cache)
// Dados PAGOS do DataForSEO NUNCA são perdidos.
// Fluxo: EVO-API → Supabase (permanente) + Redis (cache 24h) + Memory (30min)
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { createClient } from "@supabase/supabase-js"

import type { ScoreData } from "./scoring"
import type { GMBListing } from "./evo-mcp"

// ── Types ───────────────────────────────────────────────────

export interface CategoryAnalytics {
  category: string
  total_listings: number
  unique_businesses: number
  avg_score: number
  problem_aware_plus: number
  solution_aware_plus: number
  product_aware_plus: number
  most_aware: number
  pain_pct: number
  last_seen: string
}

// ── Supabase Admin Client (service_role — server-side only) ──

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ── Save Search ─────────────────────────────────────────────

export async function saveDiscoverySearch(params: {
  categories: string[]
  lat: number
  lng: number
  radiusKm: number
  totalCount: number
  costUsd: number
  listings: (GMBListing & { score: ScoreData })[]
  distribution: { unaware: number; problemAware: number; solutionAware: number; productAware: number; mostAware: number; avgScore: number }
}): Promise<{ searchId: string; savedCount: number } | null> {
  const supabase = getAdminClient()

  if (!supabase) return null // service_role key not configured

  const avgScore = params.distribution.avgScore

  // 1 — Insert search record
  const { data: search, error: searchErr } = await supabase
    .from("discovery_searches")
    .insert({
      categories: params.categories,
      lat: params.lat,
      lng: params.lng,
      radius_km: params.radiusKm,
      total_count: params.totalCount,
      cost_usd: params.costUsd,
      avg_score: avgScore,
      unaware: params.distribution.unaware,
      problem_aware: params.distribution.problemAware,
      solution_aware: params.distribution.solutionAware,
      product_aware: params.distribution.productAware,
      most_aware: params.distribution.mostAware,
    })
    .select("id")
    .single()

  if (searchErr || !search) {
    console.error("Failed to save discovery search:", searchErr)

    return null
  }

  const searchId = search.id

  // 2 — Insert listings with scores (batch upsert)
  const rows = params.listings.map((l) => ({
    search_id: searchId,
    place_id: l.place_id || `unknown_${Math.random().toString(36).slice(2, 10)}`,
    title: l.title,
    category: l.category,
    address: l.address,
    rating_value: l.rating_value,
    rating_votes: l.rating_votes,
    is_claimed: l.is_claimed,
    latitude: l.latitude,
    longitude: l.longitude,
    score_compound: l.score.compound,
    score_fit: l.score.fit.normalized,
    score_engagement: l.score.engagement.normalized,
    score_intent: l.score.intent.normalized,
    schwartz_level: l.score.schwartz.level,
    schwartz_label: l.score.schwartz.label,
    signals_detected: [
      ...l.score.fit.signalsDetected,
      ...l.score.engagement.signalsDetected,
      ...l.score.intent.signalsDetected,
    ],
  }))

  // Upsert in batches of 25
  let savedCount = 0

  for (let i = 0; i < rows.length; i += 25) {
    const batch = rows.slice(i, i + 25)

    const { error } = await supabase
      .from("discovery_listings")
      .upsert(batch, { onConflict: "search_id,place_id", ignoreDuplicates: false })

    if (error) {
      console.error(`Failed to save batch ${i}:`, error)
    } else {
      savedCount += batch.length
    }
  }

  return { searchId, savedCount }
}

// ── Read Category Analytics ──────────────────────────────────

export async function getCategoryAnalytics(): Promise<CategoryAnalytics[]> {
  const supabase = getAdminClient()

  if (!supabase) {
    // Fallback: try reading from the view with anon client
    return getCategoryAnalyticsFromView()
  }

  const { data, error } = await supabase
    .from("category_analytics")
    .select("*")
    .order("pain_pct", { ascending: false })

  if (error) {
    console.error("Failed to read category analytics:", error)

    return []
  }

  return data || []
}

/** Fallback: direct aggregation query without the view. */
async function getCategoryAnalyticsFromView(): Promise<CategoryAnalytics[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data, error } = await supabase
      .from("discovery_listings")
      .select("category, score_compound, schwartz_level, place_id, created_at")

    if (error || !data) return []

    // Aggregate in-memory
    const byCategory = new Map<string, {
      total: number; places: Set<string>; scores: number[]
      problemAware: number; solutionAware: number; productAware: number; mostAware: number
      lastSeen: string
    }>()

    for (const row of data) {
      const cat = row.category || "unknown"
      let agg = byCategory.get(cat)

      if (!agg) {
        agg = { total: 0, places: new Set(), scores: [], problemAware: 0, solutionAware: 0, productAware: 0, mostAware: 0, lastSeen: row.created_at }
        byCategory.set(cat, agg)
      }

      agg.total++
      if (row.place_id) agg.places.add(row.place_id)
      if (row.score_compound != null) agg.scores.push(row.score_compound)
      if (row.schwartz_level >= 2) agg.problemAware++
      if (row.schwartz_level >= 3) agg.solutionAware++
      if (row.schwartz_level >= 4) agg.productAware++
      if (row.schwartz_level >= 5) agg.mostAware++
      if (row.created_at > agg.lastSeen) agg.lastSeen = row.created_at
    }

    return [...byCategory.entries()]
      .map(([category, agg]) => ({
        category,
        total_listings: agg.total,
        unique_businesses: agg.places.size,
        avg_score: agg.scores.length > 0 ? Math.round(agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length) : 0,
        problem_aware_plus: agg.problemAware,
        solution_aware_plus: agg.solutionAware,
        product_aware_plus: agg.productAware,
        most_aware: agg.mostAware,
        pain_pct: agg.total > 0 ? Math.round((agg.problemAware / agg.total) * 100 * 10) / 10 : 0,
        last_seen: agg.lastSeen,
      }))
      .sort((a, b) => b.pain_pct - a.pain_pct)
  } catch {

    return []
  }
}

// ── Get Score Distribution (for admin dashboard) ─────────────

export async function getScoreDistribution(): Promise<{
  total: number
  avgScore: number
  unaware: number
  problemAware: number
  solutionAware: number
  productAware: number
  mostAware: number
} | null> {
  const supabase = getAdminClient()

  if (!supabase) return null

  try {
    const { data, error } = await supabase.rpc("get_score_distribution")

    if (error || !data) return null

    const d = data as any

    return {
      total: Number(d.total || 0),
      avgScore: Number(d.avg || d.avg_score || 0),
      unaware: Number(d.unaware || 0),
      problemAware: Number(d.problem_aware || 0),
      solutionAware: Number(d.solution_aware || 0),
      productAware: Number(d.product_aware || 0),
      mostAware: Number(d.most_aware || 0),
    }
  } catch {

    return null
  }
}
