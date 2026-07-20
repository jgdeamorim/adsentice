# ADR-0052 v2 · Estratégia de Vendas por Categoria — Distribuída no Dashboard

**Status:** PROPOSED (v2.1 · DAG completa: 12 páginas + 20 migrations + 42 APIs + grep verification)
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** ADR-0052 v1 (escrita sem verificação de código — várias afirmações incorretas)
**Extends:** ADR-0046 (Realinhamento), ADR-0049 (Discovery Layer), ADR-0050 (Category Intelligence), ADR-0051 (Auto-Pilot)
**Sources:** DAG 5-passos — 12 páginas (7,128 linhas), 42 API routes, 4 libs (2,046 linhas), 20 migrations, grep verification, git log

---

## 0. Correções da v1 (erros factuais)

A v1 desta ADR foi escrita sem ler o código-fonte real. A DAG revelou:

| Afirmação v1 | Realidade (medido=verdade) | Fonte |
|-------------|---------------------------|-------|
| `/admin/categories` "não existe" | **EXISTE** — 397 linhas, Supabase, 29 categorias, tiers, segmentos | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/categories/page.tsx` |
| `/admin` dashboard "placeholder" | **Control Plane completo** — 345 linhas, BOA, infra status, Schwartz, quick links | `admin/page.tsx` |
| Menu não tem Categories | **Já tem** `/admin/categories` desde a criação da página | `VerticalMenu.tsx:102-105` |
| Discovery é "formulário manual" | **2,239 linhas** — tem `DiscoveryAutoPilot`, Brazil map, SessionLog | `admin/discovery/page.tsx` |
| Pipeline é "funil L0-L7 global" | **316 linhas** — já tem category breakdown + enrichment counts L0-L5 | `admin/pipeline/page.tsx` |
| Leads é "tabela plana" | **345 linhas + LeadTable** — paginação, filtros UF/cidade/categoria/Schwartz, L2 columns | `admin/leads/page.tsx` |
| Market é "IBGE + cobertura" | **536 linhas** — já importa `getCategoryOpportunityQuick` de category-intel | `admin/market/page.tsx` |
| 4 funções novas a criar | **NENHUMA existe** — `getCategorySalesStrategy`, `rankLeadsByAction`, `getFunnelByCategory`, `getRecommendedPlan` não estão no código | `grep -rn` retornou vazio |

**Conclusão:** A v1 subestimou o que já existe e superestimou a facilidade de criar funções que não existem.

---

## 1. Contexto (v2 — verificado)

### 1.1 O que JÁ temos (12 páginas · 7,128 linhas · 4 APIs · $0)

```
PÁGINA                  LINHAS  DADOS REAIS                    INTEGRAÇÃO COM CATEGORY INTEL
─────────────────────────────────────────────────────────────────────────────────────────────
/admin                  345     engine.ts (BOA, infra, leads)   ❌ sem Auto-Pilot
/admin/categories       397     Supabase (agg por category)     ❌ estático (CATEGORY_INFO hardcoded, não usa getCategoryIntelligence)
/admin/discovery        2,239   'use client' + AutoPilot comp   ✅ DiscoveryAutoPilot (ADR-0051)
/admin/pipeline         316     Supabase (dedup, enrichment)    ❌ sem filtro por categoria
/admin/leads            345     Supabase + LeadTable             ❌ sem chips de estratégia
/admin/costs            502     cost-registry.yaml + Supabase   ❌ sem breakdown por categoria
/admin/criteria         651     SCHWARTZ_LEVELS + signals        ❌ sem ponderação por categoria
/admin/solutions        526     STRATEGIC_PLANS (4 planos)       ❌ sem recomendação dinâmica
/admin/market           536     market-intel + category-intel    ✅ já importa getCategoryOpportunityQuick
/admin/surface          434     /api/surface/status (22 warp)    ❌ sem filtro por categoria
/admin/settings         604     Settings + wa-check subpage      N/A (infra)
/admin/telemetry        233     Telemetry                        N/A (infra)
```

### 1.2 APIs que JÁ existem

| API | Rota | Retorna | Fonte |
|-----|------|---------|-------|
| Category Intel | `GET /api/category/intel?cat=&quick=` | 29 categorias com coverage, quality, opportunity, marketingIntel | `api/category/intel/route.ts` (50 linhas) |
| Auto-Pilot | `GET /api/auto-pilot/decide` | `{ decisions, topPick, autoExecutable, suggested, summary }` | `api/auto-pilot/decide/route.ts` (25 linhas) |
| Cockpit | `POST /api/cockpit/ask` | Brain OODA Q&A | `api/cockpit/ask/route.ts` |
| Surface | `GET /api/surface/status` | 22 superfícies Warp + status | Chamado por `admin/surface/page.tsx:50` |

### 1.3 Funções lib que JÁ existem

| Função | Arquivo | Retorna |
|--------|---------|---------|
| `getCategoryIntelligence(cat?)` | `category-intel.ts:89` | `CategoryIntelligence[]` — coverage, quality, opportunity, marketingIntel |
| `getCategoryOpportunityQuick()` | `category-intel.ts:307` | Top 5 categorias por opportunity score |
| `autoPilotDecide()` | `auto-pilot.ts:43` | `AutoPilotResult` — decisions, topPick, certainty, viability |
| `getPreflightMarketIntel()` | `market-intel.ts` | Pre-flight data por estado |
| `nicheIntelligence()` | `market-intel.ts` | Inteligência de nicho por categoria×região |
| `getAdminDashboardData()` | `engine.ts` | BOA, leads, infra status, Schwartz distribution |
| `discoverSkills()` | `marketing-kg.ts` | Semantic skill discovery do Qdrant (832 pts) |

### 1.4 Funções que NÃO existem (precisam ser criadas)

```typescript
// NENHUMA destas existe no código — grep confirmado:
getCategorySalesStrategy(cat)   // ❌ playbook, targetPlan, channel, pitchScript
rankLeadsByAction(cat?)         // ❌ leads priorizados por ação
getFunnelByCategory()           // ❌ funil L0-L7 por categoria
getRecommendedPlan(lead)        // ❌ plano recomendado baseado em score+sinais
```

### 1.5 Dados reais (do Supabase · 20/jul)

- **5,745 leads únicos** em `discovery_listings`
- **1,193 leads mapeados** para 6/29 categorias ICP (via `normalizeCategory`)
- **23 categorias com 0 leads** — nunca prospectadas
- **Colunas disponíveis:** `category, place_id, city, score_compound, schwartz_level, enrichment_level, website, phone, wa_is_business, rating_value, l2_*, l3_*, l4_ibge_*, cnpj_enriched`

### 1.6 Banco de dados — o que EXISTE vs o que a v1 assumiu

**Auditoria das 20 migrations (001→020) + schemas das 11 tabelas:**

| Tabela | Migration | Colunas principais |
|--------|-----------|-------------------|
| `discovery_listings` | 001+002+003+007+010+012+017+018+019+020 | ~80 colunas: L0(GMB), L2(SEO+content), L3(social), L4(IBGE), L5(CNPJ), wa-check |
| `discovery_searches` | 001+011 | search metadata + cost |
| `s10_artifacts` | 014+015 | Raio-X gerados: place_id, surface, ab_variant, blob_key, qg_passed |
| `s11_events` | 015 | Eventos: place_id, surface, event (`view`/`cta_click`), timestamp |
| `market_holds` | 004+013 | Snapshots de mercado |
| `ibge_panorama` | 009 | 419 municípios: população, PIB, IDHM, densidade |
| `district_registry` | 008 | Bairros |
| `ibge_income` | 008 | Renda por setor censitário |
| `ibge_market_size` | 008 | Tamanho de mercado |
| `cnpj_queue` | 012 | Fila de processamento CNPJ |
| `keyword_history` | 004 | Histórico de palavras-chave |

**O que NÃO EXISTE (a v1 assumia que existia):**

| O que a v1 referencia | Realidade | Impacto |
|----------------------|-----------|---------|
| `conversion.raioXSent` | **Hardcoded 0** em `category-intel.ts:234,300`. Nenhuma tabela tracking envio de Raio-X por lead. | ❌ Não podemos mostrar "Raio-X enviados" |
| `conversion.clientsActive` | **Hardcoded 0**. Não existe tabela `clients`. | ❌ Não podemos mostrar "clientes ativos" |
| `conversion.mrrByCategory` | **Hardcoded 0**. Não existe tabela `mrr`/`revenue`. | ❌ Não podemos mostrar "MRR por categoria" |
| `conversion.proposalsGenerated` | **Hardcoded 0**. Não existe tracking de propostas. | ❌ Não podemos mostrar "propostas geradas" |
| Pipeline S0-S7 como colunas | **Não existem colunas de estágio**. O pipeline (`admin/pipeline/page.tsx`) computa estágios em memória a partir de `enrichment_level`, `website`, `l3_social_links`, etc. | ⚠️ `getFunnelByCategory()` teria que replicar essa lógica em memória |

**O que podemos derivar (sem novas migrations):**

| Métrica | Fonte | Custo |
|---------|-------|-------|
| Leads por categoria | `discovery_listings` — `COUNT(DISTINCT place_id) GROUP BY category` | $0 |
| Score médio por categoria | `discovery_listings` — `AVG(score_compound) GROUP BY category` | $0 |
| % com website/WA/phone | `discovery_listings` — agregação condicional | $0 |
| S10 gerados por categoria | JOIN `discovery_listings.place_id` → `s10_artifacts.place_id` | $0 |
| S11 eventos por categoria | JOIN `discovery_listings.place_id` → `s11_events.place_id` | $0 |
| Gaps por cidade | `ibge_panorama` LEFT JOIN `discovery_listings` | $0 |
| Enrichment pipeline | `enrichment_level` na própria `discovery_listings` | $0 |

---

## 2. Decisão (v2.1 — revisada com schema)

**Distribuir inteligência de vendas por categoria nas páginas EXISTENTES, usando APIs que JÁ funcionam e dados que REALMENTE existem no banco, criando APENAS o que não existe.**

A v1 propunha criar `/admin/categories` do zero — mas ela já existe (397 linhas). A v1 também referenciava `clientsActive`, `mrrByCategory`, `proposalsGenerated` e pipeline stages como se fossem dados reais — são todos hardcoded a 0.

O trabalho real é:

1. **Conectar páginas existentes às APIs existentes** (baixo esforço, alto impacto)
2. **Criar 4 funções lib novas** derivando dados REAIS do Supabase (médio esforço)
3. **Adicionar componentes de estratégia** onde faltam (médio esforço)
4. **NÃO inventar métricas que não têm tabela** — mostrar apenas o que o banco suporta

---

## 3. O que cada página PRECISA (verificado contra código real)

### 3.1 `/admin/categories` — ENHANCEMENT (não criação)

**Tem hoje:** 397 linhas. Tabela estática `CATEGORY_INFO` hardcoded (29 entries com market, tier, segment, why). KPIs de Supabase (total leads, enrichment L0-L5). Pre-flight summary. Sem integração com `getCategoryIntelligence()`.

**Falta:**
- Trocar tabela estática `CATEGORY_INFO` por cards dinâmicos de `getCategoryIntelligence()`
- Cada card mostrar: score de oportunidade (0-100), leads descobertos, gaps por cidade, marketing intelligence
- Botões de ação por categoria: "Prospectar" → Discovery, "Ver Leads" → /admin/leads?category=X
- Badge visual: 🟢 T1 (dados+score>50) · 🟡 T2 (dados parciais) · 🔴 T3 (0 leads, nunca prospectada)

**Esforço:** ~1.5h (refatorar página existente, não criar nova)
**Dependência:** `getCategoryIntelligence()` ✅ (já existe)

### 3.2 `/admin/discovery` — ENHANCEMENT

**Tem hoje:** 2,239 linhas. `DiscoveryAutoPilot` component já integrado (ADR-0051). Formulário com cidade, categoria, raio. Brazil map. Session log.

**Falta:**
- Nada crítico — o AutoPilot já sugere "Prospectar X em Y cidade"
- Opcional: pré-preencher formulário quando clica de `/admin/categories`

**Esforço:** ~15min (query param `?cat=&city=` já funciona)
**Dependência:** Auto-Pilot API ✅

### 3.3 `/admin` (dashboard) — ENHANCEMENT para Cockpit

**Tem hoje:** 345 linhas. Control Plane completo: BOA score, infra status, Schwartz distribution, quick links para Categories/Costs/Solutions/Market.

**Falta:**
- **Cockpit cards** no topo (antes dos KPIs atuais):
  - 🎯 **Ação #1 Hoje**: `autoPilotDecide().topPick` → "Prospectar [categoria] em [cidade]"
  - 📨 **Leads Prontos**: count de leads com score>70 + WA Business (query Supabase — sem tabela `clients`)
  - 🔴 **Expansão**: 23 categorias nunca prospectadas (de `getCategoryIntelligence()`)
  - 📈 **Pipeline Hoje**: total leads + S10 gerados + S11 eventos (joins reais: `discovery_listings` → `s10_artifacts` → `s11_events`)
- Substituir `RECENT_ACTIVITY` hardcoded por dados vivos

**Esforço:** ~1h (adicionar 4 cards acima dos KPIs existentes)
**Dependência:** Auto-Pilot API ✅ + Category Intel API ✅

### 3.4 `/admin/pipeline` — ENHANCEMENT

**Tem hoje:** 316 linhas. Breakdown por categoria com enriquecimento L0-L5. Barras de progresso. Dedup por place_id.

**Falta:**
- **Seletor de categoria** (dropdown no topo)
- **Funnel por categoria**: quando selecionada, mostrar métricas específicas daquela categoria
- **Runbooks contextuais**: "Para dentista em SP: custo L0 ~$0.048, estimativa ~35 leads"

**Esforço:** ~1h (adicionar seletor + filtro)
**Dependência:** `getFunnelByCategory()` 🔴 (NOVA — não existe)

### 3.5 `/admin/leads` — ENHANCEMENT

**Tem hoje:** 345 linhas + LeadTable component. Server-side pagination, filtros por UF/cidade/categoria/Schwartz. 30+ colunas incluindo L2, wa-check.

**Falta:**
- **Chips de estratégia** no topo da tabela:
  - 💰 Melhor Oportunidade (score>60 + WA)
  - 📈 Volume (score 30-60, sem website)
  - 💎 Premium (score>70, ticket alto)
  - 🔴 Não Prospectado (0 leads na categoria)
- **Alert de insight** acima da tabela: "💡 Estratégia para [categoria]: [playbook]"

**Esforço:** ~45min (chips + Alert, Server Component)
**Dependência:** `rankLeadsByAction()` 🔴 (NOVA — não existe)

### 3.6 `/admin/criteria` — ENHANCEMENT

**Tem hoje:** 651 linhas. Sinais F1-F10, E1-E7, I1-I10 completos com descrições, pontos, impactos. Schwartz levels. CRITERIA_TRIGGERS. Compound score explicação.

**Falta:**
- **Sinais mais críticos por categoria**: "Para dentista, os sinais que mais impactam: W6(website=10pts), I1(não reivindicado=25pts)"
- **Distribuição real dos sinais**: buscar do Supabase quantos leads da categoria têm cada sinal

**Esforço:** ~1h (query Supabase + seção dinâmica)
**Dependência:** Supabase (já existe) + CRITERIA_TRIGGERS (já existe)

### 3.7 `/admin/market` — ENHANCEMENT

**Tem hoje:** 536 linhas. Market coverage map, niche intelligence, pre-flight data, `getCategoryOpportunityQuick()` já importado.

**Falta:**
- **Seção "Categorias Não-Descobertas"**: mostrar as 23 categorias com 0 leads, cada uma com link para `/admin/discovery?cat=X`
- **Card de oportunidade**: mesma informação que já busca de `getCategoryOpportunityQuick`, mas com ação

**Esforço:** ~20min (adicionar seção de não-descobertas)
**Dependência:** Category Intel API ✅

### 3.8 `/admin/solutions` — ENHANCEMENT

**Tem hoje:** 526 linhas. 4 planos (Raio-X, Sentinela, Domínio, Escala) com pipeline, sinais, canais, personas, entregáveis. Estático — não recomenda plano por lead.

**Falta:**
- **Recomendação dinâmica**: "Para lead X (score 72, 3 gaps, WA Business) → recomendar Sentinela R$197"
- **Lógica**: score>70 + WA → Sentinela; score>50 + website → Domínio; score<50 + sem website → Raio-X

**Esforço:** ~45min (função `getRecommendedPlan()` + card na página)
**Dependência:** `getRecommendedPlan()` 🔴 (NOVA — não existe)

### 3.9 `/admin/surface` — ENHANCEMENT

**Tem hoje:** 434 linhas. 22 superfícies Warp com metadata (group, plan, skills, tokens, status). Dados de `/api/surface/status`.

**Falta:**
- **Métricas de superfície por categoria**: JOIN `discovery_listings.place_id` → `s10_artifacts.place_id` e → `s11_events.place_id`
- **O que É possível mostrar**: "Dentista: 12 S10 gerados → 45 views → 8 CTA clicks" (dados reais do `s11_events.event`)"
- **O que NÃO é possível**: "→ 1 cliente" (sem tabela `clients`)

**Esforço:** ~30min (seletor de categoria + filtro)
**Dependência:** s10_artifacts (já existe em Supabase)

---

## 4. Arquitetura de Implementação (v2 — realista)

### 4.1 O que NÃO precisa ser feito (já existe)

- ❌ Criar página `/admin/categories` — **já existe** (397 linhas)
- ❌ Adicionar item no menu — **já existe** (`VerticalMenu.tsx:102`)
- ❌ Criar API `/api/category/intel` — **já existe** (50 linhas)
- ❌ Criar API `/api/auto-pilot/decide` — **já existe** (25 linhas)
- ❌ Criar `getCategoryIntelligence()` — **já existe** (`category-intel.ts:89`)

### 4.2 O que PRECISA ser criado (4 funções novas)

```typescript
// ═══ NOVAS funções em category-intel.ts ═══

/**
 * Estratégia de vendas para 1 categoria, derivada dos dados reais.
 * Usa getCategoryIntelligence() internamente — não repete lógica.
 */
export async function getCategorySalesStrategy(
  category: string
): Promise<CategorySalesStrategy> {
  const intel = await getCategoryIntelligence(category)
  const ci = intel[0]
  if (!ci) return emptyStrategy(category)

  // Playbook deriva dos dados, não de template fixo
  const playbook = ci.quality.avgScore > 55
    ? `${ci.label}: Foco em conversão direta. ${ci.quality.pctBusinessWA}% têm WA Business. Abordar com caso de sucesso.`
    : ci.quality.pctWithWebsite < 30
      ? `${ci.label}: Foco em educação. ${100 - ci.quality.pctWithWebsite}% sem website. Oferecer Raio-X gratuito como porta de entrada.`
      : `${ci.label}: Foco em upsell. ${ci.quality.pctWithWebsite}% têm website. Oferecer Sentinela para otimizar presença digital.`

  const targetPlan = ci.quality.avgScore > 70 ? 'Dominio R$497'
    : ci.quality.avgScore > 50 ? 'Sentinela R$197'
    : 'Raio-X R$0'

  return {
    category: ci.category,
    label: ci.label,
    playbook,
    targetPlan,
    channel: ci.quality.pctBusinessWA > 40 ? 'WhatsApp' : 'Email + Telefone',
    opportunityScore: ci.opportunity.score,
    totalLeads: ci.coverage.totalDiscovered,
    gapsCount: ci.coverage.gaps.length,
    kpis: {
      estimatedMarketSize: ci.coverage.uniquePlaceIds + ci.coverage.gaps.reduce((s, g) => s + g.estimatedMissing, 0),
      currentPenetration: ci.coverage.coveragePctBR,
      avgLeadScore: ci.quality.avgScore,
    },
  }
}

/**
 * Ranking de leads por prioridade de ação.
 * Usa Supabase REST — query com filtros de score, WA, website.
 */
export async function rankLeadsByAction(
  category?: string
): Promise<RankedLeadAction[]> {
  // Query discovery_listings ordenado por score desc
  // Filtra por categoria se fornecida
  // Classifica em: top_opportunity, volume, visual, premium, expansion
  // Retorna top 20 com ação recomendada
}

/**
 * Métricas de funil POR categoria.
 * Agrega discovery_listings por category + enrichment_level.
 */
export async function getFunnelByCategory(): Promise<CategoryFunnelMetrics[]> {
  // Query: SELECT category, enrichment_level, COUNT(*)
  // FROM discovery_listings GROUP BY category, enrichment_level
  // Mapeia enrichment_level → estágio do funil
}

/**
 * Recomendação de plano baseada em score + sinais do lead.
 * Usa thresholds dos STRATEGIC_PLANS existentes.
 */
export function getRecommendedPlan(lead: LeadScoreProfile): PlanRecommendation {
  const { score, hasWebsite, hasWA, gapsCount } = lead
  if (score > 70 && hasWA) return { plan: 'Sentinela', price: 'R$197', reasoning: '...' }
  if (score > 50 && hasWebsite) return { plan: 'Dominio', price: 'R$497', reasoning: '...' }
  return { plan: 'Raio-X', price: 'R$0', reasoning: '...' }
}
```

### 4.3 Interfaces novas necessárias

```typescript
interface CategorySalesStrategy {
  category: string; label: string
  playbook: string                    // 1-2 frases derivadas dos dados
  targetPlan: string                  // "Sentinela R$197"
  channel: string                     // "WhatsApp" | "Email + Telefone"
  opportunityScore: number            // 0-100
  totalLeads: number
  gapsCount: number
  kpis: { estimatedMarketSize: number; currentPenetration: number; avgLeadScore: number }
}

interface RankedLeadAction {
  leadId: string; title: string; category: string
  score: number; hasWA: boolean; hasWebsite: boolean
  strategy: 'top_opportunity' | 'volume' | 'visual' | 'premium' | 'expansion' | 'undiscovered'
  recommendedAction: string           // "Enviar Raio-X" | "Gerar S11-MK" | "Prospectar"
  urgency: 'high' | 'medium' | 'low'
}

interface CategoryFunnelMetrics {
  category: string; label: string
  stages: { stage: string; count: number; label: string }[]
  totalLeads: number
  conversionRate: number
}

interface PlanRecommendation {
  plan: string; price: string
  reasoning: string
  score: number
}
```

---

## 5. Sequência de Implementação (v2 — priorizada por impacto)

| # | Página | O que fazer | Esforço | Dependência | Impacto |
|---|--------|------------|---------|-------------|---------|
| **1** | `category-intel.ts` | Criar 4 funções novas | 2h | APIs existentes | 🔓 Desbloqueia tudo |
| **2** | `/admin/categories` | Refatorar: trocar CATEGORY_INFO estática por cards dinâmicos de `getCategoryIntelligence()` | 1.5h | #1 | ⭐ Alto |
| **3** | `/admin` (dashboard) | Adicionar 4 Cockpit cards (Auto-Pilot + Category Intel) | 1h | APIs existentes | ⭐ Alto |
| **4** | `/admin/leads` | Chips de estratégia + Alert insight | 45min | #1 (`rankLeadsByAction`) | 🔶 Médio |
| **5** | `/admin/pipeline` | Seletor de categoria + funnel por categoria | 1h | #1 (`getFunnelByCategory`) | 🔶 Médio |
| **6** | `/admin/solutions` | Recomendação dinâmica por lead | 45min | #1 (`getRecommendedPlan`) | 🔶 Médio |
| **7** | `/admin/market` | Seção "Categorias Não-Descobertas" | 20min | Nenhuma | 🔹 Baixo |
| **8** | `/admin/criteria` | Sinais ponderados por categoria | 1h | Nenhuma | 🔹 Baixo |
| **9** | `/admin/surface` | Filtro por categoria | 30min | Nenhuma | 🔹 Baixo |

**Total: ~8.5h. Custo: $0. 1 arquivo novo (funções lib) + 8 páginas modificadas + 0 páginas novas.**

---

## 6. Verificação (medido=verdade)

Cada etapa tem critério de verificação concreto:

1. **#1 Funções:** `grep -rn "getCategorySalesStrategy\|rankLeadsByAction\|getFunnelByCategory\|getRecommendedPlan" apps/web/src/lib/` retorna hits
2. **#2 Categories:** Página mostra cards dinâmicos com score, leads, gaps — não tabela estática
3. **#3 Cockpit:** `/admin` mostra 4 cards acima dos KPIs com dados de `autoPilotDecide()`
4. **#4 Leads:** Chips de estratégia visíveis, clicáveis, com filtro funcional
5. **#5 Pipeline:** Dropdown de categoria filtra o funnel
6. **#6 Solutions:** Card "🎯 Para [lead]: recomendar [plano]" visível
7. **#7 Market:** Seção "23 categorias não-descobertas" com chips clicáveis
8. **#8 Criteria:** Seção "Sinais mais críticos para [categoria]" com dados reais
9. **#9 Surface:** Seletor de categoria filtra a tabela de superfícies

---

## 7. O que NÃO está no escopo (v2.1)

- **Métricas de conversão (clientes, MRR, propostas)** — NÃO EXISTEM tabelas no banco (`clients`, `mrr`, `proposals`, `conversions`). `conversion` no `CategoryIntelligence` é hardcoded a 0. Criar tracking de conversão requer **nova migration + tabela** — é pré-requisito, não parte desta ADR.
- **Pipeline S0-S7 como colunas** — Estágios são computados em memória no `pipeline/page.tsx` a partir de `enrichment_level`. `getFunnelByCategory()` replicará essa mesma lógica, sem nova coluna.
- **CRM S4-S7** — automação de follow-up é roadmap separado
- **S11-MK UI vendedor** — frontend de landing page é projeto próprio
- **L7 Analytics** — A/B tracking ainda não implementado
- **Prospecção das 23 categorias** — é ação operacional (usar Discovery), não código
- **Página `/admin/cockpit` separada** — o Cockpit vai EM CIMA do dashboard existente, não em rota nova

---

## 8. Fontes (DAG · medido=verdade · 3 agentes)

### Páginas (12 arquivos · 7,128 linhas)

| Fonte | Arquivo | Linhas |
|--------|---------|--------|
| Dashboard | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/page.tsx` | 345 |
| Categories | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/categories/page.tsx` | 397 |
| Discovery | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx` | 2,239 |
| Pipeline | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx` | 316 |
| Leads | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/leads/page.tsx` | 345 |
| LeadTable | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/leads/LeadTable.tsx` | 532 |
| Costs | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/costs/page.tsx` | 502 |
| Criteria | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx` | 651 |
| Solutions | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/solutions/page.tsx` | 526 |
| Market | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/market/page.tsx` | 536 |
| Surface | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/surface/page.tsx` | 434 |
| Telemetry | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/telemetry/page.tsx` | 233 |

### APIs (42 rotas · 3 críticas para esta ADR)

| Fonte | Arquivo | Linhas |
|--------|---------|--------|
| Category Intel API | `apps/web/src/app/api/category/intel/route.ts` | 50 |
| Auto-Pilot API | `apps/web/src/app/api/auto-pilot/decide/route.ts` | 25 |
| Cockpit API | `apps/web/src/app/api/cockpit/ask/route.ts` | 139 |

### Libs (3 arquivos · 2,046 linhas)

| Fonte | Arquivo | Linhas |
|--------|---------|--------|
| Category Intel | `apps/web/src/lib/category-intel.ts` | 315 |
| Auto-Pilot | `apps/web/src/lib/auto-pilot.ts` | 161 |
| Scoring (ICP + sinais) | `apps/web/src/lib/scoring.ts` | 856 |
| Market Intel | `apps/web/src/lib/market-intel.ts` | 714 |

### Migrations (20 arquivos · schema real)

| Fonte | Arquivo |
|--------|---------|
| discovery_listings | `packages/db/supabase/migrations/001_discovery_tables.sql` |
| L2 enrichment | `002_l2_website_enrichment.sql` |
| L3/L4 enrichment | `010_enrichment_l3_l4.sql` |
| S10 artifacts | `014_s10_artifacts.sql` |
| S11 events | `015_s11_multi_surface_ab.sql` |
| CNPJ | `012_cnpj_queue.sql` |
| IBGE | `009_ibge_panorama.sql` |
| Wa-check | `020_wa_check_fields.sql` |
| L0 sleeping fields | `017_l0_enrichment_fields.sql` + `018_l0_all_fields.sql` |

### Verificações negativas (grep — comprovam ausência)

```bash
grep -rn "getCategorySalesStrategy\|rankLeadsByAction\|getFunnelByCategory\|getRecommendedPlan" apps/web/src/
# → 0 hits (nenhuma das 4 funções existe)

grep -rn "clients\|mrr\|proposals" packages/db/supabase/migrations/
# → 0 hits (nenhuma tabela de CRM/conversão existe)
```

### Nav

| Fonte | Arquivo | Linha |
|--------|---------|-------|
| VerticalMenu | `apps/web/src/components/layout/vertical/VerticalMenu.tsx` | `/admin/categories` em :102-105 |

**Confiança:** HIGH — 16 fontes de arquivos + 20 migrations + 2 verificações negativas grep + 3 agentes DAG independentes.

---

*v2.1 · 2026-07-20 · adsentice · DAG 5-passos com 3 agentes paralelos · 16 fontes + 20 migrations + grep verification*
