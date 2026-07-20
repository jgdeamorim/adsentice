// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Confidence Scoring
// Calcula score de confiança (0-100) por campo extraído.
// Determina se o dado é confiável o suficiente ou se precisa de
// DeepSeek como fallback (ADR-0044 §4.4, Nível 4).
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"
import type { ContactData } from "./contact-extractor"
import type { ServicesData } from "./services-extractor"
import type { SocialData } from "./social-extractor"
import type { BookingData } from "./booking-extractor"
import type { StaffData } from "./staff-extractor"
import type { InsuranceData } from "./insurance-extractor"
import type { FrameworkDetection } from "../strategy-resolver"

export interface FieldConfidence {
  field: string
  score: number           // 0-100
  level: "high" | "medium" | "low"
  needsLLM: boolean       // true se score < threshold → chama DeepSeek
  reason: string
}

export interface EnrichConfidence {
  fields: FieldConfidence[]
  overall: number          // média ponderada de todos os campos
  level: "high" | "medium" | "low"
  needsLLM: boolean        // true se overall < threshold global
  threshold: number        // 75 (configurável)
}

// Thresholds: abaixo disso → chama DeepSeek
const HIGH_THRESHOLD = 80    // ≥80 = confiança alta, não precisa LLM
const MEDIUM_THRESHOLD = 60  // 60-79 = médio, LLM opcional
// < 60 = baixo, LLM recomendado

const GLOBAL_THRESHOLD = 75  // média ponderada < 75 → chama DeepSeek

/**
 * Calcula confidence score para todos os campos extraídos.
 * Peso de cada campo na média ponderada é proporcional
 * ao impacto no scoring e na qualidade da landing page.
 */
export function computeConfidence(
  contacts: ContactData,
  services: ServicesData,
  social: SocialData,
  booking: BookingData,
  staff: StaffData,
  insurance: InsuranceData,
  framework: FrameworkDetection,
  site: ParsedSite,
): EnrichConfidence {
  const fields: FieldConfidence[] = []

  // ── Phones ──
  const phoneScore = contacts.phones.length > 0 ? 90 : contacts.hasPhoneLink ? 60 : 20
  fields.push({
    field: "phones", score: phoneScore,
    level: phoneScore >= HIGH_THRESHOLD ? "high" : phoneScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: phoneScore < MEDIUM_THRESHOLD,
    reason: contacts.phones.length > 0
      ? `${contacts.phones.length} telefones extraídos`
      : contacts.hasPhoneLink ? "link tel: detectado, sem número visível" : "sem telefone detectado",
  })

  // ── Emails ──
  const emailScore = contacts.emails.length > 0 ? 85 : contacts.hasEmailLink ? 50 : 15
  fields.push({
    field: "emails", score: emailScore,
    level: emailScore >= HIGH_THRESHOLD ? "high" : emailScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: emailScore < MEDIUM_THRESHOLD,
    reason: contacts.emails.length > 0
      ? `${contacts.emails.length} e-mails extraídos`
      : "sem e-mail detectado",
  })

  // ── WhatsApp ──
  const waScore = contacts.hasWhatsApp ? 95 : contacts.phones.length > 0 ? 40 : 10
  fields.push({
    field: "whatsapp", score: waScore,
    level: waScore >= HIGH_THRESHOLD ? "high" : waScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: waScore < MEDIUM_THRESHOLD,
    reason: contacts.hasWhatsApp ? `${contacts.whatsAppNumbers.length} números WA` : "sem WhatsApp detectado",
  })

  // ── Services ──
  const svcScore = services.categoryConfidence >= 70 ? 85
    : services.categoryConfidence >= 40 ? 55
    : services.services.length > 0 ? 40 : 15
  fields.push({
    field: "services", score: svcScore,
    level: svcScore >= HIGH_THRESHOLD ? "high" : svcScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: svcScore < MEDIUM_THRESHOLD,
    reason: services.services.length > 0
      ? `${services.services.length} serviços (cat: ${services.category}, conf: ${services.categoryConfidence}%)`
      : "sem serviços detectados",
  })

  // ── Category ──
  fields.push({
    field: "category", score: services.categoryConfidence,
    level: services.categoryConfidence >= HIGH_THRESHOLD ? "high" : services.categoryConfidence >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: services.categoryConfidence < MEDIUM_THRESHOLD,
    reason: `categoria detectada: ${services.category}`,
  })

  // ── Social ──
  const socialScore = social.socialCount >= 3 ? 90 : social.socialCount >= 1 ? 65 : 10
  fields.push({
    field: "social", score: socialScore,
    level: socialScore >= HIGH_THRESHOLD ? "high" : socialScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: socialScore < MEDIUM_THRESHOLD,
    reason: social.socialCount > 0
      ? `${social.socialCount} redes detectadas`
      : "sem redes sociais detectadas",
  })

  // ── Booking ──
  fields.push({
    field: "booking", score: booking.confidence,
    level: booking.confidence >= HIGH_THRESHOLD ? "high" : booking.confidence >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: booking.confidence < MEDIUM_THRESHOLD,
    reason: booking.hasBooking
      ? `plataforma: ${booking.platform} (conf: ${booking.confidence}%)`
      : "sem agendamento detectado",
  })

  // ── Staff ──
  const staffScore = staff.count >= 2 ? 85 : staff.count === 1 ? 60 : staff.hasTeamPage ? 40 : 10
  fields.push({
    field: "staff", score: staffScore,
    level: staffScore >= HIGH_THRESHOLD ? "high" : staffScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: staffScore < MEDIUM_THRESHOLD,
    reason: staff.count > 0
      ? `${staff.count} profissionais detectados`
      : "sem equipe detectada",
  })

  // ── Insurance ──
  fields.push({
    field: "insurance", score: insurance.confidence,
    level: insurance.confidence >= HIGH_THRESHOLD ? "high" : insurance.confidence >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: insurance.confidence < MEDIUM_THRESHOLD,
    reason: insurance.plans.length > 0
      ? `${insurance.plans.length} convênios detectados`
      : "sem convênios detectados",
  })

  // ── Framework ──
  const fwScore = Math.round(framework.confidence * 100)
  fields.push({
    field: "framework", score: fwScore,
    level: fwScore >= HIGH_THRESHOLD ? "high" : fwScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: fwScore < MEDIUM_THRESHOLD,
    reason: `${framework.framework} (${framework.renderMode})`,
  })

  // ── Schema.org ──
  const schemaScore = site.schemaOrg.length > 0 ? 85 : 10
  fields.push({
    field: "schemaOrg", score: schemaScore,
    level: schemaScore >= HIGH_THRESHOLD ? "high" : schemaScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: false, // schema.org é bônus, não precisa de LLM se ausente
    reason: site.schemaOrg.length > 0
      ? `${site.schemaOrg.length} tipos: ${site.schemaOrg.map(s => s.type).join(", ")}`
      : "sem Schema.org detectado",
  })

  // ── Word count ──
  const wcScore = site.wordCount >= 500 ? 90 : site.wordCount >= 200 ? 60 : 25
  fields.push({
    field: "content", score: wcScore,
    level: wcScore >= HIGH_THRESHOLD ? "high" : wcScore >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: wcScore < MEDIUM_THRESHOLD,
    reason: `${site.wordCount} palavras — ${wcScore >= 60 ? "conteúdo suficiente" : "conteúdo escasso"}`,
  })

  // ── Ponderada: campos mais importantes têm peso maior ──
  const weights: Record<string, number> = {
    phones: 0.12, emails: 0.08, whatsapp: 0.10,
    services: 0.15, category: 0.12, social: 0.08,
    booking: 0.08, staff: 0.10, insurance: 0.05,
    framework: 0.05, schemaOrg: 0.03, content: 0.04,
  }

  let overall = 0
  let totalWeight = 0
  for (const f of fields) {
    const w = weights[f.field] || 0.07
    overall += f.score * w
    totalWeight += w
  }
  overall = totalWeight > 0 ? Math.round(overall / totalWeight) : 50

  return {
    fields,
    overall,
    level: overall >= HIGH_THRESHOLD ? "high" : overall >= MEDIUM_THRESHOLD ? "medium" : "low",
    needsLLM: overall < GLOBAL_THRESHOLD,
    threshold: GLOBAL_THRESHOLD,
  }
}
