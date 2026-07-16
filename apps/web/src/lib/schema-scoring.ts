// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Schema Validator v0.4
// Skill: schema (Corey Haines) — JSON-LD validation, auto-generation
// Pure scoring module — zero new API calls.
// Hot-fix for W8 (today only binary detection).
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface SchemaMaturityLevel {
  level: 0 | 1 | 2 | 3
  label: "Sem Schema" | "Schema Minimo" | "Schema Rico" | "Schema Completo"
  colorHex: string
  action: string
}

export interface SchemaResult {
  maturity: SchemaMaturityLevel
  painScore: number
  maturityScore: number
  signals: {
    s1_missing_local_business: boolean
    s2_missing_organization: boolean
    s3_invalid_or_no_schema: boolean
  }
  gapsDetected: string[]
  gapsAbsent: string[]
  generatedSchema?: string  // auto-generated JSON-LD snippet if missing
}

// ── Constants ─────────────────────────────────────────────────

export const SCHEMA_MATURITY_LEVELS: Record<number, Omit<SchemaMaturityLevel, "level">> = {
  0: { label: "Sem Schema", colorHex: "#9e9e9e", action: "Adicionar schema JSON-LD LocalBusiness e Organization. Essencial para Google rich results." },
  1: { label: "Schema Minimo", colorHex: "#42a5f5", action: "Expandir schema existente com endereco, telefone, horario de funcionamento e categorias." },
  2: { label: "Schema Rico", colorHex: "#ffa726", action: "Adicionar schema Review, FAQ e Product se aplicavel. Verificar elegibilidade para rich results." },
  3: { label: "Schema Completo", colorHex: "#4caf50", action: "Auditar schema existente no Google Rich Results Test. Adicionar schema de eventos e artigos se aplicavel." },
}

const MAX_PAIN = 33 // S1(15) + S2(10) + S3(8)

// ── JSON-LD Generator ─────────────────────────────────────────

/** Generate LocalBusiness JSON-LD schema from GMB data. Deterministic — no API. */
export function generateLocalBusinessSchema(input: ScoringInput): string {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": input.title || "Nome do Negocio",
    "address": input.address ? {
      "@type": "PostalAddress",
      "streetAddress": input.address,
      "addressLocality": "Sao Paulo",
      "addressRegion": "Centro",
      "addressCountry": "BR",
    } : undefined,
    "telephone": input.phone || undefined,
    "url": input.website || undefined,
  }

  if (input.rating_value != null) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": input.rating_value,
      "reviewCount": input.rating_votes || 0,
    }
  }

  if (input.latitude != null && input.longitude != null) {
    schema.geo = { "@type": "GeoCoordinates", "latitude": input.latitude, "longitude": input.longitude }
  }

  if (input.description && input.description.length > 0) {
    schema.description = input.description.substring(0, 500)
  }

  // Remove undefined values
  const clean = JSON.parse(JSON.stringify(schema))

  
return JSON.stringify(clean, null, 2)
}

// ── Scoring ───────────────────────────────────────────────────

/** Score schema presence and quality from existing L2 data. */
export function scoreSchema(input: ScoringInput): SchemaResult | null {
  if (input.l2_onpage_score == null) return null

  const hasSchema = input.l2_has_schema === true
  const checks = input.l2_seo_checks || {}

  const signals = { s1_missing_local_business: false,
    s2_missing_organization: false, s3_invalid_or_no_schema: false }

  const gapsDetected: string[] = []
  const gapsAbsent: string[] = []
  let painRaw = 0

  // S1: Missing LocalBusiness schema — most critical for SMB (15pts)
  if (!hasSchema) {
    painRaw += 15; signals.s1_missing_local_business = true; gapsDetected.push("S1")
  } else {
    // Check if schema has LocalBusiness type (basic check)
    const knownFlags = Object.keys(checks)
    const hasLocalBizFlag = knownFlags.some(k => k.includes("local") || k.includes("LocalBusiness"))

    if (!hasLocalBizFlag) {
      painRaw += 8; signals.s1_missing_local_business = true; gapsDetected.push("S1:parcial")
    } else { gapsAbsent.push("S1") }
  }

  // S2: Missing Organization schema (10pts)
  if (!hasSchema) {
    painRaw += 10; signals.s2_missing_organization = true; gapsDetected.push("S2")
  } else { gapsAbsent.push("S2") }

  // S3: Invalid or no schema at all (8pts)
  if (!hasSchema) {
    painRaw += 8; signals.s3_invalid_or_no_schema = true; gapsDetected.push("S3")
  } else {
    // Check for known schema errors in seo_checks
    const schemaErrors = Object.entries(checks).filter(([k, v]) =>
      k.includes("schema") && (v === true || v === false))

    if (schemaErrors.length > 0) {
      painRaw += 4; signals.s3_invalid_or_no_schema = true; gapsDetected.push("S3:erros")
    } else { gapsAbsent.push("S3") }
  }

  const painScore = Math.round((painRaw / MAX_PAIN) * 100)
  const maturityScore = 100 - painScore
  const maturity = classifySchemaMaturity(maturityScore)

  // Auto-generate schema if missing
  const generatedSchema = hasSchema ? undefined : generateLocalBusinessSchema(input)

  return { maturity, painScore, maturityScore, signals, gapsDetected, gapsAbsent, generatedSchema }
}

/** Classify schema maturity from 0-100 score. */
export function classifySchemaMaturity(maturityScore: number): SchemaMaturityLevel {
  let level: 0 | 1 | 2 | 3

  if (maturityScore >= 81) level = 3
  else if (maturityScore >= 41) level = 2
  else if (maturityScore >= 21) level = 1
  else level = 0
  const def = SCHEMA_MATURITY_LEVELS[level]

  
return { level, ...def }
}
