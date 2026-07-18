---
id: adr-0037
title: "Convergência Runtime Semântico — Unificação Market KG + Design KG + Marketing KG"
status: accepted
date: 2026-07-18
deciders: [jgdeamorim]
consulted: [claude]
extends: [adr-0030, adr-0033, adr-0034, adr-0036]
tags: [adsentice, runtime, semantic, kg, cross-graph, k0, compose, render]
---

# ADR-0037 · Convergência Runtime Semântico — Unificação Market KG + Design KG + Marketing KG

## Contexto

Os ADRs 0030 (Intelligence Runtime), 0033 (Vec Intent Composition), 0034 (Design Vivo) e 0036 (Kimera Gabarito) foram escritos como pipelines independentes. Na prática, eles convergem para uma mesma arquitetura:

```
                Runtime Semântico
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Market KG       Design KG     Marketing KG
   (leads, IBGE,   (k0 edges,     (59 frameworks,
    competitors,     tokens, M9,    Corey Haines,
    scores, gaps)    facets, icons) Kim Barrett)
        │              │              │
        └──────────────┼──────────────┘
                       │
                 Decision Engine
                       │
                 Composer Runtime
                       │
                   Feedback vec()
```

A evidência do cross-KG EVO-API (:6350/:6395) e do dual twin benchmark (71% GOOD) revelou:

1. **O k0-lite ingest (v071)** entregou 976 entidades + 8159 edges do próprio código adsentice como KG pesquisável semanticamente.
2. **O vocab resolver (v066)** mapeou 55 facets em 8 domínios, mas a consulta ainda é linear (resolveIntentVocab → query separada por domínio).
3. **Os 59 frameworks de marketing** (Corey Haines 47 + Kim Barrett 12) estão no Qdrant mas não são consultados pelo runtime de composição.
4. **O EVO-API brain (rsxt-chat)** opera com cross-graph queries: intent → k0 graph → vec candidates → compose → render. O adsentice ainda opera com pipeline sequencial L0→L6.

## Decisão

**Unificar os 3 KGs em um Runtime Semântico único.** A composição deixa de ser um pipeline linear e passa a ser uma travessia de grafo orientada por intenção.

### Arquitetura alvo

```
Intent (surface + segment + lead)
  │
  ├─→ Market KG: queryMarketIntel(lead) → gaps, competitors, scores
  │     └─ fontes: Supabase discovery_listings + IBGE + DataForSEO
  │
  ├─→ Marketing KG: queryMarketingSkill(intent) → frameworks, copy patterns
  │     └─ fontes: Qdrant (59 frameworks, vec semantic search)
  │
  ├─→ Design KG: queryDesignIntent(segment, ontology) → tokens, icons, patterns
  │     └─ fontes: k0 edges + M9 + OD + Materio + vocab facets
  │
  └─→ Decision Engine: cross-reference os 3 grafos
        └─ output: S10BlueOutput + ActionPlan + Pitch
           │
           └─→ Composer Runtime: render (HTML string por enquanto, JSX Server Component alvo)
                  └─→ Feedback: QG score → re-query vec() se < 8.0
```

### Implementação em 2 fases

**Fase 1 — Marketing KG Wire (sprint atual)**
- `lib/marketing-kg.ts`: `queryMarketingSkill(skillName)` → framework do Qdrant via vec()
- `lib/marketing-kg.ts`: `applyFramework(framework, leadContext)` → ActionPlan com copy templates
- Wire no `composeS10_BLUE`: gaps enriquecidos com frameworks de marketing
- Wire no `S10RaioXPipeline`: copy derivada de headline-matrix + schwartz-awareness-mapper

**Fase 2 — JSX Server Component Render (próximo sprint)**
- `components/S10RaioX.tsx`: Server Component com props tipadas de `S10BlueOutput`
- CSS via Tailwind utility classes ou CSS modules (ADR-0017 target)
- Fim do string concat: zero bugs de escape, classes idênticas por construção
- k0 edges alimentam o compilador: o Next.js já entende a árvore de componentes

### O que NÃO muda

- **g0 doctrine**: BLUE emite decisões, GREEN aplica materials (mesmo com JSX)
- **Slot-driven render**: slots do `S10_SPECIALIST` continuam como contrato
- **Tokens unificados**: `unifyTokens(surface='S10')` permanece a fonte canônica
- **Pipeline L0-L6**: continua, mas L3 agora consulta cross-graph

## Estado atual (linha de base — medido 2026-07-18)

| Métrica | Valor |
|---------|-------|
| QG Score | 5/5 |
| DeepSeek refine | ✅ `deepseek-refine` |
| SVGs no HTML | 9 (vocab-driven) |
| M9 pipelines | 6 ativos |
| KG edges | 174 (estáticos) + 8159 (k0 discoveridos) |
| Vocab facets | 55 (8 domínios) |
| Cross-KG edges | 18 (EVO-API ↔ adsentice) |
| Dual twin composite | 71% GOOD |
| Superfícies live | 1/22 (S10) + 2 parciais (S3, S4) |
| Marketing frameworks | 59 no Qdrant, 0 wireados |

## Métricas de sucesso (Fase 1)

| Métrica | Baseline | Alvo |
|---------|----------|------|
| Gaps com framework marketing | 0/5 (genéricos) | ≥3/5 (específicos por nicho) |
| Copy pitch personalizado | Não (template fixo) | Sim (headline-matrix + schwartz) |
| Marketing KG queries por render | 0 | ≥2 (copywriting + objection-crusher) |
| Tempo adicional (L3 sensor) | 0ms | ≤500ms (Qdrant local) |
| Custo adicional | $0 | $0 (Qdrant local, zero APIs) |

## Consequências

### Positivas
- **Diagnósticos mais específicos**: gaps deixam de ser genéricos ("sem website") e passam a ser acionáveis ("seu site WordPress tem score 32/100, mobile 8.3s, zero schema — aqui está o que consertar")
- **Copy com psicologia de mercado**: headline adaptada ao Schwartz level + gatilhos do nicho
- **Base para as outras 21 superfícies**: o Marketing KG serve S3 (dashboard), S6 (market intel), S9 (SEO audit), etc.
- **Custo zero**: Qdrant local, sem APIs externas para frameworks de marketing

### Negativas
- **Complexidade do cross-graph**: 3 fontes de dados precisam de orquestração consistente
- **Latência adicional**: +1-2 vec() queries por render (~100-200ms no embed local)
- **Manutenção de frameworks**: 59 documentos precisam ser mantidos atualizados

## Referências

- `tools/adsentice_k0_ingest.py` — k0-lite code structure ingest (v071)
- `tools/adsentice_cross_kg_evo.py` — Cross-KG EVO-API connector
- `tools/adsentice_twin_benchmark.py` — Dual twin benchmark (7 dimensões)
- `packages/warp/src/vocab-resolver.ts` — resolveIntentVocab (55 facets)
- `packages/warp/src/market-ontology.ts` — computeMarketOntology
- `packages/warp/src/4-composer.ts` — S10_SPECIALIST (slot grammar)
- `docs/spec/corey-haines-frameworks.json` — 47 frameworks de marketing
- `docs/spec/marketing-strategy-frameworks.json` — Estratégias de marketing
- EVO-API Redis :6395 — rsxt doctrine V2 (7 princípios, L0-L6, LLM=árbitro)
- EVO-API Qdrant :6350 — rsxt_codebase (274 pts), evoapi_conversation (32K pts)
