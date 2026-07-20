# ADR-0051 · Auto-Pilot Inteligente — Ciclo de Decisão Automatizado com Brain OODA

**Status:** ACCEPTED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Revisão:** 2ª versão — corrigida com DAG nos arquivos fonte reais
**Supersedes:** ADR-0051 v1 (análise incorreta das páginas como "desconectadas")
**Extends:** ADR-0009 (Market Intel), ADR-0023 (Auto-Pilot), ADR-0024 (L4 IBGE), ADR-0046 (Realinhamento), ADR-0049 (Discovery Layer), ADR-0050 (Category Intelligence)
**Sources:** DAG completa — 4,028 linhas de código fonte analisadas nos 8 arquivos principais

---

## 1. Correção da v1 — O que as páginas REALMENTE são

A v1 desta ADR afirmou que as 5 páginas admin são "módulos isolados que não se falam". A re-análise DAG nos arquivos fonte provou que isso está incorreto.

### 1.1 `/admin/market` — Inteligência de Nicho Pré-Descoberta (497 loc + 713 loc engine)

```
Fonte: apps/web/src/lib/market-intel.ts (713 linhas, ADR-0009)
       apps/web/src/app/[lang]/(dashboard)/(private)/admin/market/page.tsx (497 linhas)

ARQUITETURA REAL (DAG-sourced):

  nicheIntelligence(cat, city) → {
    overview:     MarketOverview       (total, avgScore, claimed%, website%, IBGE...)
    gaps:         MarketGap[]          (quais sinais mais doem? severity: crítico→baixo)
    opportunity:  MarketOpportunity    (TAM vs penetração %, MRR potencial)
    density:      CompetitiveDensity   (concorrentes/km², saturação)
    recommendedActions: [...]          (ações sugeridas baseadas nos gaps)
  }

  marketOverview() → visão geral de TODAS as categorias × cidades
  getPreflightMarketIntel() → IBGE + state coverage (22 UFs, 354 municípios)
  listMarketCategories() → { category, label, count }[]

  USA: Supabase (discovery_listings + ibge_panorama + ibge_income)
  ZERO APIs pagas. 100% dados já existentes.

ESTA PÁGINA JÁ É O CÉREBRO DE "ONDE PROSPECTAR".
Ela já cruza IBGE + cobertura + gaps + densidade competitiva.
O que falta é AUTOMATIZAR a decisão, não criar inteligência nova.
```

### 1.2 `/admin/pipeline` — Rastreador de Enriquecimento (294 loc)

```
Fonte: apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx

ARQUITETURA REAL:

  Query direta ao Supabase: discovery_listings (2000 rows, dedup place_id)
  enrichmentCounts: { l0, l2a, l2b, l3, l4, l5 }
  
  8 estágios (S0-L7): cada um com:
    • count (quantos leads?)
    • action (string hardcoded: "Executar Discovery Engine", "Enviar Raio-X"...)
    • pct (taxa de conversão do estágio anterior)
    • filterMap (link para /admin/leads com filtro)

  Cards métricos: L0, L2a, L2b, L3, L4, L5
  Taxas de conversão: L0→L2a, L2a→L2b, L2b→L3
  Top categorias (clicáveis, levam para leads filtrados)
  Estratégia de nutrição (5 primeiros estágios)

NÃO É um CRM. É um RASTREADOR DE ENRIQUECIMENTO.
Mostra o PROGRESSO dos leads pelas camadas de dados.
As "actions" são strings estáticas — não são runbooks dinâmicos.
```

### 1.3 `/admin/criteria` — Catálogo de Sinais de Scoring (635 loc)

```
Fonte: apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx

ARQUITETURA REAL:

  87 sinais em 11 famílias — TODOS definidos estaticamente no arquivo:
    FIT_SIGNALS (10), INTENT_SIGNALS (3), ENGAGEMENT_SIGNALS (7),
    WEBSITE_SIGNALS (12), SEO_EXPANDED_SIGNALS (4), ARCHITECTURE_SIGNALS (4),
    SCHEMA_SIGNALS (3), CONTENT_EXPANDED_SIGNALS (3), CONTENT_GAP_SIGNALS (5),
    DESIGN_DNA_SIGNALS (7), CONTENT_L2B_SIGNALS (8), MARKET_IBGE_SIGNALS (4)

  Cada sinal: { id, name, condition, points, dimension, layer, description, impact }

  + Schwartz awareness levels (Eugene Schwartz, 1966)
  + Fórmula do score composto (Fit×0.40 + Engagement×0.35 + Intent×0.25)

  É um CATÁLOGO DE REFERÊNCIA. Não consulta banco de dados.
  Mostra a DEFINIÇÃO de cada sinal — não a distribuição real nos leads.

ESTA PÁGINA JÁ É O DICIONÁRIO DE AVALIAÇÃO.
Ela define COMO cada lead é pontuado.
O que falta: thresholds acionáveis que conectam sinais a runbooks.
```

### 1.4 `/admin/surface` — Tracking de Output e Conversão (434 loc)

```
Fonte: apps/web/src/app/[lang]/(dashboard)/(private)/admin/surface/page.tsx

ARQUITETURA REAL:

  GET /api/surface/status → {
    surfaces:     SurfaceDef[]     (22 superfícies, 2 LIVE: S10 + S11)
    summary:      { total, live, partial, planned, groups... }
    specialists:  SurfaceSpecialist[] (S10_SPECIALIST, S11_SPECIALIST)
    artifacts:    s10_artifacts[] (R2 blob + Supabase)
    conversion:   A/B tracking (s11_events: view/cta_click por variante)
  }

  USA: warp-surface-status.json + Qdrant (getWarpKgStats) + Supabase (s10_artifacts, s11_events)

ESTA PÁGINA É O TRACKING DE OUTPUT.
Mostra O QUE foi gerado e qual variante A/B converteu mais.
```

### 1.5 Discovery — Motor de Aquisição (1,050 loc)

```
Fonte: apps/web/src/app/api/discovery-search/route.ts

ARQUITETURA REAL:

  POST /api/discovery-search
  Modos:
    • Discovery:  L0 search → L1 batch → L2 SEO → L3 Social → L4 IBGE
    • Pre-flight: conta candidatos ($0) antes de executar
    • Re-enrich:  enriquece leads já existentes (sem nova busca L0)

  Layers selecionáveis: { l0, l1, l2, l3, l4 }
  Auto-trigger: wa-check queue após persistência
  
  USA: DataForSEO ($0.048/página L0, $0.010125/lead L2, $0.0005/lead L3)
       Supabase (discovery_listings)
       Redis (cache + score stats)
       R2 Vault (write-ahead blob)

ESTA É A MÁQUINA DE CAPTURA.
Faz a busca, enriquece, persiste. Mas a DECISÃO de onde/quando buscar
é MANUAL (usuário escolhe categoria + lat/lng + raio na UI).
```

---

## 2. Matriz de Conexões Reais (não suposições)

```
                         Market Intel
                         (IBGE + gaps + densidade + oportunidade)
                              │
                              │ JÁ CONECTADO: IBGE ↔ Supabase
                              │ JÁ CONECTADO: Cobertura ↔ discovery_listings
                              │ NÃO CONECTADO: Category Intelligence (ADR-0050)
                              │ NÃO CONECTADO: Gatilho automático → Discovery
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
    Discovery              Pipeline             Criteria
    (captura)           (rastreador)         (catálogo)
         │                    │                    │
         │ JÁ CONECTADO:      │ JÁ CONECTADO:      │ JÁ CONECTADO:
         │ wa-check queue     │ Supabase query     │ scoring.ts (definições)
         │ Supabase persist   │ top categorias     │ 87 sinais documentados
         │ R2 vault           │ taxas conversão    │
         │                    │                    │
         │ NÃO CONECTADO:     │ NÃO CONECTADO:     │ NÃO CONECTADO:
         │ Market Intel →     │ Runbooks dinâmicos │ Thresholds → ações
         │ sugestão automática│ Funil por categoria│ Distribuição real
         │ Category Intel     │ Category Intel     │ Category Intel
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
                         Surface
                         (tracking output)
                              │
                              JÁ CONECTADO: Qdrant + Supabase
                              NÃO CONECTADO: Pipeline (quantos viraram surface?)
```

### O que JÁ está conectado (7 conexões existentes)

1. Market Intel ↔ Supabase (`discovery_listings`, `ibge_panorama`, `ibge_income`)
2. Market Intel ↔ IBGE (população, PIB, densidade, renda)
3. Pipeline ↔ Supabase (query direta, 2000 rows, dedup place_id)
4. Discovery → Supabase (persistência 3 camadas: Supabase + Redis + R2)
5. Discovery → wa-check (auto-trigger: LPUSH phones → Redis queue)
6. Surface ↔ Qdrant (getWarpKgStats) + Supabase (s10_artifacts, s11_events)
7. Criteria → scoring.ts (87 sinais derivam das definições estáticas)

### O que NÃO está conectado (4 gaps reais)

1. **Market Intel → Discovery automático:** Market Intel sabe ONDE prospectar, mas não aciona o Discovery
2. **Category Intelligence → todas as páginas:** ADR-0050 está pronta (API funcional), mas não aparece em nenhuma UI
3. **Pipeline → Runbooks dinâmicos:** Ações por estágio são strings hardcoded, não derivadas do estado real
4. **Criteria → Thresholds acionáveis:** Sinais são documentados, mas não há "se I1 + W6 → ação X"

---

## 3. Decisão (corrigida)

**Não criar um "orquestrador monolítico". Criar 4 conexões cirúrgicas que fecham o ciclo OODA de aquisição, respeitando a arquitetura existente.**

Cada página já tem uma função clara. O Auto-Pilot não substitui nenhuma — ele **automatiza a decisão** que hoje é manual:

```
HOJE (manual):
  Founder olha Market Intel → decide categoria → vai no Discovery →
  escolhe lat/lng → escolhe raio → clica "Buscar" → espera

AUTO-PILOT (ADR-0051):
  Category Intel ranqueia oportunidades (0-100) →
  Brain OODA decide (certainty ≥ 0.80 = automático) →
  Pre-flight confirma ($0.012) →
  Discovery executa L0 ($0.048) →
  Pipeline atualiza → Raio-X automático → S11-MK para top leads
```

---

## 4. Implementação (4 conexões cirúrgicas)

### 4.1 Category Intelligence → Market Intel (20 linhas)

```typescript
// market/page.tsx — adicionar seção "🎯 Oportunidades Ranqueadas"
import { getCategoryOpportunityQuick } from "@/lib/category-intel"

// Dentro do MarketContent:
const opportunities = await getCategoryOpportunityQuick()
// Render: "🥇 orthodontist 64pts · 🥈 psychologist 58pts · 🥉 dentist 54pts"
// Cada card linka para /admin/discovery com categoria+região pré-preenchidos
```

**O que isso resolve:** O founder não precisa mais adivinhar qual categoria prospectar. A inteligência de mercado ranqueia automaticamente.

### 4.2 Runbooks Dinâmicos → Pipeline (25 linhas)

```typescript
// pipeline/page.tsx — substituir strings hardcoded por runbooks derivados
const RUNBOOKS: Record<string, { condition: string; action: string; cost: number; autoTrigger: boolean }> = {
  S0: {
    condition: "opportunityScore > 50",
    action: "Discovery automático em gaps prioritários",
    cost: 0.048,
    autoTrigger: false,  // precisa de confirmação (custo > $0)
  },
  S1: {
    condition: "scoreCompound > 70 AND wa_is_business = true",
    action: "Enviar Raio-X via WhatsApp",
    cost: 0,
    autoTrigger: true,   // $0 → automático
  },
  S2: {
    condition: "hasWebsite AND enrichmentLevel >= 2",
    action: "Gerar S11-MK (MockUp ReBrand, $0.001)",
    cost: 0.001,
    autoTrigger: false,
  },
  S3: {
    condition: "scoreCompound > 60 AND competitorCount > 5 AND enrichmentLevel >= 3",
    action: "Gerar S11K (Landing Técnica, $0.093)",
    cost: 0.093,
    autoTrigger: false,
  },
  S4: {
    condition: "ibgeRenda > 2000 AND scoreCompound > 70",
    action: "Proposta Domínio (R$497/mês)",
    cost: 0.02,
    autoTrigger: false,
  },
}
```

### 4.3 Auto-Pilot Decision Engine → Discovery (40 linhas)

```typescript
// apps/web/src/lib/auto-pilot.ts (NOVO)

import { getCategoryIntelligence } from "./category-intel"
import { getPreflightMarketIntel } from "./market-intel"

export interface AutoPilotDecision {
  category: string
  label: string
  region: { city: string; state: string }
  opportunityScore: number
  preflightEstimate: number       // candidatos estimados
  estimatedCost: number
  estimatedROI: string
  autoExecute: boolean            // Brain OODA certainty ≥ 0.80
  reasoning: string
}

export async function autoPilotDecide(): Promise<{
  decisions: AutoPilotDecision[]
  topPick: AutoPilotDecision | null
}> {
  // ── OBSERVE: Category Intelligence ──
  const catIntel = await getCategoryIntelligence()
  const viable = catIntel.filter(ci =>
    ci.opportunity.score > 40 &&
    ci.coverage.gaps.length > 0
  )

  // ── ORIENT: cruza com Pre-flight Market Intel ──
  const preflight = await getPreflightMarketIntel()

  const decisions: AutoPilotDecision[] = []
  for (const ci of viable.slice(0, 5)) {
    const gap = ci.coverage.gaps[0]
    if (!gap) continue

    // Cross-reference com preflight data
    const pfMatch = preflight.find(p =>
      p.municipio?.toLowerCase() === gap.city.toLowerCase()
    )

    // ── DECIDE: Brain OODA logic (B2 Self-Score adaptado) ──
    const factsScore = Math.min(ci.coverage.gaps.length / 5, 1.0)
    const qualityScore = ci.quality.avgScore > 50 ? 0.7 : 0.3
    const coverageScore = (100 - ci.coverage.coveragePctBR) / 100
    const certainty = +(0.35 * factsScore + 0.30 * qualityScore + 0.35 * coverageScore).toFixed(2)

    decisions.push({
      category: ci.category,
      label: ci.label,
      region: { city: gap.city, state: gap.state },
      opportunityScore: ci.opportunity.score,
      preflightEstimate: pfMatch?.totalInRegion || gap.estimatedMissing,
      estimatedCost: 0.048, // 1 página L0
      estimatedROI: ci.quality.avgScore > 55
        ? "ROI < 1 mês" : "ROI 2-3 meses",
      autoExecute: certainty >= 0.80,
      reasoning: certainty >= 0.80
        ? `ALTA CONFIANÇA: ${ci.label} em ${gap.city} — ${ci.coverage.coveragePctBR}% coberto, score médio ${ci.quality.avgScore}`
        : `MÉDIA CONFIANÇA: ${ci.label} em ${gap.city} — requer validação do founder`,
    })
  }

  return {
    decisions: decisions.sort((a, b) => b.opportunityScore - a.opportunityScore),
    topPick: decisions.find(d => d.autoExecute) || decisions[0] || null,
  }
}
```

```typescript
// apps/web/src/app/api/auto-pilot/decide/route.ts (NOVO)
import { NextResponse } from "next/server"
import { autoPilotDecide } from "@/lib/auto-pilot"

export async function GET() {
  const decision = await autoPilotDecide()
  return NextResponse.json(decision)
}
```

### 4.4 Criteria → Thresholds Acionáveis (20 linhas)

```typescript
// criteria/page.tsx — adicionar seção "🚨 Gatilhos de Ação"
const CRITERIA_TRIGGERS = [
  {
    signals: ["I1", "E4"],
    condition: "I1 (não reivindicado, 25pts) AND E4 (não reivindicado, 10pts) = 35pts de urgência",
    action: "Ação #1: Ensinar a reivindicar GMB (5min, grátis). Script WhatsApp pronto.",
    auto: true,
  },
  {
    signals: ["W1", "W4", "W6"],
    condition: "W1 (sem HTTPS, 20pts) OR W6 (CMS risco, 8pts)",
    action: "Ação #2: S11-MK — proposta visual mostrando como ficaria o site com SSL + design moderno",
    auto: false,
  },
  {
    signals: ["D2"],
    condition: "D2 (design amador, 10pts)",
    action: "Ação #3: Gerar MockUp ReBrand com Brand DNA real extraído do site atual",
    auto: false,
  },
  {
    signals: ["C12", "C13"],
    condition: "C12 (sem WhatsApp, 10pts) OR C13 (sem agendamento, 12pts)",
    action: "Ação #4: Landing page com CTA WhatsApp + agendamento online integrado",
    auto: false,
  },
]
```

---

## 5. O Brain OODA no Auto-Pilot

O `brain/b3-decide.ts` (108 linhas, 6 submódulos, 519 loc total) foi desenhado como **motor de Q&A com grounding**. Sua arquitetura serve perfeitamente para decisão de prospecção:

```
brainTurn() — adaptado para Auto-Pilot:

c0 · classifyIntent()
    "oportunidade de prospecção em Guarulhos"
    → intent: ask-factual (decisão baseada em dados)

c1 · c1Rerank()
    Re-rankeia oportunidades por:
    0.45·sim (Qdrant semantic match)
    0.20·autoridade (fonte: market-intel > category-intel)
    0.15·recência (dados mais recentes pesam mais)
    0.20·lexical (termos: "gap", "oportunidade", "cobertura")

B2 · computeCertainty()
    certainty ≥ 0.80 → bypass (execução automática, $0)
    certainty 0.50-0.80 → sugestão (mostra no dashboard)
    certainty < 0.50 → não recomenda

A3 · cacheGet/cachePut()
    Cache de decisões anteriores (Redis :6396, TTL 1h)
    Se mesma categoria × região foi avaliada recentemente → reusa

D1 · c3Honesty()
    Toda recomendação cita fonte:
    "Fonte: category-intel (409 leads, 54pts) + market-intel (gap análise)"
```

### Por que o Brain OODA, não o DeepSeek para decisão

| Critério | Brain OODA | DeepSeek |
|----------|-----------|----------|
| Custo | $0 (bypass-score em 80%+ casos) | $0.001/chamada |
| Latência | < 500ms (Qdrant local + Redis) | 2-5s (API externa) |
| Grounding | D1 verifica cada afirmação contra fonte | Sem verificação |
| Audit trail | Todo bypass é rastreável (fórmula B2) | Caixa-preta |
| Cache | A3 Redis com watermark invalidation | Não |
| Uso certo | **Decisão**: dados + regras + threshold | **Criação**: copywriting criativo |

**O Brain OODA NÃO gera landing pages.** Ele decide. A geração continua com o composeS11.

---

## 6. Plano de Execução

| # | Conexão | Arquivos | Tempo |
|---|---------|----------|-------|
| 1 | Category Intel → Market Intel | `market/page.tsx` | 20min |
| 2 | Runbooks dinâmicos → Pipeline | `pipeline/page.tsx` | 25min |
| 3 | Auto-Pilot Engine | `auto-pilot.ts` + `api/auto-pilot/decide/route.ts` | 40min |
| 4 | Criteria → Thresholds | `criteria/page.tsx` | 20min |

**Total: ~1.75h. Custo: $0.**

---

## 7. Custo do Ciclo Completo

| Etapa | Custo | Automático? |
|-------|-------|------------|
| Category Intel | $0 (Supabase) | ✅ |
| Brain OODA (decisão) | $0 (bypass) | ✅ |
| Pre-flight | $0.012/mun | ✅ |
| Discovery L0 | $0.048/página | ⚠️ founder confirma |
| Raio-X (S10) | $0 | ✅ |
| S11-MK (proposta) | $0.001 | ⚠️ founder confirma |
| S11K (landing) | $0.093 | ⚠️ founder confirma |
| **Total ciclo** | **$0.154** | |

---

## 8. Verificação

1. `GET /api/auto-pilot/decide` → retorna topPick com reasoning e certainty
2. Market Intel mostra "🎯 Oportunidades Ranqueadas" com dados do Category Intel
3. Pipeline mostra runbooks dinâmicos (não strings hardcoded)
4. Criteria mostra thresholds acionáveis por combinação de sinais
5. HTTP 307 em todas as páginas admin (sem regressão)

---

## 9. Próximos Passos

- [x] ADR-0051 corrigida (v2, DAG-sourced)
- [ ] Conexão 1: Category Intel → Market Intel
- [ ] Conexão 2: Runbooks → Pipeline
- [ ] Conexão 3: Auto-Pilot Engine (auto-pilot.ts + API)
- [ ] Conexão 4: Thresholds → Criteria

---

*v2.0 · 2026-07-20 · adsentice · Corrigida com DAG nos 8 arquivos fonte (4,028 linhas)*
