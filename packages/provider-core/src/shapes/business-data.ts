// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Shape Catalog — Business Data
// Endpoints: listings/search, my_business_info, reviews
// medido=verdade · Shapes confirmados via sandbox probe $0
// Fonte: EVO-API shapes/business_data.rs + sandbox.dataforseo.com
// ══════════════════════════════════════════════════════════════════

// ── Endpoint constants ──

export const EP = {
  LISTINGS_SEARCH:   "business_data/business_listings/search/live" as const,
  PROFILE_GMB:       "business_data/google/my_business_info/live" as const,
  REVIEWS_TASK_POST: "business_data/google/reviews/task_post" as const,
  REVIEWS_TASK_GET:  "business_data/google/reviews/task_get" as const,
  QA_TASK_POST:      "business_data/google/questions_and_answers/task_post" as const,
}

// ── L0 · Business Listings Search ──

/** Request shape (canonical input → DataForSEO body) */
export interface ListingsSearchRequest {
  categories: string[]
  location_coordinate: string   // "lat,lng,radiusKm"
  language_code?: string        // default "pt"
  limit?: number                // 10-1000
  offset?: number
  order_by?: string[]
  filters?: unknown[]
}

/** Response shape — result[0].items[] */
export interface ListingsSearchItem {
  // type: "business_listing"
  title: string | null
  category: string | null            // raw.category
  address: string | null             // raw.address
  rating_value: number | null        // raw.rating.value ← FLATTEN
  rating_votes: number | null        // raw.rating.votes_count ← FLATTEN
  place_id: string | null
  cid: string | null
  latitude: number | null
  longitude: number | null
  is_claimed: boolean | null
  // ── Extra fields (compact response) ──
  website?: string | null            // raw.url
  phone?: string | null
  district?: string | null           // raw.address_info.borough
  city?: string | null               // raw.address_info.city
  total_photos?: number | null
  description?: string | null
}

// ── L1 · Google Business Profile ──

/** Request shape */
export interface ProfileGmbRequest {
  keyword: string                    // max 700 chars
  location_code?: number             // default 2076 (Brazil)
  language_code?: string             // default "pt"
}

/** Response shape — result[0].items[0] (single profile) */
export interface ProfileGmbItem {
  title: string
  category: string | null            // raw.category
  categories: string[] | null        // raw.category_ids
  address: string | null
  city: string | null                // raw.address_info.city
  district: string | null            // raw.address_info.borough
  country_code: string | null        // raw.address_info.country_code
  postal_code: string | null         // raw.address_info.zip
  phone: string | null
  rating_value: number | null        // raw.rating.value
  rating_votes: number | null        // raw.rating.votes_count
  is_claimed: boolean | null
  place_id: string | null
  cid: string | null
  website: string | null             // raw.url
  main_image: string | null
  total_photos: number | null
  description: string | null
  latitude: number | null            // raw.location.latitude
  longitude: number | null           // raw.location.longitude
  business_status: string | null
  price_level: number | null
  types: string[] | null
  work_hours: unknown | null         // raw.work_hours (passthrough)
  rating_distribution: unknown | null // raw.rating_distribution (passthrough)
}

// ── L4 · Google Reviews ──

/** Request shape (task_post body) */
export interface ReviewsRequest {
  keyword: string
  location_code?: number             // default 2076
  language_code?: string             // default "pt"
  depth?: number                     // default 10
}

/** Response shape — result[0].items[] */
export interface ReviewItem {
  rating: number                     // raw.rating.value or raw.rating_value
  review_text: string                // raw.review_text or raw.text
  timestamp: string                  // raw.time_ago or raw.timestamp
  reviewer_name: string | null       // raw.profile_name
  owner_answer: string | null
  owner_answer_timestamp: string | null
}

/** Aggregate block */
export interface ReviewsBlock {
  rating_value: number | null
  reviews_count: number
  rating_distribution: Record<string, number> | null
  reviews: ReviewItem[]
}
