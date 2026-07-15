// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Related Keywords ($0.0109/call)
// Keywords relacionadas por busca semantica (depth 0-4 niveis).
//
// Endpoint: POST /v3/dataforseo_labs/google/related_keywords/live
// Fonte: EVO-API keyword.related (translator: keyword-related-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface RelatedKeywordItem {
  keyword: string; search_volume: number; competition: string | null
  competition_index: number | null; cpc: number | null; depth: number
}

export async function relatedKeywords(params: {
  seed_keyword: string; location_code?: number; language_code?: string; depth?: number
}): Promise<RelatedKeywordItem[]> {
  const c = getDFSEOClient()
  const kw = params.seed_keyword?.trim(); if (!kw || kw.length > 700) return []
  const body = JSON.stringify([{
    keyword: kw, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt", depth: params.depth ?? 1,
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/related_keywords/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  return (data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || [])
    .map(item => ({
      keyword: (item.keyword as string) || "?",
      search_volume: (item.search_volume as number) ?? 0,
      competition: (item.competition as string) || null,
      competition_index: (item.competition_index as number) ?? null,
      cpc: (item.cpc as number) ?? null,
      depth: (item.depth as number) ?? 1,
    }))
}
