/**
 * packages/warp/src/index.ts
 * WarpAPI — Interface unificada da Família Warp (ADR-0018 + ADR-0020)
 *
 * "Design System Vivo com Composição por Intent Semântico"
 *
 * Uso:
 *   import { warp } from '@adsentice/warp'
 *   const design = await warp.design.run({ segment: 'saude', plan: 'sentinela' })
 *
 * medido=verdade · 2026-07-15 · adsentice
 */

import { ComponentRegistry, registry as defaultRegistry } from './2-registry'
import { Destiller, destiller as defaultDestiller } from './3-destiller'
import { Composer, composer as defaultComposer } from './4-composer'
import { WarpCache, warpCache as defaultCache } from './7-cache'
import { WarpTracker, warpTracker as defaultTracker } from './6-telemetry'
import { TokenComposer, tokenComposer as defaultTokenComposer } from './tokens-composer'
import { AgentRouter, agentRouter as defaultAgentRouter } from './8-agents'
import { RecommendEngine, recommendEngine as defaultRecommendEngine } from './recommend-engine'
import { L3CompetitorAnalyzer, l3Analyzer as defaultL3Analyzer } from './l3-competitor-keywords'
import { DesignPipeline, designPipeline as defaultDesignPipeline } from './pipeline'

// ═══════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════

export { ComponentRegistry } from './2-registry'
export { Destiller } from './3-destiller'
export { Composer, SurfaceSpecialist, registerSurfaceSpecialist, getSurfaceSpecialist } from './4-composer'
export { WarpCache } from './7-cache'
export { WarpTracker } from './6-telemetry'
export { TokenComposer, composeTokens } from './tokens-composer'
export { RecommendEngine } from './recommend-engine'
export { L3CompetitorAnalyzer } from './l3-competitor-keywords'
export { DesignPipeline } from './pipeline'
export { DesignRuntime } from './runtime'
export { embedText, embedBatch } from './embed'
export { S10RaioXPipeline } from './s10-raio-x'
export { MarketIntelligence } from './market-intel'
export { PluginRegistry, pluginRegistry, aestheticEnforcementPlugin, mcpConnectorPlugins } from './plugins'
export type { Plugin, PluginManifest, DesignContext } from './plugins'
export {
  AgentRouter,
  ClaudeCodeAdapter,
  DeepSeekAdapter,
  QwenLocalAdapter,
  MCPRegistry,
  mcpRegistry,
} from './8-agents'

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
  WarpComponent, WarpEvent, WarpMetrics,
  CompositionRequest, CompositionResult, ResolvedComponent, LayoutTree,
  ReferenceSource, DestilledComponent, ComponentEmbedPayload,
} from './types'

export type { CritiqueScore, PipelineStage } from './4-composer'
export type { ComposeTokensRequest, ComposeTokensResult, TokenSet, SegmentId, PlanTier, SurfaceId } from './tokens-composer'
export type { AgentAdapter, AgentCapabilities, AgentDetection, AgentRunParams, AgentEvent, MCPServerInfo } from './8-agents'
export type { ValidationResult, Plugin, RegistryEntry, WarpComponentValidated, PropDef } from './5-registry'
export type { CacheEntry } from './7-cache'
export type { RecommendAction, RecommendResult, BattleCardOutput } from './recommend-engine'
export type { CompetitorProfile as L3CompetitorProfile, KeywordOpportunity as L3KeywordOpportunity, MarketPosition as L3MarketPosition, L3CompetitiveLandscape } from './l3-competitor-keywords'
export type { DesignPipelineInput, DesignPipelineResult } from './pipeline'

// ═══════════════════════════════════════════════════════════════
// WarpAPI
// ═══════════════════════════════════════════════════════════════

export class WarpAPI {
  registry: ComponentRegistry
  destiller: Destiller
  composer: Composer
  cache: WarpCache
  tracker: WarpTracker
  tokens: TokenComposer
  agents: AgentRouter
  recommend: RecommendEngine
  l3: L3CompetitorAnalyzer
  design: DesignPipeline

  constructor() {
    this.cache = defaultCache
    this.tracker = defaultTracker
    this.registry = defaultRegistry
    this.destiller = defaultDestiller
    this.composer = new Composer(this.registry, this.cache)
    this.tokens = defaultTokenComposer
    this.agents = defaultAgentRouter
    this.recommend = defaultRecommendEngine
    this.l3 = defaultL3Analyzer
    this.design = defaultDesignPipeline
  }
}

export const warp = new WarpAPI()
