/**
 * packages/warp/src/marketing-kg.ts
 * Marketing Knowledge Graph — ADR-0037 Fase 1
 *
 * Camada de QUERY ao Qdrant para frameworks de marketing.
 * NÃO gera diagnósticos, copy angles ou objection handlers —
 * isso é responsabilidade dos módulos existentes:
 *   recommend.ts (ActionPlan) · battle-card.ts (Pitch/Objections) ·
 *   product-context.ts (Diagnosis) · marketing-plan.ts (13-section plan)
 *
 * Pipeline:
 *   intent + segment + nicho
 *     → queryMarketingSkill(skillName) → framework text from Qdrant
 *     → queryRelevantSkills(leadCtx) → batch ranked frameworks
 *     → módulos existentes consomem o texto bruto
 *
 * 40+ frameworks: Corey Haines (marketingskills/) + Kim Barrett (advertising-skills/)
 * Cost: $0 (Qdrant local :6352 + embed :8081)
 * medido=verdade · 2026-07-18 · adsentice
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MarketingFramework {
  skillName: string
  source: string
  content: string
  score: number
}

export interface LeadContext {
  businessName: string
  category: string
  segment: string
  city: string
  district: string
  score: number
  rating: number
  reviews: number
  isClaimed: boolean
  hasWebsite: boolean
  competitorCount: number
  topGaps: string[]
  schwartzLevel: string
}

// ═══════════════════════════════════════════════════════════════
// QDRANT + EMBED clients
// ═══════════════════════════════════════════════════════════════

const QDRANT = "http://127.0.0.1:6352"
const EMBED = "http://127.0.0.1:8081/embed"
const COLLECTION = "adsentice-self"

async function embedQuery(text: string): Promise<number[]> {
  try {
    const res = await fetch(EMBED, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text] }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.vectors?.[0] || []
  } catch { return [] }
}

async function qdrantSearch(vector: number[], filter: Record<string, unknown>, limit = 1): Promise<any[]> {
  try {
    const res = await fetch(`${QDRANT}/collections/${COLLECTION}/points/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector, limit, filter, with_payload: true }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.result || []
  } catch { return [] }
}

// ═══════════════════════════════════════════════════════════════
// QUERY LAYER (única responsabilidade deste módulo)
// ═══════════════════════════════════════════════════════════════

/**
 * Query Qdrant for a single marketing skill framework.
 * Returns raw framework text — no derivation, no heuristics.
 * Existing modules (recommend.ts, battle-card.ts, product-context.ts) consume this.
 */
export async function queryMarketingSkill(
  skillName: string,
  context?: string,
): Promise<MarketingFramework | null> {
  try {
    const query = `${skillName} marketing framework ${context || ''}`
    const vec = await embedQuery(query)
    if (vec.length === 0) return null

    // ADR-0047: tag-based filter — marketing content is tagged 'adsentice' across
    // 6 kinds: marketing-skill, foundation, execution, pattern, framework, heuristic
    const results = await qdrantSearch(vec, {
      must: [
        { key: "tag", match: { value: "adsentice" } },
      ],
    }, 3)

    if (!results.length) return null
    const best = results[0]
    const pl = best.payload || {}
    const src = (pl.source as string) || ""
    const rawSkill = src.replace(/^(?:marketingskills|corey-haines-marketing|strategy)\//, "").replace(/\//g, "_")
    return {
      skillName: rawSkill || skillName,
      source: src || "unknown",
      content: (pl.text as string) || "",
      score: best.score || 0,
    }
  } catch { return null }
}

/**
 * Batch query multiple marketing skills relevant to a lead context.
 * Returns raw frameworks ranked by semantic match score.
 * The skill selection logic is deterministic ($0) — no LLM.
 *
 * Integrates with:
 *   - recommend.ts: ActionPlan generation consumes framework content
 *   - battle-card.ts: ObjectionResponse + Pitch consume framework content
 *   - product-context.ts: Section enrichment consumes framework content
 *   - composeS10_BLUE: gap enrichment via framework knowledge
 */
export async function queryRelevantSkills(
  leadContext: LeadContext,
): Promise<MarketingFramework[]> {
  const relevantSkills: string[] = []

  relevantSkills.push("copywriting")

  if (leadContext.hasWebsite) {
    relevantSkills.push("seo-audit")
    relevantSkills.push("site-architecture")
    relevantSkills.push("schema")
  }

  if (leadContext.competitorCount > 5) {
    relevantSkills.push("competitors")
    relevantSkills.push("prospecting")
  }

  if (leadContext.score < 50) {
    relevantSkills.push("cro")
    relevantSkills.push("lead-magnets")
  }

  relevantSkills.push("pricing")
  relevantSkills.push("marketing-psychology")

  // ADR-0048: local-seo — todo SMB precisa (GMB, Local Pack, NAP)
  relevantSkills.push("local-seo")
  if (leadContext.rating < 4.0) relevantSkills.push("reviews-and-reputation")

  const unique = [...new Set(relevantSkills)]
  const contextStr = `${leadContext.segment} ${leadContext.category} ${leadContext.schwartzLevel}`
  const results: MarketingFramework[] = []

  for (const skill of unique) {
    const framework = await queryMarketingSkill(skill, contextStr)
    if (framework && framework.score > 0.25) {
      results.push(framework)
    }
  }

  return results.sort((a, b) => b.score - a.score)
}
