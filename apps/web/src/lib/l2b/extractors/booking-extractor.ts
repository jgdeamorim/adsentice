// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Booking Extractor
// Detecta sistema de agendamento online (WhatsApp, Doctoralia, etc.)
// Multi-nicho: 29 categorias SMB
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"

export interface BookingData {
  hasBooking: boolean
  platform: "whatsapp" | "doctoralia" | "form" | "external" | "phone" | "unknown" | null
  url: string | null
  confidence: number // 0-100
}

// Plataformas de agendamento conhecidas (Brasil)
const BOOKING_PLATFORMS: [string, RegExp][] = [
  ["doctoralia", /doctoralia/i],
  ["whatsapp", /wa\.me|api\.whatsapp|whatsapp/i],
  ["whatsapp", /whatsapp/i], // texto no body também conta
  ["form", /agend|reserva|marca|booking/i], // formulário próprio
  ["phone", /ligue|telefone/i],
  ["external", /calendly|agenda.la|hiplatform|amilo/i],
  ["external", /tuagenda|clinicasimples|simplesdental/i],
  ["external", /iDoctor|dentalsis|dentaloffice/i],
  ["external", /sistema.*agendamento|software.*clinica/i],
]

/**
 * Detecta presença de sistema de agendamento no site.
 * Multi-camada: links → body text → headings → inputs HTML
 */
export function extractBooking(site: ParsedSite): BookingData {
  const scores: Record<string, number> = {}

  // ── Camada 1: Links com URL de agendamento ──
  for (const link of site.links) {
    if (link.platform === "whatsapp") {
      scores["whatsapp"] = (scores["whatsapp"] || 0) + 3
    }
    for (const [platform, re] of BOOKING_PLATFORMS) {
      if (re.test(link.href) || re.test(link.text)) {
        scores[platform] = (scores[platform] || 0) + 1
      }
    }
  }

  // ── Camada 2: Body text ──
  const bodyL = site.bodyText.toLowerCase()
  for (const [platform, re] of BOOKING_PLATFORMS) {
    if (re.test(bodyL)) {
      scores[platform] = (scores[platform] || 0) + 2
    }
  }

  // ── Camada 3: Headings ──
  for (const h of site.headings) {
    for (const [platform, re] of BOOKING_PLATFORMS) {
      if (re.test(h.text)) {
        scores[platform] = (scores[platform] || 0) + 1
      }
    }
  }

  // ── Camada 4: Scripts (embed de plataforma) ──
  for (const script of site.scripts) {
    if (/doctoralia|calendly|agenda\.la/i.test(script)) {
      scores["external"] = (scores["external"] || 0) + 3
    }
  }

  // ── Resolve ──
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) {
    return { hasBooking: false, platform: null, url: null, confidence: 0 }
  }

  const [bestPlatform, bestScore] = sorted[0]
  const maxPossible = 10
  const confidence = Math.min(100, Math.round((bestScore / maxPossible) * 100))

  // Encontra o URL de agendamento
  let url: string | null = null
  if (bestPlatform === "whatsapp") {
    url = site.links.find(l => l.platform === "whatsapp")?.href || null
  } else if (bestPlatform === "doctoralia") {
    url = site.links.find(l => /doctoralia/i.test(l.href))?.href || null
  } else if (bestPlatform === "form" || bestPlatform === "phone") {
    url = site.links.find(l => /agend|contato|reserva/i.test(l.text))?.href || null
  }

  return {
    hasBooking: confidence >= 20,
    platform: confidence >= 20 ? (bestPlatform as BookingData["platform"]) : null,
    url: confidence >= 20 ? url : null,
    confidence,
  }
}
