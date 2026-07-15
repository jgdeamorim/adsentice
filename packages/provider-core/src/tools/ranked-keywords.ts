// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L3 — Domain Ranked Keywords ($0.0101/call)
// TODAS as keywords que um dominio rankeia + posicao + volume + intent.
// medido=verdade — content gap REAL baseado no que o concorrente rankeia.
//
// Endpoint: POST /v3/dataforseo_labs/google/ranked_keywords/live
// Fonte: EVO-API domain.ranked_keywords (translator: domain-ranked-keywords-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface RankedKeyword {
  keyword: string
  position: number
  volume: number | null
  cpc: number | null
  difficulty: number | null
  intent: string | null
  traffic: number | null
}

export async function rankedKeywords(params: {
  target: string; location_code?: number; language_code?: string; limit?: number
}): Promise<RankedKeyword[]> {
  const c = getDFSEOClient()
  if (!params.target) return []
  const body = JSON.stringify([{
    target: params.target, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt", limit: params.limit || 100,
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/ranked_keywords/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  return items.map(item => {
    const kw = (item.keyword_data || {}) as Record<string, unknown>
    const info = (kw.keyword_info || {}) as Record<string, unknown>
    const intentObj = (kw.search_intent_info || {}) as Record<string, unknown>
    const serp = ((item.ranked_serp_element || {}) as Record<string, unknown>).serp_item as Record<string, unknown> | undefined
    const diff = (kw.keyword_properties as Record<string, unknown> | undefined)?.keyword_difficulty as number | undefined
    return {
      keyword: (kw.keyword as string) || "?",
      position: (serp?.rank_absolute as number) ?? 0,
      volume: (info.search_volume as number) ?? null,
      cpc: (info.cpc as number) ?? null,
      difficulty: diff ? diff / 100 : null,
      intent: (intentObj.main_intent as string) || null,
      traffic: (serp?.etv as number) ?? null,
    }
  })
}
