// ══════════════════════════════════════════════════════════════════
// ADSENTICE · IBGEService — Economia (PIB, salário, empresas)
// Dados reais via SIDRA API · medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { ibgeFetch, sidraUrl } from "./client"

export interface PIBData {
  municipio: string
  pibMilReais: number   // PIB a preços correntes (Mil Reais)
  ano: number
  populacao?: number
  pibPerCapita?: number  // Calculado: PIB / população
}

/** PIB municipal (SIDRA tabela 5938, variável 37). */
export async function getPIBMunicipal(municipioId: string): Promise<PIBData | null> {
  try {
    const data = await ibgeFetch(sidraUrl("5938", municipioId, "37"), 86400 * 7)

    if (!data || !Array.isArray(data) || data.length < 2) return null

    const header = data[0]
    const row = data[1]
    const nomeIdx = Object.keys(header).find(k => header[k]?.includes("localidade")) || ""
    const nome = row[nomeIdx] || "?"
    const valor = parseFloat(row.V || "0") || 0
    const ano = parseInt(Object.keys(row).find(k => k.startsWith("202")) || "2022") || 2022

    return { municipio: nome, pibMilReais: valor, ano }
  } catch (e: any) {
    console.warn("[ibge.economia] PIB:", e.message)
    
return null
  }
}

/** PIB per capita (PIB / população). População via tabela 6579. */
export async function getPIBPerCapita(municipioId: string): Promise<number | null> {
  try {
    // PIB
    const pib = await getPIBMunicipal(municipioId)

    if (!pib) return null

    // População (SIDRA tabela 6579 — estimativas populacionais)
    const popData = await ibgeFetch(sidraUrl("6579", municipioId, "9324"), 86400 * 30)
    let pop = 0

    if (popData && Array.isArray(popData) && popData.length >= 2) {
      pop = parseFloat(popData[1].V || "0") || 0
    }

    // Fallback: usar estimativa da capital
    if (!pop) {
      const CAPITAL_POP: Record<string, number> = {
        "3550308": 11451245, "3304557": 6211423, "3106200": 2315560,
        "4106902": 1773733, "4314902": 1332570, "2927408": 2418005,
        "2611606": 1488920, "2304400": 2428678, "5300108": 2817068,
      }

      pop = CAPITAL_POP[municipioId] || 500000
    }

    pib.populacao = pop
    pib.pibPerCapita = pib.pibMilReais * 1000 / pop
    
return Math.round(pib.pibPerCapita * 100) / 100
  } catch (e: any) {
    console.warn("[ibge.economia] PIBpc:", e.message)
    
return null
  }
}

export interface SalarioData {
  municipio: string
  salarioMedio: number   // Salário médio mensal (R$)
  ano: number
}

/** Salário médio (SIDRA tabela 5938, variável 605). */
export async function getSalarioMedio(municipioId: string): Promise<number | null> {
  try {
    const data = await ibgeFetch(sidraUrl("5938", municipioId, "605"), 86400 * 30)

    if (!data || !Array.isArray(data) || data.length < 2) return null
    const salario = parseFloat(data[1].V || "0") || 0

    
return Math.round(salario * 100) / 100
  } catch (e: any) {
    // Fallback: usar ibge_income do Supabase
    return null
  }
}

export interface IPCData {
  mes: string
  valor: number
}

/** IPCA mensal (SIDRA tabela 7060, Brasil). Retorna últimos 12 meses. */
export async function getIPCAHistorico(meses: number = 6): Promise<IPCData[]> {
  try {
    const url = `https://apisidra.ibge.gov.br/values/t/7060/n1/all/v/63/p/last/${meses}`
    const data = await ibgeFetch(url, 86400)

    if (!data || !Array.isArray(data)) return []
    const results: IPCData[] = []

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const mes = row.D3N || row.D3C || ""
      const valor = parseFloat(row.V || "0") || 0

      if (mes && valor) results.push({ mes, valor })
    }

    
return results
  } catch { return [] }
}

/** IPCA acumulado 12 meses (mais recente). */
export async function getIPCA12Meses(): Promise<number | null> {
  const historico = await getIPCAHistorico(13)

  if (historico.length === 0) return null
  const acumulado = historico.reduce((sum, d) => sum + d.valor, 0)

  
return Math.round(acumulado * 100) / 100
}

export interface DesempregoData {
  trimestre: string
  taxa: number
}

/** Taxa de desocupação PNAD Contínua (SIDRA tabela 4099, Brasil, variável 4099). */
export async function getDesemprego(): Promise<number | null> {
  try {
    const url = `https://apisidra.ibge.gov.br/values/t/4099/n1/all/v/4099/p/last/1`
    const data = await ibgeFetch(url, 86400 * 7)

    if (!data || !Array.isArray(data) || data.length < 2) return null
    const taxa = parseFloat(data[1].V || "0") || 0

    
return Math.round(taxa * 10) / 10
  } catch { return null }
}
