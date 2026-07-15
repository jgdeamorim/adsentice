// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L3 — Domain Keyword Gap ($0.0101/call)
// Keywords que o concorrente rankeia e voce nao (domain intersection).
// medido=verdade — identifica oportunidades reais de conteudo.
//
// Endpoint: POST /v3/dataforseo_labs/google/domain_intersection/live
// Fonte: EVO-API domain.keyword_gap (translator: domain-keyword-gap-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface KeywordGapItem {
  keyword: string
  volume: number | null; cpc: number | null; difficulty: number | null; intent: string | null
  position_target1: number | null
  position_target2: number | null
}

export async function keywordGap(params: {
  target1: string; target2: string; location_code?: number; language_code?: string; limit?: number
}): Promise<KeywordGapItem[]> {
  const c = getDFSEOClient()
  if (!params.target1 || !params.target2) return []
  const body = JSON.stringify([{
    target1: params.target1, target2: params.target2,
    location_code: params.location_code || 2076, language_code: params.language_code || "pt",
    limit: params.limit || 100,
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/domain_intersection/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  return items.map(item => {
    const kw = (item.keyword_data || {}) as Record<string, unknown>
    const info = (kw.keyword_info || {}) as Record<string, unknown>
    const intentObj = (kw.search_intent_info || {}) as Record<string, unknown>
    const diff = ((kw.keyword_properties || {}) as Record<string, unknown>).keyword_difficulty as number | undefined
    const d1 = (item.first_domain_serp_element || {}) as Record<string, unknown>
    const d2 = (item.second_domain_serp_element || {}) as Record<string, unknown>
    return {
      keyword: (kw.keyword as string) || "?",
      volume: (info.search_volume as number) ?? null,
      cpc: (info.cpc as number) ?? null,
      difficulty: diff ? diff / 100 : null,
      intent: (intentObj.main_intent as string) || null,
      position_target1: (d1.rank_absolute as number) ?? null,
      position_target2: (d2.rank_absolute as number) ?? null,
    }
  })
}
