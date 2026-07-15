// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/coverage/queue?category=dentist&city=Rio+de+Janeiro
// Auto-Pilot Decision Engine — Target Scorer via Target Scorer
// ADR-0023 Layer 2 · medido=verdade · 2026-07-15
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { buildDiscoveryQueue } from "@/lib/target-scorer"
import { listCoveredCities } from "@/lib/coverage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")
  const city = searchParams.get("city")

  if (!category) {
    // Sem categoria → retorna cidades cobertas
    try {
      const cities = await listCoveredCities()
      return NextResponse.json({ cities })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  try {
    const queue = await buildDiscoveryQueue(category, city || "Rio de Janeiro")
    return NextResponse.json(queue)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
