/**
 * packages/warp/src/4-composer.ts
 * Compositor por Intent Semântico — M4 da Família Warp
 *
 * "Atomic Pipeline: discovery → plan → generate → critique
 *  Devloop: re-itera até score ≥ threshold (max 3x)
 *  6 dimensões de critique (5 OD + Market Fit)"
 *
 * Inspiração: open-design Atomic Pipeline + Devloop
 *             EVO-API compose.rs (intent → components → layout)
 *
 * Refinamento Warp vs OD:
 *   1. discovery: vec() queryByIntent > triggers determinísticos
 *   2. plan: design-knowledge (6,103 pts) > DESIGN.md estático
 *   3. critique: 6 dimensões (5 OD + Market Fit via DataForSEO)
 *   4. cache: 3 camadas com mutationId (OD não tem cache)
 *
 * medido=verdade · ADR-0018 + ADR-0020 · 2026-07-14 · adsentice
 */

import type {
  WarpComponent,
  CompositionRequest,
  CompositionResult,
  ResolvedComponent,
  LayoutTree,
} from './types'
import { ComponentRegistry, registry as defaultRegistry } from './2-registry'
import { WarpCache, warpCache as defaultCache } from './7-cache'

// ═══════════════════════════════════════════════════════════════
// Pipeline Stages (OD-style)
// ═══════════════════════════════════════════════════════════════

export interface PipelineStage {
  id: string
  name: string
  /** Se true, este stage repete até a condição `until` ser satisfeita */
  repeat?: boolean
  until?: {
    condition: string
    params: Record<string, number>
  }
}

const ATOMIC_PIPELINE: PipelineStage[] = [
  { id: 'discovery', name: 'Discovery: o que o usuário precisa?' },
  { id: 'plan', name: 'Plan: quais componentes + layout + tokens?' },
  { id: 'generate', name: 'Generate: compor + montar layout tree' },
  {
    id: 'critique',
    name: 'Critique: avaliar qualidade em 6 dimensões',
    repeat: true,
    until: { condition: 'score >= threshold', params: { threshold: 7, maxIterations: 3 } },
  },
]

// ═══════════════════════════════════════════════════════════════
// Critique — 6 dimensões de qualidade (5 OD + Market Fit)
// ═══════════════════════════════════════════════════════════════

export interface CritiqueScore {
  /** Estrutura visual — hierarquia, grid, responsividade (0-10) */
  visualHierarchy: number
  /** Acabamento — polimento, micro-interações, loading states (0-10) */
  detailExecution: number
  /** Funcionalidade — acessibilidade, teclado, screen reader (0-10) */
  functionality: number
  /** Inovação — originalidade, diferenciação visual (0-10) */
  innovation: number
  /** Consistência — aderência aos tokens e design system (0-10) */
  philosophyConsistency: number
  /** REFINAMENTO WARP: Market Fit — este design converte para o segmento? (0-10) */
  marketFit: number

  /** Score composto (média ponderada) */
  composite: number
  /** Se passou no threshold (≥7) */
  passed: boolean
  /** Feedback qualitativo */
  feedback: string[]
}

const CRITIQUE_WEIGHTS = {
  visualHierarchy: 0.20,
  detailExecution: 0.15,
  functionality: 0.25,
  innovation: 0.10,
  philosophyConsistency: 0.15,
  marketFit: 0.15,
}

function computeCritique(dimensions: Omit<CritiqueScore, 'composite' | 'passed' | 'feedback'>): CritiqueScore {
  const composite =
    dimensions.visualHierarchy * CRITIQUE_WEIGHTS.visualHierarchy +
    dimensions.detailExecution * CRITIQUE_WEIGHTS.detailExecution +
    dimensions.functionality * CRITIQUE_WEIGHTS.functionality +
    dimensions.innovation * CRITIQUE_WEIGHTS.innovation +
    dimensions.philosophyConsistency * CRITIQUE_WEIGHTS.philosophyConsistency +
    dimensions.marketFit * CRITIQUE_WEIGHTS.marketFit

  const feedback: string[] = []
  if (dimensions.visualHierarchy < 5) feedback.push('Hierarquia visual fraca — revise o layout grid.')
  if (dimensions.detailExecution < 5) feedback.push('Falta polimento — adicione micro-interações e loading states.')
  if (dimensions.functionality < 5) feedback.push('Acessibilidade comprometida — verifique contraste e keyboard nav.')
  if (dimensions.philosophyConsistency < 5) feedback.push('Inconsistência com design system — revise tokens.')
  if (dimensions.marketFit < 5) feedback.push('Baixo fit com o segmento — revise paleta e copy.')

  return {
    ...dimensions,
    composite: Math.round(composite * 10) / 10,
    passed: composite >= 7.0,
    feedback,
  }
}

// ═══════════════════════════════════════════════════════════════
// Layout inference
// ═══════════════════════════════════════════════════════════════

function inferLayout(
  context: CompositionRequest['context'],
  components: ResolvedComponent[],
): LayoutTree {
  const { page, device } = context

  // Admin dashboard
  if (page?.startsWith('/admin')) {
    return {
      id: 'layout.admin',
      type: 'admin-shell',
      slots: {
        sidebar: { component: 'sidebar' },
        header: { component: 'layout-header', props: { title: page } },
        content: {
          type: 'grid',
          columns: device === 'mobile' ? 1 : device === 'tablet' ? 2 : 3,
          gap: 'var(--spacing-6)',
          children: components.slice(0, 9).map((c) => ({
            component: c.id,
            props: c.props,
          })),
        },
      },
    }
  }

  // Landing page
  if (!page || page === '/') {
    return {
      id: 'layout.landing',
      type: 'landing-shell',
      slots: {
        hero: { component: 'hero-section' },
        sections: components.map((c) => ({
          component: c.id,
          props: c.props,
        })),
        footer: { component: 'footer' },
      },
    }
  }

  // Default: grid
  return {
    id: 'layout.default',
    type: 'grid',
    columns: 2,
    gap: 'var(--spacing-6)',
    children: components.map((c) => ({
      component: c.id,
      props: c.props,
    })),
  }
}

// ═══════════════════════════════════════════════════════════════
// Dependency Resolution (BFS)
// ═══════════════════════════════════════════════════════════════

function resolveDependencies(
  topLevel: WarpComponent[],
  registry: ComponentRegistry,
  maxDepth = 2,
  maxComponents = 12,
): ResolvedComponent[] {
  const resolved = new Map<string, ResolvedComponent>()
  const queue: { component: WarpComponent; depth: number }[] = []

  for (const c of topLevel) {
    queue.push({ component: c, depth: 0 })
  }

  while (queue.length > 0 && resolved.size < maxComponents) {
    const { component, depth } = queue.shift()!
    if (depth > maxDepth) continue
    if (resolved.has(component.id)) continue

    resolved.set(component.id, {
      id: component.id,
      component,
      depth,
      dependencies: [...component.edges],
      dependents: [],
      props: {},
      relevanceScore: 1.0 - depth * 0.2,
    })

    // Enqueue dependencies (sync — assumes registry has them in memory)
    if (depth < maxDepth) {
      for (const edgeId of component.edges) {
        const cached = resolved.get(edgeId)
        if (!cached) {
          // We can't await in sync context — edges are resolved in next Devloop iteration
          queue.push({
            component: {
              id: edgeId,
              name: edgeId,
              description: `Dependency: ${edgeId}`,
              intent: `support ${component.id}`,
              type: 'atom',
              category: 'layout',
              triggers: [],
              mode: 'design-system',
              edges: [],
              designSystem: { requires: false, sections: [] },
              a11y: { role: 'generic', ariaLabel: edgeId, keyboardNav: false, contrastRatio: 4.5 },
              source: { name: 'warp-dependency', type: 'adsentice-original', url: '', quality: 'P2' },
              mutationId: 1,
              version: 1,
              tags: [],
              surfaces: [],
              segments: [],
              inputs: undefined as unknown as WarpComponent['inputs'],
              embedding: undefined,
              usageStats: { timesUsed: 0, lastUsedAt: '', avgRenderMs: 0 },
            },
            depth: depth + 1,
          })
        }
      }
    }
  }

  // Fill dependents (reverse edges)
  for (const [id, rc] of resolved) {
    for (const depId of rc.dependencies) {
      const dep = resolved.get(depId)
      if (dep) dep.dependents.push(id)
    }
  }

  return [...resolved.values()]
}

// ═══════════════════════════════════════════════════════════════
// Composer
// ═══════════════════════════════════════════════════════════════

export class Composer {
  constructor(
    private registry: ComponentRegistry = defaultRegistry,
    private cache: WarpCache<CompositionResult> = defaultCache,
  ) {}

  /**
   * Pipeline principal: intent → composition
   *
   * Atomic Pipeline (OD-style):
   *   1. discovery → queryByIntent() no Qdrant
   *   2. plan → inferir layout + tokens
   *   3. generate → assembly da CompositionResult
   *   4. critique → 6 dimensões de qualidade
   *   Devloop → repete critique até score ≥ 7 (max 3x)
   */
  async compose(request: CompositionRequest): Promise<CompositionResult> {
    const t0 = performance.now()
    const cacheKey = this.hashRequest(request)

    // ── CACHE CHECK (3 camadas) ──
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      return { ...cached, renderMs: performance.now() - t0 }
    }

    // ═══ ATOMIC PIPELINE ═══

    // ── STAGE 1: DISCOVERY ──
    // "O que o usuário precisa?" → busca semântica no Qdrant
    const discovered = await this.registry.queryByIntent(request.intent, 15)

    // ── STAGE 2: PLAN ──
    // "Quais componentes + layout + tokens?"
    const resolved = resolveDependencies(discovered, this.registry, 2, 12)
    const layout = inferLayout(request.context, resolved)

    // ── STAGE 3: GENERATE ──
    // "Compor + montar layout tree"
    const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    let result: CompositionResult = {
      id,
      intent: request.intent,
      layout,
      components: resolved,
      cacheKey,
      mutationId: this.cache.mutationId,
      renderMs: performance.now() - t0,
    }

    // ═══ DEVLOOP: STAGE 4 CRITIQUE ═══
    // "Avaliar qualidade em 6 dimensões. Repetir até score ≥ 7."
    let iteration = 0
    const maxIterations = 3
    const threshold = 7

    while (iteration < maxIterations) {
      iteration++
      const critique = this.evaluateCritique(result, request)

      if (critique.passed) {
        // ── CACHE + RETURN ──
        await this.cache.set(cacheKey, result, 3600_000)
        return {
          ...result,
          renderMs: performance.now() - t0,
        }
      }

      // Ajusta componentes baseado no feedback
      if (iteration < maxIterations) {
        result = this.adjustComposition(result, critique, discovered)
      }
    }

    // Max iterations reached — return best effort
    await this.cache.set(cacheKey, result, 1800_000) // shorter TTL for non-passing
    return { ...result, renderMs: performance.now() - t0 }
  }

  /**
   * Critica uma composição em 6 dimensões (5 OD + Market Fit Warp).
   *
   * No futuro (M3 + M8), esta função usará LLM como árbitro (L6).
   * Por enquanto, é determinística baseada em heurísticas dos dados embedados.
   */
  private evaluateCritique(
    composition: CompositionResult,
    request: CompositionRequest,
  ): CritiqueScore {
    const { components, layout } = composition
    const n = components.length

    // Visual Hierarchy: tem componentes suficientes? layout tem estrutura?
    const visualHierarchy = n >= 3 ? (n >= 8 ? 9 : 7) : 4 +
      (layout.columns && layout.columns > 1 ? 2 : 0)

    // Detail Execution: componentes têm a11y? edges resolvidos?
    const a11yScore = components.filter((c) => c.component.a11y.keyboardNav).length / Math.max(n, 1)
    const detailExecution = 5 + Math.round(a11yScore * 4)

    // Functionality: todos os componentes de formulário têm labels?
    const formComponents = components.filter((c) => c.component.category === 'form')
    const hasLabels = formComponents.every((c) =>
      c.dependencies.some((d) => d === 'label'),
    )
    const functionality = formComponents.length > 0
      ? (hasLabels ? 8 : 5)
      : 7

    // Innovation: diversidade de sources
    const sources = new Set(components.map((c) => c.component.source.name))
    const innovation = Math.min(9, 4 + sources.size)

    // Philosophy Consistency: todos usam tokens do design system?
    const tokenUsers = components.filter((c) => c.component.designSystem.requires).length
    const philosophyConsistency = n > 0
      ? 5 + Math.round((tokenUsers / n) * 4)
      : 5

    // Market Fit (REFINAMENTO WARP): segmento tem componentes específicos?
    const segment = request.context?.category ?? 'geral'
    const segmentComponents = components.filter((c) =>
      c.component.segments?.includes(segment),
    ).length
    const marketFit = n > 0
      ? 4 + Math.round((segmentComponents / n) * 5)
      : 5

    return computeCritique({
      visualHierarchy,
      detailExecution,
      functionality,
      innovation,
      philosophyConsistency,
      marketFit,
    })
  }

  /**
   * Ajusta composição baseado no feedback do critique.
   * Devloop: adiciona componentes faltantes, remove redundantes.
   */
  private adjustComposition(
    _current: CompositionResult,
    critique: CritiqueScore,
    discovered: WarpComponent[],
  ): CompositionResult {
    // Re-rankeia com pesos ajustados pelo feedback
    const adjusted = [...discovered]
      .sort((a, b) => {
        let scoreA = 1.0
        let scoreB = 1.0

        // Boost a11y if functionality is low
        if (critique.functionality < 6) {
          if (a.a11y.keyboardNav) scoreA += 0.3
          if (b.a11y.keyboardNav) scoreB += 0.3
        }

        // Boost segment relevance if market fit is low
        if (critique.marketFit < 6) {
          if (a.segments.length > 0) scoreA += 0.2
          if (b.segments.length > 0) scoreB += 0.2
        }

        return scoreB - scoreA
      })

    const resolved = resolveDependencies(adjusted.slice(0, 10), this.registry)
    const layout = inferLayout({}, resolved)

    return {
      id: `comp_adj_${Date.now()}`,
      intent: _current.intent,
      layout,
      components: resolved,
      cacheKey: _current.cacheKey,
      mutationId: this.cache.mutationId,
      renderMs: 0,
    }
  }

  private hashRequest(request: CompositionRequest): string {
    const str = JSON.stringify({
      intent: request.intent,
      page: request.context.page,
      category: request.context.category,
      device: request.context.device,
    })
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    return `compose:${Math.abs(hash).toString(36)}`
  }
}

/** Singleton */
export const composer = new Composer()
