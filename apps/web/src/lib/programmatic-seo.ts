// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Programmatic SEO Playbook Generator v0.4
// Skill: programmatic-seo (Corey Haines) — Locations playbook
// Generates [service] in [city] landing page templates.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface PSEOPlaybook {
  category: string
  categoryLabel: string
  city: string
  urlPattern: string
  estimatedPages: number
  templates: {
    serviceInCity: { title: string; metaDescription: string; h1: string; contentOutline: string[] }
    serviceInNeighborhood: { title: string; metaDescription: string; h1: string; contentOutline: string[] }
  }
  keywords: string[]
  estimatedSearchVolume: number
  competitorInsight: string
}

// ── SP Neighborhoods by Zone ──────────────────────────────────

const SP_NEIGHBORHOODS: Record<string, string[]> = {
  "zona-sul": ["Moema", "Vila Mariana", "Itaim Bibi", "Campo Belo", "Brooklin", "Saude", "Jabaquara", "Santo Amaro"],
  "zona-oeste": ["Pinheiros", "Vila Madalena", "Perdizes", "Lapa", "Butanta", "Jaguare", "Morumbi"],
  "zona-norte": ["Santana", "Tucuruvi", "Vila Guilherme", "Casa Verde", "Limao", "Freguesia do O"],
  "zona-leste": ["Tatuape", "Mooca", "Vila Prudente", "Penha", "Sao Miguel Paulista", "Itaquera"],
  "centro": ["Bela Vista", "Consolacao", "Republica", "Santa Cecilia", "Liberdade", "Bom Retiro"],
}

// ── Seed keywords by category ─────────────────────────────────

const CATEGORY_SEEDS: Record<string, { primary: string; variations: string[]; volume: number }> = {
  dentist: { primary: "dentista", variations: ["clinica odontologica", "implante dentario", "clareamento dental", "ortodontia", "aparelho dental", "tratamento de canal", "lentes de contato dental"], volume: 5000 },
  orthodontist: { primary: "ortodontista", variations: ["aparelho ortodontico", "aparelho invisivel", "invisalign", "manutencao de aparelho"], volume: 2000 },
  restaurant: { primary: "restaurante", variations: ["comida caseira", "almoco executivo", "jantar romantico", "rodizio", "self-service"], volume: 15000 },
  gym: { primary: "academia", variations: ["musculacao", "aulas de ginastica", "personal trainer", "crossfit", "natacao"], volume: 8000 },
  beauty_salon: { primary: "salao de beleza", variations: ["cabeleireiro", "manicure", "maquiagem", "noivas", "alisamento"], volume: 6000 },
  lawyer: { primary: "advogado", variations: ["advogado trabalhista", "advogado civil", "advogado consumidor", "advogado empresarial"], volume: 3000 },
  medical_clinic: { primary: "clinica medica", variations: ["consulta medica", "exames", "check-up", "clinico geral", "especialista"], volume: 7000 },
  accountant: { primary: "contador", variations: ["abertura de empresa", "declaracao IR", "MEI", "contabilidade", "folha de pagamento"], volume: 2000 },
  car_repair: { primary: "mecanico", variations: ["oficina mecanica", "revisao", "troca de oleo", "alinhamento", "suspensao"], volume: 4000 },
  psychologist: { primary: "psicologo", variations: ["terapia", "psicanalise", "terapia de casal", "terapia cognitiva", "psicologo infantil"], volume: 2000 },
  medical_aesthetic_clinic: { primary: "clinica estetica", variations: ["harmonizacao facial", "botox", "preenchimento", "peeling", "bioestimulador"], volume: 3000 },
}

// ── Generator ─────────────────────────────────────────────────

/** Generate Programmatic SEO playbook from category + city. */
export function generateProgrammaticSEOPlaybook(
  input: ScoringInput,
): PSEOPlaybook | null {
  const cat = input.category?.toLowerCase().replace(/\s+/g, "_") ?? ""
  const catLabel = input.category || cat
  const city = "Sao Paulo"
  const seeds = CATEGORY_SEEDS[cat]

  if (!seeds) return null

  const isSP = city.toLowerCase().includes("sao paulo") || city.toLowerCase().includes("sp")
  const neighborhoods = isSP ? Object.values(SP_NEIGHBORHOODS).flat() : [city]
  const estimatedPages = neighborhoods.length * (1 + seeds.variations.length)

  // ── Templates ──
  const serviceInCity = {
    title: `${seeds.primary} em ${city} — ${catLabel} [Ano]`,
    metaDescription: `${catLabel} em ${city}. ${seeds.primary} com profissionais experientes. Agende sua consulta. Atendimento em ${city} e regiao.`,
    h1: `${catLabel} em ${city}`,
    contentOutline: [
      `Por que escolher ${catLabel} em ${city}`,
      `Nossos servicos de ${seeds.variations.slice(0, 3).join(", ")}`,
      `Como agendar em ${city}`,
      `Perguntas frequentes sobre ${catLabel}`,
      `Depoimentos de clientes em ${city}`,
    ],
  }

  const sampleHood = neighborhoods[0] || city

  const serviceInNeighborhood = {
    title: `${seeds.primary} ${sampleHood} — ${catLabel} no ${sampleHood}`,
    metaDescription: `${catLabel} no bairro ${sampleHood}, ${city}. ${seeds.primary} perto de voce. Agende hoje mesmo.`,
    h1: `${catLabel} no ${sampleHood}, ${city}`,
    contentOutline: [
      `${catLabel} no ${sampleHood} — como chegar`,
      `Servicos oferecidos no ${sampleHood}`,
      `Horario de funcionamento`,
      `Formas de pagamento`,
      `Agende sua visita`,
    ],
  }

  return {
    category: cat,
    categoryLabel: catLabel,
    city,
    urlPattern: `/${cat.replace(/_/g, "-")}/${city.toLowerCase().replace(/\s+/g, "-")}/`,
    estimatedPages,
    templates: { serviceInCity, serviceInNeighborhood },
    keywords: [seeds.primary, ...seeds.variations.slice(0, 5)],
    estimatedSearchVolume: seeds.volume,
    competitorInsight: `A maioria dos ${catLabel} em ${city} nao tem paginas especificas por bairro — esta e sua vantagem competitiva. Domine buscas como "${seeds.primary} ${sampleHood}" antes dos concorrentes.`,
  }
}
