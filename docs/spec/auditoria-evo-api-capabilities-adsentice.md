# Auditoria Completa: EVO-API Capabilities → adsentice provider-core

> **Propósito:** Auditoria de TODAS as 73 capabilities mapeadas no EVO-API, com priorização de
> implementação no provider-core adsentice. medido=verdade.
> **Data:** 2026-07-15
> **Fontes:** 73 YAMLs em `EVO-API/main/canonical/capabilities/` · cost-registry.yaml · shapes catalog

---

## 1. Resumo Estatístico

| Dimensão | Total |
|----------|-------|
| **Capabilities mapeadas** | 73 |
| **Com translator pronto (1+ live)** | 29 (40%) |
| **Translator pendente** | 25 (34%) |
| **Dados de shape apenas** | 19 (26%) |
| **Domínios** | seo (55), local (6), serp (27), app (4), commerce (4), ai_search (3), ads (1) |
| **Precificadas no cost-registry** | 50+ |
| **Implementadas no provider-core** | 4 (5.5%) |
| **Custo pipeline L0→L4 completo** | ~$0.15/lead |

---

## 2. Matriz Completa por Pipeline adsentice

### L0 · DISCOVERY (1 cap)

| # | Capability | Status EVO-API | Endpoint DataForSEO | Custo | provider-core |
|---|-----------|---------------|---------------------|-------|---------------|
| 1 | `business.listings.search` | ready | `business_data/business_listings/search/live` | $0.015 | ✅ implementado |

**Gap:** Nenhum. Cobertura 100%.

---

### L1 · PROFILE (2 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | provider-core | Prioridade |
|---|-----------|---------------|----------|-------|---------------|------------|
| 2 | `business.profile.gmb` | ready (1 live) | `business_data/google/my_business_info/live` | $0.0054 | ✅ implementado | — |
| 3 | `business.qa` | ready | `business_data/google/questions_and_answers/live` | $0.00075 | ❌ | 🟡 MÉDIA |

**business.qa:** Perguntas e respostas do Google Meu Negócio. Revela dúvidas reais de pacientes
("aceita convênio?", "faz implante?"). Material riquíssimo para copy do S10 e conteúdo de blog.
**Custo:** $0.00075. **Impacto:** Conteúdo baseado em perguntas reais de pacientes.

---

### L2 · WEBSITE+SEO (8 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | provider-core | Prioridade |
|---|-----------|---------------|----------|-------|---------------|------------|
| 4 | `on_page.instant_audit` | ready (1 live) | `on_page/instant_pages` | $0.000125 | ✅ implementado | — |
| 5 | `domain.technologies` | ready (1 live) | `domain_analytics/technologies/domain_technologies/live` | $0.01 | ✅ implementado | — |
| 6 | `on_page.lighthouse` | ready (1 live) | `on_page/lighthouse/live` | $0.00425 | ❌ | 🔴 ALTA |
| 7 | `on_page.pages` | ready (1 live) | `on_page/pages` | $0.000125 | ❌ | 🔴 ALTA |
| 8 | `on_page.crawl_summary` | ready (task-based) | `on_page/summary/{id}` | $0.000125 | ❌ | 🟡 MÉDIA |
| 9 | `on_page.links` | ready (1 live) | `on_page/links` | $0.000125 | ❌ | 🟢 BAIXA |
| 10 | `on_page.resources` | ready (1 live) | `on_page/resources` | $0.0015 | ❌ | 🟢 BAIXA |
| 11 | `on_page.duplicate_content` | ready (task-based) | `on_page/duplicate_content/{id}` | $0.00025 | ❌ | 🟢 BAIXA |
| 12 | `on_page.non_indexable` | ready (task-based) | `on_page/non_indexable` | $0.00025 | ❌ | 🟢 BAIXA |

**on_page.lighthouse:** Performance real do site (Core Web Vitals, accessibility, SEO, PWA).
Hoje inventamos "Site sem otimização mobile" sem dado real. Este fecha o gap.
**Custo:** $0.00425. **Impacto:** Gap #2 do S10 vira medido=verdade.

**on_page.pages:** Lista TODAS as páginas do domínio com URL, título, tamanho, status code.
Detecta se tem landing pages por serviço, blog, página de contato.
**Custo:** $0.000125. **Impacto:** Gap #3 (conteúdo local) e #5 (arquitetura) do S10 viram medido=verdade.

---

### L3 · COMPETITIVE (4 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | provider-core | Prioridade |
|---|-----------|---------------|----------|-------|---------------|------------|
| 13 | `backlinks.competitors` | ready | `backlinks/competitors/live` | $0.02 | ✅ código existe | 🔴 ALTA |
| 14 | `domain.competitors` | ready (1 live) | `dataforseo_labs/google/competitors_domain/live` | $0.0101 | ❌ | 🔴 ALTA |
| 15 | `domain.ranked_keywords` | ready (1 live) | `dataforseo_labs/google/ranked_keywords/live` | $0.0101 | ❌ | 🔴 ALTA |
| 16 | `domain.keyword_gap` | ready (1 live) | `dataforseo_labs/google/domain_intersection/live` | $0.0101 | ❌ | 🟡 MÉDIA |

**domain.competitors:** TOP 20 domínios que competem pelas mesmas keywords. Com `intersections` count.
Essencial para o Radar de Mercado do plano Domínio (R$497/mês).
**Custo:** $0.0101. **Impacto:** Competitive landscape real, não estimado.

**domain.ranked_keywords:** TODAS as keywords que o domínio rankeia no Google, com posição,
volume de busca, CPC, e intenção. Material para content gap analysis real.
**Custo:** $0.0101. **Impacto:** Substitui keyword research manual.

**backlinks.competitors:** Já implementado no provider-core (`backlinks-competitors.ts`)
mas não integrado ao pipeline. Só falta wire no discovery-search.

---

### L3b · BACKLINKS (5 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | Prioridade |
|---|-----------|---------------|----------|-------|------------|
| 17 | `backlinks.summary` | ready | `backlinks/summary/live` | $0.02 | 🟢 BAIXA |
| 18 | `backlinks.detail` | ready | `backlinks/backlinks/live` | $0.02 | 🟢 BAIXA |
| 19 | `backlinks.anchors` | ready | `backlinks/anchors/live` | $0.02 | 🟢 BAIXA |
| 20 | `backlinks.referring_domains` | ready | `backlinks/referring_domains/live` | $0.02 | 🟢 BAIXA |
| 21 | `backlinks.history` | ready | `backlinks/history/live` | $0.02 | 🟢 BAIXA |

**Motivo da baixa prioridade:** Backlinks são avançados. O SMB brasileiro não precisa de
análise granular de backlinks no MVP. O `backlinks.competitors` + `backlinks.summary`
cobrem 80% do valor com 20% do custo.

---

### L4 · KEYWORDS (4 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | Prioridade |
|---|-----------|---------------|----------|-------|------------|
| 22 | `keyword.research` | ready | `dataforseo_labs/google/keyword_overview/live` | $0.02 | 🔴 ALTA |
| 23 | `keyword.volume` | ready | `keywords_data/google_ads/search_volume/live` | $0.075 | 🟡 MÉDIA |
| 24 | `keyword.trends` | ready | `keywords_data/google_trends/explore/live` | $0.009 | 🟡 MÉDIA |
| 25 | `keyword.related` | ready | `dataforseo_labs/google/related_keywords/live` | $0.0109 | 🟢 BAIXA |

**keyword.research:** Volume de busca, CPC, competição, intenção de busca (informational,
commercial, transactional). Essencial para decidir quais keywords atacar.
**Custo:** $0.02. **Impacto:** Planejamento de conteúdo baseado em dados reais.

**keyword.volume:** Volume de busca para lista de keywords. Complementa keyword.research.
**Custo:** $0.075 (caro!). **Impacto:** Usar com moderação — 1 chamada cobre 1000 keywords.

---

### L4 · SERP (27 caps — seleção dos 4 relevantes)

| # | Capability | Status | Endpoint | Custo | Prioridade |
|---|-----------|--------|----------|-------|------------|
| 26 | `serp.organic` | ready | `serp/google/organic/live/advanced` | $0.002 | 🔴 ALTA |
| 27 | `serp.maps` | ready | `serp/google/maps/live/advanced` | $0.002 | 🟡 MÉDIA |
| 28 | `serp.local_finder` | ready | `serp/google/local_finder/live/advanced` | $0.002 | 🟡 MÉDIA |
| 29 | `serp.ai_mode` | ready | `serp/google/ai_overview/live/advanced` | $0.002 | 🟢 BAIXA |

**serp.organic:** Resultados orgânicos do Google para uma keyword. Mostra EXATAMENTE quem
aparece, em qual posição, com qual snippet. Essencial para competitive landscape.
**Custo:** $0.002. **Impacto:** Radar de Mercado real.

**serp.local_finder:** Resultados do Google Maps para busca local. Ex: "dentista Madureira".
Mostra o mapa, as 3 primeiras posições, e reviews.

**Os outros 23 SERP** (images, news, jobs, events, finance, youtube, video_info, baidu, bing,
yahoo, seznam, naver, autocomplete, ads_search, dataset_info, dataset_search, finance_explore,
finance_markets, finance_quote, finance_ticker_search, search_by_image, ads_advertisers)
são irrelevantes para SMB Brasil e devem ser ignorados.

---

### L4 · REVIEWS & REPUTATION (4 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | Prioridade |
|---|-----------|---------------|----------|-------|------------|
| 30 | `business.reviews.google` | ready (task flow) | `business_data/google/reviews/task_post` | $0.00075 | 🔴 ALTA |
| 31 | `business.reviews.tripadvisor` | ready | `business_data/tripadvisor/reviews/live` | $0.00075 | 🟢 BAIXA |
| 32 | `business.reviews.trustpilot` | ready | `business_data/trustpilot/reviews/live` | $0.00075 | 🟢 BAIXA |
| 33 | `business.qa` | ready | `business_data/google/questions_and_answers/live` | $0.00075 | 🟡 MÉDIA |

**business.reviews.google:** Texto completo das reviews do Google. Datas, notas, respostas
do owner. Material para: social proof no S10, detecção de padrões de elogio/reclamação,
follow-up de reviews não respondidas.
**Custo:** $0.00075. **Impacto:** Depoimentos reais no Raio-X.

---

### L4 · AI OPTIMIZATION (3 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | Prioridade |
|---|-----------|---------------|----------|-------|------------|
| 34 | `ai.llm.mentions` | ready (1 live) | `ai_optimization/llm_mentions/live` | $0.20 | 🟢 BAIXA |
| 35 | `ai.llm.responses` | ready (1 live) | `ai_optimization/<engine>/llm_responses/live` | $0.0008 | 🟢 BAIXA |
| 36 | `ai.keyword.search_volume` | ready | `ai_optimization/keyword_data/live` | $0.01 | 🟢 BAIXA |

**ai.llm.mentions:** Onde uma marca/keyword é mencionada em ChatGPT, Gemini, Claude.
Monitoramento de brand em AI search. **Caro ($0.20)**. Plano Escala.
**ai.llm.responses:** Respostas de LLMs para prompts específicos. Benchmarking.

---

### L4 · CONTENT ANALYSIS (3 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | Prioridade |
|---|-----------|---------------|----------|-------|------------|
| 37 | `content.sentiment_summary` | ready (1 live) | `content_analysis/summary/live` | $0.02 | 🟡 MÉDIA |
| 38 | `content.sentiment_detailed` | translator_pending | `content_analysis/search/live` | $0.02 | 🟢 BAIXA |
| 39 | `content.search` | translator_pending | `content_analysis/search/live` | $0.02 | 🟢 BAIXA |

**content.sentiment_summary:** Análise de sentimento de menções da marca na web.
Positivo/negativo/neutro, distribuição por país, fontes.

---

### L4 · DOMAIN INTEL (4 caps)

| # | Capability | Status EVO-API | Endpoint | Custo | Prioridade |
|---|-----------|---------------|----------|-------|------------|
| 40 | `domain.overview` | ready | `domain_analytics/whois/overview/live` | $0.101 | 🟢 BAIXA |
| 41 | `domain.whois` | ready | `domain_analytics/whois/live` | $0.101 | 🟢 BAIXA |

---

### NÃO RELEVANTES (33 caps)

**App Store (4):** `app.reviews`, `app.store.detail`, `app.store.search`, `app.keywords`
**Merchant (4):** `merchant.products.amazon`, `merchant.products.google`, `merchant.sellers.amazon`, `merchant.product.amazon.detail`
**Databases (2):** `databases.keyword.historical`, `databases.keyword.volume_history`
**SERP específicos (23):** images, news, jobs, events, finance_*, youtube, video_*, baidu, bing, yahoo, seznam, naver, autocomplete, ads_*, dataset_*

Irrelevantes para SMB Brasil. Não implementar.

---

## 3. Roadmap de Implementação

### 🔴 FASE 1 · Agora (4 caps) — Fecha gaps S10 `medido=verdade`

| # | Capability | Custo | Dias |
|---|-----------|-------|------|
| 6 | `on_page.lighthouse` | $0.00425 | 0.5 |
| 7 | `on_page.pages` | $0.000125 | 0.5 |
| 30 | `business.reviews.google` | $0.00075 | 0.5 |
| 26 | `serp.organic` | $0.002 | 0.5 |

**Custo total:** $0.007125/lead extra (L2 expandido).
**Impacto:** 3 gaps do S10 (`medido=verdade`) + competitive SERP real.

### 🟡 FASE 2 · Esta semana (4 caps) — L3 Competitive Intelligence

| # | Capability | Custo | Dias |
|---|-----------|-------|------|
| 13 | `backlinks.competitors` (integrar) | $0.02 | 0.5 |
| 14 | `domain.competitors` | $0.0101 | 0.5 |
| 15 | `domain.ranked_keywords` | $0.0101 | 0.5 |
| 22 | `keyword.research` | $0.02 | 0.5 |

**Custo total:** $0.0602/lead extra.
**Impacto:** Competitive Intelligence completo (L3).

### 🟢 FASE 3 · Semana que vem (3 caps) — Reviews + Q&A + Trends

| # | Capability | Custo | Dias |
|---|-----------|-------|------|
| 3 | `business.qa` | $0.00075 | 0.5 |
| 24 | `keyword.trends` | $0.009 | 0.5 |
| 37 | `content.sentiment_summary` | $0.02 | 0.5 |

**Custo total:** $0.02975/lead extra.
**Impacto:** Reviews reais + tendências + sentimento de marca.

### ⚪ FASE 4 · Futuro (4 caps) — Expansão

| # | Capability | Custo | Dias |
|---|-----------|-------|------|
| 34 | `ai.llm.mentions` | $0.20 | 1 |
| 35 | `ai.llm.responses` | $0.0008 | 1 |
| 23 | `keyword.volume` | $0.075 | 0.5 |
| 27 | `serp.maps` | $0.002 | 0.5 |

### ❌ NÃO IMPLEMENTAR (33 caps)

App Store, Merchant, Databases, SERP não-Google (baidu, bing, yahoo...), backlinks
granulares — irrelevantes para o nicho SMB Brasil.

---

## 4. Custo Marginal por Fase

| Fase | Caps | Custo extra/lead | Pipeline total/lead |
|------|------|:----------------:|:-------------------:|
| **Hoje** | 4 (L0+L1+L2) | — | **$0.0505** |
| **Fase 1** | +4 (lighthouse, pages, reviews, serp) | +$0.0071 | **$0.0576** |
| **Fase 2** | +4 (competitors, ranked_kw, kw_research, backlinks) | +$0.0602 | **$0.1178** |
| **Fase 3** | +3 (qa, trends, sentiment) | +$0.0298 | **$0.1476** |
| **Fase 4** | +4 (ai_mentions, llm, volume, maps) | +$0.2778 | **$0.4254** |

---

## 5. Arquitetura de Implementação

Seguir o padrão do provider-core existente:

```
packages/provider-core/src/tools/
├── business-listings-search.ts    ✅ L0
├── business-profile-gmb.ts        ✅ L1
├── business-reviews-google.ts     🔴 Fase 1
├── instant-pages.ts               ✅ L2
├── domain-technologies.ts         ✅ L2
├── lighthouse.ts                  🔴 Fase 1
├── onpage-pages.ts                🔴 Fase 1
├── backlinks-competitors.ts       ✅ L3 (já existe, wire pendente)
├── domain-competitors.ts          🟡 Fase 2
├── ranked-keywords.ts             🟡 Fase 2
├── keyword-research.ts            🟡 Fase 2
├── serp-organic.ts                🔴 Fase 1
├── reviews-google.ts              🔴 Fase 1
├── business-qa.ts                 🟢 Fase 3
├── keyword-trends.ts              🟢 Fase 3
└── content-sentiment.ts           🟢 Fase 3
```

Cada tool ~50 linhas seguindo o template:

```typescript
export async function capabilityName(params: {...}): Promise<Result | null> {
  const c = getClient()
  const body = [{ /* input traduzido */ }]
  const data = await c.post<{ items: Record<string, unknown>[] }>("/v3/<endpoint>", body)
  const item = data.items?.[0]
  if (!item) return null
  return { /* parse canônico */ }
}
```

---

*Auditoria EVO-API → adsentice · 2026-07-15 · medido=verdade*
*73 caps mapeadas · 40 relevantes · 4 implementadas · 7 na Fase 1*
