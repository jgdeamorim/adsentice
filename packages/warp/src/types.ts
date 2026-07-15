/**
 * packages/warp/src/types.ts
 * Tipos da Família Warp — Design System Vivo (ADR-0018 + ADR-0020)
 *
 * Inspiração: EVO-API compose.rs (DctNode) + open-design registry protocol (Zod)
 * medido=verdade · 2026-07-14 · adsentice
 */

import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════
// WarpComponent — entidade central do registry semântico
// ═══════════════════════════════════════════════════════════════

export interface WarpComponent {
  /** ID único no registry (ex: "button", "stat-card", "schwartz-chip") */
  id: string

  /** Tipo atômico (atomic design) */
  type: 'atom' | 'molecule' | 'organism' | 'template' | 'page'

  /** Nome legível */
  name: string

  /** Descrição do que o componente faz */
  description: string

  /** Intent semântico (o que o componente RESOLVE) */
  intent: string

  /** Categoria funcional */
  category: 'kpi' | 'navigation' | 'data-display' | 'feedback' | 'form' | 'layout' | 'action'

  /** Gatilhos para busca determinística (open-design style) */
  triggers: string[]

  /** Modo de renderização (open-design style) */
  mode: 'dashboard' | 'landing' | 'prototype' | 'template' | 'design-system'

  /** Props tipadas via Zod schema */
  inputs: z.ZodObject<Record<string, z.ZodTypeAny>>

  /** Dependências: IDs de outros componentes que este precisa */
  edges: string[]

  /** Design tokens que este componente consome */
  designSystem: {
    requires: boolean
    sections: string[] // ex: ["color", "typography", "spacing", "radius"]
  }

  /** Acessibilidade WCAG 2.1 AA+ */
  a11y: {
    role: string
    ariaLabel: string
    keyboardNav: boolean
    contrastRatio: number
  }

  /** Preview (open-design style) */
  preview?: {
    type: 'html' | 'jsx'
    entry?: string
  }

  /** Embedding 768d (populado pelo destilador) */
  embedding?: number[]

  /** Fonte de referência (de onde veio) */
  source: {
    name: string // ex: "shadcn/ui", "Radix UI", "WCAG 2.1"
    type: 'component' | 'pattern' | 'guideline' | 'template' | 'adsentice-original'
    url: string
    quality: 'P0' | 'P1' | 'P2'
  }

  /** Versionamento */
  mutationId: number
  version: number

  /** Tags para filtro */
  tags: string[]

  /** Superfícies Warp onde este componente aparece */
  surfaces: string[] // ex: ["S3", "S9", "S10"]

  /** Segmentos onde este componente é relevante */
  segments: string[] // ex: ["saude", "beleza", "alimentacao"]

  /** Telemetria de uso */
  usageStats: {
    timesUsed: number
    lastUsedAt: string
    avgRenderMs: number
  }
}

// ═══════════════════════════════════════════════════════════════
// Composition types
// ═══════════════════════════════════════════════════════════════

export interface CompositionRequest {
  intent: string
  context: {
    page?: string
    category?: string
    workspace?: string
    device?: 'desktop' | 'tablet' | 'mobile'
    mode?: 'light' | 'dark'
  }
  constraints?: {
    maxComponents?: number
    preferredLayout?: string
    cacheTtl?: number
  }
}

export interface ResolvedComponent {
  id: string
  component: WarpComponent
  depth: number
  dependencies: string[]
  dependents: string[]
  props: Record<string, unknown>
  relevanceScore: number
}

export interface LayoutTree {
  id: string
  type: string
  slots: Record<string, unknown>
  columns?: number
  gap?: string
  children?: { component: string; props?: Record<string, unknown> }[]
}

export interface CompositionResult {
  id: string
  intent: string
  layout: LayoutTree
  components: ResolvedComponent[]
  cacheKey: string
  mutationId: number
  renderMs: number
}

// ═══════════════════════════════════════════════════════════════
// Zod schemas (open-design registry protocol style)
// ═══════════════════════════════════════════════════════════════

export const WarpComponentRegistryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
  version: z.string(),
  publisher: z.object({
    id: z.string(),
    name: z.string(),
    verified: z.boolean(),
  }).optional(),
  capabilities: z.array(z.string()).optional(),
  metrics: z.object({
    downloads: z.number(),
    installs: z.number(),
    stars: z.number(),
  }).optional(),
})

export type WarpComponentRegistryEntry = z.infer<typeof WarpComponentRegistryEntrySchema>

// ═══════════════════════════════════════════════════════════════
// Telemetry types
// ═══════════════════════════════════════════════════════════════

export interface WarpEvent {
  eventId: string
  sessionId: string
  type:
    | 'composition_created'
    | 'component_rendered'
    | 'component_registered'
    | 'cache_hit'
    | 'cache_miss'
    | 'intent_resolved'
    | 'token_resolved'
  intent?: string
  category?: string
  page?: string
  componentId?: string
  renderMs?: number
  mutationId: number
  context: Record<string, unknown>
  timestamp: string
}

export interface WarpMetrics {
  totalCompositions: number
  totalComponents: number
  topComponents: { id: string; timesUsed: number }[]
  topIntents: { intent: string; count: number }[]
  cacheHitRate: number
  avgRenderMs: number
  mostUsedCategories: { category: string; count: number }[]
}

// ═══════════════════════════════════════════════════════════════
// Destiller types
// ═══════════════════════════════════════════════════════════════

export interface ReferenceSource {
  name: string
  type: 'component' | 'pattern' | 'guideline' | 'template'
  content: string
  url: string
  quality: 'P0' | 'P1' | 'P2'
}

export interface DestilledComponent {
  id: string
  name: string
  description: string
  intent: string
  triggers: string[]
  props: Record<string, unknown>
  template: string
  tokens: string[]
  a11y: WarpComponent['a11y']
  source: WarpComponent['source']
  confidence: number
  requiresReview: boolean
}

// ═══════════════════════════════════════════════════════════════
// Embed payload (what goes to Qdrant)
// ═══════════════════════════════════════════════════════════════

export interface ComponentEmbedPayload {
  id: string
  kind: 'component'
  tag: 'adsentice-warp'
  name: string
  description: string
  intent: string
  triggers: string[]
  category: string
  type: string
  mode: string
  edges: string[]
  tokens: string[]
  surfaces: string[]
  segments: string[]
  source_name: string
  source_type: string
  source_quality: string
  a11y_role: string
  a11y_keyboard: boolean
  a11y_contrast: number
  mutationId: number
  version: number
}
