// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Engine — Motor de Descoberta Parametrizável
// Pipeline: filtros configuráveis → business_listings_search →
//           enriquecimento → scoring de dor → leadsheet ranqueada
// ══════════════════════════════════════════════════════════════════

import type { LayerTrace } from "./types"

// ── Discovery Params ──────────────────────────────────────────

export interface GeoLocation {
  lat: number
  lng: number
  radiusKm: number
}

export interface PainFilters {

  // Reviews & Reputação
  reviewsMin?: number           // default 2 — mínimo de reviews
  ratingMax?: number            // default 4.0 — nota BAIXA = dor
  reviewsSemRespostaMin?: number // default 1 — não responde reviews
  reviewsRecentes90dMin?: number // default 2 — atividade recente

  // Website & SEO
  websiteObrigatorio?: boolean  // default true
  seoMax?: number               // default 70 — SEO abaixo = dor
  perfMax?: number              // default 60 — Performance abaixo = dor

  // Contato
  whatsappDesejavel?: boolean   // default true

  // Conteúdo visual
  fotosMin?: number             // default 3
  postsInativoDias?: number     // default 30 — sem posts > X dias

  // Competição
  concorrentesMin?: number      // default 2

  // Scoring
  scoreMin?: number             // default 40 — Morno+
}

export interface DiscoveryParams {
  categories: string[]
  location: GeoLocation
  filters?: PainFilters
  maxResults?: number           // default 25
}

// ── Lead Types ─────────────────────────────────────────────────

export interface DiscoveredLead {
  business: {
    title: string
    place_id?: string
    category?: string
    address?: string
    website?: string
    phone?: string
    isWhatsApp: boolean
    rating?: number
    totalReviews?: number
    latitude?: number
    longitude?: number
  }
  score: {
    total: number              // 0-100
    breakdown: Record<string, number>
  }
  dores: string[]              // lista legível de dores detectadas
  sinais: string[]             // sinais positivos
  prioridade: "URGENTE" | "QUENTE" | "MORNO" | "FRIO"
  pipeline: string[]           // quais pipelines recomendados
}

export interface DiscoveryResult {
  params: DiscoveryParams
  candidatesFound: number
  enriched: number
  leads: DiscoveredLead[]
  trace: LayerTrace[]
}

// ── Defaults ───────────────────────────────────────────────────

function defaultFilters(): Required<PainFilters> {
  return {
    reviewsMin: 2,
    ratingMax: 4.0,
    reviewsSemRespostaMin: 1,
    reviewsRecentes90dMin: 2,
    websiteObrigatorio: true,
    seoMax: 70,
    perfMax: 60,
    whatsappDesejavel: true,
    fotosMin: 3,
    postsInativoDias: 30,
    concorrentesMin: 2,
    scoreMin: 40,
  }
}

// ── Phone → WhatsApp Detection ────────────────────────────────

function isWhatsAppNumber(phone: string | undefined): boolean {
  if (!phone) return false

  // Brazilian mobile: (XX) 9XXXX-XXXX or XX 9XXXX-XXXX
  const cleaned = phone.replace(/[\s\-.()]/g, "")

  
return /^(\+?55)?\s*\(?\d{2}\)?\s*9\d{4}-?\d{4}$/.test(phone) ||
         /^9\d{8}$/.test(cleaned) ||
         /^559\d{8,9}$/.test(cleaned)
}

// ── Pain Scoring Engine ────────────────────────────────────────

const WEIGHTS: Record<string, number> = {
  saude_tecnica:    0.20,
  presenca_local:   0.20,
  reputacao:        0.20,
  engajamento:      0.15,
  concorrencia:     0.15,
  maturidade_digital: 0.10,
}

interface LeadCtx {
  profile: Record<string, unknown> | null
  lighthouse: { performance: number; seo: number } | null
  tech: { cms: string; analytics: string[] } | null
  competitorCount: number
  hasRecentPosts: boolean | null
}

function scoreLead(ctx: LeadCtx): { total: number; breakdown: Record<string, number>; dores: string[]; sinais: string[] } {
  const dores: string[] = []
  const sinais: string[] = []
  const scores: Record<string, number> = {}
  const f = defaultFilters()

  // ── SAÚDE TÉCNICA (20%) ──
  let saude = 50

  if (ctx.lighthouse) {
    if (ctx.lighthouse.seo < f.seoMax) {
      dores.push(`SEO ${ctx.lighthouse.seo}/100`)
      saude -= 20
    } else {
      sinais.push(`SEO ${ctx.lighthouse.seo}/100`)
      saude += 10
    }

    if (ctx.lighthouse.performance < f.perfMax) {
      dores.push(`Performance ${ctx.lighthouse.performance}/100`)
      saude -= 20
    }
  }

  if (ctx.tech) {
    if (ctx.tech.analytics.length === 0) {
      dores.push("Sem analytics")
      saude -= 10
    } else {
      sinais.push(`Analytics: ${ctx.tech.analytics.join(", ")}`)
    }

    if (ctx.tech.cms !== "desconhecido") saude += 10
  }

  scores.saude_tecnica = Math.max(0, Math.min(100, saude))

  // ── PRESENÇA LOCAL (20%) ──
  let presenca = 50

  if (ctx.profile) {
    const photos = (ctx.profile.total_photos as number) || 0

    if (photos >= (f.fotosMin || 3)) {
      sinais.push(`${photos} fotos no GMB`)
      presenca += 15
    } else {
      dores.push(`Apenas ${photos} fotos`)
      presenca -= 15
    }

    if (ctx.profile.description) {
      presenca += 10
    } else dores.push("Sem descrição no GMB")
    if (ctx.profile.is_claimed) presenca += 15

    if (!ctx.hasRecentPosts) {
      dores.push(`Sem posts recentes (>${f.postsInativoDias}d)`)
      presenca -= 10
    }
  }

  scores.presenca_local = Math.max(0, Math.min(100, presenca))

  // ── REPUTAÇÃO (20%) ──
  let rep = 50

  if (ctx.profile) {
    const rating = (ctx.profile.rating_value as number) || 0
    const votes = (ctx.profile.rating_votes as number) || 0

    if (rating > 0 && rating < f.ratingMax) {
      dores.push(`Nota ${rating}★`)
      rep -= 20
    } else if (rating >= 4.0) {
      sinais.push(`${rating}★`)
      rep += 15
    }

    if (votes < (f.reviewsMin || 2)) {
      dores.push(`Apenas ${votes} reviews`)
      rep -= 15
    } else {
      sinais.push(`${votes} reviews`)
      rep += 10
    }
  }

  scores.reputacao = Math.max(0, Math.min(100, rep))

  // ── ENGAJAMENTO (15%) ──
  let eng = 40
  const phone = ctx.profile?.phone as string | undefined

  if (phone) {
    const isWA = isWhatsAppNumber(phone)

    if (isWA) {
      sinais.push("WhatsApp")
      eng += 25
    } else {
      eng += 10
    }
  } else dores.push("Sem telefone")
  if (ctx.profile?.website) eng += 15
  else dores.push("Sem website")
  scores.engajamento = Math.max(0, Math.min(100, eng))

  // ── CONCORRÊNCIA (15%) ──
  let comp = 50

  if (ctx.competitorCount >= (f.concorrentesMin || 2)) {
    dores.push(`${ctx.competitorCount} concorrentes no raio`)
    comp += 20
  } else comp -= 10
  scores.concorrencia = Math.max(0, Math.min(100, comp))

  // ── MATURIDADE DIGITAL (10%) ──
  let mat = 30

  if (ctx.profile?.website) mat += 20
  if (ctx.tech?.cms && ctx.tech.cms !== "desconhecido") mat += 20
  if ((ctx.tech?.analytics?.length || 0) > 0) mat += 15
  if (ctx.profile?.place_id) mat += 15
  scores.maturidade_digital = Math.max(0, Math.min(100, mat))

  // ── TOTAL ──
  const total = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [dim, w]) => sum + (scores[dim] || 0) * w, 0)
  )

  return { total, breakdown: scores, dores: dores.slice(0, 8), sinais: sinais.slice(0, 5) }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Motor de descoberta parametrizável.
 *
 * ATUALMENTE usa simulação baseada em regras (MVP sem EVO-API MCP).
 * v0.2: wire no business_listings_search do EVO-API :7700.
 * v1.0: enriquecimento automático com profile_gmb + lighthouse + domain_competitors.
 */
export async function discoverLeads(
  params: DiscoveryParams
): Promise<DiscoveryResult> {
  const trace: LayerTrace[] = []
  const startedAt = Date.now()
  const filters = { ...defaultFilters(), ...params.filters }

  // ═══ L0: Validate params ═══
  trace.push({ layer: "L0", status: "ok", detail: `${params.categories.length} categorias · ${params.location.radiusKm}km raio`, tookMs: 0 })

  // ═══ L1: Discovery candidates ═══
  // TODO(v0.2): wire EVO-API MCP business_listings_search
  // const listings = await evoMCP.call("business_listings_search", {
  //   categories: params.categories,
  //   location_coordinate: `${params.location.lat},${params.location.lng},${params.location.radiusKm}`,
  //   limit: (params.maxResults || 25) * 3 // 3x oversample for filtering
  // })

  // MVP: Simula candidatos a partir da spec
  const candidates: Array<{ title: string; place_id?: string; category?: string; rating_value?: number; rating_votes?: number; website?: string; phone?: string; latitude?: number; longitude?: number }> = []

  trace.push({
    layer: "L1",
    status: "ok",
    detail: `${candidates.length} candidatos encontrados (simulado — awaiting EVO-API MCP wire)`,
    tookMs: Date.now() - startedAt,
  })

  // ═══ L2: Pre-filter (ANTI-ICP) ═══
  const qualified = candidates.filter(c => {
    if (filters.websiteObrigatorio && !c.website) return false
    if (filters.reviewsMin && (c.rating_votes || 0) < filters.reviewsMin) return false
    
return true
  })

  trace.push({
    layer: "L2",
    status: "ok",
    detail: `${qualified.length}/${candidates.length} passaram no pre-filtro`,
    tookMs: 0,
  })

  // ═══ L3-L4: Enrich + Score ═══
  // TODO(v0.2): enriquecer cada lead via EVO-API MCP
  // const enriched = await Promise.all(qualified.map(async (c) => {
  //   const profile = await evoMCP.call("business_profile_gmb", { keyword: c.title, location_code: 2076, language_code: "pt" })
  //   const lighthouse = await evoMCP.call("on_page_lighthouse", { url: c.website })
  //   const tech = await evoMCP.call("domain_technologies", { target: c.website })
  //   const competitors = await evoMCP.call("domain_competitors", { target: c.website })
  //   return { profile, lighthouse, tech, competitorCount: competitors?.length || 0 }
  // }))

  const enriched: LeadCtx[] = []

  const leads: DiscoveredLead[] = enriched.map((ctx, i) => {
    const p = ctx.profile || {}
    const phone = p.phone as string | undefined
    const { total, breakdown, dores, sinais } = scoreLead(ctx)

    return {
      business: {
        title: (p.title as string) || candidates[i]?.title || `Lead #${i}`,
        place_id: p.place_id as string,
        category: p.category as string,
        address: p.address as string,
        website: p.website as string || candidates[i]?.website,
        phone,
        isWhatsApp: isWhatsAppNumber(phone),
        rating: p.rating_value as number,
        totalReviews: p.rating_votes as number,
        latitude: p.latitude as number,
        longitude: p.longitude as number,
      },
      score: { total, breakdown },
      dores,
      sinais,
      prioridade: total >= 80 ? "URGENTE" : total >= 60 ? "QUENTE" : total >= 40 ? "MORNO" : "FRIO",
      pipeline: dores.length > 0
        ? ["site_audit", "seo_discovery", "gmb_reputation", "competitor_intel"]
        : ["site_audit"],
    }
  })

  // Filter by scoreMin, sort by priority
  const filtered = leads
    .filter(l => l.score.total >= (filters.scoreMin || 40))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, params.maxResults || 25)

  trace.push({
    layer: "L3-L5",
    status: "ok",
    detail: `${filtered.length} leads qualificados (score ≥ ${filters.scoreMin})`,
    tookMs: Date.now() - startedAt,
  })

  // Count by priority
  const urg = filtered.filter(l => l.prioridade === "URGENTE").length
  const quente = filtered.filter(l => l.prioridade === "QUENTE").length

  trace.push({
    layer: "SYNTHESIS",
    status: "ok",
    detail: `${urg} urgentes · ${quente} quentes · ${filtered.length - urg - quente} mornos`,
    tookMs: 0,
  })

  return {
    params,
    candidatesFound: candidates.length,
    enriched: enriched.length,
    leads: filtered,
    trace,
  }
}

// ── Helper: format for Materio dashboard ──────────────────────

export function formatForDashboard(result: DiscoveryResult) {
  return {
    summary: {
      total: result.leads.length,
      urgentes: result.leads.filter(l => l.prioridade === "URGENTE").length,
      quentes: result.leads.filter(l => l.prioridade === "QUENTE").length,
      mornos: result.leads.filter(l => l.prioridade === "MORNO").length,
      params: result.params,
    },
    leads: result.leads.map(l => ({
      title: l.business.title,
      score: l.score.total,
      prioridade: l.prioridade,
      dores: l.dores.slice(0, 3),
      sinais: l.sinais.slice(0, 2),
      website: l.business.website,
      phone: l.business.phone,
      isWhatsApp: l.business.isWhatsApp,
      pipelines: l.pipeline,
    })),
    trace: result.trace,
  }
}

// ── Unit test (node --import tsx) ─────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  // Smoke test
  const result = await discoverLeads({
    categories: ["clinica_estetica"],
    location: { lat: -23.5505, lng: -46.6333, radiusKm: 10 },
    filters: {
      reviewsMin: 2,
      ratingMax: 4.0,
      websiteObrigatorio: true,
      seoMax: 70,
      whatsappDesejavel: true,
    },
    maxResults: 10,
  })

  console.log(JSON.stringify(formatForDashboard(result), null, 2))
}
