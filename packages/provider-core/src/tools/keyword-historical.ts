// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Keyword Historical Data ($0.0101/call)
// Ate 56 meses de historico de volume + competition + CPC.
// MARKET HOLD PURO — cada keyword e uma serie temporal OHLCV.
// Equivalente ao capital.RS Ohlcv { ts_ns, o, h, l, c, v }.
//
// Endpoint: POST /v3/dataforseo_labs/google/historical_keyword_data/live
// Fonte: EVO-API databases.keyword.historical (ADR-0111 t0 hold)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface KeywordHistoricalPoint {
  year: number; month: number; search_volume: number; competition: number | null; cpc: number | null
}

export interface KeywordHistorical {
  keyword: string
  history: KeywordHistoricalPoint[]
}

export async function keywordHistorical(params: {
  keywords: string[]; location_code?: number; language_code?: string
}): Promise<KeywordHistorical[]> {
  const c = getDFSEOClient()
  if (!params.keywords?.length) return []
  const body = JSON.stringify([{
    keywords: params.keywords.slice(0, 700), location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/historical_keyword_data/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  return items.map(item => {
    const history = (item.history || []) as Array<Record<string, unknown>>
    return {
      keyword: (item.keyword as string) || "?",
      history: Array.isArray(history) ? history.map(h => ({
        year: (h.year as number) ?? 0,
        month: (h.month as number) ?? 0,
        search_volume: (h.search_volume as number) ?? 0,
        competition: (h.competition as number) ?? null,
        cpc: (h.cpc as number) ?? null,
      })) : [],
    }
  })
}
