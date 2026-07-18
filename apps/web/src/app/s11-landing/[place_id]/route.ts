// ══════════════════════════════════════════════════════════════════
// ADSENTICE · S11 Landing do Cliente — Serve A/B (ADR-0037 F6 + ADR-0038)
// GET /s11-landing/[place_id] → variante congelada por VISITANTE (cookie
// ads_ab, 30d) → artefato publicado (<1s) · miss → gera par A/B + persiste.
// Cada view registra evento por variante (s11_events) → conversão medida.
// medido=verdade · 2026-07-18
// ══════════════════════════════════════════════════════════════════

import { getOrGenerateS11, trackSurfaceEvent } from "@/lib/s10-artifacts"

export const dynamic = "force-dynamic"

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  // por-visitante (cookie define a variante) → private; edge cache fica para fase Workers
  "cache-control": "private, max-age=300",
} as const

export async function GET(
  req: Request,
  ctx: { params: Promise<{ place_id: string }> }
) {
  const { place_id } = await ctx.params
  const url = new URL(req.url)

  // variante: ?v força (inspeção admin) → cookie → sorteio 50/50 congelado 30d
  const forced = url.searchParams.get("v")
  const cookieMatch = (req.headers.get("cookie") || "").match(/ads_ab=(A|B)/)
  const variant: 'A' | 'B' = forced === 'A' || forced === 'B'
    ? forced
    : cookieMatch
      ? (cookieMatch[1] as 'A' | 'B')
      : (Math.random() < 0.5 ? 'A' : 'B')

  const served = await getOrGenerateS11(place_id, variant)

  if (!served) {
    return new Response(
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"><title>Página não encontrada | adsentice</title></head>" +
      "<body style=\"font-family:Inter,system-ui,sans-serif;padding:2rem;text-align:center\">" +
      "<h1>Página não encontrada</h1><p>Negócio não encontrado ou pipeline indisponível.</p></body></html>",
      { status: 404, headers: HTML_HEADERS }
    )
  }

  // evento de view por variante (fire-and-forget — conversão por estratégia)
  trackSurfaceEvent({
    place_id, surface: 'S11',
    version: served.artifact.version ?? null,
    ab_variant: served.artifact.ab_variant ?? variant,
    event: 'view',
  })

  return new Response(served.html, {
    headers: {
      ...HTML_HEADERS,
      "set-cookie": `ads_ab=${variant}; Path=/; Max-Age=2592000; SameSite=Lax`,
      "x-s11-source": served.source,
      "x-s11-variant": variant,
      "x-s11-version": String(served.artifact.version ?? ''),
    },
  })
}
