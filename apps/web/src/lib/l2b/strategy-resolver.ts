// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Strategy Resolver
// Noisy-OR framework detection (vsforge blueprint) + CrawlStrategy
// 10 sinais de framework · 8 estratégias por plataforma
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { FrameworkDetection } from "./types"

// ═══ Noisy-OR confidence aggregation (vsforge blueprint) ═══

/** Noisy-OR: 1 - Π(1 - wᵢ). Confiança cumulativa por sinais independentes. */
export function noisyOr(weights: number[]): number {
  return +(1 - weights.reduce((acc, w) => acc * (1 - w), 1)).toFixed(3)
}

// ═══ Framework signals (10 plataformas) ═══

export interface FrameworkSignals {
  "next.js": number[]
  react: number[]
  vue: number[]
  nuxt: number[]
  webflow: number[]
  wordpress: number[]
  wix: number[]
  shopify: number[]
  google_sites: number[]
  landing_page: number[]
}

/** Detecta sinais de framework do HTML + headers (Tier 1 — fetch()). */
export function detectFrameworkSignals(
  html: string,
  headers: Record<string, string>,
): FrameworkSignals {
  const signals: FrameworkSignals = {
    "next.js": [], react: [], vue: [], nuxt: [], webflow: [],
    wordpress: [], wix: [], shopify: [], google_sites: [], landing_page: [],
  }

  const lhtml = html.toLowerCase()
  const server = (headers["server"] || "").toLowerCase()
  const powered = (headers["x-powered-by"] || "").toLowerCase()

  // Header signals
  if (powered.includes("next")) signals["next.js"].push(0.9)
  if (server.includes("wordpress") || powered.includes("wordpress")) signals.wordpress.push(0.9)
  if (server.includes("wix")) signals.wix.push(0.85)
  if (server.includes("shopify")) signals.shopify.push(0.9)

  // HTML signals (vsforge blueprint + SMB extras)
  if (html.includes("__NEXT_DATA__")) signals["next.js"].push(0.9)
  if (html.includes("/_next/static/")) signals["next.js"].push(0.8)
  if (html.includes("data-reactroot")) signals.react.push(0.8)
  if (html.includes("react-dom")) signals.react.push(0.85)
  if (html.includes("__NUXT__")) signals.nuxt.push(0.9)
  if (html.includes("nuxt.config")) signals.nuxt.push(0.8)
  if (html.includes("v-cloak") || /:class=["'][^"']*[^"]*"/.test(html)) signals.vue.push(0.7)
  if (html.includes("wp-content") || html.includes("wp-includes")) signals.wordpress.push(0.85)
  if (lhtml.includes("wp-json")) signals.wordpress.push(0.8)
  if (html.includes("data-wf-site")) signals.webflow.push(0.95)
  if (lhtml.includes("webflow.com")) signals.webflow.push(0.9)
  if (lhtml.includes("wix.com") || lhtml.includes("_wix")) signals.wix.push(0.95)
  if (lhtml.includes("wixstatic")) signals.wix.push(0.9)
  if (lhtml.includes("cdn.shopify.com")) signals.shopify.push(0.95)
  if (lhtml.includes("myshopify.com")) signals.shopify.push(0.85)
  if (lhtml.includes("sites.google.com")) signals.google_sites.push(0.9)
  if (lhtml.includes("googleusercontent.com")) signals.google_sites.push(0.7)
  if (lhtml.includes("doctoralia.com.br")) signals.landing_page.push(0.85)

  // Landing page detection (single page, many CTAs, no nav depth)
  const linkCount = (html.match(/<a\s/g) || []).length
  const hasDeepNav = /<nav|class="[^"]*menu|class="[^"]*nav/i.test(html)
  if (linkCount < 5 && !hasDeepNav) signals.landing_page.push(0.6)

  return signals
}

/** Resolve framework com maior confiança via Noisy-OR. */
export function resolveFramework(
  signals: FrameworkSignals,
): FrameworkDetection {
  let topFramework = "unknown"
  let topConfidence = 0

  for (const [fw, weights] of Object.entries(signals)) {
    if (weights.length === 0) continue
    const conf = noisyOr(weights)
    if (conf > topConfidence) {
      topConfidence = conf
      topFramework = fw
    }
  }

  let renderMode: "ssr" | "csr" | "ssg" | "unknown" = "unknown"
  if (topFramework === "next.js") {
    renderMode = signals["next.js"].some(w => w >= 0.9) ? "ssr" : "csr"
  } else if (topFramework === "nuxt") {
    renderMode = "ssr"
  } else if (["webflow", "wordpress", "wix", "shopify", "google_sites"].includes(topFramework)) {
    renderMode = "ssr"
  } else if (signals.react.length > 0 || signals.vue.length > 0) {
    renderMode = "csr"
  } else {
    renderMode = "ssr" // padrão: HTML simples
  }

  return { framework: topFramework, renderMode, confidence: topConfidence }
}

/** Detecta e resolve o framework em um único passo. */
export function detectFramework(
  html: string,
  headers: Record<string, string>,
): FrameworkDetection {
  return resolveFramework(detectFrameworkSignals(html, headers))
}

// ═══ 20 padrões de seção (11 vsforge + 9 multi-nicho SMB) ═══

export const SECTION_PATTERNS: [string, RegExp][] = [
  // vsforge originais (11)
  ["hero", /class="[^"]*hero|id="[^"]*hero|<section[^>]*hero/i],
  ["features", /class="[^"]*feature|id="[^"]*feature|<section[^>]*feature/i],
  ["pricing", /class="[^"]*pric|id="[^"]*pric|<section[^>]*pric/i],
  ["testimonials", /class="[^"]*testimon|id="[^"]*testimon|review/i],
  ["cta", /class="[^"]*cta|id="[^"]*cta|call.to.action/i],
  ["faq", /class="[^"]*faq|id="[^"]*faq|accordion/i],
  ["team", /class="[^"]*team|id="[^"]*team/i],
  ["contact", /class="[^"]*contact|id="[^"]*contact|<form/i],
  ["footer", /<footer/i],
  ["navbar", /<nav|class="[^"]*nav|class="[^"]*header/i],
  ["about", /class="[^"]*about|id="[^"]*about/i],
  // adsentice multi-nicho SMB (9)
  ["booking", /agend|booking|reserva|marcar|horário|consulta|liga|whatsapp/i],
  ["gallery", /galeria|portfolio|antes.depois|resultado|trabalho|projeto/i],
  ["blog", /blog|artigo|noticia|novidade|dica|guia/i],
  ["services", /serviço|servico|especialidade|procedimento|tratamento|atuação/i],
  ["social_proof", /cliente|parceiro|convênio|plano|credenciado|associado/i],
  ["location", /endereço|localização|mapa|bairro|região|como.chegar/i],
  ["menu", /cardápio|catalogo|menu|produto|serviço|preço/i],
  ["team_specialist", /dr\.?|dra\.?|crm|crea|oab|profissional|especialista/i],
  ["certification", /certificado|licença|registro|filiado|associado|anvisa/i],
]

/** Detecta seções presentes no HTML usando os 20 padrões. */
export function detectSections(html: string): string[] {
  const sections: string[] = []
  for (const [name, re] of SECTION_PATTERNS) {
    if (re.test(html)) sections.push(name)
  }
  return sections
}

// ═══ CMS signature detection ═══

const CMS_SIGNATURES: [string, RegExp][] = [
  ["WordPress", /wp-content|wp-includes|wp-json|wordpress/i],
  ["Wix", /wix\.com|wixstatic|_wix|data-wix/i],
  ["Shopify", /shopify\.com|myshopify/i],
  ["Webflow", /webflow|data-wf-site/i],
  ["Google Sites", /sites\.google\.com/i],
  ["Joomla", /joomla|com_content/i],
  ["Drupal", /drupal|sites\/default/i],
  ["Squarespace", /squarespace/i],
  ["Elementor", /elementor|elementor-section/i],
  ["Next.js", /_next\/static|__NEXT_DATA__/i],
  ["React", /data-reactroot|react-dom/i],
  ["Vue", /v-cloak|__NUXT__|vue\.js/i],
  ["Bootstrap", /bootstrap|\.col-(?:xs|sm|md|lg|xl)-\d/i],
  ["Tailwind", /tailwind|\.bg-\[|\.text-\[|\.rounded-/i],
  ["Doctoralia", /doctoralia/i],
  ["Tray", /tray\.com\.br|platform\.tray/i],
  ["Nuvemshop", /nuvemshop/i],
  ["Loja Integrada", /lojaintegrada/i],
  ["Vnda", /vnda/i],
  ["WooCommerce", /woocommerce/i],
]

export function detectCMS(html: string): string[] {
  const detected: string[] = []
  for (const [name, re] of CMS_SIGNATURES) {
    if (re.test(html)) detected.push(name)
  }
  return detected
}
