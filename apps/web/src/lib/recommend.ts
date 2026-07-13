// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Unified Recommendation Engine v0.4
// Skill: marketing-ideas (Corey Haines) — 139 tactics → prioritized actions
// Consumes ALL signals + ProductContext → 3-5 prioritized action plans.
// Deterministic rule-engine — no LLM, zero API.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput, ScoreData } from "./scoring"
import type { ContentGapResult, ContentGapRecommendation } from "./content-gap"
import type { ArchitectureResult } from "./site-architecture"
import type { SchemaResult } from "./schema-scoring"
import type { ProductContext } from "./product-context"
import type { ToolSuggestion } from "./tool-suggester"

// ── Types ─────────────────────────────────────────────────────

export interface ActionItem {
  priority: "alta" | "media" | "baixa"
  category: string           // corpo da acao (SEO, Conteudo, Conversao, GMB, etc.)
  title: string               // headline da acao
  description: string         // 1-2 frases
  effort: "minutos" | "horas" | "dias" | "semanas"
  impact: "alto" | "medio" | "baixo"
  revenuePotential: "alto" | "medio" | "baixo"
  score: number               // 0-100 priorization score
  toolSuggestion?: ToolSuggestion
}

export interface ActionPlan {
  leadName: string
  category: string
  maturitySummary: string
  actions: ActionItem[]       // 3-7 sorted by priority score
  quickWin: ActionItem         // single fastest + highest impact action
}

// ── Rule Engine ───────────────────────────────────────────────

/** Priority score: impact × 0.40 + effort_inverse × 0.25 + revenue × 0.25 + urgency × 0.10 */
function priorityScore(impact: number, effort: number, revenue: number, urgency: number): number {
  return Math.round((impact * 0.40 + effort * 0.25 + revenue * 0.25 + urgency * 0.10) * 100)
}

/** Map effort string to numeric inverse (easier = higher). */
function effortScore(effort: string): number {
  return { minutos: 1.0, horas: 0.8, dias: 0.4, semanas: 0.1 }[effort] || 0.5
}

/** Generate unified action plan from ALL enrichment data. */
export function generateActionPlan(
  input: ScoringInput,
  score: ScoreData,
  contentGap: ContentGapResult | null,
  architecture: ArchitectureResult | null,
  schema: SchemaResult | null,
  context: ProductContext,
  toolSuggestion: ToolSuggestion | null,
): ActionPlan {
  const actions: ActionItem[] = []

  // ── SEO Technical ──
  if (schema?.signals.s1_missing_local_business) {
    actions.push({
      priority: "alta", category: "SEO Tecnico", effort: "minutos", impact: "alto", revenuePotential: "alto",
      title: "Adicionar Schema JSON-LD LocalBusiness",
      description: `Seu site nao tem dados estruturados. Adicione o schema gerado automaticamente para aparecer nos rich results do Google com estrelas, endereco e telefone. Copie e cole no <head> do site.`,
      score: priorityScore(1.0, effortScore("minutos"), 0.9, 0.8),
    })
  }

  if (architecture?.signals.a1_flat_structure) {
    actions.push({
      priority: "alta", category: "Arquitetura", effort: "horas", impact: "alto", revenuePotential: "alto",
      title: "Criar Estrutura de Multiplas Paginas",
      description: `Seu site tem apenas ${architecture.internalLinks} links internos — Google interpreta como site de pagina unica. Crie pelo menos Home, Servicos e Contato com navegacao entre elas.`,
      score: priorityScore(0.9, effortScore("horas"), 0.8, 0.7),
    })
  }

  if (contentGap?.signals.c1_thin_content || score.engagement.normalized < 30) {
    actions.push({
      priority: "alta", category: "Conteudo", effort: "horas", impact: "alto", revenuePotential: "alto",
      title: "Expandir Conteudo para 500+ Palavras por Pagina",
      description: `Conteudo com menos de 300 palavras nao ranqueia. Expanda cada pagina principal descrevendo seus servicos, publico-alvo e diferenciais. Inclua palavras-chave que seus clientes buscam no Google.`,
      score: priorityScore(0.95, effortScore("horas"), 0.9, 0.8),
    })
  }

  // ── GMB ──
  if (input.is_claimed === false) {
    actions.push({
      priority: "alta", category: "Google Meu Negocio", effort: "minutos", impact: "alto", revenuePotential: "alto",
      title: "Reivindicar Perfil do Google Meu Negocio",
      description: "Seu perfil GMB nao esta sob seu controle. Qualquer pessoa pode sugerir alteracoes. Reivindique gratuitamente em business.google.com — leva 5 minutos e e o passo #1 de marketing local.",
      score: priorityScore(1.0, effortScore("minutos"), 1.0, 1.0),
    })
  }

  if (input.rating_value != null && input.rating_value <= 3.5 && (input.rating_votes ?? 0) >= 5) {
    actions.push({
      priority: "alta", category: "Reputacao", effort: "dias", impact: "alto", revenuePotential: "medio",
      title: `Recuperar Reputacao — ${input.rating_value} Estrelas com ${input.rating_votes} Avaliacoes`,
      description: "Reputacao baixa afasta clientes. Responda avaliacoes negativas, resolva os problemas e peca para clientes satisfeitos avaliarem. Meta: 4.0+ estrelas em 90 dias.",
      score: priorityScore(0.9, effortScore("dias"), 0.6, 0.7),
    })
  }

  // ── Analytics ──
  if (input.l2_has_analytics === false) {
    actions.push({ priority: "alta", category: "Analytics", effort: "minutos", impact: "alto", revenuePotential: "medio",
      title: "Instalar Google Analytics 4 e Search Console",
      description: "Sem dados, decisoes de marketing sao no escuro. Instale GA4 (gratis) para saber quantas pessoas visitam seu site e de onde vem. Conecte ao Search Console para ver quais buscas trazem trafego.",
      score: priorityScore(0.8, effortScore("minutos"), 0.6, 0.5) })
  }

  // ── Content Strategy ──
  if ((contentGap?.signals.c1_thin_content || architecture?.signals.a2_orphan_risk) && !contentGap?.signals.c1_thin_content) {
    actions.push({ priority: "media", category: "Conteudo", effort: "horas", impact: "medio", revenuePotential: "medio",
      title: "Criar Blog com Artigos Baseados em Duvidas de Clientes",
      description: "Comece um blog com 2-3 artigos por mes respondendo perguntas frequentes. Ex: 'Quanto custa [servico]?', '[Servico] doi?', 'Como escolher [profissional]?'.",
      score: priorityScore(0.6, effortScore("horas"), 0.5, 0.4) })
  }

  // ── Mobile / Performance ──
  if (input.l2_lighthouse_performance != null && input.l2_lighthouse_performance < 0.4) {
    actions.push({ priority: "media", category: "Performance", effort: "dias", impact: "medio", revenuePotential: "medio",
      title: "Otimizar Velocidade e Experiencia Mobile",
      description: `Seu site tem performance de ${Math.round((input.l2_lighthouse_performance || 0) * 100)}%. Otimize imagens, ative compressao e cache. Google penaliza sites lentos.`,
      score: priorityScore(0.5, effortScore("dias"), 0.5, 0.3) })
  }

  // ── Tool Suggestion ──
  if (toolSuggestion) {
    actions.push({ priority: "media", category: "Ferramenta Gratuita", effort: toolSuggestion.effort, impact: "medio", revenuePotential: "alto",
      title: `Criar ${toolSuggestion.name}`,
      description: `${toolSuggestion.description} Isto atrai trafego organico qualificado — clientes buscando exatamente o que voce oferece.`,
      score: priorityScore(0.7, effortScore(toolSuggestion.effort), 0.7, 0.5),
      toolSuggestion })
  }

  // ── CRO ──
  if (input.l2_word_count != null && input.l2_word_count >= 300 && !input.phone) {
    actions.push({ priority: "media", category: "Conversao", effort: "minutos", impact: "medio", revenuePotential: "medio",
      title: "Adicionar WhatsApp e Telefone Visiveis no Site",
      description: "Clientes querem contato imediato. Adicione botao de WhatsApp flutuante no site com mensagem pre-pronta. Facilite o agendamento.",
      score: priorityScore(0.6, effortScore("minutos"), 0.5, 0.4) })
  }

  // ── Social Proof ──
  if (input.total_photos != null && input.total_photos < 5 && input.l2_images_count != null && input.l2_images_count < 3) {
    actions.push({ priority: "baixa", category: "Prova Social", effort: "minutos", impact: "medio", revenuePotential: "baixo",
      title: "Adicionar Fotos Reais do Negocio",
      description: `Apenas ${input.total_photos} fotos no GMB e ${input.l2_images_count} no site. Clientes confiam mais em negocios com fotos reais. Adicione fotos da fachada, equipe e instalacoes.`,
      score: priorityScore(0.4, effortScore("minutos"), 0.3, 0.2) })
  }

  // Sort by priority score descending, take top 5-7
  actions.sort((a, b) => b.score - a.score)
  const topActions = actions.slice(0, 6)

  // ── Quick Win = fastest + highest impact among top 3 ──
  const quickWin = topActions.slice(0, 3).sort((a, b) => {
    const aScore = effortScore(a.effort) * 0.6 + (a.impact === "alto" ? 0.4 : 0.2)
    const bScore = effortScore(b.effort) * 0.6 + (b.impact === "alto" ? 0.4 : 0.2)
    return bScore - aScore
  })[0] || topActions[0]

  const maturitySummary = contentGap
    ? `Maturidade de Conteudo: ${contentGap.maturity.label} (${contentGap.maturityScore}/100). ${architecture ? `Arquitetura: ${architecture.maturity.label}. ` : ""}${schema ? `Schema: ${schema.maturity.label}.` : ""}`
    : "Analise de maturidade de marketing digital completa."

  return {
    leadName: input.title || "Negocio Local",
    category: input.category || "?",
    maturitySummary,
    actions: topActions,
    quickWin,
  }
}
