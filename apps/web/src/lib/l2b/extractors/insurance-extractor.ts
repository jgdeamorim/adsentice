// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Insurance Extractor
// Extrai convênios, planos de saúde e credenciamentos do site
// Multi-nicho: saúde (planos), serviços (credenciamentos), SMB geral
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"

export interface InsuranceData {
  plans: string[]
  hasInsurance: boolean
  hasPrivateOption: boolean    // "particular" / "pagamento próprio"
  acceptsInsurance: boolean
  hasPartnerPage: boolean      // página específica de convênios
  confidence: number           // 0-100
  source: "body" | "schema" | "links" | "headings" | "none"
}

// Convênios de saúde mais comuns no Brasil
const INSURANCE_BR = [
  "Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Porto Seguro",
  "Hapvida", "NotreDame Intermédica", "Cassi", "GEAP", "Allianz",
  "Omint", "Care Plus", "Vita", "Santa Helena", "São Cristóvão",
  "Prevent Senior", "Camed", "Medial", "Saúde Caixa", "Petrobras",
  "Fusex", "Funcef", "Cabesp", "Iamspe", "SulAmérica Saúde",
  "Golden Cross", "Green Line", "Mediservice",
]

// Credenciamentos para serviços não-saúde
const CREDENTIAL_SIGNALS = [
  "credenciado", "conveniado", "parceiro", "associado",
  "credenciamento", "convenio", "convênio",
  "aceitamos", "atendemos", "trabalhamos com",
  "planos aceitos", "planos de saúde",
]

/**
 * Extrai convênios/planos de saúde do ParsedSite.
 * Multi-camada: body text → schema.org → headings → links
 */
export function extractInsurance(site: ParsedSite): InsuranceData {
  const plans = new Set<string>()
  const bodyL = site.bodyText.toLowerCase()

  // ── Camada 1: Match exato com lista de convênios BR ──
  for (const plan of INSURANCE_BR) {
    const re = new RegExp(plan.replace(/\s+/g, "[\\s-]?"), "i")
    if (re.test(site.bodyText)) {
      plans.add(plan)
    }
  }

  // ── Camada 2: Schema.org — healthPlanNetwork, acceptedPayment ──
  for (const schema of site.schemaOrg) {
    const d = schema.data as Record<string, unknown>
    if (d.healthPlanNetwork) {
      const network = d.healthPlanNetwork
      if (Array.isArray(network)) {
        for (const n of network) {
          if (n?.name) plans.add(String(n.name))
        }
      } else if (network?.name) {
        plans.add(String(network.name))
      }
    }
    if (d.acceptedPayment) {
      const payment = d.acceptedPayment
      if (Array.isArray(payment)) {
        for (const p of payment) {
          if (typeof p === "string" && p.length > 3) plans.add(p)
        }
      }
    }
  }

  // ── Camada 3: Headings — seção de convênios ──
  let hasPartnerPage = false
  for (const h of site.headings) {
    if (/convênio|convenio|plano|credenciado/i.test(h.text)) {
      hasPartnerPage = true
      break
    }
  }
  // Também verifica links para página de convênios
  if (!hasPartnerPage) {
    hasPartnerPage = site.links.some(l =>
      /convênio|convenio|plano|credenciado/i.test(l.text)
    )
  }

  // ── Detecta sinal de que aceita planos ──
  const acceptsInsurance = CREDENTIAL_SIGNALS.some(s => bodyL.includes(s))
  const hasPrivateOption = /particular|pagamento.próprio|privado/i.test(bodyL)

  // ── Source detection ──
  let source: InsuranceData["source"] = "none"
  if (plans.size > 0) source = "body"
  if (site.schemaOrg.some(s => (s.data as Record<string, unknown>).healthPlanNetwork)) source = "schema"
  if (hasPartnerPage) source = source === "none" ? "links" : source
  if (site.headings.some(h => /convênio|convenio/i.test(h.text))) source = source === "none" ? "headings" : source

  // ── Confidence ──
  let confidence = 0
  if (plans.size >= 3) confidence = 90
  else if (plans.size >= 1) confidence = 70
  else if (hasPartnerPage) confidence = 50
  else if (acceptsInsurance) confidence = 30
  else confidence = 0

  return {
    plans: [...plans],
    hasInsurance: plans.size > 0,
    hasPrivateOption,
    acceptsInsurance: plans.size > 0 || acceptsInsurance || hasPartnerPage,
    hasPartnerPage,
    confidence,
    source,
  }
}
