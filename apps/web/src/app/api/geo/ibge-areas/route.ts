// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/geo/ibge-areas
// Retorna área_km2 por município do ibge_panorama (server-side).
// Usado pelo pre-flight para calcular raio inteligente por área real.
// $0 — Supabase read-only. ADR-0030 · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data } = await supabase
      .from("ibge_panorama")
      .select("municipio_nome,area_km2")
      .not("area_km2", "is", null)
      .limit(600)

    if (!data?.length) {
      return NextResponse.json({ areas: {} })
    }

    const areas: Record<string, number> = {}
    const normalize = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")

    for (const r of data) {
      if (r.area_km2) {
        areas[normalize(r.municipio_nome)] = r.area_km2
      }
    }

    return NextResponse.json({ areas })
  } catch (e: any) {
    return NextResponse.json({ areas: {} }, { status: 500 })
  }
}
