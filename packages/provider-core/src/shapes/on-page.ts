// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Shape Catalog — OnPage
// Endpoints: instant_pages, lighthouse, pages (task-based)
// medido=verdade · Shapes confirmados via sandbox + live probe
// Fonte: EVO-API shapes/on_page.rs + sandbox.dataforseo.com
// ══════════════════════════════════════════════════════════════════

export const EP = {
  INSTANT_PAGES: "on_page/instant_pages" as const,
  LIGHTHOUSE:    "on_page/lighthouse/live/json" as const,
  PAGES_POST:    "on_page/pages" as const,           // task_post
  PAGES_GET:     "on_page/pages" as const,           // task_get/{id}
  SUMMARY_POST:  "on_page/summary" as const,
  LINKS_POST:    "on_page/links" as const,
} as const

// ── L2 · Instant Pages Audit ──

export interface InstantPagesRequest {
  url: string
  enable_javascript?: boolean        // default false
  accept_language?: string           // default "pt-BR"
}

/** Response shape — result[0].items[0].resource */
export interface InstantPagesItem {
  onpage_score: number               // 0-100
  total_count: number                // number of checks
  checks: Record<string, boolean | null>  // ~60 boolean checks
  meta: {
    title: string | null
    description: string | null       // raw.meta.description
    charset: string | null
  }
  content: {
    word_count: number               // raw.content.plain_text_word_count
    internal_links_count: number     // raw.meta.internal_links_count
    external_links_count: number     // raw.meta.external_links_count
    images_count: number             // raw.meta.images_count
    plain_text_length: number
    ratio: Record<string, number>
  }
}

// ── L2 · Lighthouse Audit ──

export interface LighthouseRequest {
  url: string
  category?: string[]   // ["performance","accessibility","best-practices","seo","pwa"]
}

/** Response shape — result[0].categories.{category}.score */
export interface LighthouseItem {
  url: string                         // raw.finalDisplayedUrl
  scores: {
    performance: number               // raw.categories.performance.score  (0.0-1.0)
    accessibility: number             // raw.categories.accessibility.score
    best_practices: number            // raw.categories["best-practices"].score
    seo: number                       // raw.categories.seo.score
    pwa: number | null                // raw.categories.pwa?.score
  }
  lighthouse_version?: string | null  // raw.lighthouseVersion
}

// ── L2 · OnPage Pages (task-based) ──

export interface OnPagePagesRequest {
  target: string                      // domain without protocol
  max_crawl_pages?: number            // default 10
  limit?: number                      // default 100
}

/** Per-page item in result[0].items[] */
export interface OnPagePageItem {
  url: string
  onpage_score: number | null
  title: string | null                // raw.meta.title
  description: string | null          // raw.meta.description
  word_count: number                  // raw.meta.content.plain_text_word_count
  internal_links_count: number        // raw.meta.internal_links_count
  external_links_count: number        // raw.meta.external_links_count
  images_count: number                // raw.meta.images_count
  status_code: number | null
  checks: Record<string, boolean | null> | null
}

/** Aggregate result */
export interface OnPagePagesBlock {
  domain: string
  total_pages: number                 // raw.items_count
  pages: OnPagePageItem[]
}
