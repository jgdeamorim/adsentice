#!/usr/bin/env python3
"""
adsentice_qdrant_server.py — MCP server para consulta ao corpus adsentice-self (Qdrant :6352).
Expoe tools para busca semantica sobre docs, ADRs, specs e codigo do adsentice.
ISOLADO do EVO-API: collection adsentice-self, Qdrant :6352.
"""

import json
import os
import sys
from urllib.request import Request, urlopen
from urllib.error import URLError

QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6352")
COLLECTION = os.getenv("QDRANT_COLLECTION", "adsentice-self")
EMBED_URL = os.getenv("EMBED_URL", "http://127.0.0.1:8081")

def embed(text: str) -> list[float]:
    """Envia texto para o embed server :8081 e retorna vetor."""
    try:
        req = Request(
            f"{EMBED_URL}/embed",
            data=json.dumps({"text": text}).encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=10)
        return json.loads(resp.read()).get("embedding", [])
    except Exception:
        return []

def qdrant_search(vector: list[float], limit: int = 5) -> list[dict]:
    """Busca no Qdrant por similaridade."""
    if not vector:
        return []
    try:
        body = json.dumps({
            "vector": vector,
            "limit": limit,
            "with_payload": True
        })
        req = Request(
            f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
            data=body.encode(),
            headers={"Content-Type": "application/json"}
        )
        resp = urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result.get("result", [])
    except URLError:
        return []

def handle_request(request: dict) -> dict:
    method = request.get("method", "")
    req_id = request.get("id", 0)

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "adsentice_search",
                        "description": "Busca semantica no corpus adsentice-self (docs, ADRs, specs, codigo). Retorna os trechos mais relevantes com source e score.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Pergunta ou termo de busca"},
                                "limit": {"type": "integer", "description": "Numero maximo de resultados", "default": 5}
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "adsentice_docs_list",
                        "description": "Lista os documentos do corpus adsentice — specs, ADRs, docs de estrategia.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "kind": {"type": "string", "description": "Filtro: spec, adr, strategy, all"}
                            }
                        }
                    },
                    {
                        "name": "adsentice_status",
                        "description": "Retorna o status do ecossistema adsentice — Redis OODA, Qdrant, embed, docs.",
                        "inputSchema": {"type": "object", "properties": {}}
                    }
                ]
            }
        }

    elif method == "tools/call":
        tool_name = request.get("params", {}).get("name", "")
        args = request.get("params", {}).get("arguments", {})

        if tool_name == "adsentice_search":
            query = args.get("query", "")
            limit = min(args.get("limit", 5), 10)
            vec = embed(query)
            hits = qdrant_search(vec, limit)
            results = []
            for h in hits:
                payload = h.get("payload", {})
                results.append({
                    "source": payload.get("source", "?"),
                    "kind": payload.get("kind", "?"),
                    "content": payload.get("content", "")[:300],
                    "score": round(h.get("score", 0), 4)
                })
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps({
                        "query": query,
                        "hits": results,
                        "total": len(results)
                    }, ensure_ascii=False, indent=2)}]
                }
            }

        elif tool_name == "adsentice_docs_list":
            import glob
            docs_dir = os.path.join(os.path.dirname(__file__), "..", "docs")
            files = []
            for pattern in ["**/*.md", "**/*.json"]:
                for f in glob.glob(os.path.join(docs_dir, pattern), recursive=True):
                    rel = os.path.relpath(f, docs_dir)
                    kind = "spec" if "spec/" in rel or "adsentice-" in rel else \
                           "adr" if "adr/" in rel else \
                           "reference" if "jasper-docs/" in rel else "other"
                    files.append({"path": rel, "kind": kind})
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps({
                        "files": files,
                        "total": len(files)
                    }, ensure_ascii=False, indent=2)}]
                }
            }

        elif tool_name == "adsentice_status":
            status = {"qdrant": "unknown", "redis": "unknown", "embed": "unknown"}
            try:
                urlopen(Request(f"{QDRANT_URL}/healthz"), timeout=2)
                status["qdrant"] = "online"
            except Exception:
                status["qdrant"] = "offline"
            import redis as _redis
            try:
                r = _redis.Redis(host="127.0.0.1", port=6396, socket_connect_timeout=1)
                r.ping()
                status["redis"] = "online"
            except Exception:
                status["redis"] = "offline"
            try:
                req = Request(f"{EMBED_URL}/healthz")
                urlopen(req, timeout=2)
                status["embed"] = "online"
            except Exception:
                status["embed"] = "offline"
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps(status, indent=2)}]
                }
            }

    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown: {method}"}}

if __name__ == "__main__":
    for line in sys.stdin:
        try:
            req = json.loads(line.strip())
            resp = handle_request(req)
            print(json.dumps(resp), flush=True)
        except json.JSONDecodeError:
            continue
