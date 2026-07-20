// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Auto-Pilot Decision Engine (ADR-0051)
// Ciclo OODA: Category Intel → Brain OODA logic → decisão de prospecção
// certainty ≥ 0.80 = automático ($0) · < 0.80 = sugestão
// medido=verdade · $0 · 2026-07-20
// ══════════════════════════════════════════════════════════════════

import "server-only"
import { getCategoryIntelligence, getCategoryOpportunityQuick } from "./category-intel"
import { getPreflightMarketIntel } from "./market-intel"

export interface AutoPilotDecision {
  category: string
  label: string
  region: { city: string; state: string }
  opportunityScore: number
  preflightEstimate: number
  estimatedCost: number
  estimatedROI: string
  certainty: number
  autoExecute: boolean
  reasoning: string
}

export interface AutoPilotResult {
  decisions: AutoPilotDecision[]
  topPick: AutoPilotDecision | null
  autoExecutable: AutoPilotDecision[]
  suggested: AutoPilotDecision[]
  summary: {
    totalCategories: number
    viableOpportunities: number
    autoReady: number
    suggestedCount: number
    avgOpportunityScore: number
  }
  generatedAt: string
}

/** Ciclo OODA de decisão de prospecção. Brain OODA B2 Self-Score adaptado. */
export async function autoPilotDecide(): Promise<AutoPilotResult> {
  try {
    // ── OBSERVE: Category Intelligence ──
    const catIntel = await getCategoryIntelligence()
    const viable = catIntel.filter(ci =>
      ci.opportunity.score > 40 &&
      ci.coverage.gaps.length > 0
    )

    if (!viable.length) {
      return emptyResult(catIntel.length)
    }

    // ── ORIENT: cross-reference com Pre-flight Market Intel ──
    const preflight = await getPreflightMarketIntel().catch(() => [])

    const decisions: AutoPilotDecision[] = []
    for (const ci of viable.slice(0, 8)) {
      const gap = ci.coverage.gaps[0]
      if (!gap) continue

      // Cross-reference com preflight data
      const pfMatch = preflight.find(p =>
        (p.municipio || "").toLowerCase() === gap.city.toLowerCase()
      )

      // ── DECIDE: Brain OODA B2 Self-Score adaptado ──
      const factsScore = Math.min(ci.coverage.gaps.length / 5, 1.0)
      const qualityScore = ci.quality.avgScore > 50 ? 0.7 : 0.3
      const coverageScore = ci.coverage.coveragePctBR < 30 ? 1.0
        : ci.coverage.coveragePctBR < 60 ? 0.6 : 0.3
      const websiteBonus = ci.quality.pctWithWebsite > 30 ? 0.8 : 0.4
      const certainty = +(
        0.30 * factsScore +
        0.25 * qualityScore +
        0.30 * coverageScore +
        0.15 * websiteBonus
      ).toFixed(2)

      const preflightEstimate = pfMatch?.totalInRegion || gap.estimatedMissing

      decisions.push({
        category: ci.category,
        label: ci.label,
        region: { city: gap.city, state: gap.state },
        opportunityScore: ci.opportunity.score,
        preflightEstimate,
        estimatedCost: 0.048, // 1 página L0
        estimatedROI: ci.quality.avgScore > 55
          ? "ROI positivo em < 1 mês"
          : ci.quality.avgScore > 40
            ? "ROI em 2-3 meses"
            : "ROI incerto — validar com pre-flight",
        certainty,
        autoExecute: certainty >= 0.80,
        reasoning: certainty >= 0.80
          ? `ALTA CONFIANÇA (${(certainty*100).toFixed(0)}%): ${ci.label} em ${gap.city} (${gap.state}) — ${ci.coverage.coveragePctBR}% coberto, score médio ${ci.quality.avgScore}, ~${preflightEstimate} candidatos estimados`
          : certainty >= 0.60
            ? `MÉDIA CONFIANÇA (${(certainty*100).toFixed(0)}%): ${ci.label} em ${gap.city} — ${ci.coverage.coveragePctBR}% coberto — requer validação do founder`
            : `BAIXA CONFIANÇA: ${ci.label} em ${gap.city} — oportunidade incerta, mais dados necessários`,
      })
    }

    const sorted = decisions.sort((a, b) => b.certainty - a.certainty)
    const autoExecutable = sorted.filter(d => d.autoExecute)
    const suggested = sorted.filter(d => !d.autoExecute)
    const topPick = autoExecutable[0] || suggested[0] || null

    return {
      decisions: sorted,
      topPick,
      autoExecutable,
      suggested,
      summary: {
        totalCategories: catIntel.length,
        viableOpportunities: viable.length,
        autoReady: autoExecutable.length,
        suggestedCount: suggested.length,
        avgOpportunityScore: Math.round(
          decisions.reduce((s, d) => s + d.opportunityScore, 0) / Math.max(decisions.length, 1)
        ),
      },
      generatedAt: new Date().toISOString(),
    }
  } catch (e: unknown) {
    console.error("[auto-pilot]", (e as Error).message?.slice(0, 120))
    return emptyResult(0)
  }
}

function emptyResult(total: number): AutoPilotResult {
  return {
    decisions: [], topPick: null, autoExecutable: [], suggested: [],
    summary: {
      totalCategories: total, viableOpportunities: 0,
      autoReady: 0, suggestedCount: 0, avgOpportunityScore: 0,
    },
    generatedAt: new Date().toISOString(),
  }
}
