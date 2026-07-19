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

// ── Camada 3 · Evolution API (sessão autenticada) ──

export interface BaileysResult {
  existe: boolean
  jid?: string
  number: string
  verifiedAt: string
}

const baileysCache = new Map<string, BaileysResult>()

// ── Healthcheck · Evolution API :3100 ──

let evoHealth: { online: boolean; checkedAt: number; version?: string } | null = null
const HEALTH_TTL_MS = 30_000 // re-verifica a cada 30s

/** Verifica se Evolution API :3100 está viva. Cache 30s. */
export async function isEvolutionApiOnline(): Promise<{ online: boolean; version?: string }> {
  const now = Date.now()
  if (evoHealth && (now - evoHealth.checkedAt) < HEALTH_TTL_MS) {
    return { online: evoHealth.online, version: evoHealth.version }
  }

  try {
    const res = await fetch('http://localhost:3100/', {
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) {
      const data = await res.json() as { version?: string; status?: number }
      evoHealth = { online: true, checkedAt: now, version: data.version }
      return { online: true, version: data.version }
    }
  } catch { /* offline */ }

  evoHealth = { online: false, checkedAt: now }
  return { online: false }
}

/** Healthcheck síncrono — usa último valor cached (sem fetch). Para UI rápida. */
export function evoLastHealth(): { online: boolean; version?: string; checkedAt: number } | null {
  return evoHealth
}

/** Verifica se número tem WhatsApp via Evolution API (:3100). Fallback da Camada 2. */
export async function checkWhatsappBaileys(phone: string | null | undefined): Promise<BaileysResult | null> {
  const digits = normWaNumber(phone)
  if (!digits) return null

  if (baileysCache.has(digits)) return baileysCache.get(digits)!

  // ── Healthcheck: pula se Evolution API offline ──
  if (evoHealth && !evoHealth.online && (Date.now() - evoHealth.checkedAt) < HEALTH_TTL_MS) {
    return null // sabidamente offline, não insiste
  }

  try {
    const res = await fetch('http://localhost:3100/chat/whatsappNumbers/adsentice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: 'adsentice-wa-check-2026' },
      body: JSON.stringify({ numbers: [digits] }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      evoHealth = { online: false, checkedAt: Date.now() }
      return null
    }
    // Evolution API respondeu → atualiza health
    evoHealth = { online: true, checkedAt: Date.now() }
    const data = await res.json() as Array<{ jid?: string; exists: boolean; number: string }>
    const item = data?.[0]
    const result: BaileysResult = {
      existe: item?.exists ?? false,
      jid: item?.jid,
      number: digits,
      verifiedAt: new Date().toISOString(),
    }
    baileysCache.set(digits, result)
    return result
  } catch {
    evoHealth = { online: false, checkedAt: Date.now() }
    return null // Evolution API offline → Camada 2 decide sozinha
  }
}
