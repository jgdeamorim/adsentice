// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Sales Battle Card Generator v0.4
// Skill: sales-enablement (Corey Haines) — battle cards, objection handling
// Generates agency-facing sales enablement from lead enrichment data.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput } from "./scoring"
import type { ActionPlan } from "./recommend"

// ── Types ─────────────────────────────────────────────────────

export interface ObjectionResponse {
  objection: string
  response: string
  proof: string
  followUp: string
}

export interface BattleCard {
  businessName: string
  category: string
  categoryLabel: string
  scoreSummary: string
  top3Findings: string[]
  top3Objections: ObjectionResponse[]
  roiEstimate: { monthlyTraffic: number; conversionRate: number; ticketValue: number; monthlyRevenue: number }
  miniDeck: { slide: number; title: string; content: string }[]
  whatsappScript: string
}

// ── Category Objection Templates ──────────────────────────────

const OBJECTION_DB: Record<string, ObjectionResponse[]> = {
  dentist: [
    { objection: "Ja tenho dentista ha anos", response: "Entendo. Mas seu dentista atual esta cuidando do seu marketing digital tambem? 70% dos pacientes novos buscam no Google antes de escolher. Se voce nao aparece, esta perdendo pacientes para concorrentes que aparecem.", proof: "Dados do Google: 70% dos pacientes pesquisam online antes de agendar", followUp: "Posso te mostrar agora quantas pessoas buscam 'dentista' na sua regiao todo mes?" },
    { objection: "Tratamento dentario e caro", response: "Justamente por isso o marketing digital e essencial. Pacientes que pesquisam online estao dispostos a pagar mais — eles buscam qualidade, nao preco. Aparecer no Google atrai o paciente certo, nao o que so quer desconto.", proof: "Estudos mostram que leads de busca organica tem ticket 40% maior que leads de rede social", followUp: "Vamos calcular juntos quantos pacientes novos voce precisaria para pagar o investimento?" },
    { objection: "So vou quando doi", response: "Esse e exatamente o problema. O paciente que so vai quando doi nao e fiel — ele vai no primeiro que achar. O paciente que pesquisa e escolhe e fiel e paga mais. Marketing digital atrai o paciente fiel, nao o de emergencia.", proof: "Pacientes fieis gastam 5x mais ao longo da vida que pacientes de emergencia", followUp: "Quer ver o perfil dos pacientes que estao buscando dentista na sua regiao agora?" },
  ],
  restaurant: [
    { objection: "Ja conheco todos os restaurantes da regiao", response: "Mas os clientes novos nao conhecem. Quando um turista ou novo morador busca 'restaurante' no Google, quem aparece primeiro leva o cliente.", proof: "46% das buscas no Google tem intencao local", followUp: "Quer ver quantas pessoas buscam seu tipo de cozinha por mes na sua regiao?" },
    { objection: "Muito caro comer fora", response: "Nao estamos falando de preco — estamos falando de visibilidade. O cliente que decide onde comer pelo Google ja esta disposto a gastar. Voce so precisa estar la quando ele buscar.", proof: "Restaurantes com perfil GMB completo recebem 3x mais cliques", followUp: "Deixa eu te mostrar como seu concorrente esta aparecendo no Google." },
    { objection: "Cozinho em casa", response: "Voce cozinha, mas 80% dos brasileiros pedem delivery ou comem fora pelo menos 1x por semana. Seu cliente nao e quem cozinha — e quem busca conveniencia.", proof: "Mercado de delivery cresceu 30% ao ano no Brasil", followUp: "Quer ver o volume de busca por 'delivery' e 'restaurante' na sua regiao?" },
  ],
  gym: [
    { objection: "Nao tenho tempo", response: "Seu cliente tambem nao tem tempo — e por isso ele busca academia no Google. Ele quer achar a melhor opcao rapido. Se voce nao aparece, ele vai para o concorrente que aparece.", proof: "Google Maps e o app #1 para busca de academias", followUp: "Quer ver quantas pessoas buscam 'academia perto' na sua regiao?" },
    { objection: "Ja tenho equipamento em casa", response: "Mas 90% das pessoas que comecam em casa desistem em 3 meses. Seu cliente precisa de estrutura, comunidade e profissional. E ele busca isso no Google.", proof: "90% de abandono em treinos caseiros vs 60% de retencao em academias", followUp: "Vamos ver o perfil de quem busca academia no seu bairro?" },
    { objection: "Academia e cara", response: "O cliente que busca academia no Google nao esta procurando a mais barata — esta procurando a melhor para ele. Aparecer bem posicionado atrai o cliente que valoriza qualidade.", proof: "Academias com site profissional tem ticket 30% maior", followUp: "Deixa eu calcular quantos alunos novos voce precisa para pagar o marketing." },
  ],
}

// ── ROI Calculator ────────────────────────────────────────────

/** Estimate monthly organic revenue from SEO improvements. */
function estimateROI(input: ScoringInput): BattleCard["roiEstimate"] {
  // Conservative estimates for SMB Brazil
  const categoryVolumes: Record<string, number> = {
    dentist: 5000, restaurant: 15000, gym: 8000, beauty_salon: 6000,
    lawyer: 3000, accountant: 2000, medical_clinic: 7000, car_repair: 4000,
    psychologist: 2000, pet_store: 3000, pharmacy: 5000,
  }
  const monthlySearches = categoryVolumes[input.category?.toLowerCase().replace(/\s+/g, "_") ?? ""] || 3000
  const ctrTop3 = 0.15 // CTR for top 3 position
  const ctrTop10 = 0.05 // CTR for position 4-10
  const ctrNow = input.l2_onpage_score != null && input.l2_onpage_score >= 50 ? ctrTop10 : ctrTop3 * 0.3
  const monthlyTraffic = Math.round(monthlySearches * ctrNow)
  const conversionRate = 0.05 // 5% website visitors convert
  const ticketValue = input.category?.includes("dentist") ? 500 : input.category?.includes("medical") ? 300 :
    input.category?.includes("lawyer") ? 800 : input.category?.includes("restaurant") ? 50 : 150
  const monthlyRevenue = Math.round(monthlyTraffic * conversionRate * ticketValue)

  return { monthlyTraffic, conversionRate, ticketValue, monthlyRevenue }
}

// ── Generator ─────────────────────────────────────────────────

/** Generate sales battle card from lead enrichment + action plan. */
export function generateBattleCard(
  input: ScoringInput,
  actionPlan: ActionPlan,
): BattleCard | null {
  if (!input.title) return null

  const cat = input.category?.toLowerCase().replace(/\s+/g, "_") ?? ""
  const objections = OBJECTION_DB[cat] || [
    { objection: "Muito caro", response: `Investir em marketing digital para ${input.category} custa menos que 1 cliente por mes. Se voce ganhar 1 cliente novo com o marketing, ele ja pagou o investimento.`, proof: "ROI comprovado: 1 cliente cobre o custo mensal", followUp: "Quer ver quanto custa para comecar?" },
    { objection: "Nao sei se funciona", response: "Funciona porque seus clientes ja estao no Google buscando exatamente o que voce oferece. Voce so nao esta aparecendo para eles ainda.", proof: "Seus concorrentes que aparecem no Google estao captando esses clientes agora", followUp: "Vamos ver quem esta aparecendo no Google para sua categoria?" },
    { objection: "Vou pensar", response: "Enquanto voce pensa, seus concorrentes estao captando os clientes que buscariam por voce. Cada dia sem presenca digital = clientes indo para o concorrente.", proof: "A cada mes, milhares de pessoas buscam sua categoria no Google na sua regiao", followUp: "Posso te mandar um resumo do que encontramos? Assim voce avalia com calma." },
  ]

  const roi = estimateROI(input)
  const top3Findings = actionPlan.actions.slice(0, 3).map(a => a.title)
  const scoreSummary = `Score Composto: ${actionPlan.maturitySummary}`

  // WhatsApp script with real lead data
  const whatsappScript = [
    `Olá! Tudo bem? Me chamo [seu nome] e sou consultor de marketing digital.`,
    ``,
    `Fiz uma análise rápida da presença digital de ${input.title} e encontrei algumas oportunidades:`,
    ``,
    ...actionPlan.actions.slice(0, 3).map((a, i) => `${i + 1}. ${a.title} — ${a.description.substring(0, 80)}...`),
    ``,
    `Resumindo: ${input.title} está ${input.is_claimed === false ? "sem controle do próprio perfil no Google" : input.l2_onpage_score != null ? `com ${input.l2_onpage_score}/100 de saúde digital` : "com presença digital limitada"}.`,
    ``,
    `Se quiser, posso te mostrar esses dados em uma call rápida de 15 minutos. Sem compromisso.`,
    `O que acha?`,
  ].join("\n")

  const miniDeck = [
    { slide: 1, title: "Problema", content: `${input.title} está ${input.is_claimed === false ? "invisível" : "pouco visível"} no Google. ${input.rating_votes || 0} avaliações, ${input.total_photos || 0} fotos, site ${input.l2_onpage_score || "?"}/100.` },
    { slide: 2, title: "Oportunidade", content: `${(input.l2_word_count || 0) < 300 ? "Conteúdo insuficiente — Google ignora páginas com menos de 300 palavras." : "Base existe mas não está otimizada para busca local."} ${input.l2_has_analytics === false ? "Sem ferramentas de medição." : ""}` },
    { slide: 3, title: "Concorrência", content: `Outros ${input.category} na região ${"SP"} estão captando os clientes que buscam no Google. ${input.is_claimed === false ? "Eles têm perfil GMB controlado — você não." : "Você precisa de diferenciação."}` },
    { slide: 4, title: "Solução", content: `Plano de ação com ${actionPlan.actions.length} passos. Quick win: ${actionPlan.quickWin.title}. Investimento: a partir de R$47/mês.` },
    { slide: 5, title: "ROI", content: `Tráfego estimado: ${roi.monthlyTraffic} visitas/mês. Conversão: ${roi.monthlyTraffic * roi.conversionRate} clientes/mês. Receita: R$${roi.monthlyRevenue}/mês.` },
  ]

  return {
    businessName: input.title,
    category: input.category || "?",
    categoryLabel: cat,
    scoreSummary,
    top3Findings,
    top3Objections: objections.slice(0, 3),
    roiEstimate: roi,
    miniDeck,
    whatsappScript,
  }
}
