---
id: ADR-0036
title: Kimera é o Gabarito — Plugin System + Antigravity como runtime do Design Vivo
status: proposed
date: 2026-07-18
deciders: [jgdeamorim]
consulted: [claude]
extends: [ADR-0017, ADR-0018, ADR-0034]
related: [ADR-0035, ADR-0020, ADR-0032, ADR-0033]
---

# ADR-0036 — Kimera é o Gabarito

> **"Em 15 de julho de 2026, entre 02:29 e 04:22, o adsentice teve a receita completa para gerar o Karina HTML. O código-fonte dessa receita ainda está no repositório, mas NUNCA foi conectado ao composeS10."**

---

## 1. A Linha do Tempo (2 horas que definiram tudo)

**Fonte:** `git log --oneline --format="%h %ad %s" --date=short` · medido 2026-07-18

| Hora | Commit | O que foi criado |
|------|--------|-----------------|
| 02:29 | `593561e` | **Plugin System** (268 linhas) + **AestheticEnforcement** + **Antigravity insights** (146 linhas) + Kimera JSX referenciado |
| 03:12 | `cd45f90` | S10 Pipeline — rota completa `category→nicho→persona→skills→copy→tokens` |
| 03:13 | `0131183` | **PRIMEIRO Karina HTML** — previews + pipeline outputs |
| 03:24 | `29d4c72` | S10 v2 final — HTML cliente limpo + metadados internos separados |
| 03:34 | `f17c9c9` | Market Intelligence v1.0 — **Trace Feedback Loop** |
| 03:52 | `54145ea` | S10 Generator — "O SISTEMA gera sozinho" |
| 04:09 | `53955d6` | LLM Copywriter — Qwen 2.5 1.5B local |
| 04:22 | `4362d21` | **S10 Generator + DeepSeek Copywriter — pipeline completo** (Karina `_7310.json`) |

**O Karina HTML não foi um acidente.** Foi o produto de um pipeline construído em 2 horas sobre fundamentos que já existiam.

---

## 2. Os Três Pilares Ignorados

### 2.1 Kimera Design System (589 linhas JSX)

**Fonte:** `/media/jeffer/BKP/DOWNLOADS/kimera-design-system.jsx`
**Referenciado em:** `ADR-0017:376`, `ADR-0018:969`, `NOVA ARQUITETURA INFRA-DEVOPS.txt:272`

O Kimera define o **padrão canônico de como tokens viram componentes React**:

```jsx
// NÃO É CSS inline. É OBJETO JS tipado.
COLORS     = { accent, bg, surface, border, text, textDim, textMuted,
               accentDim, accentGlow, accentBorder, accentSoft, overlay, glass }
TYPE_SCALE = { hero, heading, subhead, nodeTitle, body, caption, label, micro, badge }
           // cada nível: { size, weight, font, leading, tracking, transform }
SPACE      = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48, huge:64 }
RADII      = { sm:6, md:8, lg:12, xl:14, xxl:16, pill:50, circle:"50%" }

// PATTERNS = vocabulário de componentes com variantes
PATTERNS = {
  card:          { background, border, borderRadius, backdropFilter, padding },
  cardHighlight: { borderColor, boxShadow },
  badge:         { fontSize, fontWeight, color, background, padding, borderRadius, backdropFilter },
  iconBox:       { width, height, borderRadius, background, display, alignItems, justifyContent, color },
  sectionLabel:  { display, gap, line: { width, height, background, opacity }, text: {...} },
  button: {
    primary:      { padding, fontSize, fontWeight, border, color, borderRadius },
    primaryHover: { background, color },
    tab:          { padding, fontSize, fontWeight, border, borderRadius },
    tabActive:    { background, color },
    tabInactive:  { background, color },
  },
}

ICONS = { cube, filter, grid, shield, rocket, spark, arrowUpRight, pin }
      // cada um: (size) => <svg>...</svg> — SVG inline React

ANIMATIONS = {
  keyframes: "spin, spinRev, pulse, twinkle, scrollX, dashFlow, fadeInUp",
  transitions: { smooth, spring, fadeIn },
  rings: [{ duration, direction }],
  stagger: { base, increment },
}

PHYSICS = { fibonacci, rotation, perspective, repulsion, glow, noise }
```

**O composeS10 HOJE não usa NADA disso.** Gera CSS string inline com 10 variáveis.

**O gap:** cada PATTERN do Kimera deveria ser um `kind=component` ingerido no Qdrant com payload FLAT. O `queryComponentsByIntent` retornaria padrões Kimera, não só 21st-magic/shadcn. A tipografia com 9 níveis substituiria `font-size: clamp(...)` único.

### 2.2 Plugin System (268 linhas TypeScript)

**Fonte:** `packages/warp/src/plugins.ts` · `packages/warp/src/5-registry.ts:105`
**Criado em:** `593561e` (15/07 02:29)

Já implementado, validado, **nunca chamado pelo composeS10**:

```typescript
Plugin {
  detect(): Promise<boolean>       // Semantic Intent Matching (≡ Antigravity Skill)
  activate(): Promise<void>
  deactivate(): Promise<void>
  onEnrich(ctx): Promise<DesignContext>    // L3 — enriquece com design tokens Kimera
  onCritique(score, ctx): Promise<{score, enforced}>  // L5 — Aesthetic Enforcement
  onGenerate(ctx, html): Promise<string>  // L7 — injeta PATTERNS + dark mode
}

// JÁ IMPLEMENTADO:
AestheticEnforcementPlugin {
  onCritique: penaliza -3 hardcoded colors, -2 sem dark mode,
              -1 sem animações, -2 placeholder text
  onGenerate: injeta @media (prefers-color-scheme: dark)
}
```

**Ciclo de vida Antigravity:**
```
detect → activate → pipeline hooks (onEnrich/onCritique/onGenerate) → deactivate
   │         │
   │         └─ Skills = Semantic Intent Matching (Antigravity §Skills)
   └─ CortexStep = unidade atômica de execução (Antigravity §02-dag)
```

**O gap:** o composeS10 não chama `pluginRegistry.activateAll()`. Não executa `onEnrich`, `onCritique`, `onGenerate`. O AestheticEnforcement existe mas nunca penaliza nada porque nunca é invocado.

### 2.3 Antigravity DAG Implícita + Insights (146 linhas + 20 docs mapping)

**Fonte:** `docs/spec/adsentice-design-antigravity-insights.md` · `/media/jeffer/BKP/PROJETOS/CODE-OSS/docs-antigravity/mapping/`

| Conceito Antigravity | Equivalente adsentice | Status |
|---------------------|----------------------|--------|
| **CortexStep** (160+ tipos, unidade atômica) | Stages do `4-composer` Atomic Pipeline | ✅ implementado, wire pendente |
| **Cascade** (sessão, cascadeId) | `composer.compose(request)` | ✅ implementado |
| **Trajectory** (DAG materializada) | `LayoutTree` + `tracedLayout` + meta sidecar | ✅ implementado |
| **Skill** (Semantic Intent Matching) | `Plugin.detect()` → pipeline hooks | ✅ código existe, NUNCA chamado |
| **Workflow** (determinístico) | `composeS10` | ✅ em produção |
| **Aesthetic Enforcement** (§1.2, constraint de segurança) | `AestheticEnforcementPlugin` | ✅ código existe, NUNCA chamado |
| **KI Priority Absolute → DKIs** | Design Knowledge Items no Qdrant | ✅ 6.267 pts, zero threshold |
| **Brand DNA 6+1 pilares** | Kimera COLORS+TYPE_SCALE+PATTERNS | 🔴 ingerir Kimera como corpus |

---

## 3. Decisão

**O composeS10 DEVE wirear o Plugin System.** Três pontos de hook, zero código novo:

```
POST /api/surface/compose { place_id }
  L0-L2: fetch → classify → computeGaps (EXISTENTE)
  ─── PLUGIN HOOK 1: onEnrich ───
  L3: pluginRegistry.activateAll() → cada plugin.onEnrich(ctx)
      → KimeraEnrichPlugin: busca PATTERNS.card/badge/button no Qdrant
      → AestheticEnrichPlugin: carrega paleta estendida (16 tokens vs 5)
  ─── SENSOR + GRAPH ───
  L3-L4: queryComponentsByIntent + resolveComponentGraph (EXISTENTE)
  ─── PLUGIN HOOK 2: onCritique ───
  L5: computeCritique(graph, seg) → cada plugin.onCritique(score, ctx)
      → AestheticEnforcementPlugin: penaliza hardcoded colors, sem dark mode
      → retorna { score, enforced: true } — reduz composite se violações
  ─── Devloop (EXISTENTE) ───
  ─── PLUGIN HOOK 3: onGenerate ───
  L7: cada plugin.onGenerate(ctx, html)
      → AestheticEnforcementPlugin: injeta @media dark mode
      → KimeraGeneratePlugin: substitui CSS inline por PATTERNS do corpus
  ─── RENDER + META (EXISTENTE) ───
```

### Ingestão do Kimera como corpus

O arquivo `kimera-design-system.jsx` deve ser ingerido via pipeline L0→L6 (ADR-0035 §6):

| Kind | Payload | Chunks |
|------|---------|--------|
| `design-system` | PATTERNS (card, badge, button, iconBox, sectionLabel) | 4 chunks (cores, tipografia, componentes, animações) |
| `component` | ICONS (cube, filter, grid, shield, rocket, spark, arrowUpRight, pin) | 1 chunk cada (SVG inline React) |
| `design-knowledge` | ANIMATIONS (keyframes, transitions, rings, stagger) | 2 chunks (css, physics) |
| `design-knowledge` | PHYSICS (fibonacci, rotation, perspective, repulsion, glow, noise) | 1 chunk |

**Custo:** $0 (L0-L5 determinístico, L6 não necessário — Kimera já é P0).

Após ingestão, `queryDesignSystem('beleza', 'S10')` retorna Kimera PATTERNS. `queryComponentsByIntent('badge hero')` retorna ICONS. O composeS10 consome automaticamente.

---

## 4. O que Estava Errado no HTML Gerado (diagnóstico root-cause)

O `warp-s10-od-bbc.html` é feio porque:

1. **CSS string, não PATTERNS:** `font-size: clamp(1.5rem, 3.5vw, 2.25rem)` — 1 nível. Kimera tem 9 níveis tipográficos.
2. **5 cores, não 16:** `--primary, --secondary, --accent, --bg, --fg`. Kimera tem `textDim, textMuted, accentDim, accentGlow, accentBorder, accentSoft, overlay, glass`.
3. **Zero animações:** `var(--motion)` único. Kimera tem 7 keyframes + 3 transitions + stagger + animateMotion.
4. **Zero ícones:** emoji `🔍📊💬`. Kimera tem 8 SVGs inline com stroke profissional.
5. **Dark mode ausente:** sem `@media (prefers-color-scheme: dark)`. O AestheticEnforcementPlugin já detecta e penaliza isso — mas nunca é chamado.
6. **Botão único:** `.cta-btn` pill branco. Kimera tem `button.primary` (outlined accent) + `button.tab` (active/inactive).
7. **Sem vocabulário de componentes:** `.hero-badge`, `.score-card`, `.gap` são classes CSS inventadas na hora. Kimera tem `PATTERNS.badge` (blur + uppercase + mono), `PATTERNS.card` (blur + border + radius-xl), `PATTERNS.sectionLabel` (linha + texto).
8. **Bug CSS literal:** `--shadow-lg: 0 4px 8pxpx rgba(0,0,0,0.8%)` — parse do OD vazou texto markdown. O AestheticEnforcementPlugin detectaria "valor CSS inválido" e corrigiria.

---

## 5. Implementação

### Fase 1 · Wire Plugin System no composeS10 (agora, ~30min)

| Passo | Arquivo | Ação |
|-------|---------|------|
| 1 | `warp-composer.ts` | Importar `pluginRegistry` de `packages/warp/src/plugins.ts` |
| 2 | `warp-composer.ts` | `pluginRegistry.activateAll()` no início de `composeS10` |
| 3 | `warp-composer.ts` | Chamar `plugin.onEnrich(ctx)` após L2 (computeGaps) |
| 4 | `warp-composer.ts` | Chamar `plugin.onCritique(score, ctx)` após L5 (computeCritique) |
| 5 | `warp-composer.ts` | Chamar `plugin.onGenerate(ctx, html)` antes do return |
| 6 | `plugins.ts` | `AestheticEnforcementPlugin.onGenerate` — injetar dark mode + validar CSS |

### Fase 2 · Ingerir Kimera como corpus (agora, ~15min)

| Passo | Ação |
|-------|------|
| 1 | Pipeline L0→L6: extrair PATTERNS, ICONS, ANIMATIONS, PHYSICS do JSX |
| 2 | UPSERT no Qdrant como `kind=design-system` + `kind=component` + `kind=design-knowledge` |
| 3 | Verificar: `queryDesignSystem('beleza', 'S10')` retorna Kimera PATTERNS |

### Fase 3 · Render baseado em PATTERNS (pós-wire)

| Passo | Ação |
|-------|------|
| 1 | `composeS10` — substituir CSS inline por `PATTERNS.card`/`PATTERNS.badge`/`PATTERNS.button` do Qdrant |
| 2 | Tipografia: usar `TYPE_SCALE` 9 níveis em vez de `clamp()` único |
| 3 | Ícones: `queryComponentsByIntent('badge spark rocket')` → SVGs inline |
| 4 | Animações: injetar keyframes Kimera + `prefers-reduced-motion` |

---

## 6. Lição Final

O adsentice NÃO tem problema de inteligência. Tem problema de **fiação**:

| O que existe | Onde | Conectado ao composeS10? |
|---|---|---|
| Kimera Design System (589 linhas) | `/media/jeffer/BKP/DOWNLOADS/` | ❌ não ingerido |
| Plugin System (268 linhas) | `packages/warp/src/plugins.ts` | ❌ nunca chamado |
| AestheticEnforcement | `plugins.ts` (implementado) | ❌ nunca invocado |
| Antigravity Insights (146 linhas) | `docs/spec/` | ❌ documentado, não aplicado |
| 6.267 design-knowledge Qdrant | `adsentice-self` | ✅ queryDesignBestPractices |
| 150 OD estilos design-system | `adsentice-self` | ✅ queryDesignSystem |
| 236 componentes (flat payload) | `adsentice-self` | ✅ queryComponentsByIntent |
| composeS10 pipeline | `warp-composer.ts` | ✅ em produção |
| Critique 6D + Devloop | `warp-composer.ts` | ✅ em produção |

**6 dos 9 componentes já existem. 3 nunca foram conectados.** O Karina HTML nasceu num momento em que todos estavam alinhados. Perdemos qualidade porque evoluímos o composeS10 sem conectar os plugins que davam a qualidade estética.

### O que muda AGORA

1. Wire Plugin System → onEnrich/onCritique/onGenerate
2. Ingerir Kimera JSX como corpus
3. CSS inline vira PATTERNS do Qdrant

Custo total: $0. Tempo: 45min. Zero código novo — só conectar o que já existe.

---

## Referências

- `packages/warp/src/plugins.ts` (268 linhas) — Plugin System + AestheticEnforcement
- `packages/warp/src/5-registry.ts:105` — Plugin schema Zod + PluginRegistry
- `/media/jeffer/BKP/DOWNLOADS/kimera-design-system.jsx` (589 linhas) — Gabarito
- `docs/spec/adsentice-design-antigravity-insights.md` (146 linhas) — 9 insights mapeados
- `/media/jeffer/BKP/PROJETOS/CODE-OSS/docs-antigravity/mapping/02-dag.md` — DAG implícita
- `docs/adr/0017-frontend-enterprise-react-vite-tailwind-shadcn.md` — stack target
- `docs/adr/0035-genealogia-excelencia-rsxt-evo-karina.md` — genealogia completa
- Commits `593561e`→`4362d21` (15/07, 2h) — timeline da receita original
- `docs/preview/warp-s10-dra-karina-santos-oliveira---periodonti-s10_7310.html` — o resultado
- `docs/preview/warp-s10-od-bbc.html` — o estado atual (degradado)
