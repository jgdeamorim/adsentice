/**
 * packages/warp/src/index.ts
 * WarpAPI — Interface unificada da Família Warp (ADR-0018)
 *
 * "Design System Vivo com Composição por Intent Semântico"
 *
 * Uso:
 *   import { warp } from '@adsentice/warp'
 *   const components = await warp.registry.queryByIntent('dashboard executivo')
 *
 * medido=verdade · 2026-07-14 · adsentice
 */

import { ComponentRegistry, registry as defaultRegistry } from './2-registry'
import { Destiller, destiller as defaultDestiller } from './3-destiller'

export { ComponentRegistry } from './2-registry'
export { Destiller } from './3-destiller'
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

// ═══════════════════════════════════════════════════════════════
// WarpAPI
// ═══════════════════════════════════════════════════════════════

export class WarpAPI {
  registry: ComponentRegistry
  destiller: Destiller

  constructor() {
    this.registry = defaultRegistry
    this.destiller = defaultDestiller
  }
}

/** Singleton */
export const warp = new WarpAPI()
