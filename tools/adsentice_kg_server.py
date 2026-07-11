#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.0"]
# ///
"""
MCP stdio server — adsentice-kg Knowledge Graph (k0-like).
Navegação sobre entidades, relações e capacidades do ecossistema adsentice.
Dados estáticos — não depende de Qdrant ou embed.
ISOLADO do EVO-API: edges específicas do adsentice.
"""

import json
import os
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

TAG = os.environ.get("TAG", "adsentice")

# ── Knowledge Graph edges (adsentice) ──
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
    # Soluções → Capacidades
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
    # ═══ RSXT BRIDGE ═══
    # Engines hierarchy
    {"source": "rsxt.t0", "relation": "depends_on", "target": "rsxt.s0", "source_doc": "00-FAMILY5-GENERIC.md"},
    {"source": "rsxt.v0", "relation": "depends_on", "target": "rsxt.s0", "source_doc": "00-FAMILY5-GENERIC.md"},
    {"source": "rsxt.k0", "relation": "depends_on", "target": "rsxt.s0", "source_doc": "00-FAMILY5-GENERIC.md"},
    {"source": "rsxt.f0", "relation": "depends_on", "target": "rsxt.t0", "source_doc": "00-FAMILY5-GENERIC.md"},
    {"source": "rsxt.f0", "relation": "depends_on", "target": "rsxt.v0", "source_doc": "00-FAMILY5-GENERIC.md"},
    {"source": "rsxt.f0", "relation": "depends_on", "target": "rsxt.k0", "source_doc": "00-FAMILY5-GENERIC.md"},
    # Layer pipeline L0→L6
    {"source": "rsxt.L0", "relation": "feeds_into", "target": "rsxt.L1", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.L1", "relation": "feeds_into", "target": "rsxt.L2", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.L2", "relation": "feeds_into", "target": "rsxt.L3", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.L3", "relation": "feeds_into", "target": "rsxt.L4", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.L4", "relation": "feeds_into", "target": "rsxt.L5", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.L5", "relation": "feeds_into", "target": "rsxt.L6", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    # Engines → layers they operate at
    {"source": "rsxt.s0", "relation": "operates_at", "target": "rsxt.L0", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.s0", "relation": "operates_at", "target": "rsxt.L1", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.v0", "relation": "operates_at", "target": "rsxt.L3", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.k0", "relation": "operates_at", "target": "rsxt.L4", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.f0", "relation": "operates_at", "target": "rsxt.L5", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    # Doctrines govern engines
    {"source": "rsxt.doctrine.llm_arbitro", "relation": "governs", "target": "rsxt.k0", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.doctrine.llm_arbitro", "relation": "governs", "target": "rsxt.f0", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.doctrine.embedding_sensor", "relation": "governs", "target": "rsxt.v0", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.doctrine.pattern_accum", "relation": "governs", "target": "rsxt.f0", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    {"source": "rsxt.doctrine.founder_signal", "relation": "governs", "target": "rsxt.f0", "source_doc": "02-FAMILY5-DOCTRINE.md"},
    # ADSENTICE BRIDGE — equivalence mapping
    {"source": "adsentice.vault", "relation": "equivalent_to", "target": "rsxt.s0", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.qdrant", "relation": "equivalent_to", "target": "rsxt.v0", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.kg", "relation": "equivalent_to", "target": "rsxt.k0", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.boa", "relation": "equivalent_to", "target": "rsxt.f0", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.diagnostic", "relation": "could_use", "target": "rsxt.L3", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.diagnostic", "relation": "could_use", "target": "rsxt.L4", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.diagnostic", "relation": "could_use", "target": "rsxt.L5", "source_doc": "rsxt-bridge-adsentice.md"},
    {"source": "adsentice.lead_scoring", "relation": "uses", "target": "rsxt.doctrine.founder_signal", "source_doc": "rsxt-bridge-adsentice.md"},
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


server = Server("adsentice-kg")


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="adsentice_kg_edges",
            description="Lista arestas do Knowledge Graph adsentice. Filtrável por entity (source) e relation.",
            inputSchema={
                "type": "object",
                "properties": {
                    "entity": {"type": "string", "description": "Entidade (ex: pipeline.discovery, solution.*)"},
                    "relation": {"type": "string", "description": "Tipo de relação (ex: has_step, uses, provided_by)"},
                },
            },
        ),
        types.Tool(
            name="adsentice_kg_what_produces",
            description="Descobre que entidades/capacidades PRODUZEM um target. Ex: 'o que produz cap.keyword_research?'",
            inputSchema={
                "type": "object",
                "properties": {"target": {"type": "string", "description": "Entidade-alvo"}},
                "required": ["target"],
            },
        ),
        types.Tool(
            name="adsentice_kg_neighbors",
            description="Retorna todas as arestas (incoming + outgoing) de uma entidade. Navegação 1-hop.",
            inputSchema={
                "type": "object",
                "properties": {"entity": {"type": "string", "description": "ID da entidade"}},
                "required": ["entity"],
            },
        ),
        types.Tool(
            name="adsentice_kg_stats",
            description="Estatísticas do Knowledge Graph adsentice: total de entidades, arestas, tipos de relação.",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@server.call_tool()
async def call_tool(name: str, args: dict) -> list[types.TextContent]:
    if name == "adsentice_kg_edges":
        results = find_edges(args.get("entity", ""), args.get("relation", ""))
    elif name == "adsentice_kg_what_produces":
        results = what_produces(args.get("target", ""))
    elif name == "adsentice_kg_neighbors":
        results = [neighbors(args.get("entity", ""))]
    elif name == "adsentice_kg_stats":
        sources = set(e["source"] for e in ADSENTICE_EDGES)
        targets = set(e["target"] for e in ADSENTICE_EDGES)
        relations = set(e["relation"] for e in ADSENTICE_EDGES)
        results = [{
            "entities": len(sources | targets),
            "edges": len(ADSENTICE_EDGES),
            "relations": sorted(relations),
            "tag": TAG,
        }]
    else:
        return [types.TextContent(type="text", text=f"tool desconhecida: {name}")]

    return [types.TextContent(
        type="text",
        text=json.dumps(results, ensure_ascii=False, indent=2),
    )]


async def main():
    async with stdio_server() as (r, w):
        await server.run(r, w, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
