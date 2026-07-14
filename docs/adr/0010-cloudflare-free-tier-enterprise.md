---
id: adr-0010
title: Cloudflare Free Tier como Plataforma Enterprise — Workers, D1, Queues, R2
status: accepted
date: 2026-07-13
deciders: founder, claude
extends: [adr-0001, adr-0008, adr-0009]
---

# ADR-0010 · Cloudflare Free Tier como Plataforma Enterprise

## Contexto

O adsentice opera com infraestrutura 100% local (Redis :6396, Qdrant :6352, Embed :8081, EVO-API :7700) + Supabase (Postgres cloud, free tier) + DataForSEO (API paga). O frontend roda em Next.js :3000 local, sem deploy cloud.

O R2 (Cloudflare) está configurado com credenciais no `.env` e `packages/vault/` testado (6/6), mas **nunca foi wireado no pipeline**. O adsentice não tem:
- Cron jobs — o `CronCreate` do Claude Code é session-only (morre quando o Claude sai)
- Workers para processamento assíncrono — todo o pipeline é síncrono (request → response)
- Cache edge — depende de Redis local (:6396) com latência de rede local
- Fila de mensagens — usa `Promise.allSettled` dentro do ciclo HTTP (frágil para L3/L4)

A Cloudflare oferece **plano gratuito** com 10+ produtos que resolvem todos esses gaps, sem custo.

## Decisão

**Adotamos Cloudflare Free Tier como plataforma enterprise complementar ao Supabase.** Cada produto resolve um gap específico do adsentice, com zero custo incremental.

### Produtos adotados (wire imediato)

| Produto | Limite Free | Gap resolvido | Status |
|---------|:-----------:|---------------|:------:|
| **R2** | 10 GB | Vault de blobs imutáveis (write-ahead log) | ✅ `r2-vault.ts` wireado |
| **Workers + Cron Triggers** | 100K req/dia | Cron jobs persistentes (substitui `CronCreate` session-only) | ⬜ próximo |
| **D1** (SQLite edge) | 5 GB | Cache de Market Intelligence (50ms edge vs 500ms Supabase) | ⬜ próximo |
| **Queues** | 1M ops/mês | Fila assíncrona para enrichment L3/L4 | ⬜ v0.7 |
| **Email Routing** | Ilimitado | Email profissional `@adsentice.com.br` | ⬜ setup DNS |

### Produtos em avaliação (futuro)

| Produto | Limite Free | Potencial adsentice |
|---------|:-----------:|---------------------|
| **KV** | 1 GB | Cache de scoring (<1ms, 99.999% SLA) |
| **Durable Objects** | 1M req/mês | Stateful compute para batch processing de leads |
| **AI Gateway** | 100K req/mês | Cache + rate limit para DeepSeek (evita custo repetido) |
| **Browser Rendering** | 500 req/mês | Screenshot de sites dos leads (substitui Lighthouse $0.00425) |
| **Zaraz** | Ilimitado | Server-side GA4/GTM — analytics LGPD-compliant |
| **Pages** | 500 builds/mês | Deploy do frontend (alternativa à Vercel) |

### Arquitetura com Cloudflare

```
┌─────────────────────────────────────────────────────┐
│  Cloudflare Edge (Free Tier)                        │
│                                                     │
│  Workers + Cron Triggers                            │
│  ├── adsentice-weekly-ingest (segunda 08:57)        │
│  │   self-ingest → history-ingest → BOA recalc      │
│  ├── adsentice-market-cache (diário 06:00)          │
│  │   pré-computa TOP 10 gaps por categoria×cidade   │
│  └── adsentice-vault-gc (domingo 03:00)             │
│      dedup + compactação do R2                      │
│                                                     │
│  D1 (SQLite Edge)                                   │
│  ├── market_intel_cache (5 GB)                      │
│  │   queries agregadas pré-computadas               │
│  └── replicação do Supabase (read-only)             │
│                                                     │
│  Queues                                             │
│  ├── enrichment-l3-queue                            │
│  │   domain_competitors + keyword_research          │
│  └── enrichment-l4-queue                            │
│      ai_llm_mentions + content_sentiment            │
│                                                     │
│  R2 (10 GB)                                         │
│  ├── v2/{search_id}/{place_id}.json                 │
│  │   blobs imutáveis (write-ahead)                  │
│  └── reports/{category}/{city}/{date}.pdf           │
│      relatórios de Market Intelligence              │
│                                                     │
│  KV (1 GB)                                          │
│  ├── scoring-cache (TTL 24h)                        │
│  └── geo-cache (capitais → coordenadas)             │
└─────────────────────────────────────────────────────┘
```

### Custos (plano free vs pago)

| Cenário | Custo/mês |
|---------|:---------:|
| **Atual (free)** — R2 10GB + Workers 100K/dia + D1 5GB + Queues 1M | **$0** |
| **Scale** — 100K+ leads, R2 50GB, Workers 10M/dia, D1 20GB, Queues 10M | ~$25/mês |
| **Enterprise** — R2 500GB, Workers 100M/dia, D1 200GB, Argo Smart Routing | ~$250/mês |

O plano free cobre **MVP até ~10.000 leads enriquecidos** sem custo de infraestrutura Cloudflare.

## Consequências

### Positivas
- **Cron jobs persistentes**: Workers + Cron Triggers não dependem do Claude Code estar rodando
- **Cache edge global**: D1 serve queries de Market Intel em <50ms (vs 500ms Supabase)
- **Fila assíncrona**: L3/L4 não bloqueiam mais o request HTTP — enfileira e processa depois
- **Vault imutável**: R2 com `If-None-Match: *` garante que blob nunca é sobrescrito
- **Email profissional**: `@adsentice.com.br` grátis via Email Routing
- **Custo zero**: plano free generoso cobre MVP completo

### Negativas
- **Vendor lock-in**: Workers, D1, Queues são APIs proprietárias da Cloudflare
- **Complexidade**: +1 plataforma para gerenciar (além de Supabase + local)
- **Limites free**: 100K req/dia Workers pode ser pouco se o Market Intel for muito acessado
- **Cold start**: Workers têm cold start de ~50ms (D1 mitiga com cache)

## Implementação (Roadmap)

### Fase 1 · Agora — Wire R2 + Cron
- [x] `r2-vault.ts`: write-ahead log no pipeline Discovery
- [x] `adsentice_weekly_ingest.sh`: pipeline semanal de ingest
- [x] CronCreate session-based (temporário até Worker)

### Fase 2 · v0.7 — Workers + Cron Triggers
- [ ] Worker `adsentice-weekly-ingest`: substitui CronCreate session-only
- [ ] Worker `adsentice-market-cache`: pré-computa TOP 10 gaps (diário 06:00)
- [ ] Email Routing: `jeferson@adsentice.com.br`

### Fase 3 · v0.8 — D1 + Queues
- [ ] D1: `market_intel_cache` — queries agregadas pré-computadas
- [ ] Queues: `enrichment-l3-queue` — domain_competitors async
- [ ] KV: `scoring-cache` com TTL 24h (substitui Redis para cache de scoring)

### Fase 4 · v0.9 — AI Gateway + Pages
- [ ] AI Gateway: cache + rate limit para DeepSeek
- [ ] Pages: deploy do frontend (alternativa à Vercel)
- [ ] Browser Rendering: screenshots de leads (substitui Lighthouse)

## Prova (medido)

- R2 configurado: `CLOUDFLARE_R2_ACCOUNT_ID`, `ACCESS_KEY`, `SECRET_KEY`, `BUCKET` no `.env`
- `packages/vault/`: 6/6 testes passando (`npm test -w @adsentice/vault`)
- `apps/web/src/lib/r2-vault.ts`: wireado no `discovery-search/route.ts` (commit `6b752a8`)
- Cloudflare Free Tier documentado: <https://developers.cloudflare.com/workers/platform/pricing/>
- Cron semanal registrado: `CronCreate` job `0a54a925` (segunda 08:57)

## Referências
- ADR-0001 (Arquitetura Standalone adsentice)
- ADR-0008 (EVO-API como Motor de Enriquecimento L0-L4)
- ADR-0009 (Market Intelligence Engine)
- `apps/web/src/lib/r2-vault.ts` — Vault write-ahead R2
- `packages/vault/src/impl/r2-blob-store.ts` — R2BlobStore (S3 API)
- `tools/adsentice_weekly_ingest.sh` — Pipeline semanal
- <https://developers.cloudflare.com/workers/platform/pricing/>
