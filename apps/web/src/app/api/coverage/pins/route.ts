// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/coverage/pins
// Retorna pins de todas as searches para o mapa Discovery.
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from("discovery_searches")
      .select("id,categories,lat,lng,radius_km,total_count,avg_score,created_at")
      .not("total_count", "eq", 0)
      .order("created_at", { ascending: false })
      .limit(200)

    if (error || !data) {
      return NextResponse.json({
        pins: [],
        summary: { totalSearches: 0, totalCities: 0, avgCoverage: 0 },
      })
    }

    // Resolve city name from lat/lng (usando heurística simples)
    const resolveCity = (lat: number): string => {
      if (Math.abs(lat + 23.55) < 1) return "São Paulo"
      if (Math.abs(lat + 22.9) < 1) return "Rio de Janeiro"
      if (Math.abs(lat + 19.9) < 1) return "Belo Horizonte"
      if (Math.abs(lat + 15.8) < 1) return "Brasília"
      if (Math.abs(lat + 12.9) < 1) return "Salvador"
      if (Math.abs(lat + 25.4) < 1) return "Curitiba"
      if (Math.abs(lat + 30.0) < 1) return "Porto Alegre"
      return `${lat.toFixed(1)}, Brasil`
    }

    const pins = data.map((r: any) => ({
      id: r.id,
      lat: parseFloat(r.lat as any),
      lng: parseFloat(r.lng as any),
      radiusKm: r.radius_km || 10,
      categories: r.categories || [],
      city: resolveCity(parseFloat(r.lat as any)),
      totalCount: r.total_count || 0,
      avgScore: r.avg_score || 0,
      createdAt: r.created_at,
    }))

    const cities = new Set(pins.map((p: any) => p.city))

    return NextResponse.json({
      pins,
      summary: {
        totalSearches: pins.length,
        totalCities: cities.size,
        cities: [...cities],
        totalCoverage: pins.reduce((s: number, p: any) => s + p.totalCount, 0),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ pins: [], summary: { totalSearches: 0, totalCities: 0 } })
  }
}
