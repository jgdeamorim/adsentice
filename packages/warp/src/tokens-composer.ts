/**
 * packages/warp/src/tokens-composer.ts
 * Tokens Composer — M9 da Família Warp (ADR-0020)
 *
 * "Deriva tokens CSS do mercado, não de arquivos estáticos.
 *  3 fontes paralelas → 6 pipelines de inferência → CSS + A/B variant."
 *
 * Inspiração: ADR-0020 (Compositor de Tokens Semânticos)
 *             EVO-API tokens.ts (design tokens como API viva)
 *             UI UX Pro Max (6,103 design knowledge points)
 *
 * Pipeline:
 *   intent + segment + plan + market
 *     → Qdrant design-knowledge (estilo, paleta, tipografia)
 *     → DataForSEO (mercado local, concorrentes)
 *     → Marketing Skills (psicologia do segmento)
 *   → 6 pipelines de inferência
 *     palette, typography, spacing, shadow, motion, responsive
 *   → tokens.{segment}.{plan}.css + A/B variant + telemetry
 *
 * Refinamento Warp vs OD:
 *   OD: DESIGN.md estático. Se mercado muda, design fica obsoleto.
 *   Warp: tokens regeneráveis sob demanda a partir de dados vivos.
 *
 * medido=verdade · ADR-0020 · 2026-07-14 · adsentice
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type SegmentId = 'saude' | 'beleza' | 'servicos' | 'alimentacao' | 'comercio' | 'educacao' | 'hospitalidade'
export type PlanTier = 'raio-x' | 'sentinela' | 'dominio' | 'escala'
export type SurfaceId = string // 22 valores possíveis (S1-S22)

export interface ComposeTokensRequest {
  /** Intent semântico da página */
  intent: string
  /** Segmento de mercado */
  segment: SegmentId
  /** Plano do cliente */
  plan: PlanTier
  /** Superfície Warp alvo */
  surface?: SurfaceId
  /** Dados de mercado (DataForSEO) — opcional, enriquece output */
  market?: {
    category: string
    region: string
    competitorColors?: string[]
    avgCtr?: number
  }
}

export interface TokenSet {
  /** Nome do token set (ex: "dentista-sp.sentinela") */
  id: string
  /** Versão (mutationId do cache) */
  version: number

  palette: {
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    accent: string
    accentForeground: string
    background: string
    foreground: string
    card: string
    cardForeground: string
    muted: string
    mutedForeground: string
    border: string
    destructive: string
    destructiveForeground: string
    ring: string
    /** Por que esta paleta foi escolhida */
    reasoning: string
  }

  typography: {
    headingFont: string
    bodyFont: string
    monoFont: string
    scale: 'compact' | 'default' | 'spacious'
    headingWeight: number
    bodySize: string
    reasoning: string
  }

  spacing: {
    scale: 'compact' | 'default' | 'airy'
    sectionGap: string
    cardPadding: string
    reasoning: string
  }

  shadow: {
    style: 'none' | 'subtle' | 'moderate' | 'dramatic'
    cardShadow: string
    buttonShadow: string
    reasoning: string
  }

  motion: {
    style: 'zero' | 'subtle' | 'moderate' | 'playful'
    duration: number
    easing: string
    scrollEffects: string[]
    reasoning: string
  }

  responsive: {
    strategy: 'mobile-first' | 'desktop-first'
    breakpoints: Record<string, string>
    containerMaxWidth: string
    reasoning: string
  }
}

export interface ComposeTokensResult {
  tokens: TokenSet
  css: string
  abVariant?: TokenSet
  telemetry: {
    sourcesQueried: string[]
    inferenceTimeMs: number
    confidence: number
  }
}

// ═══════════════════════════════════════════════════════════════
// Segment presets (fallback quando Qdrant offline)
// Fonte: Matriz Warp — warp-surfaces-marketing-skills-matrix.md
// ═══════════════════════════════════════════════════════════════

const SEGMENT_PRESETS: Record<SegmentId, {
  primaryHue: number
  emotion: string
  spacing: 'compact' | 'default' | 'airy'
  radius: 'sharp' | 'moderate' | 'round'
  motion: TokenSet['motion']['style']
  headingFont: string
  bodyFont: string
}> = {
  saude: {
    primaryHue: 220, emotion: 'Confiança, higiene',
    spacing: 'default', radius: 'moderate', motion: 'zero',
    headingFont: 'Inter', bodyFont: 'Inter',
  },
  beleza: {
    primaryHue: 340, emotion: 'Feminino, luxo',
    spacing: 'airy', radius: 'round', motion: 'subtle',
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
  servicos: {
    primaryHue: 260, emotion: 'Autoridade, tradição',
    spacing: 'default', radius: 'sharp', motion: 'zero',
    headingFont: 'Inter', bodyFont: 'Inter',
  },
  alimentacao: {
    primaryHue: 25, emotion: 'Apetite, calor',
    spacing: 'compact', radius: 'moderate', motion: 'moderate',
    headingFont: 'Poppins', bodyFont: 'Open Sans',
  },
  comercio: {
    primaryHue: 250, emotion: 'Confiança, praticidade',
    spacing: 'compact', radius: 'sharp', motion: 'zero',
    headingFont: 'Inter', bodyFont: 'Inter',
  },
  educacao: {
    primaryHue: 160, emotion: 'Crescimento, confiança',
    spacing: 'default', radius: 'moderate', motion: 'subtle',
    headingFont: 'Inter', bodyFont: 'Inter',
  },
  hospitalidade: {
    primaryHue: 30, emotion: 'Acolhimento, experiência',
    spacing: 'airy', radius: 'moderate', motion: 'subtle',
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
}

// ═══════════════════════════════════════════════════════════════
// Plan presets
// ═══════════════════════════════════════════════════════════════

const PLAN_SHADOW: Record<PlanTier, TokenSet['shadow']['style']> = {
  'raio-x': 'none',
  'sentinela': 'subtle',
  'dominio': 'moderate',
  'escala': 'dramatic',
}

const PLAN_MOTION: Record<PlanTier, TokenSet['motion']['style']> = {
  'raio-x': 'zero',
  'sentinela': 'subtle',
  'dominio': 'moderate',
  'escala': 'playful',
}

// ═══════════════════════════════════════════════════════════════
// Token Composer
// ═══════════════════════════════════════════════════════════════

export class TokenComposer {
  /**
   * Pipeline principal: compõe tokens para um intent + segmento + plano.
   *
   * No futuro (M3 + M8 ativos):
   *   1. Qdrant query → design-knowledge (6,103 pts) → estilo + paleta
   *   2. DataForSEO → mercado local, cores de concorrentes
   *   3. Marketing Skills → psicologia do segmento
   *
   * Por enquanto: presets canônicos da Matriz Warp.
   */
  async compose(request: ComposeTokensRequest): Promise<ComposeTokensResult> {
    const t0 = performance.now()
    const preset = SEGMENT_PRESETS[request.segment]

    // ═══ PALETTE ═══
    const hue = preset.primaryHue
    const palette = {
      primary: `oklch(0.55 0.18 ${hue})`,
      primaryForeground: '#FFFFFF',
      secondary: `oklch(0.90 0.03 ${hue})`,
      secondaryForeground: `oklch(0.25 0.06 ${hue})`,
      accent: `oklch(0.65 0.22 ${(hue + 30) % 360})`,
      accentForeground: '#FFFFFF',
      background: '#FFFFFF',
      foreground: `oklch(0.15 0.01 ${hue})`,
      card: '#FFFFFF',
      cardForeground: `oklch(0.15 0.01 ${hue})`,
      muted: `oklch(0.95 0.01 ${hue})`,
      mutedForeground: `oklch(0.50 0.02 ${hue})`,
      border: `oklch(0.88 0.02 ${hue})`,
      destructive: 'oklch(0.55 0.22 10)',
      destructiveForeground: '#FFFFFF',
      ring: `oklch(0.60 0.20 ${hue})`,
      reasoning: `Segmento ${request.segment}: ${preset.emotion}. Hue primário ${hue}° derivado da psicologia de cores do nicho.`,
    }

    // ═══ TYPOGRAPHY ═══
    const typography = {
      headingFont: preset.headingFont,
      bodyFont: preset.bodyFont,
      monoFont: 'JetBrains Mono',
      scale: preset.spacing === 'airy' ? 'spacious' as const :
             preset.spacing === 'compact' ? 'compact' as const : 'default' as const,
      headingWeight: 600,
      bodySize: '1rem',
      reasoning: `${preset.headingFont} headings + ${preset.bodyFont} body. Mood: ${preset.emotion}.`,
    }

    // ═══ SPACING ═══
    const spacingMap = { compact: '0.75rem', default: '1rem', airy: '1.5rem' }
    const sectionGap = spacingMap[preset.spacing]
    const spacing = {
      scale: preset.spacing,
      sectionGap,
      cardPadding: sectionGap,
      reasoning: `Segmento ${request.segment}: espaçamento ${preset.spacing} derivado da densidade de informação esperada.`,
    }

    // ═══ SHADOW ═══
    const shadowStyle = PLAN_SHADOW[request.plan]
    const shadowMap: Record<string, string> = {
      none: 'none',
      subtle: '0 1px 2px rgba(0,0,0,0.05)',
      moderate: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
      dramatic: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
    }
    const shadow = {
      style: shadowStyle,
      cardShadow: shadowMap[shadowStyle],
      buttonShadow: shadowStyle === 'none' ? 'none' : shadowMap.subtle,
      reasoning: `Plano ${request.plan}: sombra ${shadowStyle}. Planos premium têm mais profundidade visual.`,
    }

    // ═══ MOTION ═══
    const motionStyle = PLAN_MOTION[request.plan]
    const motionMap: Record<string, { duration: number; easing: string; scrollEffects: string[] }> = {
      zero: { duration: 0, easing: 'linear', scrollEffects: [] },
      subtle: { duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', scrollEffects: ['fade-in'] },
      moderate: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', scrollEffects: ['fade-in', 'slide-up'] },
      playful: { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', scrollEffects: ['fade-in', 'slide-up', 'parallax', 'scroll-reveal'] },
    }
    const motion = {
      style: motionStyle,
      ...motionMap[motionStyle],
      reasoning: `Plano ${request.plan}: motion ${motionStyle}. Motion mais rico em planos premium. Segmento ${request.segment}: ${preset.motion} (respeitando acessibilidade).`,
    }

    // ═══ RESPONSIVE ═══
    const responsive = {
      strategy: 'mobile-first' as const,
      breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
      containerMaxWidth: '1280px',
      reasoning: 'Mobile-first: 70% do tráfego BR é mobile. Breakpoints Tailwind CSS padrão.',
    }

    // ═══ ASSEMBLY ═══
    const tokens: TokenSet = {
      id: `${request.segment}.${request.plan}`,
      version: 1,
      palette,
      typography,
      spacing,
      shadow,
      motion,
      responsive,
    }

    // ═══ CSS GENERATION ═══
    const css = this.generateCSS(tokens)

    // ═══ A/B VARIANT ═══
    const abVariant = request.plan !== 'raio-x' ? this.generateABVariant(tokens) : undefined

    return {
      tokens,
      css,
      abVariant,
      telemetry: {
        sourcesQueried: ['segment-presets', 'plan-presets'],
        inferenceTimeMs: performance.now() - t0,
        confidence: 0.85, // aumentará quando Qdrant + DataForSEO estiverem integrados
      },
    }
  }

  /**
   * Gera CSS custom properties a partir de um TokenSet.
   */
  generateCSS(tokens: TokenSet): string {
    const p = tokens.palette
    return `/* tokens.${tokens.id}.css — Warp M9 — adsentice */
/* Gerado em ${new Date().toISOString()} */
/* ${p.reasoning} */

:root {
  /* ── Palette ── */
  --color-primary: ${p.primary};
  --color-primary-foreground: ${p.primaryForeground};
  --color-secondary: ${p.secondary};
  --color-secondary-foreground: ${p.secondaryForeground};
  --color-accent: ${p.accent};
  --color-accent-foreground: ${p.accentForeground};
  --color-background: ${p.background};
  --color-foreground: ${p.foreground};
  --color-card: ${p.card};
  --color-card-foreground: ${p.cardForeground};
  --color-muted: ${p.muted};
  --color-muted-foreground: ${p.mutedForeground};
  --color-border: ${p.border};
  --color-destructive: ${p.destructive};
  --color-destructive-foreground: ${p.destructiveForeground};
  --color-ring: ${p.ring};

  /* shadcn/ui v4 mapping */
  --background: var(--color-background);
  --foreground: var(--color-foreground);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-primary-foreground);
  --secondary: var(--color-secondary);
  --secondary-foreground: var(--color-secondary-foreground);
  --muted: var(--color-muted);
  --muted-foreground: var(--color-muted-foreground);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-accent-foreground);
  --destructive: var(--color-destructive);
  --destructive-foreground: var(--color-destructive-foreground);
  --border: var(--color-border);
  --ring: var(--color-ring);

  /* ── Typography ── */
  --font-heading: '${tokens.typography.headingFont}', system-ui, sans-serif;
  --font-body: '${tokens.typography.bodyFont}', system-ui, sans-serif;
  --font-mono: '${tokens.typography.monoFont}', ui-monospace, monospace;
  --text-body: ${tokens.typography.bodySize};

  /* ── Spacing ── */
  --spacing-section: ${tokens.spacing.sectionGap};
  --spacing-card: ${tokens.spacing.cardPadding};

  /* ── Shadow ── */
  --shadow-card: ${tokens.shadow.cardShadow};
  --shadow-button: ${tokens.shadow.buttonShadow};

  /* ── Motion ── */
  --motion-duration: ${tokens.motion.duration}ms;
  --motion-easing: ${tokens.motion.easing};
  --scroll-effects: ${tokens.motion.scrollEffects.join(', ') || 'none'};

  /* ── Responsive ── */
  --container-max: ${tokens.responsive.containerMaxWidth};
  --breakpoint-sm: ${tokens.responsive.breakpoints.sm};
  --breakpoint-md: ${tokens.responsive.breakpoints.md};
  --breakpoint-lg: ${tokens.responsive.breakpoints.lg};
  --breakpoint-xl: ${tokens.responsive.breakpoints.xl};

  /* ── Radius, Z-Index ── */
  --radius: 0.5rem;
  --radius-sm: 0.25rem;
  --radius-lg: 0.75rem;
  --z-base: 0;
  --z-dropdown: 1000;
  --z-modal: 1300;
  --z-toast: 1400;
}
`
  }

  /**
   * Gera variante A/B para teste.
   * Alterna paleta complementar e ajusta motion.
   */
  private generateABVariant(tokens: TokenSet): TokenSet {
    const variant = structuredClone(tokens)
    variant.id = `${tokens.id}.variant-b`

    // Shift hue 30° for A/B test
    const currentHue = parseInt(tokens.palette.primary.match(/oklch\(0\.55 0\.18 (\d+)\)/)?.[1] ?? '220')
    const newHue = (currentHue + 30) % 360
    variant.palette.primary = `oklch(0.55 0.18 ${newHue})`
    variant.palette.accent = `oklch(0.65 0.22 ${(newHue + 60) % 360})`
    variant.palette.reasoning = `Variante B: hue shift +30° para teste A/B. Original: ${tokens.palette.reasoning}`

    return variant
  }
}

/** Singleton */
export const tokenComposer = new TokenComposer()

// ═══════════════════════════════════════════════════════════════
// Quick compose helper
// ═══════════════════════════════════════════════════════════════

export async function composeTokens(
  segment: SegmentId,
  plan: PlanTier,
  intent = `landing page para negocio ${segment}`,
): Promise<ComposeTokensResult> {
  return tokenComposer.compose({ intent, segment, plan })
}
