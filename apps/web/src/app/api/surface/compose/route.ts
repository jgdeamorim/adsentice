// ADSENTICE · POST /api/surface/compose
// Intend -> compose (live data: Materio Qdrant + IBGE + warp-surface-status)
// medido=verdade · zero hardcoded · 2026-07-17

import { NextResponse } from "next/server"
import { compose, composeS10 } from "@/lib/warp-composer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// ADR-0033 N5 — Quality Gate inline. 5 checks heurísticos. $0.
// Regex dentro de string evita erro de compilação SWC.
function qualityGate(html: string) {
  const roles = html.split('role="').length - 1
  const labels = html.split('aria-label="').length - 1
  const checks: Record<string,boolean> = {
    a11y: roles >= 4 && labels >= 6,
    performance: html.includes("font-display:swap") && html.includes("preconnect"),
    schema: html.includes("application/ld+json") && html.includes('"name":"'),
    semantic: html.includes("<header ") && html.includes("<main ") && html.includes("<footer"),
    responsive: html.includes("viewport") && html.includes("@media"),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { passed: score >= 4, score, checks,
    details: {
      a11y: roles+" roles, "+labels+" labels",
      performance: "font-display:"+html.includes("font-display:swap")+" preconnect:"+html.includes("preconnect"),
      schema: "JSON-LD:"+html.includes("application/ld+json"),
      semantic: "header:"+html.includes("<header ")+" main:"+html.includes("<main ")+" footer:"+html.includes("<footer"),
      responsive: "viewport:"+html.includes("viewport")+" @media:"+html.includes("@media"),
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // REAL PIPELINE: composeS10 with place_id
    if (body.place_id) {
      const result = await composeS10(body.place_id)
      if (!result) return NextResponse.json({ error: "Lead not found or S10 generation failed" }, { status: 404 })
      // HTML limpo (cliente) + meta sidecar (trace interno — ADR-0033 N4.4, padrão s10_generator.py)
      const qg = qualityGate(result.html)
      const metaWithQG = { ...(result.meta as Record<string,unknown>), qualityGate: qg }
      return NextResponse.json({ html: result.html, meta: metaWithQG, _meta: { pipeline: "composeS10", source: "Supabase + DeepSeek V4" } })
    }

    // GENERIC COMPOSER: compose with Intend (no real data)
    const intend = {
      surface: body.surface || 'S10',
      segment: body.segment || 'saude',
      plan: body.plan || 'internal',
      mode: body.mode || 'internal',
      niche: body.niche || undefined,
      region: body.region || undefined,
      leadData: body.leadData || undefined,
      tags: body.tags || [],
    }

    // Load IBGE context from Supabase if region is specified
    let ibgeContext: { densidade?: number; pibPerCapita?: number; areaKm2?: number } | undefined
    if (intend.region) {
      try {
        const { getAdminClient } = await import("@/lib/supabase-admin")
        const supabase = getAdminClient()
        const { data } = await supabase.from("ibge_panorama")
          .select("densidade_demografica,pib_per_capita,area_km2")
          .eq("uf", intend.region).limit(1)
        if (data?.length) {
          ibgeContext = {
            densidade: data[0].densidade_demografica,
            pibPerCapita: data[0].pib_per_capita,
            areaKm2: data[0].area_km2,
          }
        }
      } catch { /* IBGE offline — proceed without context */ }
    }

    const output = await compose(intend, ibgeContext)

    return NextResponse.json({
      ...output,
      _meta: {
        latencyMs: output.renderMs,
        endpoint: 'POST /api/surface/compose',
        sourcesBasis: output.tokens.sourcesBasis,
        medido: 'Materio Qdrant (36 tokens) + IBGE panorama + warp-surface-status.json',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Compose failed" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST /api/surface/compose — Intend → compose (live data sources)",
    example: {
      surface: "S10", segment: "saude", plan: "internal", mode: "internal",
      niche: "dentist", region: "ES",
      leadData: { title: "Dra. Karina", score: 65, city: "Vitória" },
    },
    sourcesBasis: [
      "Materio Qdrant (36 design tokens: palette, typography, spacing, shadow)",
      "IBGE panorama (area_km2, densidade_demografica, pib_per_capita)",
      "warp-surface-status.json (22 superficies × skills × planos)",
      "category_analytics Supabase (segmentos reais do mercado)",
    ],
  })
}
