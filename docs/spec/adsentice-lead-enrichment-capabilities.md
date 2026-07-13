---
id: adsentice-lead-enrichment-capabilities
title: "Ads​entice Lead Enrichment — Matriz de Capacidades por Camada"
status: living
type: spec
version: "1.0.0"
date: 2026-07-13
---

# Lead Enrichment Capabilities — Da Atração à Estratégia de Marketing

> **Princípio:** Cada capability do EVO-API é uma alavanca de nutrição. O GMB profile (27 campos) desbloqueia O QUE está errado. As capabilities de mercado (SEO, concorrentes, keywords, backlinks, SERP) desbloqueiam COMO resolver. Juntas, geram um plano de marketing completo e vendável.

---

## 1. Estado Atual do Dashboard

### L0-only (11 campos — SEM enriquecimento)

| Métrica | Valor | Interpretação |
|---------|:-----:|---------------|
| Total listings | 10 | 10 dentistas SP (limit=10) |
| Regional total | 5.759 | Todos os dentistas no raio 10km |
| Score médio | 30/100 | Baixo — apenas 5-6 sinais avaliáveis |
| Unaware | 5 (50%) | Não sabem que têm problema digital |
| Problem Aware | 5 (50%) | Sentem a dor, não conhecem solução |
| Solution Aware+ | 0 (0%) | Nenhum lead qualificado ainda |
| Avg Fit | 31 | Categoria ICP + endereço → só 2 sinais |
| Avg Engagement | 26 | Rating + claimed → só 2 sinais |
| Avg Intent | 34 | Não reivindicado detectado em alguns |

### Sinais detectados (L0)

| Sinal | Leads | Campo GMB |
|-------|:-----:|-----------|
| F5 (endereço) | 5/10 | `address` |
| E1 (rating ≥4.0) | 5/10 | `rating_value` |
| F1 (categoria ICP) | 4/10 | `category` |
| E4 (claimed) | 4/10 | `is_claimed` |
| I1 (não reivindicado) | 1/10 | `is_claimed` |
| F3 (website) | 0/10 | ❌ não disponível no search |
| E3 (fotos) | 0/10 | ❌ não disponível |
| E5 (WhatsApp) | 0/10 | ❌ não disponível |

**Diagnóstico:** O L0 é insuficiente para nutrição de leads. Precisamos de L1 (perfil completo) + L2 (social) + L3 (mercado).

---

## 2. Matriz Completa de Capacidades EVO-API

O EVO-API tem **76 capabilities** via DataForSEO MCP. Para enriquecimento de leads, as mais relevantes são:

### CAMADA L0 — ATRAÇÃO (GMB Search)
**Custo: $0.015/busca**

| Capability | Endpoint DataForSEO | O que entrega |
|------------|---------------------|---------------|
| `business_listings_search` | `business_data/business_listings/search/live` | 11 campos: title, category, address, rating, reviews, place_id, is_claimed, lat/lng |

### CAMADA L1 — PERFIL COMPLETO (GMB Profile)
**Custo: $0.0054/lead**

| Capability | Endpoint | O que entrega | Estratégia |
|------------|----------|---------------|------------|
| `business_profile_gmb` | `business_data/google/my_business_info/live` | **27 campos canônicos**: website, phone, total_photos, description, business_status, price_level, work_hours, popular_times, rating_distribution, main_image, categories[], types[], district, postal_code | ✅ JÁ IMPLEMENTADO |

### CAMADA L2 — SEO & WEBSITE (On-Page)
**Custo: $0.0001/lead + $0.0005/lead**

| Capability | Endpoint | O que entrega | Estratégia de Nutrição |
|------------|----------|---------------|----------------------|
| `on_page_lighthouse` ⬜ | `on_page/lighthouse/live` | Core Web Vitals (LCP/INP/CLS), mobile score, SEO score, HTTPS, meta tags, heading structure, alt text, schema markup, analytics detection (GA4/GTM/Pixel) | **Auditoria de Site (R$47)**: "Seu site tem nota 32/100. Aqui está o checklist de 30 correções." |
| `domain_technologies` ⬜ | `domain_analytics/technologies/domain_technologies` | CMS (WordPress, Wix), analytics tools, CDN, plugins, JavaScript frameworks | **CMS Risk**: "WordPress 5.2 (2019) com 3 plugins sem update — risco de invasão." |
| `content_parsing` ⬜ | `on_page/content_parsing` | Extrai links, headings, texto da página | **Social Links**: Encontra Instagram, Facebook, TikTok no HTML do site |

### CAMADA L2 — SOCIAL MEDIA (Scraping)
**Custo: $0.0005/lead (firecrawl) ou $0 via APIs gratuitas**

| Dado | Fonte | Estratégia de Nutrição |
|------|-------|----------------------|
| Instagram followers, posts/mês, engagement rate | firecrawl / Meta Graph API | **Social Kit (R$47)**: "Seu Instagram tem 847 seguidores. Concorrente tem 12K. Aqui está um calendário editorial de 30 dias." |
| Facebook page, posts, reviews | Meta Graph API | Presença cross-platform. Anúncios ativos? (Ad Library) |
| TikTok perfil, vídeos | firecrawl | Estratégia de Reels/vídeos curtos |
| LinkedIn (B2B) | firecrawl | Porte da empresa, funcionários, segmento |

### CAMADA L3 — KEYWORDS & SEO DE MERCADO
**Custo: $0.02-0.04/lead (3-4 chamadas)**

| Capability | Endpoint | O que entrega | Estratégia de Nutrição |
|------------|----------|---------------|----------------------|
| `keyword_research` ⬜ | `dataforseo_labs/google/keyword_overview/live` | Search volume, CPC, competition para keywords da categoria | **SEO Local (R$197/mês)**: "A keyword 'dentista jardins' tem 2.900 buscas/mês a R$1.42 CPC. Você não aparece nela." |
| `serp_organic` ⬜ | `serp/google/organic/live/advanced` | Posição do lead no Google para keywords relevantes | **Rank Tracking**: "Você está na posição #23 para 'dentista SP'. Top 3 recebem 60% dos cliques." |
| `domain_rank_overview` ⬜ | `dataforseo_labs/google/domain_rank_overview/live` | Domain rank, tráfego orgânico estimado, keywords ranqueadas | **Domain Authority**: "Seu site tem rank 12/1000. Concorrentes têm 45+. Isso explica por que você não aparece." |
| `keyword_ideas` ⬜ | `dataforseo_labs/google/keyword_ideas/live` | Keywords relacionadas que o lead deveria ranquear | **Gap de Conteúdo**: "8 keywords que seus concorrentes ranqueiam e você não." |

### CAMADA L3 — CONCORRENTES
**Custo: $0.02-0.04/lead**

| Capability | Endpoint | O que entrega | Estratégia de Nutrição |
|------------|----------|---------------|----------------------|
| `domain_competitors` ⬜ | `dataforseo_labs/google/competitors_domain/live` | TOP 20 concorrentes orgânicos + pagos | **Competitive Intel (R$197)**: "Seus 5 principais concorrentes no Google e o que eles fazem melhor." |
| `domain_intersection` ⬜ | `dataforseo_labs/google/domain_intersection/live` | Keywords que lead E concorrente ranqueiam vs keywords SÓ do concorrente | **Keyword Gap**: "30 keywords que seus concorrentes ranqueiam e você não. Valor estimado: +500 visitas/mês." |
| `serp_competitors` ⬜ | `dataforseo_labs/google/serp_competitors/live` | Quem aparece nas SERPs para keywords do nicho | **SOV (Share of Voice)**: "Você tem 3% de share. Top player tem 42%." |
| `bulk_traffic_estimation` ⬜ | `dataforseo_labs/bulk_traffic_estimation/live` | Tráfego estimado do lead vs concorrentes | **Tráfego Comparativo**: "Seu site: ~50 visitas/mês. Concorrente: ~2.000 visitas/mês." |

### CAMADA L3 — BACKLINKS & AUTORIDADE
**Custo: $0.02/lead**

| Capability | Endpoint | O que entrega | Estratégia de Nutrição |
|------------|----------|---------------|----------------------|
| `backlinks_summary` ⬜ | `backlinks/summary/live` | Total backlinks, referring domains, domain rank | **Link Building**: "Você tem 3 backlinks de diretórios. Concorrente tem 120 de sites reais." |
| `backlinks_competitors` ⬜ | `backlinks/competitors/live` | Domínios que linkam para concorrentes mas não para o lead | **Link Gap**: "15 sites que linkam para concorrentes e poderiam linkar para você." |

### CAMADA L3 — ANÁLISE DE MERCADO
**Custo: $0.02/lead**

| Capability | Endpoint | O que entrega | Estratégia de Nutrição |
|------------|----------|---------------|----------------------|
| `keyword_suggestions` ⬜ | `dataforseo_labs/google/keyword_suggestions/live` | Long-tail keywords com a marca/categoria | **Conteúdo Local**: "20 perguntas que pacientes fazem no Google sobre [categoria] em [cidade]." |
| `search_intent` ⬜ | `dataforseo_labs/search_intent/live` | Intenção de busca (informational/commercial/transactional) | **Funil de Conteúdo**: "60% das buscas são 'informational'. Você precisa de blog. 25% são 'transactional'. Você precisa de LP de conversão." |
| `google_trends` ⬜ | `kw_data/google_trends_explore/live` | Tendências de busca no tempo | **Sazonalidade**: "Harmonização facial cresce 40% no verão. Prepare campanhas em outubro." |

### CAMADA L4 — AI & BRAND
**Custo: $0.02/lead**

| Capability | Endpoint | O que entrega | Estratégia de Nutrição |
|------------|----------|---------------|----------------------|
| `ai_mentions` ⬜ | `ai_optimization/llm_ment_search` | O ChatGPT/Google AI menciona este negócio? | **AIO (AI Optimization)**: "O ChatGPT recomenda 3 concorrentes quando perguntam 'melhor dentista SP'. Você não aparece." |
| `content_sentiment` ⬜ | `content_analysis/search/live` | Sentimento das menções online | **Reputação**: "Seu sentimento online é 60% positivo. Concorrente é 85%." |

---

## 3. Matriz de Custo × Valor por Lead

| Camada | Caps Usadas | Custo/Lead | Sinais Novos | Upsell |
|--------|:----------:|:----------:|:------------:|--------|
| **L0** Search | 1 | $0.015 | 5-6 | Raio-X (R$0) |
| **L1** Profile | 1 | $0.0054 | +8 (total 12-14) | Auditoria de Site (R$47) |
| **L2** SEO+Social | 3 | $0.0016 | +8 (total 20+) | SEO Local (R$197/mês) |
| **L3** Keywords+Concorrentes | 4 | $0.08 | +6 (total 26+) | Domínio (R$497/mês) |
| **L4** AI+Brand | 2 | $0.04 | +3 (total 29+) | Brandformance (R$497/mês) |
| **TOTAL** | 11 | **~$0.14** | **29+ sinais** | **R$0 → R$497** |

---

## 4. Estratégias de Nutrição por Perfil de Lead

### Perfil A — "Invisível Digital" (score 50-65, Solution Aware)
```
Sinais: Sem website, sem WhatsApp, <5 fotos, não reivindicado
Nutrição:
  Semana 1: Raio-X gratuito → "Seu negócio está invisível no Google"
  Semana 2: Setup WhatsApp Business + reivindicar GMB (grátis)
  Semana 3: 15 fotos profissionais + descrição SEO
  Semana 4: Proposta Sentinela (R$197/mês) — monitoramento 24/7
```

### Perfil B — "Site Quebrado" (score 55-70, Solution Aware)
```
Sinais: Tem site MAS sem HTTPS, mobile 32/100, sem analytics, WordPress 2019
Nutrição:
  Semana 1: Auditoria de Site (R$47) — 30 checks com correções priorizadas
  Semana 2: Setup GA4 + GTM + Search Console (R$47)
  Semana 3: Otimização mobile + Core Web Vitals
  Semana 4: Proposta SEO Local (R$197/mês) — rank tracking + otimização contínua
```

### Perfil C — "Presença Mas Sem Tráfego" (score 60-75, Product Aware)
```
Sinais: GMB completo, site OK, MAS zero branded search, 3 backlinks
Nutrição:
  Semana 1: Keyword Research — quais keywords trazem pacientes?
  Semana 2: Competitive Analysis — o que os top 3 fazem?
  Semana 3: Content Strategy — 10 artigos para blog baseados em search intent
  Semana 4: Proposta Domínio (R$497/mês) — SEO + Social + Brand + Conteúdo
```

### Perfil D — "Concorrência Forte" (score 65-85, Product→Most Aware)
```
Sinais: Rating 4.5, 100+ reviews, site bom, MAS concorrentes têm 3× mais tráfego
Nutrição:
  Semana 1: Link Gap Analysis — 15 sites para conseguir backlinks
  Semana 2: SOV Dashboard — monitorar share of voice
  Semana 3: Brandformance Strategy — mix branding + performance
  Semana 4: Proposta Brandformance (R$497/mês) — dominação de mercado
```

---

## 5. Próximos Passos — Roadmap Técnico

### Fase 1 · L1 Profile (FEITO ✅)
- [x] `business_profile_gmb` via EVO-API MCP
- [x] Enriquecimento top 5 leads por busca
- [x] 27 campos canônicos → 12-14 sinais de score

### Fase 2 · L2 Website + Social (v0.3)
- [ ] `on_page_lighthouse` — Core Web Vitals, SEO score, analytics detection
- [ ] `content_parsing` — extração de social links do HTML
- [ ] Instagram scraping (firecrawl) — followers, posts/mês, engagement
- [ ] Dashboard: Social Score + Website Health cards por lead

### Fase 3 · L3 Keywords + Concorrentes (v0.4)
- [ ] `keyword_research` + `serp_organic` por lead
- [ ] `domain_competitors` — TOP 5 concorrentes
- [ ] `backlinks_summary` — domain authority
- [ ] Competitive Intelligence report automático

### Fase 4 · L4 AI + Brand (v0.5)
- [ ] `ai_mentions` — presença em LLMs
- [ ] `google_trends` — tendências do nicho
- [ ] Diagnóstico LLM (DeepSeek) com plano 7/30/90 personalizado
- [ ] Script de abordagem comercial por perfil de lead

---

## 6. O Que Isso Significa para o SaaS

### Antes (v0.1)
```
"Encontramos 5.759 dentistas em SP."
→ O que eu faço com isso? 🤷
```

### Agora (v0.2 + L1)
```
"Dr. Silva, sua clínica tem 4.2★ e 34 reviews, mas:
 - Seu site NÃO tem HTTPS (risco de segurança)
 - Você usa 2 de 7 categorias no Google (-60% tráfego)
 - 8 fotos no GMB (mínimo 15 para dentista)
 - WhatsApp detectado (bom!)
 - Presença digital: 31/100

 Roteiro 7 dias:
 1. 🔧 Ativar HTTPS no site (grátis, 10min)
 2. 📸 Subir 10 fotos novas (grátis, 15min)
 3. 🏷️ Adicionar 5 categorias no GMB (grátis, 5min)
 4. 📝 Reescrever descrição com keywords (grátis, 10min)
 
 Quer que eu te ajude com isso?"
```

### Futuro (v0.5 com L2+L3+L4)
```
"Dr. Silva, análise completa da sua presença digital:

 📊 SEU NEGÓCIO (OdontoVita) vs MERCADO (Jardins, SP):
 ┌──────────────────┬──────────┬──────────┬──────────┐
 │ Métrica          │ Você     │ Média    │ Top 1    │
 ├──────────────────┼──────────┼──────────┼──────────┤
 │ ⭐ Rating        │ 4.2      │ 4.3      │ 4.8      │
 │ 📝 Reviews       │ 34       │ 67       │ 230      │
 │ 🔍 Brand Searches│ 0/mês 😱 │ 85/mês   │ 210/mês  │
 │ 🌐 Domain Rank   │ 12/1000  │ 35       │ 78       │
 │ 🔗 Backlinks     │ 3        │ 25       │ 120      │
 │ 📱 Instagram     │ 847 seg  │ 2.100    │ 12.000   │
 │ 🏷️ Categorias    │ 2/7      │ 5/7      │ 7/7      │
 │ 🤖 ChatGPT       │ Não      │ -        │ Sim ✅   │
 └──────────────────┴──────────┴──────────┴──────────┘

 🔴 PROBLEMAS CRÍTICOS:
 1. ZERO pessoas pesquisam 'OdontoVita' no Google
 2. ChatGPT recomenda 3 concorrentes, nunca você
 3. Seu Instagram tem 847 seguidores vs 12K do concorrente
 4. 3 backlinks (todos de diretório gratuito)

 🟢 OPORTUNIDADES:
 1. 8 keywords que você deveria ranquear (2.900 buscas/mês combinadas)
 2. 15 sites que linkam para concorrentes (link building potencial)
 3. 'Dentista jardins' tem 590 buscas/mês — você não aparece

 📋 PLANO 7/30/90:
 7d:  Reivindicar GMB + 15 fotos + HTTPS + descrição SEO
 30d: Blog com 4 artigos + Instagram 3×/semana + link building inicial
 90d: Campanha Google Ads local + AI optimization + Brandformance

 💰 PROJEÇÃO:
   Investimento: Brandformance R$497/mês × 12 = R$5.964
   Tráfego adicional: +200 visitas/mês
   Agendamentos: +6 pacientes/mês
   Ticket médio: R$300
   Receita adicional: R$21.600/ano
   ROI: 262%

 📞 SCRIPT:
 'Dr., ninguém pesquisa o nome da sua clínica no Google.
  Isso significa que todo paciente que busca 'dentista jardins'
  encontra primeiro seus concorrentes. São 590 pessoas por mês
  que nunca vão saber que você existe. Quer mudar isso?'"
```

---

## 7. Tabela de Decisão: O Que Usar Por Lead

| Score | Schwartz | L0 | L1 | L2 | L3 | L4 | Produto Sugerido |
|:-----:|----------|:--:|:--:|:--:|:--:|:--:|-----------------|
| 0-29 | Unaware | ✅ | ❌ | ❌ | ❌ | ❌ | Raio-X gratuito (educar) |
| 30-49 | Problem Aware | ✅ | ✅ | ❌ | ❌ | ❌ | Raio-X + Auditoria |
| 50-69 | Solution Aware | ✅ | ✅ | ✅ | ❌ | ❌ | Sentinela (R$197) |
| 70-84 | Product Aware | ✅ | ✅ | ✅ | ✅ | ❌ | Domínio (R$497) |
| 85-100 | Most Aware | ✅ | ✅ | ✅ | ✅ | ✅ | Brandformance (R$497) + Consultoria |

**Regra de gasto:** Só ativar camada N+1 se o score na camada N for ≥ threshold. Isso evita gastar $0.14 num lead Unaware que não vai converter.

---

*Lead Enrichment Capabilities v1.0 · 2026-07-13 · 76 capabilities EVO-API · 4 camadas L0-L4 · 29+ sinais de scoring · 5 estratégias de nutrição por perfil*
