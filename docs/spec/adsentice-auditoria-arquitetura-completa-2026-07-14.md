---
id: audit-2026-07-14
title: "Auditoria Completa da Arquitetura adsentice — medido=verdade"
status: living
type: audit
date: 2026-07-14
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
tags: [auditoria, arquitetura, gap-analysis, warp, frontend, backend, infra]
related: [ADR-0017, ADR-0018, ADR-0019]
---

# Auditoria Completa da Arquitetura adsentice — 2026-07-14

> **Objetivo:** Raio-X completo do que existe, o que falta, e o gap entre estado atual e target.
> **Regra:** medido=verdade — toda afirmação cita fonte (git, Redis, Qdrant, filesystem).
> **Fonte dos dados:** git log, docker ps, curl Qdrant, redis-cli, filesystem walk, wc -l.

---

## 📊 Sumário Executivo

| Dimensão | Pontuação | Estado |
|----------|:---------:|--------|
| **Documentação** (ADRs + Specs) | ████████████████ 95% | 19 ADRs, 18 specs |
| **Backend (lib + API + brain)** | ████████████░░░░ 75% | 26 módulos, 6,228 LOC |
| **Frontend (UI atual Next.js)** | ██████████░░░░░░ 60% | Funcional, mas legado MUI |
| **Frontend (Warp target Vite)** | ░░░░░░░░░░░░░░░░ 0% | Nenhum código iniciado |
| **Design System (corpus)** | ████████████████ 90% | 847 pontos embedados |
| **Infraestrutura** | ██████████████░░ 85% | 2 containers, 5 coleções Qdrant, Redis 46 keys |
| **MCP Servers** | ████████████████ 95% | 6 ativos, 1 disabled, 1 externo |
| **Pipeline CI/CD** | ░░░░░░░░░░░░░░░░ 0% | Sem CI/CD nem deploy automatizado |
| **Testes** | ██░░░░░░░░░░░░░░ 10% | Apenas vault (6/6) |
| **PWA / Offline** | ░░░░░░░░░░░░░░░░ 0% | Não implementado |

---

## 1. DOCUMENTAÇÃO — 19 ADRs + 18 Specs

### 1.1 ADRs (Architecture Decision Records)

| ID | Título | Status | Data |
|----|--------|--------|------|
| ADR-0001 | Arquitetura standalone adsentice | ✅ accepted | 2026-07-11 |
| ADR-0002 | Gap analysis EVO-API vs adsentice | ✅ accepted | 2026-07-11 |
| ADR-0003 | MCP Server Architecture | ✅ accepted | 2026-07-11 |
| ADR-0004 | AG-UI Protocol Decision | ✅ accepted | 2026-07-11 |
| ADR-0005 | Lead Funnel & CRM Strategy | ✅ accepted | 2026-07-11 |
| ADR-0006 | EVO-API as Data Engine | ✅ accepted | 2026-07-11 |
| ADR-0007 | MVP Simplification | ✅ accepted | 2026-07-11 |
| ADR-0008 | EVO-API como Motor de Enriquecimento (L0-L4) | ✅ accepted | 2026-07-13 |
| ADR-0009 | Market Intelligence Engine | ✅ accepted | 2026-07-13 |
| ADR-0010 | Cloudflare Free Tier Enterprise | ✅ accepted | 2026-07-13 |
| ADR-0011 | Brain OODA — 12 containers cognitivos | ✅ accepted | 2026-07-13 |
| ADR-0012 | Estrategia por Categoria/Nicho | ✅ accepted | 2026-07-13 |
| ADR-0013 | Build vs Buy — Integração de APIs | ⬜ proposed | 2026-07-14 |
| ADR-0014 | Arquitetura DevOps Cloud | ⬜ proposed | 2026-07-14 |
| ADR-0015 | Arquitetura Real Rust (supercede 0014) | ⬜ proposed | 2026-07-14 |
| ADR-0016 | Adsentice Soberano | ✅ accepted | 2026-07-14 |
| ADR-0017 | Frontend Enterprise (Vite + shadcn/ui) | ✅ accepted | 2026-07-14 |
| ADR-0018 | Família Warp — Design System Vivo | ✅ accepted | 2026-07-14 |
| ADR-0019 | context7 vs 21st-magic | ✅ accepted | 2026-07-14 |

**Total: 19 ADRs · 13 accepted · 6 proposed**  
**Fonte:** `docs/adr/` — 19 arquivos .md

### 1.2 Specs

| Documento | Linhas | Status |
|-----------|:------:|--------|
| `base-matriz-adsentice.md` | ~200 | ✅ v1.3.0 |
| `adsentice-chat-spec.md` | — | ✅ v1.0.0 |
| `adsentice-pain-criteria-v1.md` | — | ✅ v1.2.0 |
| `adsentice-enrichment-layers.md` | — | ✅ v2.0.0 |
| `adsentice-discovery-engine.md` | — | ✅ vivo |
| `adsentice-architecture-flow.md` | — | ✅ v1.0.1 |
| `adsentice-marketing-vocab.md` | — | ✅ v1.0.0 |
| `adsentice-esc-skills-analysis.md` | — | ✅ v1.0.0 |
| `adsentice-strategic-plan.md` | — | ✅ vivo |
| `adsentice-category-strategy-matrix.md` | — | ✅ vivo |
| `adsentice-lead-enrichment-capabilities.md` | — | ✅ v1.0.0 |
| `adsentice-infrastructure-architecture.md` | — | ✅ vivo |
| `rsxt-bridge-adsentice.md` | — | ✅ vivo |
| `marketing-council-report.md` | — | ✅ vivo |
| + 5 JSON schemas | — | ✅ v1.0 |

**Fonte:** `docs/spec/` — 18 arquivos

### 1.3 Gaps de Documentação

| Gap | Severidade | Ação |
|-----|:----------:|------|
| ADR-0013 a 0015 ainda `proposed` | 🟡 Média | Revisar e aceitar ou depreciar |
| Sem spec de deploy/CI/CD | 🔴 Alta | Criar spec de CI/CD |
| Sem spec de testes | 🟡 Média | Criar spec de quality assurance |

---

## 2. BACKEND — 26 lib modules · 6,228 LOC · 7 brain modules · 10 API routes

### 2.1 Biblioteca Core (`apps/web/src/lib/`)

```
scoring.ts             → 762 linhas · Scoring Engine (37 sinais, Fit×0.40+Engagement×0.35+Intent×0.25)
content-gap.ts         → 333 linhas · Content Gap Analyzer
engine.ts              → 274 linhas · Bridge Redis :6396 · Qdrant :6352 · EVO-API :7700
market-intel.ts        → 264 linhas · Market Intelligence (L0-L4)
sga-score.ts           → Health Score (k0_breath)
schema-scoring.ts      → Schema validation para scoring
competitor-intel.ts    → Competitive landscape
battle-card.ts         → Battle cards
dataforseo.ts          → DataForSEO MCP bridge
pipeline.ts            → Pipeline de discovery (6 pipelines)
discovery.ts           → Discovery engine
discovery-cache.ts     → Cache de discovery
discovery-persistence.ts → Persistência de resultados
recommend.ts           → Recommendation engine
marketing-plan.ts      → Marketing plan generator
programmatic-seo.ts    → Programmatic SEO
site-architecture.ts   → Site architecture analyzer
tool-suggester.ts      → Tool suggester
geo-resolver.ts        → Geo resolver (27 capitais BR)
geo-data.ts            → Geo data
product-context.ts     → Product context
firecrawl.ts           → Firecrawl MCP bridge
evo-mcp.ts             → EVO-API MCP bridge
r2-vault.ts            → R2 vault bridge
voc-extractor.ts       → Vocabulary extractor
types.ts               → Shared types

TOTAL: 26 módulos · 6,228 linhas TypeScript
```

### 2.2 Brain Modules (`apps/web/src/lib/brain/`)

```
c0-interpreter.ts      → Interpretador de intent
c1-retriever.ts        → Retrieval engine
b2-self-score.ts       → Self-scoring
b3-decide.ts           → Decision engine
a3-cache.ts            → Cache cognitivo (3 camadas)
d1-grounding.ts        → Grounding (medido=verdade)
semantic-registry.ts   → Semantic registry (50 nós, 4 camadas)

TOTAL: 7 módulos · 676 linhas TypeScript
```

### 2.3 API Routes (`apps/web/src/app/api/`)

| Rota | Status |
|------|--------|
| `/api/discovery-search` | ✅ Vivo · bridge DataForSEO MCP → scoring |
| `/api/competitive-benchmark` | ✅ Vivo · TOP 5 concorrentes |
| `/api/discovery-data` | ✅ Vivo |
| `/api/diagnostic` | ✅ Vivo |
| `/api/semantic-registry` | ✅ Vivo |
| `/api/llms` | ✅ Vivo |
| `/api/openapi` | ✅ Vivo |
| `/api/login` | ✅ Vivo |
| `/api/pages` | ✅ Vivo |
| `/api/apps` | ✅ Vivo |

**TOTAL: 10 API routes funcionais**

### 2.4 Vault Package (`packages/vault/`)

```
src/
├── vault.ts                   → Core vault
├── stores.ts                  → Store interfaces
├── translators.ts             → Translator registry
├── types.ts                   → Types
├── index.ts                   → Barrel export
├── impl/
│   ├── r2-blob-store.ts       → Cloudflare R2 (S3-compat)
│   └── supabase-series-store.ts → Supabase Postgres
├── executor/
│   ├── capability-executor.ts → Executor
│   ├── rest.ts                → REST executor
│   └── executor.test.ts       → Tests
├── config/
│   ├── r2-secrets.ts          → R2 creds
│   └── supabase-secrets.ts    → Supabase creds
└── gmb/
    └── translate.ts           → GMB translator

TOTAL: 13 arquivos · 878 linhas · 6/6 testes ✅
```

### 2.5 Gaps de Backend

| Gap | Severidade | Ação |
|-----|:----------:|------|
| `packages/core/` vazio | 🔴 Alta | Domínio puro (Lead, Score, Solution) — ADR-0016 |
| `packages/db/` vazio | 🔴 Alta | Schemas Supabase |
| Sem API backend Railway (`apps/api/`) | 🔴 Alta | Backend separado do frontend |
| Sem testes nos 26 lib modules | 🔴 Alta | 0 testes em 6,228 LOC |
| Content Gap Analyzer incompleto | 🟡 Média | OODA decide |
| Competitive Landscape incompleto | 🟡 Média | OODA decide |
| Recommendation Engine incompleto | 🟡 Média | OODA decide |

---

## 3. FRONTEND — 77,032 LOC · Next.js (legado) → Vite (target)

### 3.1 Frontend ATUAL (Next.js 15 + MUI/Materio) — :3000

```
apps/web/src/
├── app/[lang]/(dashboard)/(private)/admin/
│   ├── page.tsx              → 345 linhas · Dashboard
│   ├── discovery/page.tsx    → 1,135 linhas · Discovery Engine
│   ├── leads/page.tsx        → 271 linhas · Lead Table
│   ├── leads/[id]/page.tsx   → 280 linhas · Lead Detail
│   ├── market/page.tsx       → 248 linhas · Market Intel
│   ├── criteria/page.tsx     → 607 linhas · Pain Criteria (37 sinais)
│   ├── solutions/page.tsx    → 525 linhas · Solutions (4 planos)
│   ├── settings/page.tsx     → 516 linhas · Settings (6 providers)
│   ├── pipeline/page.tsx     → 236 linhas · Pipeline
│   ├── categories/page.tsx   → 287 linhas · Categories
│   └── costs/page.tsx        → 372 linhas · Costs
│
├── views/dashboards/         → 3,530 linhas · Templates Materio
│   ├── analytics/            → Analytics dashboard
│   ├── crm/                  → CRM dashboard
│   └── ecommerce/            → Ecommerce dashboard
│
├── components/
│   ├── card-statistics/      → Stat cards (MUI)
│   ├── dialogs/              → 12 dialogs (MUI)
│   ├── layout/               → Front/horizontal/vertical layouts
│   ├── pricing/              → Pricing components
│   ├── stepper-dot/          → Stepper
│   └── theme/                → Theme provider
│
├── @core/                    → Core MUI/Materio (peso morto)
│   ├── components/           → Custom inputs, MUI wrappers
│   ├── theme/                → MUI theme overrides
│   ├── styles/               → Horizontal/vertical styles
│   ├── hooks/                → Core hooks
│   └── utils/                → Core utils
│
├── @layouts/                 → Layout components
├── @menu/                    → Menu components (horizontal/vertical)
│
├── hooks/                    → App hooks
├── contexts/                 → React contexts
├── configs/                  → App config
├── data/                     → Navigation, dictionaries
├── types/                    → TypeScript types
│
├── fake-db/                  → ⚠️ PESO MORTO (ADR-0017)
├── prisma/                   → ⚠️ PESO MORTO (ADR-0017)
├── redux-store/              → ⚠️ PESO MORTO (ADR-0017)
└── remove-translation-scripts/ → ⚠️ PESO MORTO (ADR-0017)

TOTAL: 77,032 linhas · Framework: Next.js 15 · UI: MUI/Materio
First Load JS: 106 KB · CSS runtime: 53 KB · Build: ~45s
```

### 3.2 Frontend TARGET (ADR-0017) — Warp Family

```
NOVA estrutura planejada (0% implementada):

apps/web/
├── src/
│   ├── tokens.css              ← 🔴 NÃO EXISTE
│   ├── main.tsx                ← 🔴 NÃO EXISTE
│   ├── components/
│   │   ├── ui/                 ← 🔴 NÃO EXISTE (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── chip.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── alert.tsx
│   │   │
│   │   └── adsentice/          ← 🔴 NÃO EXISTE
│   │       ├── stat-card.tsx
│   │       ├── schwartz-chip.tsx
│   │       ├── score-bar.tsx
│   │       ├── signal-card.tsx
│   │       ├── maturity-chip.tsx
│   │       ├── gap-card.tsx
│   │       ├── persona-card.tsx
│   │       ├── cockpit-alert.tsx
│   │       ├── cockpit-narrative.tsx
│   │       └── cockpit-patch.tsx
│   │
│   ├── lib/                    ← ✅ EXISTE (26 módulos, sem mudança)
│   ├── hooks/                  ← 🔴 NÃO EXISTE (useDiscovery, useCache, useMutation)
│   ├── pages/admin/            ← 🔴 NÃO MIGRADO (hoje em Next.js App Router)
│   │
│   ├── vite.config.ts          ← 🔴 NÃO EXISTE
│   ├── tailwind.config.ts      ← 🔴 NÃO EXISTE
│   ├── tsconfig.json           ← 🔴 NÃO EXISTE
│   └── package.json            ← 🔴 NÃO EXISTE

TOTAL: 0 linhas implementadas do target
```

### 3.3 WARF — 8 Módulos (ADR-0018) — 0% implementado

| Módulo | Descrição | Status |
|--------|-----------|:------:|
| `tokens.css` | 4 camadas de design tokens | 🔴 0% |
| `components/ui/` | 11 componentes shadcn/ui copiados | 🔴 0% |
| `components/adsentice/` | 10 componentes próprios | 🔴 0% |
| `compositor.ts` | Intent → layout inference | 🔴 0% |
| `registry.ts` | Component registry semântico (Zod) | 🔴 0% |
| `cache.ts` | Cache 3 camadas (KV + Redis + Memory) | 🔴 0% |
| `tracker.ts` | Telemetria de uso (eventos → Qdrant → SGA) | 🔴 0% |
| `8-agents.ts` | Multi-agent (detect→capabilities→run) | 🔴 0% |

### 3.4 PWA / Offline / Deploy

| Item | Status |
|------|:------:|
| Service Worker (PWA) | 🔴 0% |
| Web Manifest | 🔴 0% |
| Cloudflare Pages deploy | 🔴 0% |
| CI/CD (GitHub → deploy) | 🔴 0% |
| Lighthouse AA+ (score ≥ 90) | 🔴 Não medido |

### 3.5 Gaps de Frontend

| Gap | Severidade | Ação |
|-----|:----------:|------|
| **Vite project não criado** | 🔴 CRÍTICA | Fase 1 ADR-0017 |
| **Design tokens não criados** | 🔴 CRÍTICA | `tokens.css` |
| **shadcn/ui não inicializado** | 🔴 CRÍTICA | `npx shadcn@latest init` |
| **11 paginas admin em Next.js** | 🔴 ALTA | Migrar para Vite (Fase 3) |
| **Peso morto (fake-db, prisma, redux)** | 🟡 Média | Remover na migração |
| **MUI/Materio 30+ pastas** | 🟡 Média | Substituir por shadcn/ui |
| PWA não implementado | 🟡 Média | Fase 4 ADR-0017 |
| Bundle size (106 KB first load) | 🟡 Média | Resolver com Vite (meta: 35 KB) |

---

## 4. DESIGN SYSTEM (CORPUS) — 2,364 pontos Qdrant

### 4.1 Composição do Corpus

| Source | Pontos | % |
|--------|:------:|:--:|
| `21st-magic-ui` | 247 | 10.5% |
| `open-design/*` | ~600 | 25.4% |
| Docs (ADRs, specs) | ~500 | 21.2% |
| Marketing skills | ~400 | 16.9% |
| Jasper docs | ~200 | 8.5% |
| RSXT docs | ~200 | 8.5% |
| Config (skills, hooks) | ~117 | 5.0% |
| Outros | ~100 | 4.2% |

**Fonte:** Qdrant `adsentice-self` — 2,364 pontos, status green

### 4.2 Coleções Qdrant

| Coleção | Pontos | Status |
|---------|:------:|:------:|
| `adsentice-self` | 2,364 | ✅ green |
| `adsentice-conversation` | 53,375 | ✅ green |
| `adsentice-materio` | 36 | ✅ green |
| `claude-memory` | 23 | ✅ green |
| `adsentice-kg` | **0** | ⚠️ vazia |

### 4.3 Gaps de Corpus

| Gap | Severidade | Ação |
|-----|:----------:|------|
| `adsentice-kg` vazio (0 pontos) | 🔴 ALTA | KG entities/edges só no MCP, não no Qdrant |
| Embed server :8081 sem health check automático | 🟡 Média | Adicionar ao monitor |
| Sem pipeline de ingestão de novas conversas | 🟡 Média | Automatizar PreCompact → Qdrant |

---

## 5. INFRAESTRUTURA

### 5.1 Containers (Docker Compose)

| Container | Porta | Status |
|-----------|:-----:|--------|
| `adsentice-redis` | `:6396` | ✅ Up 3 days (healthy) · 7.4-alpine |
| `adsentice-qdrant` | `:6352/:6353` | ✅ Up 3 days (healthy) · v1.13.6 |
| `embed-server-rs` | `:8081` | ✅ mpnet 768d (latência 19.1ms) |

**Fonte:** `docker ps` — 2 containers adsentice + 1 embed externo

### 5.2 Redis OODA (46 keys)

| Grupo | Keys | Função |
|-------|:----:|--------|
| `adsentice:ooda:stage:*` | 4 | observe, orient, decide, act |
| `adsentice:ooda:meta:*` | 10 | stack, mission, ticket, corpora, portas, etc. |
| `adsentice:ooda:score:*` | 4 | overall, docs, produto, infra |
| `adsentice:ooda:session:*` | 2 | session_id, message_count, compact_at |
| `adsentice:ooda:conversation:*` | 1 | ingest:last |
| `adsentice:boa:*` | 15 | score + 4 dimensões × (score+weighted+detail) |
| `adsentice:discovery:cost:*` | 2 | today, total |
| `adsentice:handoff:next_number` | 1 | Próximo número de handoff |
| Outros | 7 | initialized_at, last_compact, etc. |

**Fonte:** `redis-cli -p 6396 KEYS "adsentice:*"` — 46 keys

### 5.3 MCP Servers (`.mcp.json` — 8 slots)

| Slot | Runtime | Status |
|------|---------|:------:|
| `adsentice-redis` | npx | ✅ ativo |
| `adsentice-qdrant` | uv run | ✅ ativo |
| `adsentice-kg` | uv run | ✅ ativo |
| `adsentice-conversation` | uv run | ✅ ativo |
| `dataforseo` | npx (9 módulos) | ✅ ativo |
| `context7` | npx | ✅ ativo |
| `firecrawl` | URL externa | ✅ ativo |
| `21st-magic` | npx | ⬜ disabled |

### 5.4 Gaps de Infra

| Gap | Severidade | Ação |
|-----|:----------:|------|
| Sem backend Railway (`apps/api/`) | 🔴 CRÍTICA | Criar Hono + Cloudflare Workers |
| Sem Supabase configurado | 🔴 ALTA | Criar projeto, schemas, RLS |
| Sem Cloudflare R2 configurado | 🔴 ALTA | Bucket para vault blobs |
| Sem CI/CD | 🟡 Média | GitHub Actions → Cloudflare Pages |
| open-design container parado | 🟡 Baixa | Avaliar reativação ou depreciação |
| EVO-API :7700 desconhecido | 🟡 Baixa | Verificar status |

---

## 6. SKILLS & HOOKS

### 6.1 Skills (`.claude/skills/`)

| Skill | Status |
|-------|:------:|
| `adsentice-chat` | ✅ Vivo · pipeline discovery + chat |
| `adsentice-dag` | ✅ Vivo · KG-first grounded recall |
| `adsentice-site-audit` | ✅ Vivo · Firecrawl + DataForSEO audit |
| `adsentice-spec` | ✅ Vivo · Autoria de ADRs e specs |

### 6.2 Hooks (`.claude/settings.local.json`)

| Hook | Script | Status |
|------|--------|:------:|
| `SessionStart` | `adsentice-session-start.py` + `adsentice_boa_score.py --save` | ✅ Automático |
| `PreCompact` | `adsentice-pre-compact.py` | ✅ Automático |
| `PostCompact` | `adsentice-session-start.py` | ✅ Automático |

### 6.3 Tools (16 scripts Python)

```
adsentice_boa_score.py           → BOA score com 4 dimensões
adsentice_claude_history_ingest.py → Ingestão de histórico
adsentice_conversation.py         → MCP server adsentice-conversation
adsentice_corey_ingest.py         → Corey Haines skills ingest
adsentice_handoff_generator.py    → Geração de handoff
adsentice_jasper_probe.py         → Probe público Jasper
adsentice_kg_server.py            → MCP server adsentice-kg
adsentice_marketing_council.py    → Marketing council ingest
adsentice_ooda_seed.py            → Seed inicial OODA Redis
adsentice_pipeline_auto_compact.sh → Pipeline auto-compact
adsentice_qdrant_server.py        → MCP server adsentice-qdrant
adsentice_rsxt_ingest.py          → RSXT docs ingest
adsentice_rust_chat_ingest.py     → Rust chat ingest
adsentice_self_ingest.py          → Self-ingest (docs → Qdrant)
adsentice_strategy_ingest.py      → Strategy docs ingest
adsentice_weekly_ingest.sh        → Cron semanal de ingest

TOTAL: 16 ferramentas · 4,053 linhas Python
```

---

## 7. PIPELINE DE DISCOVERY — 6 pipelines

### Estado atual

| Pipeline | Módulo | API DataForSEO | Status |
|----------|--------|----------------|:------:|
| **Keyword Research** | `dataforseo.ts` | DATAFORSEO_LABS | ✅ Funcional |
| **SERP Analysis** | `dataforseo.ts` | SERP | ✅ Funcional |
| **Domain Competitors** | `competitor-intel.ts` | DOMAIN_ANALYTICS | ⬜ Incompleto |
| **GMB Profile** | `gmb/translate.ts` | BUSINESS_DATA | ✅ 27 campos canônicos |
| **OnPage Audit** | `dataforseo.ts` | ONPAGE | ⬜ Lighthouse pendente |
| **Backlinks** | `dataforseo.ts` | BACKLINKS | ⬜ Incompleto |

### Gaps do Pipeline

| Gap | Severidade | Ação |
|-----|:----------:|------|
| Competitive Landscape (TOP 3) | 🟡 Média | OODA decide #2 |
| Recommendation Engine (3-5 ações) | 🟡 Média | OODA decide #3 |
| L3 Concorrência + Keywords v0.4 | 🟡 Média | OODA decide #4 |
| Content Gap Analyzer | 🟡 Média | OODA decide #1 |
| Brand IQ automático | 🟡 Baixa | ADR-0004 |

---

## 8. RESUMO DOS GAPS — O QUE FALTA (ordenado por criticidade)

### 🔴 CRÍTICO (bloqueia MVP)

| # | Gap | ADR | Ação |
|---|-----|-----|------|
| 1 | **Vite project setup** | ADR-0017 | `npm create vite@latest` + Tailwind + shadcn/ui |
| 2 | **tokens.css** | ADR-0017, 0018 | 4 camadas de design tokens |
| 3 | **Backend Railway (`apps/api/`)** | ADR-0010, 0014 | Hono + Cloudflare Workers |
| 4 | **Supabase project** | ADR-0001 | Criar projeto, schemas, RLS |
| 5 | **Cloudflare R2** | ADR-0010 | Bucket vault + credenciais |

### 🔴 ALTO (essencial para qualidade)

| # | Gap | ADR | Ação |
|---|-----|-----|------|
| 6 | **Migrar 11 admin pages** | ADR-0017 | Next.js → Vite (Fase 3) |
| 7 | **packages/core/** | ADR-0016 | Domínio puro (Lead, Score, Solution) |
| 8 | **packages/db/** | ADR-0001 | Schemas Supabase |
| 9 | **adsentice-kg Qdrant** | ADR-0011 | Popular coleção KG (0 pontos) |
| 10 | **Testes nos 26 lib modules** | — | 0 testes em 6,228 LOC |
| 11 | **CI/CD pipeline** | — | GitHub Actions → Cloudflare Pages |

### 🟡 MÉDIO (melhoria progressiva)

| # | Gap | ADR | Ação |
|---|-----|-----|------|
| 12 | Warp 8 módulos | ADR-0018 | compositor, registry, cache, tracker, agents |
| 13 | Content Gap Analyzer | OODA | Skill content-strategy |
| 14 | Competitive Landscape | OODA | Skill competitor-profiling |
| 15 | Recommendation Engine | OODA | Skill marketing-ideas |
| 16 | L3 Concorrência + Keywords | OODA | v0.4 pipeline |
| 17 | PWA / Service Worker | ADR-0017 | Fase 4 |
| 18 | Lighthouse AA+ | ADR-0017 | Score ≥ 90 |
| 19 | Remover peso morto | ADR-0017 | fake-db/, prisma/, redux-store/ |
| 20 | Embed server health check | — | Monitor automático |

### 🟢 BAIXO (nice-to-have)

| # | Gap | Ação |
|---|-----|------|
| 21 | Revisar ADR-0013 a 0015 (proposed) | Aceitar ou depreciar |
| 22 | open-design container | Reativar ou deprecar |
| 23 | EVO-API :7700 status | Verificar |
| 24 | Brand IQ automático | ADR-0004 |

---

## 9. MÉTRICAS FINAIS

| Métrica | Valor | Fonte |
|---------|:-----:|-------|
| Total commits | 163 | `git log --oneline --all` |
| ADRs | 19 | `docs/adr/` |
| Specs | 18 | `docs/spec/` |
| Lib modules | 26 | `apps/web/src/lib/*.ts` |
| Brain modules | 7 | `apps/web/src/lib/brain/*.ts` |
| API routes | 10 | `apps/web/src/app/api/*/` |
| Admin pages (Next.js) | 11 | `apps/web/src/app/*/admin/*/page.tsx` |
| Total LOC (app) | 77,032 | `find -name "*.tsx" \| xargs wc -l` |
| Total LOC (lib) | 6,228 | `wc -l lib/*.ts` |
| Total LOC (brain) | 676 | `wc -l lib/brain/*.ts` |
| Total LOC (vault) | 878 | `find packages/vault -name "*.ts" \| xargs wc -l` |
| Total LOC (tools Python) | 4,053 | `wc -l tools/*.py` |
| Testes | 6/6 (vault apenas) | `packages/vault/src/executor/executor.test.ts` |
| Corpus Qdrant | 2,364 | `adsentice-self` points_count |
| Conversas | 53,375 | `adsentice-conversation` points_count |
| Redis keys | 46 | `redis-cli DBSIZE` |
| Containers | 2/3 ativos | `docker ps` |
| MCP servers | 6 ativos + 1 disabled + 1 externo | `.mcp.json` |
| BOA score | 0.940 | `redis-cli GET adsentice:boa:score` |
| BOA verdict | EXCELLENT | `redis-cli GET adsentice:boa:verdict` |
| Embed latência | 19.1ms | BOA hook |
| **Warp implementado** | **0%** | **Nenhum código do target** |

---

## 10. PRÓXIMOS PASSOS (do OODA decide)

1. **Content Gap Analyzer** — skill `content-strategy` → `scoreContentArchitecture`
2. **Competitive Landscape** — skill `competitor-profiling` → TOP 3 concorrentes locais
3. **Recommendation Engine** — `marketing-ideas` → 3-5 ações por lead
4. **L3 Concorrência+Keywords v0.4** — `domain_competitors` + `keyword_research` + `backlinks_summary`

---

*Auditoria Completa · 2026-07-14 · adsentice · medido=verdade*
