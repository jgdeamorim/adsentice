# ADR-0030 · adsentice Intelligence Runtime — Motor de Captação e Funil

**Status:** proposed
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0024 (Pipeline L0→L4), ADR-0029 (Pre-flight Session Log), ADR-0027 (Market Estimator IBGE)
**Supersedes:** none

## Contexto

O adsentice já possui 3 camadas de coleta de dados:

| Camada | Custo SP (1 mun) | Dados |
|--------|:---:|------|
| Pre-flight (L0 limit=5) | $0.014 | `total_count` + 5 amostras (rating, claimed, website) |
| Batch parcial (L0 limit=100 × 1 pág) | $0.053 | 100 listings completos (L0+L1+L4) |
| Batch completo (L0 100 × N págs) | $4.66 | 9.666 listings completos |

**Problema:** não há lógica automatizada que decida **onde** prospectar primeiro. O fundador seleciona manualmente estado, RM, município e categorias — sem cruzamento de inteligência entre pre-flight, IBGE, tier da categoria e qualidade do mercado.

**Objetivo:** criar um motor de decisão que ranqueie automaticamente as melhores oportunidades de prospecção e execute batch parcial apenas nos mercados de alto valor, alimentando diretamente o funil de vendas.

## Decisão

Implementar o **adsentice Intelligence Runtime** — um motor de 4 fases que cruza dados de pre-flight, IBGE, tier de categoria e maturidade digital para decidir **onde, quando e com qual plano** prospectar.

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADSENTICE INTELLIGENCE RUNTIME                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 0: PRE-FLIGHT (já implementado)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Estado × RM × Categoria × Município                         │   │
│  │ total_count + quality (5 amostras) + IBGE (area_km2)        │   │
│  │ Custo: $0.014/mun                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 1: SCORING ENGINE (NOVO — ADR-0030)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 4 dimensões de scoring:                                     │   │
│  │   D1: Tamanho do mercado (total_count)                      │   │
│  │   D2: Maturidade digital (claimed%, website%, rating)       │   │
│  │   D3: Poder aquisitivo (IBGE: pib_per_capita, densidade)    │   │
│  │   D4: Categoria estratégica (tier 1/2/3)                    │   │
│  │                                                             │   │
│  │ Score ≥ 10 → 🔥 DISPARAR batch parcial                      │   │
│  │ Score 5-9 → 📋 SUGERIR (fila)                               │   │
│  │ Score < 5 → ⏭️ IGNORAR                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 2: BATCH PARCIAL COM QUALIFICAÇÃO (NOVO)                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ L0 (100 leads, 1 pág) + L1 (50 perfis) + L4 (IBGE)         │   │
│  │ Custo: $0.053/mun × N municípios                            │   │
│  │                                                             │   │
│  │ Filtro L2 (apenas leads qualificados):                      │   │
│  │   ✅ website (URL não nulo)                                  │   │
│  │   ✅ is_claimed === false (oportunidade)                     │   │
│  │   ✅ rating > 3.5 (reputação existente)                      │   │
│  │   ✅ business_status === OPERATIONAL                          │   │
│  │   ✅ total_photos < 10 (gap visível)                         │   │
│  │                                                             │   │
│  │ ~20% dos leads passam → L2 ($0.010/lead)                   │   │
│  │ → Relatórios completos de SEO para leads qualificados       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 3: MATCH PLANO × LEAD (NOVO)                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Perfil                                → Plano               │   │
│  │ !claimed && !website  && rating>3.5   → Sentinela R$197     │   │
│  │ is_claimed && website && l2_score<40  → Domínio R$497       │   │
│  │ !claimed && website   && fotos>20     → Escala R$997        │   │
│  │ !website && !phone    && !claimed     → Raio-X R$0 (isca)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Scoring Engine — Fórmula

```
SCORE = D1_tamanho + D2_maturidade + D3_aquisitivo + D4_tier

D1: total_count > 2000 → +5  |  > 500 → +2  |  ≤ 500 → 0
D2: claimed < 50%    → +4  |  website < 30% → +4  |  rating < 3.5 → +2
D3: pib > R$80K      → +3  |  pib > R$50K → +1  |  densidade > 2000 → +2
D4: tier 1 (saúde/beleza) → +4  |  tier 2 (serviços) → +2  |  tier 3 → 0

Thresholds: ≥ 10 = DISPARAR  |  5-9 = SUGERIR  |  < 5 = IGNORAR
```

### Exemplos com dados reais (ES + SP, 2026-07-17)

| Lead | total | claimed | website | PIB | tier | Score | Ação |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ES · Dentista · Vitória | 4014 | 40% | 0% | R$87K | 1 | **20** | 🔥 |
| SP · Barbearia · São Paulo | 10521 | 60% | 40% | R$52K | 1 | **10** | 🔥 |
| SP · Psicólogo · Osasco | 6205 | 20% | 0% | R$52K | 1 | **14** | 🔥 |
| SP · Restaurante · Guarulhos | 13342 | 60% | 20% | R$52K | 2 | **7** | 📋 |
| ES · Escola · Fundão | 27 | 80% | 20% | R$35K | 3 | **4** | ⏭️ |

### ROI Estimado (SP + ES, 68 municípios mapeados)

```
Phase 0: Pre-flight
  ES 29 cats × 7 mun + SP 29 cats × 39 mun
  Custo: $2.00

Phase 1: Scoring
  12 🔥 DISPARAR, 31 📋 SUGERIR, 25 ⏭️ IGNORAR

Phase 2: Batch parcial (12 prioritários)
  12 × $0.053 = $0.64 → 1.200 leads completos
  Filtro L2: ~240 leads (20%) × $0.010 = $2.40

TOTAL INVESTIMENTO: $5.04 (R$27.72)
─────────────────────────────────────────
Phase 3: Potencial MRR
  Sentinela: 144 × R$197 = R$28.368
  Domínio:   60 × R$497  = R$29.820
  Escala:    12 × R$997  = R$11.964
  Raio-X:    24 × R$0    = R$0 (isca)
  POTENCIAL MRR: R$70.152/mês
─────────────────────────────────────────
ROI: 2.530× sobre investimento em dados
```

## Implementação

### Nível 1: Persistir quality signals do pre-flight

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1.1 | `discovery-search/route.ts` | Pre-flight também salvar `avgScore`, `unaware/problem_aware/solution_aware/product_aware/most_aware=0` (dummy) para a row existir |
| 1.2 | `market-intel.ts` | `getPreflightMarketIntel()` incluir quality signals no `byMunicipality` |
| 1.3 | `SessionLog.tsx` | Exibir quality signals nos cards expandidos |

### Nível 2: Scoring Engine

| Passo | Arquivo | Ação |
|-------|---------|------|
| 2.1 | `lib/intel-scorer.ts` (NOVO) | `scoreOpportunity(preflightData, ibgeContext, tier)` → `{score, action, breakdown}` |
| 2.2 | `api/intel/opportunities/route.ts` (NOVO) | `GET /api/intel/opportunities?uf=ES` → array ranqueado |
| 2.3 | `admin/pipeline/page.tsx` | Nova seção "🎯 Oportunidades Ranqueadas" com tabela |

### Nível 3: Batch parcial com L2 automático

| Passo | Arquivo | Ação |
|-------|---------|------|
| 3.1 | `discovery/page.tsx` | Modo "Phase 1": L0(limit=100, paginate=false) + L1(50 perfis) + L4($0) |
| 3.2 | `discovery-search/route.ts` | Reativar L2 no pipeline com filtro `shouldEnrichL2` (só leads qualificados) |
| 3.3 | `SessionLog.tsx` | Botão "▶ Executar Oportunidades (N)" que dispara batch parcial nos 🔥 |

### Nível 4: Match Plano × Lead

| Passo | Arquivo | Ação |
|-------|---------|------|
| 4.1 | `lib/plan-matcher.ts` (NOVO) | `matchPlan(lead, l2Data)` → `{plan, ticket, pitch}` |
| 4.2 | `admin/leads/page.tsx` | Coluna "Plano Sugerido" com chip colorido |
| 4.3 | `admin/pipeline/page.tsx` | Card "💼 Potencial MRR" com soma dos matches |

### Nível 5: `/admin/criteria` — Configuração do motor

| Passo | Arquivo | Ação |
|-------|---------|------|
| 5.1 | `admin/criteria/page.tsx` (NOVO) | Página de configuração dos pesos e thresholds |
| 5.2 | `lib/intel-config.ts` (NOVO) | Persistir configuração no Redis (`adsentice:intel:config`) |

## Custos

| Componente | Custo |
|------------|:---:|
| Scoring engine | $0 (Supabase + Redis read-only) |
| Batch parcial | $0.053/mun (12 prioritários = $0.64) |
| L2 qualificação | $0.010/lead (~240 leads = $2.40) |
| **Total por ciclo** | **~$5.04 (R$27.72)** |

## Referências

- `apps/web/src/lib/market-intel.ts` — `getPreflightMarketIntel()` (dados de entrada)
- `apps/web/src/lib/scoring.ts` — `scoreLeads()` (padrão de scoring existente)
- `apps/web/src/lib/geo-data.ts` — `BR_CAPITALS` (tiers e segmentos)
- `apps/web/src/app/api/discovery-search/route.ts` — pipeline L0-L4
- `apps/web/src/lib/provider-core-adapter.ts` — DataForSEO adapter
- ADR-0024 — Pipeline L0→L4
- ADR-0029 — Pre-flight Session Log
- ADR-0027 — Market Estimator IBGE × DataForSEO
