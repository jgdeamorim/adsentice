// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Site Fetcher
// fetch() robusto · gzip/brotli · keep-alive · UA rotation · retry
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { SiteFetcherResult } from "./types"

const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (compatible; Adsentice/1.0; +https://adsentice.com.br)",
]

let uaIndex = 0
function pickUserAgent(): string {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length]
  uaIndex++
  return ua
}

/** Normaliza URL: adiciona https:// se ausente, remove trailing slash */
export function normalizeUrl(raw: string): string | null {
  let url = raw.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = "https://" + url
  try {
    const u = new URL(url)
    return u.origin === "null" ? null : u.href.replace(/\/$/, "")
  } catch (e: unknown) { void e; return null }
}

/** Extrai domínio da URL (sem www, sem protocolo) */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch (e: unknown) { void e; return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] }
}

/**
 * Fetch robusto de site SMB.
 * - gzip/brotli: automático (Node.js descomprime nativamente)
 * - keep-alive: reuso de conexão
 * - UA rotation: evita bloqueio por bot-detection simples
 * - timeout 5s + 1 retry
 * - redirect follow: até 5 redirecionamentos
 */
export async function fetchSite(
  url: string,
  opts?: { timeout?: number; retry?: boolean },
): Promise<SiteFetcherResult> {
  const normalized = normalizeUrl(url)
  if (!normalized) {
    return {
      html: "",
      statusCode: 0,
      finalUrl: url,
      latencyMs: 0,
      headers: {},
      error: "URL inválida",
    }
  }

  const t0 = Date.now()
  const timeout = opts?.timeout ?? 8000
  const shouldRetry = opts?.retry ?? true

  let lastResult: SiteFetcherResult | null = null

  for (let attempt = 0; attempt < (shouldRetry ? 2 : 1); attempt++) {
    try {
      const res = await fetch(normalized, {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Encoding": "gzip, br",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5",
          "User-Agent": pickUserAgent(),
          "Connection": "keep-alive",
        },
        signal: AbortSignal.timeout(timeout),
        redirect: "follow",
      })

      const html = await res.text()
      const headers: Record<string, string> = {}
      res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })

      const result: SiteFetcherResult = {
        html,
        statusCode: res.status,
        finalUrl: res.url || normalized,
        latencyMs: Date.now() - t0,
        headers,
      }

      // Se recebeu HTML e status < 500, OK
      if (res.status < 500 && html.length > 100) {
        return result
      }

      // Status 5xx ou HTML muito pequeno → retry
      if (res.status >= 500) {
        lastResult = { ...result, error: `HTTP ${res.status}` }
        if (attempt < 1) await new Promise(r => setTimeout(r, 1000))
        continue
      }

      // HTML minúsculo (provavelmente página de loading/SPA shell)
      if (html.length <= 100) {
        lastResult = { ...result, html: "", error: "HTML vazio (SPA shell?)" }
        if (attempt < 1) await new Promise(r => setTimeout(r, 1000))
        continue
      }

      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      lastResult = {
        html: "",
        statusCode: 0,
        finalUrl: normalized,
        latencyMs: Date.now() - t0,
        headers: {},
        error: msg,
      }
      if (attempt < 1) await new Promise(r => setTimeout(r, 1000))
    }
  }

  return lastResult!
}
