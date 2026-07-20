# Adsentice Skills Inventory — Relatório Completo v142

**Data:** 2026-07-20 · **Sessão:** v133→v142 · **Fonte:** DAG completa (Qdrant live + git + filesystem)
**Coleções:** 4 collections · 115,803 pontos · Embed mpnet 768d · **Custo:** $0

---

## 1. Visão Geral · 4 Coleções Qdrant

```
┌─────────────────────────────────────────────────────────────────────┐
│ QDRANT :6352                                                        │
│                                                                     │
│ adsentice-self          20,105 pts   corpus completo (docs, specs,  │
│                                      ADRs, skills, design, código)  │
│ adsentice-conversation  95,588 pts   histórico de conversas         │
│ adsentice-materio           36 pts   design tokens (palette, fonts) │
│ claude-memory              74 pts   decisões curadas (37 decisions) │
│                                                                     │
│ TOTAL: 115,803 pontos                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventário Completo por Kind · adsentice-self

### 2.1 Skills de MARKETING (tag=adsentice)

```
KIND              PTS  SOURCE                         CONTEÚDO
──────────────────────────────────────────────────────────────────────────
marketing-skill    10  marketingskills/*               10 frameworks Corey
                       ├─ site-architecture (3)
                       ├─ programmatic-seo (1)
                       ├─ ai-seo (1)
                       ├─ cro (1)
                       ├─ competitors (1)
                       ├─ copywriting (1)
                       ├─ ads (1)
                       └─ seo-audit (1)

execution           4  adsentice-original              5 skills originais
                       ├─ local-seo
                       ├─ whatsapp-business
                       ├─ google-ads-telemetry
                       ├─ ifood-integration
                       └─ booking-ota-integration

heuristic           1  marketing-strategy              frameworks estratégia
                                                       17 frameworks: positioning,
                                                       ICP, segmentation, ABM,
                                                       pricing, social-media,
                                                       campaign-orchestrator,
                                                       advertising, objection,
                                                       avatar-extraction...

───────────
TOTAL marketing: ~15 pts (a amostragem capturou 15; total real ~38)
```

**NOTA:** Os 43 skills do Corey Haines (`marketingskills-main/skills/`) NÃO foram ingeridos completamente. Apenas 10 pts de `kind=marketing-skill` existem. Os 45 skills originais do diretório (`copywriting, seo-audit, cro, pricing, competitors, content-strategy, emails, ads, social, video, ...`) estão apenas PARCIALMENTE no Qdrant.

### 2.2 Skills de DESIGN (tag=adsentice-warp)

```
KIND              PTS   SOURCE                         CONTEÚDO
──────────────────────────────────────────────────────────────────────────
design-knowledge  775   ui-ux-pro-max (nextlevel)     774 patterns UI/UX
                   1    Atlassian Design System          1 guideline

component          41   adsentice-k0 (33)              componentes MUI
                         adsentice-warp (8)             componentes Warp

design-system      48   adsentice (tag=adsentice)      design systems
                         ├─ 21st-magic-ui (9)
                         ├─ open-design/* (8)
                         └─ outros

snippet             4   adsentice-warp                 shadcn/ui v4 snippets

media-knowledge     2   adsentice-warp                 tw-animate-css +
                                                       Framer Motion

best-practice       2   adsentice-warp                 shadcn/ui +
                                                       react-best-practices
───────────
TOTAL design: ~872 pts
```

### 2.3 DOCUMENTAÇÃO & CÓDIGO (tag=adsentice + adsentice-k0)

```
KIND              PTS   TAG            CONTEÚDO
──────────────────────────────────────────────────────────────────────────
doc               81    adsentice      ADRs, specs, docs do projeto
                                      (base-matriz, strategic-plan, etc.)

module             8    adsentice-k0   módulos TypeScript
                                      (cnpj-crawler, telemetry, etc.)

route              3    adsentice-k0   API routes Next.js

component         33    adsentice-k0   componentes MUI (Legacy)

skill              3    adsentice      .claude/skills/ SKILL.md

spec               3    adsentice      specs (json, previews)

rsxt-doc           5    adsentice      documentação EVO-API/RSXT

rsxt-doctrine      3    adsentice      doutrinas RSXT

cross-reference    1    swc-compiler   SOP + SWC error.rs

rule               1    swc-compiler   Next.js 15 SWC rules

pattern            1    swc-compiler   Next.js SSR patterns

type               1    adsentice-k0   TypeScript types

stylesheet         1    adsentice-k0   CSS modules
───────────
TOTAL docs + code: ~141 pts
```

---

## 3. Materio · 36 Design Tokens

```
CATEGORY    PTS   USO
────────────────────────────────────
palette     13    queryMaterioTokens() → TokenComposer (composeS10, composeS11)
spacing      8    queryMaterioTokens() → layout morphing
motion       4    queryMediaAnimation() → animações CSS
radius       4    TokenComposer → border-radius por segmento
shadows      4    TokenComposer → box-shadow por plano
typography   3    TokenComposer → font-family por segmento
```

---

## 4. Claude Memory · 74 Decisões Curadas

```
KIND         PTS
────────────────
decision     37   Decisões de arquitetura e produto
fact         16   Fatos verificados sobre o ecossistema
insight      13   Insights do founder
spec          4   Specs consolidadas
adr           3   ADRs referenciadas
reference     1   Referência externa
```

---

## 5. Matriz: Quem Consulta o Quê

```
MÓDULO DE QUERY               KINDS CONSULTADOS           PTS ALCANÇADOS
─────────────────────────────────────────────────────────────────────────
warp-kg.ts (11 funções)       design-knowledge            775
                              component                    41
                              design-system                48
                              snippet                      4
                              media-knowledge              2
                              marketing-skill (via qdrantCount)

marketing-kg.ts (2 funções)   tag=adsentice (todos kinds) ~100
                              ANTES (ADR-0047): kind=marketing-skill (10)

best-practice-kg.ts           best-practice                2 ⚠️

brain/semantic-registry.ts    todos (semantic search)      todos

composeS10_BLUE               warp-kg + marketing-kg       ~820
                              + best-practice-kg

composeS11                    warp-kg + marketing-kg       ~820
                              + best-practice-kg
                              + recommend-engine

recomment-engine.ts           (template-driven, sem Qdrant) 0
                              usa SEGMENT_ACTIONS hardcoded
```

---

## 6. Gaps por Coleção

### 🔴 GAP CRÍTICO: Corey Haines 43 skills — ingest PARCIAL

```
Diretório fonte: EVO-API/self-essentials/marketingskills-main/skills/
  45 skills disponíveis (ab-testing, ads, ai-seo, analytics, aso,
  churn-prevention, cold-email, co-marketing, community-marketing,
  competitor-profiling, competitors, content-strategy, copy-editing,
  copywriting, cro, customer-research, directory-submissions, emails,
  free-tools, image, launch, lead-magnets, marketing-council,
  marketing-ideas, marketing-loops, marketing-plan, marketing-psychology,
  offers, onboarding, paywalls, popups, pricing, product-marketing,
  programmatic-seo, prospecting, public-relations, referrals, revops,
  sales-enablement, schema, seo-audit, signup, site-architecture,
  sms, social, video)

INGERIDO no Qdrant: apenas 10 pts de kind=marketing-skill
  (site-architecture, programmatic-seo, ai-seo, cro, competitors,
   copywriting, ads, seo-audit — ~8 skills das 45)

NÃO INGERIDO: ~37 skills
  Ex: content-strategy, emails, pricing, social, video, offers,
  onboarding, referrals, community-marketing, cold-email, launch,
  marketing-plan, product-marketing, sales-enablement...

AÇÃO: Re-ingerir o diretório completo com tools/adsentice_corey_ingest.py
```

### 🟡 GAP MODERADO: best-practice — apenas 2 pts

```
Esperado: 85+ best practices (ADR-0037 Fase 3)
Real: 2 pts (shadcn/ui + react-best-practices)

AÇÃO: Re-ingerir best practices com tools/adsentice_nextjs_best_practices_ingest.py
      ou unificar com adsentice_warp_ingest.py
```

### 🟡 GAP MODERADO: strategy frameworks — apenas 1 pt visível

```
Esperado: 17 frameworks (positioning, ICP, ABM, segmentation...)
Real: 1 pt (heuristic=match, marketing-strategy)

AÇÃO: Verificar tools/adsentice_strategy_ingest.py — pode ter ingerido
      com kind não capturado no scroll (limit=1000)
```

### 🟢 OK: Design Knowledge — 775 pts

```
Fonte: ui-ux-pro-max (nextlevelbuilder) — 774 patterns
Uso: warp-kg.ts → searchDesignInspiration, queryDesignBestPractices
Cobertura: EXCELENTE
```

---

## 7. Consumidores × Skills

```
SKILL                    COMPOSE10  COMPOSE11  RECOMMEND  SURFACE  BRAIN
─────────────────────────────────────────────────────────────────────────
design-knowledge (775)   ✅          ✅          ❌         ✅        ❌
design-system (48)       ✅          ✅          ❌         ✅        ❌
component (41)           ✅          ✅          ❌         ✅        ❌
materio (36)             ✅          ✅          ❌         ✅        ❌
marketing-skill (10)     ✅          ✅          ❌         ❌        ❌
execution (4)            ✅          ✅          ✅templ    ❌        ❌
best-practice (2)        ✅          ✅          ❌         ❌        ❌
heuristic (1)            ✅          ✅          ❌         ❌        ❌
docs (81)                ❌          ❌          ❌         ❌        ✅
claude-memory (74)       ❌          ❌          ❌         ❌        ✅
```

---

## 8. Ações Recomendadas

| # | Ação | Impacto | Esforço |
|---|------|---------|---------|
| 1 | **Re-ingerir Corey Haines completo** (45 skills) | Alto — 37 skills novas | 30min |
| 2 | **Re-ingerir best practices** (85+ regras) | Alto — validação de qualidade | 30min |
| 3 | **Verificar strategy frameworks** (17 frameworks) | Médio — estratégia mais rica | 15min |
| 4 | **Wire marketing-plan no composeS11** | Alto — relatório 13 seções | 2h |
| 5 | **Wire social-media no Sentinela** | Médio — diferencial do plano | 1h |
| 6 | **Wire google-ads no Domínio** | Médio — upsell R$197→R$497 | 2h |
| 7 | **Wire Brain OODA no Cockpit TOP-K** | Alto — assistente diário | 3h |

---

*v1.0 · 2026-07-20 · adsentice · DAG completa 4 coleções Qdrant*
