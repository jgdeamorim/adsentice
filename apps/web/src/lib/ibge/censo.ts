// ══════════════════════════════════════════════════════════════════
// ADSENTICE · IBGEService — Censo (população, renda, domicílios)
// Censo 2022 + estimativas · medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { ibgeFetch, sidraUrl } from "./client"

export interface CensoData {
  municipio: string
  populacao: number
  domicilios: number
  densidade: number        // hab/km²
  rendaMedia: number       // R$ (salário médio mensal)
  escolaridadeMedia: number // anos de estudo
  idadeMedia: number
}

/** População estimada 2021 (SIDRA tabela 6579 — mais recente por município). */
export async function getPopulacao(municipioId: string): Promise<number> {
  try {
    const data = await ibgeFetch(sidraUrl("6579", municipioId, "9324"), 86400 * 30)
    if (data && Array.isArray(data) && data.length >= 2) {
      return parseFloat(data[1].V || "0") || 0
    }
  } catch {}
  return 0
}

/** Domicílios (Censo 2022 — SIDRA tabela 4714). */
export async function getDomicilios(municipioId: string): Promise<number> {
  try {
    const data = await ibgeFetch(sidraUrl("4714", municipioId, "606"), 86400 * 180)
    if (data && Array.isArray(data) && data.length >= 2) {
      return parseFloat(data[1].V || "0") || 0
    }
  } catch {}
  return 0
}

/** Renda média domiciliar per capita (SIDRA tabela 6751). */
export async function getRendaMedia(municipioId: string): Promise<number> {
  try {
    const data = await ibgeFetch(sidraUrl("6751", municipioId, "1173"), 86400 * 60)
    if (data && Array.isArray(data) && data.length >= 2) {
      return parseFloat(data[1].V || "0") || 0
    }
  } catch {}
  return 0
}

/** Panorama completo do município (agregado via SIDRA). */
export async function getCenso(municipioId: string): Promise<CensoData | null> {
  try {
    const [pop, domicilios, renda] = await Promise.all([
      getPopulacao(municipioId),
      getDomicilios(municipioId),
      getRendaMedia(municipioId),
    ])

    if (!pop) return null

    return {
      municipio: `ID-${municipioId}`,
      populacao: pop,
      domicilios,
      densidade: 0,     // precisa de área do município (IBGE malha)
      rendaMedia: renda,
      escolaridadeMedia: 0,
      idadeMedia: 0,
    }
  } catch (e: any) {
    console.warn("[ibge.censo]", e.message)
    return null
  }
}

// ── Dados estáticos das capitais (IBGE Censo 2022 — fallback) ──

export const CAPITAL_POPULACAO: Record<string, number> = {
  SP: 11451245, RJ: 6211423, DF: 2817068, CE: 2428678,
  BA: 2418005, MG: 2315560, AM: 2063547, PR: 1773733,
  PE: 1488920, GO: 1437237, RS: 1332570, PA: 1303389,
  MA: 1037775, AL: 957916, MS: 897938, PB: 833932,
  PI: 866300, RN: 751300, MT: 650912, SE: 602757,
  SC: 537213, RO: 460413, AP: 442933, RR: 413486,
  ES: 322869, AC: 364756, TO: 302692,
}

export const CAPITAL_RENDA: Record<string, number> = {
  DF: 2900, SP: 2300, SC: 2100, RS: 2100, RJ: 2000,
  PR: 1900, ES: 1600, MG: 1500, MS: 1500, GO: 1400,
  MT: 1400, PE: 1000, CE: 1000, BA: 1000, RN: 900,
  SE: 900, RR: 900, AM: 900, PA: 900, RO: 1000,
  TO: 900, AC: 800, AP: 800, PB: 800, AL: 700,
  MA: 700, PI: 700,
}

/** Híbrido: tenta SIDRA, fallback hardcoded. */
export async function getBestPopulacao(municipioId: string, ufFallback: string): Promise<number> {
  const pop = await getPopulacao(municipioId)
  if (pop > 0) return pop
  return CAPITAL_POPULACAO[ufFallback] || 500000
}

export async function getBestRenda(_municipioId: string, ufFallback: string): Promise<number> {
  return CAPITAL_RENDA[ufFallback] || 1000
}
