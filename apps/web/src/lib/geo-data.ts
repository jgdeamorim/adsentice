// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Geo Data — client-safe constants (importable from RSC + client)
// Brazilian state capitals with IBGE 2024 population + coordinates.
// ══════════════════════════════════════════════════════════════════

export interface CapitalInfo {
  lat: number
  lng: number
  label: string
  pop: number
  uf: string
  areaKm2: number                          // IBGE 2024 — área territorial
  densidade: number                        // hab/km²
}

// Todas 27 capitais com área real (IBGE ibge_panorama 2024)
export const BR_CAPITALS: CapitalInfo[] = [
  { uf: 'SP', lat: -23.5505, lng: -46.6333, label: 'São Paulo',       pop: 11_904_961, areaKm2: 1521, densidade: 7824 },
  { uf: 'RJ', lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro',  pop: 6_730_729,  areaKm2: 1200, densidade: 5608 },
  { uf: 'DF', lat: -15.7801, lng: -47.9292, label: 'Brasília',        pop: 2_817_068,  areaKm2: 5761, densidade: 445 },
  { uf: 'CE', lat: -3.7172,  lng: -38.5433, label: 'Fortaleza',       pop: 2_578_483,  areaKm2: 312,  densidade: 8256 },
  { uf: 'BA', lat: -12.9714, lng: -38.5014, label: 'Salvador',        pop: 2_564_204,  areaKm2: 693,  densidade: 3698 },
  { uf: 'MG', lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte',  pop: 2_415_872,  areaKm2: 331,  densidade: 7289 },
  { uf: 'AM', lat: -3.1190,  lng: -60.0217, label: 'Manaus',          pop: 2_303_732,  areaKm2: 11401,densidade: 202 },
  { uf: 'PR', lat: -25.4284, lng: -49.2733, label: 'Curitiba',        pop: 1_830_795,  areaKm2: 435,  densidade: 4210 },
  { uf: 'PE', lat: -8.0475,  lng: -34.8770, label: 'Recife',          pop: 1_588_376,  areaKm2: 219,  densidade: 7258 },
  { uf: 'GO', lat: -16.6869, lng: -49.2648, label: 'Goiânia',         pop: 1_503_256,  areaKm2: 729,  densidade: 2063 },
  { uf: 'RS', lat: -30.0346, lng: -51.2177, label: 'Porto Alegre',    pop: 1_388_794,  areaKm2: 497,  densidade: 2796 },
  { uf: 'PA', lat: -1.4550,  lng: -48.5024, label: 'Belém',           pop: 1_397_315,  areaKm2: 1059, densidade: 1319 },
  { uf: 'MA', lat: -2.5307,  lng: -44.3068, label: 'São Luís',        pop: 1_089_215,  areaKm2: 835,  densidade: 1305 },
  { uf: 'AL', lat: -9.6658,  lng: -35.7350, label: 'Maceió',          pop: 994_952,    areaKm2: 510,  densidade: 1953 },
  { uf: 'MS', lat: -20.4428, lng: -54.6464, label: 'Campo Grande',    pop: 897_938,    areaKm2: 8082, densidade: 97 },
  { uf: 'PB', lat: -7.1195,  lng: -34.8450, label: 'João Pessoa',     pop: 897_633,    areaKm2: 211,  densidade: 4245 },
  { uf: 'PI', lat: -5.0892,  lng: -42.8016, label: 'Teresina',        pop: 905_692,    areaKm2: 1387, densidade: 585 },
  { uf: 'RN', lat: -5.7945,  lng: -35.2110, label: 'Natal',           pop: 784_249,    areaKm2: 167,  densidade: 4689 },
  { uf: 'MT', lat: -15.5989, lng: -56.0949, label: 'Cuiabá',          pop: 691_875,    areaKm2: 3495, densidade: 198 },
  { uf: 'SE', lat: -10.9472, lng: -37.0731, label: 'Aracaju',         pop: 630_932,    areaKm2: 182,  densidade: 3469 },
  { uf: 'SC', lat: -27.5969, lng: -48.5495, label: 'Florianópolis',   pop: 587_486,    areaKm2: 675,  densidade: 871 },
  { uf: 'RO', lat: -8.7608,  lng: -63.8999, label: 'Porto Velho',     pop: 460_413,    areaKm2: 34090,densidade: 13 },
  { uf: 'AP', lat: 0.0349,   lng: -51.0694, label: 'Macapá',          pop: 442_933,    areaKm2: 6564, densidade: 62 },
  { uf: 'RR', lat: 2.8235,   lng: -60.6758, label: 'Boa Vista',       pop: 413_486,    areaKm2: 5687, densidade: 50 },
  { uf: 'AC', lat: -9.9749,  lng: -67.8243, label: 'Rio Branco',      pop: 364_756,    areaKm2: 8835, densidade: 38 },
  { uf: 'ES', lat: -20.3155, lng: -40.3128, label: 'Vitória',         pop: 343_378,    areaKm2: 97,   densidade: 3535 },
  { uf: 'TO', lat: -10.1842, lng: -48.3336, label: 'Palmas',          pop: 328_499,    areaKm2: 2219, densidade: 148 },
]

// ═══ Raio Inteligente (ADR-0026) ═══

/**
 * Raio baseado na ÁREA REAL do município (IBGE ibge_panorama).
 * Quanto menor a área, menor o raio necessário para cobrir o mercado.
 * Fonte: dados de 419 municípios no ibge_panorama (ADR-0026).
 */
export function suggestRadiusByArea(areaKm2: number): { radiusKm: number; label: string } {
  if (areaKm2 < 200) return { radiusKm: 5,  label: "Compacta (<200km²) — 5km" }
  if (areaKm2 < 500) return { radiusKm: 10, label: "Média (200-500km²) — 10km" }
  if (areaKm2 < 1000) return { radiusKm: 15, label: "Grande (500-1000km²) — 15km" }
  if (areaKm2 < 5000) return { radiusKm: 20, label: "Extensa (1K-5K km²) — 20km" }

return { radiusKm: 25, label: "Muito extensa (>5K km²) — 25km" }
}

/**
 * Raio inteligente: combina área + densidade.
 * Cidades densas (>5K hab/km²) reduzem raio em 1 tier (concentração urbana).
 * Cidades esparsas (<200 hab/km²) aumentam raio em 1 tier (dispersão).
 */
export function suggestRadius(areaKm2: number, densidade?: number): { radiusKm: number; label: string } {
  let result = suggestRadiusByArea(areaKm2)

  if (densidade) {
    if (densidade > 5000) {
      result = { radiusKm: Math.max(5, result.radiusKm - 5), label: `${result.label} 🏙️ densa` }
    } else if (densidade < 200) {
      result = { radiusKm: Math.min(30, result.radiusKm + 5), label: `${result.label} 🌾 esparsa` }
    }
  }

  return result
}

/** @deprecated Use suggestRadius(areaKm2, densidade) — considera área real IBGE. */
export function suggestRadiusByPop(populationApprox: number): { radiusKm: number; label: string } {
  if (populationApprox >= 2_000_000) return { radiusKm: 25, label: "Megacidade (>2M) — 25km" }
  if (populationApprox >= 500_000) return { radiusKm: 20, label: "Grande (500K-2M) — 20km" }
  if (populationApprox >= 100_000) return { radiusKm: 15, label: "Média (100K-500K) — 15km" }

return { radiusKm: 10, label: "Pequena (<100K) — 10km" }
}
