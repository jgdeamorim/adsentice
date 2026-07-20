# ADR-0048 · Skills Ingestadas × Consumidores — Cross-Ecosystem Audit

**Status:** ACCEPTED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0044 (L2b), ADR-0047 (Brain KG)
**Sources:** DAG completa — 9 ingest tools × 6 consumers × Qdrant live (tag=adsentice, 38 pts)

---

## 1. Contexto

O adsentice ingeriu 60+ frameworks de marketing ao longo de 9 ferramentas de ingest, cada uma usando `kind` e `tag` diferentes:

```
tools/adsentice_skills_ingest.py        → kind=execution, tag=adsentice (5 skills originais)
tools/adsentice_corey_ingest.py         → kind=foundation/execution/pattern, tag=adsentice (43 skills)
tools/adsentice_strategy_ingest.py      → kind=framework/heuristic, tag=adsentice (17 frameworks)
tools/adsentice_warp_ingest.py          → kind=component/design-knowledge, tag=adsentice-warp (design)
tools/adsentice_warp_ingest_max.py      → kind=component, tag=adsentice-warp (design components)
tools/adsentice_warp_ingest_snippets.py → kind=snippet/reference, tag=adsentice-warp (design snippets)
tools/adsentice_warp_ingest_media_motion.py → kind=media-knowledge, tag=adsentice-warp (media)
tools/adsentice_nextjs_best_practices_ingest.py → kind=best-practice, tag=nextjs-official-practices
tools/adsentice_k0_ingest.py            → tag=adsentice-k0 (knowledge graph)
```

A sessão v140 descobriu que o filtro `kind=marketing-skill` do marketing-kg.ts só alcançava 4 dos 38 pontos disponíveis (10.5%). A fix (ADR-0047) migrou para tag-based filter (`tag=adsentice`), desbloqueando 9.5× mais conteúdo.

Este ADR audita o inventário completo e mapeia quem consome o quê.

---

## 2. Inventário Completo (DAG-sourced)

### 2.1 Conteúdo de Marketing (tag=adsentice, 38 pontos)

```
KIND              COUNT   SOURCE                   SKILLS
──────────────────────────────────────────────────────────────────────
execution          20     adsentice-original        5 skills × ~4 chunks
  local-seo · whatsapp-business · google-ads-telemetry
  ifood-integration · booking-ota-integration

framework          10     marketing-strategy        17 frameworks × ~2 chunks
  positioning · ICP · segmentation · ABM · pricing
  social-media-strategy · campaign-orchestrator
  advertising · objection-crusher · avatar-extraction
  schwartz-awareness-mapper · full-funnel-campaign
  performance-diagnosis · product-chemistry · copy-angles
  offer-construction · email-sequences

foundation          4     corey-haines-marketing    43 skills (ingest parcial)
  product-marketing (Brand IQ equivalente)

marketing-skill     4     marketingskills/*          4 skills
  copywriting · seo-audit · cro · site-architecture
──────────────────────────────────────────────────────────────────────
TOTAL              38
```

### 2.2 Conteúdo de Design (tag=adsentice-warp, 392 pontos)

```
KIND              COUNT   USO
────────────────────────────────
design-knowledge  385     warp-kg.ts (queryDesignBestPractices, searchDesignInspiration)
design-system      25     warp-kg.ts (queryDesignSystem)
component          24     warp-kg.ts (queryComponentsByIntent, fetchComponentsByIds)
snippet             2     warp-kg.ts (queryCSSPatterns)
reference           1     warp-kg.ts (queryCSSPatterns)
media-knowledge    ~15     warp-kg.ts (queryMediaAnimation, queryMediaIcons)
best-practice     ~85     best-practice-kg.ts (queryBestPractices)
────────────────────────────────
TOTAL            ~520
```

---

## 3. Quem Consome o Quê — Matriz Cross-Ecosystem

### 3.1 Consumers × Modules

```
CONSUMER                     MARKETING   DESIGN    STRATEGY   RECOMMEND   BEST-PRACTICE   MARKET-ONTO   BRAIN
───────────────────────────  ─────────   ──────    ────────   ─────────   ─────────────   ───────────   ─────
composeS10_BLUE              ✅ 658      ✅ 658    ✅ 1438    ✅ 675       ✅ 1369         ✅ 833         ❌
composeS11                   ✅ 1893     ✅ 1793   ✅ 1882    ✅ 1896      ✅ 1894         ✅ 1895        ❌
discovery-search/route.ts    🟡 907*     ❌        ❌         ❌          ❌             ❌            ❌
/surface page.tsx            ❌          ❌        ✅ API     ❌          ❌             ❌            ❌
/semantic-registry API       ❌          ❌        ❌         ❌          ❌             ❌            ✅ 84
sga-score.ts                 ❌          ❌        ❌         ❌          ❌             ❌            🟡 12
warp API (index.ts)          ❌          ❌        ❌         ✅ 102      ❌             ❌            ❌
recommend.ts                 ❌          ❌        ❌         ✅ impl     ❌             ❌            ❌
battle-card.ts               ❌          ❌        ❌         🔴 SPEC    ❌             ❌            ❌
brainTurn (b3-decide)        ❌          ❌        ❌         ❌          ❌             ❌            🟡 45
```

**Legenda:** ✅ = wireado e ativo · 🟡 = parcial · ❌ = não usa · 🔴 = spec apenas  

\* `discovery-search` usa `content-gap.ts` (C1-C8), não marketing-kg diretamente

### 3.2 Skills específicas × Consumers

```
SKILL                           composeS10  composeS11  discovery  surface   semantic   recommend
──────────────────────────────  ─────────   ─────────   ────────   ───────   ────────   ────────
copywriting                     ✅          ✅           ❌         ❌        ❌         ❌
seo-audit                       ✅ (site)   ✅ (site)    ❌         ❌        ❌         ❌
site-architecture               ✅ (site)   ✅ (site)    ❌         ❌        ❌         ❌
schema                          ✅ (site)   ✅ (site)    ❌         ❌        ❌         ❌
cro                             ✅ (lo)     ✅ (lo)      ❌         ❌        ❌         ❌
lead-magnets                    ✅ (lo)     ✅ (lo)      ❌         ❌        ❌         ❌
pricing                         ✅          ✅           ❌         ❌        ❌         ❌
marketing-psychology            ✅          ✅           ❌         ❌        ❌         ❌
competitors                     ✅ (>5)     ✅ (>5)      ❌         ❌        ❌         ❌
prospecting                     ✅ (>5)     ✅ (>5)      ❌         ❌        ❌         ❌
───────────────────────────────────────────────────────────────────────────────────────────
local-seo                       ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ✅ TEMPL
whatsapp-business               ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
google-ads-telemetry            ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
ifood-integration               ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
booking-ota                     ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
positioning                     ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
ICP                             ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
segmentation                    ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
ABM                             ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
social-media-strategy           ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
campaign-orchestrator           ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
advertising                     ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
objection-crusher               ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
avatar-extraction               ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
schwartz-awareness-mapper       ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
full-funnel-campaign            ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
performance-diagnosis           ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
product-marketing               ❌ 🟡IN     ❌ 🟡IN      ❌         ❌        ❌         ❌
```

**Legenda:** ✅ = ativamente consultado · 🟡IN = INGERIDO mas NÃO consultado · ❌ = não aplicável  

---

## 4. Gaps por Plano de Produto

### 4.1 Raio-X (R$0 · S10)

| Usa | Falta |
|-----|-------|
| ✅ copywriting, seo-audit, cro | 🟡 local-seo (recomendações GMB) |
| ✅ pricing, competitors | 🟡 avatar-extraction (persona do lead) |
| ✅ marketing-psychology | 🟡 performance-diagnosis (score explicação) |

### 4.2 Sentinela (R$197/mês · S11)

| Usa | Falta |
|-----|-------|
| ✅ copywriting (DeepSeek) | 🔴 whatsapp-business (CTA + automação) |
| ✅ cro (copy angles) | 🔴 objection-crusher (S11-MK vendedor) |
| ✅ strategy-resolver A/B | 🔴 social-media-strategy (relatório mensal) |
| ✅ recommend-engine (ActionPlan) | 🔴 campaign-orchestrator (full-funnel) |
| 🟡 local-seo (ingerido, não usado) | |

### 4.3 Domínio (R$497/mês)

| Usa | Falta |
|-----|-------|
| ✅ competitive intel (L3) | 🔴 google-ads-telemetry (análise de ads) |
| ✅ market ontology (L4) | 🔴 ABM + positioning (estratégia) |
| 🟡 ICP (ingerido, não usado) | |

### 4.4 Escala (R$997/mês)

| Usa | Falta |
|-----|-------|
| — | 🔴 full-funnel-campaign (orquestração) |
| — | 🔴 advertising (multi-canal) |
| — | 🔴 performance-diagnosis (relatório executivo) |
| — | 🔴 segmentation (públicos por nicho) |

### 4.5 Growth OS (R$1.497/mês)

| Usa | Falta |
|-----|-------|
| — | 🔴 ABM (multi-account) |
| — | 🔴 product-marketing (Brand IQ auto) |

---

## 5. Recomendações de Wire (ordenadas por impacto)

| # | Skill | Wire em | Impacto | Esforço |
|---|-------|---------|---------|---------|
| 1 | **local-seo** | composeS11 (S11K) | Alto — SEO local real na landing page | 30min |
| 2 | **objection-crusher** | S11-MK (proposta) | Alto — vendedor fecha com dados | 1h |
| 3 | **whatsapp-business** | S11K CTA + wa-check | Alto — automação de contato | 1h |
| 4 | **social-media-strategy** | Sentinela relatório | Médio — diferencial do plano | 2h |
| 5 | **google-ads-telemetry** | Domínio dashboard | Médio — upsell R$197→R$497 | 2h |
| 6 | **avatar-extraction** | composeS10 (Raio-X) | Médio — persona mais precisa | 1h |
| 7 | **ICP + positioning** | StrategyResolver | Médio — estratégia mais precisa | 1h |
| 8 | **campaign-orchestrator** | Escala (nova surface) | Baixo — precisa de surface nova | 4h |
| 9 | **ABM + segmentation** | Growth OS (nova surface) | Baixo — multi-tenant não existe | 8h |

---

## 6. Padrão de Wire (template)

Todo wire de skill ingerida segue o mesmo padrão de 3 passos:

```typescript
// Passo 1: Query Qdrant ($0, cacheável)
const skill = await queryMarketingSkill("skill-name", contextStr)
if (!skill) return fallback

// Passo 2: Extrair insight relevante (determinístico, $0)
const insight = extractInsight(skill.content, leadContext)

// Passo 3: Aplicar no output (surface HTML, copy, recommendation)
// Ex: enriquecer copy angle, adicionar recommendation, validar regra
output.recommendations.push({ title: insight.title, source: skill.source })
```

---

## 7. Conclusão

**38 pontos de marketing ingeridos. 10 skills consultadas ativamente. 28 skills dormentes.**

O motor de Q&A (`brainTurn / b3-decide`) consulta `semantic-registry` e `c1Rerank` — NÃO consulta diretamente `marketing-kg`. Ele é um consumidor indireto (via cache do Qdrant self). O `brainTurn` está subutilizado — foi desenhado para ser o motor do Cockpit TOP-K, mas hoje só é usado via API `/api/semantic-registry`.

**Próximos passos imediatos:**
1. Wire local-seo no composeS11 (recomendação #1, 30min)
2. Wire objection-crusher no S11-MK (recomendação #2, 1h)
3. Wire whatsapp-business no S11K CTA (recomendação #3, 1h)

---

*v1.0 · 2026-07-20 · adsentice · DAG cross-ecosystem audit*
