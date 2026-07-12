// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/competitive-benchmark
// Benchmark competitivo: lead vs TOP 5 concorrentes no raio
// ══════════════════════════════════════════════════════════════════

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"

import { businessListingsSearch } from "@/lib/evo-mcp"
import { scoreLeads } from "@/lib/scoring"
import { getCached, setCache } from "@/lib/discovery-cache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { lat, lng, radiusKm, categories, lead_place_id } = body

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 })
  }

  const cat = categories?.length ? categories : ["dentist"]
  const cacheKey = `benchmark:${cat.sort().join(',')}:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusKm || 10}`

  // Check cache
  const cached = getCached(cacheKey)

  if (cached) return NextResponse.json(cached)

  try {
    const result = await businessListingsSearch({
      categories: cat,
      lat, lng,
      radiusKm: radiusKm || 10,
      limit: 20,
    })

    if (!result.listings.length) {
      return NextResponse.json({ error: "No competitors found" }, { status: 404 })
    }

    // Score all listings
    const scores = scoreLeads(result.listings)
    const enriched = result.listings.map((l, i) => ({ ...l, score: scores[i] }))

    // Separate lead from competitors
    const lead = enriched.find(l => l.place_id === lead_place_id) || enriched[0]
    const competitors = enriched.filter(l => l.place_id !== lead.place_id)

    // TOP 5 by compound score
    const top5 = [...competitors]
      .sort((a, b) => (b.score?.compound ?? 0) - (a.score?.compound ?? 0))
      .slice(0, 5)

    // Compute market averages
    const count = competitors.length || 1

    const market_avg = {
      rating: competitors.reduce((s, c) => s + (c.rating_value ?? 0), 0) / count,
      reviews: competitors.reduce((s, c) => s + (c.rating_votes ?? 0), 0) / count,
      claimed_pct: (competitors.filter(c => c.is_claimed).length / count) * 100,
    }

    // Compute gaps
    const gaps: string[] = []
    const lr = lead.rating_value ?? 0
    const mr = market_avg.rating

    if (lr < mr) gaps.push(`Rating ${lr.toFixed(1)} vs média ${mr.toFixed(1)} — abaixo do mercado`)
    if (!lead.is_claimed && market_avg.claimed_pct > 70) gaps.push(`Perfil NÃO reivindicado — ${Math.round(market_avg.claimed_pct)}% dos concorrentes são`)
    const top1score = top5[0]?.score?.compound ?? 0
    const leadScore = lead.score?.compound ?? 0

    if (leadScore < top1score - 10) gaps.push(`Score ${leadScore} vs Top 1 ${top1score} — diferença significativa`)

    const lead_rank = competitors.filter(c => (c.rating_value ?? 0) >= lr).length + 1

    const response = {
      lead_rank: Math.min(lead_rank, top5.length + 1),
      lead_metrics: {
        rating: lr, reviews: lead.rating_votes ?? 0, score: leadScore,
        claimed: lead.is_claimed ? 1 : 0,
      },
      market_avg,
      top_competitors: top5.map(c => ({
        title: c.title,
        rating_value: c.rating_value,
        rating_votes: c.rating_votes,
        is_claimed: c.is_claimed,
        score: c.score?.compound,
        schwartz_label: c.score?.schwartz.label,
      })),
      gaps,
    }

    setCache(cacheKey, response)
    
return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Benchmark unavailable" },
      { status: 500 }
    )
  }
}
