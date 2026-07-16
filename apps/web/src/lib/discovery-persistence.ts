// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Persistence — Supabase REST API
// Porta 6543 (PgBouncer) BLOQUEADA → usa REST API (443, sempre online).
// Dados PAGOS do DataForSEO NUNCA são perdidos.
// Fluxo: DataForSEO → Supabase REST (permanente) + Redis (cache 24h) + Memory (30min)
// ══════════════════════════════════════════════════════════════════

import "server-only"

import type { ScoreData } from "./scoring"
import type { GMBListing } from "./provider-core-adapter"
import { pushEvent, pushAlert } from "./telemetry"

// ── Types ───────────────────────────────────────────────────

export interface CategoryAnalytics {
  category: string; total_listings: number; unique_businesses: number
  avg_score: number; problem_aware_plus: number; solution_aware_plus: number
  product_aware_plus: number; most_aware: number; pain_pct: number; last_seen: string
}

// ── Supabase REST helpers ──

const SFX = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

function sbHeaders(): Record<string, string> {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
}

// ── Save Search ─────────────────────────────────────────────

export async function saveDiscoverySearch(params: {
  categories: string[]; lat: number; lng: number; radiusKm: number
  totalCount: number; costUsd: number
  listings: (GMBListing & { score: ScoreData })[]
  distribution: { unaware: number; problemAware: number; solutionAware: number; productAware: number; mostAware: number; avgScore: number }
}): Promise<{ searchId: string; savedCount: number } | null> {
  try {
    const avgScore = params.distribution.avgScore

    // 1 — POST discovery_searches (REST API com Prefer: return=representation)
    const searchBody = {
      categories: params.categories, lat: params.lat, lng: params.lng,
      radius_km: params.radiusKm, total_count: params.totalCount,
      cost_usd: params.costUsd, avg_score: avgScore,
      unaware: params.distribution.unaware, problem_aware: params.distribution.problemAware,
      solution_aware: params.distribution.solutionAware, product_aware: params.distribution.productAware,
      most_aware: params.distribution.mostAware,
    }
    const searchRes = await fetch(`${SFX}/rest/v1/discovery_searches`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=representation" },
      body: JSON.stringify(searchBody),
      signal: AbortSignal.timeout(10000),
    })
    if (!searchRes.ok) {
      const errBody = await searchRes.text().catch(() => "")
      console.error("[discovery-persistence] search insert failed:", searchRes.status, errBody)
      // ⚠️ Dispara telemetria — sensor de falha de persistência
      pushEvent({ route: "/api/discovery-search", status: searchRes.status, latency_ms: 0, provider: "Supabase", error: `INSERT discovery_searches: HTTP ${searchRes.status}`, detail: errBody.slice(0, 500) })
      pushAlert({ level: "critical", route: "/api/discovery-search", message: `Supabase persistência quebrada — HTTP ${searchRes.status}`, detail: errBody.slice(0, 300) })
      return null
    }
    const searchData = await searchRes.json() as { id: string }[]
    const searchId = searchData[0]?.id
    if (!searchId) return null

    // 2 — POST discovery_listings (bulk insert via REST)
    let savedCount = 0
    const listings = params.listings
      .filter(l => l.place_id)  // só salva listings com place_id real
      .map(l => ({
        search_id: searchId,
        place_id: l.place_id!,    // garantido pelo filter acima
        title: l.title || null, category: l.category || null, address: l.address || null,
        rating_value: l.rating_value ?? null, rating_votes: l.rating_votes ?? null,
        is_claimed: l.is_claimed ?? null, latitude: l.latitude ?? null, longitude: l.longitude ?? null,
        score_compound: l.score.compound, score_fit: l.score.fit.normalized,
        score_engagement: l.score.engagement.normalized, score_intent: l.score.intent.normalized,
        schwartz_level: l.score.schwartz.level, schwartz_label: l.score.schwartz.label,
        signals_detected: [...l.score.fit.signalsDetected, ...l.score.engagement.signalsDetected, ...l.score.intent.signalsDetected],
        website: (l as any).website || null, phone: (l as any).phone || null,
        total_photos: (l as any).total_photos || null, description: (l as any).description || null,
      business_status: (l as any).business_status || null,
      city: (l as any).city || null, district: (l as any).district || null,
      postal_code: (l as any).postal_code || null, country_code: (l as any).country_code || null,
      categories_arr: (l as any).categories || null, price_level: (l as any).price_level || null,
      contact_methods: (l as any).contact_methods || null,
      enrichment_level: (l as any).enrichment_level ?? ((l as any).l2_onpage_score ? 2 : (l as any).website || (l as any).phone || (l as any).total_photos ? 1 : 0),
      l2_onpage_score: (l as any).l2_onpage_score || null,
      l2_meta_title: (l as any).l2_meta_title || null, l2_meta_description: (l as any).l2_meta_description || null,
      l2_word_count: (l as any).l2_word_count || null,
      l2_internal_links_count: (l as any).l2_internal_links_count || null,
      l2_external_links_count: (l as any).l2_external_links_count || null,
      l2_images_count: (l as any).l2_images_count || null,
      l2_seo_checks: (l as any).l2_seo_checks ? JSON.stringify((l as any).l2_seo_checks) : null,
      l2_cms: (l as any).l2_cms || null, l2_has_analytics: (l as any).l2_has_analytics ?? null,
      l2_technology_categories: (l as any).l2_technology_categories || null,
      l2_domain_rank: (l as any).l2_domain_rank || null, l2_country_iso_code: (l as any).l2_country_iso_code || null,
      l2_lighthouse_performance: (l as any).l2_lighthouse_performance || null,
      l2_lighthouse_accessibility: (l as any).l2_lighthouse_accessibility || null,
      l2_lighthouse_best_practices: (l as any).l2_lighthouse_best_practices || null,
      l2_lighthouse_seo: (l as any).l2_lighthouse_seo || null, l2_lighthouse_pwa: (l as any).l2_lighthouse_pwa || null,
      l2_enriched_at: (l as any).l2_enriched_at || null, l2_cost_usd: (l as any).l2_cost_usd || 0,
      l2_content_maturity: (l as any).l2_content_maturity ?? null,
      l2_content_gaps: (l as any).l2_content_gaps ? JSON.stringify((l as any).l2_content_gaps) : null,
      l2_emails: (l as any).l2_emails || null,
      l2_social_links: (l as any).l2_social_links ? JSON.stringify((l as any).l2_social_links) : null,
      // L3: Social & Contacts (ADR-0024)
      l3_emails: (l as any).l3_emails || null,
      l3_social_links: (l as any).l3_social_links ? JSON.stringify((l as any).l3_social_links) : null,
      l3_whatsapp: (l as any).l3_whatsapp || null,
      // L4: IBGE Context (ADR-0024)
      l4_ibge_populacao: (l as any).l4_ibge_populacao || null,
      l4_ibge_pib_per_capita: (l as any).l4_ibge_pib_per_capita || null,
      l4_ibge_densidade: (l as any).l4_ibge_densidade || null,
      l4_ibge_renda_media: (l as any).l4_ibge_renda_media || null,
    }))

    // 3 — Bulk insert (one POST per listing)
    const skipped = params.listings.length - listings.length
    if (skipped > 0) console.log(`[discovery-persistence] Skipped ${skipped} listings without place_id`)

    for (const listing of listings) {
      try {
        await fetch(`${SFX}/rest/v1/discovery_listings?search_id=eq.${encodeURIComponent(searchId)}&place_id=eq.${encodeURIComponent(listing.place_id)}`, {
          method: "DELETE", headers: { ...sbHeaders(), Prefer: "return=minimal" }, signal: AbortSignal.timeout(5000),
        })
        const insRes = await fetch(`${SFX}/rest/v1/discovery_listings`, {
          method: "POST", headers: { ...sbHeaders(), Prefer: "return=minimal" },
          body: JSON.stringify(listing), signal: AbortSignal.timeout(5000),
        })
        if (insRes.ok) savedCount++
      } catch { /* skip individual failures */ }
    }
    console.log(`[discovery-persistence] Saved ${savedCount}/${listings.length} listings for search ${searchId}`)

    return { searchId, savedCount }
  } catch (err: any) {
    console.error("[discovery-persistence] Save failed:", err.message)
    return null
  }
}

// ── Read Category Analytics ──────────────────────────────────

export async function getCategoryAnalytics(): Promise<CategoryAnalytics[]> {
  try {
    const res = await fetch(`${SFX}/rest/v1/category_analytics?order=pain_pct.desc`, {
      headers: sbHeaders(), signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const rows = await res.json() as any[]
    return rows.map((r: any) => ({
      category: r.category, total_listings: Number(r.total_listings) || 0,
      unique_businesses: Number(r.unique_businesses) || 0, avg_score: Number(r.avg_score) || 0,
      problem_aware_plus: Number(r.problem_aware_plus) || 0,
      solution_aware_plus: Number(r.solution_aware_plus) || 0,
      product_aware_plus: Number(r.product_aware_plus) || 0,
      most_aware: Number(r.most_aware) || 0, pain_pct: Number(r.pain_pct) || 0,
      last_seen: r.last_seen || "",
    }))
  } catch { return [] }
}

// ── Get Score Distribution ──────────────────────────────────

export async function getScoreDistribution(): Promise<{
  total: number; avgScore: number; unaware: number; problemAware: number
  solutionAware: number; productAware: number; mostAware: number
} | null> {
  try {
    const res = await fetch(`${SFX}/rest/v1/rpc/get_score_distribution`, {
      method: "POST", headers: sbHeaders(), signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const d = (await res.json()) as any
    return {
      total: Number(d.total || 0), avgScore: Number(d.avg || d.avg_score || 0),
      unaware: Number(d.unaware || 0), problemAware: Number(d.problem_aware || 0),
      solutionAware: Number(d.solution_aware || 0), productAware: Number(d.product_aware || 0),
      mostAware: Number(d.most_aware || 0),
    }
  } catch { return null }
}
