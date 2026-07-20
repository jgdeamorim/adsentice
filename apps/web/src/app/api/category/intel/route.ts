// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Category Intelligence API (ADR-0050)
// GET /api/category/intel            → todas as 29 categorias
// GET /api/category/intel?cat=dentist → 1 categoria detalhada
// GET /api/category/intel?quick=true  → top 5 oportunidades (rápido)
// $0 · Qdrant + Supabase · 2026-07-20
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getCategoryIntelligence, getCategoryOpportunityQuick } from "@/lib/category-intel"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const cat = url.searchParams.get("cat")
    const quick = url.searchParams.get("quick") === "true"

    if (quick) {
      const top = await getCategoryOpportunityQuick()
      return NextResponse.json({ top, total: top.length, mode: "quick" })
    }

    const intel = await getCategoryIntelligence(cat || undefined)
    if (!intel.length) {
      return NextResponse.json({ error: "No category data. Run discovery first." }, { status: 404 })
    }

    if (cat) {
      return NextResponse.json(intel[0])
    }

    const summary = {
      totalCategories: intel.length,
      avgOpportunityScore: Math.round(intel.reduce((s, ci) => s + ci.opportunity.score, 0) / intel.length),
      totalLeadsDiscovered: intel.reduce((s, ci) => s + ci.coverage.totalDiscovered, 0),
      totalUniquePlaces: intel.reduce((s, ci) => s + ci.coverage.uniquePlaceIds, 0),
      topOpportunity: intel[0]?.category || null,
      categoriesWithGaps: intel.filter(ci => ci.coverage.gaps.length > 0).length,
      marketingEnriched: intel.filter(ci => ci.marketingIntel.enriched).length,
    }

    return NextResponse.json({ categories: intel, summary })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message?.slice(0, 200) }, { status: 500 })
  }
}
