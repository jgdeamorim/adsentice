# ADR-0030 · adsentice Intelligence Runtime — Motor de Captação e Funil

**Status:** proposed
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0024 (Pipeline L0→L4), ADR-0029 (Pre-flight Session Log), ADR-0027 (Market Estimator IBGE)
**Supersedes:** none

## Contexto

O adsentice já possui 4 camadas de coleta de dados funcionando:

| Camada | Custo SP (1 mun) | Dados | Status |
|--------|:---:|------|:---:|
| Pre-flight (L0 limit=5) | $0.014 | `total_count` + 5 amostras (rating, claimed, website) | ✅ v033.4 |
| Batch parcial (L0 limit=100 × 1 pág) | $0.053 | 100 listings + L1 + L4 | ✅ checkbox 🛑 |
| Batch completo (L0 100 × N págs) | $4.66 | 9.666 listings + L1 + L4 | ✅ desde v027 |
| L2/L3 (SEO + Social) | $0.010/lead | on_page_instant_audit + domain_technologies + content_parsing | ❌ CÓDIGO PRONTO mas NUNCA chamado |

**Estado atual do funil (2026-07-17):**

| Página | Estado | Dados |
|--------|--------|-------|
| `/admin/pipeline` | Ativo | S0-S2 com dados reais do Supabase. S3-S7 **hardcoded = 0** |
| `/admin/solutions` | Estático | 5 planos (Raio-X $0, Sentinela R$197, Domínio R$497, Escala R$997). **Sem match dinâmico lead→plano** |
| `/admin/criteria` | Estático | 40+ sinais de scoring (F1-F10, E1-E7, W1-W12, C1-C8). **Sem wire no runtime** |
| `/admin/market` | Ativo | overview + IBGE + pre-flight intel |

**Dados de mercado já coletados (pre-flight v033.4):**

| Estado | Municípios | Categorias | Leads est. | Custo total |
|--------|:---:|:---:|:---:|:---:|
| ES | 7 | 29/29 | ~27K | $0.39 |
| SP | 39 | 10/29 | ~189K | $0.54 |

**Gap crítico:** O pipeline coleta dados, mas NÃO decide o que fazer com eles. O L2 e L3 (~200 linhas cada no `discovery-search/route.ts`) estão totalmente implementados mas com prefixo `_` (função privada, nunca invocada). A estratégia "pós-conversão" da ADR-0024 adiou L2/L3 indefinidamente.

**55 frameworks de marketing** (Corey Haines 43 + Kim Barrett 12) foram ingeridos no KG (`docs/spec/corey-haines-frameworks.json`, `marketing-strategy-frameworks.json`) mas **não estão wireados no runtime** — são documentos de design, não código executável.

## Decisão

Implementar o **adsentice Intelligence Runtime** — ciclo de 4 fases que transforma pre-flight em decisão, decisão em batch, batch em diagnóstico L2 pré-venda, e diagnóstico em match de plano.

### Arquitetura do Motor de Captação

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADSENTICE INTELLIGENCE RUNTIME                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 0: PRE-FLIGHT (já implementado — v033.4)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 68 municípios mapeados (ES + SP) · 29 categorias            │   │
│  │ total_count + quality (5 amostras) + IBGE (area_km2)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 1: SCORING ENGINE (NOVO)                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Cruza 4 dimensões para rankear oportunidades:               │   │
│  │   D1: Tamanho (total_count)                                 │   │
│  │   D2: Maturidade digital (claimed%, website%, rating)       │   │
│  │   D3: Poder aquisitivo (IBGE: pib_per_capita, densidade)    │   │
│  │   D4: Categoria estratégica (tier 1/2/3)                    │   │
│  │                                                             │   │
│  │ Score ≥ 10 → 🔥 DISPARAR batch parcial                      │   │
│  │ Score 5-9  → 📋 SUGERIR (fila)                              │   │
│  │ Score < 5  → ⏭️ IGNORAR                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 2: BATCH PARCIAL + L2 PRÉ-VENDA (NOVO)                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Para cada 🔥 oportunidade:                                  │   │
│  │   L0 (100 leads, 1 pág) + L1 (50 perfis) + L4 (IBGE)       │   │
│  │   Custo: $0.053/mun × N municípios                          │   │
│  │                                                             │   │
│  │ FILTRO DE QUALIFICAÇÃO L2 (adsentice decide sozinho):       │   │
│  │   ✅ website NÃO nulo                                        │   │
│  │   ✅ is_claimed === false (oportunidade de gestão GMB)       │   │
│  │   ✅ rating > 3.5 (reputação existente)                      │   │
│  │   ✅ business_status === OPERATIONAL                          │   │
│  │   ✅ total_photos < 10 (gap visível de conteúdo)             │   │
│  │                                                             │   │
│  │   ~20% dos leads passam no filtro                           │   │
│  │   → L2: on_page_instant_audit + domain_technologies         │   │
│  │   → Custo: $0.010/lead                                      │   │
│  │   → Resultado: relatório SEO completo por lead              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 3: MATCH PLANO × LEAD (NOVO)                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Perfil                                  → Plano             │   │
│  │ !claimed && !website && rating>3.5      → Raio-X R$0        │   │
│  │ !claimed && website && l2_score<40      → Sentinela R$197   │   │
│  │ claimed && website && l2_score<40       → Domínio R$497     │   │
│  │ !claimed && website && l2_score>60      → Escala R$997      │   │
│  │ !website && !phone && !claimed          → Raio-X R$0        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│                           ▼                                         │
│  Phase 4: PÓS-CONVERSÃO (L2+L3 completo)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Cliente pagou → L2 audita TODOS os leads do cliente         │   │
│  │ → L3 extrai social links + WhatsApp + emails                │   │
│  │ → Relatório de entrega mensal automático                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### A Ponte Pré-venda — O Diferencial

O **L2 pré-venda** é a inovação central. Em vez de "confie em mim, seu site é ruim", o adsentice entrega o **diagnóstico pronto** como lead magnet:

```
"Dr. Silva, seu consultório tem 4.7★ no Google mas NEM APARECE nas buscas.
 Seu site (WordPress) tem score 32/100. Mobile leva 8.3 segundos.
 Zero meta tags. Zero schema markup. Aqui está o que consertar."

→ Relatório gerado automaticamente via L2 ($0.010)
→ Custo de aquisição: $0.053 (batch) + $0.010 (L2) = $0.063/lead qualificado
→ Se 5% converter: $1.26 por cliente adquirido
→ Ticket médio R$297 = CAC de R$6.93
```

### Scoring Engine — Fórmula

```
SCORE = D1_tamanho + D2_maturidade + D3_aquisitivo + D4_tier

D1: total_count > 2000 → +5  |  > 500 → +2  |  ≤ 500 → 0
D2: claimed < 50%    → +4  |  website < 30% → +4  |  rating < 3.5 → +2
D3: pib > R$80K      → +3  |  pib > R$50K → +1  |  densidade > 2000 → +2
D4: tier 1 (saúde/beleza) → +4  |  tier 2 (serviços) → +2  |  tier 3 → 0

Thresholds: ≥ 10 = 🔥 DISPARAR  |  5-9 = 📋 SUGERIR  |  < 5 = ⏭️ IGNORAR
```

### O que já existe e será reutilizado

| Recurso | Estado | Ação |
|---------|--------|------|
| L2 `_enrichTopLeadsL2()` | Código pronto, ~160 linhas | Remover `_`, wirear no pipeline |
| L3 `_enrichTopLeadsL3()` | Código pronto, ~100 linhas | Remover `_`, wirear pós-conversão |
| Cache L2 (30 dias) | Redis `l2:audit:{domain}` | Já implementado |
| `/admin/criteria` | 40+ sinais documentados | Wirear no scoring engine |
| `/admin/solutions` | 5 planos + personas | Tornar dinâmico com match |
| `/admin/pipeline` | S0-S2 reais, S3-S7=0 | Popular S3+ com L2/L3 |
| 55 frameworks marketing | KG Qdrant | Wirear no runtime de decisão |

### Exemplos com dados reais (2026-07-17)

```
🥇 ES · Dentista · Vitória
   total=4014 (+5) · claimed=40% (+4) · website=0% (+4)
   rating=4.0 (+0) · PIB=R$87K (+3) · tier=1 (+4)
   → SCORE 20 — 🔥 DISPARAR
   Batch parcial: 100 leads × $0.053 = $0.053
   Filtro L2: ~20 leads × $0.010 = $0.20
   Potencial: 20 relatórios → 5% conv = 1 cliente → R$197 MRR

🥈 SP · Barbearia · São Paulo
   total=10521 (+5) · claimed=60% (+0) · website=40% (+0)
   PIB=R$52K (+1) · tier=1 (+4)
   → SCORE 10 — 🔥 DISPARAR
   Mercado grande. Oportunidade: upsell gestão GMB p/ reivindicados

🥉 ES · Escola · Fundão
   total=27 (+0) · claimed=80% (+0) · website=20% (+4)
   PIB=R$35K (+0) · tier=3 (+0)
   → SCORE 4 — ⏭️ IGNORAR
   Mercado minúsculo, ticket baixo, sem densidade.
```

### ROI por ciclo (ES + SP, 68 municípios)

```
Phase 0: Pre-flight (já executado)
  Custo: $2.00

Phase 1: Scoring Engine
  Custo: $0 (Supabase + Redis read-only)
  Resultado: 12 🔥 DISPARAR, 31 📋 SUGERIR, 25 ⏭️ IGNORAR

Phase 2: Batch parcial + L2 pré-venda (12 prioritários)
  Batch: 12 × $0.053 = $0.64 → 1.200 leads
  Filtro L2: ~240 leads (20%) × $0.010 = $2.40
  → 240 diagnósticos SEO prontos para prospecção

TOTAL INVESTIMENTO: $5.04 (R$27.72)
─────────────────────────────────────────
Phase 3: Conversão estimada (5% dos 240)
  12 clientes × ticket médio R$297 = R$3.564 MRR
  CAC: R$2.31 por cliente
  ROI: 128× sobre investimento em dados
```

## Implementação

### Nível 1: Persistir quality signals + Descomentar L2/L3

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1.1 | `discovery-search/route.ts` | Remover prefixo `_` de `enrichTopLeadsL2` e `enrichTopLeadsL3` |
| 1.2 | `discovery-search/route.ts` | Wirear L2 no pipeline com filtro `shouldEnrichL2` (só leads qualificados) |
| 1.3 | `discovery-search/route.ts` | Pre-flight: salvar `avgScore` e quality signals no `discovery_searches` |
| 1.4 | `market-intel.ts` | `getPreflightMarketIntel()` retornar quality signals no `byMunicipality` |

### Nível 2: Scoring Engine + `/admin/pipeline` dinâmico

| Passo | Arquivo | Ação |
|-------|---------|------|
| 2.1 | `lib/intel-scorer.ts` (NOVO) | `scoreOpportunity(preflightData, ibgeData, tier)` → `{score, action, breakdown}` |
| 2.2 | `api/intel/opportunities/route.ts` (NOVO) | `GET /api/intel/opportunities` → array ranqueado |
| 2.3 | `admin/pipeline/page.tsx` | Popular S3-S7 com dados reais de L2/L3 |
| 2.4 | `admin/pipeline/page.tsx` | Nova seção "🎯 Oportunidades Ranqueadas" |

### Nível 3: Match Plano × Lead

| Passo | Arquivo | Ação |
|-------|---------|------|
| 3.1 | `lib/plan-matcher.ts` (NOVO) | `matchPlan(lead, l2Data)` → `{plan, ticket, pitch, reasoning}` |
| 3.2 | `admin/solutions/page.tsx` | Substituir conteúdo estático por match dinâmico com dados do Supabase |
| 3.3 | `admin/leads/page.tsx` | Coluna "Plano Sugerido" com chip colorido |

### Nível 4: `/admin/criteria` wireado no runtime

| Passo | Arquivo | Ação |
|-------|---------|------|
| 4.1 | `admin/criteria/page.tsx` | Adicionar config panel (pesos editáveis, thresholds) |
| 4.2 | `lib/intel-config.ts` (NOVO) | Persistir config no Redis (`adsentice:intel:config`) |
| 4.3 | `lib/intel-scorer.ts` | Ler config do Redis, recalcular scores em tempo real |

### Nível 5: Wirear 55 frameworks de marketing

| Passo | Arquivo | Ação |
|-------|---------|------|
| 5.1 | `lib/marketing-kg.ts` (NOVO) | `queryMarketingSkill(skillName)` → framework do Qdrant |
| 5.2 | `lib/plan-matcher.ts` | Usar `prospecting`, `sales-enablement`, `content-strategy` no match |
| 5.3 | `lib/intel-scorer.ts` | Usar `customer-research`, `competitor-profiling` no scoring |

## Custos

| Componente | Custo por ciclo |
|------------|:---:|
| Scoring engine | $0 (Supabase + Redis read-only) |
| Batch parcial (12 prioritários) | $0.64 |
| L2 pré-venda (~240 leads) | $2.40 |
| L3 pós-conversão | $0.0005/lead (sob demanda) |
| **Total por ciclo** | **~$3.04** |
| Pre-flight já executado | $2.00 (sunk cost) |

## Referências

- `apps/web/src/lib/market-intel.ts` — `getPreflightMarketIntel()` (dados de entrada do scoring)
- `apps/web/src/lib/scoring.ts` — `scoreLeads()`, `SCHWARTZ_LEVELS` (padrão de scoring existente)
- `apps/web/src/lib/geo-data.ts` — `BR_CAPITALS`, `suggestRadiusByArea()` (tiers e áreas)
- `apps/web/src/app/api/discovery-search/route.ts` — Pipeline L0-L4 + L2/L3 comentados (linhas 101-359)
- `apps/web/src/lib/provider-core-adapter.ts` — DataForSEO adapter (L0, L1, L2, L3)
- `apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx` — Funil S0-S7
- `apps/web/src/app/[lang]/(dashboard)/(private)/admin/solutions/page.tsx` — Planos estáticos
- `apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx` — Sinais de scoring
- `docs/spec/corey-haines-frameworks.json` — 43 frameworks de marketing
- `docs/spec/marketing-strategy-frameworks.json` — Estratégias de marketing
- ADR-0024 — Pipeline L0→L4
- ADR-0029 — Pre-flight Session Log
- ADR-0027 — Market Estimator IBGE × DataForSEO
