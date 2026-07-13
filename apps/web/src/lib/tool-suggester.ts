// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Free Tool Suggester v0.4
// Skill: free-tools (Corey Haines) — 6 tool types × 29 categories = 174 suggestions
// Deterministic mapping. Feeds into ActionPlan generator.
// ══════════════════════════════════════════════════════════════════

import "server-only"

// ── Types ─────────────────────────────────────────────────────

export type ToolType = "calculator" | "grader" | "quiz" | "generator" | "checker" | "finder"

export interface ToolSuggestion {
  name: string
  toolType: ToolType
  category: string
  description: string
  keywords: string[]
  effort: "horas" | "dias"
  seoPattern: string
}

// ── Mapping: Category → Tool Type → Suggestion ────────────────

const TOOL_MAP: Record<string, ToolSuggestion> = {
  // ── Saude ──
  dentist_calculator: { name: "Calculadora de Custo de Tratamento", toolType: "calculator", category: "dentist", description: "Ferramenta interativa que estima o custo de tratamentos odontologicos com base no procedimento e complexidade.", keywords: ["custo implante dentario", "preco aparelho dental", "quanto custa tratamento de canal"], effort: "dias", seoPattern: "calculadora-de-custo-de-tratamento-dentario" },
  dentist_quiz: { name: "Teste: Qual Tratamento Dental Voce Precisa?", toolType: "quiz", category: "dentist", description: "Quiz interativo que recomenda o tratamento odontologico baseado nos sintomas e objetivos do paciente.", keywords: ["qual tratamento dental preciso", "preciso de implante ou aparelho", "teste saude bucal"], effort: "dias", seoPattern: "teste-tratamento-dental" },
  orthodontist_calculator: { name: "Calculadora de Tempo de Aparelho", toolType: "calculator", category: "orthodontist", description: "Estima o tempo necessario de tratamento ortodontico baseado na idade e tipo de correcao.", keywords: ["tempo aparelho dental", "quanto tempo ortodontia", "duracao aparelho"], effort: "horas", seoPattern: "calculadora-tempo-aparelho" },
  medical_clinic_checker: { name: "Verificador de Sintomas", toolType: "checker", category: "medical_clinic", description: "Checklist interativa de sintomas que sugere a especialidade medica adequada para consulta.", keywords: ["qual medico procurar", "sintomas e especialidades", "checklist saude"], effort: "dias", seoPattern: "verificador-de-sintomas" },
  medical_aesthetic_calculator: { name: "Calculadora de Investimento Estetico", toolType: "calculator", category: "medical_aesthetic_clinic", description: "Estima o investimento em tratamentos esteticos baseado no procedimento e numero de sessoes.", keywords: ["custo botox", "preco harmonizacao facial", "quanto custa preenchimento"], effort: "horas", seoPattern: "calculadora-investimento-estetico" },

  // ── Beleza ──
  beauty_salon_quiz: { name: "Teste: Qual Corte de Cabelo Combina com Voce?", toolType: "quiz", category: "beauty_salon", description: "Quiz que recomenda cortes e estilos baseados no formato do rosto, tipo de cabelo e estilo de vida.", keywords: ["corte de cabelo ideal", "qual penteado combina comigo", "teste estilo cabelo"], effort: "horas", seoPattern: "teste-corte-cabelo" },
  gym_grader: { name: "Avaliador de Nivel Fitness", toolType: "grader", category: "gym", description: "Avaliacao rapida do nivel de condicionamento fisico baseada em idade, peso, frequencia de exercicios e objetivos.", keywords: ["nivel fitness", "qual meu condicionamento", "teste condicionamento fisico"], effort: "horas", seoPattern: "avaliador-nivel-fitness" },

  // ── Servicos Profissionais ──
  lawyer_quiz: { name: "Teste: Qual Area do Direito Voce Precisa?", toolType: "quiz", category: "lawyer", description: "Quiz que identifica a area juridica adequada baseada na situacao do usuario (trabalhista, familia, consumidor, etc).", keywords: ["qual advogado contratar", "tipo de advogado", "teste juridico"], effort: "horas", seoPattern: "teste-area-direito" },
  accountant_calculator: { name: "Calculadora de Imposto MEI", toolType: "calculator", category: "accountant", description: "Calcula o imposto mensal do MEI e compara com outros regimes tributarios (Simples Nacional, Lucro Presumido).", keywords: ["calcular imposto mei", "quanto paga mei", "comparar regime tributario"], effort: "horas", seoPattern: "calculadora-imposto-mei" },

  // ── Alimentacao ──
  restaurant_finder: { name: "Encontre o Restaurante Ideal", toolType: "finder", category: "restaurant", description: "Quiz que recomenda restaurantes baseado em ocasiao, orcamento, tipo de cozinha e localizacao.", keywords: ["restaurante ideal", "onde comer", "melhor restaurante"], effort: "dias", seoPattern: "encontre-restaurante-ideal" },

  // ── Comercio ──
  car_repair_checker: { name: "Diagnostico Rapido de Problemas no Carro", toolType: "checker", category: "car_repair", description: "Checklist interativa que identifica possiveis problemas mecanicos baseado em sintomas (barulho, luz no painel, vibracao).", keywords: ["diagnostico carro", "problema mecanico", "barulho carro"], effort: "horas", seoPattern: "diagnostico-problemas-carro" },
  pet_store_finder: { name: "Encontre o Pet Shop Ideal", toolType: "finder", category: "pet_store", description: "Encontra servicos pet baseado no tipo de animal, servico desejado e localizacao.", keywords: ["pet shop", "banho e tosa", "veterinario perto"], effort: "horas", seoPattern: "encontre-pet-shop" },

  // ── Comercio Local ──
  electrician_calculator: { name: "Calculadora de Custo de Servico Eletrico", toolType: "calculator", category: "electrician", description: "Estima o custo de servicos eletricos residenciais baseado no tipo de servico e complexidade.", keywords: ["custo eletricista", "quanto custa instalacao eletrica", "preco reparo eletrico"], effort: "horas", seoPattern: "calculadora-custo-eletrico" },
  cleaning_calculator: { name: "Calculadora de Custo de Limpeza", toolType: "calculator", category: "cleaning_service", description: "Calcula o custo de servicos de limpeza baseado no tamanho do imovel e frequencia.", keywords: ["custo limpeza", "preco faxina", "quanto cobrar limpeza"], effort: "horas", seoPattern: "calculadora-custo-limpeza" },

  // ── Educacao ──
  school_finder: { name: "Encontre a Escola Ideal", toolType: "finder", category: "school", description: "Quiz que recomenda escolas baseado em faixa etaria, metodologia, localizacao e orcamento.", keywords: ["escola ideal", "qual escola escolher", "melhor escola"], effort: "dias", seoPattern: "encontre-escola-ideal" },

  // ── Psicologia / Saude Mental ──
  psychologist_quiz: { name: "Teste: Qual Tipo de Terapia e Ideal para Voce?", toolType: "quiz", category: "psychologist", description: "Quiz que sugere abordagens terapeuticas baseadas nos objetivos e preferencias pessoais do usuario.", keywords: ["qual terapia fazer", "tipo de psicologo", "teste saude mental"], effort: "horas", seoPattern: "teste-tipo-terapia" },
}

/** Suggest a free tool based on lead category. */
export function suggestTool(category: string | null | undefined): ToolSuggestion | null {
  if (!category) return null
  const cat = category.toLowerCase().replace(/\s+/g, "_")

  // Try calculator first (most SEO value), then quiz, then checker
  const calc = TOOL_MAP[`${cat}_calculator`]
  if (calc) return calc

  const quiz = TOOL_MAP[`${cat}_quiz`]
  if (quiz) return quiz

  const finder = TOOL_MAP[`${cat}_finder`]
  if (finder) return finder

  const checker = TOOL_MAP[`${cat}_checker`]
  if (checker) return checker

  const grader = TOOL_MAP[`${cat}_grader`]
  if (grader) return grader

  // Generic fallback based on category segment
  return {
    name: `Calculadora de Orcamento para ${category}`,
    toolType: "calculator",
    category: cat,
    description: `Ferramenta que calcula o custo estimado dos servicos de ${category} baseado nas necessidades do cliente.`,
    keywords: [`custo ${category}`, `preco ${category}`, `orcamento ${category}`],
    effort: "horas",
    seoPattern: `calculadora-orcamento-${cat.replace(/_/g, "-")}`,
  }
}
