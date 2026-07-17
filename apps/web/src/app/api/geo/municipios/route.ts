// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/geo/municipios?city=Rio de Janeiro
// Retorna municípios da Região Metropolitana (district_registry).
// Inclui coordenadas via dataset público IBGE (municipios-brasileiros).
// ADR-0025 · medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ── Coordenadas IBGE (dataset público · cache 24h) ──

interface MunicipioCoord {
  codigo_ibge: number
  nome: string
  latitude: number
  longitude: number
  codigo_uf: number
}

let _coordsCache: { data: MunicipioCoord[] | null; ts: number } = { data: null, ts: 0 }

async function getMunicipioCoords(): Promise<MunicipioCoord[]> {
  const now = Date.now()

  if (_coordsCache.data && (now - _coordsCache.ts) < 86400_000) return _coordsCache.data

  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json",
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) return _coordsCache.data || []

    const data = await res.json() as MunicipioCoord[]

    _coordsCache = { data, ts: now }

    return data
  } catch { return _coordsCache.data || [] }
}

// ── GET ──

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get("city")

  if (!city) {
    return NextResponse.json({ error: "city required" }, { status: 400 })
  }

  try {
    const supabase = getAdminClient()

    const { data } = await supabase
      .from("district_registry")
      .select("district,city,uf")
      .ilike("city", `%${city}%`)
      .limit(200)

    if (!data?.length) {
      return NextResponse.json({ municipios: [], city, source: "none" })
    }

    // Load coordinate dataset (cached 24h)
    const coords = await getMunicipioCoords()

    // UF code → UF letter map (IBGE codes)
    const UF_CODES: Record<number, string> = {
      11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
      21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
      31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
      41: 'PR', 42: 'SC', 43: 'RS',
      50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
    }

    const normalize = (s: string) => s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z]/g, "")

    // coordMap keyed by "nome_normalizado|UF" para evitar conflito de municípios homônimos
    // Ex: Viana (ES) ≠ Viana (MA) — sem UF, o Map sobrescrevia o errado
    const coordMap = new Map<string, { lat: number; lng: number }>()

    for (const c of coords) {
      const uf = UF_CODES[c.codigo_uf] || 'XX'
      coordMap.set(`${normalize(c.nome)}|${uf}`, { lat: c.latitude, lng: c.longitude })
    }

    const municipios = data.map((r: any) => {
      const key = `${normalize(r.district)}|${r.uf}`
      const coord = coordMap.get(key) || null

      return {
        nome: r.district,
        cidade: r.city,
        uf: r.uf,
        lat: coord?.lat || null,
        lng: coord?.lng || null,
      }
    })

    const withCoords = municipios.filter((m: any) => m.lat !== null).length

    return NextResponse.json({
      municipios,
      city,
      source: "district_registry",
      coordsSource: "IBGE (municipios-brasileiros dataset)",
      withCoords,
      total: municipios.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
