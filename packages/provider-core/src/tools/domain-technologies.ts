// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2 — Domain Technologies ($0.01/call)
// Detecta CMS, analytics, CDN, JS frameworks de um domínio.
// ══════════════════════════════════════════════════════════════════

import type { DomainTechnologies } from "../types"
import { getDFSEOClient } from "../client"

/**
 * L2 — Domain Technologies detection.
 * Retorna CMS, analytics, frameworks, e rank do domínio.
 * Custo: ~$0.01 por domínio.
 */
export async function domainTechnologies(params: {
  target: string
}): Promise<DomainTechnologies | null> {
  const client = getDFSEOClient()

  const body = [{ target: params.target }]

  const data = await client.post<{
    id: string
    status_code: number
    status_message: string
    items: Record<string, unknown>[]
  }>(
    "/v3/domain_analytics/technologies/domain_technologies/live",
    body
  )

  const items = data.items || []
  if (items.length === 0) return null

  const item = items[0]
  if (!item) return null

  return {
    domain: (item.domain as string) || params.target,
    technologies: (item.technologies as Record<string, Record<string, string[]>>) || {},
    phone_numbers: (item.phone_numbers as string[]) || [],
    emails: (item.emails as string[]) || [],
    domain_rank: (item.domain_rank as number) ?? 0,
    last_visited: (item.last_visited as string) || "",
    country_iso_code: (item.country_iso_code as string) || "",
  }
}
