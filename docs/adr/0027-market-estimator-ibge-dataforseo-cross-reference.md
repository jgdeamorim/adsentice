# ADR-0027 · Market Estimator — IBGE × DataForSEO Cross-Reference Intelligence

**Status:** proposed
**Date:** 2026-07-16
**Deciders:** founder, claude
**Extends:** ADR-0022 (Geo Intelligence), ADR-0024 (L0-L4 Pipeline), ADR-0026 (Coverage Planner)

---

## Contexto

Temos **duas fontes de verdade** sobre o tamanho do mercado que nunca foram cruzadas:

| Fonte | O que mede | Granularidade | Cobertura |
|-------|-----------|:---:|:---:|
| **IBGE CEMPRE** (`ibge_market_size`) | CNPJs registrados por CNAE | Estado (UF) | 29 categorias × 27 UFs = 782 rows |
| **DataForSEO** (`market_holds.total_businesses`) | Negócios que aparecem no Google Maps | Município + raio | 3 registros (só ES) |

**O gap entre elas é o insight de negócio mais valioso que podemos oferecer:**

> "Em Barueri, o IBGE estima 630 dentistas. Só 87 aparecem no Google Maps.  
>  543 dentistas (86%) estão **invisíveis** para pacientes que buscam online.  
>  O ticket médio é R$500/consulta. O mercado invisível vale **R$271.500/mês**."

Nenhuma plataforma concorrente oferece esse cruzamento.

---

## Decisão

**Implementar `MarketEstimator` — motor de inteligência que cruza IBGE com DataForSEO**
para gerar estimativas municipais validadas e priorização automática.

### Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    MARKET ESTIMATOR                          │
│                                                              │
│  INPUT: (uf, category, municipio)                            │
│                                                              │
│  ┌────────────────┐    ┌──────────────────┐                  │
│  │ IBGE CEMPRE    │    │ IBGE Panorama    │                  │
│  │ (top-down)     │    │ (demografia)     │                  │
│  │                │    │                  │                  │
│  │ SP·dentist:    │    │ SP capital:      │                  │
│  │ 42.000 CNPJs   │    │ 11.9M pop        │                  │
│  └───────┬────────┘    │ 1.521 km²        │                  │
│          │             └────────┬─────────┘                  │
│          │                      │                            │
│          ▼                      ▼                            │
│  ┌──────────────────────────────────────┐                    │
│  │        DISTRIBUIÇÃO POPULACIONAL      │                    │
│  │                                      │                    │
│  │  municipio_estimate =                │                    │
│  │    state_total × (mun_pop / rm_pop)  │                    │
│  │                                      │                    │
│  │  Barueri: 42.000 × (316K/21.6M)     │                    │
│  │         = ~630 dentistas estimados   │                    │
│  └──────────────┬───────────────────────┘                    │
│                 │                                            │
│                 ▼                                            │
│  ┌──────────────────────────────────────┐                    │
│  │        VALIDAÇÃO DataForSEO           │                    │
│  │                                      │                    │
│  │  market_holds.total_businesses       │                    │
│  │  para o município (acumulado)        │                    │
│  │                                      │                    │
│  │  Se nunca mapeado → ⚠️ ESTIMATED    │                    │
│  │  Se mapeado → ✅ VALIDATED           │                    │
│  └──────────────┬───────────────────────┘                    │
│                 │                                            │
│                 ▼                                            │
│  OUTPUT:                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ {                                                    │   │
│  │   ibgeEstimate: 630,                                 │   │
│  │   mapsReality: 87,        // se validado             │   │
│  │   gapPct: 86.2,           // % invisíveis            │   │
│  │   confidence: 'VALIDATED' | 'ESTIMATED',             │   │
│  │   marketValueMRR: 271500, // ticket × gap            │   │
│  │   priorityScore: 85,      // scoreMunicipalityTarget │   │
│  │   recommended: {                                     │   │
│  │     action: 'Mapear agora',                          │   │
│  │     radius: 5,             // km ideal               │   │
│  │     budget: 0.05,          // custo estimado         │   │
│  │     expectedLeads: 200     // ~70% do gap capturável │   │
│  │   }                                                 │   │
│  │ }                                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Algoritmo de distribuição

```typescript
function distributeStateEstimate(
  stateEstimate: number,      // IBGE CEMPRE total na UF
  municipios: { nome: string; populacao: number }[]
): Record<string, number> {
  const totalPopRM = sum(municipios.map(m => m.populacao))
  
  return Object.fromEntries(
    municipios.map(m => [
      m.nome,
      Math.round(stateEstimate * (m.populacao / totalPopRM))
    ])
  )
}
```

### Algoritmo de priorização

```typescript
function calculatePriorityScore(municipio: MunicipioEstimate): number {
  // Quanto MAIOR o gap, MAIOR a prioridade
  // Gap alto = mercado offline = adsentice resolve
  const gapFactor = municipio.gapPct / 100                    // 0-1
  
  // Quanto MENOS mapeado, MAIOR a prioridade
  const noveltyFactor = municipio.searchesCount === 0 ? 1.0
    : Math.max(0, 1 - municipio.searchesCount / 5)             // 0-1 (decai após 5 buscas)
  
  // Quanto MAIOR o ticket potencial, MAIOR a prioridade
  const ticketFactor = Math.min(1, municipio.avgTicket / 1500) // 0-1 (cap at R$1500)
  
  // Quanto MAIOR a renda, MAIOR a prioridade
  const incomeFactor = Math.min(1, municipio.avgIncome / 3000) // 0-1 (cap at R$3000)
  
  return Math.round(
    (gapFactor * 0.35 + noveltyFactor * 0.25 + ticketFactor * 0.25 + incomeFactor * 0.15) * 100
  )
}
```

---

## Fontes de dados

### Já populado (leitura direta)

| Dado | Tabela | Granularidade |
|------|--------|:---:|
| Total CNPJs por categoria × UF | `ibge_market_size` | Estado |
| População + área + PIB | `ibge_panorama` | Capital |
| Renda média domiciliar | `ibge_income` | Estado |
| Municípios da RM | `district_registry` | Município |
| total_businesses por busca | `market_holds` | Município + raio |

### A popular (ADR-0026 propõe)

| Dado | Tabela | Granularidade |
|------|--------|:---:|
| Businesses estimados por município | `coverage_tracker` (novo) | Município × categoria |
| fetched_count acumulado | `coverage_tracker` | Município × categoria |
| coverage_pct | `coverage_tracker` | Município × categoria |

---

## Implementação

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | `lib/market-estimator.ts` | NOVO: `distributeStateEstimate()`, `estimateMunicipioMarket()`, `validateWithMaps()` |
| 2 | `lib/market-estimator.ts` | `calculatePriorityScore()` com gap + novelty + ticket + income |
| 3 | `lib/market-intel.ts` | Integrar `marketOverview()` com dados do estimator |
| 4 | `api/discovery-search/route.ts` | POST → upsert `coverage_tracker` + recalcular estimativas |
| 5 | `components/DiscoveryAutoPilot.tsx` | Modo "Inteligência de Mercado" com cards de gap |
| 6 | `discovery/page.tsx` | Painel lateral: "Mercado Invisível" com R$ potencial |

---

## Exemplo real de output

```json
{
  "uf": "SP",
  "category": "dentist",
  "stateEstimate": 42000,
  "municipiosAnalyzed": 39,
  "totalMapped": 3,
  "totalValidated": 1,
  "coveragePct": 7.7,
  "totalInvisibleValue": 12500000,
  "topOpportunities": [
    {
      "municipio": "Barueri",
      "ibgeEstimate": 630,
      "mapsReality": 87,
      "gapPct": 86.2,
      "confidence": "VALIDATED",
      "marketValueMRR": 271500,
      "priorityScore": 85,
      "action": "Mapear agora · $0.05 · ~200 leads esperados"
    },
    {
      "municipio": "Guarulhos",
      "ibgeEstimate": 2520,
      "mapsReality": null,
      "gapPct": null,
      "confidence": "ESTIMATED",
      "marketValueMRR": 1260000,
      "priorityScore": 78,
      "action": "Nunca mapeado · validar com 1 busca ($0.05)"
    }
  ]
}
```

---

## Referências

- `apps/web/src/lib/state-scorer.ts` — `rankStates()`, `IBGE_SMB_BY_STATE`
- `apps/web/src/lib/target-scorer.ts` — `scoreMunicipalityTarget()`, `getMunicipalities()`
- `apps/web/src/lib/geo-data.ts` — `BR_CAPITALS`, `suggestRadiusByPop()`
- `apps/web/src/lib/provider-core-adapter.ts` — `appendMarketHolds()`
- `apps/web/src/app/api/discovery-search/route.ts` — search_metadata + market_holds
- Supabase `ibge_market_size` — 782 rows (29 categorias × 27 UFs)
- Supabase `ibge_panorama` — 29 rows (27 capitais + 2 extras)
- Supabase `ibge_income` — 27 rows (renda média por UF)
- Supabase `district_registry` — 354 rows (19 RMs)
- Supabase `market_holds` — 3 rows (início da série temporal)
- ADR-0022 — Geo Intelligence
- ADR-0024 — L0-L4 Pipeline
- ADR-0025 — RM Intelligent Discovery
- ADR-0026 — Coverage Planner
