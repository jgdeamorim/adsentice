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

---

## Infraestrutura viva

| Serviço | Porta | Container | Comando de verificação |
|---------|-------|-----------|----------------------|
| Redis OODA | `:6396` | `adsentice-redis` (7.4-alpine) | `redis-cli -p 6396 PING` |
| Qdrant KG | `:6352/:6353` | `adsentice-qdrant` (v1.13.6) | `curl http://127.0.0.1:6352/healthz` |
| Embed server | `:8081` | `embed-server-rs` (mpnet 768d) | `curl http://127.0.0.1:8081/healthz` |

Coleções Qdrant: `adsentice-self` (docs/ADRs/specs), `adsentice-conversation` (histórico), `adsentice-materio` (design tokens), `adsentice-kg` (reservada), `claude-memory` (memória curada).

---

## MCP Servers (6 slots — `.mcp.json`)

| Slot | Runtime | Tools |
|------|---------|-------|
| `adsentice-redis` | npx `@gongrzhe/server-redis-mcp` | get, set, delete, list |
| `adsentice-qdrant` | uv run `adsentice_qdrant_server.py` | adsentice_search, adsentice_docs_list, adsentice_status |
| `adsentice-kg` | uv run `adsentice_kg_server.py` | adsentice_kg_edges, adsentice_kg_what_produces, adsentice_kg_neighbors, adsentice_kg_stats |
| `adsentice-conversation` | uv run `adsentice_conversation.py` | adsentice_conversation_search, adsentice_conversation_recall, adsentice_conversation_remember, adsentice_conversation_status |
| `dataforseo` | npx `dataforseo-mcp-server@2.8.10` | 9 módulos, ~30 tools |
| `context7` | npx `@upstash/context7-mcp` | resolve-library-id, query-docs |

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
8. **Stack:** Next.js 15 + Railway + Supabase + Cloudflare R2 + DataForSEO MCP
9. **Público:** SMB brasileiro (dono de clínica, lojista, contador)
10. **Ticket:** R$0 (free) · R$47 (starter) · R$197 (pro) · R$497 (escala)

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

- **Frontend:** Next.js 15 + TypeScript + Tailwind + Materio UI kit (`apps/web/`)
- **Backend:** Railway (`apps/api/` — a construir)
- **Database:** Supabase (Postgres + Auth)
- **Storage:** Cloudflare R2 (vault blobs)
- **AI:** DataForSEO MCP (9 módulos) · DeepSeek V4 (árbitro cost-capped) · Qwen 2.5 1.5B (local $0) · embed mpnet 768d (:8081)
- **Infra local:** Docker Compose (Redis + Qdrant) + embed-server-rs

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

## Hooks & Skills

**Hooks** (`.claude/settings.local.json`):
- `SessionStart`: `adsentice-session-start.py` + `adsentice_boa_score.py --save`
- `PreCompact`: `adsentice-pre-compact.py`
- `PostCompact`: `adsentice-session-start.py`

**Skills** (`.claude/skills/`):
- `adsentice-chat` — construir, evoluir e operar o pipeline de discovery e o chat
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
