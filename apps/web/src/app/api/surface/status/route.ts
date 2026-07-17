// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/surface/status
// Retorna status das 22 superfícies Warp (ADR-0031).
// $0 — JSON estático + filesystem checks. 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface SurfaceDef {
  id: string; name: string; group: string; plan: string
  segment: string; skills: string[]; tokens: string[]
  status: string; route: string | null; warpModule: string | null
  previews: number
}

export async function GET() {
  try {
    const jsonPath = join(process.cwd(), "..", "..", "docs", "spec", "warp-surface-status.json")
    const raw = readFileSync(jsonPath, "utf-8")
    const data = JSON.parse(raw)

    const surfaces: SurfaceDef[] = data.surfaces || []

    // Enrich with live filesystem checks
    const enriched = surfaces.map((s: SurfaceDef) => {
      let routeLive = false
      let warpCode = false

      // Check if admin route exists
      if (s.route) {
        try {
          const pagePath = join(process.cwd(), "src", "app", "[lang]", "(dashboard)", "(private)", "admin", s.route.replace("/admin/", ""), "page.tsx")
          readFileSync(pagePath)
          routeLive = true
        } catch { /* route file doesn't exist */ }
      }

      // Check if Warp module exists
      if (s.warpModule) {
        try {
          const warpPath = join(process.cwd(), "..", "..", "packages", "warp", "src", s.warpModule)
          readFileSync(warpPath)
          warpCode = true
        } catch { /* warp module doesn't exist */ }
      }

      return {
        ...s,
        routeLive,
        warpCode,
        isLive: s.status === "live" || routeLive || warpCode,
      }
    })

    const summary = {
      total: enriched.length,
      live: enriched.filter(s => s.isLive).length,
      partial: enriched.filter(s => s.status === "partial" && !s.isLive).length,
      planned: enriched.filter(s => s.status === "planned" && !s.isLive).length,
      byGroup: {
        client: enriched.filter(s => s.group === "client").length,
        internal: enriched.filter(s => s.group === "internal").length,
        commercial: enriched.filter(s => s.group === "commercial").length,
        acquisition: enriched.filter(s => s.group === "acquisition").length,
        technical: enriched.filter(s => s.group === "technical").length,
      },
      liveByGroup: {
        client: enriched.filter(s => s.group === "client" && s.isLive).length,
        internal: enriched.filter(s => s.group === "internal" && s.isLive).length,
        commercial: enriched.filter(s => s.group === "commercial" && s.isLive).length,
      },
      warpModules: enriched.filter(s => s.warpCode).length,
      previewsTotal: enriched.reduce((sum, s) => sum + s.previews, 0),
    }

    return NextResponse.json({ surfaces: enriched, summary })
  } catch (e: any) {
    return NextResponse.json({ surfaces: [], summary: null, error: e.message }, { status: 500 })
  }
}
