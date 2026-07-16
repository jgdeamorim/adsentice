// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Product Context Generator v0.4
// Skill: product-marketing (Corey Haines) — 12-section context document
// Foundation that feeds ALL recommendation modules.
// Pure composition from L0+L1+L2 data — zero new API calls.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput } from "./scoring"
import { ICP_CATEGORY_LABELS, detectDomainType, classifyCMSRisk } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface ProductContext {
  overview: { businessName: string; category: string; categoryLabel: string; address: string | null; city: string | null }
  audience: { primary: string; secondary: string; geography: string }
  personas: { buyerPersona: string; painPoints: string[]; goals: string[] }
  pains: { detectedPains: string[]; painSummary: string }
  competitors: { landscape: string; differentiators: string[] }
  differentiation: { strengths: string[]; weaknesses: string[] }
  objections: { top3: string[] }
  switching: { barriers: string[]; triggers: string[] }
  language: { keywords: string[]; phrases: string[]; tone: string }
  voice: { tone: string; style: string }
  proof: { socialProof: string[]; trustSignals: string[] }
  goals: { immediate: string[]; thisMonth: string[]; thisQuarter: string[] }
}

// ── Generator ───────────────────────────────────────────────

/** Category-specific audience profiles for Brazilian SMB. */
const CATEGORY_AUDIENCES: Record<string, { primary: string; secondary: string }> = {
  dentist: { primary: "Pacientes locais com necessidade de tratamento odontologico", secondary: "Pais de familia buscando dentista para os filhos" },
  orthodontist: { primary: "Adolescentes e adultos buscando correcao dental", secondary: "Pais de adolescentes com indicacao de aparelho" },
  medical_aesthetic_clinic: { primary: "Mulheres 25-55 anos interessadas em estetica facial/corporal", secondary: "Homens buscando tratamentos esteticos" },
  medical_clinic: { primary: "Pacientes locais buscando consultas e exames", secondary: "Idosos com necessidades medicas regulares" },
  restaurant: { primary: "Clientes locais buscando experiencias gastronomicas", secondary: "Turistas e visitantes da regiao" },
  gym: { primary: "Moradores locais interessados em fitness e saude", secondary: "Profissionais buscando horarios flexiveis" },
  lawyer: { primary: "Pessoas e empresas com necessidades juridicas", secondary: "Empreendedores buscando consultoria legal" },
  beauty_salon: { primary: "Mulheres 20-50 anos buscando servicos de beleza", secondary: "Noivas e eventos especiais" },
  accountant: { primary: "Empresarios e MEIs buscando servicos contabeis", secondary: "Profissionais liberais com declaracao de IR" },
  psychologist: { primary: "Pessoas buscando saude mental e bem-estar", secondary: "Casais e familias em terapia" },
}

/** Category-specific objection templates. */
const CATEGORY_OBJECTIONS: Record<string, string[]> = {
  dentist: ["Ja tenho dentista ha anos", "Tratamento dentario e muito caro", "So vou quando doi"],
  restaurant: ["Ja conheco todos os restaurantes da regiao", "Cozinho em casa", "Muito caro comer fora"],
  gym: ["Nao tenho tempo", "Ja tenho equipamento em casa", "Academia e cara e nao uso"],
  beauty_salon: ["Ja tenho minha cabeleireira de confianca", "So corto quando precisa", "Muito caro"],
  lawyer: ["Nao estou com problemas juridicos agora", "Advogado e caro", "Resolvo sozinho"],
  medical_clinic: ["So vou ao medico quando estou doente", "Demora muito atendimento", "Prefiro posto de saude"],
  accountant: ["Faco meu proprio IR", "Contador e caro", "Minha empresa e pequena demais"],
  car_repair: ["Meu mecanico de confianca resolve", "Mecanica e cara", "So levo quando quebra"],
}

/** Category-specific keyword phrases for copy. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  dentist: ["clinica odontologica", "dentista perto de mim", "implante dentario", "clareamento dental", "ortodontia"],
  restaurant: ["restaurante", "comida caseira", "melhor restaurante", "delivery", "almoco executivo"],
  gym: ["academia", "musculacao", "aulas de ginastica", "personal trainer", "avaliacao fisica"],
  beauty_salon: ["salao de beleza", "cabeleireiro", "manicure", "maquiagem profissional", "noivas"],
  lawyer: ["advogado", "consultoria juridica", "direito trabalhista", "defesa criminal", "contratos"],
  accountant: ["contador", "abertura de empresa", "declaracao IR", "MEI", "contabilidade"],
  medical_clinic: ["clinica medica", "consulta medica", "exames laboratoriais", "check-up", "especialista"],
}

/**
 * Generate complete 12-section Product Context from L0+L1+L2 data.
 * Feeds: recommend.ts, battle-card.ts, marketing-plan.ts, tool-suggester.ts
 */
export function generateProductContext(input: ScoringInput): ProductContext {
  const cat = input.category?.toLowerCase().replace(/\s+/g, "_") ?? ""
  const catLabel = ICP_CATEGORY_LABELS[cat] || input.category || "Negocio Local"
  const domainType = detectDomainType(input.website)
  const cmsRisk = classifyCMSRisk(input.l2_cms, input.website)
  const audience = CATEGORY_AUDIENCES[cat] || { primary: "Clientes locais buscando servicos na regiao", secondary: "Moradores do bairro e regiao metropolitana" }
  const hasWebsite = !!input.website && domainType === "proprio"

  // ── Overview ──
  const overview = {
    businessName: input.title || "Negocio Local",
    category: cat,
    categoryLabel: catLabel,
    address: input.address,
    city: "Sao Paulo",
  }

  // ── Audience ──
  const audienceSec = {
    primary: audience.primary,
    secondary: audience.secondary,
    geography: input.address ? `Regiao de ${input.address || "Sao Paulo"}` : "Regiao metropolitana",
  }

  // ── Personas ──
  const personas = {
    buyerPersona: `Dono(a) de ${catLabel} que quer atrair mais clientes pela internet`,
    painPoints: ["Falta de visibilidade no Google", "Concorrencia aparecendo primeiro nas buscas", "Nao sabe como usar marketing digital"],
    goals: ["Aparecer no topo do Google para buscas locais", "Atrair mais clientes sem gastar com anuncios", "Ter uma presenca digital profissional"],
  }

  // ── Pains ──
  const detectedPains: string[] = []

  if (!hasWebsite) detectedPains.push("Sem site profissional — perde clientes que buscam online")
  if (input.is_claimed === false) detectedPains.push("Nao controla o proprio perfil do Google Meu Negocio")
  if (input.rating_value != null && input.rating_value <= 3.5) detectedPains.push("Reputacao online prejudicada — avaliacoes baixas afastam clientes")
  if (input.l2_word_count != null && input.l2_word_count < 300) detectedPains.push("Site com conteudo insuficiente — Google nao ranqueia paginas vazias")
  if (input.l2_has_analytics === false) detectedPains.push("Nao mede resultados — decisoes de marketing no escuro")
  const painSummary = detectedPains.length >= 3 ? `Multiplos problemas detectados: ${detectedPains.slice(0, 3).join("; ")}.` : "Problemas pontuais de presenca digital.";

  const pains = { detectedPains, painSummary }

  // ── Competitors ──
  const competitors = {
    landscape: `Mercado de ${catLabel} na regiao de ${"SP"}: alta competicao local. Destaque-se com Google Meu Negocio otimizado e site profissional.`,
    differentiators: hasWebsite ? ["Site profissional proprio", "Presenca no Google Meu Negocio", input.phone ? "Contato direto por telefone/WhatsApp" : "Atendimento digital"] : ["Presenca no Google Meu Negocio", input.phone ? "Contato direto" : "Atendimento local"],
  }

  // ── Differentiation ──
  const differentiation = {
    strengths: [
      input.rating_value != null && input.rating_value >= 4.0 ? `Excelente reputacao — ${input.rating_value} estrelas` : null,
      input.is_claimed === true ? "Perfil GMB verificado e controlado" : null,
      hasWebsite ? "Site profissional com dominio proprio" : null,
      input.phone ? "Canal de contato direto disponivel" : null,
      input.total_photos != null && input.total_photos >= 15 ? `Perfil visual rico — ${input.total_photos} fotos` : null,
    ].filter(Boolean) as string[],
    weaknesses: [
      !hasWebsite ? "Sem site profissional — perdendo clientes" : null,
      input.is_claimed === false ? "Perfil GMB nao reivindicado — risco de informacoes erradas" : null,
      input.rating_value != null && input.rating_value <= 3.5 ? "Reputacao abaixo da media — necessario melhorar avaliacoes" : null,
      input.l2_has_analytics === false ? "Sem ferramentas de medicao de resultados" : null,
      input.l2_cms ? `CMS ${cmsRisk.label}` : null,
    ].filter(Boolean) as string[],
  }

  // ── Objections ──
  const objections = {
    top3: CATEGORY_OBJECTIONS[cat] || ["Muito caro", "Nao preciso agora", "Ja tenho quem faca"],
  }

  // ── Switching ──
  const switching = {
    barriers: ["Inercia — 'sempre fiz assim'", "Medo de mudanca", "Custo percebido de troca"],
    triggers: ["Resultado insatisfatorio atual", "Indicacao de amigo/familia", "Achou no Google e gostou do site/perfil"],
  }

  // ── Language ──
  const language = {
    keywords: CATEGORY_KEYWORDS[cat] || ["servico local", "perto de mim", "profissional", "qualidade", "confianca"],
    phrases: ["Agende sua consulta", "Orcamento gratuito", "Atendimento personalizado", "Mais de X anos de experiencia"],
    tone: "Profissional e acolhedor — a pessoa busca confianca e proximidade",
  }

  // ── Voice ──
  const voice = {
    tone: "Acolhedor e confiante — sem ser arrogante",
    style: "Linguagem simples e direta. Textos curtos. CTAs claros.",
  }

  // ── Proof ──
  const proof = {
    socialProof: [
      input.rating_value != null && input.rating_votes != null ? `${input.rating_value} estrelas em ${input.rating_votes} avaliacoes no Google` : null,
      input.is_claimed === true ? "Negocio verificado pelo Google" : null,
      input.total_photos != null && input.total_photos >= 15 ? "Galeria de fotos profissionais" : null,
    ].filter(Boolean) as string[],
    trustSignals: [
      input.website?.startsWith("https") ? "Site seguro (HTTPS)" : null,
      input.l2_cms ? `Plataforma: ${input.l2_cms}` : null,
    ].filter(Boolean) as string[],
  }

  // ── Goals ──
  const goals = {
    immediate: ["Corrigir problemas tecnicos do site", "Reivindicar/otimizar perfil GMB", "Instalar Google Analytics"],
    thisMonth: ["Publicar 4+ artigos no blog", "Responder avaliacoes pendentes", "Criar schema JSON-LD"],
    thisQuarter: ["Alcancar 10+ avaliacoes 5 estrelas", "Aparecer no top 3 do Google para a categoria", "Gerar primeiros leads organicos"],
  }

  return { overview, audience: audienceSec, personas, pains, competitors, differentiation, objections, switching, language, voice, proof, goals }
}
