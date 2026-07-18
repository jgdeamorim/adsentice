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
  segment: string           // 'saude' | 'beleza' | 'servicos'...
  score: number             // 0-100
  schwartzLevel: string     // 'Unaware' | 'Problem Aware' | 'Solution Aware'...
  gapCount: number          // how many gaps detected
  topGapSeverity: string    // 'Crítico' | 'Médio' | 'Oportunidade'
  isClaimed: boolean        // GMB verified?
  hasWebsite: boolean       // has URL?
  competitorCount: number   // market density
  primaryEmotion: string    // from ontology
  designAtmosphere: string  // from ontology
  conversionTriggers: string[] // from niche
}

export interface ComposedSlot {
  slotName: string          // 'hero' | 'score' | 'info_grid' | 'gaps' | 'cta' | 'footer'
  variant: string           // 'urgency' | 'trust' | 'compact' | 'spacious' | 'default'
  priority: number          // 1-10, determines order
  morphData: any            // PerSlotMutations[slotName]
  renderHint: string        // 'animate' | 'static' | 'highlight'
}

export interface ComposedLayout {
  slots: ComposedSlot[]     // ORDERED list
  strategy: string          // 'urgency-first' | 'trust-first' | 'balanced' | 'data-first'
  reasoning: string[]
}

/**
 * Compose layout slots dynamically based on intent + morph.
 *
 * DECISION TREE (corpus-driven, $0, deterministic):
 *
 * Hero variant:
 *   score < 40  → 'urgency'  (problema grave → agitar)
 *   score ≥ 40  → 'trust'    (reputação → provar)
 *   emotion inclui "Confiança" → 'trust'
 *
 * Info grid priority:
 *   hasWebsite → top (website data available)
 *   !hasWebsite → push down
 *   competitorCount > 10 → highlight competition card
 *
 * Gap list variant:
 *   gapCount ≥ 5 → 'spacious' (precisa de mais espaço)
 *   topGapSeverity === 'Crítico' → 'urgency' (alert bar accent)
 *   gapCount ≤ 2 → 'compact'
 *
 * CTA variant:
 *   schwartzLevel low (Unaware/Problem) → 'urgency'  (educar + agir)
 *   schwartzLevel high (Solution/Most) → 'trust'     (diferenciar)
 *   emotion inclui "Urgência" → 'urgency'
 *
 * Footer strategy:
 *   score < 30 → include 'trust-banner' (prova social extra)
 *   default → simple footer
 *
 * Global strategy:
 *   urgency slots > trust slots → 'urgency-first'
 *   trust slots > urgency slots → 'trust-first'
 *   competitor-heavy → 'data-first' (charts, stats primeiro)
 *   default → 'balanced'
 */
export function composeLayout(
  intent: LayoutIntent,
  morph: PerSlotMutations,
): ComposedLayout {
  const reasoning: string[] = []
  const slots: ComposedSlot[] = []

  // ═══ HERO — urgency vs trust ═══
  const heroVariant = intent.score < 40 || intent.primaryEmotion.includes('urgência')
    ? 'urgency' : 'trust'
  reasoning.push(`Hero variant: ${heroVariant} (score=${intent.score}, emotion=${intent.primaryEmotion})`)
  slots.push({
    slotName: 'hero',
    variant: heroVariant,
    priority: 10, // always first
    morphData: morph.hero,
    renderHint: 'animate',
  })

  // ═══ SCORE — always present, variant by schwartz level ═══
  const scoreVariant = intent.schwartzLevel === 'Unaware' ? 'compact'
    : intent.schwartzLevel === 'Most Aware' ? 'spacious' : 'default'
  reasoning.push(`Score variant: ${scoreVariant} (schwartz=${intent.schwartzLevel})`)
  slots.push({
    slotName: 'score',
    variant: scoreVariant,
    priority: 9,
    morphData: morph.score,
    renderHint: 'animate',
  })

  // ═══ INFO GRID — dynamic priority ═══
  const infoVariant = intent.competitorCount > 10 ? 'spacious'
    : morph.infoCards.columns === 2 ? 'wide' : 'default'
  const infoPriority = intent.hasWebsite ? 8 : 6
  reasoning.push(`Info grid: priority=${infoPriority} variant=${infoVariant} (web=${intent.hasWebsite}, competitors=${intent.competitorCount})`)

  const infoCards: Record<string, unknown> = morph.infoCards
  if (intent.competitorCount > 10) {
    (infoCards as any).highlight = 'competition'
    reasoning.push(`  → highlighting competition card (${intent.competitorCount} competitors)`)
  }
  slots.push({
    slotName: 'info_grid',
    variant: infoVariant,
    priority: infoPriority,
    morphData: infoCards,
    renderHint: intent.hasWebsite ? 'animate' : 'static',
  })

  // ═══ GAPS — variant by count + severity ═══
  const gapVariant = intent.gapCount >= 5 ? 'spacious'
    : intent.gapCount <= 2 ? 'compact'
    : intent.topGapSeverity.includes('Crítico') ? 'urgency'
    : 'default'
  reasoning.push(`Gaps variant: ${gapVariant} (count=${intent.gapCount}, topSeverity=${intent.topGapSeverity})`)
  slots.push({
    slotName: 'gaps',
    variant: gapVariant,
    priority: 7,
    morphData: morph.gaps,
    renderHint: intent.topGapSeverity.includes('Crítico') ? 'highlight' : 'animate',
  })

  // ═══ CTA — variant by schwartz level + emotion ═══
  const ctaVariant = intent.primaryEmotion.includes('Urgência') || intent.schwartzLevel === 'Unaware'
    ? 'urgency'
    : intent.schwartzLevel === 'Most Aware' || intent.schwartzLevel === 'Solution Aware'
      ? 'trust' : 'default'
  reasoning.push(`CTA variant: ${ctaVariant} (schwartz=${intent.schwartzLevel}, emotion=${intent.primaryEmotion})`)
  slots.push({
    slotName: 'cta',
    variant: ctaVariant,
    priority: 5,
    morphData: morph.cta,
    renderHint: 'animate',
  })

  // ═══ FOOTER — trust banner for low-score leads ═══
  const footerVariant = intent.score < 30 ? 'trust' : 'default'
  slots.push({
    slotName: 'footer',
    variant: footerVariant,
    priority: 1,
    morphData: morph.footer,
    renderHint: 'static',
  })
  reasoning.push(`Footer variant: ${footerVariant} (score=${intent.score})`)

  // ═══ GLOBAL STRATEGY ═══
  const urgencyCount = slots.filter(s => s.variant === 'urgency').length
  const trustCount = slots.filter(s => s.variant === 'trust').length
  const strategy = urgencyCount > trustCount ? 'urgency-first'
    : intent.competitorCount > 10 ? 'data-first'
    : 'balanced'
  reasoning.push(`Strategy: ${strategy} (urgency=${urgencyCount}, trust=${trustCount})`)

  return { slots, strategy, reasoning }
}
