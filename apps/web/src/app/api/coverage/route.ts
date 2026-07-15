// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/coverage?category=dentist&city=Rio+de+Janeiro
// Discovery Auto-Pilot Layer 1 — medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getCoverage } from "@/lib/coverage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const city = searchParams.get("city")

  if (!category) {
    return NextResponse.json({ error: "category required" }, { status: 400 })
  }

  try {
    const report = await getCoverage(category, city || "Rio de Janeiro")
    return NextResponse.json(report || { coveragePct: 0, districtsFound: 0, totalDistrictsEstimate: 0, mapped: [], gaps: [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
