/**
 * packages/warp/src/marketing-kg.ts
 * Marketing Knowledge Graph — ADR-0037 Fase 1
 *
 * Consulta 40+ frameworks de marketing (Corey Haines + Kim Barrett)
 * do Qdrant adsentice-self (kind=marketing-skill) via vec() semantico.
 * Aplica ao contexto do lead para enriquecer gaps, copy e pitch.
 *
 * Pipeline:
 *   intent + segment + nicho
 *     → queryMarketingSkill(skillName) → framework text from Qdrant
 *     → applyFramework(framework, leadContext) → ActionPlan
 *     → composeS10_BLUE consome gaps + copy enriquecidos
 *
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

export interface ActionPlan {
  diagnosis: string       // Diagnóstico específico por nicho
  recommendation: string  // Recomendação acionável
  copyAngle: string       // Ângulo de copy (headline direction)
  objectionHandler: string // Como lidar com objeção típica
  confidence: number      // 0-1, score do vec()
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
// QUERY
// ═══════════════════════════════════════════════════════════════

/**
 * Query Qdrant for a marketing skill framework.
 * Uses semantic vec() search — returns best matching framework text.
 */
export async function queryMarketingSkill(
  skillName: string,
  context?: string,
): Promise<MarketingFramework | null> {
  try {
    const query = `${skillName} marketing framework ${context || ''}`
    const vec = await embedQuery(query)
    if (vec.length === 0) return null

    const results = await qdrantSearch(vec, {
      must: [
        { key: "kind", match: { value: "marketing-skill" } },
        { key: "source", match: { value: `marketingskills/${skillName}` } },
      ],
    }, 1)

    if (!results.length) {
      // Fallback: search without source filter
      const fallback = await qdrantSearch(vec, {
        must: [{ key: "kind", match: { value: "marketing-skill" } }],
      }, 1)
      if (!fallback.length) return null
      const pl = fallback[0].payload || {}
      return {
        skillName: (pl.source as string)?.replace("marketingskills/", "") || skillName,
        source: (pl.source as string) || "unknown",
        content: (pl.text as string) || "",
        score: fallback[0].score || 0,
      }
    }

    const pl = results[0].payload || {}
    return {
      skillName,
      source: (pl.source as string) || "",
      content: (pl.text as string) || "",
      score: results[0].score || 0,
    }
  } catch { return null }
}

/**
 * Batch query multiple marketing skills relevant to a lead context.
 * Returns ranked frameworks by semantic match score.
 */
export async function queryRelevantSkills(
  leadContext: LeadContext,
): Promise<MarketingFramework[]> {
  const relevantSkills: string[] = []

  // ── COPYWRITING (always relevant for S10 Raio-X) ──
  relevantSkills.push("copywriting")

  // ── SEO AUDIT (if lead has website) ──
  if (leadContext.hasWebsite) {
    relevantSkills.push("seo-audit")
    relevantSkills.push("site-architecture")
    relevantSkills.push("schema")
  }

  // ── PROSPECTING (market opportunity) ──
  if (leadContext.competitorCount > 5) {
    relevantSkills.push("competitors")
    relevantSkills.push("prospecting")
  }

  // ── CRO (if score low — conversion opportunity) ──
  if (leadContext.score < 50) {
    relevantSkills.push("cro")
    relevantSkills.push("lead-magnets")
  }

  // ── PRICING (always relevant for plan match) ──
  relevantSkills.push("pricing")

  // ── MARKETING PSYCHOLOGY (Schwartz + persona) ──
  relevantSkills.push("marketing-psychology")

  // ── UNIQUE: dedup, query all ──
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

// ═══════════════════════════════════════════════════════════════
// APPLY
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a marketing framework to a lead context.
 * Derives diagnosis, recommendation, copy angle, and objection handler.
 */
export function applyFramework(
  framework: MarketingFramework,
  leadContext: LeadContext,
): ActionPlan {
  const content = framework.content.toLowerCase()
  const name = leadContext.businessName
  const cat = leadContext.category
  const city = leadContext.district || leadContext.city
  const score = leadContext.score
  const rating = leadContext.rating

  // ── Derive action plan from framework text + lead context ──
  const diagnosis = extractDiagnosis(content, leadContext)
  const recommendation = extractRecommendation(content, leadContext)
  const copyAngle = deriveCopyAngle(framework.skillName, leadContext)
  const objectionHandler = deriveObjectionHandler(framework.skillName, leadContext)

  return {
    diagnosis,
    recommendation,
    copyAngle,
    objectionHandler,
    confidence: framework.score,
  }
}

// ═══════════════════════════════════════════════════════════════
// HEURISTIC DERIVATION (L0 regex — no LLM, EVO-API pattern)
// ═══════════════════════════════════════════════════════════════

function extractDiagnosis(content: string, ctx: LeadContext): string {
  const name = ctx.businessName
  const city = ctx.district || ctx.city
  const score = ctx.score

  if (content.includes("seo") && ctx.hasWebsite) {
    return `O site de ${name} em ${city} precisa de auditoria SEO — score atual ${score}/100. Otimização on-page pode aumentar visibilidade em 3-6 meses.`
  }
  if (content.includes("cro") || content.includes("conversion")) {
    return `${name} tem ${ctx.rating}★ mas score digital ${score}/100 — os pacientes confiam no atendimento mas não encontram a clínica online. Gap de conversão digital.`
  }
  if (content.includes("competitor")) {
    const comp = ctx.competitorCount
    return `${name} compete com ${comp} negócios similares em ${city}. A maioria ignora marketing digital — quem aparecer primeiro no Google leva o paciente.`
  }
  if (content.includes("psychology") || content.includes("schwartz")) {
    const level = ctx.schwartzLevel
    return `${name} está no nível "${level}" de consciência de mercado. ${level === 'Unaware' ? 'Eduque sobre o problema antes de oferecer solução.' : level === 'Problem Aware' ? 'Mostre o caminho — o problema já é reconhecido.' : 'Diferencie pela qualidade — o lead já conhece as soluções.'}`
  }
  return `${name} tem potencial de crescimento digital em ${city}. Score atual: ${score}/100.`
}

function extractRecommendation(content: string, ctx: LeadContext): string {
  if (content.includes("seo")) return "Auditoria SEO completa (gratuita na primeira análise). Revela schema, meta tags, velocidade e backlinks."
  if (content.includes("schema")) return "Adicionar JSON-LD LocalBusiness com avaliações, endereço e telefone para rich results no Google."
  if (content.includes("site-architecture")) return "Revisar arquitetura do site: sitemap, robots.txt, estrutura de URLs, mobile-first."
  if (content.includes("lead-magnet")) return "Oferecer diagnóstico gratuito (Raio-X) como lead magnet — o lead recebe valor antes de decidir."
  if (content.includes("pricing")) return "Alinhar ticket ao perfil do lead: score e maturidade digital definem o plano ideal (Raio-X R$0, Sentinela R$197, Domínio R$497)."
  if (content.includes("cro")) return "Otimizar call-to-action: botão de WhatsApp visível, formulário curto, prova social (avaliações) acima da dobra."
  return `Agendar diagnóstico gratuito para ${ctx.businessName} e descobrir oportunidades específicas.`
}

function deriveCopyAngle(skillName: string, ctx: LeadContext): string {
  const name = ctx.businessName
  const city = ctx.district || ctx.city
  const score = ctx.score

  const angles: Record<string, string> = {
    copywriting: `${name}: ${score < 50 ? `${ctx.rating}★ no Google, mas invisível online — descubra por quê` : `Potencial de crescimento digital em ${city} — diagnóstico em 30 segundos`}`,
    "seo-audit": `Seu site está escondido no Google? 90% dos clientes pesquisam online antes de comprar. Diagnóstico gratuito.`,
    competitors: `${ctx.competitorCount} concorrentes em ${city}. Apenas 3 têm site otimizado. Seja o primeiro.`,
    pricing: `Diagnóstico gratuito. Planos a partir de R$197/mês — menos que 1 paciente por mês.`,
    "lead-magnets": `Raio-X gratuito: descubra em 30 segundos por que seus clientes não te encontram no Google.`,
    "marketing-psychology": `Você sabia que ${score < 40 ? 'a maioria dos seus clientes nem sabe que precisa de você?' : 'seus clientes já te procuram — mas não te encontram?'}`,
  }
  return angles[skillName] || angles.copywriting || `${name} — diagnóstico gratuito em ${city}`
}

function deriveObjectionHandler(skillName: string, ctx: LeadContext): string {
  const name = ctx.businessName

  const handlers: Record<string, string> = {
    pricing: `"É caro?" — O plano Sentinela custa R$197/mês. Isso é menos que 1 paciente. Se trouxer 1 paciente por mês, já se pagou 10x.`,
    copywriting: `"Já tenho site" — Mas seu score é ${ctx.score}/100. Ter site não é suficiente — precisa ser encontrado.`,
    "seo-audit": `"SEO demora" — Os primeiros resultados (schema, GMB, meta tags) aparecem em dias. O diagnóstico é gratuito.`,
    competitors: `"Meus concorrentes não fazem isso" — Exatamente. Quem fizer primeiro, leva o mercado.`,
  }
  return handlers[skillName] || `"Não tenho tempo" — O diagnóstico leva 30 segundos. Os gaps são priorizados — você resolve um por vez.`
}