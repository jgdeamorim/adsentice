/**
 * packages/warp/src/best-practice-kg.ts
 * Best Practice Knowledge Graph — ADR-0037 Fase 3
 *
 * Consulta 85+ best practices (React, WCAG, shadcn, landing, dark mode)
 * do Qdrant adsentice-self (kind=best-practice) via vec() semântico.
 *
 * Pipeline:
 *   domain + segment + surface
 *     → queryBestPractices(domain, segment, surface) → ranked rules
 *     → morph-resolver consome para enforcement
 *     → QG consome para validação
 *
 * Cost: $0 (Qdrant local :6352 + embed :8081)
 * medido=verdade · 2026-07-18 · adsentice
 */

const QDRANT = "http://127.0.0.1:6352"
const EMBED = "http://127.0.0.1:8081/embed"
const COLLECTION = "adsentice-self"

async function embedQuery(text: string): Promise<number[]> {
  try {
    const res = await fetch(EMBED, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text] }), signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.vectors?.[0] || []
  } catch { return [] }
}

async function qdrantSearch(vector: number[], filter: Record<string, unknown>, limit = 5): Promise<any[]> {
  try {
    const res = await fetch(`${QDRANT}/collections/${COLLECTION}/points/search`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector, limit, filter, with_payload: true }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    return (await res.json()).result || []
  } catch { return [] }
}

export interface BestPracticeRule {
  id: string; name: string; domain: string; category: string
  severity: string; description: string; source: string; score: number
}

/**
 * Query Qdrant for best practices matching a domain + segment.
 * Domain: a11y, react-performance, design-system, conversion, color-scheme
 */
export async function queryBestPractices(
  domain: string,
  segment?: string,
  surface?: string,
): Promise<BestPracticeRule[]> {
  try {
    const query = `${domain} best practice ${segment || ''} ${surface || ''} design guidelines`
    const vec = await embedQuery(query)
    if (vec.length === 0) return []

    const filter: Record<string, unknown> = {
      must: [
        { key: "kind", match: { value: "best-practice" } },
        { key: "domain", match: { value: domain } },
      ],
    }
    const results = await qdrantSearch(vec, filter, 8)
    return results.map(p => {
      const pl = p.payload || {}
      return {
        id: (pl.id as string) || (pl.name as string) || "",
        name: (pl.name as string) || "",
        domain: (pl.domain as string) || domain,
        category: (pl.category as string) || "",
        severity: (pl.severity as string) || "medium",
        description: (pl.description as string) || (pl.text as string) || "",
        source: (pl.source as string) || "",
        score: p.score || 0,
      }
    }).sort((a, b) => {
      const sev = { critical: 4, high: 3, medium: 2, low: 1 }
      return (sev[b.severity] || 0) - (sev[a.severity] || 0) || b.score - a.score
    })
  } catch { return [] }
}

/**
 * Get top a11y violations for the current render context.
 * Returns rules that SHOULD be enforced in the HTML output.
 */
export function getA11yEnforcement(rules: BestPracticeRule[]): string[] {
  const enforced: string[] = []
  for (const r of rules) {
    if (r.id.includes("contrast")) enforced.push("/* a11y: contrast-minimum — text ≥4.5:1, large ≥3:1 */")
    if (r.id.includes("focus-visible")) enforced.push("/* a11y: :focus-visible outline 2px solid */")
    if (r.id.includes("aria-landmarks")) enforced.push("/* a11y: landmarks — banner, main, contentinfo roles */")
    if (r.id.includes("prefers-reduced-motion")) enforced.push("/* a11y: @media(prefers-reduced-motion:reduce) */")
    if (r.id.includes("heading-hierarchy")) enforced.push("/* a11y: single h1, logical heading outline */")
    if (r.id.includes("semantic-html")) enforced.push("/* a11y: native elements — button not div[onclick] */")
  }
  return [...new Set(enforced)].slice(0, 5)
}

/**
 * Get React performance enforcement for the current render.
 */
export function getPerfEnforcement(rules: BestPracticeRule[]): string[] {
  const enforced: string[] = []
  for (const r of rules) {
    if (r.id.includes("bundle") || r.id.includes("dynamic-imports")) enforced.push("/* perf: next/dynamic for heavy components */")
    if (r.id.includes("server-cache")) enforced.push("/* perf: React.cache() for per-request dedup */")
    if (r.id.includes("parallel")) enforced.push("/* perf: Promise.all() for independent fetches */")
    if (r.id.includes("content-visibility")) enforced.push("/* perf: content-visibility:auto for long lists */")
    if (r.id.includes("conditional-render")) enforced.push("/* perf: ternary instead of && for conditionals */")
  }
  return [...new Set(enforced)].slice(0, 4)
}
