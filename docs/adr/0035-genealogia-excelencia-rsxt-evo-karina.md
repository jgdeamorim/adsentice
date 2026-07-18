---
id: ADR-0035
title: Genealogia da Excelência — Do rsxt/evo-api ao Karina HTML (substrato cognitivo do adsentice design)
status: proposed
date: 2026-07-18
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0016, ADR-0018, ADR-0020, ADR-0032, ADR-0033, ADR-0034]
---

# ADR-0035 — Genealogia da Excelência

> **"O Karina HTML não nasceu do nada. É a materialização de 2 anos de substrato cognitivo (rsxt), 30K linhas de compositor (EVO-API), e 150 estilos de design (OD v0.9.0), convergindo num único `composeS10`."**

## 1. A árvore genealógica (medido=verdade)

```
rsxt (14.552 linhas Rust, 10 crates, 3 docs doutrina)
  │  v0 vector sensor · k0 knowledge graph · f0 BOA · s0 audit trail · t0 time-series
  │
  ├─→ EVO-API (30K+ linhas Rust, 76 capabilities, compose.rs 3.019l)
  │     intent → query_vocab → DctNode tree → resolve_dependencies → render
  │
  ├─→ rsxt-bridge-adsentice.md (2026-07-12)
  │     6 intents canônicos · L0→L6 pipeline · doutrinas absorvidas
  │
  ├─→ ADR-0018 Warp Family (2026-07-14)
  │     9 módulos · queryByIntent vec() · 4-composer Atomic Pipeline
  │
  ├─→ ADR-0020 M9 tokens-composer (2026-07-14)
  │     intent → query_vocab_design → 6 pipelines inferência → tokens CSS
  │
  ├─→ adsentice_s10_generator.py (2026-07-15, commit 4362d21)
  │     Pipeline 8 etapas L0→L6 · Karina HTML · store_trace feedback loop
  │
  └─→ HOJE composeS10 TS (2026-07-18)
        N1.3 vec()+a11y · N2 edges+BFS+LayoutTree · N3.2 critique 6D+Devloop
        N4.4 meta sidecar · Órgão5 OD v0.9.0 150 estilos design-system
```

## 2. O que o rsxt/evo-api ENSINOU ao adsentice (e como aplicamos)

### 2.1 rsxt v0 — Vector Sensor

**O que é:** Embedding NUNCA decide. Embedding SENSOREIA — retorna candidatos, não respostas.

**Como aplicamos:** `queryComponentsByIntent()` busca top 16 no Qdrant. O `pickComp` + `computeCritique` decidem quais usar. Se nenhum acima do threshold (0.30 calibrado), fallback honesto.

**Karina HTML:** `qdrant_enrich()` embedava query → search design-knowledge → `design_hint`. Bug: sem threshold, hint errado ("Barbearia" pra dentista). Corrigido hoje (ADR-0034 regra 2).

### 2.2 rsxt k0 — Knowledge Graph (edges/nodes)

**O que é:** Grafo de entidades com relações confirmadas. `rsxt:k0` armazena grafo de dependência. EVO-API `compose.rs` tem `resolve_dependencies()` com BFS sobre DctNode.

**Como aplicamos:** Payload FLAT tem campo `edges` (medido: "popover → [button]", "Bento Grid → [card]"). `resolveComponentGraph` BFS depth≤2, cap 12, relevance 1-d*0.2, dependents reversos. Card resolvido de edge que busca semântica não retornou. `4-composer.ts:181` faz o mesmo.

**Karina HTML:** O Python NÃO tinha grafo — HTML era template plano sem dependências.

### 2.3 rsxt f0 — BOA (founder_signal 0.35)

**O que é:** Fórmula de decisão com peso máximo no founder. BOA = 0.30·stability + 0.20·performance + 0.15·error_free + 0.35·founder_signal.

**Como aplicamos:** `computeCritique` 6D: functionality 0.25, visualHierarchy 0.20, philosophyConsistency 0.15, marketFit 0.15, detailExecution 0.15, innovation 0.10. O marketFit é o "founder_signal do design" — pesa mais que innovation.

---

## 3. O padrão que UNIFICA tudo

### 3.1 EVO-API compose.rs (3.019 linhas)

```
intent("landingpage-clinica-estetica-sp")
  → query_vocab(intent)          // busca semântica
  → DctNode tree                  // árvore de componentes
  → resolve_dependencies()       // BFS edges
  → render(surface)              // HTML + tokens + a11y
```

### 3.2 Warp 4-composer.ts (461 linhas) — port TypeScript

```
CompositionRequest { intent, context }
  → STAGE 1 discovery: queryByIntent()              // ≡ query_vocab
  → STAGE 2 plan: resolveDependencies + inferLayout // ≡ DctNode tree
  → STAGE 3 generate: CompositionResult             // ≡ render
  → STAGE 4 critique: 6 dimensões                   // ≡ quality gate
  → Devloop: re-iterate <7.0 ≤3x                    // ≡ feedback loop
```

### 3.3 O que o composeS10 HOJE executa (unificado)

```
POST /api/surface/compose { place_id }
  L0: fetch Supabase (34 colunas)
  L1: classify (normalizeCategory + NICHO_MAP + SEGMENT_TOKENS oklch)
  L2: computeGaps (sinais F1-F9, E1-E7, W1-W9 — cada gap cita coluna de origem)
  ─── SENSOR (rsxt v0/v1) ───
  L3: queryComponentsByIntent vec("diagnostico raio-x beleza") → 16 hits
  L3: queryDesignBestPractices vec(segment+surface) → design intel
  L3: queryDesignSystem vec(segment+hint) → 150 OD estilos → specs CSS
  ─── GRAPH (rsxt k0) ───
  L4: resolveComponentGraph BFS edges → fetchComponentsByIds
  L4: LayoutTree { hero, score, info, gaps, cta }
  ─── CRITIQUE (rsxt f0 + OD 6D) ───
  L5: computeCritique(graph, segment) → composite + Devloop ≤2x
  ─── ARBITER (rsxt L6) ───
  L6: generateCopy DeepSeek V4 Flash → headline/subtitle/CTA
  ─── RENDER ───
  L7: HTML cliente limpo + meta sidecar JSON (traceId + graph + critique)
  ─── FEEDBACK LOOP ───
  L8: store_trace → Qdrant kind=market-intel (a implementar no TS — Python já faz)
```

### 3.4 Antigravity DAG implícita (docs-antigravity/mapping/02-dag.md)

O Antigravity não define DAGs como JSON. A DAG é **implícita** — construída pela ordem de execução dos `CortexStep` (160+ tipos) dentro de uma `Cascade` (sessão com cascadeId único), materializada na `Trajectory` (histórico completo com timing + artifacts).

Este é exatamente o padrão do `4-composer.ts`:
- **CortexStep** = cada stage do Atomic Pipeline (discovery, plan, generate, critique)
- **Cascade** = `composer.compose(request)` — orquestra a sequência
- **Trajectory** = `LayoutTree` + `tracedLayout` + meta sidecar — a DAG materializada

Skills no Antigravity = Semantic Intent Matching. Workflows = determinísticos. O adsentice aplica o mesmo: `queryByIntent` é skill semântica; o `composeS10` é workflow determinístico.

---

## 4. Por que o Karina HTML era excelente (e o que perdemos/recuperamos)

### O que o Python fazia certo (15/07)
1. Pipeline L0→L6 completo seguindo doutrina rsxt
2. `store_trace` UPSERT Qdrant → feedback loop fechado (18 traces medidos)
3. System prompt em camadas (Schwartz tones + Corey + Kim Barrett)
4. KV cache DeepSeek real medido (hit/miss + custo por 1M tokens)
5. HTML cliente limpo + JSON sidecar separado

### O que o Python NÃO fazia
1. vec() queryByIntent (design_hint era 1 query simples)
2. BFS edges resolveDependencies (HTML era template plano)
3. Critique 6D + Devloop (zero auto-avaliação)
4. OD v0.9.0 design system specs (cores/layout/cards do corpus)
5. a11y herdada de componentes reais

### O que o TS HOJE faz (recuperado + expandido)
1. ✅ vec() vivo (fix contrato embed `{texts}` em 004ed59)
2. ✅ edges BFS + Card d1 resolvido de dependência
3. ✅ critique 6D component-based + Devloop ≤2x
4. ✅ OD v0.9.0 150 estilos → CSS specs derivadas do corpus
5. ✅ a11y_role/keyboard herdados do payload FLAT
6. ✅ HTML cliente limpo + meta sidecar 19 campos
7. ⚠️ store_trace TS (feedback loop) — Python faz, #6 implementou meta sidecar, UPSERT Qdrant pendente
8. ⚠️ System prompt camadas — deepseek.ts ainda usa prompt linear (KV cache quebra)

---

## 5. A lição final

O adsentice NÃO é um gerador de HTML com regras fixas por categoria. É um **sistema de composição por intent semântico** que:

1. **Sensoreia** o corpus (vec no Qdrant — 18.464 pts, 150 estilos OD, 236 componentes, 6.267 design knowledge)
2. **Monta grafo** de dependências (edges BFS do payload FLAT)
3. **Auto-critica** em 6 dimensões (critique component-based + Devloop)
4. **Deriva specs** de design system do corpus (cores, grid, spacing, radius — não hardcoded)
5. **Fecha o ciclo** com feedback loop (store_trace → próxima geração consulta histórico)

Se amanhã ingerirmos mais 50 estilos OD, ou 200 componentes 21st, ou 10 skills de copywriting — o layout, as cores, o card radius, o hero height, a tipografia, TUDO melhora sem tocar no código. Esse é o design vivo.

---

## Referências

- `docs/rsxt-evo-api-vs-claude-seo.md` — comparativo completo (2026-07-11)
- `docs/spec/rsxt-bridge-adsentice.md` — ponte RSXT→adsentice (2026-07-12)
- `docs/spec/rsxt-intent-schema.json` — 6 intents canônicos
- `docs/adr/0016-adsentice-soberano-inteligencia-evo-api.md` — 13 padrões absorvidos
- `docs/adr/0018-warp-family-design-system-semantico.md` — Warp 9 módulos + OD v0.9.0
- `docs/adr/0020-compositor-tokens-semanticos-morph-por-intent.md` — M9 tokens-composer
- `packages/warp/src/2-registry.ts` — ComponentRegistry.queryByIntent (vec)
- `packages/warp/src/4-composer.ts` — Composer + resolveDependencies + critique 6D + Devloop
- `packages/warp/src/runtime.ts` — Devloop + Telemetry + Agent Pipeline
- `tools/adsentice_s10_generator.py` — pipeline Python 8 etapas (genealogia direta do Karina)
- `docs/preview/warp-s10-dra-karina-santos-oliveira---periodonti-s10_7310.html` — o resultado
- `/media/jeffer/BKP/PROJETOS/CODE-OSS/docs-antigravity/mapping/02-dag.md` — DAG implícita
- claude-memory: `2fc8fa7d` (esta genealogia) · `d291d67b` (vec até o osso) · `00b75498` (genealogia s10_7310)
