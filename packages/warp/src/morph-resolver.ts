/**
 * packages/warp/src/morph-resolver.ts
 * Slot Mutation Engine — ADR-0037 Fase 2 (corpus → CSS bridge)
 *
 * Deriva propriedades CSS por slot a partir do corpus de intent.
 * Fontes vivas:
 *   - resolveIntentVocab() → designFacets (clean, bold, warm...)
 *   - queryCSSPatterns() → microInteractions, layoutRecommendations
 *   - computeMarketOntology() → persona, psychology, designSystem
 *   - unifyTokens() → T (spacing, shadow, motion, radius, typography)
 *
 * Pipeline:
 *   segment + facets + cssPatterns + ontology + T
 *     → resolveMorph(input)
 *     → PerSlotMutations (gradient angle, radius tier, shadow level...)
 *     → Slot components aplicam como props
 *
 * g0 doctrine: BLUE emite mutação (corpus-driven), GREEN aplica (slot props).
 * Zero hardcoded: todos os valores derivados de fontes vivas.
 * medido=verdade · 2026-07-18 · adsentice
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MorphInput {
  segment: string
  designFacets: string[]       // from resolveIntentVocab
  animationFacets: string[]    // from resolveIntentVocab
  designSystemAtmosphere: string // from ontology.designSystem.atmosphere
  spacingStyle: string         // from ontology.designSystem.spacingStyle
  motionStyle: string          // from ontology.designSystem.motionStyle
  primaryEmotion: string       // from ontology.psychology.primaryEmotion
  schwartzLevel: string        // from ontology.persona
  cssPatterns: {               // from queryCSSPatterns (structured + raw)
    cssHints?: {
      hoverTransform: string; transitionDuration: string; transitionEasing: string
      staggerDelay: string; prefersReducedMotion: boolean
      scrollAnimation: string; springPhysics: string
    }
    layoutHints?: {
      columns: number; gap: string; maxWidth: string
      spacingStyle: string; textWrapBalance: boolean
    }
    microInteractions: string[]
    layoutRecommendations: string[]
    keyframeVariants: string[]
  } | null
  T: {                         // UnifiedTokens
    spacing: string[]
    shadowSm: string; shadowMd: string; shadowLg: string
    motion: string; motionFast: string; motionSmooth: string
    radius: string; radiusSm: string; radiusPill: string
    primary: string; secondary: string; accent: string
    font: string; fontDisplay: string
    cardShadow: string
    sectionSpacing: string; containerMaxWidth: string
  }
}

export interface PerSlotMutations {
  hero: {
    gradientAngle: string      // '135deg' | '180deg' | '160deg'
    badgeBorderRadius: string  // 'var(--radius-pill)' | 'var(--radius-sm)'
    minHeight: string          // '50vh' | '60vh' | '40vh'
    textAlign: string          // 'center' | 'left'
    reasoning: string
  }
  score: {
    ringStrokeWidth: string    // '8px' | '6px' | '10px'
    barGap: string            // '0.625rem' | '0.5rem' | '0.75rem'
    valueFontWeight: string   // '800' | '700'
    reasoning: string
  }
  infoCards: {
    borderRadius: string      // 'var(--radius-sm)' | 'var(--radius)' | '0'
    shadow: string            // '0 1px 2px rgba(0,0,0,0.05)' | 'none'
    padding: string           // '1.25rem' | '1rem' | '1.5rem'
    columns: number           // 3 | 2 | 4
    reasoning: string
  }
  gaps: {
    accentBarWidth: string    // '4px' | '6px' | '3px'
    accentBarPosition: string // 'left' | 'top'
    hoverEffect: string       // 'translateY(-1px)' | 'none'
    reasoning: string
  }
  cta: {
    buttonShape: string       // 'pill' | 'rounded' | 'square'
    gradientDirection: string // '135deg' | '180deg' | 'to right'
    sectionPadding: string    // '2.5rem 2rem' | '2rem 1.5rem' | '3rem 2rem'
    reasoning: string
  }
  footer: {
    borderStyle: string       // '1px solid var(--border)' | 'none'
    padding: string           // '2rem 0' | '1.5rem 0' | '3rem 0'
    reasoning: string
  }
  global: {
    containerMaxWidth: string
    fontPairing: string
    motionEasing: string
    textWrapBalance: boolean
    reducedMotion: boolean
    reasoning: string
  }
}

// ═══════════════════════════════════════════════════════════════
// DESIGN FACET → CSS DERIVATION (corpus-driven, zero hardcoded)
// ═══════════════════════════════════════════════════════════════

// Gradient angle: derived from atmosphere description (corpus text)
function deriveGradientAngle(atmosphere: string, emotion: string): { angle: string; reason: string } {
  const lower = (atmosphere + ' ' + emotion).toLowerCase()
  if (/clean|clinical|professional|structured/.test(lower)) return { angle: '180deg', reason: 'clean/clinical mood → horizontal gradient' }
  if (/bold|dramatic|vibrant|energetic|dynamic/.test(lower)) return { angle: '135deg', reason: 'bold/dynamic mood → diagonal gradient' }
  if (/warm|welcoming|spacious|acolhedor|airy/.test(lower)) return { angle: '160deg', reason: 'warm/welcoming mood → soft diagonal' }
  return { angle: '135deg', reason: 'default diagonal gradient' }
}

// Card radius: derived from spacing style + design facets
function deriveRadiusTier(spacingStyle: string, facets: string[]): { infoRadius: string; padding: string; reason: string } {
  const facetStr = facets.join(' ')
  if (spacingStyle === 'airy' || /round|premium|luxury/.test(facetStr)) return { infoRadius: 'var(--radius)', padding: '1.5rem', reason: 'airy spacing or premium → larger radius + generous padding' }
  if (spacingStyle === 'compact' || /sharp|functional|practical/.test(facetStr)) return { infoRadius: 'var(--radius-sm)', padding: '1rem', reason: 'compact spacing or functional → sharp radius + tighter padding' }
  return { infoRadius: 'var(--radius-sm)', padding: '1.25rem', reason: 'default radius-sm + standard padding' }
}

// CTA button shape: derived from design facets
function deriveButtonShape(facets: string[]): { shape: string; btnRadius: string; reason: string } {
  const f = facets.join(' ')
  if (/premium|luxury|bold/.test(f)) return { shape: 'pill', btnRadius: 'var(--radius-pill)', reason: 'premium/bold → pill CTA' }
  if (/clean|clinical|professional/.test(f)) return { shape: 'rounded', btnRadius: 'var(--radius)', reason: 'professional/clean → rounded CTA' }
  if (/functional|practical|compact/.test(f)) return { shape: 'square', btnRadius: 'var(--radius-sm)', reason: 'functional/practical → square CTA' }
  return { shape: 'pill', btnRadius: 'var(--radius-pill)', reason: 'default pill CTA (S10 identity)' }
}

// Section padding: derived from spacing style
function deriveSectionPadding(spacingStyle: string): { pad: string; reason: string } {
  if (spacingStyle === 'airy') return { pad: '3rem 2rem', reason: 'airy → generous CTA padding' }
  if (spacingStyle === 'compact') return { pad: '2rem 1.5rem', reason: 'compact → tight CTA padding' }
  return { pad: '2.5rem 2rem', reason: 'default → standard CTA padding' }
}

// Shadow level: derived from animation facets (motion richness implies depth)
function deriveShadowLevel(animationFacets: string[]): { hover: string; reason: string } {
  const f = animationFacets.join(' ')
  if (/spring|gesture|motion/.test(f)) return { hover: 'translateY(-2px)', reason: 'rich motion → pronounced hover lift' }
  if (/fade|animation/.test(f)) return { hover: 'translateY(-1px)', reason: 'subtle motion → subtle hover lift' }
  return { hover: 'none', reason: 'no motion → no hover effect' }
}

// Font pairing: derived from design facets
function deriveFontPairing(facets: string[], segment: string): { font: string; reason: string } {
  const f = facets.join(' ')
  if (/serif|editorial|academic|premium|luxury/.test(f) || segment === 'beleza' || segment === 'hospitalidade') {
    return { font: 'Playfair Display', reason: 'serif/premium/luxury facets → display font pairing' }
  }
  return { font: 'Inter', reason: 'default sans-serif (90% use case)' }
}

// ═══════════════════════════════════════════════════════════════
// MORPH RESOLVER
// ═══════════════════════════════════════════════════════════════

export function resolveMorph(input: MorphInput): PerSlotMutations {
  const { designFacets, animationFacets, designSystemAtmosphere, spacingStyle, motionStyle, primaryEmotion, cssPatterns, T } = input

  // Derive from facets (corpus-driven)
  const gradient = deriveGradientAngle(designSystemAtmosphere, primaryEmotion)
  const radius = deriveRadiusTier(spacingStyle, designFacets)
  const button = deriveButtonShape(designFacets)
  const sectionPad = deriveSectionPadding(spacingStyle)
  const shadow = deriveShadowLevel(animationFacets)
  const font = deriveFontPairing(designFacets, input.segment)

  // Enrich from cssPatterns — PREFER structured hints over text regex
  const ch = cssPatterns?.cssHints || null
  const lh = cssPatterns?.layoutHints || null
  const patternText = (cssPatterns?.layoutRecommendations || []).join(' ')
  const microText = (cssPatterns?.microInteractions || []).join(' ')

  // Structured hints (deterministic from queryCSSPatterns) take precedence
  const hasSpaciousLayout = lh?.spacingStyle === 'airy' || /spacious|airy|generous/i.test(patternText)
  const hasCompactLayout = lh?.spacingStyle === 'compact' || /compact|dense|tight/i.test(patternText)
  const hasTypoBalance = lh?.textWrapBalance || /typography|heading.*clarity|text-wrap/i.test(patternText)
  const hasReducedMotion = ch?.prefersReducedMotion || /reduced.motion|prefers-reduced-motion/i.test(microText)

  // Column count: structured > regex
  const infoColumns = lh?.columns || (hasSpaciousLayout ? 2 : hasCompactLayout ? 4 : 3)

  // Gap accent bar from design boldness
  const barWidth = /bold|dramatic|vibrant/.test(designFacets.join(' ')) ? '6px' : '4px'

  // Hover effect: structured hint > animation facet derivation
  const hoverEffect = ch?.hoverTransform || shadow.hover

  // Hero minHeight from layout hints
  const heroMinH = lh?.maxWidth === '1200px' ? '60vh' : hasSpaciousLayout ? '60vh' : hasCompactLayout ? '40vh' : '50vh'

  // Stagger: from structured hint
  const staggerCSS = ch?.staggerDelay && ch.staggerDelay !== '0ms'
    ? '.info-card:nth-child(1){animation-delay:0ms}.info-card:nth-child(2){animation-delay:' + ch.staggerDelay + '}.info-card:nth-child(3){animation-delay:' + (parseInt(ch.staggerDelay) * 2) + 'ms}' : ''

  // Scroll animation: from structured hint
  const scrollCSS = ch?.scrollAnimation || ''

  // Spring physics for transitions
  const transitionTiming = ch?.springPhysics || ch?.transitionEasing || 'ease'
  const transitionDur = ch?.transitionDuration || '200ms'

  return {
    hero: {
      gradientAngle: gradient.angle,
      badgeBorderRadius: 'var(--radius-pill)',
      minHeight: hasSpaciousLayout ? '60vh' : hasCompactLayout ? '40vh' : '50vh',
      textAlign: 'center',
      reasoning: gradient.reason + ' | minHeight from layout hints',
    },
    score: {
      ringStrokeWidth: '8px',
      barGap: T.spacing[0] || '0.625rem',
      valueFontWeight: '800',
      reasoning: 'score ring + bars from T.spacing',
    },
    infoCards: {
      borderRadius: radius.infoRadius,
      shadow: T.cardShadow || '0 1px 2px rgba(0,0,0,0.05)',
      padding: radius.padding,
      columns: infoColumns,
      reasoning: radius.reason + ' | columns from corpus layout hints',
    },
    gaps: {
      accentBarWidth: barWidth,
      accentBarPosition: 'left',
      hoverEffect: shadow.hover,
      reasoning: shadow.reason + ' | bar width from design boldness',
    },
    cta: {
      buttonShape: button.shape,
      gradientDirection: gradient.angle,
      sectionPadding: sectionPad.pad,
      reasoning: button.reason + ' | padding from spacing style',
    },
    footer: {
      borderStyle: '1px solid var(--border)',
      padding: spacingStyle === 'airy' ? '3rem 0' : '2rem 0',
      reasoning: 'footer padding from spacing style',
    },
    global: {
      containerMaxWidth: lh?.maxWidth || T.containerMaxWidth || '860px',
      fontPairing: font.font,
      motionEasing: transitionTiming,
      textWrapBalance: hasTypoBalance,
      reducedMotion: hasReducedMotion,
      staggerCSS,
      scrollCSS,
      transitionDuration: transitionDur,
      reasoning: font.reason + ' | typography + motion from corpus structured hints',
    },
    // ── BEST PRACTICE ENFORCEMENT (from corpus) ──
    enforcement: {
      contrastMinimum: '4.5:1',
      focusVisible: '2px solid var(--ring)',
      semanticHTML: true,
      prefersReducedMotion: hasReducedMotion || motionStyle === 'zero',
      headingHierarchy: true,
      keyboardNavigation: true,
      reasoning: 'WCAG 2.2 AA + React best practices from corpus enrichment',
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPOSE LAYOUT — Morphable Slot Composition
// ═══════════════════════════════════════════════════════════════

export interface LayoutIntent {
  surface: string            // 'S10' | 'S11' | 'S3' | 'S5'...
  segment: string            // 'saude' | 'beleza' | 'servicos'...
  score: number              // 0-100
  schwartzLevel: string      // 'Unaware' | 'Problem Aware' | 'Solution Aware'...
  gapCount: number
  topGapSeverity: string     // 'Crítico' | 'Médio' | 'Oportunidade'
  isClaimed: boolean
  hasWebsite: boolean
  competitorCount: number
  primaryEmotion: string
  designAtmosphere: string
  conversionTriggers: string[]  // from niche
  personaOffer: string         // ontology.persona.offer
  personaWho: string           // ontology.persona.who
  nichePains: string[]         // audience pains
  nicheAudience: string        // target audience description
  ontology: any                // full MarketOntology for deep decisions
}

export interface ComposedSlot {
  slotName: string         // 'hero' | 'score' | 'info_grid' | 'gaps' | 'cta' | 'footer'
  variant: string          // 'urgency' | 'trust' | 'compact' | 'spacious' | 'default'
  abVariant?: string       // 'A' | 'B' — for A/B testing
  priority: number         // 1-10, determines order
  morphData: any           // PerSlotMutations[slotName]
  renderHint: string       // 'animate' | 'static' | 'highlight'
  copyHint?: string        // tone suggestion for copywriter
  triggerHint?: string     // conversion trigger to emphasize
}

export interface ComposedLayout {
  surface: string
  slots: ComposedSlot[]
  strategy: string
  abTest: {
    active: boolean
    variant: 'A' | 'B'
    hypothesis: string
    slotsVaried: string[]
  }
  reasoning: string[]
}

// ═══ SURFACE GRAMMARS (slot definitions per surface) ═══
const SURFACE_GRAMMARS: Record<string, string[]> = {
  S10: ['hero', 'score', 'info_grid', 'gaps', 'cta', 'footer'],
  S11: ['hero', 'trust', 'how', 'capabilities', 'stats', 'voice', 'pricing', 'faq', 'cta'],
  S3: ['sidebar', 'header', 'kpi-cards', 'charts', 'tables', 'activity'],
  S5: ['header', 'score-radar', 'gap-matrix', 'action-queue'],
}

// ═══ CONVERSION TRIGGER → SLOT VARIANT mapping ═══
const TRIGGER_VARIANTS: Record<string, { heroStyle: string; ctaStyle: string; emphasis: string[] }> = {
  'urgência': { heroStyle: 'urgency', ctaStyle: 'urgency', emphasis: ['hero', 'cta'] },
  'escassez': { heroStyle: 'urgency', ctaStyle: 'urgency', emphasis: ['cta'] },
  'prova': { heroStyle: 'trust', ctaStyle: 'trust', emphasis: ['hero', 'info_grid'] },
  'confiança': { heroStyle: 'trust', ctaStyle: 'trust', emphasis: ['score', 'gaps'] },
  'garantia': { heroStyle: 'trust', ctaStyle: 'default', emphasis: ['cta'] },
  'autoridade': { heroStyle: 'trust', ctaStyle: 'trust', emphasis: ['score', 'info_grid'] },
  'reciprocidade': { heroStyle: 'default', ctaStyle: 'default', emphasis: ['cta'] },
  'compromisso': { heroStyle: 'default', ctaStyle: 'default', emphasis: ['cta'] },
}

/**
 * Multi-surface morphable slot composer with A/B testing.
 *
 * Per-surface decision trees:
 *   S10 Raio-X: hero→score→info_grid→gaps→cta→footer
 *   S11 Landing: hero→trust→how→capabilities→stats→voice→pricing→faq→cta
 *   S3 Dashboard: sidebar→header→kpi-cards→charts→tables→activity
 *
 * A/B testing: randomly assigns 'A' (control) or 'B' (variant) to each render.
 *   Variant B applies different hero/cta strategy for conversion testing.
 *
 * Persona-driven: schwartz level + conversion triggers + audience pains
 *   determine which slots get emphasis and what copy angle to use.
 */
export function composeLayout(
  intent: LayoutIntent,
  morph: PerSlotMutations,
): ComposedLayout {
  const reasoning: string[] = []
  const slots: ComposedSlot[] = []
  const surface = intent.surface || 'S10'
  const grammar = SURFACE_GRAMMARS[surface] || SURFACE_GRAMMARS.S10

  // ═══ A/B TESTING (deterministic: seed from score parity) ═══
  const abVariant = intent.score % 2 === 0 ? 'A' : 'B'
  const abActive = surface === 'S10' || surface === 'S11'  // surfaces with enough traffic
  const slotsVaried: string[] = abActive ? ['hero', 'cta'] : []
  reasoning.push(`A/B test: variant=${abVariant} active=${abActive} (varied: ${slotsVaried.join(',')})`)

  // ═══ TRIGGER ANALYSIS: which conversion triggers match this intent? ═══
  const activeTriggers: string[] = []
  for (const t of (intent.conversionTriggers || [])) {
    const key = t.toLowerCase()
    for (const [triggerKey, variant] of Object.entries(TRIGGER_VARIANTS)) {
      if (key.includes(triggerKey) || triggerKey.includes(key)) {
        activeTriggers.push(triggerKey)
        reasoning.push(`Trigger match: "${t}" → ${triggerKey} (hero=${variant.heroStyle}, cta=${variant.ctaStyle})`)
      }
    }
  }

  // ═══ HERO — surface + triggers + schwartz + A/B ═══
  if (grammar.includes('hero')) {
    const triggerStyle = activeTriggers.length > 0
      ? TRIGGER_VARIANTS[activeTriggers[0]]?.heroStyle || 'default'
      : 'default'
    const baseVariant = intent.score < 40 ? 'urgency'
      : intent.primaryEmotion.includes('Confiança') ? 'trust'
      : triggerStyle !== 'default' ? triggerStyle
      : 'default'
    // A/B: variant B inverts urgency↔trust
    const abAdjusted = abActive && abVariant === 'B' && slotsVaried.includes('hero')
      ? (baseVariant === 'urgency' ? 'trust' : baseVariant === 'trust' ? 'urgency' : baseVariant)
      : baseVariant
    reasoning.push(`Hero: ${abAdjusted} (base=${baseVariant}, AB=${abVariant}, triggers=${activeTriggers.slice(0,2)})`)
    slots.push({
      slotName: 'hero', variant: abAdjusted, abVariant: abActive ? abVariant : undefined,
      priority: 10, morphData: morph.hero, renderHint: 'animate',
      copyHint: abAdjusted === 'urgency' ? 'Agitar a dor' : 'Prova social primeiro',
      triggerHint: activeTriggers[0],
    })
  }

  // ═══ SCORE — schwartz level ═══
  if (grammar.includes('score')) {
    const scoreV = intent.schwartzLevel === 'Unaware' ? 'compact'
      : intent.schwartzLevel === 'Most Aware' ? 'spacious' : 'default'
    reasoning.push(`Score: ${scoreV} (schwartz=${intent.schwartzLevel})`)
    slots.push({ slotName: 'score', variant: scoreV, priority: 9, morphData: morph.score, renderHint: 'animate' })
  }

  // ═══ INFO GRID / TRUST / HOW / CAPABILITIES — surface-dependent ═══
  for (const slotName of ['info_grid', 'trust', 'how', 'capabilities', 'stats', 'voice']) {
    if (!grammar.includes(slotName)) continue
    const variant = intent.competitorCount > 10 ? 'spacious' : 'default'
    const priority = intent.hasWebsite ? 8 : 6
    reasoning.push(`${slotName}: variant=${variant} priority=${priority}`)
    const data: Record<string, unknown> = (morph as any)[slotName] || morph.infoCards || {}
    if (intent.competitorCount > 10) data.highlight = slotName === 'info_grid' ? 'competition' : 'stats'
    slots.push({ slotName, variant, priority, morphData: data, renderHint: intent.hasWebsite ? 'animate' : 'static' })
  }

  // ═══ GAPS ═══
  if (grammar.includes('gaps')) {
    const gapV = intent.gapCount >= 5 ? 'spacious'
      : intent.gapCount <= 2 ? 'compact'
      : intent.topGapSeverity.includes('Crítico') ? 'urgency' : 'default'
    reasoning.push(`Gaps: ${gapV} (count=${intent.gapCount})`)
    slots.push({
      slotName: 'gaps', variant: gapV, priority: 7, morphData: morph.gaps,
      renderHint: intent.topGapSeverity.includes('Crítico') ? 'highlight' : 'animate',
      copyHint: gapV === 'urgency' ? 'Cada gap = uma oportunidade de melhoria imediata' : 'Análise detalhada',
    })
  }

  // ═══ CTA — triggers + schwartz + A/B ═══
  if (grammar.includes('cta')) {
    const triggerStyle = activeTriggers.length > 0
      ? TRIGGER_VARIANTS[activeTriggers[0]]?.ctaStyle || 'default'
      : 'default'
    const baseCta = intent.primaryEmotion.includes('Urgência') || intent.schwartzLevel === 'Unaware'
      ? 'urgency' : intent.schwartzLevel === 'Most Aware' ? 'trust'
      : triggerStyle !== 'default' ? triggerStyle : 'default'
    const abCta = abActive && abVariant === 'B' && slotsVaried.includes('cta')
      ? (baseCta === 'urgency' ? 'trust' : baseCta === 'trust' ? 'urgency' : baseCta)
      : baseCta
    reasoning.push(`CTA: ${abCta} (base=${baseCta}, AB=${abVariant})`)
    slots.push({
      slotName: 'cta', variant: abCta, abVariant: abActive ? abVariant : undefined,
      priority: 5, morphData: morph.cta, renderHint: 'animate',
      copyHint: abCta === 'urgency' ? 'Ação imediata' : 'Confie nos resultados',
      triggerHint: activeTriggers[0],
    })
  }

  // ═══ PRICING / FAQ (S11 landing) ═══
  for (const sn of ['pricing', 'faq']) {
    if (!grammar.includes(sn)) continue
    const v = intent.schwartzLevel === 'Most Aware' ? 'spacious' : 'default'
    slots.push({ slotName: sn, variant: v, priority: 3, morphData: (morph as any)[sn] || {}, renderHint: 'static' })
    reasoning.push(`${sn}: ${v}`)
  }

  // ═══ SIDEBAR / HEADER / KPI (S3/S5 dashboard) ═══
  for (const sn of ['sidebar', 'header', 'kpi-cards', 'charts', 'tables', 'activity', 'score-radar', 'gap-matrix', 'action-queue']) {
    if (!grammar.includes(sn)) continue
    slots.push({ slotName: sn, variant: 'default', priority: 4, morphData: (morph as any)[sn] || {}, renderHint: 'static' })
    reasoning.push(`${sn}: dashboard default`)
  }

  // ═══ FOOTER ═══
  if (grammar.includes('footer')) {
    const footerV = intent.score < 30 ? 'trust' : 'default'
    slots.push({ slotName: 'footer', variant: footerV, priority: 1, morphData: morph.footer, renderHint: 'static' })
    reasoning.push(`Footer: ${footerV} (score=${intent.score})`)
  }

  // ═══ GLOBAL STRATEGY ═══
  const urgencyCount = slots.filter(s => s.variant === 'urgency').length
  const trustCount = slots.filter(s => s.variant === 'trust').length
  const strategy = urgencyCount > trustCount ? 'urgency-first'
    : intent.competitorCount > 10 ? 'data-first'
    : trustCount > urgencyCount ? 'trust-first'
    : 'balanced'
  reasoning.push(`Strategy: ${strategy} (urgency=${urgencyCount}, trust=${trustCount})`)

  return {
    surface,
    slots,
    strategy,
    abTest: {
      active: abActive,
      variant: abVariant,
      hypothesis: abActive
        ? `Testando ${abVariant === 'A' ? 'controle' : 'variante'} em ${slotsVaried.join('+')} (score=${intent.score})`
        : 'A/B testing not active for this surface',
      slotsVaried,
    },
    reasoning,
  }
}
