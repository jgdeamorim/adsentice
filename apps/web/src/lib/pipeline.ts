// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Discovery Pipeline Orchestrator
// Pipeline: URL → Firecrawl + DataForSEO → Cards + Tips + Score
// ══════════════════════════════════════════════════════════════════

import type {
  DiscoveryResult,
  DiscoveryCard,
  Tip,
  SiteAuditResult,
  GMBResult,
  SEODiscoveryResult,
} from "./types"
import {
  firecrawlScrape,
  discoverSiteStructure,
} from "./firecrawl"
import {
  onPageInstantAudit,
  domainTechnologies,
  serpOrganicCheck,
  businessProfileSearch,
  domainCompetitors,
} from "./dataforseo"

// ── Pipeline Step Types ───────────────────────────────────────

type StepName =
  | "site_audit"
  | "seo_discovery"
  | "gmb_reputation"
  | "competitor_intel"
  | "synthesis"

interface StepResult {
  name: StepName
  status: "ok" | "error" | "skipped"
  data?: unknown
  error?: string
  tookMs: number
}

// ── Pipeline Runner ───────────────────────────────────────────

export async function* runDiscoveryPipeline(url: string) {
  const domain = extractDomain(url)
  const steps: StepResult[] = []

  // ═══ STEP 1: Site Audit (Firecrawl + DataForSEO) ═══
  yield* emitStep("site_audit", "running")
  const t0 = Date.now()

  let siteAudit: SiteAuditResult = {
    domain,
    pagesDiscovered: 0,
    content: { title: "", description: "", services: [], hasPricing: false, hasContact: false, hasBlog: false },
    lighthouse: { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 },
    stack: { cms: "desconhecido", analytics: [], cdn: "não detectado" },
    domainAgeDays: 0,
    score: 0,
    recommendations: [],
  }

  try {
    const [scrapeResult, structure, lighthouse, tech] = await Promise.all([
      firecrawlScrape({ url, formats: ["markdown"], onlyMainContent: true }),
      discoverSiteStructure(url),
      onPageInstantAudit(url),
      domainTechnologies(domain),
    ])

    siteAudit.pagesDiscovered = structure.totalPages

    if (scrapeResult.success && scrapeResult.data) {
      const md = scrapeResult.data.markdown || ""
      siteAudit.content = {
        title: scrapeResult.data.title || "",
        description: scrapeResult.data.description || "",
        services: extractServices(md),
        hasPricing: /\b(pre[çc]o|valor|investimento|planos|pacotes)\b/i.test(md),
        hasContact: /(contato|fale conosco|agende|whatsapp)/i.test(md),
        hasBlog: structure.blogPages.length > 0,
      }
    }

    if (lighthouse) {
      siteAudit.lighthouse = {
        performance: lighthouse.performance,
        seo: lighthouse.seo,
        accessibility: lighthouse.accessibility,
        bestPractices: lighthouse.bestPractices || 0,
      }
    }

    if (tech) {
      siteAudit.stack = {
        cms: tech.cms,
        ecommerce: tech.ecommerce,
        analytics: tech.analytics,
        cdn: tech.cdn,
        hosting: tech.hosting,
      }
    }

    siteAudit.score = computeSiteScore(siteAudit)
    siteAudit.recommendations = generateSiteRecommendations(siteAudit)

    steps.push({ name: "site_audit", status: "ok", data: siteAudit, tookMs: Date.now() - t0 })
    yield* emitStep("site_audit", "done", { detail: `${siteAudit.pagesDiscovered} páginas · ${siteAudit.stack.cms}` })
  } catch (e) {
    steps.push({ name: "site_audit", status: "error", error: String(e), tookMs: Date.now() - t0 })
    yield* emitStep("site_audit", "done", { detail: "auditoria parcial" })
  }

  // ═══ STEP 2: SEO Discovery ═══
  yield* emitStep("seo_discovery", "running")
  const t1 = Date.now()

  let seoData: SEODiscoveryResult = {
    keywords: [],
    totalKeywords: 0,
    avgPosition: 0,
    score: 0,
    recommendations: [],
  }

  try {
    // Keywords relevantes para o nicho inferido do site
    const seoKeywords = deriveKeywords(siteAudit.content.title, siteAudit.content.description, domain)
    const positions = await serpOrganicCheck(domain, seoKeywords)

    seoData = {
      keywords: positions.filter((p) => p.volume > 0 || p.position !== null),
      totalKeywords: positions.length,
      avgPosition: avgPosition(positions),
      score: computeSEOScore(positions),
      recommendations: generateSEORecommendations(positions, domain),
    }

    steps.push({ name: "seo_discovery", status: "ok", data: seoData, tookMs: Date.now() - t1 })
    yield* emitStep("seo_discovery", "done", {
      detail: `${seoData.totalKeywords} keywords · pos média ${seoData.avgPosition}`,
    })
  } catch (e) {
    steps.push({ name: "seo_discovery", status: "error", error: String(e), tookMs: Date.now() - t1 })
    yield* emitStep("seo_discovery", "done", { detail: "SEO indisponível" })
  }

  // ═══ STEP 3: GMB + Reputation ═══
  yield* emitStep("gmb_reputation", "running")
  const t2 = Date.now()

  let gmbData: GMBResult | null = null

  try {
    const businessName = siteAudit.content.title || domain
    const profile = await businessProfileSearch(businessName)
    if (profile) {
      gmbData = {
        placeId: profile.place_id,
        name: profile.title,
        rating: profile.rating,
        totalReviews: profile.total_reviews,
        address: profile.address,
        phone: profile.phone,
        website: profile.website,
        category: profile.category,
        score: computeGMBScore(profile),
        recommendations: generateGMBRecommendations(profile),
      }
    }
    steps.push({ name: "gmb_reputation", status: gmbData ? "ok" : "skipped", data: gmbData, tookMs: Date.now() - t2 })
    yield* emitStep("gmb_reputation", "done", {
      detail: gmbData ? `${gmbData.rating}★ · ${gmbData.totalReviews} reviews` : "GMB não encontrado",
    })
  } catch (e) {
    steps.push({ name: "gmb_reputation", status: "error", error: String(e), tookMs: Date.now() - t2 })
    yield* emitStep("gmb_reputation", "done", { detail: "GMB indisponível" })
  }

  // ═══ STEP 4: Competitor Intel ═══
  yield* emitStep("competitor_intel", "running")
  const t3 = Date.now()

  let competitors: Array<{ domain: string; rank: number; etv: number }> = []

  try {
    competitors = await domainCompetitors(domain)
    steps.push({ name: "competitor_intel", status: "ok", data: { competitors }, tookMs: Date.now() - t3 })
    yield* emitStep("competitor_intel", "done", {
      detail: `${competitors.length} concorrentes encontrados`,
    })
  } catch (e) {
    steps.push({ name: "competitor_intel", status: "error", error: String(e), tookMs: Date.now() - t3 })
    yield* emitStep("competitor_intel", "done", { detail: "concorrência indisponível" })
  }

  // ═══ STEP 5: Synthesis ═══
  yield* emitStep("synthesis", "running")

  const result = buildDiscoveryResult(url, domain, siteAudit, seoData, gmbData, competitors)

  yield* emitStep("synthesis", "done", { detail: "diagnóstico completo" })

  return { steps, result }
}

// ── AG-UI Event Emitters ─────────────────────────────────────

async function* emitStep(
  step: string,
  status: "running" | "done",
  extra?: Record<string, string>
): AsyncGenerator<string> {
  if (status === "running") {
    yield `event: message\ndata: ${JSON.stringify({ type: "STEP_STARTED", stepName: step })}\n\n`
  } else {
    yield `event: message\ndata: ${JSON.stringify({ type: "STEP_FINISHED", stepName: step, ...extra })}\n\n`
  }
}

export function* emitCardsAndTips(result: DiscoveryResult): Generator<string> {
  // Score
  yield `event: message\ndata: ${JSON.stringify({
    type: "ACTIVITY_SNAPSHOT",
    activityType: "market-score",
    content: {
      overall: result.score.overall,
      breakdown: result.score.breakdown,
    },
  })}\n\n`

  // Cards (5 — excluímos social e ads por enquanto)
  for (const card of result.cards) {
    yield `event: message\ndata: ${JSON.stringify({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "discovery-card",
      content: card,
    })}\n\n`
  }

  // Tips
  for (const tip of result.tips) {
    yield `event: message\ndata: ${JSON.stringify({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "tip",
      content: tip,
    })}\n\n`
  }

  // Deep dives
  yield `event: message\ndata: ${JSON.stringify({
    type: "ACTIVITY_SNAPSHOT",
    activityType: "deep-dives",
    content: result.deep_dives,
  })}\n\n`
}

// ── Result Builder ────────────────────────────────────────────

function buildDiscoveryResult(
  url: string,
  domain: string,
  site: SiteAuditResult,
  seo: SEODiscoveryResult,
  gmb: GMBResult | null,
  competitors: Array<{ domain: string; rank: number; etv: number }>
): DiscoveryResult {
  const cards: DiscoveryCard[] = []
  const tips: Tip[] = []

  // Card 1: Site Audit
  cards.push({
    id: "site",
    icon: "monitor",
    title: "Site & Tecnologia",
    score: site.score,
    severity: scoreSeverity(site.score),
    highlights: [
      `${site.pagesDiscovered} páginas encontradas`,
      `${site.stack.cms}${site.stack.ecommerce ? ` + ${site.stack.ecommerce}` : ""}`,
      `Performance ${site.lighthouse.performance}/100 · SEO ${site.lighthouse.seo}/100`,
    ],
    deepDiveAvailable: true,
    deepDiveCreditCost: 8,
  })
  tips.push(...site.recommendations.slice(0, 1).map((t, i) => ({
    priority: i + 1,
    urgency: (i === 0 ? "high" : "medium") as "high" | "medium",
    title: t,
    detail: "",
    action: "Ver auditoria completa",
    credit_cost: i === 0 ? 0 : 8,
    pipeline: "site_audit",
  })))

  // Card 2: SEO
  if (seo.totalKeywords > 0) {
    cards.push({
      id: "seo",
      icon: "search",
      title: "SEO & Descoberta",
      score: seo.score,
      severity: scoreSeverity(seo.score),
      highlights: [
        `${seo.totalKeywords} keywords verificadas`,
        seo.avgPosition > 0 ? `Posição média #${seo.avgPosition}` : "Não ranqueia nas keywords testadas",
        seo.keywords.length > 0
          ? `"${seo.keywords[0].keyword}" = ${seo.keywords[0].volume}/mês`
          : "",
      ].filter(Boolean),
      deepDiveAvailable: true,
      deepDiveCreditCost: 10,
    })
    tips.push(...seo.recommendations.slice(0, 2).map((t, i) => ({
      priority: tips.length + 1,
      urgency: (i === 0 ? "high" : "medium") as "high" | "medium",
      title: t,
      detail: "",
      action: i === 0 ? "Ver keywords" : "Ver estratégia SEO",
      credit_cost: i === 0 ? 0 : 10,
      pipeline: "seo_discovery",
    })))
  }

  // Card 3: GMB
  if (gmb) {
    cards.push({
      id: "gmb",
      icon: "map-pin",
      title: "Google Meu Negócio",
      score: gmb.score,
      severity: scoreSeverity(gmb.score),
      highlights: [
        `${gmb.rating}★ · ${gmb.totalReviews} reviews`,
        gmb.category || "",
        gmb.address ? gmb.address.slice(0, 50) : "",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 3,
    })
    tips.push(...gmb.recommendations.slice(0, 1).map((t, i) => ({
      priority: tips.length + 1,
      urgency: "medium" as const,
      title: t,
      detail: "",
      action: "Ver checklist GMB",
      credit_cost: 0,
      pipeline: "gmb_reputation",
    })))
  }

  // Card 4: Reputation
  if (gmb && gmb.totalReviews > 0) {
    const repScore = gmb.rating >= 4.0 ? 70 : gmb.rating >= 3.0 ? 45 : 20
    cards.push({
      id: "reputation",
      icon: "star",
      title: "Reputação Online",
      score: repScore,
      severity: scoreSeverity(repScore),
      highlights: [
        `${gmb.rating}★ em ${gmb.totalReviews} avaliações`,
        gmb.rating >= 4.0 ? "✅ Boa reputação" : "⚠️ Precisa de atenção",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 3,
    })
  }

  // Card 5: Competitors
  if (competitors.length > 0) {
    const compScore = Math.max(0, 80 - competitors[0].etv / 100)
    cards.push({
      id: "competitors",
      icon: "users",
      title: "Concorrência",
      score: Math.round(compScore),
      severity: scoreSeverity(Math.round(compScore)),
      highlights: [
        `${competitors.length} concorrentes mapeados`,
        competitors[0] ? `#1: ${competitors[0].domain}` : "",
      ],
      deepDiveAvailable: true,
      deepDiveCreditCost: 5,
    })
  }

  // Overall score
  const overallScore = Math.round(
    cards.reduce((sum, c) => sum + c.score, 0) / Math.max(cards.length, 1)
  )

  // Final tips (always at least 3)
  if (tips.length < 3) {
    tips.push(
      { priority: tips.length + 1, urgency: "medium", title: "Audite a performance mobile do site", detail: "", action: "Auditoria mobile", credit_cost: 5, pipeline: "site_audit" },
      { priority: tips.length + 2, urgency: "low", title: "Configure alertas de reviews", detail: "", action: "Ver alertas", credit_cost: 0, pipeline: "gmb_reputation" },
    )
  }

  return {
    business: {
      name: site.content.title || domain,
      url,
      domain,
      location: gmb ? { address: gmb.address, city: "São Paulo", state: "SP" } : undefined,
    },
    score: {
      overall: overallScore,
      breakdown: Object.fromEntries(cards.map((c) => [c.id, c.score])),
    },
    cards: cards.slice(0, 6),
    tips: tips.slice(0, 6),
    deep_dives: [
      { id: "competitor_analysis", title: "Análise de Concorrentes", description: "Relatório detalhado de posicionamento competitivo", credit_cost: 5 },
      { id: "seo_strategy", title: "Estratégia SEO Completa", description: "Plano de ação com keywords, conteúdo e otimizações", credit_cost: 10 },
      { id: "gmb_optimization", title: "Otimização GMB", description: "Checklist completo de Google Meu Negócio", credit_cost: 3 },
      { id: "site_audit_full", title: "Auditoria Técnica Completa", description: "Performance, acessibilidade e correções", credit_cost: 8 },
      { id: "review_management", title: "Gestão de Reviews", description: "Estratégia de resposta e melhoria de reputação", credit_cost: 3 },
    ],
  }
}

// ── Scoring Functions ─────────────────────────────────────────

function computeSiteScore(site: SiteAuditResult): number {
  let score = 60
  if (site.lighthouse.performance >= 80) score += 10
  if (site.lighthouse.seo >= 80) score += 10
  if (site.pagesDiscovered > 10) score += 5
  if (site.content.hasPricing) score += 5
  if (site.content.hasContact) score += 5
  if (site.stack.cms !== "desconhecido") score += 5
  if (site.domainAgeDays > 365) score += 5
  return Math.min(100, score)
}

function computeSEOScore(positions: Array<{ position: number | null; volume: number }>): number {
  if (positions.length === 0) return 0
  let score = 30
  const ranking = positions.filter((p) => p.position !== null && p.position <= 20)
  if (ranking.length > 0) score += Math.min(30, ranking.length * 5)
  const hasVolume = positions.filter((p) => p.volume > 100)
  if (hasVolume.length > 0) score += Math.min(40, hasVolume.length * 8)
  return Math.min(100, score)
}

function computeGMBScore(profile: { rating: number; total_reviews: number; is_claimed: boolean }): number {
  let score = 40
  if (profile.rating >= 4.0) score += 20
  else if (profile.rating >= 3.0) score += 10
  if (profile.total_reviews > 50) score += 20
  else if (profile.total_reviews > 10) score += 10
  if (profile.is_claimed) score += 20
  return Math.min(100, score)
}

function scoreSeverity(score: number): "critical" | "warning" | "good" | "excellent" {
  if (score >= 80) return "excellent"
  if (score >= 60) return "good"
  if (score >= 40) return "warning"
  return "critical"
}

// ── Recommendation Generators ─────────────────────────────────

function generateSiteRecommendations(site: SiteAuditResult): string[] {
  const tips: string[] = []
  if (site.lighthouse.performance < 60) tips.push(`Performance: ${site.lighthouse.performance}/100 — otimize imagens e scripts`)
  if (site.lighthouse.seo < 70) tips.push(`SEO técnico: ${site.lighthouse.seo}/100 — revise meta tags e headings`)
  if (site.lighthouse.accessibility < 80) tips.push(`Acessibilidade: ${site.lighthouse.accessibility}/100`)
  if (!site.content.hasPricing) tips.push("Adicione página de preços/serviços com valores")
  if (!site.content.hasBlog) tips.push("Crie um blog para conteúdo fresco (SEO)")
  if (site.content.services.length === 0) tips.push("Página de serviços não detectada — crucial para SEO local")
  if (site.stack.analytics.length === 0) tips.push("Instale Google Analytics para medir tráfego")
  return tips.slice(0, 3)
}

function generateSEORecommendations(
  positions: Array<{ keyword: string; volume: number; position: number | null }>,
  domain: string
): string[] {
  const tips: string[] = []
  const notRanking = positions.filter((p) => p.position === null || p.position > 20)
  const highVolume = positions.filter((p) => p.volume > 500)

  if (highVolume.length > 0) {
    const kw = highVolume[0]
    tips.push(`"${kw.keyword}" = ${kw.volume}/mês — ${kw.position ? `posição #${kw.position}` : "você não aparece"}`)
  }
  if (notRanking.length > 0) {
    tips.push(`${notRanking.length} keywords com oportunidade de ranqueamento`)
  }
  return tips.slice(0, 3)
}

function generateGMBRecommendations(profile: {
  rating: number
  total_reviews: number
  title: string
}): string[] {
  const tips: string[] = []
  if (profile.rating < 4.0) tips.push(`Sua nota é ${profile.rating}★ — responda reviews negativas e incentive avaliações`)
  if (profile.total_reviews < 20) tips.push(`Apenas ${profile.total_reviews} reviews — peça para clientes avaliarem`)
  if (profile.rating >= 4.0 && profile.total_reviews >= 20) tips.push("✅ Boa reputação! Continue respondendo reviews")
  return tips.slice(0, 2)
}

// ── Helpers ───────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*/, "")
  }
}

function extractServices(markdown: string): string[] {
  const services: string[] = []
  const patterns = [
    /servi[çc]os?[:\s]*(.+)/gi,
    /tratamentos?[:\s]*(.+)/gi,
    /procedimentos?[:\s]*(.+)/gi,
    /especialidades?[:\s]*(.+)/gi,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(markdown)
    if (match) {
      services.push(...match[1].split(/[,;.•]/).map((s) => s.trim()).filter(Boolean).slice(0, 6))
      break
    }
  }
  return services.slice(0, 8)
}

function deriveKeywords(title: string, description: string, domain: string): string[] {
  const keywords = new Set<string>()
  const text = `${title} ${description} ${domain}`.toLowerCase()

  // Keywords genéricas de negócio local
  const base = [
    `${domain.split(".")[0]}`,
  ]

  // Inferir do título
  const nichePatterns: Record<string, string[]> = {
    clinica: ["clinica perto de mim", "clinica sao paulo"],
    dentista: ["dentista perto de mim", "implante dentario", "clareamento dental", "ortodontia"],
    estetica: ["clinica estetica perto de mim", "harmonizacao facial", "botox", "preenchimento labial"],
    restaurante: ["restaurante perto de mim", "melhor restaurante sp"],
    advogado: ["advogado perto de mim", "advogado trabalhista", "advogado previdenciario"],
    imobiliaria: ["imobiliaria perto de mim", "apartamento para alugar", "casa a venda"],
  }

  for (const [niche, kws] of Object.entries(nichePatterns)) {
    if (text.includes(niche)) {
      kws.forEach((k) => keywords.add(k))
      break
    }
  }

  // Fallback
  if (keywords.size === 0) {
    keywords.add("servicos perto de mim")
    keywords.add(`${domain.split(".")[0]} sao paulo`)
  }

  // Adicionar keywords base
  base.forEach((k) => keywords.add(k))

  return [...keywords].slice(0, 5)
}

function avgPosition(positions: Array<{ position: number | null }>): number {
  const ranked = positions.filter((p) => p.position !== null)
  if (ranked.length === 0) return 0
  return Math.round(ranked.reduce((s, p) => s + (p.position || 0), 0) / ranked.length)
}
