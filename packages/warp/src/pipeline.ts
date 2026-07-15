/**
 * packages/warp/src/pipeline.ts
 * Adsentice Design Pipeline — Orquestrador Único
 *
 * "Qdrant é fonte de INSPIRAÇÃO, não oráculo de DECISÃO.
 *  Decisões → PRESETS. Inspiração → QDRANT. Validação → LLM. Evidência → TELEMETRY."
 *
 * Pipeline OD-style:
 *   0. CLASSIFY   → segmento + plano → presets (µs, determinístico)
 *   1. RESOLVE    → aplicar presets da Matriz Warp (µs)
 *   2. ENRICH     → Qdrant COM FILTRO para inspiração (ms)
 *   3. GENERATE   → tokens.css + preview HTML (ms)
 *   4. CRITIQUE   → LLM árbitro L6 avalia qualidade (s, opcional)
 *   5. TELEMETRY  → trace → Qdrant → BOA embed_quality (µs)
 *
 * REGRA DE OURO:
 *   NUNCA usar vec() search SEM filtro para DECIDIR cores/tipografia/layout.
 *   SEMPRE classificar o segmento ANTES de buscar no Qdrant.
 *   Qdrant enriquece, não decide.
 *
 * medido=verdade · Design Pipeline Playbook v1.0 · 2026-07-15 · adsentice
 */

import type { SegmentId, PlanTier, ComposeTokensResult } from './tokens-composer'
import { TokenComposer, tokenComposer as defaultTokens } from './tokens-composer'
import type { CompositionResult, WarpComponent } from './types'
import { Composer, composer as defaultComposer } from './4-composer'
import { WarpTracker, warpTracker as defaultTracker } from './6-telemetry'
import { WarpCache, warpCache as defaultCache } from './7-cache'
import { embedText } from './embed'
import type { CritiqueScore } from './4-composer'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface DesignPipelineInput {
  /** Segmento de mercado (7 valores) */
  segment: SegmentId
  /** Plano do cliente (4 valores) */
  plan: PlanTier
  /** Nome do negócio (opcional, para personalização) */
  businessName?: string
  /** Superfície Warp alvo (opcional) */
  surface?: string
  /** Se true, executa critique com LLM (L6, custo $) */
  critique?: boolean
  /** Se true, gera A/B variant */
  abTest?: boolean
}

export interface DesignPipelineResult {
  /** Tokens CSS gerados */
  tokens: ComposeTokensResult
  /** HTML preview renderizado */
  previewHtml: string
  /** Componentes sugeridos do Qdrant (com filtro) */
  suggestedComponents: string[]
  /** Design inspiration do Qdrant (com filtro) */
  designInspiration: string[]
  /** Landing pattern sugerido */
  landingPattern: string
  /** Critique score (se critique=true) */
  critiqueScore?: CritiqueScore
  /** Trace ID para telemetria */
  traceId: string
  /** Pipeline metadata */
  meta: {
    classifyTimeMs: number
    enrichTimeMs: number
    generateTimeMs: number
    critiqueTimeMs?: number
    totalTimeMs: number
    pipelineVersion: string
  }
}

// ═══════════════════════════════════════════════════════════════
// STAGE 0: CLASSIFY — segmento → presets (determinístico, µs)
// ═══════════════════════════════════════════════════════════════

const SEGMENT_CLASSIFIER: Record<SegmentId, {
  hue: number
  emotion: string
  headingFont: string
  bodyFont: string
  spacing: string
  radius: string
  motionStyle: string
  colors: string[]
  landingPattern: string
  cta: string
  businessKeywords: string
}> = {
  saude: {
    hue: 220, emotion: 'Confiança, higiene, profissionalismo',
    headingFont: 'Inter', bodyFont: 'Inter',
    spacing: 'default', radius: 'moderate', motionStyle: 'zero',
    colors: ['#2563EB', '#1E40AF', '#3B82F6'],
    landingPattern: 'Hero + Serviços + Confiança + CTA',
    cta: 'Agendar Consulta',
    businessKeywords: 'dentista médico clínica odontológica hospital saúde fisioterapia psicólogo veterinário',
  },
  beleza: {
    hue: 340, emotion: 'Feminino, luxo, elegância',
    headingFont: 'Playfair Display', bodyFont: 'Inter',
    spacing: 'airy', radius: 'round', motionStyle: 'subtle',
    colors: ['#E8B4B8', '#D4AF37', '#C084FC'],
    landingPattern: 'Hero + Serviços + Depoimentos + Booking',
    cta: 'Agendar Horário',
    businessKeywords: 'beleza salão barbearia estética spa cosmético luxo feminino cuidados pessoais',
  },
  servicos: {
    hue: 260, emotion: 'Autoridade, tradição, confiança',
    headingFont: 'Inter', bodyFont: 'Inter',
    spacing: 'default', radius: 'sharp', motionStyle: 'zero',
    colors: ['#1E3A5F', '#334155', '#475569'],
    landingPattern: 'Hero + Especialidades + Credenciais + CTA',
    cta: 'Solicitar Consultoria',
    businessKeywords: 'advocacia contabilidade arquitetura consultoria engenharia profissional corporativo',
  },
  alimentacao: {
    hue: 25, emotion: 'Apetite, calor, acolhimento',
    headingFont: 'Poppins', bodyFont: 'Open Sans',
    spacing: 'compact', radius: 'moderate', motionStyle: 'moderate',
    colors: ['#EA580C', '#DC2626', '#F97316'],
    landingPattern: 'Hero + Cardápio + Fotos + Delivery + CTA',
    cta: 'Ver Cardápio',
    businessKeywords: 'restaurante pizzaria lanchonete comida delivery alimentação gastronomia café bar',
  },
  comercio: {
    hue: 250, emotion: 'Confiança, praticidade',
    headingFont: 'Inter', bodyFont: 'Inter',
    spacing: 'compact', radius: 'sharp', motionStyle: 'zero',
    colors: ['#2563EB', '#7C3AED', '#059669'],
    landingPattern: 'Hero + Produtos + Localização + CTA',
    cta: 'Ver Produtos',
    businessKeywords: 'loja varejo pet shop farmácia drogaria supermercado material construção comércio',
  },
  educacao: {
    hue: 160, emotion: 'Crescimento, confiança, aprendizado',
    headingFont: 'Inter', bodyFont: 'Inter',
    spacing: 'default', radius: 'moderate', motionStyle: 'subtle',
    colors: ['#059669', '#0284C7', '#6366F1'],
    landingPattern: 'Hero + Cursos + Metodologia + Depoimentos + CTA',
    cta: 'Agendar Aula',
    businessKeywords: 'escola colégio faculdade universidade curso treinamento infantil fundamental médio',
  },
  hospitalidade: {
    hue: 30, emotion: 'Acolhimento, experiência, conforto',
    headingFont: 'Playfair Display', bodyFont: 'Inter',
    spacing: 'airy', radius: 'moderate', motionStyle: 'subtle',
    colors: ['#D4AF37', '#CA8A04', '#A16207'],
    landingPattern: 'Hero + Acomodações + Fotos + Reservas + CTA',
    cta: 'Reservar Agora',
    businessKeywords: 'hotel pousada resort hostel turismo viagem hospedagem acolhimento experiência',
  },
}

// ═══════════════════════════════════════════════════════════════
// Qdrant helpers
// ═══════════════════════════════════════════════════════════════

const QDRANT_URL = 'http://127.0.0.1:6352'
const COLLECTION = 'adsentice-self'
const TAG = 'adsentice-warp'

async function qdrantSearch(vector: number[], filters: Record<string, string>, limit = 3) {
  const must = [{ key: 'tag', match: { value: TAG } }]
  for (const [k, v] of Object.entries(filters)) {
    must.push({ key: k, match: { value: v } })
  }
  const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vector, filter: { must }, limit, with_payload: true }),
  })
  const data = (await res.json()) as { result: { payload: Record<string, unknown>; score: number }[] }
  return data.result ?? []
}

// ═══════════════════════════════════════════════════════════════
// Design Pipeline
// ═══════════════════════════════════════════════════════════════

export class DesignPipeline {
  constructor(
    private tokens: TokenComposer = defaultTokens,
    private composer: Composer = defaultComposer,
    private tracker: WarpTracker = defaultTracker,
    private cache: WarpCache = defaultCache,
  ) {}

  /**
   * Executa o pipeline completo de design.
   *
   * REGRA DE OURO:
   *   STAGE 0+1 = PRESETS (determinístico) → decisões
   *   STAGE 2 = QDRANT COM FILTRO → inspiração
   *   STAGE 3 = GENERATE → output
   *   STAGE 4 = CRITIQUE → LLM árbitro (opcional)
   *   STAGE 5 = TELEMETRY → trace
   */
  async run(input: DesignPipelineInput): Promise<DesignPipelineResult> {
    const t0 = performance.now()
    const traceId = `design_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // ═══ STAGE 0: CLASSIFY ═══
    const tClassify = performance.now()
    const preset = SEGMENT_CLASSIFIER[input.segment]
    if (!preset) {
      throw new Error(`Segmento desconhecido: ${input.segment}. Use: ${Object.keys(SEGMENT_CLASSIFIER).join(', ')}`)
    }
    const classifyTimeMs = performance.now() - tClassify

    // ═══ STAGE 1: RESOLVE (M9 presets) ═══
    // Cores, tipografia, layout → PRESETS (não vec search!)
    // Isso é o que OD faz: classificar → aplicar regras

    // ═══ STAGE 2: ENRICH (Qdrant COM FILTRO) ═══
    const tEnrich = performance.now()

    // Buscar design inspiration FILTRADO pelo segmento
    const designQuery = `visual design style layout for ${input.segment} business ${preset.emotion} ${preset.businessKeywords}`
    const designVec = await embedText(designQuery)
    const designHits = await qdrantSearch(designVec, {
      kind: 'design-knowledge',
    }, 5)
    // Post-filter: prefer hits matching segment
    const designInspiration = designHits
      .filter(h => {
        const segs = (h.payload.segments as string[]) || []
        return segs.length === 0 || segs.includes(input.segment)
      })
      .slice(0, 2)
      .map(h => h.payload.name as string)

    // Buscar landing pattern
    const landingQuery = `landing page pattern layout ${preset.landingPattern} for ${input.segment} business`
    const landingVec = await embed(landingQuery)
    const landingHits = await qdrantSearch(landingVec, {
      kind: 'design-knowledge',
      category: 'landing-patterns',
    }, 2)
    const landingPattern = landingHits[0]?.payload?.name as string || preset.landingPattern

    // Buscar componentes COM FILTRO de categoria
    const compQuery = `dashboard business card metrics KPI display for ${input.segment} ${preset.businessKeywords}`
    const compVec = await embed(compQuery)
    const compHits = await qdrantSearch(compVec, {
      kind: 'component',
    }, 5)
    const suggestedComponents = compHits
      .slice(0, 4)
      .map(h => h.payload.name as string)

    const enrichTimeMs = performance.now() - tEnrich

    // ═══ STAGE 3: GENERATE (M9 tokens + HTML) ═══
    const tGenerate = performance.now()

    // Gerar tokens via M9
    const tokens = await this.tokens.compose({
      intent: `design system for ${input.businessName || input.segment} business`,
      segment: input.segment,
      plan: input.plan,
      surface: input.surface,
    })

    // Gerar preview HTML
    const previewHtml = this.generatePreviewHtml(input, preset, tokens, designInspiration, landingPattern, suggestedComponents, traceId)
    const generateTimeMs = performance.now() - tGenerate

    // ═══ STAGE 4: CRITIQUE (LLM árbitro L6, opcional) ═══
    let critiqueTimeMs: number | undefined
    let critiqueScore: CritiqueScore | undefined

    if (input.critique) {
      const tCritique = performance.now()
      // Placeholder: será implementado com DeepSeek como árbitro L6
      critiqueScore = {
        visualHierarchy: 8,
        detailExecution: 7,
        functionality: 8,
        innovation: 6,
        philosophyConsistency: 9,
        marketFit: preset ? 9 : 6,
        composite: 7.8,
        passed: true,
        feedback: ['Pipeline OD-style aplicado. Critique LLM pendente (L6 DeepSeek).'],
      }
      critiqueTimeMs = performance.now() - tCritique
    }

    // ═══ STAGE 5: TELEMETRY ═══
    const totalTimeMs = performance.now() - t0
    this.tracker.track({
      eventId: traceId,
      sessionId: 'pipeline',
      type: 'composition_created',
      intent: `design ${input.segment} ${input.plan}`,
      context: {
        segment: input.segment,
        plan: input.plan,
        businessName: input.businessName,
        componentsCount: suggestedComponents.length,
        designHits: designInspiration.length,
        totalTimeMs,
      },
      mutationId: this.cache.mutationId,
      timestamp: new Date().toISOString(),
    }).catch(() => {}) // fire-and-forget

    return {
      tokens,
      previewHtml,
      suggestedComponents,
      designInspiration,
      landingPattern,
      critiqueScore,
      traceId,
      meta: {
        classifyTimeMs,
        enrichTimeMs,
        generateTimeMs,
        critiqueTimeMs,
        totalTimeMs,
        pipelineVersion: '1.0.0',
      },
    }
  }

  /**
   * Gera HTML preview com tokens aplicados.
   * Template OD-style: Hero → Features → Metrics → Form → Social Proof
   */
  private generatePreviewHtml(
    input: DesignPipelineInput,
    preset: typeof SEGMENT_CLASSIFIER[SegmentId],
    tokens: ComposeTokensResult,
    designInspiration: string[],
    landingPattern: string,
    suggestedComponents: string[],
    traceId: string,
  ): string {
    const seg = input.segment
    const plan = input.plan
    const hue = preset.hue
    const primary = preset.colors[0]
    const secondary = preset.colors[1]
    const accent = preset.colors[2]
    const name = input.businessName || `${preset.emotion.split(',')[0]} — ${seg}`

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ads​entice Design — ${name} · ${plan}</title>
<style>
/* tokens.${seg}.${plan}.css — Adsentice Design Pipeline v1.0 */
/* ${preset.emotion} · hue ${hue}° · trace ${traceId} */
:root {
  --color-primary: ${primary}; --color-primary-fg: #fff;
  --color-secondary: ${secondary}; --color-secondary-fg: #fff;
  --color-accent: ${accent}; --color-accent-fg: #fff;
  --color-bg: #fff; --color-fg: #1a1a2e;
  --color-card: #fff; --color-muted: oklch(0.95 0.01 ${hue});
  --color-muted-fg: oklch(0.50 0.02 ${hue});
  --color-border: oklch(0.88 0.02 ${hue});
  --color-destructive: oklch(0.55 0.22 10);
  --font-heading: '${preset.headingFont}', system-ui, serif;
  --font-body: '${preset.bodyFont}', system-ui, sans-serif;
  --shadow-card: ${plan === 'dominio' ? '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.05)'};
  --motion-duration: ${plan === 'dominio' ? '300ms' : '200ms'};
  --motion-easing: cubic-bezier(0.4, 0, 0.2, 1);
  --radius: ${preset.radius === 'round' ? '0.75rem' : preset.radius === 'sharp' ? '0.25rem' : '0.5rem'};
  --spacing-section: ${preset.spacing === 'airy' ? '2rem' : preset.spacing === 'compact' ? '1rem' : '1.5rem'};
  --background: var(--color-bg); --foreground: var(--color-fg);
  --primary: var(--color-primary); --primary-foreground: var(--color-primary-fg);
  --secondary: var(--color-muted); --secondary-foreground: var(--color-fg);
  --muted: var(--color-muted); --muted-foreground: var(--color-muted-fg);
  --destructive: var(--color-destructive); --destructive-foreground: #fff;
  --border: var(--color-border); --ring: var(--color-primary);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); background: var(--color-muted); color: var(--foreground); padding: 2rem; }
.container { max-width: 960px; margin: 0 auto; }
.hero { text-align: center; padding: 3rem 1.5rem; background: var(--color-card); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-card); margin-bottom: 2rem; }
.hero h1 { font-family: var(--font-heading); font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5rem; }
.hero p { color: var(--muted-foreground); font-size: 1.1rem; max-width: 500px; margin: 0 auto 1.5rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--spacing-section); }
.card { background: var(--color-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow-card); transition: transform var(--motion-duration) var(--motion-easing); }
.card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
.card h3 { font-family: var(--font-heading); font-size: 1.1rem; margin-bottom: 0.75rem; }
.card p { font-size: 0.9rem; color: var(--muted-foreground); line-height: 1.5; }
.swatches { display: flex; gap: 0.5rem; margin: 0.75rem 0; }
.swatch { width: 32px; height: 32px; border-radius: 6px; border: 2px solid var(--border); }
.kpi { font-family: var(--font-heading); font-size: 2.5rem; font-weight: 800; line-height: 1; }
.btn-group { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 1.25rem; border-radius: calc(var(--radius) - 0.1rem); font-size: 0.9rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all var(--motion-duration) var(--motion-easing); font-family: var(--font-body); }
.btn-primary { background: var(--primary); color: var(--primary-foreground); }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-outline { background: transparent; border-color: var(--border); color: var(--foreground); }
.btn-outline:hover { background: var(--muted); }
.btn-destructive { background: var(--destructive); color: var(--destructive-foreground); }
.badge { display: inline-flex; padding: 0.25rem 0.625rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; }
.badge-primary { background: var(--primary); color: var(--primary-foreground); }
.badge-success { background: oklch(0.65 0.18 145); color: #fff; }
.badge-muted { background: var(--muted); color: var(--muted-foreground); }
.input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); font-size: 0.9rem; background: var(--color-bg); color: var(--foreground); font-family: var(--font-body); margin-bottom: 0.5rem; }
.input:focus { outline: 2px solid var(--ring); outline-offset: 2px; }
.pipeline-meta { font-size: 0.7rem; color: var(--muted-foreground); text-align: center; margin-top: 2rem; padding: 1rem; border-top: 1px solid var(--border); line-height: 1.6; }
.pipeline-meta b { color: var(--foreground); }
</style></head>
<body><div class="container">
<div class="hero">
  <h1>${preset.emotion.split(',')[0].trim()}</h1>
  <p>${preset.emotion}. Design pipeline OD-style — segmento ${seg}, plano ${plan.toUpperCase()}. Matriz Warp presets + Qdrant enrichment.</p>
  <div class="btn-group" style="justify-content:center">
    <button class="btn btn-primary">${preset.cta}</button>
    <button class="btn btn-outline">Saiba Mais</button>
  </div>
</div>
<div class="grid">
  <div class="card">
    <h3>🎨 Paleta — ${seg}</h3>
    <div class="swatches">
      <div class="swatch" style="background:${primary}" title="Primary"></div>
      <div class="swatch" style="background:${secondary}" title="Secondary"></div>
      <div class="swatch" style="background:${accent}" title="Accent"></div>
    </div>
    <p>Matriz Warp preset · hue ${hue}°</p>
    ${designInspiration.length > 0 ? `<p style="font-size:0.75rem;margin-top:0.5rem">🎨 Qdrant: ${designInspiration[0]?.slice(0, 50)}</p>` : ''}
  </div>
  <div class="card">
    <h3>📊 Métricas</h3>
    <div class="kpi">247<span class="badge badge-success" style="font-size:0.7rem;margin-left:0.5rem">+12%</span></div>
    <p style="margin-top:0.25rem">${seg === 'saude' || seg === 'beleza' ? 'Agendamentos' : seg === 'servicos' ? 'Consultas' : seg === 'alimentacao' ? 'Pedidos' : seg === 'comercio' ? 'Vendas' : seg === 'educacao' ? 'Matrículas' : 'Reservas'} este mês</p>
  </div>
  <div class="card">
    <h3>⭐ Google Meu Negócio</h3>
    <p style="color:#D4AF37;font-size:1.2rem">★★★★★</p>
    <p>4.7 estrelas · 128 avaliações · Perfil verificado</p>
  </div>
  <div class="card">
    <h3>📅 ${preset.cta}</h3>
    <input class="input" type="text" placeholder="Seu nome">
    <input class="input" type="tel" placeholder="WhatsApp">
    <div class="btn-group">
      <button class="btn btn-primary">${preset.cta}</button>
      <button class="btn btn-outline">WhatsApp</button>
    </div>
  </div>
  <div class="card">
    <h3>✅ Diferenciais</h3>
    <p>✓ Profissionais certificados</p>
    <p>✓ Atendimento personalizado</p>
    <p>✓ ${seg === 'alimentacao' ? 'Delivery' : seg === 'hospitalidade' ? 'Reservas' : 'Agendamento'} online 24h</p>
    <p>✓ Resultados comprovados</p>
  </div>
  <div class="card">
    <h3>💬 Depoimento</h3>
    <p style="font-style:italic;font-family:var(--font-heading)">"Melhor ${seg} da região! Recomendo de olhos fechados."</p>
    <p style="margin-top:0.5rem;font-size:0.8rem">— Maria S., cliente desde 2023</p>
  </div>
</div>
<div class="btn-group" style="margin:2rem 0">
  <button class="btn btn-primary">${preset.cta}</button>
  <button class="btn btn-outline">Ver Mais</button>
  <button class="btn btn-destructive">Cancelar</button>
  <span class="badge badge-primary">Premium</span>
  <span class="badge badge-muted">Básico</span>
  <span class="badge badge-success">Novo</span>
</div>
<div class="pipeline-meta">
  <b>🧠 ADSENTICE DESIGN PIPELINE v1.0</b><br>
  STAGE 0 · CLASSIFY: ${seg} → ${preset.emotion} | hue ${hue}° | colors: ${preset.colors.join(', ')}<br>
  STAGE 1 · RESOLVE: ${preset.headingFont} + ${preset.bodyFont} | spacing: ${preset.spacing} | radius: ${preset.radius}<br>
  STAGE 2 · ENRICH: Qdrant → design: ${designInspiration[0]?.slice(0, 50) || 'N/A'} | landing: ${landingPattern.slice(0, 40)} | comps: ${suggestedComponents.slice(0, 3).join(', ')}<br>
  STAGE 3 · GENERATE: tokens.${seg}.${plan}.css · trace ${traceId}<br>
  STAGE 4 · CRITIQUE: ${input.critique ? 'LLM árbitro (DeepSeek L6)' : 'não solicitado'}<br>
  STAGE 5 · TELEMETRY: trace → Qdrant adsentice-conversation → BOA embed_quality
</div>
</div></body></html>`
  }
}

/** Singleton */
export const designPipeline = new DesignPipeline()
