// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2 — OnPage Instant Pages ($0.000125/call)
// Auditoria SEO on-page de uma única URL. 60+ checks booleanos.
// ══════════════════════════════════════════════════════════════════

import type { SEOInstantAudit } from "../types"
import { getDFSEOClient } from "../client"

/**
 * L2 — OnPage Instant Pages audit.
 * Retorna score SEO, meta tags, word count, links, e ~60 checks.
 * Custo: ~$0.000125 por URL.
 */
export async function onPageInstantPages(params: {
  url: string
  enable_javascript?: boolean
  accept_language?: string
}): Promise<SEOInstantAudit | null> {
  const client = getDFSEOClient()

  const body = [
    {
      url: params.url,
      enable_javascript: params.enable_javascript || false,
      accept_language: params.accept_language || "pt-BR",
    },
  ]

  const data = await client.post<{
    id: string
    status_code: number
    status_message: string
    items: Record<string, unknown>[]
  }>(
    "/v3/on_page/instant_pages",
    body
  )

  const items = data.items || []
  if (items.length === 0) return null

  const item = items[0]
  if (!item) return null

  // DataForSEO returns nested resource structure
  const resource = (item.resource || item) as Record<string, unknown>
  const meta = (resource.meta || {}) as Record<string, unknown>
  const content = (resource.content || {}) as Record<string, unknown>
  const checks = (resource.checks || resource.onpage_score_checks || {}) as Record<string, boolean | null>

  return {
    onpage_score: (resource.onpage_score as number) ?? (resource.total_score as number) ?? 0,
    total_count: (resource.total_count as number) ?? (resource.checks_count as number) ?? 0,
    checks,
    meta: {
      title: (meta.title as string) || null,
      description: (meta.description as string) || null,
      charset: (meta.charset as string) || null,
    },
    content: {
      word_count: (content.word_count as number) || (content.plain_text_word_count as number) || 0,
      internal_links_count: (content.internal_links_count as number) || 0,
      external_links_count: (content.external_links_count as number) || 0,
      images_count: (content.images_count as number) || 0,
      plain_text_length: (content.plain_text_length as number) || 0,
      ratio: (content.ratio as Record<string, number>) || {},
    },
  }
}
