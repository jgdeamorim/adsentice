/**
 * packages/warp/src/2-registry.ts
 * Component Registry Semântico — M2 real da Família Warp
 *
 * "Cada componente é uma entidade semântica com embedding no Qdrant.
 *  Buscar 'botão de ação principal' retorna o button, não por nome, mas por intent."
 *
 * Inspiração: EVO-API materio_leaves.rs (P0Leaf) + query_vocab (intent search)
 *             open-design registry protocol (Zod validation)
 *
 * medido=verdade · ADR-0018 · 2026-07-14 · adsentice
 */

import type {
  WarpComponent,
  ComponentEmbedPayload,
} from './types'

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

const EMBED_URL = 'http://127.0.0.1:8081/embed'
const QDRANT_URL = 'http://127.0.0.1:6352'
const COLLECTION = 'adsentice-self'

// ═══════════════════════════════════════════════════════════════
// Embed client (HTTP → mpnet 768d)
// ═══════════════════════════════════════════════════════════════

async function embed(text: string): Promise<number[]> {
  const body = JSON.stringify({ texts: [text.slice(0, 800)] })
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const data = (await res.json()) as { vectors: number[][] }
  return data.vectors[0] ?? []
}

// ═══════════════════════════════════════════════════════════════
// Qdrant client (REST)
// ═══════════════════════════════════════════════════════════════

interface QdrantUpsertPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

interface QdrantSearchResult {
  id: string
  score: number
  payload: Record<string, unknown>
}

async function qdrantUpsert(points: QdrantUpsertPoint[]): Promise<void> {
  const body = JSON.stringify({ points })
  await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

async function qdrantSearch(
  vector: number[],
  filter: Record<string, unknown>,
  limit = 10,
): Promise<QdrantSearchResult[]> {
  const body = JSON.stringify({
    vector,
    filter: {
      must: Object.entries(filter).map(([key, value]) => ({
        key,
        match: { value },
      })),
    },
    limit,
    with_payload: true,
  })
  const res = await fetch(
    `${QDRANT_URL}/collections/${COLLECTION}/points/search`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
  )
  const data = (await res.json()) as { result: QdrantSearchResult[] }
  return data.result ?? []
}

async function qdrantGet(
  id: string,
): Promise<QdrantSearchResult | null> {
  try {
    const res = await fetch(
      `${QDRANT_URL}/collections/${COLLECTION}/points/${id}`,
    )
    const data = (await res.json()) as { result: QdrantSearchResult }
    return data.result ?? null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
// ComponentRegistry — o M2 real
// ═══════════════════════════════════════════════════════════════

export class ComponentRegistry {
  private memCache = new Map<string, WarpComponent>()
  private readonly BATCH_SIZE = 6

  /**
   * Registra um componente no Qdrant COM embedding.
   *
   * O embedding é gerado a partir de: description + intent + triggers
   * Isso permite busca semântica: "preciso de um botão de ação" → button (0.92)
   */
  async register(component: WarpComponent): Promise<void> {
    // 1. Constrói o texto de embedding
    const embedText = [
      component.description,
      component.intent,
      ...component.triggers,
    ].join(' ')

    // 2. Embed → vetor 768d
    const vector = await embed(embedText)
    component.embedding = vector

    // 3. Prepara payload para Qdrant
    const payload: ComponentEmbedPayload = {
      id: component.id,
      kind: 'component' as const,
      tag: 'adsentice-warp' as const,
      name: component.name,
      description: component.description,
      intent: component.intent,
      triggers: component.triggers,
      category: component.category,
      type: component.type,
      mode: component.mode,
      edges: component.edges,
      tokens: component.designSystem.sections,
      surfaces: component.surfaces,
      segments: component.segments,
      source_name: component.source.name,
      source_type: component.source.type,
      source_quality: component.source.quality,
      a11y_role: component.a11y.role,
      a11y_keyboard: component.a11y.keyboardNav,
      a11y_contrast: component.a11y.contrastRatio,
      mutationId: component.mutationId,
      version: component.version,
    }

    // 4. Upsert no Qdrant
    await qdrantUpsert([
      {
        id: component.id,
        vector,
        payload: payload as unknown as Record<string, unknown>,
      },
    ])

    // 5. Cache local
    this.memCache.set(component.id, component)
  }

  /**
   * Registra múltiplos componentes em batch.
   */
  async registerBatch(components: WarpComponent[]): Promise<number> {
    let count = 0
    for (let i = 0; i < components.length; i += this.BATCH_SIZE) {
      const batch = components.slice(i, i + this.BATCH_SIZE)
      const points: QdrantUpsertPoint[] = []

      for (const c of batch) {
        const embedText = [c.description, c.intent, ...c.triggers].join(' ')
        const vector = await embed(embedText)
        c.embedding = vector

        points.push({
          id: c.id,
          vector,
          payload: buildPayload(c) as unknown as Record<string, unknown>,
        })
        this.memCache.set(c.id, c)
      }

      await qdrantUpsert(points)
      count += points.length
    }
    return count
  }

  /**
   * Busca componentes por intent semântico.
   *
   * "dashboard executivo para dentista em SP"
   *   → stat-card (0.87), schwartz-chip (0.72), lead-table (0.68)
   */
  async queryByIntent(intent: string, limit = 10): Promise<WarpComponent[]> {
    const vector = await embed(intent)

    const results = await qdrantSearch(
      vector,
      { kind: 'component', tag: 'adsentice-warp' },
      limit,
    )

    // Reconstrói WarpComponent do payload
    const components: WarpComponent[] = []
    for (const r of results) {
      const p = r.payload as Record<string, unknown>
      const cached = this.memCache.get(p.id as string)
      if (cached) {
        components.push({ ...cached, embedding: r.score as unknown as number[] })
      } else {
        components.push(payloadToComponent(p, r.score))
      }
    }

    return components
  }

  /**
   * Busca componente por ID exato.
   */
  async getById(id: string): Promise<WarpComponent | null> {
    const cached = this.memCache.get(id)
    if (cached) return cached

    const result = await qdrantGet(id)
    if (!result) return null

    const component = payloadToComponent(
      result.payload as Record<string, unknown>,
      result.score,
    )
    this.memCache.set(id, component)
    return component
  }

  /**
   * Remove um componente do registry.
   */
  async unregister(id: string): Promise<void> {
    this.memCache.delete(id)
    await fetch(
      `${QDRANT_URL}/collections/${COLLECTION}/points/delete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { must: [{ key: 'id', match: { value: id } }] } }),
      },
    )
  }

  /**
   * Total de componentes registrados.
   */
  async count(): Promise<number> {
    try {
      const res = await fetch(
        `${QDRANT_URL}/collections/${COLLECTION}/points/count`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: {
              must: [
                { key: 'kind', match: { value: 'component' } },
                { key: 'tag', match: { value: 'adsentice-warp' } },
              ],
            },
          }),
        },
      )
      const data = (await res.json()) as { result: { count: number } }
      return data.result?.count ?? 0
    } catch {
      return this.memCache.size
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function buildPayload(c: WarpComponent): ComponentEmbedPayload {
  return {
    id: c.id,
    kind: 'component',
    tag: 'adsentice-warp',
    name: c.name,
    description: c.description,
    intent: c.intent,
    triggers: c.triggers,
    category: c.category,
    type: c.type,
    mode: c.mode,
    edges: c.edges,
    tokens: c.designSystem.sections,
    surfaces: c.surfaces,
    segments: c.segments,
    source_name: c.source.name,
    source_type: c.source.type,
    source_quality: c.source.quality,
    a11y_role: c.a11y.role,
    a11y_keyboard: c.a11y.keyboardNav,
    a11y_contrast: c.a11y.contrastRatio,
    mutationId: c.mutationId,
    version: c.version,
  }
}

function payloadToComponent(
  p: Record<string, unknown>,
  score: number,
): WarpComponent {
  return {
    id: (p.id ?? p.name ?? 'unknown') as string,
    type: (p.type ?? 'atom') as WarpComponent['type'],
    name: (p.name ?? '') as string,
    description: (p.description ?? '') as string,
    intent: (p.intent ?? '') as string,
    category: (p.category ?? 'action') as WarpComponent['category'],
    triggers: (p.triggers ?? []) as string[],
    mode: (p.mode ?? 'design-system') as WarpComponent['mode'],
    inputs: undefined as unknown as WarpComponent['inputs'],
    edges: (p.edges ?? []) as string[],
    designSystem: {
      requires: true,
      sections: (p.tokens ?? []) as string[],
    },
    a11y: {
      role: (p.a11y_role ?? 'generic') as string,
      ariaLabel: (p.name ?? '') as string,
      keyboardNav: (p.a11y_keyboard ?? false) as boolean,
      contrastRatio: (p.a11y_contrast ?? 4.5) as number,
    },
    source: {
      name: (p.source_name ?? 'unknown') as string,
      type: (p.source_type ?? 'component') as WarpComponent['source']['type'],
      url: '',
      quality: (p.source_quality ?? 'P1') as WarpComponent['source']['quality'],
    },
    mutationId: (p.mutationId ?? 1) as number,
    version: (p.version ?? 1) as number,
    tags: (p.tags ?? ['warp']) as string[],
    surfaces: (p.surfaces ?? []) as string[],
    segments: (p.segments ?? []) as string[],
    usageStats: {
      timesUsed: 0,
      lastUsedAt: '',
      avgRenderMs: 0,
    },
    embedding: [score],
  }
}

/** Singleton */
export const registry = new ComponentRegistry()
