// ══════════════════════════════════════════════════════════════════
// ADSENTICE · GET /api/discovery/sessions
// Retorna histórico com contexto real: cidade, batch summary, TTL.
// ADR-0029 v2 · 2026-07-17
// ══════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"
import { execSync } from "child_process"

function redisCli(cmd: string): string {
  try { return execSync(`redis-cli -p 6396 ${cmd}`, { encoding: "utf8", timeout: 3000 }).trim() }
  catch { return "" }
}

const CAPITALS: Record<string, [number, number]> = {
  SP: [-23.55, -46.63], RJ: [-22.91, -43.17], ES: [-20.32, -40.34],
  MG: [-19.92, -43.93], DF: [-15.78, -47.93], BA: [-12.97, -38.50],
  CE: [-3.72, -38.53], PE: [-8.05, -34.88], PR: [-25.43, -49.27],
  RS: [-30.03, -51.23], AM: [-3.12, -60.03], PA: [-1.46, -48.48],
  GO: [-16.68, -49.25], MA: [-2.53, -44.30], AL: [-9.67, -35.73],
  RN: [-5.80, -35.21], PI: [-5.09, -42.80], PB: [-7.12, -34.86],
  MT: [-15.60, -56.10], MS: [-20.44, -54.64], SE: [-10.95, -37.07],
  SC: [-27.60, -48.55], RO: [-8.76, -63.90], AP: [0.03, -51.07],
  AC: [-9.97, -67.81], RR: [2.82, -60.67], TO: [-10.18, -48.33],
}

function resolveCity(lat: number, lng: number): { city: string; uf: string } {
  let bestCity = "Brasil"; let bestUf = "BR"; let bestD = Infinity
  for (const [uf, [clat, clng]] of Object.entries(CAPITALS)) {
    const d = Math.abs(lat - clat) + Math.abs(lng - clng) * 0.5
    if (d < bestD && d < 2.5) { bestD = d; bestCity = uf; bestUf = uf }
  }
  const UF_TO_CITY: Record<string, string> = {
    SP: "São Paulo", RJ: "Rio de Janeiro", ES: "Vitória", MG: "Belo Horizonte",
    DF: "Brasília", BA: "Salvador", CE: "Fortaleza", PE: "Recife",
    PR: "Curitiba", RS: "Porto Alegre", AM: "Manaus", PA: "Belém",
    GO: "Goiânia", MA: "São Luís", AL: "Maceió", RN: "Natal",
    PI: "Teresina", PB: "João Pessoa", MT: "Cuiabá", MS: "Campo Grande",
    SE: "Aracaju", SC: "Florianópolis", RO: "Porto Velho", AP: "Macapá",
    AC: "Rio Branco", RR: "Boa Vista", TO: "Palmas",
  }
  return { city: UF_TO_CITY[bestUf] || bestCity, uf: bestUf }
}

function fmtDateGroup(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dateOnly.getTime() === today.getTime()) return "Hoje"
  if (dateOnly.getTime() === yesterday.getTime()) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

interface SessionRow {
  id: string; categories: string[]; catLabels: string[]
  lat: number; lng: number; radiusKm: number
  totalCount: number; costUsd: number; avgScore: number
  city: string; uf: string
  listingsSaved: number; cacheTtl: number | null; cacheActive: boolean
  trackerId: string; batchId: string | null; isPreflight: boolean
  fetchedCount: number; remaining: number
  pagesFetched: number; offsetsUsed: number[]
  isIncomplete: boolean; createdAt: string
  dateGroup: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ufFilter = searchParams.get("uf")?.toUpperCase() || null
    const preflightsOnly = searchParams.get("preflights") === "true"
    const catFilter = searchParams.get("categories") || null
    const targetCats = catFilter ? catFilter.split(",") : null

    const supabase = getAdminClient()

    const { data: searches, error } = await supabase
      .from("discovery_searches")
      .select("id,categories,lat,lng,radius_km,total_count,cost_usd,avg_score,created_at,search_metadata")
      .order("created_at", { ascending: false })
      .limit(200)

    if (error || !searches) {
      return NextResponse.json({ sessions: [], batches: [], summary: { totalSearches: 0, totalCost: 0, activeCaches: 0 } })
    }

    // ── Pre-flights only (v092 — popup carrega histórico p/ custo real) ──
    if (preflightsOnly) {
      const pfs = searches
        .filter((s: any) => {
          try { const m = typeof s.search_metadata === "string" ? JSON.parse(s.search_metadata) : s.search_metadata; return m?.preflight === true } catch { return false }
        })
        .filter((s: any) => {
          if (!targetCats) return true
          const cats: string[] = s.categories || []
          const overlap = targetCats.filter((tc: string) => cats.includes(tc)).length
          // Pre-flight matcha se pelo menos 80% das cats selecionadas estão no pre-flight
          // E o pre-flight não tem mais que 3 cats extras (senão total_count superestima)
          return overlap >= targetCats.length * 0.5 && cats.length <= targetCats.length + 4
        })
        .slice(0, 20)
        .map((s: any) => {
          let meta: any = {}
          try { meta = typeof s.search_metadata === "string" ? JSON.parse(s.search_metadata) : s.search_metadata || {} } catch {}
          const geo = resolveCity(s.lat, s.lng)
          return {
            id: s.id, categories: s.categories || [], city: meta.city || geo.city,
            total_count: s.total_count, cost_usd: s.cost_usd, created_at: s.created_at,
            search_metadata: meta,
          }
        })
      return NextResponse.json({ preflights: pfs })
    }

    // Resolve all rows
    const rows: SessionRow[] = await Promise.all(searches.map(async (s: any) => {
      const cats = (s.categories || []).sort().join(",")
      const cacheKey = `discovery:${cats}:${s.lat}:${s.lng}:${s.radius_km}`
      const ttlRaw = redisCli(`TTL ${cacheKey}`)
      const cacheTtl = ttlRaw ? parseInt(ttlRaw, 10) : null
      const cacheActive = cacheTtl !== null && cacheTtl > 0

      let listingsSaved = 0
      try {
        const { count } = await supabase.from("discovery_listings").select("id", { count: "exact", head: true }).eq("search_id", s.id)
        listingsSaved = count || 0
      } catch {}

      let trackerId = ""; let fetchedCount = 0; let remaining = 0
      let pagesFetched = 0; let offsetsUsed: number[] = []; let batchId: string | null = null
      let isPreflight = false
      try {
        const meta = typeof s.search_metadata === "string" ? JSON.parse(s.search_metadata) : s.search_metadata
        trackerId = meta?.tracker_id || ""
        fetchedCount = meta?.fetched_count || 0
        remaining = meta?.remaining || 0
        pagesFetched = meta?.pages_fetched || 1
        offsetsUsed = meta?.offsets_used || [0]
        batchId = meta?.batch_id || null
        isPreflight = meta?.preflight === true
      } catch {}

      const geo = resolveCity(s.lat, s.lng)
      const catLabels = (s.categories || []).map((c: string) => {
        const m: Record<string, string> = { dentist: "🦷 Dentista", barber_shop: "💈 Barbearia", beauty_salon: "💇 Salão", psychologist: "🧠 Psicólogo", restaurant: "🍽️ Restaurante", veterinarian: "🐾 Veterinário", medical_aesthetic_clinic: "💉 Estética" }
        return m[c] || c
      })

      return {
        id: s.id, categories: s.categories || [], catLabels,
        lat: s.lat, lng: s.lng, radiusKm: s.radius_km || 10,
        totalCount: s.total_count || 0, costUsd: s.cost_usd || 0,
        avgScore: s.avg_score || 0, city: geo.city, uf: geo.uf,
        listingsSaved, cacheTtl: cacheActive ? cacheTtl : null, cacheActive,
        trackerId, batchId, isPreflight, fetchedCount, remaining,
        pagesFetched, offsetsUsed,
        isIncomplete: remaining > 0,
        createdAt: s.created_at,
        dateGroup: fmtDateGroup(s.created_at),
      }
    }))

    // UF filter (state-aware mode)
    const filteredRows = ufFilter ? rows.filter(r => r.uf === ufFilter) : rows

    // Group by batch_id — separate preflights
    const batchMap = new Map<string, SessionRow[]>()
    const preflightMap = new Map<string, SessionRow[]>()
    const orphans: SessionRow[] = []
    for (const r of filteredRows) {
      if (r.batchId && r.isPreflight) {
        const g = preflightMap.get(r.batchId) || []
        g.push(r); preflightMap.set(r.batchId, g)
      } else if (r.batchId) {
        const g = batchMap.get(r.batchId) || []
        g.push(r); batchMap.set(r.batchId, g)
      } else { orphans.push(r) }
    }

    const batches = [...batchMap.entries()].map(([batchId, items]) => ({
      batchId,
      municipalities: items.map(r => ({
        ...r,
        progressPct: r.totalCount > 0 ? Math.round(((r.fetchedCount || 0) / r.totalCount) * 100) : 100,
      })),
      totalCost: items.reduce((s, r) => s + (r.costUsd || 0), 0),
      totalLeads: items.reduce((s, r) => s + (r.fetchedCount || 0), 0),
      munCount: items.length,
      completeCount: items.filter(r => !r.isIncomplete).length,
      hasIncomplete: items.some(r => r.isIncomplete),
      hasActiveCache: items.some(r => r.cacheActive),
      newestAt: items[0]?.createdAt || "",
      dateGroup: items[0]?.dateGroup || "",
      categories: [...new Set(items.flatMap(r => r.categories))],
      catLabels: [...new Set(items.flatMap(r => r.catLabels))],
      uf: items[0]?.uf || "BR",
      city: items[0]?.city || "Brasil",
      radiusKm: items[0]?.radiusKm || 10,
    }))

    // Build preflight batches
    const preflights = [...preflightMap.entries()].map(([batchId, items]) => ({
      batchId,
      isPreflight: true,
      municipalities: items.map(r => ({
        ...r,
        progressPct: 100,
      })),
      totalCost: items.reduce((s, r) => s + (r.costUsd || 0), 0),
      totalLeads: items.reduce((s, r) => s + (r.totalCount || 0), 0),
      munCount: items.length,
      hasIncomplete: false,
      newestAt: items[0]?.createdAt || "",
      dateGroup: items[0]?.dateGroup || "",
      categories: [...new Set(items.flatMap(r => r.categories))],
      catLabels: [...new Set(items.flatMap(r => r.catLabels))],
      uf: items[0]?.uf || "BR",
      city: items[0]?.city || "Brasil",
      radiusKm: items[0]?.radiusKm || 10,
    }))

    const totalCost = filteredRows.reduce((s, r) => s + (r.costUsd || 0), 0)
    const activeCaches = filteredRows.filter(r => r.cacheActive).length

    return NextResponse.json({
      batches,
      preflights,
      orphans,
      summary: {
        totalSearches: filteredRows.length,
        totalCost: Math.round(totalCost * 10000) / 10000,
        activeCaches,
        incompleteBatches: batches.filter(b => b.hasIncomplete).length,
        preflightCount: preflights.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ batches: [], orphans: [], summary: { totalSearches: 0, totalCost: 0, activeCaches: 0, incompleteBatches: 0 }, error: e.message }, { status: 500 })
  }
}
