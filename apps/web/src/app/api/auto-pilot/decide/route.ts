// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Auto-Pilot Decision API (ADR-0051 #3)
// GET /api/auto-pilot/decide → decisão atual de prospecção
// Brain OODA B2 Self-Score: certainty ≥ 0.80 = automático
// $0 · 2026-07-20
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { autoPilotDecide } from "@/lib/auto-pilot"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await autoPilotDecide()
    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as Error).message?.slice(0, 200) },
      { status: 500 },
    )
  }
}
