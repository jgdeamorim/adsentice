// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L3 — Backlinks Competitors ($0.02/call)
// TOP 20 domínios concorrentes que compartilham backlinks.
// ══════════════════════════════════════════════════════════════════

import type { CompetitorDomain } from "../types"
import { getDFSEOClient } from "../client"

/**
 * L3 — Backlinks Competitors.
 * Retorna os domínios que competem pelo mesmo perfil de backlinks.
 * Custo: ~$0.02 por domínio.
 */
export async function backlinksCompetitors(params: {
  target: string
  limit?: number
}): Promise<CompetitorDomain[]> {
  const client = getDFSEOClient()

  const body = [
    {
      target: params.target,
      limit: params.limit || 20,
      exclude_large_domains: true,
      exclude_internal_backlinks: true,
    },
  ]

  const data = await client.post<{
    id: string
    status_code: number
    status_message: string
    items: Record<string, unknown>[]
  }>(
    "/v3/backlinks/competitors/live",
    body
  )

  const items = data.items || []
  return items.map((c: Record<string, unknown>) => ({
    domain: (c.domain as string) || (c.target as string) || "?",
    rank: (c.rank as number) ?? (c.domain_rank as number) ?? 0,
    intersections: (c.intersections as number) ?? (c.backlinks as number) ?? 0,
  }))
}

/** Extrai domínio de URL (sem protocolo, sem www). */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}
