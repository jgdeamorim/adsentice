// ══════════════════════════════════════════════════════════════════
// ADSENTICE · IBGEService — Barrel Export
// Módulo unificado de acesso aos dados do IBGE.
//
// Uso:
//   import { getEstados, getMunicipios, getPIBMunicipal,
//            getCenso, getIPCA12Meses } from "@/lib/ibge"
//
// Fontes: SIDRA API + IBGE Localidades + IBGE Cidades
// Cache: 24h em memória (dados são anuais/mensais)
// medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

export { ibgeFetch } from "./client"
export type { Estado, Municipio } from "./localidades"
export { getEstados, getMunicipios, getMunicipio, UF_TO_IBGE_ID, CAPITAL_IDS } from "./localidades"
export type { PIBData } from "./economia"
export { getPIBMunicipal, getPIBPerCapita, getSalarioMedio, getIPCAHistorico, getIPCA12Meses, getDesemprego } from "./economia"
export type { CensoData } from "./censo"
export { getPopulacao, getDomicilios, getRendaMedia, getCenso, getBestPopulacao, getBestRenda, CAPITAL_POPULACAO, CAPITAL_RENDA } from "./censo"
