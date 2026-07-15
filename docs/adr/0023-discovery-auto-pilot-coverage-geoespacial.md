---
id: adr-0023
title: Discovery Auto-Pilot — Cobertura Geoespacial + Localização Automática + Conversão Intelligence
status: accepted
date: 2026-07-15
deciders: founder, claude
extends: [adr-0008, adr-0009, adr-0022]
references:
  - apps/web/src/lib/market-intel.ts (cobertura por categoria × cidade)
  - apps/web/src/lib/discovery-persistence.ts (saveDiscoverySearch com searchId)
  - apps/web/src/app/api/discovery-search/route.ts (appendMarketHolds)
  - apps/web/src/lib/geo-data.ts (27 capitais, BR_CAPITALS)
  - apps/web/src/lib/geo-resolver.ts (reverseGeocode, searchCity)
  - Supabase: discovery_searches (11 rows), discovery_listings (404 rows), market_holds (4 rows)
---

# ADR-0023 · Discovery Auto-Pilot — Cobertura + Automação + Conversão

## Contexto

O Discovery Engine atual é **manual**: o usuário seleciona categoria, capital, raio e clica "Buscar". Cada busca cobre um círculo geográfico, mas não há visibilidade sobre:
- Quais regiões JÁ foram mapeadas pra essa categoria?
- Quais bairros/distritos NUNCA foram varridos?
- Qual a cobertura total de uma capital?

Para megacidades como São Paulo (11.4M hab, 1.521 km²), um raio de 25km cobre ~40% do município. O usuário precisa saber ONDE já buscou e ONDE deveria buscar em seguida.

Além disso, quando o produto estiver em produção (clientes pagantes), o próprio sistema pode **autonomamente** iniciar descobertas para cobrir gaps, priorizar regiões de alta conversão, e atingir metas diárias de prospecção — sem intervenção do founder.

## Decisão

**Adotamos Discovery Auto-Pilot em 3 camadas incrementais:**

### Camada 1 — Coverage Matrix (agora)
| Componente | Fonte | Função |
|-----------|-------|--------|
| `coverage.ts` | Supabase `discovery_searches` + `discovery_listings` | Calcula cobertura % por categoria × cidade |
| `district-gaps.ts` | `reverseGeocode` nos listings + distritos GMB | Detecta distritos nunca mapeados |
| UI toggle | `/admin/discovery` page.tsx | Switch "Automática / Manual" |
| Coverage Card | `/admin/discovery` | Barra de progresso + gaps visíveis |

**Dados usados (100% existentes, $0):** search_id, lat, lng, radiusKm, city, district dos listings.

### Camada 2 — Target Suggester (MVP GO)
| Componente | Fonte | Função |
|-----------|-------|--------|
| `target-scorer.ts` | IBGE API (população/renda) + cobertura | Score por região: densidade × dor × ticket |
| Auto-queue | Redis `adsentice:discovery:queue` | Fila de próximos alvos por categoria |
| `suggestNextTarget()` | `h3-js` hexágonos + coverage gap | "Próximo alvo: Barra da Tijuca (15km, score 87)" |

### Camada 3 — Autonomous Prospecting (clientes pagantes)
| Componente | Fonte | Função |
|-----------|-------|--------|
| `conversion-intel.ts` | Funil de leads (CRM) | Score de conversão por região |
| `daily-quota.ts` | Meta diária configurável | Quantas descobertas/dia por categoria |
| `auto-discovery-loop.ts` | Cron + queue | Loop autônomo: busca → enriquece → próximo alvo |
| Budget guard | `cost-registry.yaml` | Limite diário de gasto DataForSEO |

### Fluxo completo

```
Usuário ativa Localização Automática
  │
  ▼
Coverage Matrix: quais distritos já mapeados?
  │
  ├─► Gaps detectados → Target Suggester prioriza
  │     │
  │     ▼
  │   Auto-queue: próximo alvo = Barra da Tijuca (15km)
  │     │
  │     ▼
  │   Discovery roda automaticamente
  │     │
  │     ▼
  │   Coverage Matrix atualiza → próximo gap
  │
  ▼ (Camada 3 — futuro)
Conversion Intel: quais regiões convertem mais?
  │
  ▼
Daily Quota: quantos leads precisamos HOJE?
  │
  ▼
Auto-Discovery Loop: sistema dispara descobertas sozinho
  até atingir meta diária ou budget cap
```

## Consequências

### Positivas
- Resolve o problema "onde já busquei?" com $0 em dados existentes
- Prepara fundação para operação autônoma (GO MVP sem founder operando)
- Cobertura visível aumenta confiança do usuário no produto
- Camada 3 habilita modelo de agência: sistema prospecta, founder fecha

### Riscos
- Custos DataForSEO escalam com automação — budget guard obrigatório
- Qualidade dos dados depende de L1 enrichment (city/district)
- Nominatim rate limit (1 req/s) limita reverse geocoding em lote

## Status

**Accepted** — 2026-07-15. Camada 1 começa nesta sessão.
