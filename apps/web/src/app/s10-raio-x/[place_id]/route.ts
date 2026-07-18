// ══════════════════════════════════════════════════════════════════
// ADSENTICE · S10 Raio-X — Serve (ADR-0038 Generate-then-Serve)
// GET /s10-raio-x/[place_id]      → artefato publicado (<1s, R2+série)
// GET /s10-raio-x/[place_id]?v=N  → versão específica (inspeção admin)
//
// Route Handler (substitui page.tsx v081): o artefato é documento HTML
// completo congelado — Response(text/html) direto, zero RSC overhead,
// zero conflito com MUI layout (causa do revert 980f5b4).
// Fallback on-miss: gera inline (~14s) + persiste → próximos <1s.
// medido=verdade · 2026-07-18
// ══════════════════════════════════════════════════════════════════

import { getOrGenerateS10, getS10Version } from "@/lib/s10-artifacts"

export const dynamic = "force-dynamic"

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  // edge-cache ready: quando o domínio entrar na Cloudflare (free), s-maxage ativa o CDN
  "cache-control": "public, max-age=300, s-maxage=86400",
} as const

export async function GET(
  req: Request,
  ctx: { params: Promise<{ place_id: string }> }
) {
  const { place_id } = await ctx.params
  const v = new URL(req.url).searchParams.get("v")

  const served = v && /^\d+$/.test(v)
    ? await getS10Version(place_id, parseInt(v, 10))
    : await getOrGenerateS10(place_id)

  if (!served) {
    return new Response(
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"><title>Raio-X não encontrado | adsentice</title></head>" +
      "<body style=\"font-family:Inter,system-ui,sans-serif;padding:2rem;text-align:center\">" +
      "<h1>Raio-X não encontrado</h1><p>Lead não encontrado ou pipeline indisponível.</p></body></html>",
      { status: 404, headers: HTML_HEADERS }
    )
  }

  return new Response(served.html, {
    headers: {
      ...HTML_HEADERS,
      "x-s10-source": served.source,
      "x-s10-version": String(served.artifact.version),
    },
  })
}
