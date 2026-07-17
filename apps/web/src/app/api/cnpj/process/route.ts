// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/cnpj/process — processa lote CNPJ (cron)
// Chamado pelo cron a cada 2 minutos. Processa 3 leads por ciclo.
// ADR-0028 · medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

import { processQueue } from "@/lib/cnpj-queue"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const result = await processQueue(3)

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
