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
    # ═══ FACETS: LAYOUT (7 slots) ═══
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.hero", "source_doc": "Hero section: gradient+badge+h1+subtitle, 50vh, center-aligned"},
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.card", "source_doc": "Card component: white bg, 1px border, shadow+hover, padding 1.5-2rem"},
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.grid", "source_doc": "Grid layout: 2-3 columns, gap 1rem, responsive breakpoints"},
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.section", "source_doc": "Section: vertical spacing, heading+content, optional background"},
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.footer", "source_doc": "Footer: copyright+sources+attribution, border-top separator"},
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.cta", "source_doc": "Call-to-action: gradient bg, pill button, WhatsApp link, urgency"},
    {"source": "vocab.layout", "relation": "has_facet", "target": "vocab.facets.nav", "source_doc": "Navigation: top bar or floating, links+logo, responsive hamburger"},
    # ═══ FACETS: RESPONSIVE (5 breakpoints) ═══
    {"source": "vocab.responsive", "relation": "has_facet", "target": "vocab.facets.mobile", "source_doc": "Mobile: <600px, single column, reduced spacing, touch targets 44px"},
    {"source": "vocab.responsive", "relation": "has_facet", "target": "vocab.facets.tablet", "source_doc": "Tablet: 600-1024px, 2 columns, medium spacing"},
    {"source": "vocab.responsive", "relation": "has_facet", "target": "vocab.facets.desktop", "source_doc": "Desktop: >1024px, full layout, generous whitespace"},
    {"source": "vocab.responsive", "relation": "has_facet", "target": "vocab.facets.breakpoint", "source_doc": "Breakpoints: sm=640px, md=768px, lg=1024px, xl=1280px"},
    {"source": "vocab.responsive", "relation": "has_facet", "target": "vocab.facets.viewport", "source_doc": "Viewport meta: width=device-width, initial-scale=1.0"},
    # ═══ FACETS: SPACING (5 levels) ═══
    {"source": "vocab.spacing", "relation": "has_facet", "target": "vocab.facets.compact", "source_doc": "Compact: 0.5-0.75rem spacing, high density (comercio, dados)"},
    {"source": "vocab.spacing", "relation": "has_facet", "target": "vocab.facets.default", "source_doc": "Default: 1-1.25rem spacing, balanced (saude, servicos, educacao)"},
    {"source": "vocab.spacing", "relation": "has_facet", "target": "vocab.facets.airy", "source_doc": "Airy: 1.5-2rem spacing, premium breathing room (beleza, hospitalidade)"},
    {"source": "vocab.spacing", "relation": "has_facet", "target": "vocab.facets.dense", "source_doc": "Dense: 0.25-0.5rem, maximum information density (dashboards)"},
    {"source": "vocab.spacing", "relation": "has_facet", "target": "vocab.facets.rhythm", "source_doc": "Vertical rhythm: 8pt baseline grid, consistent section gaps"},
    # ═══ FACETS: COLOR/EMOTION (6 moods) ═══
    {"source": "vocab.color", "relation": "has_facet", "target": "vocab.facets.warm", "source_doc": "Warm: terracota, gold, orange hues (alimentacao, hospitalidade)"},
    {"source": "vocab.color", "relation": "has_facet", "target": "vocab.facets.cool", "source_doc": "Cool: azul, verde, teal hues (saude, tecnologia)"},
    {"source": "vocab.color", "relation": "has_facet", "target": "vocab.facets.vibrant", "source_doc": "Vibrant: high saturation, bold contrast (beleza, entretenimento)"},
    {"source": "vocab.color", "relation": "has_facet", "target": "vocab.facets.muted", "source_doc": "Muted: low saturation, subtle palette (servicos corporativos)"},
    {"source": "vocab.color", "relation": "has_facet", "target": "vocab.facets.neutral", "source_doc": "Neutral: grayscale, slate tones (profissional, minimal)"},
    {"source": "vocab.color", "relation": "has_facet", "target": "vocab.facets.dark", "source_doc": "Dark native: carbon-black canvas, warm-gray borders (EVO-API pattern)"},
    # ═══ FACETS: TYPOGRAPHY (5 styles) ═══
    {"source": "vocab.typography", "relation": "has_facet", "target": "vocab.facets.sans", "source_doc": "Sans-serif: Inter, system-ui (default, 90% use case)"},
    {"source": "vocab.typography", "relation": "has_facet", "target": "vocab.facets.serif", "source_doc": "Serif: Playfair Display, Georgia (beleza, hospitalidade premium)"},
    {"source": "vocab.typography", "relation": "has_facet", "target": "vocab.facets.display", "source_doc": "Display: large headings, tight tracking, editorial weight"},
    {"source": "vocab.typography", "relation": "has_facet", "target": "vocab.facets.mono", "source_doc": "Monospace: JetBrains Mono, SF Mono (code, data, logs)"},
    {"source": "vocab.typography", "relation": "has_facet", "target": "vocab.facets.heading_clarity", "source_doc": "Heading: text-wrap:balance, 1.2 line-height, 800 weight"},
    # ═══ FACETS: SHADOW (4 levels) ═══
    {"source": "vocab.shadow", "relation": "has_facet", "target": "vocab.facets.shadow_none", "source_doc": "None: flat design, zero elevation (raio-x plan)"},
    {"source": "vocab.shadow", "relation": "has_facet", "target": "vocab.facets.shadow_subtle", "source_doc": "Subtle: 0 1px 2px rgba(0,0,0,0.05) (sentinela plan)"},
    {"source": "vocab.shadow", "relation": "has_facet", "target": "vocab.facets.shadow_moderate", "source_doc": "Moderate: 0 4px 6px rgba(0,0,0,0.07) (dominio plan)"},
    {"source": "vocab.shadow", "relation": "has_facet", "target": "vocab.facets.shadow_dramatic", "source_doc": "Dramatic: 0 20px 25px rgba(0,0,0,0.1) (escala plan, landing)"},
    # ═══ FACETS: SURFACE (10 mapped to Warp surfaces) ═══
    {"source": "vocab.surface", "relation": "has_facet", "target": "vocab.facets.surface_s10", "source_doc": "S10 Raio-X: dentista→footer, landing template 6 slots"},
    {"source": "vocab.surface", "relation": "has_facet", "target": "vocab.facets.surface_s3", "source_doc": "S3 Dashboard Admin: admin-shell, sidebar+content, data panels"},
    {"source": "vocab.surface", "relation": "has_facet", "target": "vocab.facets.surface_landing", "source_doc": "Landing page: hero→trust→how→capabilities→stats→voice→pricing→faq→cta"},
    {"source": "vocab.surface", "relation": "has_facet", "target": "vocab.facets.surface_dashboard", "source_doc": "Dashboard: sidebar+header+content, kpi cards, charts, tables"},
    # ═══ FACETS: CONVERSION (8 psychological triggers) ═══
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.urgency", "source_doc": "Urgency: limited time, scarcity, countdown (CTA, hero badge)"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.scarcity", "source_doc": "Scarcity: competitive positioning, antes que seus concorrentes"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.social_proof", "source_doc": "Social proof: ratings ★, reviews count, testimonials, logos"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.guarantee", "source_doc": "Guarantee: risk reversal, gratuito pra começar, sem compromisso"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.authority", "source_doc": "Authority: certifications, anos de experiencia, especialista"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.liking", "source_doc": "Liking: fotos da equipe, tom acolhedor, humanizacao"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.reciprocity", "source_doc": "Reciprocity: diagnostico gratuito → relacionamento → upsell"},
    {"source": "vocab.conversion", "relation": "has_facet", "target": "vocab.facets.commitment", "source_doc": "Commitment: micro-compromissos, free trial, passo a passo"},
    # ═══ MEDIA: SVG ANIMATED (SMIL + Lottie + Iconify) ═══
    {"source": "vocab.icon", "relation": "provided_by", "target": "media.icon_set.iconify", "source_doc": "Iconify API: 200K+ icons, 100+ collections, JSON metadata, API: https://api.iconify.design/"},
    {"source": "vocab.icon", "relation": "provided_by", "target": "media.icon_set.svgrepo", "source_doc": "SVG Repo: 500K+ SVG vectors, API: https://www.svgrepo.com/api/"},
    {"source": "vocab.animation", "relation": "provided_by", "target": "media.motion.smil", "source_doc": "SVG SMIL Animations: W3C SVG Animations Level 2, Wikimedia Commons Animated SVG files"},
    {"source": "vocab.animation", "relation": "provided_by", "target": "media.motion.lottie", "source_doc": "LottieFiles: JSON vector animations, Lottie→SVG and SVG→Lottie converters"},
    {"source": "media.motion.smil", "relation": "has_facet", "target": "vocab.facets.animation", "source_doc": "SMIL: <animate>, <animateTransform>, <animateMotion>, morphing paths"},
    {"source": "media.motion.lottie", "relation": "has_facet", "target": "vocab.facets.motion", "source_doc": "Lottie: JSON-driven, After Effects→web, loop+autoplay controls"},
    # ═══ QDRANT FACETS BRIDGE (31 actual facets → KG mapping) ═══
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.health", "source_doc": "saude segment: icon-tooth, hospital, medical cross"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.beauty", "source_doc": "beleza segment: icon-heart, sparkle, star"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.commerce", "source_doc": "comercio segment: icon-shopping-bag, tag, barcode"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.education", "source_doc": "educacao segment: icon-graduation-cap, book, pen"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.hospitality", "source_doc": "hospitalidade segment: icon-building, bed, key"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.food", "source_doc": "alimentacao segment: icon-utensils, coffee, pizza"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.communication", "source_doc": "communication: icon-message, phone, mail, chat"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.create", "source_doc": "create: icon-plus, pen, add-circle"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.dismiss", "source_doc": "dismiss: icon-x, close, delete"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.info", "source_doc": "info: info-circle, help, question"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.stats", "source_doc": "stats: chart-bar, trending-up, activity"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.view", "source_doc": "view: icon-eye, visibility, show"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.warning", "source_doc": "warning: icon-alert-triangle, exclamation, danger"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.location", "source_doc": "location: icon-map-pin, GPS, endereco"},
    {"source": "corpus.components", "relation": "has_facet", "target": "vocab.facets.navigation", "source_doc": "navigation: icon-chevron-up/down/right, arrows, tabs"},
    # ═══ KNOWLEDGE SOURCES (external APIs) ═══
    {"source": "kg.source.wikimedia", "relation": "provided_by", "target": "media.motion.smil", "source_doc": "https://commons.wikimedia.org/w/api.php — Animated SVG files with SMIL metadata"},
    {"source": "kg.source.wikidata", "relation": "feeds_into", "target": "vocab.icon", "source_doc": "https://query.wikidata.org/sparql — SVG icon entities + semantic metadata"},
    {"source": "kg.source.schema_org", "relation": "governs", "target": "vocab.facets.local_business", "source_doc": "Schema.org LocalBusiness: JSON-LD enrichment for rich results"},
    {"source": "kg.source.lov", "relation": "feeds_into", "target": "vocab.design_knowledge", "source_doc": "Linked Open Vocabularies — semantic design vocabulary references"},
    # ═══ CAP: intent_vocab_resolver ═══
    {"source": "cap.intent_vocab_resolver", "relation": "depends_on", "target": "adsentice.qdrant", "source_doc": "resolveIntentVocab(segment, ontology) → VocabFacets → filter Qdrant queries"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.layout", "source_doc": "Layout facets: hero, card, grid, section, footer, cta, nav"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.color", "source_doc": "Color facets: warm, cool, vibrant, muted, neutral, dark"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.typography", "source_doc": "Typography facets: sans, serif, display, mono, heading_clarity"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.spacing", "source_doc": "Spacing facets: compact, default, airy, dense, rhythm"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.shadow", "source_doc": "Shadow facets: none, subtle, moderate, dramatic — plan-tiered"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.conversion", "source_doc": "Conversion facets: urgency, scarcity, social_proof, guarantee, authority, liking, reciprocity, commitment"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.surface", "source_doc": "Surface facets: surface_s10, surface_s3, surface_landing, surface_dashboard"},
    {"source": "cap.intent_vocab_resolver", "relation": "uses", "target": "vocab.responsive", "source_doc": "Responsive facets: mobile, tablet, desktop, breakpoint, viewport"},
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
