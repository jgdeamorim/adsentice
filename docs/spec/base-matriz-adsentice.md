---
id: base-matriz-adsentice
title: "Base-Matriz do Ecossistema adsentice — mapa navegável versionado"
status: living
type: spec
version: "2.0.0"
date: 2026-07-11
updated: 2026-07-19T13:30:00-03:00
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
tags: [base-matriz, adsentice, mapa, navegavel, ecossistema]
---

# Base-Matriz do Ecossistema adsentice v2.0.0

> **Propósito:** mapa navegável e versionado do ecossistema adsentice — o que existe, onde está, quais as rotas estáveis.
> **Regra-mãe:** `medido=verdade` — toda rota cita fonte (arquivo, commit, teste). Sem fonte = não verificado.
> **Língua:** português (pt-BR).
> **ISOLADO do EVO-API:** este é o ecossistema adsentice standalone.
> **Protocolo de interação:** AG-UI (MIT) — 24 eventos, 13 padrões. Chat é 1 dos 13, não o sistema.

---

## Dimensões (7)

```
ADS.COR  — CORPUS     (docs, specs, ADRs, código)
ADS.CAP  — CAPABILIDADES (DataForSEO, DeepSeek, Qwen, pipelines)
ADS.INT  — INTELIGÊNCIA (brain, chat, OODA, scoring)
ADS.INF  — INFRAESTRUTURA (Redis :6396, Qdrant :6352, Embed :8081, Vercel, Railway, Supabase)
ADS.PRD  — PRODUTO     (chat, discovery, deep-dive, créditos, planos)
ADS.MIS  — MISSÃO      (objetivos, métricas, anti-posicionamento)
ADS.EVD  — EVIDÊNCIA   (vault, audit trail, testes, métricas)
```

---

## Dimensão COR(pus) — {#ADS.COR}

### ADS.COR.docs — Documentação

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.docs.objetivos` | Objetivos, soluções e critérios | `docs/adsentice-objetivos-solucoes-criterios.md` | ✅ vivo |
| `ADS.COR.docs.chat_spec` | Especificação do Interaction Hub (AG-UI native) | `docs/adsentice-chat-spec.md` | ✅ v1.0.0 · AG-UI |
| `ADS.COR.docs.jasper_analise` | Análise competitiva Jasper.ai | `docs/jasper-ai-analise-competitiva.md` | ✅ vivo |
| `ADS.COR.docs.jasper_analise` | Análise competitiva Jasper.ai | `docs/jasper-ai-analise-competitiva.md` | ✅ vivo |
| `ADS.COR.docs.jasper_solutions` | Análise soluções Jasper | `docs/jasper-solutions-analise.md` | ✅ vivo |
| `ADS.COR.docs.jasper_api` | Documentação API Jasper (16 seções) | `docs/jasper-docs/jasper-api-docs-completo.md` | ✅ referência |
| `ADS.COR.docs.jasper_reference` | Referência canônica Jasper → adsentice (gap analysis, padrões) | `docs/jasper-docs/README.md` | ✅ vivo |
| `ADS.COR.docs.jasper_probe` | Probe público Jasper (llms.txt, MCP OAuth, Context Items) | `docs/jasper-docs/probe-2026-07-11-public.md` | ✅ 73 páginas mapeadas |
| `ADS.COR.docs.gojasper_repos` | Análise dos 10 repos gojasper (ouro/prata/bronze) | `docs/jasper-docs/gojasper-repos-analysis.md` | ✅ vivo |
| `ADS.COR.docs.comparativo_dfseo` | DataForSEO MCP oficial vs EVO-API provider.core | `docs/dataforseo-oficial-mcp-vs-evo-api-provider-core.md` | ✅ vivo |
| `ADS.COR.docs.comparativo_claude_seo` | RSXT+EVO-API vs Claude SEO | `docs/rsxt-evo-api-vs-claude-seo.md` | ✅ vivo |
| `ADS.COR.docs.pain_criteria` | Matriz de Dor Inteligente v1.2 — Schwartz awareness levels + ESC lead scoring composto | `docs/spec/adsentice-pain-criteria-v1.md` | ✅ v1.2.0 |
| `ADS.COR.docs.discovery_engine` | Motor de Descoberta parametrizável com filtros de dor | `docs/spec/adsentice-discovery-engine.md` | ✅ vivo |
| `ADS.COR.docs.marketing_vocab` | Mapeamento vocabulário marketing (55 skills Corey+Kim → adsentice) | `docs/spec/adsentice-marketing-vocab.md` | ✅ v1.0.0 |
| `ADS.COR.docs.esc_skills_analysis` | Análise ESC gui.marketing (27 skills) → Dashboard adsentice | `docs/spec/adsentice-esc-skills-analysis.md` | ✅ v1.0.0 |
| `ADS.COR.docs.enrichment_layers` | Anatomia completa GMB 27 campos canônicos + 5 camadas de enriquecimento | `docs/spec/adsentice-enrichment-layers.md` | ✅ v2.0.0 |
| `ADS.COR.docs.architecture_flow` | Arquitetura completa — fluxo operacional técnico com diagrama ASCII + 12 seções | `docs/spec/adsentice-architecture-flow.md` | ✅ v1.0.1 |
| `ADS.COR.docs.enrichment_capabilities` | Matriz completa de capacidades EVO-API por camada L0-L4 (76 caps → 29+ sinais de scoring) | `docs/spec/adsentice-lead-enrichment-capabilities.md` | ✅ v1.0.0 |

### ADS.COR.vendor — Referências Externas

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.vendor.marketingskills` | Corey Haines — 43 skills SaaS marketing (SEO, CRO, analytics, pricing, copy, growth) | `vendor/marketingskills/` | ✅ MIT · gitignored |
| `ADS.COR.vendor.advertising_skills` | Kim Barrett — 12 skills direct response (Schwartz, avatar, offer, objection, funnel) | `vendor/advertising-skills/` | ✅ MIT · gitignored |
| `ADS.COR.vendor.esc_skills` | gui.marketing — 27 skills agência de performance (lead scoring, measurement, brandformance, ICP, CRO) | `~/Downloads/esc-skills-main/` | ✅ referência externa |

### ADS.COR.adr — ADRs

| Rota | Descrição | Status |
|---|---|---|
| `ADS.COR.adr.0001` | Arquitetura standalone adsentice | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0002` | Gap analysis EVO-API vs adsentice | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0003` | MCP Server Architecture | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0004` | AG-UI Protocol Decision | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0005` | Lead Funnel & CRM Strategy | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0006` | EVO-API as Data Engine | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0007` | MVP Simplification | ✅ accepted (2026-07-11) |
| `ADS.COR.adr.0008` | EVO-API como Motor de Enriquecimento Completo (76 caps → L0-L4) | ✅ accepted (2026-07-13) |
| `ADS.COR.adr.0009` | Market Intelligence Engine (lead-level → market-level) | ✅ accepted (2026-07-13) |
| `ADS.COR.adr.0010` | Cloudflare Free Tier como Plataforma Enterprise (Workers+D1+Queues+R2) | ✅ accepted (2026-07-13) |
| `ADS.COR.adr.0011` | adsentice Brain OODA — 12 containers cognitivos (c0-c4 + B2-B3 + D1 + A3) | ✅ accepted (2026-07-13) |
| `ADS.COR.adr.0012` | Estrategia por Categoria/Nicho — cada segmento tem seu proprio ecossistema | ✅ accepted (2026-07-13) |
| `ADS.COR.adr.0013` | Build vs Buy — Estrategia de Integracao de APIs (8 gaps SGA) | ⬜ proposed (2026-07-14) |
| `ADS.COR.adr.0014` | Arquitetura DevOps Cloud — Cloudflare + Railway + Supabase + Qdrant | ❌ superseded (por ADR-0016) |
| `ADS.COR.adr.0015` | Arquitetura Real Rust — EVO-API + rsxt como backend | ❌ superseded (por ADR-0016) |
| `ADS.COR.adr.0016` | Adsentice Soberano — Hetzner CAX11, nao Railway, TypeScript nativo | ✅ accepted (2026-07-14) |
| `ADS.COR.adr.0017` | Frontend Enterprise — React 19 + Vite + Tailwind + shadcn/ui + tokens proprios | ✅ accepted (2026-07-14) |
| `ADS.COR.adr.0018` | Familia Warp — Design System Vivo com Composicao por Intent Semantico (9 modulos) | ✅ accepted (2026-07-14) |
| `ADS.COR.adr.0019` | Fontes de Conhecimento — context7 (primaria, enabled) vs 21st-magic (inspiracao, disabled) | ✅ accepted (2026-07-14) |
| `ADS.COR.adr.0020` | Compositor de Tokens Semânticos — Design System Morph por Intent de Mercado (M9 Warp) | ✅ accepted (2026-07-14) |
| `ADS.COR.adr.0021` | Dual Embed e0+e1 — Arquitetura multilíngue (EN code + PT prose) para busca semântica | ✅ accepted (2026-07-15) |
| `ADS.COR.adr.0022` | Geo Intelligence Engine — Turf.js + H3 + Leaflet para Discovery Geoespacial ($0, 3 fases) | ✅ accepted (2026-07-15) |
| `ADS.COR.adr.0023` | Discovery Auto-Pilot — Cobertura Geoespacial + Localização Automática + Conversão Intelligence (3 camadas) | ✅ accepted (2026-07-15) |
| `ADS.COR.adr.0024` | Enrichment Layers L0-L4 — Market Intelligence Orchestrator | ✅ accepted (2026-07-16) |
| `ADS.COR.adr.0025` | RM Intelligent Discovery — Município Selection | ✅ accepted (2026-07-16) |
| `ADS.COR.adr.0026` | Coverage Planner — Budget-Aware Geo Scheduler | ✅ accepted (2026-07-16) |
| `ADS.COR.adr.0027` | Market Estimator — IBGE × DataForSEO Cross-Reference | ✅ accepted (2026-07-16) |
| `ADS.COR.adr.0028` | CNPJ Queue — Cron Enrichment Pipeline | ✅ accepted (2026-07-16) |
| `ADS.COR.adr.0029` | Discovery Session Log | ✅ accepted (2026-07-17) |
| `ADS.COR.adr.0030` | Intelligence Runtime — Motor de Captação e Funil | ✅ proposed (2026-07-17) |
| `ADS.COR.adr.0031` | Admin Surface — Warp Family Dashboard (22 superfícies) | ✅ proposed (2026-07-17) |
| `ADS.COR.adr.0032` | Warp Composer Runtime — Dual Engine BLUE/GREEN | ✅ accepted (2026-07-17) |
| `ADS.COR.adr.0033` | Vec Intent Composition Pipeline Excellence | ✅ accepted (2026-07-17) |
| `ADS.COR.adr.0034` | Adsentice Design Vivo — Sistema Fechado | ✅ accepted (2026-07-18) |
| `ADS.COR.adr.0035` | Genealogia Excelência — rsxt/evo-api → Karina HTML | ✅ accepted (2026-07-18) |
| `ADS.COR.adr.0036` | Kimera Gabarito — Plugin System + Antigravity | ✅ accepted (2026-07-18) |
| `ADS.COR.adr.0037` | **Convergência Runtime Semântico — Unificação Market KG + Design KG + Marketing KG** | ✅ accepted (2026-07-18) |
| `ADS.COR.adr.0038` | **S10 Generate-then-Serve — Artefatos Vault-backed (R2+Supabase) TTL 30d** | ✅ accepted+implementado (2026-07-18) |

### ADS.COR.llm — Inteligência de Linguagem

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.llm.deepseek` | DeepSeek V4 Flash — copywriter S10 (headline, subtitle, CTA) | `tools/adsentice_llm_copywriter.py` | ✅ ativo (2026-07-15) |
| `ADS.COR.llm.qwen` | Qwen 2.5 1.5B Q4_K_M GGUF local ($0, ~100s CPU) — fallback | `tools/adsentice_llm_copywriter.py` | 🟡 wireado, qualidade limitada |
| `ADS.COR.llm.calibracao` | DeepSeek: model=deepseek-v4-flash, temperature=0.6, response_format=json_object | `tools/adsentice_llm_copywriter.py` | ✅ calibrado |

### ADS.COR.pipeline — Pipeline S10 + Market Intel

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.pipeline.s10_generator` | S10 Raio-X · Gerador Automático — Supabase→classify→copywriter→gaps→Qdrant→HTML+trace | `tools/adsentice_s10_generator.py` | ✅ ativo (2026-07-15) |
| `ADS.COR.pipeline.s10_artifacts` | **Generate-then-Serve (ADR-0038)** — composeS10→QG gate→R2 blob imutável→série s10_artifacts (TTL 30d) → serve 0.54s | `apps/web/src/lib/s10-artifacts.ts` + migration 014 | ✅ LIVE (2026-07-18) |
| `ADS.COR.pipeline.s11_landing` | **S11 Landing do Cliente A/B por ESTRATÉGIA (ADR-0037 F6)** — resolveStrategies (8 facets vocab.conversion × sinais reais) → par A/B congelado → /s11-landing + /r/ conversão medida | `composeS11` + `strategy-resolver.ts` + migration 015 | ✅ LIVE (2026-07-18) · 2/22 surfaces |
| `ADS.COR.pipeline.migrate_pg` | Aplicador DDL real — pg direct :5432 (migrations de verdade) | `tools/adsentice_migrate_pg.mjs` | ✅ ativo (2026-07-18) |
| `ADS.COR.pipeline.market_intel` | Market Intelligence v1.0 · Trace Feedback Loop — cada S10 alimenta Qdrant → Qdrant enriquece próximo S10 | `packages/warp/src/market-intel.ts` | ✅ ativo (2026-07-15) |
| `ADS.COR.pipeline.s10_rota` | Rota completa: category→nicho→persona→DeepSeek→tokens→gaps→Qdrant→HTML | `packages/warp/src/s10-raio-x.ts` | ✅ ativo (2026-07-15) |
| `ADS.COR.pipeline.design_playbook` | Design Pipeline Playbook — regras, anti-padrões, arquitetura | `docs/spec/adsentice-design-pipeline-playbook.md` | ✅ v1.0 (2026-07-15) |
| `ADS.COR.pipeline.embed_gate` | Embed Quality Gate — 5ª dimensão BOA (golden set, commit fingerprint) | `tools/adsentice_embed_quality_gate.py` | ✅ ativo (2026-07-15) |

### ADS.COR.design — Corpus de Design (embedado no Qdrant)

| Rota | Descrição | Source Qdrant | Pontos | Status |
|---|---|---|---|---|
| `ADS.COR.design.warp_components` | 107 componentes Warp: 40 shadcn/Radix (context7) + 67 21st-magic (visual premium) | `adsentice-self` (kind=component, tag=adsentice-warp) | 107 | ✅ embedado · 2026-07-14 |
| `ADS.COR.design.warp_snippets` | 57 snippets + referências técnicas: 37 shadcn/ui v4 TypeScript source + 20 Radix Primitives WAI-ARIA API docs | `adsentice-self` (kind=snippet\|reference, tag=adsentice-warp) | 57 | ✅ embedado · 2026-07-14 |
| `ADS.COR.design.warp_design_knowledge` | 6,103 design knowledge points do UI UX Pro Max: 85 UI styles, 161 color palettes, 161 reasoning rules, 99 UX guidelines, 35 landing patterns, 74 typography pairings, 26 chart types, 162 product patterns, 1,923 font combinations, 1,601 design principles, 1,602 draft designs | `adsentice-self` (kind=design-knowledge, tag=adsentice-warp) | 6,103 | ✅ embedado · 2026-07-14 |
| `ADS.COR.design.open_design` | 150 estilos de design system (Apple, Stripe, Vercel, Tesla, Supabase, etc.) | `open-design/*` | ~600 | ✅ embedado |
| `ADS.COR.design.magic_ui` | 247 componentes Magic UI (21st) — 77 exemplos + 23 componentes + 147 variações | `21st-magic-ui` | 247 | ✅ embedado |
| `ADS.COR.design.materio` | 36 design tokens Materio (palette, typography, spacing, border, muted) | `adsentice-materio` | 36 | ✅ embedado |
| `ADS.COR.design.warp_total` | **Total do corpus de design Warp** (componentes + snippets + knowledge) | — | **6,267** | ✅ vivo |
| `ADS.COR.design.total` | Total do corpus de design (Warp + open-design + 21st + Materio) | — | ~7,150 | ✅ vivo |
| `ADS.COR.design.skills_adsentice` | 5 novos marketing skills originais adsentice (45 frameworks): local-seo, whatsapp-business, google-ads-telemetry, ifood-integration, booking-ota-integration | `adsentice-self` (source=adsentice-original) | 45 | ✅ embedado · 2026-07-14 |
| `ADS.COR.design.warp_registry_json` | Registry JSON dos 11 componentes base + 45 frameworks skills | `docs/spec/warp-component-registry.json` + `docs/spec/adsentice-skills-frameworks.json` | — | ✅ vivo |

### ADS.COR.tooling — Ferramentas de Desenvolvimento

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.tooling.swc_rules` | Guia canônico Next.js 15.1.2 SWC — 7 padrões que funcionam, 4 proibidos | `.claude/NEXTJS_SWC_RULES.md` | ✅ v1.0 |
| `ADS.COR.tooling.coding_sop` | SOP de Codificação — DAG→Codar→Check→Commit | `.claude/NEXTJS_CODING_SOP.md` | ✅ v1.0 |
| `ADS.COR.tooling.nextjs_check` | Script pre-commit: tsc + brace balance + HTTP + log | `.claude/hooks/adsentice-nextjs-check.sh` | ✅ ativo |
| `ADS.COR.tooling.nextjs_kg` | 10 regras Next.js embedadas no Qdrant (tag=nextjs-15) | `adsentice-self` | ✅ indexado |
| `ADS.COR.tooling.backup` | Full bulk backup → R2 + local fallback + incremental checksum | `tools/adsentice_backup.py` | ✅ ativo |
| `ADS.COR.tooling.backfill_city` | Backfill city/district via Nominatim reverse geocode | `tools/adsentice_backfill_city.py` | ✅ executado (278/278) |

### ADS.COR.design.tools — Ferramentas de Ingestão de Design

| Rota | Script | Descrição | Status |
|---|---|---|---|
| `ADS.COR.design.tools.warp_ingest` | `tools/adsentice_warp_ingest.py` | Ingest 11 componentes base (shadcn+Radix) | ✅ vivo |
| `ADS.COR.design.tools.warp_ingest_max` | `tools/adsentice_warp_ingest_max.py` | Ingest 107 componentes premium (40 shadcn+Radix + 67 21st) | ✅ vivo |
| `ADS.COR.design.tools.warp_ingest_snippets` | `tools/adsentice_warp_ingest_snippets.py` | Ingest 57 snippets + referências (source code + API docs) | ✅ vivo |
| `ADS.COR.design.tools.uupm_ingest` | `tools/adsentice_uupm_ingest.py` | Ingest 6,103 design knowledge points (UI UX Pro Max) | ✅ vivo |
| `ADS.COR.design.tools.skills_ingest` | `tools/adsentice_skills_ingest.py` | Ingest 5 novos marketing skills (45 frameworks) | ✅ vivo |
| `ADS.COR.design.tools.corey_ingest` | `tools/adsentice_corey_ingest.py` | Ingest 4 skills estruturais Corey Haines (9 frameworks) | ✅ vivo |
| `ADS.COR.design.tools.strategy_ingest` | `tools/adsentice_strategy_ingest.py` | Ingest 17 frameworks marketing strategy | ✅ vivo |

**Fontes de design combinadas:** 21st-magic MCP (77 componentes) + context7 MCP (shadcn/ui 4,051 snippets + Radix 746 API docs) + UI UX Pro Max (6,461 linhas CSV) + Corey Haines (43 skills) + Kim Barrett (12 skills) + Materio (36 tokens) + open-design (150 estilos)

### ADS.COR.warp — Família Warp (Design System Semântico)

> **Status:** 9/9 módulos implementados em 12 arquivos TypeScript (~108 KB) · `packages/warp/`
> **Arquitetura:** WarpAPI unificada: `warp.registry` + `warp.composer` + `warp.tokens` + `warp.agents`
> **Doutrina:** Design System Vivo com Composição por Intent Semântico (ADR-0018)
> **Refinamento:** Absorção OD v0.9.0 com 5 refinamentos semânticos (vec, market-derived, MCP plugins, 6-dim critique, mutationId cache)

| Rota | Módulo | Arquivo | Descrição | Status |
|---|---|---|---|---|
| `ADS.COR.warp.tokens` | M1 | `apps/web/src/tokens.css` | 10 camadas, 40 tokens semânticos shadcn/ui v4, OKLCH palettes | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.registry` | M2 | `packages/warp/src/2-registry.ts` | Component Registry Semântico: `register()` (vec embed→Qdrant) + `queryByIntent()` (Qdrant search + re-rank) | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.destiller` | M3 | `packages/warp/src/3-destiller.ts` | Destilador de Referências: 11 componentes shadcn/Radix canônicos pré-destilados + `process()` para LLM pipeline (L6) | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.composer` | M4 | `packages/warp/src/4-composer.ts` | **Compositor (Atomic Pipeline + Devloop):** discovery→plan→generate→critique. Devloop re-itera até score ≥ 7 (max 3x). 6 dimensões de critique (5 OD + Market Fit Warp). BFS dependency resolution + layout inference + cache 3 camadas | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.registry_zod` | M5 | `packages/warp/src/5-registry.ts` | **Registry Protocol (Zod):** WarpComponentSchema, RegistryEntrySchema, PluginSchema. `validateComponent()` com warnings de qualidade. PluginRegistry: plugins como `{skill, context, assets, capabilities}` | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.telemetry` | M6 | `packages/warp/src/6-telemetry.ts` | **WarpTracker + Critique + GenUI:** eventos→embed→Qdrant. DesignQuality: 6 dimensões com pesos. GenUI surfaces: SSE events para input humano no pipeline. `onGenUI(handler)` para frontend | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.cache` | M7 | `packages/warp/src/7-cache.ts` | **Cache 3 Camadas:** L1 Memory LRU (<0.1ms, 100 entradas) + L2 Redis :6396 (<2ms, TTL 1h) + L3 Cloudflare KV (futuro). Invalidação granular por `mutationId` + `componentId`. Write-through em todas as camadas | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.agents` | M8 | `packages/warp/src/8-agents.ts` | **Agent Adapters + MCP Connectors:** AgentAdapter interface (OD-style): `detect→capabilities→run→cancel→resume`. ClaudeCodeAdapter, DeepSeekAdapter, QwenLocalAdapter. AgentRouter: escolhe melhor agente por complexidade/custo. MCPRegistry: 4 MCP servers como plugins vivos (21st, context7, Firecrawl, DataForSEO) | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.tokens_composer` | M9 | `packages/warp/src/tokens-composer.ts` | **Tokens Composer (ADR-0020):** 7 segmentos com presets canônicos (Matriz Warp) + 4 planos com shadow/motion progressivos. 6 pipelines de inferência: palette, typography, spacing, shadow, motion, responsive. Output: `tokens.{segment}.{plan}.css` + A/B variant + telemetry. `composeTokens('beleza', 'sentinela')` → CSS com Playfair Display + Rose Gold | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.types` | — | `packages/warp/src/types.ts` | 12 interfaces TypeScript: WarpComponent, CompositionRequest, CompositionResult, ResolvedComponent, LayoutTree, ReferenceSource, DestilledComponent, ComponentEmbedPayload, WarpEvent, WarpMetrics + Zod schemas | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.index` | — | `packages/warp/src/index.ts` | WarpAPI unificada (singleton): `warp.registry`, `warp.composer`, `warp.tokens`, `warp.agents`, `warp.cache`, `warp.tracker`, `warp.destiller` | ✅ v1.0 (2026-07-14) |
| `ADS.COR.warp.config` | — | `packages/warp/package.json` + `tsconfig.json` | Package config: `@adsentice/warp` v0.1.0, Zod dependency, TypeScript 5.7 | ✅ vivo |

### ADS.COR.warp.refinements — 5 Refinamentos Warp sobre OD v0.9.0

| # | Refinamento | OD v0.9.0 | Warp | Impacto |
|---|-----------|-----------|------|---------|
| 1 | **Busca semântica** | `triggers[]` determinísticos (match exato de string) | `vec(description + intent + triggers)` → queryByIntent() no Qdrant | "apresentação corporativa" acha "Bento Grid" (0.78) — OD não acharia |
| 2 | **Design knowledge vivo** | 88 DESIGN.md arquivos estáticos | 6,103 pontos Qdrant + DataForSEO (mercado local) + Marketing Skills (psicologia) | Tokens regeneráveis sob demanda, não obsoletos |
| 3 | **MCP como plugins vivos** | Plugins = skills do filesystem | MCP servers respondendo queries em tempo real: 21st (design), context7 (docs), Firecrawl (audit), DataForSEO (SEO) | Fontes de design vivas, não estáticas |
| 4 | **Critique 6 dimensões** | 5 dimensões: Visual Hierarchy, Detail Execution, Functionality, Innovation, Philosophy Consistency | + Market Fit (0.15): "este design converte para o segmento e região alvo?" validado por DataForSEO | Validação de mercado real, não só estética |
| 5 | **Cache com mutationId** | Sem cache — cada intent re-gera do zero | 3 camadas (L1 Memory + L2 Redis :6396 + L3 KV futuro) com invalidação granular por mutationId | Cache hit >80%, <50ms vs re-gerar 2s |

### ADS.COR.warp.pipeline — Fluxo de Composição

```
Usuário: "landing page para dentista em SP, plano Sentinela"
  │
  ├─→ M2 registry.queryByIntent() → Qdrant :6352 → 107 componentes ranqueados
  ├─→ M4 composer.compose() → Atomic Pipeline (discovery→plan→generate→critique)
  │     ├─ discovery: vec(intent) → top 15 componentes
  │     ├─ plan: consulta 6,103 design-knowledge → layout + paleta
  │     ├─ generate: assembly → CompositionResult
  │     └─ critique: 6 dimensões → score ≥ 7? (Devloop até 3x)
  ├─→ M9 tokens.compose() → 3 fontes paralelas → 6 pipelines inferência
  │     └─ output: tokens.dentista-sp.sentinela.css + A/B variant
  ├─→ M7 cache.set() → write-through L1+L2 → próximo request <50ms
  ├─→ M6 tracker.track() → evento → Qdrant → métricas de uso
  └─→ M8 agents.route() → escolhe melhor agente (Claude Code para critique, Qwen $0 para batch)
```

### ADS.COR.code — Código

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.code.web` | Dashboard admin (Next.js → migrando para Vite+React 19, ADR-0017) | `apps/web/` | ✅ vivo (80+ commits, migração pendente) |
| `ADS.COR.code.warp` | **Família Warp — 12 arquivos TypeScript** (M2-M9) · packages/warp/src/ | `packages/warp/` | ✅ v1.0 (2026-07-14) |
| `ADS.COR.code.scoring` | Scoring Engine — Fit×0.40+Engagement×0.35+Intent×0.25 · Schwartz classifier | `apps/web/src/lib/scoring.ts` | ✅ v1.0 · 480 linhas |
| `ADS.COR.code.engine` | Admin dashboard data bridge (Redis :6396 · Qdrant :6352 · EVO-API :7700) | `apps/web/src/lib/engine.ts` | ✅ vivo · zero hardcoded |
| `ADS.COR.code.discovery_page` | Discovery Engine UI — score composto + Schwartz chips + benchmark competitivo | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx` | ✅ v0.2 |
| `ADS.COR.code.criteria_page` | Pain Criteria v1.2 — Schwartz awareness + compound formula + decay + calibration | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx` | ✅ v1.2 |
| `ADS.COR.code.settings_page` | Settings · Integrações — 6 provider cards (Supabase, R2, EVO-API, DataForSEO, Qdrant, Redis) | `apps/web/src/app/[lang]/(dashboard)/(private)/admin/settings/page.tsx` | ✅ vivo |
| `ADS.COR.code.error_boundaries` | error.tsx + not-found.tsx + global-error.tsx (Next.js 15 required) | `apps/web/src/app/[lang]/error.tsx` | ✅ vivo |
| `ADS.COR.code.benchmark_route` | API competitive benchmark — TOP 5 concorrentes no raio | `apps/web/src/app/api/competitive-benchmark/route.ts` | ✅ vivo |
| `ADS.COR.code.discovery_route` | API discovery-search — bridge EVO-API MCP :7700 → DataForSEO LIVE | `apps/web/src/app/api/discovery-search/route.ts` | ✅ vivo · scoring pass |
| `ADS.COR.code.vault` | Cofre durável (R2 + Postgres) | `packages/vault/` | ✅ vivo (463 linhas, 6/6 testes) |
| `ADS.COR.code.vault.r2` | BlobStore → Cloudflare R2 (S3-compat, IfNoneMatch) | `packages/vault/src/impl/r2-blob-store.ts` | ✅ vivo |
| `ADS.COR.code.vault.supabase` | SeriesStore → Supabase Postgres (service role, query_vault) | `packages/vault/src/impl/supabase-series-store.ts` | ✅ vivo |
| `ADS.COR.code.vault.creds` | Config de creds (self-essentials, fora do git) | `packages/vault/src/config/` | ✅ vivo |
| `ADS.COR.code.api` | Backend Railway (endpoints /api/diagnostic, /api/openapi, /api/llms) | `apps/web/src/app/api/` | ✅ MVP (diagnostic ativo) |
| `ADS.COR.code.core` | Domínio puro (Lead, Score, Solution) | `packages/core/` | 🔴 a construir |
| `ADS.COR.code.db` | Schemas Supabase | `packages/db/` | 🔴 a construir |

### ADS.COR.config — Configuração

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.config.claude` | Hooks + Skills Claude Code | `.claude/` | ✅ vivo (3 hooks lean, 6 skills) |
| `ADS.COR.config.claudemd` | CLAUDE.md canônico (estabilizado — sem métricas hardcoded) | `CLAUDE.md` | ✅ vivo (recuperação pós-compact) |
| `ADS.COR.config.mcp` | Servidores MCP | `.mcp.json` | ✅ vivo (8 servidores: 4 Python + 2 npx ativos + 1 firecrawl + 1 disabled 21st) |
| `ADS.COR.config.docker` | Infra local | `docker-compose.yml` | ✅ vivo (Redis :6396 + Qdrant :6352) |
| `ADS.COR.config.pipeline` | Pipeline auto-compact (6 passos canônicos) | `tools/adsentice_pipeline_auto_compact.sh` | ✅ vivo (EVO-API pattern) |

### ADS.COR.skills — Claude Skills

| Rota | Skill | Descrição | Status |
|---|---|---|---|
| `ADS.COR.skills.chat` | `adsentice-chat` | Construir, evoluir e operar o pipeline de discovery e o chat | ✅ vivo |
| `ADS.COR.skills.dag` | `adsentice-dag` | KG-first grounded recall (5 passos) | ✅ vivo |
| `ADS.COR.skills.site_audit` | `adsentice-site-audit` | Auditoria de site (Firecrawl + DataForSEO ONPAGE) | ✅ vivo |
| `ADS.COR.skills.spec` | `adsentice-spec` | Autorar specs e ADRs | ✅ vivo |
| `ADS.COR.skills.content_gap` | `adsentice-content-gap` | **NOVO** — Content Gap Analyzer: crawl → keywords → SERP → C1-C8 scoring → recomendações | ✅ v1.0 (2026-07-14) |
| `ADS.COR.skills.competitive` | `adsentice-competitive-landscape` | **NOVO** — Competitive Landscape TOP 3: domain_competitors + backlinks + keyword_gap → battle cards | ✅ v1.0 (2026-07-14) |

---

## Dimensão CAP(abilidades) — {#ADS.CAP}

### ADS.CAP.dataforseo — DataForSEO (provider-core v1.0 direto)

| Rota | Capability | Layer | Custo | Status |
|---|---|---|---|---|
| `ADS.CAP.dataforseo.provider_core` | **provider-core v1.0** — DataForSEO direto, 1 hop HTTP | — | — | ✅ v1.0 |
| `ADS.CAP.dataforseo.listings_search` | L0: Business Listings Search | L0 | $0.015 | ✅ live |
| `ADS.CAP.dataforseo.profile_gmb` | L1: Google Business Profile (27 campos) | L1 | $0.0054 | ✅ live · custom |
| `ADS.CAP.dataforseo.instant_pages` | L2: OnPage SEO audit (60+ checks) | L2 | $0.000125 | ✅ live |
| `ADS.CAP.dataforseo.domain_technologies` | L2: CMS/Analytics/Stack detection | L2 | $0.01 | ✅ live |
| `ADS.CAP.dataforseo.backlinks_competitors` | L3: Backlinks competitors | L3 | $0.02 | ✅ live |
| `ADS.CAP.dataforseo.cost_registry` | 13 capabilities precificadas (YAML) | — | — | ✅ `cost-registry.yaml` |
| `ADS.CAP.dataforseo.sandbox` | Sandbox $0: mesmos shapes, dados fake | — | $0 | ✅ `DATAFORSEO_MODE=sandbox` |

Cobertura: **6 tools implementadas (L0→L3)** · **13 precificadas** no cost-registry · **$0.05/lead pipeline completo**
EVO-API mantido como **referência canônica** (76 caps, shapes, translators, cost-registry) — não mais runtime.

### ADS.CAP.deepseek — DeepSeek (copywriter S10 + LLM pipeline)

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.CAP.deepseek.copywriter` | Copywriter S10 via DeepSeek V4 Flash (headline+subtitle+CTA pt-BR) | `s10_generator.py` | ✅ v1.0 |
| `ADS.CAP.deepseek.pricing` | Input $0.14/1M (miss) / $0.0028/1M (hit) · Output $0.28/1M | api-docs.deepseek.com | ✅ medido |
| `ADS.CAP.deepseek.kv_cache` | KV Cache ON por padrão — system prompt fixo = ~80% hit rate | api-docs.deepseek.com | ✅ ativo |
| `ADS.CAP.deepseek.balance` | GET /user/balance → Redis (adsentice:llm:balance:*) | `adsentice_deepseek_status.py` | ✅ $2.31 USD |
| `ADS.CAP.deepseek.cost_tracking` | Custo rastreado no Redis (adsentice:llm:cost:*) | `track_llm_cost()` | ✅ live |
| `ADS.CAP.deepseek.copy_framework` | Copywriting com persona+fórmula+anti-patterns (Corey+Kim+CRO) | `generate_copy()` | ✅ v1.0 |

### ADS.CAP.marketing — Inteligência de Marketing (Domain Enrichment)

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.CAP.marketing.seo_audit` | Framework de auditoria SEO (30+ sinais, 5 prioridades) | Corey `seo-audit` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.programmatic_seo` | 12 playbooks de páginas em escala (Locations = Discovery Engine) | Corey `programmatic-seo` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.analytics_tracking` | Framework de analytics (8 sinais granulares, GTM/GA4/Pixel) | Corey `analytics` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.cro` | 7 dimensões de otimização de conversão | Corey `cro` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.psychology` | 50+ mental models (persuasão, precificação, growth, design) | Corey `marketing-psychology` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.avatar_extraction` | Extração de persona (pains, desires, failed attempts, emotional drivers) | Kim `avatar-extraction` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.schwartz_mapper` | 5 níveis de consciência (Unaware→Most Aware) — substitui thresholds arbitrários | Kim `schwartz-awareness-mapper` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.objection_crusher` | Framework de objeções (Price/Time/Trust/Complexity/Past Failures) | Kim `objection-crusher` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.campaign_orchestrator` | Full-funnel: 9 passos avatar→offer→awareness→mechanism→angles→creative→funnel→objections→qa | Kim `full-funnel-campaign-orchestrator` SKILL.md | ✅ referência ingerida |
| `ADS.CAP.marketing.performance_diagnosis` | Diagnóstico 5 dimensões (Offer/Audience/Creative/Funnel/Sales) | Kim `performance-diagnosis` SKILL.md | ✅ referência ingerida |

### ADS.CAP.marketing.skills_adsentice — Skills Originais adsentice

Skills criados para a Matriz Warp (22 superfícies × 5 soluções × 7 segmentos). 45 frameworks embedados no Qdrant.

| Rota | Skill | Categoria | Segmentos | Superfícies Warp | Status |
|---|---|---|---|---|---|
| `ADS.CAP.marketing.skills.local_seo` | **local-seo** — Google Meu Negócio, Local Pack, NAP consistency, reviews, posts, fotos | local-presence | todos (7) | S10, S11, S2, S12 | ✅ v1.0 · embedado |
| `ADS.CAP.marketing.skills.whatsapp` | **whatsapp-business** — Cloud API, templates, automação, 3 tiers (Free/API/BSP), LGPD compliance | messaging | todos (7) | S12, S9, S10, S14, S6 | ✅ v1.0 · embedado |
| `ADS.CAP.marketing.skills.google_ads` | **google-ads-telemetry** — OAuth, GAQL queries, variance reports, budget pacing, segment benchmarks | advertising-analytics | saúde, beleza, alimentação, serviços | S3, S9, S15, S17, S4 | ✅ v1.0 · embedado |
| `ADS.CAP.marketing.skills.ifood` | **ifood-integration** — Partner API, menu, pedidos, webhooks, SLAs, menu health score | food-delivery | alimentação | S9, S12, S3, S15, S17 | ✅ v1.0 · embedado |
| `ADS.CAP.marketing.skills.booking` | **booking-ota-integration** — Booking.com, Decolar, Airbnb, channel manager, revenue management, pricing rules | hospitality | hospitalidade | S9, S12, S3, S15, S17 | ✅ v1.0 · embedado |

**Fonte:** `skills/{local-seo,whatsapp-business,google-ads-telemetry,ifood-integration,booking-ota-integration}/SKILL.md`
**Ingest:** `tools/adsentice_skills_ingest.py` → 45 frameworks embedados no Qdrant `adsentice-self` (source=adsentice-original)
**Registro:** `docs/spec/adsentice-skills-frameworks.json`

Cobertura: **10 caps de marketing ingeridas** (55 skills analisados)

### ADS.CAP.ai — Inteligência Artificial

| Rota | Descrição | Provedor | Custo |
|---|---|---|---|
| `ADS.CAP.ai.deepseek` | Árbitro: síntese de estratégia, grounding | DeepSeek V4 | cost-capped ($0.02) |
| `ADS.CAP.ai.qwen_local` | Chat livre, voz local ($0) | Qwen 2.5 1.5B (llama-cli) | $0 |
| `ADS.CAP.ai.embed` | Embeddings (mpnet) | :8081 (embed-server-rs) | $0 |

### ADS.CAP.pipelines — Pipelines de Discovery

| Rota | Pipeline | Capabilities usadas | SLA |
|---|---|---|---|
| `ADS.CAP.pipelines.site_audit` | Site Audit | on_page.lighthouse, domain.technologies, domain.whois | <2s |
| `ADS.CAP.pipelines.seo` | SEO Discovery | keyword.research, serp.organic, domain.ranked_keywords | <3s |
| `ADS.CAP.pipelines.gmb` | GMB & Reputation | business.profile.gmb, business.reviews, sentiment | <2s |
| `ADS.CAP.pipelines.competitors` | Competitor Intel | domain.competitors, domain.keyword_gap | <2s |
| `ADS.CAP.pipelines.ads` | Ads Intelligence | serp.ads_advertisers, ads.traffic_forecast | <1s |
| `ADS.CAP.pipelines.social` | Social Discovery | Web scraping (Instagram, FB, TikTok) | <2s |

---

## Dimensão INT(eligência) — {#ADS.INT}

### ADS.INT.brain — Brain conversável

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.INT.brain.interaction_hub` | Interaction Hub AG-UI native (chat + cards + tips + score + HITL) | `docs/adsentice-chat-spec.md` | ✅ spec v1.0.0 · AG-UI |
| `ADS.INT.brain.ag_ui` | Protocolo AG-UI implementado (24 eventos, 13 padrões) | `@ag-ui/client` (MIT) | 🟡 spec pronta, código a construir |
| `ADS.INT.brain.brand_iq` | Brand IQ automático (shared state AG-UI) | Pipeline discovery | 🔴 a construir |
| `ADS.INT.brain.scoring` | Lead-score: fixability × potential × value-fit | `adsentice-lead-criteria.md` (EVO-API) | 🔴 spec pronta, sem código |

### ADS.INT.ooda — Ciclo OODA

| Rota | Descrição | Redis Key | Status |
|---|---|---|---|
| `ADS.INT.ooda.current` | Sessão OODA atual | `adsentice:ooda:current_session_id` | ✅ vivo |
| `ADS.INT.ooda.stage.observe` | Estágio Observe | `adsentice:ooda:stage:observe` | ✅ vivo |
| `ADS.INT.ooda.stage.orient` | Estágio Orient | `adsentice:ooda:stage:orient` | ✅ vivo |
| `ADS.INT.ooda.stage.decide` | Estágio Decide | `adsentice:ooda:stage:decide` | ✅ vivo |
| `ADS.INT.ooda.stage.act` | Estágio Act | `adsentice:ooda:stage:act` | ✅ vivo |
| `ADS.INT.ooda.meta` | Meta-dados do ecossistema | `adsentice:ooda:meta:*` | ✅ vivo |

### ADS.INT.kg — Knowledge Graph

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.INT.kg.edges` | Arestas do KG adsentice | `tools/adsentice_kg_server.py` | ✅ 166 entities · 174 edges · 12 relações (medido 2026-07-18) |
| `ADS.INT.kg.tools` | MCP tools: edges, neighbors, what_produces, stats | `adsentice-kg` MCP server | ✅ vivo |

### ADS.INT.conversation — Histórico e Memória

| Rota | Descrição | Coleção Qdrant | Status |
|---|---|---|---|
| `ADS.INT.conv.history` | Histórico Claude Code (adsentice + EVO-API ref) | `adsentice-conversation` | ✅ 87,419 pts (medido 2026-07-18) |
| `ADS.INT.conv.memory` | Memória ativa curada | `claude-memory` | ✅ 61 memórias (medido 2026-07-18) |
| `ADS.INT.conv.tools` | MCP tools: search, recall, remember, status | `adsentice-conversation` MCP server | ✅ vivo |
| `ADS.INT.conv.ingest` | Scripts de ingestão (7 scripts ativos) | `tools/adsentice_*_ingest.py` | ✅ 7 scripts (RUST-CHAT, Claude history, Corey, Strategy, Skills, Warp base, Warp max, Warp snippets, UUPM) |
| `ADS.INT.conv.precompact` | Ingest automático no PreCompact | `.claude/hooks/adsentice-pre-compact.py` | ✅ vivo (sync ingest) |

### ADS.INT.ritual — Ritual de Fechamento

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.INT.ritual.pipeline` | Pipeline auto-compact (6 passos) | `tools/adsentice_pipeline_auto_compact.sh` | ✅ vivo |
| `ADS.INT.ritual.corpora` | A=self(482)≠B=cliente(0)≠C=conversa(1401) | Qdrant :6352 | ✅ 1932 pts total |
| `ADS.INT.ritual.session` | SessionStart hook LEAN (~1k tokens) | `.claude/hooks/adsentice-session-start.py` | ✅ vivo (78 linhas) |

---

## Dimensão INF(raestrutura) — {#ADS.INF}

| Rota | Serviço | Porta | Container/Processo | Status |
|---|---|---|---|---|
| `ADS.INF.redis` | Redis OODA | :6396 | `adsentice-redis` (7.4-alpine) | ✅ 9 MB |
| `ADS.INF.qdrant` | Qdrant KG | :6352/:6353 | `adsentice-qdrant` (v1.13.6) | ✅ 57 MB |
| `ADS.INF.embed` | Embed server | :8081 | `embed-server-rs` (mpnet) | ✅ compartilhado |
| `ADS.INF.vercel` | Frontend deploy | :3000 (dev) | Next.js 15 | ✅ dev |
| `ADS.INF.s3_bucket` | Backend target (ADR-0016) | Hetzner CAX11 $5.39/mês | Docker Compose + Cloudflare Workers (Hono) | 🔴 a provisionar |
| `ADS.INF.cloudflare` | **Plataforma edge ratificada (founder 2026-07-18 · ADR-0010/0038)** | free tier | R2 ✅ produção (artefatos S10 + backups + lifecycle 35d) · Workers ⬜ 1º · KV ⬜ 2º · AI Gateway ⬜ 3º · Pages ⬜ 4º · D1 ⬜ 5º · Queues ⬜ ⚠ verificar free | ⚠️ parcial |
| `ADS.INF.supabase` | Database + Auth | — | Supabase | ✅ auth wire · série s10_artifacts (migration 014) |

---

## Dimensão PRD(oduto) — {#ADS.PRD}

### ADS.PRD.chat — adsentice Chat

| Rota | Descrição | Status |
|---|---|---|
| `ADS.PRD.chat.discovery` | Pipeline discovery: URL → cards + tips | 🔴 spec pronta, sem código |
| `ADS.PRD.chat.analyze` | Deep-dive credit-gated | 🔴 a construir |
| `ADS.PRD.chat.message` | Chat livre com contexto do negócio | 🔴 a construir |

### ADS.PRD.enrichment — Funil de Enriquecimento (7 camadas · ADR-0046 v137)

| Rota | Camada | Dados | Custo/lead | Status |
|---|---|---|---|---|
| `ADS.PRD.enrich.l0_gmb` | L0 · Atração GMB | 41 campos canônicos (ADR-0040) · nome, tel, address, rating, fotos, attributes | $0.048 | ✅ live |
| `ADS.PRD.enrich.l2a_seo` | L2a · SEO Técnico | Lighthouse, CMS, analytics, meta tags, HTTPS (DataForSEO) | $0.012 | ✅ live |
| `ADS.PRD.enrich.l2b_content` | L2b · Conteúdo+Design DNA | Serviços, equipe, convênios, Brand DNA, UX DNA · Crawler modular .TS (ADR-0044) | $0 | 🟡 80% implementado (17 módulos) |
| `ADS.PRD.enrich.l3_competitive` | L3 · Competitive Intel | Backlinks, SOV, keyword gaps, domain rank (DataForSEO) | $0.08 | ✅ live |
| `ADS.PRD.enrich.l4_ibge` | L4 · Market Context | IBGE: renda, PIB per capita, população, densidade (Supabase) | $0 | 🟡 dados prontos, scoring pendente |
| `ADS.PRD.enrich.l5_cnpj` | L5 · CNPJ | CNAE, regime tributário, sócios · ReceitaWS (ADR-0028) | $0 | 🟡 proposed |
| `ADS.PRD.enrich.l6_generation` | L6 · Geração | S10 Raio-X, S11 Landing A/B, Warp Composer (ADR-0037, ADR-0045) | $0 | 🟡 2/22 surfaces LIVE |
| `ADS.PRD.enrich.l7_analytics` | L7 · Mensuração+Feedback | A/B tracking, conversão, Learning Loop → novas Strategies | $0 | 🔴 spec |

### ADS.PRD.products — Produtos por Camada (v137)

| Rota | Produto | Preço | Camada | Status |
|---|---|---|---|---|
| `ADS.PRD.products.raio_x` | Raio-X (diagnóstico gratuito) | R$0 | L0+L2a | 🟡 S10 LIVE (0.54s, ADR-0038) |
| `ADS.PRD.products.sentinela` | Sentinela (landing page + monitoramento) | R$197/mês | L0+L2a+L2b+L3 | 🟡 S11 LIVE · S11-MK/S11K spec (ADR-0045) |
| `ADS.PRD.products.dominio` | Domínio (full stack + competitive) | R$497/mês | Sentinela+L4+L5 | 🟡 spec (ADR-0045) |
| `ADS.PRD.products.escala` | Escala (multi-surface + analytics) | R$997/mês | Domínio+L6+L7 | 🔴 spec |
| `ADS.PRD.products.growth_os` | Growth OS (multi-tenant + white-label) | R$1.497/mês | Todos | 🔴 spec |

### ADS.PRD.solutions — Soluções

| Rota | Solução | Caps | Status |
|---|---|---|---|
| `ADS.PRD.solutions.seo_local` | Diagnóstico SEO Local | 4 caps | 🔴 spec pronta |
| `ADS.PRD.solutions.concorrencia` | Análise de Concorrência | 3 caps | 🔴 spec pronta |
| `ADS.PRD.solutions.reputacao` | Reputação Online | 2 caps | 🔴 spec pronta |
| `ADS.PRD.solutions.auditoria` | Auditoria de Site | 2 caps | 🔴 spec pronta |
| `ADS.PRD.solutions.anuncios` | Estratégia de Anúncios | 3 caps | 🔴 spec pronta |

### ADS.PRD.credits — Modelo de Créditos

| Rota | Plano | Preço | Créditos |
|---|---|---|---|
| `ADS.PRD.credits.free` | Free | R$0 | 0 (só discovery) |
| `ADS.PRD.credits.starter` | Starter | R$47/mês | 20 |
| `ADS.PRD.credits.pro` | Pro | R$197/mês | 100 |
| `ADS.PRD.credits.escala` | Escala | R$497/mês | Ilimitados |

---

## Dimensão MIS(são) — {#ADS.MIS}

| Rota | Descrição | Fonte |
|---|---|---|
| `ADS.MIS.missao` | Hub inteligente de marketing para negócios locais | ADR-0001 |
| `ADS.MIS.publico` | SMB brasileiro (dono de clínica, lojista, contador) | `adsentice-lead-criteria.md` |
| `ADS.MIS.ticket` | R$47-197/mês · diagnóstico grátis eterno (wedge) | `adsentice-chat-spec.md` |
| `ADS.MIS.anti` | NÃO é gerador de copy (Jasper), NÃO é ferramenta de SEO (Claude SEO), NÃO é agência | ADR-0001 |
| `ADS.MIS.moat` | Dados REAIS de mercado + Brand IQ automático + Sentinela 24/7 + Vault | `jasper-solutions-analise.md` |

---

## Dimensão EVD(ência) — {#ADS.EVD}

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.EVD.vault` | Cofre durável: R2 blob → Postgres série | `packages/vault/` | ✅ 6/6 testes |
| `ADS.EVD.tests_vault` | Testes do vault (node:test) | `packages/vault/src/vault.test.ts` | ✅ 6 passando |
| `ADS.EVD.cost_control` | Spend-cap por tenant + créditos | `adsentice-chat-spec.md` §4 | 🔴 spec pronta |
| `ADS.EVD.audit_trail` | WORM + hash-chain | EVO-API `rsxt-s0` | 🔴 Fase 3 |

---

## Doutrina (invariantes)

| # | Princípio | Aplica? |
|---|---|---|
| 1 | **medido=verdade** — toda afirmação cita fonte | ✅ |
| 2 | **LLM = árbitro NUNCA extrator** | ✅ (DeepSeek só sintetiza SOBRE dados REAIS) |
| 3 | **Pipeline L0→L6** — determinístico antes de LLM | ✅ (discovery = L0-L3, estratégia = L6) |
| 4 | **Sandbox default · live gated** | ⚠️ (MCP oficial não tem sandbox; usar Fase 3) |
| 5 | **Audit trail imutável** | ⚠️ (vault é durável, WORM = Fase 3) |
| 6 | **Founder gate** | ✅ (créditos + spend-cap) |
| 7 | **Corpora A/B/C isolados** | ✅ (adsentice-self ≠ cliente ≠ tooling) |
| 8 | **Especificação primeiro** | ✅ (spec do chat antes do código) |
| 9 | **ADR para decisões arquiteturais** | ✅ (ADR-0001) |
| 10 | **Português (pt-BR)** — público-alvo SMB Brasil | ✅ |

---

## Cross-ref

- EVO-API `base-matriz-ecosistema.md` — referência de padrão (v1.3.94, 2026-06-23)
- EVO-API ADR-0140 (corpora A/B/C) — isolamento inviolável
- EVO-API ADR-0153 (rsxt.core) — referência de arquitetura de substrato
- EVO-API `SPEC-RSXT-CONTROL-PLANE.md` — referência de control-plane

---

*Base-Matriz adsentice v2.0.0 · atualizada 2026-07-19 (selo v116 · 30+ selos em 2 dias) · 7 dimensões · 160+ rotas · medido=verdade · ISOLADO do EVO-API · 38 ADRs · 2/22 surfaces LIVE (S10 0.54s + S11 A/B estratégia) · L0 adapter 37/37 campos + migrations 017+018 · 5.644 place_ids (ES 5.444) · 341 pre-flights cross-state · pageDepth 0-5 · leads UF+Telefone+Social · backup crontab (R2+BKP) · BOA EXCELLENT*

## Changelog

| Versao | Data | Descricao | Handoff | Status |
|---|---|---|---|---|
| v001 | 2026-07-11 | criar-o-ecossistema-adsentice-completo | `HANDOFF-2026-07-11-v001-criar-o-ecossistema-adsentice-completo.md` | ✅ vivo |
| v002 | 2026-07-11 | montar-ecossistema-completo-adsentice-com-mcp-servers-kg-ood | `HANDOFF-2026-07-11-v002-montar-ecossistema-completo-adsentice-com-mcp-serv.md` | ✅ vivo |
| v003 | 2026-07-12 | ingestar-vocabulario-marketing-corey-haines-kim-barrett | `docs/spec/adsentice-marketing-vocab.md` (commit 2e7ad8e) | ✅ vivo |
| v004 | 2026-07-12 | pain-criteria-v1.2-schwartz-esc-lead-scoring | `docs/spec/adsentice-pain-criteria-v1.md` (commit cd6bc68) | ✅ vivo |
| v005 | 2026-07-12 | enrichment-layers-5-camadas-gmb-ate-diagnostico | `docs/spec/adsentice-enrichment-layers.md` | ✅ vivo |
| v006 | 2026-07-12 | enrichment-layers-v2-anatomia-completa-gmb-27-campos | `docs/spec/adsentice-enrichment-layers.md` (commit a920978) | ✅ vivo |
| v007 | 2026-07-12 | dashboard-v0.2-score-composto-schwartz-benchmark | `apps/web/src/lib/scoring.ts` (commit effbc0d) | ✅ vivo |
| v008 | 2026-07-12 | correcao-geo-95-cidades-categories-alinhado-discovery | `apps/web/src/app/.../(discovery\|categories)/page.tsx` (commit 24cb0f2) | ✅ vivo |
| v009 | 2026-07-12 | auditoria-hardcoded-removidos-engine-redis-real | `apps/web/src/lib/engine.ts` (commit 0eb6dc7) | ✅ vivo |
| v010 | 2026-07-12 | arquitetura-completa-fluxo-operacional-tecnico | `docs/spec/adsentice-architecture-flow.md` | ✅ vivo |
| v011 | 2026-07-13 | pipeline-discovery-testado-supabase-live-pg-pool | `apps/web/src/lib/discovery-persistence.ts` (commit baf9591) | ✅ vivo |
| v012 | 2026-07-13 | l1-enrichment-27-campos-gmb + matriz-capacidades-evo-api | `apps/web/src/lib/evo-mcp.ts` (commit 1a8c77e) + `docs/spec/adsentice-lead-enrichment-capabilities.md` | ✅ vivo |
| v013 | 2026-07-13 | lead-detail-modal-27-campos-enriquecimento-visivel | `apps/web/src/app/.../discovery/page.tsx` (commit 45afb6c) | ✅ vivo |
| v014 | 2026-07-13 | l1-enrichment-testado-live-roi-validado | `apps/web/src/lib/evo-mcp.ts` (commit a96c4f9) — ROI 21210% vs Google Ads (R$28.40→R$0.004/lead) | ✅ vivo |
| v015 | 2026-07-13 | categorias-12→29-schwartz-explainer-market-analysis | `apps/web/src/app/.../discovery/page.tsx` + `scoring.ts` (commit 4bf3b75) — 29 categorias, 7 segmentos, 5.1M+ negocios mapeaveis | ✅ vivo |
| v016 | 2026-07-13 | market-context-card-discovery + data-flywheel-architecture | `apps/web/src/app/.../discovery/page.tsx` (commit 46c31fb) — CAT_INFO conectado ao modal do lead, flywheel: cada busca alimenta Supabase sem duplicar | ✅ vivo |
| v017 | 2026-07-13 | contact-method-detection + L1-persistence-fix | `apps/web/src/lib/scoring.ts` + `discovery-persistence.ts` (commit c24fb44) — detectContactMethods(), contactStrategy(), 12 colunas L1 no Supabase, fluxos de comunicação mapeados | ✅ vivo |
| v018 | 2026-07-13 | /admin/leads — pagina real com 60 leads do Supabase | `apps/web/src/app/.../leads/page.tsx` (commit f550ec0) — tabela completa, KPIs, Schwartz distribution, contact methods | ✅ vivo |
| v019 | 2026-07-13 | auditoria-flow-operacional-correcao-3-bugs | `discovery-persistence.ts` + `discovery-search/route.ts` (commit be84a35) — city/district/categories persistidos, L1 batch parallel 5x, order_by+offset+cobertura mercado | ✅ vivo |
| v020 | 2026-07-13 | pipeline-supabase-real-leads-filtros-navegacao-conectada | `pipeline/page.tsx` + `leads/page.tsx` (commit 8ee0f71) — Pipeline do Supabase (50 leads unicos), filtros query params, navegacao entre paginas | ✅ vivo |
| v021 | 2026-07-13 | consistencia-4-paginas-50-leads-unicos-DISTINCT-ON | `category_analytics` view + `get_score_distribution()` RPC (commit f48fd3a) — Views refeitas com CTE dedup, todas as paginas 50 leads | ✅ vivo |
| v022 | 2026-07-13 | busca-rj-confirmada-city-district-l1-enriquecimento | `discovery-search/route.ts` (commit 66808eb) — 50 listings RJ Capital, 32 L1 (64%), 25 bairros, city/district ✅, 100 leads totais | ✅ vivo |
| v023 | 2026-07-13 | lead-detail-modal-popup-32-campos-6-secoes | `leads/LeadTable.tsx` (commit 66808eb) — Client component com Dialog, identidade/localizacao/contato/reputacao/score/sinais | ✅ vivo |
| v024 | 2026-07-13 | costs-page-dados-reais-supabase-rate-limits-dataforseo | `costs/page.tsx` (commit bcaf8f0) — Custos do Supabase ($0.60 total), rate limits API real-time, precos verificados | ✅ vivo |
| v025 | 2026-07-13 | adr-0008-evo-api-enriquecimento-completo-l0-l4-76-capabilities | `docs/adr/0008-evo-api-enriquecimento-completo-l0-l4.md` — Decisao arquitetural: EVO-API como motor L0-L4, 76 caps mapeadas, roadmap v0.3→v0.5 | ✅ accepted |
| v026 | 2026-07-13 | adr-0009-market-intelligence-engine | `docs/adr/0009-market-intelligence-engine.md` — lead-level → market-level, agregacao por categoria×regiao (ZERO APIs) | ✅ accepted |
| v027 | 2026-07-13 | adr-0010-cloudflare-free-tier-enterprise | `docs/adr/0010-cloudflare-free-tier-enterprise.md` — Workers+D1+Queues+R2+KV como plataforma enterprise ($0) | ✅ accepted |
| v028 | 2026-07-14 | warpfield-completo-absorcao-od-v0.9.0 | Família Warp completa (M1-M9) + 6,267 pts design Qdrant + 6,103 design knowledge + 5 skills + 2 Claude skills + 5 refinamentos sobre OD | ✅ vivo |
| v029 | 2026-07-15 | s10-deepseek-copywriter-market-intel | S10 Generator + DeepSeek V4 Flash Copywriter + Market Intelligence v1.0 + LLM Copywriter unificado (DeepSeek+Qwen) + Embed Quality Gate + Design Pipeline Playbook | ✅ vivo |
| v030-v080 | 2026-07-15→18 | ciclo warp composer (render destravado → morphable composer multi-surface) | `docs/handoff/active/HANDOFF-2026-07-18-v0{42..80}-*.md` (selos v042-v080) | ✅ vivo |
| v081 | 2026-07-18 | s10-jsx-route-live-surface-pronta | `HANDOFF-2026-07-18-v081-final-s10-jsx-route-live.md` (commits 2fddd41+25beea2+dcfd766) — rota pública, blue exposto, zero hardcode | ✅ vivo |
| v082 | 2026-07-18 | adr-0038-generate-then-serve-live | `HANDOFF-2026-07-18-v082-final-adr-0038-generate-then-serve.md` (commits 4085616+70e575c) — serve 0.54s, QG gate, TTL 30d, R2+Supabase ratificados | ✅ vivo |
| v083-v087 | 2026-07-18 | sessão épica (plataforma ratificada → S11 A/B estratégia → dashboard conversão → Intend v2 cockpit → honestidade números) | `HANDOFF-2026-07-18-v08{3..7}-*.md` — S11 LIVE 2/22, StrategyResolver 8 facets KG, loop f0 /r/, migration 016 count_unique_places | ✅ vivo |
| v088 | 2026-07-18 | discovery-selecao-livre-l0-l4-reenrich-por-base | `HANDOFF-2026-07-18-v088-final-discovery-selecao-livre-reenrich.md` (commits b6b39e6+76ebb5c) — L2/L3 destravados (3 bugs raiz), doutrina place_id ADR-0024 P3, 19 leads L2 reais | ✅ vivo |
| v089-v099 | 2026-07-18→19 | popup real + phone PATCH + pipeline unificado + chips + dedup seguro + backup crontab | `HANDOFF-2026-07-1{8,9}-v089..v099-*.md` (commits af2d9b6→a881cc9) — verdade da base, SessionLog, controle limit, pre-flight qualidade, restauração backup | ✅ vivo |
| v100 | 2026-07-19 | cross-state-preflight-coverage-backup-automatico | `HANDOFF-2026-07-19-v100-final-cross-state-preflight-coverage.md` (commit 3d10bc8) — 341 pre-flights SP+MG+ES+RJ 29/29 cats FULL $4.67 · backup automático · 50+ commits · 2 dias de sessão | ✅ vivo |

---

