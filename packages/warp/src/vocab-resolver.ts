/**
 * packages/warp/src/vocab-resolver.ts
 * Intent Vocab Resolver — ADR-0036 Fase 5
 *
 * Mapeia intent de mercado → facets do KG → media selection.
 * Inspiracao: EVO-API compose.rs query_vocab(facet=X) + embedding sensor doctrine.
 *
 * Pipeline:
 *   MarketOntology (persona + psicologia + nicho + design)
 *     → resolveIntentVocab(segment, niche, ontology)
 *     → VocabFacets { icons, animations, motions, designSystems, a11y, performance }
 *     → BLUE consulta Qdrant com facets como filtro semantico
 *     → GREEN recebe media ja selecionada
 *
 * medido=verdade · 2026-07-18 · adsentice
 */

import type { MarketOntology } from './market-ontology'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface VocabFacets {
  /** Facets para query de icons (Lucide SVG markup) */
  iconFacets: string[]
  /** Facets para query de animation/motion patterns */
  animationFacets: string[]
  /** Facets para query de design-knowledge patterns */
  designFacets: string[]
  /** Design systems recomendados para este intent */
  recommendedDesignSystems: string[]
  /** Facets de a11y requeridas */
  a11yRequirements: string[]
  /** Performance targets */
  performanceTargets: string[]
  /** Trace — por que estas facets foram selecionadas */
  reasoning: string[]
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT → FACET MAPPING (expansivel — 22 surfaces)
// ═══════════════════════════════════════════════════════════════

const SEGMENT_FACET_MAP: Record<string, Partial<VocabFacets>> = {
  saude: {
    iconFacets: ['search', 'trust', 'star', 'data-display', 'health', 'chart', 'shield'],
    animationFacets: ['animation', 'keyframe', 'fade'],
    designFacets: ['clean', 'professional', 'clinical', 'spacious', 'typography'],
    recommendedDesignSystems: ['carbon_ibm', 'material3', 'primer_github'],
    a11yRequirements: ['wcag22', 'contrast', 'focus', 'keyboard'],
    performanceTargets: ['lcp', 'font-display', 'preconnect'],
    reasoning: ['Segmento saúde: confiança clínica (trust, shield), dados visuais (chart, data-display), design limpo (carbon_ibm, material3)'],
  },
  beleza: {
    iconFacets: ['premium', 'star', 'spark', 'action', 'rating', 'cta'],
    animationFacets: ['motion', 'scroll', 'spring'],
    designFacets: ['vibrant', 'luxury', 'bold', 'round', 'premium'],
    recommendedDesignSystems: ['polaris_shopify', 'open_props', 'material3'],
    a11yRequirements: ['wcag22', 'contrast', 'animation-reduced'],
    performanceTargets: ['lcp', 'font-display', 'webp'],
    reasoning: ['Segmento beleza: premium visual (spark, premium), motion rico (spring, scroll), design ousado (polaris, open_props)'],
  },
  servicos: {
    iconFacets: ['trust', 'action', 'search', 'chart', 'cta', 'communication'],
    animationFacets: ['keyframe', 'animation', 'fade'],
    designFacets: ['professional', 'clean', 'structured', 'corporate'],
    recommendedDesignSystems: ['atlassian', 'primer_github', 'tailwind_v4'],
    a11yRequirements: ['wcag22', 'contrast', 'keyboard', 'focus'],
    performanceTargets: ['lcp', 'font-display', 'preconnect'],
    reasoning: ['Segmento serviços: autoridade (trust), comunicação (action, communication), design corporativo (atlassian, primer)'],
  },
  alimentacao: {
    iconFacets: ['action', 'star', 'rating', 'cta', 'food', 'search'],
    animationFacets: ['motion', 'scroll', 'spring', 'gesture'],
    designFacets: ['warm', 'appetizing', 'compact', 'round', 'vibrant'],
    recommendedDesignSystems: ['open_props', 'material3', 'polaris_shopify'],
    a11yRequirements: ['wcag22', 'contrast', 'animation-reduced'],
    performanceTargets: ['lcp', 'font-display', 'webp', 'lazy-load'],
    reasoning: ['Segmento alimentação: apelo visual (food, star), motion vibrante (spring, gesture), design acolhedor (open_props, material3)'],
  },
  comercio: {
    iconFacets: ['action', 'cta', 'data-display', 'chart', 'search', 'trust'],
    animationFacets: ['animation', 'keyframe', 'fade'],
    designFacets: ['practical', 'functional', 'compact', 'clean'],
    recommendedDesignSystems: ['tailwind_v4', 'atlassian', 'primer_github'],
    a11yRequirements: ['wcag22', 'keyboard', 'focus', 'contrast'],
    performanceTargets: ['lcp', 'cls', 'font-display'],
    reasoning: ['Segmento comércio: conversão (cta, action), dados (chart, data-display), design funcional (tailwind_v4, atlassian)'],
  },
  educacao: {
    iconFacets: ['search', 'action', 'star', 'trust', 'data-display', 'chart'],
    animationFacets: ['motion', 'animation', 'keyframe'],
    designFacets: ['editorial', 'academic', 'structured', 'spacious', 'typography'],
    recommendedDesignSystems: ['primer_github', 'atlassian', 'tailwind_v4'],
    a11yRequirements: ['wcag22', 'keyboard', 'contrast', 'focus', 'screen-reader'],
    performanceTargets: ['lcp', 'font-display', 'preconnect', 'lazy-load'],
    reasoning: ['Segmento educação: confiança acadêmica (trust, star), tipografia (editorial), a11y completa (screen-reader)'],
  },
  hospitalidade: {
    iconFacets: ['star', 'premium', 'rating', 'action', 'cta', 'search'],
    animationFacets: ['motion', 'scroll', 'spring', 'gesture'],
    designFacets: ['warm', 'welcoming', 'spacious', 'airy', 'premium'],
    recommendedDesignSystems: ['polaris_shopify', 'material3', 'open_props'],
    a11yRequirements: ['wcag22', 'contrast', 'animation-reduced'],
    performanceTargets: ['lcp', 'font-display', 'webp'],
    reasoning: ['Segmento hospitalidade: experiência (premium, star), motion acolhedor (spring, gesture), design espaçoso (polaris, material3)'],
  },
}

// ═══════════════════════════════════════════════════════════════
// SCHWARTZ AWARENESS → ADDITIONAL FACETS
// ═══════════════════════════════════════════════════════════════

const AWARENESS_FACETS: Record<string, { icons: string[]; animations: string[]; design: string[] }> = {
  'Unaware': {
    icons: ['search', 'info'],
    animations: ['fade'],
    design: ['educational', 'simple', 'clean'],
  },
  'Problem Aware': {
    icons: ['search', 'info', 'chart'],
    animations: ['animation', 'keyframe'],
    design: ['professional', 'urgency', 'clean'],
  },
  'Solution Aware': {
    icons: ['chart', 'data-display', 'action', 'cta'],
    animations: ['motion', 'scroll'],
    design: ['comparison', 'feature-showcase', 'trust'],
  },
  'Product Aware': {
    icons: ['star', 'premium', 'action', 'cta'],
    animations: ['motion', 'spring'],
    design: ['premium', 'differentiation', 'bold'],
  },
  'Most Aware': {
    icons: ['premium', 'star', 'action', 'cta'],
    animations: ['motion', 'spring', 'gesture'],
    design: ['premium', 'exclusive', 'bold'],
  },
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION TRIGGERS → ICON FACETS
// ═══════════════════════════════════════════════════════════════

const TRIGGER_FACETS: Record<string, string[]> = {
  'avaliação': ['star', 'rating'],
  'gratuito': ['cta', 'action'],
  'parcelamento': ['trust', 'action'],
  'garantia': ['shield', 'trust'],
  'resultado': ['chart', 'data-display'],
  'urgência': ['action', 'cta'],
  'escassez': ['cta', 'premium'],
  'prova': ['rating', 'star', 'social-proof'],
  'confiança': ['shield', 'trust'],
  'transformação': ['premium', 'star', 'spark'],
  'desconto': ['action', 'cta'],
  'bônus': ['premium', 'star'],
}

// ═══════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════

export function resolveIntentVocab(
  segment: string,
  ontology: MarketOntology,
): VocabFacets {
  const reasoning: string[] = []
  const base = SEGMENT_FACET_MAP[segment]
  if (!base) {
    // Generic fallback
    return {
      iconFacets: ['search', 'action', 'star', 'chart'],
      animationFacets: ['keyframe', 'animation', 'fade'],
      designFacets: ['neutral', 'modern', 'clean'],
      recommendedDesignSystems: ['tailwind_v4', 'material3'],
      a11yRequirements: ['wcag22', 'contrast', 'keyboard'],
      performanceTargets: ['lcp', 'font-display', 'preconnect'],
      reasoning: [`Segmento ${segment} não mapeado — usando fallback genérico`],
    }
  }

  // ── BASE FACETS (segment) ──
  const iconFacets = new Set(base.iconFacets || [])
  const animationFacets = new Set(base.animationFacets || [])
  const designFacets = new Set(base.designFacets || [])
  reasoning.push(...(base.reasoning || []))

  // ── SCHWARTZ LEVEL ──
  const schwartz = ontology.persona?.who || 'Problem Aware'
  const awMatch = Object.entries(AWARENESS_FACETS).find(([k]) => schwartz.includes(k))
  if (awMatch) {
    const [, aw] = awMatch
    for (const f of aw.icons) iconFacets.add(f)
    for (const f of aw.animations) animationFacets.add(f)
    for (const f of aw.design) designFacets.add(f)
    reasoning.push(`Schwartz level → +icons(${aw.icons.join(',')}) +anim(${aw.animations.join(',')}) +design(${aw.design.join(',')})`)
  }

  // ── CONVERSION TRIGGERS ──
  const triggers = ontology.niche?.conversionTriggers || []
  for (const t of triggers) {
    const tLower = t.toLowerCase()
    for (const [key, facets] of Object.entries(TRIGGER_FACETS)) {
      if (tLower.includes(key)) {
        for (const f of facets) iconFacets.add(f)
        reasoning.push(`Trigger "${t}" → icons(${facets.join(',')})`)
      }
    }
  }

  // ── PSYCHOLOGY EMOTION ──
  const emotion = ontology.psychology?.primaryEmotion || ''
  if (emotion.includes('Confiança')) {
    iconFacets.add('trust'); iconFacets.add('shield')
    designFacets.add('clean'); designFacets.add('professional')
  }
  if (emotion.includes('Urgência') || emotion.includes('urgência')) {
    iconFacets.add('cta'); iconFacets.add('action')
    designFacets.add('urgency')
  }
  if (emotion.includes('Autoestima') || emotion.includes('Luxo') || emotion.includes('Premium')) {
    iconFacets.add('premium'); iconFacets.add('spark')
    designFacets.add('premium'); designFacets.add('bold')
  }
  reasoning.push(`Emotion "${emotion}" → facets derivadas`)

  // ── DESIGN SYSTEM FROM ONTOLOGY ──
  const ds = ontology.designSystem?.recommended || ''
  const dsMap: Record<string, string[]> = {
    carbon: ['carbon_ibm'], material: ['material3'], tailwind: ['tailwind_v4'],
    primer: ['primer_github'], atlassian: ['atlassian'],
    polaris: ['polaris_shopify'], open_props: ['open_props'],
  }
  const dsMatches = Object.entries(dsMap).filter(([k]) => ds.toLowerCase().includes(k)).flatMap(([, v]) => v)
  const recDs = new Set(base.recommendedDesignSystems || [])
  for (const d of dsMatches) recDs.add(d)

  // ── A11Y: sempre WCAG 2.2 AA (baseline) ──
  const a11y = new Set(base.a11yRequirements || [])
  if (designFacets.has('animation') || animationFacets.has('spring') || animationFacets.has('gesture')) {
    a11y.add('animation-reduced')
  }

  return {
    iconFacets: [...iconFacets].slice(0, 8),
    animationFacets: [...animationFacets].slice(0, 5),
    designFacets: [...designFacets].slice(0, 6),
    recommendedDesignSystems: [...recDs].slice(0, 3),
    a11yRequirements: [...a11y].slice(0, 6),
    performanceTargets: [...(base.performanceTargets || [])].slice(0, 4),
    reasoning: [...new Set(reasoning)].slice(0, 8),
  }
}
