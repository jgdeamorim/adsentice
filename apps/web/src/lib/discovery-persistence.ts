// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Persistence — Supabase Postgres (durável)
// Usa o Pooler direto (pg) — bypass RLS, permissão garantida.
// Dados PAGOS do DataForSEO NUNCA são perdidos.
// Fluxo: EVO-API → Supabase (permanente) + Redis (cache 24h) + Memory (30min)
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { Pool } from "pg"

import type { ScoreData } from "./scoring"
import type { GMBListing } from "./provider-core-adapter"

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
            schwartz_level, schwartz_label, signals_detected,
            website, phone, total_photos, description, business_status,
            city, district, postal_code, country_code, categories_arr, price_level,
            contact_methods, enrichment_level,
            l2_onpage_score, l2_meta_title, l2_meta_description, l2_word_count,
            l2_internal_links_count, l2_external_links_count, l2_images_count,
            l2_seo_checks, l2_cms, l2_has_analytics, l2_technology_categories,
            l2_domain_rank, l2_country_iso_code,
            l2_lighthouse_performance, l2_lighthouse_accessibility,
            l2_lighthouse_best_practices, l2_lighthouse_seo, l2_lighthouse_pwa,
            l2_enriched_at, l2_cost_usd,
            l2_content_maturity, l2_content_gaps)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52)
           ON CONFLICT (search_id, place_id) DO UPDATE SET
            score_compound=EXCLUDED.score_compound, score_fit=EXCLUDED.score_fit,
            score_engagement=EXCLUDED.score_engagement, score_intent=EXCLUDED.score_intent,
            schwartz_level=EXCLUDED.schwartz_level, schwartz_label=EXCLUDED.schwartz_label,
            website=EXCLUDED.website, phone=EXCLUDED.phone,
            total_photos=EXCLUDED.total_photos, description=EXCLUDED.description,
            business_status=EXCLUDED.business_status,
            city=EXCLUDED.city, district=EXCLUDED.district,
            postal_code=EXCLUDED.postal_code, country_code=EXCLUDED.country_code,
            categories_arr=EXCLUDED.categories_arr, price_level=EXCLUDED.price_level,
            contact_methods=EXCLUDED.contact_methods, enrichment_level=EXCLUDED.enrichment_level,
            l2_onpage_score=EXCLUDED.l2_onpage_score, l2_meta_title=EXCLUDED.l2_meta_title,
            l2_meta_description=EXCLUDED.l2_meta_description, l2_word_count=EXCLUDED.l2_word_count,
            l2_internal_links_count=EXCLUDED.l2_internal_links_count, l2_external_links_count=EXCLUDED.l2_external_links_count,
            l2_images_count=EXCLUDED.l2_images_count, l2_seo_checks=EXCLUDED.l2_seo_checks,
            l2_cms=EXCLUDED.l2_cms, l2_has_analytics=EXCLUDED.l2_has_analytics,
            l2_technology_categories=EXCLUDED.l2_technology_categories,
            l2_domain_rank=EXCLUDED.l2_domain_rank, l2_country_iso_code=EXCLUDED.l2_country_iso_code,
            l2_lighthouse_performance=EXCLUDED.l2_lighthouse_performance,
            l2_lighthouse_accessibility=EXCLUDED.l2_lighthouse_accessibility,
            l2_lighthouse_best_practices=EXCLUDED.l2_lighthouse_best_practices,
            l2_enriched_at=EXCLUDED.l2_enriched_at, l2_cost_usd=EXCLUDED.l2_cost_usd,
            l2_content_maturity=EXCLUDED.l2_content_maturity, l2_content_gaps=EXCLUDED.l2_content_gaps`,
          [
            searchId,
            l.place_id || `unknown_${Math.random().toString(36).slice(2, 10)}`,
            l.title, l.category, l.address,
            l.rating_value, l.rating_votes, l.is_claimed, l.latitude, l.longitude,
            l.score.compound, l.score.fit.normalized, l.score.engagement.normalized, l.score.intent.normalized,
            l.score.schwartz.level, l.score.schwartz.label,
            [...l.score.fit.signalsDetected, ...l.score.engagement.signalsDetected, ...l.score.intent.signalsDetected],
            (l as any).website || null,
            (l as any).phone || null,
            (l as any).total_photos || null,
            (l as any).description || null,
            (l as any).business_status || null,
            (l as any).city || null,
            (l as any).district || null,
            (l as any).postal_code || null,
            (l as any).country_code || null,
            (l as any).categories || null,
            (l as any).price_level || null,
            (l as any).contact_methods || null,
            (l as any).enrichment_level ?? ((l as any).l2_onpage_score ? 2 : (l as any).website || (l as any).phone || (l as any).total_photos ? 1 : 0),
            // L2 fields ($31-$50)
            (l as any).l2_onpage_score || null,
            (l as any).l2_meta_title || null,
            (l as any).l2_meta_description || null,
            (l as any).l2_word_count || null,
            (l as any).l2_internal_links_count || null,
            (l as any).l2_external_links_count || null,
            (l as any).l2_images_count || null,
            (l as any).l2_seo_checks ? JSON.stringify((l as any).l2_seo_checks) : null,
            (l as any).l2_cms || null,
            (l as any).l2_has_analytics ?? null,
            (l as any).l2_technology_categories || null,
            (l as any).l2_domain_rank || null,
            (l as any).l2_country_iso_code || null,
            (l as any).l2_lighthouse_performance || null,
            (l as any).l2_lighthouse_accessibility || null,
            (l as any).l2_lighthouse_best_practices || null,
            (l as any).l2_lighthouse_seo || null,
            (l as any).l2_lighthouse_pwa || null,
            (l as any).l2_enriched_at || null,
            (l as any).l2_cost_usd || 0,
            (l as any).l2_content_maturity ?? null,
            (l as any).l2_content_gaps ? JSON.stringify((l as any).l2_content_gaps) : null,
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
