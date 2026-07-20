// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Design DNA Extractor
// Extrai: cores, tipografia, estilo visual do CSS + HTML
// Blueprint: vsforge-design-crawler normalizer.ts + screenshot-engine.ts
//   (Playwright computedStyles → substituído por cheerio CSS extraction)
// Multi-nicho: 29 categorias SMB — agnóstico a segmento
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite, DesignDNA } from "../types"

// ── Color extraction (vsforge blueprint: extractComputedStyles + extractImageColors) ──

/** Converte rgb(r,g,b) → #rrggbb hex (vsforge rgbToHex) */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/[\d.]+/g)
  if (!m || m.length < 3) return rgb
  return "#" + m.slice(0, 3).map(n =>
    parseInt(n).toString(16).padStart(2, "0")
  ).join("")
}

/** Detecta cor HEX de string CSS (hex, rgb, hsl, named) */
function parseColor(raw: string): string | null {
  const s = raw.trim()
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.slice(0, 7).toLowerCase()
  if (s.startsWith("rgb")) return rgbToHex(s)
  if (s.startsWith("hsl")) return null // hsl precisa de conversão complexa, skip
  // Named colors mais comuns em design systems
  const named: Record<string, string> = {
    white: "#ffffff", black: "#000000", red: "#ff0000", blue: "#0000ff",
    green: "#00ff00", yellow: "#ffff00", orange: "#ffa500", purple: "#800080",
    gray: "#808080", grey: "#808080", transparent: "transparent",
  }
  return named[s.toLowerCase()] || null
}

/** Quantize color: round channels to nearest 16, cap at 255 (vsforge blueprint) */
function quantizeColor(hex: string): string {
  if (hex === "transparent" || hex.length < 7) return hex
  const clamp = (n: number) => Math.min(255, Math.round(n / 16) * 16)
  const r = clamp(parseInt(hex.slice(1, 3), 16))
  const g = clamp(parseInt(hex.slice(3, 5), 16))
  const b = clamp(parseInt(hex.slice(5, 7), 16))
  // Skip near-white and near-black (vsforge: background noise filter)
  const brightness = (r + g + b) / 3
  if (brightness > 240 || brightness < 15) return "skip"
  return "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")
}

// ── Font extraction (vsforge blueprint: extractComputedStyles.fontFamilies) ──

/** Extrai nome da fonte de um link Google Fonts */
function parseGoogleFontName(href: string): string[] {
  const m = href.match(/family=([^&:]+)/)
  if (!m) return []
  return decodeURIComponent(m[1]).split("|").map(f =>
    f.replace(/\+/g, " ").replace(/:wght@.*$/, "").replace(/:ital@.*$/, "")
  )
}

// ── Design personality inference ──

function inferPersonality(
  colors: string[], fonts: string[], cssVars: Record<string, string>,
): DesignDNA["personality"] {
  // Tone detection from color saturation + font style
  const hasBoldColors = colors.some(c => {
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16)
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    return (max - min) / (max || 1) > 0.6 // alta saturação
  })
  const hasSerif = fonts.some(f => /serif|playfair|merriweather|lora|times/i.test(f))
  const hasModern = fonts.some(f => /inter|poppins|roboto|montserrat|opensans/i.test(f))
  const hasPlayful = fonts.some(f => /comic|pacifico|dancing|caveat|fredoka/i.test(f))
  const usesGradients = cssVars["gradient"] !== undefined || cssVars["gradient-start"] !== undefined

  if (hasSerif && hasModern) return { tone: "premium", emotion: "autoridade" }
  if (hasModern && hasBoldColors) return { tone: "institucional", emotion: "inovacao" }
  if (hasSerif) return { tone: "premium", emotion: "confianca" }
  if (hasPlayful || usesGradients) return { tone: "popular", emotion: "acolhimento" }
  if (hasBoldColors) return { tone: "tecnico", emotion: "inovacao" }
  return { tone: "institucional", emotion: "confianca" }
}

function inferVisualStyle(
  colors: string[], radius: DesignDNA["visualStyle"]["radius"],
): DesignDNA["visualStyle"] {
  const hasShadows = true // detectado no UX extractor
  const hasPhotography = true // proxy (sites de negócio geralmente têm)
  return {
    radius,
    shadow: colors.length >= 3 ? "subtle" : "none",
    photography: hasPhotography ? "human-centered" : "stock",
    iconography: "outline", // proxy, difícil detectar sem visão
  }
}

// ═══ Main extractor ═══

/**
 * Extrai Design DNA de um ParsedSite.
 * Blueprint: vsforge normalizeDesignResult() — mesmas etapas, adaptado.
 * - Cores: CSS custom properties > style tags > inline styles (3 camadas)
 * - Fontes: Google Fonts links > CSS font-family (2 camadas)
 * - Personalidade: inferida de cores + fontes + gradientes
 * - Score: 0-100 (vsforge quality-scorer adaptado)
 */
export function extractDesignDNA(site: ParsedSite): DesignDNA {
  // ── CAMADA 1 · CSS Custom Properties (design systems modernos) ──
  const cssVarColors: string[] = []
  let primary = "#2563eb"
  let secondary = "#7c3aed"
  let accent = "#f59e0b"
  let surface = "#ffffff"
  let textPrimary = "#111827"

  for (const [key, value] of Object.entries(site.cssCustomProperties)) {
    const parsed = parseColor(value)
    if (!parsed || parsed === "transparent") continue
    if (key.includes("primary") || key.includes("main")) primary = parsed
    else if (key.includes("secondary")) secondary = parsed
    else if (key.includes("accent") || key.includes("highlight")) accent = parsed
    else if (key.includes("surface") || key.includes("bg") || key.includes("background")) surface = parsed
    else if (key.includes("text") || key.includes("foreground")) textPrimary = parsed
    cssVarColors.push(parsed)
  }

  // ── CAMADA 2 · Style tags (CSS inline, <style> blocks) ──
  const styleColors: string[] = []
  for (const css of site.styleTags) {
    // background-color: #xxx; color: #xxx
    const bgMatches = css.matchAll(/(?:background(?:-color)?|bg)\s*:\s*([^;}{]+)/gi)
    for (const m of bgMatches) {
      const parsed = parseColor(m[1])
      if (parsed && parsed !== "transparent") styleColors.push(parsed)
    }
    const colorMatches = css.matchAll(/(?<!background-)color\s*:\s*([^;}{]+)/gi)
    for (const m of colorMatches) {
      const parsed = parseColor(m[1])
      if (parsed && parsed !== "transparent") styleColors.push(parsed)
    }
  }

  // ── CAMADA 3 · Inline styles (style="color: #xxx") ──
  const inlineColors: string[] = []
  for (const style of site.inlineStyles) {
    const m = style.match(/(?:color|background(?:-color)?)\s*:\s*([^;]+)/i)
    if (m) {
      const parsed = parseColor(m[1])
      if (parsed && parsed !== "transparent") inlineColors.push(parsed)
    }
  }

  // ── MERGE + DEDUP (vsforge blueprint: merge computed + image colors) ──
  const allColors = [...cssVarColors, ...styleColors, ...inlineColors]
  const colorCounts = new Map<string, number>()
  for (const raw of allColors) {
    const hex = quantizeColor(raw)
    if (hex === "skip" || hex === "transparent") continue
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
  }
  // Top-5 by frequency (vsforge pattern)
  const palette = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hex]) => hex)

  // Override primary/secondary/accent from palette if CSS vars didn't capture
  if (palette.length >= 1 && primary === "#2563eb") primary = palette[0]
  if (palette.length >= 2 && secondary === "#7c3aed") secondary = palette[1]
  if (palette.length >= 3 && accent === "#f59e0b") accent = palette[2]

  // ── TYPOGRAPHY · Google Fonts + CSS font-family ──
  const heading: string[] = []
  const body: string[] = []
  for (const href of site.googleFontsLinks) {
    heading.push(...parseGoogleFontName(href))
    body.push(...parseGoogleFontName(href))
  }
  // CSS font-family fallback
  for (const font of site.fontFamilies) {
    if (!body.includes(font)) body.push(font)
    if (font.length > 3 && !heading.includes(font)) heading.push(font)
  }
  // Dedup and filter
  const headingFont = heading[0] || body[0] || "Inter"
  const bodyFont = body[0] || heading[0] || "Inter"

  // ── Font scale (weights from CSS) ──
  const weights = new Set<number>()
  for (const css of site.styleTags) {
    const m = css.matchAll(/font-weight\s*:\s*(\d{3})/gi)
    for (const w of m) weights.add(parseInt(w[1]))
  }
  const weightList = weights.size > 0 ? [...weights].sort() : [400, 600, 700]

  // ── BORDER RADIUS (from CSS vars + inline styles) ──
  let radius: DesignDNA["visualStyle"]["radius"] = "soft"
  for (const [key, value] of Object.entries(site.cssCustomProperties)) {
    if (key.includes("radius")) {
      const px = parseInt(value)
      if (px >= 16 || value === "9999px" || value === "100%") radius = "pill"
      else if (px >= 8) radius = "rounded"
      else if (px <= 2) radius = "sharp"
      else radius = "soft"
      break
    }
  }
  // Fallback: busca Tailwind classes
  for (const style of site.inlineStyles) {
    if (/border-radius\s*:\s*(?:1[6-9]|[2-9]\d)px/i.test(style)) radius = "pill"
    else if (/border-radius\s*:\s*[8-9]px/i.test(style)) radius = "rounded"
    else if (/border-radius\s*:\s*[12]px/i.test(style)) radius = "sharp"
  }

  // ── INFER personality + visual style ──
  const personality = inferPersonality(palette, [...heading, ...body], site.cssCustomProperties)
  const visualStyle = inferVisualStyle(palette, radius)

  // ── SCORE (vsforge quality-scorer adaptado para SMB) ──
  const techConfidence = 0.7 // proxy (framework detection já fez isso)
  const complexity = Math.min(palette.length / 5, 1)
  const fontRichness = heading.length + body.length >= 4 ? 1 : 0.5
  const cssVarRichness = Object.keys(site.cssCustomProperties).length >= 3 ? 1 : 0.3
  const score = Math.round(
    (techConfidence * 0.35 + complexity * 0.25 + fontRichness * 0.20 + cssVarRichness * 0.20) * 100
  )

  return {
    personality,
    colors: { primary, secondary, accent, surface, textPrimary, palette },
    typography: { heading: headingFont, body: bodyFont, scale: ["14px", "16px", "20px", "24px", "32px"], weights: weightList },
    visualStyle,
    score,
  }
}
