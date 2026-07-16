# ADR-0025 · RM Intelligent Discovery — Seleção por Município

**Status:** proposed  
**Date:** 2026-07-16  
**Deciders:** founder, claude  
**Supersedes:** none  
**Extends:** ADR-0022 (Geo Intelligence), ADR-0024 (L0-L4 Pipeline)

---

## Contexto

O Discovery atual usa **busca circular** (centro + raio km) para capturar negócios.
Isso funciona para áreas densas (ex: São Paulo centro 5km = 500+ dentistas), mas **falha
para capturar Regiões Metropolitanas completas**. Exemplo real:

| Método | Cobertura | Problema |
|--------|:---:|------|
| Vitória centro + 5km | 2/7 municípios (Vitória, Vila Velha) | Guarapari a 47km nunca aparece |
| Vitória centro + 50km | ~7 municípios | Mistura zonas rurais, custo alto, baixa precisão |

**O sistema já tem a infraestrutura necessária:**

- `district_registry` no Supabase: **354 municípios em 19 RMs brasileiras**
- `getMunicipalities(city)` no `target-scorer.ts`: consulta Supabase + fallback hardcoded
- `scoreMunicipalityTarget()`: prioriza gaps por dor, ticket, densidade
- `OFFICIAL_MUNICIPALITIES`: fallback hardcoded pra SP, RJ, BH, Curitiba

---

## Decisão

**Implementar "Seleção Inteligente de RM" no Discovery**, com 3 níveis:

### Nível 1: Expandir seleção por município (MVP — próxima sessão)

- Ao clicar numa capital, mostrar lista de municípios da RM (7-39 por RM)
- Permitir selecionar um município específico para busca
- Coordenadas do município via IBGE `localidades` API (já temos `ibge/localidades.ts`)

### Nível 2: Cluster RM (fase 2)

- Botão "Cobrir RM inteira": enfileira buscas para cada município não mapeado
- Priorização via `scoreMunicipalityTarget()` — gaps com maior dor primeiro
- Progresso: "3/7 municípios mapeados (43%) · próximo: Guarapari (prioridade alta)"

### Nível 3: Auto-Pilot RM (fase 3)

- Auto-Pilot sugere próxima RM baseado em `ibge_market_size` por UF
- Orquestra múltiplas buscas cross-categoria dentro de uma RM
- Market holds agregados por RM para time-series

---

## Implementação

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | `discovery/page.tsx` | Adicionar chip de seleção de município abaixo das capitais |
| 2 | `lib/geo-data.ts` | Adicionar `RM_MUNICIPALITIES` ou consumir `district_registry` |
| 3 | `api/discovery-search/route.ts` | Aceitar `municipio` no body para coordenadas específicas |
| 4 | `lib/ibge/localidades.ts` | `getCoordenadasMunicipio(uf, nome)` para geocoding exato |
| 5 | `components/DiscoveryAutoPilot.tsx` | Modo RM: mostrar progresso + sugestão inteligente |

---

## Custos

| Cenário | Chamadas | Custo estimado |
|---------|:---:|:---:|
| 1 município (hoje) | 1 POST | ~$0.05 |
| RM completa (7 municípios médio) | 7 POSTs | ~$0.35 |
| RM grande (SP, 39 municípios) | 39 POSTs | ~$1.95 |

---

## Referências

- `apps/web/src/lib/target-scorer.ts` — `getMunicipalities()`, `scoreMunicipalityTarget()`
- `apps/web/src/lib/geo-data.ts` — `BR_CAPITALS`, `suggestRadiusByPop()`
- `apps/web/src/lib/ibge/localidades.ts` — IBGE Localidades API
- Supabase `district_registry` — 354 municípios, 19 RMs
- ADR-0022 — Geo Intelligence (Turf + H3 + Leaflet)
- ADR-0024 — L0→L4 Enrichment Pipeline
