// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Content Sentiment Summary ($0.02003/call)
// Analise de sentimento de mencoes da marca na web.
// Positivo/negativo/neutro, distribuicao por pais, fontes.
//
// Endpoint: POST /v3/content_analysis/summary/live
// Fonte: EVO-API content.sentiment_summary
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface SentimentSummary {
  total_count: number
  top_domains: Array<{ domain: string; count: number }>
  sentiment: Record<string, number>
  connotation: Record<string, number>
  countries: Record<string, number>
}

export async function contentSentiment(params: {
  keyword: string; language_code?: string
}): Promise<SentimentSummary | null> {
  const c = getDFSEOClient()
  const kw = params.keyword?.trim(); if (!kw) return null
  const body = JSON.stringify([{ keyword: kw, language_code: params.language_code || "pt" }])
  const url = `${c.activeUrl}/v3/content_analysis/summary/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return null
  const data = await res.json() as { tasks?: Array<{ result?: Array<Record<string, unknown>> }> }
  const block = data.tasks?.[0]?.result?.[0]
  if (!block) return null
  return {
    total_count: (block.total_count as number) ?? 0,
    top_domains: ((block.top_domains || []) as Array<{ domain: string; count: number }>),
    sentiment: (block.sentiment_connotations as Record<string, number>) || {},
    connotation: (block.connotation_types as Record<string, number>) || {},
    countries: (block.countries as Record<string, number>) || {},
  }
}
