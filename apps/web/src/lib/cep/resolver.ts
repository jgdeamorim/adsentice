// ══════════════════════════════════════════════════════════════════
// ADSENTICE · CEPService — Resolver (CEP → dados completos)
// Enriquecimento: CEP → IBGE panorama + score do bairro
// medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { fetchCEP, geocodeAddress, type CEPResult } from "./client"
import { getAdminClient } from "../supabase-admin"

export interface CEPEnriched extends CEPResult {
  coordenadas: { lat: number; lng: number } | null
  panorama: {
    populacao: number | null
    pib_per_capita: number | null
    densidade: number | null
    renda_media: number | null
  } | null
  municipio_ibge_id: string | null
  region: string // "SP", "RJ", etc.
}

/** Enriquecimento completo: CEP → coordenadas + IBGE panorama + score */
export async function resolveCEP(cep: string): Promise<CEPEnriched | null> {
  // 1 — Busca CEP
  const cepData = await fetchCEP(cep)

  if (!cepData) return null

  // 2 — Geocoding (se ViaCEP, que não retorna coordenadas)
  let lat = cepData.lat
  let lng = cepData.lng

  if ((lat == null || lng == null) && cepData.cidade) {
    const geo = await geocodeAddress(
      cepData.logradouro, cepData.bairro, cepData.cidade, cepData.uf
    )

    if (geo) { lat = geo.lat; lng = geo.lng }
  }

  // 3 — IBGE Panorama do município
  let panorama: CEPEnriched["panorama"] = null

  try {
    const supabase = getAdminClient()

    const { data: ibgeRows } = await supabase
      .from("ibge_panorama")
      .select("populacao,pib_per_capita,densidade_demografica")
      .ilike("municipio_nome", `%${cepData.cidade}%`)
      .limit(1)

    if (ibgeRows?.length) {
      const r = ibgeRows[0]

      panorama = {
        populacao: r.populacao ?? null,
        pib_per_capita: r.pib_per_capita ?? null,
        densidade: r.densidade_demografica ?? null,
        renda_media: null, // ibge_income por UF
      }
    }

    // Renda média do estado
    const { data: incomeRows } = await supabase
      .from("ibge_income")
      .select("avg_household_income")
      .eq("uf", cepData.uf)
      .limit(1)

    if (panorama && incomeRows?.length) {
      panorama.renda_media = incomeRows[0].avg_household_income ?? null
    } else if (panorama) {
      panorama.renda_media = null
    }
  } catch { /* panorama offline — degrade gracefully */ }

  return {
    ...cepData,
    coordenadas: (lat != null && lng != null) ? { lat, lng } : null,
    panorama,
    municipio_ibge_id: cepData.ibge_code || null,
    region: cepData.uf || "SP",
  }
}
