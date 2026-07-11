---
id: ADR-0006
title: EVO-API como Motor de Dados — adsentice é o painel, não o motor
status: accepted
date: 2026-07-11
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0001, ADR-0002, ADR-0003]
supersedes: []
---

# ADR-0006 — EVO-API como Motor de Dados (Motor × Painel)

## Contexto

O EVO-API tem 2 anos de maturidade e contém:
- **10.306 linhas** de translators DataForSEO em Rust (46 capabilities traduzidas)
- **73 capabilities** expostas como MCP tools via `evo-mcp` (porta `:7700`)
- **Capability Executor** com cost-gate, spend-cap por tenant
- **Vault write-ahead** (R2 blob → Postgres série → Qdrant index) com dedup blake3
- **Testes e2e** com DataForSEO REAL (não mock)
- **6/6 testes** no vault passando

O adsentice, em contraste, tem 7 dias de construção e estava reimplementando tudo em TypeScript.

## Decisão

### EVO-API é o MOTOR. Adsentice é o PAINEL.

```
┌─────────────────────────────────────────────────────────┐
│  ADSENTICE (painel · Next.js + Materio)                  │
│                                                          │
│  POST /api/diagnostic                                    │
│    │                                                     │
│    ├─ Firecrawl MCP (keyless) → scrape + map + extract  │
│    │                                                     │
│    └─ EVO-API MCP (:7700) → 73 capabilities              │
│         │                                                 │
│         ├─ keyword.research (DataForSEO)                  │
│         ├─ serp.organic (Google SERP)                     │
│         ├─ domain.competitors (competitive landscape)     │
│         ├─ business.profile.gmb (Google Maps)             │
│         ├─ business.reviews.google (reviews)              │
│         ├─ on_page.lighthouse (performance audit)         │
│         └─ ... (68 more)                                  │
│                                                          │
│    └─ DeepSeek V4 → síntese → cards + tips + score       │
│                                                          │
│  Response: JSON { score, cards, tips }                    │
└─────────────────────────────────────────────────────────┘
```

### O que o adsentice NÃO implementa (usa do EVO-API)

| Funcionalidade | EVO-API já tem | adsentice NÃO reimplementa |
|---------------|---------------|---------------------------|
| DataForSEO REST client | 46 translators Rust | ✅ Usa MCP tools |
| Cost-gate / spend-cap | Capability Executor | ✅ Herda do executor |
| Vault (write-ahead log) | R2 → Postgres → Qdrant | ✅ Herda do Vault |
| Dedup (blake3) | Automático por conteúdo | ✅ Herda do dedup |
| MCP server | 73 tools dinâmicas | ✅ Consome, não serve |
| Testes e2e | DataForSEO real | ✅ Cobertura herdada |
| Canonical models | Capability Registry | ✅ Schema canônico |

### O que o adsentice IMPLEMENTA (não existe no EVO-API)

| Funcionalidade | adsentice | EVO-API não tem |
|---------------|-----------|----------------|
| Dashboard admin | Materio UI | ❌ |
| Dashboard cliente | Materio UI | ❌ |
| Brand IQ automático | GMB + site → brand profile | ❌ |
| Cards + Tips + Score | LLM síntese + template | ❌ |
| CRM pipeline | Stage 0→7 + signal detection | ❌ |
| Propostas auto-geradas | Template + dados reais | ❌ |
| Multi-tenant auth | Supabase RLS | ❌ |
| Billing (Stripe) | Planos R$47-497 | ❌ |
| Firecrawl MCP | Scrape + map de sites | ❌ |

### Faseamento da integração

**Fase 1 (AGORA):** DataForSEO REST direto. `apps/web/src/lib/dataforseo.ts` chama `api.dataforseo.com/v3` com Basic auth. Funciona, testado, 5 pipelines ativos.

**Fase 2 (v0.2):** EVO-API MCP bridge. `POST /api/diagnostic` → chama `evo-mcp :7700` em vez de DataForSEO REST. Ganha Vault + dedup + cost-gate automaticamente. O código do `dataforseo.ts` é substituído por chamadas MCP.

**Fase 3 (v1.0):** EVO-API como capability fabric. Pipelines adsentice chamam capabilities EVO-API via MCP. EVO-API gerencia cost-gate, spend-cap, vault, dedup. Adsentice gerencia UX, brand IQ, CRM, billing.

## Alternativas Consideradas

### Alternativa 1: Reescrever tudo em TypeScript
**Rejeitada.** Seria descartar 10.306 linhas de Rust testado e 2 anos de maturidade para reescrever em TypeScript. Custo: meses. Ganho: zero.

### Alternativa 2: Abandonar EVO-API completamente
**Rejeitada.** O EVO-API é o fosso técnico. 73 capabilities com Vault, dedup, e cost-gate é um diferencial que levaria anos para reconstruir.

### Alternativa 3: EVO-API como MCP remoto (produção)
**Planejada (v1.0).** EVO-API em Railway, adsentice em Vercel, comunicação via MCP streamable HTTP.

## Consequências

- **Positivas:** Foco do adsentice no que importa (produto, UX, CRM, billing). Motor de dados maduro com 73 capabilities. Vault + dedup herdados.
- **Negativas:** Dependência de 2 serviços em produção (Railway: EVO-API + adsentice). Custo operacional maior.
- **Risco:** Se o EVO-API MCP não estiver rodando, os pipelines de dados falham. Mitigação: Fase 1 usa DataForSEO REST direto (sem dependência do EVO-API). Fase 2 adiciona fallback REST se MCP falhar.

## Evidências

- `evo-translator-dataforseo/` — 10.306 linhas, 46 arquivos Rust
- `evo-mcp/src/lib.rs` — 319 linhas, 73 capabilities como tools MCP
- `evo-factory/tests/` — testes e2e com DataForSEO real (não mock)
- `packages/vault/` — 6/6 testes passando
- Commit `d8e331c` — endpoint `/api/diagnostic` (DataForSEO REST direto)

## Referências

- ADR-0001 — Arquitetura standalone adsentice
- ADR-0002 — Gap analysis EVO-API vs adsentice
- `docs/dataforseo-oficial-mcp-vs-evo-api-provider-core.md` — comparativo completo
- `/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/EVO-API/main/crates/` — EVO-API crates (32)
