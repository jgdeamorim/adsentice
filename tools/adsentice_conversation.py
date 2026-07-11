#!/usr/bin/env python3
"""
adsentice_conversation.py — MCP server para historico de conversas adsentice.
Ingesta do historico de sessoes Claude Code no Qdrant (:6352) para grounding
DAG e medido=verdade (toda afirmacao recupera a conversa que a originou).

Collections:
  adsentice-conversation  → historico das conversas (tag=adsentice)
  claude-memory           → memoria ativa curada (tag=adsentice)

Padrao: EVO-API mcp_qdrant_conversation.py (tag=all, collections evoapi_conversation).
Aqui ISOLADO: Qdrant :6352 · embed :8081 · tag=adsentice.

Tools:
  adsentice_conversation_search  → busca semantica no historico de conversas
  adsentice_conversation_remember → salva fato/memoria no claude-memory
  adsentice_conversation_recall  → busca em TODAS collections (cross-KG)
  adsentice_conversation_status  → estatisticas do historico
"""

import asyncio
import json
import os
import time
import uuid
from urllib.request import Request, urlopen

EMBED_URL = os.environ.get("CLAUDE_KG_EMBED_URL", "http://127.0.0.1:8081/embed")
QDRANT_URL = os.environ.get("CLAUDE_KG_QDRANT_URL", "http://127.0.0.1:6352")
DEFAULT_TAG = os.environ.get("CLAUDE_KG_TAG", "adsentice")
WRITE_COLL = "claude-memory"

COLLECTIONS = {
    "adsentice-conversation": "historico das conversas adsentice (sessoes Claude · use tag='adsentice')",
    "claude-memory": "memoria ativa Claude (KG curado · tag adsentice)",
    "adsentice-self": "corpus adsentice (docs, ADRs, specs, codigo · tag=adsentice)",
    "adsentice-materio": "design tokens Materio (palette, typography, spacing · tag=materio)",
}

def embed_sync(text: str) -> list[float]:
    try:
        req = Request(
            f"{EMBED_URL}",
            data=json.dumps({"texts": [text]}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=10)
        return json.loads(resp.read()).get("vectors", [[]])[0]
    except Exception:
        return []


def search_sync(collection: str, vec: list[float], limit: int, tag: str | None) -> list[dict]:
    body = {"vector": vec, "limit": limit, "with_payload": True}
    if tag and tag.lower() != "all":
        body["filter"] = {"must": [{"key": "tag", "match": {"value": tag}}]}
    try:
        req = Request(
            f"{QDRANT_URL}/collections/{collection}/points/search",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=10)
        return json.loads(resp.read()).get("result", [])
    except Exception:
        return []


def upsert_sync(text: str, vec: list[float], tag: str, extra: dict | None) -> str:
    point_id = str(uuid.uuid4())
    payload = {"text": text, "tag": tag, "ts": int(time.time()), "source": "adsentice-conversation"}
    if extra:
        payload.update(extra)
    body = {"points": [{"id": point_id, "vector": vec, "payload": payload}]}
    try:
        req = Request(
            f"{QDRANT_URL}/collections/{WRITE_COLL}/points?wait=true",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return point_id if result.get("status") == "ok" else ""
    except Exception:
        return ""


def collection_stats(collection: str) -> dict:
    try:
        req = Request(
            f"{QDRANT_URL}/collections/{collection}/points/count",
            data=b"{}", headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=5)
        return json.loads(resp.read()).get("result", {})
    except Exception:
        return {"count": 0, "error": "offline"}


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


def handle_request(request: dict) -> dict:
    method = request.get("method", "")
    req_id = request.get("id", 0)

    if method == "tools/list":
        coll_desc = ", ".join(f"{k} ({v})" for k, v in COLLECTIONS.items())
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"tools": [
                {
                    "name": "adsentice_conversation_search",
                    "description": f"Busca semantica no historico de conversas adsentice. Collections: {coll_desc}",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Pergunta ou termo de busca"},
                            "collection": {"type": "string", "enum": list(COLLECTIONS.keys()), "default": "adsentice-conversation"},
                            "limit": {"type": "integer", "default": 5},
                            "tag": {"type": "string", "description": f"Default: {DEFAULT_TAG}. Use 'all' para sem filtro."}
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "adsentice_conversation_recall",
                    "description": "Busca em TODAS as collections cross-KG adsentice. Ideal para grounding: 'o que decidimos sobre X?'",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "limit": {"type": "integer", "default": 3},
                            "tag": {"type": "string", "description": f"Default {DEFAULT_TAG}. Use 'all' para sem filtro."}
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "adsentice_conversation_remember",
                    "description": f"Salva fato, decisao ou memoria no claude-memory com tag (default '{DEFAULT_TAG}'). Use para persistir decisoes importantes, ADRs, specs.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string", "description": "Conteudo a lembrar"},
                            "tag": {"type": "string", "description": f"Default: {DEFAULT_TAG}"},
                            "kind": {"type": "string", "description": "Tipo: decision, spec, adr, insight, fact"},
                            "source": {"type": "string", "description": "Origem: session-id, ADR-XXXX, commit SHA"}
                        },
                        "required": ["text"]
                    }
                },
                {
                    "name": "adsentice_conversation_status",
                    "description": "Estatisticas do historico de conversas adsentice: total de pontos, colecoes, tags.",
                    "inputSchema": {"type": "object", "properties": {}}
                }
            ]}
        }

    elif method == "tools/call":
        tool = request.get("params", {}).get("name", "")
        args = request.get("params", {}).get("arguments", {})

        if tool == "adsentice_conversation_remember":
            text = args.get("text", "")
            tag = args.get("tag") or DEFAULT_TAG
            extra = {}
            if args.get("kind"):
                extra["kind"] = args["kind"]
            if args.get("source"):
                extra["source"] = args["source"]
            vec = embed_sync(text)
            if not vec:
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": "❌ embed offline"}]}}
            pid = upsert_sync(text, vec, tag, extra)
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": f"✓ stored id={pid} tag={tag} in {WRITE_COLL}"}]}}

        elif tool == "adsentice_conversation_search":
            query = args.get("query", "")
            coll = args.get("collection", "adsentice-conversation")
            limit = min(args.get("limit", 5), 10)
            raw_tag = args.get("tag")
            if raw_tag is None:
                tag = DEFAULT_TAG if coll in ("adsentice-conversation", "claude-memory") else None
            else:
                tag = None if raw_tag == "all" else raw_tag

            vec = embed_sync(query)
            if not vec:
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": "❌ embed offline"}]}}

            hits = search_sync(coll, vec, limit, tag)
            header = f"── {coll} (tag={tag or 'any'}, top {limit}) ──"
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": f"{header}\n\n{fmt_hits(hits)}"}]}}

        elif tool == "adsentice_conversation_recall":
            query = args.get("query", "")
            limit = min(args.get("limit", 3), 5)
            raw_tag = args.get("tag")
            vec = embed_sync(query)
            if not vec:
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": "❌ embed offline"}]}}

            blocks = []
            for coll in COLLECTIONS:
                if raw_tag is None:
                    tag = DEFAULT_TAG if coll in ("adsentice-conversation", "claude-memory") else None
                else:
                    tag = None if raw_tag == "all" else raw_tag
                hits = search_sync(coll, vec, limit, tag)
                if hits:
                    blocks.append(f"── {coll} (tag={tag or 'any'}) ──\n{fmt_hits(hits)}")
            result = "\n\n".join(blocks) if blocks else "(sem resultados cross-KG)"
            r = {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": result}]}}
            return r

        elif tool == "adsentice_conversation_status":
            stats = {}
            total = 0
            for coll in COLLECTIONS:
                s = collection_stats(coll)
                count = s.get("count", 0)
                stats[coll] = count
                total += count
            return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps({
                "collections": stats,
                "total_points": total,
                "tag": DEFAULT_TAG,
                "embed": EMBED_URL,
                "qdrant": QDRANT_URL,
            }, indent=2)}]}}

    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown: {method}"}}


if __name__ == "__main__":
    import sys
    for line in sys.stdin:
        try:
            req = json.loads(line.strip())
            resp = handle_request(req)
            print(json.dumps(resp), flush=True)
        except json.JSONDecodeError:
            continue
