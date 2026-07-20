# ADR-0051 · Auto-Pilot Inteligente — Orquestrador de Aquisição com Brain OODA

**Status:** ACCEPTED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Supersedes:** Nenhum (novo)
**Extends:** ADR-0023 (Auto-Pilot), ADR-0024 (L4 IBGE), ADR-0046 (Realinhamento Pipeline), ADR-0049 (Discovery Layer), ADR-0050 (Category Intelligence)
**Sources:** DAG completa — 5 páginas admin, brain/b3-decide (519 loc total), Category Intel API, Qdrant 832 pts

---

## 1. Contexto

O adsentice tem 5 módulos que individualmente funcionam — mas nenhum se fala:

```
Market Intel    → sabe ONDE estão as oportunidades (IBGE, cobertura)
Category Intel  → sabe QUAL categoria priorizar (oportunidade 0-100)
Pipeline        → sabe o ESTADO do funil (S0-L7)
Criteria        → sabe COMO qualificar (87 sinais)
Discovery       → sabe COMO buscar (DataForSEO)
Brain OODA      → sabe RESPONDER perguntas (Qdrant cross-KG, $0 bypass)

PROBLEMA: todos isolados. Nenhum orquestrador.
```

O Auto-Pilot atual (ADR-0023) decide ONDE prospectar baseado em IBGE — mas é **passivo** (usuário escolhe categoria manualmente). O Pre-flight conta candidatos ($0) — mas não **aciona** o Discovery automaticamente. O Pipeline mostra o funil — mas não sugere **ações** (runbooks).

**O que falta:** um orquestrador que fecha o ciclo OODA de aquisição automaticamente, usando o Brain OODA como motor de decisão.

---

## 2. Decisão

**Criar o Auto-Pilot Inteligente — um orquestrador que conecta Category Intel → Market Intel → Pipeline → Criteria → Discovery → Brain OODA em um ciclo fechado de aquisição.**

O Brain OODA (`brain/b3-decide.ts`, 519 loc, 12 containers) é o motor de decisão. Ele foi desenhado para Q&A (ADR-0011), mas sua arquitetura serve perfeitamente como **motor de decisão do Auto-Pilot**:

```
OODA Cycle de Aquisição (brain/b3-decide adaptado):

OBSERVE (c0)  → Category Intel + Market Intel + Pipeline
  └── classifica o estado atual do mercado por categoria × região

ORIENT (c1)   → Qdrant cross-KG (832 pts marketing + 85 best practices)
  └── re-rankeia oportunidades por potencial de conversão

DECIDE (B2)   → Self-Score (certainty ≥ 0.80 = bypass, $0)
  └── "Prospectar orthodontist em Guarulhos — oportunidade 64/100"

ACT (B3)      → Pre-flight ($0) → Discovery L0 → Raio-X → S11-MK
  └── executa ou agenda (bypass-score = automático, <0.80 = founder decide)
```

---

## 3. Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│              AUTO-PILOT INTELIGENTE (ADR-0051)                        │
│                                                                      │
│  FONTES (já existem):                                                │
│  ├── Category Intel GET /api/category/intel (ADR-0050)              │
│  ├── Market Intel   /admin/market (IBGE, cobertura)                 │
│  ├── Pipeline       /admin/pipeline (funil S0-L7)                   │
│  ├── Criteria       /admin/criteria (87 sinais)                     │
│  └── Brain OODA     POST /api/cockpit/ask (b3-decide)               │
│                                                                      │
│  NOVO (este ADR):                                                    │
│  ├── auto-pilot.ts            → orquestrador principal              │
│  └── GET /api/auto-pilot/decide → endpoint de decisão              │
│                                                                      │
│  CICLO:                                                              │
│                                                                      │
│  1. OBSERVE · Category Intel (29 categorias × gaps × oportunidades) │
│     │                                                                │
│     ▼                                                                │
│  2. ORIENT  · Brain OODA (Qdrant cross-KG: 832 pts + IBGE + sinais) │
│     │          └── re-rank: qual categoria × região tem maior        │
│     │              potencial de conversão?                            │
│     ▼                                                                │
│  3. DECIDE  · B2 Self-Score (certainty ≥ 0.80 = automático)         │
│     │          └── "orthodontist Guarulhos: 64/100 oportunidade"    │
│     │          └── "dentist Itaquera: 0% coberto, score médio 62"  │
│     ▼                                                                │
│  4. ACT     · Execução                                              │
│     ├── certainty ≥ 0.80 → AUTO: Pre-flight → Discovery L0          │
│     ├── certainty 0.50-0.80 → SUGERE: mostra no painel admin        │
│     └── certainty < 0.50 → founder decide manualmente               │
│                                                                      │
│  RUNBOOKS (ações por estratégia):                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ S0·L0  → Discovery automático em gaps prioritários           │   │
│  │ S1·L2a → Leads com score > 70 → Raio-X automático (WhatsApp) │   │
│  │ S2·L2b → Leads com website → S11-MK (proposta $0.001)       │   │
│  │ S3·L3  → Leads qualificados → S11K (landing $0.093)          │   │
│  │ S4·L4  → Leads com IBGE renda alta → Domínio (R$497)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. O Brain OODA como Motor de Decisão

### 4.1 O que o Brain OODA é (DAG-sourced)

```
apps/web/src/lib/brain/ (519 loc total, 6 módulos):

c0-interpreter.ts (68 loc)
  classifyIntent(question) → ask-explicar | ask-recall | ask-factual
  Determinístico · $0 · regex patterns

c1-retriever.ts (106 loc)
  c1Rerank(hits, question, intent) → RankedHit[]
  Híbrido: 0.45·sim + 0.20·autoridade + 0.15·recência + 0.20·lexical
  Determinístico · $0 · override dos resultados crus do Qdrant

b2-self-score.ts (57 loc)
  computeCertainty(hits, commits, filesystemSources) → CertaintyResult
  0.35·facts + 0.25·commits + 0.20·filesystem + 0.20·lexical
  certainty ≥ 0.80 = bypass ($0, sem LLM)

a3-cache.ts (74 loc)
  cacheGet/cachePut · Redis :6396
  Watermark check: invalida se corpus mudou

d1-grounding.ts (106 loc)
  c3Honesty(reply, facts): verifica se a resposta está ancorada nos fatos
  Remove frases sem lastro (grounding check)

b3-decide.ts (108 loc)
  brainTurn(question, searchResults, commits, filesystem, claudeRespond)
  Pipeline completo: c0→c1→B2→A3→B3→D1
  Tiers: bypass-score ($0) | bypass-cache ($0) | b3-claude (cost-capped)
```

### 4.2 Adaptação para Auto-Pilot

O `brainTurn()` foi desenhado para **perguntas textuais** ("Qual o melhor plano para esta clínica?"). Para o Auto-Pilot, adaptamos o mesmo pipeline para **decisões de prospecção**:

```typescript
// auto-pilot.ts — adaptação do brainTurn para decisão de aquisição

async function autoPilotDecide(): Promise<AutoPilotDecision> {
  // ── OBSERVE (c0) ──
  const catIntel = await getCategoryIntelligence()
  const topOpportunities = catIntel
    .filter(ci => ci.opportunity.score > 50)
    .slice(0, 5)

  // ── ORIENT (c1 + Qdrant) ──
  // Para cada oportunidade, busca inteligência de marketing
  const enriched = await Promise.all(
    topOpportunities.map(async (ci) => {
      const skills = await discoverSkills({
        businessName: ci.label, category: ci.category,
        segment: ci.segment, city: ci.coverage.gaps[0]?.city || "Brasil",
        district: "", score: ci.quality.avgScore, rating: 0, reviews: 0,
        isClaimed: false, hasWebsite: ci.quality.pctWithWebsite > 30,
        competitorCount: ci.coverage.uniquePlaceIds,
        topGaps: [], schwartzLevel: "Problem Aware",
      }, 5)
      return { ...ci, skills }
    })
  )

  // ── DECIDE (B2) ──
  // Self-score: quão confiável é esta recomendação?
  const decisions = enriched.map(ci => {
    const factsScore = Math.min(ci.coverage.gaps.length / 5, 1.0)
    const commitsScore = ci.quality.avgScore > 50 ? 0.8 : 0.3
    const filesystemScore = ci.marketingIntel.enriched ? 0.9 : 0.3
    const lexicalScore = ci.coverage.totalDiscovered > 50 ? 0.8 : 0.4
    const certainty = 0.35 * factsScore + 0.25 * commitsScore + 0.20 * filesystemScore + 0.20 * lexicalScore

    return {
      category: ci.category,
      label: ci.label,
      region: ci.coverage.gaps[0] || { city: "Brasil", state: "" },
      opportunityScore: ci.opportunity.score,
      certainty,
      autoExecute: certainty >= 0.80,
      reasoning: certainty >= 0.80
        ? `AUTO: ${ci.label} em ${ci.coverage.gaps[0]?.city || "nova região"} — oportunidade ${ci.opportunity.score}/100`
        : `SUGESTÃO: ${ci.label} — oportunidade ${ci.opportunity.score}/100, mas requer validação`,
      nextAction: ci.opportunity.nextAction,
      estimatedCost: ci.opportunity.estimatedCost,
    }
  })

  // ── ACT (B3) ──
  // certainty ≥ 0.80 = executa automaticamente
  // certainty < 0.80 = sugere no painel admin

  return {
    decisions: decisions.sort((a, b) => b.certainty - a.certainty),
    autoExecutable: decisions.filter(d => d.autoExecute),
    suggested: decisions.filter(d => !d.autoExecute),
    generatedAt: new Date().toISOString(),
  }
}
```

### 4.3 Por que o Brain OODA, não o DeepSeek

| Critério | Brain OODA (b3-decide) | DeepSeek |
|----------|----------------------|----------|
| Custo | $0 (bypass-score 80%+ dos casos) | $0.001/chamada |
| Latência | < 500ms (Qdrant local) | 2-5s (API externa) |
| Grounding | c3Honesty verifica cada afirmação | Sem verificação |
| Cache | A3 Redis (watermark invalidation) | Não |
| Determinismo | c0 + c1 + B2 são $0 e determinísticos | Não-determinístico |
| Uso certo | Decisão de prospecção (dados + regras) | Copywriting criativo |

---

## 5. Wire Points (4 conexões)

### 5.1 Category Intel → Market Intel

```typescript
// apps/web/src/app/[lang]/(dashboard)/(private)/admin/market/page.tsx
// Adicionar seção: "📊 Top Oportunidades por Categoria"

import { getCategoryOpportunityQuick } from "@/lib/category-intel"

const opportunities = await getCategoryOpportunityQuick()
// Renderizar cards: "orthodontist 64pts · 0% coberto em 10 cidades"
```

### 5.2 Category Intel → Pipeline (Runbooks)

```typescript
// apps/web/src/app/[lang]/(dashboard)/(private)/admin/pipeline/page.tsx
// Adicionar runbooks por estágio do funil

const runbooks: Record<string, { action: string; trigger: string; cost: number }> = {
  S0: { action: "Discovery automático em gaps prioritários", trigger: "category_opportunity > 50", cost: 0.048 },
  S1: { action: "Raio-X automático via WhatsApp", trigger: "score > 70 AND wa_is_business", cost: 0 },
  S2: { action: "S11-MK (proposta visual $0.001)", trigger: "has_website AND enrichment_level >= 2", cost: 0.001 },
  S3: { action: "S11K (landing técnica $0.093)", trigger: "score > 60 AND competitorCount > 5", cost: 0.093 },
  S4: { action: "Proposta Domínio (R$497/mês)", trigger: "ibge_renda > 2000 AND score > 70", cost: 0.02 },
}
```

### 5.3 Category Intel → Discovery

```typescript
// apps/web/src/app/[lang]/(dashboard)/(private)/admin/discovery/page.tsx
// Adicionar: "🎯 Sugestão do Auto-Pilot"

const suggestion = await fetch("/api/auto-pilot/decide").then(r => r.json())
// Mostrar: "Recomendamos prospectar orthodontist em Guarulhos (64/100)"
// Botão: "Executar Discovery com esta configuração"
```

### 5.4 Criteria → Runbooks

```typescript
// apps/web/src/app/[lang]/(dashboard)/(private)/admin/criteria/page.tsx
// Adicionar thresholds acionáveis por família de sinais

const CRITERIA_RUNBOOKS = {
  "F1": { threshold: 15, action: "Lead está no ICP — prosseguir com scoring completo" },
  "I1": { threshold: 25, action: "Não reivindicado — ação #1: ensinar a reivindicar GMB (5min, grátis)" },
  "W1": { threshold: 20, action: "Sem HTTPS — ação #1: instalar SSL (grátis, 10min)" },
  "D2": { threshold: 10, action: "Design amador — ação #1: gerar S11-MK com Brand DNA real" },
}
```

---

## 6. API do Auto-Pilot

```typescript
// GET /api/auto-pilot/decide
// Retorna a decisão atual do Auto-Pilot

export async function GET() {
  const decision = await autoPilotDecide()
  return NextResponse.json(decision)
}

// POST /api/auto-pilot/execute
// Executa a decisão (se autoExecute = true)
// Body: { category, city, autoConfirm: true }

export async function POST(request: Request) {
  const { category, city, autoConfirm } = await request.json()
  if (!autoConfirm) {
    // Pré-flight primeiro ($0)
    const preflight = await preflightCheck(category, city)
    if (!preflight.viable) {
      return NextResponse.json({ executed: false, reason: preflight.reason })
    }
  }
  // Executa Discovery L0
  const result = await executeDiscovery({ categories: [category], city, layers: { l0: true, l2: true, l4: true } })
  return NextResponse.json({ executed: true, ...result })
}
```

---

## 7. Custo

| Operação | Custo | Frequência |
|----------|-------|-----------|
| Category Intel query | $0 (Supabase local) | A cada decisão |
| Brain OODA (bypass) | $0 | 80%+ dos casos |
| Qdrant cross-KG (skill discovery) | $0 (localhost) | A cada decisão |
| Pre-flight | $0.012/mun | Antes de executar L0 |
| Discovery L0 | $0.048/página | Só se Auto-Pilot decidir executar |
| **Total Auto-Pilot** | **$0 (decisão) + $0.06 (execução)** | |

---

## 8. Próximos Passos

- [x] ADR-0051 escrita
- [ ] Criar `auto-pilot.ts` (orquestrador)
- [ ] Criar `GET /api/auto-pilot/decide`
- [ ] Criar `POST /api/auto-pilot/execute`
- [ ] Wire Category Intel no Market Intel
- [ ] Wire Runbooks no Pipeline
- [ ] Wire sugestão no Discovery
- [ ] Wire runbooks no Criteria
