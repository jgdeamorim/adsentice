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
}

export const BR_CAPITALS: CapitalInfo[] = [
  { uf: 'SP', lat: -23.5505, lng: -46.6333, label: 'São Paulo', pop: 11_451_245 },
  { uf: 'RJ', lat: -22.9068, lng: -43.1729, label: 'Rio de Janeiro', pop: 6_211_423 },
  { uf: 'DF', lat: -15.7801, lng: -47.9292, label: 'Brasília', pop: 2_817_068 },
  { uf: 'CE', lat: -3.7172, lng: -38.5433, label: 'Fortaleza', pop: 2_428_678 },
  { uf: 'BA', lat: -12.9714, lng: -38.5014, label: 'Salvador', pop: 2_418_005 },
  { uf: 'MG', lat: -19.9167, lng: -43.9345, label: 'Belo Horizonte', pop: 2_315_560 },
  { uf: 'AM', lat: -3.1190, lng: -60.0217, label: 'Manaus', pop: 2_063_547 },
  { uf: 'PR', lat: -25.4284, lng: -49.2733, label: 'Curitiba', pop: 1_773_733 },
  { uf: 'PE', lat: -8.0475, lng: -34.8770, label: 'Recife', pop: 1_488_920 },
  { uf: 'GO', lat: -16.6869, lng: -49.2648, label: 'Goiânia', pop: 1_437_237 },
  { uf: 'RS', lat: -30.0346, lng: -51.2177, label: 'Porto Alegre', pop: 1_332_570 },
  { uf: 'PA', lat: -1.4550, lng: -48.5024, label: 'Belém', pop: 1_303_389 },
  { uf: 'MA', lat: -2.5307, lng: -44.3068, label: 'São Luís', pop: 1_037_775 },
  { uf: 'AL', lat: -9.6658, lng: -35.7350, label: 'Maceió', pop: 957_916 },
  { uf: 'PB', lat: -7.1195, lng: -34.8450, label: 'João Pessoa', pop: 833_932 },
  { uf: 'RN', lat: -5.7945, lng: -35.2110, label: 'Natal', pop: 751_300 },
  { uf: 'MT', lat: -15.5989, lng: -56.0949, label: 'Cuiabá', pop: 650_912 },
  { uf: 'MS', lat: -20.4428, lng: -54.6464, label: 'Campo Grande', pop: 897_938 },
  { uf: 'PI', lat: -5.0892, lng: -42.8016, label: 'Teresina', pop: 866_300 },
  { uf: 'SE', lat: -10.9472, lng: -37.0731, label: 'Aracaju', pop: 602_757 },
  { uf: 'SC', lat: -27.5969, lng: -48.5495, label: 'Florianópolis', pop: 537_213 },
  { uf: 'RO', lat: -8.7608, lng: -63.8999, label: 'Porto Velho', pop: 460_413 },
  { uf: 'AP', lat: 0.0349, lng: -51.0694, label: 'Macapá', pop: 442_933 },
  { uf: 'RR', lat: 2.8235, lng: -60.6758, label: 'Boa Vista', pop: 413_486 },
  { uf: 'ES', lat: -20.3155, lng: -40.3128, label: 'Vitória', pop: 322_869 },
  { uf: 'AC', lat: -9.9749, lng: -67.8243, label: 'Rio Branco', pop: 364_756 },
  { uf: 'TO', lat: -10.1842, lng: -48.3336, label: 'Palmas', pop: 302_692 },
]

/** Dynamic radius based on city population tier (IBGE 2024 estimates). */
export function suggestRadiusByPop(populationApprox: number): { radiusKm: number; label: string } {
  if (populationApprox >= 2_000_000) return { radiusKm: 25, label: "Megacidade (>2M) — 25km" }
  if (populationApprox >= 500_000) return { radiusKm: 20, label: "Grande (500K-2M) — 20km" }
  if (populationApprox >= 100_000) return { radiusKm: 15, label: "Média (100K-500K) — 15km" }
  return { radiusKm: 10, label: "Pequena (<100K) — 10km" }
}
