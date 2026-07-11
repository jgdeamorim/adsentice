#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.0", "httpx>=0.27"]
# ///
"""
MCP stdio server — adsentice-conversation cross-KG semantic search.
Embed via :8081 (768d) → Qdrant :6352 · collections adsentice.
ISOLADO do EVO-API: portas, collections e tags separadas.

Collections:
  adsentice-conversation  → histórico das conversas adsentice
  claude-memory           → memória ativa Claude (KG curado)
  adsentice-self          → corpus adsentice (docs, ADRs, specs, código)
  adsentice-materio       → design tokens Materio
"""

import asyncio
import json
import os
import time
import uuid
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

EMBED_URL   = os.environ.get("CLAUDE_KG_EMBED_URL", "http://127.0.0.1:8081/embed")
QDRANT_URL  = os.environ.get("CLAUDE_KG_QDRANT_URL", "http://127.0.0.1:6352")
DEFAULT_TAG = os.environ.get("CLAUDE_KG_TAG", "adsentice")
WRITE_COLL  = "claude-memory"

COLLECTIONS = {
    "adsentice-conversation": "histórico das conversas adsentice (sessões Claude · use tag='adsentice')",
    "claude-memory":          "memória ativa Claude (KG curado · tag adsentice)",
    "adsentice-self":         "corpus adsentice (docs, ADRs, specs, código · tag=adsentice)",
    "adsentice-materio":      "design tokens Materio (palette, typography, spacing · tag=materio)",
}


async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(EMBED_URL, json={"texts": [text]})
        r.raise_for_status()
        return r.json()["vectors"][0]


async def search(collection: str, vec: list[float], limit: int, tag: str | None) -> list[dict]:
    body: dict = {"vector": vec, "limit": limit, "with_payload": True}
    if tag and tag.lower() != "all":
        body["filter"] = {"must": [{"key": "tag", "match": {"value": tag}}]}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"{QDRANT_URL}/collections/{collection}/points/search",
            json=body,
        )
        r.raise_for_status()
        return r.json().get("result", [])


async def upsert(text: str, vec: list[float], tag: str, extra: dict | None) -> str:
    point_id = str(uuid.uuid4())
    payload = {"text": text, "tag": tag, "ts": int(time.time()), "source": "adsentice-conversation"}
    if extra:
        payload.update(extra)
    body = {"points": [{"id": point_id, "vector": vec, "payload": payload}]}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.put(
            f"{QDRANT_URL}/collections/{WRITE_COLL}/points?wait=true",
            json=body,
        )
        r.raise_for_status()
    return point_id


async def collection_count(collection: str) -> int:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{QDRANT_URL}/collections/{collection}/points/count",
                json={},
            )
            r.raise_for_status()
            return r.json().get("result", {}).get("count", 0)
    except Exception:
        return 0


def fmt_hits(hits: list[dict]) -> str:
    if not hits:
        return "(sem resultados)"
    out = []
    for i, h in enumerate(hits, 1):
        score = round(h.get("score", 0), 4)
        p = h.get("payload", {})
        text = p.get("text") or p.get("content") or p.get("page_content") or ""
        src = p.get("source") or p.get("origin") or ""
        tag = p.get("tag", "")
        ts = p.get("ts", "")
        meta = f"tag={tag}" if tag else ""
        if ts:
            meta += f" ts={ts}"
        header = f"[{i}] score={score} {meta} {src}"
        out.append(f"{header}\n{text[:500]}")
    return "\n\n".join(out)


server = Server("adsentice-conversation")


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    coll_desc = ", ".join(f"{k} ({v})" for k, v in COLLECTIONS.items())
    return [
        types.Tool(
            name="adsentice_conversation_search",
            description=f"Busca semântica no histórico de conversas adsentice. Collections: {coll_desc}",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Pergunta ou termo de busca"},
                    "collection": {
                        "type": "string",
                        "enum": list(COLLECTIONS.keys()),
                        "default": "adsentice-conversation",
                    },
                    "limit": {"type": "integer", "default": 5},
                    "tag": {"type": "string", "description": f"Default: {DEFAULT_TAG}. Use 'all' para sem filtro."},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="adsentice_conversation_recall",
            description="Busca em TODAS as collections cross-KG adsentice. Ideal para grounding: 'o que decidimos sobre X?'",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "default": 3},
                    "tag": {"type": "string", "description": f"Default {DEFAULT_TAG}. Use 'all' para sem filtro."},
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="adsentice_conversation_remember",
            description=f"Salva fato, decisão ou memória no claude-memory com tag (default '{DEFAULT_TAG}'). Use para persistir decisões importantes, ADRs, specs.",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Conteúdo a lembrar"},
                    "tag": {"type": "string", "description": f"Default: {DEFAULT_TAG}"},
                    "kind": {"type": "string", "description": "Tipo: decision, spec, adr, insight, fact"},
                    "source": {"type": "string", "description": "Origem: session-id, ADR-XXXX, commit SHA"},
                },
                "required": ["text"],
            },
        ),
        types.Tool(
            name="adsentice_conversation_status",
            description="Estatísticas do histórico de conversas adsentice: total de pontos, coleções, tags.",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@server.call_tool()
async def call_tool(name: str, args: dict) -> list[types.TextContent]:
    if name == "adsentice_conversation_remember":
        text = args.get("text", "")
        tag = args.get("tag") or DEFAULT_TAG
        extra = {}
        if args.get("kind"):
            extra["kind"] = args["kind"]
        if args.get("source"):
            extra["source"] = args["source"]
        try:
            vec = await embed(text)
            pid = await upsert(text, vec, tag, extra)
            return [types.TextContent(type="text", text=f"✓ stored id={pid} tag={tag} in {WRITE_COLL}")]
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ erro: {e}")]

    if name == "adsentice_conversation_search":
        query = args.get("query", "")
        coll = args.get("collection", "adsentice-conversation")
        limit = min(args.get("limit", 5), 10)
        raw_tag = args.get("tag")
        if raw_tag is None:
            tag = DEFAULT_TAG if coll in ("adsentice-conversation", "claude-memory") else None
        else:
            tag = None if raw_tag == "all" else raw_tag

        try:
            vec = await embed(query)
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ embed offline: {e}")]

        try:
            hits = await search(coll, vec, limit, tag)
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ Qdrant offline [{coll}]: {e}")]

        header = f"── {coll} (tag={tag or 'any'}, top {limit}) ──"
        return [types.TextContent(type="text", text=f"{header}\n\n{fmt_hits(hits)}")]

    if name == "adsentice_conversation_recall":
        query = args.get("query", "")
        limit = min(args.get("limit", 3), 5)
        raw_tag = args.get("tag")

        try:
            vec = await embed(query)
        except Exception as e:
            return [types.TextContent(type="text", text=f"❌ embed offline: {e}")]

        async def per_coll(c: str):
            if raw_tag is None:
                t = DEFAULT_TAG if c in ("adsentice-conversation", "claude-memory") else None
            else:
                t = None if raw_tag == "all" else raw_tag
            try:
                return c, t, await search(c, vec, limit, t)
            except Exception as e:
                return c, t, [{"error": str(e)}]

        results = await asyncio.gather(*(per_coll(c) for c in COLLECTIONS))
        blocks = []
        for c, t, hits in results:
            if hits and isinstance(hits[0], dict) and "error" in hits[0]:
                blocks.append(f"── {c} ── erro: {hits[0]['error']}")
            elif hits:
                blocks.append(f"── {c} (tag={t or 'any'}) ──\n{fmt_hits(hits)}")
        return [types.TextContent(
            type="text",
            text="\n\n".join(blocks) if blocks else "(sem resultados cross-KG)",
        )]

    if name == "adsentice_conversation_status":
        tasks = [collection_count(c) for c in COLLECTIONS]
        counts = await asyncio.gather(*tasks)
        stats = dict(zip(COLLECTIONS.keys(), counts))
        total = sum(counts)
        return [types.TextContent(
            type="text",
            text=json.dumps({
                "collections": stats,
                "total_points": total,
                "tag": DEFAULT_TAG,
                "embed": EMBED_URL,
                "qdrant": QDRANT_URL,
            }, indent=2),
        )]

    return [types.TextContent(type="text", text=f"tool desconhecida: {name}")]


async def main():
    async with stdio_server() as (r, w):
        await server.run(r, w, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
