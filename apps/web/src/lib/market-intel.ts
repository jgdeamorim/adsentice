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

// ── PRE-FLIGHT MARKET INTEL (ADR-0029 · $0 queries) ──

export interface PreflightMarketIntel {
  stateName: string; stateUf: string
  rmName: string  // nome da RM (ex: "Vitória")
  totalMunicipalities: number
  totalLeads: number
  totalCost: number
  newestAt: string
  byMunicipality: { nome: string; totalCount: number; populacao?: number | null; cep?: string | null }[]
  byCategory: { category: string; label: string; totalCount: number; isAggregated?: boolean }[]
  ibgeContext?: { populacao: number | null; pibPerCapita: number | null; densidade: number | null } | null
}

// ── Cache interno (TTL 24h — mesmo do dataset municipios) ──
let _geoCache: { data: { nome: string; cidade: string; uf: string; lat: number; lng: number }[] | null; ts: number } = { data: null, ts: 0 }

async function loadGeoCache(): Promise<{ nome: string; cidade: string; uf: string; lat: number; lng: number }[]> {
  if (_geoCache.data && (Date.now() - _geoCache.ts) < 86_400_000) return _geoCache.data
  try {
    const supabase = getAdminClient()
    // Load district_registry + IBGE coordinates via municipios dataset
    const { data: districts } = await supabase.from("district_registry").select("district,city,uf").limit(500)
    if (!districts?.length) return _geoCache.data || []

    // Fetch municipio coords from public dataset
    const res = await fetch(
      "https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json",
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return _geoCache.data || []
    const coords = await res.json() as { nome: string; latitude: number; longitude: number; codigo_uf: number }[]

    const UF_CODES: Record<number, string> = { 11:'RO',12:'AC',13:'AM',14:'RR',15:'PA',16:'AP',17:'TO',21:'MA',22:'PI',23:'CE',24:'RN',25:'PB',26:'PE',27:'AL',28:'SE',29:'BA',31:'MG',32:'ES',33:'RJ',35:'SP',41:'PR',42:'SC',43:'RS',50:'MS',51:'MT',52:'GO',53:'DF' }
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")
    const coordMap = new Map<string, { lat: number; lng: number }>()
    for (const c of coords) {
      const uf = UF_CODES[c.codigo_uf] || 'XX'
      coordMap.set(`${normalize(c.nome)}|${uf}`, { lat: c.latitude, lng: c.longitude })
    }

    const result = districts.map((d: any) => {
      const key = `${normalize(d.district)}|${d.uf}`
      const coord = coordMap.get(key)
      return { nome: d.district, cidade: d.city, uf: d.uf, lat: coord?.lat || 0, lng: coord?.lng || 0 }
    }).filter((d: any) => d.lat !== 0)

    _geoCache = { data: result, ts: Date.now() }
    return result
  } catch { return _geoCache.data || [] }
}

/** Nearest municipality match by lat/lng distance */
function findNearestMun(lat: number, lng: number, geoNames: { nome: string; cidade: string; uf: string; lat: number; lng: number }[]): { nome: string; cidade: string; uf: string } | null {
  let best: { nome: string; cidade: string; uf: string } | null = null; let bestD = Infinity
  for (const g of geoNames) {
    if (!g.lat || !g.lng) continue
    const d = Math.abs(lat - g.lat) + Math.abs(lng - g.lng)
    if (d < bestD && d < 0.5) { bestD = d; best = { nome: g.nome, cidade: g.cidade, uf: g.uf } }
  }
  return best
}

/** Agrega pre-flights do discovery_searches por estado/UF.
 *  Cruza com district_registry + IBGE + dataset municipios-brasileiros.
 *  $0 — Supabase read-only, sem DataForSEO. */
export async function getPreflightMarketIntel(): Promise<PreflightMarketIntel[]> {
  try {
    const supabase = getAdminClient()

    const [searchRows, geoNames, ibgeRows] = await Promise.all([
      supabase.from("discovery_searches")
        .select("id,categories,lat,lng,total_count,cost_usd,created_at,search_metadata")
        .order("created_at", { ascending: false }).limit(500),
      loadGeoCache(),
      supabase.from("ibge_panorama").select("municipio_nome,uf,populacao,pib_per_capita,densidade_demografica").limit(500),
    ])

    const rows = searchRows.data
    if (!rows?.length) return []

    // IBGE map by normalized name
    const normalize = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")
    const ibgeMap = new Map<string, any>()
    for (const r of (ibgeRows.data || [])) {
      ibgeMap.set(normalize(r.municipio_nome), r)
    }

    // Filter pre-flight rows only
    const pfRows = rows.filter((r: any) => {
      try {
        const meta = typeof r.search_metadata === "string" ? JSON.parse(r.search_metadata) : r.search_metadata
        return meta?.preflight === true
      } catch { return false }
    })
    if (!pfRows.length) return []

    // Group by UF
    const stateMap = new Map<string, {
      rmName: string; uf: string
      totalLeads: number; totalCost: number; newestAt: string
      municipalities: Map<string, { totalCount: number; lat: number; lng: number }>
      categories: Map<string, number>
    }>()

    for (const r of pfRows) {
      const mun = findNearestMun(r.lat, r.lng, geoNames)
      const uf = mun?.uf || resolveUf(r.lat, r.lng)
      if (!uf) continue
      const munName = mun?.nome || `${r.lat?.toFixed(2)},${r.lng?.toFixed(2)}`
      const rmName = mun?.cidade || uf

      let entry = stateMap.get(uf)
      if (!entry) {
        entry = { rmName, uf, totalLeads: 0, totalCost: 0, newestAt: r.created_at,
          municipalities: new Map(), categories: new Map() }
        stateMap.set(uf, entry)
      }

      entry.totalLeads += r.total_count || 0
      entry.totalCost += r.cost_usd || 0
      if (r.created_at > entry.newestAt) entry.newestAt = r.created_at

      const existing = entry.municipalities.get(munName)
      if (!existing || r.total_count > existing.totalCount) {
        entry.municipalities.set(munName, { totalCount: r.total_count || 0, lat: r.lat, lng: r.lng })
      }

      // DataForSEO retorna total_count AGREGADO para todas as categorias juntas.
      // Não temos breakdown por categoria individual com pre-flight multi-cat.
      // Marcamos cada categoria com total_count=0 (placeholder — o total real é entry.totalLeads).
      for (const cat of (r.categories || [])) {
        if (!entry.categories.has(cat)) entry.categories.set(cat, 0)
      }
    }

    const UF_LABELS: Record<string, string> = {
      SP:"São Paulo",RJ:"Rio de Janeiro",ES:"Espírito Santo",MG:"Minas Gerais",
      BA:"Bahia",PR:"Paraná",RS:"Rio Grande do Sul",CE:"Ceará",PE:"Pernambuco",
      SC:"Santa Catarina",GO:"Goiás",DF:"Distrito Federal",AM:"Amazonas",
      PA:"Pará",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",
      AL:"Alagoas",RN:"Rio Grande do Norte",PI:"Piauí",PB:"Paraíba",
      SE:"Sergipe",RO:"Rondônia",TO:"Tocantins",AC:"Acre",AP:"Amapá",RR:"Roraima",
    }

    const result: PreflightMarketIntel[] = []
    for (const [uf, entry] of stateMap) {
      // IBGE context for the capital/RM city
      const ibgeCtx = ibgeMap.get(normalize(entry.rmName))
      const ibgeContext = ibgeCtx ? {
        populacao: ibgeCtx.populacao || null,
        pibPerCapita: ibgeCtx.pib_per_capita || null,
        densidade: ibgeCtx.densidade_demografica || null,
      } : null

      result.push({
        stateName: UF_LABELS[uf] || uf,
        stateUf: uf,
        rmName: entry.rmName,
        totalMunicipalities: entry.municipalities.size,
        totalLeads: entry.totalLeads,
        totalCost: Math.round(entry.totalCost * 10000) / 10000,
        newestAt: entry.newestAt,
        byMunicipality: [...entry.municipalities.entries()]
          .sort((a, b) => b[1].totalCount - a[1].totalCount)
          .map(([nome, d]) => {
            const ibge = ibgeMap.get(normalize(nome))
            return {
              nome,
              totalCount: d.totalCount,
              populacao: ibge?.populacao || null,
              cep: null,  // Nominatim preenchido sob demanda
            }
          }),
        byCategory: [...entry.categories.entries()]
          .map(([category]) => ({
            category,
            label: CATEGORY_LABELS[category] || category,
            totalCount: entry.totalLeads,  // aggregated — DataForSEO não quebra por categoria
            isAggregated: true,
          })),
        ibgeContext,
      })
    }

    return result.sort((a, b) => b.totalLeads - a.totalLeads)
  } catch (e: any) {
    console.error("[market-intel] preflight:", e.message)
    return []
  }
}

export function resolveUf(lat: number, lng: number): string | null {
  const caps: [string, number, number][] = [
    ["SP", -23.55, -46.63], ["RJ", -22.91, -43.17], ["ES", -20.32, -40.34],
    ["MG", -19.92, -43.93], ["DF", -15.78, -47.93], ["BA", -12.97, -38.50],
    ["CE", -3.72, -38.53], ["PE", -8.05, -34.88], ["PR", -25.43, -49.27],
    ["RS", -30.03, -51.23], ["AM", -3.12, -60.03], ["PA", -1.46, -48.48],
    ["GO", -16.68, -49.25], ["MA", -2.53, -44.30], ["AL", -9.67, -35.73],
    ["RN", -5.80, -35.21], ["PI", -5.09, -42.80], ["PB", -7.12, -34.86],
    ["MT", -15.60, -56.10], ["MS", -20.44, -54.64], ["SE", -10.95, -37.07],
    ["SC", -27.60, -48.55], ["RO", -8.76, -63.90], ["AP", 0.03, -51.07],
    ["AC", -9.97, -67.81], ["RR", 2.82, -60.67], ["TO", -10.18, -48.33],
  ]
  let best: string | null = null; let bestD = Infinity
  for (const [uf, clat, clng] of caps) {
    const d = Math.abs(lat - clat) + Math.abs(lng - clng) * 0.5
    if (d < bestD && d < 3) { bestD = d; best = uf }
  }
  return best
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
