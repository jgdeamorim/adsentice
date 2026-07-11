#!/usr/bin/env python3
"""
adsentice_kg_server.py — MCP server para o Knowledge Graph do adsentice (k0-like via Qdrant :6352).
Expoe tools para navegar entidades, relacoes e travessias do ecossistema adsentice.
ISOLADO do EVO-API: collection adsentice-kg, tag adsentice.
"""

import json
import os
import sys
from urllib.request import Request, urlopen

QDRANT_URL = os.getenv("QDRANT_URL", "http://127.0.0.1:6352")
COLLECTION = os.getenv("COLLECTION", "adsentice-kg")
EMBED_URL = os.getenv("EMBED_URL", "http://127.0.0.1:8081")
TAG = os.getenv("TAG", "adsentice")

# ── Knowledge Graph edges (adsentice) ──
# Cada edge = (source_entity, relation, target_entity, evidence_source)
ADSENTICE_EDGES: list[dict] = [
    # Pipeline de Discovery
    {"source": "pipeline.discovery", "relation": "has_step", "target": "pipeline.site_audit", "source_doc": "ADR-0002 (pendente)"},
    {"source": "pipeline.discovery", "relation": "has_step", "target": "pipeline.seo_discovery", "source_doc": "ADR-0002"},
    {"source": "pipeline.discovery", "relation": "has_step", "target": "pipeline.gmb_reputation", "source_doc": "ADR-0002"},
    {"source": "pipeline.discovery", "relation": "has_step", "target": "pipeline.competitor_intel", "source_doc": "ADR-0002"},
    {"source": "pipeline.discovery", "relation": "has_step", "target": "pipeline.ads_intelligence", "source_doc": "ADR-0002"},
    {"source": "pipeline.discovery", "relation": "has_step", "target": "pipeline.social_discovery", "source_doc": "ADR-0002"},
    # Capabilities → Provedores
    {"source": "cap.keyword_research", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    {"source": "cap.serp_organic", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    {"source": "cap.domain_competitors", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    {"source": "cap.business_profile_gmb", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    {"source": "cap.business_reviews", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    {"source": "cap.on_page_lighthouse", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    {"source": "cap.ads_traffic_forecast", "relation": "provided_by", "target": "provider.dataforseo", "source_doc": "DataForSEO MCP oficial"},
    # Solucoes → Capacidades
    {"source": "solution.diagnostico_seo_local", "relation": "uses", "target": "cap.keyword_research", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.diagnostico_seo_local", "relation": "uses", "target": "cap.serp_organic", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.diagnostico_seo_local", "relation": "uses", "target": "cap.business_profile_gmb", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.diagnostico_seo_local", "relation": "uses", "target": "cap.business_reviews", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.analise_concorrencia", "relation": "uses", "target": "cap.domain_competitors", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.analise_concorrencia", "relation": "uses", "target": "cap.keyword_research", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.reputacao_online", "relation": "uses", "target": "cap.business_reviews", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.auditoria_site", "relation": "uses", "target": "cap.on_page_lighthouse", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    {"source": "solution.estrategia_anuncios", "relation": "uses", "target": "cap.ads_traffic_forecast", "source_doc": "adsentice-objetivos-solucoes-criterios.md"},
    # Infra
    {"source": "adsentice.platform", "relation": "has_service", "target": "service.redis", "source_doc": "docker-compose.yml"},
    {"source": "adsentice.platform", "relation": "has_service", "target": "service.qdrant", "source_doc": "docker-compose.yml"},
    {"source": "adsentice.platform", "relation": "has_service", "target": "service.embed", "source_doc": "docker-compose.yml"},
    {"source": "service.redis", "relation": "runs_on", "target": "port.6396", "source_doc": "docker-compose.yml"},
    {"source": "service.qdrant", "relation": "runs_on", "target": "port.6352", "source_doc": "docker-compose.yml"},
    {"source": "service.embed", "relation": "runs_on", "target": "port.8081", "source_doc": "docker-compose.yml"},
    # Stack
    {"source": "adsentice.platform", "relation": "runs_on", "target": "vercel", "source_doc": "ADR-0001"},
    {"source": "adsentice.platform", "relation": "runs_on", "target": "railway", "source_doc": "ADR-0001"},
    {"source": "adsentice.platform", "relation": "runs_on", "target": "supabase", "source_doc": "ADR-0001"},
    {"source": "adsentice.platform", "relation": "runs_on", "target": "cloudflare_r2", "source_doc": "ADR-0001"},
    {"source": "adsentice.platform", "relation": "runs_on", "target": "deepseek", "source_doc": "ADR-0001"},
    {"source": "adsentice.platform", "relation": "runs_on", "target": "qwen_local", "source_doc": "ADR-0001"},
]


def find_edges(entity_id: str = "", relation: str = "") -> list[dict]:
    out = []
    for e in ADSENTICE_EDGES:
        smatch = not entity_id or e["source"] == entity_id or entity_id in e["source"]
        rmatch = not relation or e["relation"] == relation or relation in e["relation"]
        if smatch and rmatch:
            out.append(e)
    return out

def what_produces(target: str) -> list[dict]:
    return [e for e in ADSENTICE_EDGES if target in e["target"]]

def neighbors(entity_id: str) -> dict:
    incoming = [e for e in ADSENTICE_EDGES if e["target"] == entity_id]
    outgoing = [e for e in ADSENTICE_EDGES if e["source"] == entity_id]
    return {"entity": entity_id, "incoming": incoming, "outgoing": outgoing, "count": len(incoming) + len(outgoing)}


def handle_request(request: dict) -> dict:
    method = request.get("method", "")
    req_id = request.get("id", 0)

    if method == "tools/list":
        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"tools": [
                {
                    "name": "adsentice_kg_edges",
                    "description": "Lista arestas do Knowledge Graph adsentice. Filtravel por entity (source) e relation.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "entity": {"type": "string", "description": "Entidade (ex: pipeline.discovery, solution.*)"},
                            "relation": {"type": "string", "description": "Tipo de relacao (ex: has_step, uses, provided_by)"}
                        }
                    }
                },
                {
                    "name": "adsentice_kg_what_produces",
                    "description": "Descobre que entidades/capacidades PRODUZEM um target. Ex: 'o que produz cap.keyword_research?'",
                    "inputSchema": {
                        "type": "object",
                        "properties": {"target": {"type": "string", "description": "Entidade-alvo"}},
                        "required": ["target"]
                    }
                },
                {
                    "name": "adsentice_kg_neighbors",
                    "description": "Retorna todas as arestas (incoming + outgoing) de uma entidade. Navegacao 1-hop.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {"entity": {"type": "string", "description": "ID da entidade"}},
                        "required": ["entity"]
                    }
                },
                {
                    "name": "adsentice_kg_stats",
                    "description": "Estatisticas do Knowledge Graph adsentice: total de entidades, arestas, tipos de relacao.",
                    "inputSchema": {"type": "object", "properties": {}}
                }
            ]}
        }

    elif method == "tools/call":
        tool = request.get("params", {}).get("name", "")
        args = request.get("params", {}).get("arguments", {})

        if tool == "adsentice_kg_edges":
            results = find_edges(args.get("entity", ""), args.get("relation", ""))
        elif tool == "adsentice_kg_what_produces":
            results = what_produces(args.get("target", ""))
        elif tool == "adsentice_kg_neighbors":
            results = [neighbors(args.get("entity", ""))]
        elif tool == "adsentice_kg_stats":
            sources = set(e["source"] for e in ADSENTICE_EDGES)
            targets = set(e["target"] for e in ADSENTICE_EDGES)
            relations = set(e["relation"] for e in ADSENTICE_EDGES)
            results = [{
                "entities": len(sources | targets),
                "edges": len(ADSENTICE_EDGES),
                "relations": sorted(relations),
                "tag": TAG
            }]
        else:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {tool}"}}

        return {
            "jsonrpc": "2.0", "id": req_id,
            "result": {"content": [{"type": "text", "text": json.dumps(results, ensure_ascii=False, indent=2)}]}
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
