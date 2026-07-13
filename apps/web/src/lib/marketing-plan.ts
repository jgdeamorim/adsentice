// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Marketing Plan Generator v0.4
// Skill: marketing-plan (Corey Haines) — 13-section plan, flagship deliverable
// Composes ALL enrichment data into a fractional CMO marketing plan.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput, ScoreData } from "./scoring"
import type { ContentGapResult } from "./content-gap"
import type { ArchitectureResult } from "./site-architecture"
import type { SchemaResult } from "./schema-scoring"
import type { ProductContext } from "./product-context"
import type { ActionPlan, ActionItem } from "./recommend"
import type { BattleCard } from "./battle-card"
import type { PSEOPlaybook } from "./programmatic-seo"

// ── Types ─────────────────────────────────────────────────────

export interface MarketingPlan {
  executiveSummary: string
  strategicFrame: { mission: string; beachhead: string; differentiator: string }
  currentState: { strengths: string[]; weaknesses: string[]; scoreBreakdown: string }
  acquisition: { channels: string[]; tactics: ActionItem[]; kpis: string[] }
  activation: { websiteCTAs: string[]; gmbOptimizations: string[] }
  retention: { reviewStrategy: string; contentCalendar: string }
  referral: { referralTriggers: string[]; reviewIncentives: string }
  revenue: { ticketEstimate: number; monthlyProjection: number; breakEven: string }
  roadmap90Day: { month1: string[]; month2: string[]; month3: string[] }
  outlook12Month: { q1: string; q2: string; q3: string; q4: string }
  opsStack: { tools: string[]; integrations: string[] }
  tacticalBank: ActionItem[]
  measurement: { primaryKPI: string; weekly: string[]; monthly: string[] }
}

// ── Generator ─────────────────────────────────────────────────

/** Generate 13-section marketing plan from ALL enrichment data. */
export function generateMarketingPlan(
  input: ScoringInput,
  score: ScoreData,
  context: ProductContext,
  actionPlan: ActionPlan,
  battleCard: BattleCard | null,
  contentGap: ContentGapResult | null,
  architecture: ArchitectureResult | null,
  schema: SchemaResult | null,
  pseoPlaybook: PSEOPlaybook | null,
): MarketingPlan {
  const businessName = input.title || "Negocio Local"
  const cat = input.category || "sua categoria"
  const city = "sua cidade"

  // ── Executive Summary ──
  const executiveSummary = `${businessName} (${cat}, ${city}) foi analisado pelo motor de diagnostico adsentice. Score composto: ${score.compound}/100 (Fit ${score.fit.normalized}% · Engagement ${score.engagement.normalized}% · Intent ${score.intent.normalized}%). ${contentGap ? `Maturidade de conteudo: ${contentGap.maturity.label}. ` : ""}${architecture ? `Arquitetura do site: ${architecture.maturity.label}. ` : ""}O plano abaixo apresenta ${actionPlan.actions.length} acoes priorizadas para os proximos 90 dias.`

  // ── Strategic Frame ──
  const strategicFrame = {
    mission: `Ser a referencia em ${cat} na regiao de ${city}, atraindo clientes qualificados via busca organica no Google.`,
    beachhead: `${cat} em ${city} — foco total em busca local antes de expandir para regioes vizinhas.`,
    differentiator: context.differentiation.strengths[0] || "Presenca digital profissional com dados reais de mercado",
  }

  // ── Current State ──
  const currentState = {
    strengths: context.differentiation.strengths.slice(0, 3),
    weaknesses: context.differentiation.weaknesses.slice(0, 3),
    scoreBreakdown: `Fit (${score.fit.normalized}/100) × 0.40 + Engagement (${score.engagement.normalized}/100) × 0.35 + Intent (${score.intent.normalized}/100) × 0.25 = Score Composto ${score.compound}/100`,
  }

  // ── Acquisition ──
  const acquisition = {
    channels: ["Google Meu Negocio (organico)", "Busca Organica Google (SEO Local)", "Google Maps", input.phone ? "WhatsApp Business" : null, input.website ? "Site Proprio" : null].filter(Boolean) as string[],
    tactics: actionPlan.actions.filter(a => ["SEO Tecnico", "Conteudo", "Google Meu Negocio", "Arquitetura"].includes(a.category)),
    kpis: ["Trafego organico mensal", "Cliques no GMB", "Posicao media para keywords locais", "Taxa de conversao site", "Ligacoes/WhatsApp do GMB"],
  }

  // ── Activation ──
  const activation = {
    websiteCTAs: input.website ? [
      "Botao WhatsApp flutuante com mensagem pre-pronta",
      "Formulario de contato simplificado (nome + telefone + motivo)",
      "CTA no topo da pagina inicial: 'Agende sua consulta'",
    ] : ["Criar landing page com formulario de contato e WhatsApp"],
    gmbOptimizations: [
      input.is_claimed !== true ? "REIVINDICAR perfil GMB — prioridade #1" : "Responder TODAS as avaliacoes semanalmente",
      input.total_photos != null && input.total_photos < 10 ? `Adicionar mais fotos (atual: ${input.total_photos})` : "Manter galeria de fotos atualizada",
      "Publicar post semanal no GMB com oferta ou novidade",
      "Verificar horario de funcionamento, telefone e endereco",
    ],
  }

  // ── Retention ──
  const retention = {
    reviewStrategy: input.rating_votes != null && input.rating_votes < 20
      ? `Meta: ${Math.max(20, (input.rating_votes || 0) + 15)} avaliacoes em 90 dias. Enviar link de avaliacao por WhatsApp apos cada atendimento. Responder TODAS as avaliacoes em ate 48h.`
      : "Manter taxa de resposta < 48h em todas as avaliacoes. Enviar pesquisa de satisfacao pos-atendimento.",
    contentCalendar: "Publicar 1 artigo/semana no blog respondendo duvidas de clientes. Postar 2x/semana no GMB. Enviar 1 email/mes para base de clientes.",
  }

  // ── Referral ──
  const referral = {
    referralTriggers: ["Pos-atendimento bem-sucedido", "Cliente satisfeito apos 30 dias", "Data especial do cliente (aniversario)"],
    reviewIncentives: "Programa de indicacao: 'Indique um amigo e ganhe [desconto/bonus]'. Sempre enviar link direto do Google Maps para facilitar a avaliacao.",
  }

  // ── Revenue ──
  const roi = battleCard?.roiEstimate || { monthlyTraffic: 500, conversionRate: 0.05, ticketValue: 150, monthlyRevenue: 3750 }
  const revenue = {
    ticketEstimate: roi.ticketValue,
    monthlyProjection: roi.monthlyRevenue,
    breakEven: roi.monthlyRevenue > 500 ? `Investimento se paga com ${Math.ceil(500 / roi.ticketValue)} clientes/mes (${Math.round((500 / roi.monthlyRevenue) * 100)}% do potencial)` : "Break-even estimado em 2-3 meses com implementacao consistente",
  }

  // ── 90-Day Roadmap ──
  const roadmap90Day = {
    month1: actionPlan.actions.filter(a => a.effort === "minutos" || a.priority === "alta").slice(0, 3).map(a => a.title),
    month2: actionPlan.actions.filter(a => a.effort === "horas" || a.category === "Conteudo").slice(0, 3).map(a => a.title),
    month3: actionPlan.actions.filter(a => a.effort === "dias" || a.category === "Arquitetura" || a.category === "Ferramenta Gratuita").slice(0, 2).map(a => a.title),
  }

  // ── 12-Month Outlook ──
  const outlook12Month = {
    q1: "Fundacao: corrigir problemas tecnicos, otimizar GMB, estabelecer presenca de busca local. Publicacao consistente de conteudo.",
    q2: "Crescimento: expandir para keywords de cauda longa, implementar schema, iniciar link building local. Programa de avaliacoes ativo.",
    q3: "Autoridade: dominar top 3 para keywords principais, gerar trafego consistente, converter leads em clientes recorrentes.",
    q4: "Escala: expandir para regioes vizinhas, diversificar canais (social, email), lancar ferramenta gratuita para captura de leads.",
  }

  // ── Ops Stack ──
  const opsStack = {
    tools: ["Google Meu Negocio", "Google Search Console", "Google Analytics 4",
      input.l2_cms || "CMS do site", "WhatsApp Business", "Google Drive (relatorios)"].filter(Boolean) as string[],
    integrations: ["GMB ↔ Site ↔ Analytics ↔ Search Console", "WhatsApp ↔ CRM", "Email marketing ↔ Site"],
  }

  // ── Tactical Bank ──
  const tacticalBank = actionPlan.actions

  // ── Measurement ──
  const measurement = {
    primaryKPI: `Aumentar trafego organico local em 50% em 180 dias (baseline: ${roi.monthlyTraffic} visitas/mes estimadas)`,
    weekly: ["Verificar Search Console (impressoes, cliques, posicao media)", "Responder novas avaliacoes GMB", "Publicar 1 post GMB", "Verificar metricas do site (GA4)"],
    monthly: ["Relatorio de posicoes para top 10 keywords locais", "Relatorio de leads gerados (telefone, WhatsApp, formulario)", "Auditar meta tags e schema", "Planejar conteudo do mes seguinte"],
  }

  return { executiveSummary, strategicFrame, currentState, acquisition, activation, retention, referral, revenue, roadmap90Day, outlook12Month, opsStack, tacticalBank, measurement }
}
