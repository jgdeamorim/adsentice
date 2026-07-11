---
id: ADR-0005
title: Estratégia de Funil de Leads & CRM — Stage 0→7, Signal Detection, Scoring
status: accepted
date: 2026-07-11
deciders: [jgdeamorim]
consulted: [claude]
related: [ADR-0001, ADR-0004]
supersedes: []
---

# ADR-0005 — Funil de Leads, CRM & Estratégia de Marketing

## Contexto

O adsentice precisa de um processo reproduzível para transformar dados de mercado (DataForSEO) em leads qualificados e clientes pagantes. A abordagem inicial era "rodar diagnóstico e torcer". Sem critérios, sem CRM, sem funil.

Estudamos 3 fontes externas:
1. **marketingagentskills** (Jaymes, 28 skills MIT) — ICP personas, lifecycle campaigns, positioning
2. **Clay GTM framework** — signal detection, lead scoring, outbound automation
3. **Jasper.ai** — product-led growth, pricing tiers, agent marketplace

## Decisão

### 1. Funil Stage 0→7

```
S0 ($0) → S1 (~1¢) → S2 ($0) → S3 (~10¢) → S4 ($0) → S5 ($0) → S6 (founder) → S7 (MRR)
SELEÇÃO    DISCOVERY   PRÉ-FILTRO  ANÁLISE     LEAD-SCORE  PROPOSTA    NEGOCIAÇÃO   CLIENTE
```

**Gates:**
- S0→S1: Founder confirma segmento-alvo. O pipeline NÃO escolhe sozinho.
- S2→S3: Pré-filtro elimina ANTI-ICP (~70% dos candidatos). SóLead qualificado consome $.
- S4→S5: Lead score ≥ 40 (WARNING ou melhor). Abaixo disso = não vale contato.
- S6→S7: Founder fecha. Não é automático.

**Custo por lead qualificado:** ~$0.12 ($2 para achar 3-5 leads quentes em um segmento de 50 candidatos).

### 2. Lead Score = fixability × potential × value-fit

| Dimensão | Peso | O que mede |
|----------|------|-----------|
| FIXABILITY | 40% | Quão fácil resolver os problemas detectados |
| POTENTIAL | 35% | Quanto o mercado vale (volume × ticket × tendência) |
| VALUE-FIT | 25% | Match com cobertura adsentice (caps × nicho × localização) |

### 3. Signal Detection (Clay GTM adaptado)

4 categorias de sinais com stacking:

| Categoria | Peso | Exemplos |
|-----------|------|----------|
| INTENT | 35% | Buscou keyword de serviço, visitou concorrente, interagiu com adsentice |
| GROWTH | 25% | Abrindo unidade nova, +reviews recentes, contratando |
| CHANGE | 20% | Migrou CMS, novo CMO, rebranding, trocou site |
| DISTRESS | 20% | Reviews negativas sem resposta, site lento/fora, perdeu posição Google |

**Stacking rule:** 1 sinal = lead frio. 2+ sinais = lead quente. 3+ sinais em <30 dias = URGENTE (contato imediato).

### 4. CRM-Driven Proposals

Propostas são **auto-geradas** com dados REAIS do diagnóstico (Stage 3), NÃO copy de marketing genérico.

Template:
```markdown
# Diagnóstico de Mercado Digital — {{business.name}}
## Score: {{score.overall}}/100

### O que descobrimos:
✅ {{strengths}}
⚠️ {{gaps}}

### 3 ações de maior impacto:
1. {{tips[0]}} (grátis)
2. {{tips[1]}} (grátis)
3. {{tips[2]}} ({{credit_cost}} créditos)

### Plano adsentice: R$47/mês
```

**Princípio:** "Seu score é 62/100 porque sua performance mobile é 34 e você não aparece em 'harmonização facial SP'". O dado é a proposta.

### 5. Dois Dashboards, Visões Separadas

| Admin (operador) | Client (pagante) |
|-----------------|------------------|
| Pipeline Stage 0→7 completo | Score Timeline (mês a mês) |
| Market Analysis (segmentos) | Reputation Monitor |
| CRM (contacts, proposals) | Competitor Radar |
| MRR/Churn dashboard | Action Feed (recomendações) |
| Signal Detection alerts | Variance Report (mercado × conta) |

**Invariante:** Admin vê TODOS os leads. Cliente vê SÓ o próprio tenant (RLS Supabase).

## Alternativas Consideradas

### Alternativa 1: Sales tradicional (planilha + email)
**Rejeitada.** Não escala. O diferencial do adsentice é que o diagnóstico É a proposta — automatizado, data-driven, personalizado.

### Alternativa 2: Lead scoring com IA (caixa preta)
**Rejeitada.** Viola `medido=verdade`. O score precisa ser EXPLICÁVEL: "62/100 porque A, B, C". O dono da clínica precisa entender POR QUE o score é esse.

### Alternativa 3: CRM externo (HubSpot, Pipedrive)
**Rejeitada.** Integração desnecessária para MVP. Schema próprio (Supabase) com 4 tabelas é suficiente. Migrar para CRM externo se/escalar.

## Consequências

- **Positivas:** Processo reproduzível. Custo por lead previsível. Propostas data-driven (não copywriting). Score explicável. Admin/cliente isolados.
- **Negativas:** Signal Detection engine precisa ser construído (não é trivial). CRM próprio = mais código para manter.
- **Risco:** O funil assume que ~30% dos candidatos passam no pré-filtro. Se a taxa for muito menor, o custo por lead sobe. Mitigação: métrica monitorada no dashboard admin.

## Referências

- `docs/adsentice-funnel-crm-strategy.md` — documento completo (619 linhas)
- `docs/adsentice-objetivos-solucoes-criterios.md` — 5 soluções-core, lead criteria
- https://github.com/realjaymes/marketingagentskills — 28 marketing skills (MIT)
- Clay GTM framework — signal detection, scoring, outbound (via web fetch)
- `apps/web/src/lib/types.ts` — BrandIQ, DiscoveryCard, Tip types
- `apps/web/src/app/api/diagnostic/route.ts` — endpoint de diagnóstico (5 pipelines)
