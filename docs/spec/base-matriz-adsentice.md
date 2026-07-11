---
id: base-matriz-adsentice
title: "Base-Matriz do Ecossistema adsentice — mapa navegável versionado"
status: living
type: spec
version: "0.1.1"
date: 2026-07-11
updated: 2026-07-11T21:00:00-03:00
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
tags: [base-matriz, adsentice, mapa, navegavel, ecossistema]
---

# Base-Matriz do Ecossistema adsentice v0.1.0

> **Propósito:** mapa navegável e versionado do ecossistema adsentice — o que existe, onde está, quais as rotas estáveis.
> **Regra-mãe:** `medido=verdade` — toda rota cita fonte (arquivo, commit, teste). Sem fonte = não verificado.
> **Língua:** português (pt-BR).
> **ISOLADO do EVO-API:** este é o ecossistema adsentice standalone.

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
| `ADS.COR.docs.chat_spec` | Especificação do adsentice Chat | `docs/adsentice-chat-spec.md` | ✅ vivo |
| `ADS.COR.docs.jasper_analise` | Análise competitiva Jasper.ai | `docs/jasper-ai-analise-competitiva.md` | ✅ vivo |
| `ADS.COR.docs.jasper_solutions` | Análise soluções Jasper | `docs/jasper-solutions-analise.md` | ✅ vivo |
| `ADS.COR.docs.jasper_api` | Documentação API Jasper (16 seções) | `docs/jasper-docs/jasper-api-docs-completo.md` | ✅ referência |
| `ADS.COR.docs.comparativo_dfseo` | DataForSEO MCP oficial vs EVO-API provider.core | `docs/dataforseo-oficial-mcp-vs-evo-api-provider-core.md` | ✅ vivo |
| `ADS.COR.docs.comparativo_claude_seo` | RSXT+EVO-API vs Claude SEO | `docs/rsxt-evo-api-vs-claude-seo.md` | ✅ vivo |

### ADS.COR.adr — ADRs

| Rota | Descrição | Status |
|---|---|---|
| `ADS.COR.adr.0001` | Arquitetura standalone adsentice | ✅ accepted (2026-07-11) |

### ADS.COR.code — Código

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.code.web` | Dashboard Next.js + Chat UI | `apps/web/` | ✅ vivo (5 commits) |
| `ADS.COR.code.vault` | Cofre durável (R2 + Postgres) | `packages/vault/` | ✅ vivo (6/6 testes) |
| `ADS.COR.code.api` | Backend Railway | `apps/api/` | 🔴 a construir |
| `ADS.COR.code.core` | Domínio puro (Lead, Score, Solution) | `packages/core/` | 🔴 a construir |
| `ADS.COR.code.db` | Schemas Supabase | `packages/db/` | 🔴 a construir |

### ADS.COR.config — Configuração

| Rota | Descrição | Fonte | Status |
|---|---|---|---|
| `ADS.COR.config.claude` | Hooks + Skills Claude Code | `.claude/` | ✅ vivo (3 hooks, 2 skills) |
| `ADS.COR.config.claudemd` | CLAUDE.md canônico | `CLAUDE.md` | ✅ vivo (recuperação pós-compact) |
| `ADS.COR.config.mcp` | Servidores MCP | `.mcp.json` | ✅ vivo (6 servidores) |
| `ADS.COR.config.docker` | Infra local | `docker-compose.yml` | ✅ vivo (Redis :6396 + Qdrant :6352) |

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
| `ADS.INT.brain.chat` | adsentice Chat — discovery + deep-dive | `docs/adsentice-chat-spec.md` | ⚠️ spec pronta, sem código |
| `ADS.INT.brain.brand_iq` | Brand IQ automático (descoberto, não configurado) | Pipeline discovery | 🔴 a construir |
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

*Base-Matriz adsentice v0.1.0 · 2026-07-11 · 7 dimensões · 55+ rotas estáveis · medido=verdade · ISOLADO do EVO-API*

## Changelog

| Versao | Data | Descricao | Handoff | Status |
|---|---|---|---|---|
| v001 | 2026-07-11 | criar-o-ecossistema-adsentice-completo | `HANDOFF-2026-07-11-v001-criar-o-ecossistema-adsentice-completo.md` | ✅ vivo |

## Changelog

| Versao | Data | Descricao | Handoff | Status |
|---|---|---|---|---|
| v002 | 2026-07-11 | montar-ecossistema-completo-adsentice-com-mcp-servers-kg-ood | `HANDOFF-2026-07-11-v002-montar-ecossistema-completo-adsentice-com-mcp-serv.md` | ✅ vivo |
