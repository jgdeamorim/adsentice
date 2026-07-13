// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Market Intelligence Engine v0.6
// ADR-0009: agrega dados existentes por categoria × região
// ZERO novas APIs — 100% dados do Supabase discovery_listings.
// Transforma lead-level scoring em market-level intelligence.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { Pool } from "pg"

// ── Types ─────────────────────────────────────────────────────

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
  severity: "critico" | "alto" | "medio" | "baixo"
  opportunity: string
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

// ── Reference Data ────────────────────────────────────────────

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
  ophthalmologist: "Oftalmologista", cardiologist: "Cardiologista",
  real_estate_agency: "Imobiliaria",
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
  A1: "Estrutura Plana (single-page)", A3: "Sem Navegacao",
  I1: "Perfil GMB nao Reivindicado",
}

// ── DB Pool ───────────────────────────────────────────────────

let _pool: Pool | null = null
function getPool(): Pool {
  if (_pool) return _pool
  _pool = new Pool({
    host: "aws-0-ca-central-1.pooler.supabase.com", port: 6543, database: "postgres",
    user: "postgres.tdigauruusdhnpvppixb", password: "pmaxnpmiJ6WfcX46",
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000, max: 3,
  })
  return _pool
}

// ── SQL Helpers ──────────────────────────────────────────────

function buildWhere(cat: string, city?: string | null): { clause: string; params: any[] } {
  const parts = [`x.category = $1`]
  const params: any[] = [cat]
  let i = 2
  if (city) { parts.push(`x.city ILIKE $${i++}`); params.push(`%${city}%`) }
  return { clause: parts.join(" AND "), params }
}

/** Dedup subquery: always uses 'x' as inner alias, returns 's' as outer. */
function dedup(selectCols: string, whereClause: string, extraWhere = ""): string {
  return `(SELECT DISTINCT ON (x.place_id) ${selectCols} FROM discovery_listings x WHERE ${whereClause}${extraWhere ? " AND " + extraWhere : ""} ORDER BY x.place_id, x.enrichment_level DESC) s`
}

// ── Market Overview ──────────────────────────────────────────

export async function aggregateByCategory(cat: string, city?: string | null): Promise<MarketOverview | null> {
  const pool = getPool()
  try {
    const { clause, params } = buildWhere(cat, city)
    const sub = dedup("*", clause)

    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT s.place_id) as total,
        COUNT(DISTINCT CASE WHEN s.enrichment_level >= 1 THEN s.place_id END) as enriched,
        ROUND(AVG(s.score_compound))::INTEGER as avg_score,
        ROUND(AVG(s.rating_value)::numeric,1) as avg_rating,
        ROUND(AVG(s.total_photos))::INTEGER as avg_photos,
        ROUND(100.0*COUNT(DISTINCT CASE WHEN s.is_claimed THEN s.place_id END)/NULLIF(COUNT(DISTINCT s.place_id),0),1) as claimed_pct,
        ROUND(100.0*COUNT(DISTINCT CASE WHEN s.website IS NOT NULL THEN s.place_id END)/NULLIF(COUNT(DISTINCT s.place_id),0),1) as website_pct,
        ROUND(100.0*COUNT(DISTINCT CASE WHEN s.l2_has_analytics THEN s.place_id END)/NULLIF(COUNT(DISTINCT CASE WHEN s.l2_has_analytics IS NOT NULL THEN s.place_id END),0),1) as analytics_pct
       FROM ${sub}`, params)
    if (!rows[0]?.total) return null
    const r = rows[0]
    const total = parseInt(r.total) || 1

    const distRes = await pool.query(
      `SELECT s.schwartz_level, s.schwartz_label, COUNT(*) as n FROM ${dedup("schwartz_level, schwartz_label", clause)} GROUP BY s.schwartz_level, s.schwartz_label ORDER BY s.schwartz_level`, params)
    const schwartzDist = distRes.rows.map((d: any) => ({ level: parseInt(d.schwartz_level), label: d.schwartz_label, count: parseInt(d.n), pct: Math.round((parseInt(d.n)/total)*100) }))

    const cmRes = await pool.query(
      `SELECT s.l2_content_maturity, COUNT(*) as n FROM ${dedup("l2_content_maturity", clause, "x.l2_content_maturity IS NOT NULL")} GROUP BY s.l2_content_maturity ORDER BY s.l2_content_maturity`, params)
    const ML = ["Invisivel","Basico","Presente","Estruturado","Maduro"]
    const cmTotal = cmRes.rows.reduce((s:number,d:any)=>s+parseInt(d.n),0)||1
    const contentMaturity = cmRes.rows.map((d:any)=>({ level:parseInt(d.l2_content_maturity), label:ML[d.l2_content_maturity]||"?", count:parseInt(d.n), pct:Math.round((parseInt(d.n)/cmTotal)*100) }))

    return {
      category:cat, categoryLabel:CATEGORY_LABELS[cat]||cat, city:city||"Todas as regioes",
      totalBusinesses:total, enrichedBusinesses:parseInt(r.enriched)||0,
      avgScore:parseInt(r.avg_score)||0, avgRating:parseFloat(r.avg_rating)||0,
      avgPhotos:parseInt(r.avg_photos)||0, claimedPct:parseFloat(r.claimed_pct)||0,
      hasWebsitePct:parseFloat(r.website_pct)||0, hasAnalyticsPct:parseFloat(r.analytics_pct)||0,
      schwartzDistribution:schwartzDist, contentMaturity,
    }
  } catch(e:any){ console.error("[market-intel] aggregateByCategory:",e.message); return null }
}

// ── Market Gap Analysis ──────────────────────────────────────

export async function marketGapAnalysis(cat: string, city?: string | null): Promise<MarketGap[]> {
  const pool = getPool()
  try {
    const { clause, params } = buildWhere(cat, city)

    const { rows } = await pool.query(`SELECT COUNT(DISTINCT s.place_id) as total FROM ${dedup("*",clause)}`, params)
    const total = parseInt(rows[0]?.total) || 1

    const signalRes = await pool.query(
      `SELECT s.signals_detected FROM ${dedup("signals_detected",clause)}`, params)
    const signalCounts: Record<string,number> = {}
    for (const r of signalRes.rows) {
      const signals: string[] = r.signals_detected || []
      const seen = new Set<string>()
      for (const sig of signals) { const pfx = sig.split(":")[0]; if(!seen.has(pfx)){seen.add(pfx); signalCounts[pfx]=(signalCounts[pfx]||0)+1} }
    }

    // Explicit checks
    const schemaR = await pool.query(`SELECT COUNT(DISTINCT CASE WHEN s.l2_has_schema IS FALSE THEN s.place_id END) as n FROM ${dedup("l2_has_schema, place_id",clause)}`, params)
    const claimedR = await pool.query(`SELECT COUNT(DISTINCT CASE WHEN s.is_claimed IS FALSE THEN s.place_id END) as n FROM ${dedup("is_claimed, place_id",clause)}`, params)
    const analyticsR = await pool.query(`SELECT COUNT(DISTINCT CASE WHEN s.l2_has_analytics IS FALSE THEN s.place_id END) as n FROM ${dedup("l2_has_analytics, place_id",clause,"x.l2_has_analytics IS NOT NULL")}`, params)

    signalCounts["W8"] = parseInt(schemaR.rows[0]?.n)||0
    signalCounts["I1"] = parseInt(claimedR.rows[0]?.n)||0
    signalCounts["W5"] = parseInt(analyticsR.rows[0]?.n)||0

    const gaps: MarketGap[] = []
    for (const [sig,count] of Object.entries(signalCounts)) {
      const label = SIGNAL_LABELS[sig]; if(!label||count===0) continue
      const pct = Math.round((count/total)*100)
      const sev: MarketGap["severity"] = pct>=60?"critico":pct>=40?"alto":pct>=20?"medio":"baixo"
      gaps.push({rank:0,signal:sig,signalLabel:label,affectedPct:pct,affectedCount:count,severity:sev,
        opportunity:sev==="critico"?`Resolver em escala — ${count} negocios afetados`:sev==="alto"?`Campanha para ${count} leads qualificados`:`Oportunidade: ${count} com ${label.toLowerCase()}`})
    }
    gaps.sort((a,b)=>b.affectedPct-a.affectedPct); gaps.forEach((g,i)=>{g.rank=i+1})
    return gaps.slice(0,10)
  } catch(e:any){ console.error("[market-intel] marketGapAnalysis:",e.message); return [] }
}

// ── Market Opportunity ───────────────────────────────────────

export async function marketOpportunity(cat: string, city?: string | null): Promise<MarketOpportunity | null> {
  const pool = getPool()
  try {
    const { clause, params } = buildWhere(cat, city)
    const { rows } = await pool.query(`SELECT COUNT(DISTINCT s.place_id) as total FROM ${dedup("*",clause)}`, params)
    const total = parseInt(rows[0]?.total)||0
    const ticket = CATEGORY_TICKETS[cat]||150
    return { category:cat, categoryLabel:CATEGORY_LABELS[cat]||cat, city:city||"SP",
      totalAddressableMarket:total, penetratedBusinesses:0, penetrationPct:0,
      avgTicketEstimate:ticket, revenuePotentialMRR:Math.round(total*0.05*(ticket>=500?497:197)) }
  } catch(e:any){ console.error("[market-intel] marketOpportunity:",e.message); return null }
}

// ── Competitive Density ──────────────────────────────────────

export async function competitiveDensity(cat: string, city?: string | null): Promise<CompetitiveDensity | null> {
  const pool = getPool()
  try {
    const { clause, params } = buildWhere(cat, city)
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT s.place_id) as total, ROUND(AVG(s.rating_value)::numeric,1) as avg_rating,
        ROUND(100.0*COUNT(DISTINCT CASE WHEN s.rating_value>=4.5 THEN s.place_id END)/NULLIF(COUNT(DISTINCT s.place_id),0),1) as top_pct,
        ROUND(CAST((MAX(s.latitude)-MIN(s.latitude))*(MAX(s.longitude)-MIN(s.longitude))*111*111 AS numeric),1) as area_km2
       FROM ${dedup("place_id, rating_value, latitude, longitude",clause,"x.latitude IS NOT NULL")}`, params)
    const r = rows[0]; if(!r?.total) return null
    const total = parseInt(r.total)||0; const km2 = Math.max(parseFloat(r.area_km2)||1,1)
    const dens = Math.round((total/km2)*10)/10
    const sat: CompetitiveDensity["saturation"] = dens>10?"saturada":dens>5?"alta":dens>2?"media":"baixa"
    return { category:cat, categoryLabel:CATEGORY_LABELS[cat]||cat, city:city||"SP",
      totalCompetitors:total, areaKm2:Math.round(km2), densityPerKm2:dens, saturation:sat,
      avgRating:parseFloat(r.avg_rating)||0, topRatedPct:parseFloat(r.top_pct)||0 }
  } catch(e:any){ console.error("[market-intel] competitiveDensity:",e.message); return null }
}

// ── Niche Intelligence ───────────────────────────────────────

export async function nicheIntelligence(cat: string, city?: string | null): Promise<NicheIntelligence | null> {
  const [overview,gaps,opportunity,density] = await Promise.all([
    aggregateByCategory(cat,city), marketGapAnalysis(cat,city),
    marketOpportunity(cat,city), competitiveDensity(cat,city),
  ])
  if(!overview) return null
  const top = gaps.slice(0,3)
  const actions = top.map(g => ({ action:`Resolver ${g.signalLabel} — ${g.affectedPct}% do mercado (${g.affectedCount} negocios)`, impact:g.severity==="critico"?"🔥 Critico":g.severity==="alto"?"⚡ Alto":"📊 Medio", targetPct:Math.min(g.affectedPct+20,100) }))
  if(overview.hasWebsitePct<50) actions.push({ action:`Criar sites para ${Math.round(overview.totalBusinesses*0.1)} negocios sem presenca web`, impact:"⚡ Alto", targetPct:Math.min(overview.hasWebsitePct+20,80) })
  return { overview, gaps, opportunity:opportunity!, density:density!, recommendedActions:actions.slice(0,5) }
}

export async function listMarketCategories(): Promise<{ category:string; label:string; count:number }[]> {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`SELECT x.category, COUNT(DISTINCT x.place_id) as n FROM discovery_listings x WHERE x.category IS NOT NULL GROUP BY x.category ORDER BY n DESC LIMIT 20`)
    return rows.map((r:any)=>({ category:r.category, label:CATEGORY_LABELS[r.category]||r.category, count:parseInt(r.n) }))
  } catch { return [] }
}

export async function listMarketCities(): Promise<{ city:string; count:number }[]> {
  const pool = getPool()
  try {
    const { rows } = await pool.query(`SELECT x.city, COUNT(DISTINCT x.place_id) as n FROM discovery_listings x WHERE x.city IS NOT NULL GROUP BY x.city ORDER BY n DESC LIMIT 10`)
    return rows.map((r:any)=>({ city:r.city, count:parseInt(r.n) }))
  } catch { return [] }
}
