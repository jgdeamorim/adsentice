---
id: adr-0018
title: Família Warp — Design System Vivo com Composição por Intent Semântico
status: proposed
date: 2026-07-14
deciders: founder, claude
extends: [adr-0017, adr-0016, adr-0011]
references:
  - EVO-API compose.rs (3.019 linhas, 1 arquivo — referência de padrão, NÃO de organização)
  - EVO-API materio_leaves.rs (459 linhas, destilador P0)
  - EVO-API materio_ingest.rs (310 linhas, ingestão com destilação)
  - ADR-0017 (Frontend Enterprise)
  - ADR-0011 (Brain OODA)
  - Kimera Design System (589 linhas, tokens JS puros)
  - SGA (50 nós, 4 camadas)
  - Semantic Registry (intent → node → edges)
---

# ADR-0018 · Família Warp — Design System Vivo com Composição por Intent

## Contexto

O EVO-API implementa um pipeline de composição de UI (`compose.rs`, 3.019 linhas) que demonstra o **padrão correto** (intent → query_vocab → DctNode tree → HTML) mas com **organização inadequada para produção**:

| Problema do compose.rs | Impacto | Solução Warp |
|------------------------|---------|-------------|
| **3.019 linhas em 1 arquivo** | Difícil manter, testar, estender | **7 módulos** com responsabilidade única |
| **Sem cache de composição** | Cada intent re-gera HTML do zero | **Cache em 3 camadas** (KV + Redis + Memory) |
| **Sem telemetria** | Não sabe quais composições são usadas | **Warp Tracker** (eventos → Qdrant → SGA) |
| **Sem versionamento** | Sem mutationId nos layouts | **Mutation ID nos layouts** (invalidação granular) |
| **Acoplado ao rsxt_design** | Não funciona sem Rust | **TypeScript puro**, zero dependência Rust |
| **Sem separação token/componente** | Design tokens misturados com lógica | **Tokens.js** (separado, CDN, edge) |

Além disso, o mercado enterprise 2026+ converge para **5 padrões de design system vivo** que o compose.rs não atende completamente:

1. **Design tokens como API** (CDN edge, não arquivo estático)
2. **Component registry semântico** (busca por intent, não por nome)
3. **Compositor determinístico** (layout inference, dependency resolution)
4. **Telemetria de uso** (quais componentes são mais usados, quais intents mais frequentes)
5. **Cache com invalidação granular** (mutationId por componente, não por página)

## Decisão

**Criamos a Família Warp — um sistema de 7 módulos TypeScript que implementa design system vivo com composição por intent semântico. O compose.rs do EVO-API serve como referência de padrão, não de organização.**

### Arquitetura — 7 Módulos

```
apps/web/src/lib/warp/
├── 1-tokens.ts           ← Design tokens como API viva (CDN + CSS + JS)
├── 2-registry.ts         ← Component registry semântico (Qdrant + cache)
├── 3-destiller.ts        ← Destilador: referencia → componente P0 (materio_ingest.rs pattern)
├── 4-composer.ts         ← Compositor: intent → components → layout tree
├── 5-resolver.ts         ← Dependency resolver: edges → BFS → full page tree
├── 6-telemetry.ts        ← Warp Tracker: eventos → Qdrant → SGA metrics
└── 7-cache.ts            ← Cache em 3 camadas: KV (L1) + Redis (L2) + Memory (L3)
```

### Módulo 1: `tokens.ts` — Design Tokens como API

**Inspiração:** Kimera (589 linhas, tokens JS puros) + EVO-API DctNode (tokens como entidades semânticas).

**Problema do EVO-API:** Tokens estão inline no `compose.rs` como strings. Não são versionados, não têm embedding, não são servidos por CDN.

**Solução Warp:**

```typescript
// lib/warp/1-tokens.ts — 3 camadas de resolução

// CAMADA 1: CSS Custom Properties (CDN edge, cache 24h)
// /tokens/:workspace.css — gerado por Cloudflare Worker
// Purga quando SGA mutationId do workspace muda

// CAMADA 2: JS API (runtime, tipado)
export interface TokenSet {
  id: string
  version: number
  mutationId: number
  colors: Record<string, string>
  typography: Record<string, { size: string; weight: number; font: string; leading: number }>
  spacing: Record<string, string>
  radii: Record<string, string>
  animations: Record<string, string>  // keyframes CSS
}

export class TokensAPI {
  // Resolve tokens para um workspace
  async resolve(workspaceId: string): Promise<TokenSet> {
    // 1. Cache KV (L1, <10ms)
    const cached = await kv.get(`tokens:${workspaceId}`)
    if (cached && cached.mutationId === sga.mutationId) return cached

    // 2. Deriva tokens do SGA
    // query: "brand identity for workspace X"
    const brand = await sga.resolve({ intent: "brand identity", workspace: workspaceId })
    
    // 3. Monta TokenSet
    const tokens: TokenSet = {
      id: workspaceId,
      version: brand.version,
      mutationId: sga.mutationId,
      colors: {
        accent: brand.props.accentColor || "#f9603f",
        bg: brand.props.bgColor || "#fafafa",
        surface: brand.props.surfaceColor || "#ffffff",
        // ...
      },
      typography: {
        // derivado do SGA + defaults
      },
      spacing: {
        // derivado do SGA + defaults
      },
      radii: {
        // derivado do SGA + defaults
      },
      animations: {
        // keyframes CSS gerados
      }
    }

    // 4. Cache KV (24h, purge on mutation)
    await kv.put(`tokens:${workspaceId}`, tokens, { expirationTtl: 86400 })
    return tokens
  }

  // Gera CSS custom properties (para CDN)
  toCSS(tokens: TokenSet): string {
    return `
      :root {
        ${Object.entries(tokens.colors).map(([k, v]) => `--color-${k}: ${v};`).join("\n")}
        ${Object.entries(tokens.spacing).map(([k, v]) => `--space-${k}: ${v};`).join("\n")}
        ${Object.entries(tokens.radii).map(([k, v]) => `--radius-${k}: ${v};`).join("\n")}
      }
      .dark {
        ${Object.entries(tokens.colors).map(([k, v]) => `--color-${k}: ${invertForDark(v)};`).join("\n")}
      }
    `
  }

  // Gera tailwind.config.ts dinâmico
  toTailwindConfig(tokens: TokenSet): object {
    return {
      theme: {
        extend: {
          colors: tokens.colors,
          fontSize: Object.fromEntries(
            Object.entries(tokens.typography).map(([k, v]) => [k, [v.size, { lineHeight: v.leading, fontWeight: v.weight }]])
          ),
          spacing: tokens.spacing,
          borderRadius: tokens.radii,
          keyframes: tokens.animations,
        }
      }
    }
  }
}
```

**Diferencial vs EVO-API:** Tokens são entidades semânticas com embedding no Qdrant. "Buscar cor do botão primário" retorna `--color-accent`. Tokens versionados com mutationId. CDN edge com purge automático.

### Módulo 2: `registry.ts` — Component Registry Semântico

**Inspiração:** `materio_leaves.rs` (P0Leaf struct) + `query_vocab` (busca por intent).

**Problema do EVO-API:** Vocab index é acoplado ao `compose.rs`. Componentes são DctNode em Rust — não funcionam no frontend TypeScript.

**Solução Warp:**

```typescript
// lib/warp/2-registry.ts — Component Registry Semântico

export interface WarpComponent {
  id: string                    // "stat-card", "schwartz-chip", "lead-table"
  type: "atom" | "molecule" | "organism" | "template" | "page"
  name: string
  description: string           // "KPI card com valor, título, subtítulo e ícone"
  intent: string                // "exibir métrica principal do dashboard"
  category: string              // "kpi", "navigation", "data-display", "feedback"
  props: Record<string, PropDef>
  edges: string[]               // dependências: [ "score-bar", "schwartz-chip" ]
  a11y: {                       // WCAG 2.1 AA+ compliance
    role: string
    ariaLabel: string
    keyboardNav: boolean
    contrastRatio: number
  }
  component: () => React.ReactNode  // lazy-loaded
  embedding?: number[]          // 768d (populado pelo destilador)
  mutationId: number
  version: number
  tags: string[]
  usageStats: {                 // telemetria de uso
    timesUsed: number
    lastUsedAt: string
    avgRenderMs: number
  }
}

export class ComponentRegistry {
  private indexPath: string  // Qdrant collection: adsentice-self, kind=component

  // Registra um componente (com embedding)
  async register(component: WarpComponent): Promise<void> {
    // 1. Embed descrição + intent (768d)
    const embedding = await embed(`${component.description} ${component.intent}`)
    component.embedding = embedding

    // 2. Upsert no Qdrant
    await qdrant.upsert("adsentice-self", {
      id: component.id,
      vector: embedding,
      payload: {
        ...component,
        kind: "component",
        tag: "adsentice-warp",
      }
    })

    // 3. Registra no SGA como nó
    await sga.register({
      id: `component.${component.id}`,
      type: "component",
      name: component.name,
      description: component.description,
      intent: component.intent,
      edges: component.edges,
      mutationId: component.mutationId,
    })
  }

  // Busca componentes por intent (semântico)
  async queryByIntent(intent: string, limit = 10): Promise<WarpComponent[]> {
    // 1. Cache Redis (L2, <2ms)
    const cacheKey = `warp:query:${hash(intent)}`
    const cached = await redis.get(cacheKey)
    if (cached) return cached

    // 2. Qdrant semantic search
    const embedding = await embed(intent)
    const results = await qdrant.search("adsentice-self", {
      vector: embedding,
      filter: { kind: "component", tag: "adsentice-warp" },
      limit,
    })

    // 3. Re-rank (c1_rerank — mesmo do Brain OODA)
    const ranked = c1Rerank(results, intent, "ask-explicar", limit)

    // 4. Cache (TTL 24h, purge on component mutation)
    await redis.setex(cacheKey, 86400, ranked)
    return ranked
  }

  // Resolve componente por ID (com cache)
  async getById(id: string): Promise<WarpComponent | null> {
    const cached = await redis.get(`warp:component:${id}`)
    if (cached) return cached

    const result = await qdrant.get("adsentice-self", id)
    if (result) {
      await redis.setex(`warp:component:${id}`, 86400, result)
    }
    return result
  }
}
```

### Módulo 3: `destiller.ts` — Destilador de Referências

**Inspiração:** `materio_ingest.rs` (310 linhas) — ingere anatomia de referência, destila componentes P0, gera embeddings.

**Problema do EVO-API:** Só ingere Materio. Não ingere shadcn/ui, Radix, Tailwind references, WCAG guidelines.

**Solução Warp:**

```typescript
// lib/warp/3-destiller.ts — Pipeline de destilação

export interface ReferenceSource {
  name: string           // "shadcn/ui Dialog", "Radix Accordion", "WCAG 2.1"
  type: "component" | "pattern" | "guideline" | "template"
  content: string        // código fonte ou documentação
  url: string
  quality: "P0" | "P1" | "P2"  // prioridade de destilação
}

export interface DestilledComponent {
  id: string
  name: string
  description: string
  intent: string
  props: Record<string, PropDef>
  template: string       // TSX template gerado
  tokens: string[]       // tokens usados: ["color.accent", "space.md", "radius.lg"]
  a11y: A11yInfo
  source: ReferenceSource
  confidence: number     // quão bem o destilador entendeu (0-1)
  requiresReview: boolean
}

export class Destiller {
  // Pipeline: reference → analyze → distill → validate → register
  async process(reference: ReferenceSource): Promise<DestilledComponent> {
    // 1. ANALYZE: extrai anatomia do componente
    const anatomy = await this.analyzeAnatomy(reference)
    
    // 2. DISTILL: gera template TSX + props tipadas
    const distilled = await this.distillComponent(anatomy)
    
    // 3. VALIDATE: check AA+, contrast, keyboard nav
    const a11y = await this.validateAccessibility(distilled)
    
    // 4. REGISTER: registra no registry + indexa embedding
    await registry.register({
      ...distilled,
      a11y,
      source: reference,
    })
    
    return distilled
  }

  // Ingere múltiplas referências de uma vez
  async ingestBatch(sources: ReferenceSource[]): Promise<{
    ingested: number
    destilled: number
    registered: number
    failed: string[]
  }> {
    const results = await Promise.allSettled(
      sources.map(s => this.process(s))
    )
    // ... aggregate results
  }

  // Watch mode: re-ingere quando fonte muda (CI/CD trigger)
  async watchSources(): Promise<void> {
    // Monitora repos de referência (shadcn/ui releases, WCAG updates)
    // Re-destila componentes afetados
  }
}

// Referências padrão (pré-carregadas)
export const DEFAULT_REFERENCES: ReferenceSource[] = [
  {
    name: "shadcn/ui Card",
    type: "component",
    url: "https://ui.shadcn.com/docs/components/card",
    quality: "P0",
  },
  {
    name: "Radix Dialog (WCAG 2.1 AA+)",
    type: "component",
    url: "https://www.radix-ui.com/primitives/docs/components/dialog",
    quality: "P0",
  },
  {
    name: "WCAG 2.1 — Non-text Contrast",
    type: "guideline",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
    quality: "P0",
  },
  {
    name: "Tailwind CSS v4 — Design Tokens Configuration",
    type: "pattern",
    url: "https://tailwindcss.com/docs/configuration",
    quality: "P0",
  },
  {
    name: "Motion One — Animation Patterns",
    type: "pattern",
    url: "https://motion.dev/docs",
    quality: "P1",
  },
  // ... mais referências
]
```

### Módulo 4: `composer.ts` — Compositor por Intent

**Inspiração:** `compose.rs` (padrão de intent → components → HTML).

**Problema do EVO-API:** Todo o pipeline de composição em 1 função monolítica. Sem separação de layout inference, sem cache de composição, sem paralelismo.

**Solução Warp:**

```typescript
// lib/warp/4-composer.ts — Pipeline de composição modular

export interface CompositionRequest {
  intent: string                    // "dashboard executivo para dentista em SP"
  context: {
    page?: string                   // "/admin", "/admin/discovery"
    category?: string               // "dentist"
    workspace?: string
    device?: "desktop" | "tablet" | "mobile"
    mode?: "light" | "dark"
    user?: { role: string }
  }
  constraints?: {
    maxComponents?: number
    preferredLayout?: string
    cacheTtl?: number
  }
}

export interface CompositionResult {
  id: string
  intent: string
  layout: LayoutTree
  components: ResolvedComponent[]
  theme: ThemeConfig
  telemetry: CompositionTelemetry
  cacheKey: string
  mutationId: number
  renderMs: number
}

export class Composer {
  constructor(
    private registry: ComponentRegistry,
    private tokens: TokensAPI,
    private resolver: DependencyResolver,
    private cache: WarpCache,
    private telemetry: WarpTracker,
  ) {}

  // Pipeline principal: intent → composition
  async compose(request: CompositionRequest): Promise<CompositionResult> {
    const t0 = performance.now()

    // 1. CACHE CHECK (3 camadas)
    const cacheKey = hashComposition(request)
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      this.telemetry.track({ event: "cache_hit", cacheKey, intent: request.intent })
      return { ...cached, renderMs: performance.now() - t0 }
    }

    // 2. INTENT → COMPONENTS (semantic search + re-rank + graph resolve)
    const components = await this.registry.queryByIntent(request.intent, 15)
    const ranked = c1Rerank(components, request.intent, "ask-explicar", 8)

    // 3. DEPENDENCY RESOLUTION (edges → BFS → full tree)
    const resolved = this.resolver.resolve(ranked, {
      maxDepth: 3,
      maxComponents: request.constraints?.maxComponents || 12,
    })

    // 4. LAYOUT INFERENCE (page context → layout template)
    const layout = this.inferLayout(request.context, resolved)

    // 5. TOKEN RESOLUTION (workspace → theme)
    const theme = await this.tokens.resolve(request.context.workspace || "default")

    // 6. ASSEMBLY (components + layout + theme → composition)
    const composed = {
      id: nanoid(),
      intent: request.intent,
      layout,
      components: resolved,
      theme,
      telemetry: {
        intent: request.intent,
        componentsResolved: resolved.length,
        layoutUsed: layout.id,
        mutationId: sga.mutationId,
      },
      cacheKey,
      mutationId: sga.mutationId,
      renderMs: performance.now() - t0,
    }

    // 7. CACHE (TTL 1h, purge on component/token mutation)
    await this.cache.set(cacheKey, composed, { ttl: 3600 })

    // 8. TELEMETRY
    this.telemetry.track({
      event: "composition_created",
      intent: request.intent,
      componentsCount: resolved.length,
      renderMs: composed.renderMs,
    })

    return composed
  }

  // Layout inference: contexto da página → template de layout
  private inferLayout(
    context: CompositionRequest["context"],
    components: ResolvedComponent[]
  ): LayoutTree {
    const { page } = context

    if (page?.startsWith("/admin")) {
      // Admin layout: sidebar + header + grid content
      return {
        id: "layout.admin",
        type: "admin-shell",
        slots: {
          sidebar: { component: "layout.vertical-menu", props: {} },
          header: { component: "layout.header", props: { title: page } },
          content: {
            type: "grid",
            columns: context.device === "mobile" ? 1 : context.device === "tablet" ? 2 : 3,
            gap: "var(--space-lg)",
            children: components.map(c => ({ component: c.id, props: c.props })),
          },
        },
      }
    }

    if (page === "/" || !page) {
      // Landing layout: full-width sections
      return {
        id: "layout.landing",
        type: "landing-shell",
        slots: {
          hero: {},
          sections: components.map(c => ({ component: c.id, props: c.props })),
          footer: {},
        },
      }
    }

    // Default: grid layout
    return {
      id: "layout.default",
      type: "grid",
      columns: 2,
      gap: "var(--space-lg)",
      children: components.map(c => ({ component: c.id, props: c.props })),
    }
  }
}
```

### Módulo 5: `resolver.ts` — Dependency Resolver

**Inspiração:** SGA `resolveEdges()` (BFS 1-hop) + npm/pnpm dependency resolution.

**Problema do EVO-API:** Não tem dependency resolution. Componentes são montados manualmente.

```typescript
// lib/warp/5-resolver.ts — BFS dependency resolution

export interface ResolvedComponent {
  id: string
  component: WarpComponent
  depth: number              // distância do nó raiz
  dependencies: string[]     // componentes que este PRECISA
  dependents: string[]       // componentes que PRECISAM deste
  props: Record<string, unknown>
  slot?: string              // onde na layout tree (header, sidebar, content)
}

export class DependencyResolver {
  // BFS a partir dos componentes top-level
  resolve(
    topLevel: WarpComponent[],
    opts: { maxDepth: number; maxComponents: number }
  ): ResolvedComponent[] {
    const resolved = new Map<string, ResolvedComponent>()
    const queue: { component: WarpComponent; depth: number }[] = []

    // Inicializa fila com top-level (depth=0)
    for (const c of topLevel) {
      queue.push({ component: c, depth: 0 })
    }

    while (queue.length > 0 && resolved.size < opts.maxComponents) {
      const { component, depth } = queue.shift()!

      if (depth > opts.maxDepth) continue
      if (resolved.has(component.id)) continue

      // Registra componente
      resolved.set(component.id, {
        id: component.id,
        component,
        depth,
        dependencies: [...component.edges],
        dependents: [],  // preenchido depois
        props: {},
      })

      // Enfileira dependências (BFS)
      if (depth < opts.maxDepth) {
        for (const edgeId of component.edges) {
          const dep = await registry.getById(edgeId)
          if (dep) {
            queue.push({ component: dep, depth: depth + 1 })
          }
        }
      }
    }

    // Preenche dependents (reverse edges)
    for (const [id, rc] of resolved) {
      for (const depId of rc.dependencies) {
        const dep = resolved.get(depId)
        if (dep) {
          dep.dependents.push(id)
        }
      }
    }

    // Detecta circular dependencies
    const cycles = this.detectCycles(resolved)
    if (cycles.length > 0) {
      console.warn("[warp] Circular dependencies detected:", cycles)
    }

    return [...resolved.values()]
  }

  // Detecta ciclos (DFS com visited set)
  private detectCycles(
    resolved: Map<string, ResolvedComponent>
  ): string[][] {
    // ... implementação de detecção de ciclo em grafo
  }

  // Topological sort (ordem de renderização)
  topoloicalSort(components: ResolvedComponent[]): ResolvedComponent[] {
    // ... ordena por dependências (depth-first)
  }
}
```

### Módulo 6: `telemetry.ts` — Warp Tracker

**Inspiração:** SGA mutation tracking + BOA founder_signal + EVO-API self-score.

**Problema do EVO-API:** Não tem telemetria de composição. Não sabe quais intents geram quais layouts.

```typescript
// lib/warp/6-telemetry.ts — Warp Tracker

export interface WarpEvent {
  eventId: string
  sessionId: string
  type: "composition_created" | "component_rendered" | "cache_hit" | "cache_miss"
       | "intent_resolved" | "layout_inferred" | "token_resolved" | "cta_clicked"
  intent?: string
  category?: string
  page?: string
  componentId?: string
  renderMs?: number
  cacheHit?: boolean
  mutationId: number
  context: Record<string, unknown>
  timestamp: string
}

export class WarpTracker {
  // Track → embed → Qdrant → SGA
  async track(event: WarpEvent): Promise<void> {
    // 1. Embed event context (768d)
    const embedding = await embed(`${event.type} ${event.intent} ${event.page}`)

    // 2. Upsert no Qdrant (adsentice-conversation, kind=warp-telemetry)
    await qdrant.upsert("adsentice-conversation", {
      id: event.eventId,
      vector: embedding,
      payload: { ...event, kind: "warp-telemetry", tag: "adsentice" },
    })

    // 3. Incrementa contadores no Redis
    await redis.incr(`warp:events:${event.type}`)
    await redis.incr(`warp:components:${event.componentId}:used`)
    await redis.incr(`warp:intents:${hash(event.intent)}:count`)

    // 4. Alimenta SGA Health (métrica de cobertura de componentes)
    // "quantos % dos componentes registrados foram usados esta semana?"
  }

  // Dashboard de telemetria
  async getMetrics(period: "24h" | "7d" | "30d"): Promise<WarpMetrics> {
    return {
      totalCompositions: await redis.get("warp:events:composition_created"),
      topComponents: await this.getTopComponents(10),
      topIntents: await this.getTopIntents(10),
      cacheHitRate: await this.getCacheHitRate(),
      avgRenderMs: await this.getAvgRenderMs(),
      mostUsedCategories: await this.getTopCategories(5),
      // "Dentistas usam mais stat-card. Restaurantes usam mais gap-card."
    }
  }

  // Heatmap: quais componentes são usados juntos?
  async getComponentCooccurrence(): Promise<[string, string, number][]> {
    // "stat-card + schwartz-chip: 87 co-ocorrências"
    // "lead-table + gap-card: 12 co-ocorrências"
  }
}
```

### Módulo 7: `cache.ts` — Cache em 3 Camadas

```typescript
// lib/warp/7-cache.ts — Cache Hierarchy

export class WarpCache {
  // L1: Cloudflare KV (<10ms, edge global, 1 GB free)
  // L2: Redis (<2ms, VPS local, 256 MB)
  // L3: Memory (<0.1ms, process-scoped, 100 MB LRU)

  async get(key: string): Promise<CompositionResult | null> {
    // L1 → L2 → L3
    const l3 = this.memoryCache.get(key)
    if (l3 && l3.mutationId === sga.mutationId) return l3

    const l2 = await this.redis.get(key)
    if (l2 && l2.mutationId === sga.mutationId) {
      this.memoryCache.set(key, l2)  // promote to L3
      return l2
    }

    const l1 = await this.kv.get(key, "json")
    if (l1 && l1.mutationId === sga.mutationId) {
      this.redis.setex(key, 3600, l1)  // promote to L2
      this.memoryCache.set(key, l1)     // promote to L3
      return l1
    }

    return null
  }

  async set(key: string, value: CompositionResult, opts: { ttl: number }): Promise<void> {
    // Write-through: L3 + L2 + L1
    this.memoryCache.set(key, value)
    await this.redis.setex(key, opts.ttl, value)
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: opts.ttl })
  }

  // Invalidação granular: só purga o que mudou
  async invalidateComponent(componentId: string): Promise<void> {
    // Encontra todas as composições que usam este componente
    // Purga cache keys afetadas
    const affectedKeys = await this.redis.smembers(`warp:component:${componentId}:compositions`)
    for (const key of affectedKeys) {
      await this.kv.delete(key)
      await this.redis.del(key)
    }
    this.memoryCache.clear()  // L3 é pequeno, limpa tudo
  }
}
```

### Organização de Diretórios (Enterprise)

```
apps/web/src/lib/warp/
│
├── index.ts                 ← Exporta a WarpAPI unificada
├── types.ts                 ← Todos os tipos da família Warp
│
├── 1-tokens.ts              ← Design Tokens API (CDN + CSS + JS)
├── 1-tokens.test.ts         ← Testes unitários
│
├── 2-registry.ts            ← Component Registry Semântico
├── 2-registry.test.ts
│
├── 3-destiller.ts           ← Destilador de Referências
├── 3-destiller.test.ts
│
├── 4-composer.ts            ← Compositor por Intent
├── 4-composer.test.ts
│
├── 5-resolver.ts            ← Dependency Resolver (BFS)
├── 5-resolver.test.ts
│
├── 6-telemetry.ts           ← Warp Tracker
├── 6-telemetry.test.ts
│
├── 7-cache.ts               ← Cache 3 camadas
├── 7-cache.test.ts
│
├── references/              ← Referências ingeridas
│   ├── shadcn-dialog.md
│   ├── radix-accordion.md
│   ├── wcag21-contrast.md
│   └── motion-patterns.md
│
├── components/              ← Componentes gerados (output do destilador)
│   ├── stat-card.tsx
│   ├── schwartz-chip.tsx
│   ├── score-bar.tsx
│   └── ...
│
└── templates/               ← Layout templates
    ├── admin-shell.tsx
    ├── landing-shell.tsx
    └── grid-content.tsx
```

### WarpAPI — Interface Unificada

```typescript
// lib/warp/index.ts — Ponto de entrada único
import { TokensAPI } from "./1-tokens"
import { ComponentRegistry } from "./2-registry"
import { Destiller } from "./3-destiller"
import { Composer } from "./4-composer"
import { DependencyResolver } from "./5-resolver"
import { WarpTracker } from "./6-telemetry"
import { WarpCache } from "./7-cache"

export class WarpAPI {
  tokens: TokensAPI
  registry: ComponentRegistry
  destiller: Destiller
  composer: Composer
  resolver: DependencyResolver
  telemetry: WarpTracker
  cache: WarpCache

  constructor() {
    this.cache = new WarpCache()
    this.telemetry = new WarpTracker()
    this.tokens = new TokensAPI(this.cache, this.telemetry)
    this.registry = new ComponentRegistry()
    this.destiller = new Destiller(this.registry)
    this.resolver = new DependencyResolver(this.registry)
    this.composer = new Composer(
      this.registry, this.tokens, this.resolver, this.cache, this.telemetry
    )
  }

  // API simplificada para consumo externo
  async compose(intent: string, context?: object): Promise<CompositionResult> {
    return this.composer.compose({ intent, context: context || {} })
  }

  async getMetrics(): Promise<WarpMetrics> {
    return this.telemetry.getMetrics("7d")
  }
}

// Singleton
export const warp = new WarpAPI()
```

### Fluxo Completo

```
Usuário acessa /admin
        │
        ▼
Cloudflare Pages (React 19 + Vite, estático)
        │
        ▼
useCompose("dashboard executivo para dentista em SP")
        │
        ▼
WarpAPI.compose(intent, context)
        │
   ┌────┴────┐
   │ Cache?  │── sim → retorna <10ms (KV) / <2ms (Redis)
   └────┬────┘
        │ não
        ▼
   ┌────────────────────────────────────────┐
   │ 4-composer.ts                          │
   │                                        │
   │ 1. Semantic search (registry, Qdrant)  │
   │    "dashboard executivo"               │
   │    → stat-card (0.87)                  │
   │    → schwartz-chip (0.72)              │
   │    → score-bar (0.68)                  │
   │    → cockpit-alert (0.65)              │
   │                                        │
   │ 2. Re-rank (c1, híbrido)               │
   │    0.45·sim + 0.20·auth + ...         │
   │                                        │
   │ 3. Dependency resolution (BFS)         │
   │    stat-card → precisa de score-bar?   │
   │    schwartz-chip → precisa de chip?    │
   │                                        │
   │ 4. Layout inference                    │
   │    /admin → admin-shell                │
   │    sidebar + header + grid content     │
   │                                        │
   │ 5. Token resolution                    │
   │    workspace → tokens.css dinâmico     │
   │                                        │
   │ 6. Assembly → CompositionResult        │
   └────────────────────────────────────────┘
        │
        ▼
   Cache (3 camadas) + Telemetry
        │
        ▼
   React 19 renderiza CompositionResult
        │
        ▼
   WarpTracker registra: "dashboard composto em 45ms, 6 componentes"
```

### Comparação: compose.rs vs Warp

| Critério | EVO-API compose.rs | Família Warp |
|----------|:---:|:---:|
| **Arquivos** | 1 (3.019 linhas) | **7 módulos + tests** |
| **Design tokens** | Inline strings | CDN edge + CSS custom properties |
| **Component registry** | Vocab index (acoplado) | Qdrant + cache 3 camadas |
| **Dependency resolution** | Manual | BFS + cycle detection |
| **Layout inference** | Hardcoded | Context-aware (page, device, role) |
| **Cache** | Nenhum | KV (L1) + Redis (L2) + Memory (L3) |
| **Invalidação** | N/A | MutationId granular |
| **Telemetria** | Nenhuma | WarpTracker → Qdrant → SGA |
| **Testes** | Nenhum | 7 test files |
| **Linguagem** | Rust (DctNode) | **TypeScript (React 19)** |

## Consequências

### Positivas
- **7 módulos com responsabilidade única** — cada um testável isoladamente
- **Design tokens como API viva** — CDN edge, purge automático, derivado do SGA
- **Componentes com embedding** — busca semântica por intent, não por nome
- **Dependency resolution** — o compositor SABE o que cada componente precisa
- **Cache 3 camadas** — 95% das composições servidas em <10ms
- **Telemetria** — dados de uso alimentam o SGA e o BOA
- **Portável** — TypeScript puro, roda em qualquer lugar

### Negativas
- **Complexidade** — 7 módulos não são triviais
- **Dependência do Qdrant** — se offline, registry degrada (mas cache 3 camadas mitiga)
- **Curva de aprendizado** — time precisa entender o fluxo de composição
- **Sobrecarga inicial** — primeiras composições são lentas (cold Qdrant + sem cache)

## Roadmap

### Fase 1 · Dia 1 — Core (tokens + registry + cache)
- [ ] `1-tokens.ts` + `tokens.css`
- [ ] `2-registry.ts` (Qdrant + Redis)
- [ ] `7-cache.ts` (3 camadas)

### Fase 2 · Dias 2-3 — Pipeline (destiller + composer + resolver)
- [ ] `3-destiller.ts` (ingere shadcn/ui + Radix + WCAG)
- [ ] `5-resolver.ts` (BFS + cycle detection)
- [ ] `4-composer.ts` (pipeline completo)

### Fase 3 · Dias 4-5 — Observabilidade (telemetry + metrics)
- [ ] `6-telemetry.ts` (WarpTracker)
- [ ] Dashboard de métricas Warp
- [ ] Testes unitários (7 arquivos)

### Fase 4 · Dias 6-7 — Integração
- [ ] Substituir MUI components por Warp components
- [ ] Migrar 10 páginas admin
- [ ] Deploy Cloudflare Pages + VPS

## Prova (medido)

### EVO-API compose.rs
- **Fonte:** `crates/evo-superadmin/src/compose.rs` — 3.019 linhas, 1 arquivo
- **Fonte:** `crates/evo-superadmin/src/materio_leaves.rs` — 459 linhas, destilador P0
- **Fonte:** `crates/evo-superadmin/src/materio_ingest.rs` — 310 linhas, ingestão

### SGA (já implementado)
- **Fonte:** `lib/brain/semantic-registry.ts` — 50 nós, 4 camadas
- **Fonte:** `lib/sga-score.ts` — edge quality (k0_breath)
- **Fonte:** `lib/brain/c1-retriever.ts` — re-rank híbrido

### Kimera Design System
- **Fonte:** `/media/jeffer/BKP/DOWNLOADS/kimera-design-system.jsx` — 589 linhas, tokens JS puros

## Referências
- ADR-0011 (Brain OODA)
- ADR-0016 (Ads.soberano)
- ADR-0017 (Frontend Enterprise)
- EVO-API `compose.rs` (referência de padrão)
- EVO-API `materio_leaves.rs` + `materio_ingest.rs` (destilador)
- Kimera Design System (tokens)
- shadcn/ui, Radix UI, Tailwind CSS v4, Motion One

---

## Apêndice A — Refinamento via Open Design v0.9.0

**Fonte:** `open-design-upstream-build/` · 310 PRs, 88 contributors, v0.9.0 (2026-05-29) · Ingerido no Qdrant :6350 (`evoapi-inspiration`, tag=open-design)

O open-design é um design system tool de produção que implementa 3 padrões diretamente aplicáveis à Warp:

### A.1 Skills Protocol → Component Skills

**Fonte:** `docs/skills-protocol.md` · `docs/plugins-spec.md`

O open-design define Skill como "unidade atômica de capacidade de design". Cada skill é um diretório com `SKILL.md` (frontmatter YAML + corpo Markdown). OD adiciona extensões opcionais (`od.mode`, `od.preview`, `od.inputs`, `od.design_system`) sem quebrar compatibilidade com Claude Code.

**O que a Warp absorve:**

| Padrão OD | Aplicação Warp |
|-----------|---------------|
| `triggers: ["magazine deck", "杂志风 PPT"]` | `2-registry.ts`: cada componente registrado tem `triggers[]` para busca determinística rápida |
| `od.mode: deck \| prototype \| template \| design-system` | Componentes Warp ganham `mode` que determina como são renderizados |
| `od.inputs: [{name, type, default}]` | Props tipadas e validadas com Zod (substitui `Record<string, unknown>`) |
| `od.preview: {type: html, entry: index.html}` | Preview automático no registry (sem precisar montar a página inteira) |
| `od.design_system: {requires: true, sections: [color, typography]}` | Componentes declaram quais tokens consomem — o compositor faz tree-shaking de CSS |

Evolução do `WarpComponent`:
```typescript
// ANTES: props genéricas
props: Record<string, unknown>

// DEPOIS: tipado com Zod + triggers + mode + preview + design_system
interface WarpComponent {
  // ... (campos existentes)
  triggers: string[]           // OD-style: palavras-chave para busca determinística
  mode: "dashboard" | "deck" | "prototype" | "template" | "design-system"
  preview: {
    type: "html" | "jsx"
    entry?: string            // arquivo de preview
  }
  inputs: ZodSchema           // props tipadas (Zod)
  designSystem: {
    requires: boolean
    sections: string[]        // quais tokens este componente consome
  }
  pipeline?: PipelineStage[]  // OD-style: discovery → plan → generate → critique
  genui?: {                   // Generative UI surfaces
    surfaces: GenUISurface[]
  }
}
```

### A.2 Plugins System → Agent Workflows

**Fonte:** `docs/plugins-spec.md` (80 linhas)

O insight central do OD: **"plugins are not local UI addons; they are reusable agent workflows."** O ciclo de vida é:

```
User picks plugin → OD resolve skill + query + context + assets + capabilities
→ Agent runs pipeline → SSE events → live preview → critique → refinement
```

**O que a Warp absorve:**

1. **Plugin = Skill + Context + Assets + Capabilities.** Nosso `4-composer.ts` adota esse modelo: cada composição não é só uma lista de componentes — é um **workflow completo** com assets, design system, capabilities requeridas.

2. **Atomic Pipeline** (discovery → plan → generate → critique):
   ```
   discovery: "o que o usuário precisa?"
     → plan: "quais componentes + layout?"
       → generate: "compor + renderizar"
         → critique: "avaliar qualidade em 5 dimensões"
   ```

3. **Devloop:** Quando `critique.score < threshold`, o agente re-itera automaticamente. Nossa Warp ganha `DevloopStage`:
   ```typescript
   interface PipelineStage {
     id: string
     repeat?: boolean
     until?: { condition: string; params: Record<string, number> }
   }
   // Ex: critique stage repete até score >= 7/10
   ```

4. **Generative UI:** Quando o pipeline precisa de input humano (confirmação de direção de design, escolha de variante), o compositor emite um `GenUISurface` event. O frontend renderiza o prompt, coleta a resposta, e o pipeline continua.

### A.3 Agent Adapters → Brain Multi-Agent

**Fonte:** `docs/agent-adapters.md` (80 linhas) · `packages/registry-protocol/src/schemas.ts`

O open-design delega o loop de agente para CLIs existentes (Claude Code, Codex, Cursor, etc.) através de uma interface limpa:

```typescript
interface AgentAdapter {
  detect(): Promise<AgentDetection | null>
  capabilities(): AgentCapabilities
  run(params: AgentRunParams): AsyncIterable<AgentEvent>
  cancel(runId: string): Promise<void>
  resume?(runId: string, message: string): AsyncIterable<AgentEvent>
}
```

**O que a Warp absorve:**

Nossa `b3-decide.ts` (Brain OODA) ganha um **AgentAdapter layer** que permite rotear composições para diferentes agentes:

```typescript
// lib/warp/8-agents.ts — Agent Adapter Layer (inspirado OD)
interface WarpAgentAdapter {
  id: string                    // "claude-code" | "deepseek" | "qwen-local"
  detect(): Promise<boolean>
  capabilities(): { streaming: boolean; resume: boolean; maxTokens: number }
  compose(intent: string, context: CompositionContext): AsyncIterable<AgentEvent>
}

// Uso: warp.compose(intent, { agent: "deepseek" })
// Se o agente detectado tem streaming → SSE events em tempo real
// Se não tem → polling até completar
```

### A.4 Registry Protocol (Zod) → Type-Safe Component Registry

**Fonte:** `packages/registry-protocol/src/schemas.ts`

O open-design usa **Zod schemas** para validar entradas do registry: `RegistryEntrySchema`, `RegistryVersionSchema`, `RegistryPublisherSchema`, `RegistryMetricsSchema`, `RegistrySignatureSchema`.

**O que a Warp absorve:**

```typescript
// lib/warp/2-registry.ts — com validação Zod
import { z } from "zod"

export const WarpComponentSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/),
  version: z.string(),
  publisher: z.object({ id: z.string(), name: z.string(), verified: z.boolean() }).optional(),
  capabilities: z.array(z.string()).optional(),
  metrics: z.object({ downloads: z.number(), installs: z.number(), stars: z.number() }).optional(),
  dist: z.object({ type: z.enum(["github-release", "local"]), archive: z.string(), integrity: z.string() }).optional(),
})

// Validação em runtime: todo componente registrado passa pelo schema
// Componentes inválidos são rejeitados com mensagem clara
```

### A.5 88 Design Systems → Anatomia de Referência

**Fonte:** `design-systems/` (88 diretórios, incluindo `warp/`)

Cada design system tem um `DESIGN.md` com tokens, componentes e regras. O open-design já tem um entry `warp/` — o nosso.

**O que a Warp absorve:**

Nosso `3-destiller.ts` ganha um catálogo de 88 referências anatômicas:
- `shadcn/` → Button, Card, Dialog, Table (já é nosso alvo)
- `vercel/` → Design system enterprise com tokens
- `stripe/` → Referência de qualidade de UI
- `linear-app/` → Design system de produto (nosso Cockpit TOP-K)
- `ibm/` → Carbon: acessibilidade enterprise
- `nvidia/` → Temas escuros, data visualization
- `warp/` → O NOSSO — precisa ser preenchido com tokens + componentes

### A.6 Critique System → Design Quality Score

**Fonte:** `design-templates/critique/example.html`

O open-design avalia designs em 5 dimensões (0-10):
1. **Visual hierarchy** — estrutura visual
2. **Detail execution** — acabamento, polimento
3. **Functionality** — funcionalidade
4. **Innovation** — inovação
5. **Philosophy consistency** — consistência com o design system

**O que a Warp absorve:**

Nosso `6-telemetry.ts` ganha uma 6ª métrica: **Design Quality**. O SGA Health Score passa de 4 para 5 dimensões:

```
SGA Health = 0.30·edgeQuality + 0.20·graphCoverage + 0.20·resolutionSpeed + 0.15·dataFreshness + 0.15·designQuality
```

| Dimensão | Peso | O que mede |
|----------|:----:|-----------|
| Visual Hierarchy | 0.25 | Estrutura visual da composição |
| Detail Execution | 0.20 | Polimento, acabamento |
| Functionality | 0.25 | Funcionalidade, acessibilidade |
| Innovation | 0.10 | Originalidade, diferenciação |
| Philosophy Consistency | 0.20 | Aderência aos tokens e design system |

### A.7 Resumo: Warp refinada pelo Open Design

| Módulo Warp | Antes (ADR-0018 original) | Depois (refinado pelo OD) |
|-------------|--------------------------|--------------------------|
| **1-tokens.ts** | 4 camadas CSS | 5 camadas (+Component Tokens) |
| **2-registry.ts** | Registro simples | +Zod validation + triggers + mode + preview + design_system |
| **3-destiller.ts** | shadcn/Radix/WCAG | **88 design systems** como anatomia de referência |
| **4-composer.ts** | Pipeline linear | **Atomic Pipeline** (discovery→plan→generate→critique) + **Devloop** (re-itera até score ≥ threshold) |
| **5-resolver.ts** | BFS dependency resolution | BFS + MCP tools (write files, delete, resolve workspace) |
| **6-telemetry.ts** | Métricas de uso | +**Design Quality Score** (5 dimensões de critique) + **GenUI surfaces** |
| **7-cache.ts** | 3 camadas | Mantido (cache é universal) |
| **8-agents.ts** | ✨ NOVO | **Agent Adapter Layer** (inspirado OD): detect → capabilities → run → cancel → resume. Roteia composições para Claude Code, DeepSeek, Qwen local |
