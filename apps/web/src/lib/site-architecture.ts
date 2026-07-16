// ══════════════════════════════════════════════════════════════════
// ADSENTICE · Site Architecture Analyzer v0.4
// Skill: site-architecture (Corey Haines) — URL patterns, orphan detection
// Pure scoring module — zero new API calls (uses existing L2 data).
// ══════════════════════════════════════════════════════════════════

import "server-only"
import type { ScoringInput } from "./scoring"

// ── Types ─────────────────────────────────────────────────────

export interface ArchitectureMaturityLevel {
  level: 0 | 1 | 2 | 3 | 4
  label: "Caotico" | "Plano" | "Navegavel" | "Estruturado" | "Otimizado"
  colorHex: string
  action: string
}

export interface ArchitectureResult {
  maturity: ArchitectureMaturityLevel
  painScore: number
  maturityScore: number
  signals: {
    a1_flat_structure: boolean
    a2_orphan_risk: boolean
    a3_no_navigation: boolean
    a4_deep_nesting: boolean
  }
  gapsDetected: string[]
  gapsAbsent: string[]
  internalLinks: number
  externalLinks: number
}

// ── Constants ─────────────────────────────────────────────────

export const ARCHITECTURE_MATURITY_LEVELS: Record<number, Omit<ArchitectureMaturityLevel, "level">> = {
  0: { label: "Caotico", colorHex: "#9e9e9e", action: "Criar estrutura basica de navegacao com Home, Servicos e Contato. Adicionar menu com links internos." },
  1: { label: "Plano", colorHex: "#42a5f5", action: "Adicionar links entre paginas relacionadas. Criar pelo menos 5 links internos contextuais." },
  2: { label: "Navegavel", colorHex: "#ffa726", action: "Organizar paginas em hierarquia de 2 niveis. Adicionar breadcrumbs. Verificar paginas orfas." },
  3: { label: "Estruturado", colorHex: "#ef5350", action: "Implementar silos de conteudo. Cada secao do site deve ter pagina pilar com sub-paginas linkadas." },
  4: { label: "Otimizado", colorHex: "#4caf50", action: "Auditar anchor text dos links internos. Otimizar distribuicao de link juice para paginas de alta conversao." },
}

const MAX_PAIN = 25 // A1(8) + A2(7) + A3(5) + A4(5)

// ── Anti-Patterns ─────────────────────────────────────────────

export interface ArchitectureAntiPattern {
  name: string
  description: string
  fix: string
}

/** Detect anti-patterns from architecture signals. */
export function detectArchitectureAntiPatterns(result: ArchitectureResult): ArchitectureAntiPattern[] {
  const patterns: ArchitectureAntiPattern[] = []
  const { signals: s, internalLinks, externalLinks } = result

  if (s.a1_flat_structure && s.a3_no_navigation) {
    patterns.push({ name: "Single-Page Site", description: "Apenas uma pagina detectada — Google nao tem o que indexar.", fix: "Criar pelo menos 3 paginas: Home, Servicos e Contato. Cada uma com meta tags proprias." })
  } else if (s.a2_orphan_risk && !s.a1_flat_structure) {
    patterns.push({ name: "Orphaned Content", description: "Conteudo existe mas nao esta linkado ao resto do site.", fix: "Adicionar links do menu principal e de paginas relacionadas para o conteudo orfao." })
  }

  if (internalLinks === 0 && externalLinks === 0) {
    patterns.push({ name: "Isolated Page", description: "Pagina sem nenhum link — nem interno nem externo.", fix: "Adicionar menu de navegacao. Linkar para redes sociais e Google Maps." })
  }

  if (s.a4_deep_nesting) {
    patterns.push({ name: "Deep URL Nesting", description: "URLs com 4+ niveis de profundidade.", fix: "Achatar estrutura para no maximo 2-3 niveis." })
  }

  
return patterns
}

// ── Scoring ───────────────────────────────────────────────────

/** Score site architecture from existing L2 data. */
export function scoreArchitecture(input: ScoringInput): ArchitectureResult | null {
  if (input.l2_onpage_score == null) return null

  const internalLinks = input.l2_internal_links_count ?? 0
  const externalLinks = input.l2_external_links_count ?? 0
  const images = input.l2_images_count ?? 0
  const wordCount = input.l2_word_count ?? 0

  const signals = { a1_flat_structure: false, a2_orphan_risk: false,
    a3_no_navigation: false, a4_deep_nesting: false }

  const gapsDetected: string[] = []
  const gapsAbsent: string[] = []
  let painRaw = 0

  // A1: Flat Structure — single page or no internal links (8pts)
  if (internalLinks < 3 && wordCount > 0) {
    painRaw += 8; signals.a1_flat_structure = true; gapsDetected.push("A1")
  } else { gapsAbsent.push("A1") }

  // A2: Orphan Page Risk — has content but very few internal links (7pts)
  if (wordCount >= 500 && internalLinks < 5 && internalLinks > 0) {
    painRaw += 7; signals.a2_orphan_risk = true; gapsDetected.push("A2")
  } else { gapsAbsent.push("A2") }

  // A3: No Navigation — zero internal links + few external (5pts)
  if (internalLinks === 0 && externalLinks < 2) {
    painRaw += 5; signals.a3_no_navigation = true; gapsDetected.push("A3")
  } else { gapsAbsent.push("A3") }

  // A4: Content-Only Layout — images < 3 suggests all-text page (5pts)
  if (wordCount >= 300 && images < 3) {
    painRaw += 5; signals.a4_deep_nesting = true; gapsDetected.push("A4")
  } else { gapsAbsent.push("A4") }

  const painScore = Math.round((painRaw / MAX_PAIN) * 100)
  const maturityScore = 100 - painScore
  const maturity = classifyArchitectureMaturity(maturityScore)

  return { maturity, painScore, maturityScore, signals, gapsDetected, gapsAbsent, internalLinks, externalLinks }
}

/** Classify architecture maturity from 0-100 score. */
export function classifyArchitectureMaturity(maturityScore: number): ArchitectureMaturityLevel {
  let level: 0 | 1 | 2 | 3 | 4

  if (maturityScore >= 81) level = 4
  else if (maturityScore >= 61) level = 3
  else if (maturityScore >= 41) level = 2
  else if (maturityScore >= 21) level = 1
  else level = 0
  const def = ARCHITECTURE_MATURITY_LEVELS[level]

  
return { level, ...def }
}
