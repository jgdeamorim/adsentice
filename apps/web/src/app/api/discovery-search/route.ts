// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/discovery-search
// Bridge: client component → EVO-API MCP :7700 → DataForSEO LIVE
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { businessListingsSearch } from "@/lib/evo-mcp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { categories, lat, lng, radiusKm, limit } = body

  if (!categories?.length) {
    return NextResponse.json({ error: "categories required" }, { status: 400 })
  }

  try {
    const result = await businessListingsSearch({
      categories,
      lat: lat || -23.5505,
      lng: lng || -46.6333,
      radiusKm: radiusKm || 10,
      limit: limit || 50,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "EVO-API MCP unavailable" },
      { status: 500 }
    )
  }
}
