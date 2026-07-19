// ══════════════════════════════════════════════════════════════════
// ADSENTICE · WhatsApp Checker — verifica se número tem conta real
//
// Faz 1 GET leve (HTML inicial) ao wa.me/{numero} e analisa og:title.
// Número REAL:   og:title = "Nome do Dono" (≠ "Share on WhatsApp")
// Número FALSO:  og:title = "Share on WhatsApp"
// Medido=verdade · 2026-07-19 · $0 por chamada
// ══════════════════════════════════════════════════════════════════

import "server-only"

export interface WaCheckResult {
  hasWhatsapp: boolean
  displayName: string | null
  isBusiness: boolean
  checked: boolean
}

/** Normaliza número BR: strip dígitos, remove +55, garante 55 */
export function normWaNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, "")
  if (digits.length < 10) return null
  if (!digits.startsWith("55")) digits = "55" + digits
  return digits
}

// Cache em memória (mesmo número reusado várias vezes na UI)
const cache = new Map<string, WaCheckResult>()

/** Verifica se um número BR tem WhatsApp real (GET wa.me → parse HTML). CACHE em memória. */
export async function checkWhatsapp(phone: string | null | undefined): Promise<WaCheckResult> {
  const digits = normWaNumber(phone)
  if (!digits) return { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }

  if (cache.has(digits)) return cache.get(digits)!

  try {
    const res = await fetch(`https://wa.me/${digits}`, {
      headers: { "User-Agent": "WhatsApp/2.24.25 iOS" },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      const r: WaCheckResult = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
      cache.set(digits, r)
      return r
    }

    // Lê só os primeiros 8KB — og:title está no <head>
    const reader = res.body?.getReader()
    if (!reader) {
      const r: WaCheckResult = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
      cache.set(digits, r)
      return r
    }

    // Coleta ~8KB do início da resposta
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
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    const ogTitleMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)
    const ogDescMatch = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)

    const title = ogTitleMatch?.[1] || titleMatch?.[1] || ""
    const desc = ogDescMatch?.[1] || ""
    const hasReal = title !== "Share on WhatsApp" && title.length > 0 && !title.includes("WhatsApp Messenger")
    const isBiz = desc.includes("Business Account")

    const r: WaCheckResult = {
      hasWhatsapp: hasReal,
      displayName: hasReal ? title : null,
      isBusiness: isBiz,
      checked: true,
    }
    cache.set(digits, r)
    return r
  } catch {
    const r: WaCheckResult = { hasWhatsapp: false, displayName: null, isBusiness: false, checked: false }
    cache.set(digits, r)
    return r
  }
}

function concatU8(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    result.set(c, offset)
    offset += c.length
  }
  return result
}
