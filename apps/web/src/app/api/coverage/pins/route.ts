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

    // Resolve city name from lat/lng (nearest capital heuristic)
    const CAPITALS: [string, number, number][] = [
      ["São Paulo", -23.55, -46.63],
      ["Rio de Janeiro", -22.91, -43.17],
      ["Belo Horizonte", -19.92, -43.93],
      ["Brasília", -15.78, -47.93],
      ["Salvador", -12.97, -38.50],
      ["Fortaleza", -3.72, -38.54],
      ["Curitiba", -25.43, -49.27],
      ["Porto Alegre", -30.03, -51.22],
      ["Recife", -8.05, -34.88],
      ["Manaus", -3.12, -60.02],
    ]
    const resolveCity = (lat: number, lng: number): string => {
      let best = CAPITALS[0]
      let bestDist = Infinity
      for (const c of CAPITALS) {
        const d = Math.abs(lat - c[1]) + Math.abs(lng - c[2]) * 0.5 // lng weighted less
        if (d < bestDist) { bestDist = d; best = c }
      }
      return bestDist < 3 ? best[0] : `${lat.toFixed(1)}, BR`
    }

    const pins = data.map((r: any) => ({
      id: r.id,
      lat: parseFloat(r.lat as any),
      lng: parseFloat(r.lng as any),
      radiusKm: r.radius_km || 10,
      categories: r.categories || [],
      city: resolveCity(parseFloat(r.lat as any), parseFloat(r.lng as any)),
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
