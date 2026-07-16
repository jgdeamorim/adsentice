// ══════════════════════════════════════════════════════════════════
// ADSENTICE · IBGEService — Client HTTP com cache Redis
// medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import "server-only"

const IBGE_BASE = "https://servicodados.ibge.gov.br/api/v3"
const SIDRA_BASE = "https://apisidra.ibge.gov.br/values"
const IBGE_LOCALIDADES = "https://servicodados.ibge.gov.br/api/v1/localidades"
const CACHE_TTL = 86400 // 24 horas (dados IBGE são anuais/mensais)

// Cache simples em memória (server-side, persiste entre requests)
const _cache = new Map<string, { data: any; ts: number }>()

function cacheKey(url: string): string {
  return `ibge:${url.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 80)}`
}

export async function ibgeFetch(url: string, ttl: number = CACHE_TTL): Promise<any> {
  const key = cacheKey(url)
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < ttl * 1000) return cached.data

  const resp = await fetch(url, {
    headers: { "User-Agent": "adsentice/1.0" },
    signal: AbortSignal.timeout(15000),
  })

  if (!resp.ok) {
    console.warn(`[ibge] HTTP ${resp.status}: ${url}`)
    return null
  }

  const data = await resp.json()
  _cache.set(key, { data, ts: Date.now() })
  return data
}

/** SIDRA query helper: /t/{table}/n6/{municipioId}/v/all/p/last */
export function sidraUrl(table: string, municipioId: string, variable: string = "all"): string {
  return `${SIDRA_BASE}/t/${table}/n6/${municipioId}/v/${variable}/p/last`
}

/** SIDRA query for all Brazil: /t/{table}/n1/all/v/all/p/last */
export function sidraBrasilUrl(table: string, variable: string = "all"): string {
  return `${SIDRA_BASE}/t/${table}/n1/all/v/${variable}/p/last`
}

/** SIDRA query for states: /t/{table}/n3/all/v/all/p/last */
export function sidraEstadosUrl(table: string, variable: string = "all"): string {
  return `${SIDRA_BASE}/t/${table}/n3/all/v/${variable}/p/last`
}

/** IBGE Localidades: /estados/{uf}/municipios */
export function localidadesMunicipiosUrl(ufId: number): string {
  return `${IBGE_LOCALIDADES}/estados/${ufId}/municipios`
}

/** IBGE Localidades: /municipios/{id} */
export function localidadesMunicipioUrl(id: number): string {
  return `${IBGE_LOCALIDADES}/municipios/${id}`
}

/** IBGE Agregados (SIDRA v3): /agregados/{id}/periodos/{p}/variaveis/{v}?localidades=N6[id] */
export function agregadosUrl(agregadoId: string, periodos: string, variaveis: string, localidade: string): string {
  return `${IBGE_BASE}/agregados/${agregadoId}/periodos/${periodos}/variaveis/${variaveis}?localidades=${localidade}`
}

/** IBGE Cidades API (portal oficial): panorama por município */
export function cidadesPanoramaUrl(municipioId: string): string {
  return `https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/0/resultados/${municipioId}`
}
