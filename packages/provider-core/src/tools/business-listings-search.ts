// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L0 — Business Listings Search ($0.015/busca)
// Medido=verdade. Código inspirado no oficial DataForSEO MCP server.
// ══════════════════════════════════════════════════════════════════

import type {
  DFSEOCompactResponse,
  BusinessListing,
  ListingsSearchInput,
  ListingsSearchResult,
} from "../types"
import { getDFSEOClient } from "../client"

/** Parses GMB listing from DataForSEO compact response (.ai suffix).
 *  Campo mapeado do formato real da API (não do oficial MCP server). */
function parseListing(item: Record<string, unknown>): BusinessListing {
  const rating = (item.rating || {}) as Record<string, unknown>
  const addrInfo = (item.address_info || {}) as Record<string, unknown>

  return {
    title: (item.title as string) || null,
    category: (item.category as string) || null,
    address: (item.address as string) || null,
    rating_value: (rating.value as number) ?? null,
    rating_votes: (rating.votes_count as number) ?? null,
    place_id: (item.place_id as string) || null,
    cid: (item.cid as string) || null,
    latitude: (item.latitude as number) ?? null,
    longitude: (item.longitude as number) ?? null,
    is_claimed: (item.is_claimed as boolean) ?? null,
  } satisfies BusinessListing
}

/** Campos extras disponíveis no compacto (não no tipo base). */
export interface ListingExtra {
  website: string | null          // item.url
  phone: string | null
  district: string | null         // item.address_info.borough
  city: string | null             // item.address_info.city
  total_photos: number | null
  description: string | null
}

/** Parse completo incluindo campos extras. */
export function parseListingExtra(item: Record<string, unknown>): BusinessListing & ListingExtra {
  const base = parseListing(item)
  const addrInfo = (item.address_info || {}) as Record<string, unknown>
  const rating = (item.rating || {}) as Record<string, unknown>

  return {
    ...base,
    website: (item.url as string) || null,
    phone: (item.phone as string) || null,
    district: (addrInfo.borough as string) || null,
    city: (addrInfo.city as string) || null,
    total_photos: (item.total_photos as number) ?? null,
    description: (item.description as string) || null,
  }
}

/** Extracts cost from DataForSEO billing event (text field). */
function extractCost(items: Record<string, unknown>[]): number {
  // DataForSEO returns cost metadata in the response when using .ai suffix
  // The cost is buried in the billing_event text — approximate from count
  return items.length * 0.0003 // ~$0.0003 per listing in search results
}

/**
 * L0 — Business Listings Search.
 * Busca negócios no Google Maps por categoria + coordenada + raio.
 * Custo: ~$0.015 por busca (até 50 resultados).
 */
export async function businessListingsSearch(
  input: ListingsSearchInput
): Promise<ListingsSearchResult> {
  const client = getDFSEOClient()

  const body = [
    {
      categories: input.categories,
      location_coordinate: input.location_coordinate,
      language_code: input.language_code || "pt",
      limit: input.limit || 50,
      offset: input.offset || 0,
      order_by: input.order_by || undefined,
      filters: input.filters || undefined,
    },
  ]

  const data = await client.post<DFSEOCompactResponse>(
    "/v3/business_data/business_listings/search/live",
    body
  )

  // DataForSEO compact response format
  const items = data.items || []
  const listings = items.map(parseListing)

  return {
    total_count: items.length,
    listings,
    cost_usd: extractCost(items),
  }
}
