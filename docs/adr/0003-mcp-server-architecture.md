---
id: ADR-0003
title: Arquitetura dos 7 MCP Servers — SDK mcp Python, Firecrawl, Redis fix
status: accepted
date: 2026-07-11
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0001, ADR-0002]
supersedes: []
---

# ADR-0003 — Arquitetura dos 7 MCP Servers adsentice

## Contexto

O `.mcp.json` do adsentice começou com 6 MCP servers. Durante a sessão de 2026-07-11, 3 deles (`adsentice-qdrant`, `adsentice-kg`, `adsentice-conversation`) retornavam `-32601` — erro de handshake MCP. O `adsentice-redis` retornava `-32000` — erro de conexão Redis. O `dataforseo` e `context7` funcionavam corretamente.

Adicionamos o `firecrawl` como 7º servidor durante a sessão.

## Decisão

### 1. Python MCP servers: SDK `mcp` + `uv run --script`

**Problema:** Nossos 3 MCP servers Python eram manipuladores JSON-RPC raw (`stdin→stdout`). Só tratavam `tools/list` e `tools/call`. Claude Code envia `initialize` (handshake obrigatório do protocolo MCP 2024-11-05), que retornava `{"error": {"code": -32601, "message": "Unknown: initialize"}}`. Conexão recusada.

**Solução:** Reescrever com o SDK `mcp>=1.0` (Python), seguindo o padrão EVO-API:
```python
#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.0", "httpx>=0.27"]
# ///

from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("adsentice-qdrant")

@server.list_tools()
async def list_tools() -> list[types.Tool]: ...

@server.call_tool()
async def call_tool(name: str, args: dict) -> list[types.TextContent]: ...
```

**Alternativa rejeitada:** Usar `python3` direto. O SDK `mcp` não está instalado globalmente (`pip3 list | grep mcp` → vazio). `uv run --script` resolve dependências inline automaticamente.

**Alternativa rejeitada:** Continuar com JSON-RPC raw + implementar handshake manual. Reinventar o protocolo MCP seria frágil e não escalável.

### 2. adsentice-redis: URL como argumento, não env vars

**Problema:** O pacote `@gongrzhe/server-redis-mcp@1.0.0` espera URL Redis como **argumento posicional** (`redis://host:port`). Nossa config original passava `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` como env vars — que o pacote ignora.

**Solução:**
```json
"adsentice-redis": {
  "command": "npx",
  "args": ["-y", "@gongrzhe/server-redis-mcp@latest", "redis://127.0.0.1:6396"]
}
```

### 3. Firecrawl: remote MCP (streamable HTTP), keyless $0

**Decisão:** Adicionar `firecrawl` como 7º MCP server, via URL remota (streamable HTTP), sem API key (keyless free tier).

**Justificativa:** 11 tools (scrape, map, search, crawl, extract, parse, interact, agent, etc.) que substituem a necessidade de crawler próprio no pipeline `site_audit`. Custo $0. Rate-limited por IP.

```json
"firecrawl": {
  "url": "https://mcp.firecrawl.dev/v2/mcp"
}
```

**Alternativa rejeitada:** Construir crawler próprio com Puppeteer/Playwright. Complexidade desnecessária para MVP. Firecrawl faz scrape→markdown, map de site, e extração estruturada com LLM — tudo que o pipeline `site_audit` precisa.

### 4. Isolamento total do EVO-API

Todos os MCP servers adsentice usam namespaces, portas e tags próprias:
- Redis `:6396` (≠ EVO-API `:6395`)
- Qdrant `:6352` (≠ EVO-API `:6350`)
- Embed `:8081` (compartilhado — único processo mpnet)
- Tag `adsentice` (≠ `evo-api`, ≠ `my-coder`)

## Consequências

- **Positivas:** 7/7 MCP servers funcionais. Python servers estáveis com SDK oficial. Firecrawl elimina necessidade de crawler próprio. Redis com URL correta.
- **Negativas:** Dependência de `uv` (não instalado por padrão). Keyless Firecrawl tem rate-limit (~10 req/min) — suficiente para MVP, insuficiente para escala.
- **Risco:** Se `uv` não estiver disponível, os 3 MCP servers Python não iniciam. Mitigação: documentado no CLAUDE.md.

## Referências

- EVO-API `main/tools/mcp_qdrant_conversation.py` — padrão de implementação MCP SDK
- `@gongrzhe/server-redis-mcp@1.0.0` — npm package (1 versão, ISC license)
- `https://docs.firecrawl.dev/mcp-server` — Firecrawl MCP docs
- Commit `8aedde4` — fix redis args + Qdrant healthcheck
- Commit `ce1ea78` — rewrite Python MCP servers com SDK mcp
- Commit `248daf0` — integrar Firecrawl MCP + skill site-audit
