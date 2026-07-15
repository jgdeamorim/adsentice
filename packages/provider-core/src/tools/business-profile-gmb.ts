// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L1 — Business Profile GMB ($0.0054/lead)
// Custom tool — NÃO existe no DataForSEO MCP server oficial.
// Usa my_business_info/live do DataForSEO para perfil completo 27 campos.
// ══════════════════════════════════════════════════════════════════

import type { GMBProfile } from "../types"
import { getDFSEOClient } from "../client"

/**
 * L1 — Google Business Profile (27 campos canônicos).
 * Custo: ~$0.0054 por perfil.
 *
 * Usa o endpoint my_business_info do DataForSEO Business Data API.
 * Documentação: https://docs.dataforseo.com/v3/business_data/google/my_business_info/live/
 */
export async function businessProfileGmb(params: {
  keyword: string
  location_code?: number
  language_code?: string
}): Promise<GMBProfile | null> {
  const client = getDFSEOClient()

  const body = [
    {
      keyword: params.keyword,
      location_code: params.location_code || 2076, // Brazil
      language_code: params.language_code || "pt",
    },
  ]

  const data = await client.post<{
    id: string
    status_code: number
    status_message: string
    items: Record<string, unknown>[]
  }>(
    "/v3/business_data/google/my_business_info/live",
    body
  )

  const items = data.items || []
  if (items.length === 0) return null

  const item = items[0]
  if (!item) return null

  const rating = (item.rating || {}) as Record<string, unknown>
  const addrInfo = (item.address_info || {}) as Record<string, unknown>

  return {
    title: (item.title as string) || "?",
    category: (item.category as string) || null,
    categories: (item.category_ids as string[]) || null,
    address: (item.address as string) || null,
    city: (addrInfo.city as string) || null,
    district: (addrInfo.borough as string) || null,
    country_code: (addrInfo.country_code as string) || null,
    postal_code: (addrInfo.zip as string) || null,
    phone: (item.phone as string) || null,
    rating_value: (rating.value as number) ?? null,
    rating_votes: (rating.votes_count as number) ?? null,
    is_claimed: (item.is_claimed as boolean) ?? null,
    place_id: (item.place_id as string) || null,
    cid: (item.cid as string) || null,
    website: (item.url as string) || null,
    main_image: (item.main_image as string) || null,
    total_photos: (item.total_photos as number) ?? null,
    description: (item.description as string) || null,
    latitude: (item.latitude as number) ?? null,
    longitude: (item.longitude as number) ?? null,
    business_status: (item.business_status as string) || null,
    price_level: (item.price_level as number) ?? null,
    types: (item.types as string[]) || null,
  }
}
