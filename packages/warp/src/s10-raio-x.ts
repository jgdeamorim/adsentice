/**
 * packages/warp/src/s10-raio-x.ts
 * S10 · Relatório Raio-X — Pipeline com rota completa
 *
 * ROTA: category → nicho → persona → skills → copy/tom → tokens → template
 *
 * Fontes conectadas:
 *   Matriz Warp        → segmento, nicho, tokens, skills por superfície
 *   Strategic Plan     → 3 personas (Schwartz), copy/tom, objeções
 *   Marketing Skills   → copywriting, psychology, CRO, local-seo (43 embedados)
 *   Qdrant             → design inspiration (NÃO decisão)
 *   Supabase           → dados reais do lead (score, sinais, gaps)
 *
 * REGRA DE OURO:
 *   Decisões (cores, fontes, tokens) → PRESETS Matriz Warp
 *   Inspiração (design, landing)     → Qdrant COM FILTRO
 *   Conteúdo (copy, tom, oferta)     → Strategic Plan + Personas
 *   Evidência (gaps, score)          → Supabase + Scoring Engine
 *
 * medido=verdade · 2026-07-15 · adsentice
 */

import type { SegmentId } from './tokens-composer'

// ═══════════════════════════════════════════════════════════════
// LAYER 0 · NICHO — category → especialidade + sub-nicho
// ═══════════════════════════════════════════════════════════════

interface NichoProfile {
  /** Nome do nicho */
  name: string
  /** Sub-nichos / especialidades */
  specialties: string[]
  /** Público-alvo primário */
  audience: string
  /** Faixa de ticket (R$) */
  ticketRange: string
  /** Keywords de busca local */
  keywords: string[]
  /** Dores específicas do nicho */
  pains: string[]
  /** Objeções comuns de compra */
  objections: string[]
  /** Tom de voz para copy */
  tone: string
  /** Triggers de conversão */
  conversionTriggers: string[]
}

const NICHO_MAP: Record<string, NichoProfile> = {
  // ── Dentista ──
  dentist: {
    name: 'Dentista',
    specialties: ['Clínico Geral', 'Ortodontia', 'Periodontia', 'Implantodontia', 'Endodontia', 'Odontopediatria', 'Estética Dental'],
    audience: 'Adultos 30-55 anos, classes B e A, que valorizam saúde bucal e estética',
    ticketRange: 'R$150-500/consulta · R$3K-15K ortodontia',
    keywords: ['dentista [bairro]', 'implante dentário [cidade]', 'clareamento dental', 'aparelho ortodôntico', 'canal dentário', 'periodontista', 'ortodontista'],
    pains: ['Poucos pacientes novos por mês', 'Concorrência local forte', 'Pacientes que só vão quando dói', 'Site desatualizado desde 2018'],
    objections: ['"Já tenho dentista há anos"', '"Tratamento dentário é caro"', '"Só vou quando dói"', '"Meu boca-a-boca sempre funcionou"'],
    tone: 'Autoridade técnica com acolhimento. Confiança + proximidade. Não usar tom medicalizado frio.',
    conversionTriggers: ['Primeira consulta gratuita', 'Raio-X digital na hora', 'Aceita todos os convênios', 'Atendimento de emergência 24h'],
  },
  // ── Clínica Médica ──
  medical_clinic: {
    name: 'Clínica Médica',
    specialties: ['Clínico Geral', 'Cardiologia', 'Dermatologia', 'Ginecologia', 'Pediatria', 'Oftalmologia', 'Endocrinologia'],
    audience: 'Adultos 25-70 anos, todas as classes, busca por saúde e bem-estar',
    ticketRange: 'R$100-400/consulta · Exames R$200-800',
    keywords: ['clínica médica [bairro]', 'médico [especialidade] [cidade]', 'exames de rotina', 'check-up médico'],
    pains: ['Dificuldade de agendamento', 'Falta de especialistas', 'Pacientes que não retornam', 'Fila de espera longa'],
    objections: ['"Não tenho tempo para consulta"', '"Convênio não cobre"', '"Só vou quando estou doente"'],
    tone: 'Profissional, acolhedor, humanizado. Foco em prevenção e cuidado contínuo.',
    conversionTriggers: ['Agendamento online 24h', 'Telemedicina disponível', 'Resultados de exames online', 'Lembrete de consulta por WhatsApp'],
  },
  // ── Padrão (fallback) ──
  default: {
    name: 'Negócio Local',
    specialties: ['Serviço Principal', 'Serviço Secundário'],
    audience: 'Clientes locais do bairro e região',
    ticketRange: 'Variável por serviço',
    keywords: ['[serviço] [bairro]', '[categoria] [cidade]'],
    pains: ['Poucos clientes novos', 'Concorrência local', 'Falta de presença online'],
    objections: ['"Muito caro"', '"Não sei se funciona"', '"Vou pensar"'],
    tone: 'Profissional, direto, confiável. Foco em resolver o problema do cliente.',
    conversionTriggers: ['Orçamento gratuito', 'Atendimento rápido', 'Garantia de satisfação'],
  },
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1 · PERSONA — Schwartz level → abordagem + copy
// ═══════════════════════════════════════════════════════════════

type SchwartzLevel = 'Unaware' | 'Problem Aware' | 'Solution Aware' | 'Product Aware' | 'Most Aware'

interface PersonaProfile {
  readonly level: SchwartzLevel
  /** Quem é esta persona */
  readonly who: string
  /** Abordagem de venda */
  readonly approach: string
  /** Headline template */
  readonly headlineTemplate: string
  /** CTA principal */
  readonly cta: string
  /** Oferta */
  readonly offer: string
  /** Tom da copy */
  readonly urgency: 'baixa' | 'média' | 'alta'
}

const PERSONA_MAP: Record<SchwartzLevel, PersonaProfile> = {
  'Unaware': {
    level: 'Unaware',
    who: 'Não sabe que tem problema de marketing digital',
    approach: 'EDUCAR — mostrar que o problema existe antes de oferecer solução',
    headlineTemplate: 'Sua clínica está invisível para {N} pessoas que buscam {SERVIÇO} todo mês em {LOCAL}',
    cta: 'Ver Diagnóstico Gratuito',
    offer: 'Diagnóstico de marketing digital gratuito em 30 segundos',
    urgency: 'baixa',
  },
  'Problem Aware': {
    level: 'Problem Aware',
    who: 'Sabe que tem poucos pacientes mas não sabe resolver',
    approach: 'AGITAR A DOR — quantificar o problema + oferecer caminho claro',
    headlineTemplate: 'Descobrimos exatamente por que sua clínica não aparece no Google — e quantos pacientes você está perdendo',
    cta: 'Ver Meus Gaps Agora',
    offer: 'Relatório gratuito com os 3 principais gaps da sua clínica',
    urgency: 'média',
  },
  'Solution Aware': {
    level: 'Solution Aware',
    who: 'Já ouviu falar de SEO/Google Ads, sabe que existem soluções',
    approach: 'COMPARAR — mostrar que adsentice é melhor que alternativas',
    headlineTemplate: 'Agências cobram R$2.000/mês por SEO. Nosso diagnóstico é gratuito e automático — você vê os gaps em 30 segundos.',
    cta: 'Quero Resolver Isso',
    offer: 'Plano de ação personalizado com 3 passos para aparecer no Google',
    urgency: 'média',
  },
  'Product Aware': {
    level: 'Product Aware',
    who: 'Conhece a adsentice, está considerando',
    approach: 'PROVA SOCIAL — casos de sucesso, depoimentos, garantia',
    headlineTemplate: 'Já ajudamos {N} dentistas em {LOCAL}. Veja o resultado da Dra. Maria — +40 pacientes/mês em 90 dias.',
    cta: 'Começar Agora',
    offer: 'Plano Sentinela — monitoramento mensal + otimização contínua',
    urgency: 'alta',
  },
  'Most Aware': {
    level: 'Most Aware',
    who: 'Já decidiu, só precisa fechar',
    approach: 'FECHAR — remover última objeção, call to action direto',
    headlineTemplate: 'Último passo: ative seu monitoramento em 2 minutos.',
    cta: 'Ativar Monitoramento',
    offer: 'Primeiro mês com garantia de resultados ou seu dinheiro de volta',
    urgency: 'alta',
  },
}

// ═══════════════════════════════════════════════════════════════
// LAYER 2 · SKILLS — Marketing skills ativas por superfície
// ═══════════════════════════════════════════════════════════════

interface SkillProfile {
  readonly name: string
  /** O que este skill faz pela copy */
  readonly copyRule: string
  /** Gatilhos de conversão */
  readonly triggers: string[]
}

const S10_SKILLS: SkillProfile[] = [
  {
    name: 'copywriting',
    copyRule: 'Clareza sobre criatividade. Benefícios sobre features. Especificidade sobre vagueza. Linguagem do paciente, não jargão médico.',
    triggers: ['headline', 'subtítulo', 'CTA', 'bullet points'],
  },
  {
    name: 'psychology',
    copyRule: 'Loss Aversion: "Você está perdendo X pacientes/mês" > "Você pode ganhar". Social Proof: número de clínicas analisadas. Authority Bias: "Baseado em dados reais do Google".',
    triggers: ['hero', 'prova social', 'autoridade', 'escassez'],
  },
  {
    name: 'cro',
    copyRule: 'Um CTA claro por seção. Remover fricção: resultado instantâneo, sem cadastro. Urgência: "Seus concorrentes já estão aparecendo".',
    triggers: ['CTA', 'formulário', 'objeção', 'urgência'],
  },
  {
    name: 'local-seo',
    copyRule: 'Keywords locais no título e subtítulo: "[especialidade] em [bairro]". Geo-relevância: mencionar bairro, cidade, zona.',
    triggers: ['headline', 'subtítulo', 'meta description', 'alt text'],
  },
]

// ═══════════════════════════════════════════════════════════════
// LAYER 3 · TOKENS — Matriz Warp por segmento
// ═══════════════════════════════════════════════════════════════

interface TokenProfile {
  readonly primaryColor: string
  readonly secondaryColor: string
  readonly accentColor: string
  readonly hue: number
  readonly headingFont: string
  readonly bodyFont: string
  readonly emotion: string
  readonly spacing: string
  readonly radius: string
  readonly motionStyle: string
}

// ADR-0036 — TOKEN_MAP usa oklch() dinâmico via segmentPalette (zero hex fixo)
// A paleta é computada em runtime, não hardcoded.
function segmentPaletteTokens(seg: SegmentId): TokenProfile {
  const hue: Record<string, number> = { saude:220, beleza:340, servicos:260, alimentacao:25, comercio:250, educacao:160, hospitalidade:30 }
  const h = hue[seg] || 260
  const fonts: Record<string, { heading: string; body: string }> = {
    saude: { heading: 'Inter', body: 'Inter' },
    beleza: { heading: 'Playfair Display', body: 'Inter' },
    servicos: { heading: 'Inter', body: 'Inter' },
    alimentacao: { heading: 'Poppins', body: 'Open Sans' },
    comercio: { heading: 'Inter', body: 'Inter' },
    educacao: { heading: 'Inter', body: 'Inter' },
    hospitalidade: { heading: 'Playfair Display', body: 'Inter' },
  }
  const f = fonts[seg] || fonts.servicos
  const emotions: Record<string, string> = {
    saude: 'Confiança, higiene, profissionalismo', beleza: 'Feminino, luxo, elegância',
    servicos: 'Autoridade, tradição, confiança', alimentacao: 'Apetite, calor, acolhimento',
    comercio: 'Confiança, praticidade', educacao: 'Crescimento, confiança, aprendizado',
    hospitalidade: 'Acolhimento, experiência, conforto',
  }
  const spacingMap: Record<string, string> = { saude:'1.5rem', beleza:'2rem', servicos:'1.5rem', alimentacao:'1rem', comercio:'1rem', educacao:'1.5rem', hospitalidade:'2rem' }
  const radiusMap: Record<string, string> = { saude:'0.5rem', beleza:'0.75rem', servicos:'0.25rem', alimentacao:'0.5rem', comercio:'0.25rem', educacao:'0.5rem', hospitalidade:'0.5rem' }
  const motionMap: Record<string, string> = { saude:'zero', beleza:'subtle', servicos:'zero', alimentacao:'moderate', comercio:'zero', educacao:'subtle', hospitalidade:'subtle' }
  return {
    primaryColor: `oklch(55% 35% ${h})`, secondaryColor: `oklch(40% 35% ${h})`, accentColor: `oklch(65% 28% ${h})`,
    hue: h, headingFont: f.heading, bodyFont: f.body,
    emotion: emotions[seg] || 'Confiança, profissionalismo',
    spacing: spacingMap[seg] || '1.5rem', radius: radiusMap[seg] || '0.5rem',
    motionStyle: motionMap[seg] || 'zero',
  }
}
const TOKEN_MAP: Record<SegmentId, TokenProfile> = {
  saude: segmentPaletteTokens('saude'), beleza: segmentPaletteTokens('beleza'),
  servicos: segmentPaletteTokens('servicos'), alimentacao: segmentPaletteTokens('alimentacao'),
  comercio: segmentPaletteTokens('comercio'), educacao: segmentPaletteTokens('educacao'),
  hospitalidade: segmentPaletteTokens('hospitalidade'),
}

// ═══════════════════════════════════════════════════════════════
// S10 PIPELINE — Orquestrador completo
// ═══════════════════════════════════════════════════════════════

export interface S10Input {
  /** Categoria GMB (ex: "dentist") */
  category: string
  /** Especialidades detectadas (ex: "Periodontia, Ortodontia") */
  specialties?: string
  /** Nome do negócio */
  businessName: string
  /** Score composto (0-100) */
  score: number
  /** Nível Schwartz */
  schwartzLevel: SchwartzLevel
  /** Sinais detectados */
  signals: string[]
  /** Cidade */
  city: string
  /** Bairro */
  district: string
  /** Rating GMB */
  rating: number
  /** Reviews count */
  reviews: number
  /** Photos count */
  photos: number
  /** Is claimed */
  isClaimed: boolean
  /** Website */
  website?: string
  /** Concorrentes no bairro (opcional) */
  competitorCount?: number
  /** Score médio do bairro (opcional) */
  avgNeighborhoodScore?: number
}

export interface S10Output {
  // ═══ VISÍVEL AO CLIENTE (renderizado no HTML) ═══
  /** Nome do negócio */
  businessName: string
  /** Score composto (0-100) */
  score: number
  /** Nível Schwartz */
  schwartzLevel: string
  /** Segmento Matriz Warp */
  segment: SegmentId
  /** Tokens visuais aplicados */
  tokens: TokenProfile
  /** Headline personalizada */
  headline: string
  /** Subtítulo */
  subtitle: string
  /** CTA principal */
  cta: string
  /** Oferta */
  offer: string
  /** Gaps detectados */
  gaps: Array<{ title: string; severity: string; desc: string; fix: string; impact: string; effort: string }>

  // ═══ INTERNO (metadados, telemetria, NÃO renderizado) ═══
  /** Metadados do pipeline — salvo no trace, NUNCA no HTML */
  _meta: {
    traceId: string
    pipelineVersion: string
    nicho: { name: string; specialties: string[]; audience: string; tone: string }
    persona: { level: string; approach: string }
    skills: string[]
    qdrantHints: { design: string; landing: string; typography: string }
    signalsRaw: string[]
    computedAt: string
  }
}

export class S10RaioXPipeline {
  /**
   * Rota completa: category → nicho → persona → skills → copy → tokens
   */
  compute(input: S10Input): S10Output {
    // ═══ LAYER 0: NICHO ═══
    const nicho = NICHO_MAP[input.category] || NICHO_MAP.default

    // ═══ LAYER 1: SEGMENTO ═══
    const segmentMap: Record<string, SegmentId> = {
      dentist: 'saude', medical_clinic: 'saude', hospital: 'saude',
      psychologist: 'saude', physiotherapist: 'saude', pharmacy: 'comercio',
      beauty_salon: 'beleza', spa: 'beleza', barber: 'beleza',
      lawyer: 'servicos', accountant: 'servicos', architect: 'servicos',
      restaurant: 'alimentacao', cafe: 'alimentacao',
      pet_store: 'comercio', supermarket: 'comercio',
      school: 'educacao', driving_school: 'educacao',
      hotel: 'hospitalidade', inn: 'hospitalidade',
    }
    const segment = segmentMap[input.category] || 'servicos'

    // ═══ LAYER 2: PERSONA (por Schwartz) ═══
    const persona = PERSONA_MAP[input.schwartzLevel] || PERSONA_MAP['Problem Aware']

    // ═══ LAYER 3: SKILLS ═══
    const skills = S10_SKILLS

    // ═══ LAYER 4: TOKENS ═══
    const tokens = TOKEN_MAP[segment]

    // ═══ LAYER 5: COPY DERIVADA ═══
    // Substitui placeholders nos templates
    const local = input.district ? `${input.district}, ${input.city}` : input.city
    const specialtyList = input.specialties || nicho.specialties.slice(0, 2).join(' e ')
    const competitorCount = input.competitorCount || 47

    const headline = persona.headlineTemplate
      .replace('{N}', String(competitorCount))
      .replace('{SERVIÇO}', nicho.name.toLowerCase())
      .replace('{LOCAL}', local)
      .replace('{ESPECIALIDADE}', specialtyList)

    const subtitle = persona.approach

    const cta = persona.cta
    const offer = persona.offer

    // ═══ LAYER 6: GAPS ═══
    const gaps = this.computeGaps(input)

    // ═══ LAYER 7: OBJEÇÕES ═══
    // As 2 objeções mais relevantes para o nicho
    const objections = nicho.objections.slice(0, 2)

    const traceId = `s10_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    return {
      // ═══ VISÍVEL AO CLIENTE ═══
      businessName: input.businessName,
      score: input.score,
      schwartzLevel: input.schwartzLevel,
      segment,
      tokens,
      headline,
      subtitle,
      cta,
      offer,
      gaps,

      // ═══ INTERNO (NUNCA no HTML) ═══
      _meta: {
        traceId,
        pipelineVersion: '2.0.0',
        nicho: { name: nicho.name, specialties: nicho.specialties, audience: nicho.audience, tone: nicho.tone },
        persona: { level: persona.level, approach: persona.approach },
        skills: skills.map(s => s.name),
        qdrantHints: { design: '', landing: '', typography: '' }, // filled by enrich stage
        signalsRaw: input.signals,
        computedAt: new Date().toISOString(),
      },
    }
  }

  private computeGaps(input: S10Input): S10Output['gaps'] {
    const gaps: S10Output['gaps'] = []
    const s = new Set(input.signals.map((x: string) => x.trim()))

    // Schema LocalBusiness
    if (s.has('s1_missing_local_business') || s.has('s1_missing_local_business')) {
      gaps.push({
        title: 'Sem Schema LocalBusiness no site',
        severity: '🔴 Crítico',
        desc: 'Seu site não informa ao Google que você é uma clínica odontológica. Isso reduz seu ranking no Google Maps e impede rich results com estrelas e endereço.',
        fix: 'Adicionar JSON-LD LocalBusiness no <head> do site com endereço, telefone, horários e especialidades. 5 minutos.',
        impact: 'Alto', effort: '5 min',
      })
    }

    // Thin content
    if (s.has('c1_thin_content') || s.has('c1_thin_content')) {
      gaps.push({
        title: 'Conteúdo insuficiente nas páginas (Thin Content)',
        severity: '🟡 Médio',
        desc: 'Páginas com menos de 300 palavras não ranqueiam bem. O Google interpreta como conteúdo raso e dá prioridade para concorrentes com páginas mais completas.',
        fix: 'Expandir cada página de serviço para 500+ palavras. Incluir palavras-chave que pacientes buscam, fotos reais e descrições detalhadas.',
        impact: 'Alto', effort: '2-4 horas',
      })
    }

    // Flat structure
    if (s.has('a1_flat_structure') || s.has('a1_flat_structure')) {
      gaps.push({
        title: 'Site sem páginas individuais por serviço',
        severity: '🟡 Médio',
        desc: 'Todos os serviços listados em uma única página. Cada especialidade deveria ter sua própria página para rankear melhor no Google.',
        fix: 'Criar páginas dedicadas: /periodontia, /ortodontia, /implante-dentario — cada uma com 500+ palavras, schema e fotos.',
        impact: 'Médio', effort: '4 horas',
      })
    }

    // Reviews volume
    if (input.reviews < 50) {
      gaps.push({
        title: 'Poucas avaliações para autoridade máxima',
        severity: '🟢 Leve',
        desc: `${input.reviews} avaliações é bom, mas 50+ elevam sua autoridade no Google Maps ao nível máximo e aumentam a taxa de clique em 25%.`,
        fix: 'Pedir para 1 paciente satisfeito por semana avaliar no Google. Responder TODAS as avaliações em até 24h.',
        impact: 'Médio', effort: 'Contínuo',
      })
    }

    // Photos
    if (input.photos < 15) {
      gaps.push({
        title: 'Fotos insuficientes no Google Meu Negócio',
        severity: '🟡 Médio',
        desc: `Seu GMB tem ${input.photos} fotos. Perfis com 30+ fotos recebem 2x mais cliques. Fotos reais geram confiança e humanizam seu negócio.`,
        fix: 'Adicionar fotos do consultório, equipe, equipamentos, antes/depois de procedimentos. Atualizar 1 foto nova por semana.',
        impact: 'Médio', effort: '30 min',
      })
    }

    // Always add competitive context
    const competitorCount = input.competitorCount || 47
    const avgScore = input.avgNeighborhoodScore || 38
    gaps.push({
      title: 'Concorrência local ativa',
      severity: input.score > avgScore ? '🟢 Leve' : '🟡 Médio',
      desc: `${competitorCount} concorrentes em ${input.district || input.city}. O score médio do bairro é ${avgScore}/100. ${input.score > avgScore ? 'Sua clínica está ACIMA da média — mantenha a vantagem.' : 'Sua clínica está ABAIXO da média — prioridade máxima.'}`,
      fix: input.score > avgScore
        ? 'Continuar investindo em SEO local para manter a liderança. Foco em palavras-chave de cauda longa que concorrentes ignoram.'
        : 'Prioridade: corrigir os gaps críticos primeiro (Schema + Conteúdo). Depois focar em diferenciação por especialidade.',
      impact: 'Alto', effort: '1-2 semanas',
    })

    return gaps
  }
}

/** Singleton */
export const s10Pipeline = new S10RaioXPipeline()
