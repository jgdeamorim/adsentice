// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/surface/status
// Retorna status vivo das 22 superfícies Warp (ADR-0031 + ADR-0032).
// Fontes: warp-surface-status.json + filesystem + Qdrant live.
// $0 · medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { readFileSync } from "fs"
import { join } from "path"
import { getWarpKgStats } from "@/lib/warp-kg"

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
    // Source 1: JSON estático (22 superfícies definidas)
    const jsonPath = join(process.cwd(), "..", "..", "docs", "spec", "warp-surface-status.json")
    const raw = readFileSync(jsonPath, "utf-8")
    const data = JSON.parse(raw)
    const surfaces: SurfaceDef[] = data.surfaces || []

    // Source 2: Qdrant live (skills, componentes, design, materio)
    const kgStats = await getWarpKgStats()

    // Source 3: Filesystem checks
    const enriched = surfaces.map((s: SurfaceDef) => {
      let routeLive = false; let warpCode = false; let warpLines = 0

      if (s.route) {
        try {
          readFileSync(join(process.cwd(), "src", "app", "[lang]", "(dashboard)", "(private)", "admin", s.route.replace("/admin/", ""), "page.tsx"))
          routeLive = true
        } catch {}
      }

      if (s.warpModule) {
        try {
          const warpPath = join(process.cwd(), "..", "..", "packages", "warp", "src", s.warpModule)
          const warpContent = readFileSync(warpPath, "utf-8")
          warpCode = true
          warpLines = warpContent.split("\n").length
        } catch {}
      }

      // Skill wire status: skill está embedada no Qdrant?
      const skillsWired = kgStats
        ? s.skills.filter(skill =>
            Object.keys(kgStats.skillsBySurface).some(k => k.includes(skill))
          ).length
        : 0

      return {
        ...s,
        routeLive,
        warpCode,
        warpLines,
        isLive: s.status === "live" || routeLive || warpCode,
        skillsTotal: s.skills.length,
        skillsWired,
        skillsWiredPct: s.skills.length > 0 ? Math.round((skillsWired / s.skills.length) * 100) : 0,
      }
    })

    // Summary
    const byGroup = (group: string) => enriched.filter(s => s.group === group)
    const liveByGroup = (group: string) => enriched.filter(s => s.group === group && s.isLive).length

    const summary = {
      total: enriched.length,
      live: enriched.filter(s => s.isLive).length,
      partial: enriched.filter(s => s.status === "partial" && !s.isLive).length,
      planned: enriched.filter(s => s.status === "planned" && !s.isLive).length,
      progressPct: Math.round((enriched.filter(s => s.isLive).length / enriched.length) * 100),
      groups: {
        client: { total: byGroup("client").length, live: liveByGroup("client") },
        internal: { total: byGroup("internal").length, live: liveByGroup("internal") },
        commercial: { total: byGroup("commercial").length, live: liveByGroup("commercial") },
        acquisition: { total: byGroup("acquisition").length, live: liveByGroup("acquisition") },
        technical: { total: byGroup("technical").length, live: liveByGroup("technical") },
      },
      warpModulesTotal: enriched.filter(s => s.warpCode).length,
      warpLinesTotal: enriched.reduce((sum, s) => sum + s.warpLines, 0),
      previewsTotal: enriched.reduce((sum, s) => sum + s.previews, 0),
      routesLive: enriched.filter(s => s.routeLive).length,
      // Qdrant live stats
      qdrantLive: !!kgStats,
      kgStats: kgStats ? {
        skillsTotal: kgStats.skillsTotal,
        componentsTotal: kgStats.componentsTotal,
        designKnowledgeTotal: kgStats.designKnowledgeTotal,
        snippetsTotal: kgStats.snippetsTotal,
        materioTokensTotal: kgStats.materioTokensTotal,
        materioCategories: kgStats.materioCategories,
        corpusTotal: kgStats.skillsTotal + kgStats.componentsTotal + kgStats.designKnowledgeTotal + kgStats.snippetsTotal,
      } : null,
    }

    return NextResponse.json({ surfaces: enriched, summary })
  } catch (e: any) {
    return NextResponse.json({ surfaces: [], summary: null, error: e.message }, { status: 500 })
  }
}
