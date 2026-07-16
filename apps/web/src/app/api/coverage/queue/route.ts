// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/coverage/queue?category=dentist&city=Rio+de+Janeiro
//                GET /api/coverage/queue?category=dentist  (→ rank states)
// Auto-Pilot Decision Engine — State Scorer + Target Scorer
// ADR-0023 Layer 2 · medido=verdade · 2026-07-16
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { buildDiscoveryQueue } from "@/lib/target-scorer"
import { rankStates } from "@/lib/state-scorer"

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
    // Sem cidade → retorna ranking de estados + fila do melhor estado
    if (!city) {
      const ranking = await rankStates(category)
      if (!ranking) {
        return NextResponse.json({ error: "no data" }, { status: 404 })
      }

      // Constrói fila de distritos para o estado #1
      const bestCity = ranking.topPick.capital
      const queue = await buildDiscoveryQueue(category, bestCity)

      return NextResponse.json({
        mode: "state-ranking",
        ranking,
        queue,
        suggestion: {
          state: ranking.topPick.stateName,
          city: bestCity,
          reason: ranking.meta.bestOpportunity,
          action: `Mapear ${bestCity} primeiro — ${ranking.topPick.totalBusinesses.toLocaleString("pt-BR")} negócios estimados, ${ranking.topPick.coveragePct}% coberto`,
        },
      })
    }

    // Com cidade → fila de distritos tradicional
    const queue = await buildDiscoveryQueue(category, city)
    return NextResponse.json({ mode: "city-queue", queue })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
