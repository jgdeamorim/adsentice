// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Coverage Matrix — Layer 1 do Discovery Auto-Pilot
// ADR-0023 · medido=verdade · 2026-07-15
//
// Calcula cobertura geoespacial por categoria × cidade usando
// dados 100% existentes no Supabase (search_id, district, city).
// $0 em novas APIs. Determina quais distritos já foram mapeados
// e quais gaps existem.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { getAdminClient } from "./supabase-admin"

export interface DistrictCoverage {
  district: string
  listings: number
  avgScore: number
  lastScanned: string | null
}

export interface CoverageReport {
  category: string
  city: string
  categoryLabel: string
  districtsFound: number
  totalDistrictsEstimate: number
  coveragePct: number
  totalListings: number
  uniqueBusinesses: number
  avgScore: number
  mapped: DistrictCoverage[]
  gaps: string[]           // distritos nunca mapeados (top 8)
  searchesInRegion: number
}

// ── Distritos estimados por capital (IBGE bairros oficiais) ──

const CITY_DISTRICT_ESTIMATES: Record<string, number> = {
  "São Paulo": 96,          // 96 distritos oficiais
  "Rio de Janeiro": 33,     // 33 regiões administrativas
  "Belo Horizonte": 9,      // 9 regionais
  "Brasília": 33,           // 33 regiões administrativas
  "Salvador": 10,           // 10 prefeituras-bairro
  "Fortaleza": 12,          // 12 regionais
  "Curitiba": 10,           // 10 regionais
  "Recife": 6,              // 6 RPA
  "Porto Alegre": 8,        // 8 regiões
  "Manaus": 6,              // 6 zonas
  "default": 5,             // cidades menores
}

function estimatedDistricts(city: string): number {
  for (const [key, n] of Object.entries(CITY_DISTRICT_ESTIMATES)) {
    if (city.includes(key)) return n
  }

  
return CITY_DISTRICT_ESTIMATES.default
}

/** Retorna relatório de cobertura para uma categoria em uma cidade. */
export async function getCoverage(categorySlug: string, city: string): Promise<CoverageReport | null> {
  try {
    const supabase = getAdminClient()

    // 1 — Distritos cobertos (com dados)
    const { data: listings, error } = await supabase
      .from("discovery_listings")
      .select("place_id,district,city,score_compound")
      .not("district", "is", null)
      .ilike("city", `%${city}%`)
      .limit(5000)

    if (error || !listings?.length) return null

    // 2 — Agrupa por distrito (dedup place_id)
    const byDistrict = new Map<string, { places: Set<string>; scores: number[] }>()

    for (const r of listings) {
      const d = (r.district || "?").trim()

      if (!byDistrict.has(d)) byDistrict.set(d, { places: new Set(), scores: [] })
      const entry = byDistrict.get(d)!

      if (r.place_id) entry.places.add(r.place_id)
      if (r.score_compound != null) entry.scores.push(r.score_compound)
    }

    // 3 — Monta distritos mapeados
    const mapped: DistrictCoverage[] = []
    let totalBusinesses = 0
    let totalScore = 0
    let scoreCount = 0

    for (const [district, data] of byDistrict) {
      const avg = data.scores.length
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0

      mapped.push({
        district,
        listings: data.scores.length,
        avgScore: avg,
        lastScanned: null, // seria max(created_at) — não temos sem group by
      })
      totalBusinesses += data.places.size
      totalScore += avg * data.scores.length
      scoreCount += data.scores.length
    }

    mapped.sort((a, b) => b.listings - a.listings)

    // 4 — Total de distritos estimado para essa cidade
    const totalEstimate = estimatedDistricts(city)

    // 5 — Gaps: distritos reais do RJ/SP que NÃO estão cobertos
    //     Usamos referência fixa das regiões administrativas oficiais
    const officialDistricts = getOfficialDistricts(city)
    const mappedNames = new Set(mapped.map(m => m.district.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")))

    const gaps = officialDistricts
      .filter(d => !mappedNames.has(d.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")))
      .slice(0, 12)

    // 6 — Searches na região
    const { count: searchCount } = await supabase
      .from("discovery_searches")
      .select("id", { count: "exact", head: true })
      .limit(1)

    return {
      category: categorySlug,
      city,
      categoryLabel: categorySlug,
      districtsFound: mapped.length,
      totalDistrictsEstimate: totalEstimate,
      coveragePct: Math.min(100, Math.round((mapped.length / Math.max(totalEstimate, 1)) * 100)),
      totalListings: scoreCount,
      uniqueBusinesses: totalBusinesses,
      avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
      mapped: mapped.slice(0, 15),
      gaps: gaps.slice(0, 8),
      searchesInRegion: searchCount || 0,
    }
  } catch (e: any) {
    console.error("[coverage]", e.message)
    
return null
  }
}

/** Retorna lista de distritos oficiais de uma capital (referência fixa). */
function getOfficialDistricts(city: string): string[] {
  const key = city.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")

  if (key.includes("riodejaneiro")) {
    return [
      "Centro", "Zona Sul", "Tijuca", "Vila Isabel", "Zona Norte",
      "Ramos", "Penha", "Madureira", "Jacarepagua", "Barra da Tijuca",
      "Bangu", "Campo Grande", "Santa Cruz", "Ilha do Governador",
      "Portuaria", "Pavuna", "Meriti", "Zona Oeste",
    ]
  }

  if (key.includes("saopaulo")) {
    return [
      "Sé", "Liberdade", "Bom Retiro", "Santa Cecília", "Consolação",
      "Bela Vista", "República", "Cambuci", "Mooca", "Brás", "Belenzinho",
      "Pari", "Tatuapé", "Penha", "Vila Prudente", "São Lucas",
      "Pinheiros", "Jardim Paulista", "Itaim Bibi", "Vila Mariana",
      "Ipiranga", "Santana", "Tucuruvi", "Vila Maria", "Jaçanã",
      "Pirituba", "Freguesia do Ó", "Brasilândia", "Lapa", "Perdizes",
      "Butantã", "Morumbi", "Campo Limpo", "Capão Redondo",
      "Santo Amaro", "Cidade Ademar", "Jabaquara", "Saúde",
      "Cursino", "Sacomã", "São Miguel Paulista", "Itaim Paulista",
      "Guaianases", "Itaquera", "Cidade Tiradentes",
      "Ermelino Matarazzo", "São Mateus", "Vila Formosa", "Aricanduva",
    ]
  }

  // Cidades menores — usa os distritos que JÁ temos + estimativa
  return []
}

/** Lista cidades que têm dados de cobertura no Supabase. */
export async function listCoveredCities(): Promise<{ city: string; districts: number; businesses: number }[]> {
  try {
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("discovery_listings")
      .select("city,place_id,district")
      .not("city", "is", null)
      .limit(5000)

    if (error || !data) return []

    const byCity = new Map<string, { places: Set<string>; districts: Set<string> }>()

    for (const r of data) {
      const c = r.city || "?"

      if (!byCity.has(c)) byCity.set(c, { places: new Set(), districts: new Set() })
      const e = byCity.get(c)!

      if (r.place_id) e.places.add(r.place_id)
      if (r.district) e.districts.add(r.district)
    }

    return [...byCity.entries()]
      .map(([city, data]) => ({ city, districts: data.districts.size, businesses: data.places.size }))
      .sort((a, b) => b.businesses - a.businesses)
  } catch { return [] }
}
