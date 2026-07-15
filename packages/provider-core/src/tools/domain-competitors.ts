// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L3 — Domain Competitors ($0.0101/call)
// TOP 20 dominios competindo pelas mesmas keywords.
// medido=verdade — competitive landscape REAL, nao estimado.
//
// Endpoint: POST /v3/dataforseo_labs/google/competitors_domain/live
// Fonte: EVO-API domain.competitors (translator: domain-competitors-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface DomainCompetitor {
  domain: string
  common_keywords: number
  organic_traffic: number | null
  paid_traffic: number | null
  avg_position: number | null
}

export async function domainCompetitors(params: {
  target: string; location_code?: number; language_code?: string; limit?: number
}): Promise<DomainCompetitor[]> {
  const c = getDFSEOClient()
  if (!params.target) return []
  const body = JSON.stringify([{
    target: params.target, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt", limit: params.limit || 100,
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/competitors_domain/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  return items.map(item => {
    const m = (item.full_domain_metrics || {}) as Record<string, unknown>
    const o = (m.organic || {}) as Record<string, unknown>
    const p = (m.paid || {}) as Record<string, unknown>
    return {
      domain: (item.domain as string) || "?",
      common_keywords: (item.intersections as number) ?? 0,
      organic_traffic: (o.etv as number) ?? null,
      paid_traffic: (p.etv as number) ?? null,
      avg_position: (item.avg_position as number) ?? null,
    }
  })
}
