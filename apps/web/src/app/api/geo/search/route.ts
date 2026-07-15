// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/geo/search?q=Pinheiros+São+Paulo
// Geocoding wrapper — chama Nominatim (server-side) via geo-resolver.
// medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { searchCity } from "@/lib/geo-resolver"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "query 'q' required (min 2 chars)" }, { status: 400 })
  }

  try {
    const result = await searchCity(q)
    if (!result) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
