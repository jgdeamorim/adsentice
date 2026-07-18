/**
 * packages/warp/src/quality-gate.ts
 * ADR-0033 N5 — Quality Gate (port do adsentice_embed_quality_gate.py)
 *
 * 5 checks automáticos em cada geração. $0 — heurísticas puras.
 * Validado contra meta sidecar, NUNCA no HTML do cliente.
 *
 * medido=verdade · 2026-07-18 · adsentice
 */

export interface QGResult {
  passed: boolean
  score: number
  checks: Record<string, boolean>
  details: Record<string, string>
}

/** 5 checks: a11y, performance, schema, semantic, responsive */
export function qualityGate(html: string): QGResult {
  const checks: Record<string, boolean> = {}
  const details: Record<string, string> = {}

  // 1. A11y — ≥4 roles, ≥6 aria-labels
  const roles = (html.match(/role="\w+"/g) || []).length
  const labels = (html.match(/aria-label="/g) || []).length
  checks.a11y = roles >= 4 && labels >= 6
  details.a11y = `${roles} roles, ${labels} aria-labels`

  // 2. Performance — font-display + preconnect
  const hasFontDisplay = html.includes("font-display:swap")
  const hasPreconnect = html.includes("preconnect")
  checks.performance = hasFontDisplay && hasPreconnect
  details.performance = `font-display:${hasFontDisplay} preconnect:${hasPreconnect}`

  // 3. Schema — JSON-LD with name
  const hasSchema = html.includes("application/ld+json")
  const hasName = html.includes('"name":"')
  checks.schema = hasSchema && hasName
  details.schema = `JSON-LD:${hasSchema} name:${hasName}`

  // 4. Semantic HTML5
  const hasHeader = html.includes("<header ")
  const hasMain = html.includes("<main ")
  const hasFooter = html.includes("<footer")
  checks.semantic = hasHeader && hasMain && hasFooter
  details.semantic = `header:${hasHeader} main:${hasMain} footer:${hasFooter}`

  // 5. Responsive
  const hasViewport = html.includes("viewport")
  const hasMedia = html.includes("@media")
  checks.responsive = hasViewport && hasMedia
  details.responsive = `viewport:${hasViewport} @media:${hasMedia}`

  const score = Object.values(checks).filter(Boolean).length
  return { passed: score >= 4, score, checks, details }
}
