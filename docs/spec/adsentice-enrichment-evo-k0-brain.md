# Enrichment Plan — EVO-API k0/Brain → adsentice Design Intend

**medido=verdade · cross-KG EVO-API :6350/:6395 · 2026-07-18**

## O que EVO-API tem que adsentice NÃO tem (e como absorver)

### 1. k0 GRAPH — modelagem de código como entidades

**EVO-API (rsxt-k0):**
```
NodeId/EdgeKind são Strings → add_edge → sync lê do canonical
554 endpoints · ~17k params/fields → matéria-prima do grafo
Extração L0 AST/regex (NÃO LLM) → ontologia evolui só com founder
UI/dados ASSEMBLADOS da família (vec/k0/e0/g0/f0)
```

**Adsentice hoje:**
- KG: 174 edges estáticos (hand-authored em adsentice_kg_server.py)
- Sem ingestão automática de estrutura de código (.ts, .js, .css)
- Sem modelagem de componentes/rotas/nodes como entidades do KG
- Qdrant `adsentice-self` tem `kind=component` mas sem edges entre eles

**Ação — k0-lite para adsentice:**
```python
# tools/adsentice_k0_ingest.py
# Pipeline: file tree → AST → entities → edges → embed → Qdrant
# Entities: Component, Route, Page, Function, Type, Schema, Token
# Edges: imports, extends, renders, uses, depends_on, exports
```

### 2. VEC() SENSOR — dual embed e0+e1 bilingual

**EVO-API (rsxt-v0):**
```
HNSW Cosine 768d · e0 (EN code) + e1 (PT prose) concat → 768d
Score threshold doctrine: ≥0.80=real, ≥0.60=placeholder, <0.60=text
Embed = sensor, NÃO árbitro — emite candidates, cliente decide materials
```

**Adsentice hoje:**
- mpnet 768d single vector (sem dual embed)
- SCORE_THRESHOLD 0.30 (calibrado para não matar queries)
- Sem placeholder tiers (0.60→placeholder ainda não implementado)

**Ação — placeholder tier:**
```typescript
// queryMediaIcons: score < 0.60 → generic circle icon
function placeholderIcon(facet: string): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--muted-fg)" stroke-width="1"/></svg>`
}
```

### 3. CODE-KG — o próprio agente entende a estrutura

**EVO-API (coder-mcp pattern):**
```
.rs = handler → AST L0/regex → VecRecord{meta} → Qdrant
TypeScript check → tsc → 1 erro real (DctRenderer line 43) → corrige
O agente INGERE o próprio código como entidades do KG
```

**Adsentice hoje:**
- `tools/adsentice_self_ingest.py` — embeda arquivos como texto, sem parsing estrutural
- Sem distinção: `.ts` componente vs `.ts` utilidade, `.css` token vs `.css` reset
- Sem extração de imports, exports, props types, JSX structure

**Ação — code structure ingest:**
```python
# tools/adsentice_k0_ingest.py
KINDS = {
    ".tsx": "component",    # React component with JSX
    ".ts":  "module",       # TypeScript module (utility, hook, type)
    ".css": "stylesheet",   # CSS (token, reset, component-scoped)
    ".html":"template",     # HTML template
}
# Extrai: imports → edges, exports → capabilities, JSX tags → components
# Embeda com metadata: kind, path, exports, imports, jsx_elements
```

### 4. DCTMORPH — fábrica 3 camadas

**EVO-API (compose.rs):**
```
D7 Coreógrafo · DctRoot(A1) · fábrica 3 camadas
@token CSS-var → styled scoped → hover via inline style
DctNode tree → render com geometria g0
```

**Adsentice hoje:**
- String concat (renderS10_GREEN)
- `cls()` passthrough → sem scoping real
- Sem DctNode tree → iteração linear de slots

**Ação — DCT-lite:**
```typescript
interface DctNode {
  tag: string           // 'header' | 'div' | 'main' | 'footer'
  class: string         // 'hero' | 'score-card' | 'gap'
  tokens: Record<string, string>  // { padding, radius, color }
  children: DctNode[]
  text?: string
  a11y?: { role: string; label: string }
}
// renderDctNode(node: DctNode): string → recursive
// @token substitution: @color.primary → var(--primary)
```

### 5. BRAIN OODA — loop de inteligência

**EVO-API (rsxt-chat brain):**
```
brain não morre — troca de alvo (intent → time d0-d8 → morph)
OODA: observe → orient → decide → act → (BOA recalcula)
KG-first recall: conversa → commit → ADR → código
Drift tracking: cada commit com score de continuidade
```

**Adsentice hoje:**
- OODA Redis (observe/orient/decide/act) — manual, não automático
- BOA calculado por `adsentice_boa_score.py` no SessionStart hook
- Sem drift tracking entre commits
- Sem loop automático de melhoria (devloop existe mas é manual)

**Ação — OODA auto-loop:**
```python
# tools/adsentice_ooda_loop.py
# 1. observe: twin benchmark → score dimensions
# 2. orient: compare with EVO-API reference → identify gaps
# 3. decide: select highest-impact action (weighted by BOA impact)
# 4. act: apply fix → regenerate benchmark → compare
# BOA recalcula automaticamente após cada ciclo
```

## Estrutura de Ingestão Proposta

```
adsentice_k0_ingest.py
  ├── L0: parse file tree (apps/web/src, packages/warp/src)
  ├── L1: classify (kind: component, module, stylesheet, template)
  ├── L2: extract (imports, exports, JSX tags, CSS classes, tokens)
  ├── L3: build edges (imports → depends_on, JSX → renders, class → uses)
  ├── L4: embed (text + metadata → 768d vector)
  └── L5: upsert Qdrant (adsentice-self, kind=component|module|stylesheet)
```

## Timeline

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | k0-lite ingest (code structure → KG) | vocabulary +15% | 2h |
| 2 | SVG placeholder tier (embedding sensor) | media +10% | 30min |
| 3 | DCT-lite render (recursive nodes) | patterns +5% | 1h |
| 4 | OODA auto-loop (twin benchmark → fix → repeat) | operations +5% | 1h |
| 5 | Dual embed e0+e1 (EN code + PT prose) | pipeline +10% | 3h |
