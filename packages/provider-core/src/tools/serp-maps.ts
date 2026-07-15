// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L4 — Google Maps SERP ($0.002/call)
// Quem aparece no topo do Google Maps para uma keyword local.
//
// Endpoint: POST /v3/serp/google/maps/live/advanced
// Fonte: EVO-API serp.maps
// ══════════════════════════════════════════════════════════════════

import { getDFSEOClient } from "../client"

export interface MapsSerpItem {
  position: number; title: string; place_id: string | null
  rating: number | null; reviews: number | null; address: string | null
}

export async function serpMaps(params: {
  keyword: string; location_code?: number; language_code?: string; depth?: number
}): Promise<MapsSerpItem[]> {
  const c = getDFSEOClient()
  const kw = params.keyword?.trim(); if (!kw || kw.length > 700) return []
  const body = JSON.stringify([{
    keyword: kw, location_code: params.location_code || 2076,
    language_code: params.language_code || "pt", depth: params.depth || 20,
  }])
  const url = `${c.activeUrl}/v3/serp/google/maps/live/advanced`
  const res = await fetch(url, { method: "POST", headers: { Authorization: c.authHeader, "Content-Type": "application/json" }, body })
  if (!res.ok) return []
  const data = await res.json() as { tasks?: Array<{ result?: Array<{ items?: Record<string, unknown>[] }> }> }
  return (data.tasks?.[0]?.result?.[0]?.items || [])
    .filter(item => (item.type as string) === "maps_search" || (item.type as string) === "local_pack")
    .map(item => {
      const r = (item.rating || {}) as Record<string, unknown>
      return {
        position: (item.rank_absolute as number) ?? (item.rank_group as number) ?? 0,
        title: (item.title as string) || "?",
        place_id: (item.place_id as string) || null,
        rating: (r.value as number) ?? null,
        reviews: (r.votes_count as number) ?? null,
        address: (item.address as string) || null,
      }
    })
}
