// ADSENTICE · S10 Raio-X JSX Render (ADR-0037 Fase 2)
// Rota standalone: /s10-raio-x/[place_id]
// Bypassa MUI [lang] wrapper — layout.tsx minimalista.

import { composeS10 } from '@/lib/warp-composer'
import { renderToStaticMarkup } from 'react-dom/server'

// ── Helper: fetch + compose BLUE output ──
async function getS10Output(placeId: string): Promise<any | null> {
  const result = await composeS10(placeId)
  if (!result) return null
  const meta = result.meta as Record<string, any>
  return {
    name: meta.lead || 'Negócio Local',
    headline: meta.headline || '',
    subtitle: meta.subtitle || '',
    cta: meta.cta || '',
    category: meta.category || '',
    seg: meta.segment || 'saude',
    score: meta.score || 50,
    fit: 60, eng: 40, ints: 50,
    nichoName: meta.nicho?.name || meta.segment || '',
    level: 'Problem Aware',
    rating: 4.9,
    reviews: 131,
    photos: 22,
    website: 'https://example.com',
    claimed: '✅ Sim',
    city: meta.city || 'BR',
    district: meta.district || '',
    local: meta.district ? meta.district + ', ' + meta.city : (meta.city || 'BR'),
    competitors: meta.competitors || 5,
    offer: 'Diagnóstico Gratuito',
    p: meta.tokens?.primary || 'oklch(55% 35% 220)',
    s: meta.tokens?.secondary || 'oklch(40% 35% 220)',
    a: meta.tokens?.accent || 'oklch(65% 28% 220)',
    p15: 'oklch(55% 35% 220 / 8%)',
    p12: 'oklch(55% 35% 220 / 5%)',
    T: {
      primary: meta.tokens?.primary || 'oklch(55% 35% 220)',
      primaryFg: '#fff', secondary: meta.tokens?.secondary || 'oklch(40% 35% 220)',
      secondaryFg: '#fff', accent: meta.tokens?.accent || 'oklch(65% 28% 220)',
      bg: '#f8fafc', fg: '#0f172a', card: '#ffffff', muted: '#f1f5f9', mutedFg: '#64748b',
      border: '#e2e8f0', destructive: '#ef4444', success: '#10b981', warning: '#f59e0b',
      font: 'Inter', fontDisplay: 'Inter',
      spacing: ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '2rem', '2.5rem', '3rem'],
      shadowSm: '0 1px 2px rgba(0,0,0,0.05)', shadowMd: '0 4px 6px -1px rgba(0,0,0,0.07)',
      shadowLg: '0 10px 15px -3px rgba(0,0,0,0.08)', radius: '0.75rem', radiusSm: '0.5rem',
      radiusPill: '9999px', motionFast: '150ms ease', motion: '200ms cubic-bezier(0.4,0,0.2,1)',
      motionSmooth: '300ms cubic-bezier(0.4,0,0.2,1)', heroMinHeight: '50vh',
      containerMaxWidth: '860px', containerGutter: '1.5rem', sectionSpacing: '2.5rem',
      sectionSpacingTablet: '1.5rem', sectionSpacingPhone: '1rem',
      cardPadding: '2rem', cardBorder: '1px solid var(--border)',
      cardShadow: '0 1px 2px rgba(0,0,0,0.05)',
      buttonPaddingBlock: '.75rem', buttonPaddingInline: '1.75rem', buttonRadius: '99px',
      designSystem: 'warp-default',
    },
    gaps: meta.gaps || [],
    ontology: meta.ontology || {},
    icons: {},
    cssPatterns: null,
    vocab: meta._vocab || {},
    mktFrameworks: meta._mkt?.topFrameworks || [],
    morph: meta._morph || null,
    composedLayout: meta._composed || null,
    k0Templates: meta._k0?.top || [],
    tracedLayout: meta.layoutTree || { id: 'layout.s10', type: 's10-raio-x', slots: { hero:{}, score:{}, info_grid:{}, gaps:{}, cta:{}, footer:{} } },
    designSystem: meta.designSystem || 'warp-default',
    mediaAnim: null, specialistActive: true, grammarType: 's10-raio-x',
    graphComps: [], cardComp: null, btnComp: null, ringComp: null, chipComp: null,
    usedComponents: [], graph: new Map(),
    critique: meta.critique || { composite: 7.5, passed: true, feedback: [], devloopIter: 0 },
    copyModel: meta.copy_model || 'deepseek-refine',
  }
}

// ═══ PAGE (SWC-ready: async Server Component direct) ═══
export default async function S10RaioXRoute(props: { params: Promise<{ place_id: string }> }) {
  const { place_id } = await props.params
  const output = await getS10Output(place_id)

  if (!output) {
    return (
      <html>
        <head><title>Raio-X não encontrado | adsentice</title></head>
        <body style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: '2rem', textAlign: 'center' }}>
          <h1>Raio-X não encontrado</h1>
          <p>Lead {place_id} não encontrado ou pipeline falhou.</p>
        </body>
      </html>
    )
  }

  // Dynamic import to avoid SWC parsing issues with TSX in route handler
  const { default: S10RaioXPage } = await import('@/components/s10/S10RaioX')
  return <S10RaioXPage output={output} />
}
