// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Target Scorer — cérebro do Auto-Pilot
// ADR-0023 Layer 2 · medido=verdade · 2026-07-15
//
// Decide QUAL gap priorizar baseado em critérios REAIS de marketing:
// - Pain Criteria v1.2 (Fit×0.40 + Engagement×0.35 + Intent×0.25)
// - Schwartz awareness (quanto mais unaware = mais oportunidade)
// - BOA (fixability × potential × value-fit)
// - Ticket potencial por categoria
// - Densidade competitiva (menos = melhor)
// - Cobertura atual (não mapeado = prioridade)
//
// Fontes: scoring.ts, market-intel.ts, pipeline.ts, coverage.ts
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { getAdminClient } from "./supabase-admin"
import { normalizeCategory } from "./market-intel"

// ── Types ──

export interface MunicipalityTarget {
  city: string
  municipality: string
  category: string
  categoryLabel: string
  score: number           // 0-100 composto
  breakdown: {
    painScore: number       // % unaware + problem aware naquela categoria×cidade
    ticketScore: number     // ticket relativo (0-100)
    densityScore: number    // inverso da densidade (menos concorrência = mais score)
    fixabilityScore: number // facilidade de resolver (problemas simples = alto)
    coverageScore: number   // bônus por NÃO estar mapeado
  }
  estimatedLeads: number  // quantos leads esperados numa busca de 15km
  suggestedRadius: number
  avgTicket: number
  action: string          // "Mapear distrito" | "Reforçar cobertura" | "Alta prioridade"
  strategy: string        // insight de marketing (ex: "Alta dor + ticket alto + zero concorrência")
}

export interface AutoDiscoveryQueue {
  targets: MunicipalityTarget[]
  meta: {
    totalGaps: number
    priorityTargets: number
    estimatedCost: number
    estimatedMRR: number
  }
}

// ── Tickets por categoria (R$/mês) ──

const TICKETS: Record<string, number> = {
  dentist: 500, orthodontist: 800, medical_aesthetic_clinic: 700,
  medical_clinic: 300, veterinarian: 200, psychologist: 200,
  physical_therapist: 180, ophthalmologist: 350, cardiologist: 400,
  beauty_salon: 80, barber_shop: 45, gym: 120,
  lawyer: 800, accountant: 300, architect: 1500, interior_designer: 1200,
  real_estate_agency: 3000,
  restaurant: 50, pet_store: 80, car_repair: 400, pharmacy: 30,
  electrician: 150, plumber: 150, cleaning_service: 200,
  school: 800, driving_school: 250, hotel: 200,
}

// ── Municípios das RMs (fallback hardcoded — primário: Supabase district_registry) ──

const OFFICIAL_MUNICIPALITIES: Record<string, string[]> = {
  "São Paulo": ["São Paulo", "Osasco", "Guarulhos", "São Bernardo do Campo", "Santo André", "Barueri", "Taboão da Serra", "Cotia", "Itaquaquecetuba", "Suzano", "Mogi das Cruzes"],
  "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu", "São Gonçalo", "Belford Roxo", "São João de Meriti", "Nilópolis", "Mesquita"],
  "Belo Horizonte": ["Belo Horizonte", "Contagem", "Betim", "Nova Lima", "Santa Luzia", "Ribeirão das Neves"],
  "Curitiba": ["Curitiba", "São José dos Pinhais", "Colombo", "Araucária", "Pinhais"],
}

async function getMunicipalities(city: string): Promise<string[]> {
  // 1 — Try Supabase district_registry (populated by IBGE RM sync)
  try {
    const supabase = getAdminClient()

    const { data } = await supabase
      .from("district_registry")
      .select("district")
      .ilike("city", `%${city}%`)
      .limit(200)

    if (data?.length) return data.map((r: any) => r.district)
  } catch (e: any) { /* fallback */ }

  // 2 — Fallback: hardcoded (minimal set)
  for (const [key, municipalities] of Object.entries(OFFICIAL_MUNICIPALITIES)) {
    if (city.includes(key)) return municipalities
  }

  
return []
}

const CATEGORY_LABELS: Record<string, string> = {
  dentist: "🦷 Dentista", medical_aesthetic_clinic: "💉 Clínica Estética",
  medical_clinic: "🏥 Clínica Médica", beauty_salon: "💇 Salão de Beleza",
  restaurant: "🍽️ Restaurante", gym: "🏋️ Academia", lawyer: "⚖️ Advogado",
  psychologist: "🧠 Psicólogo", veterinarian: "🐾 Veterinário",
  accountant: "📊 Contador", barber_shop: "💈 Barbearia",
}

// ── Core: Score a district for a category ──

export async function scoreMunicipalityTarget(
  category: string,
  city: string,
  municipality: string
): Promise<MunicipalityTarget | null> {
  try {
    const supabase = getAdminClient()
    const slug = normalizeCategory(category)
    const ticket = TICKETS[slug] || 200

    // 1 — Schwartz distribution na cidade para essa categoria
    const { data: cityData } = await supabase
      .from("discovery_listings")
      .select("schwartz_level")
      .ilike("city", `%${city}%`)
      .limit(1000)

    const cityListings = cityData || []
    const total = cityListings.length || 1
    const s1 = cityListings.filter((r: any) => r.schwartz_level === 1).length  // Unaware
    const s2 = cityListings.filter((r: any) => r.schwartz_level === 2).length  // Problem Aware

    // Pain Score: % de leads com alta dor (unaware + problem aware)
    const painPct = Math.round(((s1 + s2) / total) * 100)
    const painScore = Math.min(100, painPct) // 0-100

    // 2 — Ticket Score (normalizado 0-100)
    const ticketScore = Math.min(100, Math.round((ticket / 1500) * 100))

    // 3 — Density Score: inverso da densidade de listings
    const { data: districtData } = await supabase
      .from("discovery_listings")
      .select("place_id")
      .ilike("district", `%${municipality}%`)
      .limit(500)

    const districtCount = districtData?.length || 0


    // Menos listings = menos concorrência = melhor score
    const densityScore = districtCount === 0 ? 100
      : districtCount < 5 ? 80
      : districtCount < 15 ? 50
      : districtCount < 30 ? 25
      : 10

    // 4 — Fixability Score: baseado nos sinais mais comuns
    // Sinais simples (E4 não reivindicado, F3 sem website) = fácil de resolver
    // Sinais complexos (W2 CWV ruins, W9 backlink gap) = difícil
    const { data: signalsData } = await supabase
      .from("discovery_listings")
      .select("signals_detected")
      .not("signals_detected", "is", null)
      .limit(300)

    let easyFixCount = 0; let hardFixCount = 0

    for (const r of (signalsData || [])) {
      const signals: string[] = r.signals_detected || []

      for (const s of signals) {
        const prefix = s.split(":")[0]

        if (["E4", "F3", "F4", "F5", "I1", "E1", "W1"].includes(prefix)) easyFixCount++
        if (["W2", "W3", "W9", "C1", "C3", "S1"].includes(prefix)) hardFixCount++
      }
    }

    const totalSignals = easyFixCount + hardFixCount || 1
    const fixabilityScore = Math.round((easyFixCount / totalSignals) * 100)

    // 5 — Coverage Score: bônus para distritos NUNCA mapeados
    const coverageScore = districtCount === 0 ? 100
      : districtCount < 3 ? 70
      : districtCount < 10 ? 30
      : 0

    // ── Composite Score ──
    const composite = Math.round(
      painScore * 0.30 +
      ticketScore * 0.25 +
      densityScore * 0.20 +
      fixabilityScore * 0.10 +
      coverageScore * 0.15
    )

    // ── Strategy ──
    const tags: string[] = []

    if (painScore > 60) tags.push("alta dor")
    if (ticket > 500) tags.push("ticket alto")
    if (densityScore > 70) tags.push("baixa concorrência")
    if (coverageScore > 70) tags.push("nunca mapeado")
    if (fixabilityScore > 60) tags.push("quick win")

    const action = composite >= 80 ? "🔥 Alta prioridade"
      : composite >= 60 ? "⭐ Mapear distrito"
      : composite >= 40 ? "📋 Reforçar cobertura"
      : "👀 Baixa prioridade"

    return {
      city,
      municipality,
      category: slug,
      categoryLabel: CATEGORY_LABELS[slug] || category,
      score: composite,
      breakdown: {
        painScore,
        ticketScore,
        densityScore,
        fixabilityScore,
        coverageScore,
      },
      estimatedLeads: Math.max(10, Math.round(districtCount * 1.5)),
      suggestedRadius: city.includes("São Paulo") ? 10 : 8,
      avgTicket: ticket,
      action,
      strategy: `${tags.slice(0, 3).join(" + ")} → ${action}`,
    }
  } catch (e: any) {
    console.error("[target-scorer]", e.message)
    
return null
  }
}

// ── Build full queue for a category × city ──

export async function buildDiscoveryQueue(
  category: string,
  city: string
): Promise<AutoDiscoveryQueue> {
  const districts = await getMunicipalities(city)
  const slug = normalizeCategory(category)

  // Get already-mapped districts
  const supabase = getAdminClient()

  const { data: mapped } = await supabase
    .from("discovery_listings")
    .select("district")
    .not("municipality", "is", null)
    .ilike("city", `%${city}%`)
    .limit(3000)

  const mappedSet = new Set((mapped || []).map((r: any) =>
    (r.district || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")
  ))

  const gaps = districts.filter(d =>
    !mappedSet.has(d.toLowerCase().normalize("NFD").replace(/[^a-z]/g, ""))
  )

  // Score each gap
  const targets: MunicipalityTarget[] = []

  for (const district of gaps.slice(0, 12)) {
    const t = await scoreMunicipalityTarget(category, city, district)

    if (t) targets.push(t)
  }

  targets.sort((a, b) => b.score - a.score)

  const totalCost = targets.length * 0.015  // ~$0.015 por busca L0

  const estimatedMRR = targets.slice(0, 5).reduce((sum, t) =>
    sum + (TICKETS[slug] || 200) * Math.min(5, Math.round(t.estimatedLeads * 0.05)),
  0)

  return {
    targets,
    meta: {
      totalGaps: gaps.length,
      priorityTargets: targets.filter(t => t.score >= 60).length,
      estimatedCost: Math.round(totalCost * 100) / 100,
      estimatedMRR,
    },
  }
}
