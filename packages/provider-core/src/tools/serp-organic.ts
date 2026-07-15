// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — SERP Organic ($0.002/call)
// Resultados organicos do Google para uma keyword.
// medido=verdade — competitive landscape REAL, nao estimado.
//
// Endpoint: POST /v3/serp/google/organic/live/regular  (NÃO suporta .ai)
// Response: result[0].items[]  (type == "organic")
// Fonte: EVO-API serp.organic · Live testado
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface SerpOrganicItem {
  position: number
  title: string
  url: string
  domain: string
  snippet: string | null
}

export interface SerpOrganicResult {
  keyword: string
  items: SerpOrganicItem[]
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "")
  } catch { return url }
}

/**
 * L4 — SERP Organic ($0.002/keyword).
 * Retorna resultados organicos filtrados (sem ads/snippets).
 */
export async function serpOrganic(params: {
  keyword: string
  location_code?: number
  language_code?: string
  depth?: number
}): Promise<SerpOrganicResult | null> {
  const c = getDFSEOClient()
  const kw = params.keyword?.trim()
  if (!kw || kw.length > 700) return null

  const body = JSON.stringify([{
    keyword: kw,
    location_code: params.location_code || 2076,
    language_code: params.language_code || "pt",
    depth: params.depth || 10,
  }])

  // SERP NÃO suporta .ai suffix
  const fullUrl = `${c.activeUrl}/v3/serp/google/organic/live/regular`
  const res = await fetch(fullUrl, {
    method: "POST",
    headers: { Authorization: c.authHeader, "Content-Type": "application/json" },
    body,
  })
  if (!res.ok) return null
  const data = await res.json() as {
    tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }>
  }

  const items = data.tasks?.[0]?.result?.[0]?.items || []
  const organic = items
    .filter(item => (item.type as string) === "organic")
    .map(item => {
      const url = (item.url as string) || ""
      return {
        position: (item.rank_absolute as number) ?? (item.rank_group as number) ?? 0,
        title: (item.title as string) || "",
        url,
        domain: extractDomain(url),
        snippet: (item.description as string) || null,
      }
    })

  return { keyword: kw, items: organic }
}
