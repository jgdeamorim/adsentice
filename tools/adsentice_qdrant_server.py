#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.0", "httpx>=0.27", "redis>=5.0"]
# ///
"""
MCP stdio server — adsentice-qdrant semantic search.
Embed via :8081 (768d) → Qdrant :6352 · collection adsentice-self.
ISOLADO do EVO-API: portas, collections e tags separadas.
"""

import asyncio
import glob
import os
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

QDRANT_URL  = os.environ.get("QDRANT_URL", "http://127.0.0.1:6352")
COLLECTION  = os.environ.get("QDRANT_COLLECTION", "adsentice-self")
EMBED_URL   = os.environ.get("EMBED_URL", "http://127.0.0.1:8081")

async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{EMBED_URL}/embed", json={"texts": [text]})
        r.raise_for_status()
        return r.json()["vectors"][0]

async def qdrant_search(vec: list[float], limit: int = 5) -> list[dict]:
    body = {"vector": vec, "limit": limit, "with_payload": True}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
            json=body,
        )
        r.raise_for_status()
        return r.json().get("result", [])

async def qdrant_count() -> int:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{QDRANT_URL}/collections/{COLLECTION}/points/count",
                json={},
            )
            r.raise_for_status()
            return r.json().get("result", {}).get("count", 0)
    except Exception:
        return 0

server = Server("adsentice-qdrant")

@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="adsentice_search",
            description="Busca semântica no corpus adsentice-self (docs, ADRs, specs, código). Retorna os trechos mais relevantes com source e score.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Pergunta ou termo de busca"},
                    "limit": {"type": "integer", "description": "Número máximo de resultados", "default": 5},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="adsentice_docs_list",
            description="Lista os documentos do corpus adsentice — specs, ADRs, docs de estratégia.",
            inputSchema={
                "type": "object",
                "properties": {
                    "kind": {"type": "string", "description": "Filtro: spec, adr, strategy, all"},
                },
            },
        ),
        types.Tool(
            name="adsentice_status",
            description="Retorna o status do ecossistema adsentice — Redis OODA, Qdrant, embed, docs.",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]

@server.call_tool()
async def call_tool(name: str, args: dict) -> list[types.TextContent]:
    import json

    if name == "adsentice_search":
        query = args.get("query", "")
        limit = min(args.get("limit", 5), 10)
        try:
            vec = await embed(query)
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ embed offline: {e}")]

        try:
            hits = await qdrant_search(vec, limit)
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ Qdrant offline: {e}")]

        results = []
        for h in hits:
            payload = h.get("payload", {})
            results.append({
                "source": payload.get("source", "?"),
                "kind": payload.get("kind", "?"),
                "content": (payload.get("content", "") or "")[:300],
                "score": round(h.get("score", 0), 4),
            })
        return [types.TextContent(
            type="text",
            text=json.dumps({"query": query, "hits": results, "total": len(results)}, ensure_ascii=False, indent=2),
        )]

    elif name == "adsentice_docs_list":
        docs_dir = os.path.join(os.path.dirname(__file__), "..", "docs")
        files = []
        for pattern in ["**/*.md", "**/*.json"]:
            for f in glob.glob(os.path.join(docs_dir, pattern), recursive=True):
                rel = os.path.relpath(f, docs_dir)
                kind = (
                    "spec" if "spec/" in rel or "adsentice-" in rel
                    else "adr" if "adr/" in rel
                    else "reference" if "jasper-docs/" in rel
                    else "other"
                )
                kind_filter = args.get("kind", "all")
                if kind_filter and kind_filter != "all" and kind != kind_filter:
                    continue
                files.append({"path": rel, "kind": kind})
        return [types.TextContent(
            type="text",
            text=json.dumps({"files": files, "total": len(files)}, ensure_ascii=False, indent=2),
        )]

    elif name == "adsentice_status":
        status = {"qdrant": "unknown", "redis": "unknown", "embed": "unknown", "corpus_points": 0}
        # Qdrant
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{QDRANT_URL}/healthz")
                status["qdrant"] = "online" if r.status_code == 200 else "offline"
        except Exception:
            status["qdrant"] = "offline"
        # Embed
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(f"{EMBED_URL}/healthz")
                status["embed"] = "online" if r.status_code == 200 else "offline"
        except Exception:
            status["embed"] = "offline"
        # Redis
        try:
            import redis as _redis
            r = _redis.Redis(host="127.0.0.1", port=6396, socket_connect_timeout=1)
            status["redis"] = "online" if r.ping() else "offline"
        except Exception:
            status["redis"] = "offline"
        # Corpus
        status["corpus_points"] = await qdrant_count()

        return [types.TextContent(type="text", text=json.dumps(status, indent=2))]

    return [types.TextContent(type="text", text=f"tool desconhecida: {name}")]

async def main():
    async with stdio_server() as (r, w):
        await server.run(r, w, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
