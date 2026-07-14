---
id: adsentice-infrastructure-architecture
title: "Ads​entice — Arquitetura de Produção · Infra DevOps Completa"
status: living
type: architecture
version: "1.0.0"
date: 2026-07-14
sources:
  - ADR-0001 (Standalone)
  - ADR-0008 (EVO-API L0-L4)
  - ADR-0010 (Cloudflare Enterprise)
  - ADR-0011 (Brain OODA)
  - ADR-0016 (Ads.soberano)
  - ADR-0013 (Build vs Buy)
---

# Adsentice — Arquitetura de Produção

## Visão Geral

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       ADSENTICE PRODUÇÃO                                  │
│                                                                          │
│  ORQUESTRAÇÃO (Inteligência)          DADOS (Durabilidade)               │
│  ┌────────────────────────┐          ┌──────────────────────┐            │
│  │ Brain OODA v0.7        │          │ Supabase (Free)      │            │
│  │ └── c0→c1→B2→B3→D1→A3 │          │ ├── PostgreSQL        │            │
│  │ SGA (50 nós, 4 camadas)│          │ ├── Auth (OAuth/JWT)  │            │
│  │ SGA Health (4 dims)    │          │ ├── Storage (assets)  │            │
│  │ Scoring (37 sinais)    │          │ ├── Realtime (WS)     │            │
│  │ /dag (KG-first)        │          │ └── Edge Functions    │            │
│  └────────────────────────┘          └──────────────────────┘            │
│                                                                          │
│  EDGE (Cloudflare Free)                COMPUTE (Hetzner CAX11)           │
│  ┌────────────────────────┐          ┌──────────────────────┐            │
│  │ Pages (React 19 + Vite)│          │ Docker Compose        │            │
│  │ Workers + Hono (5)     │          │ ├── nextjs :3000      │            │
│  │ KV (cache L1)          │◄────────►│ ├── redis :6396       │            │
│  │ R2 (vault blobs)       │          │ ├── qdrant :6352      │            │
│  │ D1 (analytics cache)   │          │ ├── embed :8081       │            │
│  │ Queues (async L3/L4)   │          │ └── nginx :443        │            │
│  │ Email Routing           │          │ $5.39/mês             │            │
│  │ R$0/mês                │          │ 2 vCPU · 4 GB · 40 GB │            │
│  └────────────────────────┘          └──────────────────────┘            │
│                                                                          │
│  EXTERNAL APIs                          INTELIGÊNCIA (TypeScript)        │
│  ┌────────────────────────┐          ┌──────────────────────┐            │
│  │ DataForSEO MCP (direto)│          │ 13 padrões EVO/rsxt   │            │
│  │ z-api.io (WhatsApp)    │          │ absorvidos em TS       │            │
│  │ Resend (Email)         │          │ 23 módulos lib/        │            │
│  │ Stripe (Pagamento)     │          │ 6 módulos brain/       │            │
│  │ DeepSeek API (LLM)     │          │ 50 nós SGA             │            │
│  │ Supabase API (DB/Auth) │          │                        │            │
│  └────────────────────────┘          └──────────────────────┘            │
│                                                                          │
│  CUSTO TOTAL: ~R$129/mês                                                 │
│  ────────────────────────────────                                        │
│  Hetzner $5.39 + Cloudflare R$0 + Supabase R$0 + z-api.io R$99          │
└──────────────────────────────────────────────────────────────────────────┘

```

---

## 1. Camada de Compute — Hetzner CAX11 ($5.39/mês)

### 1.1 Servidor

| Recurso | Especificação |
|---------|:------------:|
| **Máquina** | CAX11 (ARM64 Ampere) |
| **vCPU** | 2 dedicados |
| **RAM** | 4 GB |
| **SSD** | 40 GB NVMe |
| **Rede** | 20 TB tráfego/mês |
| **IP** | 1 IPv4 fixo + 1 IPv6 /64 |
| **Localização** | Nuremberg (DE) ou Ashburn (US) |
| **Sistema** | Ubuntu 24.04 LTS |
| **Custo** | **$5.39/mês** (~R$30) |

### 1.2 Docker Compose — Serviços

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  # ── Reverse Proxy ──
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - certbot_data:/var/www/certbot
    depends_on:
      - nextjs
    restart: unless-stopped

  # ── Frontend ──
  nextjs:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - QDRANT_URL=http://qdrant:6333
      - EMBED_URL=http://embed:8081
      - DATAFORSEO_LOGIN=${DATAFORSEO_LOGIN}
      - DATAFORSEO_PASSWORD=${DATAFORSEO_PASSWORD}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - CLOUDFLARE_R2_ACCOUNT_ID=${CLOUDFLARE_R2_ACCOUNT_ID}
      - CLOUDFLARE_R2_ACCESS_KEY=${CLOUDFLARE_R2_ACCESS_KEY}
      - CLOUDFLARE_R2_SECRET_KEY=${CLOUDFLARE_R2_SECRET_KEY}
    depends_on:
      - redis
      - qdrant
      - embed
    restart: unless-stopped

  # ── Cache + OODA ──
  redis:
    image: redis:7-alpine
    ports:
      - "6396:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    restart: unless-stopped

  # ── Knowledge Graph ──
  qdrant:
    image: qdrant/qdrant:v1.13.6
    ports:
      - "6352:6333"
      - "6353:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

  # ── Embeddings ──
  embed:
    image: embed-server-rs
    ports:
      - "8081:8081"
    restart: unless-stopped

volumes:
  redis_data:
  qdrant_data:
  certbot_data:
```

### 1.3 Nginx Reverse Proxy

```nginx
# nginx/nginx.conf
events { worker_connections 1024; }

http {
    # adsentice principal
    server {
        listen 443 ssl http2;
        server_name adsentice.com.br;

        ssl_certificate     /etc/nginx/ssl/adsentice.pem;
        ssl_certificate_key /etc/nginx/ssl/adsentice.key;

        # Frontend
        location / {
            proxy_pass http://nextjs:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # API (WebSocket upgrade)
        location /api/ {
            proxy_pass http://nextjs:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

### 1.4 Deploy — CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: adsentice
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /opt/adsentice
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
            docker system prune -f
```

---

## 2. Camada Edge — Cloudflare (Free)

```
                ┌──────────────────────┐
                │   Cloudflare DNS     │
                │   adsentice.com.br   │
                └──────────┬───────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Pages   │    │ Workers  │    │  Email   │
    │ React 19 │    │ Hono API │    │ Routing  │
    │ + Vite   │    │ (5 edge) │    │          │
    └──────────┘    └──────────┘    └──────────┘
         │               │               │
    ┌────┴────┐    ┌─────┴─────┐    ┌───┴──────┐
    │   KV    │    │  Queues   │    │   R2     │
    │ Cache   │    │ Async L3  │    │  Vault   │
    │  L1     │    │   Jobs    │    │  10 GB   │
    └─────────┘    └───────────┘    └──────────┘
```

### 2.1 Workers List

| # | Worker | Rota | Função |
|:--:|--------|------|--------|
| 1 | `webhook-stripe` | `/hooks/stripe` | Receber POST do Stripe, enfileirar no Queues |
| 2 | `webhook-zapi` | `/hooks/zapi` | Receber POST do z-api.io (WhatsApp), enfileirar no Queues |
| 3 | `cache-router` | `/*` | Verificar KV antes de bater no Hetzner |
| 4 | `rate-limiter` | `/*` | Rate limit por IP (100 req/min) |
| 5 | `health-check` | `/healthz` | Health check público (sem acordar o VPS) |

### 2.2 Tech Stack Cloudflare

| Produto | Uso | Limite free |
|---------|-----|:-----------:|
| **Pages** | Hospedar frontend React 19 + Vite (estático) | 500 builds/mês |
| **Workers** | 5 workers edge (webhook, cache, rate-limit, health) | 100K req/dia |
| **KV** | Cache L1: scores, templates, intents | 1 GB |
| **R2** | Vault de blobs (write-ahead), assets estáticos | 10 GB |
| **D1** | Cache de analytics, market intel pré-computado | 5 GB |
| **Queues** | Fila async L3/L4 + webhooks | 1M ops/mês |
| **Email Routing** | `jeferson@adsentice.com.br` | Ilimitado |

### 2.3 SEO Config

```toml
# wrangler.toml
name = "adsentice"
main = "src/index.ts"
compatibility_date = "2026-07-14"

[[routes]]
pattern = "adsentice.com.br/*"
zone_name = "adsentice.com.br"

[[kv_namespaces]]
binding = "CACHE"
id = "adsentice-cache"

[[r2_buckets]]
binding = "VAULT"
bucket_name = "adsentice-vault"
```

---

## 3. Camada de Dados — Supabase (Free)

### 3.1 Esquema

| Tabela | Função | Colunas principais |
|--------|--------|-------------------|
| `discovery_searches` | Metadados das buscas | id, categories, lat, lng, radius_km, total_count, cost_usd, scores |
| `discovery_listings` | Leads enriquecidos | id, search_id(FK), place_id, 30+ colunas L0/L1/L2 |
| `customers` | Clientes pagantes | id, email, name, plan, stripe_id, created_at |
| `subscriptions` | Assinaturas ativas | id, customer_id(FK), plan, status, current_period_end |
| `sga_nodes` | Nós do Semantic Graph | id, type, name, intent, props(JSONB), edges(TEXT[]), mutation_id |

### 3.2 Serviços Supabase

| Serviço | Uso adsentice |
|---------|--------------|
| **Auth** | Login admin (email/senha ou Google OAuth) |
| **PostgreSQL** | Fonte da verdade: leads, clientes, assinaturas, SGA |
| **Storage** | Relatórios PDF, landing pages assets |
| **Realtime** | Cockpit TOP-K: updates ao vivo de score |
| **Edge Functions** | Webhooks críticos (Stripe customer.created) |
| **RLS** | Row Level Security: cliente só vê seus dados |

---

## 4. Camada de Inteligência — TypeScript Nativa

### 4.1 13 Padrões EVO-API/rsxt Absorvidos

| # | Padrão | Origem | Implementação | Status |
|:--:|--------|--------|--------------|:------:|
| 1 | **BOA Score** | `rsxt f0` | `adsentice_boa_score.py` | ✅ |
| 2 | **OODA Loop** | EVO-API Redis | Redis :6396 | ✅ |
| 3 | **Self-Ingest** | corpus-A | `adsentice_self_ingest.py` | ✅ |
| 4 | **Auto-Compact** | EVO-API ADR-0140 | `adsentice-pre-compact.py` | ✅ |
| 5 | **Capability Model** | `evo-capability` | SGA: 50 nós, 4 camadas | ✅ |
| 6 | **DAG (KG-first)** | `dag.rs` (c0-c4) | `/dag` skill | ✅ |
| 7 | **Re-rank Híbrido** | `dag.rs:340` | `c1-retriever.ts` | ✅ |
| 8 | **Grounding/Honestidade** | `dag.rs:400` | `d1-grounding.ts` | ✅ |
| 9 | **Self-Score Gate** | `chat_ooda.rs` | `b2-self-score.ts` | ✅ |
| 10 | **Bypass Tiers** | `chat_ooda.rs` | `b3-decide.ts` | ✅ |
| 11 | **Pattern Cache** | `dag.rs:169` | `a3-cache.ts` | ✅ |
| 12 | **Edge Quality** | `k0_breath.rs` | `sga-score.ts` | ✅ |
| 13 | **SGA** | SGA doc | `semantic-registry.ts` | ✅ |

### 4.2 Stack de Módulos

```
apps/web/src/lib/
├── brain/
│   ├── c0-interpreter.ts      ← classifica intenção
│   ├── c1-retriever.ts        ← re-rank híbrido
│   ├── b2-self-score.ts       ← certainty gateway
│   ├── b3-decide.ts           ← router bypass/cache/Claude
│   ├── d1-grounding.ts        ← honesty + grounding
│   ├── a3-cache.ts            ← pattern cache Redis
│   └── semantic-registry.ts   ← 50 nós, 4 camadas
│
├── scoring.ts                 ← 37 sinais, 9 dimensões
├── content-gap.ts             ← C1-C8 maturity
├── site-architecture.ts       ← A1-A4 signals
├── schema-scoring.ts          ← S1-S3 + JSON-LD gen
├── sga-score.ts               ← SGA health (k0_breath)
│
├── market-intel.ts            ← 6 funções agregação
├── product-context.ts         ← 12-section context
├── recommend.ts               ← unified ActionPlan
├── tool-suggester.ts          ← 174 sugestões
├── battle-card.ts             ← objeções + ROI
├── marketing-plan.ts          ← 13-section plan
├── programmatic-seo.ts        ← pSEO playbook
│
├── competitor-intel.ts        ← K1-K4 landscape
├── voc-extractor.ts           ← R1-R3 voice of customer
│
├── evo-mcp.ts                 ← EVO-API MCP client
├── r2-vault.ts                ← R2 write-ahead
├── discovery-persistence.ts   ← Supabase pg Pool
├── discovery-cache.ts         ← Redis caching
├── geo-data.ts                ← 27 capitais BR
├── geo-resolver.ts            ← Nominatim geocode
└── engine.ts                  ← dashboard health
```

---

## 5. Fluxo de Dados — Discovery Engine

```
1. Usuário acessa adsentice.com.br
        │
        ▼
2. Cloudflare Pages (React 19 + Vite, estático)
        │
        ▼ (API call)
3. Cloudflare Workers (Hono, edge)
        ├── Cache KV? → hit → retorna <10ms
        │
        ▼ (miss)
4. Nginx → Next.js :3000 (Hetzner VPS)
        │
        ▼
5. Discovery Engine (L0→L1→L2.5)
   ├── DataForSEO MCP (direto) → L0 GMB Search ($0.015)
   ├── DataForSEO MCP (direto) → L1 GMB Profile ($0.0054)
   ├── DataForSEO MCP (direto) → L2 Website Audit ($0.010125)
   ├── Scoring Engine (TypeScript, <1ms) → 37 sinais
   ├── Content Gap (TypeScript, <1ms) → C1-C8
   ├── Architecture (TypeScript, <1ms) → A1-A4
   ├── Schema Validator (TypeScript, <1ms) → S1-S3
   │
   ├── R2 Vault (write-ahead, S3 API) → blobs imutáveis
   ├── Supabase (PostgreSQL) → persistência durável
   └── Redis (cache 24h) + KV (cache L1) → próximas queries
        │
        ▼
6. Response → Cliente
```

### Custos por lead

| Camada | Custo unitário |
|--------|:-------------:|
| L0 GMB Search | $0.015 |
| L1 GMB Profile | $0.0054 |
| L2 Website Audit | $0.010125 |
| L2.5 Content Gap | $0 (zero API) |
| L2 Architecture | $0 (zero API) |
| L2 Schema | $0 (zero API) |
| **TOTAL lead enriquecido** | **$0.0305** (~R$0.17) |

---

## 6. Custos Mensais

| Provedor | Serviço | Custo |
|----------|---------|:-----:|
| **Hetzner** | CAX11 (2 vCPU, 4 GB, 40 GB) | $5.39 (~R$30) |
| **Cloudflare** | Pages + 5 Workers + KV + R2 + D1 + Queues + Email | R$0 |
| **Supabase** | PostgreSQL + Auth + Storage + Realtime | R$0 |
| **z-api.io** | WhatsApp Ultimate (ilimitado) | R$99 |
| **DataForSEO** | Pay-as-you-go (~$0.03/lead) | ~$1.50 (50 leads/mês) |
| **DeepSeek** | API ($0.02/call, via Brain B3) | ~$1.00 (50 chamadas/mês) |
| **TOTAL** | | **~R$132/mês** |

### Comparação com alternativas

| Alternativa | Custo/mês | vs Hetzner |
|-------------|:---------:|:---------:|
| Vercel Pro + Railway | ~$120 | 2.2× mais caro |
| Railway Hobby (uso real) | ~$50 (só backend) | 9.5× mais caro |
| AWS EC2 t3.medium | ~$35 + egress | 6.5× mais caro |
| **Hetzner CAX11** | **~R$30** | ✅ Melhor custo-benefício |

---

## 7. Monitoramento

### 7.1 Health Checks

| Endpoint | Local | Função |
|----------|-------|--------|
| `GET /healthz` | Cloudflare Worker | Status público (sem acordar VPS) |
| `GET /api/health` | Next.js | Status completo (Redis, Qdrant, Embed, Supabase) |
| `GET /api/boa` | Next.js | BOA score atual |
| `GET /api/sga-health` | Next.js | SGA Health Score |
| Cron seg 08:57 | Claude Code | Self-ingest + BOA recalc + History ingest |

### 7.2 Alertas

| Gatilho | Canal | Ação |
|---------|-------|------|
| VPS offline > 2 min | Cloudflare Worker → health check | Alertar founder |
| BOA < 0.80 | BOA recalc | Revisar estabilidade |
| SGA Health < 60 | SGA score | Revisar arestas órfãs |
| Disco > 80% | VPS cron | `docker system prune` |

---

## 8. Roadmap de Execução

### Fase 1 · Agora — VPS (1 dia)
- [ ] Provisionar Hetzner CAX11
- [ ] Instalar Docker + Docker Compose
- [ ] Configurar domínio DNS (Cloudflare → VPS)
- [ ] Deploy inicial: `docker compose up -d`
- [ ] SSL via Nginx + certbot

### Fase 2 · Semana 1 — Cloudflare (2 dias)
- [ ] Workers + Hono (webhooks, cache routing, rate-limit)
- [ ] KV cache L1
- [ ] R2 vault (já wireado no código)
- [ ] CI/CD GitHub Actions → deploy automático

### Fase 3 · Semana 2 — Produção (3 dias)
- [ ] Migrar Next.js → React 19 + Vite (Cloudflare Pages)
- [ ] Supabase Runtime: customers + subscriptions tables
- [ ] Stripe Connect: checkout para Sentinela

### Fase 4 · Semana 3 — Comercial (2 dias)
- [ ] Landing page pública com Raio-X gratuito
- [ ] z-api.io WhatsApp Hub
- [ ] Monitoramento e alertas
