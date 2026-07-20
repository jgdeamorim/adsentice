/**
 * packages/warp/src/recommend-engine.ts
 * Recommendation Engine — Módulo Warp para ações priorizadas por lead
 *
 * "Cada recomendação cita o sinal que a originou.
 *  Rule engine cobre 80% dos casos. LLM (L6) só para edge cases."
 *
 * Integra com:
 *   - M2 registry.queryByIntent() → design knowledge contextual
 *   - M9 tokens.compose() → tokens específicos do segmento
 *   - DataForSEO → dados de mercado
 *
 * Consome o código existente em apps/web/src/lib/:
 *   - recommend.ts (generateActionPlan)
 *   - scoring.ts (ScoreData, ScoringInput)
 *   - content-gap.ts (ContentGapResult)
 *   - competitor-intel.ts (CompetitiveLandscape)
 *   - battle-card.ts (generateBattleCard)
 *
 * medido=verdade · 2026-07-14 · adsentice
 */

import type { SegmentId } from './tokens-composer'
import { discoverSkills, type DiscoveredSkill } from './marketing-kg'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RecommendAction {
  /** Prioridade da ação */
  priority: 'alta' | 'media' | 'baixa'
  /** Categoria (SEO Técnico, Conteúdo, GMB, Analytics, Conversão) */
  category: string
  /** Título da ação (1 frase) */
  title: string
  /** Descrição (2-3 frases, linguagem do dono do negócio) */
  description: string
  /** Esforço estimado */
  effort: 'minutos' | 'horas' | 'dias' | 'semanas'
  /** Impacto no negócio */
  impact: 'alto' | 'medio' | 'baixo'
  /** Potencial de receita */
  revenuePotential: 'alto' | 'medio' | 'baixo'
  /** Score de priorização (0-100) */
  score: number
  /** Sinal que originou a recomendação (medido=verdade) */
  evidenceSignal: string
  /** Valor do sinal (ex: "rating_value=3.2") */
  evidenceValue?: string
  /** Ferramenta gratuita sugerida (opcional) */
  toolSuggestion?: {
    name: string
    description: string
    effort: string
  }
}

export interface RecommendResult {
  /** Nome do negócio */
  businessName: string
  /** Categoria GMB */
  category: string
  /** Segmento adsentice */
  segment: SegmentId
  /** Resumo de maturidade de marketing digital */
  maturitySummary: string
  /** Ações priorizadas (3-7) */
  actions: RecommendAction[]
  /** Quick win: ação mais rápida com maior impacto */
  quickWin: RecommendAction
  /** Score composto do lead */
  compoundScore?: number
  /** Nível de consciência Schwartz */
  schwartzLevel?: string
}

export interface BattleCardOutput {
  businessName: string
  category: string
  scoreSummary: string
  top3Findings: string[]
  top3Objections: {
    objection: string
    response: string
    proof: string
    followUp: string
  }[]
  roiEstimate: {
    monthlyTraffic: number
    conversionRate: number
    ticketValue: number
    monthlyRevenue: number
  }
  miniDeck: { slide: number; title: string; content: string }[]
  whatsappScript: string
}

// ═══════════════════════════════════════════════════════════════
// Pre-built recommendation templates by segment
// ═══════════════════════════════════════════════════════════════

const SEGMENT_ACTIONS: Record<SegmentId, RecommendAction[]> = {
  saude: [
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Reivindicar e Otimizar Perfil do Google Meu Negócio',
      description: 'Seu perfil GMB é sua vitrine 24/7. Reivindique gratuitamente em business.google.com. Adicione fotos reais do consultório, horários de atendimento, serviços e link para agendamento. Clínicas com perfil completo recebem 5x mais chamadas.',
      score: 95, evidenceSignal: 'is_claimed', evidenceValue: 'false',
    },
    {
      priority: 'alta', category: 'SEO Local', effort: 'horas', impact: 'alto', revenuePotential: 'alto',
      title: 'Otimizar Site para "Dentista [bairro]"',
      description: '70% dos pacientes buscam dentista por bairro no Google. Seu site precisa ter páginas específicas mencionando os bairros que atende. Inclua depoimentos de pacientes e fotos do consultório.',
      score: 90, evidenceSignal: 'c7_competitor_gap', evidenceValue: 'true',
    },
    {
      priority: 'media', category: 'Reputação', effort: 'dias', impact: 'alto', revenuePotential: 'medio',
      title: 'Programa de Avaliações no Google',
      description: 'Pacientes confiam em avaliações. Peça para 1 paciente satisfeito por dia avaliar no Google. Responda TODAS as avaliações (boas e ruins) em até 24h. Meta: 50+ avaliações com 4.5+ estrelas.',
      score: 80, evidenceSignal: 'rating_votes', evidenceValue: '<20',
    },
    {
      priority: 'media', category: 'Conteúdo', effort: 'horas', impact: 'medio', revenuePotential: 'medio',
      title: 'Criar Página de Perguntas Frequentes (FAQ)',
      description: 'Pacientes buscam informações antes de agendar. Crie uma página respondendo: "Clareamento dói?", "Quanto custa implante?", "Aceita convênio?". Isso atrai tráfego orgânico e reduz chamadas repetitivas.',
      score: 70, evidenceSignal: 'c1_thin_content', evidenceValue: 'true',
    },
  ],
  beleza: [
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Otimizar Perfil GMB com Fotos Profissionais',
      description: 'Beleza é visual. Adicione 20+ fotos profissionais: antes/depois, instalações, equipe, produtos. Perfis com fotos recebem 3x mais cliques.',
      score: 95, evidenceSignal: 'total_photos', evidenceValue: '<10',
    },
    {
      priority: 'alta', category: 'Redes Sociais', effort: 'horas', impact: 'alto', revenuePotential: 'alto',
      title: 'Conectar Instagram ao GMB e Site',
      description: 'Instagram é o canal #1 de beleza. Vincule ao GMB para mostrar posts diretamente no Google. Adicione link do Instagram no site e botão de agendamento.',
      score: 92, evidenceSignal: 'l2_has_social', evidenceValue: 'false',
    },
    {
      priority: 'media', category: 'Conversão', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Botão WhatsApp com Agendamento',
      description: 'Adicione botão WhatsApp flutuante no site com mensagem pré-preenchida: "Olá! Gostaria de agendar [serviço] para [data]. Pode verificar disponibilidade?".',
      score: 85, evidenceSignal: 'phone', evidenceValue: 'missing',
    },
  ],
  servicos: [
    {
      priority: 'alta', category: 'SEO Local', effort: 'horas', impact: 'alto', revenuePotential: 'alto',
      title: 'Criar Páginas de Serviço por Especialidade',
      description: 'Cada serviço merece sua própria página: "Advogado Trabalhista SP", "Contador para MEI". Google ranqueia páginas específicas melhor que páginas genéricas.',
      score: 93, evidenceSignal: 'a1_flat_structure', evidenceValue: 'true',
    },
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Verificar NAP (Nome, Endereço, Telefone) Consistente',
      description: 'Seu nome, endereço e telefone precisam ser IDÊNTICOS em todos os lugares: GMB, site, diretórios. Inconsistência de NAP é o fator #1 de perda de ranking local.',
      score: 90, evidenceSignal: 'is_claimed', evidenceValue: 'inconsistent',
    },
    {
      priority: 'media', category: 'Prova Social', effort: 'dias', impact: 'medio', revenuePotential: 'medio',
      title: 'Coletar Depoimentos de Clientes',
      description: 'Depoimentos em vídeo (30s) de clientes satisfeitos valem mais que 100 avaliações escritas. Publique no site, GMB e redes sociais.',
      score: 75, evidenceSignal: 'rating_votes', evidenceValue: '<10',
    },
  ],
  alimentacao: [
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Atualizar Cardápio no GMB com Fotos e Preços',
      description: 'Clientes decidem onde comer pela foto. Adicione cardápio completo no GMB com fotos HD de cada prato, preços e descrições apetitosas.',
      score: 95, evidenceSignal: 'total_photos', evidenceValue: '<10',
    },
    {
      priority: 'alta', category: 'Delivery', effort: 'horas', impact: 'alto', revenuePotential: 'alto',
      title: 'Integrar com iFood e WhatsApp Delivery',
      description: 'O delivery representa 40%+ do faturamento de restaurantes. Cadastre no iFood e crie cardápio digital no WhatsApp Business com catálogo e pedidos automatizados.',
      score: 92, evidenceSignal: 'l2_has_social', evidenceValue: 'false',
    },
    {
      priority: 'media', category: 'Conteúdo', effort: 'horas', impact: 'medio', revenuePotential: 'medio',
      title: 'Criar Conteúdo para Datas Especiais',
      description: 'Dia das Mães, Dia dos Namorados, Réveillon: crie páginas especiais com menus temáticos. Isso ranqueia para buscas sazonais e atrai clientes em datas de pico.',
      score: 78, evidenceSignal: 'c7_competitor_gap', evidenceValue: 'true',
    },
  ],
  comercio: [
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Otimizar Categorias e Atributos GMB',
      description: 'Escolha a categoria mais ESPECÍFICA possível (ex: "Pet Shop" não "Loja"). Adicione atributos: aceita cartão, estacionamento, Wi-Fi, delivery. Isso melhora seu ranking.',
      score: 93, evidenceSignal: 'is_claimed', evidenceValue: 'false',
    },
    {
      priority: 'alta', category: 'Conversão', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Adicionar WhatsApp com Catálogo de Produtos',
      description: 'Crie catálogo no WhatsApp Business com seus produtos mais vendidos. Clientes compram direto pelo WhatsApp — sem precisar de site.',
      score: 90, evidenceSignal: 'phone', evidenceValue: 'missing',
    },
    {
      priority: 'media', category: 'SEO Local', effort: 'horas', impact: 'medio', revenuePotential: 'medio',
      title: 'Cadastrar em Diretórios Locais',
      description: 'Cadastre em Google Maps, Apontador, GuiaMais, TeleListas. Quanto mais diretórios consistentes, melhor seu ranking local.',
      score: 72, evidenceSignal: 'c7_competitor_gap', evidenceValue: 'true',
    },
  ],
  educacao: [
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Completar Perfil GMB com Cursos e Modalidades',
      description: 'Liste todos os cursos, faixas etárias e modalidades no GMB. Adicione fotos da estrutura: salas, quadra, equipamentos. Pais decidem pela estrutura.',
      score: 93, evidenceSignal: 'is_claimed', evidenceValue: 'false',
    },
    {
      priority: 'alta', category: 'Conteúdo', effort: 'horas', impact: 'medio', revenuePotential: 'alto',
      title: 'Criar Blog com Conteúdo Educativo',
      description: 'Pais buscam informações antes de matricular. Crie artigos: "Como escolher a escola ideal?", "Idade certa para cada série", "Método de ensino: qual o melhor?".',
      score: 88, evidenceSignal: 'c1_thin_content', evidenceValue: 'true',
    },
    {
      priority: 'media', category: 'Prova Social', effort: 'dias', impact: 'alto', revenuePotential: 'alto',
      title: 'Coletar Depoimentos de Pais e Alunos',
      description: 'Depoimentos em vídeo de pais satisfeitos são a maior prova social para escolas. Publique no site, GMB, Instagram e YouTube.',
      score: 82, evidenceSignal: 'rating_votes', evidenceValue: '<10',
    },
  ],
  hospitalidade: [
    {
      priority: 'alta', category: 'Google Meu Negócio', effort: 'minutos', impact: 'alto', revenuePotential: 'alto',
      title: 'Otimizar Perfil GMB com Fotos Profissionais de Cada Quarto',
      description: 'Hóspedes reservam pelo visual. Adicione 30+ fotos: cada tipo de quarto, café da manhã, piscina, vista, entorno. Hotéis com 30+ fotos recebem 2x mais reservas.',
      score: 95, evidenceSignal: 'total_photos', evidenceValue: '<15',
    },
    {
      priority: 'alta', category: 'OTA Integration', effort: 'dias', impact: 'alto', revenuePotential: 'alto',
      title: 'Integrar com Booking.com e Decolar via Channel Manager',
      description: 'Gerencie todos os canais (Booking, Decolar, Airbnb, site próprio) em um único lugar. Evite overbooking e maximize ocupação com preços dinâmicos.',
      score: 90, evidenceSignal: 'l2_has_analytics', evidenceValue: 'false',
    },
    {
      priority: 'media', category: 'Reputação', effort: 'dias', impact: 'alto', revenuePotential: 'alto',
      title: 'Programa de Resposta a Avaliações em 24h',
      description: 'Responda TODAS as avaliações no Google, Booking e TripAdvisor em até 24h. Hóspedes leem respostas do proprietário antes de reservar. Agradeça elogios e resolva críticas.',
      score: 85, evidenceSignal: 'rating_value', evidenceValue: '<4.0',
    },
  ],
}

// ═══════════════════════════════════════════════════════════════
// Recommend Engine
// ═══════════════════════════════════════════════════════════════

export class RecommendEngine {
  /**
   * Gera recomendações para um lead baseado em sinais de enriquecimento.
   *
   * Usa templates pré-construídos por segmento + dados reais do lead.
   * No futuro: integrará com M2 registry.queryByIntent() para design knowledge contextual.
   */
  generateForSegment(
    businessName: string,
    category: string,
    segment: SegmentId,
    signals: Record<string, unknown>,
  ): RecommendResult {
    const templates = SEGMENT_ACTIONS[segment] || SEGMENT_ACTIONS.comercio

    // Filtra e adapta ações baseadas nos sinais reais do lead
    const actions = templates.map((a) => {
      // Sobrescreve evidence value se o sinal existir nos dados reais
      const signalKey = a.evidenceSignal
      let evidenceValue = a.evidenceValue
      if (signalKey in signals) {
        const val = signals[signalKey]
        evidenceValue = val === false ? 'false' : val === true ? 'true' : String(val)
      }
      return { ...a, evidenceValue }
    })

    // Quick win: maior score com menor esforço
    const quickWin = [...actions]
      .sort((a, b) => {
        const effortScore = (e: string) => ({ minutos: 1.0, horas: 0.8, dias: 0.4, semanas: 0.1 })[e] || 0.5
        const aScore = a.score * 0.5 + effortScore(a.effort) * 50
        const bScore = b.score * 0.5 + effortScore(b.effort) * 50
        return bScore - aScore
      })[0] || actions[0]

    return {
      businessName,
      category,
      segment,
      maturitySummary: `Análise de marketing digital para ${businessName} (${category}). ${actions.length} ações priorizadas por impacto e esforço.`,
      actions: actions.slice(0, 6),
      quickWin,
    }
  }

  /** ADR-0049: Semantic enrichment via Discovery Layer (832 pts) */
  async generateWithDiscovery(
    businessName: string, category: string, segment: SegmentId,
    signals: Record<string, unknown>,
    leadCtx: { segment: string; category: string; score: number; hasWebsite: boolean; competitorCount: number; rating: number; city: string },
  ): Promise<{ result: RecommendResult; discoveredSkills: DiscoveredSkill[] }> {
    const base = this.generateForSegment(businessName, category, segment, signals)
    const discovered = await discoverSkills(leadCtx as any, 6).catch(() => [])
    if (discovered.length > 0) {
      base.actions = [
        ...base.actions,
        ...discovered.slice(0, 3).map(d => ({
          priority: 'media' as const, category: 'IA · Marketing Intelligence',
          effort: 'horas' as const, impact: 'alto' as const, revenuePotential: 'alto' as const,
          title: d.skillName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          description: d.content.slice(0, 200),
          score: Math.round(d.score * 100),
          evidenceSignal: `qdr:${d.repo}`, evidenceValue: d.source,
        })),
      ].slice(0, 9)
    }
    return { result: base, discoveredSkills: discovered }
  }

  /**
   * Retorna todas as ações disponíveis para um segmento (catálogo).
   */
  getCatalogForSegment(segment: SegmentId): RecommendAction[] {
    return SEGMENT_ACTIONS[segment] || []
  }
}

/** Singleton */
export const recommendEngine = new RecommendEngine()
