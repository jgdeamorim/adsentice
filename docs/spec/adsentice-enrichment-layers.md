---
id: adsentice-enrichment-layers
title: "Ads​entice Enrichment Layers v2 — Anatomia Completa do Perfil GMB às 5 Camadas de Diagnóstico"
status: living
type: spec
version: "2.0.0"
date: 2026-07-12
supersedes: "v1.0.0 (enrichment layers inicial)"
sources:
  - EVO-API crates/evo-translator-dataforseo/src/business_profile_gmb.rs (27 campos canônicos)
  - EVO-API crates/evo-translator-dataforseo/src/business_listings_search.rs (11 campos search)
  - DataForSEO MCP (9 módulos, ~40 tools disponíveis)
  - docs/spec/adsentice-pain-criteria-v1.md (v1.2 Schwartz + ESC)
  - docs/spec/adsentice-marketing-vocab.md (Corey + Kim)
  - docs/spec/adsentice-esc-skills-analysis.md (gui.marketing)
---

# Enrichment Layers v2 — Anatomia Completa do Perfil GMB

> **Princípio:** Cada campo de um perfil GMB é uma janela para uma análise de marketing. A pergunta não é "quais dados temos?" — é **"qual diagnóstico de marketing cada campo habilita?"**. O GMB é o ponto de partida. Website, WhatsApp, Redes Sociais e Brand são as camadas de profundidade. Juntas, formam um diagnóstico 360° que nenhuma agência tradicional entrega por menos de R$2.000.

---

## 1. Anatomia Canônica do Perfil GMB (27 campos)

> **Fonte:** `evo-translator-dataforseo/src/business_profile_gmb.rs` — 27 campos extraídos via `business_data/google/my_business_info/live` ($0.0054/call)

### 1.1 Campos de Identidade (6)

| # | Campo | Tipo | Exemplo | Análises Habilitadas |
|---|-------|------|---------|---------------------|
| 1 | `title` | string | "Clínica Sorriso SP" | Consistência NAP (nome real vs nome fantasia), keyword no título (SEO local) |
| 2 | `category` | string? | "Dentist" | Categoria primária correta? Melhor categoria para o negócio? |
| 3 | `categories` | string[]? | ["Dentist", "Cosmetic dentist", "Dental clinic"] | Cobertura de categorias vs concorrentes. Categorias faltantes = tráfego perdido. |
| 4 | `additional_categories` | string[]? | ["Teeth whitening service"] | Categorias secundárias que expandem alcance sem canibalizar |
| 5 | `description` | string? | "Clínica odontológica especializada..." | Densidade de keywords, copywriting, call-to-action, extensão (<750 chars ideal) |
| 6 | `types` | string[]? | ["point_of_interest", "establishment", "health"] | Tipos Google — afetam quais SERP features o negócio aparece |

### 1.2 Campos de Localização (6)

| # | Campo | Tipo | Exemplo | Análises Habilitadas |
|---|-------|------|---------|---------------------|
| 7 | `address` | string? | "Rua Augusta, 1500" | Consistência NAP (nome+endereço+telefone iguais em todo lugar) |
| 8 | `city` | string? | "São Paulo" | Cobertura geográfica. Atende bairros adjacentes? |
| 9 | `district` | string? | "Consolação" | Segmentação por bairro para campanhas hiperlocais |
| 10 | `country_code` | string? | "BR" | Validação de mercado (BR = adsentice target) |
| 11 | `postal_code` | string? | "01310-000" | Consistência com website, landing pages locais |
| 12 | `location` (lat/lng) | f64? | -23.5505, -46.6333 | Cálculo de raio de atendimento, densidade competitiva, heatmap |

### 1.3 Campos de Reputação (5)

| # | Campo | Tipo | Exemplo | Análises Habilitadas |
|---|-------|------|---------|---------------------|
| 13 | `rating_value` | f64? | 4.2 | Score absoluto + benchmark vs concorrentes no mesmo raio |
| 14 | `rating_votes` | i64? | 34 | Volume de reviews. < 10 = amostra insuficiente. > 100 = negócio maduro. |
| 15 | `rating_distribution` | object? | {1:2, 2:3, 3:8, 4:15, 5:6} | **OURO**: distribuição revela padrão. Muitos 1★ = problema operacional. Muitos 5★ mas alguns 1★ = owner não responde. |
| 16 | `is_claimed` | bool? | false | **SINAL #1 DE DOR**: não reivindicado = não controla o próprio perfil |
| 17 | `place_id` + `cid` | string? | "ChIJ..." | Identificador único. Permite deep-link para Google Maps, buscar reviews individuais |

### 1.4 Campos de Engajamento (5)

| # | Campo | Tipo | Exemplo | Análises Habilitadas |
|---|-------|------|---------|---------------------|
| 18 | `phone` | string? | "+55 11 99999-0000" | Detecção WhatsApp (formato BR). Tipo de telefone (fixo vs celular vs 0800). |
| 19 | `website` | string? | "https://clinicax.com.br" | **PORTA PARA L1**. Tipo de site (WordPress, Wix, custom). Tem https? www vs non-www. |
| 20 | `main_image` | string? | "https://lh5...=s0" | Qualidade da imagem principal. Logotipo vs foto do negócio vs foto genérica. |
| 21 | `total_photos` | i64? | 8 | **SINAL DE ABANDONO**: < 10 fotos = perfil largado. Benchmark: 20+ para clínicas, 30+ para restaurantes. |
| 22 | `business_status` | string? | "OPERATIONAL" | Filtro anti-falso-positivo: CLOSED_TEMPORARILY = excluir, CLOSED_PERMANENTLY = excluir |

### 1.5 Campos de Experiência (3)

| # | Campo | Tipo | Exemplo | Análises Habilitadas |
|---|-------|------|---------|---------------------|
| 23 | `price_level` | i64? | 2 (0-4) | Segmentação por ticket. 0=grátis, 1=barato, 2=médio, 3=caro, 4=premium. Alinha com ICP. |
| 24 | `work_hours` | object? | {timetable: {...}} | Horário comercial preenchido? Aberto fins de semana? Atende feriados? |
| 25 | `popular_times` | object? | {monday: [{hour:12, occupancy:85}]} | **OURO**: pico de movimento → melhor horário para contato comercial. Se vazio = negócio sem movimento. |

### 1.6 Campos Derivados (não estão no GMB, calculamos nós)

| # | Campo | Como Calcular | Análise Habilitada |
|---|-------|--------------|-------------------|
| 26 | `whatsapp_detected` | Regex `(9\d{4}-\d{4}|9\d{8})` no phone + validação WA Business API | Canal #1 de venda BR. Se NÃO tem WhatsApp = -40% capacidade de venda. |
| 27 | `has_website` | `website != null` | Presença web. Se NÃO tem = 40pts Intent (maior sinal de dor). |
| 28 | `photos_per_rating` | total_photos / rating_votes | Fotos por review. < 0.5 = não investe em imagem. > 2.0 = negócio visualmente ativo. |
| 29 | `review_velocity` | Estimado: rating_votes / meses_desde_abertura (ou 12 meses default) | Reviews/mês. < 1/mês = estagnado. > 10/mês = alta atividade. |
| 30 | `category_coverage` | categories[] vs TOP 10 categorias do setor | % de categorias relevantes preenchidas. < 50% = tráfego perdido. |
| 31 | `description_quality` | length + keyword_density + has_cta + has_phone + has_link | Score 0-100 da qualidade da descrição |
| 32 | `nap_consistency_flag` | Precisa cruzar com website (L1) | Nome/endereço/telefone consistentes entre GMB e site? |

---

## 2. Diagnósticos por Campo — O Que Cada Sinal Realmente Significa

### 2.1 Rating e Reviews — Muito Além da Nota

```
⭐ RATING (valor absoluto)
  ≥ 4.5 → Excelente. Não é dor.
  4.0-4.4 → Bom. Melhorável.
  3.5-3.9 → Medíocre. Afasta clientes. DOR MODERADA.
  3.0-3.4 → Ruim. Perda mensurável de receita. DOR ALTA.
  < 3.0 → Tóxico. Lead URGENTE. Clientes fogem.

📊 RATING vs CONCORRENTES (benchmark competitivo)
  Rating 4.0 MAS concorrentes têm 4.5+ → DOR RELATIVA (perde cliente na comparação)
  Rating 3.8 MAS é o MELHOR do bairro → NÃO é dor (domina o mercado local)
  Rating 4.5 MAS 2 concorrentes têm 4.8 → DOR LEVE (quase lá, precisa de pouco)

📈 DISTRIBUIÇÃO (rating_distribution)
  Muitos 5★ + poucos 1★ → Padrão normal. Foco: aumentar volume.
  Muitos 5★ + MUITOS 1★ → Problema de consistência. Clientes extremos.
  Muitos 3★ + poucos 5★ → Produto/serviço mediano. Dor estrutural.
  Muitos 1★ SEM RESPOSTA → Owner ausente. DOR GRAVE. Lead urgente.
  Sem distribuição (objeto vazio) → Perfil novo ou sem reviews suficientes.

📉 REVIEW VELOCITY (reviews/mês)
  > 10/mês → Negócio ativo. Alta rotatividade de clientes.
  3-10/mês → Saudável. Ritmo constante.
  1-3/mês → Lento. Não pede review ativamente.
  < 1/mês → Estagnado. Possível abandono.
  0 nos últimos 60 dias → T1.3 (Negócio Estagnado). 30pts Intent.
```

### 2.2 Fotos — O Padrão Mínimo por Categoria

```
📸 TOTAL_PHOTOS — Benchmarks por Categoria

| Categoria          | Mínimo Aceitável | Bom    | Excelente |
|--------------------|:----------------:|:------:|:---------:|
| Dentista           | 15              | 30     | 50+       |
| Clínica Estética   | 20              | 40     | 70+       |
| Restaurante        | 25              | 50     | 100+      |
| Academia           | 20              | 40     | 80+       |
| Advogado           | 5               | 15     | 30+       |
| Barbearia          | 15              | 30     | 60+       |
| Farmácia           | 10              | 20     | 40+       |
| Veterinário        | 15              | 30     | 50+       |
| Imobiliária        | 20              | 50     | 100+      |
| Contador           | 5               | 10     | 20+       |

📷 TIPOS DE FOTO (análise qualitativa — requer L1 scraping)
  • Logo/perfil: identificação imediata da marca
  • Capa: primeira impressão no Google Maps
  • Interior: confiança ("quero ir num lugar assim")
  • Equipe: humanização do negócio
  • Produto/serviço: o que entregam
  • Antes/depois: PROVA VISUAL (ouro para estética, odontologia)
  • Vídeos: GMB aceita vídeos de até 30s. Negócios com vídeo têm 2x mais conversão.
  • Fotos 360°: tour virtual = diferencial competitivo enorme

⚠️ FOTOS vs CONCORRENTES
  Lead com 8 fotos num mercado onde concorrentes têm 30+ = PERFIL ABANDONADO
  Lead com 50 fotos vs concorrentes com 15 = DIFERENCIAL COMPETITIVO (não é dor)
```

### 2.3 WhatsApp — O Canal que Define Vendas no Brasil

```
📱 DETECÇÃO DE WHATSAPP

Nível 0 — Detecção pelo telefone GMB:
  Regex DDI 55 + DDD 11-99 + 9xxxx-xxxx → 95% de precisão
  Telefone fixo (começa com 2-6) → NÃO é WhatsApp → DOR (T2.4 = 15pts Engagement)
  Sem telefone nenhum → DOR GRAVE → +10pts Intent (R5 bonus)

Nível 1 — Validação WhatsApp Business API (requer L2):
  ✅ WhatsApp Business → perfil comercial, catálogo, mensagens automáticas
  ✅ WhatsApp pessoal → atende como pessoa física (clínica pequena)
  ❌ Não é WhatsApp → perde 80% dos clientes potenciais no BR
  ❌ Telefone inválido/não atende → DOR GRAVÍSSIMA

Nível 2 — Análise de Performance (requer acesso à API):
  ⏱️ Tempo de resposta: < 5 min (excelente) · < 1h (bom) · < 24h (aceitável) · > 24h (perde venda)
  📊 Taxa de resposta: % de mensagens respondidas
  🤖 Chatbot detectado? → mensagem automática de saudação
  📋 Catálogo WhatsApp: tem produtos/serviços listados?
  💬 Mensagem de ausência: configurada para fora do horário comercial?

💡 INSIGHT DE VENDA:
  "Dos 100 pacientes que tentam falar com você por mês, 80 chamam no WhatsApp.
   Você responde em média em 4 horas. Seus concorrentes respondem em 15 minutos.
   Isso significa que você perde ~60 pacientes por mês só pelo tempo de resposta."
```

### 2.4 Descrição e Categorias — SEO Local que Ninguém Faz

```
📝 DESCRIÇÃO DO GMB

Checklist de Qualidade (description_quality score 0-100):
  □ Tem keyword primária? (+20pts)
  □ Tem keyword de localização? (cidade/bairro) (+15pts)
  □ Tem CTA? ("Agende sua consulta", "Ligue agora") (+10pts)
  □ Tem telefone no texto? (+5pts)
  □ Tem link? (+5pts)
  □ Entre 500-750 caracteres? (+15pts — range ideal Google)
  □ Sem erros de português? (+10pts)
  □ Única (não copiada de template)? (+10pts)
  □ Atualizada nos últimos 6 meses? (+10pts)
  TOTAL: /100

  < 30 → DESCRIÇÃO LARGADA. Lead não investe 5 minutos em SEO básico.
  30-60 → MEDIANA. Tem informação mas não otimizada.
  60-80 → BOA. Pequenos ajustes trariam resultado.
  > 80 → EXCELENTE. Não é dor.

🏷️ CATEGORIAS

Análise competitiva de categorias:
  1. Extrair categories[] e additional_categories[] do lead
  2. Extrair categories[] dos TOP 5 concorrentes no raio
  3. Comparar: quais categorias os concorrentes usam que o lead NÃO usa?
  4. Output: "Você aparece em 3 categorias. Seus concorrentes aparecem em 7.
     Categorias faltantes: [x, y, z]. Isso representa ~40% de tráfego perdido."

Keywords na descrição:
  • Densidade: 1-2% de keyword primária (SEO local)
  • LSIs: keywords relacionadas que o Google espera ver
  • Intenção: a descrição responde o que o cliente busca?
```

### 2.5 Website — A Porta para Camada 1

```
🌐 WEBSITE_URL

Checklist de Extração:
  □ website existe?
    → SIM: disparar L1 (lighthouse + SEO audit + analytics detection)
    → NÃO: T1.5 · 40pts Intent · "Invisível online"

  □ Tipo de URL:
    → Domínio próprio (https://clinica.com.br) → profissional, analisar
    → Subdomínio Wix/WordPress (clinica.wixsite.com) → amador, DOR
    → Página do Facebook/Instagram como site → NÃO é website, DOR
    → Linktree/Redirect → NÃO é website, DOR
    → Google Sites → básico, DOR LEVE

  □ Tem HTTPS?
    → SIM: baseline esperado
    → NÃO: W1 · 20pts Intent · Risco de segurança REAL. Chrome mostra "Não seguro".

  □ Redireciona?
    → www → non-www ou vice-versa: normal
    → domain.com → instagram.com: NÃO é website, DOR
    → domain.com → linktree: DOR (não tem LP própria)
    → domain.com → 404/offline: DOR GRAVE (site quebrado)
```

---

## 3. Benchmarking Competitivo — O Contexto que Transforma Dado em Diagnóstico

> **Princípio:** Rating 4.0 não é bom nem ruim. Só é possível diagnosticar COMPARANDO com o mercado local.

### 3.1 Mapa Competitivo por Raio

```
Para cada lead, calcular contra os TOP 10 concorrentes no mesmo raio:

🏆 RANKING COMPETITIVO LOCAL:

| Métrica                   | Lead     | Média Mercado | Top 3 Concorrentes | Diagnóstico |
|---------------------------|----------|:-------------:|--------------------|-------------|
| Rating                    | 3.8      | 4.3           | 4.5, 4.4, 4.3      | 🔴 Abaixo da média |
| Reviews Totais            | 23       | 67            | 120, 89, 72         | 🔴 1/3 da média   |
| Reviews/mês (velocidade)  | 0.5      | 3.2           | 5.1, 4.0, 3.8      | 🔴 Estagnado      |
| Fotos                     | 8        | 28            | 45, 32, 30          | 🔴 Perfil largado |
| Categorias                | 2        | 5             | 7, 6, 6             | 🔴 -60% cobertura |
| Tem WhatsApp?             | ❌       | 80% SIM       | SIM, SIM, NÃO       | 🔴 Perde vendas   |
| Tem Website?              | ❌       | 60% SIM       | SIM, SIM, SIM       | 🔴 Invisível      |
| Reivindicado?             | ❌       | 90% SIM       | SIM, SIM, SIM       | 🔴 Não controla   |
| Descrição otimizada?      | 25/100   | 55/100        | 72, 65, 58          | 🔴 SEO ignorado   |

📊 OUTPUT PARA O DASHBOARD:
  "Sua clínica está em 8º lugar entre 10 concorrentes no raio de 3km.
   Você perde pacientes para 7 concorrentes que investem mais em presença digital."
```

### 3.2 O Que os Concorrentes Fazem que o Lead Não Faz

```
Análise de GAP competitivo (extraída da comparação com TOP 5):

| Prática                        | Concorrentes que fazem | Lead faz? | Impacto |
|--------------------------------|:----------------------:|:---------:|---------|
| Responde TODAS as reviews      | 4/5                    | ❌        | ALTO    |
| Posta fotos semanalmente       | 3/5                    | ❌        | MÉDIO   |
| Tem vídeos no perfil           | 2/5                    | ❌        | ALTO    |
| Usa Google Posts (oferta/evento)| 3/5                   | ❌        | ALTO    |
| Tem link de agendamento direto | 2/5                    | ❌        | MÉDIO   |
| Responde WhatsApp < 1h         | 4/5                    | ❌        | CRÍTICO |
| Tem site com HTTPS             | 5/5                    | ❌        | CRÍTICO |
| Tem landing page dedicada      | 3/5                    | ❌        | ALTO    |
| Aparece em 5+ categorias       | 4/5                    | ❌        | ALTO    |
| Descrição > 500 chars          | 4/5                    | ❌        | MÉDIO   |
```

---

## 4. Camadas de Enriquecimento — Detalhamento Completo

### 4.1 L0 · ATRAÇÃO GMB ($0.015/busca)

**Endpoint:** `business_data/business_listings/search/live`
**Campos retornados:** 11 (search) + 16 adicionais (profile individual)
**Custo total L0 completo:** $0.015 (busca) + $0.0054 (perfil individual) = **$0.0204/lead**

```
DADOS BRUTOS → ANÁLISES → DIAGNÓSTICOS → AÇÕES

title + address + city         → NAP Consistency Check
                               → "Seu endereço no GMB é diferente do site" (L1)
category + categories[]        → Category Coverage Score (0-100)
                               → "Você usa 2 de 7 categorias disponíveis"
rating_value                   → Rating absoluto + benchmark competitivo
rating_votes                   → Volume + review velocity
rating_distribution            → Padrão de reviews (muitos 1★? owner ausente?)
is_claimed                     → SINAL #1: não reivindicado = urgente
phone                          → WhatsApp detection + tipo de telefone
website                        → Gateway para L1
main_image                     → Qualidade da imagem principal
total_photos                   → Benchmark por categoria
description                    → SEO quality score (0-100)
business_status                → Filtro: OPERATIONAL apenas
price_level                    → Segmentação de ticket
work_hours                     → Horário preenchido? Aberto quando?
popular_times                  → Pico de movimento
location (lat/lng)             → Densidade competitiva no raio
place_id                       → Deep link Google Maps + reviews scraping
```

### 4.2 L1 · WEBSITE LIGHTHOUSE ($0.0001/lead)

**Endpoint:** `on_page/lighthouse` (DataForSEO)
**Dados extraídos:** 30+ sinais de SEO técnico, performance, analytics, CMS
**Custo:** $0.0001/lead

```
ANÁLISES DA CAMADA 1:

🏗️ INFRAESTRUTURA TÉCNICA
  □ HTTPS (sim/não) → W1. 20pts Intent se ausente
  □ www vs non-www → redirecionamento correto?
  □ Certificado SSL válido → data de expiração
  □ HSTS header → segurança avançada

⚡ PERFORMANCE (Core Web Vitals)
  □ LCP (Largest Contentful Paint): < 2.5s (bom) · 2.5-4s (melhorável) · > 4s (ruim)
  □ INP (Interaction to Next Paint): < 200ms (bom) · > 500ms (ruim)
  □ CLS (Cumulative Layout Shift): < 0.1 (bom) · > 0.25 (ruim)
  □ TTFB (Time to First Byte): < 800ms (bom) · > 1.8s (ruim)
  □ Mobile Performance Score: 0-100. < 40 = W3. 10pts Engagement
  □ Desktop Performance Score: 0-100

🔍 SEO ON-PAGE
  □ Title tag: presente? único? 50-60 chars? keyword no início?
  □ Meta description: presente? único? 150-160 chars? CTA?
  □ H1: presente? único? contém keyword?
  □ H2-H6: hierarquia lógica?
  □ Imagens: alt text? compressão? WebP? lazy loading?
  □ URL structure: legível? keywords? sem parâmetros?
  □ Canonical: presente? self-referencing?
  □ Robots.txt: existe? bloqueando algo indevido?
  □ Sitemap.xml: existe? atualizado?
  □ Schema markup (JSON-LD): LocalBusiness? Organization?
  □ Open Graph / Twitter Cards: redes sociais?
  □ Hreflang: multi-idioma? (raro em SMB BR)

📊 ANALYTICS DETECTION
  □ GA4: measurement ID detectado?
  □ GTM: container detectado?
  □ Facebook Pixel: ID detectado?
  □ LinkedIn Insight Tag?
  □ TikTok Pixel?
  □ Hotjar / Clarity (heatmaps)?
  □ NENHUM analytics → W5. 10pts Engagement

🔧 CMS DETECTION
  □ WordPress → versão? atualizado? plugins?
  □ Wix / Squarespace → limitações de SEO
  □ React / Next.js / Vue → site moderno ou SPA sem SSR?
  □ HTML puro → amador ou feito por agência?
  □ Construtor genérico → performance geralmente ruim

🔗 LINKS SOCIAIS (extraídos do HTML)
  □ Instagram → handle → gateway L2
  □ Facebook → página
  □ LinkedIn → perfil empresa
  □ YouTube → canal
  □ TikTok → perfil
  □ WhatsApp → link direto (wa.me/)
  □ Twitter/X → perfil
```

### 4.3 L2 · SOCIAL MEDIA ($0.0005/lead)

**Ferramentas:** firecrawl (scraping) + APIs gratuitas (Meta Graph, Instagram Basic)
**Custo:** $0.0005/lead

```
ANÁLISES DA CAMADA 2:

📷 INSTAGRAM
  □ Seguidores: volume absoluto + benchmark por categoria
  □ Posts/mês: frequência. < 4/mês = baixa. > 12/mês = ativa.
  □ Engagement rate: (curtidas+comentários)/seguidores. < 1% = baixo. 3-5% = bom.
  □ Tipo de conteúdo: feed vs stories vs reels (reels têm 2x mais alcance)
  □ Bio: tem link? tem CTA? tem WhatsApp? tem endereço?
  □ Destaques: organizados? categorias de serviços?
  □ Verificado? (selo azul)
  □ Seguindo/Seguidores ratio: > 2 = não segue back (conta pessoal, não comercial)
  □ Comentários respondidos? engajamento com seguidores

📘 FACEBOOK
  □ Page likes
  □ Posts/mês
  □ Reviews no Facebook (separado do GMB)
  □ Ads ativos? (via Ad Library)
  □ Info da página: completa?
  □ Verificado?

🎵 TIKTOK
  □ Perfil encontrado?
  □ Seguidores
  □ Vídeos/mês
  □ Visualizações médias

💼 LINKEDIN (B2B)
  □ Página da empresa
  □ Seguidores
  □ Posts/mês
  □ Funcionários listados (porte da empresa)

📊 SOCIAL SCORE (0-100 composto)
  = (Instagram × 0.40) + (Facebook × 0.25) + (TikTok × 0.15) + (LinkedIn × 0.10) + (YouTube × 0.10)
```

### 4.4 L3 · BRAND & MARKET ($0.03/lead)

**Módulos DataForSEO:** `kw_data_google_ads_search_volume` + `dataforseo_labs_google_domain_rank_overview` + `backlinks_summary` + `ai_optimization_llm_ment_search`
**Custo:** $0.03/lead (4 chamadas combinadas)

```
ANÁLISES DA CAMADA 3:

🔍 BRANDED SEARCH (kw_data)
  □ "nome da clínica" → volume de busca mensal
  □ "nome da clínica + cidade" → volume
  □ "nome do dentista/dono" → volume (marca pessoal)
  □ 0-10 buscas/mês → INVISÍVEL. Ninguém pesquisa o nome.
  □ 100-1000 buscas/mês → Marca conhecida localmente
  □ 1000+ buscas/mês → Marca estabelecida

🏢 DOMAIN AUTHORITY (domain_rank_overview + backlinks)
  □ Domain Rank (0-1000)
  □ Referring Domains: quantos sites linkam?
  □ Backlinks totais
  □ Backlinks .br vs .com vs outros
  □ Qualidade dos backlinks (spam score)
  □ Competitors compartilhando backlinks

🥊 SHARE OF VOICE (SOV)
  □ SOV do lead vs TOP 5 concorrentes
  □ Keywords que o lead rankeia vs concorrentes
  □ Keyword gap: keywords que concorrentes rankeiam e lead NÃO
  □ Posição média no Google para keywords relevantes

🤖 AI MENTIONS (ai_optimization)
  □ ChatGPT já mencionou esta clínica?
  □ Google AI Overview já referenciou?
  □ Em quais queries de IA o concorrente aparece?
  □ Oportunidade: otimizar para AI search (AEO/GEO)

📊 BRAND MATURITY SCORE (0-100)
  Baseado nos 10 indicadores do ESC brandformance-planner:
  1. Branded search volume (0-10)
  2. % tráfego direto (GA4 — precisa acesso)
  3. % orgânico branded (GSC — precisa acesso)
  4. SOV — Share of Voice (0-10)
  5. NPS/Reviews (0-10)
  6. % leads por indicação (0-10)
  7. CAC trend (0-10)
  8. Reconhecimento espontâneo (0-10)
  9. Menções sociais sem tag (0-10)
  10. Distinctive Brand Assets (0-10)
```

### 4.5 L4 · DIAGNÓSTICO LLM ($0.02/lead)

**Modelo:** DeepSeek V4 (árbitro cost-capped)
**Input:** Dados agregados L0-L3 (~2K tokens de contexto)
**Custo:** $0.02/lead

```
OUTPUTS DA CAMADA 4:

📋 DIAGNÓSTICO COMPLETO
  • Top 5 Dores (ordenadas por impacto financeiro estimado)
  • Score Composto Final (Fit/Engagement/Intent com confiança)
  • Maturidade Digital 0-100
  • Nível Schwartz (Unaware → Most Aware)

🗺️ PLANO 7/30/90 DIAS
  • 7 dias: quick wins (reivindicar GMB, corrigir HTTPS, responder reviews)
  • 30 dias: otimizações (setup GA4, melhorar descrição, postar fotos)
  • 90 dias: estratégia (SEO local, conteúdo, social media, branded search)

💰 PROJEÇÃO DE ROI
  • Tráfego estimado adicional com otimizações
  • Conversões estimadas (agendamentos)
  • Ticket médio da categoria
  • Receita projetada em 3/6/12 meses
  • Payback do investimento

📞 SCRIPT DE ABORDAGEM COMERCIAL
  • Personalizado por categoria, cidade e dores detectadas
  • Inclui dados REAIS do GMB do lead
  • Inclui comparação com concorrentes
  • Call-to-action específico por nível Schwartz

📄 PROPOSTA COMERCIAL (PDF)
  • Diagnóstico resumido (1 página)
  • Plano de ação (1 página)
  • Investimento (1 página)
  • Cases similares (1 página)
```

---

## 5. Cost Breakdown Real (L0 → L4)

| Camada | Endpoint/Método | Custo Unitário | × Leads SP Dentistas (5,761) | Custo Total |
|--------|-----------------|:-------------:|:----------------------------:|:-----------:|
| **L0** | business_listings_search | $0.015 | 1 (busca única) | $0.015 |
| **L0** | my_business_info (per lead) | $0.0054 | 50 (top 50) | $0.27 |
| **L1** | on_page_lighthouse | $0.0001 | ~2,304 (40% têm site) | $0.23 |
| **L2** | firecrawl + APIs | $0.0005 | ~1,200 (estimado) | $0.60 |
| **L3** | 4 módulos DataForSEO | $0.03 | ~200 (top leads) | $6.00 |
| **L4** | DeepSeek síntese | $0.02 | ~200 (top leads) | $4.00 |
| **TOTAL** | | | | **$11.13** |

> **Custo por lead full-enriched: $0.07. Receita potencial: R$149K/mês. ROI: 2,400×.**

---

## 6. Sinais de Dor por Camada — Matriz Completa (35+ sinais)

| # | Sinal | Camada | Dimensão | Pts | Gatilho |
|---|-------|:------:|----------|:---:|---------|
| **FIT (10 sinais, peso 0.40)** | | | | | |
| F1 | Categoria no ICP | L0 | Fit | 15 | category ∈ 57 categorias BR |
| F2 | Porte (reviews ≥ 10) | L0 | Fit | 10 | rating_votes ≥ 10 |
| F3 | Tem website | L0 | Fit | 10 | website ≠ null |
| F4 | Tem telefone | L0 | Fit | 5 | phone ≠ null |
| F5 | Região mapeada | L0 | Fit | 5 | city ∈ 22 estados BR |
| F6 | Horário preenchido | L0 | Fit | 5 | work_hours ≠ null |
| F7 | Descrição preenchida | L0 | Fit | 5 | description ≠ null |
| F8 | Serviços listados | L0 | Fit | 5 | categories[] length ≥ 2 |
| F9 | Email corporativo | L0 | Fit | 5 | website é domínio próprio |
| F10 | CNPJ/negócio ativo | L0 | Fit | 5 | business_status = "OPERATIONAL" |
| **ENGAGEMENT (14 sinais, peso 0.35)** | | | | | |
| E1 | Rating ≥ 4.0 | L0 | Engagement | 15 | rating_value ≥ 4.0 |
| E2 | Reviews recentes | L0 | Engagement | 15 | review_velocity > 0 em 60d |
| E3 | Fotos ≥ benchmark | L0 | Engagement | 10 | total_photos ≥ mínimo por categoria |
| E4 | Responde reviews | L0 | Engagement | 10 | rating_distribution com padrão de resposta |
| E5 | WhatsApp business | L0 | Engagement | 10 | whatsapp_detected = true |
| E6 | Posts no GMB | L0 | Engagement | 5 | Google Posts detectados |
| E7 | Q&A ativo | L0 | Engagement | 5 | Q&A section com respostas |
| W1 | HTTPS presente | L1 | Engagement | 10 | lighthouse: HTTPS ok |
| W2 | Core Web Vitals ok | L1 | Engagement | 10 | LCP < 2.5s E CLS < 0.1 |
| W3 | Mobile score ≥ 40 | L1 | Engagement | 10 | lighthouse: mobile ≥ 40 |
| W4 | Meta tags ok | L1 | Engagement | 8 | title + description presentes |
| W5 | Analytics presente | L1 | Engagement | 10 | GA4/GTM/Pixel detectado |
| W6 | CMS atualizado | L1 | Engagement | 5 | WordPress sem updates > 6m? |
| W7 | Schema markup | L1 | Engagement | 5 | JSON-LD LocalBusiness detectado |
| **INTENT (4 sinais, peso 0.25)** | | | | | |
| I1 | NÃO reivindicado | L0 | Intent | 25 | is_claimed = false |
| I2 | Rating baixo | L0 | Intent | 20 | rating_value ≤ 3.5 E votes ≥ 5 |
| I3 | Perfil abandonado | L0 | Intent | 15 | total_photos < 3 OU velocity = 0 |
| W8 | SEM HTTPS | L1 | Intent | 20 | lighthouse: HTTP apenas |
| **SOCIAL (4 sinais, peso incorporado ao Engagement)** | | | | | |
| S1 | Instagram ativo | L2 | Engagement | 10 | posts/mês ≥ 4 |
| S2 | Engajamento saudável | L2 | Engagement | 8 | engagement rate ≥ 2% |
| S3 | Facebook ativo | L2 | Engagement | 5 | posts/mês ≥ 2 |
| S4 | TikTok/Reels presente | L2 | Engagement | 5 | perfil encontrado |
| **BRAND (3 sinais, peso incorporado ao Fit e Intent)** | | | | | |
| B1 | Branded search > 0 | L3 | Fit | 10 | search volume > 10/mês |
| B2 | Domain authority | L3 | Fit | 8 | referring domains > 5 |
| B3 | Pressão competitiva | L3 | Intent | 15 | ≥ 3 concorrentes melhores no raio |

---

## 7. Produtos por Camada — O Que Vendemos e Quando

| # | Produto | Preço | Camada | Gatilho de Venda |
|---|---------|-------|:------:|-----------------|
| 1 | **Raio-X** (diagnóstico gratuito) | R$0 | L0 | Todo lead recebe. Porta de entrada. |
| 2 | **Auditoria de Site** (PDF 30+ checks) | R$47 | L1 | website detectado + SEO score < 60 |
| 3 | **Social Media Kit** (templates+calendário) | R$47 | L2 | Instagram followers > 100 mas engagement < 2% |
| 4 | **Setup Tracking** (GA4+GTM+Pixel) | R$47 | L1 | website SEM analytics detection |
| 5 | **SEO Local** (otimização contínua) | R$197/mês | L1 | SEO score < 40 + branded search = 0 |
| 6 | **Sentinela** (monitoramento 24/7) | R$197/mês | L0-L2 | Score composto > 50 + NÃO reivindicado |
| 7 | **Gestão de Redes** (posts+stories) | R$197/mês | L2 | Social score < 40 + concorrente tem 3× mais |
| 8 | **Brandformance** (mix brand+performance) | R$497/mês | L3 | Brand maturity < 30 + SOV < 5% |
| 9 | **Domínio** (full stack) | R$497/mês | L0-L4 | Score > 70 + múltiplas dores em L1/L2/L3 |
| 10 | **Consultoria** (diagnóstico completo) | ticket (R$500-2K) | L4 | Lead Most Aware + múltiplas camadas com dor |

---

## 8. Exemplo Real: Jornada Completa de uma Clínica

```
╔══════════════════════════════════════════════════════════════════════╗
║ L0 · GMB — "Clínica OdontoVita" · São Paulo · Jardins              ║
║ ════════════════════════════════════                                ║
║ title: "Clínica OdontoVita"                                        ║
║ category: "Dentist"                                                ║
║ categories: ["Dentist", "Cosmetic dentist"]  ← apenas 2 de 7!      ║
║ address: "Rua Oscar Freire, 900"                                   ║
║ phone: "+55 11 99999-8888"                                         ║
║ rating_value: 4.1 · rating_votes: 47                               ║
║ rating_distribution: {1:3, 2:2, 3:8, 4:14, 5:20}                  ║
║ is_claimed: TRUE                                                   ║
║ website: "https://odontovita.com.br" ← DOMÍNIO PRÓPRIO!            ║
║ total_photos: 12  ← BAIXO (benchmark dentista: 15 mínimo)          ║
║ description: "Clínica odontológica. Atendemos convênios." ← FRACO  ║
║ phone: celular DDD 11 → WhatsApp PROVÁVEL                         ║
║ business_status: "OPERATIONAL"                                     ║
║ work_hours: preenchido (seg-sex 8h-18h, sáb 8h-12h)                ║
║ popular_times: {pico 10h-12h, 14h-16h}                             ║
║                                                                     ║
║ CONCORRENTES NO RAIO 3KM (TOP 5):                                   ║
║ 1. "Clínica Odonto Prime" · 4.8★ · 230 reviews · 45 fotos · 6 cat ║
║ 2. "Instituto Sorriso"    · 4.6★ · 180 reviews · 60 fotos · 7 cat ║
║ 3. "Dentista Jardins"     · 4.5★ · 95 reviews  · 30 fotos · 5 cat ║
║ 4. "Oral Clinic SP"       · 4.3★ · 67 reviews  · 25 fotos · 4 cat ║
║ 5. "OdontoVita" ← LEAD   · 4.1★ · 47 reviews  · 12 fotos · 2 cat ║
║                                                                     ║
║ DIAGNÓSTICO L0:                                                     ║
║ ✅ Reivindicado (bom)                                              ║
║ ✅ Tem website domínio próprio                                     ║
║ ✅ Tem WhatsApp (provável)                                         ║
║ 🔴 5º lugar entre 5 concorrentes no raio                           ║
║ 🔴 2 de 7 categorias (concorrentes usam 5-7)                       ║
║ 🔴 12 fotos (mínimo aceitável = 15)                                ║
║ 🔴 Descrição fraca (25/100) — sem keywords, sem CTA                ║
║ 🔴 3 reviews 1★ sem resposta visível                               ║
║                                                                     ║
║ SCORE L0: 36 (Problem Aware) · CONFIANÇA: ⭐⭐⭐                     ║
║ AÇÃO: Raio-X gratuito → "Sua clínica está em 5º entre 5 no Google" ║
╚══════════════════════════════════════════════════════════════════════╝
         │
         ▼ website detectado → L1
╔══════════════════════════════════════════════════════════════════════╗
║ L1 · WEBSITE LIGHTHOUSE ($0.0001)                                   ║
║ ════════════════════════════════                                    ║
║ URL: https://odontovita.com.br                                      ║
║ HTTPS: ✅ (válido até 12/2026)                                      ║
║                                                                     ║
║ PERFORMANCE:                                                         ║
║   LCP: 5.8s 🔴 (meta < 2.5s)                                       ║
║   CLS: 0.35 🔴 (meta < 0.1)                                        ║
║   Mobile Score: 28/100 🔴 (meta ≥ 40)                               ║
║   TTFB: 2.1s 🔴                                                     ║
║                                                                     ║
║ SEO ON-PAGE:                                                         ║
║   Title: "Clínica OdontoVita" ✅ (mas sem keyword de localização)   ║
║   Meta description: AUSENTE 🔴                                      ║
║   H1: presente ✅                                                   ║
║   Imagens: 8 imagens, 0 com alt text 🔴                             ║
║   Canonical: ✅ (self-referencing)                                  ║
║   Robots.txt: ✅                                                    ║
║   Sitemap: AUSENTE 🔴                                               ║
║   Schema (JSON-LD): AUSENTE 🔴                                      ║
║                                                                     ║
║ ANALYTICS:                                                           ║
║   GA4: AUSENTE 🔴                                                   ║
║   GTM: AUSENTE 🔴                                                   ║
║   Facebook Pixel: AUSENTE 🔴                                        ║
║                                                                     ║
║ CMS: WordPress 6.2 (atualizado) ✅                                   ║
║                                                                     ║
║ LINKS SOCIAIS:                                                       ║
║   Instagram: @odontovita → 1.247 seguidores → GATEWAY L2            ║
║   Facebook: fb.com/odontovita → GATEWAY L2                          ║
║                                                                     ║
║ SCORE L0+L1: 52 (Solution Aware) · CONFIANÇA: ⭐⭐⭐⭐                ║
║ DORES NOVAS: SEM analytics + mobile 28/100 + sem sitemap + sem      ║
║              schema + sem meta description + imagens sem alt text    ║
║ AÇÃO: Upsell Auditoria de Site (R$47) + Setup Tracking (R$47)       ║
╚══════════════════════════════════════════════════════════════════════╝
         │
         ▼ Instagram detectado → L2
╔══════════════════════════════════════════════════════════════════════╗
║ L2 · SOCIAL MEDIA ($0.0005)                                         ║
║ ════════════════════════                                            ║
║ INSTAGRAM @odontovita:                                               ║
║   Seguidores: 1.247                                                 ║
║   Posts/mês: 2.1 🔴 (benchmark: 4+)                                 ║
║   Engagement: 0.9% 🔴 (benchmark: 3-5%)                             ║
║   Reels: 0 nos últimos 30 dias 🔴                                   ║
║   Stories: 3/semana (baixo)                                         ║
║   Bio: "Clínica odontológica" ← sem CTA, sem WhatsApp, sem link     ║
║   Destaques: 2 (desorganizados)                                     ║
║   Responde comentários: NÃO 🔴                                      ║
║                                                                     ║
║ FACEBOOK:                                                            ║
║   Página: 890 likes                                                 ║
║   Último post: dezembro/2025 (7 meses!) 🔴                          ║
║                                                                     ║
║ TIKTOK: NÃO encontrado 🔴                                           ║
║                                                                     ║
║ CONCORRENTE PRINCIPAL (@odontoprime):                                ║
║   Seguidores: 4.8K (4× mais)                                        ║
║   Posts/mês: 12                                                     ║
║   Engagement: 4.2%                                                  ║
║   Reels: 4/mês com 2K+ views cada                                   ║
║                                                                     ║
║ SCORE L0+L1+L2: 49 (Problem Aware) · CONFIANÇA: ⭐⭐⭐⭐⭐              ║
║ NOTA: Score CAIU (52→49). Social FRACO revela abandono de canais.   ║
║ AÇÃO: Upsell Social Kit (R$47) + Gestão de Redes (R$197/mês)        ║
╚══════════════════════════════════════════════════════════════════════╝
         │
         ▼ Presença digital mapeada → L3
╔══════════════════════════════════════════════════════════════════════╗
║ L3 · BRAND & MARKET ($0.03)                                         ║
║ ═══════════════════════                                             ║
║ BRANDED SEARCH:                                                      ║
║   "odontovita" → 0-10/mês 🔴 (ninguém pesquisa o nome)              ║
║   "odontovita jardins" → 0/mês 🔴                                   ║
║   Concorrente "odonto prime" → 210/mês                              ║
║                                                                     ║
║ DOMAIN:                                                              ║
║   Rank: 12/1000 (muito baixo) 🔴                                    ║
║   Referring domains: 3 (todos diretórios) 🔴                         ║
║   Backlinks: 7 (todos nofollow) 🔴                                  ║
║                                                                     ║
║ SOV (Share of Voice):                                                ║
║   OdontoVita: 3% 🔴                                                 ║
║   Odonto Prime: 42%                                                 ║
║   Instituto Sorriso: 28%                                            ║
║   Dentista Jardins: 18%                                             ║
║   Oral Clinic: 9%                                                   ║
║                                                                     ║
║ AI MENTIONS:                                                         ║
║   ChatGPT: 0 menções 🔴                                             ║
║   Google AI Overview: 0 menções 🔴                                  ║
║   Concorrente citado em "melhor dentista jardins": SIM ✅           ║
║                                                                     ║
║ BRAND MATURITY: 22/100 🔴 (ESC scale: Nível 1 — Iniciante)          ║
║                                                                     ║
║ SCORE FINAL (L0-L3): 45 (Problem Aware) · CONFIANÇA: ⭐⭐⭐⭐⭐        ║
║ AÇÃO: Upsell Brandformance (R$497/mês) em 90 dias                   ║
╚══════════════════════════════════════════════════════════════════════╝
         │
         ▼ Full data → L4
╔══════════════════════════════════════════════════════════════════════╗
║ L4 · DIAGNÓSTICO FINAL (DeepSeek · $0.02)                           ║
║ ════════════════════════════════════                                ║
║ VEREDITO: LEAD QUENTE — dores acumuladas em TODAS as camadas        ║
║                                                                     ║
║ TOP 5 DORES (ordenadas por impacto financeiro):                      ║
║ 1. NINGUÉM pesquisa "odontovita" no Google → 0 branded search       ║
║ 2. Site mobile 28/100 → 70% dos pacientes usam celular              ║
║ 3. 2 de 7 categorias → perdendo ~60% do tráfego possível            ║
║ 4. Sem analytics → decisões no escuro, não sabe quantos visitam     ║
║ 5. Instagram parado (2 posts/mês) vs concorrente (12 posts/mês)     ║
║                                                                     ║
║ PLANO 7/30/90:                                                      ║
║ 7d:  □ Adicionar 5 categorias faltantes (grátis, 5 min)            ║
║      □ Responder as 3 reviews 1★ com pedido de desculpas            ║
║      □ Subir 10 fotos novas (interior, equipe, antes/depois)        ║
║ 30d: □ Instalar GA4 + GTM + Pixel (Setup Tracking R$47)             ║
║      □ Otimizar meta description + alt text + sitemap               ║
║      □ Criar 3 reels/semana no Instagram (Social Kit R$47)          ║
║ 90d: □ Estratégia de SEO Local (R$197/mês)                          ║
║      □ Campanha de branded search (Google Ads)                      ║
║      □ Brandformance completo (R$497/mês)                           ║
║                                                                     ║
║ PROJEÇÃO DE ROI (12 meses):                                          ║
║   Investimento: R$47 + R$47 + R$197/mês × 12 = R$2,458             ║
║   Tráfego adicional estimado: +120 visitas/mês                      ║
║   Conversão estimada (3%): +3.6 pacientes/mês                       ║
║   Ticket médio dentista SP: R$300                                   ║
║   Receita adicional: R$1,080/mês × 12 = R$12,960/ano                ║
║   ROI: 427% no primeiro ano                                         ║
║                                                                     ║
║ SCRIPT ABORDAGEM:                                                    ║
║ "Dr., fizemos uma análise completa da presença digital da sua       ║
║  clínica. O resultado é preocupante:                                 ║
║                                                                     ║
║  1. O Sr. está em 5º lugar entre 5 clínicas no Google.              ║
║  2. NINGUÉM pesquisa 'OdontoVita' no Google — zero buscas/mês.      ║
║  3. Seu site é tão lento no celular que 70% dos pacientes desistem. ║
║  4. O Sr. usa apenas 2 de 7 categorias disponíveis no Google.       ║
║  5. Seu Instagram tem 1.2K seguidores mas quase zero engajamento.   ║
║                                                                     ║
║  Seu principal concorrente, Odonto Prime, tem 4× mais seguidores,   ║
║  5× mais avaliações, e 210 pessoas pesquisam o nome deles TODO MÊS. ║
║                                                                     ║
║  A boa notícia: 80% desses problemas têm solução em 7 dias.         ║
║  Quer que eu te mostre como?"                                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 9. Métricas de Sucesso por Camada (Projeção SP — Dentistas)

| Métrica | L0 | +L1 | +L2 | +L3 | +L4 |
|---------|:--:|:---:|:---:|:---:|:---:|
| Leads no raio 10km | 5,761 | — | — | — | — |
| % que recebem Raio-X (gratuito) | 100% | — | — | — | — |
| % com website (dispara L1) | 40% | 2,304 | — | — | — |
| % com social detectável (dispara L2) | — | — | 1,200 | — | — |
| % que justificam L3 (score > 50) | — | — | — | 200 | — |
| Conversão Raio-X → Auditoria (R$47) | — | 15% | — | — | — |
| Conversão Auditoria → Sentinela (R$197) | — | — | 10% | — | — |
| Conversão Sentinela → Brandformance (R$497) | — | — | — | 8% | — |
| Receita potencial/mês | R$0 | R$16,243 | R$24,365 | R$7,952 | — |
| **Receita total projetada/mês** | | | | | **R$48,560** |

---

## 10. Roadmap de Implementação

### Fase 1 · v0.2 (AGORA) — L0 completo + L1 wire
- [x] L0: GMB Discovery (27 campos canônicos)
- [x] Score Composto v1.2 (Fit/Engagement/Intent)
- [x] Benchmarking competitivo no raio (TOP 5 concorrentes)
- [x] Análise de categorias faltantes vs concorrentes
- [x] WhatsApp detection via regex phone
- [ ] L1: `on_page_lighthouse` wire REAL
- [ ] 8 sinais W1-W8 calculados de dados REAIS
- [ ] Media benchmarks por categoria (fotos, reviews, rating)
- [ ] Ordenação por Score Composto no Discovery

### Fase 2 · v0.3 — L1 completo + Raio-X
- [ ] L1: SEO score 0-100 (Corey seo-audit adaptado)
- [ ] Analytics detection: GA4, GTM, Pixel, GTM
- [ ] CMS detection + version + risk assessment
- [ ] Social links extraction do HTML
- [ ] Raio-X: PDF 1 página com dados GMB + Website + Concorrentes
- [ ] Auditoria de Site (R$47) — produto funcional

### Fase 3 · v0.4 — L2 + Sentinela
- [ ] Instagram scraping (firecrawl)
- [ ] Facebook detection
- [ ] Social Score (0-100 composto)
- [ ] Sentinela (R$197/mês) — monitoramento GMB
- [ ] Social Kit (R$47) — templates + calendário

### Fase 4 · v0.5 — L3 + Brandformance
- [ ] Branded search volume (DataForSEO kw_data)
- [ ] Domain authority + backlinks
- [ ] SOV (Share of Voice) no raio
- [ ] Brand Maturity Score 0-100 (ESC scale)
- [ ] Brandformance (R$497/mês)

### Fase 5 · v0.6 — L4 + Domínio
- [ ] Diagnóstico LLM (DeepSeek)
- [ ] Plano 7/30/90 automático
- [ ] Script de abordagem comercial
- [ ] Projeção de ROI por lead
- [ ] Domínio (R$497/mês) + Consultoria (ticket)

---

*Enrichment Layers v2.0 · 2026-07-12 · 27 campos canônicos GMB · 35+ sinais de dor · 10 produtos · Benchmarking competitivo por raio · WhatsApp/Website/Social/Brand analysis*
