---
id: adsentice-enrichment-layers
title: "Ads​entice Enrichment Layers — Funil de Captura → Análise → Solução"
status: living
type: spec
version: "1.0.0"
date: 2026-07-12
supersedes: "Pain Criteria v1.2 como modelo único de scoring"
depends_on:
  - docs/spec/adsentice-pain-criteria-v1.md (v1.2 Schwartz + ESC)
  - docs/spec/adsentice-marketing-vocab.md (Corey + Kim)
  - docs/spec/adsentice-esc-skills-analysis.md (gui.marketing)
---

# Enrichment Layers — Da Atração GMB ao Diagnóstico Completo

> **Princípio:** GMB é a camada de ATRAÇÃO (Layer 0). Cada lead capturado carrega portas de entrada para camadas mais profundas: website → landing pages → redes sociais → brand analysis. Cada camada revela NOVOS sinais de dor e desbloqueia NOVAS soluções para vender. O score não é estático — ele se aprofunda conforme enriquecemos.

---

## 1. O Funil de Enriquecimento (5 Camadas)

```
┌──────────────────────────────────────────────────────────────────┐
│                    LAYER 0 · ATRAÇÃO (GMB)                        │
│                    $0.015/busca · 27 campos                       │
│                                                                    │
│  DADOS: title, address, rating, reviews, photos, category,        │
│         place_id, cid, is_claimed, phone, website_url,            │
│         latitude, longitude, business_status, hours, desc         │
│                                                                    │
│  SCORE: Fit (10 sinais) + Engagement parcial (5/7) +             │
│         Intent parcial (2/3)                                      │
│  SOLUÇÕES: Raio-X gratuito (R$0)                                  │
│                                                                    │
│         │  phone ─────────────► WhatsApp validation               │
│         │  website_url ───────► LAYER 1                           │
│         │  place_id ──────────► Google Maps deep link             │
│         ▼                                                          │
├──────────────────────────────────────────────────────────────────┤
│                    LAYER 1 · WEBSITE (Lighthouse)                  │
│                    $0.0001/lead · on_page_lighthouse               │
│                                                                    │
│  DADOS: HTTPS, Core Web Vitals (LCP/INP/CLS), mobile score,      │
│         meta tags, heading structure, images (alt/compressão),    │
│         internal links, canonical, hreflang, robots.txt,          │
│         SEO score 0-100, analytics detection (GA4/GTM/Pixel),     │
│         CMS detection (WordPress, Wix, etc.), schema markup       │
│                                                                    │
│  SCORE: Engagement +5 sinais (W1-W8) + Intent +1 (W1 sem HTTPS)  │
│  SOLUÇÕES: Auditoria de Site (R$47) · SEO Local (R$197/mês)      │
│                                                                    │
│         │  CMS detected ───────► vulnerabilidades, updates        │
│         │  analytics ──────────► GA4/GTM setup (se ausente)       │
│         │  social_links ───────► LAYER 2                          │
│         ▼                                                          │
├──────────────────────────────────────────────────────────────────┤
│                    LAYER 2 · SOCIAL MEDIA (Scraping)               │
│                    $0.0005/lead · firecrawl + APIs                 │
│                                                                    │
│  DADOS: Instagram (followers, posts/mês, engajamento, link bio), │
│         Facebook (page likes, posts, reviews, ads ativos),        │
│         TikTok, LinkedIn, YouTube (se detectados)                 │
│                                                                    │
│  SCORE: Engagement +3 sinais sociais + Fit +1 (social presence)  │
│  SOLUÇÕES: Social Media Kit (R$47) · Gestão de Redes (R$197/mês)│
│                                                                    │
│         │  social handles ─────► cross-platform analysis          │
│         │  brand mentions ─────► LAYER 3                          │
│         ▼                                                          │
├──────────────────────────────────────────────────────────────────┤
│                    LAYER 3 · BRAND & MARKET (DataForSEO)          │
│                    $0.03/lead · 4 módulos combinados               │
│                                                                    │
│  DADOS: Branded search volume (kw_data), Domain competitors      │
│         (domain_analytics), Backlinks (backlinks_summary),        │
│         SERP position (serp_organic), Keyword ranking,            │
│         Share of Voice (SOV), AI mentions (ai_optimization)      │
│                                                                    │
│  SCORE: Fit +2 sinais de marca + Intent +1 (pressão competitiva) │
│  SOLUÇÕES: Brandformance (R$497/mês) · Domínio Completo (R$497)  │
│                                                                    │
│         │  brand health ───────► maturidade digital 0-100         │
│         │  competitor gap ─────► LAYER 4 (oportunidades)         │
│         ▼                                                          │
├──────────────────────────────────────────────────────────────────┤
│                    LAYER 4 · DIAGNÓSTICO (LLM Síntese)            │
│                    $0.02/lead · DeepSeek arbitragem                │
│                                                                    │
│  DADOS: Score Composto (5 camadas), Plano de Ação Personalizado, │
│         Projeção de ROI, Próximos Passos 7/30/90,                  │
│         Script de Abordagem Comercial, Copy para Proposta         │
│                                                                    │
│  SCORE: Final sintetizado com confiança (0-100)                   │
│  SOLUÇÕES: Proposta Personalizada · Consultoria (ticket variável) │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. O Que Cada Camada Desbloqueia

### Layer 0 — GMB (ATRAÇÃO)
**Custo:** $0.015/busca (já implementado)
**Dados:** 27 campos canônicos via `business_listings_search`
**Score possível:** Fit (10/10) + Engagement (5/7) + Intent (2/3)
**Solução vendível:** Raio-X gratuito — "Como sua [categoria] aparece no Google em [cidade]"

| Porta de Entrada | Leva Para |
|---|---|
| `website_url` | Layer 1 (Lighthouse) |
| `phone` | WhatsApp validation, CTWA detection |
| `place_id` | Google Maps deep link, reviews scraping |
| `cid` | GMB insights (fotos, posts, Q&A) |

### Layer 1 — WEBSITE (LIGHTHOUSE)
**Custo:** $0.0001/lead via `on_page_lighthouse`
**Dados:** 30+ sinais de SEO técnico, performance, analytics
**Score adicional:** +8 sinais Website (W1-W8)
**Soluções vendíveis:**
- Auditoria de Site (R$47 one-time) — relatório PDF com 30+ checks
- SEO Local (R$197/mês) — otimização contínua + relatório mensal
- Setup GA4/GTM (R$47 one-time) — tracking profissional

| Porta de Entrada | Leva Para |
|---|---|
| `social_links` (extraídos do HTML) | Layer 2 (Social Media) |
| `cms` detectado | Upsell de atualização/migração |
| `analytics` ausente | Upsell de setup tracking |
| `schema` ausente | Upsell de schema markup |

### Layer 2 — SOCIAL MEDIA (SCRAPING)
**Custo:** $0.0005/lead via firecrawl + APIs gratuitas
**Dados:** Presença social, engajamento, frequência de postagem
**Score adicional:** +4 sinais sociais
**Soluções vendíveis:**
- Social Media Kit (R$47 one-time) — templates + calendário editorial
- Gestão de Redes (R$197/mês) — 3 posts/semana + stories
- Tráfego Pago Social (R$497/mês) — Meta Ads + Instagram Ads

| Porta de Entrada | Leva Para |
|---|---|
| `social handles` ativos | Análise de conteúdo, tom de voz |
| `social handles` ausentes | Upsell de criação de perfis |
| `brand mentions` | Layer 3 (Brand analysis) |

### Layer 3 — BRAND & MARKET (DATAFORSEO)
**Custo:** $0.03/lead via 4 módulos combinados
**Dados:** Branded search, concorrentes, backlinks, AI mentions
**Score adicional:** +3 sinais de marca
**Soluções vendíveis:**
- Brandformance Strategy (R$497/mês) — mix branding + performance
- Domínio Completo (R$497/mês) — SEO + Social + Brand + Ads
- Competitive Intelligence (R$197 one-time) — relatório de concorrência

### Layer 4 — DIAGNÓSTICO (LLM)
**Custo:** $0.02/lead via DeepSeek
**Dados:** Síntese de todas as camadas em recomendação acionável
**Score:** Confiança 0-100 + veredito final
**Soluções vendíveis:**
- Proposta Personalizada (gratuita, incluso no plano)
- Consultoria (ticket variável, R$500-R$2.000)

---

## 3. Matriz de Custo × Valor por Camada

| Camada | Custo/Lead | Sinais | Valor Percebido | ROI |
|--------|:----------:|:------:|-----------------|:---:|
| **L0 · GMB** | $0.015 | 20 | "Como você aparece no Google" | 1× |
| **L1 · Website** | $0.0001 | +8 | "Nota do seu site: 35/100" | 100× |
| **L2 · Social** | $0.0005 | +4 | "Seu Instagram tem 200 seguidores; concorrente tem 5K" | 50× |
| **L3 · Brand** | $0.03 | +3 | "Ninguém pesquisa seu nome no Google" | 5× |
| **L4 · LLM** | $0.02 | síntese | "Seu plano de marketing em 7/30/90 dias" | 10× |
| **TOTAL** | **$0.0656** | **35+** | **Diagnóstico completo de marketing digital** | — |

> **Custo total por lead full-enriched: ~$0.07 (~R$0.38).** Com ticket médio R$197/mês, payback em **1 mês** (ROI 500× no primeiro ano).

---

## 4. O Que Isso Significa para o Score

O Score Composto da v1.2 (Fit×0.40 + Engagement×0.35 + Intent×0.25) agora é **acumulativo por camada**:

### 4.1 Expansão do Score por Camada

| Dimensão | L0 GMB | L1 Website | L2 Social | L3 Brand | TOTAL |
|----------|:------:|:----------:|:---------:|:--------:|:-----:|
| **Fit** | 10 sinais (70pts) | +1 (CMS) | +1 (social presence) | +2 (branded search, domain authority) | **14** |
| **Engagement** | 5 sinais (50pts) | +5 (W1-W8 SEO) | +3 (social eng.) | +1 (AI mentions) | **14** |
| **Intent** | 2 sinais (45pts) | +1 (sem HTTPS) | — | +1 (pressão competitiva) | **4** |

**Total de sinais: 35+ (eram 20 na v1.1)**

### 4.2 Confiança do Score

Cada camada adiciona não só sinais, mas **confiança estatística**:

```
Layer 0 apenas (GMB):
  Score: 61 (Solution Aware)
  Confiança: ⭐⭐ (baixa — baseado só em GMB)

Layer 0+1 (GMB + Website):
  Score: 58 (Solution Aware) ← ajustado com dados reais de SEO
  Confiança: ⭐⭐⭐⭐ (alta — dados técnicos objetivos)

Layer 0+1+2+3 (Full):
  Score: 72 (Product Aware) ← sinais de marca + social + SEO
  Confiança: ⭐⭐⭐⭐⭐ (muito alta — visão 360º)

Layer 0+1+2+3+4 (Full + LLM):
  Score Final: 72 com confiança 0.94
  Veredito: "Lead qualificado. Abordar com diagnóstico de SEO + Social."
```

---

## 5. Soluções por Camada → Product Roadmap

### 5.1 Produtos Atuais × Camadas

| Produto | Preço | Camada | O que entrega |
|---------|-------|:------:|---------------|
| **Raio-X** | R$0 | L0 | Relatório GMB gratuito: rating, reviews, fotos, concorrência |
| **Auditoria de Site** | R$47 | L1 | PDF com 30+ checks de SEO técnico (Corey seo-audit) |
| **Social Kit** | R$47 | L2 | Templates + calendário + análise de concorrentes sociais |

### 5.2 Produtos Futuros (Roadmap)

| Produto | Preço | Camada | O que entrega | Prioridade |
|---------|-------|:------:|---------------|:----------:|
| **SEO Local** | R$197/mês | L1 | Otimização contínua + relatório mensal + rank tracking | 🟢 v0.3 |
| **Sentinela** | R$197/mês | L0-L2 | Monitoramento 24/7 do GMB + alertas + relatório mensal | 🟡 v0.4 |
| **Gestão de Redes** | R$197/mês | L2 | 3 posts/semana + stories + engajamento + relatório | 🟡 v0.4 |
| **Brandformance** | R$497/mês | L3 | Mix branding + performance + relatório executivo (ESC) | 🟡 v0.5 |
| **Domínio** | R$497/mês | L0-L4 | Full stack: SEO + Social + Brand + Ads + Relatório | 🔴 v0.6 |
| **Consultoria** | ticket | L4 | Diagnóstico completo + plano 7/30/90 + implementação | 🔴 v0.6 |

### 5.3 Gatilhos de Upsell por Score

| Nível Schwartz | Score | Produto Sugerido |
|---------------|:-----:|-----------------|
| Unaware | 0-29 | Raio-X gratuito (educar) |
| Problem Aware | 30-49 | Raio-X + Auditoria de Site (diagnosticar) |
| Solution Aware | 50-69 | Sentinela ou SEO Local (resolver) |
| Product Aware | 70-84 | Brandformance ou Domínio (dominar) |
| Most Aware | 85-100 | Consultoria (fechar) |

---

## 6. Exemplo Concreto: Jornada de um Lead

### Clínica Estética "Beleza Pura" — São Paulo

```
╔══════════════════════════════════════════════════════════════╗
║ LAYER 0 · GMB ($0.015)                                       ║
║ ═══════════════════════                                       ║
║ Nome: Beleza Pura Estética Avançada                          ║
║ Categoria: medical_aesthetic_clinic                          ║
║ Rating: 4.2★ · Reviews: 34 · Fotos: 8                        ║
║ Website: https://belezapura.com.br  ← PORTA PARA L1          ║
║ Telefone: (11) 99999-0000             ← PORTA PARA WhatsApp  ║
║ Instagram: @belezapuraestetica        ← PORTA PARA L2        ║
║ Reivindicado: NÃO ← SINAL DE DOR!                            ║
║                                                               ║
║ SCORE L0: 52 (Solution Aware)                                ║
║ AÇÃO: Raio-X gratuito enviado. Lead clicou. ⭐                ║
╚══════════════════════════════════════════════════════════════╝
         │
         ▼ website_url detectado → disparar L1
╔══════════════════════════════════════════════════════════════╗
║ LAYER 1 · WEBSITE ($0.0001)                                   ║
║ ═══════════════════════════                                   ║
║ HTTPS: ❌ (HTTP apenas!)                     → W1 +20 INTENT ║
║ LCP: 4.8s (ruim) · CLS: 0.31 (ruim)        → W2 +10 ENG     ║
║ Mobile: 32/100                                → W3 +10 ENG    ║
║ Meta tags: título ok, sem description        → W4 +8 ENG     ║
║ Analytics: NENHUM (sem GA4, Pixel, GTM)     → W5 +10 ENG     ║
║ CMS: WordPress 5.2 (2019!!)                  → W6 +5 ENG      ║
║ Schema: ausente                              → W8 +5 ENG      ║
║ Instagram link no footer: @belezapuraestetica → CONFIRMA L2  ║
║                                                               ║
║ SCORE L0+L1: 68 (Solution Aware → Product Aware!)            ║
║ CONFIANÇA: ⭐⭐⭐⭐ (dados técnicos objetivos)                 ║
║ AÇÃO: Upsell Auditoria de Site (R$47) ⭐                       ║
╚══════════════════════════════════════════════════════════════╝
         │
         ▼ Instagram detectado → disparar L2
╔══════════════════════════════════════════════════════════════╝
║ LAYER 2 · SOCIAL ($0.0005)                                    ║
║ ═══════════════════════                                       ║
║ Instagram: 847 seguidores · 0.8 post/semana (BAIXO!)         ║
║ Engajamento: 1.2% (muito baixo — benchmark 3-5%)             ║
║ Facebook: página existe mas sem posts desde 2024             ║
║ TikTok: NÃO encontrado                                        ║
║ Links bio: Linktree (único link) ← sem landing page própria  ║
║ Concorrente direto: @draelis SP · 12K seguidores · 5% eng    ║
║                                                               ║
║ SCORE L0+L1+L2: 61 (Solution Aware ← ajustado: social FRACO)║
║ CONFIANÇA: ⭐⭐⭐⭐⭐ (visão completa de presença digital)    ║
║ AÇÃO: Upsell Social Kit (R$47) + Sentinela (R$197/mês) ⭐     ║
╚══════════════════════════════════════════════════════════════╝
         │
         ▼ Presença digital estabelecida → disparar L3
╔══════════════════════════════════════════════════════════════╝
║ LAYER 3 · BRAND ($0.03)                                       ║
║ ══════════════════                                            ║
║ Branded search: "beleza pura estetica" = 0-10/mês (ZERO!)   ║
║ Concorrentes: 7 clínicas no raio 3km                          ║
║ SOV: < 2% (mercado dominado por 2 players)                    ║
║ Backlinks: 3 (todos de diretórios gratuitos)                  ║
║ AI mentions: 0 (ChatGPT nunca mencionou)                      ║
║                                                               ║
║ SCORE FINAL (L0-L3): 55 (Solution Aware — brand FRACA)       ║
║ CONFIANÇA: ⭐⭐⭐⭐⭐ (360º completo)                           ║
║ MATURIDADE DIGITAL: 18/100 (ESC brandformance scale)         ║
╚══════════════════════════════════════════════════════════════╝
         │
         ▼ Full data → disparar L4 (LLM síntese)
╔══════════════════════════════════════════════════════════════╗
║ LAYER 4 · DIAGNÓSTICO ($0.02 DeepSeek)                       ║
║ ═══════════════════════════════                               ║
║ VEREDITO FINAL: LEAD QUENTE — Múltiplas dores sobrepostas    ║
║                                                               ║
║ TOP 3 DORES:                                                  ║
║ 1. Site SEM HTTPS + WordPress 2019 — risco de invasão        ║
║ 2. NINGUÉM pesquisa o nome da clínica no Google              ║
║ 3. Instagram 847 seguidores vs concorrente 12K               ║
║                                                               ║
║ PLANO 7/30/90:                                                ║
║ 7d:  Corrigir HTTPS + atualizar WordPress                    ║
║ 30d: Setup GA4 + Google Meu Negócio otimizado                ║
║ 90d: Estratégia de conteúdo + Instagram profissional         ║
║                                                               ║
║ PROPOSTA SUGERIDA:                                            ║
║ • Sentinela (R$197/mês) — monitoramento GMB + SEO            ║
║ • Social Kit (R$47) — templates + calendário                 ║
║ • Upsell 90d: Domínio (R$497/mês) — full stack               ║
║                                                               ║
║ SCRIPT ABORDAGEM:                                             ║
║ "Dra., sua clínica tem 34 avaliações ótimas no Google,       ║
║  mas seu site não tem segurança (HTTPS) e ninguém pesquisa   ║
║  seu nome. Isso significa que você está perdendo pacientes   ║
║  que procuram exatamente o que você oferece. Posso te        ║
║  mostrar como resolver isso em 7 dias?"                      ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 7. Arquitetura Técnica: Pipeline de Enriquecimento

```
Discovery (GMB)
    │
    ├─ phone encontrado ──► WhatsApp Validation API
    │                        └─ É WhatsApp? Business? CTWA?
    │
    ├─ website_url ───────► on_page_lighthouse (EVO-API MCP)
    │                        ├─ Core Web Vitals
    │                        ├─ SEO score 0-100
    │                        ├─ Analytics detection (GA4/GTM/Pixel)
    │                        ├─ CMS + version detection
    │                        ├─ Schema markup extraction
    │                        └─ Social links extraction ──► Layer 2 trigger
    │
    ├─ social handles ─────► firecrawl + APIs
    │                        ├─ Instagram (followers, posts, engagement)
    │                        ├─ Facebook (page, reviews, ads)
    │                        └─ TikTok/LinkedIn/YouTube (se detectado)
    │
    ├─ brand analysis ─────► DataForSEO combinado
    │                        ├─ kw_data (branded search volume)
    │                        ├─ domain_analytics (competitors)
    │                        ├─ backlinks_summary (authority)
    │                        └─ ai_optimization (AI mentions)
    │
    └─ full data ──────────► DeepSeek síntese
                             ├─ Score composto final
                             ├─ Plano 7/30/90
                             ├─ Proposta comercial
                             └─ Script de abordagem
```

---

## 8. Roadmap de Implementação

### Fase 1 · v0.2 (AGORA) — L0 + L1 básico
- [x] L0: GMB Discovery (27 campos)
- [x] Score Composto v1.2 (Fit/Engagement/Intent)
- [ ] L1: `on_page_lighthouse` wire real (remover alerta "simulado")
- [ ] 8 sinais W1-W8 calculados de dados REAIS
- [ ] Ordenação por Score Composto no Discovery
- [ ] Raio-X: PDF 1 página com dados GMB + Website

### Fase 2 · v0.3 — L1 completo + L2 iniciar
- [ ] L1: SEO score 0-100 (Corey seo-audit adaptado)
- [ ] Analytics detection: GA4, GTM, Pixel
- [ ] CMS detection + risk assessment
- [ ] L2: Instagram scraping básico (firecrawl)
- [ ] Social score: followers, posts/mês, engagement rate
- [ ] Auditoria de Site (R$47) — produto vendível

### Fase 3 · v0.4 — L2 completo + L3 iniciar
- [ ] L2: Facebook, TikTok, LinkedIn detection
- [ ] Concorrente social comparison
- [ ] L3: Branded search volume
- [ ] Sentinela (R$197/mês) — produto vendível
- [ ] Social Kit (R$47) — produto vendível

### Fase 4 · v0.5 — L3 completo + L4 iniciar
- [ ] L3: Domain competitors + SOV
- [ ] L3: Backlinks + authority score
- [ ] L3: AI mentions
- [ ] Maturidade Digital 0-100 (ESC brandformance scale)
- [ ] L4: Diagnóstico LLM (DeepSeek)
- [ ] Brandformance (R$497/mês) — produto vendível

### Fase 5 · v0.6 — Full Stack
- [ ] L4: Plano 7/30/90 automático
- [ ] L4: Script de abordagem comercial
- [ ] L4: Projeção de ROI por lead
- [ ] Domínio (R$497/mês) — full stack
- [ ] Consultoria — ticket variável

---

## 9. Métricas de Sucesso por Camada

| Métrica | L0 | L0+L1 | L0+L1+L2 | L0-L3 Full |
|---------|:--:|:-----:|:--------:|:----------:|
| Leads/mês (SP, dentistas, 10km) | 5,761 | — | — | — |
| % com website | 40% | 2,304 | — | — |
| % com social detectável | — | — | 1,200 | — |
| % que recebem Raio-X gratuito | 100% | — | — | — |
| % que convertem Raio-X → Auditoria | — | 15% | — | — |
| % que convertem Auditoria → Sentinela | — | — | 10% | — |
| % que convertem Sentinela → Domínio | — | — | — | 5% |
| Custo total/mês (SP, dentistas) | $0.015 | $0.25 | $0.85 | $70.00 |
| Receita potencial/mês | R$0 | R$16,243 | R$40,608 | R$149,818 |

> **Projeção:** 5,761 dentistas SP × 40% website × 15% conversão × R$47 = R$16,243/mês só com Auditoria.

---

*Enrichment Layers v1.0 · 2026-07-12 · 5 camadas · 35+ sinais · 6 produtos · Custo total $0.07/lead full-enriched*
