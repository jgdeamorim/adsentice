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
import { getSurfaceSpecialist } from "../../../../../../../packages/warp/src/4-composer"

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
          if (s.route.startsWith("/admin/")) {
            // rotas admin (page.tsx dentro do grupo MUI)
            readFileSync(join(process.cwd(), "src", "app", "[lang]", "(dashboard)", "(private)", "admin", s.route.replace("/admin/", ""), "page.tsx"))
          } else {
            // rotas públicas standalone (route.ts — S10/S11 outbound, ADR-0038)
            readFileSync(join(process.cwd(), "src", "app", ...s.route.split("/").filter(Boolean), "route.ts"))
          }
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

    // Source 4: Surface Router — specialists registrados (g0: gramática por surface)
    const specialists = ["S10", "S11"].map(id => {
      const sp = getSurfaceSpecialist(id)
      if (!sp) return null
      let slots: { name: string; type: string; objective: string | null }[] = []
      try {
        const tree = sp.inferLayout({} as any, [] as any) as any
        slots = Object.entries(tree?.slots || {}).map(([name, def]: [string, any]) => ({
          name, type: def?.type || "", objective: def?.objective || null,
        }))
      } catch (e: unknown) { void e }
      return { surfaceId: sp.surfaceId, name: sp.name, skills: sp.skills, slots }
    }).filter(Boolean)

    // Source 5: Série de artefatos (ADR-0038 — o que está PUBLICADO por surface)
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const supaHeaders = { apikey: supaKey, Authorization: `Bearer ${supaKey}` }
    let artifacts: any[] = []
    try {
      const ar = await fetch(`${supaUrl}/rest/v1/s10_artifacts?select=place_id,surface,version,ab_variant,status,copy_model,headline,subtitle,expires_at,generated_at&order=generated_at.desc&limit=24`, { headers: supaHeaders, cache: "no-store" })
      if (ar.ok) artifacts = await ar.json()
    } catch (e: unknown) { void e }

    // Source 6: Conversão A/B por estratégia (s11_events — loop f0)
    let conversion: any = null
    try {
      const ev = await fetch(`${supaUrl}/rest/v1/s11_events?select=surface,ab_variant,event&limit=2000`, { headers: supaHeaders, cache: "no-store" })
      if (ev.ok) {
        const rows = await ev.json() as { surface: string; ab_variant: string | null; event: string }[]
        const agg: Record<string, { views: number; clicks: number }> = {}
        for (const r of rows) {
          const k = `${r.surface}:${r.ab_variant || "-"}`
          agg[k] = agg[k] || { views: 0, clicks: 0 }
          if (r.event === "view") agg[k].views++
          if (r.event === "cta_click") agg[k].clicks++
        }
        conversion = Object.entries(agg).map(([k, v]) => {
          const [surface, variant] = k.split(":")
          // estratégia da variante vem da série (subtitle = hypothesis, headline = copy)
          const art = artifacts.find(a => a.surface === surface && a.ab_variant === variant)
          return {
            surface, variant, views: v.views, clicks: v.clicks,
            rate: v.views > 0 ? Math.round((v.clicks / v.views) * 1000) / 10 : 0,
            hypothesis: art?.subtitle || null,
            headline: art?.headline || null,
          }
        }).sort((x, y) => x.surface.localeCompare(y.surface) || x.variant.localeCompare(y.variant))
      }
    } catch (e: unknown) { void e }

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

    return NextResponse.json({ surfaces: enriched, summary, specialists, artifacts, conversion })
  } catch (e: any) {
    return NextResponse.json({ surfaces: [], summary: null, error: e.message }, { status: 500 })
  }
}
