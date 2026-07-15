// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Keyword Trends ($0.009/call)
// Google Trends: interesse ao longo do tempo para ate 5 keywords.
// medido=verdade — sazonalidade, picos, tendencias de mercado.
//
// Endpoint: POST /v3/keywords_data/google_trends/explore/live
// Fonte: EVO-API keyword.trends (translator: keyword-trends-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface TrendItem {
  keywords: string[]
  interest_over_time: Array<{ date: string; values: number[] }>
  averages: number[]
}

export async function keywordTrends(params: {
  keywords: string[]; type?: string; date_from?: string; date_to?: string; time_range?: string
}): Promise<TrendItem | null> {
  const c = getDFSEOClient()
  if (!params.keywords?.length || params.keywords.length > 5) return null
  const body = JSON.stringify([{
    keywords: params.keywords, type: params.type || "web",
    date_from: params.date_from, date_to: params.date_to,
    time_range: params.time_range || "past_12_months",
  }])
  const url = `${c.activeUrl}/v3/keywords_data/google_trends/explore/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return null
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  if (!items.length) return null
  const item = items[0]
  const timeline = (item.data || item.interest_over_time || []) as Array<{ date_from?: string; timestamp?: number; values?: number[] }>
  return {
    keywords: (item.keywords as string[]) || params.keywords,
    interest_over_time: Array.isArray(timeline) ? timeline.map(t => ({
      date: (t.date_from as string) || "",
      values: (t.values as number[]) || [],
    })) : [],
    averages: (item.averages as number[]) || [],
  }
}
