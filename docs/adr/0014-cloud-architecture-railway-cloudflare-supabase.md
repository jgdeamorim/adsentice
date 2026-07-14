---
id: adr-0014
title: Arquitetura DevOps Completa — Cloudflare + Railway + Supabase + Qdrant
status: superseded
date: 2026-07-14
deciders: founder, claude
extends: [adr-0008, adr-0010, adr-0011, adr-0013]
---

# ADR-0014 · Arquitetura DevOps — Cloudflare + Railway + Supabase

## Contexto

O adsentice roda 100% local (Next.js :3000, EVO-API :7700, Redis :6396, Qdrant :6352, Embed :8081). Isso funciona para desenvolvimento mas não escala. Precisamos de uma arquitetura cloud que:

1. **Mantenha custo mínimo** ($0-5/mês no início)
2. **Suporte Python** para serviços de IA (embeddings, Qwen local, DeepSeek)
3. **Suporte TypeScript** para API e frontend
4. **Tenha MCP server nativo** para gerenciar infraestrutura via Claude
5. **Separe responsabilidades**: edge (CDN/cache) vs backend (processamento pesado) vs dados (Postgres/vetores)

O Railway foi avaliado como alternativa ao VPS. O plano Hobby ($5/mês) oferece **48 vCPU, 48 GB RAM, 100 GB ephemeral, 5 GB volume** — essencialmente um servidor dedicado por R$28/mês.

## Decisão

**Adotamos uma arquitetura de 3 provedores, cada um fazendo o que faz melhor:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADSENTICE CLOUD                              │
│                                                                 │
│  Cloudflare (Free)          Railway ($5/mo)       Supabase      │
│  ─────────────────          ────────────────       ────────      │
│  Pages (frontend)           Hono API (backend)    PostgreSQL    │
│  Workers (lightweight)      FastAPI (AI svc)      Auth (OAuth)  │
│  KV (cache L1)              Qwen 2.5 1.5B ($0)   Storage (S3)  │
│  R2 (assets, vault)         Embed mpnet 768d      Realtime      │
│  D1 (cache analytics)       DeepSeek proxy        RLS           │
│  Queues (async jobs)        Redis (OODA+BOA)      Edge Functions│
│  Vectorize (cache L2)       Cron jobs             Migrations    │
│  Email Routing (email)      WebSocket server                   │
│  AI Gateway (LLM cache)     MCP server                         │
│                             ─────────────────                  │
│  Custo: R$0/mês             Docker containers      Custo: R$0  │
│  Edge global <50ms          Deploy via Railway MCP             │
│  CDN + WAF + DDoS                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           SEMANTIC INTELLIGENCE LAYER                    │   │
│  │                                                         │   │
│  │  Qdrant Cloud (Free 1GB)                                │   │
│  │  └── embeddings + semantic search + KG                  │   │
│  │                                                         │   │
│  │  Railway MCP (infra as code)                            │   │
│  │  └── deploy, logs, env vars, redeploy via Claude        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Por que 3 provedores (não 1)

| Provedor único | Problema |
|---------------|----------|
| **Só Cloudflare** | Workers têm 128MB RAM e 10ms CPU — não roda Python, Qwen, Redis, Qdrant |
| **Só Railway** | Sem CDN global, sem KV/edge cache, sem R2 barato |
| **Só Supabase** | Sem edge computing, sem Python, sem workers, sem cache |

A combinação cobre todos os gaps com **R$28/mês** total.

### Responsabilidades por provedor

#### Cloudflare (Free Tier) — Edge & Cache

| Serviço | Função | Justificativa |
|---------|--------|--------------|
| **Pages** | Hospedar frontend React 19 + Vite (estático) | CDN global, deploy automático GitHub, HTTPS grátis |
| **Workers** | API leve: webhooks, redirects, health checks | 100K req/dia free, Hono framework, <50ms global |
| **KV** | Cache L1 de scoring, templates, intents | Leitura <1ms, 99.999% SLA, 1 GB free |
| **R2** | Vault de blobs (dados pagos), assets estáticos | 10 GB free, egress zero, S3-compatible |
| **D1** | Cache de analytics, market intel pré-computado | 5 GB free, SQLite edge, replicação global |
| **Queues** | Fila assíncrona para enrichment L3/L4 | 1M ops/mês free, substitui Promise.allSettled frágil |
| **AI Gateway** | Cache + rate limit para DeepSeek | Evita custo repetido, analytics de uso |
| **Email Routing** | `jeferson@adsentice.com.br` | Ilimitado free |
| **Vectorize** | Cache L2 de embeddings (consultas repetidas) | Integrado com Workers |

#### Railway ($5/mo Hobby) — Backend & AI

| Serviço | Função | Justificativa |
|---------|--------|--------------|
| **Hono API** | API principal (substitui Next.js API Routes) | 5 KB, cold start <50ms, roda em Node/Bun/Deno |
| **FastAPI** | Serviço de IA: embeddings, Qwen, DeepSeek proxy | Python nativo, suporte a ML/libs |
| **Qwen 2.5 1.5B** | LLM local ($0, peso aberto) | 1.5 GB RAM, cabe no Hobby (48 GB) |
| **Redis** | OODA + BOA + cache scoring | Essencial para estado. KV não substitui Pub/Sub e Streams |
| **Embed mpnet 768d** | Serviço de embedding | GPU não necessária, CPU inference ok |
| **Cron Jobs** | Self-ingest semanal, BOA recalc, health checks | Substitui CronCreate session-only |
| **WebSocket** | Realtime updates para Cockpit TOP-K | Supabase Realtime como alternativa |
| **MCP Server** | Gerenciar infra pelo Claude (deploy, logs, env) | Railway MCP nativo |

#### Supabase (Free Tier) — Dados

| Serviço | Função | Justificativa |
|---------|--------|--------------|
| **PostgreSQL** | Fonte da verdade: usuários, leads, scores | 500 MB free, backups automáticos |
| **Auth** | OAuth, JWT, RLS | Integrado, gratuito até 50K MAU |
| **Storage** | Assets de landing pages, PDFs de relatórios | 1 GB free, S3-compatible |
| **Realtime** | Live updates para Cockpit TOP-K | Websocket gerenciado, 2M mensagens/mês free |
| **Edge Functions** | Webhooks críticos (Stripe, z-api.io) | Deno runtime, 500K invocações/mês free |
| **Migrations** | Schema versionado | Já temos 3 migrations |

#### Qdrant Cloud (Free 1GB) — Vetores

| Função | Justificativa |
|--------|--------------|
| **Semantic Search** | 1 GB free, filtros avançados, snapshots |
| **KG Embeddings** | adsentice-self + adsentice-conversation + claude-memory |
| **Semantic Registry** | 50 nós SGA, busca por intent |

### Fluxo de uma requisição

```
Usuário → Cloudflare Pages (React 19, estático)
              │
              ├─ Cache KV? → sim → retorna instantâneo (<10ms)
              │
              ▼ (miss)
         Cloudflare Workers (Hono API)
              │
              ├─ Cache D1? → sim → retorna
              │
              ▼ (miss)
         Railway (Hono API principal)
              │
              ├──────→ Supabase (dados, auth)
              ├──────→ Qdrant (embeddings, busca semântica)
              ├──────→ Redis (cache L3, OODA, BOA)
              └──────→ FastAPI (Qwen, DeepSeek, embedding)

         Railway Cron (self-ingest semanal, BOA recalc)
              │
              ├──────→ Supabase (leitura de dados)
              ├──────→ Qdrant (upsert embeddings)
              └──────→ Cloudflare KV (invalida cache)
```

### Custos mensais (MVP)

| Provedor | Plano | Custo |
|----------|-------|:-----:|
| Cloudflare | Free | **R$0** |
| Railway | Hobby | **R$28** ($5) |
| Supabase | Free | **R$0** |
| Qdrant Cloud | Free (1 GB) | **R$0** |
| z-api.io (WhatsApp) | Ultimate | **R$99** |
| **TOTAL** | | **~R$127/mês** |

### Comparação com outras arquiteturas

| Arquitetura | Custo/mês | CDN | Python | MCP | Edge Cache |
|-------------|:---------:|:---:|:------:|:---:|:----------:|
| **Cloudflare + Railway + Supabase** (esta ADR) | **R$127** | ✅ | ✅ | ✅ | ✅ |
| Só Railway | ~R$56 ($10 Pro) | ❌ | ✅ | ✅ | ❌ |
| Só Cloudflare | R$0 | ✅ | ❌ | ❌ | ✅ |
| VPS (Hetzner) | ~R$50 | ❌ | ✅ | ❌ | ❌ |
| Vercel + Railway | ~R$150 | ✅ | ✅ | ❌ | ❌ |
| Atual (100% local) | R$0 | ❌ | ✅ Local | ❌ | ❌ |

### O que o Railway MCP entrega

O Railway expõe um MCP server que permite ao Claude gerenciar infraestrutura:

```
Claude Code → Railway MCP → deploy, logs, env vars, redeploy
```

Isso significa que podemos **fazer deploy direto do Claude** sem sair do terminal. O comando `railway setup agent` conecta o MCP local. Comandos disponíveis:

| Tool | Função |
|------|--------|
| `list-projects` | Listar todos os projetos |
| `create-project` | Criar novo projeto |
| `deploy` | Fazer deploy de um serviço |
| `list-variables` | Listar variáveis de ambiente |
| `set-variables` | Configurar env vars |
| `get-logs` | Ver logs em tempo real |
| `redeploy` | Redeploy de serviço específico |
| `railway-agent` | Delegar debug complexo para IA do Railway |

### Roadmap de migração

#### Fase 1 · Agora — Preparação
- [x] ADR-0014 (esta decisão)
- [ ] Criar conta Railway ($5 Hobby)
- [ ] Conectar Railway MCP (`railway setup agent`)
- [ ] Migrar Redis OODA para Railway (Docker redis:7-alpine)
- [ ] Migrar Embed para Railway (FastAPI + sentence-transformers)

#### Fase 2 · Semana 1 — Backend
- [ ] Criar serviço Hono no Railway (API principal)
- [ ] Migrar `/api/discovery-search` → Hono
- [ ] Migrar `/api/semantic-registry` → Hono  
- [ ] Criar serviço FastAPI (Python) no Railway (IA + embedding)
- [ ] Configurar Docker Compose no Railway (Redis + Hono + FastAPI)

#### Fase 3 · Semana 2 — Frontend
- [ ] React 19 + Vite (substituir Next.js)
- [ ] shadcn/ui (substituir MUI/Materio)
- [ ] Deploy estático no Cloudflare Pages
- [ ] Workers + KV para cache L1

#### Fase 4 · Semana 3 — Dados
- [ ] Migrar Qdrant local → Qdrant Cloud
- [ ] Cloudflare D1 para cache de analytics
- [ ] Cloudflare Queues para jobs assíncronos (L3/L4)
- [ ] Cloudflare AI Gateway para DeepSeek

#### Fase 5 · Semana 4 — Otimização
- [ ] Cloudflare Vectorize como cache L2 de embeddings
- [ ] Workers cron jobs (substituir CronCreate)
- [ ] CI/CD: GitHub → Cloudflare Pages + Railway deploy

## Consequências

### Positivas
- **Custo controlado**: R$127/mês total (cabe em 1 cliente Sentinela de R$197)
- **Edge global**: Cloudflare CDN em 330+ cidades
- **Python nativo**: Railway roda Docker, qualquer linguagem
- **MCP nativo**: Deploy e debug via Claude (`railway setup agent`)
- **Separação de responsabilidades**: cada provedor faz o que faz melhor
- **Escalabilidade**: Hobby (48 vCPU) → Pro (1000 vCPU) sem mudar código
- **Qwen local viável**: 48 GB RAM no Railway, Qwen 1.5B usa 1.5 GB

### Negativas
- **3 provedores para gerenciar**: complexidade operacional
- **Migração não-trivial**: Next.js → React+Vite, MUI → shadcn, local → cloud
- **Latência inter-provedor**: Railway (US) ↔ Supabase (CA) ↔ Qdrant Cloud ~20-50ms
- **Vendor lock-in triplo**: Cloudflare + Railway + Supabase
- **Cold start no Railway**: containers dormem no plano Hobby (acorda em ~2s)

### Mitigações
- Railway MCP reduz complexidade operacional (tudo gerenciado via Claude)
- Migração em fases: backend primeiro, frontend depois
- Cloudflare Workers + KV como cache L1 absorve 80%+ do tráfego (evita hit no Railway)
- Supabase é open source (pode migrar para self-hosted)
- Qdrant é open source (pode voltar para local se necessário)

## Prova (medido)

- Railway Hobby: $5/mês por 48 vCPU, 48 GB RAM, 100 GB storage (fonte: docs.railway.com/pricing)
- Railway MCP: 8 tools + railway-agent (fonte: docs.railway.com/ai/mcp-server)
- Cloudflare Free: Workers 100K/dia, KV 1 GB, R2 10 GB, Queues 1M/mês (fonte: ADR-0010)
- Supabase Free: 500 MB DB, 50K MAU auth, 1 GB storage (fonte: supabase.com/pricing)
- Qdrant Cloud Free: 1 GB cluster (fonte: qdrant.tech/cloud)
- Custo total: R$127/mês (Cloudflare R$0 + Railway R$28 + Supabase R$0 + Qdrant R$0 + z-api.io R$99)

## Referências
- ADR-0008 (EVO-API Motor L0-L4)
- ADR-0010 (Cloudflare Free Tier Enterprise)
- ADR-0011 (Brain OODA)
- ADR-0013 (Build vs Buy APIs)
- Railway: docs.railway.com, railway.com/mcp, $5 Hobby plan
- Cloudflare: ADR-0010, workers, kv, r2, d1, queues, ai-gateway
- Supabase: supabase.com, auth, storage, realtime, edge functions
- Qdrant Cloud: qdrant.tech/cloud
