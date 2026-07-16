// ══════════════════════════════════════════════════════════════════
// ADSENTICE · CEPService — Barrel Export
// Módulo unificado de busca e enriquecimento de CEP.
//
// Uso:
//   import { resolveCEP, fetchCEP } from "@/lib/cep"
//   const enriched = await resolveCEP("01310100")
//   // enriched.coordenadas → {lat, lng} para DataForSEO
//   // enriched.panorama → {populacao, pib_per_capita, renda_media}
//
// Fontes: ViaCEP + BrasilAPI + Nominatim + IBGE Panorama
// Cache: 7 dias em memória
// medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

export { fetchCEP, geocodeAddress } from "./client"
export type { CEPResult } from "./client"
export { resolveCEP } from "./resolver"
export type { CEPEnriched } from "./resolver"
