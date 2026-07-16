// ══════════════════════════════════════════════════════════════════
// ADSENTICE · IBGEService — Localidades (estados, municípios)
// API IBGE Localidades v1 · medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { ibgeFetch, localidadesMunicipiosUrl } from "./client"

export interface Estado {
  id: number
  sigla: string
  nome: string
  regiao: string
}

export interface Municipio {
  id: number
  nome: string
  uf: string
  microrregiao: string
  mesorregiao: string
}

// ── Estado IDs (IBGE) UF codes ──

export const UF_TO_IBGE_ID: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27,
  SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
}

// ── Cache em memória (24h — dados do IBGE não mudam no curto prazo) ──

let _estadosCache: Estado[] | null = null
const _municipiosCache = new Map<number, Municipio[]>()

/** Lista todos os estados brasileiros. Cache 24h. */
export async function getEstados(): Promise<Estado[]> {
  if (_estadosCache) return _estadosCache
  const data = await ibgeFetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados`, 86400)
  if (!data || !Array.isArray(data)) return []
  _estadosCache = data.map((e: any) => ({
    id: e.id,
    sigla: e.sigla,
    nome: e.nome,
    regiao: e.regiao?.nome || "",
  }))
  return _estadosCache
}

/** Lista todos os municípios de um estado. Cache 24h. */
export async function getMunicipios(uf: string): Promise<Municipio[]> {
  const ufId = UF_TO_IBGE_ID[uf]
  if (!ufId) return []
  const cached = _municipiosCache.get(ufId)
  if (cached) return cached

  const data = await ibgeFetch(localidadesMunicipiosUrl(ufId), 86400)
  if (!data || !Array.isArray(data)) return []

  const municipios: Municipio[] = data.map((m: any) => ({
    id: m.id,
    nome: m.nome,
    uf,
    microrregiao: m.microrregiao?.nome || "",
    mesorregiao: m.mesorregiao?.nome || "",
  }))
  _municipiosCache.set(ufId, municipios)
  return municipios
}

/** Busca detalhes de um município específico pelo ID IBGE. */
export async function getMunicipio(id: number): Promise<Municipio | null> {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${id}`
  const data = await ibgeFetch(url, 86400)
  if (!data) return null
  return {
    id: data.id,
    nome: data.nome,
    uf: data.microrregiao?.mesorregiao?.UF?.sigla || "?",
    microrregiao: data.microrregiao?.nome || "",
    mesorregiao: data.mesorregiao?.nome || "",
  }
}

// ── IDs das capitais (IBGE) ──

export const CAPITAL_IDS: Record<string, number> = {
  SP: 3550308, RJ: 3304557, MG: 3106200, PR: 4106902,
  RS: 4314902, BA: 2927408, PE: 2611606, CE: 2304400,
  DF: 5300108, SC: 4205407, GO: 5208707, ES: 3205309,
  PA: 1501402, MT: 5103403, MS: 5002704, MA: 2111300,
  PB: 2507507, RN: 2408102, AL: 2704302, SE: 2800308,
  PI: 2211001, AM: 1302603, RO: 1100205, TO: 1721000,
  AP: 1600303, AC: 1200401, RR: 1400100,
}
