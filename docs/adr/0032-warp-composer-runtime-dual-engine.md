# ADR-0032 · Warp Composer Runtime — Motor Dual de Geração de Superfícies

**Status:** proposed
**Date:** 2026-07-17
**Deciders:** founder, claude
**Extends:** ADR-0018 (Warp Family), ADR-0030 (Intelligence Runtime), ADR-0031 (Surface Dashboard)
**Supersedes:** none

## Contexto

O adsentice possui dois públicos com necessidades radicalmente diferentes:

| Público | O que precisa | Superfícies |
|---------|--------------|-------------|
| **adsentice (nós)** | Provar que o sistema funciona, fechar vendas, gerenciar operação | S3 Admin, S10 Raio-X, S15 Cockpit, S4 Pricing |
| **Cliente SMB** | Atrair pacientes, aparecer no Google, vender mais | S9 Portal, S11 Landing Page, S12 WhatsApp, S14 Onboarding |

**O insight fundamental:** tudo que geramos para o cliente, **geramos primeiro para nós mesmos**. O Raio-X que entregamos pra Dra. Karina é o MESMO pipeline que usamos para prospectar. A Landing Page que geramos pro cliente é a MESMA engine que usamos no nosso site. Isso é **dogfooding** — o adsentice é o cliente zero de cada superfície.

**O problema atual:** as superfícies são geradas manualmente ou semi-automaticamente. O S10 tem pipeline mas não está integrado ao fluxo de conversão. O S11 não existe como código. O S9 é um conceito no papel. Não há um **motor unificado** que receba um trigger, consulte as fontes de dados, aplique as skills de marketing e produza a superfície final.

## Decisão

Implementar o **Warp Composer Runtime** — um motor dual que gera superfícies tanto para o adsentice (modo INTERNAL) quanto para o cliente (modo CLIENT), usando as mesmas engines, os mesmos dados e as mesmas skills.

### Dogfooding: o ciclo adsentice → cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADSENTICE DOGFOOD CYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ADSENTICE USA PRIMEIRO                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Usamos S10 Raio-X para prospectar                         │  │
│  │   → Geramos 30 previews da Dra. Karina                    │  │
│  │   → Validamos que o copy converte                         │  │
│  │   → Validamos que os tokens ficam bons                    │  │
│  │   → Medimos taxa de abertura/resposta                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  2. PROVAMOS QUE FUNCIONA                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ "Olha Dra. Karina — foi assim que eu encontrei você.      │  │
│  │  Agora imagina seus pacientes te encontrando assim."      │  │
│  │                                                           │  │
│  │ Pitch fecha porque:                                        │  │
│  │   ✅ O Raio-X é GRÁTIS (ela já recebeu)                   │  │
│  │   ✅ O Raio-X tem DADOS REAIS (score, gaps, concorrentes) │  │
│  │   ✅ Nós USAMOS o que vendemos (credibilidade)            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  3. CLIENTE RECEBE O MESMO (white-label)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ S9 Portal: dashboard white-label com métricas dela        │  │
│  │ S11 Landing Page: site one-page com copy personalizada    │  │
│  │ S10 Relatório: mesmo Raio-X, agora com branding dela      │  │
│  │                                                           │  │
│  │ ENGINE É A MESMA. Só muda:                                │  │
│  │   🔵 INTERNAL: branding adsentice, dados internos         │  │
│  │   🟢 CLIENT: white-label, dados do cliente                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Arquitetura do Composer Runtime

```
┌─────────────────────────────────────────────────────────────────┐
│                   WARP COMPOSER RUNTIME                           │
│                   Engine Dual: INTERNAL + CLIENT                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGER LAYER (eventos que disparam geração)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  ADSENTICE (INTERNAL):                                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Lead novo (L0)                  → S10 Raio-X auto   │  │  │
│  │  │ Pre-flight ES completo          → S15 Cockpit TOP-K │  │  │
│  │  │ Batch parcial concluído         → S3 Pipeline update│  │  │
│  │  │ Cliente atinge score > 70       → S4 Upsell trigger │  │  │
│  │  │ Novo mês (cron)                 → Relatório Mensal  │  │  │
│  │  │ A/B test significativo          → Auto-apply winner │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  CLIENTE (CLIENT):                                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Onboarding completo             → S11 Landing Page   │  │  │
│  │  │ Novo paciente via S12 WhatsApp  → S9 update metrics  │  │  │
│  │  │ 30 dias de Sentinela            → Relatório Mensal   │  │  │
│  │  │ Upgrade para Domínio (R$497)    → S15 Cockpit + L2   │  │  │
│  │  │ Review nova no GMB              → S9 alerta + S12    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  DATA LAYER (fontes de verdade)                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  INTERNAL:                                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Supabase (discovery_listings, market_holds)          │  │  │
│  │  │ Pre-flight data (total_count, quality signals)       │  │  │
│  │  │ Redis (cost tracking, session state)                 │  │  │
│  │  │ Scoring Engine (scores, Schwartz, gaps)              │  │  │
│  │  │ IBGE (população, PIB, densidade)                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  CLIENTE (subconjunto do INTERNAL + dados próprios):       │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ GMB profile (L1) — dados do próprio estabelecimento  │  │  │
│  │  │ L2 audit — SEO do site do cliente                    │  │  │
│  │  │ L3 social — redes sociais do cliente                 │  │  │
│  │  │ Reviews — avaliações reais dos pacientes             │  │  │
│  │  │ Competitors — concorrentes locais                    │  │  │
│  │  │ CRM — leads capturados, agendamentos, follow-ups     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  INTELLIGENCE LAYER (o cérebro)                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Qdrant → 59 skills frameworks (marketing KG)             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Perfil do lead → skills ativadas                     │  │  │
│  │  │                                                     │  │  │
│  │  │ Lead NÃO reivindicado + sem site:                    │  │  │
│  │  │   → prospecting (como prospectar)                    │  │  │
│  │  │   → psychology (gatilhos mentais)                    │  │  │
│  │  │   → sales-enablement (battle card)                   │  │  │
│  │  │                                                     │  │  │
│  │  │ Cliente convertido (Sentinela R$197):                │  │  │
│  │  │   → local-seo (otimização GMB)                       │  │  │
│  │  │   → content-strategy (blog, redes sociais)           │  │  │
│  │  │   → review-generation (pedir avaliações)             │  │  │
│  │  │   → churn-prevention (métricas de retenção)          │  │  │
│  │  │                                                     │  │  │
│  │  │ Cliente upgrade (Domínio R$497):                     │  │  │
│  │  │   → competitor-profiling (análise competitiva)       │  │  │
│  │  │   → programmatic-seo (SEO em escala)                 │  │  │
│  │  │   → analytics (dashboards avançados)                 │  │  │
│  │  │   → marketing-plan (roadmap 90 dias)                 │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  DeepSeek V4 → Copywriter                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ INTERNAL: headline de prospecção, CTA, pitch          │  │  │
│  │  │ CLIENT: headline do site, descrição de serviços,     │  │  │
│  │  │         posts de blog, respostas de WhatsApp         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  Scoring Engine → Classificação                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Schwartz level → tom de voz, urgência, prova social  │  │  │
│  │  │ ADR-0030 5D → prioridade de prospecção              │  │  │
│  │  │ Gaps detectados → argumentos de venda                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  COMPOSER LAYER (M4 + M9 — geração da superfície)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  M9 TOKENS COMPOSER — Morph por Intent                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ INPUT: Segmento + Plano + Schwartz + Nicho            │  │  │
│  │  │                                                       │  │  │
│  │  │ Dentista · Sentinela · Solution Aware:                │  │  │
│  │  │   🔵 paleta: Azul clínico 220deg · OKLCH              │  │  │
│  │  │   🔤 tipo: Inter · 65ch · 1.5 line-height            │  │  │
│  │  │   📐 spacing: md · 1.5rem grid                        │  │  │
│  │  │   🎯 motion: zero (saúde = confiança, não distração) │  │  │
│  │  │   🔘 radius: md · 0.75rem                             │  │  │
│  │  │                                                       │  │  │
│  │  │ Restaurante · Sentinela · Problem Aware:              │  │  │
│  │  │   🟠 paleta: Terracota 25deg · OKLCH                  │  │  │
│  │  │   🔤 tipo: Inter · 65ch · 1.5 line-height             │  │  │
│  │  │   📐 spacing: sm · 1rem grid (denso = fotos)          │  │  │
│  │  │   🎯 motion: scroll reveal (apetite visual)           │  │  │
│  │  │   🔘 radius: md · 0.75rem                             │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  M4 HTML COMPOSER — Template + Tokens = Superfície         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 1. Seleciona TEMPLATE base (S10, S11, S9, etc)       │  │  │
│  │  │ 2. Injeta TOKENS via CSS custom properties            │  │  │
│  │  │ 3. Injeta COPY via DeepSeek (headline, CTA, body)     │  │  │
│  │  │ 4. Injeta DADOS via Supabase (score, gaps, reviews)   │  │  │
│  │  │ 5. Injeta DESIGN via Qdrant (inspiração COM FILTRO)   │  │  │
│  │  │ 6. Aplica BRANDING (adsentice ou white-label)         │  │  │
│  │  │ 7. Renderiza HTML final                                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  TELEMETRY LAYER (M6 — ciclo de melhoria contínua)               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  A/B Testing:                                              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ S11 Landing Versão A (controle):                      │  │  │
│  │  │   Headline: "Dra. Karina — Periodontista em Vitória"  │  │  │
│  │  │   CTA: "Agende sua consulta"                          │  │  │
│  │  │   Conversão: 2.3%                                     │  │  │
│  │  │                                                       │  │  │
│  │  │ S11 Landing Versão B (teste):                         │  │  │
│  │  │   Headline: "Seu sorriso merece um especialista       │  │  │
│  │  │              — 4.9★ no Google"                        │  │  │
│  │  │   CTA: "1ª avaliação gratuita → WhatsApp"             │  │  │
│  │  │   Conversão: 4.1% (+78%)                              │  │  │
│  │  │                                                       │  │  │
│  │  │ → Sistema detecta Variação B vence                    │  │  │
│  │  │ → Auto-apply para próximos leads do mesmo nicho       │  │  │
│  │  │ → Feedback loop fecha: dados → superfície → telemetry │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  Heatmap + Psicologia de Cores:                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Trackeia: scroll depth, clique em CTA, tempo na página│  │  │
│  │  │ Detecta: CTA azul (220deg) → 3.1% conversão           │  │  │
│  │  │          CTA verde (160deg) → 2.1% conversão          │  │  │
│  │  │          CTA laranja (25deg) → 4.7% conversão         │  │  │
│  │  │                                                       │  │  │
│  │  │ → Laranja vence para Dentista? Não era o esperado.    │  │  │
│  │  │ → Sistema aprende: Dentista responde a urgência.      │  │  │
│  │  │ → Atualiza token de CTA para o segmento Saúde.        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Catálogo de Superfícies — Modo DUAL

| Superfície | Modo INTERNAL (adsentice) | Modo CLIENT (white-label) |
|-----------|--------------------------|---------------------------|
| **S10 Raio-X** | Prospecção: "Seu consultório não aparece no Google" | Lead magnet: "Veja como seus pacientes te encontram" |
| **S11 Landing Page** | Nosso site de vendas (pricing, cases) | Site one-page do cliente com agendamento |
| **S9 Portal** | Admin dashboard (já existe) | Portal white-label: métricas, leads, relatórios |
| **S12 WhatsApp** | Bot de prospecção automática | Atendimento automático de pacientes |
| **S4 Pricing** | Nossa página de planos | Página de upgrade do cliente ("Desbloqueie o Domínio") |
| **S15 Cockpit** | Visão multi-tenant (todos clientes) | Visão multi-unidade (franquias, filiais) |
| **S3 Admin** | Gestão operacional adsentice | — (não aplicável ao cliente) |
| **S14 Onboarding** | Setup interno de novo cliente | Wizard de configuração que o cliente preenche |
| **S2 Blog** | Blog adsentice (SEO próprio) | Blog do cliente (posts gerados via content-strategy) |
| **Relatório Mensal** | Métricas internas de performance | Relatório entregue ao cliente (PDF + S9 dashboard) |

### Triggers — O que dispara cada geração

| Evento | Modo | Superfície gerada | Frequência |
|--------|:---:|------|:---:|
| Lead novo capturado (L0) | INTERNAL | S10 Raio-X + battle card | Por lead |
| Pre-flight estado completo | INTERNAL | S15 Cockpit TOP-K | Por estado |
| Cliente onboarded | CLIENT | S11 Landing Page + S14 Wizard | Uma vez |
| 30 dias de Sentinela | CLIENT | Relatório Mensal + S9 update | Mensal |
| Score sobe > 70 | INTERNAL | S4 Upsell trigger | Por lead |
| Cliente faz upgrade | CLIENT | S15 Cockpit + L2 completo | Por upgrade |
| Review nova no GMB | CLIENT | S9 alerta + S12 resposta | Por review |
| A/B test significativo | AMBOS | Auto-apply winning variant | Por teste |

### Métricas de Sucesso por Superfície

| Superfície | Métrica INTERNAL | Métrica CLIENT |
|-----------|-----------------|----------------|
| S10 Raio-X | Taxa de abertura do lead magnet | Taxa de conversão do paciente |
| S11 Landing Page | Taxa de conversão do nosso site | Agendamentos/mês via site |
| S9 Portal | Tempo de uso do admin | Tempo de uso do portal |
| S12 WhatsApp | Leads respondidos automaticamente | Pacientes atendidos via bot |
| S4 Pricing | Upgrade rate (R$0→R$197→R$497) | — (não aplicável) |
| Relatório Mensal | Churn rate | Satisfação (NPS) |

## Implementação

### Nível 1: Unificar M4 + M9 no Composer Core

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1.1 | `packages/warp/src/composer-core.ts` (NOVO) | Interface unificada: `compose(params: ComposeParams) → RenderedSurface` |
| 1.2 | `packages/warp/src/composer-core.ts` | `ComposeParams` — { mode, surface, lead, plan, segment, tokens, copy, branding } |
| 1.3 | `packages/warp/src/s10-raio-x.ts` | Refatorar para usar `compose()` |

### Nível 2: Composer API + Trigger System

| Passo | Arquivo | Ação |
|-------|---------|------|
| 2.1 | `api/surface/compose/route.ts` (NOVO) | `POST /api/surface/compose` — { surface, mode, lead_id } → HTML |
| 2.2 | `lib/surface-triggers.ts` (NOVO) | Sistema de triggers: evento → superfície gerada |
| 2.3 | `api/surface/compose/route.ts` | Modo INTERNAL → branding adsentice. Modo CLIENT → white-label |

### Nível 3: Landing Page Auto (S11)

| Passo | Arquivo | Ação |
|-------|---------|------|
| 3.1 | `packages/warp/src/s11-landing.ts` (NOVO) | Template S11 com tokens do segmento + copy DeepSeek |
| 3.2 | `api/surface/compose/route.ts` | Wire S11 no composer: surface=s11, mode=client |

### Nível 4: A/B Testing + Telemetry

| Passo | Arquivo | Ação |
|-------|---------|------|
| 4.1 | `lib/surface-telemetry.ts` (NOVO) | Track: views, clicks, conversions, scroll depth, heatmap |
| 4.2 | `lib/surface-ab-test.ts` (NOVO) | Gerenciar variantes, significância estatística, auto-apply |

### Nível 5: Cockpit TOP-K (S15)

| Passo | Arquivo | Ação |
|-------|---------|------|
| 5.1 | `packages/warp/src/s15-cockpit.ts` (NOVO) | Dashboard multi-tenant (INTERNAL) / multi-unidade (CLIENT) |
| 5.2 | `admin/surface/page.tsx` | Wire S15 no admin como aba do Surface Dashboard |

### Nível 6: Dogfooding completo

| Passo | Arquivo | Ação |
|-------|---------|------|
| 6.1 | `api/surface/compose/route.ts` | Modo DEMO: gerar superfície de cliente usando dados do adsentice como exemplo |
| 6.2 | `solutions/page.tsx` | Adicionar "Ver Exemplo Real" em cada plano — link para preview gerada |

## Custos

| Componente | Custo |
|------------|:---:|
| Composer Core (TypeScript, server-side) | $0 |
| DeepSeek V4 (copywriter) | $0.0001/request |
| Qdrant queries | $0 (local) |
| Supabase reads | $0 (free tier) |
| A/B testing infrastructure | $0 (Redis + custom logic) |
| **Total operacional** | **~$0.0001/superfície gerada** |

## Referências

- `packages/warp/src/s10-raio-x.ts` — S10 Raio-X (455 linhas, pipeline completo)
- `packages/warp/src/tokens-composer.ts` — M9 Tokens Composer (morph por segmento)
- `packages/warp/src/4-composer.ts` — M4 HTML Composer (estrutura semântica)
- `packages/warp/src/6-telemetry.ts` — M6 Telemetry (tracking de uso)
- `packages/warp/src/8-agents.ts` — M8 Agent System (LLM agents)
- `docs/spec/warp-surfaces-marketing-skills-matrix.md` — 22 superfícies × skills × tokens
- `docs/adr/0018-warp-family-design-system-semantico.md` — Família Warp M1-M9
- `docs/adr/0030-adsentice-intelligence-runtime-capture-engine.md` — Intelligence Runtime
- `docs/adr/0031-admin-surface-warp-family-dashboard.md` — Surface Dashboard
- `vendor/marketingskills/` + `vendor/advertising-skills/` — 59 skills
