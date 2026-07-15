---
id: adsentice-design-pipeline-playbook
title: "Ads​entice Design Pipeline Playbook — Auditoria + Correção"
status: living
type: spec
version: "1.0.0"
date: 2026-07-15
sources:
  - ADR-0018 (Família Warp)
  - ADR-0020 (Tokens Composer)
  - ADR-0021 (Dual Embed)
  - open-design v0.9.0 (referência de pipeline)
  - EVO-API compose.rs + d3·Estilista
  - DAG audit (KG + histórico + código + Qdrant)
---

# Design Pipeline Playbook — Auditoria + Correção

> **DAG audit:** cruzamos KG, histórico de conversa, código atual e Qdrant para identificar EXATAMENTE onde estamos errando no pipeline de design.

---

## 1. O que OD faz (referência)

### Pipeline real do OD (extraído do source code)

```
Usuário: "criar landing page para dentista em SP"

OD NÃO FAZ vec() search para decidir cores.

1. CLASSIFY (LLM ou rules-based)
   intent: "dentista" → category: "healthcare/dental"
   segment: "saude" → hue: 220°, emotion: "confiança, higiene"
   
2. RESOLVE (skill + context + assets + capabilities)
   skill: "landing-page-generator"
   context: { segment: "saude", plan: "sentinela" }
   assets: [tokens.css, product-context.md]
   capabilities: [firecrawl, dataforseo, template-engine]
   
3. PLAN (design system selection)
   palette: preset do segmento (NÃO vec search)
   typography: preset do segmento
   layout: landing pattern do segmento
   
4. GENERATE (agent runs pipeline)
   template engine → HTML + CSS + assets
   SSE events → live preview no browser
   
5. CRITIQUE (5 dimensões)
   visualHierarchy, detailExecution, functionality,
   innovation, philosophyConsistency
   score 0-10 cada → composto ≥ 7/10
   
6. DEVLOOP (se critique < 7)
   re-itera com ajustes (max 3x)
   cada iteração gera evento → Langfuse-style trace
   
7. TELEMETRY (eventos → analytics)
   cada composição gera trace:
   - intent classificado
   - design system selecionado
   - componentes usados
   - critique score
   - variante A/B
   - tempo de geração
```

### O que OD NÃO faz

- **NÃO faz vec() search para decidir cor** — cores vêm de presets por segmento
- **NÃO faz vec() search para decidir tipografia** — tipografia vem de presets
- **NÃO trata Qdrant como "oráculo"** — Qdrant é fonte de INSPIRAÇÃO, não DECISÃO
- **NÃO gera preview sem pipeline** — preview é output do pipeline completo

---

## 2. O que nós estamos fazendo (errado)

### Problema #1: vec() search como oráculo de decisão

```python
# ERRADO — o que estávamos fazendo
query = "paleta cores para dentista saúde confiança"
vec = embed(query)
results = qdrant.search(vec)  # "Bauhaus | padding: 2px" ???
primary_color = results[0]    # COR ERRADA!
```

**Por que está errado:** O Qdrant retorna o payload com maior similaridade de embedding — que pode ser "Bauhaus | padding: 2px" em vez de "Dental Practice". O embedding mede similaridade semântica, não adequação ao segmento.

### Problema #2: Preview sem pipeline

```python
# ERRADO — preview atual
for segment in segments:
    query = f"paleta cores para {segment}"
    vec = embed(query)
    result = qdrant.search(vec)
    generate_html(segment, result[0])  # Sem classificação, sem critique
```

O preview atual:
- Não classifica o intent
- Não aplica presets da Matriz Warp
- Não usa o M4 composer (Atomic Pipeline)
- Não faz critique
- Não gera telemetria
- Não tem Devloop

### Problema #3: Telemetria implementada mas NÃO conectada

O `6-telemetry.ts` existe com:
- `WarpTracker.track()` → embed → Qdrant
- `DesignQualityScore` → 6 dimensões
- `GenUIEvent` → SSE para input humano
- `onGenUI(handler)` → frontend callback

Mas **nada disso é chamado pelo preview ou pelo M4**. É código morto.

### Problema #4: M4 composer não orquestra o pipeline real

O `4-composer.ts` tem:
- `ATOMIC_PIPELINE` → discovery, plan, generate, critique
- `evaluateCritique()` → heurísticas determinísticas
- `adjustComposition()` → Devloop

Mas:
- O `discovery` stage só faz `queryByIntent()` — sem classificação prévia
- O `plan` stage não aplica presets da Matriz Warp
- O `generate` stage não gera HTML/CSS real
- O `critique` stage não tem LLM como árbitro (L6)
- Nada chama `warp.composer.compose()` no preview

---

## 3. O que temos que NÃO deveríamos ter

| Artefato | Problema | Ação |
|----------|----------|------|
| `tools/adsentice_warp_quality_fixes.py` | Dual embedding test que provou NÃO funcionar (mpnet > MiniLM) | 🗑️ Manter como registro, mas NÃO usar no pipeline |
| `tools/adsentice_dual_embed_ingest.py` | Collection `adsentice-warp-dual` com 200 pontos 384d que NÃO são usados | 🗑️ Remover collection, manter script como aprendizado |
| `tools/adsentice_warp_accent_fix.py` | Re-embed de 6,295 pontos com acentos — ✅ correto, necessário | ✅ Manter |
| `tools/adsentice_uupm_name_fix.py` | Extração de nomes que foi substituída pelo prose fix | 🗑️ Manter script, mas payloads já foram substituídos |
| `tools/adsentice_uupm_fingerprint_fix.py` | Fingerprint único por payload — ✅ correto | ✅ Manter |
| `tools/adsentice_uupm_prose_fix.py` | Re-embed design.csv como documento — ✅ correto | ✅ Manter |
| `tools/adsentice_uupm_business_enrich.py` | Keywords de negócio — ✅ correto | ✅ Manter |
| Preview v1 (vec cru) | Busca raw sem pipeline | 🗑️ Remover HTMLs, substituir por v2 |
| Preview v2 (presets) | Pipeline OD-style — ✅ CORRETO | ✅ Este é o padrão |

---

## 4. Pipeline Correto — Adsentice Design Playbook

### 4.1 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                 ADSENTICE DESIGN PIPELINE                    │
│                                                             │
│  INPUT: { segment, plan, surface?, business_name? }         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAGE 0 · CLASSIFY (determinístico, µs)              │  │
│  │ segment → hue, emotion, spacing, radius, motion      │  │
│  │ plan → shadow_level, motion_richness, features       │  │
│  │ Fonte: Matriz Warp (presets canônicos)               │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAGE 1 · RESOLVE (determinístico, ms)               │  │
│  │ palette: preset[segment].colors                      │  │
│  │ typography: preset[segment].heading + body            │  │
│  │ layout: preset[segment].landing_pattern              │  │
│  │ components: preset[segment].components               │  │
│  │ Fonte: M9 tokens-composer.ts (presets)               │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAGE 2 · ENRICH (Qdrant, ms)                        │  │
│  │ design_inspiration: Qdrant search COM FILTRO          │  │
│  │   filter: kind=design-knowledge, segment={seg}        │  │
│  │ landing_variants: Qdrant search COM FILTRO            │  │
│  │   filter: kind=design-knowledge, category=landing     │  │
│  │ component_suggestions: Qdrant search COM FILTRO       │  │
│  │   filter: kind=component, category=data-display       │  │
│  │ Fonte: Qdrant :6352 (6,301 pontos)                   │  │
│  │ ⚠️ Qdrant é ENRIQUECIMENTO, não DECISÃO              │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAGE 3 · GENERATE (determinístico, ms)              │  │
│  │ tokens.css: CSS custom properties do preset          │  │
│  │ preview.html: template + tokens + componentes        │  │
│  │ A/B variant: hue shift +30° ou alt typography        │  │
│  │ Fonte: M9 tokens-composer.ts (CSS generator)         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAGE 4 · CRITIQUE (LLM árbitro L6, opcional)       │  │
│  │ 6 dimensões (5 OD + Market Fit)                      │  │
│  │ LLM (DeepSeek cost-capped) avalia qualidade          │  │
│  │ Se score < 7 → Devloop (max 3 iterações)             │  │
│  │ Fonte: M4 composer.ts (evaluateCritique)             │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ STAGE 5 · TELEMETRY (fire-and-forget, µs)           │  │
│  │ Trace: { intent, segment, plan, palette, typography, │  │
│  │          components, critique_score, variant, time } │  │
│  │ → Qdrant adsentice-conversation (kind=design-trace)  │  │
│  │ → BOA embed_quality dimension                        │  │
│  │ Fonte: M6 telemetry.ts (WarpTracker)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  OUTPUT: { tokens.css, preview.html, A/B variant,          │
│            critique_score, trace_id }                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Regra de ouro

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   QDRANT É FONTE DE INSPIRAÇÃO, NÃO ORÁCULO DE DECISÃO  │
│                                                          │
│   Decisões (cores, tipografia, layout) → PRESETS         │
│   Inspiração (variantes, componentes, padrões) → QDRANT  │
│   Validação (critique, qualidade, A/B) → LLM (L6)        │
│   Evidência (métricas, trace, melhoria) → TELEMETRY      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.3 O que NUNCA fazer

| Anti-padrão | Por que | Exemplo do que fizemos |
|-------------|---------|------------------------|
| `vec(query) → decidir cor` | Embedding não sabe o segmento | "paleta para dentista" → "Bauhaus | padding: 2px" |
| `vec(query) sem filtro` | Resultados aleatórios entre categorias | Barbearia vence para query de dentista |
| `vec(query) → gerar HTML direto` | Sem classificação, sem critique, sem telemetria | Preview v1 |
| `presets hardcoded no Python` | Duplicação do M9 tokens-composer.ts | Preview atual tem presets inline |
| `query em português sem enriquecimento` | mpnet é multilíngue mas perde precisão | 70% vs 90% com keywords |

### 4.4 O que SEMPRE fazer

1. **Classificar primeiro** — segmento e plano determinam 80% do design
2. **Presets da Matriz Warp** — cores, tipografia, spacing, motion, shadow
3. **Qdrant com FILTRO** — `kind + category + segment` (nunca sem filtro)
4. **Critique com LLM (L6)** — árbitro, não extrator
5. **Telemetria em todo pipeline** — traceability para melhoria contínua
6. **A/B variant sempre** — hue shift, typography alt, ou layout alt
7. **Preview é output do pipeline** — não é um script separado

---

## 5. Correções imediatas

### 5.1 Remover

```
🗑️ Collection adsentice-warp-dual (Qdrant :6352)
   └── 200 pontos 384d do experimento dual embed (MPNET > MiniLM)
   └── Manter tools/adsentice_dual_embed_ingest.py como registro

🗑️ docs/preview/warp-preview-*.html (versões v1 antigas)
   └── Manter apenas v2 (presets + OD pipeline)
```

### 5.2 Corrigir

```
📝 M4 composer.ts:
   └── discovery: adicionar CLASSIFY antes do queryByIntent
   └── plan: usar M9 presets em vez de vec() search para decisões
   └── generate: conectar ao M9 tokens-composer.ts para CSS real
   └── critique: conectar LLM (DeepSeek) como árbitro L6

📝 M6 telemetry.ts:
   └── Conectar ao M4 pipeline (todo compose gera trace)
   └── Implementar getMetrics() com agregação real do Qdrant

📝 Preview generator:
   └── Mover para packages/warp/src/preview.ts (não script Python)
   └── Usar warp.composer.compose() como entry point
   └── Output: tokens.css + preview.html + trace_id + critique_score
```

### 5.3 Implementar (próximo ciclo)

```
🆕 packages/warp/src/pipeline.ts
   └── Orquestrador único: classify → resolve → enrich → generate → critique → telemetry
   └── Substitui scripts Python dispersos
   └── Entry point: warp.design({ segment, plan, business_name })

🆕 packages/warp/src/preview.ts
   └── HTML generator que usa tokens.css + componentes do registry
   └── Template engine com slots (hero, features, testimonials, CTA, footer)

🆕 Telemetry dashboard
   └── Langfuse-style trace view
   └── Métricas: composições/segmento, critique_score médio, A/B winner
   └── BOA embed_quality dimension (já implementado)
```

---

## 6. Métricas de qualidade

| Métrica | Baseline atual | Alvo | Como medir |
|---------|:-------------:|:----:|-----------|
| Classify accuracy | 100% (presets) | 100% | Segmento sempre classificado corretamente |
| Design relevance | 90% (Qdrant filtered) | 95% | Top-3 design-knowledge matches segmento |
| Critique score | N/A (não usado) | ≥7/10 | LLM critique em 6 dimensões |
| A/B variant CTR | N/A | +15% vs baseline | Telemetria de uso real |
| Pipeline latency | N/A | <2s end-to-end | trace.renderMs |
| Cache hit rate | N/A | >80% | warp.cache.stats() |
| Trace completeness | 0% | 100% | Todo compose gera trace no Qdrant |

---

*Design Pipeline Playbook v1.0 · 2026-07-15 · adsentice · medido=verdade · DAG audit*
