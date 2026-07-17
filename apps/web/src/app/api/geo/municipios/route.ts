// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/geo/municipios?city=Rio de Janeiro
// Retorna municípios da Região Metropolitana (district_registry).
// ADR-0025 · medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
      .select("district,city")
      .ilike("city", `%${city}%`)
      .limit(200)

    if (!data?.length) {
      // Fallback: try the OFFICIAL_MUNICIPALITIES from geo-data
      return NextResponse.json({ municipios: [], city, source: "none" })
    }

    const municipios = data.map((r: any) => ({
      nome: r.district,
      cidade: r.city,
    }))

    return NextResponse.json({ municipios, city, source: "district_registry" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
