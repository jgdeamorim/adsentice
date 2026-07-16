// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Scoring Engine — Pain Criteria v1.2
// Compound Score: Fit×0.40 + Engagement×0.35 + Intent×0.25
// Schwartz 5 Awareness Levels + ESC Lead Scoring
// ══════════════════════════════════════════════════════════════════

import "server-only"

import type { ContentGapResult } from "./content-gap"
import { scoreContentGap } from "./content-gap"
import type { ArchitectureResult } from "./site-architecture"
import { scoreArchitecture } from "./site-architecture"
import type { SchemaResult } from "./schema-scoring"
import { scoreSchema } from "./schema-scoring"

// ── Input Types ──────────────────────────────────────────────

/** Input data from GMB search results or full profile. Fields null when unavailable. */
export interface ScoringInput {
  title: string | null
  category: string | null
  categories?: string[] | null
  address: string | null
  rating_value: number | null
  rating_votes: number | null
  place_id: string | null
  cid: string | null
  latitude: number | null
  longitude: number | null
  is_claimed: boolean | null

  // Extended (from full profile — may be null)
  phone?: string | null
  website?: string | null
  total_photos?: number | null
  description?: string | null
  business_status?: string | null

  // L2 Website+SEO signals (v0.3 — may be null if not enriched)
  l2_onpage_score?: number | null
  l2_https?: boolean | null
  l2_has_title?: boolean | null
  l2_has_description?: boolean | null
  l2_has_analytics?: boolean | null
  l2_cms?: string | null
  l2_word_count?: number | null
  l2_lighthouse_performance?: number | null
  l2_has_schema?: boolean | null
  l2_internal_links_count?: number | null
  l2_external_links_count?: number | null
  l2_images_count?: number | null
  l2_domain_rank?: number | null
  l2_seo_checks?: Record<string, boolean | null> | null  // ~60 boolean SEO flags from on_page_instant_audit
}

// ── Output Types ─────────────────────────────────────────────

export interface DimensionScore {
  raw: number
  maxRaw: number
  normalized: number           // 0-100
  signalsDetected: string[]    // which signal IDs contributed
  signalsMissing: string[]     // which signal IDs couldn't be evaluated (data missing)
}

export interface SchwartzLevel {
  level: 1 | 2 | 3 | 4 | 5
  label: "Unaware" | "Problem Aware" | "Solution Aware" | "Product Aware" | "Most Aware"
  colorHex: string
  action: string               // recommended sales action
  messagingRule: string        // what NOT to do
}

export interface ScoreData {
  compound: number             // 0-100
  fit: DimensionScore
  engagement: DimensionScore
  intent: DimensionScore
  schwartz: SchwartzLevel
  confidence: number           // 0-1, fraction of signals with data available
  signalsTotal: number         // total signals that could be evaluated
  antiFpFlags: string[]        // anti-false-positive rules that fired
  contentGap?: ContentGapResult | null  // v0.5: content maturity (null when no L2 data)
  architecture?: ArchitectureResult | null  // v0.4: site architecture (null when no L2 data)
  schema?: SchemaResult | null  // v0.4: schema validation (null when no L2 data)
}

// ── Constants ────────────────────────────────────────────────

export const SCHWARTZ_LEVELS: Record<number, Omit<SchwartzLevel, "level">> = {
  1: {
    label: "Unaware", colorHex: "#9e9e9e",
    action: "Educar com conteúdo gratuito",
    messagingRule: "NUNCA mencionar o produto. Só educar.",
  },
  2: {
    label: "Problem Aware", colorHex: "#42a5f5",
    action: "Agitar a dor. Mostrar que existe solução",
    messagingRule: "NUNCA pular para features. Primeiro validar a dor.",
  },
  3: {
    label: "Solution Aware", colorHex: "#ffa726",
    action: "Comparar. Mostrar por que adsentice é diferente",
    messagingRule: "NUNCA fazer pitch genérico. Comparar com alternativas.",
  },
  4: {
    label: "Product Aware", colorHex: "#ef5350",
    action: "Prova social + Garantia + Oferta",
    messagingRule: "NUNCA vender features. Vender prova + garantia.",
  },
  5: {
    label: "Most Aware", colorHex: "#d32f2f",
    action: "CTA direto. Urgência. Fechar.",
    messagingRule: "NUNCA atrasar. CTA direto, sem friction.",
  },
}

/** Minimum photo count per category for acceptable GMB profile. */
export const PHOTOS_BENCHMARKS: Record<string, { min: number; good: number; excellent: number }> = {
  dentist: { min: 15, good: 30, excellent: 50 },
  orthodontist: { min: 15, good: 30, excellent: 50 },
  medical_aesthetic_clinic: { min: 20, good: 40, excellent: 70 },
  medical_clinic: { min: 15, good: 30, excellent: 50 },
  restaurant: { min: 25, good: 50, excellent: 100 },
  pizza_restaurant: { min: 25, good: 50, excellent: 80 },
  bakery: { min: 15, good: 30, excellent: 50 },
  gym: { min: 20, good: 40, excellent: 80 },
  lawyer: { min: 5, good: 15, excellent: 30 },
  barber_shop: { min: 15, good: 30, excellent: 60 },
  beauty_salon: { min: 15, good: 30, excellent: 60 },
  pharmacy: { min: 10, good: 20, excellent: 40 },
  veterinarian: { min: 15, good: 30, excellent: 50 },
  pet_store: { min: 10, good: 20, excellent: 40 },
  real_estate_agency: { min: 20, good: 50, excellent: 100 },
  accountant: { min: 5, good: 10, excellent: 20 },
  car_repair: { min: 10, good: 20, excellent: 40 },
  psychologist: { min: 5, good: 15, excellent: 25 },
  physical_therapist: { min: 10, good: 20, excellent: 35 },
  ophthalmologist: { min: 10, good: 20, excellent: 40 },
  cardiologist: { min: 10, good: 20, excellent: 40 },
  architect: { min: 15, good: 30, excellent: 50 },
  interior_designer: { min: 15, good: 30, excellent: 50 },
  electrician: { min: 5, good: 12, excellent: 25 },
  plumber: { min: 5, good: 12, excellent: 25 },
  cleaning_service: { min: 5, good: 12, excellent: 25 },
  school: { min: 10, good: 20, excellent: 40 },
  driving_school: { min: 5, good: 12, excellent: 25 },
  hotel: { min: 20, good: 40, excellent: 70 },
}

/** 57 Brazilian SMB categories that are in the adsentice ICP. */
export const ICP_CATEGORIES = new Set([
  "dentist", "orthodontist", "medical_aesthetic_clinic", "medical_clinic",
  "restaurant", "pizza_restaurant", "bakery",
  "gym", "lawyer", "barber_shop", "beauty_salon",
  "pharmacy", "veterinarian", "pet_store",
  "real_estate_agency", "accountant", "car_repair",
  "psychologist", "physical_therapist", "ophthalmologist", "cardiologist",
  "architect", "interior_designer",
  "electrician", "plumber", "cleaning_service",
  "school", "driving_school", "hotel",
])

export const ICP_CATEGORY_LABELS: Record<string, string> = {
  dentist: "Dentista", orthodontist: "Ortodontista",
  medical_aesthetic_clinic: "Clínica Estética", medical_clinic: "Clínica Médica",
  restaurant: "Restaurante", pizza_restaurant: "Pizzaria", bakery: "Padaria",
  gym: "Academia", lawyer: "Advogado", barber_shop: "Barbearia",
  beauty_salon: "Salão de Beleza",
  pharmacy: "Farmácia", veterinarian: "Veterinário", pet_store: "Pet Shop",
  real_estate_agency: "Imobiliária", accountant: "Contador",
  car_repair: "Oficina Mecânica",
  psychologist: "Psicólogo", physical_therapist: "Fisioterapeuta",
  ophthalmologist: "Oftalmologista", cardiologist: "Cardiologista",
  architect: "Arquiteto", interior_designer: "Designer de Interiores",
  electrician: "Eletricista", plumber: "Encanador",
  cleaning_service: "Serviço de Limpeza",
  school: "Escola Particular", driving_school: "Autoescola",
  hotel: "Pousada/Hotel",
}

// ── Helpers ──────────────────────────────────────────────────

export function detectWhatsApp(phone: string | null | undefined): boolean {
  if (!phone) return false

  // Brazilian mobile: +55 (XX) 9XXXX-XXXX or 55XX9XXXXXXXX
  return /(?:9\d{4}-\d{4}|9\d{8}|\(?\d{2}\)?\s*9\d{4}-?\d{4})/.test(phone)
}

export function detectDomainType(website: string | null | undefined): "proprio" | "wix" | "linktree" | "facebook" | "google_sites" | "unknown" | null {
  if (!website) return null
  const url = website.toLowerCase()

  if (url.includes("wixsite.com") || url.includes("wix.com")) return "wix"
  if (url.includes("linktr.ee") || url.includes("linktree")) return "linktree"
  if (url.includes("facebook.com") || url.includes("fb.com") || url.includes("instagram.com")) return "facebook"
  if (url.includes("sites.google.com")) return "google_sites"

return "proprio"
}

/** Classify CMS/platform risk level for W6 scoring. Considers both URL pattern (L0) and detected CMS (L2). */
export function classifyCMSRisk(cms: string | null | undefined, website: string | null | undefined): {
  level: "none" | "low" | "medium" | "high"
  label: string
  points: number
} {
  const domainType = detectDomainType(website)

  // ── HIGH pain: not a real website ──
  if (domainType === "linktree") return { level: "high", label: "Linktree — não é site, é link page", points: 8 }
  if (domainType === "facebook") return { level: "high", label: "Rede Social como site — sem domínio próprio", points: 8 }
  if (domainType === "google_sites") return { level: "high", label: "Google Sites — site gratuito básico", points: 5 }

  // ── MEDIUM pain: builder platforms with limited SEO ──
  if (domainType === "wix") return { level: "medium", label: "Wix — SEO limitado, difícil migrar", points: 4 }

  // ── Own domain — check L2 CMS data ──
  if (cms) {
    const c = cms.toLowerCase()

    if (c.includes("wordpress")) return { level: "medium", label: "WordPress — risco de plugins desatualizados", points: 5 }
    if (c.includes("wix")) return { level: "medium", label: "Wix (domínio próprio) — SEO limitado", points: 4 }
    if (c.includes("joomla") || c.includes("drupal")) return { level: "low", label: `${cms} — CMS legado`, points: 3 }
    if (c.includes("shopify") || c.includes("squarespace") || c.includes("webflow")) return { level: "none", label: `${cms} — plataforma moderna`, points: 0 }

    // Unknown CMS detected
    return { level: "low", label: `${cms} — CMS não identificado`, points: 2 }
  }

  // Own domain, no CMS detected (L2 not available)
  if (domainType === "proprio") return { level: "low", label: "Domínio próprio — CMS desconhecido", points: 2 }

  // No website at all
  return { level: "none", label: "Sem site", points: 0 }
}

export function evaluateDescriptionQuality(desc: string | null | undefined): { score: number; checks: string[] } {
  if (!desc) return { score: 0, checks: ["sem descrição"] }
  const checks: string[] = []
  let pts = 0

  if (desc.length >= 100) { pts += 10 } else { checks.push("muito curta (<100 chars)") }

  if (desc.length >= 500) { pts += 15; checks.push("comprimento ideal (500-750)") }
  else if (desc.length >= 250) { pts += 5 }

  if (desc.length > 750) { checks.push("muito longa (>750 chars)") }

  // Keyword density check — basic heuristic
  if (/[a-zA-Z]{4,}/.test(desc)) { pts += 5 } // has some descriptive words

  // CTA check
  if (/agende|ligue|whatsapp|contato|visite|acesse|marque|consulte/i.test(desc)) { pts += 10; checks.push("tem CTA") }
  else { checks.push("sem call-to-action") }


  // Phone or link in text
  if (/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/.test(desc)) { pts += 5; checks.push("tem telefone no texto") }

  if (/https?:\/\//.test(desc)) { pts += 5; checks.push("tem link") }
  else { checks.push("sem link") }


  // Has location keywords
  if (/sp|rj|mg|brasil|são paulo|rio de janeiro|belo horizonte|brasília|curitiba|porto alegre/i.test(desc)) {
    pts += 10; checks.push("tem keyword de localização")
  } else { checks.push("sem localização no texto") }

  
return { score: Math.min(pts, 60), checks }
}

export function estimateReviewVelocity(votes: number | null | undefined): number | null {
  if (votes == null || votes === 0) return null

  // Rough estimate: assume business age of 3 years
  return votes / 36 // reviews per month
}

// ── Scoring Functions ────────────────────────────────────────

/** F1-F10: Avalia quão próximo o negócio está do ICP. Max 70 pts raw. */
export function scoreFit(input: ScoringInput): DimensionScore {
  const detected: string[] = []
  const missing: string[] = []
  let raw = 0

  // F1: Categoria no ICP (15pts)
  const cat = input.category?.toLowerCase().replace(/\s+/g, "_")

  if (cat && ICP_CATEGORIES.has(cat)) { raw += 15; detected.push("F1") }
  else { missing.push("F1:categoria_fora_icp") }

  // F2: Porte — reviews >= 10 (10pts)
  if (input.rating_votes != null) {
    if (input.rating_votes >= 10) { raw += 10; detected.push("F2") }
    else { missing.push("F2:poucas_reviews") }
  } else { missing.push("F2:sem_dados") }

  // F3: Tem website (10pts)
  if (input.website) {
    const dt = detectDomainType(input.website)

    if (dt === "proprio") { raw += 10; detected.push("F3:proprio") }
    else if (dt === "wix" || dt === "google_sites") { raw += 5; detected.push(`F3:${dt}`) }
    else { raw += 2; detected.push(`F3:${dt}`) } // linktree/facebook = barely a website
  } else { missing.push("F3:sem_website") }

  // F4: Tem telefone (5pts)
  if (input.phone) { raw += 5; detected.push("F4") }
  else { missing.push("F4:sem_telefone") }

  // F5: Região mapeada — city is present (5pts)
  if (input.address) { raw += 5; detected.push("F5:endereco") }
  else { missing.push("F5:sem_endereco") }

  // F6: Horário preenchido — we proxy with business_status = OPERATIONAL (5pts)
  if (input.business_status === "OPERATIONAL") { raw += 5; detected.push("F6:operational") }
  else if (input.business_status) { raw += 2; detected.push(`F6:${input.business_status}`) }
  else { missing.push("F6:sem_status") }

  // F7: Descrição preenchida (5pts)
  if (input.description && input.description.length > 0) { raw += 5; detected.push("F7") }
  else { missing.push("F7:sem_descricao") }

  // F8: Serviços listados — categories >= 2 (5pts)
  const catCount = input.categories?.length ?? 0

  if (catCount >= 2) { raw += 5; detected.push(`F8:${catCount}cats`) }
  else { missing.push("F8:poucas_categorias") }

  // F9: Email corporativo — proxy: website is próprio domain (5pts)
  const dt = detectDomainType(input.website)

  if (dt === "proprio") { raw += 5; detected.push("F9:dominio_proprio") }
  else { missing.push("F9:sem_dominio_proprio") }

  // F10: CNPJ/negócio ativo — business_status = OPERATIONAL (5pts)
  if (input.business_status === "OPERATIONAL") { raw += 5; detected.push("F10") }
  else if (input.business_status) { missing.push(`F10:${input.business_status}`) }
  else { missing.push("F10:sem_status") }

  // ── W7 (L2): Sem Blog/Conteúdo — proxy: word_count < 300 (5pts) ──
  const hasL2 = input.l2_onpage_score != null

  if (hasL2) {
    if (input.l2_word_count != null && input.l2_word_count < 300) { raw += 5; detected.push("W7:sem_blog") }
    else if (input.l2_word_count != null) { missing.push("W7:tem_conteudo") }
    else { missing.push("W7:sem_dados") }
  }

  const maxRaw = hasL2 ? 75 : 70

  
return { raw, maxRaw, normalized: Math.round((raw / maxRaw) * 100), signalsDetected: detected, signalsMissing: missing }
}

/** E1-E7: Mede atividade e cuidado com canais digitais. Max 70 pts raw. */
export function scoreEngagement(input: ScoringInput): DimensionScore {
  const detected: string[] = []
  const missing: string[] = []
  let raw = 0

  // E1: Rating >= 4.0 (15pts)
  if (input.rating_value != null) {
    if (input.rating_value >= 4.0) { raw += 15; detected.push("E1") }
    else { missing.push(`E1:rating_${input.rating_value.toFixed(1)}`) }
  } else { missing.push("E1:sem_rating") }

  // E2: Reviews recentes — estimate from velocity (15pts)
  const velocity = estimateReviewVelocity(input.rating_votes)

  if (velocity != null) {
    if (velocity >= 3) { raw += 15; detected.push("E2:velocidade_alta") }
    else if (velocity >= 1) { raw += 10; detected.push("E2:velocidade_media") }
    else if (velocity > 0) { raw += 5; detected.push("E2:velocidade_baixa") }
    else { missing.push("E2:zero_velocity") }
  } else { missing.push("E2:sem_dados") }

  // E3: Fotos >= benchmark mínimo da categoria (10pts)
  const cat = input.category?.toLowerCase().replace(/\s+/g, "_") ?? ""
  const benchmark = PHOTOS_BENCHMARKS[cat]

  if (input.total_photos != null && benchmark) {
    if (input.total_photos >= benchmark.good) { raw += 10; detected.push("E3:good+") }
    else if (input.total_photos >= benchmark.min) { raw += 5; detected.push("E3:min") }
    else { missing.push(`E3:${input.total_photos}/${benchmark.min}`) }
  } else if (input.total_photos != null) {
    // Generic: >= 15 photos is decent for any category
    if (input.total_photos >= 15) { raw += 8; detected.push("E3:generico_ok") }
    else if (input.total_photos >= 5) { raw += 3; detected.push("E3:generico_baixo") }
    else { missing.push(`E3:${input.total_photos}fotos`) }
  } else { missing.push("E3:sem_dados_fotos") }

  // E4: Responde reviews — proxy: is_claimed (claimed businesses more likely to respond) (10pts)
  if (input.is_claimed === true) { raw += 10; detected.push("E4:claimed") }
  else if (input.is_claimed === false) { missing.push("E4:nao_claimed") }
  else { missing.push("E4:sem_dados") }

  // E5: WhatsApp business (10pts)
  if (input.phone) {
    if (detectWhatsApp(input.phone)) { raw += 10; detected.push("E5:whatsapp") }
    else { missing.push("E5:nao_whatsapp") }
  } else { missing.push("E5:sem_telefone") }

  // E6: Posts no GMB — proxy: total_photos >= benchmark.good (5pts)
  if (input.total_photos != null && benchmark) {
    if (input.total_photos >= benchmark.good) { raw += 5; detected.push("E6:proxy_fotos_good") }
    else { missing.push("E6:proxy_poucas_fotos") }
  } else { missing.push("E6:sem_dados") }

  // E7: Q&A ativo — proxy: has description + is_claimed (5pts)
  if (input.description && input.description.length > 50 && input.is_claimed === true) {
    raw += 5; detected.push("E7:proxy_desc+claimed")
  } else { missing.push("E7:proxy_insuficiente") }

  // ── W2-W6, W8 (L2): Website+SEO engagement signals ──
  const hasL2 = input.l2_onpage_score != null

  if (hasL2) {
    // W2: Core Web Vitals Ruins — lighthouse_perf < 0.4 (10pts)
    if (input.l2_lighthouse_performance != null && input.l2_lighthouse_performance < 0.4) {
      raw += 10; detected.push("W2:cwv_ruins")
    } else if (input.l2_lighthouse_performance != null) {
      missing.push("W2:cwv_ok")
    } else { missing.push("W2:sem_lighthouse") }

    // W3: Mobile Ruim — lighthouse_perf < 0.4 (proxy, 10pts)
    if (input.l2_lighthouse_performance != null && input.l2_lighthouse_performance < 0.4) {
      raw += 10; detected.push("W3:mobile_ruim")
    } else if (input.l2_lighthouse_performance != null) {
      missing.push("W3:mobile_ok")
    } else { missing.push("W3:sem_dados") }

    // W4: Sem Meta Tags — title or description missing (8pts)
    if (input.l2_has_title === false || input.l2_has_description === false) {
      raw += 8; detected.push("W4:sem_meta_tags")
    } else if (input.l2_has_title === true && input.l2_has_description === true) {
      missing.push("W4:meta_ok")
    } else { missing.push("W4:sem_dados") }

    // W5: Sem Analytics — no GA4/GTM/Pixel detected (10pts)
    if (input.l2_has_analytics === false) {
      raw += 10; detected.push("W5:sem_analytics")
    } else if (input.l2_has_analytics === true) {
      missing.push("W5:tem_analytics")
    } else { missing.push("W5:sem_dados") }

    // W6: CMS/Plataforma de Risco — detecta Linktree, Wix, WP, etc. (5-8pts)
    const cmsRisk = classifyCMSRisk(input.l2_cms, input.website)

    if (cmsRisk.points > 0) {
      raw += cmsRisk.points; detected.push(`W6:${cmsRisk.level}_${cmsRisk.label.replace(/[^a-z0-9]/gi, '_').substring(0, 20)}`)
    } else if (cmsRisk.level === "none" && input.l2_cms) {
      missing.push(`W6:plataforma_moderna_${input.l2_cms}`)
    } else { missing.push("W6:sem_dados") }

    // W8: Sem Schema Markup — JSON-LD LocalBusiness missing (5pts)
    if (input.l2_has_schema === false) {
      raw += 5; detected.push("W8:sem_schema")
    } else if (input.l2_has_schema === true) {
      missing.push("W8:tem_schema")
    } else { missing.push("W8:sem_dados") }

    // ── W9-W12 (v0.4): Expanded SEO signals from L2 data ──
    // W9: Backlink Gap — domain_rank < 100 (10pts)
    if (input.l2_domain_rank != null && input.l2_domain_rank < 100) {
      raw += 10; detected.push("W9:backlink_gap")
    } else if (input.l2_domain_rank != null) {
      missing.push(`W9:rank_${input.l2_domain_rank}`)
    } else { missing.push("W9:sem_domain_rank") }

    // W10: Content Readability — low readability from seo_checks (8pts)
    const seoChecks2 = input.l2_seo_checks || {}

    const hasReadabilityIssue = Object.entries(seoChecks2).some(([k, v]) =>
      (k.includes("readability") || k.includes("readable")) && v === true)

    if (hasReadabilityIssue) {
      raw += 8; detected.push("W10:baixa_leiturabilidade")
    } else if (Object.keys(seoChecks2).length > 0) {
      missing.push("W10:leiturabilidade_ok")
    } else { missing.push("W10:sem_dados") }

    // W11: Orphaned Content — has content but very few internal links (7pts)
    if (input.l2_word_count != null && input.l2_word_count >= 500 && (input.l2_internal_links_count ?? 0) < 5) {
      raw += 7; detected.push("W11:conteudo_orfao")
    } else if (input.l2_word_count != null && input.l2_word_count >= 500) {
      missing.push("W11:conteudo_linkado")
    } else { missing.push("W11:sem_dados") }

    // W12: Core Web Vitals activated — lighthouse_perf < 0.4 (10pts)
    if (input.l2_lighthouse_performance != null && input.l2_lighthouse_performance < 0.4) {
      raw += 10; detected.push("W12:cwv_pobre")
    } else if (input.l2_lighthouse_performance != null) {
      missing.push("W12:cwv_ok")
    } else { missing.push("W12:sem_lighthouse") }
  }

  const maxRaw = hasL2 ? 88 : 70

  
return { raw, maxRaw, normalized: Math.round((raw / maxRaw) * 100), signalsDetected: detected, signalsMissing: missing }
}

/** I1-I3: Sinais de urgência ou intenção de compra. Max 60 pts raw. */
export function scoreIntent(input: ScoringInput): DimensionScore {
  const detected: string[] = []
  const missing: string[] = []
  let raw = 0

  // I1: NÃO reivindicado — MAIOR sinal de dor (25pts)
  if (input.is_claimed === false) { raw += 25; detected.push("I1:nao_reivindicado") }
  else if (input.is_claimed === true) { missing.push("I1:ja_reivindicado") }
  else { missing.push("I1:sem_dados") }

  // I2: Rating baixo com reviews suficientes (20pts)
  if (input.rating_value != null && input.rating_votes != null) {
    if (input.rating_value <= 3.5 && input.rating_votes >= 5) {
      raw += 20; detected.push("I2:reputacao_toxica")
    } else if (input.rating_value <= 3.8 && input.rating_votes >= 5) {
      raw += 10; detected.push("I2:reputacao_mediocre")
    } else { missing.push("I2:rating_ok") }
  } else { missing.push("I2:sem_dados") }

  // I3: Perfil abandonado (15pts)
  if (input.total_photos != null) {
    if (input.total_photos < 3) { raw += 15; detected.push("I3:poucas_fotos") }
    else if (input.rating_votes != null && input.rating_votes < 5) {
      raw += 10; detected.push("I3:poucas_reviews")
    } else { missing.push("I3:perfil_ok") }
  } else {
    // Without photo data, check if very few reviews
    if (input.rating_votes != null && input.rating_votes < 5) {
      raw += 8; detected.push("I3:proxy_poucas_reviews")
    } else { missing.push("I3:sem_dados") }
  }

  // ── W1 (L2): Sem HTTPS — HTTP apenas (20pts) ──
  const hasL2 = input.l2_onpage_score != null

  if (hasL2) {
    if (input.l2_https === false) { raw += 20; detected.push("W1:sem_https") }
    else if (input.l2_https === true) { missing.push("W1:tem_https") }
    else { missing.push("W1:sem_dados") }
  }

  const maxRaw = hasL2 ? 80 : 60

  
return { raw, maxRaw, normalized: Math.round((raw / maxRaw) * 100), signalsDetected: detected, signalsMissing: missing }
}

/** Weighted compound: Fit×0.40 + Engagement×0.35 + Intent×0.25 */
export function computeCompoundScore(fit: DimensionScore, engagement: DimensionScore, intent: DimensionScore): number {
  return Math.round(
    (fit.normalized * 0.40) +
    (engagement.normalized * 0.35) +
    (intent.normalized * 0.25)
  )
}

/** Map compound score (0-100) to Schwartz awareness level (1-5). */
export function classifySchwartz(compound: number): SchwartzLevel {
  let level: 1 | 2 | 3 | 4 | 5

  if (compound >= 85) level = 5
  else if (compound >= 70) level = 4
  else if (compound >= 50) level = 3
  else if (compound >= 30) level = 2
  else level = 1

  const def = SCHWARTZ_LEVELS[level]

  
return { level, ...def }
}

// ── Anti-False-Positive Rules ────────────────────────────────

/** Apply R1-R6 anti-false-positive rules. Returns flags that fired. */
export function applyAntiFalsePositive(input: ScoringInput, score: ScoreData): string[] {
  const flags: string[] = []

  // R1: Sem GMB → ignorar (place_id is null)
  if (!input.place_id) flags.push("R1:sem_gmb")

  // R2: < 3 reviews → reduzir peso do rating
  if (input.rating_votes != null && input.rating_votes < 3) {
    flags.push("R2:amostra_pequena")

    // Reduce engagement weight contribution from rating
    score.engagement.normalized = Math.round(score.engagement.normalized * 0.5)
  }

  // R3: Fechado → excluir
  if (input.business_status && input.business_status !== "OPERATIONAL") {
    flags.push("R3:negocio_fechado")

    // Zero out intent — not a valid lead
    score.intent.normalized = 0
  }

  // R4: Franquia/Rede (>5 locações) → não detectável de search results; skip

  // R5: Sem telefone E sem website → +10 pts bônus no Intent
  if (!input.phone && !input.website) {
    flags.push("R5:offline_total")
    score.intent.normalized = Math.min(100, score.intent.normalized + 15)
  }

  // R6: Tem website mas sem dados de SEO → usar estimativa GMB; skip for L0

  return flags
}

// ── Master Scoring Functions ──────────────────────────────────

/** Score a single lead. Returns full ScoreData. */
export function scoreLead(input: ScoringInput): ScoreData {
  const fit = scoreFit(input)
  const engagement = scoreEngagement(input)
  const intent = scoreIntent(input)
  const compound = computeCompoundScore(fit, engagement, intent)
  const schwartz = classifySchwartz(compound)

  // v0.5 Content Gap Analysis (only for L2-enriched leads)
  const contentGap = scoreContentGap(input)

  // v0.4 Site Architecture + Schema (only for L2-enriched leads)
  const architecture = scoreArchitecture(input)
  const schema = scoreSchema(input)

  const score: ScoreData = {
    compound, fit, engagement, intent, schwartz, contentGap, architecture, schema,
    confidence: computeConfidence(fit, engagement, intent),
    signalsTotal: fit.signalsDetected.length + engagement.signalsDetected.length + intent.signalsDetected.length,
    antiFpFlags: [],
  }

  score.antiFpFlags = applyAntiFalsePositive(input, score)

  // Re-compute compound after anti-FP adjustments
  score.compound = computeCompoundScore(score.fit, score.engagement, score.intent)
  score.schwartz = classifySchwartz(score.compound)

  return score
}

/** Score multiple leads. Returns array parallel to inputs. */
export function scoreLeads(inputs: ScoringInput[]): ScoreData[] {
  return inputs.map(scoreLead)
}

function computeConfidence(fit: DimensionScore, engagement: DimensionScore, intent: DimensionScore): number {
  // L2 leads have 8 additional W signals (W1-W8) on top of 20 F+E+I signals
  const hasL2Signals = fit.signalsDetected.some(s => s.startsWith("W")) ||
    engagement.signalsDetected.some(s => s.startsWith("W")) ||
    intent.signalsDetected.some(s => s.startsWith("W")) ||
    fit.signalsMissing.some(s => s.startsWith("W")) ||
    engagement.signalsMissing.some(s => s.startsWith("W")) ||
    intent.signalsMissing.some(s => s.startsWith("W"))

  const totalSignals = hasL2Signals ? 28 : 20 // F1-F10(10) + E1-E7(7) + I1-I3(3) + W1-W8(8)

  const evaluated = fit.signalsDetected.length + fit.signalsMissing.length +
    engagement.signalsDetected.length + engagement.signalsMissing.length +
    intent.signalsDetected.length + intent.signalsMissing.length

  
return Math.min(1, evaluated / totalSignals)
}

// ── Score Distribution Stats ──────────────────────────────────


// ── Contact Method Detection ─────────────────────────────────

/** Detect all available contact methods for a lead and classify communication channels. */
export function detectContactMethods(input: ScoringInput): string[] {
  const methods: string[] = []
  
  // WhatsApp detection
  if (input.phone && detectWhatsApp(input.phone)) {
    methods.push('whatsapp')
  }
  
  // Regular phone (not WhatsApp)
  if (input.phone && !detectWhatsApp(input.phone)) {
    methods.push('phone_fixo')
  }
  
  // Website with form potential
  if (input.website) {
    const dt = detectDomainType(input.website)

    if (dt === 'proprio') methods.push('website_proprio')
    else if (dt) methods.push('website_' + dt)
    else methods.push('website')
  }
  
  // GMB profile (sempre presente se o lead veio do Discovery)
  if (input.place_id) {
    methods.push('gmb_profile')
  }
  
  // No digital contact at all
  if (methods.length === 0 || (methods.length === 1 && methods[0] === 'gmb_profile')) {
    methods.push('apenas_gmb')
  }
  
  return methods
}

/** Classify lead by best contact strategy based on available channels. */
export function contactStrategy(methods: string[]): {
  strategy: 'whatsapp_direct' | 'phone_call' | 'website_form' | 'gmb_only' | 'offline'
  label: string
  action: string
  cost: 'zero' | 'low' | 'medium'
} {
  if (methods.includes('whatsapp')) {
    return { strategy: 'whatsapp_direct', label: 'WhatsApp Direto', action: 'Abordar via WhatsApp Business. Script: diagnóstico + oferta Raio-X.', cost: 'zero' }
  }

  if (methods.includes('phone_fixo')) {
    return { strategy: 'phone_call', label: 'Ligação Telefônica', action: 'URA/ligação com script de diagnóstico. Melhor horário: fora do pico GMB.', cost: 'low' }
  }

  if (methods.includes('website_proprio')) {
    return { strategy: 'website_form', label: 'Formulário do Site', action: 'Preencher formulário de contato do site. Email follow-up.', cost: 'low' }
  }

  if (methods.includes('apenas_gmb')) {
    return { strategy: 'gmb_only', label: 'Apenas GMB', action: 'Único canal é o perfil GMB. Reivindicar + otimizar antes de abordar.', cost: 'medium' }
  }

  
return { strategy: 'offline', label: 'Offline Total', action: 'Sem canais digitais. Precisa de prospecção física ou telefone público.', cost: 'medium' }
}

export interface ScoreDistribution {
  unaware: number; problemAware: number; solutionAware: number
  productAware: number; mostAware: number; total: number; avgScore: number
}

export function computeDistribution(scores: ScoreData[]): ScoreDistribution {
  const dist: ScoreDistribution = {
    unaware: 0, problemAware: 0, solutionAware: 0, productAware: 0, mostAware: 0,
    total: scores.length, avgScore: 0,
  }

  let sum = 0

  for (const s of scores) {
    sum += s.compound

    switch (s.schwartz.level) {
      case 1: dist.unaware++; break
      case 2: dist.problemAware++; break
      case 3: dist.solutionAware++; break
      case 4: dist.productAware++; break
      case 5: dist.mostAware++; break
    }
  }

  dist.avgScore = scores.length > 0 ? Math.round(sum / scores.length) : 0
  
return dist
}
