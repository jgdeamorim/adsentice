# ADR-0047 · adsentice Brain — Arquitetura Distribuída de Inteligência KG + Wire S11

**Status:** ACCEPTED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0032 (Warp Composer), ADR-0037 (Convergência KG), ADR-0044 (L2b), ADR-0045 (S11-MK→S11K), ADR-0046 (Realinhamento Pipeline)
**Sources:** DAG completa — 9 módulos KG, 2 composers, 5 resolvers, semantic-registry, brain/b3-decide

---

## 1. Contexto

O adsentice acumulou 3 camadas de inteligência distribuída ao longo de 38 ADRs e 500+ commits. Não existe UM "cérebro" monolítico (como o `k0` do EVO-API) — existem **3 camadas** que juntas formam o sistema de inteligência KG-first que alimenta todas as surfaces.

A sessão v133→v138 revelou que o **composeS11 usa só 6 dos 10 módulos de inteligência disponíveis**, enquanto o composeS10_BLUE usa todos os 10. Este ADR documenta a arquitetura completa e wireia os 4 módulos faltantes.

---

## 2. Arquitetura do Cérebro adsentice (3 camadas)

```
┌──────────────────────────────────────────────────────────────────────┐
│              CAMADA 0 · KGs VIVOS (Qdrant :6352 + Embed :8081)      │
│                                                                      │
│  warp-kg.ts           (838 loc)  11 funções de query ao corpus       │
│    searchDesignInspiration()    → inspiração visual por segmento     │
│    queryDesignBestPractices()   → 85+ best practices (WCAG, React)   │
│    queryComponentsByIntent()    → componentes por intenção            │
│    queryDesignSystem()          → design system specs               │
│    queryMaterioTokens()         → 36 design tokens Materio           │
│    queryMediaIcons()            → ícones por faceta                  │
│    queryCSSPatterns()           → padrões CSS por segmento           │
│    queryK0ForSurface()          → grafo K0 para surface              │
│    fetchComponentsByIds()       → fetch componentes por ID           │
│    getWarpKgStats()             → estatísticas do corpus             │
│                                                                      │
│  marketing-kg.ts      (183 loc)  2 funções de query                  │
│    queryMarketingSkill()        → 1 framework específico             │
│    queryRelevantSkills()        → batch 40+ frameworks rankeados     │
│      Corey Haines (43): SEO, CRO, analytics, copy, pricing, growth   │
│      Kim Barrett (12):  avatar, schwartz, objection, campaign, perf  │
│      Adsentice (5):     local-seo, whatsapp, google-ads, ifood, book │
│      ESC Skills (27):   gui.marketing agência performance            │
│                                                                      │
│  best-practice-kg.ts  (121 loc)  1 função de query                   │
│    queryBestPractices()          → 85+ regras (WCAG, React, shadcn,  │
│                                    landing, dark mode, a11y)         │
│                                                                      │
│  semantic-registry.ts (214 loc)  50+ nós semânticos                  │
│    capabilities (26), signals (15), docs (8), hubs (4), pipelines (3)│
│    registryResolve(intent)       → busca semântica cross-graph      │
│    getMutationId()               → controle de versão canônico       │
│                                                                      │
│  Custo total: $0 · Embed mpnet 768d · Qdrant 20,091 pts              │
│  Todos os módulos compartilham: QDRANT=:6352, EMBED=:8081,           │
│  COLLECTION=adsentice-self, tag=adsentice                            │
└──────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│              CAMADA 1 · RESOLVERS (cross-KG query + inferência)      │
│                                                                      │
│  vocab-resolver.ts         resolveIntentVocab(seg, ctx)              │
│    → 8 facets: persona, psychology, design, niche, icon,             │
│                animation, conversion, market                         │
│                                                                      │
│  strategy-resolver.ts      resolveStrategies(intent, facets)         │
│    → par A/B: social_proof | authority | scarcity | risk_reversal    │
│    → scores + reasoning por estratégia (8 facets × sinais reais)     │
│                                                                      │
│  market-ontology.ts        computeMarketOntology(seg, city)          │
│    → densidade competitiva, PIB per capita, saturação de mercado     │
│    → IBGE panorama + district_registry (354 municípios, 22 RMs)      │
│                                                                      │
│  morph-resolver.ts         resolveMorph(intent, facets)              │
│    → layout morphing corpus-driven (design patterns + CSS patterns)  │
│                                                                      │
│  tokens-composer.ts (M9)   composeTokens(seg, plan, market)          │
│    → 7 segmentos × 4 planos × 6 pipelines de inferência              │
│    → palette, typography, spacing, shadow, motion, responsive        │
│                                                                      │
│  recommend-engine.ts       recommend(leadData, surface)              │
│    → ActionPlan com dados REAIS (quick wins, this month, strategic)  │
│    → BattleCard: pitch + objeções + close                            │
│                                                                      │
│  brain/b3-decide.ts        brainTurn(question, searchResults)        │
│    → Bypass Score ($0) → Bypass Cache ($0) → B3 Claude (cost-capped) │
│    → 12 containers condensados em 1 função (ADR-0011)                │
└──────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│              CAMADA 2 · COMPOSERS (orquestração + render)            │
│                                                                      │
│  composer-core.ts  (1319 loc)  CENTRAL — Intend→resolve→morph→render │
│    resolveIntend()              → analisa intent + IBGE              │
│    morphTokens()                → tokens CSS + A/B variant           │
│    compose()                    → pipeline completo (HTML output)     │
│    composeS10_BLUE()            → Raio-X: USA TODOS OS 10 MÓDULOS   │
│    composeS10()                 → wrapper público                    │
│                                                                      │
│  warp-composer.ts  (~1900 loc)  Surface S10 + S11 + L2b wire         │
│    composeS10() (warp)          → S10 via warp pipeline              │
│    composeS11()                 → S11 Landing A/B                   │
│    enrichS11L2b()               → L2b crawler .TS (ADR-0044)        │
│                                                                      │
│  4-composer.ts     (687 loc)    SurfaceSpecialist registry           │
│    SurfaceSpecialist (22 surfaces) → gramática por surface           │
│    Composer.compose()           → Atomic Pipeline + Devloop          │
│    S10_SPECIALIST, S11_SPECIALIST → 2/22 registrados                 │
│                                                                      │
│  runtime.ts        (364 loc)    Devloop + Critique + Agent dispatch  │
│    DesignRuntime.run()          → max 3 iterações, threshold 7/10    │
│    Telemetry real               → todo compose gera trace Qdrant     │
│                                                                      │
│  pipeline.ts       (515 loc)    Design Pipeline                      │
│    DesignPipeline.run()         → discovery→plan→generate→critique   │
│    DesignPipeline.multiSurface()→ A/B testing por estratégia         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Matriz de Uso: composeS10_BLUE vs composeS11

```
MÓDULO                      composeS10_BLUE     composeS11 (antes)    composeS11 (DEPOIS)
──────────────────────────  ─────────────────   ───────────────────   ──────────────────
CAMADA 0 · KGs

warp-kg (11 funções)        ✅ 9 funções        ✅ 6 funções           ✅ 6 funções
marketing-kg (2 funções)    ✅ frameworks       ❌ NÃO USA             ✅ queryRelevantSkills
best-practice-kg (1 função) ✅ 85+ regras       ❌ NÃO USA             ✅ queryBestPractices

CAMADA 1 · Resolvers

strategy-resolver           ✅ facets           ✅ resolveStrategies    ✅ resolveStrategies
market-ontology             ✅ mercado          ❌ NÃO USA             ✅ computeMarketOntology
vocab-resolver              ✅ intent vocab     ✅ preVocab             ✅ preVocab
morph-resolver              ✅ layout           ✅ slotMorph            ✅ slotMorph
tokens-composer M9          ✅ tokens           ✅ tokens               ✅ tokens
recommend-engine            ✅ ActionPlan       ❌ NÃO USA             ✅ recommend

CAMADA 2 · Composers

composeS10_BLUE             ✅ (a si mesmo)     —                      —
composeS11                  —                   ✅ (a si mesmo)        ✅ (a si mesmo)
SurfaceSpecialist           ✅ S10_SPECIALIST   ✅ S11_SPECIALIST      ✅ S11_SPECIALIST
enrichS11L2b (ADR-0044)     —                   ✅ L2b wire            ✅ L2b wire

TOTAL                        10/10 (100%)        6/10 (60%)            10/10 (100%)
```

---

## 4. Decisão

**Wirear os 4 módulos faltantes do cérebro adsentice no composeS11**, alcançando paridade de inteligência com o composeS10_BLUE.

Os 4 módulos a wirear:

| # | Módulo | Custo | Função no S11 |
|---|--------|-------|--------------|
| 1 | **marketing-kg** | $0 | `queryRelevantSkills(leadCtx)` → enriquece copy angles com frameworks específicos (SEO local, CRO, objeções) |
| 2 | **best-practice-kg** | $0 | `queryBestPractices("landing-page", seg, "S11")` → valida HTML contra 85+ regras WCAG/performance/SEO |
| 3 | **market-ontology** | $0 | `computeMarketOntology(seg, city)` → personaliza estratégia por densidade competitiva do bairro |
| 4 | **recommend-engine** | $0 | `recommend(leadData, "S11")` → gera ActionPlan com dados REAIS (quick wins, this month, strategic) |

---

## 5. Implementação

### 5.1 Wire no composeS11

```typescript
// warp-composer.ts · composeS11() — após resolveStrategies, adicionar:

// ── CÉREBRO ADSENTICE · 4 módulos KG (ADR-0047) ──
const leadCtx: LeadContext = {
  businessName: lead.title,
  category: lead.category || cat,
  segment: seg,
  city, district,
  score: lead.score_compound || 50,
  rating: lead.rating_value || 0,
  reviews: lead.rating_votes || 0,
  isClaimed: lead.is_claimed || false,
  hasWebsite: !!lead.website,
  competitorCount: competitors,
  topGaps: [],
  schwartzLevel: lead.schwartz_label || 'Problem Aware',
}

const [mktFrameworks, bestPractices, marketOntology, recommendations] = await Promise.all([
  queryRelevantSkills(leadCtx).catch(() => []),
  queryBestPractices("landing-page", seg, "S11").catch(() => []),
  computeMarketOntology(seg as SegmentId, city).catch(() => null),
  recommendEngine.recommend(
    { ...leadCtx, l2bServices, l2bDoctors, l2bInsurance, designScore: l2b?.designDNA?.score || 0 },
    "S11"
  ).catch(() => null),
])

// mktFrameworks: enriquece os copy angles com frameworks específicos
const mktAngles = mktFrameworks.slice(0, 3).map((f: MarketingFramework) => ({
  skill: f.skillName, angle: f.content.slice(0, 200), score: f.score
}))

// bestPractices: validação automática do HTML gerado
const bpRules = bestPractices.filter(bp => bp.score > 0.4)
const bpScore = bpRules.length > 0 
  ? Math.round(bpRules.reduce((s, bp) => s + bp.score, 0) / bpRules.length * 100)
  : 0

// marketOntology: contexto de mercado para a estratégia
const marketContext = marketOntology ? {
  densityLevel: marketOntology.density,
  pibPerCapita: marketOntology.pibPerCapita,
  saturationRisk: marketOntology.saturationRisk,
} : null

// recommendations: plano de ação pós-landing
const actionPlan = recommendations?.actions?.slice(0, 5) || []
```

### 5.2 Enriquecimento da meta

```typescript
const meta = {
  // ...campos existentes...
  brain: {
    marketingFrameworks: mktFrameworks.length,
    bestPracticesApplied: bpRules.length,
    bestPracticeScore: bpScore,
    marketOntology: marketContext,
    recommendations: actionPlan.length,
  },
  _pipeline: {
    phase: 'BLUE->GREEN',
    surface: 'S11',
    doctrine: `g0 + strategy A/B (ADR-0037 F6) + L2b (ADR-0044) + Brain KG (ADR-0047)`,
  },
}
```

---

## 6. Impacto

### Antes (v138)

```
composeS11:
  ├── resolveStrategies (A/B facets)
  ├── TokenComposer (paleta genérica ou L2b Brand DNA)
  ├── composeLayout (morph)
  ├── generateLandingCopy (DeepSeek $0.001)
  └── renderS11_GREEN (HTML)

Output: landing page com design + copy, sem validação,
        sem contexto de mercado, sem plano de ação
```

### Depois (ADR-0047 wireado)

```
composeS11:
  ├── resolveStrategies (A/B facets)
  ├── TokenComposer (paleta genérica ou L2b Brand DNA)
  ├── composeLayout (morph)
  ├── queryRelevantSkills (40+ frameworks marketing)      ← NOVO
  ├── queryBestPractices (85+ regras WCAG/landing)         ← NOVO
  ├── computeMarketOntology (densidade, PIB, saturação)    ← NOVO
  ├── recommendEngine.recommend (ActionPlan)                ← NOVO
  ├── generateLandingCopy (DeepSeek $0.001)
  └── renderS11_GREEN (HTML validado contra best practices)

Output: landing page + validação WCAG + contexto de mercado
        + plano de ação + frameworks específicos do nicho
```

---

## 7. Custo

| Recurso | Antes | Depois | Delta |
|---------|-------|--------|-------|
| API calls pagas | $0.001 (DeepSeek) | $0.001 (DeepSeek) | $0 |
| Qdrant queries | ~6 (warp-kg) | ~10 (+4 novos) | +4 queries locais ($0) |
| Embed calls | ~6 (warp-kg) | ~10 (+4 novos) | +4 embeds locais ($0) |
| Latência adicional | — | ~200ms (4 queries paralelas) | +200ms |
| **Custo total** | **$0.001** | **$0.001** | **$0** |

---

## 8. Verificação

1. `composeS11(placeId)` — meta.brain com marketingFrameworks > 0, bestPracticesApplied > 0
2. `composeS11(placeId)` — meta.brain.marketOntology não-nulo para leads com city
3. `composeS11(placeId)` — meta.brain.recommendations > 0
4. HTTP 307 no /en/admin/surface (sem regressão)
5. BOA mantido ≥ 0.85

---

## 9. Próximos Passos

- [x] ADR-0047 escrita
- [ ] Wire 4 módulos no composeS11
- [ ] Testar com lead real
- [ ] Surface page: mostrar brain metrics (frameworks usados, BP score)
- [ ] Pipeline page: barra "L6 · Brain KG" com contagem de frameworks

---

*v1.0 · 2026-07-20 · adsentice · DAG completa 3 camadas 9 módulos KG*
