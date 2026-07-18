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
    # ═══ MEDIA & SVG VOCABULARY (ADR-0036 · ingest 2026-07-18) ═══
    # Icon vocabulary — 8 Lucide SVG icons with facets
    {"source": "vocab.icon", "relation": "provided_by", "target": "media.icon_set.lucide", "source_doc": "context7 + Lucide docs · 8 SVG icons com facets"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.icon", "source_doc": "Lucide icons: search, chart, trend, message, star, shield, spark, arrow-right"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.search", "source_doc": "icon-search (magnifying glass)"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.chart", "source_doc": "icon-chart (bar graph), icon-trend (arrow growth)"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.action", "source_doc": "icon-message (chat), icon-arrow-right (CTA)"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.rating", "source_doc": "icon-star (star rating)"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.trust", "source_doc": "icon-shield (security)"},
    {"source": "media.icon_set.lucide", "relation": "has_facet", "target": "vocab.facets.premium", "source_doc": "icon-spark (AI highlight)"},
    # Animation vocabulary — 4 patterns with facets
    {"source": "vocab.animation", "relation": "provided_by", "target": "media.motion.css_scroll", "source_doc": "CSS Scroll-Driven Animations Spec · 2026"},
    {"source": "vocab.animation", "relation": "provided_by", "target": "media.motion.css_keyframes", "source_doc": "adsentice-original: fadeInUp, fadeIn, scaleIn, slideUp, pulse"},
    {"source": "vocab.animation", "relation": "provided_by", "target": "media.motion.gsap", "source_doc": "GSAP v3 ScrollTrigger · context7"},
    {"source": "vocab.animation", "relation": "provided_by", "target": "media.motion.framer", "source_doc": "Framer Motion · context7"},
    {"source": "media.motion.css_scroll", "relation": "has_facet", "target": "vocab.facets.animation", "source_doc": "CSS scroll-driven: view-timeline, animation-timeline, animation-range"},
    {"source": "media.motion.css_keyframes", "relation": "has_facet", "target": "vocab.facets.keyframe", "source_doc": "@keyframes catalog: fadeInUp, fadeIn, scaleIn, slideUp"},
    {"source": "media.motion.gsap", "relation": "has_facet", "target": "vocab.facets.scroll", "source_doc": "GSAP: pin, scrub, snap, stagger timeline"},
    {"source": "media.motion.framer", "relation": "has_facet", "target": "vocab.facets.motion", "source_doc": "Framer Motion: variants, spring, SVG path, gesture"},
    # Big Tech design patterns ingested (2026-07-18)
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.tailwind_v4", "source_doc": "Tailwind CSS v4 @theme oklch design tokens · context7"},
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.material3", "source_doc": "Material Design 3: dynamic color, typography scale, shapes · context7"},
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.carbon_ibm", "source_doc": "Carbon (IBM): component tokens, spacing scale · context7"},
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.primer_github", "source_doc": "Primer (GitHub): CSS-first buttons, state management · context7"},
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.atlassian", "source_doc": "Atlassian: elevation tokens, interaction states · context7"},
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.open_props", "source_doc": "Open Props: 450+ CSS custom properties · context7"},
    {"source": "vocab.design_knowledge", "relation": "provided_by", "target": "media.design.polaris_shopify", "source_doc": "Polaris (Shopify): token-first enforcement · context7"},
    # A11y & Performance patterns
    {"source": "vocab.a11y", "relation": "provided_by", "target": "media.a11y.wcag22", "source_doc": "WCAG 2.2 AA: 15 checks, focus indicators, contrast ratios · context7"},
    {"source": "vocab.performance", "relation": "provided_by", "target": "media.perf.web_vitals", "source_doc": "Web Vitals: LCP≤2500ms, CLS≤0.1, INP≤200ms · context7"},
    # Corpus SVG → Qdrant
    {"source": "corpus.svg", "relation": "depends_on", "target": "adsentice.qdrant", "source_doc": "8 SVG icon paths com facets no Qdrant adsentice-self"},
    {"source": "corpus.svg", "relation": "has_facet", "target": "vocab.facets.icon", "source_doc": "kind=component, category=icon, 8 Lucide SVGs"},
    {"source": "corpus.animation", "relation": "depends_on", "target": "adsentice.qdrant", "source_doc": "4 animation patterns com facets no Qdrant"},
    # render_media capability (EVO-API pattern)
    {"source": "cap.render_media", "relation": "depends_on", "target": "adsentice.qdrant", "source_doc": "EVO-API compose.rs: render_media() → query_vocab(facet=icon/chart/motion) → SVG real ou placeholder honesto"},
    {"source": "cap.render_media", "relation": "uses", "target": "vocab.icon", "source_doc": "query_vocab('icone busca', facet=icon) → SVG path"},
    {"source": "cap.render_media", "relation": "uses", "target": "vocab.animation", "source_doc": "query_vocab('fade stagger', facet=animation) → @keyframes CSS"},
    {"source": "cap.render_media", "relation": "governs", "target": "rsxt.doctrine.embedding_sensor", "source_doc": "EVO-API: score≥0.80→SVG real, score≥0.60→placeholder, score<0.60→text only"},
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
