# Jasper.ai — Análise Competitiva Completa (Eval + Probe)

> 2026-07-11 · Para o adsentice — entender o benchmark de mercado
> Fontes: jasper.ai, developers.jasper.ai, pricing page, MCP server, API docs

---

## 1. O QUE É JASPER.AI

**Jasper é uma plataforma de execução de marketing com IA.** NÃO é gerador de conteúdo — é orquestrador de agentes de marketing com brand intelligence embutida.

### Posicionamento oficial

> "AI infrastructure built for marketing teams" — NÃO um chatbot. Chat é "one entry point into that system, not the system itself."

### 3 Pilares

```
┌──────────────────────────────────────────────────────┐
│                    JASPER.AI                          │
│                                                       │
│  ① AGENTS (100+)                                      │
│  Agentes especializados que executam trabalho real    │
│  de marketing: SEO, campanhas, email, social,         │
│  personalização, pesquisa, tradução                   │
│                                                       │
│  ② CONTENT PIPELINES                                  │
│  Workflows repetíveis: ideia → launch                │
│  Canvas, Grid, AI Studio, Image Pipelines             │
│                                                       │
│  ③ JASPER IQ (camada de inteligência de marca)        │
│  Brand Voice · Style Guide · Visual Guidelines        │
│  Audience Profiles · Product Knowledge · Knowledge Base│
│  → TUDO que é gerado é automaticamente on-brand      │
└──────────────────────────────────────────────────────┘
```

---

## 2. PRICING

| Plano | Preço | Público |
|---|---|---|
| **Pro** | $69/seat/mês (anual: $59) | 1 usuário, 2 Brand Voices, 5 Knowledge Assets, 3 Audiences |
| **Business** | Custom (mín. 12 meses) | API access, SSO, unlimited tudo, Custom AI Agents, Grid, Studio |

**Sem free tier.** Apenas trial de 7 dias no Pro.

Diferencial do Business: API access (`api.jasper.ai`), MCP server, custom agents, SSO/SAML, SCIM, Image Suite avançada.

---

## 3. API — O QUE ELES EXPÕEM

### 3.1 Estrutura da API

```
Base: https://api.jasper.ai
Auth: X-API-KEY header (Admin ou Developer role)
Rate limit: por workspace
```

### 3.2 Endpoints (14 recursos, ~45 operações)

| Recurso | Operações | Descrição |
|---|---|---|
| **Commands** | `POST /v1/commands/run` | Geração de conteúdo por prompt + contexto |
| **Agent Tasks** | `GET /v1/tasks`, `GET /v1/tasks/{id}`, `POST /v1/tasks/{id}/run` (+ SSE streaming) | Executar agentes de marketing |
| **Knowledge** | CRUD + `POST /v1/knowledge/search` | Base de conhecimento com busca semântica |
| **Voices** | CRUD | Vozes de marca (tons) |
| **Style Guides** | `GET` | Guias de estilo |
| **Audiences** | `GET` | Perfis de audiência |
| **Documents** | CRUD | Documentos no workspace |
| **Images** | 10 endpoints | remove-bg, replace-bg, cleanup, remove-text, upscale, uncrop, packshot, decompose, alt-text, analyze |
| **Image Templates** | CRUD + render | Templates de imagem com renderização dinâmica |
| **Projects** | CRUD | Projetos |
| **Templates** | `GET`, `GET /{id}`, `POST /{id}/run` | Templates de conteúdo |
| **Attachments** | `POST /v1/attachments` | Arquivos temporários para contexto de agentes |
| **Users** | `GET` | Usuários do workspace |
| **Usage** | `GET /v1/usage` | Estatísticas de uso da API |

### 3.3 MCP Server (7 tools)

```
https://mcp.jasper.ai  (remote MCP · OAuth)

① get-jasper-brand-voices     → vozes de marca do workspace
② get-jasper-audiences        → audiências configuradas
③ search-knowledge-base       → busca semântica na base de conhecimento
④ get-jasper-style-guides     → guias de estilo
⑤ get-jasper-agents           → lista de agentes disponíveis
⑥ run-jasper-agent            → executa um agente de marketing
⑦ generate-content            → gera conteúdo on-brand
```

### 3.4 Integrações

- **No-code:** Zapier, Make.com
- **Código:** Postman Collection, MCP (Claude, ChatGPT, Copilot Studio, OpenAI Agent Builder, n8n)
- **Low-code:** Webflow, Google Docs, Slack, BigQuery, Google Sheets
- **Browser extension**

---

## 4. EVAL — O QUE O JASPER FAZ BEM (E O QUE NÃO FAZ)

### 4.1 Forças (o que copiar)

| Força | Como fazem | Aplicar no adsentice |
|---|---|---|
| **Brand IQ automático** | Toda geração automaticamente aplica voz, estilo, audiência | adsentice: todo diagnóstico aplica o contexto do negócio do cliente |
| **Knowledge Base com busca semântica** | `POST /v1/knowledge/search` — "meaning and context, not just exact keyword matches" | Nosso vault + rsxt-v0 JÁ FAZEM ISSO. Só wire no dashboard |
| **Agentes especialistas (100+)** | Cada agente = 1 job de marketing específico | Nossos 8 eixos do Stage 3 = 8 agentes. Já temos os caps |
| **MCP server como porta de entrada** | Qualquer AI tool conecta e usa Jasper | Nosso `/mcp` no :7700 já existe! + OpenAPI 3.1 |
| **Créditos/gate de uso** | API access só no Business ($custom), rate limit por workspace | Nosso spend-cap por tenant é MAIS sofisticado |
| **SSE streaming** | `POST /v1/tasks/{id}/run` com SSE para real-time | Podemos adicionar no diagnóstico: score aparece em tempo real |
| **Image Suite empresarial** | 10 endpoints de manipulação de imagem | Não é nosso foco. Usar APIs de terceiros se necessário |

### 4.2 Fraquezas (onde o adsentice GANHA)

| Fraqueza do Jasper | Oportunidade adsentice |
|---|---|
| **Gera conteúdo, não analisa mercado** | Nós analisamos DADOS REAIS (DataForSEO). Eles não têm 1 endpoint de keyword research |
| **Zero inteligência de concorrência** | `domain.competitors` + `domain.keyword_gap` — nosso MOAT |
| **Zero dados de busca real** | Eles não sabem o volume de "dentista perto de mim". Nós sabemos |
| **Zero reputação/reviews** | `business.reviews.google` — eles não têm |
| **Zero GMB** | `business.profile.gmb` — eles não têm |
| **Caro ($69/seat mínimo)** | Nós podemos cobrar R$47-197 com ticket acessível |
| **Foco enterprise (B2B médio-grande)** | SMB brasileiro é um oceano azul que eles ignoram |
| **Não tem audit trail** | Nosso WORM + vault é enterprise-grade |
| **Não tem sandbox** | Diagnóstico grátis com dados reais vs trial de 7 dias |
| **Geração cega** | Eles geram o que você pede. Nós DESCOBRIMOS o que você precisa |

---

## 5. PROBE — O QUE DETECTAMOS DA ARQUITETURA DELES

### 5.1 Stack inferido

```
Frontend: Next.js (detectado nos data attributes)
API: REST (api.jasper.ai/v1/*) — provavelmente Node.js/TypeScript
MCP: Servidor remoto (mcp.jasper.ai) — OAuth
Auth: API Keys + OAuth (MCP)
DB: Desconhecido (provavelmente Postgres)
AI: LLM-agnostic (multi-model routing)
Infra: AWS/GCP (não detectável)
```

### 5.2 O que o probe revela

| Sinal | Evidência |
|---|---|
| **API é recente** | Endpoints `/v1/` — primeira versão pública |
| **MCP é wrapper da REST** | As 7 tools do MCP espelham os endpoints REST |
| **Brand IQ é o diferencial** | 5 endpoints dedicados (voices, style-guides, audiences, knowledge, knowledge/search) |
| **Foco em imagem é grande** | 10 endpoints de manipulação de imagem — sugere cliente e-commerce |
| **Enterprise-first** | Business plan mínimo 12 meses, SSO, SCIM, RBAC — não querem SMB |
| **API não é self-serve** | Precisa falar com vendas (Business plan). Não tem "comece agora com $10" |

### 5.3 Limitações detectadas

- ❌ Sem endpoint de analytics/metrics de conteúdo (só `/v1/usage` básico)
- ❌ Sem endpoint de SEO/keyword research
- ❌ Sem endpoint de competitor analysis
- ❌ Sem endpoint de reputação/reviews
- ❌ Sem endpoint de GMB/local
- ❌ Sem webhook/eventos
- ❌ Rate limits não documentados publicamente

---

## 6. COMPARAÇÃO LADO A LADO

| Dimensão | Jasper.ai | adsentice (alvo) |
|---|---|---|
| **Categoria** | Plataforma de execução de marketing | Plataforma de inteligência de mercado |
| **Gera** | Conteúdo (copy, imagem, SEO) | Diagnóstico, estratégia, plano de ação |
| **Dados** | Zero dados de mercado | DataForSEO (73 caps, 48 translators) |
| **Público** | Enterprise marketing teams | SMB brasileiro (dono do negócio) |
| **Preço** | $69/seat/mês (mín.) | R$47-197/mês |
| **API** | 14 recursos, ~45 endpoints | 5 canais (MCP + REST + Brain + k0 + Web) |
| **Onboarding** | Trial 7 dias | Diagnóstico grátis eterno (wedge) |
| **Brand context** | Jasper IQ (manual) | Descoberta automática do negócio |
| **Concorrência** | Não tem | domain.competitors (MOAT) |
| **Reputação** | Não tem | business.reviews + GMB |
| **Audit trail** | Não tem | WORM + hash-chain + vault |
| **Sandbox** | Não tem | $0 sandbox + live gated |
| **Multi-tenant** | Workspace (enterprise) | RLS por tenant (nativo) |
| **MCP Server** | ✅ 7 tools | ✅ (já existe no :7700) |
| **OpenAPI** | ✅ llms.txt | ✅ OpenAPI 3.1 (73 caps) |

---

## 7. ESTRATÉGIA — O QUE O ADSENTICE DEVE SER

### 7.1 O posicionamento (derivado do Jasper)

> **"Jasper gera o conteúdo. adsentice diz O QUE gerar — e prova com dados."**

```
Jasper.ai:
  Você sabe o que quer → Jasper executa (gera copy, imagem, SEO)
  
adsentice:
  Você NÃO sabe o que quer → adsentice DESCOBRE (analisa mercado,
  detecta gaps, prioriza) → se quiser, conecta no Jasper pra executar
```

### 7.2 A arquitetura-alvo (inspirada no Jasper, com nosso MOAT)

```
┌──────────────────────────────────────────────────────────┐
│  ADSENTICE (Next.js · Vercel · Supabase · Railway)       │
│                                                           │
│  ① DISCOVERY ENGINE (automático)                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Cliente coloca URL → pipeline descobre TUDO:      │   │
│  │ • Site: on_page.lighthouse, domain.technologies   │   │
│  │ • GMB: business.profile.gmb                        │   │
│  │ • SEO: keyword.research, serp.organic              │   │
│  │ • Reviews: business.reviews.google                 │   │
│  │ • Concorrentes: domain.competitors                 │   │
│  │ • Ads: serp.ads_advertisers, ads.traffic_forecast  │   │
│  │ • Social: Instagram, Facebook (web scraping)       │   │
│  │ → Vault: salva descoberta (R2 + Postgres)          │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ② BRAND IQ (automático · derivado do Jasper IQ)         │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Detectado automaticamente (não configurado):       │   │
│  │ • Nicho: clínica estética, restaurante, etc        │   │
│  │ • Tom: profissional, acolhedor, técnico            │   │
│  │ • Audiência: quem busca "dentista perto de mim"    │   │
│  │ • Intents: "quero mais pacientes", "não apareço"   │   │
│  │ → NADA é perguntado. TUDO é descoberto.            │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ③ STRATEGY ENGINE (credit-gated)                        │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Tips grátis ($0):                                  │   │
│  │  💡 Site lento (48/100). Isso afeta o Google.     │   │
│  │  💡 3 reviews negativas sem resposta este mês.    │   │
│  │  💡 "dentista perto de mim" = 2.900 buscas/mês.  │   │
│  │                                                    │   │
│  │ Deep-dive (créditos):                              │   │
│  │  📊 Análise de concorrentes (5 créditos)           │   │
│  │  📊 Estratégia SEO local (10 créditos)             │   │
│  │  📊 Plano de reviews (3 créditos)                  │   │
│  │  📊 Auditoria técnica completa (8 créditos)        │   │
│  │  📊 Estratégia de anúncios (15 créditos)           │   │
│  │                                                    │   │
│  │ Plano Pro (R$197/mês · créditos ilimitados):      │   │
│  │  🔄 Monitoramento contínuo                         │   │
│  │  🔄 Alertas automáticos                            │   │
│  │  🔄 Relatório mensal                               │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ④ EXECUTION (opcional · integração Jasper)              │
│  ┌───────────────────────────────────────────────────┐   │
│  │ Se o cliente quiser EXECUTAR a estratégia:         │   │
│  │ → Conecta no Jasper (MCP) pra gerar conteúdo       │   │
│  │ → Conecta no Google Ads (OAuth) pra rodar anúncios │   │
│  │ → adsentice MONITORA o resultado (Variance Report) │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 7.3 O MOAT (o que o Jasper NUNCA vai ter)

```
┌────────────────────────────────────────────────────────┐
│  1. INTELIGÊNCIA DE MERCADO REAL                        │
│     DataForSEO 73 caps → dado que o Jasper não tem     │
│                                                         │
│  2. DESCOBERTA AUTOMÁTICA                               │
│     Jasper: você configura Brand IQ manualmente         │
│     adsentice: a plataforma DESCOBRE sozinha            │
│                                                         │
│  3. SENTINELA RECORRENTE                                │
│     Jasper: você pede → ele gera (stateless)            │
│     adsentice: monitora 24/7 e AVISA quando algo muda   │
│                                                         │
│  4. AUDIT TRAIL IMOBILIÁRIO                             │
│     Jasper: sem rastreabilidade                         │
│     adsentice: WORM + hash-chain (enterprise compliance)│
│                                                         │
│  5. PREÇO ACESSÍVEL                                     │
│     Jasper: $69/seat (mínimo)                           │
│     adsentice: R$47-197 com diagnóstico grátis eterno   │
│                                                         │
│  6. MERCADO BRASILEIRO                                  │
│     Jasper: inglês, foco US/enterprise                  │
│     adsentice: pt-BR, SMB local, dados de busca BR      │
└────────────────────────────────────────────────────────┘
```

---

## 8. PLANO DE EXECUÇÃO (O QUE CONSTRUIR AGORA)

### MVP · 4 semanas

| Semana | O que construir | Referência Jasper |
|---|---|---|
| **1** | `POST /api/businesses` — Pipeline de Discovery. Cliente coloca URL → 6 pipelines rodam → visão geral + 3 tips. DataForSEO MCP oficial. | Equivalente ao Jasper IQ, mas automático |
| **2** | `POST /api/businesses/:id/analyze` — Credit-gated deep dive. Sistema de créditos no Supabase. Spend-cap por tenant. | Equivalente ao `POST /v1/tasks/{id}/run` |
| **3** | Brand IQ automático — detecção de nicho, tom, audiência, intents. NADA perguntado. TUDO derivado dos dados. | Feature que o Jasper NÃO tem |
| **4** | Dashboard: negócio cadastrado, score real, tips, créditos. CTA de upgrade. | Similar ao Dashboard do Jasper |

### Mês 2-3

- Stripe + fluxo de compra self-serve
- Planos: Free (3 tips), Starter (R$47), Pro (R$197), Escala (R$497)
- Variance Report MVP (só lado mercado)
- CLIENT dashboard com monitoramento

---

## 9. REFERÊNCIAS

- Jasper.ai: `https://www.jasper.ai/`
- Pricing: `https://www.jasper.ai/pricing`
- API Docs: `https://developers.jasper.ai/docs/getting-started-1`
- API Reference: `https://developers.jasper.ai/llms.txt`
- MCP Server: `https://mcp.jasper.ai`
- MCP Docs: `https://developers.jasper.ai/docs/jasper-mcp-server`

---

*Análise gerada em 2026-07-11 · Eval + Probe do Jasper.ai para o adsentice*
