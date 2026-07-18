/**
 * packages/warp/src/market-ontology.ts
 * MarketOntology — ontologia de design derivada de dados REAIS de mercado
 * (ADR-0036 · persona + público-alvo + categoria/nicho + psicologia de cores)
 *
 * 4 FONTES UNIFICADAS:
 *   1. S10RaioXPipeline (PERSONA_MAP, NICHO_MAP, S10_SKILLS, TOKEN_MAP)
 *   2. Marketing skills Qdrant (188 pts — copywriting, psychology, CRO, local-seo)
 *   3. Design-systems Qdrant (152 OD estilos — luxury, warm, bold, trust...)
 *   4. Dados reais do lead (Supabase — score, rating, reviews, concorrência, sinais)
 *
 * SAÍDA: MarketOntology → SurfaceSpecialist.inferLayout() enriquecido
 *        → GREEN render personaliza copy, cores, ênfase visual
 *
 * medido=verdade · 2026-07-18 · adsentice
 */

import type { SegmentId } from './tokens-composer'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type SchwartzLevel = 'Unaware' | 'Problem Aware' | 'Solution Aware' | 'Product Aware' | 'Most Aware'

export interface PersonaOntology {
  schwartzLevel: SchwartzLevel
  who: string
  approach: string
  headlineTemplate: string
  cta: string
  offer: string
  urgency: 'baixa' | 'média' | 'alta'
}

export interface PsychologyOntology {
  primaryEmotion: string
  colorPsychology: string
  urgencyLevel: string
  toneOfVoice: string
  copyRules: string[]
  triggers: string[]
}

export interface DesignSystemOntology {
  recommended: string          // nome do OD system (vec)
  atmosphere: string            // descrição da atmosfera
  colorPalette: { primary: string; secondary: string; accent: string; hue: number }
  typography: { heading: string; body: string }
  spacingStyle: string
  motionStyle: string
}

export interface MarketDataOntology {
  competitors: number
  category: string
  categoryDisplay: string
  city: string
  district: string
  avgScore: number
  claimed: boolean
  rating: number
  reviews: number
}

export interface MarketOntology {
  persona: PersonaOntology
  psychology: PsychologyOntology
  designSystem: DesignSystemOntology
  marketData: MarketDataOntology
  niche: {
    name: string
    specialties: string[]
    audience: string
    keywords: string[]
    pains: string[]
    objections: string[]
    conversionTriggers: string[]
  }
  skills: string[]
  computedAt: string
}

// ═══════════════════════════════════════════════════════════════
// PERSONA (Schwartz levels — S10RaioXPipeline)
// ═══════════════════════════════════════════════════════════════

const PERSONA: Record<string, PersonaOntology> = {
  'Unaware': {
    schwartzLevel: 'Unaware',
    who: 'Não sabe que tem problema de marketing digital',
    approach: 'EDUCAR — mostrar que o problema existe antes de oferecer solução',
    headlineTemplate: 'Sua {NICHO} está invisível para {N} pessoas que buscam {SERVICO} todo mês em {LOCAL}',
    cta: 'Ver Diagnóstico Gratuito',
    offer: 'Diagnóstico de marketing digital gratuito em 30 segundos',
    urgency: 'baixa',
  },
  'Problem Aware': {
    schwartzLevel: 'Problem Aware',
    who: 'Sabe que tem poucos clientes mas não sabe resolver',
    approach: 'AGITAR A DOR — quantificar o problema + oferecer caminho claro',
    headlineTemplate: 'Descobrimos exatamente por que sua {NICHO} não aparece no Google — e quantos clientes você está perdendo',
    cta: 'Ver Meus Gaps Agora',
    offer: 'Relatório gratuito com os principais gaps do seu negócio',
    urgency: 'média',
  },
  'Solution Aware': {
    schwartzLevel: 'Solution Aware',
    who: 'Já ouviu falar de SEO/Google Ads, sabe que existem soluções',
    approach: 'COMPARAR — mostrar que adsentice é melhor que alternativas',
    headlineTemplate: 'Agências cobram R$2.000/mês por SEO. Nosso diagnóstico é gratuito e automático — você vê os gaps em 30 segundos.',
    cta: 'Quero Resolver Isso',
    offer: 'Plano de ação personalizado com 3 passos para aparecer no Google',
    urgency: 'média',
  },
  'Product Aware': {
    schwartzLevel: 'Product Aware',
    who: 'Conhece a adsentice, está considerando',
    approach: 'PROVA SOCIAL — casos de sucesso, depoimentos, garantia',
    headlineTemplate: 'Já ajudamos {N} {NICHO}s em {LOCAL}. Veja o resultado.',
    cta: 'Começar Agora',
    offer: 'Plano Sentinela — monitoramento mensal + otimização contínua',
    urgency: 'alta',
  },
  'Most Aware': {
    schwartzLevel: 'Most Aware',
    who: 'Já decidiu, só precisa fechar',
    approach: 'FECHAR — remover última objeção, call to action direto',
    headlineTemplate: 'Último passo: ative seu monitoramento em 2 minutos.',
    cta: 'Ativar Monitoramento',
    offer: 'Primeiro mês com garantia de resultados ou seu dinheiro de volta',
    urgency: 'alta',
  },
}

// ═══════════════════════════════════════════════════════════════
// PSICOLOGIA DE CORES por segmento (Materio + ADR-0020)
// ═══════════════════════════════════════════════════════════════

const SEGMENT_PSYCHOLOGY: Record<string, PsychologyOntology> = {
  saude: {
    primaryEmotion: 'Confiança + Profissionalismo + Higiene',
    colorPsychology: 'Azul clínico (220°) = confiança, esterilidade, autoridade médica. Evitar vermelho (sangue/dor). Branco = pureza.',
    urgencyLevel: 'baixa',
    toneOfVoice: 'Autoridade técnica com acolhimento. Confiança + proximidade. NÃO usar tom medicalizado frio.',
    copyRules: [
      'Loss Aversion: "Você está perdendo X pacientes/mês" > "Você pode ganhar"',
      'Social Proof: número de clínicas analisadas, selos, certificações',
      'Authority Bias: "Baseado em dados reais do Google e do seu site"',
    ],
    triggers: ['Primeira consulta gratuita', 'Aceita convênios', 'Atendimento de emergência'],
  },
  beleza: {
    primaryEmotion: 'Desejo + Exclusividade + Autoestima',
    colorPsychology: 'Rose gold (340°) = feminino, luxo, sofisticação. Dourado = premium. Evitar tons frios/industriais.',
    urgencyLevel: 'média',
    toneOfVoice: 'Próximo, trendy, aspiracional. NÃO usar tom corporativo ou frio.',
    copyRules: [
      'Social Proof: antes/depois, depoimentos emocionais, Instagram',
      'Scarcity: "Agenda lotada", "Últimas vagas"',
      'Aspiration: "Você merece esse cuidado"',
    ],
    triggers: ['Primeira visita com desconto', 'Agendamento via WhatsApp', 'Resultado visível'],
  },
  servicos: {
    primaryEmotion: 'Autoridade + Confiança + Tradição',
    colorPsychology: 'Navy (260°) = seriedade, tradição, segurança jurídica.',
    urgencyLevel: 'baixa',
    toneOfVoice: 'Autoridade, confiança, clareza. NÃO usar tom informal ou hype.',
    copyRules: [
      'Authority Bias: "Especialista em [área]", "Anos de experiência"',
      'Risk Reversal: "Primeira consulta gratuita", "Sigilo garantido"',
    ],
    triggers: ['Consulta gratuita', 'Avaliação de caso online', 'Atendimento personalizado'],
  },
  alimentacao: {
    primaryEmotion: 'Apetite + Calor + Autenticidade',
    colorPsychology: 'Terracota (25°) = fome, terra, tradição culinária. Laranja = energia.',
    urgencyLevel: 'média',
    toneOfVoice: 'Acolhedor, sensorial, pessoal. NÃO usar tom corporativo.',
    copyRules: [
      'Sensory Language: "Sabor caseiro", "Tempero artesanal"',
      'Scarcity: "Mesas limitadas", "Reserve hoje"',
    ],
    triggers: ['Reserva online', 'Cardápio digital', 'Google Maps atualizado'],
  },
  comercio: {
    primaryEmotion: 'Confiança + Praticidade + Custo-benefício',
    colorPsychology: 'Azul industrial (250°) = confiança, durabilidade.',
    urgencyLevel: 'baixa',
    toneOfVoice: 'Direto, confiável, prático. NÃO usar tom luxury ou premium.',
    copyRules: [
      'Value: "Melhor custo-benefício", "Orçamento sem compromisso"',
    ],
    triggers: ['Orçamento gratuito', 'Garantia', 'Entrega rápida'],
  },
  educacao: {
    primaryEmotion: 'Crescimento + Confiança + Futuro',
    colorPsychology: 'Verde (160°) = crescimento, aprendizado, frescor.',
    urgencyLevel: 'baixa',
    toneOfVoice: 'Inspirador, confiável, acolhedor.',
    copyRules: [
      'Aspiration: "Invista no futuro", "Transforme sua carreira"',
    ],
    triggers: ['Aula experimental', 'Bolsa mérito', 'Matrícula antecipada'],
  },
  hospitalidade: {
    primaryEmotion: 'Acolhimento + Experiência + Conforto',
    colorPsychology: 'Gold (30°) = calor, hospitalidade, premium acessível.',
    urgencyLevel: 'média',
    toneOfVoice: 'Aconchegante, local, exclusivo.',
    copyRules: [
      'Experience: "Viva [cidade] como nunca", "Conforto e exclusividade"',
    ],
    triggers: ['Reserva direta com desconto', 'Late checkout', 'Upgrade cortesia'],
  },
}

const DEFAULT_PSYCHOLOGY: PsychologyOntology = {
  primaryEmotion: 'Confiança + Proximidade',
  colorPsychology: 'Cores neutras com acento de confiança',
  urgencyLevel: 'baixa',
  toneOfVoice: 'Profissional, direto, confiável.',
  copyRules: ['Foco em resolver o problema do cliente', 'Tom consultivo, não vendedor'],
  triggers: ['Diagnóstico gratuito', 'Atendimento rápido'],
}

// ═══════════════════════════════════════════════════════════════
// DESIGN SYSTEM por segmento (inferido do vec() + psicologia)
// ═══════════════════════════════════════════════════════════════

const SEGMENT_DESIGN_HUE: Record<string, number> = {
  saude: 220, beleza: 340, servicos: 260, alimentacao: 25,
  comercio: 250, educacao: 160, hospitalidade: 30,
}

const SEGMENT_DESIGN_ATMOSPHERE: Record<string, string> = {
  saude: 'Clean, professional, trustworthy. Clinical precision with human warmth.',
  beleza: 'Vibrant, elegant, luxurious. Premium feel with rose gold accents.',
  servicos: 'Corporate, authoritative, traditional. Navy gravitas with modern restraint.',
  alimentacao: 'Warm, sensory, authentic. Terracotta warmth with editorial photography.',
  comercio: 'Practical, functional, straightforward. Blue industrial with clear hierarchy.',
  educacao: 'Fresh, growth-oriented, structured. Green palette with academic clarity.',
  hospitalidade: 'Welcoming, spacious, golden. Warm hospitality with travel aspirational cues.',
}

// ═══════════════════════════════════════════════════════════════
// COMPUTER — unifica as 4 fontes
// ═══════════════════════════════════════════════════════════════

export interface MarketOntologyInput {
  category: string
  nichoName: string
  nichoSpecialties: string[]
  nichoAudience: string
  nichoKeywords: string[]
  nichoPains: string[]
  nichoObjections: string[]
  nichoConversionTriggers: string[]
  segment: string
  schwartzLevel: string
  competitors: number
  city: string
  district: string
  score: number
  rating: number
  reviews: number
  claimed: boolean
  categoryDisplay: string
  odDesignSystem: string  // do vec() queryDesignSystem
}

export function computeMarketOntology(input: MarketOntologyInput): MarketOntology {
  const seg = input.segment
  const persona = PERSONA[input.schwartzLevel] || PERSONA['Problem Aware']
  const psych = SEGMENT_PSYCHOLOGY[seg] || DEFAULT_PSYCHOLOGY
  const hue = SEGMENT_DESIGN_HUE[seg] || 260
  const atmosphere = SEGMENT_DESIGN_ATMOSPHERE[seg] || 'Neutral, modern, clean.'

  return {
    persona,
    psychology: psych,
    designSystem: {
      recommended: input.odDesignSystem || 'warp-default',
      atmosphere,
      colorPalette: {
        primary: `oklch(55% 35% ${hue})`,
        secondary: `oklch(40% 35% ${hue})`,
        accent: `oklch(65% 28% ${hue})`,
        hue,
      },
      typography: {
        heading: seg === 'beleza' || seg === 'hospitalidade' ? 'Plus Jakarta Sans' : 'Inter',
        body: 'Inter',
      },
      spacingStyle: seg === 'beleza' || seg === 'hospitalidade' ? 'generous (2rem+)' : 'compact (1-1.5rem)',
      motionStyle: seg === 'beleza' ? 'subtle spring' : seg === 'alimentacao' ? 'moderate' : 'zero',
    },
    marketData: {
      competitors: input.competitors,
      category: input.category,
      categoryDisplay: input.categoryDisplay,
      city: input.city,
      district: input.district,
      avgScore: 35,
      claimed: input.claimed,
      rating: input.rating,
      reviews: input.reviews,
    },
    niche: {
      name: input.nichoName,
      specialties: input.nichoSpecialties,
      audience: input.nichoAudience,
      keywords: input.nichoKeywords.slice(0, 5),
      pains: input.nichoPains.slice(0, 3),
      objections: input.nichoObjections.slice(0, 3),
      conversionTriggers: input.nichoConversionTriggers.slice(0, 3),
    },
    skills: ['copywriting', 'psychology', 'cro', 'local-seo'],
    computedAt: new Date().toISOString(),
  }
}
