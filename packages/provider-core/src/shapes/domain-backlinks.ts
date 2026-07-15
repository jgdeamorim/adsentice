// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Shape Catalog — Domain Analytics + Backlinks
// Endpoints: technologies, competitors
// medido=verdade · Shapes confirmados via sandbox + live probe
// Fonte: EVO-API shapes/domain_analytics.rs + shapes/backlinks.rs
// ══════════════════════════════════════════════════════════════════

// ── Endpoint constants ──

export const EP = {
  TECHNOLOGIES:         "domain_analytics/technologies/domain_technologies/live" as const,
  WHOIS:                "domain_analytics/whois/live" as const,
  COMPETITORS:          "backlinks/competitors/live" as const,
  SUMMARY:              "backlinks/summary/live" as const,
  RANKED_KEYWORDS:      "dataforseo_labs/google/ranked_keywords/live" as const,
  DOMAIN_COMPETITORS:   "dataforseo_labs/google/competitors_domain/live" as const,
  DOMAIN_INTERSECTION:  "dataforseo_labs/google/domain_intersection/live" as const,
  DOMAIN_OVERVIEW:      "dataforseo_labs/google/domain_rank_overview/live" as const,
} as const

// ── L2 · Domain Technologies ──

export interface TechnologiesRequest {
  target: string                      // domain without protocol (e.g., "example.com")
}

/** Response shape — result[0] (direct object, no items[]) */
export interface TechnologiesItem {
  domain: string                      // raw.domain
  title?: string | null               // raw.title
  domain_rank: number | null          // raw.domain_rank
  country_iso_code: string | null     // raw.country_iso_code
  technologies: Record<string, Record<string, string[]>>  // dynamic taxonomy
  phone_numbers: string[]
  emails: string[]
  last_visited?: string | null
}

// ── L3 · Backlinks Competitors ──

export interface BacklinksCompetitorsRequest {
  target: string                      // domain or URL
  limit?: number                      // default 20
}

/** Per-competitor item */
export interface CompetitorItem {
  domain: string                      // raw.domain or raw.target
  rank: number                        // raw.rank or raw.domain_rank (0-1000)
  intersections: number               // raw.intersections or raw.backlinks
}

// ── L3 · Domain Competitors (DataForSEO Labs) ──

export interface DomainCompetitorsRequest {
  target: string                      // domain
  location_code?: number              // default 2840
  language_code?: string              // default "en"
  limit?: number                      // default 100
}

/** Response shape — result[].items[] */
export interface DomainCompetitorItem {
  competitor_domain: string           // raw.domain
  common_keywords: number | null      // raw.intersections
  organic_keywords_count: number | null   // raw.full_domain_metrics.organic.count
  organic_traffic: number | null          // raw.full_domain_metrics.organic.etv
  paid_keywords_count: number | null      // raw.full_domain_metrics.paid.count
  paid_traffic: number | null             // raw.full_domain_metrics.paid.etv
  avg_position: number | null
  domain_authority: number | null         // always null (separate endpoint)
}

// ── L3 · Domain Ranked Keywords ──

export interface RankedKeywordsRequest {
  target: string                      // domain or URL
  location_code?: number
  language_code?: string
  limit?: number
}

/** Per-keyword item — result[].items[] */
export interface RankedKeywordItem {
  keyword: string                     // raw.keyword_data.keyword
  position: number                    // raw.ranked_serp_element.serp_item.rank_absolute
  volume: number | null               // raw.keyword_data.keyword_info.search_volume
  cpc: number | null                  // raw.keyword_data.keyword_info.cpc
  difficulty: number | null           // keyword_difficulty / 100 (0.0-1.0) ← NORMALIZE
  intent: string | null               // raw.keyword_data.search_intent_info.main_intent
  serp_features: string[] | null      // raw.ranked_serp_element.serp_item_types
  keyword_traffic: number | null      // raw.ranked_serp_element.serp_item.etv
  traffic_value: number | null        // raw.ranked_serp_element.serp_item.estimated_paid_traffic_cost
}

// ── L3 · Domain Keyword Gap ──

export interface KeywordGapRequest {
  target1: string                     // your domain
  target2: string                     // competitor domain
  location_code?: number
  language_code?: string
  limit?: number
}

export interface KeywordGapItem {
  keyword: string
  volume: number | null
  cpc: number | null
  difficulty: number | null           // keyword_difficulty / 100
  intent: string | null
  position_target1: number | null     // null = target1 doesn't rank
  position_target2: number | null     // null = target2 doesn't rank
}

// ── L3 · Domain Overview ──

export interface DomainOverviewItem {
  target: string                      // echoed from input
  organic_traffic: number | null      // raw.metrics.organic.etv
  organic_keywords_count: number | null
  paid_traffic: number | null
  paid_keywords_count: number | null
  count_top_3: number                 // derived: pos_1 + pos_2_3
  count_top_10: number                // derived: pos_1 + pos_2_3 + pos_4_10
  domain_authority: number | null
}
