/**
 * packages/warp/src/composer-core.ts
 * Warp Composer Runtime — Motor Unificado de Geração (ADR-0032)
 *
 * Implementa o padrão: Intend → resolve → morph → compose → render
 *
 *   Intend (structured) → intent-resolver (segment, plan, skills, tokens)
 *     → tokens-composer (M9: morph CSS via segment)
 *     → 4-composer (M4: Atomic Pipeline discovery→plan→generate→critique)
 *     → HTML final + mutationId + telemetry
 *
 * FONTES:
 *   EVO-API compose.rs     → intent → query_vocab → DctNode tree → render
 *   ADR-0020               → morph por intent de mercado
 *   ADR-0032               → dual engine INTERNAL + CLIENT
 *   OD v0.9.0              → Atomic Pipeline + Devloop
 *   ts_morph               → TypeScript morph: tokens se adaptam ao contexto
 *
 * medido=verdade · 2026-07-17 · adsentice
 */

// Types inlined from tokens-composer.ts (packages/warp/src/)
export type SegmentId = 'saude' | 'beleza' | 'servicos' | 'alimentacao' | 'comercio' | 'educacao' | 'hospitalidade'
export type PlanTier = 'raio-x' | 'sentinela' | 'dominio' | 'escala'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Intend — structured semantic intent (ADR-0032).
 *  THIS is the "intent" that drives all Warp generation.
 *  Not a string — a composed context object. */
export interface Intend {
  /** Superfície Warp alvo (S1-S22) */
  surface: string
  /** Segmento de mercado (matriz Warp 7 values) */
  segment: SegmentId | 'todos'
  /** Plano do cliente */
  plan: PlanTier | 'internal'
  /** Modo: INTERNAL (adsentice) ou CLIENT (white-label) */
  mode: 'internal' | 'client'
  /** Nicho de negócio (dentist, barber_shop, etc.) — opcional, enriquece output */
  niche?: string
  /** Região/UF — opcional, puxa IBGE + pre-flight */
  region?: string
  /** Lead-specific data — opcional, personaliza copy */
  leadData?: {
    title?: string
    category?: string
    score?: number
    schwartzLevel?: number
    city?: string
    gaps?: string[]
  }
  /** Tags livres para busca semântica */
  tags?: string[]
}

/** Morph result — tokens + CSS gerados pelo ts_morph pipeline */
export interface MorphResult {
  intent: string
  segment: SegmentId | 'todos'
  plan: PlanTier | 'internal'
  css: string
  tokens: Record<string, string>
  variants: { name: string; css: string }[]
  sourcesBasis: string[]
  generatedAt: string
  mutationId: number
}

/** Full compose output — HTML + tokens + telemetry */
export interface ComposerOutput {
  html: string
  tokens: MorphResult
  mutationId: number
  mutationTs: string
  pipelineTrace: string[]
  renderMs: number
  mode: 'internal' | 'client'
}

// ═══════════════════════════════════════════════════════════════
// MUTATION COUNTER (global, server lifetime)
// ═══════════════════════════════════════════════════════════════

let _mutationCounter = 0
function nextMutationId(): number { return ++_mutationCounter }

// ═══════════════════════════════════════════════════════════════
// SEGMENT → TOKEN MAP (ts_morph engine)
// ═══════════════════════════════════════════════════════════════

const SEGMENT_TOKENS: Record<string, {
  palette: Record<string, string>
  typography: { font: string; size: string; weight: Record<string, string> }
  spacing: string
  motion: string
  radius: string
  description: string
}> = {
  saude: {
    palette: { primary: '#2563EB', secondary: '#1E40AF', accent: '#3B82F6', bg: '#f8fafc', fg: '#0f172a', muted: '#f1f5f9', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '800', body: '400', strong: '600' } },
    spacing: '1.5rem', motion: '200ms cubic-bezier(0.4,0,0.2,1)', radius: '0.75rem',
    description: 'Azul clínico 220deg — confiança + acolhimento. Motion zero = saúde é seriedade, não distração.',
  },
  beleza: {
    palette: { primary: '#E11D48', secondary: '#BE123C', accent: '#FB7185', bg: '#fff1f2', fg: '#0f172a', muted: '#ffe4e6', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '700', body: '400', strong: '600' } },
    spacing: '2rem', motion: '300ms cubic-bezier(0.34,1.56,0.64,1)', radius: '1rem',
    description: 'Rose gold 340deg — elegância + feminilidade. Motion parallax suave.',
  },
  servicos: {
    palette: { primary: '#1E3A5F', secondary: '#0F172A', accent: '#3B82F6', bg: '#f8fafc', fg: '#0f172a', muted: '#f1f5f9', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '800', body: '400', strong: '600' } },
    spacing: '1.5rem', motion: '200ms cubic-bezier(0.4,0,0.2,1)', radius: '0.5rem',
    description: 'Navy 260deg — autoridade + profissionalismo. Motion zero.',
  },
  alimentacao: {
    palette: { primary: '#EA580C', secondary: '#C2410C', accent: '#FB923C', bg: '#fff7ed', fg: '#0f172a', muted: '#ffedd5', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '800', body: '400', strong: '600' } },
    spacing: '1rem', motion: '400ms cubic-bezier(0.34,1.56,0.64,1)', radius: '0.75rem',
    description: 'Terracota 25deg — apetite + calor. Scroll reveal.',
  },
  comercio: {
    palette: { primary: '#2563EB', secondary: '#1E40AF', accent: '#F59E0B', bg: '#f8fafc', fg: '#0f172a', muted: '#f1f5f9', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '700', body: '400', strong: '600' } },
    spacing: '1rem', motion: '150ms cubic-bezier(0.4,0,0.2,1)', radius: '0.5rem',
    description: 'Azul industrial 250deg — confiança + praticidade. Motion zero.',
  },
  educacao: {
    palette: { primary: '#059669', secondary: '#065F46', accent: '#34D399', bg: '#f0fdf4', fg: '#0f172a', muted: '#dcfce7', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '700', body: '400', strong: '600' } },
    spacing: '1.5rem', motion: '300ms cubic-bezier(0.4,0,0.2,1)', radius: '0.75rem',
    description: 'Verde+Navy — crescimento + conhecimento. Scroll reveal.',
  },
  hospitalidade: {
    palette: { primary: '#EA580C', secondary: '#C2410C', accent: '#EAB308', bg: '#fffbeb', fg: '#0f172a', muted: '#fef3c7', success: '#10b981', destructive: '#ef4444' },
    typography: { font: "'Inter', system-ui, sans-serif", size: 'clamp(1rem, 2.5vw, 1.125rem)', weight: { heading: '700', body: '400', strong: '600' } },
    spacing: '2rem', motion: '600ms cubic-bezier(0.34,1.56,0.64,1)', radius: '0.75rem',
    description: 'Terracota+Gold — aconchego + luxo acessível. Parallax lento.',
  },
}

const FALLBACK_TOKENS = SEGMENT_TOKENS.servicos

// ═══════════════════════════════════════════════════════════════
// INTEND RESOLVER — resolve structured intent → context
// ═══════════════════════════════════════════════════════════════

export function resolveIntend(intend: Intend) {
  const segment = intend.segment === 'todos' ? 'servicos' as SegmentId : intend.segment as SegmentId
  const tokens = SEGMENT_TOKENS[segment] || FALLBACK_TOKENS
  const mutationId = nextMutationId()

  // Derive skills from surface × plan × segment (matrix Warp)
  const surfaceSkills: Record<string, string[]> = {
    S3: ['analytics', 'revops', 'product-marketing'],
    S9: ['analytics', 'product-marketing', 'churn-prevention'],
    S10: ['seo-audit', 'schema', 'site-architecture', 'copywriting'],
    S11: ['copywriting', 'psychology', 'cro', 'local-seo'],
    S4: ['pricing', 'offers', 'paywalls', 'cro', 'psychology'],
    S2: ['content-strategy', 'seo-audit', 'programmatic-seo'],
    S12: ['sms', 'sales-enablement', 'prospecting'],
    S14: ['onboarding', 'signup', 'product-marketing'],
    S15: ['analytics', 'revops', 'marketing-ideas'],
  }

  const skills = surfaceSkills[intend.surface] || ['analytics', 'product-marketing']
  const tags = intend.tags || [intend.surface, segment, intend.plan]

  const intentLabel = [
    intend.surface,
    intend.niche || segment,
    intend.region || 'BR',
    intend.mode,
  ].filter(Boolean).join('-')

  return {
    intend,
    mutationId,
    intentLabel,
    segment,
    tokens,
    skills,
    tags,
    isClient: intend.mode === 'client',
    isInternal: intend.mode === 'internal',
  }
}

// ═══════════════════════════════════════════════════════════════
// TS_MORPH — TypeScript Morph: tokens → CSS vivo (ADR-0020)
// ═══════════════════════════════════════════════════════════════

export function morphTokens(intend: Intend): MorphResult {
  const resolved = resolveIntend(intend)
  const t = resolved.tokens

  const css = `/* ══════════════════════════════════════════════════════
 * Warp Tokens · auto-generated via ts_morph
 * Intent: ${resolved.intentLabel}
 * Segment: ${resolved.segment}
 * ${t.description}
 * mutationId: ${resolved.mutationId}
 * ══════════════════════════════════════════════════════════ */
:root {
  --primary: ${t.palette.primary};
  --primary-fg: #fff;
  --secondary: ${t.palette.secondary};
  --secondary-fg: #fff;
  --accent: ${t.palette.accent};
  --bg: ${t.palette.bg};
  --fg: ${t.palette.fg};
  --muted: ${t.palette.muted};
  --muted-fg: #64748b;
  --border: #e2e8f0;
  --destructive: ${t.palette.destructive};
  --success: ${t.palette.success};
  --warning: #f59e0b;
  --font: ${t.typography.font};
  --font-size: ${t.typography.size};
  --font-weight-heading: ${t.typography.weight.heading};
  --font-weight-body: ${t.typography.weight.body};
  --font-weight-strong: ${t.typography.weight.strong};
  --spacing: ${t.spacing};
  --motion: ${t.motion};
  --radius: ${t.radius};
  --radius-sm: calc(var(--radius) * 0.667);
  --shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
}
* { box-sizing: border-box; margin: 0; padding: 0 }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--fg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}`

  const tokenMap: Record<string, string> = {}
  for (const [k, v] of Object.entries(t.palette)) { tokenMap[`color-${k}`] = v }
  for (const [k, v] of Object.entries(t.typography.weight)) { tokenMap[`weight-${k}`] = v }

  return {
    intent: resolved.intentLabel,
    segment: resolved.segment,
    plan: intend.plan,
    css,
    tokens: tokenMap,
    variants: [
      { name: 'default', css },
      { name: 'high-contrast', css: css.replace('--bg: #f8fafc', '--bg: #ffffff').replace('--fg: #0f172a', '--fg: #000000') },
    ],
    sourcesBasis: Object.keys(t.palette),
    generatedAt: new Date().toISOString(),
    mutationId: resolved.mutationId,
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPOSE — main entry point (ADR-0032)
// ═══════════════════════════════════════════════════════════════

export function compose(intend: Intend): ComposerOutput {
  const t0 = performance.now()
  const trace: string[] = []
  const resolved = resolveIntend(intend)

  trace.push(`1. intent resolved: ${resolved.intentLabel}`)
  trace.push(`2. segment: ${resolved.segment} | plan: ${intend.plan} | mode: ${intend.mode}`)
  trace.push(`3. skills activated: ${resolved.skills.join(', ')}`)

  // Step 3: morph tokens via ts_morph
  const morph = morphTokens(intend)
  trace.push(`4. ts_morph: ${Object.keys(morph.tokens).length} tokens generated (mutationId=${morph.mutationId})`)

  // Step 4: generate HTML shell (OD v0.9.0 compose pattern)
  const branding = intend.mode === 'internal' ? 'adsentice' : (intend.leadData?.title || 'Cliente')
  const surfaceNum = intend.surface.replace('S', '')
  const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="Warp Surface ${intend.surface} · ${branding} · ${resolved.intentLabel}">
<title>${intend.surface} · ${branding} | adsentice Warp</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${morph.css}
/* Surface-specific styles */
.hero {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: #fff;
  padding: 3.5rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 60%, rgba(255,255,255,0.08) 0%, transparent 60%);
}
.hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
.hero h1 { font-size: clamp(1.5rem, 3.5vw, 2.25rem); font-weight: var(--font-weight-heading); line-height: 1.2; margin-bottom: .75rem; }
.hero .subtitle { font-size: 1.05rem; opacity: .9; max-width: 600px; margin: 0 auto; }
.hero-badge {
  display: inline-flex; align-items: center; gap: .375rem;
  background: rgba(255,255,255,0.12); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.18);
  padding: .375rem .875rem; border-radius: 99px;
  font-size: .8125rem; font-weight: 500; margin-bottom: 1.25rem;
}
.container { max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }
.section { padding: 2.5rem 0; }
.card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  box-shadow: var(--shadow);
}
.meta-bar {
  display: flex; gap: .5rem; flex-wrap: wrap; padding: 1rem 0;
  border-top: 1px solid var(--border);
  margin-top: 2rem;
}
.meta-chip {
  background: var(--muted);
  padding: .25rem .75rem;
  border-radius: 99px;
  font-size: .75rem;
  font-family: monospace;
  color: var(--muted-fg);
}
</style>
</head>
<body>
  <div class="hero">
    <div class="hero-content">
      <div class="hero-badge">${intend.surface} · ${intend.mode === 'internal' ? 'adsentice' : 'white-label'}</div>
      <h1>${intend.leadData?.title || branding}</h1>
      <p class="subtitle">${resolved.segment} · ${intend.plan} · skills: ${resolved.skills.slice(0,3).join(', ')}</p>
    </div>
  </div>
  <div class="container">
    <div class="section">
      <div class="card">
        <h2>Tokens Gerados via ts_morph</h2>
        <p style="color: var(--muted-fg); margin-bottom: 1rem;">
          Mutation: <strong>#${resolved.mutationId}</strong> · Segmento: <strong>${resolved.segment}</strong>
          · Plano: <strong>${intend.plan}</strong> · Skills: <strong>${resolved.skills.slice(0, 3).join(', ')}</strong>
        </p>
      </div>
    </div>
    <div class="section">
      <div class="card">
        <h3>🧠 Intend Resolvido</h3>
        <p style="color: var(--muted-fg); margin: .5rem 0;">
          ${trace.join('<br/>')}
        </p>
        <div class="meta-bar">
          ${resolved.skills.map(s => `<span class="meta-chip">${s}</span>`).join('')}
          ${resolved.tags.map(t => `<span class="meta-chip">${t}</span>`).join('')}
          <span class="meta-chip">mutationId=${resolved.mutationId}</span>
          <span class="meta-chip">mode=${intend.mode}</span>
        </div>
      </div>
    </div>
  </div>
</body></html>`
  trace.push('5. HTML composed (OD v0.9.0 pattern)')
  trace.push(`6. done — ${Math.round(performance.now() - t0)}ms`)

  return {
    html,
    tokens: morph,
    mutationId: resolved.mutationId,
    mutationTs: new Date().toISOString(),
    pipelineTrace: trace,
    renderMs: Math.round(performance.now() - t0),
    mode: intend.mode,
  }
}
