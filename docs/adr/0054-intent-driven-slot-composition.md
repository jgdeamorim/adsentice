# ADR-0054 · Intent-Driven Slot Composition — Toda Inteligência de Marketing no Compositor

**Status:** PROPOSED
**Date:** 2026-07-20
**Author:** jeffer + Claude Opus 4.8
**Extends:** ADR-0037 (S11 A/B), ADR-0045 (S11-MK → S11K), ADR-0047 (Brain KG), ADR-0048 (Marketing Skills), ADR-0049 (Discovery Layer)
**Sources:** DAG 5-passos — warp-composer.ts (2,200 linhas), strategy-resolver.ts, morph-resolver.ts, vocab-resolver.ts, best-practice-kg.ts, 4-composer.ts

---

## 0. Diagnóstico (medido=verdade)

### 0.1 O que TEMOS (7 sistemas de inteligência)

| # | Sistema | Arquivo | O que produz | Usado pelo S11? |
|---|---------|---------|-------------|-----------------|
| 1 | **Strategy Resolver** | `strategy-resolver.ts` | 8 facetas × slotOrder × copyAngle × pricingFrame × hypothesis | ⚠️ Só `strategies.A/B` — slotOrder **ignorado** |
| 2 | **Morph Resolver** | `morph-resolver.ts` | PerSlotMutations: gradientAngle, radius, shadow, spacing, minHeight, columns | ⚠️ `resolveMorph()` chamado, mutações NÃO aplicadas por slot |
| 3 | **Vocab Resolver** | `vocab-resolver.ts` | conversionFacets, designFacets, iconFacets, animationFacets | ⚠️ Só `preVocab.conversionFacets` usado |
| 4 | **Best Practice KG** | `best-practice-kg.ts` | 85+ regras ranqueadas: a11y, performance, copy, SEO, layout | ⚠️ `bpScore` no meta — regras NUNCA aplicadas ao render |
| 5 | **Marketing Skills** | `marketing-kg.ts` | 832 pts × 6 skills wireadas (local-seo, objection, wa, mkt-plan, social, ads) | ⚠️ Output textual no meta — não decide estrutura |
| 6 | **Design System** | `warp-kg.ts` + Materio | 107 componentes embedados, 36 design tokens, 22 superfícies Warp | ⚠️ Só `unifyTokens()` mapeia cores — componentes nunca invocados |
| 7 | **L2b Brand DNA** | `design-extractor.ts` | Cores REAIS, fontes REAIS, hierarquia, acessibilidade, score | ❌ Extraído mas NUNCA aplicado — `T.font = "Inter"` sempre! |

### 0.2 O que o S11 faz HOJE

```
composeS11(placeId)
  │
  ├── L0 (GMB)           ✅ lead real
  ├── L2b (crawl)        ✅ serviços, médicos, Brand DNA
  ├── TokenComposer       ⚠️ palette do NICHO_MAP, ignora Brand DNA do L2b
  ├── resolveIntentVocab  ⚠️ chama mas só usa conversionFacets
  ├── resolveStrategies   ⚠️ A/B facetas, mas slotOrder de cada estratégia IGNORADO
  ├── resolveMorph        ⚠️ computa PerSlotMutations, NÃO aplica por slot
  ├── queryRelevantSkills ⚠️ 832 pts → mktAngles no meta, não no render
  ├── queryBestPractices  ❌ bpScore no meta, 85 regras nunca aplicadas
  ├── composeLayout       ⚠️ ordena slots, mas renderHint ignorado
  ├── generateLandingCopy ⚠️ DeepSeek copy com contexto parcial
  └── renderS11_GREEN     ⚠️ slots fixos (hero→trust→how→caps→stats→voice→pricing→faq→cta)
                           ❌ PersonaFallback ainda tem template "Raio-X gratuito"
                           ❌ T.font = "Inter" sempre (ignora Roboto do L2b)
                           ❌ PerSlotMutations não aplicados
```

### 0.3 O gap fundamental

**Temos 7 sistemas de inteligência produzindo conhecimento rico. Nenhum deles decide O QUE renderizar, EM QUE ORDEM, ou COM QUE ESTILO.**

O renderizador `renderS11_GREEN` tem 9 slots hardcoded com ordem fixa. O `slotOrder` de cada estratégia (definido em `STRATEGY_DEFS`) existe mas é **completamente ignorado**. O `resolveMorph()` computa ângulos de gradiente, tiers de radius, níveis de shadow por slot — mas o renderizador não aplica. O Brand DNA do L2b extrai `#a02040` e `Roboto` do site real, mas o composer usa `oklch(0.55 0.18 220)` e `Inter` sempre.

---

## 1. Decisão

**O compositor S11 deve ser INTENT-DRIVEN: a inteligência de marketing decide a estrutura, a ordem, o estilo e o conteúdo de cada slot. O renderizador é um executor cego que aplica o que a inteligência determinou.**

### 1.1 Pipeline alvo

```
composeS11(placeId) — INTENT-DRIVEN
  │
  ├── 1. OBSERVE: L0 + L2b → dados REAIS do lead
  │
  ├── 2. ORIENT: Vocab Resolver → facets de conversão + design
  │              Marketing Skills → keywords, objeções, persona, canal
  │              Market Ontology → densidade competitiva, saturação
  │
  ├── 3. DECIDE: Strategy Resolver → 2 estratégias A/B
  │              │
  │              ├── facet (social_proof | urgency | scarcity | guarantee)
  │              ├── slotOrder [hero,trust,voice,how,capabilities,pricing,faq,cta]
  │              ├── copyAngle ("Prova social primeiro...")
  │              ├── pricingFrame (guarantee | free-first | anchor | commitment-steps)
  │              ├── faqAngle ("objeções de confiança...")
  │              └── hypothesis (testável, vai pra série s11_events)
  │
  ├── 4. COMPOSE: Morph Resolver → PerSlotMutations POR slot
  │              │
  │              ├── hero: { gradientAngle, minHeight }
  │              ├── trust: { chipStyle, spacing }
  │              ├── capabilities: { columns, cardRadius, cardShadow }
  │              ├── pricing: { emphasis, borderColor }
  │              ├── cta: { buttonShape, sectionPadding }
  │              └── ...
  │
  ├── 5. STYLE: Brand DNA do L2b (cores REAIS, fontes REAIS)
  │            + Design System (Materio tokens, componentes Warp)
  │            + CSS Patterns (micro-interactions, layout recommendations)
  │
  ├── 6. GATE: Best Practice KG → 85 regras → Quality Gate estrutural
  │            (não só slop — a11y, performance, copy, SEO, layout)
  │
  └── 7. RENDER: Executor cego — aplica slotOrder, PerSlotMutations,
                 Brand DNA, e Quality Gate. ZERO decisão própria.
```

### 1.2 O que muda em cada camada

#### Layer 2 · ORIENT — Vocab Resolver full power

```typescript
// HOJE: só conversionFacets é usado
const preVocab = resolveIntentVocab(seg, ontology)
strategies = resolveStrategies(intent, preVocab.conversionFacets)

// ADR-0054: TODOS os facets alimentam o composer
const vocab = resolveIntentVocab(seg, {
  ...ontology,
  // L2b-enriched: persona real, não template
  persona: { 
    who: lead.schwartz_label,
    offer: l2bServices[0],          // serviço REAL
    urgency: competitors > 10 ? 'alta' : 'média',
  },
  // Market ontology: dados reais do bairro
  marketData: { competitors, avgScore, claimed, rating, reviews },
  // Niche com serviços REAIS, não NICHO_MAP
  niche: { specialties: l2bServices, keywords: l2bKeywords, pains: l2bPains },
})

// Agora o composer recebe:
//   vocab.conversionFacets  → qual estratégia de conversão
//   vocab.designFacets      → qual atmosfera de design
//   vocab.iconFacets        → quais ícones
//   vocab.animationFacets   → quais animações
//   vocab.layoutFacets      → NOVO: qual estrutura de layout
```

#### Layer 3 · DECIDE — slotOrder aplicado

```typescript
// HOJE: slotOrder é definido mas IGNORADO
// strategies.A.slotOrder = ['hero','trust','voice','how','capabilities','pricing','faq','cta']
// mas renderS11_GREEN usa ordem fixa

// ADR-0054: slotOrder É a ordem de renderização
const strat = strategies.A
const slots = composeLayout(intent, slotMorph, strat)
// slots.slotOrder = strat.slotOrder  ← AGORA É RESPEITADO

// renderS11_GREEN recebe slotOrder da estratégia
// Se strat.slotOrder = ['hero','pricing','trust','faq','cta']
// → renderiza NESSA ORDEM (pricing antes de trust = remoção de risco adiantada)
```

#### Layer 4 · COMPOSE — PerSlotMutations aplicados

```typescript
// HOJE: resolveMorph() computa mas NÃO aplica
const morph = resolveMorph({ segment, designFacets, animationFacets, ... })
// morph.hero = { gradientAngle: 135, minHeight: '62vh' }
// morph.capabilities = { columns: 3, cardRadius: '12px', cardShadow: 'sm' }
// morph.pricing = { emphasis: 'highlight', borderColor: 'primary' }

// ADR-0054: cada slot aplica suas mutações
const R: Record<string, () => string> = {
  hero: () => {
    const m = morph.hero || {}
    const angle = m.gradientAngle || 135
    const minHeight = m.minHeight || '62vh'
    return `<header class="s11-hero" style="background:linear-gradient(${angle}deg,var(--p),var(--s));min-height:${minHeight}">...`
  },
  capabilities: () => {
    const m = morph.capabilities || {}
    const cols = m.columns || 3
    const radius = m.cardRadius || '12px'
    return `<div class="s11-grid" style="grid-template-columns:repeat(${cols},1fr)">...</div>`
  },
  // ... cada slot com suas mutações
}
```

#### Layer 5 · STYLE — Brand DNA first

```typescript
// HOJE: T.font = "Inter" sempre
// ADR-0054: L2b Brand DNA tem PRIORIDADE sobre NICHO_MAP

const T = unifyTokens(seg, {
  primary: l2bBrandColors?.primary || p,        // #a02040 (L2b) > oklch(...)
  secondary: l2bBrandColors?.secondary || s,     // #90d000 (L2b) > oklch(...)
  accent: l2bBrandColors?.accent || a,
}, odSystem, materio, 'S11')

// Fontes: L2b > Materio > System
if (l2bBrandFonts?.heading) {
  T.font = `"${l2bBrandFonts.heading.split(':')[0]}", ${T.font}`
}
```

#### Layer 6 · GATE — Best Practice enforcement

```typescript
// HOJE: bpScore no meta, regras ignoradas
// ADR-0054: 85 regras viram Quality Gate estrutural

function applyBestPracticeGate(html: string, rules: BestPracticeRule[]): {
  html: string; violations: number; fixes: string[]
} {
  // R1: alt text em todas as imagens
  // R2: heading hierarchy (h1→h2→h3, sem skip)
  // R3: CTA visível acima da dobra (hero contém .s11-btn)
  // R4: contraste mínimo 4.5:1 (validado contra Brand DNA)
  // R5: font-display: swap em @font-face
  // R6: sem layout shift (width/height em imagens)
  // R7: aria-label em sections
  // R8: meta description < 160 chars
  // R9: heading text-wrap: balance
  // R10: CTA button focus-visible outline
  // ... 85 regras
}
```

---

## 2. Arquitetura de Slots (o coração da ADR)

### 2.1 Slots disponíveis (com inteligência por slot)

Cada slot tem um **propósito de conversão** e recebe **mutações específicas** do Morph Resolver.

| Slot | Propósito | PerSlotMutations | Depende de |
|------|-----------|-----------------|-----------|
| **hero** | Headline + CTA principal. Primeira impressão. | gradientAngle, minHeight, badgeStyle, textAlign | L2b rating, strategy.facet |
| **trust** | Prova social: rating, reviews, verificado. | chipStyle, layout(direction), spacing | L2b rating, is_claimed |
| **how** | Passo-a-passo. Reduz ansiedade de decisão. | steps(count), stepStyle, numbering | strategy.pricingFrame |
| **capabilities** | Especialidades/serviços reais. | columns, cardRadius, cardShadow, cardHover | L2bServices[].length |
| **stats** | Números de impacto: rating, reviews, especialidades. | barStyle, statLayout, emphasis | L2b rating, serviceCount |
| **voice** | Prova social narrativa: "os pacientes falam". | quoteStyle, starsDisplay, linkStyle | L2b rating, reviews count |
| **pricing** | Oferta/CTA com remoção de risco. | emphasis, borderColor, buttonShape | strategy.pricingFrame |
| **faq** | Objeções. Remove barreiras finais. | itemStyle, expandBehavior, questionTone | strategy.faqAngle |
| **cta** | Último empurrão. Urgência/fechamento. | buttonShape, sectionPadding, colorInvert | strategy.facet |
| **social** | Instagram/Facebook embed (se disponível). | embedStyle, platformIcons | L2b socialLinks |
| **map** | Google Maps embed (localização). | mapHeight, zoom, markerStyle | L2b coords, place_id |
| **doctors** | Equipe (se extraída do site). | cardLayout, photoStyle, crmDisplay | L2bDoctors[].length |

**Slots são CONDICIONAIS:** se `L2bDoctors.length === 0` → slot `doctors` não renderiza. Se `!lead.is_claimed` → slot `trust` usa versão reduzida.

### 2.2 slotOrder por estratégia (já definido, NUNCA aplicado)

```typescript
// strategy-resolver.ts — JÁ EXISTE, NUNCA USADO
social_proof: ['hero','trust','voice','stats','how','capabilities','pricing','faq','cta']
urgency:      ['hero','stats','how','capabilities','trust','voice','pricing','faq','cta']
scarcity:     ['hero','stats','capabilities','trust','how','voice','pricing','faq','cta']
guarantee:    ['hero','how','pricing','trust','capabilities','stats','voice','faq','cta']
authority:    ['hero','capabilities','trust','how','stats','voice','pricing','faq','cta']
```

**Cada slotOrder conta uma história diferente:**

- **social_proof:** "Olha quanta gente confia na gente" → trust/voice cedo
- **urgency:** "Não perca tempo" → stats/how cedo, trust depois
- **scarcity:** "Poucos fazem o que fazemos" → capabilities cedo (diferenciação)
- **guarantee:** "Sem risco" → pricing cedo (logo após how)
- **authority:** "Somos os melhores nisso" → capabilities primeiro

---

## 3. Plano de Implementação

### Fase 1 · Brand DNA + slotOrder (2h · $0)

| # | O que | Arquivo | Tempo |
|---|-------|---------|-------|
| 1.1 | `unifyTokens()` aceita Brand DNA do L2b | `warp-composer.ts` | 30min |
| 1.2 | T.font = fonte real do L2b | `warp-composer.ts` | 15min |
| 1.3 | `renderS11_GREEN` usa `strat.slotOrder` em vez de ordem fixa | `warp-composer.ts` | 30min |
| 1.4 | Slots condicionais: doctors, social, map só se existirem | `warp-composer.ts` | 30min |
| 1.5 | Remover `PERSONA_FALLBACK` (template v0.8) | `warp-composer.ts` | 15min |

### Fase 2 · PerSlotMutations (2h · $0)

| # | O que | Arquivo | Tempo |
|---|-------|---------|-------|
| 2.1 | `resolveMorph()` → cada slot lê suas mutações | `morph-resolver.ts` | 1h |
| 2.2 | `renderS11_GREEN` aplica mutações por slot (gradient, radius, columns, shadow) | `warp-composer.ts` | 1h |

### Fase 3 · Best Practice Gate (1.5h · $0)

| # | O que | Arquivo | Tempo |
|---|-------|---------|-------|
| 3.1 | `applyBestPracticeGate()` — top 15 regras estruturais | `warp-composer.ts` | 1h |
| 3.2 | Gate executado ANTES do `applyQualityGate` (Unslop) | `warp-composer.ts` | 15min |
| 3.3 | Métricas: `bpViolations`, `bpFixes` no meta | `warp-composer.ts` | 15min |

### Fase 4 · Vocab Full Power (1.5h · $0)

| # | O que | Arquivo | Tempo |
|---|-------|---------|-------|
| 4.1 | `resolveIntentVocab` expandido: marketData + L2b persona | `warp-composer.ts` | 30min |
| 4.2 | designFacets → atmosphere → afeta paleta, spacing, motion | `vocab-resolver.ts` | 30min |
| 4.3 | animationFacets → keyframe selection por estratégia | `warp-composer.ts` | 30min |

### Fase 5 · Marketing Skills → Slot Content (2h · $0)

| # | O que | Arquivo | Tempo |
|---|-------|---------|-------|
| 5.1 | local-seo → conteúdo do slot `seo` (meta, keywords, schema) | `warp-composer.ts` | 30min |
| 5.2 | objection-crusher → conteúdo do slot `faq` (perguntas REAIS) | `warp-composer.ts` | 30min |
| 5.3 | social-media → conteúdo do slot `social` (embed, calendário) | `warp-composer.ts` | 30min |
| 5.4 | whatsapp-business → CTA otimizado por canal | `warp-composer.ts` | 15min |
| 5.5 | marketing-plan → upsell path no slot `pricing` | `warp-composer.ts` | 15min |

**Total: ~9h · $0 · 3 arquivos modificados (warp-composer.ts, strategy-resolver.ts, morph-resolver.ts)**

---

## 4. Verificação (antes/depois)

| O que | Antes (HOJE) | Depois (ADR-0054) |
|-------|-------------|-------------------|
| **Cores** | `oklch(0.55 0.18 220)` (NICHO_MAP palette) | `#a02040` + `#90d000` (Brand DNA real da Renove) |
| **Fontes** | `Inter` sempre | `Roboto` (font real do site) |
| **Ordem dos slots** | Fixa: hero→trust→how→caps→stats→voice→pricing→faq→cta | Variável por estratégia: social_proof ≠ urgency ≠ scarcity |
| **Slots** | 9 fixos | 12 condicionais (doctors, social, map aparecem se existirem) |
| **Morph** | Computado, não aplicado | Cada slot aplica suas mutações (gradient, radius, shadow, columns) |
| **Best Practices** | bpScore no meta | 15+ regras aplicadas como gate estrutural |
| **PersonaFallback** | "Quero meu Raio-X gratuito" (template v0.8) | REMOVIDO — substituído por persona derivada do L2b |
| **Marketing Skills** | Output textual no meta | Conteúdo real nos slots: faq, social, pricing, seo |
| **Design System** | Só tokens de cor | Componentes Warp + CSS patterns aplicados |

---

## 5. Exemplo concreto: Renove Odontologia

### Antes (commit 59e41c2 — estado atual)

```
cores: oklch(0.55 0.18 220) — azul genérico
fontes: Inter
ordem: fixa (hero→trust→how→caps→stats→voice→pricing→faq→cta)
slots: 9 fixos, doctors não aparece (extraído mas ignorado)
morph: ignorado
```

### Depois (ADR-0054 implementada)

```
cores: #a02040 (burgundy) + #90d000 (verde) — Brand DNA REAL
fontes: Roboto (do site real)
ordem social_proof: hero→trust★→voice★→stats→how→caps→pricing→faq→cta
       (trust e voice cedo = "4.9★ 118 avaliações" como prova social)
slots: 12 — doctors aparece (staff extraído do site)
       social aparece (Instagram @dra.gabiperuch)
morph: hero.gradientAngle=135°, capabilities.columns=3, pricing.emphasis=highlight
best practices: CTA visível, contraste validado, aria-labels, font-display:swap
faq: perguntas REAIS do objection-crusher, não NICHO_MAP pains
social: embed do Instagram + calendário editorial
```

---

## 6. Fontes (DAG)

| Camada | Arquivo | Linhas | O que prova |
|--------|---------|--------|-------------|
| Strategy Defs | `strategy-resolver.ts:55-100` | 45 | slotOrder definido, nunca aplicado |
| Morph Mutations | `morph-resolver.ts:168-276` | 108 | PerSlotMutations computado, nunca aplicado |
| Vocab Facets | `vocab-resolver.ts` | — | 4 tipos de facets, só 1 usado |
| Best Practices | `best-practice-kg.ts:55-120` | 65 | 85 regras, getA11yEnforcement/getPerfEnforcement nunca chamadas |
| Brand DNA | `design-extractor.ts` | — | cores, fontes, score extraídos, ignorados |
| S10 (referência) | `warp-composer.ts:1040-1127` | 87 | S10 JÁ aplica slotOrder + PerSlotMutations |
| S11 render | `warp-composer.ts:1779-1960` | 181 | renderS11_GREEN com slots fixos |
| PersonaFallback | `warp-composer.ts:349-354` | 6 | Template "Raio-X gratuito" ainda presente |

**Confiança:** HIGH — 8 fontes de código, DAG 5-passos, todos os sistemas verificados.

---

*ADR-0054 · 2026-07-20 · adsentice · Intent-Driven Slot Composition · Toda inteligência de marketing destravada no compositor*
