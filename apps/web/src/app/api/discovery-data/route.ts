// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/discovery-data
// Dados agregados do Discovery para o dashboard (categories, pipeline, costs)
// Fonte: Supabase (primária) → Redis (fallback) → zero fictício
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  // ═══ Supabase (primária — dados duráveis) ═══
  try {
    const { getCategoryAnalytics } = await import("@/lib/discovery-persistence")
    const categories = await getCategoryAnalytics()

    if (categories.length > 0) {
      return NextResponse.json({ source: "supabase", categories })
    }
  } catch { /* Supabase offline or tables not created */ }

  // ═══ Redis (fallback — último cache de 24h) ═══
  try {
    const { execSync } = await import("child_process")
    const raw = execSync("redis-cli -p 6396 --no-auth-warning GET adsentice:discovery:last_score_stats", { timeout: 2000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim()

    if (raw) {
      const stats = JSON.parse(raw)

      return NextResponse.json({
        source: "redis",
        scoreStats: {
          total: stats.total || 0,
          avgScore: stats.avgScore || 0,
          unaware: stats.unaware || 0,
          problemAware: stats.problemAware || 0,
          solutionAware: stats.solutionAware || 0,
          productAware: stats.productAware || 0,
          mostAware: stats.mostAware || 0,
        },
      })
    }
  } catch { /* Redis offline */ }

  // ═══ No data yet ═══
  return NextResponse.json({ source: "none", message: "Execute a 1ª descoberta no Discovery Engine" })
}
