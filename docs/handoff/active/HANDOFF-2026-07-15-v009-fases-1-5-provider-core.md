# HANDOFF v009 (2026-07-15) · Fases 1-5 Provider-Core + Market Holds + DeepSeek

> Auto-gerado · sessão `seed-20260711160437` · ~16:30 UTC
> BOA: 0.933 (EXCELLENT) · 235 commits · 21 ADRs · 7 skills

## 🛑 START-HERE (próxima sessão)
1. `redis :6396` · ler `adsentice:ooda:stage:*` + `adsentice:boa:*`
2. **Docs essenciais:** `docs/spec/base-matriz-adsentice.md` v1.8.0 + este handoff
3. **Auditoria:** `docs/spec/auditoria-evo-api-capabilities-adsentice.md`
4. **Fases:** `docs/spec/fases-provider-core-dataforseo.md`
5. **Provider-core:** `packages/provider-core/` · 21 tools L0→L4

## ✅ O QUE FOI FEITO

### FASE 1 (8 tools) — completada início da sessão
- L0: business_listings_search ($0.015)
- L1: business_profile_gmb ($0.0054)
- L2: on_page_instant_pages ($0.000125) · domain_technologies ($0.01) · lighthouse ($0.00425)
- L3: backlinks_competitors ($0.02)
- L4: serp_organic ($0.002) · google_reviews ($0.00075)

### FASE 2 (6 tools) — L3 Competitive Intelligence
- domain_competitors, domain_ranked_keywords, domain_keyword_gap, domain_overview, keyword_research, serp_local_finder

### FASE 3 (4 tools) — L4 Keywords & Market Intel
- keyword_volume, keyword_trends, keyword_related, content_sentiment

### FASE 4 (3 tools) — Deep Intelligence
- keyword_historical (equivalente capital.RS Ohlcv), business_qa, serp_maps

### FASE 5 (infra) — Market Holds Pipeline
- market_holds table (Supabase migration 004)
- Wire appendMarketHolds() no discovery-search
- /admin/market com time-series sparkline

### DeepSeek + S10
- Copywriter com framework estratégico (Corey Haines + Kim Barrett + CRO)
- Preços REAIS corrigidos (estavam errados 25-140×)
- KV Cache tracking (ON por padrão, 98% cheaper input)
- Balance API → Redis ($2.31 USD)

### Infra
- Provider-core adapter (substitui evo-mcp.ts)
- Shape catalog (27 endpoints, 6 clusters TypeScript)
- Sandbox probe (6/6 tools passam)
- Dataset BR ingerido no Qdrant (1000 keywords)
- Build error corrigido (import via adapter, não @adsentice/provider-core)

## 🧠 O ENTENDIMENTO

**Provider-core é o runtime primário.** DataForSEO chamado direto, 1 hop HTTP.
EVO-API é referência canônica (73 caps, shapes, translators, cost-registry, 3-stage gate).
NUNCA importar @adsentice/provider-core do Next.js — usar @/lib/provider-core-adapter.

**Market Holds = capital.RS Ohlcv pattern.** Cada Discovery search grava snapshot
de agregados no Supabase (append-only). Com meses de dados, respondemos perguntas
que NENHUM concorrente tem.

**S10 Copywriter medido=verdade.** Gap detector só gera gap quando tem sinal real.
Copy com persona+fórmula+anti-patterns. DeepSeek calibrado com pricing real.

## 🎯 ESTADO OODA
- **observe:** 21 tools provider-core, Fases 1-5 completas, Market Holds wire ativo
- **orient:** EVO-API absorvido (8/14 padrões, 57%). 21/40 caps (52.5%)
- **decide:** Fase 6 (Enterprise) no roadmap. Próximo: M2 Frontend + Hetzner
- **act:** SELADO v009 · 235 commits · 21 ADRs · 7 skills

## ▶️ PRÓXIMO (a fila)
1. **M2 Frontend real** — React 19 + Vite + shadcn/ui integrado ao apps/web/
2. **Hetzner CAX11 provision** — $5.39/mês + Cloudflare Workers
3. **L2 enrichment Dra. Karina** — rodar via :3000 Discovery com lighthouse live
4. **Fase 6 (Enterprise)** — ai.llm.mentions, ai.llm.responses, domain.whois, on_page.crawl_summary
5. **Keyword history ingest** — TOP 50 keywords × 5 categorias (~$2.53 one-time)

## 📊 SCORE
- **BOA:** 0.933 → **EXCELLENT**
- **Corpus A:** 18,190 · **Corpus C:** 75,853 · **Total:** 94,080
- **ADRs:** 21 · **Commits:** 235 · **Skills:** 7
- **Provider-core:** 21 tools L0→L4 · Pipeline: ~$0.272/lead

---
*HANDOFF v009 · 2026-07-15 · adsentice*
