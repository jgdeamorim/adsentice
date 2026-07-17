# ADR-0029 · Discovery Session Log — Histórico de Sessão com Cache TTL

**Status:** accepted
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0025 (RM Intelligent Discovery), ADR-0026 (Coverage Planner)

## Contexto

Após executar uma Discovery (ex: batch de 7 municípios), **nenhum registro visual** do que foi executado fica disponível. O usuário precisa:

- Saber quais municípios já foram buscados na sessão atual
- Ver o TTL de cache Redis restante (para evitar re-gastar créditos DataForSEO)
- Conferir custos por município e total da sessão
- Ver track IDs para debugging
- Re-executar buscas com cache expirado

Os dados já existem nas 3 camadas de persistência:

| Camada | Onde | Dado |
|--------|------|------|
| Supabase | `discovery_searches` | id, categorias, lat/lng, raio, total_count, cost_usd, created_at, search_metadata |
| Redis | `discovery:{cats}:{lat}:{lng}:{radiusKm}` | Payload completo da busca (TTL 24h) |
| Supabase | `discovery_listings` (COUNT por search_id) | Quantos listings foram salvos |

**Nenhum componente ou API expõe esses dados ao usuário.** O `searchMeta` (tracker_id, offsets_used, remaining) vive apenas no estado React e desaparece ao navegar.

## Decisão

Implementar **Discovery Session Log** — painel na parte inferior da página `/admin/discovery` que lê `discovery_searches` (Supabase) + Redis TTL e mostra o histórico recente de buscas.

### Nível 1: API de sessão

`GET /api/discovery/sessions` — retorna as últimas 50 buscas com:

- Dados da busca (categorias, lat/lng, raio, total_count, cost_usd, created_at)
- Cache TTL restante via Redis (`TTL discovery:{cats}:{lat}:{lng}:{radiusKm}`)
- Contagem de listings salvos (do Supabase `discovery_listings`)
- Sumário da sessão (total de buscas, custo total, caches ativos)

### Nível 2: Componente DiscoverySessionLog

Client component (`'use client'`) com:
- Chip de status: 🟢 Cache ativo · 🔴 Expirado
- Tabela/Timeline com busca, cidade (via Nominatim), listings, custo, TTL
- Ação de re-executar busca com parâmetros salvos
- Sumário no cabeçalho: total de buscas, custo, caches ativos

### Arquitetura

```
┌─ discovery/page.tsx ─────────────────────────────────┐
│  ... resultados, tabela, métricas ...                 │
│  ┌─ DiscoverySessionLog.tsx ('use client') ──────────┐│
│  │  useEffect → GET /api/discovery/sessions          ││
│  │  ┌──────────────────────────────────────────────┐ ││
│  │  │ 🟢 dentist · Vitória · 896 leads · 22h TTL  │ ││
│  │  │ 🟢 dentist · Serra · 234 leads · 22h TTL    │ ││
│  │  │ 🔴 barber · Vitória · expirado              │ ││
│  │  └──────────────────────────────────────────────┘ ││
│  └───────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

## Implementação

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | `docs/adr/0029-discovery-session-log.md` | Este ADR |
| 2 | `apps/web/src/app/api/discovery/sessions/route.ts` | GET endpoint |
| 3 | `apps/web/src/components/DiscoverySessionLog.tsx` | Componente client |
| 4 | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx` | Integrar componente |
| 5 | `apps/web/src/middleware.ts` | Adicionar rota pública |

## Custos

| Recurso | Custo |
|---------|-------|
| Supabase `discovery_searches` SELECT | $0 |
| Redis TTL (~50 keys) | $0 (local :6396) |
| **Total** | **$0** |

## Referências

- `apps/web/src/lib/discovery-cache.ts` — Redis cache layer
- `apps/web/src/lib/discovery-persistence.ts` — Supabase persistence
- `apps/web/src/app/api/coverage/pins/route.ts` — padrão de query discovery_searches
- `apps/web/src/middleware.ts` — matcher de rotas públicas
- ADR-0025 — RM Intelligent Discovery
- ADR-0026 — Coverage Planner
