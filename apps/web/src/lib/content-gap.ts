// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Content Gap Analyzer v0.5
// Classifies content maturity from existing L2 on-page + tech data.
// Pure scoring module — zero new API calls (uses data already in L2).
// Source: Corey Haines content-strategy skill (marketingskills)
// ══════════════════════════════════════════════════════════════════

import "server-only"

import type { ScoringInput } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface ContentMaturityLevel {
  level: 0 | 1 | 2 | 3 | 4
  label: "Invisivel" | "Basico" | "Presente" | "Estruturado" | "Maduro"
  colorHex: string
  action: string
}

export interface ContentGapResult {
  maturity: ContentMaturityLevel
  painScore: number              // 0-100 pain (higher = more gaps)
  maturityScore: number          // 0-100 inverted (higher = better)
  signals: {
    c1_thin_content: boolean
    c2_missing_metadata: boolean
    c3_poor_architecture: boolean
    c4_technology_gap: boolean
    c5_no_content_strategy: boolean
  }
  gapsDetected: string[]         // signal IDs that fired (C1, C2, ...)
  gapsAbsent: string[]           // signal IDs that did NOT fire
}

export interface ContentGapRecommendation {
  priority: "alta" | "media" | "baixa"
  category: "conteudo" | "seo_tecnico" | "arquitetura" | "estrategia"
  title: string
  description: string
  effort: "minutos" | "horas" | "dias" | "semanas"
  antiPattern?: string
}

interface SEOFlags {
  has_sitemap: boolean
  has_robots: boolean
  has_schema: boolean
  has_h1: boolean
  has_alt_tags: boolean
  has_canonical: boolean
  has_ssl: boolean
  has_meta_viewport: boolean
  has_doctype: boolean
}

// ── Constants ─────────────────────────────────────────────────

export const CONTENT_MATURITY_LEVELS: Record<number, Omit<ContentMaturityLevel, "level">> = {
  0: {
    label: "Invisivel", colorHex: "#9e9e9e",
    action: "Criar site com 3+ paginas e conteudo 500+ palavras. Comecar com Home, Servicos, Contato.",
  },
  1: {
    label: "Basico", colorHex: "#42a5f5",
    action: "Expandir conteudo existente para 500+ palavras por pagina. Adicionar meta tags e Google Analytics.",
  },
  2: {
    label: "Presente", colorHex: "#ffa726",
    action: "Organizar conteudo em 3-5 pilares tematicos. Criar estrutura de links internos entre paginas relacionadas.",
  },
  3: {
    label: "Estruturado", colorHex: "#ef5350",
    action: "Adicionar blog com artigos de 800+ palavras sobre duvidas dos clientes. Implementar schema JSON-LD LocalBusiness.",
  },
  4: {
    label: "Maduro", colorHex: "#4caf50",
    action: "Auditar conteudo dos concorrentes. Identificar topicos que eles cobrem e voce nao. Otimizar para featured snippets.",
  },
}

/** Content pain max raw = 10+8+8+5+8 = 39 */
const MAX_CONTENT_PAIN = 39

// ── SEO Checks Parser ─────────────────────────────────────────

/** Parse l2_seo_checks JSONB for content-strategy relevant flags. */
export function parseSEOChecks(checks: Record<string, boolean | null> | null | undefined): SEOFlags {
  if (!checks) {
    return { has_sitemap: false, has_robots: false, has_schema: false, has_h1: false,
      has_alt_tags: false, has_canonical: false, has_ssl: false,
      has_meta_viewport: false, has_doctype: false }
  }

  // Normalize keys to lowercase for matching
  const c: Record<string, boolean | null> = {}
  for (const [k, v] of Object.entries(checks)) { c[k.toLowerCase()] = v }

  return {
    has_sitemap: !c.no_sitemap && !c.missing_sitemap && c.has_sitemap !== false,
    has_robots: !c.no_robots_txt && !c.missing_robots_txt && c.has_robots_txt !== false,
    has_schema: !c.no_jsonld_schema && !c.no_schema_org && c.has_jsonld_schema !== false,
    has_h1: !c.no_h1_tag && !c.missing_h1 && c.has_h1 !== false,
    has_alt_tags: !c.no_image_alt_tags && !c.missing_alt_tags && c.has_alt_tags !== false,
    has_canonical: !c.no_canonical && !c.no_canonical_tag && c.has_canonical !== false,
    has_ssl: !c.no_ssl && !c.no_https && c.has_ssl !== false,
    has_meta_viewport: !c.no_viewport && !c.no_meta_viewport && c.has_viewport !== false,
    has_doctype: !c.no_doctype && !c.missing_doctype && c.has_doctype !== false,
  }
}

// ── Content Gap Scoring ────────────────────────────────────────

/** Compute content maturity from existing L2 data. Zero new API calls. */
export function scoreContentGap(input: ScoringInput): ContentGapResult | null {
  // Only score if L2 data is present
  if (input.l2_onpage_score == null) return null

  const signals = { c1_thin_content: false, c2_missing_metadata: false,
    c3_poor_architecture: false, c4_technology_gap: false, c5_no_content_strategy: false }
  const gapsDetected: string[] = []
  const gapsAbsent: string[] = []
  let painRaw = 0

  // ── C1: Thin Content (10pts) ──
  const wordCount = input.l2_word_count ?? 0
  if (wordCount < 300) {
    painRaw += 10; signals.c1_thin_content = true; gapsDetected.push("C1")
  } else { gapsAbsent.push("C1") }

  // ── C2: Missing Metadata (8pts) ──
  if (!input.l2_has_title || !input.l2_has_description) {
    painRaw += 8; signals.c2_missing_metadata = true; gapsDetected.push("C2")
  } else { gapsAbsent.push("C2") }

  // ── C3: Poor Architecture (8pts) ──
  const internalLinks = input.l2_internal_links_count ?? 0
  const externalLinks = input.l2_external_links_count ?? 0
  if (internalLinks < 5 && externalLinks < 3) {
    painRaw += 8; signals.c3_poor_architecture = true; gapsDetected.push("C3")
  } else { gapsAbsent.push("C3") }

  // ── C4: Technology Gap (5pts) ──
  if (!input.l2_cms || input.l2_has_analytics === false) {
    painRaw += 5; signals.c4_technology_gap = true; gapsDetected.push("C4")
  } else { gapsAbsent.push("C4") }

  // ── C5: No Content Strategy (8pts) — ≥2 of {no_sitemap, no_robots, no_schema} ──
  const seoFlags = parseSEOChecks(input.l2_seo_checks)
  const infrastructureGaps = [seoFlags.has_sitemap, seoFlags.has_robots, seoFlags.has_schema]
    .filter(v => !v).length
  if (infrastructureGaps >= 2) {
    painRaw += 8; signals.c5_no_content_strategy = true; gapsDetected.push("C5")
  } else { gapsAbsent.push("C5") }

  const painScore = Math.round((painRaw / MAX_CONTENT_PAIN) * 100)
  const maturityScore = 100 - painScore
  const maturity = classifyContentMaturity(maturityScore)

  return { maturity, painScore, maturityScore, signals, gapsDetected, gapsAbsent }
}

/** Classify content maturity from maturity score (0-100). */
export function classifyContentMaturity(maturityScore: number): ContentMaturityLevel {
  let level: 0 | 1 | 2 | 3 | 4

  if (maturityScore >= 81) level = 4
  else if (maturityScore >= 61) level = 3
  else if (maturityScore >= 41) level = 2
  else if (maturityScore >= 21) level = 1
  else level = 0

  const def = CONTENT_MATURITY_LEVELS[level]
  return { level, ...def }
}

// ── Recommendation Generator ──────────────────────────────────

/** Generate actionable content gap recommendations from detected signals.
 *  Rule-engine based on content-strategy anti-patterns. Deterministic (no LLM). */
export function generateContentGapRecommendations(
  input: ScoringInput,
  result: ContentGapResult
): ContentGapRecommendation[] {
  const recs: ContentGapRecommendation[] = []
  const { signals: s, gapsDetected } = result

  // Anti-pattern: ALL 5 signals — complete rebuild needed
  if (gapsDetected.length >= 4) {
    recs.push({
      priority: "alta", category: "estrategia",
      title: "Reconstrucao da Arquitetura de Conteudo",
      description: "Todas as dimensoes de conteudo precisam de atencao. Comece criando uma pagina de Servicos com 500+ palavras, meta title/description, e links internos para Home e Contato. Depois adicione Google Analytics e Search Console.",
      effort: "semanas",
      antiPattern: "All-five gap",
    })
    return recs
  }

  // ── C1: Thin Content → single-page site anti-pattern ──
  if (s.c1_thin_content) {
    recs.push({
      priority: "alta", category: "conteudo",
      title: "Expandir Conteudo para 500+ Palavras",
      description: input.l2_word_count != null
        ? `Sua pagina tem apenas ${input.l2_word_count} palavras. Google precisa de pelo menos 300 palavras para entender o tema da pagina. Expanda o texto descrevendo seus servicos, area de atuacao e diferenciais.`
        : "Pagina sem conteudo textual detectado. Adicione descricao dos seus servicos, area de atuacao, e diferenciais competitivos.",
      effort: "horas",
      antiPattern: input.l2_cms ? undefined : "Single-page site",
    })
  }

  // ── C2: Missing Metadata → no-CTE anti-pattern ──
  if (s.c2_missing_metadata) {
    const missing: string[] = []
    if (!input.l2_has_title) missing.push("meta title (50-60 caracteres)")
    if (!input.l2_has_description) missing.push("meta description (150-160 caracteres)")

    recs.push({
      priority: "alta", category: "seo_tecnico",
      title: "Adicionar Meta Tags com Call-to-Action",
      description: `Faltam: ${missing.join(" e ")}. O meta title aparece no Google como titulo do seu link. A meta description e o texto abaixo. Sem elas, o Google improvisa — e geralmente piora seu clique. Inclua o nome da cidade e um CTA como \"Agende sua consulta\"."`,
      effort: "minutos",
      antiPattern: "No-CTE site",
    })
  }

  // ── C3: Poor Architecture → orphaned blog anti-pattern ──
  if (s.c3_poor_architecture) {
    if (!s.c1_thin_content) {
      // Has content but no architecture → orphaned content
      recs.push({
        priority: "media", category: "arquitetura",
        title: "Criar Estrutura de Links Internos",
        description: `Seu site tem conteudo (${input.l2_word_count} palavras) mas apenas ${input.l2_internal_links_count ?? 0} links internos. Cada pagina deve linkar para outras paginas relevantes. Crie uma navegacao clara: Home → Servicos → Blog → Contato.`,
        effort: "horas",
        antiPattern: "Orphaned blog",
      })
    } else {
      recs.push({
        priority: "alta", category: "arquitetura",
        title: "Estruturar Site com Multiplas Paginas",
        description: `Apenas ${input.l2_internal_links_count ?? 0} links internos detectados. Crie pelo menos 3 paginas (Home, Servicos, Contato) com navegacao clara entre elas. Cada pagina deve ter seu proprio meta title.`,
        effort: "dias",
        antiPattern: "Single-page site",
      })
    }
  }

  // ── C4: Technology Gap → tech debt ──
  if (s.c4_technology_gap) {
    if (!input.l2_cms) {
      recs.push({
        priority: "media", category: "seo_tecnico",
        title: "Identificar ou Migrar CMS",
        description: "Nao foi possivel detectar o sistema de gerenciamento de conteudo (CMS). Se o site for HTML estatico, considere migrar para WordPress ou Webflow para facilitar atualizacoes de conteudo.",
        effort: "dias",
        antiPattern: "No CMS",
      })
    }
    if (input.l2_has_analytics === false) {
      recs.push({
        priority: "alta", category: "seo_tecnico",
        title: "Instalar Google Analytics 4 e Search Console",
        description: "Sem Analytics, voce nao sabe quantas pessoas visitam seu site, de onde vem, ou quais paginas convertem. Instale GA4 (gratuito) e conecte ao Google Search Console para ver quais keywords trazem trafego.",
        effort: "minutos",
        antiPattern: "Tech debt",
      })
    }
  }

  // ── C5: No Content Strategy → ghost town ──
  if (s.c5_no_content_strategy) {
    const missingInfra: string[] = []
    const flags = parseSEOChecks(input.l2_seo_checks)
    if (!flags.has_sitemap) missingInfra.push("sitemap.xml")
    if (!flags.has_robots) missingInfra.push("robots.txt")
    if (!flags.has_schema) missingInfra.push("Schema JSON-LD LocalBusiness")

    recs.push({
      priority: "media", category: "estrategia",
      title: "Criar Infraestrutura Basica de SEO",
      description: `Faltam: ${missingInfra.join(", ")}. Esses arquivos ajudam o Google a entender e indexar seu site. O schema LocalBusiness faz seu negocio aparecer em rich results com estrelas, endereco e telefone.`,
      effort: "horas",
      antiPattern: "Ghost town",
    })

    // Additional blog recommendation for structured sites
    if (!s.c1_thin_content && !s.c3_poor_architecture) {
      recs.push({
        priority: "media", category: "conteudo",
        title: "Iniciar Blog com Artigos Baseados em Duvidas de Clientes",
        description: "Sua arquitetura esta boa mas falta estrategia de conteudo recorrente. Comece um blog com 2-3 artigos por mes respondendo as 10 perguntas mais frequentes dos seus clientes. Use o formato: \"[Pergunta do cliente]? Guia completo [ano]\".",
        effort: "horas",
      })
    }
  }

  // Ensure at least 3 recommendations by adding strategic ones when gaps are few
  if (recs.length < 2 && !s.c1_thin_content && !s.c3_poor_architecture) {
    recs.push({
      priority: "baixa", category: "conteudo",
      title: "Auditar Conteudo dos Concorrentes Locais",
      description: "Seu site tem uma base solida. Para ir ao proximo nivel, analise o que os concorrentes locais estao publicando. Identifique topicos que eles cobrem e voce nao — esses sao seus gaps de conteudo.",
      effort: "horas",
    })
  }

  return recs.sort((a, b) => {
    const order = { alta: 0, media: 1, baixa: 2 }
    return order[a.priority] - order[b.priority]
  })
}
