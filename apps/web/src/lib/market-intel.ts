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
  category: string
  categoryLabel: string
  city: string
  totalBusinesses: number
  enrichedBusinesses: number
  avgScore: number
  schwartzDistribution: { level: number; label: string; count: number; pct: number }[]
  contentMaturity: { level: number; label: string; count: number; pct: number }[]
  hasWebsitePct: number
  hasAnalyticsPct: number
  avgRating: number
  avgPhotos: number
  claimedPct: number
}

export interface MarketGap {
  rank: number
  signal: string
  signalLabel: string
  affectedPct: number
  affectedCount: number
  severity: "critico" | "alto" | "medio" | "baixo"
  opportunity: string
}

export interface MarketOpportunity {
  category: string
  categoryLabel: string
  city: string
  totalAddressableMarket: number
  penetratedBusinesses: number
  penetrationPct: number
  avgTicketEstimate: number
  revenuePotentialMRR: number
}

export interface CompetitiveDensity {
  category: string
  categoryLabel: string
  city: string
  totalCompetitors: number
  areaKm2: number
  densityPerKm2: number
  saturation: "baixa" | "media" | "alta" | "saturada"
  avgRating: number
  topRatedPct: number
}

export interface NicheIntelligence {
  overview: MarketOverview
  gaps: MarketGap[]
  opportunity: MarketOpportunity
  density: CompetitiveDensity
  recommendedActions: { action: string; impact: string; targetPct: number }[]
}

// ── Category Reference Data ──────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  dentist: "Dentista", orthodontist: "Ortodontista",
  medical_aesthetic_clinic: "Clinica Estetica", medical_clinic: "Clinica Medica",
  restaurant: "Restaurante", pizza_restaurant: "Pizzaria", bakery: "Padaria",
  gym: "Academia", lawyer: "Advogado", barber_shop: "Barbearia",
  beauty_salon: "Salao de Beleza", pharmacy: "Farmacia", veterinarian: "Veterinario",
  pet_store: "Pet Shop", real_estate_agency: "Imobiliaria", accountant: "Contador",
  car_repair: "Oficina Mecanica", psychologist: "Psicologo", physical_therapist: "Fisioterapeuta",
  ophthalmologist: "Oftalmologista", cardiologist: "Cardiologista",
  architect: "Arquiteto", interior_designer: "Designer de Interiores",
  electrician: "Eletricista", plumber: "Encanador", cleaning_service: "Servico de Limpeza",
  school: "Escola Particular", driving_school: "Autoescola", hotel: "Pousada/Hotel",
}

const CATEGORY_TICKETS: Record<string, number> = {
  dentist: 500, orthodontist: 800, medical_aesthetic_clinic: 700, medical_clinic: 300,
  restaurant: 50, pizza_restaurant: 40, bakery: 25,
  gym: 120, lawyer: 800, barber_shop: 45, beauty_salon: 80,
  pharmacy: 30, veterinarian: 200, pet_store: 80,
  real_estate_agency: 3000, accountant: 300, car_repair: 400,
  psychologist: 200, physical_therapist: 180, ophthalmologist: 350, cardiologist: 400,
  architect: 1500, interior_designer: 1200,
  electrician: 150, plumber: 150, cleaning_service: 200,
  school: 800, driving_school: 250, hotel: 200,
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

// ── Market Overview ──────────────────────────────────────────

export async function aggregateByCategory(
  category: string,
  city?: string | null,
): Promise<MarketOverview | null> {
  const pool = getPool()
  try {
    const conditions = [`dl.category = $1`]
    const params: any[] = [category]
    let idx = 2

    if (city) { conditions.push(`dl.city ILIKE $${idx++}`); params.push(`%${city}%`) }

    const whereClause = conditions.join(" AND ")

    const { rows } = await pool.query(
      `SELECT
        COUNT(DISTINCT dl.place_id) as total,
        COUNT(DISTINCT CASE WHEN dl.enrichment_level >= 1 THEN dl.place_id END) as enriched,
        ROUND(AVG(dl.score_compound))::INTEGER as avg_score,
        ROUND(AVG(dl.rating_value)::numeric, 1) as avg_rating,
        ROUND(AVG(dl.total_photos))::INTEGER as avg_photos,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN dl.is_claimed THEN dl.place_id END) / NULLIF(COUNT(DISTINCT dl.place_id), 0), 1) as claimed_pct,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN dl.website IS NOT NULL THEN dl.place_id END) / NULLIF(COUNT(DISTINCT dl.place_id), 0), 1) as website_pct,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN dl.l2_has_analytics THEN dl.place_id END) / NULLIF(COUNT(DISTINCT CASE WHEN dl.l2_has_analytics IS NOT NULL THEN dl.place_id END), 0), 1) as analytics_pct
       FROM (SELECT DISTINCT ON (dl2.place_id) * FROM discovery_listings dl2 WHERE ${whereClause} ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl`,
      params
    )

    if (!rows[0] || !rows[0].total) return null
    const r = rows[0]

    // Schwartz distribution
    const distRes = await pool.query(
      `SELECT dl.schwartz_level, dl.schwartz_label, COUNT(*) as n
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.schwartz_level, dl2.schwartz_label FROM discovery_listings dl2 WHERE ${whereClause} ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl
       GROUP BY dl.schwartz_level, dl.schwartz_label ORDER BY dl.schwartz_level`, params)

    const total = parseInt(r.total) || 1
    const schwartzDist = distRes.rows.map(d => ({
      level: parseInt(d.schwartz_level), label: d.schwartz_label,
      count: parseInt(d.n), pct: Math.round((parseInt(d.n) / total) * 100),
    }))

    // Content maturity distribution
    const cmRes = await pool.query(
      `SELECT dl.l2_content_maturity, COUNT(*) as n
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.l2_content_maturity FROM discovery_listings dl2 WHERE ${whereClause} AND dl2.l2_content_maturity IS NOT NULL ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl
       GROUP BY dl.l2_content_maturity ORDER BY dl.l2_content_maturity`, params)

    const MATURITY_LABELS = ["Invisivel", "Basico", "Presente", "Estruturado", "Maduro"]
    const cmTotal = cmRes.rows.reduce((s: number, d: any) => s + parseInt(d.n), 0) || 1
    const contentMaturity = cmRes.rows.map((d: any) => ({
      level: parseInt(d.l2_content_maturity),
      label: MATURITY_LABELS[d.l2_content_maturity] || "?",
      count: parseInt(d.n),
      pct: Math.round((parseInt(d.n) / cmTotal) * 100),
    }))

    return {
      category, categoryLabel: CATEGORY_LABELS[category] || category,
      city: city || "Todas as regioes",
      totalBusinesses: total,
      enrichedBusinesses: parseInt(r.enriched) || 0,
      avgScore: parseInt(r.avg_score) || 0,
      schwartzDistribution: schwartzDist,
      contentMaturity,
      hasWebsitePct: parseFloat(r.website_pct) || 0,
      hasAnalyticsPct: parseFloat(r.analytics_pct) || 0,
      avgRating: parseFloat(r.avg_rating) || 0,
      avgPhotos: parseInt(r.avg_photos) || 0,
      claimedPct: parseFloat(r.claimed_pct) || 0,
    }
  } catch (e: any) {
    console.error("[market-intel] aggregateByCategory failed:", e.message)
    return null
  }
}

// ── Market Gap Analysis ──────────────────────────────────────

export async function marketGapAnalysis(
  category: string,
  city?: string | null,
): Promise<MarketGap[]> {
  const pool = getPool()
  try {
    const conditions = [`dl.category = $1`]
    const params: any[] = [category]
    let idx = 2
    if (city) { conditions.push(`dl.city ILIKE $${idx++}`); params.push(`%${city}%`) }
    const whereClause = conditions.join(" AND ")

    // Count distinct places with each signal
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT dl.place_id) as total
       FROM discovery_listings dl WHERE ${whereClause}`, params)
    const total = parseInt(rows[0]?.total) || 1

    // Signal frequency analysis from signals_detected
    const signalRes = await pool.query(
      `SELECT dl.signals_detected
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.signals_detected FROM discovery_listings dl2 WHERE ${whereClause} ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl`,
      params)

    // Aggregate signal counts
    const signalCounts: Record<string, number> = {}
    for (const r of signalRes.rows) {
      const signals: string[] = r.signals_detected || []
      const seenPrefixes = new Set<string>()
      for (const s of signals) {
        const prefix = s.split(":")[0]
        if (!seenPrefixes.has(prefix)) {
          seenPrefixes.add(prefix)
          signalCounts[prefix] = (signalCounts[prefix] || 0) + 1
        }
      }
    }

    // Also check for missing signals via explicit checks
    // Check W8 (schema) via l2_has_schema
    const schemaRes = await pool.query(
      `SELECT COUNT(DISTINCT CASE WHEN dl.l2_has_schema IS FALSE THEN dl.place_id END) as no_schema
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.l2_has_schema, dl2.place_id FROM discovery_listings dl2 WHERE ${whereClause} ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl`,
      params)
    signalCounts["W8"] = parseInt(schemaRes.rows[0]?.no_schema) || 0

    // Check I1 (not claimed)
    const claimedRes = await pool.query(
      `SELECT COUNT(DISTINCT CASE WHEN dl.is_claimed IS FALSE THEN dl.place_id END) as not_claimed
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.is_claimed, dl2.place_id FROM discovery_listings dl2 WHERE ${whereClause} ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl`,
      params)
    signalCounts["I1"] = parseInt(claimedRes.rows[0]?.not_claimed) || 0

    // Check W5 (no analytics)
    const analyticsRes = await pool.query(
      `SELECT COUNT(DISTINCT CASE WHEN dl.l2_has_analytics IS FALSE THEN dl.place_id END) as no_analytics
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.l2_has_analytics, dl2.place_id FROM discovery_listings dl2 WHERE ${whereClause} AND dl2.l2_has_analytics IS NOT NULL ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl`,
      params)
    signalCounts["W5"] = parseInt(analyticsRes.rows[0]?.no_analytics) || 0

    // Build gap list
    const gaps: MarketGap[] = []
    for (const [signal, count] of Object.entries(signalCounts)) {
      const label = SIGNAL_LABELS[signal]
      if (!label || count === 0) continue
      const pct = Math.round((count / total) * 100)
      const severity: MarketGap["severity"] = pct >= 60 ? "critico" : pct >= 40 ? "alto" : pct >= 20 ? "medio" : "baixo"

      gaps.push({ rank: 0, signal, signalLabel: label, affectedPct: pct, affectedCount: count, severity,
        opportunity: severity === "critico" ? `Resolver ${label.toLowerCase()} em escala — ${count} negocios afetados`
          : severity === "alto" ? `Campanha de ${label.toLowerCase()} para ${count} leads qualificados`
          : `Oportunidade pontual: ${count} negocios com ${label.toLowerCase()}` })
    }

    gaps.sort((a, b) => b.affectedPct - a.affectedPct)
    gaps.forEach((g, i) => { g.rank = i + 1 })
    return gaps.slice(0, 10)
  } catch (e: any) {
    console.error("[market-intel] marketGapAnalysis failed:", e.message)
    return []
  }
}

// ── Market Opportunity ───────────────────────────────────────

export async function marketOpportunity(
  category: string,
  city?: string | null,
): Promise<MarketOpportunity | null> {
  const pool = getPool()
  try {
    const conditions = [`dl.category = $1`]
    const params: any[] = [category]
    let idx = 2
    if (city) { conditions.push(`dl.city ILIKE $${idx++}`); params.push(`%${city}%`) }
    const whereClause = conditions.join(" AND ")

    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT dl.place_id) as total
       FROM discovery_listings dl WHERE ${whereClause}`, params)

    const total = parseInt(rows[0]?.total) || 0
    const ticket = CATEGORY_TICKETS[category] || 150

    // Estimate: 5% of businesses would pay for SEO services
    const penetrationRate = 0.05
    const revenuePotentialMRR = Math.round(total * penetrationRate * (ticket >= 500 ? 497 : 197))

    return {
      category, categoryLabel: CATEGORY_LABELS[category] || category,
      city: city || "SP",
      totalAddressableMarket: total,
      penetratedBusinesses: 0, // we haven't sold yet
      penetrationPct: 0,
      avgTicketEstimate: ticket,
      revenuePotentialMRR,
    }
  } catch (e: any) {
    console.error("[market-intel] marketOpportunity failed:", e.message)
    return null
  }
}

// ── Competitive Density ──────────────────────────────────────

export async function competitiveDensity(
  category: string,
  city?: string | null,
): Promise<CompetitiveDensity | null> {
  const pool = getPool()
  try {
    const conditions = [`dl.category = $1`]
    const params: any[] = [category]
    let idx = 2
    if (city) { conditions.push(`dl.city ILIKE $${idx++}`); params.push(`%${city}%`) }
    const whereClause = conditions.join(" AND ")

    const { rows } = await pool.query(
      `SELECT
        COUNT(DISTINCT dl.place_id) as total,
        ROUND(AVG(dl.rating_value)::numeric, 1) as avg_rating,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN dl.rating_value >= 4.5 THEN dl.place_id END) / NULLIF(COUNT(DISTINCT dl.place_id), 0), 1) as top_rated_pct,
        ROUND(CAST(
          (MAX(dl.latitude) - MIN(dl.latitude)) * (MAX(dl.longitude) - MIN(dl.longitude)) * 111 * 111 AS numeric
        ), 1) as area_km2
       FROM (SELECT DISTINCT ON (dl2.place_id) dl2.place_id, dl2.rating_value, dl2.latitude, dl2.longitude FROM discovery_listings dl2 WHERE ${whereClause} AND dl2.latitude IS NOT NULL ORDER BY dl2.place_id, dl2.enrichment_level DESC) dl`,
      params)

    const r = rows[0]
    if (!r || !r.total) return null

    const total = parseInt(r.total) || 0
    const areaKm2 = Math.max(parseFloat(r.area_km2) || 1, 1)
    const densityPerKm2 = Math.round((total / areaKm2) * 10) / 10
    const saturation: CompetitiveDensity["saturation"] =
      densityPerKm2 > 10 ? "saturada" : densityPerKm2 > 5 ? "alta" : densityPerKm2 > 2 ? "media" : "baixa"

    return {
      category, categoryLabel: CATEGORY_LABELS[category] || category,
      city: city || "SP",
      totalCompetitors: total,
      areaKm2: Math.round(areaKm2),
      densityPerKm2,
      saturation,
      avgRating: parseFloat(r.avg_rating) || 0,
      topRatedPct: parseFloat(r.top_rated_pct) || 0,
    }
  } catch (e: any) {
    console.error("[market-intel] competitiveDensity failed:", e.message)
    return null
  }
}

// ── Niche Intelligence ───────────────────────────────────────

export async function nicheIntelligence(
  category: string,
  city?: string | null,
): Promise<NicheIntelligence | null> {
  const [overview, gaps, opportunity, density] = await Promise.all([
    aggregateByCategory(category, city),
    marketGapAnalysis(category, city),
    marketOpportunity(category, city),
    competitiveDensity(category, city),
  ])

  if (!overview) return null

  const top3Gaps = gaps.slice(0, 3)
  const recommendedActions = top3Gaps.map(g => ({
    action: `Resolver ${g.signalLabel} — ${g.affectedPct}% do mercado afetado (${g.affectedCount} negocios)`,
    impact: g.severity === "critico" ? "🔥 Crítico" : g.severity === "alto" ? "⚡ Alto" : "📊 Medio",
    targetPct: Math.min(g.affectedPct + 20, 100),
  }))

  // Add tool suggestion action
  if (overview.hasWebsitePct < 50) {
    recommendedActions.push({
      action: `Criar sites profissionais para ${Math.round(overview.totalBusinesses * 0.1)} negocios sem presenca web`,
      impact: "⚡ Alto",
      targetPct: Math.min(overview.hasWebsitePct + 20, 80),
    })
  }

  return { overview, gaps, opportunity: opportunity!, density: density!,
    recommendedActions: recommendedActions.slice(0, 5) }
}

/** List all categories that have enriched data in the database. */
export async function listMarketCategories(): Promise<{ category: string; label: string; count: number }[]> {
  const pool = getPool()
  try {
    const { rows } = await pool.query(
      `SELECT dl.category, COUNT(DISTINCT dl.place_id) as n
       FROM discovery_listings dl WHERE dl.category IS NOT NULL
       GROUP BY dl.category ORDER BY n DESC LIMIT 20`)
    return rows.map((r: any) => ({
      category: r.category, label: CATEGORY_LABELS[r.category] || r.category, count: parseInt(r.n),
    }))
  } catch { return [] }
}

/** List cities that have enriched data in the database. */
export async function listMarketCities(): Promise<{ city: string; count: number }[]> {
  const pool = getPool()
  try {
    const { rows } = await pool.query(
      `SELECT dl.city, COUNT(DISTINCT dl.place_id) as n
       FROM discovery_listings dl WHERE dl.city IS NOT NULL
       GROUP BY dl.city ORDER BY n DESC LIMIT 10`)
    return rows.map((r: any) => ({ city: r.city, count: parseInt(r.n) }))
  } catch { return [] }
}
