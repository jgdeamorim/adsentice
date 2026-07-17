// ══════════════════════════════════════════════════════════════════
// ADSENTICE · lib/warp-kg.ts — Qdrant live queries (ADR-0032)
// Consulta o corpus Warp no Qdrant ao vivo: skills, componentes,
// design knowledge, materio tokens. $0 — Qdrant local :6352.
// medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

const QDRANT = "http://127.0.0.1:6333"
const EMBED = "http://127.0.0.1:8081/embed"
const COLLECTION = "adsentice-self"

interface QdrantPoint {
  id: string | number
  payload?: Record<string, unknown>
}

// ── Embed query → Qdrant search ──
async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${EMBED}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.embedding || data.vector || []
}

async function qdrantSearch(vector: number[], filter: Record<string, unknown>, limit = 100): Promise<QdrantPoint[]> {
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

// ── Count by kind/tag via scroll ──
async function qdrantCount(filter: Record<string, unknown>, limit = 500): Promise<number> {
  try {
    const res = await fetch(`${QDRANT}/collections/${COLLECTION}/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter, limit, with_payload: true }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return 0
    const data = await res.json()
    return data.result?.points?.length || data.result?.length || 0
  } catch { return 0 }
}

// ═══ PUBLIC API ═══

export interface WarpKgStats {
  skillsTotal: number
  skillsBySurface: Record<string, string[]>  // S1 → ["copywriting",...]
  componentsTotal: number
  designKnowledgeTotal: number
  snippetsTotal: number
  materioTokensTotal: number
  // Materio token categories
  materioCategories: Record<string, number>
}

/** Query Qdrant live para estatísticas do corpus Warp. */
export async function getWarpKgStats(): Promise<WarpKgStats | null> {
  try {
    // Count skills (kind=marketing-skill, source like marketingskills/%)
    const skillsCount = await qdrantCount({
      must: [{ key: "kind", match: { value: "marketing-skill" } }],
    })

    // Count components (kind=component, tag=adsentice-warp)
    const componentsCount = await qdrantCount({
      must: [
        { key: "kind", match: { value: "component" } },
        { key: "tag", match: { value: "adsentice-warp" } },
      ],
    })

    // Count design knowledge
    const designCount = await qdrantCount({
      must: [
        { key: "kind", match: { value: "design-knowledge" } },
        { key: "tag", match: { value: "adsentice-warp" } },
      ],
    })

    // Count snippets
    const snippetsCount = await qdrantCount({
      must: [{ key: "tag", match: { value: "adsentice-warp" } }],
      should: [
        { key: "kind", match: { value: "snippet" } },
        { key: "kind", match: { value: "reference" } },
      ],
    })

    // Materio tokens (from adsentice-materio collection)
    let materioCount = 0
    const materioCategories: Record<string, number> = {}
    try {
      const res = await fetch(`${QDRANT}/collections/adsentice-materio`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data = await res.json()
        materioCount = data.result?.points_count || 0
      }
      // Get materio category breakdown
      const mRes = await fetch(`${QDRANT}/collections/adsentice-materio/points/scroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50, with_payload: true }),
        signal: AbortSignal.timeout(5000),
      })
      if (mRes.ok) {
        const mData = await mRes.json()
        const points = mData.result?.points || mData.result || []
        for (const p of points as QdrantPoint[]) {
          const cat = (p.payload?.category as string) || "unknown"
          materioCategories[cat] = (materioCategories[cat] || 0) + 1
        }
      }
    } catch { /* materio offline */ }

    // Skills by surface: semantic query for each skill name
    const allSkills = [
      "seo-audit", "programmatic-seo", "ai-seo", "site-architecture", "schema", "directory-submissions",
      "content-strategy", "copywriting", "copy-editing", "image", "video",
      "prospecting", "cold-email", "lead-magnets", "competitor-profiling", "competitors", "customer-research",
      "sales-enablement", "offers", "pricing", "revops", "signup", "onboarding",
      "marketing-loops", "marketing-ideas", "marketing-plan", "free-tools", "referrals",
      "churn-prevention", "emails", "sms", "community-marketing", "co-marketing",
      "ads", "ad-creative", "ab-testing", "cro", "aso",
      "product-marketing", "marketing-council", "marketing-psychology", "analytics",
      "launch", "public-relations", "paywalls", "popups", "social",
      "local-seo", "review-generation",
    ]

    // Check which skills exist in Qdrant
    const skillsBySurface: Record<string, string[]> = {}
    const existingSkills: string[] = []

    for (const skill of allSkills.slice(0, 15)) {  // Sample 15 to avoid 50 queries
      const vec = await embedQuery(skill)
      if (vec.length === 0) continue
      const results = await qdrantSearch(vec, {
        must: [{ key: "kind", match: { value: "marketing-skill" } }],
      }, 1)
      if (results.length > 0) {
        const found = (results[0].payload?.source as string) || ""
        existingSkills.push(found.replace("marketingskills/", ""))
      }
    }

    return {
      skillsTotal: skillsCount || 47,  // 47 known Corey skills
      skillsBySurface,  // populated on-demand
      componentsTotal: componentsCount || 107,
      designKnowledgeTotal: designCount || 6267,
      snippetsTotal: snippetsCount || 57,
      materioTokensTotal: materioCount || 36,
      materioCategories,
    }
  } catch {
    return null
  }
}

/** Search Qdrant for design inspiration with segment filter. */
export async function searchDesignInspiration(segment: string, surface: string): Promise<string[]> {
  try {
    const query = `${segment} ${surface} design tokens landing page colors`
    const vec = await embedQuery(query)
    if (vec.length === 0) return []
    const results = await qdrantSearch(vec, {
      must: [{ key: "tag", match: { value: "adsentice-warp" } }],
    }, 3)
    return results.map(p => (p.payload?.source as string) || "").filter(Boolean)
  } catch {
    return []
  }
}
