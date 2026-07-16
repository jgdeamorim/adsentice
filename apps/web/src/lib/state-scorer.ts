// ══════════════════════════════════════════════════════════════════
// ADSENTICE · State Scorer — Auto-Pilot State/City Selector
// ADR-0023 Layer 2 · medido=verdade · 2026-07-16
//
// Ranqueia estados brasileiros por potencial de prospecção:
//   Market Size (IBGE CEMPRE 2024) × Gap % × Ticket × Renda
//
// Decide QUAL estado/cidade prospectar PRIMEIRO — sem input manual.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { getAdminClient } from "./supabase-admin"
import { normalizeCategory } from "./market-intel"

// ── Types ──

export interface StateScore {
  uf: string
  stateName: string
  capital: string
  capitalLat: number
  capitalLng: number
  score: number
  breakdown: {
    marketSizeScore: number   // IBGE: quantos negócios nesse estado?
    gapScore: number          // % NÃO mapeado (quanto maior, melhor)
    ticketScore: number       // Ticket da categoria × renda média do estado
    densityScore: number      // Densidade SMB/km²
  }
  totalBusinesses: number     // Estimativa IBGE para essa categoria
  mappedBusinesses: number    // Quantos já mapeamos (Supabase)
  coveragePct: number         // 0-100%
  suggestedCity: string       // Melhor cidade pra começar
  suggestedRadius: number
  strategy: string
}

export interface StateRanking {
  category: string
  categoryLabel: string
  states: StateScore[]
  topPick: StateScore
  meta: {
    totalBRBusinesses: number
    totalMapped: number
    totalCoveragePct: number
    bestOpportunity: string
  }
}

// ── IBGE CEMPRE 2024: Empresas ativas por setor × UF (estimativas) ──
// Fonte primária: Supabase (ibge_market_size) — migration 008
// Fallback: hardcoded (dentist, aesthetic, _default para as demais)

const IBGE_SMB_BY_STATE: Record<string, Record<string, number>> = {
  dentist: {
    SP: 42000, RJ: 18000, MG: 16000, RS: 12000, PR: 11000, BA: 9000,
    SC: 6500, GO: 5800, PE: 5500, CE: 5200, DF: 4800, ES: 3800,
    PA: 3200, MT: 2800, MS: 2400, MA: 2200, PB: 1800, RN: 1600,
    AL: 1100, SE: 900, PI: 800, AM: 1500, RO: 700, TO: 500,
    AP: 250, AC: 200, RR: 150,
  },
  psychologist: {
    SP: 58000, RJ: 22000, MG: 19000, RS: 15000, PR: 13000, BA: 10000,
    SC: 8000, GO: 7000, PE: 6500, CE: 6000, DF: 5500, ES: 4500,
    PA: 3500, MT: 3000, MS: 2500, MA: 2000, AM: 1800, PB: 2200,
    RN: 1800, AL: 1200, SE: 1000, PI: 900, RO: 700, TO: 500,
    AP: 250, AC: 200, RR: 150,
  },
  medical_aesthetic_clinic: {
    SP: 18000, RJ: 7500, MG: 6500, RS: 5000, PR: 4500, BA: 3800,
    SC: 2800, GO: 2500, PE: 2300, CE: 2200, DF: 3500, ES: 1600,
    PA: 1200, MT: 1100, MS: 1000, MA: 900, PB: 750, RN: 700,
    AL: 500, SE: 400, PI: 350, AM: 800, RO: 350, TO: 250,
    AP: 120, AC: 100, RR: 80,
  },
  // Fallback genérico para categorias sem dados específicos
  _default: {
    SP: 35000, RJ: 15000, MG: 13000, RS: 10000, PR: 9000, BA: 7500,
    SC: 5500, GO: 4800, PE: 4500, CE: 4200, DF: 4000, ES: 3200,
    PA: 2600, MT: 2300, MS: 2000, MA: 1800, PB: 1500, RN: 1300,
    AL: 900, SE: 750, PI: 650, AM: 1200, RO: 600, TO: 400,
    AP: 200, AC: 160, RR: 120,
  },
}

// Renda média domiciliar por UF (IBGE PNAD 2024)
const RENDA_MEDIA_UF: Record<string, number> = {
  DF: 2900, SP: 2300, RJ: 2000, SC: 2100, RS: 2100, PR: 1900,
  MG: 1500, ES: 1600, GO: 1400, MS: 1500, MT: 1400,
  PE: 1000, CE: 1000, BA: 1000, PA: 900, AM: 900,
  MA: 700, PI: 700, PB: 800, RN: 900, AL: 700, SE: 900,
  RO: 1000, TO: 900, AC: 800, AP: 800, RR: 900,
}

// Capitais brasileiras (lat, lng)
const STATE_CAPITALS: Record<string, { name: string; lat: number; lng: number }> = {
  SP: { name: "São Paulo", lat: -23.55, lng: -46.63 },
  RJ: { name: "Rio de Janeiro", lat: -22.91, lng: -43.17 },
  MG: { name: "Belo Horizonte", lat: -19.92, lng: -43.93 },
  RS: { name: "Porto Alegre", lat: -30.03, lng: -51.22 },
  PR: { name: "Curitiba", lat: -25.43, lng: -49.27 },
  BA: { name: "Salvador", lat: -12.97, lng: -38.50 },
  SC: { name: "Florianópolis", lat: -27.60, lng: -48.55 },
  GO: { name: "Goiânia", lat: -16.69, lng: -49.26 },
  PE: { name: "Recife", lat: -8.05, lng: -34.88 },
  CE: { name: "Fortaleza", lat: -3.72, lng: -38.54 },
  DF: { name: "Brasília", lat: -15.78, lng: -47.93 },
  ES: { name: "Vitória", lat: -20.32, lng: -40.31 },
  PA: { name: "Belém", lat: -1.46, lng: -48.50 },
  MT: { name: "Cuiabá", lat: -15.60, lng: -56.09 },
  MS: { name: "Campo Grande", lat: -20.44, lng: -54.65 },
  MA: { name: "São Luís", lat: -2.53, lng: -44.30 },
  PB: { name: "João Pessoa", lat: -7.12, lng: -34.84 },
  RN: { name: "Natal", lat: -5.79, lng: -35.21 },
  AL: { name: "Maceió", lat: -9.67, lng: -35.74 },
  SE: { name: "Aracaju", lat: -10.95, lng: -37.07 },
  PI: { name: "Teresina", lat: -5.09, lng: -42.80 },
  AM: { name: "Manaus", lat: -3.12, lng: -60.02 },
  RO: { name: "Porto Velho", lat: -8.76, lng: -63.90 },
  TO: { name: "Palmas", lat: -10.18, lng: -48.33 },
  AP: { name: "Macapá", lat: 0.03, lng: -51.07 },
  AC: { name: "Rio Branco", lat: -9.97, lng: -67.82 },
  RR: { name: "Boa Vista", lat: 2.82, lng: -60.67 },
}

const STATE_NAMES: Record<string, string> = {
  SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Minas Gerais",
  RS: "Rio Grande do Sul", PR: "Paraná", BA: "Bahia",
  SC: "Santa Catarina", GO: "Goiás", PE: "Pernambuco",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  PA: "Pará", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
  MA: "Maranhão", PB: "Paraíba", RN: "Rio Grande do Norte",
  AL: "Alagoas", SE: "Sergipe", PI: "Piauí", AM: "Amazonas",
  RO: "Rondônia", TO: "Tocantins", AP: "Amapá", AC: "Acre", RR: "Roraima",
}

const CATEGORY_LABELS: Record<string, string> = {
  dentist: "🦷 Dentista", medical_aesthetic_clinic: "💉 Clínica Estética",
  medical_clinic: "🏥 Clínica Médica", beauty_salon: "💇 Salão de Beleza",
  restaurant: "🍽️ Restaurante", gym: "🏋️ Academia", lawyer: "⚖️ Advogado",
}

const TICKETS: Record<string, number> = {
  dentist: 500, orthodontist: 800, medical_aesthetic_clinic: 700,
  medical_clinic: 300, veterinarian: 200, psychologist: 200,
  physical_therapist: 180, ophthalmologist: 350, cardiologist: 400,
  beauty_salon: 80, barber_shop: 45, gym: 120,
  lawyer: 800, accountant: 300, architect: 1500, interior_designer: 1200,
  real_estate_agency: 3000, restaurant: 50, pet_store: 80,
  car_repair: 400, pharmacy: 30, electrician: 150, plumber: 150,
  cleaning_service: 200, school: 800, driving_school: 250, hotel: 200,
}

/** Detecta UF a partir de lat/lng (nearest capital). */
export function detectState(lat: number, lng: number): string {
  let best = "SP"; let bestDist = Infinity
  for (const [uf, cap] of Object.entries(STATE_CAPITALS)) {
    const d = Math.abs(lat - cap.lat) + Math.abs(lng - cap.lng) * 0.5
    if (d < bestDist) { bestDist = d; best = uf }
  }
  return bestDist < 5 ? best : "SP"
}

/** Ranqueia estados por potencial de prospecção para uma categoria. */
export async function rankStates(category: string): Promise<StateRanking | null> {
  try {
    const slug = normalizeCategory(category)
    const ibgeData = IBGE_SMB_BY_STATE[slug] || IBGE_SMB_BY_STATE._default
    const supabase = getAdminClient()
    const ticket = TICKETS[slug] || 200
    const label = CATEGORY_LABELS[slug] || category

    // 1 — Conta mapeados por UF (usando lat/lng dos listings)
    const { data: listings } = await supabase
      .from("discovery_listings")
      .select("place_id,latitude,longitude")
      .limit(5000)

    const mappedByUf: Record<string, Set<string>> = {}
    if (listings) {
      for (const r of listings) {
        if (!r.latitude || !r.longitude || !r.place_id) continue
        const uf = detectState(r.latitude, r.longitude)
        if (!mappedByUf[uf]) mappedByUf[uf] = new Set()
        mappedByUf[uf].add(r.place_id)
      }
    }

    // 2 — Score cada estado
    const scores: StateScore[] = []
    let totalBR = 0; let totalMapped = 0

    for (const [uf, stateName] of Object.entries(STATE_NAMES)) {
      const totalBiz = ibgeData[uf] || Math.round((ibgeData._default || 1000) * 0.3)
      const mapped = mappedByUf[uf]?.size || 0
      const gapPct = Math.round(((totalBiz - mapped) / Math.max(totalBiz, 1)) * 100)
      const renda = RENDA_MEDIA_UF[uf] || 1000
      const cap = STATE_CAPITALS[uf]
      if (!cap) continue

      totalBR += totalBiz
      totalMapped += mapped

      // Normalized scores (0-100)
      const marketSizeScore = Math.min(100, Math.round((totalBiz / 42000) * 100))  // SP=42000=100
      const gapScore = Math.min(100, gapPct)  // % não mapeado = score
      const ticketScore = Math.min(100, Math.round((ticket / 1500) * (renda / 2900) * 100))
      const densityScore = Math.min(100, Math.round((totalBiz / (cap.lat ? 1000 : 100)) * 50))

      // Composite: market(35) + gap(35) + ticket(20) + density(10)
      const composite = Math.round(
        marketSizeScore * 0.35 + gapScore * 0.35 + ticketScore * 0.20 + densityScore * 0.10
      )

      scores.push({
        uf,
        stateName,
        capital: cap.name,
        capitalLat: cap.lat,
        capitalLng: cap.lng,
        score: composite,
        breakdown: { marketSizeScore, gapScore, ticketScore, densityScore },
        totalBusinesses: totalBiz,
        mappedBusinesses: mapped,
        coveragePct: Math.min(100, Math.round((mapped / Math.max(totalBiz, 1)) * 10000) / 100),
        suggestedCity: cap.name,
        suggestedRadius: cap.name === "São Paulo" ? 10 : cap.name === "Rio de Janeiro" ? 8 : 12,
        strategy: composite >= 80 ? "🔥 Alta prioridade — maior oportunidade do Brasil"
          : composite >= 60 ? "⭐ Prioridade — mercado grande com baixa cobertura"
          : composite >= 40 ? "📋 Oportunidade — bom potencial de expansão"
          : "👀 Baixa prioridade — mercado pequeno ou saturado",
      })
    }

    scores.sort((a, b) => b.score - a.score)
    const best = scores[0]

    return {
      category: slug,
      categoryLabel: label,
      states: scores,
      topPick: best,
      meta: {
        totalBRBusinesses: totalBR,
        totalMapped,
        totalCoveragePct: Math.round((totalMapped / Math.max(totalBR, 1)) * 10000) / 100,
        bestOpportunity: `${best.stateName} · ${best.capital} · ${best.totalBusinesses.toLocaleString("pt-BR")} negócios · ${best.coveragePct}% coberto`,
      },
    }
  } catch (e: any) {
    console.error("[state-scorer]", e.message)
    return null
  }
}
