// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — HTML Parser (cheerio)
// JSON-LD · OpenGraph · schema.org · CSS custom properties · fonts
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import * as cheerio from "cheerio"
import type { ParsedSite, ParsedLink, ParsedImage, SchemaOrgItem } from "./types"

// Lista de serviços SMB genéricos — usada para detecção no body text
const SERVICE_SIGNALS = [
  "consulta", "avaliação", "exame", "procedimento", "tratamento", "cirurgia",
  "especialidade", "serviço", "serviço", "atendimento", "agendamento",
  "orçamento", "cotação", "reserva", "entrega", "delivery", "aula",
  "aula experimental", "demonstração", "visita", "projeto", "reforma",
  "instalação", "reparo", "manutenção", "limpeza", "consultoria",
  "assessoria", "orientação", "acompanhamento", "diagnóstico",
]

// Regex para detectar preços no body text
const PRICE_RE = /R\$\s?\d{1,3}(?:[.,]\d{2})?|preço|valor|investimento|a partir de|mensalidade|diária|taxa|plano/i

// Regex para detectar agendamento
const BOOKING_RE = /agend|booking|marcar|reservar|horário|consulta online|liga|whatsapp/i

// Regex para CRM (médico), CREA (engenheiro/arquiteto), OAB (advogado)
const PROFESSIONAL_ID_RE = /CRM[:\s]*(\d{4,6})|CREA[:\s]*(\d{4,8})|OAB[:\s]*(\d{4,8})/gi

// Regex para convênios de saúde (mais comuns no Brasil)
const INSURANCE_LIST = [
  "unimed", "bradesco saúde", "sulamerica", "amil", "porto seguro",
  "hapvida", "notredame", "intermédica", "cassi", "geap", "allianz",
  "omint", "particular", "convênio", "plano de saúde",
]

/**
 * Parse HTML cru → ParsedSite estruturado.
 * Tudo via cheerio (13MB RAM), sem navegador.
 */
export function parseHTML(html: string, url: string): ParsedSite {
  const $ = cheerio.load(html)
  const domain = extractDomainFromUrl(url)

  // ── Meta ──
  const title = $("title").first().text().trim() || $("meta[property='og:title']").attr("content")?.trim() || ""
  const metaDescription = $("meta[name='description']").attr("content")?.trim()
    || $("meta[property='og:description']").attr("content")?.trim()
    || ""
  const ogTitle = $("meta[property='og:title']").attr("content")?.trim()
  const ogDescription = $("meta[property='og:description']").attr("content")?.trim()
  const ogImage = $("meta[property='og:image']").attr("content")?.trim()

  // ── Body text ──
  const bodyText = $("body").text().replace(/\s+/g, " ").trim()
  const wordCount = bodyText.split(/\s+/).length

  // ── Schema.org JSON-LD ──
  const schemaOrg: SchemaOrgItem[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html()
      if (raw) {
        const parsed = JSON.parse(raw)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          schemaOrg.push({
            type: item["@type"] || "Unknown",
            data: item as Record<string, unknown>,
          })
        }
      }
    } catch { /* JSON inválido — skip */ }
  })

  // ── Headings ──
  const headings: { tag: string; text: string }[] = []
  $("h1, h2, h3").each((_, el) => {
    const tag = $(el).prop("tagName")?.toLowerCase() || ""
    const text = $(el).text().trim()
    if (text) headings.push({ tag, text })
  })

  // ── CSS Custom Properties ──
  const cssCustomProperties: Record<string, string> = {}
  $("style").each((_, el) => {
    const css = $(el).html() || ""
    const matches = css.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+)/g)
    for (const m of matches) {
      const key = m[1].trim()
      const value = m[2].trim()
      if (key.startsWith("color") || key.startsWith("primary") || key.startsWith("secondary")
        || key.startsWith("accent") || key.startsWith("font") || key.includes("radius")
        || key.includes("spacing") || key.includes("shadow")) {
        cssCustomProperties[key] = value
      }
    }
  })

  // ── Font Families ──
  const fontFamilies: string[] = []
  $("style").each((_, el) => {
    const css = $(el).html() || ""
    const matches = css.matchAll(/font-family\s*:\s*([^;}]+)/gi)
    for (const m of matches) {
      const fonts = m[1].split(",").map(f => f.trim().replace(/['"]/g, ""))
      fontFamilies.push(...fonts)
    }
  })

  const googleFontsLinks: string[] = []
  $("link[href*='fonts.googleapis.com']").each((_, el) => {
    const href = $(el).attr("href")
    if (href) googleFontsLinks.push(href)
  })

  // ── Style tags + inline styles ──
  const styleTags: string[] = []
  $("style").each((_, el) => {
    const css = $(el).html()
    if (css) styleTags.push(css)
  })

  const inlineStyles: string[] = []
  $("[style]").each((_, el) => {
    const style = $(el).attr("style")
    if (style) inlineStyles.push(style)
  })

  // ── Links ──
  const links: ParsedLink[] = []
  const SOCIAL_DOMAINS: Record<string, string> = {
    "instagram.com": "instagram", "facebook.com": "facebook", "fb.com": "facebook",
    "tiktok.com": "tiktok", "youtube.com": "youtube", "youtu.be": "youtube",
    "linkedin.com": "linkedin", "wa.me": "whatsapp", "api.whatsapp.com": "whatsapp",
    "twitter.com": "twitter", "x.com": "twitter",
  }

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || ""
    const text = $(el).text().trim()
    const isSocial = Object.entries(SOCIAL_DOMAINS).some(([domain]) =>
      href.toLowerCase().includes(domain),
    )
    const platform = Object.entries(SOCIAL_DOMAINS).find(([domain]) =>
      href.toLowerCase().includes(domain),
    )?.[1]

    links.push({ href, text: text || href, rel: $(el).attr("rel") || undefined, isSocial, platform })
  })

  // ── Images ──
  const images: ParsedImage[] = []
  $("img[src]").each((_, el) => {
    images.push({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt") || undefined,
      width: parseInt($(el).attr("width") || "0", 10) || undefined,
      height: parseInt($(el).attr("height") || "0", 10) || undefined,
    })
  })

  // ── Scripts ──
  const scripts: string[] = []
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src")
    if (src) scripts.push(src)
  })

  return {
    url, domain,
    title, metaDescription, ogTitle, ogDescription, ogImage,
    wordCount, bodyText: bodyText.substring(0, 5000), schemaOrg,
    headings, cssCustomProperties, fontFamilies, googleFontsLinks,
    styleTags, inlineStyles, links, images, scripts,
  }
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  }
}

// ═══ Re-export para conveniência ═══
export { SERVICE_SIGNALS, PRICE_RE, BOOKING_RE, PROFESSIONAL_ID_RE, INSURANCE_LIST }
