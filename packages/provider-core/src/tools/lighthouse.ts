// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2 — Lighthouse Audit ($0.00425/call)
// Core Web Vitals + Performance + SEO + Accessibility scores reais.
// medido=verdade — fecha gap "Site sem otimizacao mobile" no S10.
//
// Endpoint: POST /v3/on_page/lighthouse/live/json
// Response: result[0].categories.{name}.score  (0.0-1.0)
// Fonte: EVO-API on_page.lighthouse · Sandbox+Live testados
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface LighthouseScores {
  performance: number
  accessibility: number
  best_practices: number
  seo: number
  pwa: number | null
}

export interface LighthouseAudit {
  url: string
  scores: LighthouseScores
}

/**
 * L2 — Lighthouse Audit ($0.00425).
 * Scores 0.0-1.0. SLA: ~60s (251KB resposta).
 */
export async function onPageLighthouse(url: string): Promise<LighthouseAudit | null> {
  const c = getDFSEOClient()
  if (!url) return null

  // lighthouse/json NÃO suporta .ai suffix
  const body = JSON.stringify([{ url }])
  const endpoint = "/v3/on_page/lighthouse/live/json"
  const fullUrl = `${c.activeUrl}${endpoint}`
  const res = await fetch(fullUrl, {
    method: "POST",
    headers: { Authorization: c.authHeader, "Content-Type": "application/json" },
    body,
  })
  if (!res.ok) return null
  const data = await res.json() as { tasks?: Array<{ result?: Array<Record<string, unknown>> }> }
  const result = data.tasks?.[0]?.result?.[0]
  if (!result) return null

  // Scores em result.categories.{category}.score
  const cats = (result.categories || {}) as Record<string, { score: number }>
  return {
    url: result.finalDisplayedUrl as string || url,
    scores: {
      performance: cats.performance?.score ?? 0,
      accessibility: cats.accessibility?.score ?? 0,
      best_practices: cats["best-practices"]?.score ?? 0,
      seo: cats.seo?.score ?? 0,
      pwa: cats.pwa?.score ?? null,
    },
  }
}
