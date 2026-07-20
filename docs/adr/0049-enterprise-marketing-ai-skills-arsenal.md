# ADR-0049 · Enterprise Marketing AI Skills — Arsenal adsentice

**Status:** ACCEPTED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0047 (Brain KG), ADR-0048 (Skills Inventory)
**Sources:** DAG completa Qdrant + vendor/ + EVO-API/self-essentials/ + catálogo founder

---

## 1. Contexto

O adsentice tem como missão ser **#1 em Marketing Intelligence para SMB Brasil**. Para isso, precisa de um arsenal de skills de marketing que cubra todas as dimensões de diagnóstico, geração e operação.

Em 2026-07-20, após a sessão v133→v147, fizemos o inventário completo do que está disponível vs ingerido vs wireado no Qdrant. O founder forneceu um **catálogo enterprise** com metodologia de avaliação e arquitetura de governança.

### Estado atual do arsenal

```
FONTE                              SKILLS    INGERIDO   WIREADO   FALTA
─────────────────────────────────────────────────────────────────────────
Corey Haines (marketingskills)     47        47/47 ✅   6/47      Ingerir + wire
Kim Barrett (advertising-skills)   12        12/12 ✅   0/12      Wirear
Adsentice Original                 5         8 pts ✅   3/5       Wirear
Strategy Frameworks                17        18 pts ✅  0/17      Wirear
Vercel Agent Skills                15        15 pts ✅  0/15      Wirear
Best Practices                     85+       85 pts ✅  0/85      Wirear
─────────────────────────────────────────────────────────────────────────
SUBTOTAL INGERIDO                  165+      300+ pts   9 wired
─────────────────────────────────────────────────────────────────────────
Claude-SEO (AgriciDaniel)          25+18     🔴 NÃO     —         Clonar
Creative Director (smixs)          571 cases 🔴 NÃO     —         Clonar
BrianRWagner/ai-marketing-skills   7         🔴 NÃO     —         Clonar
Humanizer (blader)                 33 padr   🔴 NÃO     —         Clonar
Unslop (MohamedAbdallah)           3 modos   🔴 NÃO     —         Clonar
Email Marketing Bible (CosmoBlk)   55K words 🔴 NÃO     —         Clonar
ASO Skills (Eronred)               30+       🔴 NÃO     —         Clonar
─────────────────────────────────────────────────────────────────────────
TOTAL POTENCIAL                    300+      ~300 pts   9 wired   ~150+ faltando
```

---

## 2. Decisão

**Adotar a arquitetura de 4 camadas do catálogo Enterprise como padrão adsentice:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ LAYER 0 · CONTEXT (Product Marketing Context)                        │
│                                                                      │
│  Brand IQ · Single Source of Truth do adsentice                     │
│  Gerado automaticamente dos dados do lead (GMB + L2b + L3 + L4)    │
│  Consumido por TODAS as skills como contexto base                   │
│  Equivalent ao product-marketing.md do Corey Haines                 │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ LAYER 1 · CORE SKILLS (47 Corey + 12 Kim + 5 Adsentice)            │
│                                                                      │
│  Foundation:    product-marketing, ICP, avatar-extraction           │
│  Copy Chief:    copywriting, headline-matrix, objection-crusher     │
│  SEO:           seo-audit, ai-seo, programmatic-seo, schema        │
│  CRO:           cro, ab-testing, popups, signup                    │
│  Growth:        referrals, launch, onboarding, churn-prevention     │
│  Ads:           ads, ad-creative, ad-angle-multiplier              │
│  Ops:           analytics, revops, marketing-loops                 │
│                                                                      │
│  Status: ✅ INGERIDO (64 skills, 300+ pts)                          │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ LAYER 2 · ESPECIALIZADAS                                            │
│                                                                      │
│  SEO Completo:   Claude-SEO (25 + 18 agents) · GEO/AEO            │
│  Creative:       Creative Director (571 cases Cannes)              │
│  Email:          Email Marketing Bible (55K words)                 │
│  ASO:            App Store Optimization (30+ skills)               │
│  Humanização:     Humanizer (33 padrões) + Unslop (3 modos)       │
│  Tático:          BrianRWagner (7 frameworks)                     │
│                                                                      │
│  Status: 🔴 NÃO INGERIDO (precisa clonar dos repositórios)         │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ LAYER 3 · ORQUESTRAÇÃO                                              │
│                                                                      │
│  composeS11:     pipeline completo de geração de landing page       │
│  Cockpit TOP-K:  Brain OODA /api/cockpit/ask                       │
│  StrategyResolver: A/B facets por lead                              │
│  RecommendEngine: ActionPlan com quick win                         │
│                                                                      │
│  Status: ✅ WIREADO (11 brain modules + 9 skills)                  │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────────┐
│ LAYER 4 · QUALITY GATE                                              │
│                                                                      │
│  Best Practices:    85+ regras WCAG/landing/SEO (best-practice-kg) │
│  Composition:       15 patterns Vercel (composition-patterns)       │
│  Writing:           writing-guidelines (agent-skills)              │
│  Web Design:        web-design-guidelines (agent-skills)           │
│  Humanizer:         33 padrões anti-AI + 3 modos unslop           │
│                                                                      │
│  Status: 🟡 PARCIAL (guidelines ingeridas, humanizer pendente)     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Plano de Ingestão (Fase 1 · Clonar + Ingerir)

| # | Repositório | Skills | Impacto | Esforço |
|---|------------|--------|---------|---------|
| 1 | Claude-SEO | 25+18 | SEO Completo + GEO/AEO | 20min |
| 2 | Creative Director | 571 cases | Criatividade Premium | 20min |
| 3 | BrianRWagner | 7 frameworks | Frameworks táticos | 10min |
| 4 | Humanizer | 33 padrões | Anti-AI detection | 10min |
| 5 | Unslop | 3 modos | AI slop remover | 10min |
| 6 | Email Bible | 55K words | Email completo | 10min |

**Total Fase 1: ~1.5h. Custo: $0.**

---

## 4. Matriz de Governança

| Dimensão | Padrão adsentice |
|----------|-----------------|
| **Versionamento** | Git (vendor/ + Qdrant tag=adsentice) |
| **Audit trail** | Qdrant payload com `ts` (timestamp) + `source` |
| **Single Source of Truth** | Brand IQ (product-marketing) compartilhado |
| **Human-in-the-loop** | Brain OODA (b3-decide) com grounding antes do output |
| **Compliance** | medido=verdade — toda afirmação cita fonte |
| **Caching** | Redis :6396 (TTL por escopo, ADR-0044 §III.F) |

---

## 5. Roadmap

### Fase 1 · Arsenal Completo (hoje, 1.5h)
- [x] Corey Haines 47/47 ingerido
- [x] Kim Barrett 12/12 ingerido
- [ ] Claude-SEO clonar + ingerir
- [ ] Creative Director clonar + ingerir
- [ ] BrianRWagner clonar + ingerir
- [ ] Humanizer + Unslop clonar + ingerir
- [ ] Email Bible clonar + ingerir

### Fase 2 · Wire Skills (2-3 dias)
- [ ] Wirear Kim Barrett (12 skills → composeS11 + Cockpit)
- [ ] Wirear Claude-SEO (S10 Raio-X SEO expandido)
- [ ] Wirear Creative Director (S11K design criativo)
- [ ] Wirear Humanizer (Quality Gate Layer 4)

### Fase 3 · Governança (1 semana)
- [ ] Brand IQ como Layer 0 compartilhado
- [ ] Audit trail de uso de skills
- [ ] Eval automático de qualidade (Unslop + Humanizer)
- [ ] Caching inteligente de queries Qdrant

### Fase 4 · Automação (contínuo)
- [ ] Cockpit TOP-K com Brain OODA full
- [ ] Marketing Loops automáticos
- [ ] Full-funnel campaign orchestrator (Kim Barrett)

---

*v1.0 · 2026-07-20 · adsentice · Arsenal Enterprise Marketing AI Skills*
