/**
 * packages/warp/src/tokens-unifier.ts
 * Unificador de Design Tokens — ADR-0036 Arquitetura Vencedora
 *
 * 3 fontes de tokens, 1 saída canônica por superfície.
 * O SurfaceSpecialist decide qual fonte usar para cada token.
 *
 * FONTES:
 *   segmentPalette() → oklch dinâmico por mercado (hue 220=saúde, 340=beleza...)
 *   Materio Qdrant   → spacing(8), shadows(4), motion(4), radius(4), typo(3), palette(13)
 *   OD design-system → cores (bg/fg/card/border), layout (max-width, hero, sections), componentes (card/button radius/padding)
 *
 * REGRAS (medido=verdade):
 *   primary/secondary/accent → SEMPRE oklch do segmento (NUNCA fixo)
 *   bg/fg/card/border → OD system (fallback: Materio)
 *   muted/muted-fg → Materio surface-alt + #475569 (NUNCA OD muted como cor de texto)
 *   shadows sm/md/lg → Materio NEUTRO (nunca sh-coral para lg)
 *   spacing → Materio 8 níveis ordenados
 *   motion → Materio
 *   radius → OD componentes (card/button)
 *   font → Materio
 *   layout → OD (container, hero, sections)
 *   destructive/success/warning → OD (P0 spec) ou fallback
 *
 * medido=verdade · 2026-07-18 · adsentice
 */

export interface UnifiedTokens {
  // ── PALETA (segmentPalette) ──
  primary: string; primaryFg: string
  secondary: string; secondaryFg: string
  accent: string
  // ── SUPERFÍCIE (OD → Materio fallback) ──
  bg: string; fg: string; card: string
  muted: string; mutedFg: string; border: string
  // ── SEMÂNTICAS (OD P0) ──
  destructive: string; success: string; warning: string
  // ── TIPOGRAFIA (Materio) ──
  font: string; fontDisplay: string
  // ── SPACING (Materio, ordenado menor→maior) ──
  spacing: string[]  // 8 níveis: xs→xxxl
  // ── SHADOWS (Materio neutro) ──
  shadowSm: string; shadowMd: string; shadowLg: string
  // ── MOTION (Materio) ──
  motionFast: string; motion: string; motionSmooth: string
  // ── RADIUS (OD componentes → Materio fallback) ──
  radius: string; radiusSm: string; radiusPill: string
  // ── LAYOUT (OD) ──
  heroMinHeight: string
  containerMaxWidth: string; containerGutter: string
  sectionSpacing: string; sectionSpacingTablet: string; sectionSpacingPhone: string
  // ── COMPONENTS (OD) ──
  cardPadding: string; cardBorder: string; cardShadow: string
  buttonPaddingBlock: string; buttonPaddingInline: string; buttonRadius: string
  // ── META ──
  designSystem: string
}

interface ODSystem {
  designSystem: string
  colors: { bg: string; fg: string; accent: string; muted: string; border: string; surface: string; success: string; warning: string; danger: string }
  layout: { maxWidth: string; columns: number; gutter: string; heroMinHeight: string; sectionSpacingDesktop: string; sectionSpacingTablet: string; sectionSpacingPhone: string }
  components: { buttonRadius: string; buttonPaddingBlock: string; buttonPaddingInline: string; cardRadius: string; cardPadding: string; cardShadow: string; cardBorder: string }
}

interface MaterioTokens {
  spacing: string[]; shadows: string[]; motion: string[]; radius: string[]
  typography: { body: string; display: string; mono: string }
  palette: Record<string, string>
}

/**
 * Unifica tokens de 3 fontes para 1 saída canônica.
 * As regras são DETERMINÍSTICAS — o vec() informa, não decide.
 */
export function unifyTokens(
  segment: string,
  palette: { primary: string; secondary: string; accent: string },
  odSystem: ODSystem | null,
  materio: MaterioTokens | null,
  surface?: string,
): UnifiedTokens {
  // ═══ SHADOWS: Materio neutro. NUNCA sh-coral para lg ═══
  const shadowNeutral = (shadows: string[] | undefined, idx: number, fallback: string) => {
    const val = shadows?.[idx]
    return (val && !val.includes("rgba(249") && !val.includes("coral")) ? val : fallback
  }
  const shadowSm = shadowNeutral(materio?.shadows, 0, "0 1px 2px rgba(0,0,0,0.05)")
  const shadowMd = shadowNeutral(materio?.shadows, 1, "0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)")
  const shadowLg = shadowNeutral(materio?.shadows, 2, "0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1)")

  // ═══ CARD SHADOW: OD spec, fallback shadowSm se "none" ═══
  const cardShadow = odSystem?.components?.cardShadow === "none" ? "none" : shadowSm

  return {
    // PALETA — SEMPRE oklch do segmento
    primary: palette.primary, primaryFg: "#fff",
    secondary: palette.secondary, secondaryFg: "#fff",
    accent: palette.accent,

    // SUPERFÍCIE — OD → Materio → hardcoded fallback
    bg: odSystem?.colors?.bg ? `#${odSystem.colors.bg}` : (materio?.palette?.["surface"] || "#f8fafc"),
    fg: odSystem?.colors?.fg ? `#${odSystem.colors.fg}` : "#0f172a",
    card: odSystem?.colors?.surface ? `#${odSystem.colors.surface}` : "#ffffff",
    muted: materio?.palette?.["surface-alt"] || "#f1f5f9",
    mutedFg: "#475569",  // NUNCA usa OD muted como cor de texto
    border: odSystem?.colors?.border ? `#${odSystem.colors.border}` : "#e2e8f0",

    // SEMÂNTICAS
    destructive: odSystem?.colors?.danger ? `#${odSystem.colors.danger}` : "#ef4444",
    success: odSystem?.colors?.success ? `#${odSystem.colors.success}` : "#10b981",
    warning: odSystem?.colors?.warning ? `#${odSystem.colors.warning}` : "#f59e0b",

    // TIPOGRAFIA — Materio
    font: materio?.typography?.body || "Inter",
    fontDisplay: materio?.typography?.display || "Plus Jakarta Sans",

    // SPACING — Materio ordenado
    spacing: materio?.spacing || ["0.25rem","0.5rem","0.75rem","1rem","1.25rem","1.5rem","1.75rem","2rem"],

    // SHADOWS — Materio neutro
    shadowSm, shadowMd, shadowLg,

    // MOTION — Materio
    motionFast: materio?.motion?.[0] || "150ms ease",
    motion: materio?.motion?.[1] || "300ms ease",
    motionSmooth: materio?.motion?.[2] || "500ms ease",

    // RADIUS — OD → Materio
    radius: odSystem?.components?.cardRadius || "0.75rem",
    radiusSm: materio?.radius?.[0] || "0.25rem",
    radiusPill: materio?.radius?.[0] === "9999px" ? "9999px" : (materio?.radius?.find((r: string) => r === "9999px") || "9999px"),

    // LAYOUT — OD
    heroMinHeight: odSystem?.layout?.heroMinHeight || "50vh",
    containerMaxWidth: odSystem?.layout?.maxWidth || (surface === "S10" ? "860px" : "1200px"),
    containerGutter: odSystem?.layout?.gutter || "1.5rem",
    sectionSpacing: odSystem?.layout?.sectionSpacingDesktop || (surface === "S10" ? "2.5rem" : "80px"),
    sectionSpacingTablet: odSystem?.layout?.sectionSpacingTablet || "48px",
    sectionSpacingPhone: odSystem?.layout?.sectionSpacingPhone || "32px",

    // COMPONENTS — OD
    cardPadding: odSystem?.components?.cardPadding || (surface === "S10" ? "2rem" : "20px"),
    cardBorder: odSystem?.components?.cardBorder?.replace("var(--border)", "var(--border)") || "1px solid var(--border)",
    cardShadow,
    buttonPaddingBlock: odSystem?.components?.buttonPaddingBlock || (surface === "S10" ? ".75rem" : "10px"),
    buttonPaddingInline: odSystem?.components?.buttonPaddingInline || (surface === "S10" ? "1.75rem" : "16px"),
    buttonRadius: odSystem?.components?.buttonRadius || (surface === "S10" ? "99px" : "8px"),

    // META
    designSystem: odSystem?.designSystem || "warp-default",
  }
}
