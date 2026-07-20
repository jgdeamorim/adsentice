// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Contact Extractor
// Extrai: telefones, e-mails, WhatsApp do ParsedSite
// Multi-nicho: 29 categorias SMB
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"
import { PROFESSIONAL_ID_RE } from "../parser"

const PHONE_BR_REGEX = /(?:\(?\d{2}\)?\s?)?(?:\d{4,5}-?\d{4}|9\d{4}-?\d{4})/g
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/gi

export interface ContactData {
  phones: string[]
  emails: string[]
  whatsAppNumbers: string[]
  hasWhatsApp: boolean
  hasContactPage: boolean
  hasEmailLink: boolean
  hasPhoneLink: boolean
}

/**
 * Extrai dados de contato do ParsedSite.
 * Multi-camada: body text → links → schema.org → headings
 */
export function extractContacts(site: ParsedSite): ContactData {
  const phones = new Set<string>()
  const emails = new Set<string>()
  const whatsAppNumbers = new Set<string>()

  // ── Camada 1: Body text (regex) ──
  const bodyMatches = site.bodyText.matchAll(PHONE_BR_REGEX)
  for (const m of bodyMatches) {
    const raw = m[0].replace(/\D/g, "")
    if (raw.length >= 10 && raw.length <= 13) phones.add(raw)
  }

  const emailMatches = site.bodyText.matchAll(EMAIL_REGEX)
  for (const m of emailMatches) emails.add(m[0].toLowerCase())

  // ── Camada 2: Links (href tel:, mailto:, wa.me) ──
  for (const link of site.links) {
    if (link.platform === "whatsapp") {
      const num = extractWAFromHref(link.href)
      if (num) whatsAppNumbers.add(num)
    }
    if (link.href.startsWith("tel:")) {
      const num = link.href.replace("tel:", "").replace(/\D/g, "")
      if (num.length >= 10) phones.add(num)
    }
    if (link.href.startsWith("mailto:")) {
      const email = link.href.replace("mailto:", "").split("?")[0].toLowerCase()
      if (email.includes("@") && email.includes(".")) emails.add(email)
    }
  }

  // ── Camada 3: Schema.org (telephone, email) ──
  for (const schema of site.schemaOrg) {
    const d = schema.data as Record<string, unknown>
    if (d.telephone) {
      const raw = String(d.telephone).replace(/\D/g, "")
      if (raw.length >= 10) phones.add(raw)
    }
    if (d.email && String(d.email).includes("@")) {
      emails.add(String(d.email).toLowerCase())
    }
  }

  // ── Camada 4: Headings + links contextuais ──
  const hasContactPage = site.links.some(l =>
    /contato|fale.conosco|atendimento/i.test(l.text + l.href)
  )
  const hasEmailLink = site.links.some(l => l.href.startsWith("mailto:"))
  const hasPhoneLink = site.links.some(l => l.href.startsWith("tel:"))

  return {
    phones: [...phones],
    emails: [...emails],
    whatsAppNumbers: [...whatsAppNumbers],
    hasWhatsApp: whatsAppNumbers.size > 0,
    hasContactPage,
    hasEmailLink,
    hasPhoneLink,
  }
}

/** Extrai número de WhatsApp de um href (wa.me/5511..., api.whatsapp.com/...) */
function extractWAFromHref(href: string): string | null {
  // wa.me/5511999999999
  const waMatch = href.match(/wa\.me\/(\d+)/)
  if (waMatch) return waMatch[1]
  // api.whatsapp.com/send?phone=5511999999999
  const url = new URL(href.startsWith("http") ? href : `https://${href}`)
  const phone = url.searchParams.get("phone")
  return phone || null
}
