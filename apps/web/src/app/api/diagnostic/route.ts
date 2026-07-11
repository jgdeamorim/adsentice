// ══════════════════════════════════════════════════════════════════
// ADSENTICE · POST /api/diagnostic
// Input: URL de negócio → Output: JSON com cards + tips + score
// Motor de dados: DataForSEO REST (futuro: EVO-API MCP :7700)
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import {
  onPageInstantAudit,
  domainTechnologies,
  serpOrganicCheck,
  domainCompetitors,
  businessProfileSearch,
} from "@/lib/dataforseo"
import type { DiscoveryResult } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 55

// ── POST /api/diagnostic ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const { url } = (await request.json()) as { url?: string }

  if (!url) {
    return NextResponse.json(
      { error: "url é obrigatório" },
      { status: 400 }
    )
  }

  const domain = extractDomain(url)
  const startedAt = Date.now()

  // ═══ 5 pipelines em paralelo ═══
  const [
    lighthouse,
    tech,
    seo,
    competitors,
    gmb,
  ] = await Promise.allSettled([
    onPageInstantAudit(url),
    domainTechnologies(domain),
    serpOrganicCheck(domain, deriveKeywords(domain)),
    domainCompetitors(domain),
    businessProfileSearch(domain),
  ])

  // ═══ Monta resultado ═══
  const cards: Card[] = []
  const tips: string[] = []

  // Card 1: Site
  const lh = lighthouse.status === "fulfilled" ? lighthouse.value : null
  const stack = tech.status === "fulfilled" ? tech.value : null

  cards.push({
    id: "site",
    title: "Site & Tecnologia",
    icon: "Monitor",
    score: lh ? computeSiteScore(lh, stack) : null,
    status: lh ? "ok" : "error",
    highlights: [
      lh ? `Performance ${lh.performance}/100 · SEO ${lh.seo}/100 · A11y ${lh.accessibility}/100` : null,
      stack?.cms ? `CMS: ${stack.cms}` : null,
      stack?.analytics?.length ? `Analytics: ${stack.analytics.join(", ")}` : "Sem analytics detectado",
    ].filter(Boolean) as string[],
  })

  if (lh && lh.performance < 60) tips.push(`Performance do site: ${lh.performance}/100 — otimize imagens e scripts`)
  if (lh && lh.seo < 70) tips.push(`SEO técnico: ${lh.seo}/100 — revise meta tags e headings`)

  // Card 2: SEO
  const seoData = seo.status === "fulfilled" ? seo.value : null
  const seoRanked = seoData?.filter(k => k.position !== null) || []
  const seoVolume = seoData?.filter(k => k.volume > 500) || []

  cards.push({
    id: "seo",
    title: "SEO & Descoberta",
    icon: "Search",
    score: seoData ? computeSEOScore(seoData) : null,
    status: seoData ? "ok" : "error",
    highlights: [
      seoData ? `${seoData.length} keywords analisadas` : null,
      seoRanked.length > 0
        ? `${seoRanked.length} keywords ranqueadas (top 20 Google)`
        : "Não ranqueia nas keywords testadas",
      seoVolume.length > 0
        ? `Maior volume: "${seoVolume[0].keyword}" = ${seoVolume[0].volume.toLocaleString("pt-BR")}/mês`
        : null,
    ].filter(Boolean) as string[],
  })

  if (seoVolume.length > 0) {
    tips.push(
      `"${seoVolume[0].keyword}" tem ${seoVolume[0].volume.toLocaleString("pt-BR")} buscas/mês — ${
        seoVolume[0].position ? `você está na posição #${seoVolume[0].position}` : "você não aparece nos resultados"
      }`
    )
  }

  // Card 3: GMB
  const gmbData = gmb.status === "fulfilled" ? gmb.value : null

  cards.push({
    id: "gmb",
    title: "Google Meu Negócio",
    icon: "MapPin",
    score: gmbData ? computeGMBScore(gmbData) : null,
    status: gmbData ? "ok" : "not_found",
    highlights: gmbData ? [
      `${gmbData.rating}★ · ${gmbData.total_reviews} reviews`,
      gmbData.category || "",
      gmbData.address ? gmbData.address.slice(0, 50) : "",
    ] : ["Perfil GMB não encontrado para este negócio"],
  })

  if (gmbData) {
    if (gmbData.rating < 4.0) tips.push(`Nota Google: ${gmbData.rating}★ — responda reviews e incentive avaliações`)
    if (gmbData.total_reviews < 20) tips.push(`Apenas ${gmbData.total_reviews} reviews — peça para clientes avaliarem`)
  }

  // Card 4: Reputação
  cards.push({
    id: "reputation",
    title: "Reputação Online",
    icon: "Star",
    score: gmbData ? computeRepScore(gmbData) : null,
    status: gmbData ? "ok" : "not_found",
    highlights: gmbData ? [
      `${gmbData.rating}★ em ${gmbData.total_reviews} avaliações`,
      gmbData.rating >= 4.0 ? "✅ Boa reputação" : "⚠️ Precisa de atenção",
    ] : ["Sem dados de reputação disponíveis"],
  })

  // Card 5: Concorrência
  const compData = competitors.status === "fulfilled" ? competitors.value : []

  cards.push({
    id: "competitors",
    title: "Concorrência",
    icon: "Users",
    score: compData.length > 0 ? computeCompScore(compData) : null,
    status: compData.length > 0 ? "ok" : "not_found",
    highlights: compData.length > 0 ? [
      `${compData.length} concorrentes mapeados`,
      compData[0] ? `#1: ${compData[0].domain}` : null,
    ].filter(Boolean) as string[] : ["Não foi possível mapear concorrentes"],
  })

  // ═══ Score geral ═══
  const validScores = cards
    .filter(c => c.score !== null)
    .map(c => c.score as number)

  const overall = validScores.length > 0
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0

  const result: DiscoveryResult = {
    business: {
      name: gmbData?.title || domain,
      url,
      domain,
    },
    score: {
      overall,
      breakdown: Object.fromEntries(cards.map(c => [c.id, c.score ?? 0])),
    },
    cards,
    tips: tips.slice(0, 5),
    deep_dives: [
      { id: "seo_strategy", title: "Estratégia SEO Completa", description: "Plano de ação com keywords, conteúdo e otimizações", credit_cost: 10 },
      { id: "competitor_analysis", title: "Análise de Concorrentes", description: "Relatório detalhado de posicionamento competitivo", credit_cost: 5 },
      { id: "gmb_optimization", title: "Otimização GMB", description: "Checklist completo de Google Meu Negócio", credit_cost: 3 },
      { id: "site_audit_full", title: "Auditoria Técnica Completa", description: "Performance, acessibilidade e correções", credit_cost: 8 },
      { id: "review_management", title: "Gestão de Reviews", description: "Estratégia de resposta e melhoria de reputação", credit_cost: 3 },
    ],
    diagnostics: {
      took_ms: Date.now() - startedAt,
      pipelines: cards.map(c => ({ id: c.id, status: c.status })),
    },
  }

  return NextResponse.json(result)
}

// ── Helpers ───────────────────────────────────────────────────

interface Card {
  id: string
  title: string
  icon: string
  score: number | null
  status: "ok" | "error" | "not_found"
  highlights: string[]
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*/, "")
  }
}

function deriveKeywords(domain: string): string[] {
  const name = domain.split(".")[0]
  return [
    name,
    `${name} avaliação`,
    `${name} preço`,
    `${name} São Paulo`,
    `${name} perto de mim`,
  ].slice(0, 5)
}

// ── Scoring ──────────────────────────────────────────────────

function computeSiteScore(
  lh: { performance: number; seo: number; accessibility: number },
  stack: { cms: string; analytics: string[] } | null
): number {
  let s = 50
  if (lh.performance >= 80) s += 12
  else if (lh.performance >= 50) s += 6
  if (lh.seo >= 80) s += 12
  else if (lh.seo >= 50) s += 6
  if (lh.accessibility >= 80) s += 8
  if (stack?.cms && stack.cms !== "desconhecido") s += 8
  if (stack?.analytics?.length) s += 10
  return Math.min(100, s)
}

function computeSEOScore(
  positions: Array<{ position: number | null; volume: number }>
): number {
  if (positions.length === 0) return 0
  let s = 25
  const ranked = positions.filter(p => p.position !== null && p.position <= 20)
  if (ranked.length > 0) s += Math.min(35, ranked.length * 6)
  const withVolume = positions.filter(p => p.volume > 100)
  if (withVolume.length > 0) s += Math.min(40, withVolume.length * 8)
  return Math.min(100, s)
}

function computeGMBScore(profile: {
  rating: number
  total_reviews: number
  is_claimed: boolean
}): number {
  let s = 35
  if (profile.rating >= 4.5) s += 25
  else if (profile.rating >= 4.0) s += 15
  else if (profile.rating >= 3.0) s += 5
  if (profile.total_reviews > 100) s += 20
  else if (profile.total_reviews > 50) s += 15
  else if (profile.total_reviews > 10) s += 8
  if (profile.is_claimed) s += 20
  return Math.min(100, s)
}

function computeRepScore(profile: { rating: number }): number {
  if (profile.rating >= 4.5) return 85
  if (profile.rating >= 4.0) return 65
  if (profile.rating >= 3.0) return 40
  return 20
}

function computeCompScore(
  competitors: Array<{ rank: number; etv: number }>
): number {
  if (competitors.length === 0) return 50
  const topEtv = competitors[0]?.etv || 0
  return Math.max(15, Math.round(85 - topEtv / 100))
}
