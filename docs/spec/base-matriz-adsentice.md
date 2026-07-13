---
id: base-matriz-adsentice
title: "Base-Matriz do Ecossistema adsentice — mapa navegável versionado"
status: living
type: spec
version: "1.2.1"
date: 2026-07-11
updated: 2026-07-13T14:30:00-03:00
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
tags: [base-matriz, adsentice, mapa, navegavel, ecossistema]
---

# Base-Matriz do Ecossistema adsentice v1.0.0

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

### ADS.COR.code — Código

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.code.web` | Dashboard Next.js + Chat UI | `apps/web/` | ✅ vivo (80+ commits) |
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
| `ADS.COR.config.claude` | Hooks + Skills Claude Code | `.claude/` | ✅ vivo (3 hooks lean, 3 skills) |
| `ADS.COR.config.claudemd` | CLAUDE.md canônico | `CLAUDE.md` | ✅ vivo (recuperação pós-compact) |
| `ADS.COR.config.mcp` | Servidores MCP | `.mcp.json` | ✅ vivo (7 servidores) |
| `ADS.COR.config.docker` | Infra local | `docker-compose.yml` | ✅ vivo (Redis :6396 + Qdrant :6352) |
| `ADS.COR.config.pipeline` | Pipeline auto-compact (6 passos canônicos) | `tools/adsentice_pipeline_auto_compact.sh` | ✅ vivo (EVO-API pattern) |

---

## Dimensão CAP(abilidades) — {#ADS.CAP}

### ADS.CAP.dataforseo — DataForSEO (MCP oficial)

| Rota | Capability | Módulo DataForSEO | Status |
|---|---|---|---|
| `ADS.CAP.dataforseo.keyword_research` | Pesquisa de keywords | DATAFORSEO_LABS | ✅ via MCP |
| `ADS.CAP.dataforseo.serp_organic` | SERP orgânico | SERP | ✅ via MCP |
| `ADS.CAP.dataforseo.domain_competitors` | Concorrentes | DOMAIN_ANALYTICS | ✅ via MCP |
| `ADS.CAP.dataforseo.business_profile_gmb` | Google Meu Negócio | BUSINESS_DATA | ✅ via MCP |
| `ADS.CAP.dataforseo.business_reviews` | Reviews Google | BUSINESS_DATA | ✅ via MCP |
| `ADS.CAP.dataforseo.on_page_lighthouse` | Lighthouse audit | ONPAGE | ✅ via MCP |
| `ADS.CAP.dataforseo.ads_traffic_forecast` | Previsão de tráfego pago | KEYWORDS_DATA | ✅ via MCP |
| `ADS.CAP.dataforseo.backlinks_summary` | Backlinks | BACKLINKS | ✅ via MCP |
| `ADS.CAP.dataforseo.content_sentiment` | Análise de sentimento | CONTENT_ANALYSIS | ✅ via MCP |
| `ADS.CAP.dataforseo.ai_mentions` | Menções em IA | AI_OPTIMIZATION | ✅ via MCP |

Cobertura: **10 caps live-ready** (9 módulos DataForSEO MCP)

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
| `ADS.INT.kg.edges` | Arestas do KG adsentice | `tools/adsentice_kg_server.py` | ✅ 34 arestas, 5 tipos de relação |
| `ADS.INT.kg.tools` | MCP tools: edges, neighbors, what_produces, stats | `adsentice-kg` MCP server | ✅ vivo |

### ADS.INT.conversation — Histórico e Memória

| Rota | Descrição | Coleção Qdrant | Status |
|---|---|---|---|
| `ADS.INT.conv.history` | Histórico Claude Code (adsentice + EVO-API ref) | `adsentice-conversation` | ✅ 716 pts (38 RUST-CHAT + 678 Claude history) |
| `ADS.INT.conv.memory` | Memória ativa curada | `claude-memory` | 🟡 collection criada, vazia |
| `ADS.INT.conv.tools` | MCP tools: search, recall, remember, status | `adsentice-conversation` MCP server | ✅ vivo |
| `ADS.INT.conv.ingest` | Scripts de ingestão | `tools/adsentice_*_ingest.py` | ✅ 2 scripts (RUST-CHAT + Claude history) |
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
| `ADS.INF.railway` | Backend deploy | — | `apps/api/` | 🔴 a construir |
| `ADS.INF.supabase` | Database + Auth | — | Supabase | ✅ auth wire |

---

## Dimensão PRD(oduto) — {#ADS.PRD}

### ADS.PRD.chat — adsentice Chat

| Rota | Descrição | Status |
|---|---|---|
| `ADS.PRD.chat.discovery` | Pipeline discovery: URL → cards + tips | 🔴 spec pronta, sem código |
| `ADS.PRD.chat.analyze` | Deep-dive credit-gated | 🔴 a construir |
| `ADS.PRD.chat.message` | Chat livre com contexto do negócio | 🔴 a construir |

### ADS.PRD.enrichment — Funil de Enriquecimento (5 camadas)

| Rota | Camada | Dados | Custo/lead | Status |
|---|---|---|---|---|
| `ADS.PRD.enrich.l0_gmb` | L0 · Atração GMB | 27 campos canônicos | $0.015 | ✅ live |
| `ADS.PRD.enrich.l1_website` | L1 · Website Lighthouse | SEO, performance, analytics, CMS, schema | $0.0001 | 🟡 spec pronta |
| `ADS.PRD.enrich.l2_social` | L2 · Social Media | Instagram, Facebook, TikTok, engajamento | $0.0005 | 🔴 v0.3 |
| `ADS.PRD.enrich.l3_brand` | L3 · Brand & Market | Branded search, SOV, backlinks, AI mentions | $0.03 | 🔴 v0.5 |
| `ADS.PRD.enrich.l4_diagnostic` | L4 · Diagnóstico LLM | Plano 7/30/90, script abordagem, proposta | $0.02 | 🔴 v0.5 |

### ADS.PRD.products — Produtos por Camada

| Rota | Produto | Preço | Camada | Status |
|---|---|---|---|---|
| `ADS.PRD.products.raio_x` | Raio-X (diagnóstico gratuito) | R$0 | L0 | 🟡 spec pronta |
| `ADS.PRD.products.auditoria` | Auditoria de Site (PDF 30+ checks) | R$47 | L1 | 🔴 v0.3 |
| `ADS.PRD.products.social_kit` | Social Media Kit (templates+calendário) | R$47 | L2 | 🔴 v0.4 |
| `ADS.PRD.products.sentinela` | Sentinela (monitoramento 24/7) | R$197/mês | L0-L2 | 🔴 v0.4 |
| `ADS.PRD.products.seo_local` | SEO Local (otimização contínua) | R$197/mês | L1 | 🔴 v0.3 |
| `ADS.PRD.products.brandformance` | Brandformance (mix brand+performance) | R$497/mês | L3 | 🔴 v0.5 |
| `ADS.PRD.products.dominio` | Domínio (full stack) | R$497/mês | L0-L4 | 🔴 v0.6 |
| `ADS.PRD.products.consultoria` | Consultoria (diagnóstico completo) | ticket | L4 | 🔴 v0.6 |

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

*Base-Matriz adsentice v1.0.9 · 2026-07-13 · 7 dimensões · 100+ rotas · medido=verdade · ISOLADO do EVO-API · L1 Enrichment ATIVO (27 campos GMB) · 76 capabilities mapeadas (L0-L4) · 4 estratégias de nutrição por perfil · 5 camadas de enriquecimento (Search→Profile→SEO+Social→Keywords→AI) · Supabase LIVE · Cloudflare R2 configurado*

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

---

*Base-Matriz adsentice v1.2.1 · 2026-07-13 · 7 dimensoes · 100+ rotas · medido=verdade · ADR-0008 (76 caps L0-L4) · 100 leads (SP+RJ) · $0.60 DataForSEO · 704 corpus · 727 conversation · 25 changelog · 8 ADRs · Supabase pg Pool · Cloudflare R2*
