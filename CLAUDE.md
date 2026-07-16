# adsentice — Contexto do Projeto

## Identidade

Este projeto é **adsentice**, localizado em `/media/jeffer/5aab5a95-8290-d3f7-2e4f-8c27cc2d09a93/adsentice`.
Repositório: `git@github.com:jgdeamorim/adsentice.git` · branch: `main`.

**Missão:** Hub inteligente de marketing para negócios locais (SMB Brasil).
**Nicho primário:** clínicas estéticas SP.

---

## 🧭 Recuperação canônica (LER 1º · TODA sessão · esp. pós-compact)

A config de sessão, a memória OODA e as doutrinas NÃO estão só neste arquivo — estão em fontes vivas.
**Ordem de recuperação canônica:**

1. **MCP `adsentice_status`** (`adsentice-qdrant`) — Qdrant, Redis, Embed online? Corpus points?
2. **MCP `adsentice_kg_stats`** (`adsentice-kg`) — KG entities, edges, relations count
3. **MCP `adsentice_conversation_status`** (`adsentice-conversation`) — collections + total points
4. **Redis `adsentice:ooda:*`** (`:6396`) — estágio OODA atual, BOA score, meta-dados
5. **`docs/handoff/active/`** — handoffs mais recentes (arco narrativo + próximos passos)
6. **`docs/spec/base-matriz-adsentice.md`** — mapa navegável completo (7 dimensões, rotas `{#ADS.X}`)

**⭐ REGRA-MÃE GLOBAL (inviolável · TODA sessão):** `medido=verdade` — toda afirmação sobre o sistema cita **fonte** (arquivo, commit, teste, MCP tool). Sem fonte → `⚠ não-verificado`, NÃO conta como fato.

**⚠️ MÉTRICAS DINÂMICAS:** Commits, ADRs, corpus points, BOA score, e outras métricas **NÃO são hardcoded aqui** — mudam a cada sessão. Use as fontes de recuperação canônica (acima) para obter valores reais. O CLAUDE.md é estável (doutrinas, arquitetura, stack) — não deve ser editado a cada selo.

---

## Infraestrutura viva

| Serviço | Porta | Container | Comando de verificação |
|---------|-------|-----------|----------------------|
| Redis OODA | `:6396` | `adsentice-redis` (7.4-alpine) | `redis-cli -p 6396 PING` |
| Qdrant KG | `:6352/:6353` | `adsentice-qdrant` (v1.13.6) | `curl http://127.0.0.1:6352/healthz` |
| Embed server | `:8081` | `embed-server-rs` (mpnet 768d) | `curl http://127.0.0.1:8081/healthz` |

Coleções Qdrant: `adsentice-self` (2,469 docs/ADRs/specs), `adsentice-conversation` (54,897 histórico), `adsentice-materio` (36 design tokens), `adsentice-kg` (reservada, vazia), `claude-memory` (23 memórias curadas).

---

## MCP Servers (8 slots — `.mcp.json`)

| Slot | Runtime | Tools |
|------|---------|-------|
| `adsentice-redis` | npx `@gongrzhe/server-redis-mcp` | get, set, delete, list |
| `adsentice-qdrant` | uv run `adsentice_qdrant_server.py` | adsentice_search, adsentice_docs_list, adsentice_status |
| `adsentice-kg` | uv run `adsentice_kg_server.py` | adsentice_kg_edges, adsentice_kg_what_produces, adsentice_kg_neighbors, adsentice_kg_stats |
| `adsentice-conversation` | uv run `adsentice_conversation.py` | adsentice_conversation_search, adsentice_conversation_recall, adsentice_conversation_remember, adsentice_conversation_status |
| `dataforseo` | npx `dataforseo-mcp-server@2.8.10` | 9 módulos, ~30 tools |
| `context7` | npx `@upstash/context7-mcp` | resolve-library-id, query-docs (ADR-0019: fonte primária) |
| `firecrawl` | URL externa `mcp.firecrawl.dev` | site audit, crawl, scrape |
| `21st-magic` | npx `@magicuidesign/mcp@latest` | **disabled** (inspiração visual, pago — ADR-0019) |

**IMPORTANTE:** Os 3 MCP servers Python usam `uv run --quiet --script` com `# /// script` inline dependencies (mcp, httpx, redis).
NÃO usar `python3` direto — não tem o SDK `mcp` instalado globalmente.

---

## Doutrinas duras (invariantes)

1. **medido=verdade:** toda afirmação cita fonte. Sem fonte = não verificado.
2. **Pipeline discovery:** URL → 6 pipelines paralelos → cards + tips
3. **LLM = árbitro NUNCA extrator:** DeepSeek cost-capped, Qwen local $0
4. **Sandbox default ($0) · live gated:** spend-cap por tenant
5. **Vault:** R2 blob → Postgres série ANTES de indexar
6. **Corpora:** A=self(adsentice) ≠ B=cliente(tenant·PII) ≠ C=tooling
7. **Spec primeiro · ADR para decisões · Português (pt-BR)**
8. **Stack atual (:3000):** Next.js 15 + MUI/Materio (legado, 77K LOC)
   **Stack target:** React 19 + Vite + Tailwind + shadcn/ui (ADR-0017) · Hetzner CAX11 $5.39/mês (ADR-0016) · Cloudflare Workers (Hono) + Supabase + R2
   **Railway DESCARTADO** (ADR-0016: 9.5× mais caro, bug Tokio MPSC, SSE 15min)
9. **Público:** SMB brasileiro (dono de clínica, lojista, contador)
10. **Ticket:** R$0 (free) · R$47 (starter) · R$197 (pro) · R$497 (escala)
    **Planos de solução (Strategic Plan v2.0):** Raio-X R$0 · Sentinela R$197 · Domínio R$497 · Escala R$997
11. **⚠️ Next.js 15.1.2 SWC:** LEIA `.claude/NEXTJS_SWC_RULES.md` antes de editar Server Components. Checklist: Suspense+inner async · 'use client' wrapper pra Leaflet · inline props type · nunca `catch {}` vazio · nunca `dynamic(ssr:false)` em server component.

---

## Isolamento de contexto

O usuário (jeffer / jgdeamorim) mantém **vários projetos paralelos**. adsentice **não é** e **não tem relação direta** com:

- `EVO-API` (Semantic Capability Hub — referência de arquitetura, MAS com containers, portas e coleções SEPARADAS)
- `MY-CODER` / `COGNITIVE-MCP` / `CODER-MCP` / `GAER`
- `RUST-CHAT` / `rsxt`
- `LIMPVIX` / `webforge-ai` / `OCEAN-ORCH`
- `open-design` (OD)

**Não misture** decisões, ADRs, specs ou doutrinas desses projetos com adsentice.
Se um documento, hook, ou memória parecer falar de outro projeto, **pergunte** antes de aplicar.

**EXCEÇÃO:** EVO-API é referência para PADRÕES de código (MCP servers, hooks, skills, CLAUDE.md),
MAS adsentice tem containers, portas e coleções **ISOLADAS**:
- Redis adsentice `:6396` ≠ Redis EVO-API `:6395`
- Qdrant adsentice `:6352` ≠ Qdrant EVO-API `:6350`
- Embed `:8081` é **compartilhado** (único processo mpnet)

---

## Stack & Deploy

- **Frontend atual:** Next.js 15 + MUI/Materio (`apps/web/`, :3000) — **em produção local**
- **Frontend target (ADR-0017):** React 19 + Vite + Tailwind CSS v4 + shadcn/ui — **migração pendente**
- **Design System (ADR-0018):** Família Warp — 9 módulos (M1 tokens.css ✅ v1.0, M2-M9 🔴 pendentes)
- **Backend target (ADR-0016):** Hetzner CAX11 (ARM64, $5.39/mês) + Docker Compose + Cloudflare Workers (Hono)
- **Database:** Supabase (Postgres + Auth) — projeto a criar
- **Storage:** Cloudflare R2 (vault blobs) — `packages/vault/` wireado
- **AI:** DataForSEO MCP (9 módulos) · DeepSeek V4 (árbitro cost-capped) · Qwen 2.5 1.5B (local $0) · embed mpnet 768d (:8081)
- **Infra local:** Docker Compose (Redis :6396 + Qdrant :6352) + embed-server-rs
- **ADR DevOps:** ADR-0014 (Railway) SUPERSEDED → ADR-0016 (Hetzner) ACCEPTED

---

## OODA Loop

Estado atual no Redis (`adsentice:ooda:*`):

| Chave | Função |
|-------|--------|
| `adsentice:ooda:stage:observe` | O que foi observado |
| `adsentice:ooda:stage:orient` | Interpretação do contexto |
| `adsentice:ooda:stage:decide` | Decisão tomada |
| `adsentice:ooda:stage:act` | Ação atual / próximo passo |
| `adsentice:ooda:current_session_id` | Sessão atual |
| `adsentice:boa:score` | BOA score numérico |
| `adsentice:boa:verdict` | EXCELLENT / ACCEPTABLE / REOBSERVE |
| `adsentice:ooda:meta:*` | Meta-dados (missão, stack, ticket, portas, etc.) |

BOA formula: `0.30·stability + 0.20·performance + 0.15·error_free + 0.35·founder_signal`
Thresholds: excellent ≥ 0.8 · acceptable ≥ 0.5 · reobserve < 0.2

---

## Skills (`.claude/skills/`)

- `adsentice-chat` — construir, evoluir e operar o pipeline de discovery e o chat
- `adsentice-dag` — KG-first grounded recall (5 passos: KG→git→filesystem→síntese→persistir)
- `adsentice-site-audit` — auditoria de site (Firecrawl + DataForSEO ONPAGE + DOMAIN_ANALYTICS)
- `adsentice-spec` — autorar specs e ADRs

---


## Comandos de diagnóstico rápido

```bash
# Status completo do ecossistema
echo '{"method":"tools/call","id":1,"jsonrpc":"2.0","params":{"name":"adsentice_status","arguments":{}}}' \
  | uv run --quiet --script tools/adsentice_qdrant_server.py

# BOA score
redis-cli -p 6396 GET adsentice:boa:score

# Estado OODA
redis-cli -p 6396 GET adsentice:ooda:stage:act

# Qdrant collections
curl -s http://127.0.0.1:6352/collections | python3 -m json.tool

# Docker status
docker ps --filter "name=adsentice" --format "table {{.Names}}\t{{.Status}}"
```
