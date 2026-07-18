// ═══════════════════════════════════════════════════════════════
// ADSENTICE · Strategy Resolver — Estratégias de Conversão A/B (S11)
//
// Substitui o A/B cosmético (score%2 flip) por ESTRATÉGIAS COMPLETAS:
// cada variante = 1 facet de vocab.conversion do KG orquestrando a
// página inteira (ordem de slots, ênfase, copy angle, pricing frame).
//
// KG source (adsentice-kg · 8 facets · source_docs):
//   urgency, scarcity, social_proof, guarantee, authority,
//   liking, reciprocity, commitment
//
// resolveStrategies(): score cada facet pelos SINAIS REAIS do lead
// (rating, reviews, claimed, competitors, score, triggers do nicho)
// → dominante (A) + challenger de família diversa (B).
// A variante é congelada por artefato (ADR-0038 ab_variant).
// medido=verdade · 2026-07-18 · ADR-0037 Fase 6
// ═══════════════════════════════════════════════════════════════

import type { LayoutIntent } from './morph-resolver'

// ═══ TYPES ═══

export interface ConversionStrategy {
  /** Facet do KG que domina esta variante */
  facet: string
  /** Rótulo A/B atribuído pelo chamador */
  abLabel: 'A' | 'B'
  /** Ordem dos slots S11 sob esta estratégia (gramática reordenada) */
  slotOrder: string[]
  /** Slots que recebem ênfase visual (renderHint highlight) */
  emphasis: string[]
  /** Diretiva de copy pt-BR para o copywriter (por página) */
  copyAngle: string
  /** Frame do slot pricing: como remover risco/ancorar */
  pricingFrame: 'free-first' | 'guarantee' | 'anchor' | 'commitment-steps'
  /** Estilo do hero e do CTA (consumidos pelo composeLayout/renderer) */
  heroStyle: string
  ctaStyle: string
  /** Ângulo do FAQ (que objeções dissolver primeiro) */
  faqAngle: string
  /** Hipótese testável (vai para abTest.hypothesis e para a série) */
  hypothesis: string
  /** Score atribuído pelos sinais do lead (trace) */
  signalScore: number
}

// ═══ CATÁLOGO — 8 estratégias (gramática base S11: hero→trust→how→capabilities→stats→voice→pricing→faq→cta) ═══
// slotOrder reordena a narrativa de conversão; copyAngle segue a LEI honesta
// (zero métrica inventada — só dados reais do lead/mercado).

type StrategyDef = Omit<ConversionStrategy, 'abLabel' | 'signalScore'>

const STRATEGY_DEFS: Record<string, StrategyDef> = {
  social_proof: {
    facet: 'social_proof',
    slotOrder: ['hero', 'trust', 'voice', 'stats', 'how', 'capabilities', 'pricing', 'faq', 'cta'],
    emphasis: ['trust', 'voice'],
    copyAngle: 'Prova social primeiro: rating real, contagem de avaliações, reputação no bairro. O visitante confia em quem os outros já confiam.',
    pricingFrame: 'guarantee',
    heroStyle: 'trust', ctaStyle: 'trust',
    faqAngle: 'objeções de confiança (é bom mesmo? tem experiência?)',
    hypothesis: 'Prova social no topo (rating+reviews reais) converte mais que benefícios',
  },
  urgency: {
    facet: 'urgency',
    slotOrder: ['hero', 'stats', 'how', 'capabilities', 'trust', 'voice', 'pricing', 'faq', 'cta'],
    emphasis: ['hero', 'cta'],
    copyAngle: 'Urgência honesta: agir agora tem vantagem concreta (agenda, disponibilidade). SEM countdown falso, SEM escassez inventada.',
    pricingFrame: 'free-first',
    heroStyle: 'urgency', ctaStyle: 'urgency',
    faqAngle: 'objeções de tempo (não tenho tempo agora, deixo pra depois)',
    hypothesis: 'CTA com urgência honesta no hero converte mais que construção de confiança',
  },
  scarcity: {
    facet: 'scarcity',
    slotOrder: ['hero', 'stats', 'capabilities', 'trust', 'how', 'voice', 'pricing', 'faq', 'cta'],
    emphasis: ['stats', 'cta'],
    copyAngle: 'Posicionamento competitivo com dados reais do mercado local: quantos concorrentes, o que os melhores oferecem. Diferenciação, não pânico.',
    pricingFrame: 'anchor',
    heroStyle: 'urgency', ctaStyle: 'urgency',
    faqAngle: 'objeções de comparação (por que aqui e não no concorrente?)',
    hypothesis: 'Contexto competitivo real (N concorrentes no bairro) move mais que prova social',
  },
  guarantee: {
    facet: 'guarantee',
    slotOrder: ['hero', 'how', 'pricing', 'trust', 'capabilities', 'stats', 'voice', 'faq', 'cta'],
    emphasis: ['pricing', 'how'],
    copyAngle: 'Remoção de risco: primeiro passo sem compromisso, avaliação clara antes de decidir. O visitante não tem nada a perder.',
    pricingFrame: 'guarantee',
    heroStyle: 'trust', ctaStyle: 'default',
    faqAngle: 'objeções de risco (e se eu não gostar? quanto custa?)',
    hypothesis: 'Remoção de risco adiantada (pricing cedo) converte mais que narrativa completa',
  },
  authority: {
    facet: 'authority',
    slotOrder: ['hero', 'capabilities', 'trust', 'how', 'stats', 'voice', 'pricing', 'faq', 'cta'],
    emphasis: ['capabilities', 'trust'],
    copyAngle: 'Autoridade demonstrada: especialidades reais, perfil verificado, presença estabelecida. Competência antes de simpatia.',
    pricingFrame: 'anchor',
    heroStyle: 'trust', ctaStyle: 'trust',
    faqAngle: 'objeções de competência (são especialistas nisso?)',
    hypothesis: 'Especialidades e verificação no topo convertem mais que reviews',
  },
  liking: {
    facet: 'liking',
    slotOrder: ['hero', 'voice', 'how', 'trust', 'capabilities', 'stats', 'pricing', 'faq', 'cta'],
    emphasis: ['voice', 'hero'],
    copyAngle: 'Humanização e acolhimento: tom próximo, jornada do cliente, identificação. Pessoas compram de quem gostam.',
    pricingFrame: 'free-first',
    heroStyle: 'default', ctaStyle: 'default',
    faqAngle: 'objeções de conforto (vou me sentir bem atendido?)',
    hypothesis: 'Tom acolhedor + vozes de clientes convertem mais que autoridade técnica',
  },
  reciprocity: {
    facet: 'reciprocity',
    slotOrder: ['hero', 'how', 'capabilities', 'pricing', 'trust', 'stats', 'voice', 'faq', 'cta'],
    emphasis: ['pricing', 'cta'],
    copyAngle: 'Dar primeiro: avaliação inicial, orientação gratuita, valor entregue antes de pedir compromisso.',
    pricingFrame: 'free-first',
    heroStyle: 'default', ctaStyle: 'default',
    faqAngle: 'objeções de troca (o que ganho começando agora?)',
    hypothesis: 'Oferta de valor gratuito adiantada converte mais que prova social',
  },
  commitment: {
    facet: 'commitment',
    slotOrder: ['hero', 'how', 'trust', 'capabilities', 'stats', 'voice', 'pricing', 'faq', 'cta'],
    emphasis: ['how', 'cta'],
    copyAngle: 'Micro-compromissos: passo a passo claro e pequeno (agendar → conhecer → decidir). Reduzir o tamanho do primeiro sim.',
    pricingFrame: 'commitment-steps',
    heroStyle: 'default', ctaStyle: 'default',
    faqAngle: 'objeções de processo (como funciona? é complicado?)',
    hypothesis: 'Jornada em passos pequenos converte mais que apelo direto',
  },
}

// Famílias — o challenger (B) deve vir de família DIFERENTE da dominante (A)
// para o teste A/B medir estratégias genuinamente distintas.
const FAMILY: Record<string, string> = {
  social_proof: 'trust', authority: 'trust', guarantee: 'trust',
  urgency: 'pressure', scarcity: 'pressure',
  liking: 'relationship', reciprocity: 'relationship', commitment: 'relationship',
}

// ═══ RESOLVER ═══

export interface ResolvedStrategies {
  A: ConversionStrategy
  B: ConversionStrategy
  scores: Record<string, number>
  reasoning: string[]
}

/** Score cada facet pelos SINAIS REAIS do lead + priors do segmento (conversionFacets). */
export function resolveStrategies(
  intent: LayoutIntent,
  segmentConversionFacets: string[],
): ResolvedStrategies {
  const reasoning: string[] = []
  const scores: Record<string, number> = {}
  for (const f of Object.keys(STRATEGY_DEFS)) scores[f] = 0

  // ── priors do segmento (vocab.conversion facets resolvidos) ──
  segmentConversionFacets.forEach((f, i) => {
    if (f in scores) { scores[f] += 10 - i * 2; reasoning.push(`prior segmento: ${f} +${10 - i * 2}`) }
  })

  // ── sinais reais do lead ──
  const o = intent.ontology || {}
  const rating = o.marketData?.rating ?? 0
  const reviews = o.marketData?.reviews ?? 0
  if (rating >= 4.5 && reviews >= 20) {
    const s = Math.min(20, Math.round(rating * 2 + reviews / 20))
    scores.social_proof += s; reasoning.push(`rating ${rating}★ + ${reviews} reviews → social_proof +${s}`)
  }
  if (intent.score < 50) {
    scores.urgency += 8; reasoning.push(`score ${intent.score}<50 → urgency +8 (dono precisa agir)`)
  }
  if (intent.topGapSeverity === 'Crítico') {
    scores.urgency += 5; reasoning.push('gap crítico → urgency +5')
  }
  if (intent.competitorCount > 10) {
    const s = Math.min(15, Math.round(intent.competitorCount / 8))
    scores.scarcity += s; reasoning.push(`${intent.competitorCount} concorrentes → scarcity +${s}`)
  }
  if (intent.isClaimed) { scores.authority += 6; reasoning.push('perfil verificado → authority +6') }
  if (intent.hasWebsite) { scores.authority += 4; reasoning.push('tem website → authority +4') }

  // ── triggers do nicho (dados canônicos NICHO_MAP) ──
  for (const t of (intent.conversionTriggers || [])) {
    const tl = t.toLowerCase()
    if (tl.includes('gratuit') || tl.includes('grátis') || tl.includes('cortesia')) {
      scores.reciprocity += 7; scores.guarantee += 4; reasoning.push(`trigger "${t}" → reciprocity +7, guarantee +4`)
    }
    if (tl.includes('garantia') || tl.includes('convênio') || tl.includes('parcel')) {
      scores.guarantee += 6; reasoning.push(`trigger "${t}" → guarantee +6`)
    }
    if (tl.includes('agend') || tl.includes('online') || tl.includes('whatsapp')) {
      scores.commitment += 5; reasoning.push(`trigger "${t}" → commitment +5`)
    }
    if (tl.includes('emergência') || tl.includes('24h') || tl.includes('na hora')) {
      scores.urgency += 6; reasoning.push(`trigger "${t}" → urgency +6`)
    }
  }

  // ── tom do nicho ──
  const emotion = String(intent.primaryEmotion || '')
  if (emotion.includes('Acolh') || emotion.includes('Autoestima')) {
    scores.liking += 8; reasoning.push(`emoção "${emotion}" → liking +8`)
  }
  if (emotion.includes('Confiança')) {
    scores.social_proof += 4; scores.authority += 4; reasoning.push(`emoção "${emotion}" → social_proof/authority +4`)
  }

  // ── A = dominante · B = challenger de família diversa ──
  const ranked = Object.entries(scores).sort((x, y) => y[1] - x[1])
  const aFacet = ranked[0][0]
  const aFamily = FAMILY[aFacet]
  const bEntry = ranked.slice(1).find(([f]) => FAMILY[f] !== aFamily) || ranked[1]
  const bFacet = bEntry[0]
  reasoning.push(`A=${aFacet} (${ranked[0][1]}pts, família ${aFamily}) · B=${bFacet} (${bEntry[1]}pts, família ${FAMILY[bFacet]})`)

  return {
    A: { ...STRATEGY_DEFS[aFacet], abLabel: 'A', signalScore: ranked[0][1] },
    B: { ...STRATEGY_DEFS[bFacet], abLabel: 'B', signalScore: bEntry[1] },
    scores,
    reasoning,
  }
}
