// ══════════════════════════════════════════════════════════════════
// ADSENTICE · /r — Redirect de conversão (ADR-0037 F6 · loop f0)
// GET /r/[place_id]?v=A&s=S11 → registra cta_click POR VARIANTE →
// 302 wa.me do PRÓPRIO cliente (phone real do lead) · fallback Maps.
// É este evento que fecha o loop A/B: conversão medida por estratégia.
// medido=verdade · 2026-07-18
// ══════════════════════════════════════════════════════════════════

import { getLeadContact, trackSurfaceEvent } from "@/lib/s10-artifacts"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  ctx: { params: Promise<{ place_id: string }> }
) {
  const { place_id } = await ctx.params
  const url = new URL(req.url)
  const variant = url.searchParams.get("v")
  const surface = url.searchParams.get("s") || 'S11'

  // conversão! (fire-and-forget)
  trackSurfaceEvent({
    place_id, surface,
    ab_variant: variant === 'A' || variant === 'B' ? variant : null,
    event: 'cta_click',
  })

  const contact = await getLeadContact(place_id)
  const digits = (contact?.phone || '').replace(/\D/g, '')
  const dest = digits.length >= 10
    ? `https://wa.me/${digits.startsWith('55') ? digits : '55' + digits}?text=${encodeURIComponent(`Olá! Vi a página de ${contact?.title || 'vocês'} e quero agendar.`)}`
    : `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place_id)}`

  return Response.redirect(dest, 302)
}
