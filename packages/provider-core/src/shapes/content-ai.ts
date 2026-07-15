// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Shape Catalog — Content Analysis + AI Optimization
// Endpoints: sentiment_summary, sentiment_detailed, llm_mentions, llm_responses
// medido=verdade · Shapes confirmados via sandbox probe
// Fonte: EVO-API shapes/content_analysis.rs + shapes/ai_optimization
// ══════════════════════════════════════════════════════════════════

export const EP = {
  SENTIMENT_SUMMARY:    "content_analysis/summary/live" as const,
  SENTIMENT_DETAILED:   "content_analysis/sentiment_analysis/live" as const,
  SEARCH:               "content_analysis/search/live" as const,
  LLM_MENTIONS:         "ai_optimization/llm_mentions/search/live" as const,
  LLM_RESPONSES:        "ai_optimization/chat_gpt/llm_responses/live" as const,
  KEYWORD_DATA:         "ai_optimization/keyword_data/keyword_data/live" as const,
} as const

// ── Content Sentiment Summary ──

export interface SentimentSummaryRequest {
  keyword: string                    // brand or topic, max 700 chars
  language_code?: string             // default "en"
}

/** Response shape — result[0] (direct object) */
export interface SentimentSummaryItem {
  total_count: number                // raw.total_count
  top_domains: Array<{ domain: string; count: number }>
  sentiment_connotations: Record<string, number>  // anger, happiness, love, sadness, share, fun
  connotation_types: Record<string, number>       // positive, negative, neutral
  page_types: Record<string, number>              // blogs, ecommerce, news, etc.
  countries: Record<string, number>               // ISO2 → count
  languages: Record<string, number>               // lang code → count
}

// ── Content Sentiment Detailed ──

export interface SentimentDetailedItem {
  connotation_distribution: unknown   // passthrough (complex nested)
  sentiment_distribution: unknown     // passthrough (complex nested)
}

// ── AI LLM Mentions ──

export interface LlmMentionsRequest {
  target: Array<{ domain?: string } | { keyword?: string }>
  location_name?: string             // "United States"
  language_code?: string             // "en"
  platform?: string                  // "chat_gpt" | "google"
  limit?: number
}

export interface LlmMentionItem {
  platform: string
  model_name: string
  question: string
  answer: string
  sources: Array<{ title: string; url: string }>
  ai_search_volume: number | null
}

// ── AI LLM Responses ──

export interface LlmResponsesRequest {
  llm_type: string                   // "chat_gpt" | "gemini" | "claude" | "perplexity"
  model_name: string                 // "gpt-4o-mini" etc.
  user_prompt: string                // max 500 chars
  temperature?: number
  top_p?: number
  web_search?: boolean
}

export interface LlmResponseItem {
  model_name: string
  response_text: string
  annotations: Array<{ title: string; url: string }>
  money_spent: number
}
