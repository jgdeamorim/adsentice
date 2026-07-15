// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Shape Catalog — SERP + Keywords
// Endpoints: organic, keyword_overview, search_volume, trends
// medido=verdade · Shapes confirmados via sandbox + live probe
// Fonte: EVO-API shapes/serp.rs + shapes/keywords_data.rs
// ══════════════════════════════════════════════════════════════════

export const EP = {
  ORGANIC_REGULAR:      "serp/google/organic/live/regular" as const,
  KEYWORD_OVERVIEW:     "dataforseo_labs/google/keyword_overview/live" as const,
  KEYWORD_IDEAS:        "dataforseo_labs/google/keyword_ideas/live" as const,
  SEARCH_VOLUME:        "keywords_data/google_ads/search_volume/live" as const,
  TRENDS_EXPLORE:       "keywords_data/google_trends/explore/live" as const,
  RELATED_KEYWORDS:     "dataforseo_labs/google/related_keywords/live" as const,
} as const

// ── L4 · SERP Organic ──

export interface SerpOrganicRequest {
  keyword: string                    // max 700 chars
  location_code?: number             // default 2076
  language_code?: string             // default "pt"
  depth?: number                     // default 10, max 700
}

/** Filtered: only type==="organic" */
export interface SerpOrganicItem {
  position: number                   // raw.rank_absolute → fallback rank_group
  title: string                      // raw.title
  url: string                        // raw.url
  domain: string                     // DERIVED: extract hostname from url
  snippet: string | null             // raw.description
}

// ── L4 · Keyword Research (Keyword Overview) ──

export interface KeywordResearchRequest {
  keyword: string                    // seed keyword, max 700 chars
  location_code?: number             // default 2840
  language_code?: string             // default "en"
}

/** Response shape — result[].items[] */
export interface KeywordResearchItem {
  keyword: string                    // echoed from input
  volume: number                     // raw.search_volume (default 0)
  cpc: number                        // USD
  difficulty: number                 // keyword_difficulty / 100 (0.0-1.0) ← NORMALIZE
  intent: string                     // informational|navigational|commercial|transactional
  competition: number | null         // raw.competition (0.0-1.0, nullable)
  competition_level: string | null   // LOW|MEDIUM|HIGH (google_ads label)
  results_count: number | null       // SERP results count
  trend: Array<{ year: number; month: number; volume: number }>  // 12-month history
  cpc_range: { low: number; high: number } | null
  categories: number[] | null        // category IDs
  clicks: number | null              // clickstream clicks
  audience: Record<string, unknown> | null  // gender + age distribution
}

// ── L4 · Search Volume (Google Ads) ──

export interface SearchVolumeRequest {
  keywords: string[]                 // max 1000 keywords
  location_code?: number
  language_code?: string
}

export interface SearchVolumeItem {
  keyword: string
  search_volume: number              // raw.search_volume
  competition: string | null         // LOW|MEDIUM|HIGH label
  competition_index: number | null   // 0-100
  cpc: number | null                 // USD
  low_top_of_page_bid: number | null
  high_top_of_page_bid: number | null
  monthly_searches: Array<{ year: number; month: number; search_volume: number }>
}

// ── L4 · Keyword Trends (Google Trends) ──

export interface TrendsRequest {
  keywords: string[]                 // max 5 keywords
  type?: string                      // "web"|"news"|"youtube"|"images"|"froogle"
  date_from?: string                 // "yyyy-mm-dd"
  date_to?: string
  time_range?: string                // "past_7_days"|"past_30_days"|"past_12_months"
}

export interface TrendsItem {
  keywords: string[]
  interest_over_time: Array<{
    date_from: string
    timestamp: number
    values: number[]
  }>
  averages: number[]                 // avg per keyword
}

// ── L4 · Related Keywords ──

export interface RelatedKeywordsRequest {
  seed_keyword: string
  location_code?: number
  language_code?: string
  depth?: number                     // 0-4, default 1 (how many levels of "related to related")
}

export interface RelatedKeywordItem {
  keyword: string
  search_volume: number
  competition: string | null         // LOW|MEDIUM|HIGH
  competition_index: number | null   // 0-100
  cpc: number | null
  depth: number                      // which level this keyword came from
  monthly_searches: Array<{ year: number; month: number; search_volume: number }>
}
