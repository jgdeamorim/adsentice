---
id: adsentice-strategic-plan
title: "Ads​entice Strategic Plan — Aplicando nossa própria inteligência ao nosso negócio"
status: living
type: strategy
version: "2.0.0"
date: 2026-07-13
sources:
  - Supabase discovery_listings (100 leads, SP+RJ)
  - ADR-0008 (EVO-API L0-L4)
  - ADR-0009 (Market Intelligence Engine)
  - ADR-0010 (Cloudflare Enterprise)
  - ADR-0011 (Brain OODA)
  - ADR-0012 (Category Strategy Matrix)
  - 14 skills Corey Haines implementados
  - 47 skills Corey Haines ingeridos no KG
  - marketingskills-main (Corey Haines)
  - advertising-skills (Kim Barrett)
  - Sugestão para análise para soluções adicionais.txt
  - EVO-API Founder-Panel-Copilot-Rail-Wave-K
  - adsentice-category-strategy-matrix.md
---

# Adsentice Strategic Plan — Do Diagnóstico à Receita

> **Princípio:** Construímos um motor que gera inteligência de mercado para SMBs. Agora aplicamos esse motor ao **nosso próprio negócio** — usando os mesmos dados, as mesmas métricas e as mesmas skills de marketing que oferecemos aos clientes.

---

## 1. O MERCADO QUE ESTAMOS ATACANDO (dados reais do Supabase)

### 1.1 Realidade do pipeline hoje

| Métrica | Valor | Significado estratégico |
|---------|:-----:|------------------------|
| Leads únicos enriquecidos | **100** | SP+RJ, majoritariamente dentistas |
| Score médio do mercado | **36/100** | Mercado está PROBLEM AWARE — sente dor mas não conhece solução |
| Problem Aware | **63%** | Sabem que têm problema (poucos pacientes) mas não sabem resolver |
| Unaware | **25%** | Não sabem que marketing digital existe para eles |
| Solution Aware | **12%** | Já ouviram falar de SEO/Google Ads — são os mais fáceis de converter |
| Product/Most Aware | **0%** | **Ninguém conhece adsentice ainda** |
| Com website próprio | **26%** | 74% não tem presença web profissional |
| Perfil GMB reivindicado | **64%** | 36% nem controla o próprio perfil no Google |
| Fotos médias no GMB | **13** | Abaixo do benchmark mínimo de 15 (dentista) |

### 1.2 O que esses dados nos dizem

**NÃO estamos competindo com ninguém.** O mercado não conhece adsentice, não conhece soluções de SEO local, e 74% nem website tem. O concorrente não é outra ferramenta — é a **inércia** e o **desconhecimento**.

**O timing é perfeito para educar.** Com 63% Problem Aware + 25% Unaware = 88% do mercado precisa de CONTEÚDO EDUCATIVO antes de comprar. Ninguém vai pesquisar "adsentice" — vão pesquisar "como conseguir mais pacientes".

---

## 2. ESTRATÉGIA DE GO-TO-MARKET

### 2.1 Nicho Primário: Dentistas (validado por dados)

**Por que dentistas:**
- 79 dos 100 leads são dentistas (domínio natural do pipeline)
- Score médio 36/100 — dor real, mensurável
- Ticket alto: R$150-500/consulta, R$3K-15K ortodontia
- Urgência: paciente com dor = busca imediata no Google
- Benchmark: dentista gasta R$500-2.000/mês em Google Ads sem saber se funciona

### 2.2 Segmentação por Schwartz (nossos próprios dados)

| Nível | % Mercado | Estratégia adsentice | Canal | Oferta |
|:-----:|:---------:|---------------------|-------|--------|
| **Unaware** (25%) | Não sabe que tem problema | **Conteúdo educativo gratuito** — blog, Instagram, YouTube | Google busca orgânica | "7 sinais que sua clínica está invisível no Google" |
| **Problem Aware** (63%) | Sabe que tem poucos pacientes, não sabe resolver | **Agitar a dor + Raio-X gratuito** | WhatsApp + Google Maps | "Cole sua URL e veja quantos pacientes você perde por mês" |
| **Solution Aware** (12%) | Já ouviu falar de SEO/Google Ads | **Comparação + Prova social** | Email + Ligação | "Agências cobram R$2.000/mês. Nosso diagnóstico é gratuito e automático." |

### 2.3 Beachhead Geográfico: Rio de Janeiro

**Dados:** 23 dos 100 leads estão no Rio de Janeiro (Capital) — é a cidade com mais dados enriquecidos.

**Por que RJ primeiro (não SP):**
- 23 leads no RJ Capital vs maioria em SP (mas SP é saturado de agências)
- Menos concorrência de consultorias de marketing
- Cidade "menor" que SP (6M vs 11M) → mais fácil dominar
- Efeito psicológico: "já ajudamos clínicas no Rio de Janeiro" soa melhor que "São Paulo" para um dentista carioca

---

## 3. PLANOS ESTRATÉGICOS DE SOLUÇÃO (Product-Market Fit)

### 3.1 Raio-X Gratuito (Lead Magnet)
**Preço:** R$0 · **Custo:** $0.0305/lead · **Margem:** -$0.0305 (investimento em aquisição)

**O que entrega:** Diagnóstico de 1 página com:
- Score composto (Fit/Engagement/Intent)
- Nível Schwartz com explicação do que significa
- TOP 3 gaps detectados (ex: "Sem website", "Perfil GMB não reivindicado", "Sem schema")
- 1 recomendação acionável gratuita

**Funil:** Raio-X → email de follow-up (D+1, D+3, D+7) → oferta Sentinela

**Canais de distribuição:**
1. **Google Maps** — buscar dentistas com <4.0 estrelas → WhatsApp com o Raio-X pronto
2. **Instagram** — perfil adsentice com cases de "antes/depois" de clínicas
3. **Blog adsentice** — artigos SEO: "Como aparecer no Google para dentista [cidade]"

### 3.2 Sentinela (SEO Local Contínuo)
**Preço:** R$197/mês · **Custo:** ~$0.10/mês (re-checks mensais L0+L1) · **Margem:** ~95%

**O que entrega:**
- Monitoramento mensal do score
- Relatório de evolução (score, sinais resolvidos, novos gaps)
- Alertas: "Concorrente abriu perto de você", "Sua avaliação caiu para 3.8"
- 3 recomendações priorizadas por mês
- Acesso ao dashboard com dados do mercado local

**Produto-adjacente upsell:**
- Criação de site (R$497 one-time)
- Otimização de fotos GMB com geotag (R$47)
- Gestão de reviews (responder avaliações) — R$97/mês

### 3.3 Domínio (Competitive Intelligence)
**Preço:** R$497/mês · **Custo:** ~$0.15/mês (L3 domain_competitors) · **Margem:** ~95%

**O que entrega:**
- TUDO do Sentinela +
- Análise competitiva: TOP 5 concorrentes locais com comparison table
- Keyword gap: "Seu concorrente rankeia para 'implante dentário Moema' e você não"
- Relatório de Inteligência de Nicho: quantos dentistas no bairro, score médio, gaps mais comuns
- Battle card de vendas: objeções + ROI + script WhatsApp

### 3.4 Escala (Brandformance)
**Preço:** R$997/mês · **Custo:** ~$0.20/mês (L4 brand+AI) · **Margem:** ~95%

**O que entrega:**
- TUDO do Domínio +
- Brand monitoring: "ChatGPT menciona sua clínica?"
- Content strategy: plano editorial 12 meses baseado em keywords reais
- Marketing plan 13 seções (flagship deliverable)
- Consultoria mensal de 30min com founder

---

## 4. CAPACIDADES TÉCNICAS QUE HABILITAM CADA PLANO

| Plano | Pipeline | Skills Corey | EVO-API |
|-------|----------|-------------|---------|
| **Raio-X** | L0+L1+L2 | seo-audit, schema, site-architecture | business_listings_search, business_profile_gmb, on_page_instant_pages |
| **Sentinela** | Raio-X + recorrência | content-strategy, marketing-ideas | domain_technologies |
| **Domínio** | Sentinela + L3 | competitors, competitor-profiling, sales-enablement | domain_competitors, keyword_research |
| **Escala** | Domínio + L4 | marketing-plan, product-marketing, customer-research | ai_llm_mentions, content_sentiment |

---

## 5. PÚBLICO-ALVO E PERSONAS (derivado dos dados)

### Persona 1: Dra. Clínica estabelecida (Problem Aware, ~60% dos leads)
- **Quem é:** Dentista, 35-55 anos, clínica própria há 5+ anos
- **Dor:** "Antes tinha fila de espera, agora tenho horários vagos"
- **Comportamento:** Usa Instagram pessoal, tem site Wix de 2018, nunca olhou Google Meu Negócio
- **Ticket:** R$500/consulta, faz 80 consultas/mês = R$40K/mês
- **Abordagem:** "Sua clínica está invisível para 5.000 pessoas que buscam dentista todo mês na sua região. Isso é paciente que vai pro concorrente."
- **Produto ideal:** Sentinela (R$197/mês)

### Persona 2: Dr. Recém-formado (Solution Aware, ~10% dos leads)
- **Quem é:** Dentista, 28-35 anos, abriu clínica há <2 anos
- **Dor:** "Preciso de pacientes rápido, não tenho nome ainda"
- **Comportamento:** Google Ads (gastando mal), Instagram ativo, site próprio
- **Ticket:** R$200/consulta, faz 40 consultas/mês = R$8K/mês
- **Abordagem:** "Você está gastando com Google Ads sem saber se funciona. Eu mostro exatamente onde seu dinheiro deveria ir."
- **Produto ideal:** Sentinela + Criação de site

### Persona 3: Clínica de bairro tradicional (Unaware, ~25% dos leads)
- **Quem é:** Dentista, 50+ anos, mesma clínica há 20 anos
- **Dor:** "Sempre foi boca-a-boca, nunca precisei de propaganda"
- **Comportamento:** Não tem site, não tem Instagram, GMB criado automaticamente pelo Google
- **Ticket:** R$100/consulta (popular), faz 100 consultas/mês = R$10K/mês
- **Abordagem:** "Seu perfil no Google tem foto de 2015 e telefone errado. Paciente que pesquisa 'dentista perto' não te acha."
- **Produto ideal:** Raio-X gratuito → Site básico → Sentinela

---

## 6. ESTRATÉGIA DE CANAIS (baseado nos skills Corey)

| Canal | Skill Corey | Ação adsentice | Custo | ROI esperado |
|-------|-----------|----------------|:-----:|:-----------:|
| **Google Maps** | prospecting (Local SMB) | Buscar dentistas <4.0★ → WhatsApp com Raio-X | $0 | 1 cliente = R$197/mês |
| **Blog SEO** | content-strategy, seo-audit | Artigos: "Dentista em [cidade]: como aparecer no Google" | $0 | Tráfego orgânico perpétuo |
| **Instagram** | social, content-strategy | Cases antes/depois de clínicas + dicas de marketing | $0 | Autoridade + alcance |
| **WhatsApp** | sales-enablement, prospecting | Script de 3 linhas com dados REAIS do lead | $0 | Conversão direta |
| **Cold Email** | cold-email (Corey) | Sequência de 3 emails pós-Raio-X (D+1, D+3, D+7) | $0 | Nutrição de lead |
| **Free Tool** | free-tools (Corey) | "Calculadora de Pacientes Perdidos" no site adsentice | $0 | Lead magnet |

---

## 7. PROJEÇÃO FINANCEIRA (baseada nos 100 leads atuais)

### 7.1 Unit Economics

| Métrica | Valor |
|---------|:-----:|
| Custo por lead (L0+L1+L2) | $0.0305 (R$0.17) |
| Custo de aquisição (CAC) — inclui tempo founder | R$0 (orgânico, sem anúncio) |
| Ticket médio (Sentinela) | R$197/mês |
| Lifetime (LTV) estimado | 12 meses = R$2.364 |
| LTV/CAC | ∞ (CAC = R$0) |
| Payback | Imediato (mês 1) |

### 7.2 Projeção de crescimento (cenário conservador)

| Mês | Clientes Sentinela | MRR | Clientes Domínio | Receita Total |
|:---:|:-------------------:|:----:|:----------------:|:-------------:|
| 1 | 3 | R$591 | 0 | R$591 |
| 2 | 7 | R$1.379 | 1 | R$1.876 |
| 3 | 12 | R$2.364 | 2 | R$3.358 |
| 6 | 30 | R$5.910 | 5 | R$8.395 |
| 12 | 60 | R$11.820 | 12 | R$17.784 |

**Break-even:** Mês 1 (custo operacional R$0 — tudo ferramenta gratuita)

---

## 8. ROADMAP DE PRODUTO (da estratégia aos commits)

### Fase 1 · AGORA — Landing Page + Raio-X público
- [ ] `/raio-x` — página pública onde qualquer um cola URL e recebe diagnóstico
- [ ] Integração com `generateBattleCard()` — PDF automático
- [ ] WhatsApp flutuante no site "Quer o diagnóstico completo? Chama aqui"

### Fase 2 · v0.7 — Checkout + Auth
- [ ] `/checkout?plan=sentinela` — Stripe/PIX
- [ ] Login do cliente → dashboard com seu score + evolução
- [ ] Email automation (D+1, D+3, D+7 post-Raio-X)

### Fase 3 · v0.8 — L3 Competitive Intelligence
- [ ] `domain_competitors` wireado → TOP 5 concorrentes no dashboard
- [ ] Relatório Domínio (PDF automático com competitive landscape)

### Fase 4 · v0.9 — Scale
- [ ] Cloudflare Workers cron → monitoramento semanal automático
- [ ] Alertas: "Seu concorrente abriu", "Seu score caiu"

---

## 9. HUBS DE INTEGRAÇÃO (Social Media · Marketplaces · Cockpit TOP-K)

### 9.1 Social Media Hub — Presença em Redes Sociais

**Fontes de dados:** Instagram, Facebook, YouTube, TikTok, LinkedIn, Pinterest, X/Twitter.

**Status adsentice:** Detecção de links no site (L2 `on_page_instant_pages` extrai URLs externas). NÃO analisamos presença, engajamento, frequência de postagem, nem qualidade de conteúdo.

**O que este hub entrega:**

| Métrica | Fonte | Como extrair |
|---------|-------|-------------|
| **Perfis detectados** | Links no site + GMB | `l2_external_links_count` + filtrar por domínio (instagram.com, facebook.com...) |
| **Última postagem** | API pública ou scraping básico | Verificar data do último post visível |
| **Frequência de postagem** | API Instagram/Facebook Graph | Requer token do cliente |
| **Engajamento médio** | API Instagram/Facebook Graph | Curtidas + comentários / seguidores |
| **Seguidores** | API pública (limitado) | Dados agregados |
| **Conteúdo postado** | API Instagram/Facebook Graph | Fotos, vídeos, stories |
| **Link na bio** | Scraping básico | Verificar se tem link para site próprio ou Linktree |

**Scores que habilita:**

| Score | O que mede | Peso no compound |
|-------|-----------|:---------------:|
| **Social Presence** | Perfis ativos vs abandonados | 10pts |
| **Social Engagement** | Taxa de engajamento vs benchmark da categoria | 15pts |
| **Social Consistency** | Frequência de postagem (ideal: 3-5x/semana) | 10pts |
| **Social Commerce** | Tem link de compra/agendamento na bio? | 5pts |

**Integração com os planos:**

| Plano | Social Hub |
|-------|-----------|
| Raio-X | Detecta presença social (sim/não) + última postagem |
| Sentinela | Monitora frequência + engajamento + alertas de abandono |
| Domínio | Compara engajamento com TOP 5 concorrentes locais |
| Escala | Estratégia de conteúdo: calendário editorial + sugestão de posts |

### 9.2 Marketplaces Hub — Além do iFood

O iFood é o marketplace dominante no Brasil, mas não é o único. Dependendo do segmento, o negócio opera em múltiplos marketplaces.

**Marketplaces por segmento:**

| Segmento | Marketplaces relevantes | Status adsentice |
|----------|------------------------|:---------------:|
| **Alimentação** | iFood, Rappi, Uber Eats, 99Food, AiQFome, delivery próprio | ❌ Nenhum integrado |
| **Beleza** | iFood (beleza), Booksy, Treatwell | ❌ |
| **Hospitalidade** | Booking, Decolar, Hoteis.com, Airbnb, TripAdvisor, Expedia | ❌ |
| **Serviços Profissionais** | GetNinjas, Habitissimo, VintePila, Workana | ❌ |
| **Comércio** | Mercado Livre, Shopee, Amazon, Magalu, Americanas Marketplace | ❌ |
| **Saúde** | Doctoralia, BoaConsulta, Zenklub, Vittude | ❌ |

**O que este hub entrega:**

| Métrica | Como extrair | Aplica a |
|---------|-------------|---------|
| **Volume de pedidos por marketplace** | API / webhook do marketplace | Alimentação, Comércio |
| **Taxa de comissão por canal** | Configuração manual + API | Todos |
| **Ticket médio por marketplace** | API de pedidos | Alimentação, Comércio |
| **Recorrência por canal** | CRM + API de pedidos | Todos |
| **Avaliações no marketplace** | API do marketplace | Alimentação, Hospitalidade |
| **Tempo de resposta no marketplace** | API | Alimentação |
| **Ranking no marketplace** | Scraping ou API | Alimentação, Comércio |

**Scores que habilita:**

| Score | O que mede | Segmentos |
|-------|-----------|-----------|
| **Customer Independence Score** | % de pedidos que NÃO vêm do marketplace dominante. Quanto menor a dependência, melhor. | Alimentação, Hospitalidade, Comércio |
| **Channel Health Score** | CAC × Ticket × Recorrência POR marketplace. Qual canal gera o melhor cliente? | Alimentação, Comércio |
| **Marketplace Reputation** | Nota agregada em todos os marketplaces | Alimentação, Hospitalidade |
| **Commission Burden** | % do faturamento pago em comissões de marketplace | Alimentação, Hospitalidade |

**Exemplo de Channel Health Matrix (restaurante):**

| Canal | Pedidos/mês | CAC | Ticket Médio | Recorrência | Margem Líquida |
|-------|:----------:|:---:|:------------:|:-----------:|:-------------:|
| iFood | 420 | Alto (23%) | R$62 | Média | R$47 |
| Google (site próprio) | 95 | Baixo (3%) | R$81 | Alta | R$78 |
| WhatsApp | 140 | Muito baixo | R$88 | Muito alta | R$85 |
| Site próprio | 75 | Baixo (5%) | R$92 | Alta | R$87 |
| Rappi | 60 | Alto (25%) | R$58 | Baixa | R$43 |

**Insight acionável:** "Google gera clientes com ticket 32% maior que o iFood e custa 7× menos. Você deveria aumentar o investimento em SEO Local."

### 9.3 Cockpit TOP-K — Dashboard Executivo Diário

Inspirado no **Founder Panel** do EVO-API (CopilotRail + NarrativeCard + AlertLane + PatchCard), adaptado para negócios locais.

**Arquitetura do Cockpit:**

```
┌──────────────────────────────────────────────────────────────┐
│  COCKPIT TOP-K  —  [Nome do Negócio]  ·  [Data]             │
│                                                              │
│  ════════════ STATUS DO NEGÓCIO ═══════════════════════════ │
│                                                              │
│  🟢 Saúde Digital: 82/100      🟡 iFood: Alta dependência   │
│  🟢 Google: Excelente (4.7★)   🔴 18 avaliações pendentes   │
│                                                              │
│  ════════════ PRIORIDADES DO DIA ══════════════════════════ │
│                                                              │
│  TOP 3 ações que mais aumentam seu resultado HOJE:          │
│  1. Responder 12 avaliações pendentes (⚠️ urgente)           │
│  2. Publicar 1 foto nova no Google (📸 engajamento)         │
│  3. Ativar resposta automática no WhatsApp (💬 conversão)    │
│                                                              │
│  ════════════ RADAR DE MERCADO ════════════════════════════ │
│                                                              │
│  📊 Você era o 18º no seu bairro. Agora é o 14º.            │
│  ⚠️ Seu concorrente "X" respondeu 84 avaliações esta semana  │
│  📈 Restaurantes do bairro cresceram 12% em buscas           │
│                                                              │
│  ════════════ CO-PILOTO IA ════════════════════════════════ │
│                                                              │
│  💬 "O que eu faço hoje?"                                    │
│  🤖 "Responda as 12 avaliações pendentes. Depois publique    │
│      uma foto nova no Google. Seu concorrente ganhou 84      │
│      avaliações esta semana — não deixe ele te ultrapassar." │
│                                                              │
│  [Aplicar recomendação]  [Agendar para amanhã]  [Ignorar]   │
└──────────────────────────────────────────────────────────────┘
```

**Componentes (inspirados no EVO-API Founder Panel):**

| Componente | Equivalente EVO-API | Função adsentice |
|-----------|--------------------|------------------|
| **NarrativeCard** | `NarrativeCard.jsx` | Explica O QUE está acontecendo em linguagem natural, não números frios |
| **AlertLane** | `AlertLane.jsx` | Faixa de alertas: 🔴 crítico → 🟡 atenção → 🟢 info |
| **Co-piloto IA** | `CopilotRail.jsx` | Chat lateral: "O que eu faço hoje?" → IA responde com dados reais |
| **PatchCard** | `PatchCard.jsx` | Ação recomendada com 1 clique: "Aplicar esta correção" → executa/agenda |

### 9.4 Growth OS · Team — Para Agências e Negócios Estruturados

**Público-alvo:** Agências de marketing, franquias, redes com múltiplas unidades, negócios com gerente de marketing dedicado.

**O que o plano Growth OS inclui (além do Escala):**

| Feature | Descrição | Por que para agências |
|---------|-----------|----------------------|
| **Multi-user** | 3-10 usuários com roles (admin, analista, cliente) | Agência gerencia múltiplos clientes |
| **White-label** | Dashboard com logo e cores do cliente | Agência entrega como se fosse próprio |
| **Client Portal** | Cada cliente acessa SEU cockpit (não vê outros) | Cliente final tem autonomia |
| **Team Analytics** | Produtividade da equipe: quem respondeu mais reviews, quem fechou mais leads | Gestão de equipe de marketing |
| **Approval Workflow** | Recomendações passam por aprovação antes de executar | Cliente aprova antes da agência executar |
| **Bulk Operations** | Aplicar ação em TODOS os clientes de uma vez | Agência com 20+ clientes |
| **API Access** | REST API para integrar com sistemas próprios da agência | Automação avançada |
| **Custom Reports** | Relatórios personalizados com marca do cliente (PDF, email) | Apresentação profissional |
| **Multi-unit Dashboard** | Visão consolidada de todas as unidades (ex: rede de 10 clínicas) | Franquias e redes |
| **SLA Tracking** | Tempo de resposta, taxa de conclusão de tarefas | Contrato de nível de serviço com cliente |
| **Revenue Attribution** | Qual ação gerou qual lead/cliente? | ROI comprovado para o cliente |
| **Client Health Score** | Score de saúde do cliente (risco de churn) | Agência antecipa cancelamento |

**Estrutura de roles (RBAC):**

| Role | Permissões |
|------|-----------|
| **Admin** (agência) | Gerencia todos os clientes, usuários, billing e white-label |
| **Analista** (agência) | Executa diagnósticos, responde reviews, aplica recomendações |
| **Cliente** (negócio) | Acesso somente ao seu cockpit, aprova/rejeita recomendações |
| **Somente Leitura** (cliente) | Visualiza dashboard, não interage |

**Precificação Growth OS:**

| Tier | Usuários | Clientes | Preço |
|------|:-------:|:--------:|:-----:|
| **Growth OS Solo** | 1 | 1 (próprio negócio) | R$997/mês |
| **Growth OS Team** | 5 | até 10 | **R$1.497/mês** |
| **Growth OS Agency** | 20 | até 50 | **R$2.997/mês** |
| **Growth OS Enterprise** | ilimitado | ilimitado | **R$4.997/mês** |

**Integração com o restante do ecossistema:**

```
Growth OS Team
├── Discovery Engine (prospecção para agência achar leads)
├── Cockpit TOP-K (dashboard unificado)
│   ├── Visão por cliente
│   ├── Visão consolidada (todos os clientes)
│   └── White-label por cliente
├── Team Analytics
│   ├── Produtividade individual
│   ├── SLA tracking
│   └── Revenue attribution
├── Client Health
│   ├── Score de retenção
│   ├── Alertas de churn
│   └── Relatórios de valor entregue
└── Billing & Invoicing (futuro)
    ├── Faturamento por cliente
    ├── Comissões de marketplace
    └── ROI report automático
```

---

## 10. O QUE NÃO FAZER (Anti-estratégia)

| Não fazer | Por que |
|-----------|--------|
| ❌ Gastar com Google Ads agora | CAC R$28.40/lead vs nosso custo R$0.17. Só faz sentido com LTV validado |
| ❌ Construir app mobile | SMB dono de clínica não baixa app. WhatsApp + Web |
| ❌ Contratar vendedor | Fundador vende melhor que qualquer vendedor. Hormozi: "founder-led sales até 50 clientes" |
| ❌ Expandir para outras categorias antes de dominar dentistas | 79% dos leads são dentistas. Foco total. |
| ❌ Criar mais features antes de ter 10 clientes pagantes | Temos 37 sinais, 14 skills, 10 módulos. Precisamos de RECEITA, não mais código. |

---

## 10. MÉTRICAS DE SUCESSO (90 dias)

| Métrica | Baseline (hoje) | Meta (90 dias) | Como medir |
|---------|:---------------:|:--------------:|-----------|
| **Leads enriquecidos** | 100 | 500 | `SELECT COUNT(DISTINCT place_id)` |
| **Clientes pagantes** | 0 | 10 | Stripe MRR |
| **MRR** | R$0 | R$1.970 (10 × R$197) | Stripe dashboard |
| **Raio-X gerados** | 0 | 100 | Contador no Redis |
| **Conversão Raio-X → Cliente** | 0% | 10% | tracking UTM |
| **BOA score** | 0.958 | 0.980 | `adsentice_boa_score.py` |
