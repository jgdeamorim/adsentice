// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Market Time-Series Holds
// Padrão absorvido do EVO-API rsxt-t0:
//   SeriesId = "sig_{metric}_{tenant␟provider␟capability␟entity}"
//   Append-only, imutável, geo-suffixed entities
//   Dual-write: tenant + __market__ (shared intelligence moat)
//
// Uso:
//   await appendMarketHold({ category: 'dentist', city: 'Rio de Janeiro',
//     metric: 'avg_score', value: 64.5, searchId: '...' })
//   const trend = await queryMarketTrends('dentist', 'Rio de Janeiro', 'avg_score')
//
// medido=verdade · 2026-07-15 · adsentice
// ══════════════════════════════════════════════════════════════════

// ── Types ──

export interface MarketHold {
  tenant?: string
  category: string
  city: string
  metric: MarketMetric
  value: number
  source?: string
  searchId?: string
  metadata?: Record<string, unknown>
}

export type MarketMetric =
  | 'avg_score' | 'total_businesses' | 'avg_rating' | 'avg_photos'
  | 'claimed_pct' | 'website_pct' | 'analytics_pct'
  | 'unaware_pct' | 'problem_aware_pct' | 'solution_aware_pct'
  | 'product_aware_pct' | 'most_aware_pct'
  | 'search_volume' | 'competitor_density'

// ── Market Hold Append ──

/** Salva snapshot de agregado de mercado (padrão rsxt-t0 append).
 *  Chamado a cada Discovery search — acumula série temporal. */
export async function appendMarketHold(hold: MarketHold): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdigauruusdhnpvppixb.supabase.co'}/rest/v1/market_holds`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        tenant: hold.tenant || 'adsentice',
        category: hold.category,
        city: hold.city,
        metric: hold.metric,
        value: hold.value,
        source: hold.source || 'supabase_aggregate',
        search_id: hold.searchId || null,
        metadata: hold.metadata || {},
      }),
    })
  } catch {
    // Degrade gracefully — market holds are non-critical
  }
}

/** Batch append — multiple metrics from same search */
export async function appendMarketHolds(holds: MarketHold[]): Promise<void> {
  await Promise.all(holds.map(appendMarketHold))
}

// ── Redis cache (fast read path) ──

function redisCli(cmd: string): string | null {
  try {
    const { execSync } = require('child_process')
    return execSync(`redis-cli -p 6396 --no-auth-warning ${cmd}`, {
      timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()
  } catch { return null }
}

/** Cacheia o último snapshot no Redis (TTL 1h) */
export function cacheMarketSnapshot(hold: MarketHold): void {
  redisCli(`SETEX adsentice:market:${hold.category}:${hold.city}:${hold.metric} 3600 ${hold.value}`)
}

// ── Query (from Supabase REST) ──

export interface MarketTrendPoint {
  recorded_at: string
  value: number
}

/** Lê série temporal do Supabase (últimos N pontos) */
export async function queryMarketTrends(
  category: string,
  city: string,
  metric: MarketMetric,
  limit = 30
): Promise<MarketTrendPoint[]> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tdigauruusdhnpvppixb.supabase.co'}/rest/v1/market_holds`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  try {
    const params = new URLSearchParams({
      category: `eq.${category}`,
      city: `eq.${city}`,
      metric: `eq.${metric}`,
      order: 'recorded_at.desc',
      limit: String(limit),
      select: 'recorded_at,value',
    })
    const res = await fetch(`${url}?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { recorded_at: string; value: number }[]
    return data.reverse()  // chronological order
  } catch { return [] }
}
