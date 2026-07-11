// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/diagnostic
// RSXT L0→L5 Doctrine Pipeline · LLM = ÁRBITRO (L6) NUNCA EXTRATOR
// ══════════════════════════════════════════════════════════════════
//
// Pipeline decisório:
//   L0 · ESTRUTURAL   → extrai domínio, valida URL (µs)
//   L1 · ESTATÍSTICO   → cache hit? já analisado? (µs-ms)
//   L2 · DETERMINÍSTICO → ANTI-ICP filter, credit gate (µs)
//   L3 · SENSOR         → Qdrant busca similares (ms) — NUNCA decide
//   L4 · GRAPH          → KG traversal → quais pipelines (ms)
//   L5 · BOA            → cost/benefit consensus (ms)
//   L6 · LLM ÁRBITRO    → SÓ se L0-L5 não bastarem (delegado ao caller)
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { runL0L5Pipeline } from "@/lib/pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 55

export async function POST(request: NextRequest) {
  const { url } = (await request.json()) as { url?: string }

  if (!url) {
    return NextResponse.json({ error: "url é obrigatório" }, { status: 400 })
  }

  // L0→L5 pipeline + DataForSEO + mount cards
  const { result } = await runL0L5Pipeline(url)

  return NextResponse.json(result)
}
