// ══════════════════════════════════════════════════════════════════
// ADSENTICE · L2b Content Enrichment — Staff Extractor
// Extrai profissionais do site: médicos/CRM, advogados/OAB,
// engenheiros/CREA, equipe genérica
// Multi-nicho: 29 categorias SMB — agnóstico a segmento
// medido=verdade · $0 · 2026-07-19
// ══════════════════════════════════════════════════════════════════

import type { ParsedSite } from "../types"
import { PROFESSIONAL_ID_RE } from "../parser"

export interface StaffMember {
  name: string
  role?: string             // "dentista" | "advogado" | "arquiteto" | etc.
  registryNumber?: string   // CRM, CREA, OAB
  registryType?: "CRM" | "CREA" | "OAB" | "CRO" | "CRP" | "CFM" | "other"
  specialty?: string
  confidence: number        // 0-100
  source: "body" | "heading" | "schema" | "section"
}

export interface StaffData {
  members: StaffMember[]
  hasTeamPage: boolean
  hasAnyStaff: boolean
  count: number
}

// Prefixos de título profissional (Brasil)
const TITLE_PREFIXES = [
  /dr[ae]?\.\s+/i, /prof\.\s+/i, /dra\.\s+/i,
]

// Padrões de nome + registro profissional
// "Dra. Ana Oliveira — CRM 12345 — Ortodontia"
const NAME_WITH_CREDENTIALS = /\b(?:dr[ae]?\.?\s+|prof\.?\s+|dra\.?\s+|doutora?\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:de|da|do|dos|das|e)\s+)?[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)\s*[-–—:]\s*(CRM|CREA|OAB|CRO|CRP|CFM|COREN|CRN|CREF|CAU)\s*[#:]?\s*(\d{2,8})/gi

// Padrão simples: "Nome do Profissional" em heading de equipe
const STAFF_SECTION_HEADINGS = /equipe|time|profissionais|médicos|advogados|especialistas|corpo.clínico|nossa.equipe/i

// Palavras que não são nomes próprios (seções, títulos genéricos)
const NON_NAME_WORDS = /^(nossa|equipe|time|profissionais|médicos|advogados|especialistas|corpo|clínico|nosso|nossos|atendimento|consultório|clínica|consultorio|clinica|bem.vindo|dr\.|dra\.)$/i

/** Detecta se uma string parece um nome próprio brasileiro */
function looksLikeName(text: string): boolean {
  const clean = text.replace(/^(dr[ae]?\.?\s+|prof\.?\s+|dra\.?\s+)/i, "").trim()
  const words = clean.split(/\s+/)
  if (words.length < 2 || words.length > 6) return false
  // Filtra palavras que são títulos de seção, não nomes
  if (words.every(w => NON_NAME_WORDS.test(w))) return false
  if (words.some(w => NON_NAME_WORDS.test(w))) return false
  // Pelo menos 50% das palavras começam com maiúscula
  const upperCount = words.filter(w => /^[A-ZÀ-Ú]/.test(w)).length
  return upperCount >= words.length * 0.5 && !/[<>{}()\[\]]/.test(clean)
}

/**
 * Extrai membros da equipe do ParsedSite.
 * Multi-camada: body text (regex CRM/CREA/OAB) → headings → schema.org
 */
export function extractStaff(site: ParsedSite): StaffData {
  const members: StaffMember[] = []
  const seen = new Set<string>() // dedup por nome

  // ── Camada 1: Body text — nome + registro profissional ──
  const bodyMatches = site.bodyText.matchAll(NAME_WITH_CREDENTIALS)
  for (const m of bodyMatches) {
    const name = (m[1] || "").trim()
    const registryType = m[2].toUpperCase() as StaffMember["registryType"]
    const registryNumber = m[3]

    if (!name || !looksLikeName(name)) continue
    const key = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    if (seen.has(key)) continue
    seen.add(key)

    members.push({
      name: formatName(name),
      registryType,
      registryNumber,
      confidence: registryType && registryNumber ? 85 : 50,
      source: "body",
    })
  }

  // ── Camada 2: Headings — nomes de profissionais em <h2>/<h3> ──
  for (const h of site.headings) {
    const text = h.text.trim()
    if (!looksLikeName(text)) continue
    const key = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    if (seen.has(key)) continue
    seen.add(key)

    // Verifica se há prefixo de título
    const hasTitle = TITLE_PREFIXES.some(p => p.test(text))
    members.push({
      name: formatName(text),
      confidence: hasTitle ? 60 : 35,
      source: "heading",
    })
  }

  // ── Camada 3: Schema.org — Person, EmployeeRole ──
  for (const schema of site.schemaOrg) {
    const d = schema.data as Record<string, unknown>
    // EmployeeRole com nested Person
    if (schema.type === "EmployeeRole" || schema.type === "Person") {
      const name = String(d.name || d.employee?.name || "").trim()
      if (!name || !looksLikeName(name)) continue
      const key = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      if (seen.has(key)) continue
      seen.add(key)

      members.push({
        name: formatName(name),
        role: String(d.roleName || d.jobTitle || "").trim() || undefined,
        confidence: 75,
        source: "schema",
      })
    }
  }

  // ── Infer specialty from context ──
  for (const m of members) {
    const nameIdx = site.bodyText.indexOf(m.name.split(" ")[0])
    if (nameIdx < 0) continue
    // Busca especialidade no contexto próximo (200 chars após o nome)
    const context = site.bodyText.substring(nameIdx, nameIdx + 200)
    const specialtyMatch = context.match(
      /(?:especialista|especialidade|atuação|área|foco)\s*(?:em|:|—)?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[a-zà-ú]+){0,3})/i
    )
    if (specialtyMatch) {
      m.specialty = specialtyMatch[1].trim()
    }
  }

  // ── Detecta página de equipe ──
  const hasTeamPage =
    site.links.some(l => /equipe|time|profissionais|sobre.nos|quem.somos/i.test(l.text)) ||
    STAFF_SECTION_HEADINGS.test(site.bodyText)

  // ── Filtra por confiança mínima ──
  const confident = members.filter(m => m.confidence >= 35)

  return {
    members: confident,
    hasTeamPage,
    hasAnyStaff: confident.length > 0,
    count: confident.length,
  }
}

/** Formata nome: capitaliza primeiras letras, remove prefixos repetidos */
function formatName(name: string): string {
  return name
    .replace(/^(dr[ae]?\.?\s+|prof\.?\s+|dra\.?\s+)/i, "")
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}
