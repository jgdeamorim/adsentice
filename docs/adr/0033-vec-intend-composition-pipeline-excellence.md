# ADR-0033 · Pipeline vec() → Intend → Composição · Do Osso à Excelência

**Status:** proposed
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0018 (Warp Family), ADR-0020 (Morph por Intent), ADR-0032 (Composer Runtime)
**Supersedes:** none

## Contexto

O adsentice ingeriu **18.526 pontos** no Qdrant via pipeline `vec()`:

| Kind | Tag | Pontos | Fonte |
|------|-----|:---:|------|
| `component` | `adsentice-warp` | 107 | shadcn/ui + Radix Primitives + 21st-magic |
| `snippet` | `adsentice-warp` | 57 | shadcn source code + Radix WAI-ARIA API docs |
| `design-knowledge` | `adsentice-warp` | 6.267 | UI UX Pro Max |
| `marketing-skill` | `adsentice` | ~59 | Corey Haines (47) + Kim Barrett (12) |
| `materio` | `materio` | 36 | Palette, typography, spacing, shadow tokens |

Cada componente foi ingerido via **dual embed** (ADR-0021): `e0` (EN lowercase, 384d) + `e1` (PT preserve accents, 384d), totalizando 768 dimensões. Cada componente tem **39 campos** de payload incluindo `a11y` (WCAG 2.1 AA+), `designSystem.sections` (tokens consumidos), `surfaces` e `segments`.

**O problema:** o `composeS10` (TypeScript) gera HTML inline — não usa o `ComponentRegistry.queryByIntent()`, não monta `LayoutTree` com `resolveDependencies()`, não executa `critique 6D`, e não ativa o `Devloop`. Os 107 componentes embedados estão **invisíveis** para o pipeline de geração.

**A auditoria final revelou:** o HTML gerado (12.425 chars) é funcionalmente completo (score ring, gaps, CTA, DeepSeek copy), mas é **plano** — sem semântica HTML5 (`<main>`, `<nav>`, `<article>`), sem a11y (`role`, `aria-label`, `alt`), sem performance (`font-display`, `preload`, `loading="lazy"`), e sem Schema.org JSON-LD. Cada um desses atributos de qualidade JÁ EXISTE nos componentes embedados, mas não é aplicado.

## Decisão

**Wirear o pipeline vec() completo no composeS10.** Cada etapa que já existe no `packages/warp/src/` deve ser invocada, não duplicada.

### Arquitetura do Pipeline Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│              PIPELINE vec() → Intend → Composição                    │
│              Do Osso (hoje) → Excelência (ADR-0033)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PHASE 0: INGESTÃO (já feito — 2026-07-14)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Reference → 3-destiller.ts → WarpComponent (39 fields)       │   │
│  │   → embed(description+intent+triggers) → vec 768d             │   │
│  │   → Qdrant upsert {id, vector, payload}                       │   │
│  │   → 2-registry.ts: ComponentRegistry                          │   │
│  │                                                               │   │
│  │ 107 componentes · 57 snippets · 6.267 design knowledge       │   │
│  │ 36 Materio tokens · 59 marketing skills                       │   │
│  │ TOTAL: 18.526 pontos no Qdrant adsentice-self                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  PHASE 1: INTEND → DISCOVERY (NOVO — wire queryByIntent)            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Intend {surface:"S10", segment:"beleza", niche:"barber_shop"}│   │
│  │   → queryByIntent("relatório diagnóstico beleza barbearia")   │   │
│  │   → Qdrant search via vec(intent)                             │   │
│  │   → top K componentes: score-ring, gap-card, info-card,       │   │
│  │     cta-button, stat-card, schwartz-chip                      │   │
│  │                                                               │   │
│  │ CADA componente já tem:                                        │   │
│  │   ✅ a11y (role, ariaLabel, keyboardNav, contrastRatio)        │   │
│  │   ✅ designSystem.sections (tokens CSS que consome)            │   │
│  │   ✅ surfaces + segments (onde e para quem é relevante)        │   │
│  │   ✅ intent semântico (o que resolve)                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  PHASE 2: PLAN → LAYOUT TREE (NOVO — wire resolveDependencies)      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ inferLayout(context, components)                               │   │
│  │   S10 → landing-shell:                                         │   │
│  │     hero { score-ring, schwartz-chip }                         │   │
│  │     sections [ info-grid { info-card × 3 },                    │   │
│  │               gap-list { gap-card × N } ]                      │   │
│  │     cta { cta-button }                                         │   │
│  │     footer                                                     │   │
│  │                                                               │   │
│  │ resolveDependencies(topLevel, registry, maxDepth=2)            │   │
│  │   → BFS resolve edges → full dependency tree                   │   │
│  │   → cada componente com props + relevanceScore                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  PHASE 3: GENERATE → COMPOSE (já existe — unificar)                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Data injection:                                                │   │
│  │   Supabase lead → score, gaps, rating, photos, website         │   │
│  │   DeepSeek → headline, subtitle, CTA                           │   │
│  │   MorphTokens → CSS custom properties (segmento + IBGE)        │   │
│  │   Qdrant design → queryDesignBestPractices (inspiração)        │   │
│  │                                                               │   │
│  │ Render:                                                        │   │
│  │   Layout tree + componentes + dados + tokens + CSS → HTML      │   │
│  │   Schema.org JSON-LD injetado no <head>                        │   │
│  │   Performance: font-display:swap + preload fonts               │   │
│  │   A11y: role + aria-label + alt herdados dos componentes       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  PHASE 4: CRITIQUE → DEVLOOP (NOVO — wire critique 6D)             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ critique 6D:                                                    │   │
│  │   visualHierarchy (0.20) + detailExecution (0.15)              │   │
│  │   + functionality (0.25) + innovation (0.10)                   │   │
│  │   + philosophyConsistency (0.15) + marketFit (0.15)            │   │
│  │                                                               │   │
│  │ composite ≥ 7.0 → ✅ PASS → entrega                            │   │
│  │ composite < 7.0 → 🔄 Devloop re-iterate (max 3x)               │   │
│  │   → consulta Qdrant design knowledge para melhorias            │   │
│  │   → ajusta tokens, layout, spacing                             │   │
│  │   → re-executa critique                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  PHASE 5: QUALITY GATE (NOVO — wire embed quality gate)            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ tools/adsentice_embed_quality_gate.py → port para TS          │   │
│  │   ✅ A11y: todos os componentes têm a11y preenchido?           │   │
│  │   ✅ Performance: font-display:swap + preload presentes?       │   │
│  │   ✅ Schema: JSON-LD LocalBusiness + AggregateRating?          │   │
│  │   ✅ Semantic: <main>, <nav>, <article> presentes?             │   │
│  │   ✅ Responsive: @media breakpoints + clamp() + grid?          │   │
│  │                                                               │   │
│  │ 5/5 ✅ → entrega                                               │   │
│  │ <5/5 → re-iterate ou warn                                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### O que cada componente JÁ carrega (do Qdrant)

Exemplo: o componente `button` embedado:

```json
{
  "id": "button",
  "intent": "acionar ação primária, confirmar, submeter, navegar, deletar",
  "a11y": {
    "role": "button",
    "ariaLabel": "Botão de ação",
    "keyboardNav": true,
    "contrastRatio": 4.5
  },
  "designSystem": {
    "requires": true,
    "sections": ["color", "typography", "spacing", "radius", "shadow", "animation"]
  },
  "surfaces": ["S1","S4","S6","S9","S10","S11","S14"],
  "segments": ["saude","beleza","servicos","alimentacao","comercio","educacao","hospitalidade"],
  "source": { "name": "shadcn/ui", "quality": "P0" }
}
```

**Se o composeS10 usar `queryByIntent("botão call to action saúde")`, o Qdrant retorna `button` com score de relevância. O composeS10 aplica as props do lead (cor do segmento, texto do DeepSeek) e renderiza com todos os atributos de a11y já preenchidos. Zero código manual.**

### 5 Refinamentos para Excelência

#### 1. A11y WCAG 2.1 AA+ (built-in nos componentes)

Todo componente embedado tem `a11y` preenchido:

| Componente | role | ariaLabel | keyboardNav | contrastRatio |
|-----------|------|-----------|:---:|:---:|
| button | button | Botão de ação | ✅ | 4.5 |
| card | article | Cartão de conteúdo | ❌ | 3.0 |
| stat-card | region | Cartão de estatística | ❌ | 4.5 |
| schwartz-chip | status | Nível de consciência | ❌ | 4.5 |

**O composeS10 renderiza o HTML com esses atributos automaticamente.**

#### 2. Performance (font-display + preload)

```html
<link rel="preload" href="Inter.woff2" as="font" crossorigin>
<style>
@font-face { font-family: Inter; font-display: swap; }
</style>
```

Evita FOUT (Flash of Unstyled Text) e Cumulative Layout Shift.

#### 3. Schema.org JSON-LD

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Barbearia BBC",
  "address": { "@type": "PostalAddress", "addressLocality": "Vila Velha" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "5.0", "reviewCount": "126" }
}
</script>
```

Rich Results no Google — estrelas, endereço, telefone nos resultados de busca.

#### 4. Meta Sidecar JSON (rastreabilidade)

Cada geração salva um `.json` com trace completo:

```json
{
  "traceId": "s10_abc123",
  "composedAt": "2026-07-17T23:00:00Z",
  "lead": { "place_id": "...", "title": "Barbearia BBC", "score": 51 },
  "pipeline": ["fetch_lead", "classify", "compute_gaps", "deepseek_copy", "query_by_intent", "resolve_deps", "critique", "render"],
  "critiqueScore": { "composite": 8.2, "passed": true },
  "componentsUsed": ["score-ring", "info-card", "gap-card", "cta-button"],
  "tokensSource": "Materio Qdrant + IBGE panorama",
  "mutationId": 42
}
```

#### 5. Quality Gate Automático

```
✅ A11y check: all components have a11y filled  → PASS
✅ Performance: font-display:swap + preload     → PASS
✅ Schema: LocalBusiness + AggregateRating      → PASS
❌ Semantic: <main> missing                     → WARN
✅ Responsive: @media + clamp() + grid          → PASS
Score: 4/5 → DELIVER (with 1 warning)
```

## Implementação

### Nível 1: Wire queryByIntent no composeS10

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1.1 | `warp-composer.ts` | Importar `ComponentRegistry` de `2-registry.ts` |
| 1.2 | `warp-composer.ts` | `queryByIntent(intentLabel)` → top 8 componentes |
| 1.3 | `warp-composer.ts` | Substituir HTML inline por render baseado em componentes |

### Nível 2: Wire resolveDependencies + LayoutTree

| Passo | Arquivo | Ação |
|-------|---------|------|
| 2.1 | `warp-composer.ts` | Importar `inferLayout` + `resolveDependencies` |
| 2.2 | `warp-composer.ts` | Montar layout tree em vez de div plana |

### Nível 3: Wire critique 6D + Devloop

| Passo | Arquivo | Ação |
|-------|---------|------|
| 3.1 | `warp-composer.ts` | Importar `computeCritique` de `4-composer.ts` |
| 3.2 | `warp-composer.ts` | Auto-critique antes de retornar, re-iterate se score < 7.0 |

### Nível 4: Excelência — A11y + Performance + Schema + Meta

| Passo | Arquivo | Ação |
|-------|---------|------|
| 4.1 | `warp-composer.ts` | A11y herdado dos componentes registrados |
| 4.2 | `warp-composer.ts` | `font-display: swap` + `preload` no `<head>` |
| 4.3 | `warp-composer.ts` | Schema.org JSON-LD dinâmico (dados do lead) |
| 4.4 | `api/surface/compose/route.ts` | Salvar meta sidecar JSON junto com HTML |

### Nível 5: Quality Gate Automático

| Passo | Arquivo | Ação |
|-------|---------|------|
| 5.1 | `lib/warp-quality-gate.ts` (NOVO) | Port do `adsentice_embed_quality_gate.py` |
| 5.2 | `warp-composer.ts` | Rodar quality gate antes de retornar |

## Custos

| Componente | Custo |
|------------|:---:|
| queryByIntent (Qdrant local) | $0 |
| resolveDependencies (BFS in-memory) | $0 |
| critique 6D (heuristics, no LLM) | $0 |
| Quality Gate (heuristics) | $0 |
| **Total adicional** | **$0** |

Tudo já está pago — os embeddings existem, os componentes estão no Qdrant, o código está em `packages/warp/src/`. É só wirear.

## Nota medida — contrato REAL do payload (2026-07-18)

⚠️ O exemplo de payload nested acima (`a11y:{...}`, `designSystem:{...}`) é **idealizado**. Scroll completo no Qdrant (236 pts `kind=component`) mediu o contrato real, que é **FLAT**:

```
a11y_role · a11y_keyboard · a11y_contrast     ← flat, não nested
tokens                                         ← equivale a designSystem.sections
edges                                          ← grafo de dependências JÁ NO PAYLOAD (Nível 2 pronto)
intent · triggers · surfaces · segments · mode · type · source_name · source_quality
```

Exemplo real (`Button`, 21 campos). **Zero** componentes têm `a11y{}` nested. Implicações:

1. **Nível 1.3:** o render component-based consome campos flat (`a11y_role`, `tokens`).
2. **Nível 2:** `resolveDependencies` não precisa inferir — o campo `edges` já traz o grafo.
3. **Corpus para intent medido:** 60 componentes motion (Animated Beam, Particles, Number Ticker, Animated Circular Progress Bar…), Framer Motion knowledge (Gestures, Layout Animations, SVG Path Animation stroke+pathLength), 733 color-palettes, 388 ui-styles, 168 micro-interactions, 387 glassmorphism, 64 svg, 483 icon-libraries, 8.920 google-fonts, 113 chart-types.
4. **Schema.org image:** `warp-composer.ts` usa `lead.website` hardcoded como `image` (inválido para Rich Results). O corpus tem SVG components/knowledge para gerar og-image/hero SVG real via intent.

Fonte: scroll Qdrant `adsentice-self` 2026-07-18 · claude-memory `d291d67b`.

## Referências

- `packages/warp/src/2-registry.ts` — ComponentRegistry com `queryByIntent()` (vec search)
- `packages/warp/src/3-destiller.ts` — Destilador de referências → WarpComponent (11 componentes shadcn)
- `packages/warp/src/4-composer.ts` — Compositor com `inferLayout()`, `resolveDependencies()`, `computeCritique()`
- `packages/warp/src/8-agents.ts` — AgentRouter para dispatch Claude/DeepSeek/Qwen
- `packages/warp/src/runtime.ts` — Devloop + Telemetry + Agent Pipeline
- `apps/web/src/lib/warp-kg.ts` — `queryDesignBestPractices()` (Qdrant live)
- `apps/web/src/lib/warp-composer.ts` — `composeS10()` — alvo do wire
- `docs/adr/0018-warp-family-design-system-semantico.md` — Família Warp M1-M9
- `docs/adr/0020-compositor-tokens-semanticos-morph-por-intent.md` — M9 Morph por Intent
- `docs/adr/0021-dual-embed-e0-e1-multilang-pt-br.md` — Dual embed pipeline
- `docs/adr/0032-warp-composer-runtime-dual-engine.md` — Motor Dual INTERNAL + CLIENT
- `tools/adsentice_warp_ingest_max.py` (95K) — Ingestão 107 componentes
- `tools/adsentice_embed_quality_gate.py` (15K) — Quality gate Python
