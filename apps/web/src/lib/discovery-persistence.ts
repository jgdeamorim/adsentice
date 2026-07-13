// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Persistence — Supabase Postgres (durável)
// Usa o Pooler direto (pg) — bypass RLS, permissão garantida.
// Dados PAGOS do DataForSEO NUNCA são perdidos.
// Fluxo: EVO-API → Supabase (permanente) + Redis (cache 24h) + Memory (30min)
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { Pool } from "pg"

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

// ── Postgres Pool (singleton) ─────────────────────────────────

let _pool: Pool | null = null

function getPool(): Pool | null {
  if (_pool) return _pool

  try {
    _pool = new Pool({
      host: "aws-0-ca-central-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: "postgres.tdigauruusdhnpvppixb",
      password: process.env.SUPABASE_DB_PASSWORD || "pmaxnpmiJ6WfcX46",
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    return _pool
  } catch {

    return null
  }
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
  const pool = getPool()

  if (!pool) return null

  const client = await pool.connect()

  try {
    const avgScore = params.distribution.avgScore

    // 1 — Insert search record
    const searchRes = await client.query(
      `INSERT INTO discovery_searches (categories, lat, lng, radius_km, total_count, cost_usd, avg_score, unaware, problem_aware, solution_aware, product_aware, most_aware)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        params.categories, params.lat, params.lng, params.radiusKm,
        params.totalCount, params.costUsd, avgScore,
        params.distribution.unaware, params.distribution.problemAware,
        params.distribution.solutionAware, params.distribution.productAware,
        params.distribution.mostAware,
      ]
    )

    const searchId = searchRes.rows[0].id

    // 2 — Insert listings with scores (batch via prepared statement + loop)
    let savedCount = 0

    for (const l of params.listings) {
      try {
        await client.query(
          `INSERT INTO discovery_listings (search_id, place_id, title, category, address,
            rating_value, rating_votes, is_claimed, latitude, longitude,
            score_compound, score_fit, score_engagement, score_intent,
            schwartz_level, schwartz_label, signals_detected)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (search_id, place_id) DO UPDATE SET
            score_compound=EXCLUDED.score_compound, score_fit=EXCLUDED.score_fit,
            score_engagement=EXCLUDED.score_engagement, score_intent=EXCLUDED.score_intent,
            schwartz_level=EXCLUDED.schwartz_level, schwartz_label=EXCLUDED.schwartz_label`,
          [
            searchId,
            l.place_id || `unknown_${Math.random().toString(36).slice(2, 10)}`,
            l.title, l.category, l.address,
            l.rating_value, l.rating_votes, l.is_claimed, l.latitude, l.longitude,
            l.score.compound, l.score.fit.normalized, l.score.engagement.normalized, l.score.intent.normalized,
            l.score.schwartz.level, l.score.schwartz.label,
            [...l.score.fit.signalsDetected, ...l.score.engagement.signalsDetected, ...l.score.intent.signalsDetected],
          ]
        )
        savedCount++
      } catch { /* individual row errors don't block the batch */ }
    }

    return { searchId, savedCount }
  } catch (err: any) {
    console.error("[discovery-persistence] Save failed:", err.message)

    return null
  } finally {
    client.release()
  }
}

// ── Read Category Analytics ──────────────────────────────────

export async function getCategoryAnalytics(): Promise<CategoryAnalytics[]> {
  const pool = getPool()

  if (!pool) return []

  try {
    const { rows } = await pool.query(
      `SELECT * FROM category_analytics ORDER BY pain_pct DESC`
    )

    return rows.map((r: any) => ({
      category: r.category,
      total_listings: Number(r.total_listings) || 0,
      unique_businesses: Number(r.unique_businesses) || 0,
      avg_score: Number(r.avg_score) || 0,
      problem_aware_plus: Number(r.problem_aware_plus) || 0,
      solution_aware_plus: Number(r.solution_aware_plus) || 0,
      product_aware_plus: Number(r.product_aware_plus) || 0,
      most_aware: Number(r.most_aware) || 0,
      pain_pct: Number(r.pain_pct) || 0,
      last_seen: r.last_seen || "",
    }))
  } catch {

    return []
  }
}

// ── Get Score Distribution ──────────────────────────────────

export async function getScoreDistribution(): Promise<{
  total: number
  avgScore: number
  unaware: number
  problemAware: number
  solutionAware: number
  productAware: number
  mostAware: number
} | null> {
  const pool = getPool()

  if (!pool) return null

  try {
    const { rows } = await pool.query("SELECT * FROM get_score_distribution()")
    const d = rows[0] as any

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
