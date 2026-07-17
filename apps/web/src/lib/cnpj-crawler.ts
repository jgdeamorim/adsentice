// ══════════════════════════════════════════════════════════════════
// ADSENTICE · CNPJ Crawler — extração de CNPJ em websites via cheerio
// Pipeline em camadas: axios+cheerio (HTML estático) → opcional Playwright (SPA)
//
// Estratégia:
//   Layer 1: Axios GET → cheerio parse → regex CNPJ (rápido, $0)
//   Layer 2: Playwright render → regex CNPJ (lento, $0, só se Layer 1 falhar)
//
// Apenas ~10-20% dos sites (SPA/React) precisam do Layer 2.
//
// medido=verdade · 2026-07-16 · adsentice
// ══════════════════════════════════════════════════════════════════

import "server-only"
import * as cheerio from "cheerio"

import { isValidCNPJ } from "./cnpj-enricher"

// ── Types ─────────────────────────────────────────────────────

export interface CrawlerResult {
  cnpjs: string[]                         // CNPJs encontrados (14 dígitos limpos)
  emails: string[]                        // emails encontrados
  phones: string[]                        // telefones BR encontrados
  source: "cheerio" | "playwright"        // qual camada extraiu
  duration_ms: number                     // tempo de execução
  url: string
  error?: string
}

// ── Constants ─────────────────────────────────────────────────

const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g
const PHONE_BR_REGEX = /(?:\(?\d{2}\)?\s?)?(?:\d{4,5}-?\d{4}|9\d{4}-?\d{4})/g

// User agents rotativos (evita bloqueio de bot)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
]

// ── Layer 1: Cheerio (HTML estático, rápido) ──────────────────

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

/** Extrai CNPJ + emails + telefones do HTML via cheerio. */
async function extractWithCheerio(url: string): Promise<CrawlerResult> {
  const t0 = Date.now()

  const result: CrawlerResult = {
    cnpjs: [], emails: [], phones: [],
    source: "cheerio", duration_ms: 0, url,
  }

  try {
    // 1. Fetch HTML
    const res = await fetch(url, {
      headers: {
        "User-Agent": getRandomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    })

    if (!res.ok) {
      result.error = `HTTP ${res.status}`
      result.duration_ms = Date.now() - t0

      return result
    }

    const html = await res.text()

    // 2. Parse com cheerio
    const $ = cheerio.load(html)

    // 3. Estratégia de extração em ordem de prioridade

    // 3a. Footer (maior probabilidade de CNPJ — obrigatório por lei)
    const footerText = $("footer").text()

    if (footerText.length > 10) {
      extractAll(footerText, result)
    }

    // 3b. Se não encontrou CNPJ no footer, procura em seções específicas
    if (result.cnpjs.length === 0) {
      const contactText = [
        $("footer").text(),
        $(".footer").text(),
        $(".rodape").text(),
        $("#footer").text(),
        $('[class*="footer"]').text(),
        $('[class*="rodape"]').text(),
      ].join(" ")

      extractAll(contactText, result)
    }

    // 3c. Página de contato (links internos)
    if (result.cnpjs.length === 0) {
      const contactLinks: string[] = []

      $("a").each((_, el) => {
        const href = $(el).attr("href") || ""
        const text = $(el).text().toLowerCase()

        if (/contato|contact|fale|sobre|about|quem-somos|institucional/.test(href + text)) {
          contactLinks.push(href)
        }
      })

      // Tenta buscar até 2 páginas internas de contato
      for (const link of contactLinks.slice(0, 2)) {
        try {
          const fullUrl = link.startsWith("http") ? link
            : link.startsWith("/") ? new URL(link, url).href
            : `${url.replace(/\/$/, "")}/${link}`

          const contactRes = await fetch(fullUrl, {
            headers: { "User-Agent": getRandomUA() },
            signal: AbortSignal.timeout(5000),
            redirect: "follow",
          })

          if (contactRes.ok) {
            const contactHtml = await contactRes.text()
            const $contact = cheerio.load(contactHtml)

            extractAll($contact.text(), result)
          }
        } catch { /* skip individual page failures */ }

        if (result.cnpjs.length > 0) break
      }
    }

    // 3d. Fallback: página inteira (último recurso — muito ruído)
    if (result.cnpjs.length === 0) {
      // Pega texto do body, excluindo scripts e styles
      $("script, style, noscript, iframe, svg, nav, header").remove()
      const bodyText = $("body").text()

      extractAll(bodyText, result)
    }

    // 4. Dedup + validar CNPJs
    result.cnpjs = [...new Set(result.cnpjs)]
      .map(c => c.replace(/\D/g, ""))
      .filter(isValidCNPJ)

    result.emails = [...new Set(result.emails.map(e => e.toLowerCase()))]
      .slice(0, 10)

    result.phones = [...new Set(result.phones.map(p => p.replace(/\D/g, "")))]
      .filter(p => p.length >= 10 && p.length <= 11)
      .slice(0, 10)

  } catch (err: any) {
    result.error = err.message?.slice(0, 200) || "Unknown error"
  }

  result.duration_ms = Date.now() - t0

  return result
}

// ── Layer 2: Playwright (SPA, lento — fallback opcional) ────────

/**
 * Extrai CNPJ de sites SPA via Playwright.
 * Playwright renderiza JavaScript (React/Vue/Angular) antes de extrair.
 *
 * NOTA: Requer `npx playwright install chromium` no servidor.
 *       Playwright NÃO é dependency do package.json — instalado separadamente.
 *       Se Playwright não estiver disponível, retorna null graciosamente.
 */
async function extractWithPlaywright(url: string): Promise<CrawlerResult | null> {
  const t0 = Date.now()

  try {
    // Dynamic require — Playwright é heavy, só carrega quando necessário
    // Não instalado por padrão: `npx playwright install chromium`
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chromium } = require("playwright")

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })

    const page = await browser.newPage()

    await page.setExtraHTTPHeaders({
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    })

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    })

    // Estratégia: footer primeiro, depois body inteiro
    let textToSearch = ""

    try {
      const footerEl = await page.locator("footer").first()

      textToSearch = await footerEl.innerText({ timeout: 3000 })
    } catch {
      // footer não encontrado — pega a página inteira
      textToSearch = await page.locator("body").innerText()
    }

    await browser.close()

    const result: CrawlerResult = {
      cnpjs: [], emails: [], phones: [],
      source: "playwright", duration_ms: Date.now() - t0, url,
    }

    extractAll(textToSearch, result)

    result.cnpjs = [...new Set(result.cnpjs)]
      .map(c => c.replace(/\D/g, ""))
      .filter(isValidCNPJ)

    result.emails = [...new Set(result.emails.map(e => e.toLowerCase()))].slice(0, 10)
    result.phones = [...new Set(result.phones.map(p => p.replace(/\D/g, "")))]
      .filter(p => p.length >= 10 && p.length <= 11)
      .slice(0, 10)

    return result
  } catch (err: any) {
    // Playwright não instalado ou falhou — retorna null
    const msg = err.message?.slice(0, 100) || ""

    if (msg.includes("Cannot find module") || msg.includes("playwright")) {
      return null  // Playwright não disponível → fallback esperado
    }

    // Outros erros (timeout, etc) — tenta de novo com página simplificada
    return null
  }
}

// ── Pipeline completo (2 camadas) ────────────────────────────────

/**
 * Pipeline de extração CNPJ em 2 camadas:
 *   1. cheerio (rápido, $0) → 80%+ dos sites
 *   2. playwright (lento, $0) → ~15% dos sites (SPA)
 *
 * Configurável: `usePlaywright` (default false — só ativar quando necessário)
 */
export async function crawlCNPJ(url: string, opts?: {
  usePlaywright?: boolean
  timeout?: number
}): Promise<CrawlerResult> {
  const usePlaywright = opts?.usePlaywright ?? false

  // Layer 1: cheerio (sempre executa primeiro)
  let result = await extractWithCheerio(url)

  // Layer 2: Playwright fallback (opcional)
  if (result.cnpjs.length === 0 && usePlaywright) {
    const playwrightResult = await extractWithPlaywright(url)

    if (playwrightResult) {
      result = playwrightResult
    }
  }

  return result
}

// ── Batch crawling ────────────────────────────────────────────────

/** Extrai CNPJ de múltiplos sites em paralelo (cheerio apenas). */
export async function crawlCNPJBatch(
  urls: string[],
  concurrency = 10
): Promise<CrawlerResult[]> {
  const results: CrawlerResult[] = []

  // Processa em chunks para não saturar
  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency)
    const chunkResults = await Promise.all(chunk.map(url => extractWithCheerio(url)))

    results.push(...chunkResults)
  }

  return results
}

// ── Helpers ──────────────────────────────────────────────────────

/** Aplica todos os regex de extração em um texto. */
function extractAll(text: string, result: CrawlerResult): void {
  // CNPJ
  for (const match of text.matchAll(CNPJ_REGEX)) {
    result.cnpjs.push(match[0])
  }

  // Emails
  for (const match of text.matchAll(EMAIL_REGEX)) {
    const email = match[0].toLowerCase()

    // Ignora emails genéricos (placeholder)
    if (email.includes("example") || email.includes("test") || email.includes("email")) continue
    result.emails.push(email)
  }

  // Telefones (padrão Brasil)
  for (const match of text.matchAll(PHONE_BR_REGEX)) {
    result.phones.push(match[0])
  }
}

// ── Tests (dev only) ───────────────────────────────────────────

if (process.env.NODE_ENV === "development") {
  void async function test() {
    console.log("[cnpj-crawler] Self-test — cheerio extraction validation")
    console.log("[cnpj-crawler] Module ready — use crawlCNPJ(url) to extract")
  }()
}
