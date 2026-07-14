---
id: adr-0015
title: Arquitetura Real — EVO-API (Axum Rust) + rsxt + Cloudflare + Railway
status: superseded
date: 2026-07-14
deciders: founder, claude
supersedes: [adr-0014]
extends: [adr-0008, adr-0010, adr-0011]
---

# ADR-0015 · Arquitetura Real — O que já temos em Rust + Cloud

## Contexto

A ADR-0014 propôs Hono + FastAPI como backend. Mas essa análise ignorou um ativo crítico: **o EVO-API já é um backend Rust completo e maduro**. Adicionar Python/FastAPI seria redundante.

### O que já existe em Rust (EVO-API + rsxt)

| Módulo EVO-API | Crate | O que faz | Estado |
|---------------|-------|-----------|:------:|
| **HTTP Server** | `evo-api-http` | Axum 0.8 + utoipa OpenAPI/Swagger | ✅ Produção |
| **MCP Server** | `evo-mcp` | JSON-RPC 2.0 sobre SSE, 76 tools | ✅ Produção |
| **Capabilities** | `evo-capability` | Registry de 76 capabilities com schema canônico | ✅ Produção |
| **DataForSEO** | `evo-provider-dataforseo` | 9 módulos, ~30 endpoints traduzidos | ✅ Produção |
| **DAG (Brain)** | `evo-superadmin` | c0-c4 recuperadores, re-rank, grounding, cache | ✅ Produção |
| **Qwen Local** | `chat_brain.rs` | Qwen 2.5 1.5B via CLI, GroundedPrompt, $0 | ✅ Produção |
| **DeepSeek** | `c2_deepseek()` | Árbitro cost-capped ($0.02) | ✅ Produção |
| **Embedding** | `evo-evidence-semantic` | Interface de embedding | ✅ Produção |
| **Vault (R2)** | BlobStore trait | Write-ahead via S3 API | ✅ Produção |
| **OODA Loop** | `chat_ooda.rs` | 12 containers, 3 tiers bypass, pattern cache | ✅ Produção |
| **Surface (UI)** | `surface.rs` | Geração de HTML/CSS via vocab + Qwen | ✅ Produção |
| **rsxt s0** | filesystem cognitivo | audit + commits + tier manager | ✅ Produção |
| **rsxt v0** | vetores | SENSOR (candidates), HNSW, hybrid search | ✅ Produção |
| **rsxt k0** | knowledge graph | BFS/DFS, edges confirmados, Fjall soberano | ✅ Produção |
| **rsxt f0** | finance/BOA | BOA score canônico | ✅ Produção |
| **rsxt t0** | time-series | OHLCV, auto-downsampling | ✅ Produção |

**Conclusão:** O EVO-API já é o backend que precisamos. Já tem HTTP, MCP, IA, embedding, vault, DAG, Qwen, DeepSeek. **Não precisamos de Hono, FastAPI, ou Python.** Precisamos apenas deployar o que já existe.

## Decisão

**Adotamos EVO-API (Axum Rust) como backend principal no Railway. Cloudflare Workers + Hono apenas para edge routing leve. Zero Python — o Rust já cobre tudo.**

### Arquitetura real (3 provedores + Rust)

```
┌──────────────────────────────────────────────────────────────────┐
│                   ADSENTICE CLOUD v2                             │
│                                                                  │
│  Cloudflare (Free)           Railway ($5/mo)        Supabase     │
│  ─────────────────           ────────────────        ────────     │
│                              ┌────────────────────┐              │
│  Pages (React 19 + Vite)     │ EVO-API (Axum)     │   PostgreSQL │
│  └── frontend estático       │ └── :7700 HTTP      │   └── dados │
│                              │ └── :7700 MCP/SSE   │              │
│  Workers + Hono (edge)       │ └── 76 capabilities │   Auth       │
│  └── webhooks Stripe/z-api   │ └── DAG (c0-c4)    │   └── OAuth  │
│  └── health checks           │ └── Qwen 1.5B ($0) │              │
│  └── cache routing           │ └── DeepSeek proxy │   Storage    │
│  └── rate limiting           │ └── rsxt (s0,v0,k0)│   └── PDFs   │
│                              │ └── embed mpnet    │              │
│  KV (cache L1)               │ └── OODA loop      │   Realtime   │
│  └── scoring cache <1ms      │ └── vault (R2)     │              │
│                              │ └── OpenAPI/Swagger│   Edge Funcs │
│  R2 (vault + assets)         │                     │   └── hooks │
│  └── 10 GB free              │  Redis :6396        │              │
│                              │  └── BOA + cache   │              │
│  D1 (analytics cache)        │                     │              │
│  └── 5 GB SQLite edge        │  Qdrant :6352       │              │
│                              │  └── 4 coleções    │              │
│  Queues (async jobs)         │                     │              │
│  └── L3/L4 enrichment        │  Railway MCP        │              │
│                              │  └── deploy/logs   │              │
│  AI Gateway (LLM cache)      │                     │              │
│                              │  Docker: 1 container│              │
│  Email Routing               │  48 vCPU, 48GB RAM │              │
│  └── @adsentice.com.br       │  Custo: R$28/mês   │   Custo: R$0 │
│                              │                     │              │
│  Custo: R$0/mês              │  ┌─────────────────┐│              │
│                              │  │ ZERO Python      ││              │
│                              │  │ ZERO FastAPI     ││              │
│                              │  │ ZERO Hono (main) ││              │
│                              │  │ TUDO em Rust     ││              │
│                              │  └─────────────────┘│              │
└──────────────────────────────────────────────────────────────────┘
```

### Por que NÃO Python/FastAPI

| Serviço proposto (ADR-0014) | Já existe em Rust | Motivo para não duplicar |
|------------------------------|:-----------------:|--------------------------|
| FastAPI (IA) | `chat_brain.rs` (Qwen) + `c2_deepseek()` | Qwen já roda em Rust via CLI subprocess. DeepSeek já tem cliente Rust. |
| FastAPI (embedding) | `evo-evidence-semantic` | Interface de embedding já existe em Rust |
| Hono API principal | `evo-api-http` (Axum) | Axum 0.8 em Rust é mais rápido que Hono. Já tem OpenAPI/Swagger. |
| Hono para MCP | `evo-mcp` | MCP server nativo em Rust, 76 tools registradas |
| Python para AI Workers | Não necessário | Rust cobre tudo via Axum + subprocess |
| Redis em container separado | Sidecar no mesmo container | 48 GB RAM no Railway — Redis cabe como processo filho |

### O que Cloudflare Workers + Hono fazem (e só isso)

Workers são **edge routing leve**. NÃO substituem o backend Rust. Suas funções:

| Worker | Função | Por que não fazer no Axum |
|--------|--------|--------------------------|
| **Webhook Stripe** | Receber POST do Stripe, enfileirar no Queues | Precisa ser rápido (<10ms), edge global |
| **Webhook z-api.io** | Receber mensagens WhatsApp | Idem — processamento mínimo, só enfileirar |
| **Cache routing** | Verificar KV antes de bater no Railway | Economiza latência inter-provedor |
| **Rate limiting** | Limitar antes de chegar no backend | Edge é o lugar certo para rate limit |
| **Health checks** | `/healthz` público | Não precisa acordar o container Railway |

**Regra:** Se o Worker tem >20 linhas de lógica de negócio → vai pro Axum. Worker só enfileira, cacheia, redireciona.

### Cloudflare Workers: Rust vs Hono

| Critério | workers-rs (Rust) | Hono (TypeScript) |
|----------|:-----------------:|:-----------------:|
| **Compilação** | wasm32-unknown-unknown | JS nativo |
| **Tamanho do bundle** | ~200 KB (wasm) | ~5 KB (JS) |
| **Cold start** | ~5ms (wasm) | ~1ms (JS) |
| **Axum compatível** | ❌ Axum não compila para WASM | N/A |
| **Ecossistema** | Limitado (workers-rs é comunidade) | Rico (npm, Cloudflare SDK) |
| **Manutenção** | Complexa (cross-compilation) | Simples |

**Decisão:** Hono para Workers. É 5 KB, cold start <1ms, e o código é trivial (só webhooks e cache routing). Não vale a pena compilar Rust para WASM para 20 linhas de lógica.

### Railway: por que é o lugar certo para o EVO-API

| Necessidade | Railway Hobby ($5) | Suporta? |
|------------|:------------------:|:--------:|
| Binário Rust (EVO-API) | Dockerfile com `cargo build --release` | ✅ |
| 48 vCPU / 48 GB RAM | Qwen 1.5B usa ~1.5 GB, sobre 46 GB livre | ✅ |
| Redis sidecar | Processo filho no mesmo container | ✅ |
| Qdrant sidecar | Ou Qdrant Cloud (1 GB free) | ✅ |
| Deploy via MCP | `railway setup agent` → Claude gerencia | ✅ |
| Cold start (Hobby) | Container dorme após inatividade, acorda em ~2s | ⚠️ |
| Domínio customizado | `api.adsentice.com.br` | ✅ |
| Logs + monitoramento | Railway dashboard + CLI | ✅ |
| Cron jobs | Cron Triggers no Railway | ✅ |

### O que o rsxt entrega dentro do EVO-API

| Engine | Uso no adsentice |
|--------|-----------------|
| **rsxt s0** | Audit trail de todas as descobertas (commit-level tracking) |
| **rsxt v0** | Substitui Qdrant para embeddings locais ($0, sem cloud) |
| **rsxt k0** | Semantic Registry (50 nós SGA) — grafo soberano Fjall |
| **rsxt f0** | BOA score canônico (já temos via Python, pode migrar) |
| **rsxt t0** | Time-series de scores por lead (evolução mensal) |

### Custos reais

| Provedor | Uso | Custo |
|----------|-----|:-----:|
| Cloudflare | Pages + Workers (5) + KV + R2 + D1 + Queues + AI Gateway + Email | **R$0** |
| Railway Hobby | EVO-API (Axum Rust) + Redis + Qdrant sidecar | **R$28** ($5) |
| Supabase Free | PostgreSQL + Auth + Storage + Realtime | **R$0** |
| z-api.io | WhatsApp Hub (ADR-0013) | **R$99** |
| **TOTAL** | | **~R$127/mês** |

### Docker Compose no Railway (1 container)

```yaml
# railway.json ou Dockerfile multi-process
services:
  evo-api:
    build: ./EVO-API
    command: cargo run --release
    ports: ["7700:7700", "7701:7701"]
  redis:
    image: redis:7-alpine
    ports: ["6396:6379"]
  qdrant:
    image: qdrant/qdrant
    ports: ["6352:6333"]
```

Ou um único Dockerfile com `supervisord` gerenciando os 3 processos.

### Roadmap de migração (revisado)

#### Fase 1 · Agora — Preparação
- [ ] Criar conta Railway, conectar MCP
- [ ] Containerizar EVO-API (Dockerfile)
- [ ] Deploy EVO-API no Railway (teste)
- [ ] Conectar adsentice ao EVO-API remoto (não localhost :7700)

#### Fase 2 · Semana 1 — Cloudflare Edge
- [ ] Workers + Hono: webhook Stripe, webhook z-api.io, cache routing
- [ ] KV: cache L1 de scoring e templates
- [ ] R2: vault de dados pagos (já wireado no `r2-vault.ts`)
- [ ] Pages: frontend React 19 + Vite (estático)

#### Fase 3 · Semana 2 — Migração Backend
- [ ] Migrar `discovery-search/route.ts` → chamar EVO-API Axum (não mais localhost)
- [ ] Migrar `evo-mcp.ts` → apontar para EVO-API no Railway
- [ ] Redis OODA no Railway (ou manter local até validar)
- [ ] Qdrant Cloud (ou rsxt v0 local no Railway)

#### Fase 4 · Semana 3 — Inteligência
- [ ] Brain OODA do adsentice → delegar para DAG do EVO-API (evitar duplicação)
- [ ] Semantic Registry → migrar para rsxt k0 (grafo soberano)
- [ ] BOA score → migrar para rsxt f0 (canônico)

## Prova (medido)

- EVO-API: 25 crates Rust, Axum 0.8, 76 capabilities, MCP server SSE (fonte: `crates/evo-api-http/Cargo.toml`, `crates/evo-mcp/`)
- rsxt: 5 engines Rust (s0, v0, k0, f0, t0) — fonte: `rsxt:PLAN-RSXT-001-master-roadmap.md`
- Cloudflare Workers + Hono: 5 KB, cold start <1ms (fonte: hono.dev, developers.cloudflare.com)
- Railway Hobby: $5/mês, 48 vCPU, 48 GB RAM, Docker nativo (fonte: docs.railway.com/pricing)
- ZERO Python/FastAPI — Rust cobre tudo
- Custo total: R$127/mês

## Referências
- ADR-0008 (EVO-API Motor L0-L4)
- ADR-0010 (Cloudflare Free Tier Enterprise)
- ADR-0011 (Brain OODA)
- ADR-0014 (Arquitetura DevOps — superceded by this ADR)
- EVO-API `crates/evo-api-http/Cargo.toml` (Axum 0.8 + utoipa)
- EVO-API `crates/evo-mcp/` (MCP server)
- EVO-API `crates/evo-superadmin/src/dag.rs` (DAG)
- EVO-API `crates/evo-superadmin/src/chat_brain.rs` (Qwen)
- rsxt `PLAN-RSXT-001-master-roadmap.md`
- Railway: docs.railway.com
- Cloudflare Workers: developers.cloudflare.com/workers
