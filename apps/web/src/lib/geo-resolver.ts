// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Geo Resolver — reverse geocode lat/lng → city/district
// Uses free OpenStreetMap Nominatim (1 req/s rate limit, no API key).
// Fallback for L1 GMB profiles that return NULL city.
// ══════════════════════════════════════════════════════════════════

import "server-only"

export interface GeoResult {
  city: string | null
  district: string | null
  state: string | null
  country: string | null
  displayName: string | null
}

// Rate limit: Nominatim allows 1 req/s. We use a simple in-memory throttle.
let _lastCall = 0
const MIN_INTERVAL = 1100 // 1.1s between calls

/** Reverse geocode lat/lng to city/district/state using OpenStreetMap. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  // Throttle to respect Nominatim rate limit
  const now = Date.now()
  const wait = _lastCall + MIN_INTERVAL - now
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  _lastCall = Date.now()

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`
    const res = await fetch(url, {
      headers: { "User-Agent": "adsentice/1.0 (marketing intelligence hub)" },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address || {}

    return {
      city: addr.city || addr.town || addr.municipality || addr.county || null,
      district: addr.suburb || addr.neighbourhood || addr.city_district || null,
      state: addr.state || null,
      country: addr.country || null,
      displayName: data.display_name || null,
    }
  } catch {
    return null
  }
}

/** Batch reverse geocode (throttled). Returns array parallel to inputs. */
export async function batchReverseGeocode(
  coords: { lat: number; lng: number }[],
): Promise<(GeoResult | null)[]> {
  const results: (GeoResult | null)[] = []
  for (const { lat, lng } of coords) {
    results.push(await reverseGeocode(lat, lng))
  }
  return results
}
