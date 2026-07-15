// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Market Intelligence Engine v0.7
// ADR-0009: agrega dados existentes por categoria × região
// Usa Supabase admin client (@supabase/supabase-js) via HTTPS/443.
// ZERO pg Pool (porta 6543 bloqueada).
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { getAdminClient } from "./supabase-admin"

export interface MarketOverview {
  category: string; categoryLabel: string; city: string
  totalBusinesses: number; enrichedBusinesses: number
  avgScore: number; avgRating: number; avgPhotos: number
  claimedPct: number; hasWebsitePct: number; hasAnalyticsPct: number
  schwartzDistribution: { level: number; label: string; count: number; pct: number }[]
  contentMaturity: { level: number; label: string; count: number; pct: number }[]
}
export interface MarketGap {
  rank: number; signal: string; signalLabel: string
  affectedPct: number; affectedCount: number
  severity: "critico" | "alto" | "medio" | "baixo"; opportunity: string
}
export interface MarketOpportunity {
  category: string; categoryLabel: string; city: string
  totalAddressableMarket: number; penetratedBusinesses: number
  penetrationPct: number; avgTicketEstimate: number; revenuePotentialMRR: number
}
export interface CompetitiveDensity {
  category: string; categoryLabel: string; city: string
  totalCompetitors: number; areaKm2: number; densityPerKm2: number
  saturation: "baixa" | "media" | "alta" | "saturada"
  avgRating: number; topRatedPct: number
}
export interface NicheIntelligence {
  overview: MarketOverview; gaps: MarketGap[]
  opportunity: MarketOpportunity; density: CompetitiveDensity
  recommendedActions: { action: string; impact: string; targetPct: number }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  dentist: "Dentista", orthodontist: "Ortodontista",
  medical_aesthetic_clinic: "Clinica Estetica", medical_clinic: "Clinica Medica",
  restaurant: "Restaurante", gym: "Academia", lawyer: "Advogado",
  beauty_salon: "Salao de Beleza", pharmacy: "Farmacia", veterinarian: "Veterinario",
  pet_store: "Pet Shop", accountant: "Contador", car_repair: "Oficina Mecanica",
  psychologist: "Psicologo", physical_therapist: "Fisioterapeuta",
  electrician: "Eletricista", plumber: "Encanador", cleaning_service: "Servico de Limpeza",
  school: "Escola", driving_school: "Autoescola", hotel: "Pousada/Hotel",
  barber_shop: "Barbearia", architect: "Arquiteto", interior_designer: "Designer de Interiores",
  ophthalmologist: "Oftalmologista", cardiologist: "Cardiologista", real_estate_agency: "Imobiliaria",
}
const CATEGORY_TICKETS: Record<string, number> = {
  dentist: 500, orthodontist: 800, medical_aesthetic_clinic: 700, medical_clinic: 300,
  restaurant: 50, gym: 120, lawyer: 800, beauty_salon: 80, pharmacy: 30,
  veterinarian: 200, pet_store: 80, accountant: 300, car_repair: 400,
  psychologist: 200, physical_therapist: 180, ophthalmologist: 350, cardiologist: 400,
  architect: 1500, interior_designer: 1200, electrician: 150, plumber: 150,
  cleaning_service: 200, school: 800, driving_school: 250, hotel: 200,
  barber_shop: 45, real_estate_agency: 3000,
}
const SIGNAL_LABELS: Record<string, string> = {
  W1: "Sem HTTPS", W4: "Sem Meta Tags", W5: "Sem Analytics",
  W6: "CMS/Plataforma de Risco", W7: "Sem Blog/Conteudo", W8: "Sem Schema Markup",
  W9: "Backlink Gap", W10: "Baixa Leiturabilidade", W11: "Conteudo Orfao",
  C1: "Conteudo Raso", C2: "Metadata Ausente", C3: "Arquitetura Pobre",
  C4: "Gap Tecnologico", C5: "Sem Estrategia de Conteudo",
  S1: "Sem Schema LocalBusiness", S2: "Sem Schema Organization",
  E1: "Rating Baixo", E4: "Nao Reivindicado", F3: "Sem Website",
}
const ML = ["Invisivel", "Basico", "Presente", "Estruturado", "Maduro"]
const SCHWARTZ = ["Unaware", "Problem Aware", "Solution Aware", "Product Aware", "Most Aware"]

function dedupByPlaceId(rows: any[]): any[] {
  const m = new Map<string, any>()
  for (const r of rows) {
    const e = m.get(r.place_id)
    if (!e || (r.enrichment_level || 0) > (e.enrichment_level || 0)) m.set(r.place_id, r)
  }
  return Array.from(m.values())
}

export async function aggregateByCategory(cat: string, city?: string | null): Promise<MarketOverview | null> {
  try {
    const supabase = getAdminClient()
    let q = supabase.from("discovery_listings").select("place_id,score_compound,rating_value,total_photos,is_claimed,website,l2_has_analytics,enrichment_level,schwartz_level,l2_content_maturity").ilike("category", `${cat}%`).limit(2000)
    if (city) q = q.ilike("city", `%${city}%`)
    const { data, error } = await q
    if (error || !data?.length) return null
    const list = dedupByPlaceId(data); const total = list.length
    const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0
    const scores = list.map(r => r.score_compound || 0).filter(v => v > 0)
    const ratings = list.map(r => r.rating_value || 0).filter(v => v > 0)
    const photos = list.map(r => r.total_photos || 0)
    const schwartzDist = [1, 2, 3, 4, 5].map(l => { const n = list.filter(r => r.schwartz_level === l).length; return { level: l, label: SCHWARTZ[l - 1], count: n, pct: Math.round((n / total) * 100) } })
    const cmList = list.filter(r => r.l2_content_maturity != null)
    const cmDist = [0, 1, 2, 3, 4].map(l => { const n = cmList.filter(r => r.l2_content_maturity === l).length; return { level: l, label: ML[l], count: n, pct: cmList.length ? Math.round((n / cmList.length) * 100) : 0 } })
    return {
      category: cat, categoryLabel: CATEGORY_LABELS[cat] || cat, city: city || "Todas as regioes",
      totalBusinesses: total, enrichedBusinesses: list.filter(r => r.enrichment_level >= 1).length,
      avgScore: Math.round(avg(scores)), avgRating: Math.round(avg(ratings) * 10) / 10,
      avgPhotos: Math.round(avg(photos)),
      claimedPct: Math.round((list.filter(r => r.is_claimed).length / total) * 1000) / 10,
      hasWebsitePct: Math.round((list.filter(r => r.website).length / total) * 1000) / 10,
      hasAnalyticsPct: Math.round((list.filter(r => r.l2_has_analytics).length / Math.max(list.filter(r => r.l2_has_analytics != null).length, 1)) * 1000) / 10,
      schwartzDistribution: schwartzDist, contentMaturity: cmDist,
    }
  } catch (e: any) { console.error("[market-intel] aggregate:", e.message); return null }
}

export async function marketGapAnalysis(cat: string, city?: string | null): Promise<MarketGap[]> {
  try {
    const supabase = getAdminClient()
    let q = supabase.from("discovery_listings").select("place_id,signals_detected,enrichment_level,l2_seo_checks,is_claimed,l2_has_analytics").ilike("category", `${cat}%`).limit(2000)
    if (city) q = q.ilike("city", `%${city}%`)
    const { data, error } = await q
    if (error || !data?.length) return []
    const list = dedupByPlaceId(data); const total = list.length
    const sigCounts: Record<string, number> = {}
    for (const r of list) {
      const signals: string[] = r.signals_detected || []; const seen = new Set<string>()
      for (const s of signals) { const p = s.split(":")[0]; if (!seen.has(p)) { seen.add(p); sigCounts[p] = (sigCounts[p] || 0) + 1 } }
    }
    const hasSchema = list.filter((r: any) => { try { const c = typeof r.l2_seo_checks === "string" ? JSON.parse(r.l2_seo_checks) : r.l2_seo_checks; return c?.no_jsonld_schema === true } catch { return false } }).length
    if (hasSchema > 0) sigCounts["W8"] = hasSchema
    const notClaimed = list.filter(r => !r.is_claimed).length
    if (notClaimed > 0) sigCounts["E4"] = notClaimed
    const noAnalytics = list.filter(r => r.l2_has_analytics === false).length
    if (noAnalytics > 0) sigCounts["W5"] = noAnalytics
    return Object.entries(sigCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([sig, n], i) => {
      const p = Math.round((n / total) * 100)
      return { rank: i + 1, signal: sig, signalLabel: SIGNAL_LABELS[sig] || sig, affectedPct: p, affectedCount: n, severity: (p > 50 ? "critico" : p > 30 ? "alto" : p > 15 ? "medio" : "baixo") as any, opportunity: p > 50 ? `Alta oportunidade — ${Math.round(n * 0.3)} negocios` : "Oportunidade de nicho" }
    })
  } catch (e: any) { console.error("[market-intel] gaps:", e.message); return [] }
}

export async function marketOpportunity(cat: string, city?: string | null): Promise<MarketOpportunity | null> {
  try {
    const supabase = getAdminClient()
    const { count, error } = await supabase.from("discovery_listings").select("place_id", { count: "exact", head: true }).ilike("category", `${cat}%`).limit(1)
    if (error || !count) return null
    const ticket = CATEGORY_TICKETS[cat] || 200; const tam = count * 0.05 * (ticket >= 500 ? 497 : 197)
    return { category: cat, categoryLabel: CATEGORY_LABELS[cat] || cat, city: city || "Todas as regioes", totalAddressableMarket: count, penetratedBusinesses: 0, penetrationPct: 0, avgTicketEstimate: ticket, revenuePotentialMRR: Math.round(tam) }
  } catch (e: any) { console.error("[market-intel] opportunity:", e.message); return null }
}

export async function competitiveDensity(cat: string, city?: string | null): Promise<CompetitiveDensity | null> {
  try {
    const supabase = getAdminClient()
    const { count, error } = await supabase.from("discovery_listings").select("place_id", { count: "exact", head: true }).ilike("category", `${cat}%`).limit(1)
    if (error || !count) return null
    const d = city ? Math.round(count / 100 * 10) / 10 : Math.round(count / 500 * 10) / 10
    const sat = d > 10 ? "saturada" : d > 5 ? "alta" : d > 2 ? "media" : "baixa"
    return { category: cat, categoryLabel: CATEGORY_LABELS[cat] || cat, city: city || "SP", totalCompetitors: count, areaKm2: city ? 100 : 500, densityPerKm2: d, saturation: sat as any, avgRating: 3.5, topRatedPct: 0 }
  } catch (e: any) { console.error("[market-intel] density:", e.message); return null }
}

export async function nicheIntelligence(cat: string, city?: string | null): Promise<NicheIntelligence | null> {
  const [overview, gaps, opportunity, density] = await Promise.all([aggregateByCategory(cat, city), marketGapAnalysis(cat, city), marketOpportunity(cat, city), competitiveDensity(cat, city)])
  if (!overview) return null
  const top = gaps.slice(0, 3)
  const actions = top.map(g => ({ action: `Resolver ${g.signalLabel} — ${g.affectedPct}% do mercado (${g.affectedCount} negocios)`, impact: g.severity === "critico" ? "🔥 Critico" : g.severity === "alto" ? "⚡ Alto" : "📊 Medio", targetPct: Math.min(g.affectedPct + 20, 100) }))
  if (overview.hasWebsitePct < 50) actions.push({ action: `Criar sites para ${Math.round(overview.totalBusinesses * 0.1)} negocios sem presenca web`, impact: "⚡ Alto", targetPct: Math.min(overview.hasWebsitePct + 20, 80) })
  return { overview, gaps, opportunity: opportunity!, density: density!, recommendedActions: actions.slice(0, 5) }
}

export async function listMarketCategories(): Promise<{ category: string; label: string; count: number }[]> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("discovery_listings").select("category").not("category", "is", null).limit(2000)
    if (error || !data) return []
    const c: Record<string, number> = {}; for (const r of data) { const k = r.category || "?"; c[k] = (c[k] || 0) + 1 }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([cat, n]) => ({ category: cat, label: CATEGORY_LABELS[cat] || cat, count: n }))
  } catch { return [] }
}

export async function listMarketCities(): Promise<{ city: string; count: number }[]> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("discovery_listings").select("city").not("city", "is", null).limit(2000)
    if (error || !data) return []
    const c: Record<string, number> = {}; for (const r of data) { const k = r.city || "?"; c[k] = (c[k] || 0) + 1 }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, n]) => ({ city, count: n }))
  } catch { return [] }
}
