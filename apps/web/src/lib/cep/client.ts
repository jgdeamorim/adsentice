// ══════════════════════════════════════════════════════════════════
// ADSENTICE · CEPService — Client HTTP com cache + fallback
// Multi-API: ViaCEP (primário) → BrasilAPI (fallback) → Nominatim
// medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import "server-only"

const CACHE_TTL = 86400 * 7 // 7 dias (CEP não muda)
const _cache = new Map<string, { data: CEPResult; ts: number }>()

export interface CEPResult {
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  estado: string
  lat: number | null
  lng: number | null
  ddd: number | null
  ibge_code: string | null
  source: "viacep" | "brasilapi" | "nominatim"
}

/** Busca CEP em múltiplas APIs com cache. */
export async function fetchCEP(cep: string): Promise<CEPResult | null> {
  const clean = cep.replace(/\D/g, "")

  if (clean.length !== 8) return null

  const cached = _cache.get(clean)

  if (cached && Date.now() - cached.ts < CACHE_TTL * 1000) return cached.data

  // 1 — ViaCEP (gratuito, sem rate limit, mais usado no BR)
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      headers: { "User-Agent": "adsentice/1.0" },
      signal: AbortSignal.timeout(5000),
    })

    if (resp.ok) {
      const data = await resp.json()

      if (data && !data.erro && data.localidade) {
        const result: CEPResult = {
          cep: data.cep?.replace(/\D/g, "") || clean,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || "",
          estado: data.estado || data.uf || "",
          lat: null,
          lng: null,
          ddd: data.ddd ? parseInt(data.ddd) : null,
          ibge_code: data.ibge || null,
          source: "viacep",
        }

        _cache.set(clean, { data: result, ts: Date.now() })
        
return result
      }
    }
  } catch { /* fallback */ }

  // 2 — BrasilAPI (formato mais rico, pode ter coordenadas)
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, {
      headers: { "User-Agent": "adsentice/1.0" },
      signal: AbortSignal.timeout(5000),
    })

    if (resp.ok) {
      const data = await resp.json()

      if (data?.city) {
        const result: CEPResult = {
          cep: data.cep?.replace(/\D/g, "") || clean,
          logradouro: data.street || "",
          bairro: data.neighborhood || "",
          cidade: data.city || "",
          uf: data.state || "",
          estado: data.state || "",
          lat: data.location?.coordinates?.latitude ?? null,
          lng: data.location?.coordinates?.longitude ?? null,
          ddd: null,
          ibge_code: data.city_ibge_code || null,
          source: "brasilapi",
        }

        _cache.set(clean, { data: result, ts: Date.now() })
        
return result
      }
    }
  } catch { /* fallback */ }

  return null
}

/** Coordenadas via Nominatim a partir dos dados do CEP. */
export async function geocodeAddress(
  logradouro: string, bairro: string, cidade: string, uf: string
): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${logradouro}, ${bairro}, ${cidade}, ${uf}, Brasil`)

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&accept-language=pt-BR&countrycodes=br`,
      { headers: { "User-Agent": "adsentice/1.0" }, signal: AbortSignal.timeout(5000) }
    )

    if (!resp.ok) return null
    const data = await resp.json()

    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {}

  
return null
}
