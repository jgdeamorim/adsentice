---
id: adr-0008
title: EVO-API como Motor de Enriquecimento Completo (76 capabilities → L0-L4)
status: accepted
date: 2026-07-13
deciders: founder, claude
supersedes: [adr-0006 (EVO-API as Data Engine)]
extends: [adr-0001, adr-0002]
---

# ADR-0008 · EVO-API como Motor de Enriquecimento Completo

## Contexto

O adsentice já usa 2 das 76 capabilities do EVO-API (`business_listings_search` + `business_profile_gmb`) via MCP no tenant `adsentice-dev`. Isso nos deu 100 leads únicos (SP + RJ) com 27 campos canônicos, score composto (Fit×0.40 + Engagement×0.35 + Intent×0.25), nível Schwartz, e detecção de canal de contato — tudo por $0.60 (~R$3.30). Resultado: R$0.033/lead com dados completos, **860× mais barato que Google Ads** (R$28.40/lead, só nome e telefone).

As 74 capabilities restantes estão disponíveis mas não integradas. Cada uma desbloqueia uma estratégia de marketing vendável como produto adsentice.

## Decisão

**Adotamos o EVO-API como motor de enriquecimento progressivo L0→L4.** Cada camada de enriquecimento desbloqueia novos sinais de scoring, novas estratégias de nutrição, e novos produtos vendáveis.

### Arquitetura de Camadas

```
L0 · ATRAÇÃO ($0.015/busca)
  business_listings_search → 11 campos → 5-6 sinais de score
  Produto: Raio-X gratuito

L1 · PERFIL ($0.0054/lead) ✅ IMPLEMENTADO
  business_profile_gmb → 27 campos canônicos → 12-14 sinais
  business_reviews_google → reviews individuais (⬜)
  Produto: Auditoria de Site (R$47)

L2 · WEBSITE + SEO ($0.012/lead) ⬜ v0.3
  on_page_lighthouse → Core Web Vitals, SEO score, analytics detection
  on_page_instant_audit → auditoria SEO completa
  domain_technologies → CMS, plugins, CDN
  on_page_links → links internos/externos, social links
  Produto: SEO Local (R$197/mês)

L3 · CONCORRÊNCIA + KEYWORDS ($0.08/lead) ⬜ v0.4
  domain_competitors → TOP 20 concorrentes
  domain_ranked_keywords → keywords que o lead rankeia
  domain_keyword_gap → keywords do concorrente que o lead NÃO rankeia
  keyword_research → volume de busca, CPC, competição
  backlinks_summary → domain authority, referring domains
  serp_ads_advertisers → quem anuncia Google Ads na categoria
  Produto: Domínio (R$497/mês)

L4 · BRAND + AI ($0.06/lead) ⬜ v0.5
  ai_llm_mentions → ChatGPT menciona este negócio?
  ai_llm_responses → perguntar para LLMs sobre o lead
  content_sentiment_summary → sentimento online da marca
  keyword_trends → tendências de busca no tempo
  databases_keyword_historical → histórico de volume
  Produto: Brandformance (R$497/mês) + Consultoria (ticket)
```

### Regra de Gastos

- Só ativar camada N+1 se o score na camada N for ≥ threshold
- Leads Unaware (0-29): só L0 (Raio-X gratuito)
- Leads Problem Aware (30-49): L0 + L1
- Leads Solution Aware (50-69): L0 + L1 + L2
- Leads Product Aware (70-84): L0 + L1 + L2 + L3
- Leads Most Aware (85-100): L0 + L1 + L2 + L3 + L4 (full stack)

### Custo Máximo por Lead

| Camada | Custo incremental | Custo acumulado |
|--------|:----------------:|:---------------:|
| L0 | $0.015 | $0.015 |
| L1 | $0.0054 | $0.020 |
| L2 | $0.012 | $0.032 |
| L3 | $0.08 | $0.112 |
| L4 | $0.06 | $0.172 |

**Lead full-enriched (L0-L4): $0.17 ≈ R$0.94.**
Compare: Google Ads CPL = R$28.40. O adsentice é 30× mais barato com 50× mais dados.

## Consequências

### Positivas
- Cada lead pode ser enriquecido progressivamente, gastando mais só nos que convertem
- 74 capabilities viram 74 estratégias de marketing vendáveis
- O flywheel de dados acelera: cada busca enriquece o Supabase com mais dados de mercado
- Produtos escalonados: Raio-X (R$0) → Auditoria (R$47) → Sentinela (R$197) → Domínio (R$497)

### Negativas
- Complexidade de implementação: cada capability tem schema de input diferente
- Rate limits DataForSEO: 2.000 chamadas/dia por endpoint (ok para MVP)
- Latência: cada chamada L3/L4 adiciona 2-5s ao pipeline
- Necessário implementar no `discovery-search/route.ts` com Promise.allSettled (mesmo padrão do L1 batch)

## Implementação (Roadmap)

### Fase 1 · v0.3 — L2 Website + SEO
- [ ] `on_page_lighthouse` para leads com website
- [ ] `domain_technologies` — CMS, analytics detection
- [ ] `on_page_links` — extração de social links
- [ ] 8 sinais W1-W8 do scoring (já definidos, hoje simulados)
- [ ] Dashboard: Website Health card por lead
- [ ] Produto: Auditoria de Site (R$47) — PDF automático com 30+ checks

### Fase 2 · v0.4 — L3 Concorrência + Keywords
- [ ] `domain_competitors` — TOP 5 concorrentes
- [ ] `keyword_research` — volume de busca para keywords da categoria
- [ ] `domain_ranked_keywords` — posição do lead no Google
- [ ] `backlinks_summary` — domain authority
- [ ] Competitive Intelligence report automático
- [ ] Produto: Domínio (R$497/mês)

### Fase 3 · v0.5 — L4 Brand + AI + Diagnóstico
- [ ] `ai_llm_mentions` — presença em ChatGPT/Google AI
- [ ] `content_sentiment_summary` — reputação online
- [ ] `keyword_trends` — tendências do nicho
- [ ] Diagnóstico LLM (DeepSeek) com plano 7/30/90
- [ ] Script de abordagem comercial por perfil
- [ ] Produto: Brandformance (R$497/mês) + Consultoria

## Prova (medido)
- $0.60 gastos em 6 buscas L0+L1 → 100 leads únicos, 32 L1 RJ (64%), city/district ✅
- EVO-API MCP tools/list → 76 tools disponíveis no tenant `adsentice-dev`
- Todas as tools testadas individualmente funcionam com `spend_cap_usd: 0.05`

## Referências
- ADR-0006 (EVO-API as Data Engine)
- `docs/spec/adsentice-lead-enrichment-capabilities.md` — matriz completa L0-L4
- `docs/spec/adsentice-enrichment-layers.md` — anatomia 27 campos GMB
- `apps/web/src/lib/evo-mcp.ts` — MCP client com `businessListingsSearch()` + `businessProfileGmb()`
- `apps/web/src/lib/scoring.ts` — Scoring engine (Fit/Engagement/Intent + Schwartz)
- EVO-API `crates/evo-superadmin/src/dag.rs` — DAG actor pattern (referência)
