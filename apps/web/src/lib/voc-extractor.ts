// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Voice of Customer Extractor v0.4
// Skill: customer-research (Corey Haines) — review mining, VOC, sentiment
// EVO-API L3: businessReviewsGoogle ($0.005) — review text extraction
// Extracts pain points, customer language, sentiment trends.
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { businessReviewsGoogle } from "./evo-mcp"
import type { ScoringInput } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface VOCResult {
  sentiment: { positive: number; negative: number; neutral: number; ratio: number }
  keywords: { word: string; count: number; sentiment: "positive" | "negative" | "neutral" }[]
  painPoints: string[]
  praisePoints: string[]
  customerLanguage: string[]
  signals: {
    r1_negative_trend: boolean
    r2_review_response_gap: boolean
    r3_language_mismatch: boolean
  }
  gapsDetected: string[]
  gapsAbsent: string[]
  painScore: number
  totalReviews: number
  avgRating: number
}

// ── Constants ─────────────────────────────────────────────────

const MAX_VOC_PAIN = 33 // R1(15) + R2(10) + R3(8)

// Portuguese pain and praise indicator words
const PAIN_WORDS = ["ruim", "pessimo", "horrivel", "demora", "caro", "nao recomendo", "decepcionado",
  "frustrado", "problema", "reclamacao", "atendimento ruim", "nao voltarei", "desorganizado", "sujo"]
const PRAISE_WORDS = ["excelente", "otimo", "maravilhoso", "recomendo", "voltarei", "profissional",
  "atencioso", "pontual", "limpo", "organizado", "preco justo", "melhor", "superou", "nota 10"]

/** Extract VOC from GMB reviews. Calls businessReviewsGoogle() (L3, ~$0.005). */
export async function extractVOC(
  input: ScoringInput,
): Promise<VOCResult | null> {
  if (!input.place_id) return null

  let reviews: { rating: number; text: string; time: string }[] = []
  let totalCount = 0
  let avgRating = input.rating_value || 0

  try {
    const result = await businessReviewsGoogle(input.place_id)
    reviews = result.reviews
    totalCount = result.totalCount
    avgRating = result.avgRating || avgRating
  } catch {
    // Degrade gracefully — VOC data is optional enrichment
  }

  // ── Sentiment Analysis ──
  let positive = 0; let negative = 0; let neutral = 0
  const wordFreq: Record<string, { count: number; sentiment: "positive" | "negative" | "neutral" }> = {}
  const painPoints: string[] = []
  const praisePoints: string[] = []
  const customerLanguage: string[] = []

  for (const review of reviews) {
    const text = review.text.toLowerCase()
    const rating = review.rating

    // Sentiment by rating
    if (rating >= 4) positive++
    else if (rating <= 2) negative++
    else neutral++

    // Extract pain points from negative reviews
    if (rating <= 2) {
      for (const pw of PAIN_WORDS) {
        if (text.includes(pw) && !painPoints.includes(pw)) {
          painPoints.push(pw)
        }
      }
      // Capture customer language phrases (3+ word sequences)
      const words = text.split(/\s+/)
      for (let i = 0; i < words.length - 2; i++) {
        const phrase = words.slice(i, i + 3).join(" ")
        if (phrase.length > 15 && phrase.length < 80 && !customerLanguage.includes(phrase)) {
          customerLanguage.push(phrase)
        }
      }
    }

    // Extract praise points from positive reviews
    if (rating >= 4) {
      for (const pw of PRAISE_WORDS) {
        if (text.includes(pw) && !praisePoints.includes(pw)) {
          praisePoints.push(pw)
        }
      }
    }

    // Word frequency (simple keywords)
    for (const word of text.split(/\s+/)) {
      const clean = word.replace(/[^a-záàâãéêíóôõúç0-9]/g, "")
      if (clean.length < 4) continue
      if (!wordFreq[clean]) wordFreq[clean] = { count: 0, sentiment: "neutral" }
      wordFreq[clean].count++
      if (rating >= 4) wordFreq[clean].sentiment = "positive"
      else if (rating <= 2) wordFreq[clean].sentiment = "negative"
    }
  }

  // Top 10 keywords by frequency
  const keywords = Object.entries(wordFreq)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([word, data]) => ({ word, count: data.count, sentiment: data.sentiment }))

  const totalReviews = reviews.length
  const ratio = totalReviews > 0 ? positive / totalReviews : 0.5

  // ── Signals ──
  const signals = { r1_negative_trend: false, r2_review_response_gap: false, r3_language_mismatch: false }
  const gapsDetected: string[] = []
  const gapsAbsent: string[] = []
  let painRaw = 0

  // R1: Negative sentiment trend — >30% negative reviews (15pts)
  if (totalReviews > 0 && negative / totalReviews > 0.3) {
    painRaw += 15; signals.r1_negative_trend = true; gapsDetected.push("R1")
  } else { gapsAbsent.push("R1") }

  // R2: Review response gap — has reviews but avg rating < 3.5 (10pts)
  if (totalReviews > 0 && avgRating < 3.5) {
    painRaw += 10; signals.r2_review_response_gap = true; gapsDetected.push("R2")
  } else { gapsAbsent.push("R2") }

  // R3: Language mismatch — website language doesn't match customer language (8pts)
  if (customerLanguage.length > 0 && painPoints.length > 1) {
    painRaw += 8; signals.r3_language_mismatch = true; gapsDetected.push("R3")
  } else if (customerLanguage.length > 0) { gapsAbsent.push("R3") }

  const painScore = Math.round((painRaw / MAX_VOC_PAIN) * 100)

  return { sentiment: { positive, negative, neutral, ratio }, keywords, painPoints, praisePoints,
    customerLanguage: customerLanguage.slice(0, 5), signals, gapsDetected, gapsAbsent, painScore, totalReviews, avgRating }
}

/** Quick VOC scoring from existing GMB data — no API call needed. */
export function vocQuickScan(input: ScoringInput): {
  hasPotential: boolean
  reason: string
} {
  if (!input.place_id) return { hasPotential: false, reason: "Sem place_id — sem perfil GMB para minerar avaliacoes" }
  if ((input.rating_votes || 0) === 0) return { hasPotential: false, reason: "Zero avaliacoes — sem dados de VOC" }
  return { hasPotential: true, reason: `${input.rating_votes} avaliacoes disponiveis para mineracao` }
}
