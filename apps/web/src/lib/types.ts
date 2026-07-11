// ══════════════════════════════════════════════════════════════════
// ADSENTICE · AG-UI Types v1.0.0
// Baseado no protocolo AG-UI (MIT) — 24 eventos em 6 categorias.
// ══════════════════════════════════════════════════════════════════

// ── AG-UI Core Events ───────────────────────────────────────────

export type AguiEventType =
  // Lifecycle
  | "RUN_STARTED"
  | "RUN_FINISHED"
  | "RUN_ERROR"
  | "STEP_STARTED"
  | "STEP_FINISHED"
  // Text Messages
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  // Reasoning
  | "REASONING_START"
  | "REASONING_MESSAGE_CONTENT"
  | "REASONING_END"
  // Tool Calls
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "TOOL_CALL_RESULT"
  // State
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  // Activity (Generative UI)
  | "ACTIVITY_SNAPSHOT"
  // Custom
  | "CUSTOM"

export interface AguiEvent {
  type: AguiEventType
  timestamp?: string
  [key: string]: unknown
}

// ── RunAgentInput ────────────────────────────────────────────────

export interface RunAgentInput {
  threadId: string
  runId: string
  parentRunId?: string
  input: {
    url?: string
    message?: string
    deep_dive_id?: string
  }
  resume?: Array<{
    interruptId: string
    status: "resolved" | "cancelled"
    payload?: unknown
  }>
}

// ── Brand IQ (Shared State) ─────────────────────────────────────

export interface BrandIQ {
  business: {
    name: string
    url: string
    domain: string
    category?: string
    location?: {
      address: string
      city: string
      state: string
    }
  }
  voice: {
    tone: string
    formality: number
    keywords: string[]
    audienceSignals: string[]
  }
  visual: {
    primaryColor?: string
    fontFamily?: string
    logoUrl?: string
  }
  market: {
    score: number
    strengths: string[]
    gaps: string[]
  }
}

// ── Pipeline Cards ────────────────────────────────────────────────

export interface DiscoveryCard {
  id: string
  icon: string
  title: string
  score: number
  severity: "critical" | "warning" | "good" | "excellent"
  highlights: string[]
  deepDiveAvailable: boolean
  deepDiveCreditCost?: number
}

export interface Tip {
  priority: number
  urgency: "high" | "medium" | "low"
  title: string
  detail: string
  action: string
  credit_cost: number
  pipeline?: string
}

// ── Pipeline Results ─────────────────────────────────────────────

export interface SiteAuditResult {
  domain: string
  pagesDiscovered: number

  content: {
    title: string
    description: string
    services: string[]
    hasPricing: boolean
    hasContact: boolean
    hasBlog: boolean
  }

  lighthouse: {
    performance: number
    seo: number
    accessibility: number
    bestPractices: number
  }

  stack: {
    cms: string
    ecommerce?: string
    analytics: string[]
    cdn: string
    hosting?: string
  }

  domainAgeDays: number
  score: number
  recommendations: string[]
}

export interface GMBResult {
  placeId?: string
  name: string
  rating: number
  totalReviews: number
  address: string
  phone?: string
  website?: string
  category: string
  lastPostDate?: string
  score: number
  recommendations: string[]
}

export interface SEODiscoveryResult {
  keywords: Array<{
    keyword: string
    volume: number
    position: number
    cpc: number
    competition: string
  }>
  totalKeywords: number
  avgPosition: number
  score: number
  recommendations: string[]
}

// ── Discovery Response ───────────────────────────────────────────

export interface DiscoveryResult {
  business: BrandIQ["business"]
  score: { overall: number; breakdown: Record<string, number> }
  cards: DiscoveryCard[]
  tips: Tip[]
  deep_dives: Array<{
    id: string
    title: string
    description: string
    credit_cost: number
  }>
  diagnostics?: {
    took_ms: number
    pipelines: string[]
    layers?: LayerTrace[]
  }
}

// ── RSXT L0→L5 Decision Pipeline ──────────────────────────────

export interface LayerTrace {
  layer: string          // "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "PIPELINES" | "SYNTHESIS"
  status: "ok" | "warn" | "error" | "skipped"
  detail: string
  tookMs: number
}
