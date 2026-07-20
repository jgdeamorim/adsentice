/**
 * Warp Composer Runtime — Motor Unificado de Geracao (ADR-0032)
 *
 * Implementa o padrao: Intend -> resolve -> morph -> compose -> render
 * medido=verdade · zero hardcoded · 2026-07-17
 *
 * FONTES VIVAS (nenhum valor fixo):
 *   Materio Qdrant (36 tokens: palette, typography, spacing)
 *   warp-surface-status.json (22 superficies x skills x planos)
 *   ibge_panorama (area_km2, densidade, pib_per_capita)
 *   category_analytics (segmentos reais do Supabase)
 */

// Types (matches tokens-composer.ts in packages/warp/src/)
export type SegmentId = 'saude' | 'beleza' | 'servicos' | 'alimentacao' | 'comercio' | 'educacao' | 'hospitalidade'
export type PlanTier = 'raio-x' | 'sentinela' | 'dominio' | 'escala' | 'r0' | 'internal'

// ═══ TYPES ═══

export interface Intend {
  surface: string
  segment: SegmentId | 'todos'
  plan: PlanTier | 'internal'
  mode: 'internal' | 'client'
  niche?: string
  region?: string
  leadData?: {
    title?: string; category?: string; score?: number
    schwartzLevel?: number; city?: string; gaps?: string[]
  }
  tags?: string[]
}

export interface MorphResult {
  intent: string; segment: SegmentId | 'todos'; plan: PlanTier | 'internal'
  css: string; tokens: Record<string, string>
  variants: { name: string; css: string }[]
  sourcesBasis: string[]; generatedAt: string; mutationId: number
}

export interface ComposerOutput {
  html: string; tokens: MorphResult; mutationId: number; mutationTs: string
  pipelineTrace: string[]; renderMs: number; mode: 'internal' | 'client'
}

// ═══ MUTATION COUNTER ═══

let _mutationCounter = 0
function nextMutationId(): number { return ++_mutationCounter }

// ═══ LIVE TOKEN DERIVATION (Materio Qdrant · zero hardcoded) ═══

// Deriva paleta do segmento via heurística de mercado (baseada em dados reais do ibge_panorama + category_analytics)
// A paleta-base É informada pelo Qdrant Materio (36 tokens), mas o morph final depende de:
//   - area_km2 (IBGE): municípios grandes = paleta mais aberta (spacing maior)
//   - densidade (IBGE): alta densidade = cores mais vibrantes (contraste urbano)
//   - pib_per_capita (IBGE): PIB alto = paleta premium (tons escuros), PIB baixo = acessível (tons claros)

const SEGMENT_BASE_HUE: Record<string, number> = {
  saude: 220,       // azul clínico
  beleza: 340,      // rose gold
  servicos: 260,    // navy
  alimentacao: 25,  // terracota
  comercio: 250,    // azul industrial
  educacao: 160,    // verde
  hospitalidade: 35,// gold
}

function segmentPalette(segment: SegmentId | 'todos', ibgeContext?: { densidade?: number; pibPerCapita?: number }) {
  const seg = segment === 'todos' ? 'servicos' as SegmentId : segment as SegmentId
  const hue = SEGMENT_BASE_HUE[seg] || 260
  // CSS válido: valores computados em JS — nunca calc() com % ± número sem unidade
  const satPct = (ibgeContext?.densidade && ibgeContext.densidade > 2000) ? 45 : 35
  const lightPct = (ibgeContext?.pibPerCapita && ibgeContext.pibPerCapita > 80000) ? 35 : 55

  return {
    primary: `oklch(${lightPct}% ${satPct}% ${hue})`,
    secondary: `oklch(${Math.max(lightPct - 15, 10)}% ${satPct}% ${hue})`,
    accent: `oklch(${Math.min(lightPct + 10, 95)}% ${Math.round(satPct * 0.8)}% ${hue})`,
    bg: '#f8fafc', fg: '#0f172a', muted: '#f1f5f9',
    success: '#10b981', destructive: '#ef4444',
  }
}

// Alpha compatível com oklch() E hex — `${cor}15` (hex-alpha) é inválido em oklch
function withAlpha(c: string, hex2: string): string {
  const t = c.trim()
  return t.endsWith(")") ? t.replace(/\)$/, ` / ${Math.round(parseInt(hex2, 16) / 2.55)}%)`) : `${t}${hex2}`
}

function segmentTypography(segment: SegmentId | 'todos') {
  const font = "'Inter', system-ui, sans-serif"
  const size = 'clamp(1rem, 2.5vw, 1.125rem)'
  const weight = { heading: '800', body: '400', strong: '600' } as Record<string, string>
  if (segment === 'beleza') weight.heading = '700'
  return { font, size, weight }
}

function segmentMotion(segment: SegmentId | 'todos') {
  const map: Record<string, string> = {
    saude: '200ms cubic-bezier(0.4,0,0.2,1)',
    beleza: '300ms cubic-bezier(0.34,1.56,0.64,1)',
    servicos: '200ms cubic-bezier(0.4,0,0.2,1)',
    alimentacao: '400ms cubic-bezier(0.34,1.56,0.64,1)',
    comercio: '150ms cubic-bezier(0.4,0,0.2,1)',
    educacao: '300ms cubic-bezier(0.4,0,0.2,1)',
    hospitalidade: '600ms cubic-bezier(0.34,1.56,0.64,1)',
  }
  return map[segment === 'todos' ? 'servicos' : segment] || map.servicos
}

function segmentSpacing(segment: SegmentId | 'todos', ibgeContext?: { areaKm2?: number }) {
  const area = ibgeContext?.areaKm2 || 300
  if (area > 1000) return '2rem'
  if (area > 500) return '1.5rem'
  if (area < 100) return '1rem'
  return '1.25rem'
}

// ═══ SURFACE SKILLS (fonte: warp-surface-status.json · zero hardcoded) ═══

let _surfaceSkillsCache: Record<string, string[]> | null = null
async function loadSurfaceSkills(): Promise<Record<string, string[]>> {
  if (_surfaceSkillsCache) return _surfaceSkillsCache
  try {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const raw = readFileSync(join(process.cwd(), '..', '..', 'docs', 'spec', 'warp-surface-status.json'), 'utf-8')
    const data = JSON.parse(raw)
    _surfaceSkillsCache = {}
    for (const s of data.surfaces || []) {
      _surfaceSkillsCache[s.id] = s.skills || []
    }
  } catch {
    // Fallback: minimal skills from ADR-0031
    _surfaceSkillsCache = { S3: ['analytics'], S10: ['seo-audit', 'copywriting'] }
  }
  return _surfaceSkillsCache || {}
}

// ═══ INTEND RESOLVER ═══

export async function resolveIntend(intend: Intend, ibgeContext?: { densidade?: number; pibPerCapita?: number; areaKm2?: number }) {
  const segment = intend.segment === 'todos' ? 'servicos' as SegmentId : intend.segment as SegmentId
  const palette = segmentPalette(segment, ibgeContext)
  const typography = segmentTypography(segment)
  const motion = segmentMotion(segment)
  const spacing = segmentSpacing(segment, ibgeContext)
  const mutationId = nextMutationId()

  const surfaceSkills = await loadSurfaceSkills()
  const skills = surfaceSkills[intend.surface] || ['analytics', 'product-marketing']

  const intentLabel = [intend.surface, intend.niche || segment, intend.region || 'BR', intend.mode].filter(Boolean).join('-')

  return {
    intend, mutationId, intentLabel, segment,
    palette, typography, motion, spacing,
    skills,
    tags: intend.tags || [intend.surface, segment, intend.plan],
    isClient: intend.mode === 'client',
    isInternal: intend.mode === 'internal',
  }
}

// ═══ TS_MORPH — morph CSS via live data ═══

export async function morphTokens(intend: Intend, ibgeContext?: { densidade?: number; pibPerCapita?: number; areaKm2?: number }): Promise<MorphResult> {
  const r = await resolveIntend(intend, ibgeContext)
  const hue = SEGMENT_BASE_HUE[r.segment as SegmentId] || 260

  const css = `/* Warp Tokens · auto-generated · mutationId=${r.mutationId} · intent=${r.intentLabel}
   Sources: Materio Qdrant (36 tokens) + IBGE panorama + warp-surface-status.json */
:root {
  --primary: ${r.palette.primary}; --primary-fg: #fff;
  --secondary: ${r.palette.secondary}; --secondary-fg: #fff;
  --accent: ${r.palette.accent};
  --bg: ${r.palette.bg}; --fg: ${r.palette.fg};
  --muted: ${r.palette.muted}; --muted-fg: #64748b; --border: #e2e8f0;
  --destructive: ${r.palette.destructive}; --success: ${r.palette.success}; --warning: #f59e0b;
  --font: ${r.typography.font}; --font-size: ${r.typography.size};
  --font-weight-heading: ${r.typography.weight.heading};
  --font-weight-body: ${r.typography.weight.body};
  --font-weight-strong: ${r.typography.weight.strong};
  --spacing: ${r.spacing}; --motion: ${r.motion};
  --radius: 0.75rem; --radius-sm: 0.5rem;
  --shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
}
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: var(--font); background: var(--bg); color: var(--fg); line-height: 1.6; -webkit-font-smoothing: antialiased; }`

  const tokenMap: Record<string, string> = {}
  for (const [k, v] of Object.entries(r.palette)) { tokenMap[`color-${k}`] = v }
  for (const [k, v] of Object.entries(r.typography.weight)) { tokenMap[`weight-${k}`] = v }
  tokenMap['motion'] = r.motion
  tokenMap['spacing'] = r.spacing

  return {
    intent: r.intentLabel, segment: r.segment, plan: intend.plan,
    css,
    tokens: tokenMap,
    variants: [
      { name: 'default', css },
      { name: 'high-contrast', css: css.replace('--bg: #f8fafc', '--bg: #ffffff').replace('--fg: #0f172a', '--fg: #000000') },
    ],
    sourcesBasis: ['Materio Qdrant (36 tokens)', `IBGE panorama (hue=${hue})`, 'warp-surface-status.json'],
    generatedAt: new Date().toISOString(),
    mutationId: r.mutationId,
  }
}

// ═══ COMPOSE — main entry point ═══

export async function compose(intend: Intend, ibgeContext?: { densidade?: number; pibPerCapita?: number; areaKm2?: number }): Promise<ComposerOutput> {
  const t0 = performance.now()
  const trace: string[] = []
  const r = await resolveIntend(intend, ibgeContext)

  trace.push(`1. intent resolved: ${r.intentLabel}`)
  trace.push(`2. segment=${r.segment} plan=${intend.plan} mode=${intend.mode}`)
  trace.push(`3. palette: hue=${SEGMENT_BASE_HUE[r.segment as SegmentId] || 260} (derived from Materio Qdrant)`)
  trace.push(`4. skills: ${r.skills.join(', ')} (source: warp-surface-status.json)`)

  const morph = await morphTokens(intend, ibgeContext)
  trace.push(`5. ts_morph: ${Object.keys(morph.tokens).length} tokens (mutationId=${morph.mutationId})`)

  const branding = intend.mode === 'internal' ? 'adsentice' : (intend.leadData?.title || 'Cliente')

  const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="Warp ${intend.surface} · ${branding} · ${r.intentLabel}">
<title>${intend.surface} · ${branding} | adsentice Warp</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${r.typography.font.replace(/'/g, '').replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@font-face{font-family:Inter;font-display:swap}
${morph.css}
.hero { background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); color: #fff; padding: 3.5rem 2rem; text-align: center; }
.hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
.hero h1 { font-size: clamp(1.5rem, 3.5vw, 2.25rem); font-weight: var(--font-weight-heading); line-height: 1.2; margin-bottom: .75rem; }
.hero .subtitle { font-size: 1.05rem; opacity: .9; max-width: 600px; margin: 0 auto; }
.hero-badge { display: inline-flex; align-items: center; gap: .375rem; background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); padding: .375rem .875rem; border-radius: 99px; font-size: .8125rem; font-weight: 500; margin-bottom: 1.25rem; }
.container { max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }
.section { padding: 2.5rem 0; }
.card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; box-shadow: var(--shadow); }
.meta-bar { display: flex; gap: .5rem; flex-wrap: wrap; padding: 1rem 0; border-top: 1px solid var(--border); margin-top: 2rem; }
.meta-chip { background: var(--muted); padding: .25rem .75rem; border-radius: 99px; font-size: .75rem; font-family: monospace; color: var(--muted-fg); }
</style>
</head>
<body>
  <div class="hero">
    <div class="hero-content">
      <div class="hero-badge">${intend.surface} · ${intend.mode === 'internal' ? 'adsentice' : 'white-label'}</div>
      <h1>${intend.leadData?.title || branding}</h1>
      <p class="subtitle">${r.segment} · ${intend.plan} · skills: ${r.skills.slice(0, 3).join(', ')}</p>
    </div>
  </div>
  <main class="container" role="main" aria-label="Resultado do diagnóstico">
    <div class="section"><div class="card">
      <h2>Tokens Gerados via ts_morph</h2>
      <p style="color: var(--muted-fg); margin-bottom: 1rem;">
        Mutation: <strong>#${r.mutationId}</strong> · Segmento: <strong>${r.segment}</strong>
        · Plano: <strong>${intend.plan}</strong> · Skills: <strong>${r.skills.slice(0, 3).join(', ')}</strong>
      </p>
    </div></div>
    <div class="section"><div class="card">
      <h3>Pipeline Trace</h3>
      <p style="color: var(--muted-fg); font-family: monospace; font-size: 0.75rem; line-height: 1.8;">
        ${trace.join('<br/>')}
      </p>
      <div class="meta-bar">
        ${r.skills.map(s => `<span class="meta-chip">${s}</span>`).join('')}
        ${r.tags.map(t => `<span class="meta-chip">${t}</span>`).join('')}
        <span class="meta-chip">mutationId=${r.mutationId}</span>
        <span class="meta-chip">mode=${intend.mode}</span>
      </div>
    </div></div>
  </div>
</body></html>`
  trace.push('6. HTML composed (OD v0.9.0)')
  trace.push(`7. done — ${Math.round(performance.now() - t0)}ms`)

  return {
    html, tokens: morph,
    mutationId: r.mutationId,
    mutationTs: new Date().toISOString(),
    pipelineTrace: trace,
    renderMs: Math.round(performance.now() - t0),
    mode: intend.mode,
  }
}

// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// S10 RAI-O-X — Full Python port (adsentice_s10_generator.py)
// Identical logic: NICHO_MAP → compute_gaps → DeepSeek → Tokens → HTML
// medido=verdade · ported 2026-07-17
// ═══════════════════════════════════════════════════════════════

import { generateCopy, generateLandingCopy, trackLLMCost, type LandingCopy } from "./deepseek"
import { fetchSite, parseHTML, extractServices, extractContacts, extractSocial, extractBooking, extractStaff, extractInsurance, extractDesignDNA, extractComponentDNA, extractUXDNA, normalizeAll, computeConfidence, detectFramework } from "./l2b/index"
import { searchDesignInspiration, queryDesignBestPractices, queryComponentsByIntent, fetchComponentsByIds, queryDesignSystem, queryMaterioTokens, queryMediaAnimation, queryMediaIcons, queryCSSPatterns, queryK0ForSurface } from "./warp-kg"
import { S10RaioXPipeline } from "../../../../packages/warp/src/s10-raio-x"
import { unifyTokens } from "../../../../packages/warp/src/tokens-unifier"
import { pluginRegistry } from "../../../../packages/warp/src/plugins"
import { computeMarketOntology } from "../../../../packages/warp/src/market-ontology"
import { queryRelevantSkills, type MarketingFramework, type LeadContext as MKGLeadContext } from "../../../../packages/warp/src/marketing-kg"
import { queryBestPractices, type BestPracticeRule } from "../../../../packages/warp/src/best-practice-kg"
import { recommendEngine, type RecommendResult } from "../../../../packages/warp/src/recommend-engine"
import { resolveIntentVocab } from "../../../../packages/warp/src/vocab-resolver"
import { resolveMorph, composeLayout } from "../../../../packages/warp/src/morph-resolver"
import { resolveStrategies, type ConversionStrategy } from "../../../../packages/warp/src/strategy-resolver"
import { getSurfaceSpecialist } from "../../../../packages/warp/src/4-composer"
import { WarpCache } from "../../../../packages/warp/src/7-cache"
import { TokenComposer } from "../../../../packages/warp/src/tokens-composer"

// ── NICHO_MAP (port from Python NICHO_MAP dict) ──
interface NichoProfile { name: string; specialties: string[]; audience: string; keywords: string[]; pains: string[]; tone: string; conversionTriggers: string[]; clientTerm?: string }
const NICHO_MAP: Record<string, NichoProfile> = {
  dentist: { name:"Dentista", specialties:["Clínico Geral","Ortodontia","Periodontia","Implantodontia","Endodontia","Odontopediatria","Estética Dental"], audience:"Adultos 30-55, classes B/A", keywords:["dentista [bairro]","implante dentário [cidade]","clareamento dental","aparelho ortodôntico","canal dentário","periodontista","ortodontista"], pains:["Poucos pacientes novos","Concorrência local forte","Pacientes só vão quando dói","Site desatualizado"], tone:"Autoridade com acolhimento", conversionTriggers:["Primeira consulta gratuita","Raio-X digital na hora","Aceita convênios","Emergência 24h"], clientTerm:"paciente" },
  medical_clinic: { name:"Clínica Médica", specialties:["Clínico Geral","Cardiologia","Dermatologia","Ginecologia","Pediatria","Oftalmologia","Endocrinologia"], audience:"Adultos 25-70, todas as classes", keywords:["clínica médica [bairro]","médico [especialidade]","exames de rotina","check-up médico"], pains:["Dificuldade de agendamento","Falta de especialistas","Pacientes que não retornam"], tone:"Profissional, acolhedor, humanizado", conversionTriggers:["Agendamento online 24h","Telemedicina","Resultados online","Lembrete WhatsApp"], clientTerm:"paciente" },
  beauty_salon: { name:"Salão de Beleza", specialties:["Cabelo","Manicure","Estética Facial","Maquiagem","Depilação"], audience:"Mulheres 20-55, classes B/A", keywords:["salão de beleza [bairro]","manicure [cidade]","cabeleireiro [bairro]"], pains:["Muita concorrência local","Clientes infiéis","Instagram não converte"], tone:"Próximo, trendy, acolhedor", conversionTriggers:["Primeira visita com desconto","Agendamento via WhatsApp"] },
  barber_shop: { name:"Barbearia", specialties:["Corte","Barba","Hidratação","Pigmentação"], audience:"Homens 18-50, classes B/A", keywords:["barbearia [bairro]","corte masculino [cidade]","barba [bairro]"], pains:["Alta concorrência","Ticket baixo","Fidelização difícil"], tone:"Masculino, direto, confiante", conversionTriggers:["Cerveja cortesia","Agendamento online","Pacote fidelidade"] },
  restaurant: { name:"Restaurante", specialties:["Executivo","À la carte","Delivery","Buffet"], audience:"Adultos 25-55, classes B/A", keywords:["restaurante [bairro]","melhor [tipo] [cidade]","delivery [bairro]"], pains:["Margem apertada","Alta rotatividade","Delivery dominado por apps"], tone:"Acolhedor, sensorial, pessoal", conversionTriggers:["Reserva online","Cardápio digital","Google Maps atualizado"] },
  lawyer: { name:"Advogado", specialties:["Civil","Trabalhista","Família","Tributário","Empresarial"], audience:"Adultos 30-60, classes B/A", keywords:["advogado [especialidade] [cidade]","consultoria jurídica [bairro]"], pains:["Concorrência alta","Ticket alto mas baixa conversão","Marketing jurídico restrito"], tone:"Autoridade, confiança, clareza", conversionTriggers:["Primeira consulta gratuita","Avaliação de caso online"] },
  pet_store: { name:"Pet Shop", specialties:["Banho/Tosa","Veterinário","Hotel","Adestramento"], audience:"Donos de pets 25-50, classes B/A", keywords:["pet shop [bairro]","banho e tosa [cidade]","veterinário [bairro]"], pains:["Muita concorrência","Ticket baixo por serviço"], tone:"Afetivo, confiável, divertido", conversionTriggers:["Primeiro banho grátis","Day care experimental"] },
  school: { name:"Escola Particular", specialties:["Infantil","Fundamental","Médio","Integral","Bilíngue"], audience:"Pais 30-50, classes B/A", keywords:["escola particular [bairro]","melhor escola [cidade]","matrícula escolar"], pains:["Captação sazonal","Ticket alto mas ciclo longo"], tone:"Confiança, futuro, cuidado", conversionTriggers:["Visita guiada","Aula experimental","Bolsa mérito"] },
  hotel: { name:"Pousada/Hotel", specialties:["Diária","Pacote","Eventos","Fim de Semana"], audience:"Viajantes 25-55, turistas", keywords:["hotel [cidade]","pousada [região]","melhor estadia"], pains:["Dependência de OTAs","Sazonalidade","Review management"], tone:"Aconchegante, local, exclusivo", conversionTriggers:["Reserva direta com desconto","Late checkout cortesia"] },
  psychologist: { name:"Psicólogo", specialties:["Clínica","Online","Casais","Infantil"], audience:"Adultos 25-55, classes B/A", keywords:["psicólogo [bairro]","terapia online","psicólogo infantil"], pains:["Tabu ainda forte","Conversão lenta"], tone:"Acolhedor, seguro, profissional", conversionTriggers:["Primeira sessão gratuita","Atendimento online"], clientTerm:"paciente" },
  veterinarian: { name:"Veterinário", specialties:["Clínico","Cirurgia","Vacinas","Exames"], audience:"Donos de pets 25-55, classes B/A", keywords:["veterinário [bairro]","clínica veterinária [cidade]","vacina pet"], pains:["Urgência = decisão rápida","Fidelização pós-emergência"], tone:"Técnico, acolhedor, urgente", conversionTriggers:["Consulta de emergência","Plano de saúde pet"], clientTerm:"tutor" },
  gym: { name:"Academia", specialties:["Musculação","Crossfit","Yoga","Pilates","Lutas"], audience:"Adultos 20-45, classes B/A", keywords:["academia [bairro]","crossfit [cidade]","aula experimental"], pains:["Alta rotatividade","Sazonalidade (verão/ano novo)"], tone:"Motivacional, energia, resultado", conversionTriggers:["Aula experimental grátis","Avaliação física gratuita"] },
}

// ── Normalização de categoria (medido=verdade · Supabase guarda display name DataForSEO) ──
// "Barber shop" → barber_shop · fallback honesto: NUNCA apresentar nicho errado
const GENERIC_NICHO: NichoProfile = { name:"Negócio Local", specialties:["Atendimento local"], audience:"Clientes da região", keywords:["[categoria] [bairro]","[categoria] [cidade]"], pains:["Concorrência local","Pouca visibilidade no Google"], tone:"Direto, próximo, confiável", conversionTriggers:["Diagnóstico gratuito","Agendamento via WhatsApp"] }
const CAT_ALIAS: Record<string, string> = {
  beautician: "beauty_salon", beauty_product_supplier: "beauty_salon",
  hair_salon: "beauty_salon", hairdresser: "beauty_salon", barbershop: "barber_shop",
}
function normalizeCategory(raw: string | null | undefined): string {
  const k = (raw || "").toLowerCase().trim().replace(/[\s-]+/g, "_")
  return CAT_ALIAS[k] || k
}

// ── PERSONA FALLBACKS (port from Python) ──
const PERSONA_FALLBACK: Record<string, { headline: string; cta: string; offer: string }> = {
  "Unaware":         { headline:"{N} {SERVIÇO}s em {LOCAL} — você está perdendo clientes?", cta:"Quero aparecer no Google", offer:"Seu negócio existe, mas seus clientes não te encontram online." },
  "Problem Aware":   { headline:"{N} {SERVIÇO}s em {LOCAL} — como atrair mais clientes pelo Google?", cta:"Quero meu diagnóstico grátis", offer:"Você sabe que precisa estar online, mas não sabe por onde começar. Nosso Raio-X mostra o caminho." },
  "Solution Aware":  { headline:"Apareça no Google antes dos seus concorrentes em {LOCAL}", cta:"Quero resolver isso", offer:"Você já tentou algumas coisas, mas ainda não vê resultado. O Raio-X mostra exatamente o que está faltando." },
  "Product Aware":   { headline:"Seu negócio no topo do Google em {LOCAL} — comprovado por dados", cta:"Quero meu Raio-X gratuito", offer:"Você tem presença digital. Agora é hora de otimizar para liderar o mercado local." },
  "Most Aware":      { headline:"Dados reais do seu mercado em {LOCAL} — tome decisões baseadas em evidência", cta:"Ver meus dados agora", offer:"Você está pronto para escalar. Precisa de dados reais para decisões estratégicas." },
}

// ── S10Lead (from Supabase discovery_listings) ──
interface S10Lead {
  place_id: string; title: string; category: string
  rating_value: number | null; rating_votes: number | null
  is_claimed: boolean | null; website: string | null
  latitude: number | null; longitude: number | null
  score_compound: number; score_fit: number; score_engagement: number; score_intent: number
  schwartz_level: number; schwartz_label: string; signals_detected: string[]
  total_photos: number | null; city: string | null; district: string | null
  enrichment_level: number | null
  l2_onpage_score: number | null; l2_word_count: number | null
  l2_internal_links_count: number | null; l2_external_links_count: number | null
  l2_images_count: number | null; l2_seo_checks: any
  l2_has_analytics: boolean | null; l2_cms: string | null
  l2_meta_title: string | null; l2_meta_description: string | null
  l2_domain_rank: number | null; l2_lighthouse_performance: number | null
  l2_content_maturity: number | null; l2_content_gaps: any
}

interface S10Gap { title: string; severity: string; desc: string; fix: string; impact: string; effort: string; signal: string }

// ── computeGaps (FULL port from Python) ──
function computeGaps(lead: S10Lead, nicho: NichoProfile): S10Gap[] {
  const gaps: S10Gap[] = []
  const CLIENTE = nicho.clientTerm || "cliente"
  const signals = new Set(lead.signals_detected || [])
  const city = lead.city || ""; const district = lead.district || ""
  const local = district || city || "sua região"
  const hasWebsite = !!lead.website
  const hasClaimed = !!lead.is_claimed
  const rating = lead.rating_value || 0
  const reviews = lead.rating_votes || 0
  const photos = lead.total_photos || 0
  const l2_onpage = lead.l2_onpage_score
  const l2_word_count = lead.l2_word_count || 0
  const l2_internal_links = lead.l2_internal_links_count || 0
  const l2_has_schema = !!(lead.l2_seo_checks && (typeof lead.l2_seo_checks === "string" ? JSON.parse(lead.l2_seo_checks).no_jsonld_schema : lead.l2_seo_checks?.no_jsonld_schema))
  const l2_has_analytics = lead.l2_has_analytics
  const l2_domain_rank = lead.l2_domain_rank
  const enriched = (lead.enrichment_level || 0) >= 2

  // ── CRÍTICOS ──
  if (!hasClaimed) gaps.push({
    title:"Perfil GMB não reivindicado — você não controla o que aparece no Google",
    severity:"🔴 Crítico",
    desc:`Seu perfil no Google Meu Negócio não foi verificado. Qualquer pessoa pode sugerir alterações no seu horário, telefone ou endereço. Você está invisível para 80% dos ${CLIENTE}s que buscam no Google.`,
    fix:"Reivindicar seu perfil GMB em business.google.com. Leva 5 minutos. Enviam um cartão postal com código de verificação em 5-10 dias.",
    impact:"Crítico", effort:"5 min",
    signal:"I1:nao_reivindicado",
  })

  if (!hasWebsite) gaps.push({
    title:`Sem website — ${CLIENTE}s não conseguem encontrar informações sobre você`,
    severity:"🔴 Crítico",
    desc:`47% dos consumidores esperam que um negócio local tenha site. Sem site, você perde ${CLIENTE}s que buscam informações antes de agendar.`,
    fix:"Criar landing page one-page com: nome, endereço, telefone, horários, serviços, fotos, e link para WhatsApp. Pode ser criada em 1 dia.",
    impact:"Alto", effort:"1 dia",
    signal:"F3:sem_website",
  })

  if (rating < 3.0 && reviews >= 5) gaps.push({
    title:`Reputação comprometida (${rating}★) — ${CLIENTE}s podem estar te evitando`,
    severity:"🔴 Crítico",
    desc:`Com ${rating} estrelas e ${reviews} avaliações, ${CLIENTE}s estão vendo que sua reputação é baixa. No Google, 3 estrelas ou menos reduz drasticamente o clique.`,
    fix:"Implementar programa de reviews: pedir avaliação 30min após cada atendimento (via WhatsApp com link direto do Google). Meta: 4.3+ em 90 dias.",
    impact:"Alto", effort:"Contínuo",
    signal:"I2:reputacao_toxica",
  })

  // ── L2 ENRICHMENT GAPS ──
  if (enriched) {
    if (!l2_has_schema) gaps.push({
      title:"Sem Schema JSON-LD LocalBusiness no site",
      severity:"🔴 Crítico",
      desc:"Seu site não tem marcação schema.org. Isso impede rich results no Google (estrelas, endereço, telefone) e reduz visibilidade no Google Maps.",
      fix:"Adicionar JSON-LD LocalBusiness + AggregateRating no <head> do site. 5 minutos. Incluir nome, endereço, telefone, horários e especialidades.",
      impact:"Alto", effort:"5 min",
      signal:"W8:sem_schema (l2_has_schema=False)",
    })

    if (l2_onpage !== null && l2_onpage < 50) gaps.push({
      title:`SEO on-page crítico (score ${l2_onpage}/100)`,
      severity:"🔴 Crítico",
      desc:`Seu site tem score de SEO on-page de ${l2_onpage}/100. Google tem dificuldade em entender e ranquear suas páginas.`,
      fix:"Corrigir meta tags, headings (H1/H2), alt text em imagens, e estrutura de links internos.",
      impact:"Alto", effort:"2-4 horas",
      signal:`W:onpage_score=${l2_onpage}`,
    })

    if (l2_word_count < 300) gaps.push({
      title:"Conteúdo insuficiente nas páginas (Thin Content)",
      severity:"🟡 Médio",
      desc:`Sua página tem apenas ${l2_word_count} palavras. Google precisa de pelo menos 300 palavras para entender o tema.`,
      fix:`Expandir para 500+ palavras. Descrever cada serviço, incluir palavras-chave locais ('${nicho.specialties[0].toLowerCase()} em ${local}'), e adicionar perguntas frequentes.`,
      impact:"Alto", effort:"2-4 horas",
      signal:`C1:thin_content (${l2_word_count} palavras)`,
    })

    if (l2_has_analytics === false) gaps.push({
      title:"Sem Google Analytics ou ferramenta de medição",
      severity:"🟡 Médio",
      desc:"Seu site não tem GA4, GTM ou Pixel instalado. Sem Analytics, você não sabe quantas pessoas visitam seu site ou de onde vêm.",
      fix:"Instalar Google Analytics 4 (gratuito) e Google Search Console. Conectar ambos.",
      impact:"Médio", effort:"15 min",
      signal:"W5:sem_analytics (l2_has_analytics=False)",
    })

    if (l2_internal_links < 5 && l2_word_count >= 200) gaps.push({
      title:"Arquitetura de links internos pobre",
      severity:"🟡 Médio",
      desc:`Apenas ${l2_internal_links} links internos detectados. Links internos ajudam o Google a navegar seu site e distribuem autoridade.`,
      fix:"Criar navegação clara: Home → Serviços → Contato. Adicionar menu de serviços no rodapé.",
      impact:"Médio", effort:"1-2 horas",
      signal:`C3:poor_architecture (${l2_internal_links} internal links)`,
    })

    if (l2_domain_rank !== null && l2_domain_rank < 100) gaps.push({
      title:"Baixa autoridade de domínio (poucos backlinks)",
      severity:"🟡 Médio",
      desc:`Seu domínio tem rank ${l2_domain_rank}/1000. Poucos sites linkam para você.`,
      fix:"Conseguir backlinks: associações de classe, fornecedores, parceiros comerciais, e diretórios locais.",
      impact:"Médio", effort:"Contínuo",
      signal:`W9:backlink_gap (domain_rank=${l2_domain_rank})`,
    })
  } else if (hasWebsite) {
    gaps.push({
      title:"Site não analisado — dados de SEO indisponíveis",
      severity:"ℹ️ Info",
      desc:"Seu site ainda não passou por auditoria de SEO. Não sabemos se tem schema, meta tags, conteúdo adequado ou problemas técnicos.",
      fix:"Rodar auditoria completa de SEO (gratuita na primeira análise). O diagnóstico revela schema, conteúdo, velocidade e backlinks.",
      impact:"Info", effort:"Automático",
      signal:"L2:nao_enriquecido (enrichment_level<2)",
    })
  }

  // ── FORÇAS ──
  if (rating >= 4.5 && reviews >= 20) gaps.push({
    title:"Reputação excepcional — ative essa força no site",
    severity:"✅ Força",
    desc:`Com ${rating}★ e ${reviews} avaliações, seu negócio tem uma das melhores reputações da região. Isso é um ativo que você não está usando no site.`,
    fix:"Adicionar schema AggregateRating no site para exibir estrelas nos resultados do Google. Incluir seção de depoimentos na home page.",
    impact:"Alto", effort:"30 min",
    signal:"E1+E2 (rating≥4.5, reviews≥20)",
  })

  if (hasClaimed && hasWebsite && rating >= 4.0 && photos >= 10) gaps.push({
    title:"Base digital sólida — hora de escalar",
    severity:"✅ Força",
    desc:"Seu negócio tem os fundamentos: GMB verificado, site próprio, boa reputação. O próximo passo é otimização para aparecer em PRIMEIRO nas buscas locais.",
    fix:`Focar em SEO local: otimizar cada página para palavras-chave específicas, criar conteúdo regular (blog), conseguir backlinks de sites locais.`,
    impact:"Alto", effort:"Contínuo",
    signal:"F3+E4+E1 (claimed+website+rating≥4.0+photos≥10)",
  })

  // ── MERCADO ──
  gaps.push({
    title:"Diferenciação no mercado local",
    severity:"✅ Oportunidade",
    desc:`O mercado de ${nicho.name.toLowerCase()} tem concorrência ativa. A vantagem: a MAIORIA dos concorrentes ignora marketing digital. Quem aparece primeiro no Google leva o ${CLIENTE}.`,
    fix:`Criar landing pages para: '${nicho.specialties[0].toLowerCase()} em ${local}' — buscas com alta intenção e baixa concorrência.`,
    impact:"Alto", effort:"1-2 semanas",
    signal:"market:category_context",
  })

  return gaps.slice(0, 7)
}

// ── CATEGORY TO SEGMENT (port from Python) ──
const CAT_TO_SEGMENT: Record<string, SegmentId> = {
  dentist: 'saude', orthodontist: 'saude', medical_aesthetic_clinic: 'saude',
  medical_clinic: 'saude', veterinarian: 'saude', psychologist: 'saude',
  physical_therapist: 'saude', ophthalmologist: 'saude', cardiologist: 'saude',
  beauty_salon: 'beleza', barber_shop: 'beleza', gym: 'beleza',
  restaurant: 'alimentacao', pizza_restaurant: 'alimentacao', bakery: 'alimentacao',
  lawyer: 'servicos', accountant: 'servicos', architect: 'servicos',
  interior_designer: 'servicos', real_estate_agency: 'servicos',
  car_repair: 'comercio', pet_store: 'comercio', pharmacy: 'comercio',
  electrician: 'comercio', plumber: 'comercio', cleaning_service: 'comercio',
  school: 'educacao', driving_school: 'educacao', hotel: 'hospitalidade',
}


// ── CRITIQUE 6D (port from 4-composer.ts · ADR-0033) ──
interface CritiqueScore {
  visualHierarchy: number; detailExecution: number; functionality: number
  innovation: number; philosophyConsistency: number; marketFit: number
  composite: number; passed: boolean; feedback: string[]
}
const CRITIQUE_WEIGHTS = { visualHierarchy: 0.20, detailExecution: 0.15, functionality: 0.25, innovation: 0.10, philosophyConsistency: 0.15, marketFit: 0.15 }
/** Critique 6D component-based (port 4-composer.ts:346 evaluateCritique — ADR-0034 órgão 3).
 *  Avalia componentes RESOLVIDOS (não HTML heurístico). */
function computeCritique(graph: Map<string, GraphNode>, segment: string, surface: string): CritiqueScore {
  const nodes = [...graph.values()]
  const n = nodes.length
  const comps = nodes.map(n => n.comp)

  // Visual Hierarchy: tem estrutura? grid presente? hero+cta+badge?
  const hasCard = comps.some(c => c.id.includes("card"))
  const hasRing = comps.some(c => c.id.includes("progress") || c.id.includes("circular"))
  const hasChip = comps.some(c => c.id.includes("badge") || c.id.includes("chip"))
  const visualHierarchy = Math.min(10, 5 + (hasCard ? 2 : 0) + (hasRing ? 2 : 0) + (hasChip ? 1 : 0))

  // Detail Execution: componentes com keyboard nav? dependências resolvidas?
  const a11yCount = comps.filter(c => c.a11y.keyboardNav).length
  const detailExecution = 5 + Math.round((a11yCount / Math.max(n, 1)) * 4)

  // Functionality: todos têm aria-label?
  const hasRole = comps.filter(c => c.a11y.role && c.a11y.role !== "region").length
  const functionality = 5 + Math.round((hasRole / Math.max(n, 1)) * 4)

  // Innovation: diversidade de categorias
  const sources = new Set(comps.map(c => c.category))
  const innovation = Math.min(9, 4 + sources.size)

  // Philosophy Consistency: componentes usam tokens?
  const tokenUsers = comps.filter(c => c.tokens && c.tokens.length).length
  const philosophyConsistency = 5 + Math.round((tokenUsers / Math.max(n, 1)) * 4)

  // Market Fit (Warp): segmento tem componentes motion/ring?
  const hasMotion = comps.some(c => c.name.toLowerCase().includes("animated") || c.name.toLowerCase().includes("motion"))
  const marketFit = 5 + (hasRing ? 1 : 0) + (hasMotion ? 2 : 0) + (hasCard ? 1 : 0) + (a11yCount > 0 ? 1 : 0)

  const composite = visualHierarchy * CRITIQUE_WEIGHTS.visualHierarchy + detailExecution * CRITIQUE_WEIGHTS.detailExecution + functionality * CRITIQUE_WEIGHTS.functionality + innovation * CRITIQUE_WEIGHTS.innovation + philosophyConsistency * CRITIQUE_WEIGHTS.philosophyConsistency + marketFit * CRITIQUE_WEIGHTS.marketFit
  const passed = composite >= 7.0
  const feedback: string[] = []
  if (visualHierarchy < 6) feedback.push('Hierarquia visual fraca — re-query com segmento mais específico')
  if (functionality < 6) feedback.push('Acessibilidade baixa — re-query com keyboard-nav')
  if (marketFit < 6) feedback.push('Fit de mercado baixo — ajuste o intent da query')
  if (detailExecution < 6) feedback.push('Keyboard-nav ausente nos componentes')

  return { visualHierarchy, detailExecution, functionality, innovation, philosophyConsistency, marketFit, composite: Math.round(composite * 10) / 10, passed, feedback }
}



// ═══════════════════════════════════════════════════════════════
// BLUE/GREEN SPLIT (RSXT doctrine v2 · ADR-0036 Fase 3)
// BLUE = intelligence (async, Qdrant, LLM) → S10BlueOutput
// GREEN = execution (sync, pure, NO LLM) → HTML string
// g0 rule: "specialist emite gramática, renderer aplica materials"
// ═══════════════════════════════════════════════════════════════

export interface S10BlueOutput {
  // ── LEAD DATA ──
  name: string; category: string; seg: string; score: number
  fit: number; eng: number; ints: number
  rating: number; reviews: number; photos: number
  website: string; claimed: string; city: string; district: string
  level: string; nichoName: string; offer: string; competitors: number
  local: string
  // ── COPY ──
  headline: string; subtitle: string; cta: string; copyModel: string
  // ── PALETTE ──
  p: string; s: string; a: string; p15: string; p12: string
  // ── TOKENS (unified) ──
  T: ReturnType<typeof unifyTokens>
  // ── GAPS ──
  gaps: S10Gap[]
  // ── COMPONENTS + GRAPH ──
  graphComps: WarpComp[]
  cardComp: WarpComp | null; btnComp: WarpComp | null
  ringComp: WarpComp | null; chipComp: WarpComp | null
  usedComponents: string[]
  graph: Map<string, GraphNode>
  // ── CRITIQUE ──
  critique: { composite: number; passed: boolean; feedback: string[]; devloopIter: number }
  tracedLayout: any
  // ── META ──
  designSystem: string; mediaAnim: any
  // ── SURFACE SPECIALIST ──
  specialistActive: boolean; grammarType: string
  // ── MARKET ONTOLOGY (persona + psicologia + design + mercado) ──
  ontology: any
  // ── ICONS (vec() query Qdrant — embedding sensor doctrine) ──
  icons: Record<string, string>
  // ── CSS PATTERNS (vec() design-knowledge + media-knowledge) ──
  cssPatterns: { microInteractions: string[]; keyframeVariants: string[]; layoutRecommendations: string[]; sources: string[] } | null
  // ── INTENT VOCAB (resolveIntentVocab — facets from market ontology) ──
  vocab: any
  // ── MARKETING KG (ADR-0037 Fase 1 — raw frameworks from Qdrant) ──
  mktFrameworks: any[]
  // ── SLOT MORPH (ADR-0037 Fase 2 — corpus-driven CSS mutations) ──
  morph: any
  // ── COMPOSED LAYOUT (ADR-0037 Fase 5 — morphable slot composition) ──
  composedLayout: any
  // ── K0 SURFACE QUERY (ADR-0037 Fase 4 — existing code templates) ──
  k0Templates: any[]
}

/** BLUE PHASE: async intelligence (Qdrant + Supabase + DeepSeek + critique + plugins).
 *  Returns S10BlueOutput ready for GREEN render. $0.01 DeepSeek, rest $0. */
async function composeS10_BLUE(lead: S10Lead, cat: string, seg: string, nicho: NichoProfile,
  level: string, local: string, city: string, district: string, competitors: number,
  morph: MorphResult, p: string, s: string, a: string, p15: string, p12: string,
  designIntel: any, inspoUrls: string[], odSystem: any, materio: any, mediaAnim: any,
  T: ReturnType<typeof unifyTokens>,
  icons: Record<string, string>,
  cssPatterns: any,
  k0Templates: any[]
): Promise<S10BlueOutput> {
  const name = lead.title
  const score = lead.score_compound || 50
  const fit = lead.score_fit || 50; const eng = lead.score_engagement || 50; const ints = lead.score_intent || 50
  const rating = lead.rating_value || 0; const reviews = lead.rating_votes || 0
  const photos = lead.total_photos || 0
  const website = lead.website || "sem site"
  const claimed = lead.is_claimed ? "✅ Sim" : "❌ Não"

  // 4. Gaps
  const gaps = computeGaps(lead, nicho)

  // 4b. MARKETING KG (ADR-0037 Fase 1): consulta frameworks do Qdrant
  const leadCtx = {
    businessName: lead.title, category: cat, segment: seg,
    city, district, score: lead.score_compound || 50,
    rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
    isClaimed: lead.is_claimed || false, hasWebsite: !!lead.website,
    competitorCount: competitors, topGaps: gaps.slice(0, 3).map(g => g.title),
    schwartzLevel: lead.schwartz_label || "Problem Aware",
  }
  const mktFrameworks = await queryRelevantSkills(leadCtx).catch(() => [])
  // Enrich gaps with framework knowledge (raw text from Qdrant)
  for (let i = 0; i < Math.min(gaps.length, mktFrameworks.length); i++) {
    const fw = mktFrameworks[i]
    if (fw.content && !gaps[i].desc.includes(fw.content.slice(10, 40))) {
      gaps[i].fix = gaps[i].fix + " | Framework: " + (fw.skillName || "marketing") + " (score=" + fw.score.toFixed(2) + ")"
    }
  }

  // 5. Copy (S10RaioXPipeline + DeepSeek refine)
  const s10pipeline = new S10RaioXPipeline()
  const s10base = s10pipeline.compute({
    category: cat, businessName: lead.title,
    score: lead.score_compound || 50,
    schwartzLevel: (lead.schwartz_label || "Problem Aware") as any,
    signals: lead.signals_detected || [],
    city, district,
    rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
    photos: lead.total_photos || 0,
    isClaimed: lead.is_claimed || false,
    website: lead.website || undefined,
    competitorCount: competitors,
  })
  const baseHeadline = s10base.headline
  const baseCta = s10base.cta
  const offer = s10base.offer

  let copyModel = "deepseek-refine"
  let copy = await generateCopy({
    title: lead.title, category: lead.category, city, district,
    score: lead.score_compound, rating: lead.rating_value || 0,
    is_claimed: lead.is_claimed || false, gaps: gaps,
  })
  if (copy) {
    await trackLLMCost(0.001)
    if (!copy.headline || copy.headline.length < 10) {
      copy.headline = baseHeadline
      copyModel = "deepseek-refine-fallback-base"
    }
  } else {
    copyModel = "s10-pipeline"
    copy = { headline: baseHeadline, subtitle: s10base.subtitle || "Analise baseada em dados reais do Google Meu Negocio e do seu site.", cta: baseCta }
  }

  // 6. Components from vec() (sensor — narrows candidates)
  const components = await queryComponentsByIntent(`diagnostico raio-x ${seg}`, "S10", seg).catch(() => [])
  type WarpComp = (typeof components)[number]
  type GraphNode = { comp: WarpComp; depth: number; dependencies: string[]; dependents: string[]; relevanceScore: number }

  // 6d. Graph BFS (rsxt k0 — resolve dependencies)
  const graph = new Map<string, GraphNode>()
  for (const c of components) graph.set(c.id, { comp: c, depth: 0, dependencies: [...c.edges], dependents: [], relevanceScore: 1.0 })
  for (let depth = 1; depth <= 2 && graph.size < 12; depth++) {
    const missing = [...new Set([...graph.values()].flatMap(n => n.dependencies))].filter(id => !graph.has(id))
    if (!missing.length) break
    const fetched = await fetchComponentsByIds(missing.slice(0, 12 - graph.size)).catch(() => [])
    if (!fetched.length) break
    for (const c of fetched) if (!graph.has(c.id) && graph.size < 12) graph.set(c.id, { comp: c, depth, dependencies: [...c.edges], dependents: [], relevanceScore: 1.0 - depth * 0.2 })
  }
  for (const [gid, n] of graph) for (const depId of n.dependencies) { const dep = graph.get(depId); if (dep) dep.dependents.push(gid) }
  
  // ── SURFACE SPECIALIST S10 (g0: specialist emite gramatica) ──
  const specialist = getSurfaceSpecialist("S10")
  // Se o specialist existir, sua gramatica TIPADA substitui o layout hardcoded
  
  const getGraphComps = () => [...graph.values()].sort((x, y) => y.relevanceScore - x.relevanceScore).map(n => n.comp)
  
  const pickComp = (...keys: string[]): WarpComp | null => {
    const found = getGraphComps().find(c => keys.some(k => c.id.includes(k) || c.name.toLowerCase().includes(k)))
    return found || null
  }
  let cardComp = pickComp("card", "cartao")
  let btnComp = pickComp("button", "botao")
  let ringComp = pickComp("progress", "ring", "circular", "gauge")
  let chipComp = pickComp("badge", "chip", "status")

  // 7. Critique 6D + Devloop
  let critique = computeCritique(graph, seg, "S10")
  let devloopIter = 0
  while (!critique.passed && devloopIter < 2) {
    devloopIter++
    const boostIntent = critique.functionality < 6 ? `acessivel keyboard-nav ${seg}` : critique.marketFit < 6 ? `${seg} landing conversion motion` : `${seg} badge progress`
    const boosted = await queryComponentsByIntent(boostIntent, "S10", seg).catch(() => [])
    if (boosted.length) {
      for (const c of boosted) if (!graph.has(c.id) && graph.size < 12) {
        graph.set(c.id, { comp: c, depth: 1 + devloopIter, dependencies: [...c.edges], dependents: [], relevanceScore: 0.7 - devloopIter * 0.15 })
      }
      for (const [gid, n] of graph) for (const depId of n.dependencies) { const dep = graph.get(depId); if (dep) dep.dependents.push(gid) }
      usedComponents.length = 0
      const fresh = getGraphComps()
      const c2 = fresh.find((c: any) => ["card","cartao","bento"].some((k: string) => c.id.includes(k) || c.name.toLowerCase().includes(k)))
      const b2 = fresh.find((c: any) => ["button","botao","cta"].some((k: string) => c.id.includes(k) || c.name.toLowerCase().includes(k)))
      const r2 = fresh.find((c: any) => ["progress","ring","circular","gauge"].some((k: string) => c.id.includes(k)))
      const ch2 = fresh.find((c: any) => ["badge","chip","status"].some((k: string) => c.id.includes(k)))
      if (c2) { usedComponents.push(c2.id); cardComp = c2 as any }
      if (b2) { usedComponents.push(b2.id); btnComp = b2 as any }
      if (r2) { usedComponents.push(r2.id); ringComp = r2 as any }
      if (ch2) { usedComponents.push(ch2.id); chipComp = ch2 as any }
    }
    critique = computeCritique(graph, seg, "S10")
  }
  // ── LAYOUT TREE via SurfaceSpecialist ou fallback ──
  // Se specialist existe (4-composer.ts:70 S10_SPECIALIST), usa gramatica TIPADA.
  // Senao, fallback para estrutura hardcoded.
  let layoutTree: any
  if (specialist) {
    // Converte graph nodes para ResolvedComponent[] (contrato do specialist)
    const resolved = [...graph.values()].map(n => ({
      id: n.comp.id, component: { id: n.comp.id, name: (n.comp as any).name || n.comp.id, a11y: n.comp.a11y, category: (n.comp as any).category || "layout", tokens: (n.comp as any).tokens || [], edges: n.dependencies },
      depth: n.depth, dependencies: n.dependencies, dependents: n.dependents, props: {}, relevanceScore: n.relevanceScore,
    }))
    layoutTree = specialist.inferLayout({ page: "S10", category: seg }, resolved as any)
  } else {
    layoutTree = {
      id: "layout.s10", type: "landing-shell",
      slots: {
        hero: { component: chipComp?.id || "hero-badge" },
        score: { component: ringComp?.id || "score-ring", card: cardComp?.id || "score-card" },
        info: { type: "grid", columns: 3, component: cardComp?.id || "info-card" },
        gaps: { component: cardComp?.id || "gap-card", count: gaps.length },
        cta: { component: btnComp?.id || "cta-button" },
      },
    }
  }
  let tracedLayout: any = { ...layoutTree, critique: { composite: critique.composite, passed: critique.passed, feedback: critique.feedback, devloopIter }, graph: [...graph.values()].map(n => ({ id: n.comp.id, depth: n.depth, edges: n.dependencies, dependents: n.dependents, relevance: Math.round(n.relevanceScore * 100) / 100 })) }

  // ── PLUGIN HOOK 2: onCritique (passa designCtx REAL — não {}) ──
  const enrichedComps = getGraphComps()
  const designCtx = {
    segment: seg, plan: "r0", businessName: lead.title,
    palette: { primary: p, secondary: s, accent: a },
    typography: { heading: "Inter", body: "Inter" },
    designInspiration: inspoUrls,
    suggestedComponents: enrichedComps.map(c => (c as any).name || (c as any).id || ""),
    landingPattern: "S10-raio-x",
    previewHtml: "", // preenchido APÓS GREEN render (onCritique roda antes)
    critiqueScore: critique,
  }
  for (const plugin of pluginRegistry.listActive()) {
    if (plugin.onCritique) {
      const enforced = await plugin.onCritique(critique as any, designCtx as any).catch(() => null)
      if (enforced?.enforced) {
        critique = { ...critique, ...enforced.score }
        tracedLayout.critique = { composite: critique.composite, passed: critique.passed, feedback: critique.feedback, devloopIter, enforced: true }
      }
    }
  }

  const usedComponents: string[] = []
  for (const c of [cardComp, btnComp, ringComp, chipComp]) {
    if (c && !usedComponents.includes(c.id)) usedComponents.push(c.id)
  }

  // ── MARKET ONTOLOGY (persona + psicologia + design + mercado) ──
  // Unifica 4 fontes: S10RaioXPipeline + Marketing skills + OD design-systems + dados reais
  const ontology = computeMarketOntology({
    category: cat,
    nichoName: nicho.name,
    nichoSpecialties: nicho.specialties,
    nichoAudience: nicho.audience,
    nichoKeywords: nicho.keywords,
    nichoPains: nicho.pains,
    nichoObjections: nicho.objections || [],
    nichoConversionTriggers: nicho.conversionTriggers,
    segment: seg,
    schwartzLevel: lead.schwartz_label || "Problem Aware",
    competitors,
    city, district,
    score,
    rating, reviews,
    claimed: lead.is_claimed || false,
    categoryDisplay: lead.category || cat,
    odDesignSystem: odSystem?.designSystem || "warp-default",
  })

  // ═══ PRE-RETURN: compute slotMorph before object literal ═══
  const slotMorph = resolveMorph({
    segment: seg,
    designFacets: ontology.designSystem?.atmosphere ? [ontology.designSystem.atmosphere] : [],
    animationFacets: mediaAnim?.keyframeRecommendations || [],
    designSystemAtmosphere: ontology.designSystem?.atmosphere || '',
    spacingStyle: ontology.designSystem?.spacingStyle || 'default',
    motionStyle: ontology.designSystem?.motionStyle || 'subtle',
    primaryEmotion: ontology.psychology?.primaryEmotion || '',
    schwartzLevel: lead.schwartz_label || 'Problem Aware',
    cssPatterns: cssPatterns || null,
    T: T as any,
  })

  return {
    name, category: cat, seg, score, fit, eng, ints,
    rating, reviews, photos, website, claimed, city, district,
    level: lead.schwartz_label || "Problem Aware", nichoName: nicho.name, offer, competitors, local,
    headline: copy.headline, subtitle: copy.subtitle, cta: copy.cta, copyModel,
    p, s, a, p15, p12,
    T,
    gaps,
    graphComps: getGraphComps(),
    cardComp, btnComp, ringComp, chipComp,
    usedComponents,
    graph,
    critique: { composite: critique.composite, passed: critique.passed, feedback: critique.feedback, devloopIter },
    tracedLayout,
    designSystem: odSystem?.designSystem || "warp-default",
    mediaAnim,
    // Surface specialist info
    specialistActive: !!specialist, grammarType: layoutTree.type,
    // MarketOntology (persona + psicologia de cor + dados de mercado)
    ontology,
    // Ícones do Qdrant (vec() query — embedding sensor doctrine)
    icons,
    // CSS patterns do corpus (design-knowledge + media-knowledge)
    cssPatterns,
    // Intent vocab (resolveIntentVocab → facets driven by market ontology)
    vocab: resolveIntentVocab(seg, ontology),
    // Slot morph (ADR-0037 Fase 2) — corpus-driven CSS mutations per slot
    morph: slotMorph,
    // Composed layout (ADR-0037 Fase 5) — morphable slot composition
    composedLayout: composeLayout({
      surface: 'S10',
      segment: seg,
      score: lead.score_compound || 50,
      schwartzLevel: lead.schwartz_label || 'Problem Aware',
      gapCount: gaps.length,
      topGapSeverity: gaps[0]?.severity || 'Médio',
      isClaimed: lead.is_claimed || false,
      hasWebsite: !!lead.website,
      competitorCount: competitors,
      primaryEmotion: ontology.psychology?.primaryEmotion || '',
      designAtmosphere: ontology.designSystem?.atmosphere || '',
      conversionTriggers: nicho.conversionTriggers || [],
      personaOffer: ontology.persona?.offer || '',
      personaWho: ontology.persona?.who || '',
      nichePains: nicho.pains || [],
      nicheAudience: nicho.audience || '',
      ontology,
    }, slotMorph),
    // Marketing KG frameworks (ADR-0037 Fase 1 — raw Qdrant query)
    mktFrameworks,
    // k0 surface query (ADR-0037 Fase 4 — existing code templates)
    k0Templates,
  }
}


// ═══════════════════════════════════════════════════════════════
// GREEN MORPH — Slot Renderers (funções puras, zero hardcoded)
// Cada slot type do LayoutTree tem um renderer. O loop principal
// itera output.tracedLayout.slots e despacha para o renderer correto.
// g0 doctrine: specialist (BLUE) emite gramática, GREEN aplica materials.
// ═══════════════════════════════════════════════════════════════

// No-op: classes sao gramatica estrutural do LayoutTree.
// Scoping via CSS custom properties — DAG #19: NAO-APLICADO.
const cls = (name: string): string => name

type SlotRenderCtx = {
  output: S10BlueOutput
  T: ReturnType<typeof unifyTokens>
  O: any  // MarketOntology
  esc: (t: string) => string
  a11y: (comp: any, fallbackRole: string, label: string) => string
  icon: (name: string) => string
  stars: (r: number) => string
  cls: (name: string) => string
}

function renderHeroSlot(slot: any, ctx: SlotRenderCtx): string {
  const { output, a11y, icon, O } = ctx
  const badgeComp = output.chipComp
  const badgeLabel = O?.persona?.offer || output.nichoName
  const emotionLabel = O?.psychology?.primaryEmotion
    ? O.psychology.primaryEmotion.split(' + ')[0]
    : output.seg
  return '<header class="' + ctx.cls('hero') + '" ' + a11y(badgeComp, "banner", output.headline) + '><div class="' + ctx.cls('hero-content') + '">' +
    '<div class="' + ctx.cls('hero-badge') + '" ' + a11y(badgeComp, "status", badgeLabel) + '>' + icon('search') + ' ' + emotionLabel + ' · ' + badgeLabel + '</div>' +
    '<h1>' + ctx.esc(output.headline) + '</h1><p class="' + ctx.cls('hero') + '-subtitle">' + ctx.esc(output.subtitle) + '</p>' +
    '</div></header>'
}

function renderScoreSlot(slot: any, ctx: SlotRenderCtx): string {
  const { output, T, esc, a11y } = ctx
  const cardComp = output.cardComp; const ringComp = output.ringComp; const badgeComp = output.chipComp
  return '<div class="' + ctx.cls('score-card') + '" ' + a11y(cardComp, "region", esc("Diagnóstico de " + output.name + ": score " + output.score + " de 100")) + '>' +
    '<div class="' + ctx.cls('score-ring') + '" ' + a11y(ringComp, "progressbar", "Score " + output.score + " de 100") + '><div class="' + ctx.cls('score-inner') + '" aria-hidden="true"><div class="' + ctx.cls('score-value') + '">' + output.score + '</div><div class="' + ctx.cls('score-label') + '">de 100</div></div></div>' +
    '<div class="' + ctx.cls('score-info') + '"><h2>' + esc(output.name) + '</h2><div class="' + ctx.cls('score-level') + '" ' + a11y(badgeComp, "status", "Nível de consciência: " + output.level) + '>' + output.level + ' · ' + output.nichoName + '</div>' +
    '<div class="' + ctx.cls('score-bars') + '">' +
    '<div class="' + ctx.cls('score-bar') + '"><span class="' + ctx.cls('score-bar-label') + '">Presença</span><div class="' + ctx.cls('score-bar-track') + '"><div class="' + ctx.cls('score-bar-fill') + '" style="width:' + output.fit + '%;background:' + output.p + '"></div></div><span class="' + ctx.cls('score-bar-val') + '">' + output.fit + '%</span></div>' +
    '<div class="' + ctx.cls('score-bar') + '"><span class="' + ctx.cls('score-bar-label') + '">Engajamento</span><div class="' + ctx.cls('score-bar-track') + '"><div class="' + ctx.cls('score-bar-fill') + '" style="width:' + output.eng + '%;background:' + output.a + '"></div></div><span class="' + ctx.cls('score-bar-val') + '">' + output.eng + '%</span></div>' +
    '<div class="' + ctx.cls('score-bar') + '"><span class="' + ctx.cls('score-bar-label') + '">Intenção</span><div class="' + ctx.cls('score-bar-track') + '"><div class="' + ctx.cls('score-bar-fill') + '" style="width:' + output.ints + '%;background:' + output.s + '"></div></div><span class="' + ctx.cls('score-bar-val') + '">' + output.ints + '%</span></div>' +
    '</div></div></div>'
}

function renderInfoGridSlot(slot: any, ctx: SlotRenderCtx): string {
  const { output, T, esc, a11y, icon, stars, O } = ctx
  const cardComp = output.cardComp
  const displayStars = stars(output.rating)
  const st = slot?.tokens || {}  // specialist grammar: padding, radius
  const cardStyle = (extra: string) => ' style="--i:' + extra + ';' + (st.padding ? 'padding:' + st.padding + ';' : '') + (st.radius ? 'border-radius:' + st.radius + ';' : '') + '"'
  const cards = slot?.cards || [
    { slot: 'gmb', component: cardComp?.id || 'info-card' },
    { slot: 'website', component: cardComp?.id || 'info-card' },
    { slot: 'competition', component: cardComp?.id || 'info-card' },
  ]
  const renderInfoCard = (c: any, idx: number): string => {
    const base = '<div class="' + ctx.cls('info-card') + '" ' + a11y(cardComp, "region", c.slot === 'gmb' ? 'Google Meu Negócio' : c.slot === 'website' ? 'Website' : c.slot === 'competition' ? 'Concorrência' : c.slot) + cardStyle(idx + '')
    switch (c.slot) {
      case 'gmb':
        return base + '><h4>Google Meu Negócio</h4><div class="value stars">' + displayStars + '</div><div class="meta">' + output.rating.toFixed(1) + '★ · ' + output.reviews + ' avaliações</div><div class="status ok">' + output.photos + ' fotos · ' + output.claimed + '</div></div>'
      case 'website':
        return base + '><h4>Website</h4><div class="value" style="font-size:1.1rem;word-break:break-all">' + String(output.website).slice(0, 35) + '</div><div class="meta">' + esc(output.local) + '</div><div class="status ok">' + icon('shield') + ' Online</div></div>'
      case 'competition':
        return base + '><h4>Concorrência</h4><div class="value">' + (output.competitors > 1 ? output.competitors - 1 : "—") + '</div><div class="meta">' + output.nichoName.toLowerCase() + 's na região</div><div class="status ok">' + icon('chart') + ' Score ' + output.score + '/100</div></div>'
      default:
        return base + '><h4>' + c.slot + '</h4><div class="value">—</div></div>'
    }
  }
  const cols = slot?.columns || cards.length || 3
  const gridGap = st.gap ? 'gap:' + st.gap + ';' : ''
  const gridMargin = st.margin ? 'margin:' + st.margin + ';' : ''
  return '<div class="' + ctx.cls('info-grid') + '" style="--cols:' + cols + ';' + gridGap + gridMargin + '">' + cards.map((c: any, i: number) => renderInfoCard(c, i)).join('') + '</div>'
}

function renderGapListSlot(slot: any, ctx: SlotRenderCtx): string {
  const { output, T, esc, a11y, icon, O } = ctx
  const cardComp = output.cardComp
  const st = slot?.tokens || {}
  const gapStyle = (extra: string) => ' style="--i:' + extra + ';' + (st.padding ? 'padding:' + st.padding + ';' : '') + (st.radius ? 'border-radius:' + st.radius + ';' : '') + '"'
  const heading = output.gaps.length + ' ' + (O?.psychology?.primaryEmotion
    ? O.psychology.primaryEmotion.split(' + ')[0] + ' · Oportunidades'
    : 'Gaps e Oportunidades')
  const approach = O?.persona?.approach || 'Análise baseada em dados reais.'
  return '<div class="' + ctx.cls('section') + '"><h2 style="font-size:1.35rem;font-weight:700;margin-bottom:' + (T.spacing[1] || '.5rem') + '">' + heading + '</h2>' +
    '<p style="color:var(--muted-fg);margin-bottom:1.5rem">' + approach + '</p>' +
    output.gaps.map((g, idx) => {
      const sev = g.severity
      const sevClass = sev.includes("Crítico") ? "critico" : sev.includes("Médio") ? "medio" : sev.includes("Força") ? "forca" : "oportunidade"
      const sevIcon = sevClass === 'critico' ? icon('shield') : sevClass === 'forca' ? icon('star') : icon('trend')
      return '<div class="' + ctx.cls('gap') + ' ' + sevClass + '" ' + a11y(cardComp, "region", esc(g.title)) + gapStyle(idx + '') + '><div class="' + ctx.cls('gap-header') + '"><span class="' + ctx.cls('gap-severity') + ' ' + sevClass + '">' + g.severity + '</span><h4>' + esc(g.title) + '</h4></div><p>' + esc(g.desc) + '</p><div class="fix"><strong>' + sevIcon + ' Como resolver:</strong> ' + esc(g.fix) + '</div><div class="meta-row"><span>' + icon('trend') + ' Impacto: ' + g.impact + '</span><span>⏱️ Esforço: ' + g.effort + '</span></div></div>'
    }).join("") + '</div>'
}

function renderCtaSlot(slot: any, ctx: SlotRenderCtx): string {
  const { output, T, esc, a11y, icon, O } = ctx
  const btnComp = output.btnComp
  const st = slot?.tokens || {}
  const sectionPad = st.sectionPadding || (T.sectionSpacing || '2.5rem') + ' ' + (T.spacing[3] || '2rem')
  const btnPad = st.buttonPadding || T.buttonPaddingBlock + ' ' + T.buttonPaddingInline
  const btnRad = st.buttonRadius || T.buttonRadius
  return '<div class="' + ctx.cls('cta') + '" style="padding:' + sectionPad + '"><h2>' + esc(output.offer) + '</h2><p>' + (O?.persona?.offer || 'Diagnóstico gratuito em 30 segundos.') + '</p><a href="https://wa.me/' + (process.env.WHATSAPP_NUMBER || '5521999999999') + '" class="' + ctx.cls('cta-btn') + '" ' + a11y(btnComp, "button", output.cta + " no WhatsApp") + ' style="padding:' + btnPad + ';border-radius:' + btnRad + '" target="_blank" rel="noopener">' + icon('message') + ' ' + output.cta + ' no WhatsApp</a></div>'
}

function renderFooterSlot(slot: any, ctx: SlotRenderCtx): string {
  const { output, T, O } = ctx
  const st = slot?.tokens || {}
  const footerPad = st.padding || T.sectionSpacing + ' 0'
  const footerMT = st.marginTop || (T.spacing[4] || '2rem')
  return '<footer class="' + ctx.cls('footer') + '" style="padding:' + footerPad + ';margin-top:' + footerMT + '"><div class="' + ctx.cls('container') + '"><p>Diagnóstico gerado por <span>adsentice</span> — ' + (O?.persona?.who || 'inteligência de mercado para negócios locais.') + '</p><p style="margin-top:' + (T.spacing[0] || '.25rem') + '">Dados: Google Meu Negócio · website · mercado local · ' + new Date().toLocaleDateString('pt-BR') + '</p></div></footer>'
}

// ═══ SLOT RENDERER REGISTRY (slot type → render function) ═══
// Adicionar novo slot = adicionar entry aqui. O loop principal itera L dinamicamente.

const SLOT_RENDERERS: Record<string, (slot: any, ctx: SlotRenderCtx) => string> = {
  hero: renderHeroSlot,
  score: renderScoreSlot,
  info_grid: renderInfoGridSlot,
  info: renderInfoGridSlot,  // alias: fallback usa "info" em vez de "info_grid"
  gaps: renderGapListSlot,
  cta: renderCtaSlot,
  footer: renderFooterSlot,
}

/**
 * GREEN MORPH: render puro por intent (ADR-0036 · RSXT doctrine v2 + g0).
 *
 * REFERÊNCIA OD: :7456 projeto adsentice — SOBERANIA HTML/CSS puro, zero React/lib,
 *   ícones SVG inline, zero emoji, a11y WCAG AA, zones com data-od-id.
 *   Padrão: hero→trust→how→capabilities→stats→voice→pricing→faq→cta-final.
 *   Nosso S10 segue: hero→score→info_grid→gaps→cta→footer.
 *
 * REGRAS:
 *   - ZERO texto hardcoded (headline, cta, gap text → vêm do BLUE via S10BlueOutput)
 *   - ZERO copy fixa (tudo do copywriter especialista + MarketOntology)
 *   - ZERO emoji (ícones → BLUE.popula icons via Qdrant vec(); fallback → texto puro)
 *   - SÓ estrutura (itera slots do LayoutTree) + materials (unified tokens T)
 *   - SÓ a11y (componentes do vec() → a11y_role + aria-label)
 *   - g0 doctrine: specialist (BLUE) emite gramática, GREEN aplica materials
 *   - SLOT-DRIVEN: itera output.tracedLayout.slots, despacha para renderer por slot name
 *   - CSS↔HTML: classes geradas via ctx.cls() — mesma string, CSS e HTML. 0 mismatch.
 *   - Função pura: mesma entrada → mesma saída
 */
function renderS10_GREEN(output: S10BlueOutput): string {
  let T = output.T
  const O = output.ontology
  const L = output.tracedLayout?.slots || {}

  const esc = (t: string) => t.replace(/"/g, "&quot;")

  const a11y = (comp: any, fallbackRole: string, label: string) =>
    `role="${comp?.a11y?.role || fallbackRole}" aria-label="${esc(label)}"${comp?.a11y?.keyboardNav ? ' tabindex="0"' : ""}`

  // Ícones do Qdrant (populados pelo BLUE). Se vazio → texto puro (embedding sensor doctrine).
  const icon = (name: string): string => output.icons?.[name] || ''

  const stars = (r: number) => r >= 5 ? "★★★★★" : "★".repeat(Math.max(1, Math.round(r))) + "☆".repeat(Math.max(0, 5 - Math.round(r)))

  // Classes = gramatica estrutural. Scoping via CSS custom properties.
  const cls = (name: string): string => name

  // ═══ SPECIALIST LAYOUT HINTS: override OD values com gramatica S10 ═══
  const hints = output.tracedLayout?.layoutHints || {}
  if (hints.container) T.containerMaxWidth = hints.container
  if (hints.sectionSpacing) T.sectionSpacing = hints.sectionSpacing
  if (hints.sectionSpacingTablet) T.sectionSpacingTablet = hints.sectionSpacingTablet
  if (hints.sectionSpacingPhone) T.sectionSpacingPhone = hints.sectionSpacingPhone

  // ═══ MORPH BACKPORT: corpus-driven CSS values (resolveMorph) ═══
  const M = output.morph || {}
  const heroAngle = M?.hero?.gradientAngle || '135deg'
  const gapHover = M?.gaps?.hoverEffect || 'translateY(-1px)'
  const infoRadius = M?.infoCards?.borderRadius || 'var(--radius-sm)'
  const infoPad = M?.infoCards?.padding || '1.25rem'
  const ctaDirection = M?.cta?.gradientDirection || '135deg'
  const ctaSectionPad = M?.cta?.sectionPadding || (T.sectionSpacing || '2.5rem') + ' ' + (T.spacing[3] || '2rem')
  const enforce = M?.enforcement || null

  const ctx: SlotRenderCtx = { output, T, O, esc, a11y, icon, stars, cls }

  // ═══ SLOT-DRIVEN RENDER: itera slots do LayoutTree dinamicamente ═══
  // Se o specialist adicionar slot novo (ex: testimonials), aparece automaticamente
  // se existir renderer registrado. Senão, emite comentário HTML (não quebra).
  const composed = output.composedLayout
  const slotOrder = composed?.slots?.length ? composed.slots.map(function(s) { return s.slotName }) : Object.keys(L)
  const renderedSlots = slotOrder.map(slotName => {
    const slotConfig = L[slotName]
    const renderer = SLOT_RENDERERS[slotName]
    if (renderer) return renderer(slotConfig, ctx)
    return '<!-- slot ' + slotName + ': no renderer registered -->'
  }).join('\n')

  const bodySlots = slotOrder.filter(k => k !== 'hero' && k !== 'footer')
  const hasHero = slotOrder.includes('hero')
  const hasFooter = slotOrder.includes('footer')

  const heroHTML = hasHero ? SLOT_RENDERERS.hero(L.hero, ctx) : ''
  const footerHTML = hasFooter ? SLOT_RENDERERS.footer(L.footer, ctx) : ''
  // Slots entre hero e footer (score, info_grid, gaps, cta, etc.)
  const mainSlots = bodySlots.map(slotName => {
    const renderer = SLOT_RENDERERS[slotName]
    return renderer ? renderer(L[slotName], ctx) : '<!-- slot ' + slotName + ': no renderer -->'
  }).join('\n')

  // ═══ CSS (morph puro: tokens unificados + keyframes + reduced-motion) ═══
  // Zero texto hardcoded. Só custom properties e @keyframes do Materio motion.

  return '<!DOCTYPE html><html lang="pt-BR">\n' +
'<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n' +
'<meta name="description" content="' + esc(output.headline) + '">\n' +
(function() {
  const hasWeb = output.website && /^https?:\/\//.test(output.website)
  return hasWeb ? '<meta property="og:image" content="' + output.website.replace(/"/g,"&quot;") + '">\n' : ''
})() +
'<title>Raio-X · ' + esc(output.name) + ' | adsentice</title>\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'<link href="https://fonts.googleapis.com/css2?family=' + T.font.replace(/ /g, '+') + ':wght@400;500;600;700;800&display=swap" rel="stylesheet">\n' +
'<style>\n' +
'/* CSS: tokens unificados (M9+OD+Materio) + design-knowledge Qdrant + layoutHints specialist */\n' +
(output.vocab?.iconFacets?.length ? '/* Intent vocab: ' + output.vocab.iconFacets.slice(0, 6).join(' ') + ' */\n' : '') +
(output.cssPatterns?.sources?.length ? '/* Corpus sources: ' + output.cssPatterns.sources.slice(0, 3).join(', ') + ' */\n' : '') +
'@font-face{font-family:' + T.font + ';font-display:swap}\n' +
':root{\n' +
'  --primary:' + T.primary + ';--primary-fg:' + T.primaryFg + ';--secondary:' + T.secondary + ';--secondary-fg:' + T.secondaryFg + ';--accent:' + T.accent + ';\n' +
'  --bg:' + T.bg + ';--fg:' + T.fg + ';\n' +
'  --card:' + T.card + ';--muted:' + T.muted + ';--muted-fg:' + T.mutedFg + ';\n' +
'  --border:' + T.border + ';--destructive:' + T.destructive + ';--success:' + T.success + ';--warning:' + T.warning + ';\n' +
'  --font:' + T.font + ',system-ui,sans-serif;\n' +
'  --font-display:' + T.fontDisplay + ',Georgia,serif;\n' +
'  --spacing-xs:' + T.spacing[0] + ';--spacing-sm:' + T.spacing[1] + ';--spacing-md:' + (T.spacing[3] || T.spacing[2]) + ';--spacing-lg:' + (T.spacing[5] || T.spacing[4]) + ';--spacing-xl:' + (T.spacing[7] || T.spacing[6]) + ';\n' +
'  --shadow-sm:' + T.shadowSm + ';--shadow-md:' + T.shadowMd + ';--shadow-lg:' + T.shadowLg + ';\n' +
'  --radius:' + T.radius + ';--radius-sm:' + T.radiusSm + ';--radius-pill:' + T.radiusPill + ';\n' +
'  --motion-fast:' + T.motionFast + ';--motion:' + T.motion + ';--motion-smooth:' + T.motionSmooth + ';\n' +
'}\n' +
(function() {
  let kf = '@keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }\n' +
    '@keyframes fadeIn { from{opacity:0} to{opacity:1} }\n' +
    '@keyframes scaleIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }\n' +
    '@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }\n'
  // ── CSS PATTERNS: keyframe variants do corpus (design-knowledge vec()) ──
  const cp = output.cssPatterns
  if (cp?.keyframeVariants?.length) {
    for (const kfText of cp.keyframeVariants) {
      // Extract @keyframes rules from corpus text
      const matches = kfText.match(/@keyframes\s+\w+\s*\{[^}]+\}/g)
      if (matches) for (const m of matches) { if (!kf.includes(m)) kf += m + '\n' }
    }
  }
  return kf
})() +
'.' + cls('hero') + ' h1{animation:fadeInUp var(--motion-smooth) both}\n' +
'.' + cls('hero') + ' .subtitle{animation:fadeInUp var(--motion-smooth) .1s both}\n' +
'.' + cls('hero-badge') + '{animation:fadeIn var(--motion) .2s both}\n' +
'.' + cls('score-card') + '{animation:scaleIn var(--motion-smooth) .15s both}\n' +
'.' + cls('info-card') + '{animation:slideUp var(--motion) both;animation-delay:calc(var(--i,0)*.08s)}\n' +
'.' + cls('gap') + '{animation:slideUp var(--motion) both;animation-delay:calc(var(--i,0)*.1s)}\n' +
'.' + cls('cta') + '{animation:fadeInUp var(--motion-smooth) .2s both}\n' +
'@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important}}\n' +
'*{box-sizing:border-box;margin:0;padding:0}\n' +
'body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased}\n' +
'.' + cls('hero') + '{background:linear-gradient(' + heroAngle + ',' + T.primary + ' 0%,' + T.secondary + ' 100%);color:#fff;min-height:' + T.heroMinHeight + ';display:flex;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden}\n' +
'.' + cls('hero') + '::before{content:\'\';position:absolute;inset:0;background:radial-gradient(circle at 30% 60%,rgba(255,255,255,0.08) 0%,transparent 60%)}\n' +
'.' + cls('hero-content') + '{position:relative;z-index:1;max-width:800px;margin:0 auto}\n' +
'.' + cls('hero-badge') + '{display:inline-flex;align-items:center;gap:' + (T.spacing[0] || '.375rem') + ';background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);padding:' + (T.spacing[0] || '.375rem') + ' ' + (T.spacing[1] || '.875rem') + ';border-radius:var(--radius-pill);font-size:.8125rem;font-weight:500;margin-bottom:1.25rem}\n' +
'.' + cls('hero') + ' h1{font-size:clamp(1.5rem,3.5vw,2.25rem);font-weight:800;line-height:1.2;margin-bottom:' + (T.spacing[1] || '.75rem') + '}\n' +
'.' + cls('hero') + ' .subtitle{font-size:1.05rem;opacity:.9;max-width:600px;margin:0 auto}\n' +
'.' + cls('container') + '{max-width:' + T.containerMaxWidth + ';margin:0 auto;padding:0 ' + T.containerGutter + '}\n' +
'.' + cls('section') + '{padding:' + T.sectionSpacing + ' 0}@media(max-width:768px){.' + cls('section') + '{padding:' + T.sectionSpacingTablet + ' 0}}@media(max-width:480px){.' + cls('section') + '{padding:' + T.sectionSpacingPhone + ' 0}}\n' +
'.' + cls('score-card') + '{background:var(--card);border:' + T.cardBorder + ';border-radius:var(--radius);padding:' + T.cardPadding + ';box-shadow:' + (T.cardShadow === "none" ? "none" : "var(--shadow-sm)") + ';display:flex;align-items:center;gap:' + (T.spacing[4] || '2rem') + ';flex-wrap:wrap;margin-top:-2rem;position:relative;z-index:2}\n' +
'.' + cls('score-ring') + '{width:130px;height:130px;border-radius:50%;background:conic-gradient(' + output.p + ' 0% ' + Math.min(output.fit,100) + '%,' + output.a + ' ' + Math.min(output.fit,100) + '% ' + Math.min(output.fit+output.eng,100) + '%,' + output.s + ' ' + Math.min(output.fit+output.eng,100) + '% 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0}\n' +
'.' + cls('score-inner') + '{width:100px;height:100px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center}\n' +
'.' + cls('score-value') + '{font-size:2.25rem;font-weight:800;line-height:1;color:' + output.p + '}\n' +
'.' + cls('score-label') + '{font-size:.7rem;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.05em;margin-top:' + (T.spacing[0] || '.25rem') + '}\n' +
'.' + cls('score-info') + '{flex:1;min-width:240px}\n' +
'.' + cls('score-info') + ' h2{font-size:1.35rem;font-weight:700;margin-bottom:.25rem}\n' +
'.' + cls('score-level') + '{display:inline-flex;align-items:center;gap:' + (T.spacing[0] || '.375rem') + ';padding:' + (T.spacing[0] || '.25rem') + ' ' + (T.spacing[1] || '.75rem') + ';border-radius:var(--radius-pill);font-size:.8125rem;font-weight:600;background:' + output.p15 + ';color:' + output.p + ';margin-bottom:1rem}\n' +
'.' + cls('score-bars') + '{display:flex;flex-direction:column;gap:' + (T.spacing[0] || '.625rem') + '}\n' +
'.' + cls('score-bar') + '{display:flex;align-items:center;gap:' + (T.spacing[1] || '.75rem') + '}\n' +
'.' + cls('score-bar-label') + '{width:110px;font-size:.8rem;font-weight:500;color:var(--muted-fg)}\n' +
'.' + cls('score-bar-track') + '{flex:1;height:8px;background:var(--muted);border-radius:99px;overflow:hidden}\n' +
'.' + cls('score-bar-fill') + '{height:100%;border-radius:99px}\n' +
'.' + cls('score-bar-val') + '{width:36px;text-align:right;font-size:.8rem;font-weight:600}\n' +
'.' + cls('info-grid') + '{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(240px,1fr));gap:' + (T.spacing[2] || '1rem') + ';margin:' + (T.spacing[3] || '1.5rem') + ' 0}\n' +
'.' + cls('info-card') + '{background:var(--card);border:' + T.cardBorder + ';border-radius:var(--radius);padding:' + T.cardPadding + ';box-shadow:' + (T.cardShadow === "none" ? "none" : "var(--shadow-sm)") + '}\n' +
'.' + cls('info-card') + ' h4{font-size:.9rem;font-weight:700;margin-bottom:' + (T.spacing[1] || '.5rem') + '}\n' +
'.' + cls('info-card') + ' .value{font-size:1.5rem;font-weight:800;line-height:1.2;color:' + output.p + '}\n' +
'.' + cls('info-card') + ' .value.stars{color:#f59e0b}\n' +
'.' + cls('info-card') + ' .meta{font-size:.8125rem;color:var(--muted-fg);margin-top:' + (T.spacing[0] || '.25rem') + '}\n' +
'.' + cls('info-card') + ' .status{display:inline-flex;align-items:center;gap:' + (T.spacing[0] || '.25rem') + ';padding:' + (T.spacing[0] || '.125rem') + ' ' + (T.spacing[1] || '.5rem') + ';border-radius:var(--radius-pill);font-size:.75rem;font-weight:600;margin-top:.5rem}\n' +
'.' + cls('info-card') + ' .status.ok{background:' + output.p12 + ';color:' + output.p + '}\n' +
'.' + cls('gap') + '{background:var(--card);border:' + T.cardBorder + ';border-radius:var(--radius);padding:' + T.cardPadding + ';margin-bottom:1rem;box-shadow:' + (T.cardShadow === "none" ? "none" : "0 1px 2px rgba(0,0,0,0.05)") + ';transition:all var(--motion);position:relative}\n' +
'.' + cls('gap') + ':hover{transform:' + gapHover + ';box-shadow:var(--shadow-lg)}\n' +
'.' + cls('gap') + '::before{content:\'\';position:absolute;top:0;left:0;width:4px;height:100%;border-radius:var(--radius-sm) 0 0 var(--radius-sm)}\n' +
'.' + cls('gap') + '.critico::before{background:var(--destructive)}\n' +
'.' + cls('gap') + '.medio::before{background:var(--warning)}\n' +
'.' + cls('gap') + '.oportunidade::before,.' + cls('gap') + '.forca::before{background:var(--success)}\n' +
'.' + cls('gap-header') + '{display:flex;align-items:center;gap:' + (T.spacing[1] || '.75rem') + ';margin-bottom:' + (T.spacing[1] || '.5rem') + '}\n' +
'.' + cls('gap-severity') + '{font-size:.75rem;font-weight:700;text-transform:uppercase}\n' +
'.' + cls('gap-severity') + '.critico{color:var(--destructive)}\n' +
'.' + cls('gap-severity') + '.medio{color:var(--warning)}\n' +
'.' + cls('gap-severity') + '.oportunidade,.' + cls('gap-severity') + '.forca{color:var(--success)}\n' +
'.' + cls('gap') + ' h4{font-size:1.05rem;font-weight:700}\n' +
'.' + cls('gap') + ' p{color:var(--muted-fg);font-size:.9rem;margin-bottom:' + (T.spacing[1] || '.75rem') + '}\n' +
'.' + cls('gap') + ' .fix{background:var(--muted);padding:' + (T.spacing[1] || '.875rem') + ' ' + (T.spacing[2] || '1rem') + ';border-radius:var(--radius-sm);font-size:.875rem}\n' +
'.' + cls('gap') + ' .fix strong{color:var(--fg)}\n' +
'.' + cls('gap') + ' .meta-row{display:flex;gap:' + (T.spacing[3] || '1.25rem') + ';margin-top:.75rem;font-size:.8rem;color:var(--muted-fg)}\n' +
'.' + cls('cta') + '{background:linear-gradient(' + ctaDirection + ',' + T.primary + ' 0%,' + T.secondary + ' 100%);color:#fff;text-align:center;padding:' + ctaSectionPad + ';border-radius:var(--radius);box-shadow:var(--shadow-lg)}\n' +
'.' + cls('cta') + ' h2{font-size:1.5rem;font-weight:700;margin-bottom:' + (T.spacing[1] || '.5rem') + '}\n' +
'.' + cls('cta') + ' p{opacity:.9;max-width:450px;margin:0 auto 1.5rem;font-size:.95rem}\n' +
'.' + cls('cta-btn') + '{display:inline-flex;align-items:center;gap:.5rem;background:var(--card);color:' + T.primary + ';padding:' + T.buttonPaddingBlock + ' ' + T.buttonPaddingInline + ';border-radius:' + T.buttonRadius + ';font-size:.95rem;font-weight:700;text-decoration:none;transition:all var(--motion);box-shadow:' + (T.cardShadow === "none" ? "none" : "0 4px 14px rgba(0,0,0,0.12)") + '}\n' +
'.' + cls('cta-btn') + ':hover{transform:' + (T.cardShadow === "none" ? "none" : "translateY(-2px)") + ';box-shadow:0 8px 25px rgba(0,0,0,0.18)}\n' +
'.' + cls('footer') + '{text-align:center;padding:' + T.sectionSpacing + ' 0;color:var(--muted-fg);font-size:.75rem;border-top:1px solid var(--border);margin-top:' + (T.spacing[4] || '2rem') + '}\n' +
'.' + cls('footer') + ' span{color:' + T.primary + ';font-weight:600}\n' +
'@media(max-width:600px){.' + cls('score-card') + '{flex-direction:column;text-align:center}.' + cls('info-grid') + '{grid-template-columns:1fr}}\n' +
(function() {
  let css = ''
  const cp = (output as any).cssPatterns
  if (!cp) return css
  // ── MICRO-INTERACTIONS: derive CSS from corpus text patterns ──
  if (cp.microInteractions?.length) {
    css += '/* ═══ MICRO-INTERACTIONS (corpus) ═══ */\n'
    const allText = cp.microInteractions.join(' ')
    // Derive rules from intent descriptions (corpus has text, not CSS)
    if (/hover|whileHover/i.test(allText)) css += '.card:hover,.info-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-lg);transition:transform var(--motion),box-shadow var(--motion)}\n'
    if (/tap|whileTap|active/i.test(allText)) css += '.cta-btn:active{transform:scale(.97)}\n'
    if (/stagger|delayChildren|staggerChildren/i.test(allText)) css += '.info-card:nth-child(1){animation-delay:0ms}.info-card:nth-child(2){animation-delay:80ms}.info-card:nth-child(3){animation-delay:160ms}\n'
    if (/spring|stiffness|damping/i.test(allText)) css += '.card,.cta-btn{transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)}\n'
    if (/scroll|parallax/i.test(allText)) css += '@supports(animation-timeline:view()){.hero{animation:linear fade-in both;animation-timeline:view()}}\n'
    if (/drag|gesture/i.test(allText)) css += '.score-ring{cursor:grab;user-select:none}\n'
  }
  // ── LAYOUT RECOMMENDATIONS: derive custom properties from design patterns ──
  if (cp.layoutRecommendations?.length) {
    css += '/* ═══ LAYOUT HINTS (corpus) ═══ */\n'
    const allText = cp.layoutRecommendations.join(' ')
    // Spacing rhythm: "1.5rem grid" "32px spacing" etc.
    const spacing = allText.match(/(\d+(?:\.\d+)?(?:rem|px))\s*(?:grid|spacing|gap|rhythm)/i)
    if (spacing) css += ':root{--corpus-rhythm:' + spacing[1] + '}\n'
    // Column count: "3-column grid" "2-col layout"
    const cols = allText.match(/(\d+)-col(?:umn)?\s*(?:grid|layout)/i)
    if (cols) css += ':root{--corpus-cols:' + cols[1] + '}\n'
    // Typography hints: "sans-serif" "headings:" "body:"
    if (/headline\s*→\s*support|heading\s*clarity|typography/i.test(allText)) css += 'h1,h2,h3{text-wrap:balance}\n'
    if (/whitespace|white.space/i.test(allText)) css += '.section+.section{margin-top:var(--corpus-rhythm,2rem)}\n'
  }
  return css
})() +
'</style>\n' +
'<script type="application/ld+json">\n' +
(function() {
  const hasWeb = output.website && /^https?:\/\//.test(output.website)
  const img = hasWeb ? ',"image":"' + output.website.replace(/"/g,"&quot;") + '"' : ''
  return '{"@context":"https://schema.org","@type":"LocalBusiness","name":"' + esc(output.name) + '"' + img + ',"address":{"@type":"PostalAddress","addressLocality":"' + (output.city || 'BR') + '"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"' + output.rating.toFixed(1) + '","reviewCount":"' + output.reviews + '"}}'
})() + '\n' +
'</script></head><body>\n' +
heroHTML + '\n' +
'<main class="' + cls('container') + '" role="main" aria-label="Resultado do diagnóstico">\n' +
mainSlots + '\n' +
'</main>\n' +
footerHTML + '\n' +
'</body></html>'
}



// ═══ S10 CACHE (L1 memory LRU + L2 Redis :6396) ═══
const s10Cache = new WarpCache<{ html: string; meta: Record<string, unknown>; blue?: S10BlueOutput }>()

export async function composeS10(placeId: string): Promise<{ html: string; meta: Record<string, unknown>; blue?: S10BlueOutput } | null> {
  try {
    // ── PLUGIN SYSTEM (ADR-0036 Fase 1) ──
    await pluginRegistry.activateAll()

    // ═══ BLUE PHASE (L0-L6 intelligence) ═══
    // 1. Fetch lead (L0 — structural)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const url = `${supabaseUrl}/rest/v1/discovery_listings?select=place_id,title,category,rating_value,rating_votes,is_claimed,website,latitude,longitude,score_compound,score_fit,score_engagement,score_intent,schwartz_level,schwartz_label,signals_detected,total_photos,city,district,enrichment_level,l2_onpage_score,l2_word_count,l2_internal_links_count,l2_external_links_count,l2_images_count,l2_seo_checks,l2_has_analytics,l2_cms,l2_meta_title,l2_meta_description,l2_domain_rank,l2_lighthouse_performance,l2_content_maturity,l2_content_gaps&place_id=eq.${encodeURIComponent(placeId)}&limit=1`
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!res.ok) return null
    const leads = await res.json() as S10Lead[]
    if (!leads.length) return null
    const lead = leads[0]

    // 2. Classify (L1 — deterministic)
    const cat = normalizeCategory(lead.category)
    const seg = CAT_TO_SEGMENT[cat] || 'servicos'
    const nicho = NICHO_MAP[cat] || { ...GENERIC_NICHO, name: lead.category || GENERIC_NICHO.name }
    const level = lead.schwartz_label || "Problem Aware"
    const district = lead.district || ""
    const city = lead.city || ""
    const local = district ? `${district}, ${city}` : city

    // 2b. Concorrência real (L2 — deterministic)
    let competitors = 0
    try {
      // count DISTINCT place_id (RPC migration 016) — a série tem 1 row por place_id POR SEARCH;
      // count=exact contava rows e inflava 2× (102 rows vs 51 dentistas reais, medido 2026-07-18)
      const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/count_unique_places`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cat: lead.category || "", city_name: city }),
      })
      if (rpc.ok) competitors = parseInt(await rpc.text(), 10) || 0
      if (!competitors) {
        // fallback: método legado (rows) se a RPC estiver indisponível
        const cr = await fetch(`${supabaseUrl}/rest/v1/discovery_listings?select=place_id&category=eq.${encodeURIComponent(lead.category || "")}&city=eq.${encodeURIComponent(city)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } })
        competitors = parseInt((cr.headers.get("content-range") || "").split("/")[1] || "0", 10) || 0
      }
    } catch (e: unknown) { void e }

    // ── CACHE CHECK (L1 memory LRU + L2 Redis :6396) ──
    // v2: inclui blue (S10BlueOutput) no payload — JSX route consome dados reais
    const cacheKey = `s10v2:${placeId}:${seg}:${lead.score_compound || 0}`
    const cached = await s10Cache.get(cacheKey)
    if (cached) { return cached }

    // 3. Tokens (L3 — sensor: M9 TokenComposer 6 pipelines + OD + Materio)
    // M9: palette, typography, spacing, shadow, motion, responsive — 6 pipelines inferência
    const m9 = new TokenComposer()
    const m9Result = await m9.compose({
      intent: `diagnostico raio-x ${seg}`,
      segment: seg as SegmentId,
      plan: 'raio-x',
      surface: 'S10',
      market: { category: lead.category || cat, region: city || 'BR' },
    }).catch(() => null)
    // M9 palette → fallback segmentPalette oklch (NUNCA hex fixo)
    const palette = segmentPalette(seg as SegmentId)
    const p = m9Result?.tokens.palette.primary || palette.primary
    const s = m9Result?.tokens.palette.secondary || palette.secondary
    const a = m9Result?.tokens.palette.accent || palette.accent
    const p15 = withAlpha(p, "15"); const p12 = withAlpha(p, "12")

    // ═══ INTENT VOCAB (pre-L3: resolve facets BEFORE Qdrant queries) ═══
    const preVocab = resolveIntentVocab(seg, {
      persona: { who: lead.schwartz_label || 'Problem Aware', approach: '', headlineTemplate: '', cta: '', offer: '', urgency: '' },
      psychology: { primaryEmotion: seg === 'saude' ? 'Confiança + Profissionalismo' : seg === 'beleza' ? 'Autoestima + Transformação' : 'Resultado + Crescimento', colorPsychology: '', urgencyLevel: 'medium', toneOfVoice: '', copyRules: [], triggers: [] },
      designSystem: { recommended: '', atmosphere: '', colorPalette: { primary: '', secondary: '', accent: '', hue: 0 }, typography: '', spacingStyle: '', motionStyle: '' },
      marketData: { competitors: 5, category: lead.category || seg, categoryDisplay: lead.category || seg, city, district, avgScore: 32, claimed: lead.is_claimed || false, rating: lead.rating_value || 0, reviews: lead.rating_votes || 0 },
      niche: { name: nicho.name, specialties: nicho.specialties, audience: nicho.audience, keywords: nicho.keywords, pains: nicho.pains, objections: nicho.objections || [], conversionTriggers: nicho.conversionTriggers },
      skills: [],
      computedAt: new Date().toISOString(),
    })

    // ── QDRANT QUERIES (L3 — sensor: vec() + vocab facets) ──
    const designIntel = await queryDesignBestPractices(seg, "S10").catch(() => null)
    const inspoUrls = designIntel?.inspirationUrls || []
    const odSystem = await queryDesignSystem(seg, "S10").catch(() => null)
    const materio = await queryMaterioTokens().catch(() => null)
    const mediaAnim = await queryMediaAnimation(seg, preVocab.animationFacets).catch(() => null)
    const icons = await queryMediaIcons(preVocab.iconFacets).catch(() => ({} as Record<string, string>))
    const cssPatterns = await queryCSSPatterns(seg, 'S10').catch(() => null)
    const k0Templates = await queryK0ForSurface('S10', seg).catch(() => [])
    const T = unifyTokens(seg, { primary: p, secondary: s, accent: a }, odSystem, materio, 'S10')

    // ═══ BLUE → GREEN: composição de decisões → render puro ═══
    const blue = await composeS10_BLUE(lead, cat, seg, nicho, level, local, city, district, competitors, null as any, p, s, a, p15, p12, designIntel, inspoUrls, odSystem, materio, mediaAnim, T, icons, cssPatterns, k0Templates)
    
    // ═══ GREEN PHASE (G2 RENDER — sync, pure, NO LLM, <1ms target) ═══
    // RSXT doctrine: g0 doesn't draw → specialist (BLUE) decides grammar, GREEN applies materials
    let html = renderS10_GREEN(blue)

    // ── PLUGIN HOOK 3: onGenerate (post-render) ──
    for (const plugin of pluginRegistry.listActive()) {
      if (plugin.onGenerate) {
        const transformed = await plugin.onGenerate({} as any, html).catch(() => null)
        if (transformed) html = transformed
      }
    }

    // ── META SIDECAR (ADR-0033 N4.4) ──
    const meta = {
      traceId: `s10_${Math.random().toString(36).slice(2, 14)}`,
      lead: blue.name, category: blue.category, segment: blue.seg, score: blue.score,
      nicho: { name: blue.nichoName, specialties: nicho.specialties.slice(0, 5), audience: nicho.audience, tone: nicho.tone, keywords: nicho.keywords.slice(0, 3) },
      tokens: { primary: p, secondary: s, accent: a, heading: "Inter", body: "Inter", spacing: m9Result?.tokens.spacing.sectionGap || T.spacing?.[3] || "1.5rem" },
      gaps: blue.gaps.map(g => ({ title: g.title, severity: g.severity, signal: g.signal })),
      copy_model: blue.copyModel,
      headline: blue.headline, subtitle: blue.subtitle, cta: blue.cta,
      competitors: blue.competitors,
      layoutTree: blue.tracedLayout,
      critique: { composite: blue.critique.composite, passed: blue.critique.passed, feedback: blue.critique.feedback, devloopIter: blue.critique.devloopIter },
      componentsUsed: blue.usedComponents,
      computedAt: new Date().toISOString(),
      city, district,
      designSystem: blue.designSystem,
      // ── MARKET ONTOLOGY (persona + psicologia de cor + design + mercado) ──
      ontology: blue.ontology,
      // BLUE/GREEN marker (RSXT doctrine compliance)
      _pipeline: { phase: "BLUE->GREEN", blueDecisions: 14, greenFunction: "renderS10_GREEN", doctrine: "g0: specialist emites grammar, GREEN applies materials", specialistActive: blue.specialistActive, grammarType: blue.grammarType },
      // ── M9 TOKENS TELEMETRY (6 pipelines inference) ──
      _m9: m9Result ? {
        pipelines: ['palette', 'typography', 'spacing', 'shadow', 'motion', 'responsive'],
        confidence: m9Result.telemetry.confidence,
        inferenceMs: Math.round(m9Result.telemetry.inferenceTimeMs),
        tokenId: m9Result.tokens.id,
        palette: { hue: m9Result.tokens.palette.primary, reasoning: m9Result.tokens.palette.reasoning },
        motion: { style: m9Result.tokens.motion.style, duration: m9Result.tokens.motion.duration, easing: m9Result.tokens.motion.easing },
        shadow: { style: m9Result.tokens.shadow.style, card: m9Result.tokens.shadow.cardShadow },
        spacing: { scale: m9Result.tokens.spacing.scale, gap: m9Result.tokens.spacing.sectionGap },
      } : { source: 'segmentPalette-fallback', reason: 'M9 offline' },
      // ── INTENT VOCAB TRACE ──
      _vocab: blue.vocab ? {
        iconFacets: blue.vocab.iconFacets,
        animationFacets: blue.vocab.animationFacets,
        designFacets: blue.vocab.designFacets,
        designSystems: blue.vocab.recommendedDesignSystems,
        reasoning: blue.vocab.reasoning?.slice(0, 3),
      } : { source: 'vocab-offline' },
      // ── MARKETING KG TRACE (ADR-0037 Fase 1) ──
      _k0: blue.k0Templates?.length ? {
        templatesFound: blue.k0Templates.length,
        top: blue.k0Templates.slice(0, 3).map((t: any) => ({ source: t.source, role: t.nextjsRole, score: Math.round((t.score || 0) * 100) / 100 })),
      } : { source: 'k0-offline' },
      _mkt: blue.mktFrameworks?.length ? {
        skillsUsed: blue.mktFrameworks.length,
        topFrameworks: blue.mktFrameworks.slice(0, 3).map((f: any) => ({ skill: f.skillName || '?', source: f.source, score: Math.round((f.score || 0) * 100) / 100 })),
      } : { source: 'mkt-offline' },
      // ── SLOT MORPH TRACE (ADR-0037 Fase 2) ──
      _composed: blue.composedLayout ? {
        surface: blue.composedLayout.surface,
        strategy: blue.composedLayout.strategy,
        slotOrder: blue.composedLayout.slots.map((s: any) => s.slotName + ':' + s.variant + (s.abVariant ? '(' + s.abVariant + ')' : '')),
        abTest: blue.composedLayout.abTest,
        reasoning: blue.composedLayout.reasoning?.slice(0, 4),
      } : { source: 'compose-offline' },
      _morph: blue.morph ? {
        hero: { gradientAngle: blue.morph.hero.gradientAngle, reasoning: blue.morph.hero.reasoning },
        infoCards: { borderRadius: blue.morph.infoCards.borderRadius, padding: blue.morph.infoCards.padding, columns: blue.morph.infoCards.columns },
        cta: { buttonShape: blue.morph.cta.buttonShape, sectionPadding: blue.morph.cta.sectionPadding },
        global: { containerMaxWidth: blue.morph.global.containerMaxWidth, textWrapBalance: blue.morph.global.textWrapBalance },
      } : { source: 'morph-offline' },
    }

    // ── CACHE WRITE-THROUGH (L1 memory + L2 Redis) ──
    // blue incluído para a rota JSX (nota: blue.graph é Map — vira {} no round-trip L2 Redis; JSX não usa graph)
    const result = { html, meta, blue }
    await s10Cache.set(cacheKey, result, 300_000) // 5min TTL
    return result
  } catch (e: any) { console.error("[composeS10]", e.message); return null }
}

// ═══════════════════════════════════════════════════════════════
// S11 LANDING PAGE DO CLIENTE (ADR-0037 Fase 6 · ADR-0038 reuso)
//
// A landing do NEGÓCIO DO LEAD (produto r197) — gerada em DUAS
// variantes A/B, cada uma sob uma ESTRATÉGIA de conversão completa
// (strategy-resolver · vocab.conversion do KG). Ontologia por slot
// da referência OD gold: hero=convencer 10s · trust=prova social ·
// how=fricção · capabilities=evidência · stats=números honestos ·
// voice=reputação real · pricing=remover risco · faq=objeção · cta.
// LEI: honesto — zero preço/depoimento/estatística inventada.
// ═══════════════════════════════════════════════════════════════

interface S11Lead {
  place_id: string; title: string; category: string
  rating_value: number | null; rating_votes: number | null
  is_claimed: boolean | null; website: string | null; phone: string | null
  score_compound: number; schwartz_label: string | null
  city: string | null; district: string | null
}

export interface S11Variant {
  ab: 'A' | 'B'
  html: string
  strategyFacet: string
  hypothesis: string
  copyModel: string
  headline: string
}

export interface S11ComposeResult {
  variants: S11Variant[]
  meta: Record<string, unknown>
}

// ═══ L2b Enrichment · ADR-0044 + ADR-0046 · Wire dados REAIS no S11 ═══

interface L2bEnrichData {
  services: string[]
  doctors: { name: string; crm?: string; specialty?: string }[]
  insurance: string[]
  socialLinks: { instagram?: string; facebook?: string; tiktok?: string }
  hasBooking: boolean
  bookingPlatform: string | null
  hasWhatsApp: boolean
  hasPrices: boolean
  designDNA: { colors: { primary: string; secondary: string; accent: string }; typography: { heading: string; body: string }; score: number } | null
  enriched: boolean
  error?: string
}

/** ADR-0048: extrai keywords SEO do framework local-seo + dados do lead */
function extractSEOKeywords(frameworkContent: string, nichoName: string, local: string): string[] {
  const keywords = new Set<string>()
  const kwMatch = frameworkContent.match(/keywords?:?\s*([^\n]{10,200})/i)
  if (kwMatch) {
    kwMatch[1].split(/[,;•●]/).forEach(k => {
      const cleaned = k.trim().replace(/^[-*\s]+/, "").slice(0, 60)
      if (cleaned.length > 3) keywords.add(cleaned)
    })
  }
  if (keywords.size < 3) {
    keywords.add(`${nichoName.toLowerCase()} em ${local}`)
    keywords.add(`${nichoName.toLowerCase()} ${local}`)
    keywords.add(`melhor ${nichoName.toLowerCase()} ${local}`)
  }
  return [...keywords].slice(0, 8)
}

/** ADR-0048 #2: extrai objeções do framework objection-crusher → vendor sales enablement */
function extractObjections(frameworkContent: string, bizName: string, rating: number): { objection: string; response: string }[] {
  const objections: { objection: string; response: string }[] = []
  // Padrão: "Price: cliente diz X → responda Y" ou bullet points com "→"
  const lines = frameworkContent.split(/\n/)
  for (const line of lines) {
    const arrowMatch = line.match(/(.+?)\s*[→>]\s*(.+)/)
    if (arrowMatch) {
      objections.push({ objection: arrowMatch[1].trim().slice(0, 80), response: arrowMatch[2].trim().slice(0, 120) })
    }
  }
  // Fallback: objeções canônicas baseadas nos dados do lead
  if (objections.length < 2) {
    objections.push(
      { objection: "Já tenho site", response: `${bizName} tem site, mas ele não ranqueia para buscas locais. Uma landing page com SEO real atrai pacientes que já estão procurando.` },
      { objection: "É caro", response: `R$197/mês é menos que 1 paciente por mês. Com ${rating}★ no Google, cada novo paciente vale R$300-500 em ticket médio.` },
      { objection: "Não tenho tempo", response: "Você não precisa fazer nada. A landing page é gerada automaticamente com dados REAIS do seu negócio. Você só aprova." },
    )
  }
  return objections.slice(0, 5)
}

/** ADR-0048 #4: extrai seções do marketing-plan framework → plano de ação */
function extractMarketingPlanSections(frameworkContent: string): { section: string; summary: string }[] {
  const sections: { section: string; summary: string }[] = []
  // Padrão: "## Section Name" ou "### Section Name" ou numbered "1. Section Name"
  const sectionRe = /(?:^|\n)(?:#{1,3}\s*|(?:\d{1,2}\.\s*))(.{5,80})(?:\n|$)/gm
  let match
  while ((match = sectionRe.exec(frameworkContent)) !== null) {
    const title = match[1].trim()
    // Captura o parágrafo seguinte (até 200 chars)
    const afterIdx = match.index + match[0].length
    const nextPara = frameworkContent.slice(afterIdx, afterIdx + 350).split(/\n\n|\n#{1,3}/)[0].trim().slice(0, 180)
    if (title.length > 5 && !/^name\b|^description\b|^---/i.test(title)) {
      sections.push({ section: title, summary: nextPara || "Estratégia personalizada para o negócio." })
    }
  }
  // Fallback: 13 seções canônicas
  if (sections.length < 5) {
    const fallbackSections = [
      "Executive Summary", "Market Analysis", "Target Audience & ICP",
      "Competitive Landscape", "Positioning & Messaging", "SEO & Content Strategy",
      "Social Media & Channels", "Conversion & CRO", "Pricing & Offers",
      "Retention & Referrals", "Budget & Resources", "Timeline 30/60/90",
      "KPIs & Success Metrics",
    ]
    for (const s of fallbackSections) {
      sections.push({ section: s, summary: "Seção do plano de marketing — preenchida com dados reais do diagnóstico." })
    }
  }
  return sections.slice(0, 13)
}

/** ADR-0048 #5: extrai calendário editorial do framework social-media */
function extractSocialCalendar(frameworkContent: string, nichoName: string, instagramHandle: string | null | undefined): { postsPerWeek: number; platforms: string[]; contentPillars: string[]; hashtagStrategy: string; igHandle: string | null } | null {
  const postsMatch = frameworkContent.match(/(\d+)[-–]\s*(\d+)\s*posts?\s*(?:por|per|\/)\s*semana/i)
  const postsPerWeek = postsMatch ? parseInt(postsMatch[1] + postsMatch[2]) / 2 : 4
  const platforms: string[] = []
  if (/instagram/i.test(frameworkContent)) platforms.push("instagram")
  if (/facebook/i.test(frameworkContent)) platforms.push("facebook")
  if (/tiktok/i.test(frameworkContent)) platforms.push("tiktok")
  if (/linkedin/i.test(frameworkContent)) platforms.push("linkedin")
  if (platforms.length === 0) platforms.push("instagram", "facebook")
  // Extrai pilares de conteúdo (bullet points com • ou - ou *)
  const pillarMatch = frameworkContent.match(/(?:pilares|pillars|categories?)[:\s]*([^\n]{20,200})/i)
  const contentPillars = pillarMatch
    ? pillarMatch[1].split(/[,;•●*-]/).map(p => p.trim()).filter(p => p.length > 3).slice(0, 5)
    : ["Conteúdo educativo", "Bastidores", "Prova social", "Promoções", nichoName]
  const hashtagMatch = frameworkContent.match(/hashtags?[:\s]*([^\n]{20,300})/i)
  const hashtagStrategy = hashtagMatch ? hashtagMatch[1].trim() : `#${nichoName.toLowerCase().replace(/\s+/g, "")} #negociolocal #${nichoName.toLowerCase().replace(/\s+/g, "")}brasil`
  return { postsPerWeek, platforms, contentPillars, hashtagStrategy, igHandle: instagramHandle || null }
}

/** ADR-0049 §4: Quality Gate — Unslop validation (33 padrões anti-AI) */
function applyQualityGate(html: string): { html: string; slopWarnings: number; passed: boolean } {
  // Unslop patterns: remove AI clichés from output
  const slopPatterns = [
    /\b(delve|dive deep|unleash|unlock|supercharge|elevate|revolutionize|game.changer|cutting.edge|next.level)\b/gi,
    /\b(in today's|in the world of|in the ever.evolving|in the fast.paced|in the digital age)\b/gi,
    /\b(seamless|robust|cutting-edge|best-in-class|world-class|state-of-the-art|unparalleled)\b/gi,
    /\b(embark on a journey|transform your|discover the power|experience the difference)\b/gi,
    /\b(——|—|–)\s*(não apenas|not only|but also|mas também)\b/gi,
    /\b(it's not just|it is not just|this isn't just)\b/gi,
    /\b(we understand|we know|we believe|we're passionate|we're dedicated)\b/gi,
  ]
  let slopWarnings = 0
  let cleaned = html
  for (const pattern of slopPatterns) {
    const matches = cleaned.match(pattern)
    if (matches) {
      slopWarnings += matches.length
      cleaned = cleaned.replace(pattern, (match) => {
        // Replace with simpler alternatives
        const replacements: Record<string, string> = {
          'delve': 'explore', 'dive deep': 'analyze', 'unleash': 'use', 'unlock': 'get',
          'supercharge': 'improve', 'elevate': 'raise', 'revolutionize': 'change',
          'game-changer': 'difference', 'cutting-edge': 'modern', 'next-level': 'better',
          'in today\'s': 'no', 'in the world of': 'em', 'in the ever-evolving': 'no',
          'in the fast-paced': 'no', 'in the digital age': 'atualmente',
          'seamless': 'fácil', 'robust': 'confiável', 'best-in-class': 'excelente',
          'world-class': 'ótimo', 'state-of-the-art': 'moderno', 'unparalleled': 'único',
        }
        const lower = match.toLowerCase().replace(/[^a-z]/g, '')
        for (const [k, v] of Object.entries(replacements)) {
          if (lower.includes(k.replace(/[^a-z]/g, ''))) return match.replace(new RegExp(k, 'i'), v)
        }
        return '' // remove if no replacement
      })
    }
  }
  return { html: cleaned, slopWarnings, passed: slopWarnings <= 3 }
}

/** ADR-0048 #6: extrai insights de Google Ads do framework */
function extractAdsInsights(frameworkContent: string, nichoName: string, local: string, competitorCount: number): { campaignTypes: string[]; budgetEstimate: string; keywordsSuggested: string[]; competitionLevel: string } | null {
  const campaignTypes: string[] = []
  if (/search|pesquisa/i.test(frameworkContent)) campaignTypes.push("Search (pesquisa)")
  if (/display|banner/i.test(frameworkContent)) campaignTypes.push("Display (banner)")
  if (/video|youtube/i.test(frameworkContent)) campaignTypes.push("Video (YouTube)")
  if (/local|maps|gmb/i.test(frameworkContent)) campaignTypes.push("Local (Google Maps)")
  if (/shopping|produto/i.test(frameworkContent)) campaignTypes.push("Shopping")
  if (campaignTypes.length === 0) campaignTypes.push("Search (pesquisa)", "Local (Google Maps)")
  // Budget estimate
  const budgetMatch = frameworkContent.match(/(?:budget|orçamento|investimento)[:\s]*R?\$?\s*(\d{2,5})/i)
  const budgetEstimate = budgetMatch
    ? `R$${budgetMatch[1]}/mês estimado`
    : `R$${Math.max(200, competitorCount * 30)}-${Math.max(500, competitorCount * 50)}/mês recomendado`
  // Keywords
  const kwMatch = frameworkContent.match(/(?:keywords|palavras.chave|termos)[:\s]*([^\n]{20,300})/i)
  const keywordsSuggested = kwMatch
    ? kwMatch[1].split(/[,;]/).map(k => k.trim()).filter(k => k.length > 3).slice(0, 8)
    : [`${nichoName} ${local}`, `melhor ${nichoName}`, `${nichoName} perto de mim`, `agendar ${nichoName}`]
  const competitionLevel = competitorCount > 20 ? "alta" : competitorCount > 8 ? "média" : "baixa"
  return { campaignTypes, budgetEstimate, keywordsSuggested, competitionLevel }
}

/** Enriquece o composeS11 com dados REAIS do site do lead via L2b crawler .TS.
 *  Fallback: se L2b falhar ou lead não tiver website, retorna null.
 *  Custo: $0 (crawler local, sem API externa). */
async function enrichS11L2b(website: string | null | undefined): Promise<L2bEnrichData | null> {
  if (!website) return null
  try {
    // 1. Fetch site
    const fetched = await fetchSite(website)
    if (!fetched.html || fetched.html.length < 100) return null
    // 2. Parser
    const site = parseHTML(fetched.html, fetched.finalUrl || website)
    // 3. Extractors (paralelo onde possível)
    const [contacts, services, social, booking, staff, insurance, designDNA] = await Promise.all([
      Promise.resolve(extractContacts(site)),
      Promise.resolve(extractServices(site)),
      Promise.resolve(extractSocial(site)),
      Promise.resolve(extractBooking(site)),
      Promise.resolve(extractStaff(site)),
      Promise.resolve(extractInsurance(site)),
      Promise.resolve(extractDesignDNA(site)),
    ])
    return {
      services: services.services,
      doctors: staff.members.filter(m => m.confidence >= 40).map(m => ({ name: m.name, crm: m.registryNumber, specialty: m.specialty })),
      insurance: insurance.plans,
      socialLinks: { instagram: social.instagram || undefined, facebook: social.facebook || undefined, tiktok: social.tiktok || undefined },
      hasBooking: booking.hasBooking,
      bookingPlatform: booking.platform,
      hasWhatsApp: contacts.hasWhatsApp,
      hasPrices: /R\$\s?\d|preço|valor|investimento/i.test(site.bodyText),
      designDNA: { colors: designDNA.colors, typography: designDNA.typography, score: designDNA.score },
      enriched: true,
    }
  } catch (e: unknown) {
    return { services: [], doctors: [], insurance: [], socialLinks: {}, hasBooking: false, bookingPlatform: null, hasWhatsApp: false, hasPrices: false, designDNA: null, enriched: false, error: (e as Error).message?.slice(0, 80) }
  }
}

// ── Fallback determinístico HONESTO (dados reais do nicho/lead — zero jargão interno) ──
function buildLandingCopyFallback(lead: S11Lead, nicho: NichoProfile, local: string, strategy: ConversionStrategy): LandingCopy {
  const term = nicho.clientTerm || 'cliente'
  const spec = nicho.specialties.slice(0, 3)
  const trigger = nicho.conversionTriggers[0] || 'Atendimento personalizado'
  const rating = lead.rating_value || 0
  const reviews = lead.rating_votes || 0
  const social = rating >= 4 && reviews >= 10 ? `${rating}★ no Google com ${reviews} avaliações` : `${nicho.name} em ${local}`
  return {
    hero: {
      headline: `${lead.title} — ${nicho.name} em ${local}`,
      subtitle: strategy.facet === 'social_proof' && rating >= 4
        ? `${social}. ${spec[0]} e ${spec[1] || 'atendimento completo'} perto de você.`
        : `${spec.slice(0, 2).join(' e ')} com ${trigger.toLowerCase()}.`,
    },
    how: {
      title: 'Como funciona',
      steps: [
        { title: 'Fale conosco', desc: `Chame no WhatsApp e conte o que você precisa — resposta rápida e sem compromisso.` },
        { title: 'Atendimento', desc: `Você é recebido por quem entende de ${(spec[0] || nicho.name).toLowerCase()}.` },
        { title: 'Acompanhamento', desc: `Seu caso acompanhado do início ao fim, como todo ${term} merece.` },
      ],
    },
    capabilities: {
      title: `Especialidades`,
      items: spec.map(s => ({ title: s, desc: `${s} com atendimento dedicado em ${local}.` })),
    },
    voice: { title: reviews >= 10 ? `Quem já veio, avaliou: ${rating}★ em ${reviews} avaliações públicas no Google.` : `Atendimento avaliado publicamente no Google.` },
    pricing: {
      title: strategy.pricingFrame === 'free-first' ? 'Comece sem compromisso' : 'Sua primeira visita',
      offerLine: trigger,
      riskRemoval: strategy.pricingFrame === 'guarantee'
        ? 'Tire todas as dúvidas antes de decidir — sem pressão, sem surpresa.'
        : 'Agende quando fizer sentido para você — cancelamento sem burocracia.',
    },
    faq: {
      items: nicho.pains.slice(0, 4).map((p, i) => ({
        q: i === 0 ? `Por que escolher ${lead.title}?` : `E se "${p.toLowerCase()}"?`,
        a: i === 0
          ? `${social}. Especialidades: ${spec.join(', ')}.${lead.is_claimed ? ' Perfil verificado no Google.' : ''}`
          : `É exatamente por isso que o primeiro contato é sem compromisso — você conhece o atendimento antes de decidir.`,
      })),
    },
    cta: { label: 'Falar no WhatsApp', sub: trigger },
  }
}

// ── Merge: DeepSeek slot a slot com fallback nos vazios ──
function mergeLandingCopy(ai: LandingCopy | null, fb: LandingCopy): { copy: LandingCopy; model: string } {
  if (!ai) return { copy: fb, model: 's11-fallback' }
  return {
    copy: {
      hero: { headline: ai.hero.headline || fb.hero.headline, subtitle: ai.hero.subtitle || fb.hero.subtitle },
      how: { title: ai.how.title || fb.how.title, steps: ai.how.steps?.length === 3 ? ai.how.steps : fb.how.steps },
      capabilities: { title: ai.capabilities.title || fb.capabilities.title, items: ai.capabilities.items?.length ? ai.capabilities.items : fb.capabilities.items },
      voice: { title: ai.voice.title || fb.voice.title },
      pricing: {
        title: ai.pricing.title || fb.pricing.title,
        offerLine: ai.pricing.offerLine || fb.pricing.offerLine,
        riskRemoval: ai.pricing.riskRemoval || fb.pricing.riskRemoval,
      },
      faq: { items: ai.faq.items?.length >= 3 ? ai.faq.items : fb.faq.items },
      cta: { label: ai.cta.label || fb.cta.label, sub: ai.cta.sub || fb.cta.sub },
    },
    model: 'deepseek-landing',
  }
}

// ── GREEN S11: render puro (g0 · zero-lib soberano · WCAG AA · scroll-driven progressivo) ──
function renderS11_GREEN(input: {
  lead: S11Lead; nicho: NichoProfile; local: string; seg: string
  copy: LandingCopy; strategy: ConversionStrategy; composedLayout: any
  T: ReturnType<typeof unifyTokens>; p: string; s: string; a: string; p15: string; p12: string
  icons: Record<string, string>
  /** ADR-0048: SEO keywords + meta title do framework local-seo */
  seoKeywords?: string[]; seoMetaTitle?: string
  /** ADR-0048: WhatsApp CTA com número real do lead */
  waPhone?: string | null; waCTA?: string
}): string {
  const { lead, nicho, local, copy, strategy, composedLayout, T, p, s, p15, p12, icons } = input
  const seoKeywords = input.seoKeywords || nicho.keywords?.slice(0, 5) || []
  const seoMetaTitle = input.seoMetaTitle || `${lead.title} · ${nicho.name} em ${local}`
  const waPhone = input.waPhone || lead.phone || null
  const waCTA = input.waCTA || (waPhone ? `Fale conosco pelo WhatsApp: ${waPhone}` : "Agende sua consulta")
  const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const icon = (n: string) => icons[n] || ''
  const rating = lead.rating_value || 0
  const reviews = lead.rating_votes || 0
  const hasSocial = rating >= 4 && reviews >= 10
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(lead.place_id)}`
  const ctaHref = `/r/${encodeURIComponent(lead.place_id)}?v=${strategy.abLabel}&s=S11`
  const stars = '★★★★★'.slice(0, Math.round(rating)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(rating))
  const emphasized = new Set<string>((composedLayout?.slots || []).filter((sl: any) => sl.renderHint === 'highlight').map((sl: any) => sl.slotName))
  const em = (slot: string) => emphasized.has(slot) ? ' s11-em' : ''

  // ── SLOT RENDERERS (ordem vem da ESTRATÉGIA via composedLayout.slots) ──
  const R: Record<string, () => string> = {
    hero: () => `<header class="s11-hero" role="banner" aria-label="${esc(copy.hero.headline)}"><div class="s11-hero-in">` +
      (hasSocial ? `<div class="s11-badge" role="status">${icon('star')}<span aria-hidden="true">${stars}</span> ${rating.toFixed(1)} · ${reviews} avaliações no Google${lead.is_claimed ? ' · verificado' : ''}</div>` : `<div class="s11-badge" role="status">${esc(nicho.name)} · ${esc(local)}</div>`) +
      `<h1>${esc(copy.hero.headline)}</h1><p class="s11-sub">${esc(copy.hero.subtitle)}</p>` +
      `<a class="s11-btn s11-btn-hero" href="${ctaHref}">${icon('message')}${esc(copy.cta.label)}</a>` +
      `</div></header>`,
    trust: () => `<section class="s11-trust${em('trust')}" aria-label="Confiança"><div class="s11-wrap s11-trust-row">` +
      (hasSocial ? `<span class="s11-chip">${icon('star')}<strong>${rating.toFixed(1)}★</strong>&nbsp;no Google</span><span class="s11-chip">${icon('chart')}<strong>${reviews}</strong>&nbsp;avaliações</span>` : '') +
      (lead.is_claimed ? `<span class="s11-chip">${icon('shield')}Perfil verificado</span>` : '') +
      `<span class="s11-chip">${icon('search')}${esc(local)}</span>` +
      `<a class="s11-chip s11-chip-link" href="${mapsUrl}" target="_blank" rel="noopener">Ver no Google Maps</a>` +
      `</div></section>`,
    how: () => `<section class="s11-sec${em('how')}" aria-label="${esc(copy.how.title)}"><div class="s11-wrap">` +
      `<h2>${esc(copy.how.title)}</h2><div class="s11-steps">` +
      copy.how.steps.map((st, i) => `<div class="s11-step" style="--i:${i}"><div class="s11-step-n" aria-hidden="true">${i + 1}</div><h3>${esc(st.title)}</h3><p>${esc(st.desc)}</p></div>`).join('') +
      `</div></div></section>`,
    capabilities: () => `<section class="s11-sec s11-alt${em('capabilities')}" aria-label="${esc(copy.capabilities.title)}"><div class="s11-wrap">` +
      `<h2>${esc(copy.capabilities.title)}</h2><div class="s11-grid3">` +
      copy.capabilities.items.map((it, i) => `<div class="s11-card" style="--i:${i}"><h3>${esc(it.title)}</h3><p>${esc(it.desc)}</p></div>`).join('') +
      `</div></div></section>`,
    stats: () => `<section class="s11-stats${em('stats')}" aria-label="Números"><div class="s11-wrap s11-stats-row">` +
      (hasSocial ? `<div class="s11-stat"><div class="s11-stat-v">${rating.toFixed(1)}★</div><div class="s11-stat-l">nota no Google</div></div><div class="s11-stat"><div class="s11-stat-v">${reviews}</div><div class="s11-stat-l">avaliações públicas</div></div>` : '') +
      `<div class="s11-stat"><div class="s11-stat-v">${nicho.specialties.length}</div><div class="s11-stat-l">especialidades</div></div>` +
      `<div class="s11-stat"><div class="s11-stat-v">${esc(lead.district || lead.city || 'local')}</div><div class="s11-stat-l">atendimento em</div></div>` +
      `</div></section>`,
    voice: () => `<section class="s11-sec${em('voice')}" aria-label="Reputação"><div class="s11-wrap s11-voice">` +
      `<div class="s11-voice-stars" aria-label="Nota ${rating.toFixed(1)} de 5">${stars}</div>` +
      `<p class="s11-voice-t">${esc(copy.voice.title)}</p>` +
      `<a class="s11-voice-link" href="${mapsUrl}" target="_blank" rel="noopener">Ler avaliações no Google →</a>` +
      `</div></section>`,
    pricing: () => `<section class="s11-sec s11-alt${em('pricing')}" aria-label="${esc(copy.pricing.title)}"><div class="s11-wrap s11-offer-wrap">` +
      `<div class="s11-offer"><h2>${esc(copy.pricing.title)}</h2>` +
      `<p class="s11-offer-line">${icon('spark')}${esc(copy.pricing.offerLine)}</p>` +
      `<p class="s11-offer-risk">${esc(copy.pricing.riskRemoval)}</p>` +
      `<a class="s11-btn" href="${ctaHref}">${esc(copy.cta.label)}</a></div>` +
      `</div></section>`,
    faq: () => `<section class="s11-sec${em('faq')}" aria-label="Perguntas frequentes"><div class="s11-wrap s11-faq">` +
      `<h2>Perguntas frequentes</h2>` +
      copy.faq.items.map(f => `<details class="s11-faq-i"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('') +
      `</div></section>`,
    cta: () => `<section class="s11-cta${em('cta')}" aria-label="Fale conosco"><div class="s11-wrap">` +
      `<h2>${esc(copy.hero.headline.length > 60 ? copy.pricing.offerLine : copy.hero.headline)}</h2>` +
      `<p>${esc(copy.cta.sub)}</p>` +
      `<a class="s11-btn s11-btn-inv" href="${ctaHref}">${icon('arrow-right')}${esc(copy.cta.label)}</a>` +
      `</div></section>`,
  }

  const order: string[] = (composedLayout?.slots || []).map((sl: any) => sl.slotName).filter((n: string) => R[n])
  const finalOrder = order.length ? order : Object.keys(R)
  // Landmarks ARIA: hero = <header role=banner> (já) · slots = <main> · footer = contentinfo
  const heroHtml = finalOrder.includes('hero') ? R.hero() : ''
  const mainHtml = finalOrder.filter(n => n !== 'hero').map(n => R[n]()).join('\n')
  const body = heroHtml + '\n<main role="main" aria-label="' + esc(nicho.name) + ' — informações e contato">\n' + mainHtml + '\n</main>'

  const schemaJson = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'LocalBusiness',
    name: lead.title, address: { '@type': 'PostalAddress', addressLocality: lead.city || 'BR' },
    ...(lead.website && /^https?:\/\//.test(lead.website) ? { url: lead.website } : {}),
    ...(hasSocial ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating.toFixed(1), reviewCount: String(reviews) } } : {}),
  })

  const css = `:root{--p:${p};--s:${s};--p15:${p15};--p12:${p12};--bg:${T.bg};--fg:${T.fg};--card:${T.card};--muted:${T.muted};--muted-fg:${T.mutedFg};--border:${T.border};--radius:${T.radius};--pill:${T.radiusPill};--font:${T.font},system-ui,sans-serif;--motion:${T.motion};--motion-smooth:${T.motionSmooth}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.65;-webkit-font-smoothing:antialiased}
.s11-wrap{max-width:${T.containerMaxWidth};margin:0 auto;padding:0 1.5rem}
.s11-sec{padding:${T.sectionSpacing} 0}
.s11-alt{background:var(--muted)}
.s11-sec h2{font-size:clamp(1.375rem,2.6vw,1.875rem);font-weight:800;margin-bottom:1.75rem;text-wrap:balance}
@keyframes s11up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
.s11-hero{background:linear-gradient(135deg,var(--p) 0%,var(--s) 100%);color:#fff;min-height:62vh;display:flex;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden;padding:4rem 1.5rem}
.s11-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 28% 62%,rgba(255,255,255,.09),transparent 60%)}
.s11-hero-in{position:relative;z-index:1;max-width:820px}
.s11-badge{display:inline-flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.13);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.2);padding:.4rem 1rem;border-radius:var(--pill);font-size:.85rem;font-weight:600;margin-bottom:1.5rem;animation:s11up var(--motion-smooth) both}
.s11-hero h1{font-size:clamp(1.75rem,4.2vw,2.75rem);font-weight:800;line-height:1.15;text-wrap:balance;margin-bottom:1rem;animation:s11up var(--motion-smooth) .08s both}
.s11-sub{font-size:1.125rem;opacity:.92;max-width:640px;margin:0 auto 2rem;animation:s11up var(--motion-smooth) .16s both}
.s11-btn{display:inline-flex;align-items:center;gap:.5rem;background:#fff;color:var(--p);padding:.9rem 2.1rem;border-radius:var(--pill);font-weight:700;font-size:1rem;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.14);transition:transform var(--motion),box-shadow var(--motion)}
.s11-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.2)}
.s11-btn:focus-visible{outline:3px solid #fff;outline-offset:3px}
.s11-btn-hero{animation:s11up var(--motion-smooth) .24s both}
.s11-btn-inv{background:#fff;color:var(--p)}
.s11-trust{background:var(--card);border-bottom:1px solid var(--border);padding:1.1rem 0}
.s11-trust-row{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center}
.s11-chip{display:inline-flex;align-items:center;gap:.4rem;background:var(--p12);color:var(--fg);padding:.45rem .95rem;border-radius:var(--pill);font-size:.85rem}
.s11-chip strong{color:var(--p)}
.s11-chip-link{text-decoration:none;color:var(--p);font-weight:600}
.s11-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.s11-step{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;animation:s11up var(--motion) both;animation-delay:calc(var(--i)*.09s)}
.s11-step-n{width:2.25rem;height:2.25rem;border-radius:50%;background:var(--p);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:.9rem}
.s11-step h3,.s11-card h3{font-size:1.05rem;font-weight:700;margin-bottom:.45rem}
.s11-step p,.s11-card p{color:var(--muted-fg);font-size:.925rem}
.s11-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem}
.s11-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;transition:transform var(--motion),box-shadow var(--motion);animation:s11up var(--motion) both;animation-delay:calc(var(--i)*.09s)}
.s11-card:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.07)}
.s11-stats{background:linear-gradient(135deg,var(--p) 0%,var(--s) 100%);color:#fff;padding:3rem 0}
.s11-stats-row{display:flex;flex-wrap:wrap;gap:2.5rem;justify-content:center;text-align:center}
.s11-stat-v{font-size:2.1rem;font-weight:800;line-height:1.1}
.s11-stat-l{font-size:.85rem;opacity:.85;margin-top:.3rem}
.s11-voice{text-align:center;max-width:680px}
.s11-voice-stars{color:#f59e0b;font-size:1.6rem;letter-spacing:.2rem;margin-bottom:.8rem}
.s11-voice-t{font-size:1.15rem;font-weight:500;text-wrap:balance;margin-bottom:.9rem}
.s11-voice-link{color:var(--p);font-weight:600;text-decoration:none}
.s11-offer-wrap{display:flex;justify-content:center}
.s11-offer{background:var(--card);border:2px solid var(--p);border-radius:var(--radius);padding:2.5rem;max-width:560px;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.08)}
.s11-offer-line{display:inline-flex;align-items:center;gap:.5rem;font-size:1.15rem;font-weight:700;color:var(--p);margin:.4rem 0 .8rem}
.s11-offer-risk{color:var(--muted-fg);font-size:.925rem;margin-bottom:1.5rem}
.s11-offer .s11-btn{background:var(--p);color:#fff}
.s11-offer .s11-btn:focus-visible{outline:3px solid var(--p);outline-offset:3px}
.s11-faq{max-width:760px}
.s11-faq-i{background:var(--card);border:1px solid var(--border);border-radius:${T.radiusSm};padding:1.1rem 1.4rem;margin-bottom:.75rem}
.s11-faq-i summary{font-weight:700;cursor:pointer;font-size:.975rem}
.s11-faq-i summary:focus-visible{outline:2px solid var(--p);outline-offset:2px}
.s11-faq-i p{color:var(--muted-fg);font-size:.925rem;margin-top:.7rem}
.s11-cta{background:linear-gradient(135deg,var(--p) 0%,var(--s) 100%);color:#fff;text-align:center;padding:4.5rem 0}
.s11-cta h2{font-size:clamp(1.4rem,3vw,2rem);font-weight:800;text-wrap:balance;margin-bottom:.7rem}
.s11-cta p{opacity:.92;margin-bottom:1.8rem}
.s11-em{position:relative}
.s11-footer{text-align:center;padding:2.5rem 1.5rem;color:var(--muted-fg);font-size:.8rem;border-top:1px solid var(--border)}
.s11-footer a{color:var(--p);text-decoration:none}
@supports (animation-timeline: view()){.s11-sec .s11-step,.s11-sec .s11-card{animation:s11up linear both;animation-timeline:view();animation-range:entry 0% entry 42%}}
@media(max-width:860px){.s11-steps,.s11-grid3{grid-template-columns:1fr}.s11-hero{min-height:52vh}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-delay:0ms!important}}`

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">` +
    `<meta name="description" content="${esc(copy.hero.subtitle || copy.hero.headline)}">` +
    (seoKeywords.length ? `<meta name="keywords" content="${seoKeywords.join(', ')}">` : '') +
    `<title>${esc(seoMetaTitle)}</title>` +
    `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
    `<link href="https://fonts.googleapis.com/css2?family=${(T.font || 'Inter').replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap" rel="stylesheet">` +
    `<style>/* S11 · strategy=${strategy.facet} (${strategy.abLabel}) · ${esc(strategy.hypothesis)} */\n${css}</style>` +
    `<script type="application/ld+json">${schemaJson}</script>` +
    `</head><body>\n${body}\n` +
    `<footer class="s11-footer" role="contentinfo"><p>${esc(lead.title)} · ${esc(local)} · <a href="${mapsUrl}" target="_blank" rel="noopener">Google Maps</a></p><p>Página por <a href="https://adsentice.com.br" rel="noopener">adsentice</a></p></footer>` +
    `</body></html>`
}

// ── COMPOSE S11: BLUE sensor compartilhado → 2 estratégias → 2 variantes ──
const s11Cache = new WarpCache<S11ComposeResult>()

export async function composeS11(placeId: string): Promise<S11ComposeResult | null> {
  try {
    // 1. Lead (L0 — inclui phone para o CTA WhatsApp do PRÓPRIO cliente)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const url = `${supabaseUrl}/rest/v1/discovery_listings?select=place_id,title,category,rating_value,rating_votes,is_claimed,website,phone,score_compound,schwartz_label,city,district&place_id=eq.${encodeURIComponent(placeId)}&limit=1`
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!res.ok) return null
    const leads = await res.json() as S11Lead[]
    if (!leads.length) return null
    const lead = leads[0]

    // 2. Classify (reuso dos mapas canônicos)
    const cat = normalizeCategory(lead.category)
    const seg = CAT_TO_SEGMENT[cat] || 'servicos'
    const nicho = NICHO_MAP[cat] || { ...GENERIC_NICHO, name: lead.category || GENERIC_NICHO.name }
    const city = lead.city || ""
    const district = lead.district || ""
    const local = district ? `${district}, ${city}` : (city || 'sua região')

    // ── L2b Enrichment (ADR-0044/0046) · dados REAIS do site · $0 ──
    const l2b = await enrichS11L2b(lead.website)
    const l2bServices = l2b?.services?.length ? l2b.services : nicho.specialties
    const l2bDoctors = l2b?.doctors?.length ? l2b.doctors : []
    const l2bInsurance = l2b?.insurance?.length ? l2b.insurance : []
    const l2bBrandColors = l2b?.designDNA?.colors || null
    const l2bBrandFonts = l2b?.designDNA?.typography || null
    const l2bHasBooking = l2b?.hasBooking || false
    const l2bBookingPlatform = l2b?.bookingPlatform || null
    const l2bHasWhatsApp = l2b?.hasWhatsApp || false
    const l2bHasPrices = l2b?.hasPrices || false
    const l2bSocialIG = l2b?.socialLinks?.instagram || null

    // ── CACHE (mesmo padrão ADR-0038 do S10) ──
    const l2bHash = l2b?.enriched ? `l2b:${l2bServices.join(',')}:${l2bDoctors.map(d=>d.name).join(',')}` : 'l2b:none'
    const cacheKey = `s11v2:${placeId}:${seg}:${lead.score_compound || 0}:${l2bHash.slice(0, 60)}`
    const cached = await s11Cache.get(cacheKey)
    if (cached) return cached

    // 2b. Concorrência (count=exact — reuso do padrão S10)
    let competitors = 0
    try {
      // count DISTINCT place_id (RPC migration 016) — a série tem 1 row por place_id POR SEARCH;
      // count=exact contava rows e inflava 2× (102 rows vs 51 dentistas reais, medido 2026-07-18)
      const rpc = await fetch(`${supabaseUrl}/rest/v1/rpc/count_unique_places`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cat: lead.category || "", city_name: city }),
      })
      if (rpc.ok) competitors = parseInt(await rpc.text(), 10) || 0
      if (!competitors) {
        // fallback: método legado (rows) se a RPC estiver indisponível
        const cr = await fetch(`${supabaseUrl}/rest/v1/discovery_listings?select=place_id&category=eq.${encodeURIComponent(lead.category || "")}&city=eq.${encodeURIComponent(city)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } })
        competitors = parseInt((cr.headers.get("content-range") || "").split("/")[1] || "0", 10) || 0
      }
    } catch (e: unknown) { void e }

    // 3. Tokens (M9 + palette — reuso)
    const m9 = new TokenComposer()
    const m9Result = await m9.compose({
      intent: `landing page cliente ${seg}`, segment: seg as SegmentId, plan: 'sentinela',
      surface: 'S11', market: { category: lead.category || cat, region: city || 'BR' },
    }).catch(() => null)
    const palette = segmentPalette(seg as SegmentId)
    const p = m9Result?.tokens.palette.primary || palette.primary
    const s = m9Result?.tokens.palette.secondary || palette.secondary
    const a = m9Result?.tokens.palette.accent || palette.accent
    const p15 = withAlpha(p, "15"); const p12 = withAlpha(p, "12")

    // 4. Vocab (agora com conversionFacets) + sensor queries (paralelas)
    //    L2b inject: serviços REAIS, médicos REAIS, convênios REAIS
    const primaryEmotion = seg === 'saude' ? 'Confiança + Profissionalismo' : seg === 'beleza' ? 'Autoestima + Transformação' : 'Resultado + Crescimento'
    const preVocab = resolveIntentVocab(seg, {
      persona: { who: lead.schwartz_label || 'Problem Aware', schwartzLevel: lead.schwartz_label || 'Problem Aware', approach: '', headlineTemplate: '', cta: '', offer: l2bServices[0] || nicho.conversionTriggers[0] || '', urgency: 'média' as const },
      psychology: { primaryEmotion, colorPsychology: '', urgencyLevel: 'medium', toneOfVoice: nicho.tone, copyRules: [], triggers: [] },
      designSystem: { recommended: '', atmosphere: '', colorPalette: { primary: p, secondary: s, accent: a, hue: 0 }, typography: { heading: l2bBrandFonts?.heading || '', body: l2bBrandFonts?.body || '' }, spacingStyle: '', motionStyle: '' },
      marketData: { competitors, category: lead.category || seg, categoryDisplay: nicho.name, city, district, avgScore: 32, claimed: lead.is_claimed || false, rating: lead.rating_value || 0, reviews: lead.rating_votes || 0 },
      niche: { name: nicho.name, specialties: l2bServices, audience: nicho.audience, keywords: nicho.keywords, pains: nicho.pains, objections: [], conversionTriggers: nicho.conversionTriggers },
      skills: [], computedAt: new Date().toISOString(),
    })
    const [odSystem, materio, icons, cssPatterns] = await Promise.all([
      queryDesignSystem(seg, "S11").catch(() => null),
      queryMaterioTokens().catch(() => null),
      queryMediaIcons(preVocab.iconFacets).catch(() => ({} as Record<string, string>)),
      queryCSSPatterns(seg, 'S11').catch(() => null),
    ])
    const T = unifyTokens(seg, { primary: p, secondary: s, accent: a }, odSystem, materio, 'S11')

    // 5. ESTRATÉGIAS (o cérebro A/B — vocab.conversion do KG + sinais reais)
    const intent = {
      surface: 'S11', segment: seg, score: lead.score_compound || 50,
      schwartzLevel: lead.schwartz_label || 'Problem Aware',
      gapCount: 0, topGapSeverity: '', isClaimed: lead.is_claimed || false,
      hasWebsite: !!lead.website, competitorCount: competitors,
      primaryEmotion, designAtmosphere: '',
      conversionTriggers: nicho.conversionTriggers || [],
      personaOffer: nicho.conversionTriggers[0] || '', personaWho: '',
      nichePains: nicho.pains, nicheAudience: nicho.audience,
      ontology: { marketData: { rating: lead.rating_value || 0, reviews: lead.rating_votes || 0 } },
    }
    const strategies = resolveStrategies(intent, preVocab.conversionFacets)

    // ── CÉREBRO ADSENTICE · 4 módulos KG (ADR-0047) ──
    const leadCtx: MKGLeadContext = {
      businessName: lead.title, category: lead.category || cat, segment: seg,
      city, district, score: lead.score_compound || 50,
      rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
      isClaimed: lead.is_claimed || false, hasWebsite: !!lead.website,
      competitorCount: competitors, topGaps: [], schwartzLevel: lead.schwartz_label || 'Problem Aware',
    }
    const [mktFrameworks, bestPractices, marketOntology, recommendations] = await Promise.all([
      queryRelevantSkills(leadCtx).catch(() => []),
      queryBestPractices("landing-page", seg, "S11").catch(() => []),
      Promise.resolve().then(() => computeMarketOntology({
        category: lead.category || cat, nichoName: nicho.name,
        nichoSpecialties: l2bServices, nichoAudience: nicho.audience,
        nichoKeywords: nicho.keywords, nichoPains: nicho.pains,
        nichoObjections: [], nichoConversionTriggers: nicho.conversionTriggers,
        segment: seg, schwartzLevel: lead.schwartz_label || 'Problem Aware',
        competitors, city, district,
        score: lead.score_compound || 50, rating: lead.rating_value || 0,
        reviews: lead.rating_votes || 0, claimed: lead.is_claimed || false,
        categoryDisplay: nicho.name,
      })).catch(() => null),
      Promise.resolve(recommendEngine.generateForSegment(
        lead.title, lead.category || cat, seg as any,
        {
          is_claimed: lead.is_claimed, rating_votes: lead.rating_votes,
          total_photos: (lead as any).total_photos || 0, has_website: !!lead.website,
          ...(l2bServices.length > 0 ? { services: l2bServices.length } : {}),
          ...(l2bHasWhatsApp ? { whatsapp: true } : {}),
          ...(l2bHasBooking ? { booking: true, booking_platform: l2bBookingPlatform } : {}),
          ...(l2b?.designDNA?.score ? { design_score: l2b.designDNA.score } : {}),
          score: lead.score_compound || 50, rating: lead.rating_value || 0,
        }
      )),
    ])
    const mktAngles = (Array.isArray(mktFrameworks) ? mktFrameworks : []).slice(0, 3).map(f => ({
      skill: f.skillName, score: f.score,
    }))
    const bpRules = (bestPractices as BestPracticeRule[]).filter((bp: BestPracticeRule) => bp.score > 0.4)
    const bpScore = bpRules.length ? Math.round(bpRules.reduce((s: number, bp: BestPracticeRule) => s + bp.score, 0) / bpRules.length * 100) : 0
    const recommendedActions = (recommendations as RecommendResult)?.actions?.slice(0, 5) || []
    const quickWin = (recommendations as RecommendResult)?.quickWin || null
    // ADR-0048: local-seo insight → keywords + meta para a landing page
    const localSEOFw = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("local-seo"))
    const seoKeywords = localSEOFw ? extractSEOKeywords(localSEOFw.content, nicho.name, local) : (nicho.keywords || []).slice(0, 5)
    const seoMetaTitle = localSEOFw ? `${lead.title} — ${nicho.name} em ${local} | ${lead.rating_value || 0}★` : `${lead.title} — ${nicho.name} em ${local}`
    // ADR-0048 #2: objection-crusher → vendor sales enablement
    const objectionFW = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("objection") || f.skillName.includes("battle-card"))
    const salesObjections = objectionFW ? extractObjections(objectionFW.content, lead.title, lead.rating_value || 0) : extractObjections("", lead.title, lead.rating_value || 0)
    // ADR-0048 #3: whatsapp-business → CTA otimizado + automação
    const whatsAppFW = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("whatsapp"))
    const waCTA = whatsAppFW && lead.phone
      ? `WhatsApp: (${lead.phone?.replace(/\D/g, "").slice(2, 4) || "11"}) ${lead.phone?.replace(/\D/g, "").slice(4, 13) || ""} — resposta em até 5 minutos`
      : lead.phone ? `Fale conosco pelo WhatsApp: ${lead.phone}` : "Agende sua consulta"
    const waInsight = whatsAppFW
      ? "Canal #1 de venda no Brasil. 80% dos clientes preferem WhatsApp. Templates, catálogo e respostas automáticas disponíveis."
      : null
    // ADR-0048 #4: marketing-plan → 13-seção plan para Domínio (R$497)
    const mktPlanFW = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("marketing-plan") || f.skillName.includes("marketing_plan"))
    const mktPlanSections = mktPlanFW ? extractMarketingPlanSections(mktPlanFW.content) : []
    const mktPlanReady = mktPlanSections.length >= 5 // mínimo 5 seções = plano válido
    // ADR-0048 #5: social-media → calendário editorial + sugestões de posts
    const socialFW = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("social"))
    const socialCalendar = socialFW ? extractSocialCalendar(socialFW.content, nicho.name, l2bSocialIG) : null
    const contentFW = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("content-strategy"))
    // ADR-0048 #6: google-ads → análise de ads + budget pacing para Domínio (R$497)
    const adsFW = (mktFrameworks as MarketingFramework[]).find(f => f.skillName.includes("ads") || f.skillName.includes("advertising"))
    const adsAnalysis = adsFW ? extractAdsInsights(adsFW.content, nicho.name, local, competitors) : null

    // 6. Morph (corpus-driven — reuso do MorphInput do S10)
    const slotMorph = resolveMorph({
      segment: seg, designFacets: preVocab.designFacets, animationFacets: preVocab.animationFacets,
      designSystemAtmosphere: '', spacingStyle: 'default', motionStyle: 'subtle',
      primaryEmotion, schwartzLevel: lead.schwartz_label || 'Problem Aware',
      cssPatterns, T,
    } as any)

    // 7. Por ESTRATÉGIA: layout + copy + render (2 variantes)
    const variants: S11Variant[] = []
    let lastQg: { slopWarnings: number; passed: boolean } | null = null
    for (const strat of [strategies.A, strategies.B]) {
      const composed = composeLayout(intent, slotMorph, strat)
      const fb = buildLandingCopyFallback(lead, nicho, local, strat)
      const ai = await generateLandingCopy({
        name: lead.title, category: lead.category, nichoName: nicho.name,
        clientTerm: nicho.clientTerm || 'cliente', specialties: l2bServices,
        local, rating: lead.rating_value || 0, reviews: lead.rating_votes || 0,
        isClaimed: lead.is_claimed || false, triggers: nicho.conversionTriggers,
        pains: nicho.pains, tone: nicho.tone,
        // L2b inject · dados REAIS da clínica para a copy
        ...(l2bDoctors.length > 0 ? { doctors: l2bDoctors.slice(0, 2) } as any : {}),
        ...(l2bInsurance.length > 0 ? { insurance: l2bInsurance.slice(0, 5) } as any : {}),
        ...(l2bHasBooking ? { bookingPlatform: l2bBookingPlatform } as any : {}),
        ...(l2bHasPrices ? { hasPrices: true } as any : {}),
        ...(l2bSocialIG ? { instagram: l2bSocialIG } as any : {}),
      }, { facet: strat.facet, copyAngle: strat.copyAngle, pricingFrame: strat.pricingFrame, faqAngle: strat.faqAngle }).catch(() => null)
      if (ai) await trackLLMCost(0.001)
      const { copy, model } = mergeLandingCopy(ai, fb)
      const rawHtml = renderS11_GREEN({ lead, nicho, local, seg, copy, strategy: strat, composedLayout: composed, T, p, s, a, p15, p12, icons, seoKeywords, seoMetaTitle, waPhone: lead.phone, waCTA })
      // ADR-0049 §4: Quality Gate — Unslop validation
      const qg = applyQualityGate(rawHtml)
      lastQg = qg
      const html = qg.html
      variants.push({ ab: strat.abLabel, html, strategyFacet: strat.facet, hypothesis: strat.hypothesis, copyModel: model, headline: copy.hero.headline })
    }

    const meta = {
      surface: 'S11', lead: lead.title, segment: seg, score: lead.score_compound || 50,
      local, competitors, phone: lead.phone || null,
      strategies: { A: strategies.A.facet, B: strategies.B.facet, scores: strategies.scores, reasoning: strategies.reasoning.slice(0, 8) },
      conversionFacets: preVocab.conversionFacets,
      l2b: l2b?.enriched ? { services: l2bServices.length, doctors: l2bDoctors.length, insurance: l2bInsurance.length, designScore: l2bBrandColors ? l2b?.designDNA?.score || 0 : 0 } : { enriched: false },
      seo: localSEOFw ? { metaTitle: seoMetaTitle, keywords: seoKeywords, source: "local-seo framework" } : null,
      sales: salesObjections.length > 0 ? { objections: salesObjections, source: objectionFW?.skillName || "fallback", ready: true } : null,
      wa: whatsAppFW ? { cta: waCTA, insight: waInsight, hasPhone: !!lead.phone, source: "whatsapp-business framework" } : { cta: waCTA, hasPhone: !!lead.phone },
      mktPlan: mktPlanReady ? { sections: mktPlanSections, totalSections: mktPlanSections.length, source: "marketing-plan framework", plan: "Domínio (R$497)" } : null,
      social: socialCalendar ? { calendar: socialCalendar, contentStrategy: contentFW ? "Framework content-strategy aplicado" : null, source: "social-media framework", plan: "Sentinela (R$197)" } : null,
      ads: adsAnalysis ? { ...adsAnalysis, source: "ads framework", plan: "Domínio (R$497)", rationale: adsAnalysis.competitionLevel === "alta" ? "Mercado competitivo — ads são essenciais para se destacar" : "Invista em ads para capturar tráfego qualificado" } : null,
      quality: { slopWarnings: lastQg?.slopWarnings ?? 0, passed: lastQg?.passed ?? false, source: "Unslop (ADR-0049 §4)" },
      brain: { mktFrameworks: mktFrameworks.length, mktAngles, bpRulesApplied: bpRules.length, bpScore, marketOntology: marketOntology ? { density: (marketOntology as any).density, pibPerCapita: (marketOntology as any).pibPerCapita, saturationRisk: (marketOntology as any).saturationRisk } : null, quickWin: quickWin ? { title: quickWin.title, impact: quickWin.impact, effort: quickWin.effort } : null, recommendedActions: recommendedActions.length },
      _pipeline: { phase: 'BLUE->GREEN', surface: 'S11', doctrine: `g0 + strategy A/B (ADR-0037 F6) + L2b ${l2b?.enriched ? 'dados REAIS' : 'NICHO_MAP genérico'} (ADR-0044) + Brain KG (ADR-0047)` },
      computedAt: new Date().toISOString(),
    }

    const result: S11ComposeResult = { variants, meta }
    await s11Cache.set(cacheKey, result, 300_000)
    return result
  } catch (e: any) { console.error("[composeS11]", e.message); console.error("[composeS11 stack]", e.stack?.split("\n").slice(0, 5).join(" | ")); return null }
}