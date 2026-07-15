// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Keyword Research ($0.02/call)
// Volume de busca + CPC + dificuldade + intencao + tendencia 12 meses.
// medido=verdade — cornerstone capability do pipeline de keywords.
//
// Endpoint: POST /v3/dataforseo_labs/google/keyword_overview/live
// Fonte: EVO-API keyword.research (translator: keyword-research-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface KeywordResearch {
  keyword: string
  volume: number
  cpc: number | null
  difficulty: number | null
  intent: string | null
  competition: number | null
  competition_level: string | null
  trend: Array<{ year: number; month: number; volume: number }>
  categories: number[] | null
}

export async function keywordResearch(params: {
  keyword: string; location_code?: number; language_code?: string
}): Promise<KeywordResearch | null> {
  const c = getDFSEOClient()
  const kw = params.keyword?.trim(); if (!kw || kw.length > 700) return null
  const body = JSON.stringify([{
    keywords: [kw], location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/keyword_overview/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return null
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  const item = items[0]; if (!item) return null
  const info = (item.keyword_info || item) as Record<string, unknown>
  const props = (item.keyword_properties || {}) as Record<string, unknown>
  const intentObj = (item.search_intent_info || {}) as Record<string, unknown>
  const diff = props.keyword_difficulty as number | undefined
  const history = (info.monthly_searches || info.search_volume_trend || []) as Array<{ year: number; month: number; search_volume: number }>
  return {
    keyword: kw,
    volume: (info.search_volume as number) ?? 0,
    cpc: (info.cpc as number) ?? null,
    difficulty: diff ? diff / 100 : null,
    intent: (intentObj.main_intent as string) || null,
    competition: (info.competition as number) ?? null,
    competition_level: (info.competition_level as string) || null,
    trend: Array.isArray(history) ? history.map(h => ({ year: h.year, month: h.month, volume: h.search_volume ?? 0 })) : [],
    categories: (info.categories as number[]) || null,
  }
}
