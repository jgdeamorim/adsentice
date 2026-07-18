// ══════════════════════════════════════════════════════════════════
// ADSENTICE · S10 Artifacts API — geração explícita (ADR-0038)
// POST /api/s10-artifacts  body: {place_id}  header: x-s10-token
// Para admin/batch pre-warm: gera + publica, retorna meta (sem html).
// medido=verdade · 2026-07-18
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { generateS10Artifact } from "@/lib/s10-artifacts"

export async function POST(req: Request) {
  const token = process.env.S10_GENERATE_TOKEN
  if (!token || req.headers.get("x-s10-token") !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 })
  }

  let body: { place_id?: string }
  try {
    body = await req.json()
  } catch (e: unknown) {
    void e
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  if (!body.place_id) return NextResponse.json({ error: "place_id required" }, { status: 400 })

  const t0 = Date.now()
  const served = await generateS10Artifact(body.place_id)
  if (!served) return NextResponse.json({ error: "lead not found or pipeline failed" }, { status: 404 })

  const a = served.artifact
  return NextResponse.json({
    place_id: a.place_id,
    version: a.version,
    status: a.status,
    blob_key: a.blob_key,
    headline: a.headline,
    copy_model: a.copy_model,
    qg_composite: a.qg_composite,
    qg_passed: a.qg_passed,
    expires_at: a.expires_at,
    generation_ms: Date.now() - t0,
    view_url: `/s10-raio-x/${a.place_id}`,
  })
}
