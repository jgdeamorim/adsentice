// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/cnpj/stats — CNPJ queue KPIs
// ADR-0028 · medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

import { getCnpjStats } from "@/lib/cnpj-queue"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const stats = getCnpjStats()

    return NextResponse.json(stats)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
