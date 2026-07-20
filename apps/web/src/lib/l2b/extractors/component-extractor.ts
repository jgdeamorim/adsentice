// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Component DNA Extractor
// Detecta: 20 padrões de seção + componentes (botões, cards, etc.)
// Blueprint: vsforge-design-crawler fingerprint.ts detectSections()
//   11 padrões originais + 9 multi-nicho SMB (29 categorias)
// Multi-nicho: agnóstico a segmento
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite, ComponentDNA } from "../types"
import { SECTION_PATTERNS } from "../strategy-resolver"

// ── Component detection ──

interface ButtonSignal {
  variants: string[]
  hasGradient: boolean
  hasRounded: boolean
  hasOutline: boolean
  avgFontSize: number
}

function detectButtons(site: ParsedSite): ComponentDNA["components"]["button"] {
  const buttonStyles: ButtonSignal = {
    variants: [], hasGradient: false, hasRounded: false, hasOutline: false, avgFontSize: 14,
  }
  let buttonCount = 0

  for (const css of site.styleTags) {
    // Detecta classes/estilos de botão
    if (/\.btn|\.button|\[class\*="btn"\]|\[class\*="button"\]/i.test(css)) {
      buttonCount += (css.match(/btn|button/gi) || []).length
      if (/gradient/i.test(css)) buttonStyles.hasGradient = true
      if (/border-radius\s*:\s*(?:[89]|\d{2,})px/i.test(css)) buttonStyles.hasRounded = true
      if (/border\s*:\s*[^}]+solid/i.test(css) && /background\s*:\s*(?:none|transparent)/i.test(css)) {
        buttonStyles.hasOutline = true
      }
      const sizeMatch = css.match(/font-size\s*:\s*(\d+)px/i)
      if (sizeMatch) buttonStyles.avgFontSize = parseInt(sizeMatch[1])
    }
  }

  // Detecta links que parecem botões (href + classes visuais)
  const buttonLinks = site.links.filter(l =>
    /btn|button|cta|primary|action|pill/i.test(l.text) ||
    /class="[^"]*btn|class="[^"]*button/i.test(l.href)
  )
  buttonCount += buttonLinks.length

  if (buttonCount === 0) return { detected: false, variants: [] }

  if (buttonStyles.hasGradient) buttonStyles.variants.push("gradient")
  if (buttonStyles.hasOutline) buttonStyles.variants.push("outline")
  if (buttonStyles.hasRounded) buttonStyles.variants.push("rounded")
  buttonStyles.variants.push("solid")
  if (buttonStyles.variants.length >= 2) buttonStyles.variants.push("primary")

  return {
    detected: true,
    variants: [...new Set(buttonStyles.variants)],
  }
}

function detectCards(site: ParsedSite): ComponentDNA["components"]["card"] {
  let hasCard = false
  let radius = 8
  let shadow = "none"

  for (const css of site.styleTags) {
    if (/\.card|\[class\*="card"\]/i.test(css)) {
      hasCard = true
      const r = css.match(/border-radius\s*:\s*(\d+)px/i)
      if (r) radius = parseInt(r[1])
      if (/box-shadow\s*:\s*[^;]+rgba|shadow/i.test(css)) shadow = radius >= 12 ? "medium" : "subtle"
    }
  }
  // Fallback: detecta padrão de div com border-radius + shadow
  if (!hasCard) {
    for (const css of site.styleTags) {
      if (/border-radius\s*:\s*(?:[89]|\d{2})px.*box-shadow/i.test(css)) {
        hasCard = true; radius = 12; shadow = "subtle"; break
      }
    }
  }

  return { detected: hasCard, radius, shadow }
}

function detectForm(site: ParsedSite): ComponentDNA["components"]["form"] {
  const hasForm = site.bodyText.includes("form") ||
    /<form|<input|<select|<textarea/i.test(site.bodyText) ||
    site.links.some(l => /form|contato|newsletter|cadastro/i.test(l.text))

  let style = "custom"
  for (const css of site.styleTags) {
    if (/material|mdc-|mat-/i.test(css)) { style = "material"; break }
    if (/bootstrap|\.col-(?:xs|sm|md|lg)/i.test(css)) { style = "bootstrap"; break }
  }

  return { detected: hasForm, style }
}

function detectNav(site: ParsedSite): ComponentDNA["components"]["nav"] {
  // Cheerio bodyText stripped HTML → usar SECTION_PATTERNS + link heuristics
  const navPattern = SECTION_PATTERNS.find(([name]) => name === "navbar")?.[1]
  const hasNavByPattern = navPattern ? navPattern.test(site.bodyText) : false
  const internalLinks = site.links.filter(l => /^\/|^\.\/|^#/.test(l.href) && l.text.length < 30)
  const hasNav = hasNavByPattern || internalLinks.length >= 3
  const isSticky = site.styleTags.some(css => /position\s*:\s*sticky|position\s*:\s*fixed/i.test(css) && /top\s*:\s*0/i.test(css))

  if (!hasNav) return { type: "none", sticky: false }

  const linkCount = site.links.filter(l => /^\/|^\.\/|^#/.test(l.href) && l.text.length < 30).length
  if (linkCount >= 5) return { type: "top", sticky: isSticky }
  if (linkCount >= 2) return { type: "hamburger", sticky: isSticky }
  return { type: "side", sticky: isSticky }
}

function detectHero(site: ParsedSite): ComponentDNA["components"]["hero"] {
  const hasHero = SECTION_PATTERNS.some(([name, re]) => name === "hero" && re.test(site.bodyText))
  if (!hasHero) return { detected: false, type: "text-only" }

  const hasImage = site.images.some(img => img.width && img.width > 400) ||
    /\.hero.*background(?:-image)?\s*:|hero.*url\(/i.test(site.styleTags.join(" "))
  const hasVideo = /\.hero.*<video|<iframe.*youtube/i.test(site.bodyText)
  const hasSlider = /slider|carousel|swiper/i.test(site.bodyText)

  if (hasVideo) return { detected: true, type: "video" }
  if (hasSlider) return { detected: true, type: "slider" }
  if (hasImage) return { detected: true, type: "image" }
  return { detected: true, type: "text-only" }
}

function detectFooter(site: ParsedSite): ComponentDNA["components"]["footer"] {
  const footerPattern = SECTION_PATTERNS.find(([name]) => name === "footer")?.[1]
  const hasFooter = footerPattern ? footerPattern.test(site.bodyText) : false
  const hasFooterText = /©|todos.os.direitos|direitos.reservados/i.test(site.bodyText.slice(-500))
  if (!hasFooter && !hasFooterText) return { columns: 0, hasSitemap: false, hasSocialLinks: false }

  // Estima colunas pelo número de links no footer
  const footerLinks = site.links.filter(l =>
    /^\/|^\.\/|^#/.test(l.href) && l.text.length < 30
  )
  const columns = Math.min(4, Math.max(1, Math.ceil(footerLinks.length / 5)))
  const hasSitemap = /sitemap|mapa.do.site|todas.as/i.test(site.bodyText)
  const hasSocialLinks = site.links.some(l => l.isSocial)

  return { columns, hasSitemap, hasSocialLinks }
}

// ═══ Main extractor ═══

/**
 * Extrai Component DNA de um ParsedSite.
 * Blueprint: vsforge fingerprint.ts detectSections() + normalizer.ts merge.
 * 20 padrões de seção (11 vsforge + 9 SMB multi-nicho).
 */
export function extractComponentDNA(site: ParsedSite): ComponentDNA {
  const sections = SECTION_PATTERNS
    .filter(([, re]) => re.test(site.bodyText))
    .map(([name]) => name)

  return {
    sections,
    components: {
      button: detectButtons(site),
      card: detectCards(site),
      form: detectForm(site),
      nav: detectNav(site),
      hero: detectHero(site),
      footer: detectFooter(site),
    },
  }
}
