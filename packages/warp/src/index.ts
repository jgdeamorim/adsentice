/**
 * packages/warp/src/index.ts
 * WarpAPI — Interface unificada da Família Warp (ADR-0018 + ADR-0020)
 *
 * "Design System Vivo com Composição por Intent Semântico"
 *
 * Uso:
 *   import { warp } from '@adsentice/warp'
 *
 *   // Buscar componentes por intent
 *   const components = await warp.registry.queryByIntent('dashboard executivo')
 *
 *   // Compor página completa
 *   const page = await warp.composer.compose({
 *     intent: 'dashboard para dentista em SP',
 *     context: { page: '/admin', category: 'saude' }
 *   })
 *
 *   // Gerar tokens para segmento
 *   const tokens = await warp.tokens.compose({
 *     intent: 'landing page', segment: 'beleza', plan: 'sentinela'
 *   })
 *
 *   // Escolher agente para tarefa
 *   const agent = await warp.agents.route('critique design system qualidade')
 *
 * medido=verdade · 2026-07-14 · adsentice
 */

import { ComponentRegistry, registry as defaultRegistry } from './2-registry'
import { Destiller, destiller as defaultDestiller } from './3-destiller'
import { Composer, composer as defaultComposer } from './4-composer'
import { WarpCache, warpCache as defaultCache } from './7-cache'
import { WarpTracker, warpTracker as defaultTracker } from './6-telemetry'
import { TokenComposer, tokenComposer as defaultTokenComposer } from './tokens-composer'
import { AgentRouter, agentRouter as defaultAgentRouter } from './8-agents'

// ═══════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════

export { ComponentRegistry } from './2-registry'
export { Destiller } from './3-destiller'
export { Composer } from './4-composer'
export { WarpCache } from './7-cache'
export { WarpTracker } from './6-telemetry'
export { TokenComposer, composeTokens } from './tokens-composer'
export {
  AgentRouter,
  ClaudeCodeAdapter,
  DeepSeekAdapter,
  QwenLocalAdapter,
  MCPRegistry,
  mcpRegistry,
} from './8-agents'

// Validation
export {
  WarpComponentSchema,
  PluginSchema,
  validateComponent,
  validatePlugin,
  PluginRegistry,
  pluginRegistry,
} from './5-registry'

// Types
export type {
  WarpComponent,
  WarpEvent,
  WarpMetrics,
  CompositionRequest,
  CompositionResult,
  ResolvedComponent,
  LayoutTree,
  ReferenceSource,
  DestilledComponent,
  ComponentEmbedPayload,
} from './types'

export type {
  CritiqueScore,
  PipelineStage,
} from './4-composer'

export type {
  ComposeTokensRequest,
  ComposeTokensResult,
  TokenSet,
  SegmentId,
  PlanTier,
  SurfaceId,
} from './tokens-composer'

export type {
  AgentAdapter,
  AgentCapabilities,
  AgentDetection,
  AgentRunParams,
  AgentEvent,
  MCPServerInfo,
} from './8-agents'

export type {
  ValidationResult,
  Plugin,
  RegistryEntry,
  WarpComponentValidated,
  PropDef,
} from './5-registry'

export type {
  CacheEntry,
} from './7-cache'

// ═══════════════════════════════════════════════════════════════
// WarpAPI — interface unificada
// ═══════════════════════════════════════════════════════════════

export class WarpAPI {
  registry: ComponentRegistry
  destiller: Destiller
  composer: Composer
  cache: WarpCache
  tracker: WarpTracker
  tokens: TokenComposer
  agents: AgentRouter

  constructor() {
    this.cache = defaultCache
    this.tracker = defaultTracker
    this.registry = defaultRegistry
    this.destiller = defaultDestiller
    this.composer = new Composer(this.registry, this.cache)
    this.tokens = defaultTokenComposer
    this.agents = defaultAgentRouter
  }
}

/** Singleton */
export const warp = new WarpAPI()
