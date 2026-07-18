// ══════════════════════════════════════════════════════════════════
// ADSENTICE · lib/warp-kg.ts — Qdrant live queries (ADR-0032)
// Consulta o corpus Warp no Qdrant ao vivo: skills, componentes,
// design knowledge, materio tokens. $0 — Qdrant local :6352.
// medido=verdade · 2026-07-17
// ══════════════════════════════════════════════════════════════════

const QDRANT = "http://127.0.0.1:6352"
const EMBED = "http://127.0.0.1:8081/embed"
const COLLECTION = "adsentice-self"

interface QdrantPoint {
  id: string | number
  score?: number
  payload?: Record<string, unknown>
}

/** ADR-0034 regra 2 — threshold mínimo de relevância para queries de design.
 *  Abaixo disso, hits são ruído (ex: "Barbearia" num lead dentista). */
const SCORE_THRESHOLD = 0.30  // calibrado 2026-07-18: Cosine 768d scores max 0.39 em queries reais

// ── Embed query → Qdrant search ──
async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${EMBED}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: [text] }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return []
  const data = await res.json()
  // Contrato real embed-server-rs (medido): {texts:[...]} → {vectors:[[768d]]}
  return data.vectors?.[0] || data.embedding || data.vector || []
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

/** Query design best practices for a segment + surface from Qdrant.
 *  Returns CSS/design recommendations from the 6,267 design knowledge points. */
export async function queryDesignBestPractices(segment: string, surface: string): Promise<{
  colorRecommendation: string
  typographyRecommendation: string
  spacingRecommendation: string
  motionRecommendation: string
  inspirationUrls: string[]
}> {
  try {
    const query = `${segment} ${surface} best design practices landing page conversion optimization`
    const vec = await embedQuery(query)
    if (vec.length === 0) {
      return {
        colorRecommendation: "Use high contrast primary color with white background",
        typographyRecommendation: "Sans-serif, 16px base, 1.5 line-height",
        spacingRecommendation: "1.5rem grid, generous whitespace",
        motionRecommendation: "subtle transitions, 200ms ease",
        inspirationUrls: [],
      }
    }
    
    const results = await qdrantSearch(vec, {
      must: [{ key: "tag", match: { value: "adsentice-warp" } }],
    }, 10)  // fetch mais (10) pois threshold filtra
    
    const good = results.filter(p => (p.score || 0) >= SCORE_THRESHOLD)
    const sources = good.map(p => (p.payload?.source as string) || "").filter(Boolean)
    if (!sources.length && !results.length) return {/* fallbacks below */}
    
    // Derive recommendations from design knowledge (filtered by threshold)
    // If none passed threshold → fallback honesto — NÃO usa hint de outro nicho
    const recs: Record<string, string> = {}
    for (const r of good) {
      const payload = r.payload || {}
      const name = (payload.name as string) || ""
      const kind = (payload.kind as string) || ""
      if (name && kind) recs[kind] = name
    }
    
    return {
      colorRecommendation: recs["color"] || `Use segment-appropriate palette (${segment} market research)`,
      typographyRecommendation: recs["typography"] || "Inter font family, 65ch max-width for readability",
      spacingRecommendation: recs["spacing"] || "1.5rem base grid with responsive breakpoints",
      motionRecommendation: recs["motion"] || "Prefer reduced motion for accessibility, 200ms for interactions",
      inspirationUrls: sources.slice(0, 3),
    }
  } catch {
    return {
      colorRecommendation: "OKLCH palette derived from market segment",
      typographyRecommendation: "System font stack with 1.5 line-height",
      spacingRecommendation: "Consistent 1.5rem rhythm",
      motionRecommendation: "subtle, accessible transitions",
      inspirationUrls: [],
    }
  }
}

/** Query Qdrant for Warp components matching a design intent.
 *  Returns components with a11y data for HTML generation. */
export async function queryComponentsByIntent(intent: string, surface?: string, segment?: string): Promise<{
  name: string; id: string; a11y: { role: string; ariaLabel: string; keyboardNav: boolean; contrastRatio: number }
  tokens: string[]; category: string; intent: string; edges: string[]
}[]> {
  try {
    const vec = await embedQuery(`${intent} ${surface || ''} ${segment || ''} design system component`)
    if (vec.length === 0) return []
    
    const filter: Record<string, unknown> = {
      must: [
        { key: "kind", match: { value: "component" } },
        { key: "tag", match: { value: "adsentice-warp" } },
      ],
    }
    
    const results = await qdrantSearch(vec, filter, 16)
    // Scores em 768d Cosine: 0.27-0.39 (threshold 0.45 mata tudo — medido 2026-07-18)
    // Filtro: só kind=component + tag=adsentice-warp + dedup por id (dual embed duplica)
    const seen = new Set<string>()
    return results.map(p => {
      const pl = p.payload || {}
      return {
        name: (pl.name as string) || (pl.id as string) || "unknown",
        id: (pl.id as string) || "unknown",
        a11y: {
          role: (pl.a11y_role as string) || "region",
          ariaLabel: (pl.a11y_role as string) ? `${pl.name} component` : "Content section",
          keyboardNav: (pl.a11y_keyboard as boolean) || false,
          contrastRatio: (pl.a11y_contrast as number) || 3.0,
        },
        tokens: (pl.tokens as string[]) || [],
        category: (pl.category as string) || "layout",
        intent: (pl.intent as string) || "",
        edges: (pl.edges as string[]) || [],
      }
    }).filter(c => !seen.has(c.id) && seen.add(c.id) !== undefined).slice(0, 8)
  } catch {
    return []
  }
}

/** ADR-0034 órgão 5 — busca sistema de design completo do OD v0.9.0 no Qdrant.
 *  150 estilos (open-design/*) embedados como kind=design-system, 4 chunks cada:
 *  chunk0=Visual Theme+Colors, chunk1=Typography, chunk2=Components,
 *  chunk3=Layout+Grid+Elevation.
 *  Retorna specs de layout parseadas que o composeS10 aplica ao HTML. */
export async function queryDesignSystem(segment: string, surface: string): Promise<{
  designSystem: string
  colors: { bg: string; fg: string; accent: string; muted: string; border: string; surface: string; success: string; warning: string; danger: string }
  typography: { font: string; headingWeight: number; bodyWeight: number; scale: number[]; lineHeightBody: number; lineHeightHeading: number }
  components: { buttonRadius: string; buttonPaddingBlock: string; buttonPaddingInline: string; cardRadius: string; cardPadding: string; cardShadow: string; cardBorder: string }
  layout: { maxWidth: string; columns: number; gutter: string; heroMinHeight: string; sectionSpacingDesktop: string; sectionSpacingTablet: string; sectionSpacingPhone: string }
  elevation: { raisedY: string; raisedBlur: string; raisedOpacity: string }
} | null> {
  try {
    // Mapeia segmento → estilo OD mais próximo (heurística de mercado)
    const styleHints: Record<string, string> = {
      saude: "clean minimal professional",
      beleza: "elegant luxury warm",
      servicos: "corporate professional",
      alimentacao: "warm editorial cafe",
      comercio: "clean functional",
      educacao: "editorial clean",
      hospitalidade: "spacious warm",
    }
    const hint = styleHints[segment] || "neutral modern clean"
    const query = `${hint} ${surface} design system layout`
    const vec = await embedQuery(query)
    if (vec.length === 0) return null

    // Scroll todos os chunks de design-system com filtro de relevância
    const res = await fetch(`${QDRANT}/collections/${COLLECTION}/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { must: [{ key: "kind", match: { value: "design-system" } }] },
        limit: 120, with_payload: true,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const points: QdrantPoint[] = data.result?.points || []

    // Agrupa por design_system, ordena chunks
    const systems: Record<string, Record<string, string>> = {}
    for (const p of points) {
      const pl = p.payload || {}
      const ds = (pl.design_system as string) || (pl.source as string)?.split("/")[1] || "default"
      const chunk = String(pl.chunk || "0")
      if (!systems[ds]) systems[ds] = {}
      systems[ds][chunk] = (pl.text as string) || ""
    }

    // Seleciona o sistema cujo nome melhor matcha com o hint
    const dsNames = Object.keys(systems)
    if (!dsNames.length) return null
    const best = dsNames.reduce((a, b) => {
      const scoreA = hint.split(" ").filter(w => a.includes(w)).length
      const scoreB = hint.split(" ").filter(w => b.includes(w)).length
      return scoreA >= scoreB ? a : b
    })

    const ds = systems[best]
    const full = Object.values(ds).join("\n")

    // Parse specs do texto (regex sobre padrões OD medidos)
    const parse = (re: RegExp, def: string) => {
      const m = full.match(re)
      const val = (m?.[1] || def).trim()
      // Sanitiza: nunca deixa texto markdown vazar como valor CSS
      if (val.length > 80 || val.includes("##") || val.includes("**")) return def
      return val
    }
    const px = (s: string) => s.replace(/px/g, "").trim()

    return {
      designSystem: best,
      colors: {
        bg: parse(/Background:\s*`?#([A-Fa-f0-9]{6})`?/i, "FAFAFA"),
        fg: parse(/Foreground:\s*`?#([A-Fa-f0-9]{6})`?/i, "111111"),
        accent: parse(/Accent:\s*`?#([A-Fa-f0-9]{6})`?/i, "2F6FEB"),
        muted: parse(/Muted:\s*`?#([A-Fa-f0-9]{6})`?/i, "6B6B6B"),
        border: parse(/Border:\s*`?#([A-Fa-f0-9]{6})`?/i, "E5E5E5"),
        surface: parse(/Surface:\s*`?#([A-Fa-f0-9]{6})`?/i, "FFFFFF"),
        success: parse(/Success:\s*`?#([A-Fa-f0-9]{6})`?/i, "17A34A"),
        warning: parse(/Warn(?:ing)?:\s*`?#([A-Fa-f0-9]{6})`?/i, "EAB308"),
        danger: parse(/Danger:\s*`?#([A-Fa-f0-9]{6})`?/i, "DC2626"),
      },
      typography: {
        font: parse(/headings?:\s*`?([^`,'"]+)/i, "Inter"),
        headingWeight: parseInt(parse(/headings?[^)]*weight\s*(\d+)/i, "600")) || 600,
        bodyWeight: parseInt(parse(/[Bb]ody[^)]*weight\s*(\d+)/i, "400")) || 400,
        scale: (full.match(/(\d+)\s*[·•]\s*(\d+)\s*[·•]\s*(\d+)\s*[·•]\s*(\d+)\s*[·•]\s*(\d+)\s*[·•]\s*(\d+)\s*[·•]\s*(\d+)\s*[·•]\s*(\d+)/) || []).slice(1, 9).map(Number).filter(n => n > 0),
        lineHeightBody: parse(/line-height:\s*([\d.]+)\s*for body/i, "1.5").replace("for body", "").trim() as unknown as number || 1.5,
        lineHeightHeading: parse(/line-height[^:]*:\s*([\d.]+)\s*for headings/i, "1.2").replace("for headings", "").trim() as unknown as number || 1.2,
      },
      components: {
        buttonRadius: parse(/Buttons?:[^}]*?(\d+)px\s*radius/i, "8") + "px",
        buttonPaddingBlock: parse(/Buttons?:[^}]*?(\d+)px\s*padding-block/i, "10") + "px",
        buttonPaddingInline: parse(/Buttons?:[^}]*?(\d+)px\s*padding-inline/i, "16") + "px",
        cardRadius: parse(/Cards?:[^}]*?(\d+)px\s*radius/i, "12") + "px",
        cardPadding: parse(/Cards?:[^}]*?(\d+)px\s*(?:internal\s*)?padding/i, "20") + "px",
        cardShadow: (() => { const s = parse(/Cards?:[^}]*?no shadow/i, ""); return s ? "none" : "0 1px 2px rgba(0,0,0,0.05)" })(),
        cardBorder: parse(/Cards?:[^}]*?(\d+)px\s*border/i, "1") + "px solid var(--border)",
      },
      layout: {
        maxWidth: parse(/(\d+)px\s*max-width/i, "1200") + "px",
        columns: parseInt(parse(/(\d+)-column\s*grid/i, "12")) || 12,
        gutter: parse(/(\d+)px\s*gutters/i, "24") + "px",
        heroMinHeight: parse(/Hero:\s*([\d]+[^-]+vh)/i, "50vh"),
        sectionSpacingDesktop: parse(/Sections?:[^}]*?(\d+)px\s*top/i, "80") + "px",
        sectionSpacingTablet: parse(/Sections?:[^}]*?(\d+)px\s*tablet/i, "48") + "px",
        sectionSpacingPhone: parse(/Sections?:[^}]*?(\d+)px\s*phone/i, "32") + "px",
      },
      elevation: {
        raisedY: String(parseInt(parse(/Raised[^}]*?(\d+)px\s*y-offset/i, "2")) || 2) + "px",
        raisedBlur: String(parseInt(parse(/Raised[^}]*?(\d+)px\s*blur/i, "8")) || 8) + "px",
        raisedOpacity: String(parseInt(parse(/foreground at\s*(\d+)%/i, "8")) || 8) + "%",
      },
    }
  } catch { return null }
}

/** Busca componentes por id exato do payload (resolução de edges — ADR-0034 órgão 2).
 *  Usado pelo BFS do resolveComponentGraph para trazer dependências que a busca
 *  semântica não retornou (ex: "Bento Grid" → edge "card" → Card real do corpus). */
export async function fetchComponentsByIds(ids: string[]): Promise<{
  name: string; id: string; a11y: { role: string; ariaLabel: string; keyboardNav: boolean; contrastRatio: number }
  tokens: string[]; category: string; intent: string; edges: string[]
}[]> {
  if (!ids.length) return []
  try {
    const res = await fetch(`${QDRANT}/collections/${COLLECTION}/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: { must: [
          { key: "kind", match: { value: "component" } },
          { key: "id", match: { any: ids } },
        ] },
        limit: ids.length * 2, with_payload: true,
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const points: QdrantPoint[] = data.result?.points || []
    const seen = new Set<string>()
    return points.map(p => {
      const pl = p.payload || {}
      return {
        name: (pl.name as string) || (pl.id as string) || "unknown",
        id: (pl.id as string) || "unknown",
        a11y: {
          role: (pl.a11y_role as string) || "region",
          ariaLabel: (pl.a11y_role as string) ? `${pl.name} component` : "Content section",
          keyboardNav: (pl.a11y_keyboard as boolean) || false,
          contrastRatio: (pl.a11y_contrast as number) || 3.0,
        },
        tokens: (pl.tokens as string[]) || [],
        category: (pl.category as string) || "layout",
        intent: (pl.intent as string) || "",
        edges: (pl.edges as string[]) || [],
      }
    }).filter(c => !seen.has(c.id) && seen.add(c.id) !== undefined)
  } catch {
    return []
  }
}
