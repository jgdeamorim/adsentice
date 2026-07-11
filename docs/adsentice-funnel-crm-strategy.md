---
id: adsentice-funnel-crm-strategy
title: "adsentice — Funil de Leads, CRM & Estratégia de Marketing"
status: living
type: spec
version: "1.0.0"
date: 2026-07-11
owner: "Jeferson Galote de Amorim"
deciders: [jgdeamorim]
tags: [funnel, crm, leads, marketing, scoring, admin, client, proposals]
---

# adsentice · Funil de Leads, CRM & Estratégia de Marketing

> **Propósito:** definir o ciclo completo — do discovery do mercado ao cliente onboarded — com critérios de scoring, dashboards separados (admin × client), CRM-driven proposals, e camadas de aquisição.
> **Fontes:** marketingagentskills (Jaymes), Clay GTM framework, Jasper.ai reference, EVO-API rsxt.
> **Regra-mãe:** `medido=verdade` — todo critério cita fonte.

---

## 1. DOIS DASHBOARDS, DOIS PÚBLICOS

```
┌─────────────────────────────────────────────────────────────┐
│                    ADSENTICE PLATFORM                        │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │  ADMIN DASHBOARD     │    │  CLIENT DASHBOARD            │ │
│  │  (operador adsentice)│    │  (cliente pagante)           │ │
│  │                      │    │                              │ │
│  │  👁️ Mercado          │    │  📊 Meu Score no Tempo       │ │
│  │  🔍 Leads Pipeline   │    │  ⭐ Minha Reputação          │ │
│  │  📋 Propostas CRM    │    │  🏢 Meus Concorrentes        │ │
│  │  💰 MRR/Ticket       │    │  🔔 Meus Alertas             │ │
│  │  ⚙️ Segmentos/Alvos  │    │  📈 Meu ROI                  │ │
│  │                      │    │                              │ │
│  │  Stage 0→7 pipeline │    │  Variance Report             │ │
│  │  ~$2/lead qualificado│    │  (mercado × minha conta)     │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                              │
│  ════════════════ DADOS COMPARTILHADOS ════════════════════ │
│  Vault (R2+Postgres) · Brand IQ · Qdrant · DataForSEO MCP   │
└─────────────────────────────────────────────────────────────┘
```

### 1.1 Admin Dashboard (operador adsentice)

| Módulo | Função | Fonte de dados |
|--------|--------|---------------|
| **Market Analysis** | Descobrir sub-nichos, volumes, segmentos-alvo | DataForSEO keyword data + business listings |
| **Lead Pipeline** | Stage 0→7 com scores e ações por lead | DataForSEO + Firecrawl + LLM síntese |
| **CRM Proposals** | Propostas auto-geradas com tips + mockups | Brand IQ + score dimensions |
| **MRR Dashboard** | Receita recorrente, churn, ticket médio | Supabase (billing) |
| **Segment Control** | Selecionar categorias × cidades-alvo | DataForSEO business.listings.search |

### 1.2 Client Dashboard (cliente pagante)

| Módulo | Função | Fonte de dados |
|--------|--------|---------------|
| **Score Timeline** | Evolução do score de mercado mês a mês | Vault series (Postgres) |
| **Reputation Monitor** | Reviews, rating, sentiment ao longo do tempo | DataForSEO business.reviews |
| **Competitor Radar** | Posição vs concorrentes, novos entrantes | DataForSEO domain.competitors |
| **Action Feed** | Recomendações ativas, prazo, impacto | LLM síntese (DeepSeek V4) |
| **Variance Report** | Mercado geral × minha conta (o moat) | Cross-reference DataForSEO × Google Ads/Meta |

---

## 2. FUNIL DE LEADS (Stage 0 → 7)

### 2.1 Visão Geral

```
STAGE 0          STAGE 1-2        STAGE 3-4        STAGE 5-6        STAGE 7
SELEÇÃO          DISCOVERY        ANÁLISE          PROPOSTA         CLIENTE
┌──────┐        ┌──────┐         ┌──────┐         ┌──────┐         ┌──────┐
│ Merc │   →    │ List │    →    │ Diag │    →    │ Prop │    →    │ MRR  │
│ Alvo │        │ Cand │         │ Score│         │ CRM  │         │ Onb  │
└──────┘        └──────┘         └──────┘         └──────┘         └──────┘
  $0              ~1¢              ~10¢              $0             MRR
  founder         auto             auto              founder        auto
  decide          pipeline         LLM               fecha          onboard
```

### 2.2 Estágios Detalhados

#### STAGE 0 · SELEÇÃO DE SEGMENTO [$0]

**O que acontece:** O founder define qual nicho × cidade atacar.

**Dados usados:**
- DataForSEO keyword data (volume por categoria × cidade)
- Google Trends (crescimento de demanda)
- Análise de saturação (quantos concorrentes já anunciam)

**Output:** Segment Card
```json
{
  "category": "Clínicas Estéticas",
  "city": "São Paulo - Zona Sul",
  "estimated_candidates": 120,
  "avg_ticket": "R$497-800",
  "search_volume": "harmonização facial SP = 12.1k/mês ↑22%",
  "competition_density": "médio (34 concorrentes com GMB ativo)",
  "recommendation": "ATACAR — alta demanda, ticket compatível, concorrência fragmentada"
}
```

**Gate:** Founder confirma o alvo. Sem isso, o pipeline não dispara.

**Ferramenta de marketing:** `marketing-advantages` (identificar vantagens de mercado do segmento) + `icp-persona` (perfil do dono de clínica estética em SP).

---

#### STAGE 1 · DESCOBERTA DE CANDIDATOS [~$0.01/lead]

**O que acontece:** Pipeline busca TODOS os negócios do segmento na cidade.

**Dados usados:**
- DataForSEO `business.listings.search(category, location)`
- Google Maps scraping (Firecrawl search)

**Output:** Lista bruta de candidatos (50-200 por segmento).

**Sinal de qualidade (Clay GTM Signal Detection):**

| Sinal | Significado | Fonte |
|-------|------------|-------|
| Tem GMB ativo | Presença digital detectável | DataForSEO |
| Tem site listado | URL disponível no perfil | GMB profile |
| Categoria match | Categoria GMB bate com alvo | business.profile.gmb |

---

#### STAGE 2 · PRÉ-FILTRO [$0]

**O que acontece:** Descarta candidatos que NÃO são leads qualificáveis (ANTI-ICP).

**Critérios de descarte (ANTI-ICP):**

| Sinal | Ação | Fonte |
|-------|------|-------|
| Sem site | ❌ DESCARTAR — sem presença digital | GMB profile |
| Sem GMB | ❌ DESCARTAR — invisível no Google | business.profile.gmb |
| Site morto (último post > 1 ano) | ❌ DESCARTAR — sem budget/investimento | Firecrawl scrape |
| Já é cliente adsentice | ❌ SKIP — já onboarded | CRM (Supabase) |
| Gigante (200+ reviews, multi-location) | ❌ DESCARTAR — já tem agência | GMB data |

**Resultado esperado:** ~30% dos candidatos sobrevivem (15-60 leads Stage 3).

---

#### STAGE 3 · ANÁLISE DO CLIENTE ★ [~$0.10/lead]

**O que acontece:** Diagnóstico completo dos leads qualificados.

**Dados usados:** 5 pipelines em paralelo (POST /api/diagnostic):

| Pipeline | Capabilities | Output |
|----------|-------------|--------|
| Site Audit | on_page.lighthouse + domain.technologies | Performance, SEO técnico, stack |
| SEO Discovery | serp.organic + keyword.research | Keywords, posições, volume |
| GMB Check | business.profile.gmb + business.reviews | Perfil, reviews, rating |
| Competitor Intel | domain.competitors + keyword_gap | Concorrentes, posição relativa |
| Ads Detection | ads.traffic_forecast + serp.ads | Anuncia? Quanto? Concorrentes? |

**Output:** Dossiê completo com 5 cards + 3-5 tips priorizados + score 0-100.

**Lead Score = fixability × potential × value-fit:**

```
FIXABILITY (quão fácil consertar):
  + site lento/mal configurado  (+20)
  + poucas reviews              (+15)
  + GMB desatualizado           (+10)
  + keywords não ranqueadas     (+15)

POTENTIAL (quanto vale consertar):
  + keyword de alto volume      (+25)
  + ticket compatível           (+20)
  + mercado em crescimento      (+15)
  + já anuncia (tem budget)     (+10)

VALUE-FIT (match com adsentice):
  + nicho coberto (5/5 caps)    (+30)
  + localização SP              (+10)
  + ticket adsentice compatível (+10)

Exemplo: 87 = site lento + só 12 reviews (fixability 60)
              × harmonização facial 12.1k subindo (potential 70)
              × nicho clínica R$800 compatível (value-fit 50)
```

---

#### STAGE 4 · LEAD-SCORE + PRIORIZAÇÃO [$0]

**O que acontece:** Leads são rankeados por score e prioridade de contato.

**Framework de priorização (Clay GTM Signal Stacking):**

| Camada de Sinal | Peso | Exemplos |
|-----------------|------|----------|
| **Intent** (está procurando?) | 35% | Buscou "agência de marketing para clínica", visitou site de concorrente |
| **Growth** (está crescendo?) | 25% | Contratando, abrindo nova unidade, +reviews recentes |
| **Change** (mudança no negócio) | 20% | Novo site, rebranding, trocou de CMS |
| **Distress** (está com problema?) | 20% | Reviews negativas sem resposta, site fora do ar, perdeu posição |

**Stacking rule:** 1 sinal = lead frio. 2+ sinais = lead quente. 3+ sinais em < 30 dias = lead URGENTE (contato imediato).

**Output:** Pipeline ordenado por `priority_score`:
```json
[
  { "lead": "Clínica Estética XPTO", "score": 87, "priority": "URGENTE",
    "signals": ["3 reviews negativas sem resposta esta semana", "harmonização facial 12.1k/mês", "anuncia mas não ranqueia"] },
  { "lead": "Dentista Sorriso SP", "score": 73, "priority": "QUENTE",
    "signals": ["site WordPress lento (Perf 34/100)", "concorrente abriu unidade do lado"] },
  ...
]
```

---

#### STAGE 5 · PROPOSTA AUTO-GERADA [$0]

**O que acontece:** Sistema gera proposta personalizada com dados REAIS do diagnóstico.

**Template de proposta CRM-driven:**

```markdown
# Diagnóstico de Mercado Digital
## {{business.name}} · {{business.url}}

### 📊 Seu Score de Mercado: {{score.overall}}/100

### 🔍 O que descobrimos sobre seu negócio:

✅ **Forças:**
{{#each strengths}}
- {{this}}
{{/each}}

⚠️ **Oportunidades:**
{{#each gaps}}
- {{this}}
{{/each}}

### 🎯 As 3 ações de maior impacto (grátis):

1. {{tips[0].title}}
   {{tips[0].detail}}

2. {{tips[1].title}}
   {{tips[1].detail}}

3. {{tips[2].title}}
   {{tips[2].detail}}

### 📈 Plano adsentice (a partir de R$47/mês):

- Monitoramento contínuo do seu mercado
- Alertas de novos concorrentes
- Relatório mensal de evolução
- Estratégia de SEO local personalizada
- Gestão de reputação (reviews)

[Agendar demonstração gratuita]
```

---

#### STAGE 6 · NEGOCIAÇÃO [founder]

**O que acontece:** Founder entra em contato com o lead usando a proposta como gancho.

**CRM tracking:**

| Campo | Função |
|-------|--------|
| Contact status | `new` → `contacted` → `meeting_booked` → `negotiating` → `won` / `lost` |
| Last contact date | Auto-update |
| Next action | `call`, `email`, `whatsapp`, `demo` |
| Notes | Founder notas livres |
| Proposal version | Link para dossiê Stage 5 |

**Playbook de contato:**
1. **Dia 0:** WhatsApp com link do diagnóstico gratuito
2. **Dia 2:** Email com proposta detalhada + cases similares
3. **Dia 5:** Follow-up call (founder)
4. **Dia 10:** Último contato — demo ao vivo

---

#### STAGE 7 · CLIENTE ONBOARDED [MRR]

**O que acontece:** Lead virou cliente pagante.

**Onboarding flow:**
1. Tenant criado (Supabase RLS isolado)
2. Dashboard cliente provisionado
3. Primeiro relatório completo (24h)
4. Call de boas-vindas (founder)
5. Monitoramento automático ativado (alertas, score timeline)

**Métricas de retenção:**
- Login na primeira semana → +40% retenção
- Primeiro relatório visto → +25% retenção
- 3+ ações concluídas no mês 1 → churn < 5%

---

## 3. CRM-DRIVEN PROPOSALS

### 3.1 Estrutura da Proposta

Cada proposta é gerada a partir de 3 fontes:

```
┌────────────────────────────────────────────┐
│          FONTES DA PROPOSTA                 │
│                                             │
│  ① BRAND IQ (descoberto)                    │
│     · nome, nicho, localização              │
│     · voz de marca, público                 │
│     · pontos fortes, gaps                   │
│                                             │
│  ② DIAGNÓSTICO (5 pipelines)                │
│     · site audit score                      │
│     · SEO opportunities                     │
│     · GMB status                            │
│     · competitor position                   │
│                                             │
│  ③ MERCADO (DataForSEO)                     │
│     · keyword volumes                       │
│     · competitor landscape                  │
│     · market trends                         │
│                                             │
│  → LLM SÍNTESE (DeepSeek V4) → PROPOSTA     │
└────────────────────────────────────────────┘
```

### 3.2 Tipos de Proposta por Solução

| Solução | Proposta Type | Gatilho |
|---------|--------------|---------|
| Diagnóstico SEO Local | `seo_local` | Score SEO < 60 E volume keywords > 500 |
| Análise de Concorrência | `competitor_intel` | 3+ concorrentes E posição < #3 |
| Reputação Online | `reputation_mgmt` | Rating < 4.0 OU reviews negativas sem resposta |
| Auditoria de Site | `site_audit` | Performance < 50 OU mobile não responsivo |
| GEO · Marca na IA | `geo_ai` | Não mencionado em AI overviews |

---

## 4. CAMADAS DE ATRAÇÃO (Marketing Funnel)

Inspirado no `lifecycle-marketing-campaigns` e `clay-gtm-outbound`.

### 4.1 Funil de Aquisição de Leads (adsentice → dono de clínica)

```
┌──────────────────────────────────────────────────────────────┐
│                     AWARENESS (topo)                          │
│  Conteúdo: blog, Instagram, LinkedIn                         │
│  "Seu concorrente já está no Google. E você?"                │
│  Ferramenta: marketing-product-ideas + saas-landing-pages    │
├──────────────────────────────────────────────────────────────┤
│                     CONSIDERATION (meio)                      │
│  Conteúdo: diagnóstico gratuito, cases, depoimentos          │
│  "Descubra em 10 segundos o que você está perdendo"          │
│  Ferramenta: case-study-builder + press-release              │
├──────────────────────────────────────────────────────────────┤
│                     CONVERSION (fundo)                        │
│  Conteúdo: proposta personalizada, demo ao vivo              │
│  "Seu score é 62/100. Dá pra chegar em 85 em 90 dias."      │
│  Ferramenta: product-messaging + product-positioning         │
├──────────────────────────────────────────────────────────────┤
│                     RETENTION (pós-venda)                     │
│  Conteúdo: relatório mensal, alertas, variance report        │
│  "Este mês você ganhou 3 posições no Google. +12% tráfego."  │
│  Ferramenta: lifecycle-marketing-campaigns                   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Ciclos de Vida do Cliente (por segmento)

Baseado no framework `lifecycle-marketing-campaigns` adaptado para SMB Brasil:

| Segmento | Ativação | Retenção | Expansão |
|----------|---------|----------|----------|
| **Clínica Estética** | 1º relatório em 24h | Alertas de reviews semanais | Créditos para deep-dive |
| **E-commerce Local** | SEO audit + keywords | Competitor radar mensal | Integração Google Ads |
| **Serviços (advocacia)** | GMB otimização | Novos casos/leads report | Multi-location |
| **Restaurante** | Reputação dashboard | Review response templates | TripAdvisor add-on |

---

## 5. SCORING DIMENSIONS (7 eixos)

### 5.1 As 7 Dimensões do Lead Score

| Dimensão | Peso | O que mede | Fonte |
|----------|------|-----------|-------|
| **Saúde Técnica** | 20% | Site performance, SEO técnico, mobile | on_page.lighthouse + domain.technologies |
| **Presença Local** | 20% | GMB ativo, reviews, posts recentes | business.profile.gmb + business.reviews |
| **SEO & Tráfego** | 20% | Keywords, posições, volume | serp.organic + keyword.research |
| **Concorrência** | 15% | Posição relativa, gaps, ameaças | domain.competitors + keyword_gap |
| **Reputação** | 10% | Rating, sentimento, resposta | business.reviews + content.sentiment |
| **Presença Paga** | 10% | Anuncia? Budget? ROI potencial? | ads.traffic_forecast + serp.ads |
| **Maturidade Digital** | 5% | Idade domínio, stack, analytics | domain.whois + domain.technologies |

### 5.2 Thresholds de Ação

| Score | Classificação | Ação |
|-------|-------------|------|
| 80-100 | 🟢 EXCELLENT | Manter, upsell deep-dives |
| 60-79 | 🟡 GOOD | Propor plano de melhoria |
| 40-59 | 🟠 WARNING | Proposta urgente com quick wins |
| 0-39 | 🔴 CRITICAL | Prospectar ativamente |

---

## 6. SIGNAL DETECTION (Clay GTM Framework aplicado)

### 6.1 Sinais de INTENT (lead está procurando)

| Sinal | Como detectar | Ferramenta |
|-------|--------------|-----------|
| Buscou keyword de alta intenção | `serp.organic` + keyword volume | DataForSEO MCP |
| Visitou landing page concorrente | Firecrawl + domínio referenciado | SimilarWeb (futuro) |
| Interagiu com conteúdo adsentice | Email open, link click, demo request | CRM (Supabase) |

### 6.2 Sinais de GROWTH (lead está crescendo)

| Sinal | Como detectar | Ferramenta |
|-------|--------------|-----------|
| Abrindo nova unidade | Job postings, GMB nova localização | business.listings.search |
| +reviews recentes (momentum) | Delta reviews 30 dias | business.reviews |
| Tráfego subindo | Delta domain traffic | DataForSEO (futuro: SimilarWeb) |

### 6.3 Sinais de CHANGE (mudança no negócio)

| Sinal | Como detectar | Ferramenta |
|-------|--------------|-----------|
| Novo site / rebranding | domain.technologies (stack mudou) | DataForSEO |
| Novo CMO / marketing hire | LinkedIn scraping (futuro) | Clay enrichment |
| Migração de CMS | domain.technologies (CMS diferente de 6 meses atrás) | Vault series |

### 6.4 Sinais de DISTRESS (lead com problema urgente)

| Sinal | Como detectar | Ferramenta |
|-------|--------------|-----------|
| Reviews negativas sem resposta | business.reviews (negativas > 7 dias sem reply) | DataForSEO MCP |
| Site fora do ar / lento | on_page.lighthouse (performance < 30) | DataForSEO |
| Perdeu posição Google | serp.organic (delta posição mês a mês) | Vault series |
| Concorrente abriu do lado | domain.competitors (novo entrante no raio) | DataForSEO |

### 6.5 Signal Stacking (priorização automática)

```python
# Pseudocódigo do motor de priorização
def lead_priority(lead):
    signals = detect_signals(lead)
    score = 0

    # Cada sinal detectado soma
    if signals.intent:    score += 35
    if signals.growth:    score += 25
    if signals.change:    score += 20
    if signals.distress:  score += 20

    # Stacking bonus (múltiplos sinais na mesma janela)
    if sum(bool(s) for s in [signals.intent, signals.growth, signals.change, signals.distress]) >= 3:
        score += 15  # URGENTE

    # Recency bonus (sinal nos últimos 30 dias)
    if signals.age_days < 30:
        score += 10

    return {
        "score": min(100, score),
        "priority": "URGENTE" if score >= 70 else "QUENTE" if score >= 40 else "FRIO",
        "signals": signals
    }
```

---

## 7. ARQUITETURA DE DADOS (CRM)

### 7.1 Tabelas Principais (Supabase)

```sql
-- leads: candidatos descobertos
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  business_name TEXT,
  category TEXT,
  city TEXT,
  state TEXT DEFAULT 'SP',
  stage INTEGER DEFAULT 1, -- 1→7
  score INTEGER,
  priority TEXT, -- 'urgent', 'hot', 'cold'
  signals JSONB, -- sinais detectados
  diagnostic JSONB, -- resultado do POST /api/diagnostic
  proposal JSONB, -- proposta gerada
  contact_status TEXT DEFAULT 'new',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  next_action TEXT,
  notes TEXT,
  tenant_id UUID, -- preenchido quando vira cliente (Stage 7)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- tenants: clientes onboarded
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  plan TEXT DEFAULT 'free', -- free, starter, pro, escala
  mrr INTEGER DEFAULT 0,
  onboarded_at TIMESTAMPTZ,
  churned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- diagnostics: histórico de diagnósticos
CREATE TABLE diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  tenant_id UUID REFERENCES tenants(id),
  score INTEGER NOT NULL,
  cards JSONB NOT NULL,
  tips JSONB NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- contacts: interações CRM
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  type TEXT NOT NULL, -- 'whatsapp', 'email', 'call', 'demo'
  status TEXT, -- 'sent', 'delivered', 'opened', 'replied', 'booked'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. ROADMAP DE IMPLEMENTAÇÃO

### 8.1 JÁ EXISTE

- [x] DataForSEO MCP (9 módulos, 30+ tools) — motor de dados
- [x] 5 pipelines no `pipeline.ts`
- [x] POST /api/diagnostic (JSON simples)
- [x] Tipos TypeScript (types.ts, resultado completo)
- [x] Qdrant + Redis + Embed — infra local
- [x] CLAUDE.md + base-matriz — documentação
- [x] Firecrawl MCP — scrape e map de sites

### 8.2 MVP (2 semanas)

- [ ] Schema Supabase (leads, tenants, diagnostics, contacts)
- [ ] Admin Dashboard Materio (lead pipeline view)
- [ ] Stage 0→7 flow no frontend
- [ ] POST /api/diagnostic → cards renderizados na UI
- [ ] Brand IQ automático (1º esboço)

### 8.3 v0.2 (1 mês)

- [ ] Client Dashboard (score timeline, competitor radar)
- [ ] CRM contact tracking
- [ ] Propostas auto-geradas (Stage 5)
- [ ] Signal Detection Engine
- [ ] OpenAPI spec pública

### 8.4 v1.0 (3 meses)

- [ ] Variance Report (mercado × conta)
- [ ] Billing (Stripe)
- [ ] Multi-tenant completo (RLS)
- [ ] Agent runtime (EVO-API capability executor)
- [ ] MCP server público (adsentice tools)

---

## 9. DOUTRINAS DO FUNIL

1. **Só gasta $ de descoberta em lead com DOR detectável.** Sem sinal = sem gasto.
2. **Stage 0 é FUNDADOR.** O pipeline não escolhe o segmento sozinho.
3. **Proposta cita DADO REAL.** "Seu score é 62/100 porque..." — não é copy de marketing.
4. **CRM-driven, não sales-driven.** A proposta é gerada automaticamente. O founder SÓ fecha.
5. **Admin vê pipeline. Cliente vê ele mesmo.** Visões completamente separadas.
6. **Variance Report = moat.** Ninguém cruza mercado × conta. Nós cruzamos.
7. **Signal stacking > single signal.** 1 sinal = frio. 3+ sinais = urgente.
8. **medido=verdade no CRM também.** Toda ação de contato cita o dado que a motivou.

---

## 10. REFERÊNCIAS

| Fonte | Uso |
|-------|-----|
| marketingagentskills (28 skills) | ICP persona templates · lifecycle campaigns · positioning · product messaging |
| Clay GTM framework | Signal detection · lead scoring · outbound automation |
| Jasper.ai | Brand IQ · agent architecture · pricing model |
| EVO-API (rsxt) | Capability executor · Vault write-ahead · MCP server |
| adsentice-objetivos-solucoes-criterios.md | 5 soluções-core · lead criteria · ticket pricing |
| adsentice-chat-spec.md | Interaction Hub AG-UI spec |
| base-matriz-adsentice.md | Mapa navegável do ecossistema |

---

*Documento v1.0.0 · 2026-07-11 · adsentice CRM + Funil de Leads*
