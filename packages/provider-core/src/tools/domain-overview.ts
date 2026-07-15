// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L3 — Domain Overview ($0.0101/call)
// Snapshot rapido de trafego organico+pago de um dominio.
// medido=verdade — overview antes de decidir se faz deep dive no dominio.
//
// Endpoint: POST /v3/dataforseo_labs/google/domain_rank_overview/live
// Fonte: EVO-API domain.overview (translator: domain-overview-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface DomainOverview {
  target: string
  organic_traffic: number | null
  organic_keywords: number | null
  paid_traffic: number | null
  paid_keywords: number | null
  top_3: number
  top_10: number
}

export async function domainOverview(params: {
  target: string; location_code?: number; language_code?: string
}): Promise<DomainOverview | null> {
  const c = getDFSEOClient()
  if (!params.target) return null
  const body = JSON.stringify([{
    target: params.target, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
  }])
  const url = `${c.activeUrl}/v3/dataforseo_labs/google/domain_rank_overview/live`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return null
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.flatMap(r => (r.items || []) as Record<string, unknown>[]) || []
  const item = items[0]; if (!item) return null
  const m = (item.metrics || {}) as Record<string, unknown>
  const o = (m.organic || {}) as Record<string, unknown>
  const p = (m.paid || {}) as Record<string, unknown>
  return {
    target: params.target,
    organic_traffic: (o.etv as number) ?? null,
    organic_keywords: (o.count as number) ?? null,
    paid_traffic: (p.etv as number) ?? null,
    paid_keywords: (p.count as number) ?? null,
    top_3: ensure((o.pos_1 as number), 0) + ensure((o.pos_2_3 as number), 0),
    top_10: ensure((o.pos_1 as number), 0) + ensure((o.pos_2_3 as number), 0) + ensure((o.pos_4_10 as number), 0),
  }
}
function ensure(v: unknown, fb: number): number { const n = Number(v); return isNaN(n) || !isFinite(n) ? fb : n }
