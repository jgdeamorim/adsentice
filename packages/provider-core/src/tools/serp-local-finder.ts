// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — SERP Local Finder ($0.002/call)
// Google Maps local pack para busca local.
// medido=verdade — quem aparece no Maps? O que eles tem?
//
// Endpoint: POST /v3/serp/google/local_finder/live/advanced
// Fonte: EVO-API serp.local_finder (translator: serp-local-finder-dataforseo)
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface LocalFinderItem {
  position: number
  title: string
  place_id: string | null
  rating: number | null
  reviews: number | null
  address: string | null
}

export async function serpLocalFinder(params: {
  keyword: string; location_code?: number; language_code?: string; depth?: number
}): Promise<LocalFinderItem[]> {
  const c = getDFSEOClient()
  const kw = params.keyword?.trim(); if (!kw || kw.length > 700) return []
  const body = JSON.stringify([{
    keyword: kw, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt", depth: params.depth || 20,
  }])
  const url = `${c.activeUrl}/v3/serp/google/local_finder/live/advanced`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  const items = data.tasks?.[0]?.result?.[0]?.items || []
  return items
    .filter(item => (item.type as string) === "local_pack" || (item.type as string) === "local_finder" || (item.type as string) === "maps_search")
    .map(item => ({
      position: (item.rank_absolute as number) ?? (item.rank_group as number) ?? 0,
      title: (item.title as string) || "?",
      place_id: (item.place_id as string) || null,
      rating: ((item.rating || {}) as Record<string, unknown>).value as number ?? null,
      reviews: ((item.rating || {}) as Record<string, unknown>).votes_count as number ?? null,
      address: (item.address as string) || null,
    }))
}
