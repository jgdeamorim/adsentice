// ADSENTICE · POST /api/surface/compose
// Intend -> compose (live data: Materio Qdrant + IBGE + warp-surface-status)
// medido=verdade · zero hardcoded · 2026-07-17

import { NextResponse } from "next/server"
import { compose, composeS10, composeS11 } from "@/lib/warp-composer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"


// ADR-0033 N5 — Quality Gate inline. 5 checks heurísticos. $0.
// Regex dentro de string evita erro de compilação SWC.
function qualityGate(html: string) {
  const roles = html.split('role="').length - 1
  const labels = html.split('aria-label="').length - 1
  const checks: Record<string,boolean> = {
    a11y: roles >= 4 && labels >= 6,
    // font-display swap aplica por CSS (@font-face) OU por URL param do Google Fonts — ambos válidos
    performance: (html.includes("font-display:swap") || html.includes("display=swap")) && html.includes("preconnect"),
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

// ── GET: leads reais p/ o cockpit do Intend Composer v2 (dropdown) + info do endpoint ──
export async function GET() {
  try {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const res = await fetch(
      `${supaUrl}/rest/v1/discovery_listings?select=place_id,title,category,city,district,score_compound,rating_value,rating_votes&order=score_compound.desc&limit=24`,
      { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }, cache: "no-store" }
    )
    const rows = res.ok ? await res.json() : []
    // dedup por place_id — discovery_listings tem duplicatas (1.302 medidas em 2026-07-18;
    // mesma razão do DISTINCT ON nas views v021). Mantém a 1ª (maior score, já ordenado).
    const seen = new Set<string>()
    const leads = (rows as { place_id: string }[]).filter(l => {
      if (seen.has(l.place_id)) return false
      seen.add(l.place_id)
      return true
    })
    return NextResponse.json({
      leads,
      info: "POST { place_id, surface: 'S10'|'S11' } → pipeline real (specialists+estratégias) · POST { surface, segment, plan } → compose() genérico",
    })
  } catch (e: any) {
    return NextResponse.json({ leads: [], error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // REAL PIPELINE S11: composeS11 → par A/B por ESTRATÉGIA (ADR-0037 F6)
    if (body.place_id && body.surface === 'S11') {
      const result = await composeS11(body.place_id)
      if (!result) return NextResponse.json({ error: "Lead not found or S11 generation failed" }, { status: 404 })
      const variants = result.variants.map(v => ({
        ab: v.ab, strategyFacet: v.strategyFacet, hypothesis: v.hypothesis,
        copyModel: v.copyModel, headline: v.headline, html: v.html,
        qualityGate: qualityGate(v.html),
      }))
      return NextResponse.json({
        surface: 'S11', variants, meta: result.meta,
        _meta: { pipeline: "composeS11", source: "Supabase + StrategyResolver + DeepSeek V4" },
      })
    }

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

// (info do endpoint fundida no GET principal acima — leads + info · fix duplicate GET v085)
