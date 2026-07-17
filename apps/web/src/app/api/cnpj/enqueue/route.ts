// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/cnpj/enqueue — enfileira leads com website
// ADR-0028 · medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

import { enqueueLeads } from "@/lib/cnpj-queue"
import { getAdminClient } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    // Busca leads com website ainda não enriquecidos
    const supabase = getAdminClient()
    const { data } = await supabase
      .from("discovery_listings")
      .select("place_id,website")
      .not("website", "is", null)
      .limit(200)

    if (!data?.length) {
      return NextResponse.json({ enqueued: 0, message: "No leads with website" })
    }

    const count = enqueueLeads(
      data.map((l: any) => ({ place_id: l.place_id, website: l.website }))
    )

    return NextResponse.json({ enqueued: count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
