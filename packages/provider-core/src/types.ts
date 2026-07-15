// ══════════════════════════════════════════════════════════════════
// ADSENTICE · provider-core — types
// Tipos canônicos para DataForSEO API. medido=verdade.
// ══════════════════════════════════════════════════════════════════

// ── API Response Wrapper ───────────────────────────────────────

/** DataForSEO full response (when .ai suffix is NOT used). */
export interface DFSEOResponse<T = unknown> {
  version: string
  status_code: number
  status_message: string
  time: string
  cost: number
  tasks_count: number
  tasks_error: number
  tasks: Array<{
    id: string
    status_code: number
    status_message: string
    time: string
    cost: number
    result_count: number
    path: string[]
    data: Record<string, unknown>
    result: T[] | null
  }>
}

/** DataForSEO compact response (when .ai suffix IS used). */
export interface DFSEOCompactResponse {
  id: string
  status_code: number
  status_message: string
  items: Record<string, unknown>[]
}

// ── L0 · Business Listings Search ──────────────────────────────

export interface BusinessListing {
  title: string | null
  category: string | null
  address: string | null
  rating_value: number | null
  rating_votes: number | null
  place_id: string | null
  cid: string | null
  latitude: number | null
  longitude: number | null
  is_claimed: boolean | null
}

export interface ListingsSearchInput {
  categories: string[]
  location_coordinate: string   // "lat,lng,radiusKm"
  language_code?: string        // "pt"
  limit?: number                // default 10, max 1000
  offset?: number
  order_by?: string[]
  filters?: unknown[]
}

export interface ListingsSearchResult {
  total_count: number
  listings: BusinessListing[]
  cost_usd: number
}

// ── L1 · Business Profile GMB (custom — não existe no oficial) ──

export interface GMBProfile {
  title: string
  category: string | null
  categories: string[] | null
  address: string | null
  city: string | null
  district: string | null
  country_code: string | null
  postal_code: string | null
  phone: string | null
  rating_value: number | null
  rating_votes: number | null
  is_claimed: boolean | null
  place_id: string | null
  cid: string | null
  website: string | null
  main_image: string | null
  total_photos: number | null
  description: string | null
  latitude: number | null
  longitude: number | null
  business_status: string | null
  price_level: number | null
  types: string[] | null
}

// ── L2 · OnPage Instant Pages ──────────────────────────────────

export interface SEOInstantAudit {
  onpage_score: number
  total_count: number
  checks: Record<string, boolean | null>
  meta: {
    title: string | null
    description: string | null
    charset: string | null
  }
  content: {
    word_count: number
    internal_links_count: number
    external_links_count: number
    images_count: number
    plain_text_length: number
    ratio: Record<string, number>
  }
}

// ── L2 · Domain Technologies ───────────────────────────────────

export interface DomainTechnologies {
  domain: string
  technologies: Record<string, Record<string, string[]>>
  phone_numbers: string[]
  emails: string[]
  domain_rank: number
  last_visited: string
  country_iso_code: string
}

// ── L3 · Backlinks Competitors ─────────────────────────────────

export interface CompetitorDomain {
  domain: string
  rank: number
  intersections: number
}

// ── Client Config ──────────────────────────────────────────────

export interface DataForSEOConfig {
  login: string
  password: string
  baseUrl?: string   // default: https://api.dataforseo.com
  mode?: "sandbox" | "live"  // default: "live"
}
