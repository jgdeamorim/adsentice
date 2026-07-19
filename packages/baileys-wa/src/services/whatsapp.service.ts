// ══════════════════════════════════════════════════════════════════
// ADSENTICE · WhatsApp Service — verificação de números
// sock.onWhatsApp(jid) — query leve, não envia mensagem
// Camada 3 do wa-check (ADR-0041) · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import { getSocket } from "../socket.js"

export interface NumeroResponse {
  numero: string
  existe: boolean
  verifiedAt: string
}

/** Cache em memória — evita re-verificar o mesmo número na sessão */
const cache = new Map<string, boolean>()

export async function verificarNumero(numero: string): Promise<NumeroResponse> {
  // Normaliza: strip não-dígitos
  const digits = numero.replace(/\D/g, "")
  if (digits.length < 10) {
    return { numero: digits, existe: false, verifiedAt: new Date().toISOString() }
  }

  if (cache.has(digits)) {
    return { numero: digits, existe: cache.get(digits)!, verifiedAt: new Date().toISOString() }
  }

  try {
    const sock = getSocket()
    const jid = `${digits}@s.whatsapp.net`
    const result = await sock.onWhatsApp(jid)

    const existe = Array.isArray(result) && result.length > 0
    cache.set(digits, existe)

    return {
      numero: digits,
      existe,
      verifiedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error(`[baileys-wa] erro ao verificar ${digits}: ${err.message?.slice(0, 80)}`)
    return { numero: digits, existe: false, verifiedAt: new Date().toISOString() }
  }
}

/** Verifica múltiplos números em lote (rate limit amigável) */
export async function verificarNumeros(
  numeros: string[],
): Promise<NumeroResponse[]> {
  const unique = [...new Set(numeros.map(n => n.replace(/\D/g, "")))]
  const resultados: NumeroResponse[] = []

  // Lotes de 10, delay 200ms entre lotes (respeita rate limit)
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10)
    const batchResults = await Promise.all(batch.map(n => verificarNumero(n)))
    resultados.push(...batchResults)
    if (i + 10 < unique.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  return resultados
}
