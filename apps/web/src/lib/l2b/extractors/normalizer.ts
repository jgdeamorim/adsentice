// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Normalizer
// Padroniza dados extraídos: telefones, e-mails, nomes, serviços
// Multi-nicho: 29 categorias SMB — regras de normalização por tipo
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ContactData } from "./contact-extractor"
import type { ServicesData } from "./services-extractor"
import type { SocialData } from "./social-extractor"
import type { BookingData } from "./booking-extractor"
import type { StaffData } from "./staff-extractor"
import type { InsuranceData } from "./insurance-extractor"
import type { MinedContent } from "../types"

export interface NormalizedData {
  phones: string[]             // formato E.164: +5511XXXXXXXXX
  emails: string[]             // lowercase, trim
  whatsAppNumbers: string[]    // formato E.164
  services: string[]           // lowercase, trim, dedup
  categoryNormalized: string   // nome canônico da categoria ICP
  socialHandles: {             // @handles extraídos
    instagram: string | null
    facebook: string | null
    tiktok: string | null
  }
  doctors: {                   // nomes normalizados
    name: string
    registry?: string          // CRM 12345 → "12345"
  }[]
  insurance: string[]          // nomes canônicos
  bookingPlatform: string | null
}

/**
 * Normaliza dados de múltiplos extratores em um formato canônico.
 * Esta é a última etapa antes de persistir no Supabase.
 */
export function normalizeAll(
  contacts: ContactData,
  services: ServicesData,
  social: SocialData,
  booking: BookingData,
  staff: StaffData,
  insurance: InsuranceData,
): NormalizedData {
  return {
    phones: normalizePhones(contacts.phones),
    emails: normalizeEmails(contacts.emails),
    whatsAppNumbers: normalizePhones(contacts.whatsAppNumbers),
    services: normalizeServices(services.services),
    categoryNormalized: services.category,
    socialHandles: {
      instagram: extractHandle(social.instagram, "instagram"),
      facebook: extractHandle(social.facebook, "facebook"),
      tiktok: extractHandle(social.tiktok, "tiktok"),
    },
    doctors: normalizeDoctors(staff.members),
    insurance: normalizeInsurance(insurance.plans),
    bookingPlatform: booking.platform,
  }
}

/** Padroniza telefones BR para formato E.164 (+5511XXXXXXXXX) */
export function normalizePhones(phones: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of phones) {
    let digits = raw.replace(/\D/g, "")
    // Remove DDI se for BR (55)
    if (digits.startsWith("55") && digits.length >= 12) {
      digits = digits.slice(2)
    }
    // Adiciona DDI 55 para números BR
    if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
      digits = "55" + digits
    }
    if (digits.length >= 12 && digits.length <= 13 && !seen.has(digits)) {
      seen.add(digits)
      result.push(digits)
    }
  }
  return result
}

/** Padroniza e-mails: lowercase, trim, remove duplicados */
export function normalizeEmails(emails: string[]): string[] {
  const seen = new Set<string>()
  return emails
    .map(e => e.toLowerCase().trim())
    .filter(e => e.includes("@") && e.includes(".") && !seen.has(e) && seen.add(e))
}

/** Padroniza serviços: lowercase, trim, dedup */
export function normalizeServices(services: string[]): string[] {
  const seen = new Set<string>()
  return services
    .map(s => s.toLowerCase().trim())
    .filter(s => s.length >= 3 && !seen.has(s) && seen.add(s))
}

/** Extrai @handle de URL de rede social */
export function extractHandle(url: string | null, platform: string): string | null {
  if (!url) return null
  try {
    if (platform === "instagram") {
      const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/)
      return m ? `@${m[1]}` : null
    }
    if (platform === "facebook") {
      const m = url.match(/facebook\.com\/([a-zA-Z0-9.]+)/)
      return m ? m[1] : null
    }
    if (platform === "tiktok") {
      const m = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/)
      return m ? `@${m[1]}` : null
    }
    return null
  } catch (e: unknown) { void e; return null }
}

/** Normaliza nomes de médicos/profissionais: capitaliza, remove duplicados */
export function normalizeDoctors(
  members: StaffData["members"],
): NormalizedData["doctors"] {
  const seen = new Set<string>()
  return members
    .filter(m => m.confidence >= 40)
    .map(m => ({
      name: m.name,
      registry: m.registryNumber || undefined,
    }))
    .filter(d => {
      const key = d.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Normaliza nomes de convênios para formato canônico */
export function normalizeInsurance(plans: string[]): string[] {
  const canonical: Record<string, string> = {
    "unimed": "Unimed",
    "bradesco": "Bradesco Saúde",
    "sulamerica": "SulAmérica",
    "sul america": "SulAmérica",
    "amil": "Amil",
    "porto seguro": "Porto Seguro",
    "hapvida": "Hapvida",
    "notredame": "NotreDame Intermédica",
    "intermedica": "NotreDame Intermédica",
    "cassi": "Cassi",
    "geap": "GEAP",
    "allianz": "Allianz",
    "omint": "Omint",
    "prevent senior": "Prevent Senior",
  }

  const seen = new Set<string>()
  return plans
    .map(p => {
      const key = p.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()
      return canonical[key] || p
    })
    .filter(p => !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
}

/** Merges todos os dados normalizados em um MinedContent (types.ts) */
export function toMinedContent(
  normalized: NormalizedData,
  url: string,
  title: string,
  metaDescription: string,
  wordCount: number,
): MinedContent {
  return {
    url,
    domain: extractDomain(url),
    title,
    metaDescription,
    wordCount,
    services: normalized.services,
    hasPrices: false, // preenchido pelo content-analyzer
    hasBooking: !!normalized.bookingPlatform,
    bookingPlatform: normalized.bookingPlatform,
    hasWhatsApp: normalized.whatsAppNumbers.length > 0,
    whatsAppNumbers: normalized.whatsAppNumbers,
    socialLinks: {
      instagram: normalized.socialHandles.instagram || undefined,
      facebook: normalized.socialHandles.facebook || undefined,
      tiktok: normalized.socialHandles.tiktok || undefined,
    },
    emails: normalized.emails,
    phones: normalized.phones,
    doctors: normalized.doctors.map(d => ({ name: d.name, crm: d.registry })),
    insurance: normalized.insurance,
    hasTestimonials: false,   // preenchido pelo component-extractor
    hasGallery: false,        // preenchido pelo component-extractor
    schemaOrgTypes: [],
    cmsSignatures: [],        // preenchido pelo strategy-resolver
    frameworkSignals: {},
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch (e: unknown) { void e; return url }
}
