// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Category Intelligence Engine (ADR-0050)
// Transforma 29 categorias ICP em dimensões de mercado vivas.
// Cobertura % · Oportunidade · Gaps · Marketing Intelligence
// O motor de mercado interno que ninguém tem.
// medido=verdade · $0 · 2026-07-20
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { ICP_CATEGORIES, ICP_CATEGORY_LABELS } from "./scoring"
import { normalizeCategory } from "./market-intel"
import { discoverSkills } from "../../../../packages/warp/src/marketing-kg"

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

function supaHeaders(): Record<string, string> {
  return { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
}

export interface CategoryIntelligence {
  category: string
  label: string
  segment: string
  icpSignals: string[]

  coverage: {
    totalDiscovered: number
    uniquePlaceIds: number
    coveragePctBR: number
    topCities: { city: string; count: number; pct: number }[]
    gaps: { city: string; state: string; estimatedMissing: number; priority: number }[]
  }

  quality: {
    avgScore: number
    pctWithWebsite: number
    pctWithPhone: number
    pctBusinessWA: number
    pctEnrichedL2: number
    pctEnrichedL3: number
    scoreDistribution: { unaware: number; problemAware: number; solutionAware: number; productAware: number; mostAware: number }
    topGaps: string[]
  }

  conversion: {
    raioXSent: number
    proposalsGenerated: number
    clientsActive: number
    mrrByCategory: number
  }

  opportunity: {
    score: number
    recommendedRegions: { city: string; state: string; reason: string }[]
    nextAction: string
    estimatedCost: number
    estimatedROI: string
  }

  marketingIntel: {
    topSkills: string[]
    strategyRecommendation: string
    competitiveLandscape: string
    enriched: boolean
  }
}

const SEGMENT_MAP: Record<string, string> = {
  dentist: "saude", orthodontist: "saude", medical_aesthetic_clinic: "saude",
  medical_clinic: "saude", psychologist: "saude", physical_therapist: "saude",
  ophthalmologist: "saude", cardiologist: "saude", pharmacy: "saude", veterinarian: "saude",
  barber_shop: "beleza", beauty_salon: "beleza",
  restaurant: "alimentacao", pizza_restaurant: "alimentacao", bakery: "alimentacao",
  gym: "servicos", lawyer: "servicos", real_estate_agency: "servicos",
  accountant: "servicos", car_repair: "servicos",
  architect: "servicos", interior_designer: "servicos",
  electrician: "servicos", plumber: "servicos", cleaning_service: "servicos",
  pet_store: "comercio",
  school: "educacao", driving_school: "educacao",
  hotel: "hospitalidade",
}

function catToSegment(cat: string): string {
  return SEGMENT_MAP[cat] || "servicos"
}

/** Retorna inteligência de mercado para 1 ou todas as 29 categorias ICP. */
export async function getCategoryIntelligence(category?: string): Promise<CategoryIntelligence[]> {
  const categories = category ? [category] : [...ICP_CATEGORIES]
  if (!SUPA_KEY) return []

  try {
    // ═══ 1. Aggregate from discovery_listings (REST API) ═══
    // Paginate: Supabase REST caps at 1000 rows/request. Fetch all pages.
    const allListings: any[] = []
    const fields = "category,place_id,city,district,score_compound,schwartz_label,website,phone,wa_is_business,wa_has_whatsapp,enrichment_level,is_claimed,rating_value"
    const pageSize = 1000
    for (let offset = 0; offset < 6000; offset += pageSize) {
      const pageRes = await fetch(
        `${SUPA_URL}/rest/v1/discovery_listings?select=${encodeURIComponent(fields)}&limit=${pageSize}&offset=${offset}&order=created_at.desc`,
        { headers: supaHeaders(), signal: AbortSignal.timeout(10000) },
      )
      if (!pageRes.ok) break
      const page = await pageRes.json() as any[]
      if (!page?.length) break
      allListings.push(...page)
      if (page.length < pageSize) break
    }
    // Normalize DB categories (Beauty salon → beauty_salon, Dentist → dentist)
    const catLower = new Set(categories.map(c => c.toLowerCase()))
    const listings = allListings.filter((l: any) => {
      if (!l.category) return false
      const normalized = normalizeCategory(String(l.category))
      return catLower.has(normalized.toLowerCase()) || catLower.has(String(l.category).toLowerCase().replace(/\s+/g, "_"))
    })
    if (!listings?.length) return []

    // ═══ 2. IBGE context (REST API) ═══
    const ibgeRes = await fetch(
      `${SUPA_URL}/rest/v1/ibge_panorama?select=municipio_nome,populacao,pib_per_capita,uf&limit=500`,
      { headers: supaHeaders(), signal: AbortSignal.timeout(5000) },
    )
    const ibgeData = ibgeRes.ok ? await ibgeRes.json() as any[] : []
    const ibgeCities = new Set((ibgeData || []).map(r => r.municipio_nome?.toLowerCase().trim()).filter(Boolean))

    // ═══ 3. Build per-category intelligence ═══
    const results: CategoryIntelligence[] = []

    for (const cat of categories) {
      const catListings = (listings || []).filter(l => {
        if (!l.category) return false
        const normalized = normalizeCategory(String(l.category))
        return normalized.toLowerCase() === cat.toLowerCase()
      })
      if (!catListings.length) {
        results.push(emptyCategoryIntel(cat))
        continue
      }

      const uniquePlaces = new Set(catListings.map(l => l.place_id)).size
      const total = catListings.length

      // ── Coverage by city ──
      const byCity = new Map<string, { count: number; state: string }>()
      for (const l of catListings) {
        if (!l.city) continue
        const key = l.city.toLowerCase().trim()
        const existing = byCity.get(key)
        if (existing) existing.count++
        else byCity.set(key, { count: 1, state: "" })
      }

      // ── Gaps: cities in IBGE with 0 coverage ──
      const coveredCities = new Set(byCity.keys())
      const uncoveredCities = [...ibgeCities]
        .filter(c => !coveredCities.has(c))
        .slice(0, 15)
        .map(city => {
          const ibge = (ibgeData || []).find(r => r.municipio_nome?.toLowerCase().trim() === city)
          return {
            city: ibge?.municipio_nome || city,
            state: ibge?.uf || "",
            estimatedMissing: ibge ? Math.max(5, Math.round((ibge.populacao || 100000) / 5000)) : 10,
            priority: 0,
          }
        })
        .sort((a, b) => b.estimatedMissing - a.estimatedMissing)

      // Calculate priority for gaps
      const maxMissing = Math.max(...uncoveredCities.map(g => g.estimatedMissing), 1)
      for (const g of uncoveredCities) {
        g.priority = Math.round((g.estimatedMissing / maxMissing) * 100)
      }

      // ── Quality ──
      const scores = catListings.map(l => l.score_compound || 0).filter(s => s > 0)
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const pctWithWebsite = Math.round((catListings.filter(l => l.website).length / total) * 100)
      const pctWithPhone = Math.round((catListings.filter(l => l.phone).length / total) * 100)
      const pctBusinessWA = Math.round((catListings.filter(l => l.wa_is_business).length / total) * 100)
      const pctL2 = Math.round((catListings.filter(l => (l.enrichment_level || 0) >= 2).length / total) * 100)
      const pctL3 = Math.round((catListings.filter(l => (l.enrichment_level || 0) >= 3).length / total) * 100)

      const schwartzDist = { unaware: 0, problemAware: 0, solutionAware: 0, productAware: 0, mostAware: 0 }
      for (const l of catListings) {
        const s = l.score_compound || 0
        if (s < 30) schwartzDist.unaware++
        else if (s < 50) schwartzDist.problemAware++
        else if (s < 70) schwartzDist.solutionAware++
        else if (s < 85) schwartzDist.productAware++
        else schwartzDist.mostAware++
      }

      // ── Opportunity score (0-100) ──
      const estimatedTotalMarket = uniquePlaces + uncoveredCities.reduce((s, g) => s + g.estimatedMissing, 0)
      const coveragePct = Math.round((uniquePlaces / Math.max(estimatedTotalMarket, 1)) * 100)
      const opportunityScore = Math.min(100, Math.round(
        (100 - Math.min(coveragePct, 100)) * 0.35 +
        Math.min(avgScore, 80) * 0.20 +
        Math.min(pctWithWebsite, 80) * 0.15 +
        Math.min(pctBusinessWA, 80) * 0.15 +
        Math.min(pctL2, 80) * 0.15
      ))

      // ── Marketing Intelligence (ADR-0049) ──
      const mktIntel = await enrichCategoryWithSkills(cat, avgScore, pctWithWebsite, uniquePlaces)

      // ── ROI estimate ──
      const estimatedROI = avgScore > 55
        ? "ROI positivo em < 1 mês"
        : avgScore > 40 ? "ROI em 2-3 meses" : "ROI incerto — leads com score baixo"

      results.push({
        category: cat,
        label: ICP_CATEGORY_LABELS[cat] || cat,
        segment: catToSegment(cat),
        icpSignals: ["F1", "F3"],
        coverage: {
          totalDiscovered: total,
          uniquePlaceIds: uniquePlaces,
          coveragePctBR: coveragePct,
          topCities: [...byCity.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([city, data]) => ({ city, count: data.count, pct: Math.round((data.count / total) * 100) })),
          gaps: uncoveredCities.slice(0, 10),
        },
        quality: {
          avgScore, pctWithWebsite, pctWithPhone, pctBusinessWA, pctEnrichedL2: pctL2, pctEnrichedL3: pctL3,
          scoreDistribution: schwartzDist,
          topGaps: [],
        },
        conversion: { raioXSent: 0, proposalsGenerated: 0, clientsActive: 0, mrrByCategory: 0 },
        opportunity: {
          score: opportunityScore,
          recommendedRegions: uncoveredCities.slice(0, 3).map(g => ({
            city: g.city, state: g.state,
            reason: `${g.city} (${g.state}) — ~${g.estimatedMissing} estabelecimentos estimados, 0% coberto`,
          })),
          nextAction: uncoveredCities.length > 0
            ? `Prospectar ${uncoveredCities[0].city} (${uncoveredCities[0].state}) — oportunidade ${opportunityScore}/100`
            : `Categoria bem coberta (${coveragePct}%). Expandir raio ou testar categorias complementares.`,
          estimatedCost: uncoveredCities.slice(0, 3).length * 0.048,
          estimatedROI,
        },
        marketingIntel: mktIntel,
      })
    }

    return results.sort((a, b) => b.opportunity.score - a.opportunity.score)
  } catch (e: unknown) {
    console.error("[category-intel]", (e as Error).message?.slice(0, 120))
    return []
  }
}

async function enrichCategoryWithSkills(
  cat: string, avgScore: number, pctWeb: number, competitorCount: number,
): Promise<CategoryIntelligence["marketingIntel"]> {
  try {
    const skills = await discoverSkills({
      businessName: ICP_CATEGORY_LABELS[cat] || cat,
      category: cat,
      segment: catToSegment(cat),
      city: "Brasil",
      district: "",
      score: avgScore,
      rating: 0,
      reviews: 0,
      isClaimed: false,
      hasWebsite: pctWeb > 30,
      competitorCount,
      topGaps: [],
      schwartzLevel: "Problem Aware",
    }, 5)

    if (!skills.length) {
      return { topSkills: [], strategyRecommendation: "", competitiveLandscape: "", enriched: false }
    }

    return {
      topSkills: skills.map(s => s.skillName).slice(0, 5),
      strategyRecommendation: skills[0]?.content?.slice(0, 250) || "",
      competitiveLandscape: competitorCount > 100
        ? `Alta densidade (${competitorCount}+ concorrentes). Diferenciação é crítica.`
        : competitorCount > 30
          ? `Média densidade (${competitorCount} concorrentes). Nicho específico > generalista.`
          : `Baixa densidade. Oportunidade de ser o primeiro bem posicionado.`,
      enriched: true,
    }
  } catch (e: unknown) { void e; return { topSkills: [], strategyRecommendation: "", competitiveLandscape: "", enriched: false } }
}

function emptyCategoryIntel(cat: string): CategoryIntelligence {
  return {
    category: cat, label: ICP_CATEGORY_LABELS[cat] || cat, segment: catToSegment(cat),
    icpSignals: [], coverage: { totalDiscovered: 0, uniquePlaceIds: 0, coveragePctBR: 0, topCities: [], gaps: [] },
    quality: { avgScore: 0, pctWithWebsite: 0, pctWithPhone: 0, pctBusinessWA: 0, pctEnrichedL2: 0, pctEnrichedL3: 0, scoreDistribution: { unaware: 0, problemAware: 0, solutionAware: 0, productAware: 0, mostAware: 0 }, topGaps: [] },
    conversion: { raioXSent: 0, proposalsGenerated: 0, clientsActive: 0, mrrByCategory: 0 },
    opportunity: { score: 0, recommendedRegions: [], nextAction: "Sem dados. Execute o primeiro discovery nesta categoria.", estimatedCost: 0, estimatedROI: "N/A" },
    marketingIntel: { topSkills: [], strategyRecommendation: "", competitiveLandscape: "", enriched: false },
  }
}

/** Quick summary: top 5 categories by opportunity (no IBGE enrichment, fast) */
export async function getCategoryOpportunityQuick(): Promise<{ category: string; label: string; score: number; totalLeads: number; gapCities: number }[]> {
  const intel = await getCategoryIntelligence()
  return intel.slice(0, 5).map(ci => ({
    category: ci.category, label: ci.label, score: ci.opportunity.score,
    totalLeads: ci.coverage.totalDiscovered,
    gapCities: ci.coverage.gaps.length,
  }))
}
