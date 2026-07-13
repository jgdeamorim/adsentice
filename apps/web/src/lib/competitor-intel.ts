// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Competitive Intelligence v0.4
// Skills: competitors + competitor-profiling (Corey, unified)
// EVO-API L3: domainCompetitors ($0.02) + Quick Scan / Deep Profile
// ADR-0008 spending rule: K1-K4 only if score >= 50
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { extractDomain, domainCompetitors } from "./evo-mcp"
import type { ScoringInput } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface CompetitorProfile {
  domain: string
  rank: number
  keywordOverlap: number
  threatLevel: "alto" | "medio" | "baixo"
}

export interface CompetitiveLandscape {
  leadDomain: string | null
  topCompetitors: CompetitorProfile[]
  totalPeers: number
  marketPosition: "dominante" | "competitivo" | "desafiante" | "invisivel"
  signals: {
    k1_competitor_gap: boolean
    k2_market_leader_threat: boolean
    k3_keyword_cannibalization: boolean
    k4_uncontested_niche: boolean
  }
  gapsDetected: string[]
  gapsAbsent: string[]
  painScore: number
}

// ── Constants ─────────────────────────────────────────────────

const MAX_PAIN = 43 // K1(20) + K2(10) + K3(8) + K4(5)

/** Analyze competitive landscape. Calls domainCompetitors() (L3, $0.02). */
export async function analyzeCompetitiveLandscape(
  input: ScoringInput,
): Promise<CompetitiveLandscape | null> {
  const website = input.website
  if (!website) return null

  const domain = extractDomain(website)
  if (!domain) return null

  let competitors: { domain: string; rank: number; intersections: number }[] = []
  try {
    competitors = await domainCompetitors(domain)
  } catch {
    // Degrade gracefully — competitive data is optional
  }

  const topCompetitors: CompetitorProfile[] = competitors.slice(0, 5).map(c => ({
    domain: c.domain,
    rank: c.rank,
    keywordOverlap: c.intersections,
    threatLevel: c.intersections > 50 ? "alto" : c.intersections > 20 ? "medio" : "baixo",
  }))

  const totalPeers = competitors.length
  const avgRank = topCompetitors.length > 0
    ? topCompetitors.reduce((s, c) => s + c.rank, 0) / topCompetitors.length
    : 0

  const signals = { k1_competitor_gap: false, k2_market_leader_threat: false,
    k3_keyword_cannibalization: false, k4_uncontested_niche: false }
  const gapsDetected: string[] = []
  const gapsAbsent: string[] = []
  let painRaw = 0

  // K1: Competitor Gap — has peers with overlapping keywords (20pts)
  if (totalPeers > 0 && topCompetitors.length > 0) {
    painRaw += 20; signals.k1_competitor_gap = true; gapsDetected.push("K1")
  } else { gapsAbsent.push("K1") }

  // K2: Market Leader Threat — top competitor has high rank (10pts)
  if (topCompetitors.length > 0 && topCompetitors[0].rank > 500) {
    painRaw += 10; signals.k2_market_leader_threat = true; gapsDetected.push("K2")
  } else { gapsAbsent.push("K2") }

  // K3: Keyword Cannibalization — multiple competitors with high overlap (8pts)
  const highOverlap = topCompetitors.filter(c => c.keywordOverlap > 30)
  if (highOverlap.length >= 2) {
    painRaw += 8; signals.k3_keyword_cannibalization = true; gapsDetected.push("K3")
  } else { gapsAbsent.push("K3") }

  // K4: Uncontested Niche — zero competitors (5pts BONUS — not pain, opportunity)
  if (totalPeers === 0) {
    painRaw += 0 // no pain from competitors
    signals.k4_uncontested_niche = true; gapsDetected.push("K4:oportunidade")
  } else { gapsAbsent.push("K4") }

  const painScore = Math.round((painRaw / MAX_PAIN) * 100)
  const marketPosition: CompetitiveLandscape["marketPosition"] =
    totalPeers === 0 ? "invisivel" :
    avgRank > 700 ? "dominante" :
    avgRank > 400 ? "competitivo" : "desafiante"

  return { leadDomain: domain, topCompetitors, totalPeers, marketPosition, signals, gapsDetected, gapsAbsent, painScore }
}

/** Quick Scan — synchronous scoring from website data, no API call needed for basic signals. */
export function competitiveQuickScan(input: ScoringInput): {
  hasPotential: boolean
  reason: string
} {
  if (!input.website) return { hasPotential: false, reason: "Sem website — sem superficie competitiva para analisar" }
  const dt = input.website?.toLowerCase() || ""
  if (dt.includes("linktr.ee") || dt.includes("facebook.com") || dt.includes("instagram.com")) {
    return { hasPotential: false, reason: "Site em plataforma social — nao compete em SEO tradicional" }
  }
  return { hasPotential: true, reason: "Site proprio — superficie competitiva via SEO disponivel" }
}
