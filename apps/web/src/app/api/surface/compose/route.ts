// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/surface/compose
// Recebe um Intend → executa composer-core (Warp) → retorna HTML.
// ADR-0032 · medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { compose } from "@/lib/warp-composer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const intend = {
      surface: body.surface || 'S10',
      segment: body.segment || 'saude',
      plan: body.plan || 'internal',
      mode: body.mode || 'internal',
      niche: body.niche || undefined,
      region: body.region || undefined,
      leadData: body.leadData || undefined,
      tags: body.tags || [],
    }

    const t0 = performance.now()
    const output = compose(intend)
    const latencyMs = Math.round(performance.now() - t0)

    return NextResponse.json({
      ...output,
      _meta: { latencyMs, endpoint: 'POST /api/surface/compose' },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Compose failed" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST /api/surface/compose — recebe Intend, retorna HTML composto + tokens morph",
    example: {
      surface: "S10",
      segment: "saude",
      plan: "internal",
      mode: "internal",
      niche: "dentist",
      region: "ES",
      leadData: { title: "Dra. Karina", score: 65, city: "Vitória" },
    },
  })
}
