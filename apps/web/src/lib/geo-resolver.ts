// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Geo Resolver — reverse geocode lat/lng → city/district
// Uses free OpenStreetMap Nominatim (1 req/s rate limit, no API key).
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { BR_CAPITALS, suggestRadius } from "./geo-data"

/** Re-export for server-side consumers. */
export { BR_CAPITALS as BR_STATE_CAPITALS, suggestRadius } from "./geo-data"

export interface GeoResult {
  city: string | null; district: string | null; state: string | null
  country: string | null; displayName: string | null
}

let _lastCall = 0
const MIN_INTERVAL = 1100

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  const now = Date.now(); const wait = _lastCall + MIN_INTERVAL - now

  if (wait > 0) await new Promise(r => setTimeout(r, wait)); _lastCall = Date.now()

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`, {
      headers: { "User-Agent": "adsentice/1.0" }, signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null
    const data = await res.json(); const addr = data.address || {}

    
return {
      city: addr.city || addr.town || addr.municipality || addr.county || null,
      district: addr.suburb || addr.neighbourhood || addr.city_district || null,
      state: addr.state || null, country: addr.country || null, displayName: data.display_name || null,
    }
  } catch { return null }
}

export async function searchCity(query: string, state?: string | null): Promise<{ lat: number; lng: number; displayName: string; city: string; state: string } | null> {
  const now = Date.now(); const wait = _lastCall + MIN_INTERVAL - now

  if (wait > 0) await new Promise(r => setTimeout(r, wait)); _lastCall = Date.now()

  try {
    const q = state ? `${query}, ${state}, Brasil` : `${query}, Brasil`

    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=pt-BR&countrycodes=br`, {
      headers: { "User-Agent": "adsentice/1.0" }, signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null
    const data = await res.json()

    if (!data?.length) return null
    
return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name || query, city: data[0].name || query, state: data[0].state || state || '' }
  } catch { return null }
}

const _capByUf: Record<string, number> = {}
const _capArea: Record<string, number> = {}
const _capDens: Record<string, number> = {}

for (const c of BR_CAPITALS) {
  _capByUf[c.uf] = c.pop
  _capArea[c.uf] = c.areaKm2
  _capDens[c.uf] = c.densidade
}

export function radiusForCapital(uf: string): { radiusKm: number; label: string } {
  const area = _capArea[uf.toUpperCase()]
  const dens = _capDens[uf.toUpperCase()]


return area ? suggestRadius(area, dens) : { radiusKm: 10, label: "Padrão — 10km" }
}
