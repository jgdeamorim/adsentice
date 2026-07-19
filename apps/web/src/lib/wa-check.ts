// ══════════════════════════════════════════════════════════════════
// ADSENTICE · WhatsApp Checker — verifica se número tem conta real
//
// Versão corrigida: redirect:follow + parsing robusto de meta tags.
// Business: og:title = "Nome do Perfil"  ·  Pessoal/Falso: "Share on WhatsApp"
// Complementar à heurística detectWA (formato celular BR).
// medido=verdade · $0 por chamada · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import "server-only"

export interface WaCheckResult {
  hasWhatsapp: boolean
  displayName: string | null
  isBusiness: boolean
  checked: boolean
}

/** Normaliza número BR: strip dígitos, garante +55, min 10 dígitos */
export function normWaNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return null
  if (!digits.startsWith("55")) digits = "55" + digits
  return digits
}

// Cache em memória (1 verificação por número na sessão do servidor)
const cache = new Map<string, WaCheckResult>()

export async function checkWhatsapp(phone: string | null | undefined): Promise<WaCheckResult> {
  const digits = normWaNumber(phone)
  if (!digits) return { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }

  if (cache.has(digits)) return cache.get(digits)!

  try {
    const res = await fetch(`https://wa.me/${digits}`, {
      headers: { "User-Agent": "WhatsApp/2.24.25 iOS" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    })

    if (!res.ok) {
      const r = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
      cache.set(digits, r)
      return r
    }

    // Lê stream parcial (head — primeiros 8KB)
    const reader = res.body?.getReader()
    if (!reader) {
      const r = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
      cache.set(digits, r)
      return r
    }

    const chunks: Uint8Array[] = []
    let total = 0
    const decoder = new TextDecoder()
    while (total < 8192) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value!)
      total += value!.length
    }
    reader.cancel()

    const html = decoder.decode(concatU8(chunks))

    // Parsing robusto — variações de HTML do WhatsApp
    const ogTitleMatch = html.match(/og:title["']\s*content=["']([^"']+)/i)
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    const ogDescMatch = html.match(/og:description["']\s*content=["']([^"']+)/i)

    const ogTitle = (ogTitleMatch?.[1] || titleMatch?.[1] || "").trim()
    const ogDesc = (ogDescMatch?.[1] || "").trim()

    const isSharePage = ogTitle === "Share on WhatsApp" || ogTitle.includes("WhatsApp Messenger")
    const hasRealAccount = !isSharePage && ogTitle.length > 3

    const isBusiness = hasRealAccount && (
      ogDesc.includes("Business Account") ||
      /business/i.test(ogDesc)
    )

    const result: WaCheckResult = {
      hasWhatsapp: hasRealAccount,
      displayName: hasRealAccount ? ogTitle : null,
      isBusiness,
      checked: true,
    }

    cache.set(digits, result)
    return result

  } catch (err) {
    console.error("[wa-check]", String(err).slice(0, 80))
    const r = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
    cache.set(digits, r)
    return r
  }
}

function concatU8(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}
