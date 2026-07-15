// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Keyword Search Volume ($0.075/call, ate 1000 keywords)
// Volume de busca + CPC + competicao + historico mensal.
// ⚠️ CARO: \$0.075. Usar em batch — 1 chamada cobre 1000 keywords.
//
// Endpoint: POST /v3/keywords_data/google_ads/search_volume/live
// Fonte: EVO-API keyword.volume (translator: keyword-volume-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface KeywordVolumeItem {
  keyword: string
  search_volume: number
  competition: string | null
  competition_index: number | null
  cpc: number | null
  low_bid: number | null
  high_bid: number | null
  monthly_searches: Array<{ year: number; month: number; search_volume: number }>
}

export async function keywordVolume(params: {
  keywords: string[]; location_code?: number; language_code?: string
}): Promise<KeywordVolumeItem[]> {
  const c = getDFSEOClient()
  if (!params.keywords?.length) return []
  const body = JSON.stringify([{
    keywords: params.keywords.slice(0, 1000), location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
  }])
  const url = `${c.activeUrl}/v3/keywords_data/google_ads/search_volume/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  // result[] is flat (each result IS a keyword item — no nested items[])
  const items = (data.tasks?.[0]?.result || []) as Record<string, unknown>[]
  return items.map(item => {
    const ms = (item.monthly_searches || []) as Array<{ year: number; month: number; search_volume: number }>
    return {
      keyword: (item.keyword as string) || "?",
      search_volume: (item.search_volume as number) ?? 0,
      competition: (item.competition as string) || null,
      competition_index: (item.competition_index as number) ?? null,
      cpc: (item.cpc as number) ?? null,
      low_bid: (item.low_top_of_page_bid as number) ?? null,
      high_bid: (item.high_top_of_page_bid as number) ?? null,
      monthly_searches: Array.isArray(ms) ? ms : [],
    }
  })
}
