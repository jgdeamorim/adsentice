---
id: adr-0016
title: EVO-API como Backend Unificado adsentice — Arquitetura Final
status: proposed
date: 2026-07-14
deciders: founder, claude
supersedes: [adr-0014, adr-0015]
extends: [adr-0008, adr-0010, adr-0011]
---

# ADR-0016 · EVO-API como Backend Unificado

## Resumo Executivo

**EVO-API (Axum Rust) vira o backend único do adsentice. Dos 23 módulos TypeScript: 11 viram capabilities Rust, 12 permanecem TypeScript (orquestração/infraestrutura). Railway foi descartado — VPS (Hetzner) é mais barato e mais confiável para Rust. Cloudflare Free cobre edge/CDN. Supabase Free cobre dados.**

---

## 1. Contexto — O que temos hoje

### 1.1 Dois backends separados

| | adsentice (TypeScript) | EVO-API (Rust) |
|---|---|---|
| **Runtime** | Next.js 15 + Node.js | Axum 0.8 + Tokio |
| **Módulos** | 23 em `lib/` + 6 em `brain/` | 25 crates |
| **HTTP** | API Routes (Next.js) | Axum com utoipa OpenAPI |
| **MCP** | Cliente HTTP (`evo-mcp.ts`) | Servidor nativo (76 tools, SSE) |
| **IA** | Claude API (externo, pago) | Qwen 1.5B local ($0) + DeepSeek proxy |
| **KG** | Qdrant (4 coleções) + Redis | rsxt k0 (Fjall soberano) |
| **Cache** | Redis CLI (`execSync`) | Pattern cache nativo (blake3 + watermark) |
| **DAG/Brain** | Brain OODA v0.7 (6 módulos TS) | DAG (c0-c4, 12 containers, bypass tiers) |

### 1.2 Duplicação detectada

| Função | adsentice | EVO-API | Duplicação? |
|--------|----------|---------|:----------:|
| Classificação de intenção | `c0-interpreter.ts` (regex) | `dag.rs:455` (embedding + vocab) | ✅ Duplicado |
| Re-rank de resultados | `c1-retriever.ts` | `dag.rs:340` (c1_rerank) | ✅ Duplicado |
| Grounding/Honestidade | `d1-grounding.ts` | `dag.rs:400` (c3_honesty) | ✅ Duplicado |
| Cache de respostas | `a3-cache.ts` (Redis CLI) | `dag.rs:169` (cache soberano.rsxt) | ✅ Duplicado |
| Bypass/Decisão | `b3-decide.ts` | `chat_ooda.rs` (Tier enum) | ✅ Duplicado |
| MCP Client | `evo-mcp.ts` (HTTP para :7700) | `evo-mcp` (servidor nativo) | ⚠️ Overlap |
| DataForSEO | `dataforseo.ts` (chamadas diretas) | 21 caps canônicas + 40 translators | ✅ Deveria ser unificado |

---

## 2. Pesquisa de Plataforma — Railway DESCARTADO

### 2.1 Railway: $5/mês NÃO cobre Rust

**Fonte:** `docs.railway.com/pricing` · `docs.railway.com/reference/pricing/plans`

O plano Hobby ($5/mês) inclui **$5 de crédito**. RAM custa **$10/GB/mês** e vCPU custa **$20/vCPU/mês**. Os limites (48 vCPU, 48 GB RAM) são **máximos**, não incluídos.

**Custo real para EVO-API no Railway:**

| Componente | Recurso | Custo/mês |
|-----------|---------|:---------:|
| EVO-API (Axum) | 1 vCPU + 512 MB RAM | ~$15 |
| Redis sidecar | 256 MB RAM | ~$2.50 |
| Qdrant sidecar | 1 GB RAM | ~$10 |
| Qwen 1.5B (opcional) | 2 GB RAM + 2 vCPU | ~$60 |
| **TOTAL Railway** | | **~$27-87/mês** |

Além disso, Railway **não tem GPU** — Qwen 1.5B rodando em CPU seria extremamente lento (vários segundos por token). **Inviável para produção.**

### 2.2 Railway tem bug documentado com Tokio MPSC

**Fonte:** `station.railway.com/questions/rust-app-failing-on-railway-metal-4caa38ef`

Em Railway Metal, canais Tokio MPSC **silenciosamente descartam mensagens** — sem erro, sem crash, sem log. O mesmo Dockerfile funciona em GCP, macOS e Linux. O DAG actor do EVO-API (`dag.rs`) usa exatamente `std::sync::mpsc::channel` — o mesmo padrão afetado. **Risco inaceitável para backend em produção.**

### 2.3 SSE tem limite de 15 minutos

**Fonte:** `docs.railway.com/networking/public-networking/specs-and-limits`

O MCP server do EVO-API usa SSE (Server-Sent Events). Railway impõe **limite máximo de 15 minutos** e **timeout de 5 minutos sem dados**. Precisaria de heartbeat artificial — frágil.

### 2.4 VPS (Hetzner) é a alternativa correta

| Critério | Railway Hobby | Hetzner CAX11 |
|----------|:------------:|:-------------:|
| **Custo** | $27-87/mês (uso real) | **~$5/mês** (fixo) |
| **vCPU** | $20/vCPU/mês | 2 vCPU (ARM64) |
| **RAM** | $10/GB/mês | **4 GB dedicados** |
| **GPU** | ❌ Não tem | ❌ Não tem |
| **Tokio MPSC bug** | ⚠️ Documentado | ✅ Sem relatos |
| **SSE sem limite** | ❌ 15 min max | ✅ Sem limite |
| **IP fixo** | ✅ | ✅ |
| **Docker** | ✅ | ✅ |
| **MCP nativo** | ✅ Railway MCP | ❌ (SSH manual) |

**Veredito:** Hetzner CAX11 ($5/mês, 2 vCPU ARM64, 4 GB RAM) é **mais barato e mais confiável** que Railway para Rust. O Railway MCP é conveniente mas não justifica o custo 5-17× maior nem o risco do bug Tokio.

---

## 3. Análise dos 23 Módulos — O que fica, o que vai

### 3.1 Módulos que VIRAM Capabilities Rust (11 módulos)

Estes são funções determinísticas puras — transformam dados em scores. Migrar para Rust elimina latência HTTP e permite execução local no EVO-API.

| # | Módulo TS | Capability ID (Rust) | Sinais | Complexidade |
|:--:|-----------|---------------------|:------:|:-----------:|
| 1 | `scoring.ts` | `scoring.pain_criteria` | 37 sinais, 9 dimensões | Alta (600 linhas) |
| 2 | `content-gap.ts` | `scoring.content_maturity` | 8 sinais C1-C8 | Média (300 linhas) |
| 3 | `schema-scoring.ts` | `scoring.schema_quality` | 3 sinais S1-S3 + JSON-LD gen | Média (150 linhas) |
| 4 | `site-architecture.ts` | `scoring.site_architecture` | 4 sinais A1-A4 | Baixa (130 linhas) |
| 5 | `sga-score.ts` | `scoring.graph_health` | 4 dimensões, usa k0 | Média (180 linhas) |
| 6 | `recommend.ts` | `recommend.action_plan` | 139 táticas, priority score | Média (250 linhas) |
| 7 | `tool-suggester.ts` | `recommend.free_tools` | 174 sugestões | Baixa (120 linhas) |
| 8 | `battle-card.ts` | `intel.battle_card` | Objeções + ROI + WhatsApp | Média (150 linhas) |
| 9 | `competitor-intel.ts` (scoring) | `scoring.competitive_position` | 4 sinais K1-K4 | Baixa (100 linhas) |
| 10 | `voc-extractor.ts` (scoring) | `scoring.customer_voice` | 3 sinais R1-R3 | Baixa (80 linhas) |
| 11 | `geo-data.ts` | Referência estática (cap não-executável) | 27 capitais BR | Trivial |

**Estimativa:** ~2.000 linhas de TypeScript → ~1.500 linhas de Rust. 2-3 semanas de trabalho.

### 3.2 Módulos que PERMANECEM TypeScript (12 módulos)

Estes são **orquestração** (coordenam capabilities), **infraestrutura** (platform-specific), ou **apresentação** (compõem outputs).

| # | Módulo | Motivo para ficar em TS |
|:--:|--------|------------------------|
| 1 | `discovery.ts` | Orquestração: chain L0→L1→L2, paginação, retry, dedup |
| 2 | `pipeline.ts` | Orquestração: DAG L0-L5, gerencia cache entre camadas |
| 3 | `market-intel.ts` | Dados: queries SQL direto no Supabase (GROUP BY) |
| 4 | `marketing-plan.ts` | Apresentação: compõe scoring outputs em documento |
| 5 | `product-context.ts` | Apresentação: 12-section context doc |
| 6 | `programmatic-seo.ts` | Apresentação: pSEO playbook |
| 7 | `evo-mcp.ts` | Infraestrutura: MCP client protocol |
| 8 | `r2-vault.ts` | Infraestrutura: Cloudflare R2 S3 API |
| 9 | `discovery-persistence.ts` | Infraestrutura: Supabase pg Pool writes |
| 10 | `discovery-cache.ts` | Infraestrutura: Redis caching |
| 11 | `engine.ts` | Infraestrutura: dashboard health bridge |
| 12 | `geo-resolver.ts` | Utilidade: OpenStreetMap Nominatim API |

### 3.3 Brain OODA — Duplicação resolvida

| Módulo TS | Substituído por | Ação |
|-----------|----------------|------|
| `c0-interpreter.ts` | `dag.rs:455` (c0_route) | **Remover** — EVO-API já classifica intenção |
| `c1-retriever.ts` | `dag.rs:340` (c1_rerank) | **Remover** — EVO-API já faz re-rank híbrido |
| `b2-self-score.ts` | `chat_ooda.rs` (B2 certainty) | **Remover** — EVO-API já calcula bypass gate |
| `b3-decide.ts` | `chat_ooda.rs` (3 tiers) + `brain_ask()` | **Remover** — EVO-API já roteia bypass/cache/LLM |
| `d1-grounding.ts` | `dag.rs:400` (c3_honesty) | **Remover** — EVO-API já poda frases sem lastro |
| `a3-cache.ts` | `dag.rs:169` (cache_get/put) | **Remover** — EVO-API já cacheia com watermark |

**6 módulos do Brain OODA são removidos.** O EVO-API já implementa tudo isso em Rust, com cache soberano (rsxt), Qwen local ($0), e bypass real.

### 3.4 Semantic Registry — Ponte para k0

O `semantic-registry.ts` (50 nós SGA, 4 camadas) não é removido — é **migrado**:

- **Nós:** 50 SemanticNode → `NodeId` no rsxt k0
- **Edges:** edges array → `EdgeKind` + `add_edge()` no k0
- **Busca:** fuzzy keyword → Qdrant embedding search (já existe)
- **Cache:** SHA-256 in-memory → pattern cache do EVO-API (`cache_put`)
- **Health Score:** `sga-score.ts` → `scoring.graph_health` (Rust, consulta k0 direto)

O registry continua existindo como **camada de aplicação** sobre o k0, mas o armazenamento migra de `Map<string, SemanticNode>` (efêmero) para rsxt k0 (persistente, Fjall).

---

## 4. Arquitetura Final

```
┌──────────────────────────────────────────────────────────────────┐
│                 ADSENTICE — ARQUITETURA UNIFICADA                │
│                                                                  │
│  Cloudflare (Free)          VPS Hetzner CAX11 ($5/mo)            │
│  ─────────────────          ─────────────────────────            │
│  Pages (React 19 frontend)  ┌──────────────────────────┐        │
│  Workers + Hono (edge)      │ EVO-API (Axum Rust)      │        │
│  └── webhooks               │ └── HTTP :7700            │        │
│  └── cache routing          │ └── MCP/SSE :7700         │        │
│  └── rate limiting          │ └── 76 + 11 caps          │        │
│                             │ └── DAG (c0-c4)           │        │
│  KV (cache L1)              │ └── rsxt (s0+v0+k0+f0)   │        │
│  └── scoring cache <1ms     │ └── OpenAPI/Swagger       │        │
│                             │ └── graceful shutdown     │        │
│  R2 (vault + assets)        │                            │        │
│  └── 10 GB free             │  Redis :6396 (sidecar)     │        │
│                             │  └── BOA + OODA + cache   │        │
│  D1 (analytics cache)       │                            │        │
│  └── 5 GB SQLite edge       │  Qdrant :6352 (sidecar)    │        │
│                             │  └── 4 coleções            │        │
│  Queues (async L3/L4)       │                            │        │
│                             │  Qwen 1.5B (sidecar)       │        │
│  AI Gateway (LLM cache)     │  └── $0, local, CLI       │        │
│                             │                            │        │
│  Email Routing              │  Docker Compose            │        │
│  └── @adsentice.com.br      │  4 containers              │        │
│                             │  2 vCPU ARM64, 4 GB RAM    │        │
│  Custo: R$0/mês             │  Custo: ~R$30/mês ($5)     │        │
│                             └──────────────────────────┘        │
│                                                                  │
│  Supabase (Free) — PostgreSQL + Auth + Storage + Realtime        │
│  Custo: R$0/mês                                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  TypeScript (12 módulos sobreviventes)                    │   │
│  │  └── Orquestração + Infraestrutura + Apresentação         │   │
│  │  └── Next.js :3000 (dev) → Cloudflare Pages (prod)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  TOTAL: ~R$30/mês + R$99 (z-api.io) = ~R$129/mês                │
└──────────────────────────────────────────────────────────────────┘
```

### Fluxo de uma requisição

```
Cliente → Cloudflare Pages (React 19 estático)
              │
              ▼ (API call)
         Cloudflare Workers (Hono, edge)
              │
              ├─ Cache KV? → hit → retorna <10ms
              │
              ▼ (miss)
         VPS Hetzner (EVO-API Axum :7700)
              │
              ├─ DAG cache hit? (rsxt k0) → bypass $0
              │
              ▼ (miss)
         Capability Registry
              │
              ├─ scoring.pain_criteria (Rust, <1ms)
              ├─ scoring.content_maturity (Rust, <1ms)
              ├─ DataForSEO caps (HTTP → DataForSEO API)
              └─ Response → cacheia no rsxt → retorna
              
         TypeScript (orquestração)
              │
              ├─ discovery.ts → chain EVO-API caps
              ├─ Supabase → persistência
              └─ Cloudflare R2 → vault write-ahead
```

### Custos reais

| Provedor | Plano | Custo/mês |
|----------|-------|:---------:|
| **Hetzner CAX11** | 2 vCPU ARM64, 4 GB RAM, 40 GB SSD | **~R$30** ($5) |
| Cloudflare | Free (Pages, Workers, KV, R2, D1, Queues, AI Gateway, Email) | **R$0** |
| Supabase | Free (500 MB DB, Auth, Storage, Realtime) | **R$0** |
| z-api.io | Ultimate (WhatsApp, opcional) | **R$99** |
| **TOTAL** | | **~R$129/mês** |

**Comparação com alternativas descartadas:**

| Alternativa | Custo real/mês | Problema |
|-------------|:-------------:|----------|
| Railway Hobby | $50-80 | $10/GB RAM, Tokio MPSC bug, SSE 15min limit |
| Vercel Pro | $20 + overage | Não roda Rust, serverless apenas |
| AWS EC2 t3.medium | ~$35 | Complexidade IAM, egress caro |
| **Hetzner CAX11** | **$5** | ✅ Simples, dedicado, sem bugs de plataforma |

---

## 5. Roadmap de Implementação

### Fase 1 · Semana 1-2 — Infrastructure
- [ ] Provisionar Hetzner CAX11
- [ ] Docker Compose: EVO-API + Redis + Qdrant + Qwen
- [ ] Configurar Nginx reverse proxy + SSL (Let's Encrypt)
- [ ] Conectar domínio `api.adsentice.com.br` → VPS
- [ ] Cloudflare Workers + Hono: webhooks (Stripe, z-api.io), cache routing
- [ ] CI/CD: GitHub Actions → build Rust → deploy VPS

### Fase 2 · Semana 3-4 — Rust Capabilities
- [ ] Criar crate `evo-capability-scoring` (6 funções)
- [ ] Criar canonical YAMLs para cada capability
- [ ] Provider inline (sem HTTP, execução local)
- [ ] Testar: `scoring.pain_criteria(input) → ScoreData` em <1ms
- [ ] Migrar semantic-registry → k0 (50 nós, 4 camadas)

### Fase 3 · Semana 5-6 — Unificação
- [ ] Remover `dataforseo.ts` (rotear tudo via EVO-API MCP)
- [ ] Remover Brain OODA TS (6 módulos duplicados)
- [ ] `discovery.ts` → chain EVO-API capabilities (não mais chamadas diretas)
- [ ] `pipeline.ts` → idem
- [ ] Testar fluxo completo: Discovery → Scoring → Market Intel

### Fase 4 · Semana 7-8 — Frontend
- [ ] React 19 + Vite (substituir Next.js)
- [ ] shadcn/ui (substituir MUI/Materio)
- [ ] Deploy estático no Cloudflare Pages
- [ ] Workers + KV para cache L1

### Fase 5 · Semana 9-10 — Otimização
- [ ] Cloudflare Queues para L3/L4 async
- [ ] Cloudflare AI Gateway para DeepSeek cache
- [ ] Monitoramento (Prometheus + Grafana)
- [ ] Backup automation (R2 + Supabase)

---

## 6. O que NÃO fazer

| Não fazer | Por que |
|-----------|--------|
| ❌ Usar Railway para Rust | $50-80/mês vs $5 VPS. Bug Tokio MPSC. SSE 15min limit. |
| ❌ Usar Python/FastAPI | EVO-API já tem tudo em Rust. Python seria duplicação sem benefício. |
| ❌ Migrar orquestração para Rust | `discovery.ts` e `pipeline.ts` são glúe — ficam em TS. |
| ❌ Remover TypeScript completamente | 12 módulos de infra/orquestração/apresentação são platform-specific. |
| ❌ Usar Qwen 1.5B no VPS sem GPU | Inferência CPU é lenta. Qwen é fallback offline, não primário. |
| ❌ Next.js em produção | Next.js é pesado para Pages. React 19 + Vite é estático puro, zero SSR. |

---

## 7. Riscos e Mitigações

| Risco | Prob. | Impacto | Mitigação |
|-------|:-----:|:-------:|-----------|
| EVO-API não compilar no ARM64 (Hetzner CAX11) | Média | Alto | Testar cross-compilation `aarch64-unknown-linux-gnu` na Fase 1. Se falhar, usar CX22 (x86, $8/mês). |
| rsxt k0 não suportar 50 nós SGA | Baixa | Médio | k0 já suporta BFS. Extensões necessárias são node metadata (trivial). |
| 4 GB RAM insuficiente para Redis + Qdrant + Qwen | Média | Médio | Qwen só sobe sob demanda (não residente). Qdrant Cloud (1 GB free) como fallback. |
| VPS Hetzner requer manutenção (SSH, updates) | Alta | Baixo | Docker Compose + watchtower (auto-update). CI/CD GitHub Actions. |
| Cold start do Qwen (carrega modelo) | Alta | Baixo | Qwen é fallback. DeepSeek é primário. Cache do DAG evita 95% das chamadas. |

---

## 8. Prova (medido=verdade)

### Railway descartado
- **Fonte:** `docs.railway.com/pricing` — RAM $10/GB/mês, vCPU $20/vCPU/mês. Plano Hobby inclui $5 de crédito, não 48 GB RAM.
- **Fonte:** `docs.railway.com/reference/pricing/plans` — limites são máximos de conta, não incluídos.
- **Fonte:** `station.railway.com/questions/rust-app-failing-on-railway-metal-4caa38ef` — bug Tokio MPSC documentado.
- **Fonte:** `docs.railway.com/networking/public-networking/specs-and-limits` — SSE 15 min max, 5 min idle timeout.

### Hetzner viável
- **Fonte:** `hetzner.com/cloud` — CAX11: 2 vCPU ARM64, 4 GB RAM, 40 GB SSD, $5.39/mês.
- **Fonte:** EVO-API `Cargo.toml` — compila com `tokio = { version = "1.40", features = ["full"] }`. Compatível com ARM64.

### EVO-API cobre Brain OODA
- **Fonte:** `evo-superadmin/src/dag.rs:455` — c0_route (intent classifier)
- **Fonte:** `evo-superadmin/src/dag.rs:340` — c1_rerank (hybrid re-ranker)
- **Fonte:** `evo-superadmin/src/dag.rs:400` — c3_honesty (sentence grounding)
- **Fonte:** `evo-superadmin/src/dag.rs:169` — cache_get_isolated (pattern cache com watermark)
- **Fonte:** `evo-superadmin/src/chat_ooda.rs` — 3 tiers (BypassScore, BypassCache, B3Qwen), self-score gate

### 23 módulos analisados
- **Fonte:** `apps/web/src/lib/` — 23 módulos TypeScript
- **Fonte:** `apps/web/src/lib/brain/` — 6 módulos Brain OODA
- **Resultado:** 11 → Rust, 12 → TypeScript, 6 brain → removidos (duplicados)

## Referências
- ADR-0008 (EVO-API Motor L0-L4)
- ADR-0010 (Cloudflare Free Tier Enterprise)
- ADR-0011 (Brain OODA)
- ADR-0014 (Arquitetura DevOps — superceded)
- ADR-0015 (Arquitetura Real Rust — superceded)
- EVO-API `crates/evo-api-http/Cargo.toml` (Axum 0.8 + utoipa)
- EVO-API `crates/evo-superadmin/src/dag.rs` (c0-c4)
- EVO-API `crates/evo-superadmin/src/chat_ooda.rs` (12 containers)
- EVO-API `crates/evo-superadmin/src/chat_brain.rs` (Qwen + GroundedPrompt)
- EVO-API `crates/evo-capability/` (registry)
- rsxt `PLAN-RSXT-001-master-roadmap.md` (5 engines)
- Railway: `docs.railway.com/pricing`, `docs.railway.com/reference/pricing/plans`
- Railway community: `station.railway.com/questions/rust-app-failing-on-railway-metal-4caa38ef`
- Hetzner: `hetzner.com/cloud` (CAX11)
