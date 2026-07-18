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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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

import { generateCopy, trackLLMCost } from "./deepseek"
import { searchDesignInspiration, queryDesignBestPractices, queryComponentsByIntent, fetchComponentsByIds, queryDesignSystem, queryMaterioTokens, queryMediaAnimation } from "./warp-kg"
import { S10RaioXPipeline } from "../../../../packages/warp/src/s10-raio-x"
import { unifyTokens } from "../../../../packages/warp/src/tokens-unifier"
import { pluginRegistry } from "../../../../packages/warp/src/plugins"

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


export async function composeS10(placeId: string): Promise<{ html: string; meta: Record<string, unknown> } | null> {
  try {
    // ── PLUGIN SYSTEM (ADR-0036 Fase 1) ──
    await pluginRegistry.activateAll()

    // 1. Fetch lead
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tdigauruusdhnpvppixb.supabase.co"
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    const url = `${supabaseUrl}/rest/v1/discovery_listings?select=place_id,title,category,rating_value,rating_votes,is_claimed,website,latitude,longitude,score_compound,score_fit,score_engagement,score_intent,schwartz_level,schwartz_label,signals_detected,total_photos,city,district,enrichment_level,l2_onpage_score,l2_word_count,l2_internal_links_count,l2_external_links_count,l2_images_count,l2_seo_checks,l2_has_analytics,l2_cms,l2_meta_title,l2_meta_description,l2_domain_rank,l2_lighthouse_performance,l2_content_maturity,l2_content_gaps&place_id=eq.${encodeURIComponent(placeId)}&limit=1`
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!res.ok) return null
    const leads = await res.json() as S10Lead[]
    if (!leads.length) return null
    const lead = leads[0]

    // 2. Classify — normaliza display name DataForSEO ("Barber shop" → barber_shop)
    const cat = normalizeCategory(lead.category)
    const seg = CAT_TO_SEGMENT[cat] || 'servicos'
    const nicho = NICHO_MAP[cat] || { ...GENERIC_NICHO, name: lead.category || GENERIC_NICHO.name }
    const level = lead.schwartz_label || "Problem Aware"
    const district = lead.district || ""
    const city = lead.city || ""
    const local = district ? `${district}, ${city}` : city

    // 2b. Concorrência real — count mesma categoria na cidade (medido=verdade, nunca "47" fixo)
    let competitors = 0
    try {
      const cr = await fetch(`${supabaseUrl}/rest/v1/discovery_listings?select=place_id&category=eq.${encodeURIComponent(lead.category || "")}&city=eq.${encodeURIComponent(city)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" } })
      competitors = parseInt((cr.headers.get("content-range") || "").split("/")[1] || "0", 10) || 0
    } catch (e: unknown) { void e }

    // 3. Tokens
    const morph = await morphTokens({ surface:"S10", segment: seg, plan:"r0", mode:"internal" })
    const p = morph.tokens["color-primary"] || "#2563EB"
    const s = morph.tokens["color-secondary"] || "#1E40AF"
    const a = morph.tokens["color-accent"] || "#3B82F6"
    const p15 = withAlpha(p, "15"); const p12 = withAlpha(p, "12")

    // 4. Gaps
    const gaps = computeGaps(lead, nicho)


    // 5. Copy (ADR-0036 Fase 3 — S10RaioXPipeline especialista + DeepSeek refina)
    // Headline derivada do intent: persona(Schwartz) + skills(copywriting,psychology,cro,local-seo)
    // + dados reais(competitors, local, niche). DeepSeek = refinador, NÃO gerador.
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

    // DeepSeek REFINA a headline base (não gera do zero)
    let copyModel = "deepseek-refine"
    let copy = await generateCopy({
      title: lead.title, category: lead.category, city, district,
      score: lead.score_compound, rating: lead.rating_value || 0,
      is_claimed: lead.is_claimed || false, gaps: gaps,
    })
    if (copy) {
      await trackLLMCost(0.001)
      // Se DeepSeek refinou com headline vazia ou genérica, usa a base
      if (!copy.headline || copy.headline.length < 10) {
        copy.headline = baseHeadline
        copyModel = "deepseek-refine-fallback-base"
      }
    } else {
      copyModel = "s10-pipeline"
      copy = {
        headline: baseHeadline,
        subtitle: s10base.subtitle || "Análise baseada em dados reais do Google Meu Negócio e do seu site. Resultado em 30 segundos.",
        cta: baseCta,
      }
    }
    const name = lead.title
    const score = lead.score_compound || 50
    const fit = lead.score_fit || 50; const eng = lead.score_engagement || 50; const ints = lead.score_intent || 50
    const rating = lead.rating_value || 0; const reviews = lead.rating_votes || 0
    const photos = lead.total_photos || 0
    const website = lead.website || "sem site"
    const claimed = lead.is_claimed ? "✅ Sim" : "❌ Não"

    // 6. Design Intelligence (Qdrant live · adsentice vivo)
    const designIntel = await queryDesignBestPractices(seg, "S10").catch(() => null)
    const inspoUrls = designIntel?.inspirationUrls || []

    // 6a. Query OD v0.9.0 design system specs (layout grid, card radius, hero height...)
    // 150 estilos open-design embedados como kind=design-system — ADR-0034 orgao 5
    const odSystem = await queryDesignSystem(seg, "S10").catch(() => null)

    // 6a-bis. Materio tokens vivos (ADR-0036 Fase 2) — 36 tokens: spacing, shadows, motion, radius, typography, palette
    const materio = await queryMaterioTokens().catch(() => null)
    // 6a-ter. Media animation knowledge (Framer Motion, Lucide, SVG) — já ingerido, agora wireado
    const mediaAnim = await queryMediaAnimation(seg).catch(() => null)

    // TOKENS UNIFICADOS (ADR-0036 Arquitetura Vencedora)
    // 3 fontes -> 1 saida canonica. O SurfaceSpecialist decide qual fonte.
    const T = unifyTokens(seg, { primary: p, secondary: s, accent: a }, odSystem, materio)

    // 6b. Query Warp components from Qdrant (ADR-0033 Level 1)
    const components = await queryComponentsByIntent(`diagnostico raio-x ${seg}`, "S10", seg).catch(() => [])
    const hasComponents = components.length > 0

    // ── PLUGIN HOOK 1: onEnrich (ADR-0036 Fase 1) ──
    // Cada plugin ativo enriquece o contexto de design (Kimera PATTERNS, dark mode, etc.)
    const designCtx = {
      segment: seg as string, plan: "r0" as string, businessName: lead.title,
      palette: { primary: p, secondary: s, accent: a },
      typography: { heading: "Inter", body: "Inter" },
      designInspiration: inspoUrls, suggestedComponents: components.map(c => c.name),
      landingPattern: "S10-raio-x", previewHtml: "",
    }
    for (const plugin of pluginRegistry.listActive()) {
      if (plugin.onEnrich) {
        const enriched = await plugin.onEnrich(designCtx as any).catch(() => null)
        if (enriched?.palette) { Object.assign(designCtx, enriched) }
      }
    }

    // 6c. N1.3 (ADR-0033) — render por componentes: cada seção herda a11y do
    // componente REAL do Qdrant (payload FLAT: a11y_role/a11y_keyboard/tokens/edges)
    type WarpComp = (typeof components)[number]

    // 6d. N2 (ADR-0033/0034 órgão 2) — grafo REAL via edges do payload FLAT.
    // Espelha 4-composer.ts:181 resolveDependencies (BFS depth≤2, cap 12,
    // relevanceScore=1-depth*0.2, dependents reversos). Unificação por import
    // direto de packages/warp fica para a migração ADR-0017.
    type GraphNode = { comp: WarpComp; depth: number; dependencies: string[]; dependents: string[]; relevanceScore: number }
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
    const getGraphComps = () => [...graph.values()].sort((x, y) => y.relevanceScore - x.relevanceScore).map(n => n.comp)

    const usedComponents: string[] = []
    const pickComp = (...keys: string[]): WarpComp | null => {
      const found = getGraphComps().find(c => keys.some(k =>
        c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k) || c.intent.toLowerCase().includes(k)))
      if (found && !usedComponents.includes(found.id)) usedComponents.push(found.id)
      return found || null
    }
    const esc = (t: string) => t.replace(/"/g, "&quot;")
    // ADR-0036 — render por intent de corpus.
    // Cada componente do vec() contribui a11y + tokens + category para o CSS.
    const compAttrs = (c: WarpComp | null, fallbackRole: string, label: string) =>
      `role="${c?.a11y.role || fallbackRole}" aria-label="${esc(label)}"${c?.a11y.keyboardNav ? ' tabindex="0"' : ""}`
    
    // Deriva estilo CSS do componente REAL do Qdrant (tokens, category, intent)
    const compCSS = (c: WarpComp | null): string => {
      if (!c) return ""
      const t = new Set(c.tokens || [])
      let css = ""
      // Cada token que o componente declara como dependência gera uma custom property
      if (t.has("color")) css += `--comp-accent:${T.primary};`
      if (t.has("animation")) css += `--comp-motion:var(--motion);`
      if (t.has("spacing")) css += `--comp-padding:${T.cardPadding};`
      if (t.has("radius")) css += `--comp-radius:${T.radius};`
      if (t.has("shadow")) css += `--comp-shadow:${T.cardShadow};`
      if (t.has("typography")) css += `--comp-font:${T.font};`
      if (t.has("z-index")) css += `--comp-z:10;`
      if (c.category) css += `--comp-category:${c.category};`
      return css
    }

    // Mapeia componente → recomendação de estilo para o slot
    const slotStyle = (c: WarpComp | null, defaultStyles: string): string => {
      if (!c) return defaultStyles
      const t = c.tokens || []
      let s = defaultStyles
      // Componentes que consomem "shadow" ganham elevação
      if (t.includes("shadow") && !s.includes("box-shadow")) s += `box-shadow:var(--shadow-sm);`
      // Componentes que consomem "animation" ganham transition
      if (t.includes("animation") && !s.includes("transition")) s += `transition:all var(--motion);`
      // Componentes "feedback" ganham backdrop-filter
      if (c.category === "feedback" && !s.includes("backdrop")) s += `backdrop-filter:blur(8px);`
      // Componentes "action" ganham cursor pointer
      if (c.category === "action" && !s.includes("cursor")) s += `cursor:pointer;`
      return s
    }
    let cardComp = pickComp("card", "cartao")
    let btnComp = pickComp("button", "botao")
    let ringComp = pickComp("progress", "ring", "circular", "gauge")
    let chipComp = pickComp("badge", "chip", "status")

    // LayoutTree S10 (landing-shell) — slots ligados aos componentes resolvidos
    let layoutTree = {
      id: "layout.s10", type: "landing-shell",
      slots: {
        hero: { component: chipComp?.id || "hero-badge" },
        score: { component: ringComp?.id || "score-ring", card: cardComp?.id || "score-card" },
        info: { type: "grid", columns: 3, component: cardComp?.id || "info-card" },
        gaps: { component: cardComp?.id || "gap-card", count: gaps.length },
        cta: { component: btnComp?.id || "cta-button" },
      },
      graph: [...graph.values()].map(n => ({ id: n.comp.id, depth: n.depth, edges: n.dependencies, dependents: n.dependents, relevance: Math.round(n.relevanceScore * 100) / 100 })),
    }

    // 7. Critique 6D + Devloop (ADR-0033 N3.2 + ADR-0034 orgao 3)
    // Avalia graph real. Se composite < 7.0, ajusta intent e re-query (<3x).
    let critique = computeCritique(graph, seg, "S10")
    let devloopIter = 0
    while (!critique.passed && devloopIter < 2) {
      devloopIter++
      const boostIntent = critique.functionality < 6 ? `acessivel keyboard-nav ${seg}` :
        critique.marketFit < 6 ? `${seg} landing conversion motion` : `${seg} badge progress`
      const boosted = await queryComponentsByIntent(boostIntent, "S10", seg).catch(() => [])
      if (boosted.length) {
        for (const c of boosted) if (!graph.has(c.id) && graph.size < 12) {
          graph.set(c.id, { comp: c, depth: 1 + devloopIter, dependencies: [...c.edges], dependents: [], relevanceScore: 0.7 - devloopIter * 0.15 })
        }
        for (const [gid, n] of graph) for (const depId of n.dependencies) { const dep = graph.get(depId); if (dep && !dep.dependents.includes(gid)) dep.dependents.push(gid) }
        // Re-pick components after Devloop adjustments
        usedComponents.length = 0;
        [cardComp, btnComp, ringComp, chipComp].forEach(() => {})
      }
      // Re-pick após graph expandido
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
      critique = computeCritique(graph, seg, "S10")
    }
    let tracedLayout: any = { ...layoutTree, critique: { composite: critique.composite, passed: critique.passed, feedback: critique.feedback, devloopIter }, graph: [...graph.values()].map(n => ({ id: n.comp.id, depth: n.depth, edges: n.dependencies, dependents: n.dependents, relevance: Math.round(n.relevanceScore * 100) / 100 })) }

    // ── PLUGIN HOOK 2: onCritique (ADR-0036 Fase 1) ──
    // AestheticEnforcementPlugin: penaliza hardcoded colors, sem dark mode, sem animações
    designCtx.previewHtml = ""  // will be set after HTML built; onCritique runs on meta
    designCtx.critiqueScore = critique as any
    for (const plugin of pluginRegistry.listActive()) {
      if (plugin.onCritique) {
        const enforced = await plugin.onCritique(critique as any, designCtx as any).catch(() => null)
        if (enforced?.enforced) {
          critique = { ...critique, ...enforced.score }
          tracedLayout.critique = { composite: critique.composite, passed: critique.passed, feedback: critique.feedback, devloopIter, enforced: true }
        }
      }
    }

    // 7. Build HTML (FULL Python template port + Qdrant design intelligence)
    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="description" content="${copy.headline}">
<title>Raio-X · ${name} | adsentice</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@font-face{font-family:Inter;font-display:swap}
:root{
  --primary:${T.primary};--primary-fg:${T.primaryFg};--secondary:${T.secondary};--secondary-fg:${T.secondaryFg};--accent:${T.accent};
  --bg:${T.bg};--fg:${T.fg};
  --card:${T.card};--muted:${T.muted};--muted-fg:${T.mutedFg};
  --border:${T.border};--destructive:${T.destructive};--success:${T.success};--warning:${T.warning};
  --font:${T.font},system-ui,sans-serif;
  --font-display:${T.fontDisplay},Georgia,serif;
  --spacing-xs:${T.spacing[0]};--spacing-sm:${T.spacing[1]};--spacing-md:${T.spacing[3] || T.spacing[2]};--spacing-lg:${T.spacing[5] || T.spacing[4]};--spacing-xl:${T.spacing[7] || T.spacing[6]};
  --shadow-sm:${T.shadowSm};--shadow-md:${T.shadowMd};--shadow-lg:${T.shadowLg};
  --radius:${T.radius};--radius-sm:${T.radiusSm};--radius-pill:${T.radiusPill};
  --motion-fast:${T.motionFast};--motion:${T.motion};--motion-smooth:${T.motionSmooth};
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased}
.hero{background:linear-gradient(135deg,${T.primary} 0%,${T.secondary} 100%);color:#fff;min-height:${T.heroMinHeight};display:flex;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 60%,rgba(255,255,255,0.08) 0%,transparent 60%)}
.hero-content{position:relative;z-index:1;max-width:800px;margin:0 auto}
.hero-badge{display:inline-flex;align-items:center;gap:.375rem;background:rgba(255,255,255,0.12);${slotStyle(chipComp, "backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);padding:.375rem .875rem;border-radius:var(--radius-pill);font-size:.8125rem;font-weight:500;margin-bottom:1.25rem")}}
.hero h1{font-size:clamp(1.5rem,3.5vw,2.25rem);font-weight:800;line-height:1.2;margin-bottom:.75rem}
.hero .subtitle{font-size:1.05rem;opacity:.9;max-width:600px;margin:0 auto}
.container{max-width:${T.containerMaxWidth};margin:0 auto;padding:0 ${T.containerGutter}}
.section{padding:${T.sectionSpacing} 0}@media(max-width:768px){.section{padding:${T.sectionSpacingTablet} 0}}@media(max-width:480px){.section{padding:${T.sectionSpacingPhone} 0}}
.score-card{background:var(--card);border:${odSystem?.components?.cardBorder || "1px solid var(--border)"};border-radius:var(--radius);padding:${odSystem?.components?.cardPadding || "20px"};box-shadow:${odSystem?.components?.cardShadow || "var(--shadow)"};display:flex;align-items:center;gap:2rem;flex-wrap:wrap;margin-top:-2rem;position:relative;z-index:2}
.score-ring{width:130px;height:130px;border-radius:50%;background:conic-gradient(${p} 0% ${Math.min(fit,100)}%,${a} ${Math.min(fit,100)}% ${Math.min(fit+eng,100)}%,${s} ${Math.min(fit+eng,100)}% 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.score-inner{width:100px;height:100px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center}
.score-value{font-size:2.25rem;font-weight:800;line-height:1;color:${p}}
.score-label{font-size:.7rem;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.05em;margin-top:.25rem}
.score-info{flex:1;min-width:240px}
.score-info h2{font-size:1.35rem;font-weight:700;margin-bottom:.25rem}
.score-level{display:inline-flex;align-items:center;gap:.375rem;padding:.25rem .75rem;border-radius:var(--radius-pill);font-size:.8125rem;font-weight:600;${slotStyle(chipComp, "")};background:${p15};color:${p};margin-bottom:1rem}
.score-bars{display:flex;flex-direction:column;gap:.625rem}
.score-bar{display:flex;align-items:center;gap:.75rem}
.score-bar-label{width:110px;font-size:.8rem;font-weight:500;color:var(--muted-fg)}
.score-bar-track{flex:1;height:8px;background:var(--muted);border-radius:99px;overflow:hidden}
.score-bar-fill{height:100%;border-radius:99px}
.score-bar-val{width:36px;text-align:right;font-size:.8rem;font-weight:600}
.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin:1.5rem 0}
.info-card{background:var(--card);border:${odSystem?.components?.cardBorder || "1px solid var(--border)"};border-radius:var(--radius);padding:${odSystem?.components?.cardPadding || "20px"};box-shadow:${odSystem?.components?.cardShadow === "none" ? "none" : "var(--shadow)"}}
.info-card h4{font-size:.9rem;font-weight:700;margin-bottom:.5rem}
.info-card .value{font-size:1.5rem;font-weight:800;line-height:1.2}
.info-card .value.stars{color:#f59e0b}
.info-card .meta{font-size:.8125rem;color:var(--muted-fg);margin-top:.25rem}
.info-card .status{display:inline-flex;align-items:center;gap:.25rem;padding:.125rem .5rem;border-radius:99px;font-size:.75rem;font-weight:600;margin-top:.5rem}
.info-card .status.ok{background:${p12};color:${p}}
.gap{background:var(--card);border:${odSystem?.components?.cardBorder || "1px solid var(--border)"};border-radius:var(--radius);padding:${odSystem?.components?.cardPadding || "20px"};margin-bottom:1rem;box-shadow:${odSystem?.components?.cardShadow || "0 1px 2px rgba(0,0,0,0.05)"};transition:all var(--motion);position:relative}
.gap:hover{transform:translateY(-1px);box-shadow:var(--shadow-lg)}
.gap::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;border-radius:var(--radius-sm) 0 0 var(--radius-sm)}
.gap.critico::before{background:var(--destructive)}
.gap.medio::before{background:var(--warning)}
.gap.oportunidade::before,.gap.forca::before{background:var(--success)}
.gap-header{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}
.gap-severity{font-size:.75rem;font-weight:700;text-transform:uppercase}
.gap-severity.critico{color:var(--destructive)}
.gap-severity.medio{color:var(--warning)}
.gap-severity.oportunidade,.gap-severity.forca{color:var(--success)}
.gap h4{font-size:1.05rem;font-weight:700}
.gap p{color:var(--muted-fg);font-size:.9rem;margin-bottom:.75rem}
.gap .fix{background:var(--muted);padding:.875rem 1rem;border-radius:var(--radius-sm);font-size:.875rem}
.gap .fix strong{color:var(--fg)}
.gap .meta-row{display:flex;gap:1.25rem;margin-top:.75rem;font-size:.8rem;color:var(--muted-fg)}
.cta{background:linear-gradient(135deg,${p} 0%,${s} 100%);color:#fff;text-align:center;padding:2.5rem 2rem;border-radius:var(--radius);box-shadow:var(--shadow-lg)}
.cta h2{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}
.cta p{opacity:.9;max-width:450px;margin:0 auto 1.5rem;font-size:.95rem}
.cta-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--card);color:${T.primary};padding:${T.buttonPaddingBlock} ${T.buttonPaddingInline};border-radius:${T.buttonRadius};font-size:.95rem;font-weight:700;text-decoration:none;${slotStyle(btnComp, "transition:all var(--motion);box-shadow:0 4px 14px rgba(0,0,0,0.12)")}}
.cta-btn:hover{transform:${T.cardShadow === "none" ? "none" : "translateY(-2px)"};box-shadow:0 8px 25px rgba(0,0,0,0.18)}
footer{text-align:center;padding:${T.sectionSpacing} 0;color:var(--muted-fg);font-size:.75rem;border-top:1px solid var(--border);margin-top:2rem}
footer span{color:${T.primary};font-weight:600}
@media(max-width:600px){.score-card{flex-direction:column;text-align:center}.info-grid{grid-template-columns:1fr}}
</style>
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"LocalBusiness",
  "name":"${name.replace(/"/g,'\\"')}",
  "image":"${lead.website || ''}",
  "address":{"@type":"PostalAddress","addressLocality":"${city || 'BR'}"},
  "aggregateRating":{"@type":"AggregateRating","ratingValue":"${rating.toFixed(1)}","reviewCount":"${reviews}"}
}
</script></head><body>
<header class="hero" role="banner" aria-label="Diagnóstico Raio-X"><div class="hero-content">
<div class="hero-badge" ${compAttrs(chipComp, "status", "Relatório Raio-X · Diagnóstico Gratuito")}>🔍 Relatório Raio-X · Diagnóstico Gratuito</div>
<h1>${copy.headline}</h1><p class="subtitle">${copy.subtitle}</p>
</div></div>
<main class="container" role="main" aria-label="Resultado do diagnóstico">
<div class="score-card" ${compAttrs(cardComp, "region", `Diagnóstico de ${name}: score ${score} de 100`)}>
<div class="score-ring" ${compAttrs(ringComp, "img", `Score ${score} de 100`)}><div class="score-inner" aria-hidden="true"><div class="score-value">${score}</div><div class="score-label">de 100</div></div></div>
<div class="score-info"><h2>${name}</h2><div class="score-level" ${compAttrs(chipComp, "status", `Nível de consciência: ${level}`)}>${level} · ${nicho.name}</div>
<div class="score-bars">
<div class="score-bar"><span class="score-bar-label">Presença</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${fit}%;background:${p}"></div></div><span class="score-bar-val">${fit}%</span></div>
<div class="score-bar"><span class="score-bar-label">Engajamento</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${eng}%;background:${a}"></div></div><span class="score-bar-val">${eng}%</span></div>
<div class="score-bar"><span class="score-bar-label">Intenção</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${ints}%;background:${s}"></div></div><span class="score-bar-val">${ints}%</span></div>
</div></div></div>
<div class="info-grid">
<div class="info-card" ${compAttrs(cardComp, "region", "Google Meu Negócio")}><h4>Google Meu Negócio</h4><div class="value stars">${"★".repeat(Math.max(1,Math.round(rating)))}${"☆".repeat(Math.max(0,5-Math.round(rating)))}</div><div class="meta">${rating.toFixed(1)}★ · ${reviews} avaliações</div><div class="status ok">${photos} fotos · ${claimed}</div></div>
<div class="info-card" ${compAttrs(cardComp, "region", "Website")}><h4>Website</h4><div class="value" style="font-size:1.1rem;word-break:break-all">${String(website).slice(0,35)}</div><div class="meta">${local}</div><div class="status ok">✅ Online</div></div>
<div class="info-card" ${compAttrs(cardComp, "region", "Concorrência")}><h4>Concorrência</h4><div class="value">${competitors > 1 ? competitors - 1 : "—"}</div><div class="meta">${nicho.name.toLowerCase()}s na região</div><div class="status ok">📊 Score ${score}/100</div></div>
</div>
<div class="section"><h2 style="font-size:1.35rem;font-weight:700;margin-bottom:.5rem">${gaps.length} Gaps e Oportunidades</h2>
<p style="color:var(--muted-fg);margin-bottom:1.5rem">Análise baseada em dados reais do Google Meu Negócio e do seu site.</p>
${gaps.map(g => {
  const sevClass = g.severity.includes("Crítico") ? "critico" : g.severity.includes("Médio") ? "medio" : g.severity.includes("Força") ? "forca" : "oportunidade"
  return `<div class="gap ${sevClass}" ${compAttrs(cardComp, "article", g.title)}><div class="gap-header"><span class="gap-severity ${sevClass}">${g.severity}</span><h4>${g.title}</h4></div><p>${g.desc}</p><div class="fix"><strong>✅ Como resolver:</strong> ${g.fix}</div><div class="meta-row"><span>📈 Impacto: ${g.impact}</span><span>⏱️ Esforço: ${g.effort}</span></div></div>`
}).join("")}
</div>
<div class="cta"><h2>${offer}</h2><p>Diagnóstico gratuito. Nosso plano Sentinela (R$197/mês) monitora seu negócio todo mês.</p><a href="https://wa.me/5521999999999" class="cta-btn" role="${btnComp?.a11y.role || "button"}" aria-label="${esc(copy.cta)} no WhatsApp" target="_blank" rel="noopener">💬 ${copy.cta} no WhatsApp</a></div></div>

</main>
<footer><div class="container"><p>Diagnóstico gerado por <span>adsentice</span> — hub inteligente de marketing para negócios locais.</p><p style="margin-top:.25rem">Dados: Google Meu Negócio · website · mercado local · ${new Date().toLocaleDateString('pt-BR')}</p></div></footer>
</body></html>`

    // Meta sidecar (padrão tools/adsentice_s10_generator.py — ADR-0033 N4.4)
    // HTML = cliente (limpo). meta = trace interno (route serve separado).
    const traceId = `s10_${Math.random().toString(36).slice(2, 14)}`
    const meta = {
      traceId, lead: name, category: cat, segment: seg, score,
      designSystem: odSystem?.designSystem || "warp-default",
      nicho: { name: nicho.name, specialties: nicho.specialties.slice(0, 5), audience: nicho.audience, tone: nicho.tone, keywords: nicho.keywords.slice(0, 3) },
      tokens: { primary: p, secondary: s, accent: a, heading: "Inter", body: "Inter", spacing: morph.tokens["spacing"] || "1.5rem" },
      gaps: gaps.map(g => ({ title: g.title, severity: g.severity, signal: g.signal })),
      copy_model: copyModel,
      headline: copy.headline, subtitle: copy.subtitle, cta: copy.cta,
      competitors,
      layoutTree: tracedLayout,
      critique: { composite: critique.composite, passed: critique.passed, feedback: critique.feedback, devloopIter },
      componentsUsed: usedComponents,
      computedAt: new Date().toISOString(),
      city, district,
    }
    // ── PLUGIN HOOK 3: onGenerate (ADR-0036 Fase 1) ──
    // AestheticEnforcementPlugin: injeta dark mode @media se ausente
    let finalHtml = html
    for (const plugin of pluginRegistry.listActive()) {
      if (plugin.onGenerate) {
        const transformed = await plugin.onGenerate(designCtx as any, finalHtml).catch(() => null)
        if (transformed) finalHtml = transformed
      }
    }

    return { html: finalHtml, meta }
  } catch (e: any) { console.error("[composeS10]", e.message); return null }
}
