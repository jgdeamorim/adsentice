# Auditoria Completa — k0 + JSX Render + Surface Warp + Corpus Design

**medido=verdade · 2026-07-18 · adsentice**

## 1. CORPUS DISTRIBUTION (19,716 pts adsentice-self)

| Kind | Count | Wireado? | Consumido por |
|------|:---:|:---:|------|
| `design-knowledge` | 6,267 | 🟡 parcial | queryDesignBestPractices (vec, não aplicado) |
| `component` | ~250 | ✅ | queryComponentsByIntent + queryMediaIcons |
| `marketing-skill` | 40 | ✅ | queryRelevantSkills (marketing-kg) |
| `best-practice` | 85 | 🔴 NÃO | Nenhum (ingerido hoje, sem consumer) |
| `media-knowledge` | ~30 | ✅ | queryCSSPatterns + queryMediaAnimation |
| `design-system` | 150+ | ✅ | queryDesignSystem (OD via vec) |
| `doc/spec/adr` | ~100 | 🟡 parcial | DAG skill (KG-first recall) |
| `k0 code entity` | 984 | 🟡 query-only | nenhum consumer no compose pipeline |
| `materio token` | 36 | ✅ | queryMaterioTokens |

## 2. K0 NEXT.JS AWARENESS (984 entities, 8,226 edges)

| Dimensão | Valor | Wireado no compose? |
|----------|-------|:---:|
| `nextjs_role=page` | 20 pages | 🔴 (poderia sugerir templates) |
| `nextjs_role=layout` | 1 layout | 🔴 |
| `nextjs_role=route-handler` | 9 API routes | 🔴 |
| `react_mode=server` | 154 (78%) | 🔴 |
| `react_mode=client` | 45 (22%) | 🔴 |
| `css_framework=tailwind` | 79 (40%) | 🔴 |
| `css_framework=mui` | 14 (7%) | 🔴 |
| Route hierarchy | 30 distinct routes | 🔴 |
| Edges (renders) | 3,588 | 🔴 (poderia validar component tree) |
| Edges (applies) | 3,355 | 🔴 (poderia validar CSS usage) |
| Edges (consumes) | 702 | 🔴 (poderia validar token usage) |

**Gap:** k0 nunca é consultado pelo pipeline de composição. Serve apenas como índice pesquisável.

## 3. JSX RENDER — S10 Raio-X (7 arquivos)

| Arquivo | Props | Morph? | Corpus-driven? |
|---------|-------|:---:|:---:|
| `S10RaioX.tsx` | output, T, O, morph, vocab, icons | ✅ | cssLayout() usa morph.* |
| `HeroSlot.tsx` | output, O, icon, morph | ✅ | morph recebido mas NÃO aplicado |
| `ScoreSlot.tsx` | output, T, morph | ✅ | barGap via morph.score.barGap |
| `InfoGridSlot.tsx` | output, slot, icon, morph | ✅ | cols via morph.infoCards |
| `GapListSlot.tsx` | output, T, O, icon, morph | ✅ | morph recebido mas NÃO aplicado |
| `CtaSlot.tsx` | output, T, O, icon, morph | ✅ | sectionPad via morph.cta |
| `FooterSlot.tsx` | output, T, O, morph | ✅ | padding via morph.footer |

**Status:** Morph prop chega em todos os slots. S10RaioXPage CSS é totalmente morph-driven. Slots individuais usam parcialmente. **Não está wireado em rota nenhuma** — a composição real ainda usa `renderS10_GREEN` string concat.

## 4. SURFACE WARP — 22 surfaces

| Surface | Status | Specialist | Grammar registered? |
|---------|:---:|------|:---:|
| S1 Landing Page | 🔴 planned | ❌ | Não |
| S2 Onboarding | 🔴 planned | ❌ | Não |
| S3 Dashboard Admin | 🟡 partial | ❌ | Não |
| S4 Checkout | 🟡 partial | ❌ | Não |
| S5 Cockpit TOP-K | 🔴 planned | ❌ | Não |
| S6 Market Intel | 🔴 planned | ❌ | Não |
| S7 Competitor Deep-Dive | 🔴 planned | ❌ | Não |
| S8 Content Strategy | 🔴 planned | ❌ | Não |
| S9 SEO Audit | 🔴 planned | ❌ | Não |
| **S10 Raio-X** | ✅ **LIVE** | ✅ S10_SPECIALIST | ✅ (l.66-125) |
| S11 Landing Cliente | 🔴 planned | ❌ | Não |
| S12 Email Campaign | 🔴 planned | ❌ | Não |
| S13 Social Media | 🔴 planned | ❌ | Não |
| S14 Ads Intelligence | 🔴 planned | ❌ | Não |
| S15 Review Manager | 🔴 planned | ❌ | Não |
| S16 Booking Engine | 🔴 planned | ❌ | Não |
| S17 WhatsApp Hub | 🔴 planned | ❌ | Não |
| S18 CRM Pipeline | 🔴 planned | ❌ | Não |
| S19 Analytics Dashboard | 🔴 planned | ❌ | Não |
| S20 AI Content Writer | 🔴 planned | ❌ | Não |
| S21 Brand IQ | 🔴 planned | ❌ | Não |
| S22 White Label Config | 🔴 planned | ❌ | Não |

**Gap:** 1/22 surfaces implemented. 21 surfaces precisam de `SurfaceSpecialist` com gramática de slots + `inferLayout()`.

## 5. PIPELINE WIRING — O que cada query retorna vs o que é consumido

| Query | Retorna | Wireado em | Consumido pelo render? |
|-------|---------|-----------|:---:|
| `M9.compose()` | TokenSet (6 pipelines) | BLUE L3 | ✅ T.primary/T.spacing via unifyTokens |
| `queryDesignSystem()` | OD system (colors, layout, components) | BLUE L3 | ✅ T.bg/T.fg/T.card/T.container via unifyTokens |
| `queryMaterioTokens()` | 36 tokens | BLUE L3 | ✅ T.spacing/T.shadows/T.motion via unifyTokens |
| `queryMediaIcons(iconFacets)` | SVG markup | BLUE L3 | ✅ output.icons → icon('name') |
| `queryMediaAnimation(animFacets)` | keyframes + motion | BLUE L3 | 🟡 usado só no morph.resolveMorph |
| `queryCSSPatterns()` | microInteractions + layoutRecs + keyframeVariants | BLUE L3 | 🟡 só @keyframes enrichment |
| `queryDesignBestPractices()` | color/typo/spacing/motion recs | BLUE L3 | 🔴 NÃO CONSUMIDO pelo render |
| `queryRelevantSkills()` | 40 frameworks text | BLUE L4b | 🟡 só trace nos gaps |
| `resolveIntentVocab()` | 55 facets | BLUE L3 | 🟡 CSS comment + meta trace |
| `resolveMorph()` | PerSlotMutations | BLUE L5 | ✅ cssLayout() no JSX · 🟡 string concat |
| `computeMarketOntology()` | persona + psychology + design | BLUE L5 | 🟡 usado em labels e badge text |
| `queryComponentsByIntent()` | 60+ components | BLUE L6 | 🔴 a11y extraído, componente ignorado |
| `fetchComponentsByIds()` | component dependencies | BLUE L6 | 🔴 usado só no Graph BFS |
| **k0 entities** | 984 code entities | NUNCA | 🔴 NÃO CONSULTADO |
| **best-practices** | 85 rules | NUNCA | 🔴 NÃO CONSULTADO (ingerido hoje) |

## 6. GAPS POR SEVERIDADE

### 🔴 CRÍTICO — Quebra qualidade de composição

| Gap | Impacto | Correção |
|-----|---------|----------|
| `queryDesignBestPractices` retorna mas ninguém consome | Design recommendations ignoradas | Wire no morph-resolver como hints adicionais |
| `best-practices` (85 regras) sem consumer | WCAG, React perf, landing patterns sem efeito | Criar `queryBestPractices(domain)` + wire no QG e morph |
| k0 nunca consultado | Code structure knowledge inútil para composição | `queryK0ForSurface(surface)` → sugerir componentes existentes |
| `queryComponentsByIntent` retorna 60+ mas render ignora | A11y extraído, componente descartado | Wire `component.description` no morph (SVG markup, tokens) |
| Surface Router: 1/22 | Só S10 funciona | Template `SurfaceSpecialist` factory |

### 🟡 ALTO — Reduz qualidade

| Gap | Impacto | Correção |
|-----|---------|----------|
| `queryCSSPatterns().microInteractions` parse textual frágil | CSS derivado por regex em texto descritivo | Estruturar retorno com regras CSS aplicáveis |
| `queryCSSPatterns().layoutRecommendations` parse textual | Layout hints perdidos no ruído | Estruturar retorno com spacing/columns/max-width |
| JSX S10RaioXPage sem rota | Nunca renderizado em produção | Criar rota `/api/surface/compose-jsx` ou page |
| Morph só no JSX, não no string concat | String concat (produção) sem morph | Backport morph para `renderS10_GREEN` |
| Dark/light mode ingerido mas light-first | Padrões de dark mode sem uso | Documentar como "referência futura", não wire |

### 🟢 BAIXO — Oportunidades de melhoria

| Gap | Impacto | Correção |
|-----|---------|----------|
| k0 edges (8,226) poderiam validar component tree | Detecção de components órfãos | Wire no QG como check adicional |
| `landing-page` patterns só para S11 | S10 poderia usar CTA placement hints | Expandir surface scope |
| `token consumes` edges (702) | Detecção de tokens não utilizados | Wire no `unifyTokens` para pruning |

## 7. AÇÕES PRIORITÁRIAS (ordenadas por impacto)

| # | Ação | Arquivos | Ganho |
|---|------|----------|:---:|
| 1 | Wire `best-practices` → `queryBestPractices(domain)` → morph | novo: `best-practice-kg.ts` + morph-resolver | CSS + a11y + perf enforcement |
| 2 | Wire k0 → `queryK0ForSurface(surface)` → sugerir templates | `warp-kg.ts` + morph-resolver | Reuso de componentes existentes |
| 3 | Backport morph para `renderS10_GREEN` (string concat) | `warp-composer.ts` | Morph ativo em produção |
| 4 | Estruturar `queryCSSPatterns` retorno (não texto) | `warp-kg.ts` + morph-resolver | CSS derivation determinística |
| 5 | Criar rota para JSX S10RaioXPage | `route.ts` | JSX render acessível |
| 6 | SurfaceSpecialist template factory | `4-composer.ts` | Desbloquear S11, S3, S5 |
