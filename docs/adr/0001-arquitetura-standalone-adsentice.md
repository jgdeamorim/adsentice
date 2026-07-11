---
id: ADR-0001
title: Arquitetura standalone adsentice — Next.js + Railway + Supabase + DataForSEO MCP oficial
status: accepted
date: 2026-07-11
deciders: [jgdeamorim]
consulted: [claude]
related: [evoadr-0069, evoadr-0187, evoadr-0205, evoadr-0140, evoadr-0153]
supersedes: []
---

# ADR-0001 — Arquitetura standalone adsentice

## Contexto

O EVO-API foi congelado (commit `23edcdd`, handoff v239) porque "isso não dá dinheiro" — é uma fábrica
de capabilities (DEV), não um produto (PRODUTO). A distinção DEV≠PRODUTO (ADR-0187) é inviolável.

O adsentice nasceu como **produto standalone** (handoff v240, 2026-07-08): captação de leads locais
por região via Google Meu Negócio → enriquece → score (7 dimensões) → proposta automática.

**Por que standalone e não dentro do EVO-API:**

1. **Separação DEV/PRODUTO** — O EVO-API é a fábrica de capabilities. O adsentice é o produto que
   USA as capabilities. Misturar os dois = poluição de corpora (o que quebrou o EVO-API).

2. **Corpora separados (ADR-0140)** — A=self(adsentice) ≠ B=cliente(tenant·PII) ≠ C=tooling(qdrant).
   O adsentice tem SEU PRÓPRIO corpus-A, Redis OODA, Qdrant KG, e docs.

3. **Stack diferente** — EVO-API = Rust puro (soberano, zero container). adsentice = managed-first
   (Vercel, Railway, Supabase, Cloudflare) — a soberania (rsxt) é otimização opcional atrás das
   interfaces.

4. **Público diferente** — EVO-API é tooling de DEV. adsentice é produto pra SMB (dono de clínica,
   lojista, contador).

5. **Time-to-market** — Managed-first entrega MVP em semanas, não meses. Rust soberano é otimização
   futura, não bloqueio inicial.

## Decisão

### D1 · Stack managed-first

```
┌──────────────────────────────────────────────────────┐
│  ADSENTICE STACK                                     │
│                                                       │
│  Frontend:  Next.js 15 (Vercel)                       │
│             MUI Materio · Tailwind · TypeScript        │
│                                                       │
│  Backend:   Railway (TypeScript · Node.js)            │
│             apps/api/ — a LÓGICA do produto           │
│                                                       │
│  Database:  Supabase (Postgres + RLS + Auth)          │
│             packages/db/ — schemas + migrations       │
│                                                       │
│  Storage:   Cloudflare R2 (blobs duráveis)            │
│             packages/vault/ — cofre write-ahead       │
│                                                       │
│  AI:        DataForSEO MCP oficial (dados de mercado) │
│             DeepSeek (árbitro · cost-capped)          │
│             Qwen 2.5 1.5B (local · $0 · chat livre)  │
│                                                       │
│  Infra:     Docker Compose local                      │
│             Redis :6396 (OODA adsentice)              │
│             Qdrant :6352 (KG adsentice)               │
│             Embed :8081 (mpnet · compartilhado)       │
└──────────────────────────────────────────────────────┘
```

### D2 · DataForSEO — MCP oficial como camada de commodity

O adsentice usa o **MCP oficial da DataForSEO** (`dataforseo-mcp-server@2.8.10`, 9 módulos, ~30 tools)
como camada de transporte de dados. NÃO reimplementa translators como o EVO-API fez.

**Justificativa:**
- O MCP oficial é mantido pelo time DataForSEO — atualizações de API são automáticas
- Instalação em 1 comando (`npx dataforseo-mcp-server`)
- 9 módulos cobrem 80% do que o adsentice precisa no MVP
- O provider.core do EVO-API (73 caps, 48 translators, 14.718 linhas Rust) é referência congelada
  para features enterprise futuras (sandbox $0, audit trail WORM, spend-cap)

**Migração futura (Fase 3):** Quando o adsentice tiver clientes pagantes e precisar de sandbox $0,
audit trail WORM, e spend-cap enterprise → wire o provider.core do EVO-API como backend avançado,
mantendo o MCP oficial como fallback.

### D3 · Vault — Sistema de Registro ≠ Índice Derivado

A lei nº1 (aprendida com a dor do EVO-API):

```
vault.put(raw) →
  ① BLOB → R2 (dedup por blake3, imutável)
  ② SÉRIE → Postgres (append-only · hold-trading)
  ③ ÍNDICE → NUNCA é tocado pelo vault. Chamador indexa depois.
```

**Se o índice corromper, reconstrói do zero. Zero dado perdido.** O que quebrou o EVO-API
(`~/.cache/evoapi-self` era fonte-da-verdade E índice ao mesmo tempo) NÃO se repete aqui.

### D4 · Infraestrutura local isolada

O adsentice tem SUA PRÓPRIA infraestrutura, separada do EVO-API:

| Serviço | EVO-API | adsentice |
|---|---|---|
| **Redis** | `:6395` (evoapi:ooda:*) | `:6396` (adsentice:ooda:*) |
| **Qdrant** | `:6350/:6351` (evo-api corpus) | `:6352/:6353` (adsentice corpus) |
| **Embed** | `:8081` (mpnet, compartilhado) | `:8081` (mesmo, stateless) |

**Garantias de isolamento:**
- Portas diferentes
- Volumes Docker diferentes (`.data/redis-adsentice/`, `.data/qdrant-adsentice/`)
- Namespaces Redis diferentes (`adsentice:ooda:*` vs `evoapi:ooda:*`)
- Tags Qdrant diferentes (`adsentice` vs `evo-api`)
- Docker Compose separado (`adsentice/docker-compose.yml`)
- Hooks Claude Code separados (`.claude/settings.json` próprio)

### D5 · Claude Code — Configurações próprias

O adsentice tem seu próprio conjunto de hooks e skills:

| Arquivo | Função |
|---|---|
| `.claude/settings.json` | SessionStart, PreCompact, PostCompact |
| `.claude/hooks/adsentice-session-start.py` | Injeta contexto OODA do Redis adsentice (:6396) |
| `.claude/hooks/adsentice-pre-compact.py` | Salva estado OODA antes do resumo |
| `.claude/skills/adsentice-chat/SKILL.md` | Skill de construção do chat e pipelines |
| `.claude/skills/adsentice-spec/SKILL.md` | Skill de autoria de specs e ADRs |

### D6 · Estrutura de diretórios

```
adsentice/
├── apps/
│   ├── web/              Next.js 15 (Vercel) — dashboard + chat
│   └── api/              Backend TS (Railway) — lógica do produto
├── packages/
│   ├── vault/            ✅ Cofre durável (R2 + Postgres) — 6/6 testes
│   ├── core/             🔴 Lead, ScoreDimension, Solution
│   ├── evoapi-client/    🔴 Cliente EVO-API (REST/MCP)
│   └── db/               🔴 Schemas Supabase
├── docs/
│   ├── adr/              ADRs (este é o 0001)
│   ├── spec/             Specs detalhadas
│   ├── jasper-docs/      Referência externa (API Jasper)
│   ├── adsentice-objetivos-solucoes-criterios.md
│   ├── adsentice-chat-spec.md
│   ├── jasper-ai-analise-competitiva.md
│   ├── jasper-solutions-analise.md
│   ├── rsxt-evo-api-vs-claude-seo.md
│   └── dataforseo-oficial-mcp-vs-evo-api-provider-core.md
├── .claude/              Hooks + Skills
├── .data/                Volumes Docker (gitignored)
├── docker-compose.yml    Redis :6396 + Qdrant :6352
└── README.md
```

## Alternativas consideradas

### A) Construir dentro do EVO-API (superfície warp) — REJEITADA
- Violaria DEV≠PRODUTO (ADR-0187)
- Manteria a poluição de corpora que quebrou o EVO-API
- Rust soberano é lento para iterar em produto (compilação, deploy)
- EVO-API está congelado — não é base de construção ativa

### B) Usar provider.core do EVO-API como fonte de dados primária — REJEITADA (para MVP)
- O provider.core (73 caps, 48 translators) é tecnicamente superior
- Mas depende do EVO-API estar rodando (:7700), compilação Rust, credenciais
- Time-to-market: semanas com MCP oficial vs meses wire do provider.core
- **Adotada como Fase 3** (migração futura quando houver clientes enterprise)

### C) Usar apenas o MCP oficial, abandonar provider.core — REJEITADA
- O provider.core tem diferenciais que o MCP oficial nunca terá:
  - Sandbox $0 (diagnóstico grátis)
  - Audit trail WORM (enterprise compliance)
  - Spend-cap por tenant
  - Knowledge Graph (k0)
- O MCP oficial é commodity. O provider.core é MOAT.

### D) Stack totalmente serverless (Vercel + Supabase + Edge Functions) — REJEITADA (para MVP)
- Edge Functions têm limite de execução (10-30s)
- Pipelines de discovery precisam de >30s (múltiplas chamadas API)
- Railway permite execução longa sem timeout
- **Adotada híbrida:** Vercel (frontend) + Railway (backend pesado)

### E) Monorepo único com EVO-API — REJEITADA
- EVO-API é Rust, adsentice é TypeScript
- Worktrees diferentes, branches diferentes, releases diferentes
- Repositórios separados = deploy independente

## Consequências

### Positivas
- **Time-to-market:** MVP em 4-6 semanas com stack managed
- **Isolamento total:** zero risco de quebrar o EVO-API
- **Corpora limpos:** A/B/C separados desde o dia 1
- **Infra própria:** Redis, Qdrant, OODA independentes
- **Stack moderna:** Next.js 15, TypeScript, MCP nativo
- **Custo baixo:** Vercel (free) + Railway ($5/mês) + Supabase (free) + Cloudflare R2 (free tier)
- **Documentação completa:** 8 docs de estratégia + spec do chat + análise competitiva

### Negativas / trade-offs
- **Provider.core não wireado:** 73 caps, 48 translators, sandbox $0 — parados no EVO-API congelado
- **MCP oficial é commodity:** sem sandbox, sem audit trail, sem spend-cap
- **Dois repositórios para manter:** adsentice (ativo) + EVO-API (congelado, referência)
- **Stack menos soberana:** TypeScript/Node em vez de Rust (rétrade-off velocidade vs performance)
- **Dependência de serviços cloud:** Vercel, Railway, Supabase — vendor lock-in mitigado pelo vault

### Neutras
- O Qwen 2.5 1.5B local ($0) e o DeepSeek (cost-capped) permanecem disponíveis
- O embed server (:8081) é compartilhado (stateless, mpnet)
- A doutrina (medido=verdade, LLM=árbitro, sandbox default) é herdada do EVO-API

## Doutrina herdada do EVO-API

| Princípio | Aplica no adsentice? |
|---|---|
| **medido=verdade** — toda afirmação cita fonte | ✅ Sim. Toda análise cita qual cap DataForSEO gerou o dado |
| **LLM = árbitro NUNCA extrator** | ✅ Sim. DeepSeek sintetiza SOBRE dados REAIS |
| **Pipeline L0→L6** | ✅ Sim. Discovery = L0-L3 determinístico. Estratégia = L6 árbitro |
| **Sandbox default · live gated** | ⚠️ Parcial. MCP oficial não tem sandbox. Usar cache/vault como "sandbox local" |
| **Audit trail imutável** | ⚠️ Parcial. Vault (R2+Postgres) é durável. Hash-chain WORM = Fase 3 |
| **Founder gate** | ✅ Sim. Ações live são gated por créditos + spend-cap |
| **Corpora A/B/C isolados** | ✅ Sim. A=self(adsentice) ≠ B=cliente ≠ C=tooling |

## Próximos passos

1. **ADR-0002** — Pipeline de Discovery (6 pipelines paralelos)
2. **ADR-0003** — Modelo de créditos e spend-cap por tenant
3. **ADR-0004** — Brand IQ automático vs configuração manual
4. **ADR-0005** — Vault: write-ahead log e separação Sistema de Registro × Índice
5. **MVP Semana 1-2:** `POST /api/chat/discover` + Chat UI
6. **MVP Semana 3-4:** Sistema de créditos + primeiro deep-dive (SEO Strategy)
7. **Fase 3 (mês 3+):** Wire provider.core do EVO-API para features enterprise

---

*ADR-0001 · aceito 2026-07-11 · founder=gate · arquitetura standalone adsentice · managed-first · DataForSEO MCP oficial como commodity · provider.core EVO-API como moat futuro*
