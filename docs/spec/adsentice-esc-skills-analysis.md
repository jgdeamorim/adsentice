---
id: adsentice-esc-skills-analysis
title: "Análise ESC Skills (gui.marketing) → Dashboard Adsentice"
status: done
type: analysis
version: "1.0.0"
date: 2026-07-12
source: /home/jeffer/Downloads/esc-skills-main
---

# ESC Skills (gui.marketing) — O Que Aproveitar para o Dashboard Adsentice

> **Conclusão:** O repositório ESC é uma **mina de ouro operacional**. Enquanto Corey Haines + Kim Barrett nos deram **vocabulário de domínio** (O QUE fazer), o ESC skills nos dá **processos e arquiteturas** (COMO fazer). São complementares e preenchem lacunas diferentes.

---

## 1. Visão Geral do Repositório

| Dimensão | Valor |
|----------|-------|
| **Skills totais** | 27 guimkt + 20+ dev/security/infra |
| **Workflows** | 4 (esc-start, esc-report, esc-cro, esc-meta-ads-creatives) |
| **Filosofia** | Brandformance Flywheel, Funil Invertido, Profit-First |
| **Autor** | gui.marketing (agência de performance digital) |
| **Foco** | Agência de marketing digital B2B — pipeline completo |

---

## 2. Top 7 Skills por Relevância ao Dashboard

### ⭐⭐⭐ Nível 1 — Impacto Imediato

#### 2.1 `guimkt-lead-scoring-architecture`

**O que é:** Arquitetura completa de lead scoring com 3 scores (Fit + Engagement + Intent), lifecycle stages, conversion value mapping, routing rules, decay, calibração mensal.

**O que adsentice aproveita:**

| Conceito ESC | Onde Encaixa no Dashboard |
|-------------|--------------------------|
| **Fit Score (Explícito)** — 6 dimensões com pesos (Cargo 25%, Porte 20%, Setor 20%, Região 15%, Budget 10%, Email 10%) | Nossos Pain Criteria Tier 1 — são sinais de fit, não de engajamento |
| **Engagement Score (Implícito)** — ações com pontuação diferenciada (demo > pricing > blog) | Nossos Pain Criteria Tier 2-3 — reviews, fotos, website são sinais de engajamento |
| **Intent Score** — sinais de compra imediata (pedido de orçamento, visita à pricing) | Nosso `is_claimed` + `rating_value` são proxies de intent |
| **Score Composto:** `(Fit×0.4) + (Engagement×0.35) + (Intent×0.25)` | Nossa fórmula atual é soma simples. **Deveríamos adotar pesos.** |
| **Classificação A/B/C/D/F** com thresholds | Substitui nossos LEAD/QUENTE/URGENTE arbitrários |
| **Lifecycle Stages** (Lead→MQL→SAL→SQL→Opportunity→Customer→Evangelist) | Nosso Pipeline Stage 0→7 é equivalente. ESC tem mais granularidade. |
| **Conversion Value Mapping** (cada stage gera evento com valor) | Aplicar no nosso tier de precificação: cada lead qualificado "vale" R$ X |
| **Decay + Calibração** mensal | Nosso scoring é estático. ESC mostra que scoring sem decay degrada em <90 dias. |

**Dashboard widget sugerido:** "Score Composto do Lead" — 3 barras (Fit/Engagement/Intent) + classificação A-F + lifecycle stage atual.

---

#### 2.2 `guimkt-executive-performance-report`

**O que é:** Relatório executivo profit-first com 3 níveis de métricas, 4 vereditos (Escalar/Manter/Otimizar/Pausar), 3 modos (Completo/Parcial/Tático), próximos passos 7/30/90 dias.

**O que adsentice aproveita:**

| Conceito ESC | Onde Encaixa no Dashboard |
|-------------|--------------------------|
| **Hierarquia Nível 1 → 3:** Unit Economics → Funil → Diagnóstico Operacional | Nosso dashboard atual tem métricas misturadas. Deveria seguir esta hierarquia. |
| **4 Vereditos por canal:** Escalar/Manter/Otimizar/Pausar | Nossos cards de categoria poderiam ter vereditos |
| **3 Modos:** Completo (CAC/LTV/ROI), Parcial (ROI estimado), Tático (CPL proxy) | Nosso dashboard opera em Modo Tático — só temos dados GMB, sem CRM |
| **Análise Flywheel:** Atrair→Engajar→Encantar | Nossa pipeline Stage 0→7 é o "Encantar". Falta Atrair e Engajar. |
| **Desperdício + Oportunidade** | Cards de "leads com maior potencial" vs "leads frios" |
| **Próximos Passos 7/30/90** | Seção de recomendações automáticas por lead |
| **Disclaimer de Modo Tático** | Deveríamos mostrar no dashboard: "⚠️ Dados limitados ao GMB. Sem CRM." |

**Dashboard widget sugerido:** "Profit-First Overview" — card com Unit Economics (CAC estimado via GMB signals), veredito por categoria, e próximos passos.

---

#### 2.3 `guimkt-brandformance-planner`

**O que é:** Planejamento de mix Branding vs Performance com diagnóstico de maturidade de marca (1-5), cenários, sinais de marca para algoritmos.

**O que adsentice aproveita:**

| Conceito ESC | Onde Encaixa no Dashboard |
|-------------|--------------------------|
| **Scoring de Maturidade (10 indicadores, 0-100)** | Aplicar aos leads: qual a maturidade digital do negócio? |
| **Brandformance Flywheel:** Marca forte → Branded search ↑ → CPC ↓ → CAC ↓ | Nosso "Raio-X" gratuito é a porta de entrada do flywheel |
| **Micro-Bolhas 70/30** (70% aquisição / 30% remarketing) | Aplicar na segmentação de leads: 70% prospecção nova, 30% re-engajamento |
| **12 Leis Inegociáveis** | Muitas são aplicáveis como doutrinas adsentice |
| **Sinais de Marca → Algoritmo:** 6 correlações (branded search, direct traffic, CTR, engagement, WOM, indicação) | Nossos Pain Criteria não capturam NENHUM sinal de marca. É uma lacuna grave. |

**Dashboard widget sugerido:** "Maturidade Digital do Lead" — score 0-100 baseado em 10 indicadores (GMB completeness, website quality, reviews recency, social presence, etc.)

---

### ⭐⭐ Nível 2 — Médio Prazo

#### 2.4 `guimkt-measurement-plan-architect`

- **GA4 taxonomy + dataLayer schema** → Nosso Tier 3 analytics deveria seguir este padrão
- **Conversion Value Schema** → Cada lead deveria ter um "valor estimado" baseado no ticket médio da categoria
- **Hidden fields obrigatórios** → Nossos formulários de captura deveriam capturar gclid, fbclid, UTMs
- **WhatsApp-first architecture** (CTWA, WABA, BSUID) → Essencial para SMB Brasil! 80%+ das vendas SMB são WhatsApp
- **Offline Conversions pipeline** → CRM → Ads loop

#### 2.5 `guimkt-icp-ideal-customer-profile`

- **9 Dimensões ICP** → Cada categoria GMB deveria ter ICP definido (não só "Dentistas", mas "Dentista SP, ticket R$300, atende convênio, 3+ anos")
- **ICP Real vs Aspiracional** → Filtrar leads que SÃO o ICP vs leads que PARECEM o ICP
- **Perfil Psicográfico** → Dores, objeções, canais de aquisição por persona (não temos NADA disso)

#### 2.6 `guimkt-offer-diagnosis`

- **8 dimensões de força da oferta** → Poderíamos auditar o site do lead para avaliar se a oferta DELES é forte
- **Veredicto:** oferta pronta / precisa ajuste / reconstruir → Isso é ouro para priorizar leads

#### 2.7 `guimkt-experimentation-engine`

- **Modelo ROAR** (Re-think/Optimize/Automate/Redefine) → Aplicar à nossa própria estratégia de growth
- **FACT & ACT methodology** → Ciclo de melhoria contínua do produto

---

## 3. Workflows ESC → Inspiração para Pipelines Adsentice

### `esc-start` (11 etapas sequenciais)
```
Message Mining → Offer Diagnosis → ICP → Google Ads → Wireframe LP →
Landing Page → Meta Ads → Criativos → Measurement Plan → Conversion QA → Lead Scoring
```

**Paralelo adsentice:** Nosso pipeline de onboarding de cliente deveria seguir esta sequência:
1. Discovery (GMB data) = "Message Mining"
2. Pain Score = "Offer Diagnosis" + "ICP" combinados
3. Relatório Raio-X = "Measurement Plan"
4. Recomendações = "Google Ads + Meta Ads + LP"

### `esc-report` (ciclo de accountability)
```
UTM Governance → Coleta (gmp-cli) → Executive Report → Brandformance → Consent Audit → Conversion QA
```

**Paralelo adsentice:** Nosso produto "Sentinela" (R$197/mês) DEVERIA ser um ciclo mensal de report como este.

---

## 4. Comparação: 3 Fontes de Vocabulário

| Dimensão | Corey Haines (43 skills) | Kim Barrett (12 skills) | ESC gui.marketing (27 skills) |
|----------|--------------------------|------------------------|-------------------------------|
| **Nível** | Estratégico (O QUE) | Tático-criativo (COMO FALAR) | Operacional (COMO EXECUTAR) |
| **Foco** | SaaS marketing stack | Direct response copy | Agência de performance |
| **Melhor em** | SEO audit, analytics, CRO, pricing psychology | Avatar extraction, Schwartz, objections, mechanisms | Lead scoring, measurement plans, executive reports, brandformance |
| **Pior em** | Processos orquestrados | Volume de skills | Profundidade teórica |
| **Para adsentice** | Enriquece Pain Criteria e Tier 3 | Enriquece comunicação e copy | Enriquece Dashboard e Pipeline |

---

## 5. O Que Implementar no Dashboard AGORA

### Widgets Novos (inspirados no ESC)

| Widget | Fonte ESC | Dados Necessários | Prioridade |
|--------|-----------|-------------------|:----------:|
| **Score Composto do Lead** (Fit/Engagement/Intent) | lead-scoring-architecture | Pain signals existentes | 🟢 v0.2 |
| **Classificação A/B/C/D/F** | lead-scoring-architecture | Score composto | 🟢 v0.2 |
| **Maturidade Digital** (0-100, 10 indicadores) | brandformance-planner | GMB + lighthouse | 🟡 v0.3 |
| **Unit Economics Overview** (CAC est., LTV est.) | executive-performance-report | Ticket médio por categoria | 🟡 v0.3 |
| **Veredito por Lead** (Escalar/Manter/Otimizar/Pausar) | executive-performance-report | Score + maturidade | 🟡 v0.4 |
| **Próximos Passos 7/30/90** | executive-performance-report | LLM síntese | 🔴 v0.5 |
| **Pipeline Stage Visual** (Lead→MQL→SQL→Won) | lead-scoring-architecture | CRM (futuro) | 🔴 v0.5 |
| **Brandformance Flywheel** | brandformance-planner | Dados históricos | 🔴 v0.6 |

### Métricas que Faltam no Nosso Dashboard

| Métrica ESC | Temos? | Como Obter |
|------------|:------:|-----------|
| CAC (Custo de Aquisição de Cliente) | ❌ | DataForSEO cost / leads qualificados |
| LTV (Lifetime Value) | ❌ | Estimativa por ticket médio da categoria |
| LTV:CAC ratio | ❌ | Cálculo derivado |
| CPL (Custo por Lead) | ✅ | DataForSEO cost tracking |
| Taxa de conversão LP | ❌ | Precisamos de landing pages próprias |
| Branded search volume | ❌ | DataForSEO keyword research |
| SOV (Share of Voice) | ❌ | DataForSEO domain competitors |
| Payback (meses) | ❌ | CAC / (LTV / meses retenção) |

---

## 6. Anti-Padrões do ESC que Também Cometemos

| Anti-Pattern ESC | Nosso Equivalente |
|-----------------|-------------------|
| "Scoring sem ICP — fit score inventado" | Nossos Pain Criteria não são calibrados por ICP de categoria |
| "Score sem decay — MQL fantasma" | Nosso score é estático, sem decay temporal |
| "Threshold fixo para sempre — model rot <90 dias" | Nossos thresholds LEAD≥40 nunca foram recalibrados |
| "50 dimensões de scoring" | Felizmente temos só 20 — mas 6 deles são inúteis sem lighthouse |
| "Conversion values arbitrários" | Não temos conversion values |
| "Scoring só no CRM — algoritmo fica cego" | Nosso scoring só existe na UI, não alimenta nada |
| "Ignorar recycling — leads rejeitados somem" | Leads fora do filtro simplesmente desaparecem |
| "Relatório sem baseline — bom comparado a quê?" | Nossas métricas não têm benchmark por categoria |
| "Métricas de vaidade como headline" | Mostramos "Total na Região" como KPI principal |

---

*ESC Skills Analysis v1.0 · 2026-07-12 · 27 skills analisados · 8 widgets novos mapeados para o dashboard*
