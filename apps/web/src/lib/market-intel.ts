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
  l1Count?: number; l2Count?: number; l4Count?: number; l5Count?: number
  avgScore: number; avgRating: number; avgPhotos: number
  claimedPct: number; hasWebsitePct: number; hasAnalyticsPct: number
  schwartzDistribution: { level: number; label: string; count: number; pct: number }[]
  contentMaturity: { level: number; label: string; count: number; pct: number }[]
  // IBGE + market_holds (ADR-0027)
  marketHolds?: { totalInRegion: number; avgScore: number; claimedPct: number } | null
  ibgeContext?: { populacao: number | null; pibPerCapita: number | null; densidade: number | null } | null
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
  dentist: "🦷 Dentista", orthodontist: "🦷 Ortodontista",
  medical_aesthetic_clinic: "💉 Clinica Estetica", medical_clinic: "🏥 Clinica Medica",
  veterinarian: "🐾 Veterinario", psychologist: "🧠 Psicologo",
  physical_therapist: "🦴 Fisioterapeuta", ophthalmologist: "👁️ Oftalmologista",
  cardiologist: "🫀 Cardiologista",
  restaurant: "🍽️ Restaurante", gym: "🏋️ Academia", lawyer: "⚖️ Advogado",
  beauty_salon: "💇 Salao de Beleza", pharmacy: "💊 Farmacia",
  pet_store: "🐶 Pet Shop", accountant: "📊 Contador", car_repair: "🔧 Oficina Mecanica",
  electrician: "🔌 Eletricista", plumber: "🔧 Encanador", cleaning_service: "🧹 Servico de Limpeza",
  school: "📚 Escola", driving_school: "🚗 Autoescola", hotel: "🏨 Pousada/Hotel",
  barber_shop: "💈 Barbearia", architect: "🏗️ Arquiteto", interior_designer: "🎨 Designer de Interiores",
  real_estate_agency: "🏠 Imobiliaria", pizza_restaurant: "🍕 Pizzaria", bakery: "🥖 Padaria",
}

/** Mapeia categorias do DataForSEO GMB → slug adsentice.
 *  DataForSEO retorna nomes em inglês com capitalização inconsistente.
 *  Ex: "Dentist", "Dental clinic", "Oral surgeon" → "dentist" */
const CATEGORY_ALIASES: Record<string, string> = {
  // Saúde — converge pro slug canônico
  dentist: "dentist", dental_clinic: "dentist", "dental clinic": "dentist",
  orthodontist: "orthodontist", endodontist: "dentist",
  oral_surgeon: "dentist", "oral surgeon": "dentist",
  dental_implants_provider: "dentist", "dental implants provider": "dentist",
  periodontist: "dentist", prosthodontist: "dentist",
  medical_aesthetic_clinic: "medical_aesthetic_clinic", "medical aesthetic clinic": "medical_aesthetic_clinic",
  medical_clinic: "medical_clinic", "medical clinic": "medical_clinic",
  surgeon: "medical_clinic", pediatric_dentist: "dentist", "pediatric dentist": "dentist",
  veterinarian: "veterinarian", psychologist: "psychologist",
  physical_therapist: "physical_therapist", ophthalmologist: "ophthalmologist",
  cardiologist: "cardiologist",

  // Beleza
  beauty_salon: "beauty_salon", "beauty salon": "beauty_salon",
  barber_shop: "barber_shop", "barber shop": "barber_shop",
  gym: "gym", hair_care: "beauty_salon", "hair care": "beauty_salon",

  // Serviços
  lawyer: "lawyer", accountant: "accountant",
  architect: "architect", interior_designer: "interior_designer", "interior designer": "interior_designer",
  real_estate_agency: "real_estate_agency", "real estate agency": "real_estate_agency",

  // Alimentação
  restaurant: "restaurant", pizza_restaurant: "pizza_restaurant", "pizza restaurant": "pizza_restaurant",
  bakery: "bakery",

  // Comércio
  pet_store: "pet_store", "pet store": "pet_store",
  car_repair: "car_repair", "car repair": "car_repair",
  pharmacy: "pharmacy",
  electrician: "electrician", plumber: "plumber",
  cleaning_service: "cleaning_service", "cleaning service": "cleaning_service",

  // Educação
  school: "school", driving_school: "driving_school", "driving school": "driving_school",
  hotel: "hotel",
}

/** Normaliza nome de categoria GMB → slug adsentice. Case-insensitive, trim. */
export function normalizeCategory(gmbCategory: string): string {
  const key = gmbCategory.trim().toLowerCase().replace(/\s+/g, "_")

  
return CATEGORY_ALIASES[key] || CATEGORY_ALIASES[gmbCategory.trim()] || key
}

/** Label legível para qualquer slug ou nome GMB. */
export function categoryLabel(raw: string): string {
  const slug = normalizeCategory(raw)

  
return CATEGORY_LABELS[slug] || raw
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
  // Fit (F1-F10) — quão próximo do ICP
  F1: "Categoria fora do ICP", F2: "Poucas Reviews (<10)", F3: "Sem Website",
  F4: "Sem Telefone", F5: "Endereco Nao Mapeado", F6: "Horario Nao Preenchido",
  F7: "Sem Descricao", F8: "Poucos Servicos", F9: "Sem Dominio Proprio",
  F10: "CNPJ Inativo",

  // Engagement (E1-E7) — cuidado com canais digitais
  E1: "Rating Abaixo de 4.0", E2: "Poucas Reviews Recentes", E3: "Poucas Fotos",
  E4: "Nao Reivindicado", E5: "Sem WhatsApp Business", E6: "Sem Posts no GMB",
  E7: "Sem Q&A no Perfil",

  // Intent — nível de dor detectada
  I1: "Score Baixo (<40)", I2: "Engajamento Baixo", I3: "Fit Baixo (<50%)",

  // Website (W1-W11) — L2 enrichment
  W1: "Sem HTTPS", W2: "Core Web Vitals Ruins", W3: "Mobile Ruim",
  W4: "Sem Meta Tags", W5: "Sem Analytics", W6: "CMS/Plataforma de Risco",
  W7: "Sem Blog/Conteudo", W8: "Sem Schema Markup", W9: "Backlink Gap",
  W10: "Baixa Leiturabilidade", W11: "Conteudo Orfao",

  // Content (C1-C5) — maturidade de conteúdo
  C1: "Conteudo Raso", C2: "Metadata Ausente", C3: "Arquitetura Pobre",
  C4: "Gap Tecnologico", C5: "Sem Estrategia de Conteudo",

  // Schema (S1-S2)
  S1: "Sem Schema LocalBusiness", S2: "Sem Schema Organization",
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
    const slug = normalizeCategory(cat)
    const supabase = getAdminClient()


    // Busca por TODAS as variantes GMB que mapeiam pro mesmo slug
    const patterns = [...new Set([cat, ...Object.entries(CATEGORY_ALIASES)
      .filter(([, s]) => s === slug)
      .map(([alias]) => alias)])]

    let q = supabase.from("discovery_listings").select("place_id,score_compound,rating_value,total_photos,is_claimed,website,l2_has_analytics,enrichment_level,schwartz_level,l2_content_maturity,category").limit(3000)

    if (patterns.length === 1) {
      q = q.ilike("category", `${patterns[0]}%`)
    } else {
      q = q.or(patterns.map(p => `category.ilike.${p}%`).join(","))
    }

    if (city) q = q.ilike("city", `%${city}%`)
    const { data, error } = await q

    if (error || !data?.length) return null
    const list = dedupByPlaceId(data); const total = list.length
    const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0
    const scores = list.map(r => r.score_compound || 0).filter(v => v > 0)
    const ratings = list.map(r => r.rating_value || 0).filter(v => v > 0)
    const photos = list.map(r => r.total_photos || 0)

    const schwartzDist = [1, 2, 3, 4, 5].map(l => { const n = list.filter(r => r.schwartz_level === l).length;

 

return { level: l, label: SCHWARTZ[l - 1], count: n, pct: Math.round((n / total) * 100) } })

    const cmList = list.filter(r => r.l2_content_maturity != null)

    const cmDist = [0, 1, 2, 3, 4].map(l => { const n = cmList.filter(r => r.l2_content_maturity === l).length;

 

return { level: l, label: ML[l], count: n, pct: cmList.length ? Math.round((n / cmList.length) * 100) : 0 } })

    
return {
      category: slug, categoryLabel: CATEGORY_LABELS[slug] || cat, city: city || "Todas as regioes",
      totalBusinesses: total, enrichedBusinesses: list.filter(r => r.enrichment_level >= 1).length,
      l1Count: list.filter(r => r.enrichment_level >= 1).length,
      l2Count: list.filter(r => r.enrichment_level >= 2).length,
      avgScore: Math.round(avg(scores)), avgRating: Math.round(avg(ratings) * 10) / 10,
      avgPhotos: Math.round(avg(photos)),
      claimedPct: Math.round((list.filter(r => r.is_claimed).length / total) * 1000) / 10,
      hasWebsitePct: Math.round((list.filter(r => r.website).length / total) * 1000) / 10,
      hasAnalyticsPct: Math.round((list.filter(r => r.l2_has_analytics).length / Math.max(total, 1)) * 1000) / 10,
      schwartzDistribution: schwartzDist, contentMaturity: cmDist,
    }
  } catch (e: any) { console.error("[market-intel] aggregate:", e.message); 

return null }
}

export async function marketGapAnalysis(cat: string, city?: string | null): Promise<MarketGap[]> {
  try {
    const slug = normalizeCategory(cat)

    const patterns = [...new Set([cat, ...Object.entries(CATEGORY_ALIASES)
      .filter(([, s]) => s === slug)
      .map(([alias]) => alias)])]

    const supabase = getAdminClient()
    let q = supabase.from("discovery_listings").select("place_id,signals_detected,enrichment_level,l2_seo_checks,is_claimed,l2_has_analytics,category").limit(3000)

    if (patterns.length === 1) {
      q = q.ilike("category", `${patterns[0]}%`)
    } else {
      q = q.or(patterns.map(p => `category.ilike.${p}%`).join(","))
    }

    if (city) q = q.ilike("city", `%${city}%`)
    const { data, error } = await q

    if (error || !data?.length) return []
    const list = dedupByPlaceId(data); const total = list.length
    const sigCounts: Record<string, number> = {}

    for (const r of list) {
      const signals: string[] = r.signals_detected || []; const seen = new Set<string>()

      for (const s of signals) { const p = s.split(":")[0];

 if (!seen.has(p)) { seen.add(p); sigCounts[p] = (sigCounts[p] || 0) + 1 } }
    }

    const hasSchema = list.filter((r: any) => { try { const c = typeof r.l2_seo_checks === "string" ? JSON.parse(r.l2_seo_checks) : r.l2_seo_checks;

 

return c?.no_jsonld_schema === true } catch { return false } }).length

    if (hasSchema > 0) sigCounts["W8"] = hasSchema
    const notClaimed = list.filter(r => !r.is_claimed).length

    if (notClaimed > 0) sigCounts["E4"] = notClaimed
    const noAnalytics = list.filter(r => r.l2_has_analytics === false).length

    if (noAnalytics > 0) sigCounts["W5"] = noAnalytics
    
return Object.entries(sigCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([sig, n], i) => {
      const p = Math.round((n / total) * 100)

      
return { rank: i + 1, signal: sig, signalLabel: SIGNAL_LABELS[sig] || sig, affectedPct: p, affectedCount: n, severity: (p > 50 ? "critico" : p > 30 ? "alto" : p > 15 ? "medio" : "baixo") as any, opportunity: p > 50 ? `Alta oportunidade — ${Math.round(n * 0.3)} negocios` : "Oportunidade de nicho" }
    })
  } catch (e: any) { console.error("[market-intel] gaps:", e.message); 

return [] }
}

export async function marketOpportunity(cat: string, city?: string | null): Promise<MarketOpportunity | null> {
  try {
    const slug = normalizeCategory(cat)

    const patterns = [...new Set([cat, ...Object.entries(CATEGORY_ALIASES)
      .filter(([, s]) => s === slug)
      .map(([alias]) => alias)])]

    const supabase = getAdminClient()
    let q = supabase.from("discovery_listings").select("place_id", { count: "exact", head: true }).limit(1)

    if (patterns.length === 1) q = q.ilike("category", `${patterns[0]}%`)
    else q = q.or(patterns.map(p => `category.ilike.${p}%`).join(","))
    const { count, error } = await q

    if (error || !count) return null
    const ticket = CATEGORY_TICKETS[slug] || 200; const tam = count * 0.05 * (ticket >= 500 ? 497 : 197)

    
return { category: slug, categoryLabel: CATEGORY_LABELS[slug] || cat, city: city || "Todas as regioes", totalAddressableMarket: count, penetratedBusinesses: 0, penetrationPct: 0, avgTicketEstimate: ticket, revenuePotentialMRR: Math.round(tam) }
  } catch (e: any) { console.error("[market-intel] opportunity:", e.message); 

return null }
}

export async function competitiveDensity(cat: string, city?: string | null): Promise<CompetitiveDensity | null> {
  try {
    const slug = normalizeCategory(cat)

    const patterns = [...new Set([cat, ...Object.entries(CATEGORY_ALIASES)
      .filter(([, s]) => s === slug)
      .map(([alias]) => alias)])]

    const supabase = getAdminClient()
    let q = supabase.from("discovery_listings").select("place_id", { count: "exact", head: true }).limit(1)

    if (patterns.length === 1) q = q.ilike("category", `${patterns[0]}%`)
    else q = q.or(patterns.map(p => `category.ilike.${p}%`).join(","))
    const { count, error } = await q

    if (error || !count) return null
    const d = city ? Math.round(count / 100 * 10) / 10 : Math.round(count / 500 * 10) / 10
    const sat = d > 10 ? "saturada" : d > 5 ? "alta" : d > 2 ? "media" : "baixa"

    
return { category: slug, categoryLabel: CATEGORY_LABELS[slug] || cat, city: city || "SP", totalCompetitors: count, areaKm2: city ? 100 : 500, densityPerKm2: d, saturation: sat as any, avgRating: 3.5, topRatedPct: 0 }
  } catch (e: any) { console.error("[market-intel] density:", e.message); 

return null }
}

/** Visão geral agregada de TODAS as categorias e cidades. Sem filtro. */
export async function marketOverview(): Promise<(MarketOverview & { categoryCount: number; cityCount: number; l1Count: number; l2Count: number }) | null> {
  try {
    const supabase = getAdminClient()

    const { data, error } = await supabase
      .from("discovery_listings")
      .select("place_id,score_compound,rating_value,total_photos,is_claimed,website,l2_has_analytics,enrichment_level,schwartz_level,category,city")
      .limit(5000)

    if (error || !data?.length) return null

    const list = dedupByPlaceId(data); const total = list.length
    const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0
    const scores = list.map(r => r.score_compound || 0).filter(v => v > 0)
    const ratings = list.map(r => r.rating_value || 0).filter(v => v > 0)

    const catSet = new Set<string>()

    for (const r of list) {
      const slug = normalizeCategory((r.category || "").toLowerCase().replace(/\s+/g, "_"))

      catSet.add(slug)
    }

    const citySet = new Set<string>()

    for (const r of list) { if (r.city) citySet.add(r.city) }

    const schwartzDist = [1, 2, 3, 4, 5].map(l => {
      const n = list.filter(r => r.schwartz_level === l).length

      
return { level: l, label: SCHWARTZ[l - 1], count: n, pct: Math.round((n / total) * 100) }
    })

    const cmList = list.filter(r => r.l2_content_maturity != null)

    const cmDist = [0, 1, 2, 3, 4].map(l => {
      const n = cmList.filter(r => r.l2_content_maturity === l).length

      
return { level: l, label: ML[l], count: n, pct: cmList.length ? Math.round((n / cmList.length) * 100) : 0 }
    })

    // IBGE + market_holds cross-reference (ADR-0027)
    let marketHolds: MarketOverview["marketHolds"] = null
    let ibgeContext: MarketOverview["ibgeContext"] = null

    try {
      // Latest market_holds for the most common category
      const { data: holds } = await supabase.from("market_holds").select("category,city,metric,value").limit(10)

      if (holds?.length) {
        const latest = holds[holds.length - 1]

        marketHolds = {
          totalInRegion: holds.find((h: any) => h.metric === "total_businesses")?.value || 0,
          avgScore: holds.find((h: any) => h.metric === "avg_score")?.value || avg(scores),
          claimedPct: holds.find((h: any) => h.metric === "claimed_pct")?.value || 0,
        }
      }

      // IBGE panorama for most common city
      const topCity = [...citySet].sort((a, b) =>
        list.filter(r => r.city === b).length - list.filter(r => r.city === a).length
      )[0]

      if (topCity) {
        const { data: ibgeRow } = await supabase.from("ibge_panorama")
          .select("populacao,pib_per_capita,densidade_demografica")
          .ilike("municipio_nome", `%${topCity}%`)
          .limit(1)

        if (ibgeRow?.length) {
          ibgeContext = {
            populacao: ibgeRow[0].populacao || null,
            pibPerCapita: ibgeRow[0].pib_per_capita || null,
            densidade: ibgeRow[0].densidade_demografica || null,
          }
        }
      }
    } catch { /* market_holds/IBGE offline — degrade gracefully */ }

    const l4Count = list.filter(r => (r as any).l4_ibge_populacao != null).length
    const l5Count = list.filter(r => (r as any).cnpj_enriched === true).length

    return {
      category: "all", categoryLabel: "Todas as categorias", city: `${citySet.size} cidades`,
      totalBusinesses: total, enrichedBusinesses: list.filter(r => r.enrichment_level >= 1).length,
      l1Count: list.filter(r => r.enrichment_level >= 1).length,
      l2Count: list.filter(r => r.enrichment_level >= 2).length,
      l4Count, l5Count,
      avgScore: Math.round(avg(scores)), avgRating: Math.round(avg(ratings) * 10) / 10,
      avgPhotos: Math.round(avg(list.map(r => r.total_photos || 0))),
      claimedPct: Math.round((list.filter(r => r.is_claimed).length / total) * 1000) / 10,
      hasWebsitePct: Math.round((list.filter(r => r.website).length / total) * 1000) / 10,
      hasAnalyticsPct: Math.round((list.filter(r => r.l2_has_analytics).length / Math.max(total, 1)) * 1000) / 10,
      schwartzDistribution: schwartzDist, contentMaturity: cmDist,
      categoryCount: catSet.size, cityCount: citySet.size,
      marketHolds, ibgeContext,
    }
  } catch (e: any) { console.error("[market-intel] overview:", e.message); 

return null }
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
    const { data, error } = await supabase.from("discovery_listings").select("category").not("category", "is", null).limit(5000)

    if (error || !data) return []
    const c: Record<string, number> = {}

    for (const r of data) {
      const slug = normalizeCategory((r.category || "").toLowerCase().replace(/\s+/g, "_"))

      c[slug] = (c[slug] || 0) + 1
    }

    
return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([slug, n]) => ({ category: slug, label: CATEGORY_LABELS[slug] || slug, count: n }))
  } catch { return [] }
}

export async function listMarketCities(): Promise<{ city: string; count: number }[]> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.from("discovery_listings").select("city").not("city", "is", null).limit(2000)

    if (error || !data) return []
    const c: Record<string, number> = {};

 for (const r of data) { const k = r.city || "?";

 c[k] = (c[k] || 0) + 1 }
    
return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([city, n]) => ({ city, count: n }))
  } catch { return [] }
}
