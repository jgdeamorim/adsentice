---
id: adsentice-marketing-vocab
title: "Ads​entice Marketing Vocab — Enriquecimento de Domínio via Corey Haines + Kim Barrett"
status: living
type: spec
version: "1.0.0"
date: 2026-07-12
sources:
  - vendor/marketingskills (Corey Haines, 43 skills, MIT)
  - vendor/advertising-skills (Kim Barrett, 12 skills, MIT)
  - docs/spec/adsentice-pain-criteria-v1.md
---

# Marketing Vocab — Ponte entre Skills de Mercado e o Domínio Adsentice

> **Princípio:** Adsentice não é uma ferramenta de SEO — é um **diagnóstico de marketing digital para SMB**. Os skills do Corey (marketing SaaS) e Kim (direct response advertising) fornecem o vocabulário que nos faltava para transformar sinais técnicos em recomendações de negócio.

---

## 1. Estrutura dos Repositórios

### Corey Haines — 43 marketing skills (marketingskills)

Cobre o stack completo de marketing SaaS:

| Categoria | Skills | Relevância Adsentice |
|-----------|--------|---------------------|
| **SEO** | seo-audit, programmatic-seo, ai-seo, schema, site-architecture | ⭐⭐⭐ Núcleo do Discovery |
| **Analytics** | analytics, ab-testing | ⭐⭐⭐ Tier 3 enriquecimento |
| **Conversão** | cro, signup, popups, paywalls, onboarding, form-cro | ⭐⭐⭐ Landing pages + funil |
| **Conteúdo** | copywriting, copy-editing, content-strategy, image, video, social | ⭐⭐ Geração de diagnóstico |
| **Growth** | competitors, customer-research, marketing-ideas, free-tools, lead-magnets | ⭐⭐⭐ Avatar + competitive |
| **Canais** | ads, cold-email, emails, sms, social, community-marketing, co-marketing, referrals | ⭐⭐ Upsell futuro |
| **Precificação** | pricing, offers | ⭐⭐⭐ Ticket strategy |
| **Operações** | revops, sales-enablement, launch, prospecting, marketing-plan | ⭐⭐ Pipeline |
| **Estratégia** | marketing-psychology, marketing-council, product-marketing, marketing-loops | ⭐⭐⭐ Base conceitual |
| **App Stores** | aso | ⭐ Mobile apps |
| **PR** | public-relations | ⭐ Brand building |
| **Diretórios** | directory-submissions | ⭐⭐⭐ GMB enrichment |

### Kim Barrett — 12 advertising skills (advertising-skills)

Framework de direct response organizado em 5 camadas:

| Camada | Skills | Função |
|--------|--------|--------|
| **Foundations** | avatar-extraction, offer-extraction | Quem compra + o que vender |
| **Copy-Chief** | schwartz-awareness-mapper, mechanism-builder, headline-matrix, objection-crusher | Como falar com cada audiência |
| **Operator-OS** | ad-angle-multiplier, scroll-stopping-creative, conversion-path-builder, performance-diagnosis | Execução + otimização |
| **Orchestrators** | full-funnel-campaign-orchestrator | Sequência completa |
| **QA** | generic-language-killer | Qualidade de copy |

---

## 2. Mapeamento Direto: Conceito → Aplicação Adsentice

### 2.1 SEO Audit (Corey) → Pain Criteria Tier 1-2-3

O `seo-audit` do Corey define 5 prioridades de auditoria com 30+ sinais. Nosso Tier 3 atual tem apenas 5 sinais.

| Prioridade Corey | Sinais (parciais) | Nosso Tier Atual | Gap |
|-----------------|-------------------|-----------------|-----|
| **1. Crawlability & Indexação** | robots.txt, sitemap, canonical, redirect chains, orphan pages | ❌ Nenhum | 7 sinais novos |
| **2. Technical Foundations** | Core Web Vitals (LCP/INP/CLS), TTFB, HTTPS, mobile-friendly, URL structure | ⚠️ T3.5 (mobile) | 5 sinais novos |
| **3. On-Page Optimization** | Title tags, meta descriptions, H1-H6, alt text, internal linking, keyword targeting | ❌ Nenhum | 8 sinais novos |
| **4. Content Quality** | E-E-A-T signals, content depth, thin content, duplicate content | ⚠️ T3.4 (blog) | 6 sinais novos |
| **5. Authority & Links** | Backlink profile, referring domains, competitor link gap | ❌ Nenhum | 3 sinais novos |

**Ação:** Expandir Tier 3 de 5 → 20+ sinais usando o framework do Corey como checklist canônico.

### 2.2 Programmatic SEO (Corey) → Discovery Engine

O `programmatic-seo` descreve exatamente o que o Discovery Engine faz: gerar páginas em escala a partir de dados estruturados.

| Conceito Corey | Nosso Equivalente | Status |
|---------------|-------------------|--------|
| **12 Playbooks** | Nossas 12 categorias GMB (dentista, clínica, etc.) | ✅ Alinhado |
| **Locations Playbook** (`[service] in [location]`) | Nossa geo hierarchy (Estado→Cidade→Raio) | ✅ Implementado |
| **Data Defensibility Hierarchy** | GMB data = Public (weakest tier). Precisamos ir para Proprietary | ⚠️ Gap estratégico |
| **Hub and Spoke Model** | Categoria hub → city spokes | ❌ Não implementado |
| **Pre-Launch Checklist** | Nosso cache + confirmação de gasto | ✅ Parcial |
| **Post-Launch Monitoring** | Tracking de indexação, ranking, tráfego | ❌ Não implementado |

**Ação estratégica:** O Discovery Engine É programmatic SEO aplicado a GMB. Podemos gerar landing pages `/dentista/sp-campinas` automaticamente, ranqueando para "dentista em Campinas" — o Corey já tem o playbook completo.

### 2.3 Schwartz Awareness Mapper (Kim) → Score de Dor

O modelo de 5 níveis de consciência do Eugene Schwartz é **muito superior** aos nossos thresholds numéricos arbitrários (LEAD≥40, QUENTE≥55).

| Nível Schwartz | O que o lead sabe | Equivalente Adsentice | Ação recomendada |
|---------------|-------------------|----------------------|-----------------|
| **1. Unaware** | Não sabe que tem problema | Score 0-25 (SAUDÁVEL) | Educar. Conteúdo gratuito. |
| **2. Problem Aware** | Sabe que tem dor mas não conhece solução | Score 26-45 (ATENÇÃO) | Agitar a dor. Mostrar que tem solução. |
| **3. Solution Aware** | Sabe que existem soluções mas não conhece a adsentice | Score 46-65 (QUENTE) | Comparação. Por que adsentice é diferente. |
| **4. Product Aware** | Conhece a adsentice mas não decidiu | Score 66-85 (URGENTE) | Prova social. Garantia. Oferta. |
| **5. Most Aware** | Já decidiu, só precisa fechar | Score 86-100 (FECHANDO) | Call to action direto. Urgência. |

**Ação:** Substituir thresholds numéricos por níveis Schwartz. Cada lead recebe não só um score mas um **nível de consciência** que determina a abordagem de venda.

### 2.4 Avatar Extraction (Kim) → Category Ranker v2

O `avatar-extraction` do Kim extrai muito mais que demografia:

| Dimensão Kim | Nossa Categoria GMB | Gap |
|-------------|-------------------|-----|
| **Current Situation** | Categoria (dentista) | Falta: atende convênio? ticket médio? especialidade? |
| **Pain Points** | Pain signals (T1-T3) | Falta: dores específicas por categoria |
| **Desired Outcome** | Não temos | Cada categoria tem um "job to be done" diferente |
| **Failed Attempts** | Não temos | O que o dentista já tentou? (Instagram? Google Ads? panfletos?) |
| **Emotional Drivers** | Não temos | Medo de perder cliente? Status? Sobrevivência? |

**Ação:** Expandir Category Ranker com `avatar-extraction` por categoria. Um dentista não é igual a um advogado — cada um tem dores, desejos e tentativas fracassadas diferentes.

### 2.5 Objection Crusher (Kim) → Pipeline Stage 0→7

Cada objeção de compra mapeia para uma etapa do pipeline:

| Objeção Kim | Exemplo SMB BR | Estágio Pipeline |
|------------|----------------|-----------------|
| **Price** | "R$197/mês? Muito caro." | Stage 2-3 (Nutrição) |
| **Time** | "Não tenho tempo pra mexer nisso." | Stage 1-2 (Conscientização) |
| **Trust** | "Será que funciona pra clínica pequena?" | Stage 3-4 (Prova social) |
| **Complexity** | "Não entendo de Google Meu Negócio." | Stage 0-1 (Educação) |
| **Past Failures** | "Já paguei agência e não deu certo." | Stage 0-2 (Diferenciação) |

**Ação:** Cada stage do pipeline deve ter objeções mapeadas + respostas prontas (usando `objection-crusher`).

### 2.6 Performance Diagnosis (Kim) → Lead Detail Page

O `performance-diagnosis` do Kim diagnostica campanhas em 5 dimensões:

| Dimensão Kim | Nosso Lead Detail | Status |
|-------------|-------------------|--------|
| **1. Offer** | ❌ Não avaliamos a oferta do lead | Gap |
| **2. Audience** | ⚠️ Temos categoria mas não avatar | Gap |
| **3. Creative** | ❌ Não avaliamos assets visuais | Gap |
| **4. Funnel** | ⚠️ Temos website detection mas não funnel | Gap |
| **5. Sales** | ❌ Não sabemos se convertem | Gap |

**Ação:** Transformar a página de detalhe do lead de "tabela de campos GMB" em "diagnóstico de marketing" seguindo as 5 dimensões do Kim.

### 2.7 Conversion Path Builder (Kim) → Produto Sentinela

Os 3 caminhos de conversão do Kim mapeiam diretamente para features do produto:

| Path Kim | Aplicação Adsentice |
|----------|-------------------|
| **Direct Call** | Botão "Falar com Especialista" no diagnóstico |
| **Lead Magnet** | Relatório gratuito "Como sua clínica aparece no Google" (Raio-X) |
| **VSL (Video Sales Letter)** | Vídeo-diagnóstico automático (futuro) |

---

## 3. Enriquecimento Conceitual: 50+ Mental Models (Corey)

O skill `marketing-psychology` contém 50+ modelos mentais organizados em 5 categorias. Os mais relevantes para adsentice:

### 3.1 Modelos que Refinam Nossos Pain Criteria

| Modelo | Aplicação Adsentice |
|--------|-------------------|
| **Jobs to Be Done** | O dentista não quer "SEO" — quer "pacientes novos". Reframe de features → outcomes. |
| **Theory of Constraints** | Cada lead tem UM gargalo principal. Nosso diagnóstico deve identificá-lo. |
| **BJ Fogg Behavior Model** (B=MAT) | Lead só converte se tiver Motivation + Ability + Trigger simultâneos. |
| **Loss Aversion** | "Você está perdendo X pacientes por mês" bate mais que "Você pode ganhar X pacientes". |
| **IKEA Effect** | Deixar o lead co-criar seu diagnóstico aumenta comprometimento. |
| **Endowment Effect** | Free trial (Raio-X gratuito) faz o lead sentir que já é dono. |

### 3.2 Modelos que Refinam Nossos Produtos

| Modelo | Aplicação Adsentice |
|--------|-------------------|
| **Paradox of Choice** | 3 tiers (R$0/R$197/R$497) é o ideal. 7 tiers paralisa. |
| **Decoy Effect** | Um tier "decoy" entre Free e Pro torna o Starter mais atraente. |
| **Rule of 100** | Preços < R$100: "% de desconto". Preços > R$100: "R$X off". |
| **Goal-Gradient Effect** | Barra de progresso no onboarding: "80% do seu diagnóstico pronto". |
| **Peak-End Rule** | O momento "uau" do diagnóstico + follow-up bem feito = percepção positiva. |
| **Foot-in-the-Door** | Raio-X gratuito → Sentinela → Domínio. Cada degrau prepara o próximo. |

### 3.3 Modelos que Refinam Nosso Copy/UI

| Modelo | Aplicação Adsentice |
|--------|-------------------|
| **Curse of Knowledge** | Nós entendemos SEO; o dentista não. Testar copy com leigos. |
| **Mere Exposure Effect** | Consistência visual (Materio) + presença multi-canal constroi confiança. |
| **Authority Bias** | "Baseado em dados reais do Google Meu Negócio" = autoridade. |
| **Social Proof / Bandwagon** | "X clínicas já foram diagnosticadas em SP" no dashboard. |
| **Framing Effect** | "90% dos seus concorrentes já tem site otimizado" vs "Você está entre os 10% sem site". |
| **Hick's Law** | Simplificar choices. Um CTA claro por página. |

---

## 4. Framework de Campanha Completa (Kim)

O `full-funnel-campaign-orchestrator` define uma sequência de 9 passos que é o blueprint do que adsentice DEVERIA entregar como serviço:

```
1. avatar-extraction     → Definir persona do lead (dentista SP, ticket médio R$300)
2. offer-extraction      → Definir oferta irresistível (diagnóstico gratuito)
3. schwartz-awareness    → Classificar nível de consciência
4. mechanism-builder     → "Por que adsentice funciona e agência tradicional não"
5. ad-angle-multiplier   → Multiplicar ângulos de ataque (criativos)
6. scroll-stopping       → Criar hooks que param o scroll (assunto de email, título de LP)
7. conversion-path       → Desenhar funil: visita → diagnóstico → proposta
8. objection-crusher     → Antecipar e neutralizar objeções
9. generic-language-killer → Limpar copy genérico, deixar humano
```

**Ação:** Implementar este pipeline como skill `adsentice-campaign` — um orquestrador que gera campanha completa para um lead usando os 9 passos.

---

## 5. Analytics Tracking (Corey) → Nosso Tier 3

O skill `analytics` do Corey é muito mais rico que nosso binário `noAnalytics`:

### 5.1 Sinais de Analytics que Detectamos Hoje

| Sinal | Nosso Código | Cobertura |
|-------|-------------|-----------|
| GA4 presente? | `noAnalytics` (switch) | ⚠️ Binário |
| Facebook Pixel? | Incluso em `noAnalytics` | ⚠️ Combinado |
| GTM presente? | ❌ | Gap |

### 5.2 Sinais que Deveríamos Detectar (do skill do Corey)

| Sinal | Como Detectar | Valor para Diagnóstico |
|-------|--------------|----------------------|
| GA4 Measurement ID | `on_page_lighthouse` → scripts | "Você tem GA4 mas não configurou conversões" |
| GTM Container | `on_page_lighthouse` → scripts | "Tem GTM mas não usa — está perdendo dados" |
| Facebook Pixel ID | `on_page_lighthouse` → scripts | "Não faz remarketing — perde 70% dos visitantes" |
| Event Tracking | Analytics API (requer acesso) | "Nenhum evento de conversão configurado" |
| UTM Hygiene | Lighthouse → links internos | "UTMs quebrados — atribuição cega" |
| Consent Mode | Lighthouse → CMP detection | "Sem consent mode — dados do GA4 incompletos" |
| Server-side Tracking | Não detectável client-side | "Tracking client-side apenas — perde ~15% dos dados" |
| Enhanced Ecommerce | dataLayer inspection | "Não rastreia funil de compra" |

**Ação:** Expandir Tier 3.1 de 1 sinal binário para 8 sinais granulares com pontuação diferenciada.

---

## 6. SEO Audit Completo (Corey) → Tier 1-2 Enriquecimento

### 6.1 Sinais Técnicos Adicionais (do skill `seo-audit`)

| Sinal Corey | Como Detectar | Tier | Pts |
|------------|--------------|------|-----|
| Sem HTTPS | Lighthouse | T1 (crítico) | 35 |
| Sem sitemap.xml | `on_page_lighthouse` | T2 | 15 |
| robots.txt bloqueando indexação | `on_page_lighthouse` | T1 | 35 |
| Sem canonical tags | `on_page_lighthouse` | T2 | 20 |
| Core Web Vitals ruins (LCP > 4s) | Lighthouse | T2 | 20 |
| CLS alto (> 0.25) | Lighthouse | T2 | 15 |
| Sem meta description | `on_page_lighthouse` | T3 | 8 |
| Duplicate title tags | Precisa crawler | T3 | 5 |
| Imagens sem alt text | Lighthouse | T3 | 5 |
| Imagens sem compressão | Lighthouse | T3 | 5 |
| H1 ausente ou múltiplo | `on_page_lighthouse` | T2 | 15 |
| Internal linking pobre (< 3 links internos) | Precisa crawler | T2 | 10 |
| URL structure ruim (parâmetros, uppercase) | `on_page_lighthouse` | T3 | 5 |
| Thin content (< 300 palavras) | `on_page_lighthouse` | T2 | 15 |
| Schema ausente | Lighthouse (JSON-LD) | T2 | 15 |

### 6.2 Sinais de Local Business (do skill `seo-audit`)

| Sinal | Relevância SMB |
|-------|---------------|
| NAP inconsistente (nome/endereço/telefone) | ⭐⭐⭐ GMB + site batendo |
| Sem Google Business Profile | ⭐⭐⭐ Detectável via GMB API |
| Sem local schema (LocalBusiness) | ⭐⭐ Já estamos no GMB |
| Sem location pages | ⭐⭐ Para negócios multi-unidade |
| Sem reviews no GMB | ⭐⭐⭐ Já temos rating/reviews |

---

## 7. CRO Framework (Corey) → Landing Pages + Diagnóstico

O skill `cro` do Corey define 7 dimensões de análise de conversão:

| Dimensão | Aplicação Adsentice |
|----------|-------------------|
| **1. Value Proposition Clarity** | Nosso Raio-X é claro em 5 segundos? "Como sua clínica aparece no Google." |
| **2. Headline Effectiveness** | Cada diagnóstico deve ter headline específica: "Dr. Silva, 3 problemas encontrados no seu GMB." |
| **3. CTA Hierarchy** | Primary CTA: "Falar com Especialista". Secondary: "Ver Relatório Completo." |
| **4. Visual Hierarchy** | Pain signals mais graves no topo do diagnóstico. |
| **5. Trust Signals** | "Baseado em dados do Google Meu Negócio" + logo Google + contador de clínicas analisadas. |
| **6. Objection Handling** | FAQ no relatório: "Quanto custa?", "Quanto tempo leva?", "Já contratei agência e não deu certo." |
| **7. Friction Points** | Raio-X não pode pedir cadastro. Resultado instantâneo = zero fricção. |

---

## 8. Priorização: O Que Fazer Primeiro

### Curto Prazo (Esta Semana — v0.2)

1. **Atualizar Pain Criteria v1.2** com:
   - Schwartz awareness levels no lugar de thresholds numéricos
   - 15 novos sinais do `seo-audit` (Corey) para Tier 1-2-3
   - 8 sinais granulares do `analytics` (Corey) substituindo `noAnalytics` binário
   - Sinais de Local Business (NAP consistency, local schema)

2. **Criar `docs/spec/adsentice-avatar-library.md`** com:
   - `avatar-extraction` (Kim) para cada categoria GMB (dentista, clínica estética, etc.)
   - Dores específicas, desejos, failed attempts, emotional drivers por avatar

3. **Refatorar Discovery UI** com:
   - Filtros alinhados aos Pain Criteria v1.2
   - Lógica invertida: detectar AUSÊNCIA (dor), não PRESENÇA
   - Score cumulativo como métrica de ordenação (não filtro binário)

### Médio Prazo (v0.3-v0.4)

4. **Implementar `on_page_lighthouse` enrichment** por lead com website
5. **Criar Skill `adsentice-campaign`** — orquestrador full-funnel (Kim)
6. **Landing pages programáticas** por categoria+cidade (Corey `programmatic-seo`)
7. **Lead detail page** como `performance-diagnosis` (Kim), não tabela de campos

### Longo Prazo (v0.5+)

8. **Integrar analytics tracking** (GA4/GTM detection) como parte do diagnóstico
9. **A/B testing framework** para landing pages programáticas
10. **Multi-touch attribution** para leads que convertem (Corey `revops`)

---

## 9. Anti-Patterns Identificados

| Anti-Pattern | Onde Acontece | Correção |
|-------------|---------------|----------|
| **Filtro binário para sinais de dor** | Discovery: `websiteOnly` = true exclui quem NÃO tem site (maior dor) | Inverter: detectar ausência |
| **Thresholds arbitrários sem teoria** | Pain Criteria: LEAD≥40, QUENTE≥55 | Substituir por Schwartz awareness levels |
| **Tier 3 mais rico que Tier 1** | 5 sinais Tier 3 implementados, 4/5 Tier 1 ausentes | Priorizar Tier 1-2 |
| **Modelo de score não aplicado** | Criteria define score mas Discovery não calcula | Calcular score na busca, ordenar por ele |
| **Vocabulário técnico sem tradução** | "noAnalytics", "cmsOutdated" | Traduzir para linguagem de dono de clínica: "Seu site não mede visitas" |

---

## 10. Referências

- **Corey Haines Marketing Skills:** `vendor/marketingskills/` — 43 skills, MIT license
- **Kim Barrett Advertising Skills:** `vendor/advertising-skills/` — 12 skills, MIT license
- **Pain Criteria v1:** `docs/spec/adsentice-pain-criteria-v1.md`
- **Discovery Engine:** `docs/spec/adsentice-discovery-engine.md`
- **Base Matriz:** `docs/spec/base-matriz-adsentice.md`

---

*Marketing Vocab v1.0 · 2026-07-12 · Fonte: 55 skills analisados (43 Corey + 12 Kim) — mapeados para 7 dimensões adsentice*
