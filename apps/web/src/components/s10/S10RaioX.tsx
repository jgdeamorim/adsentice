// ═══════════════════════════════════════════════════════════════
// ADSENTICE · S10 Raio-X Server Component (ADR-0037 Fase 2)
//
// JSX render: substitui renderS10_GREEN string concat.
// Slot-driven: itera tracedLayout.slots via SLOT_RENDERERS map.
// CORPUS-DRIVEN: morph prop aplica mutations do resolveMorph().
//   BLUE resolveMorph(facets, cssPatterns, ontology, T) → perSlotMutations
//   GREEN slots recebem morph[slotName] → aplicam como style props
//
// SWC-ready: props inline, zero interfaces, zero empty catch.
// g0 doctrine: BLUE emite mutação, GREEN aplica materials.
// ═══════════════════════════════════════════════════════════════

import HeroSlot from './slots/HeroSlot'
import ScoreSlot from './slots/ScoreSlot'
import InfoGridSlot from './slots/InfoGridSlot'
import GapListSlot from './slots/GapListSlot'
import CtaSlot from './slots/CtaSlot'
import FooterSlot from './slots/FooterSlot'
import type { PerSlotMutations } from '../../../../../packages/warp/src/morph-resolver'

// ═══ SLOT RENDERER MAP ═══
type SlotRenderProps = {
  output: any; slot: any; T: any; O: any
  icon: (name: string) => string
  morph: PerSlotMutations | null
}

const SLOT_RENDERERS: Record<string, (p: SlotRenderProps) => React.ReactNode> = {
  hero: (p) => <HeroSlot output={p.output} slot={p.slot} O={p.O} icon={p.icon} morph={p.morph} />,
  score: (p) => <ScoreSlot output={p.output} slot={p.slot} T={p.T} morph={p.morph} />,
  info_grid: (p) => <InfoGridSlot output={p.output} slot={p.slot} icon={p.icon} morph={p.morph} />,
  info: (p) => <InfoGridSlot output={p.output} slot={p.slot} icon={p.icon} morph={p.morph} />,
  gaps: (p) => <GapListSlot output={p.output} slot={p.slot} T={p.T} O={p.O} icon={p.icon} morph={p.morph} />,
  cta: (p) => <CtaSlot output={p.output} slot={p.slot} T={p.T} O={p.O} icon={p.icon} morph={p.morph} />,
  footer: (p) => <FooterSlot output={p.output} slot={p.slot} T={p.T} O={p.O} morph={p.morph} />,
}

// ═══ HELPERS ═══
function renderIcon(icons: Record<string, string>, name: string): string {
  return icons?.[name] || ''
}

function esc(t: string): string {
  return String(t).replace(/"/g, '&quot;')
}

// ═══ CSS GENERATION (corpus-driven from T + morph) ═══
function cssTokens(T: any): string {
  return `:root{
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
}`
}

function cssLayout(output: any, T: any, morph: PerSlotMutations | null): string {
  const p = output?.p || 'var(--primary)'
  const s = output?.s || 'var(--secondary)'
  const a = output?.a || 'var(--accent)'
  const p15 = output?.p15 || 'rgba(0,0,0,0.08)'
  const p12 = output?.p12 || 'rgba(0,0,0,0.05)'

  // Morph-driven values (from corpus)
  const heroAngle = morph?.hero?.gradientAngle || '135deg'
  const heroMinH = morph?.hero?.minHeight || '50vh'
  const infoRadius = morph?.infoCards?.borderRadius || 'var(--radius-sm)'
  const infoPad = morph?.infoCards?.padding || '1.25rem'
  const infoShadow = morph?.infoCards?.shadow || '0 1px 2px rgba(0,0,0,0.05)'
  const containerMW = morph?.global?.containerMaxWidth || '860px'
  const gapHover = morph?.gaps?.hoverEffect || 'translateY(-1px)'
  const gapBarW = morph?.gaps?.accentBarWidth || '4px'
  const ctaBtnRadius = morph?.cta?.buttonShape === 'pill' ? 'var(--radius-pill)' : morph?.cta?.buttonShape === 'rounded' ? 'var(--radius)' : 'var(--radius-sm)'
  const textWrap = morph?.global?.textWrapBalance ? 'text-wrap:balance;' : ''
  const reducedMotion = morph?.global?.reducedMotion ? '@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important}}' : ''

  return `
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.hero h1{animation:fadeInUp var(--motion-smooth) both;${textWrap}}
.hero .subtitle{animation:fadeInUp var(--motion-smooth) .1s both}
.hero-badge{animation:fadeIn var(--motion) .2s both}
.score-card{animation:scaleIn var(--motion-smooth) .15s both}
.info-card{animation:slideUp var(--motion) both;animation-delay:calc(var(--i,0)*.08s)}
.gap{animation:slideUp var(--motion) both;animation-delay:calc(var(--i,0)*.1s)}
.cta{animation:fadeInUp var(--motion-smooth) .2s both}
${reducedMotion}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6}
.hero{background:linear-gradient(${heroAngle},${p} 0%,${s} 100%);color:#fff;min-height:${heroMinH};display:flex;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 60%,rgba(255,255,255,0.08) 0%,transparent 60%)}
.hero-content{position:relative;z-index:1;max-width:800px;margin:0 auto}
.hero-badge{display:inline-flex;align-items:center;gap:.375rem;background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);padding:.375rem .875rem;border-radius:var(--radius-pill);font-size:.8125rem;font-weight:500;margin-bottom:1.25rem}
.hero h1{font-size:clamp(1.5rem,3.5vw,2.25rem);font-weight:800;line-height:1.2;margin-bottom:.75rem}
.hero .subtitle{font-size:1.05rem;opacity:.9;max-width:600px;margin:0 auto}
.container{max-width:${containerMW};margin:0 auto;padding:0 ${T?.containerGutter || '1.5rem'}}
.section{padding:${T?.sectionSpacing || '2.5rem'} 0}
.score-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem;box-shadow:var(--shadow-sm);display:flex;align-items:center;gap:2rem;flex-wrap:wrap;margin-top:-2rem;position:relative;z-index:2}
.score-ring{width:130px;height:130px;border-radius:50%;background:conic-gradient(${p} 0% ${Math.min(output?.fit || 60,100)}%,${a} ${Math.min(output?.fit || 60,100)}% ${Math.min((output?.fit||60)+(output?.eng||20),100)}%,${s} ${Math.min((output?.fit||60)+(output?.eng||20),100)}% 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.score-inner{width:100px;height:100px;border-radius:50%;background:var(--card);display:flex;flex-direction:column;align-items:center;justify-content:center}
.score-value{font-size:2.25rem;font-weight:${morph?.score?.valueFontWeight || '800'};line-height:1;color:${p}}
.score-label{font-size:.7rem;color:var(--muted-fg);text-transform:uppercase;letter-spacing:.05em;margin-top:.25rem}
.score-info{flex:1;min-width:240px}.score-info h2{font-size:1.35rem;font-weight:700;margin-bottom:.25rem}
.score-level{display:inline-flex;align-items:center;gap:.375rem;padding:.25rem .75rem;border-radius:var(--radius-pill);font-size:.8125rem;font-weight:600;background:${p15};color:${p};margin-bottom:1rem}
.score-bars{display:flex;flex-direction:column;gap:${morph?.score?.barGap || '.625rem'}}
.score-bar{display:flex;align-items:center;gap:.75rem}
.score-bar-label{width:110px;font-size:.8rem;font-weight:500;color:var(--muted-fg)}
.score-bar-track{flex:1;height:8px;background:var(--muted);border-radius:99px;overflow:hidden}
.score-bar-fill{height:100%;border-radius:99px}.score-bar-val{width:36px;text-align:right;font-size:.8rem;font-weight:600}
.info-grid{display:grid;grid-template-columns:repeat(var(--cols,${morph?.infoCards?.columns || 3}),minmax(240px,1fr));gap:1rem;margin:1.5rem 0}
.info-card{background:var(--card);border:1px solid var(--border);border-radius:${infoRadius};padding:${infoPad};box-shadow:${infoShadow}}
.info-card h4{font-size:.9rem;font-weight:700;margin-bottom:.5rem}
.info-card .value{font-size:1.5rem;font-weight:800;line-height:1.2}.info-card .value.stars{color:#f59e0b}
.info-card .meta{font-size:.8125rem;color:var(--muted-fg);margin-top:.25rem}
.info-card .status{display:inline-flex;align-items:center;gap:.25rem;padding:.125rem .5rem;border-radius:var(--radius-pill);font-size:.75rem;font-weight:600;margin-top:.5rem}
.info-card .status.ok{background:${p12};color:${p}}
.gap{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1.5rem;margin-bottom:1rem;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all var(--motion);position:relative}
.gap:hover{transform:${gapHover};box-shadow:var(--shadow-lg)}
.gap::before{content:'';position:absolute;top:0;left:0;width:${gapBarW};height:100%;border-radius:var(--radius-sm) 0 0 var(--radius-sm)}
.gap.critico::before{background:var(--destructive)}.gap.medio::before{background:var(--warning)}
.gap.oportunidade::before,.gap.forca::before{background:var(--success)}
.gap-header{display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem}
.gap-severity{font-size:.75rem;font-weight:700;text-transform:uppercase}
.gap-severity.critico{color:var(--destructive)}.gap-severity.medio{color:var(--warning)}
.gap-severity.oportunidade,.gap-severity.forca{color:var(--success)}
.gap h4{font-size:1.05rem;font-weight:700}.gap p{color:var(--muted-fg);font-size:.9rem;margin-bottom:.75rem}
.gap .fix{background:var(--muted);padding:.875rem 1rem;border-radius:var(--radius-sm);font-size:.875rem}
.gap .fix strong{color:var(--fg)}
.gap .meta-row{display:flex;gap:1.25rem;margin-top:.75rem;font-size:.8rem;color:var(--muted-fg)}
.cta{background:linear-gradient(${morph?.cta?.gradientDirection || '135deg'},${p} 0%,${s} 100%);color:#fff;text-align:center;padding:${morph?.cta?.sectionPadding || '2.5rem 2rem'};border-radius:var(--radius);box-shadow:var(--shadow-lg)}
.cta h2{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}
.cta p{opacity:.9;max-width:450px;margin:0 auto 1.5rem;font-size:.95rem}
.cta-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--card);color:${p};padding:.75rem 1.75rem;border-radius:${ctaBtnRadius};font-size:.95rem;font-weight:700;text-decoration:none;transition:all var(--motion);box-shadow:0 4px 14px rgba(0,0,0,0.12)}
.cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,0,0,0.18)}
.footer{text-align:center;padding:${morph?.footer?.padding || '2rem 0'};color:var(--muted-fg);font-size:.75rem;border-top:${morph?.footer?.borderStyle || '1px solid var(--border)'};margin-top:2rem}
.footer span{color:${p};font-weight:600}
@media(max-width:600px){.score-card{flex-direction:column;text-align:center}.info-grid{grid-template-columns:1fr}}`
}

// ═══ MAIN COMPONENT ═══
export default async function S10RaioXPage(props: { output: any }) {
  const output = props.output
  const T = output.T || {}
  const O = output.ontology || {}
  const morph = output.morph || null

  // Layout hints override OD
  const hints = output.tracedLayout?.layoutHints || {}
  const Tfinal = { ...T }
  if (hints.container) Tfinal.containerMaxWidth = hints.container as string
  if (hints.sectionSpacing) Tfinal.sectionSpacing = hints.sectionSpacing as string

  const iconFn = (name: string): string => renderIcon(output.icons || {}, name)

  // Slot-driven: itera tracedLayout.slots dinamicamente
  const L = output.tracedLayout?.slots || {}
  const slotOrder = Object.keys(L)
  const bodySlots = slotOrder.filter((k: string) => k !== 'hero' && k !== 'footer')
  const hasHero = slotOrder.includes('hero')
  const hasFooter = slotOrder.includes('footer')

  const renderCtx: Omit<SlotRenderProps, 'slot'> = { output, T: Tfinal, O, icon: iconFn, morph }

  const vocabTrace = output.vocab?.iconFacets?.length
    ? '/* Intent vocab: ' + output.vocab.iconFacets.slice(0, 6).join(' ') + ' */'
    : ''
  const cssSources = output.cssPatterns?.sources?.length
    ? '/* Corpus sources: ' + output.cssPatterns.sources.slice(0, 3).join(', ') + ' */'
    : ''
  const morphTrace = morph?.hero?.reasoning
    ? '/* Morph: ' + morph.hero.reasoning.slice(0, 80) + ' */'
    : ''

  // Schema.org JSON-LD
  const hasWeb = !!(output.website && /^https?:\/\//.test(output.website))
  const imgJson = hasWeb ? ',"image":"' + esc(output.website || '') + '"' : ''
  const schemaJson = '{"@context":"https://schema.org","@type":"LocalBusiness","name":"' + esc(output.name || '') + '"' + imgJson + ',"address":{"@type":"PostalAddress","addressLocality":"' + esc(output.city || 'BR') + '"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"' + (output.rating || 0).toFixed(1) + '","reviewCount":"' + (output.reviews || 0) + '"}}'

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <meta name="description" content={output.headline || 'Diagnóstico Raio-X adsentice'} />
        {hasWeb ? <meta property="og:image" content={output.website} /> : null}
        <title>Raio-X · {output.name || 'Negócio Local'} | adsentice</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={'https://fonts.googleapis.com/css2?family=' + (T.font || 'Inter').replace(/ /g, '+') + ':wght@400;500;600;700;800&display=swap'} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{
          __html: '@font-face{font-family:' + (T.font || 'Inter') + ';font-display:swap}\n' +
            vocabTrace + '\n' + cssSources + '\n' + morphTrace + '\n' +
            cssTokens(Tfinal) + '\n' +
            cssLayout(output, Tfinal, morph)
        }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />
      </head>
      <body>
        {hasHero ? SLOT_RENDERERS.hero({ ...renderCtx, slot: L.hero }) : null}
        <main className="container" role="main" aria-label="Resultado do diagnóstico">
          {bodySlots.map((slotName: string) => {
            const renderer = SLOT_RENDERERS[slotName]
            if (!renderer) return <div key={slotName}>{'<!-- slot ' + slotName + ': no renderer -->'}</div>
            return <div key={slotName}>{renderer({ ...renderCtx, slot: L[slotName] })}</div>
          })}
        </main>
        {hasFooter ? SLOT_RENDERERS.footer({ ...renderCtx, slot: L.footer }) : null}
      </body>
    </html>
  )
}
