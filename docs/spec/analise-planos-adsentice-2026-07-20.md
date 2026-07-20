# 🎯 ADSENTICE · Análise dos 5 Planos · SPEC vs REALIDADE

**Data:** 2026-07-20 · **Método:** DAG 5-passos · **Fontes:** warp-composer.ts (2,200 linhas), 22 superfícies Warp, 20 migrations, 7 brain modules, 17 L2b modules, 832 marketing skills

---

## Visão Geral

```
Plano           Preço       Pronto    Superfícies        O que entrega HOJE
─────────────────────────────────────────────────────────────────────────────
Raio-X          R$0         80%       S10 live ✅         Score + Schwartz + 3 gaps
Sentinela       R$197/mês   60%       S11 live ✅         LP personalizada + Brand DNA + QG
Domínio         R$497/mês   15%       S11 + dados L4/L5   Só o que herda do Sentinela
Escala          R$997/mês    5%       S7/S15 planned      Nada automatizado
Growth OS       R$1.497/mês  0%       S9/S3               Zero infra multi-tenant
```

---

## 1. Raio-X · R$0 · 80% pronto

### O que promete
> "Diagnóstico de 1 página com score composto, nível Schwartz, TOP 3 gaps detectados. Dados reais do Google Meu Negócio + Lighthouse + CMS detection."

### O que EXISTE

| Componente | Status | Evidência |
|-----------|--------|-----------|
| `composeS10()` | ✅ vivo | `warp-composer.ts:1293` · 12 usos no arquivo |
| `composeS10_BLUE()` | ✅ vivo | `warp-composer.ts:648` · pipeline L0-L6 completo |
| S10 surface | ✅ live | `warp-surface-status.json:S10` · route `/s10-raio-x/[place_id]` |
| Score composto | ✅ vivo | `scoring.ts` · Fit×0.40 + Eng×0.35 + Intent×0.25 |
| Schwartz | ✅ vivo | 5 níveis com labels, cores, ações |
| CMS detection | ✅ vivo | `l2_cms` column · L2b parser |
| Lighthouse | ✅ vivo | `l2_lighthouse_performance/a11y/seo` columns |
| QG gate | ✅ vivo | `applyQualityGate()` · 33 Unslop patterns |
| R2 vault | ✅ vivo | `vaultWriteBatch()` · blob imutável |
| Preview HTML | ✅ vivo | `s10-raio-x/[place_id]/route.ts` · 0.54-0.80s |

### O que FALTA (20%)

| Gap | Impacto |
|-----|---------|
| **Volume:** 4 artifacts gerados para 8,626 leads | 0.05% de penetração |
| **Distribuição:** sem WhatsApp/Email automático | Ninguém recebe o Raio-X |
| **Tracking:** sem `raiox_sent` real por lead | Não sabemos quem recebeu |

### Veredito
**Raio-X é o plano mais maduro.** O motor funciona. O gap é **distribuição e volume**, não tecnologia. Precisamos de um sistema de envio (WhatsApp/Email) e tracking de entrega.

---

## 2. Sentinela · R$197/mês · 60% pronto

### O que promete
> "Landing Page com dados REAIS da clínica. Brand DNA (cores+fontes), SEO real, copy personalizada. Monitoramento mensal do score."

### O que EXISTE

| Componente | Status | Evidência |
|-----------|--------|-----------|
| `composeS11()` | ✅ vivo | `warp-composer.ts:1944` · 2,200 linhas |
| S11 surface | ✅ live | `warp-surface-status.json:S11` · route `/s11-landing/[place_id]` |
| A/B testing | ✅ vivo | 2 variantes por estratégia · `S11Variant[]` |
| Strategy Resolver | ✅ vivo | Noisy-OR · 10 frameworks · 20 sections · 20 CMS |
| Brand DNA | ✅ vivo | `segmentPalette()` · cores, fontes, spacing do IBGE |
| L2b crawler | ✅ vivo | 17 módulos · `enrichS11L2b()` · site real do lead |
| Quality Gate | ✅ vivo | `applyQualityGate()` · 33 Unslop patterns |
| Skills wireadas | ✅ 6/6 | local-seo, objection-crusher, whatsapp-business, marketing-plan, social, google-ads |
| Brain modules | ✅ 11/11 | b3-decide, c0-interpreter, c1-retriever, d1-grounding, semantic-registry, etc. |
| SEO extract | ✅ vivo | `extractSEOKeywords()` · keywords + meta title |
| Objections | ✅ vivo | `extractObjections()` · objeções + respostas |
| Marketing Plan | ✅ vivo | `extractMarketingPlanSections()` · seções do plano |
| Social Calendar | ✅ vivo | `extractSocialCalendar()` · posts/semana, plataformas, hashtags |
| Ads Insights | ✅ vivo | `extractAdsInsights()` · campanhas, budget, keywords |
| s11_events | ⚠️ 2 | Só 2 eventos registrados no banco |

### O que FALTA (40%)

| Gap | Impacto | Como resolver |
|-----|---------|---------------|
| **Monitoramento mensal** automático | Cliente paga R$197 mas ninguém monitora | Cron job: re-score leads a cada 30 dias, gerar diff report |
| **Alertas** ("score caiu, concorrente abriu") | Zero alertas implementados | `pushAlert()` já existe em telemetry.ts — wire no S11 |
| **Recomendações priorizadas** (3/mês) | `recommendEngine` existe mas não prioriza por lead | Wire `recommendEngine` + `rankLeadsByAction()` (ADR-0052) |
| **Tracking de entrega** | Não sabemos se o cliente recebeu a LP | `s11_events` existe mas ninguém escreve nele |
| **Kim Barrett 12 skills** | Não wireadas | Ingerir + wire no composeS11 |
| **Follow-up automatizado** (D+1, D+3, D+7) | Canais listados mas não automatizados | CRM S4-S7 |

### Veredito
**Sentinela é o produto viável.** O motor de geração (composeS11) é robusto — 11/11 brain modules, 6/6 skills, A/B, QG. O gap é **operação**: monitoramento, alertas, follow-up. O cliente recebe a LP, mas ninguém cuida dela depois.

---

## 3. Domínio · R$497/mês · 15% pronto

### O que promete
> "TUDO do Sentinela + Contexto IBGE (renda, PIB) + CNPJ validado + Radar de Mercado contínuo + Channel Health Matrix + Benchmark comparativo."

### O que EXISTE

| Componente | Status | Evidência |
|-----------|--------|-----------|
| IBGE dados | ✅ no banco | `ibge_panorama` (419 municípios, 14 colunas) · `ibge_income` (27 rows) |
| IBGE no composer | ⚠️ parcial | Só `segmentPalette()` usa densidade/PIB/área para cores |
| CNPJ dados | ✅ no banco | `cnpj_queue` table · `cnpj_enriched` column · `cnpj_data` JSON |
| CNPJ no composer | ❌ não wireado | Zero referências a CNPJ em `composeS11()` |
| Benchmark | ⚠️ API existe | `/api/competitive-benchmark` · não wireado no composer |

### O que FALTA (85%)

| Gap | Impacto | Como resolver |
|-----|---------|---------------|
| **Radar de Mercado** | Feature central do plano não existe | `getCategoryIntelligence()` + competitive data → widget no S11 |
| **TOP 5 concorrentes** | Prometido, não entregue | Wire `/api/competitive-benchmark` no composeS11 |
| **Channel Health Matrix** | CAC × Ticket × Recorrência | Precisa de dados de conversão (tabelas clients/revenue) |
| **IBGE enrichment** | Dados existem, não usados | Wire `ibge_panorama` no composeS11: renda do bairro, PIB per capita, densidade |
| **CNPJ enrichment** | Dados existem, não usados | Wire `cnpj_data` no composeS11: CNAE, regime, sócios, data de abertura |
| **Relatório de Inteligência de Nicho** | `getCategoryIntelligence()` existe mas não no S11 | Wire no composeS11 |

### Veredito
**Domínio é Sentinela + dados que já existem mas não estão wireados.** O IBGE e CNPJ estão no banco — é `JOIN` e `readFileSync`, não greenfield. O Radar de Mercado e Benchmark são APIs existentes não integradas. ~85% do esforço é **wiring, não construção**.

---

## 4. Escala · R$997/mês · 5% pronto

### O que promete
> "TUDO do Dominio + AI Daily Briefing via WhatsApp + Copilot IA + Social Media Strategy + Marketplace Intelligence + Brand monitoring + Consultoria mensal com founder."

### O que EXISTE

| Componente | Status | Evidência |
|-----------|--------|-----------|
| Cockpit API | ✅ vivo | `POST /api/cockpit/ask` · brainTurn() · cross-collection Qdrant |
| Social extract | ✅ vivo | `extractSocialCalendar()` · calendário editorial básico |
| Marketing plan | ✅ vivo | `extractMarketingPlanSections()` · seções extraídas do framework |

### O que FALTA (95%)

| Gap | Impacto |
|-----|---------|
| **AI Daily Briefing via WhatsApp** | Nada implementado. Precisa: cron job → brainTurn() → Evolution API send |
| **Copilot IA** | Cockpit API existe mas não é um produto standalone. Precisa de UI + WhatsApp integration |
| **Social Media Strategy** | extractSocialCalendar() gera estrutura simples. Não é uma estratégia completa |
| **Marketplace Intelligence** | Zero código. Precisa de scraping/API de marketplaces (iFood, Booking, Doctoralia) |
| **Brand monitoring** | Zero código. Precisa de Google Alerts API ou similar |
| **Consultoria mensal** | Serviço humano — não é código. Precisa de agendamento/calendar |

### Veredito
**Escala é 95% especulação.** O único código real é o que herda do Sentinela/Domínio. As features exclusivas (AI Briefing, Copilot, Marketplace, Brand monitoring) são greenfield total. **Este plano não deveria estar visível para clientes.**

---

## 5. Growth OS · R$1.497+/mês · 0% pronto

### O que promete
> "Multi-user (3-10), White-label, Client Portal, Team Analytics, Approval Workflow, Bulk Operations, API Access, SLA Tracking, Revenue Attribution, Client Health Score, Multi-unit Dashboard."

### O que EXISTE

| Componente | Status |
|-----------|--------|
| Auth (login) | ✅ Supabase Auth · mas só role=admin |
| REST API | ✅ 42 endpoints · mas sem tokens de acesso externo |
| Dashboard admin | ✅ 12 páginas · mas single-tenant, sem white-label |

### O que FALTA (100%)

| Gap | O que precisa |
|-----|---------------|
| **Multi-user** | RBAC: admin, analista, cliente, leitura. Tabela `users` + `roles` + `permissions` |
| **White-label** | Theme provider por tenant. CSS variables por cliente. Logo customizado |
| **Client Portal** | Tenant isolation. Cada cliente vê SÓ seus leads. Middleware de tenant |
| **Team Analytics** | Tracking de ações por usuário. Quem fez o quê, quando |
| **Approval Workflow** | Estado: rascunho → review → aprovado → executado. Tabela `workflow_states` |
| **Bulk Operations** | Aplicar ação em múltiplos leads. Bulk update + queue |
| **API Access** | API keys por tenant. Rate limiting. Documentação |
| **SLA Tracking** | Tabela `sla_events`. Tempo de resposta, tempo de resolução |
| **Revenue Attribution** | Tabela `revenue_events`. Qual lead → qual plano → qual MRR |
| **Client Health Score** | Fórmula: login frequency + feature usage + support tickets + payment status |
| **Multi-unit Dashboard** | Agregação cross-tenant para franquias. Grupo de clientes |

### Veredito
**Growth OS é 0% pronto. É uma visão de produto, não um produto.** Precisa de: multi-tenancy, RBAC, white-label, workflow engine, billing — é essencialmente construir um SaaS B2B do zero. **Este plano não deveria estar listado como disponível.**

---

## 📊 Matriz de Maturidade

```
                    Motor     Dados     Superfície  Automação   Multi-tenant
Raio-X      R$0     ✅ 80%    ✅ 80%    ✅ live     ❌ 0%       N/A
Sentinela   R$197   ✅ 60%    ✅ 60%    ✅ live     ❌ 0%       N/A
Domínio     R$497   ❌ 15%    ⚠️ 40%    ⚠️ partial  ❌ 0%       N/A
Escala      R$997   ❌ 5%     ❌ 5%     ❌ planned  ❌ 0%       N/A
Growth OS   R$1.5K  ❌ 0%     ❌ 0%     ❌ planned  ❌ 0%       ❌ 0%
```

---

## 🎯 Recomendações Estratégicas

### Curto prazo (próximos 30 dias)

1. **Não vender Domínio, Escala, Growth OS.** Seria vender produto que não existe. Risco de churn e dano à reputação.

2. **Focar em Raio-X → Sentinela.** Completar os 20% que faltam no Raio-X (distribuição WhatsApp) e os 40% do Sentinela (monitoramento, alertas, follow-up).

3. **Wire IBGE e CNPJ no composeS11.** Dados já existem no banco. É `JOIN`, não greenfield. Isso sobe Domínio de 15% para ~40%.

4. **Criar tracking de conversão.** Tabelas `proposals`, `clients`, `revenue`. Sem isso, não tem como provar ROI. É o pré-requisito para vender qualquer plano pago.

### Médio prazo (60-90 dias)

5. **Sentinela virar produto de verdade.** Monitoramento automático, alertas, follow-up D+1/D+3/D+7, relatório mensal.

6. **Domínio como upsell do Sentinela.** Não é um produto separado — é Sentinela + dados IBGE/CNPJ + competitive benchmark. Precisa de ~2 semanas de wiring.

### Longo prazo (quando tiver 10+ clientes)

7. **Growth OS é rebuild do SaaS.** Multi-tenancy, RBAC, white-label, billing — é construir a plataforma de novo. Só faz sentido com receita validada.

### O que fazer AGORA com a página `/admin/solutions`

**Opção A (honesta):** Mostrar só Raio-X e Sentinela como "disponíveis". Marcar Domínio como "em breve". Esconder Escala e Growth OS.

**Opção B (aspiracional):** Manter todos visíveis mas com **selo de maturidade REAL**: "✅ 80% pronto" vs "🔮 visão (0%)". O founder decide se quer transparência total.

---

## 📈 Dados que sustentam esta análise

| Fonte | Arquivo | O que prova |
|-------|---------|-------------|
| composeS10 | `warp-composer.ts:1293-1465` | Motor Raio-X existe |
| composeS11 | `warp-composer.ts:1944-2161` | Motor Sentinela existe com A/B |
| S10 surface | `warp-surface-status.json:217-236` | Status: live · 30 previews |
| S11 surface | `warp-surface-status.json:238-260` | Status: live · route ativa |
| s10_artifacts | Supabase REST: 4 rows | Volume real de Raio-X gerados |
| s11_events | Supabase REST: 2 rows | Volume real de eventos S11 |
| IBGE data | `ibge_panorama`: 419 rows | Dados existem, não wireados |
| CNPJ data | `cnpj_enriched` column | Dados existem, não wireados |
| L2b modules | `apps/web/src/lib/l2b/`: 17 files | Crawler existe, wireado |
| Brain modules | `apps/web/src/lib/brain/`: 7 files | Brain OODA existe |
| Skills | Qdrant: 832 pts marketing | 6/6 wireadas, 12 Kim Barrett pendentes |
| Surfaces | 22 definidas, 2 live, 18 planned | 91% das superfícies são spec |

---

*medido=verdade · 2026-07-20 · adsentice · DAG 5-passos · 12 fontes de código*
