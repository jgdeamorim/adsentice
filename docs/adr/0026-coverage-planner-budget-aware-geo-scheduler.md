# ADR-0026 · Coverage Planner — Budget-Aware Geo Scheduler

**Status:** proposed  
**Date:** 2026-07-16  
**Deciders:** founder, claude  
**Extends:** ADR-0022 (Geo Intelligence), ADR-0024 (L0-L4 Pipeline), ADR-0025 (RM Intelligent Discovery)

---

## Contexto

Hoje o Discovery exige que o usuário clique manualmente em capitais, ajuste raio,
e execute buscas sem saber:

- **Quantos % do estado já foi mapeado?**
- **Qual o raio ideal por município?** (Vitória = 97 km² → 5km cobre 80%,
  Manaus = 11.401 km² → precisa de raio maior)
- **Quantas chamadas faltam e qual o custo?** (39 municípios na RM de SP
  × $0.05/busca = $1.95, mas o usuário não sabe disso)
- **Qual o próximo município prioritário?** (Guarapari nunca mapeado vs.
  Serra já mapeado 3×)

**Temos dados IBGE reais para calcular isso:**

| Capital | Área (km²) | Raio 5km cobre | Raio ideal |
|---------|:---:|:---:|:---:|
| Vitória | 97 | **80%** | 5km |
| São Paulo | 1.521 | 5% | 25km |
| Manaus | 11.401 | <1% | 30km |
| Rio de Janeiro | 1.200 | 7% | 20km |
| Curitiba | 435 | 18% | 15km |

**22/27 capitais** têm área e população no `ibge_panorama` (cobertura 81%).
Faltam 5: Brasília, Campo Grande, Teresina, Porto Velho, Macapá, Rio Branco, Boa Vista.

---

## Decisão

**Implementar Coverage Planner com budget-aware scheduling**, em 3 camadas:

### Camada 1: Coverage Tracker (tabela Supabase)

```sql
coverage_tracker (
  uf, municipio, categoria,      -- PK composta
  area_km2, populacao,            -- IBGE (estático)
  total_businesses_est,           -- ibge_market_size (estático)
  fetched_count,                  -- acumulado de buscas
  last_search_id,                 -- última Discovery
  coverage_pct,                   -- fetched / total_businesses_est * 100
  searches_count,                 -- quantas buscas já feitas
  updated_at
)
```

Populado automaticamente após cada Discovery. Agrega por UF para mostrar % mapeado.

### Camada 2: Raio Inteligente

```typescript
function suggestRadius(municipio: { area_km2: number; populacao: number }): number {
  // Pequeno e denso (Vitória 97km², 3.535 hab/km²) → raio curto
  // Grande e esparso (Manaus 11.401km², 202 hab/km²) → raio maior
  // Cobre ~15-30% da área urbana por busca

  if (municipio.area_km2 < 200) return 5    // Vitória, Recife, Natal, Aracaju
  if (municipio.area_km2 < 500) return 10   // Curitiba, Porto Alegre, BH
  if (municipio.area_km2 < 1000) return 15  // Salvador, Goiânia, Florianópolis
  if (municipio.area_km2 < 2000) return 20  // RJ, Belém
  return 25                                  // SP, Manaus, Cuiabá, Palmas
}
```

### Camada 3: Budget-Aware Scheduler

- **Antes de executar**: calcula `n_municipios × $0.05 = custo_total`
- **Confirmação**: "Cobrir RM de Vitória (7 municípios) custa ~$0.35. Continuar?"
- **Priorização**: `scoreMunicipalityTarget()` ordena por gap + dor + ticket
- **Auto-Pilot**: modo automático executa fila respeitando budget cap diário
  configurável (default: $2.00/dia = ~40 buscas)

---

## Implementação

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | Supabase migration | Criar `coverage_tracker` com índices por UF + categoria |
| 2 | `lib/coverage-planner.ts` | NOVO: `suggestRadiusByArea()`, `estimateCoverage()`, `getCoverageQueue()` |
| 3 | `api/discovery-search/route.ts` | `POST` → upsert no `coverage_tracker` |
| 4 | `discovery/page.tsx` | Chip "Planejar Cobertura" + modal com custo estimado |
| 5 | `components/DiscoveryAutoPilot.tsx` | Modo Coverage: progresso por UF + fila prioritária |

---

## Custos

| Cenário | Buscas | Custo | Cobertura |
|---------|:---:|:---:|:---:|
| RM pequena (Vitória, 7 municípios) | 7 | $0.35 | ~80% da RM |
| RM média (RJ, 22 municípios) | 22 | $1.10 | ~70% da RM |
| RM grande (SP, 39 municípios) | 39 | $1.95 | ~40% da RM |
| Estado completo (SP, 645 municípios) | 645 | $32.25 | inviável sem budget tracking |

---

## Dados IBGE disponíveis

| Fonte | Campos | Cobertura |
|-------|--------|:---:|
| `ibge_panorama` (Supabase) | `area_km2`, `populacao`, `densidade_demografica`, `pib_per_capita` | 22/27 capitais |
| `ibge_income` (Supabase) | `avg_household_income` por UF | 27/27 UFs |
| `ibge_market_size` (Supabase) | `businesses_estimate` por UF × categoria | parcial |
| `district_registry` (Supabase) | 354 municípios em 19 RMs | ✅ completo |
| IBGE Localidades API | Coordenadas exatas por município | via `ibge/localidades.ts` |

---

## Referências

- `apps/web/src/lib/ibge/localidades.ts` — IBGE Localidades API (municípios + coordenadas)
- `apps/web/src/lib/geo-data.ts` — `BR_CAPITALS`, `suggestRadiusByPop()`
- `apps/web/src/lib/target-scorer.ts` — `scoreMunicipalityTarget()`, `getMunicipalities()`
- `apps/web/src/lib/state-scorer.ts` — `rankStates()`, `ibge_market_size`
- `apps/web/src/app/api/discovery-search/route.ts` — search_metadata tracker
- Supabase `ibge_panorama` — 22 capitais com `area_km2`
- Supabase `district_registry` — 354 municípios, 19 RMs
- ADR-0022 — Geo Intelligence (Turf + H3 + Leaflet)
- ADR-0024 — L0→L4 Pipeline
- ADR-0025 — RM Intelligent Discovery
