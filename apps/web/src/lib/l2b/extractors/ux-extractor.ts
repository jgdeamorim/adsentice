// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — UX DNA Extractor
// Analisa: hierarquia visual, acessibilidade WCAG, legibilidade,
//          performance percebida, navegação
// Blueprint: vsforge-design-crawler quality-scorer.ts scoreDesign()
//    fórmula adaptada: confidence + complexity + structure + contentRich
// Multi-nicho: 29 categorias SMB — agnóstico a segmento
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite, UXDNA } from "../types"

// ── Hierarchy analysis ──

function analyzeHierarchy(site: ParsedSite): UXDNA["hierarchy"] {
  const h1Count = site.headings.filter(h => h.tag === "h1").length
  const h2Count = site.headings.filter(h => h.tag === "h2").length
  const h3Count = site.headings.filter(h => h.tag === "h3").length

  // Clarity: tem h1? h2 segue h1? hierarquia não pula nível?
  let clarity = 50
  if (h1Count === 1) clarity += 15  // exatamente 1 h1 = boa prática
  else if (h1Count > 1) clarity -= 10  // múltiplos h1 = confuso
  else clarity -= 20  // sem h1 = péssimo

  if (h2Count >= 2) clarity += 15
  if (h3Count >= 2) clarity += 10
  if (h2Count > 0 && h1Count === 0) clarity -= 10 // h2 sem h1 = estrutura quebrada
  if (h3Count > 0 && h2Count === 0) clarity -= 5  // h3 sem h2 = pulo de nível

  // Consistency: proporção entre headings é balanceada?
  let consistency = 50
  const totalH = h1Count + h2Count + h3Count
  if (totalH >= 5) consistency += 15
  if (h2Count >= h1Count) consistency += 10  // mais h2 que h1 = estrutura expandida
  if (h3Count >= h2Count * 0.5) consistency += 10  // h3 proporcionais a h2
  if (h1Count > 2) consistency -= 10

  return {
    clarity: Math.min(100, Math.max(0, clarity)),
    consistency: Math.min(100, Math.max(0, consistency)),
  }
}

// ── Navigation ──

function analyzeNavigation(site: ParsedSite): UXDNA["navigation"] {
  const internalLinks = site.links.filter(l => /^\/|^\.\/|^#/.test(l.href) && l.text.length < 30)
  const depth = internalLinks.length >= 20 ? 3 : internalLinks.length >= 10 ? 2 : internalLinks.length >= 3 ? 1 : 0
  const hasBreadcrumb = /breadcrumb|miga|pão/i.test(site.bodyText) ||
    site.links.some(l => /breadcrumb/i.test(l.href))
  const hasSearch = site.links.some(l => /search|busca|pesquisar/i.test(l.text)) ||
    /class="[^"]*search|<input[^>]*search/i.test(site.bodyText)

  return { depth, hasBreadcrumb, hasSearch }
}

// ── Readability ──

function analyzeReadability(site: ParsedSite): UXDNA["readability"] {
  // Contrast ratio: detecta se há cores de texto e fundo definidas
  let contrastRatio = 4.5 // default WCAG AA para texto normal
  const hasExplicitTextColor = site.styleTags.some(css => /color\s*:\s*#[0-9a-f]/i.test(css))
  const hasExplicitBg = site.styleTags.some(css => /background(?:-color)?\s*:\s*#[0-9a-f]/i.test(css))
  if (hasExplicitTextColor && hasExplicitBg) contrastRatio = 5.5 // provável > 4.5
  else if (hasExplicitTextColor || hasExplicitBg) contrastRatio = 3.5 // incerto
  else contrastRatio = 2.5 // sem definição explícita

  // Font size: estima do CSS
  let fontSize = 16
  for (const css of site.styleTags) {
    const m = css.match(/font-size\s*:\s*(\d+)px/i)
    if (m) { fontSize = parseInt(m[1]); break }
  }

  // Line height
  let lineHeight = 1.5
  for (const css of site.styleTags) {
    const m = css.match(/line-height\s*:\s*([\d.]+)/i)
    if (m) { lineHeight = parseFloat(m[1]); break }
  }

  return { contrastRatio, fontSize, lineHeight }
}

// ── Accessibility (WCAG) ──

function analyzeAccessibility(site: ParsedSite): UXDNA["accessibility"] {
  let hasAltText = false
  let altCount = 0
  let totalImages = site.images.length
  for (const img of site.images) {
    if (img.alt && img.alt.length > 2) altCount++
  }
  hasAltText = totalImages > 0 ? altCount / totalImages >= 0.5 : false

  const hasAriaLabels = /aria-label|aria-labelledby|aria-describedby|role="/i.test(site.bodyText)
  // Tabbable: detecta links sem href ou elementos interativos sem tabindex
  const hasInteractiveElements = site.links.filter(l => /^\/|^https?:\/\//.test(l.href)).length > 0
  const hasFormElements = /<input|<select|<textarea|<button/i.test(site.bodyText)
  const tabbable = hasInteractiveElements || hasFormElements

  // WCAG level inference
  let wcagLevel: UXDNA["accessibility"]["wcagLevel"] = "unknown"
  let a11yScore = 30 // base

  if (hasAltText) a11yScore += 15
  if (hasAriaLabels) a11yScore += 20
  if (tabbable) a11yScore += 10
  if (site.headings.length >= 3) a11yScore += 10 // estrutura semântica
  if (/<main|<header|<footer|<article|<section|<nav|<aside/i.test(site.bodyText)) a11yScore += 10 // HTML5 semântico
  if (/lang=/i.test(site.bodyText)) a11yScore += 5

  if (a11yScore >= 75) wcagLevel = "AA"
  else if (a11yScore >= 50) wcagLevel = "A"
  else wcagLevel = "unknown" // AAA requer verificação manual

  return {
    hasAltText, hasAriaLabels, tabbable, wcagLevel,
    score: Math.min(100, a11yScore),
  }
}

// ── Perceived Performance ──

function analyzePerformance(site: ParsedSite): UXDNA["perceivedPerformance"] {
  const hasLazyLoading = /loading\s*=\s*["']lazy["']|lazyload|data-src/i.test(site.bodyText)
  const hasPreconnect = /rel\s*=\s*["']preconnect["']|rel\s*=\s*["']dns-prefetch["']/i.test(site.bodyText)

  let fontDisplay: UXDNA["perceivedPerformance"]["fontDisplay"] = "unknown"
  for (const href of site.googleFontsLinks) {
    if (href.includes("display=swap")) fontDisplay = "swap"
    else if (href.includes("display=block")) fontDisplay = "block"
    else if (href.includes("display=fallback")) fontDisplay = "fallback"
  }

  let perfScore = 40
  if (hasLazyLoading) perfScore += 20
  if (hasPreconnect) perfScore += 15
  if (fontDisplay === "swap") perfScore += 15
  else if (fontDisplay !== "unknown") perfScore += 5 // qualquer display definido é melhor que nada
  if (site.images.length <= 10) perfScore += 10 // poucas imagens = mais rápido

  return {
    hasLazyLoading, hasPreconnect, fontDisplay,
    score: Math.min(100, perfScore),
  }
}

// ═══ Main extractor ═══

/**
 * Extrai UX DNA de um ParsedSite.
 * Blueprint: vsforge quality-scorer.ts + análise de acessibilidade.
 * 5 dimensões: hierarquia, navegação, legibilidade, acessibilidade, performance.
 */
export function extractUXDNA(site: ParsedSite): UXDNA {
  return {
    hierarchy: analyzeHierarchy(site),
    navigation: analyzeNavigation(site),
    readability: analyzeReadability(site),
    accessibility: analyzeAccessibility(site),
    perceivedPerformance: analyzePerformance(site),
  }
}
