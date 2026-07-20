// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Services Extractor
// Extrai serviços/especialidades do body text + schema.org
// Multi-nicho: 29 categorias SMB (SERVICE_PATTERNS no types.ts)
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"
import { SERVICE_PATTERNS } from "../types"

export interface ServicesData {
  services: string[]
  category: string                        // melhor match de categoria ICP
  categoryConfidence: number              // 0-100
  servicePages: number                    // landing pages por serviço
  serviceLinks: { text: string; href: string; matchedService: string }[]
}

/** Extrai serviços do site e infere a categoria ICP mais provável. */
export function extractServices(
  site: ParsedSite,
  knownCategory?: string,                  // categoria do GMB (L0) para priorizar
): ServicesData {
  const bodyL = site.bodyText.toLowerCase()
  const titleL = site.title.toLowerCase()
  const metaL = site.metaDescription.toLowerCase()
  const combined = `${titleL} ${metaL} ${bodyL}`

  // ── Matching por categoria (SERVICE_PATTERNS do types.ts) ──
  const categoryScores: Record<string, number> = {}
  for (const [cat, patterns] of Object.entries(SERVICE_PATTERNS)) {
    let score = 0
    for (const p of patterns) {
      const re = new RegExp(p.replace(/\./g, "[.\\s]?"), "gi")
      const matches = combined.match(re)
      if (matches) score += matches.length
    }
    if (score > 0) categoryScores[cat] = score
  }

  // Prioriza a categoria conhecida do GMB
  if (knownCategory && categoryScores[knownCategory]) {
    categoryScores[knownCategory] *= 1.5
  }

  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1])
  const bestCategory = sorted[0]?.[0] || "unknown"
  const maxScore = sorted[0]?.[1] || 0
  const secondScore = sorted[1]?.[1] || 0

  // Se a diferença entre top 2 for pequena, confiança menor
  const confidence = maxScore > 0
    ? Math.min(100, Math.round((maxScore / Math.max(maxScore + secondScore, 1)) * 100))
    : 0

  // ── Extrai serviços do melhor match de categoria ──
  const patterns = SERVICE_PATTERNS[bestCategory] || []
  const services = new Set<string>()
  for (const p of patterns) {
    const re = new RegExp(p.replace(/\./g, "[.\\s]?"), "gi")
    if (re.test(combined)) services.add(p)
  }

  // ── Schema.org: services, makesOffer ──
  for (const schema of site.schemaOrg) {
    const d = schema.data as Record<string, unknown>
    if (d.makesOffer && typeof d.makesOffer === "object") {
      const offer = d.makesOffer as Record<string, unknown>
      if (offer.itemOffered?.name) services.add(String(offer.itemOffered.name))
    }
  }

  // ── Detecta landing pages por serviço (links com nome de serviço) ──
  const serviceLinks: ServicesData["serviceLinks"] = []
  for (const link of site.links) {
    const text = link.text.toLowerCase()
    for (const p of patterns) {
      if (text.includes(p)) {
        serviceLinks.push({ text: link.text, href: link.href, matchedService: p })
        break
      }
    }
  }

  return {
    services: [...services],
    category: bestCategory,
    categoryConfidence: confidence,
    servicePages: new Set(serviceLinks.map(l => l.href)).size,
    serviceLinks: [...new Map(serviceLinks.map(l => [l.href, l])).values()],
  }
}
