---
id: adsentice-category-strategy-matrix
title: "Matriz de Estrategia por Categoria/Nicho — Canais, Scores e Integracoes"
status: living
type: strategy
version: "1.0.0"
date: 2026-07-13
sources:
  - Supabase discovery_listings (100 leads, SP+RJ)
  - 47 skills Corey Haines (marketingskills)
  - Sugestão para análise para soluções adicionais.txt
  - ADR-0008 (EVO-API L0-L4)
  - ADR-0009 (Market Intelligence)
  - ADR-0011 (Brain OODA)
---

# Matriz de Estrategia por Categoria/Nicho

> **Principio:** Cada categoria de negocio tem seu proprio ecossistema de canais, dores e estrategias. Nao faz sentido oferecer integracao com iFood para um dentista, nem convenio medico para um restaurante. Esta matriz define, para cada categoria, quais hubs, scores, canais e estrategias se aplicam.

---

## 1. SEGMENTOS E CATEGORIAS

### 1.1 Saude (9 categorias) — Nicho primario adsentice

| Categoria | Leads | Score | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|:-----:|---------------------|-----------------|-------------------|
| **Dentista** | 79 | 36 | WhatsApp, Telefone, Site, GMB, Instagram, Convenio | Local Presence, Website, WhatsApp, Reputation | Paciente so vai quando doi. Ticket R$150-500. Alta rotatividade. Fidelizacao via prevencao. |
| **Ortodontista** | 3 | 44 | WhatsApp, Telefone, Site, GMB, Instagram | Local Presence, Website, Reputation | Ticket alto (R$3K-15K). Decisao envolve confianca. Necessita site impecavel + provas sociais. |
| **Clinica Estetica** | 0* | — | WhatsApp, Instagram, Site, GMB, TikTok | Local Presence, Website, WhatsApp, Reputation, Social | Crescimento 40%/ano. Dependencia de Instagram. Necessita agendamento facil + portfolio visual. |
| **Clinica Medica** | 1 | 43 | WhatsApp, Telefone, Site, GMB, Convenio, PDV | Local Presence, Website, WhatsApp, Reputation | Convenios dominam. Urgencia = busca imediata. Ticket R$100-300. Necessita agendamento online. |
| **Psicologo** | 0* | — | WhatsApp, Site, GMB, Instagram, Telefone | Local Presence, Website, WhatsApp | Estigma ainda existe. Necessita educacao + acolhimento. Ticket R$150-300/sessao. |
| **Fisioterapeuta** | 0* | — | WhatsApp, Telefone, Site, GMB, Convenio | Local Presence, Website, WhatsApp | Dependencia de encaminhamento medico. Necessita convenio + particular. |
| **Oftalmologista** | 0* | — | WhatsApp, Telefone, Site, GMB, Convenio | Local Presence, Website, Reputation | Ticket R$200-500. Cirurgia refrativa = alto valor. Necessita agendamento. |
| **Cardiologista** | 0* | — | WhatsApp, Telefone, Site, GMB, Convenio | Local Presence, Website, Reputation | Convenio > particular. Urgencia = busca imediata. |
| **Veterinario** | 0* | — | WhatsApp, Telefone, Site, GMB, Instagram | Local Presence, Website, WhatsApp, Reputation | 2o mercado pet mundial. Emergencia = busca imediata. Ticket R$100-500. |

### 1.2 Beleza (3 categorias)

| Categoria | Leads | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|---------------------|-----------------|-------------------|
| **Salao de Beleza** | 0* | WhatsApp, Instagram, Site, GMB, TikTok | Local Presence, Website, WhatsApp, Social, Reputation | Dependencia de Instagram. Agendamento via WhatsApp. Fidelizacao via recorrencia. |
| **Barbearia** | 0* | WhatsApp, Instagram, GMB | Local Presence, WhatsApp, Social | Ticket baixo (R$30-60). Alta frequencia. Fidelizacao via experiencia. |
| **Academia** | 0* | WhatsApp, Instagram, Site, GMB, App proprio | Local Presence, Website, WhatsApp, Social | Ticket R$80-200/mes. Retencao e o maior desafio. Necessita app/web para aulas e check-in. |

### 1.3 Servicos Profissionais (5 categorias)

| Categoria | Leads | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|---------------------|-----------------|-------------------|
| **Advogado** | 0* | WhatsApp, Telefone, Site, GMB, LinkedIn | Local Presence, Website, WhatsApp, Reputation | Ticket alto (R$500-5.000). Decisao baseada em confianca. Necessita site + artigos. |
| **Contador** | 0* | WhatsApp, Telefone, Site, GMB, Email | Local Presence, Website, WhatsApp | Ticket fixo mensal. Retencao altissima. Necessita diferenciacao. |
| **Arquiteto** | 0* | WhatsApp, Instagram, Site, GMB, Pinterest | Local Presence, Website, Social, Reputation | Portfolio visual e crucial. Ticket R$3K-15K. Decisao longa. |
| **Designer de Interiores** | 0* | WhatsApp, Instagram, Site, GMB, Pinterest | Local Presence, Website, Social | Similar a arquiteto. Portfolio + provas sociais. |
| **Imobiliaria** | 0* | WhatsApp, Telefone, Site, GMB, Portais (Zap, VivaReal) | Local Presence, Website, WhatsApp, Reputation | Ticket R$3.000-30.000. Multi-canal obrigatorio. Fotos + tour virtual. |

### 1.4 Alimentacao (3 categorias) — Delivery Hub se aplica

| Categoria | Leads | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|---------------------|-----------------|-------------------|
| **Restaurante** | 0* | **iFood**, WhatsApp, Telefone, Site, GMB, Instagram, PDV | Local Presence, Website, WhatsApp, Reputation, **Delivery**, Customer | Multi-canal. iFood come 20-30% da margem. Necessita site proprio de pedidos. |
| **Pizzaria** | 0* | **iFood**, WhatsApp, Telefone, Site, GMB, PDV | Local Presence, Website, WhatsApp, **Delivery**, Customer | Delivery domina (70%+ pedidos). iFood vs WhatsApp vs site proprio. |
| **Padaria** | 0* | WhatsApp, GMB, PDV, iFood (se delivery) | Local Presence, Website, WhatsApp, **Delivery** | Ticket baixo (R$5-30). Alta frequencia. Balcao + delivery. |

### 1.5 Comercio Local (6 categorias)

| Categoria | Leads | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|---------------------|-----------------|-------------------|
| **Pet Shop** | 0* | WhatsApp, Telefone, Site, GMB, Instagram, PDV | Local Presence, Website, WhatsApp, Reputation | SMB puro. Banho/tosa + varejo. Necessita agendamento + e-commerce basico. |
| **Farmacia** | 0* | WhatsApp, Telefone, Site, GMB, PDV, App (rede) | Local Presence, Website, WhatsApp | Redes dominam. SMB compete por conveniencia local + entrega. |
| **Oficina Mecanica** | 0* | WhatsApp, Telefone, GMB | Local Presence, WhatsApp, Reputation | Urgencia = 1o do Google ganha. Ticket R$100-2.000. Confianca e fator #1. |
| **Eletricista** | 0* | WhatsApp, Telefone, GMB | Local Presence, WhatsApp | Profissional liberal. So GMB. Urgencia = 1o do Google ganha. |
| **Encanador** | 0* | WhatsApp, Telefone, GMB | Local Presence, WhatsApp | Igual eletricista. Urgencia maxima. Google = ganha o servico. |
| **Servico de Limpeza** | 0* | WhatsApp, Telefone, Site, GMB, Instagram | Local Presence, Website, WhatsApp | Terceirizacao. Google = principal canal. Ticket R$200-800/mes. |

### 1.6 Educacao (2 categorias)

| Categoria | Leads | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|---------------------|-----------------|-------------------|
| **Escola Particular** | 0* | WhatsApp, Telefone, Site, GMB, Instagram, Facebook | Local Presence, Website, WhatsApp, Social, Reputation | Ticket alto (R$500-3K/mes). Matricula = pico de busca. Pais decidem. |
| **Autoescola** | 0* | WhatsApp, Telefone, Site, GMB, Instagram | Local Presence, Website, WhatsApp | 1a CNH = Google. Ticket R$1.5K-2.5K. Jovem = Instagram. |

### 1.7 Hospitalidade (1 categoria)

| Categoria | Leads | Canais operacionais | Hubs aplicaveis | Dores especificas |
|-----------|:-----:|---------------------|-----------------|-------------------|
| **Pousada/Hotel** | 0* | WhatsApp, Telefone, Site, GMB, Booking, Decolar, Instagram | Local Presence, Website, WhatsApp, Reputation, Social | Booking/Decolar comem 15-25%. Fotos + reviews = reserva. Necessita site proprio de reservas. |

> \* 0 leads = categoria definida no ICP mas ainda nao populada no Supabase. Sera populada conforme Discovery rodar em novas categorias.

---

## 2. HUBS POR SEGMENTO (matriz de aplicabilidade)

| Hub | Saude | Beleza | Servicos Prof. | Alimentacao | Comercio | Educacao | Hospitalidade |
|-----|:-----:|:------:|:--------------:|:-----------:|:--------:|:--------:|:------------:|
| **📍 Local Presence** (GMB) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **🌐 Website** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **💬 WhatsApp** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **⭐ Reputation** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **📈 Marketing** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **🍔 Delivery** | ❌ | ❌ | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| **👥 Customer** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **🤖 AI** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **📱 Social** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **💳 PDV** | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **🏥 Convenio** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **🏨 OTA** (Booking) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. SCORES QUE IMPORTAM POR SEGMENTO

Cada segmento tem pesos diferentes para cada dimensao de scoring:

| Score | Saude | Beleza | Servicos Prof. | Alimentacao | Comercio | Educacao | Hospitalidade |
|-------|:-----:|:------:|:--------------:|:-----------:|:--------:|:--------:|:------------:|
| **Maturidade Digital** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 |
| **Customer Independence** | 🔥🔥 | 🔥🔥 | 🔥🔥 | 🔥🔥🔥 | 🔥 | 🔥🔥 | 🔥🔥🔥 |
| **Channel Health** | 🔥🔥 | 🔥🔥🔥 | 🔥 | 🔥🔥🔥 | 🔥 | 🔥🔥 | 🔥🔥🔥 |
| **Customer Loyalty** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | 🔥🔥🔥 | 🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 |
| **Reputation** | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 |
| **Response Time** | 🔥🔥 | 🔥🔥🔥 | 🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 | 🔥🔥🔥 |
| **SEO Local** | 🔥🔥🔥 | 🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥🔥 | 🔥🔥 |

---

## 4. ESTRATEGIA DE ABORDAGEM POR SEGMENTO

### Saude (Dentista, Clinica, Psicologo...)
**Abordagem:** "Seu paciente pesquisa no Google antes de escolher. Voce aparece?"
**Canais de prospeccao:** Google Maps <4.0★ + WhatsApp + Instagram
**Produto inicial:** Raio-X gratuito → Sentinela (R$197)
**Upsell natural:** Site profissional + Gestao de Reviews
**NAO oferecer:** Delivery, iFood, PDV (nao se aplica)

### Beleza (Salao, Barbearia, Academia)
**Abordagem:** "Seu cliente decide pelo Instagram e confirma pelo WhatsApp. Voce mede isso?"
**Canais de prospeccao:** Instagram + Google Maps + WhatsApp
**Produto inicial:** Raio-X gratuito → Sentinela (R$197)
**Upsell natural:** WhatsApp automatizado + Agendamento + Fidelizacao
**NAO oferecer:** Convenio, iFood

### Servicos Profissionais (Advogado, Contador, Arquiteto)
**Abordagem:** "Seu cliente pesquisa 3 opcoes antes de contratar. Voce e uma delas?"
**Canais de prospeccao:** Google + LinkedIn + Referral
**Produto inicial:** Raio-X gratuito → Sentinela (R$197)
**Upsell natural:** Site com artigos + SEO Local + Reputacao
**NAO oferecer:** iFood, PDV, Delivery

### Alimentacao (Restaurante, Pizzaria, Padaria)
**Abordagem:** "Seus clientes estao espalhados em varios canais. Voce tem visao unica deles?"
**Canais de prospeccao:** Google Maps + iFood + Instagram
**Produto inicial:** Raio-X gratuito → Sentinela (R$197) + **Delivery Intelligence** (R$297)
**Upsell natural:** Hub de pedidos multicanal + CRM + Fidelidade
**DIFERENCIAL:** Integracao iFood API + Google + WhatsApp + PDV
**NAO oferecer:** Convenio

### Comercio Local (Pet Shop, Farmacia, Oficina, Eletricista...)
**Abordagem:** "Seu cliente so pesquisa no Google quando precisa. Voce e o primeiro?"
**Canais de prospeccao:** Google Maps + WhatsApp
**Produto inicial:** Raio-X gratuito → Sentinela (R$197)
**Upsell natural:** GMB otimizado + Reviews + WhatsApp Business
**NAO oferecer:** iFood (exceto para pet shop com delivery?)

### Educacao (Escola, Autoescola)
**Abordagem:** "Pais pesquisam escola no Google meses antes da matricula. Voce aparece?"
**Canais de prospeccao:** Google + Instagram + Facebook (pais)
**Produto inicial:** Raio-X gratuito → Sentinela (R$197)
**Upsell natural:** Site com tour virtual + SEO Local + Gestao de Reviews
**NAO oferecer:** iFood, PDV

### Hospitalidade (Pousada, Hotel)
**Abordagem:** "Booking e Decolar comem ate 25% da sua receita. Site proprio converte mais barato?"
**Canais de prospeccao:** Google Maps + Booking + Instagram
**Produto inicial:** Raio-X gratuito → Sentinela (R$197)
**Upsell natural:** Site proprio de reservas + SEO Local + Reputation Hub
**DIFERENCIAL:** Customer Independence Score (reduzir dependencia de OTAs)

---

## 5. PLANO DE PRECIFICACAO POR SEGMENTO

| Segmento | Raio-X | Sentinela | Dominio | Growth OS |
|----------|:------:|:---------:|:-------:|:---------:|
| **Saude** | R$0 | R$197 | R$497 | R$997 |
| **Beleza** | R$0 | R$197 | R$497 | R$997 |
| **Servicos Profissionais** | R$0 | R$197 | R$497 | R$997 |
| **Alimentacao** | R$0 | R$197 | R$497 + **Delivery Intel R$297** | R$1.497 |
| **Comercio** | R$0 | R$197 | R$497 | R$997 |
| **Educacao** | R$0 | R$197 | R$497 | R$997 |
| **Hospitalidade** | R$0 | R$197 | R$497 + **OTA Intel R$197** | R$1.497 |

> Alimentacao e Hospitalidade tem modulos extras (Delivery Intelligence, OTA Intelligence) porque tem ecossistemas de canais mais complexos e maior potencial de receita por cliente.

---

## 6. IMPLEMENTACAO POR FASES

### Fase 1 · AGORA — Saude (dentistas primeiro)
- [x] 79 leads de dentista no Supabase
- [x] Scoring digital completo (37 sinais)
- [x] Content Gap + Architecture + Schema
- [ ] Pagina de vendas especifica para dentistas
- [ ] Case studies com dados REAIS dos 79 leads

### Fase 2 · v0.8 — Expansao para Alimentacao
- [ ] Delivery Hub: integracao com iFood API (webhooks)
- [ ] Customer Independence Score
- [ ] Channel Health dashboard
- [ ] Discovery Engine rodar em restaurantes SP

### Fase 3 · v0.9 — Expansao para Beleza + Servicos
- [ ] Social Hub: Instagram + TikTok analytics basico
- [ ] WhatsApp Hub: resposta automatica + templates
- [ ] Customer Loyalty Score

### Fase 4 · v1.0 — Todos os segmentos
- [ ] AI Orchestrator: recomendacoes diarias automatizadas
- [ ] Benchmark continuo por segmento
- [ ] Cockpit TOP-K unificado

---

## 7. METRICAS DE SUCESSO POR SEGMENTO

| Segmento | Metrica primaria | Baseline | Meta 90 dias |
|----------|:---------------:|:--------:|:------------:|
| Saude | Clientes pagantes | 0 | 5 |
| Alimentacao | Leads enriquecidos | 0 | 200 |
| Beleza | Leads enriquecidos | 0 | 150 |
| Servicos Profissionais | Leads enriquecidos | 0 | 100 |

> Foco total em Saude ate termos 10 clientes pagantes. So depois expandir para Alimentacao.
