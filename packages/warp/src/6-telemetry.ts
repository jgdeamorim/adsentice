/**
 * packages/warp/src/6-telemetry.ts
 * Warp Tracker + Design Quality + GenUI Surfaces — M6 da Família Warp
 *
 * "Telemetria de uso alimenta o SGA e o BOA.
 *  Design Quality Score em 6 dimensões (5 OD + Market Fit).
 *  GenUI surfaces para input humano no pipeline."
 *
 * Inspiração: open-design critique system (5 dimensões)
 *             EVO-API self-score + BOA founder_signal
 *
 * Refinamento Warp vs OD:
 *   OD: 5 dimensões estáticas
 *   Warp: 6 dimensões (5 OD + Market Fit via DataForSEO)
 *         + GenUI surfaces (SSE events) para input humano
 *         + Telemetria embedada no Qdrant (vec() para analytics)
 *
 * medido=verdade · ADR-0018 + ADR-0020 · 2026-07-14 · adsentice
 */

import type { WarpEvent, WarpMetrics } from './types'
import type { CritiqueScore } from './4-composer'

// ═══════════════════════════════════════════════════════════════
// Design Quality Score (6 dimensões)
// ═══════════════════════════════════════════════════════════════

export { CritiqueScore }

/**
 * Avalia a qualidade de uma composição em 6 dimensões.
 *
 * Dimensões OD (5):
 *   1. Visual Hierarchy (0.20) — estrutura visual, grid, responsividade
 *   2. Detail Execution (0.15) — polimento, micro-interações
 *   3. Functionality (0.25) — acessibilidade, keyboard nav
 *   4. Innovation (0.10) — originalidade, diferenciação
 *   5. Philosophy Consistency (0.15) — aderência aos tokens
 *
 * Dimensão Warp (+1):
 *   6. Market Fit (0.15) — este design converte para o segmento?
 */
export const DESIGN_QUALITY_DIMENSIONS = {
  visualHierarchy: { weight: 0.20, label: 'Visual Hierarchy', max: 10 },
  detailExecution: { weight: 0.15, label: 'Detail Execution', max: 10 },
  functionality: { weight: 0.25, label: 'Functionality', max: 10 },
  innovation: { weight: 0.10, label: 'Innovation', max: 10 },
  philosophyConsistency: { weight: 0.15, label: 'Philosophy Consistency', max: 10 },
  marketFit: { weight: 0.15, label: 'Market Fit', max: 10 },
} as const

// ═══════════════════════════════════════════════════════════════
// GenUI Events (OD-style Generative UI surfaces)
// ═══════════════════════════════════════════════════════════════

export type GenUIEventType =
  | 'confirm_direction'    // "Siga este caminho de design?"
  | 'choose_variant'       // "Qual variante você prefere?"
  | 'review_critique'      // "Revise a crítica de qualidade"
  | 'request_input'        // "Precisamos de mais contexto"

export interface GenUIEvent {
  id: string
  type: GenUIEventType
  /** Prompt para o usuário */
  prompt: string
  /** Opções (para choose_variant) */
  options?: { id: string; label: string; preview?: string }[]
  /** Contexto do pipeline */
  context: {
    intent: string
    stage: string
    iteration: number
    score?: CritiqueScore
  }
  /** Timeout em ms (se não responder, pipeline continua com default) */
  timeoutMs: number
}

type GenUIEventHandler = (event: GenUIEvent) => Promise<string | undefined>

// ═══════════════════════════════════════════════════════════════
// WarpTracker
// ═══════════════════════════════════════════════════════════════

const EMBED_URL = 'http://127.0.0.1:8081/embed'
const QDRANT_URL = 'http://127.0.0.1:6352'
const COLLECTION = 'adsentice-conversation'

async function embedEvent(text: string): Promise<number[]> {
  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: [text.slice(0, 800)] }),
    })
    const data = (await res.json()) as { vectors: number[][] }
    return data.vectors[0] ?? []
  } catch {
    return []
  }
}

async function qdrantTrack(payload: Record<string, unknown>, vector: number[]): Promise<void> {
  try {
    const id = `warp_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{ id, vector, payload }],
      }),
    })
  } catch {
    // Telemetry is fire-and-forget — nunca bloqueia o pipeline
  }
}

export class WarpTracker {
  private genUIHandler: GenUIEventHandler | null = null

  /**
   * Registra um handler para eventos GenUI.
   * O frontend chama isso para receber prompts interativos.
   */
  onGenUI(handler: GenUIEventHandler): void {
    this.genUIHandler = handler
  }

  /**
   * Emite um evento GenUI para input humano.
   * Se houver handler registrado, aguarda resposta (com timeout).
   */
  async requestInput(event: Omit<GenUIEvent, 'id'>): Promise<string | undefined> {
    const fullEvent: GenUIEvent = {
      ...event,
      id: `genui_${Date.now()}`,
    }

    if (!this.genUIHandler) return undefined

    const timeout = new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), fullEvent.timeoutMs),
    )
    const response = this.genUIHandler(fullEvent)

    return Promise.race([response, timeout])
  }

  /**
   * Track — o método principal.
   * Evento → embed → Qdrant → métricas em memória.
   */
  async track(event: WarpEvent): Promise<void> {
    const text = `${event.type} ${event.intent ?? ''} ${event.componentId ?? ''} ${event.page ?? ''}`
    const vector = await embedEvent(text)

    // Fire-and-forget: não bloqueia o pipeline
    qdrantTrack(
      {
        ...event,
        kind: 'warp-telemetry',
        tag: 'adsentice',
        ts: Date.now(),
      },
      vector,
    ).catch(() => {})
  }

  /**
   * Métricas agregadas (em memória, sem Qdrant query).
   * Para métricas persistentes, usar Qdrant search.
   */
  async getMetrics(_period: '24h' | '7d' | '30d' = '7d'): Promise<WarpMetrics> {
    // Placeholder — será implementado com Qdrant aggregation queries
    return {
      totalCompositions: 0,
      totalComponents: 0,
      topComponents: [],
      topIntents: [],
      cacheHitRate: 0,
      avgRenderMs: 0,
      mostUsedCategories: [],
    }
  }
}

/** Singleton */
export const warpTracker = new WarpTracker()
