// ADSENTICE · S10 Raio-X JSX Render (ADR-0037 Fase 2)
// Rota standalone: /s10-raio-x/[place_id]
// Bypassa MUI [lang] wrapper — layout.tsx minimalista + middleware PUBLIC_PREFIXES.
// ZERO hardcode: composeS10() expõe o S10BlueOutput completo (blue) — dados reais
// do pipeline BLUE (Supabase + M9 + 9 queries Qdrant + DeepSeek + morph + icons SVG).

import { composeS10 } from '@/lib/warp-composer'
import S10RaioXPage from '@/components/s10/S10RaioX'

export const dynamic = 'force-dynamic'

// ═══ PAGE (SWC-ready: async Server Component, props inline, helpers fora) ═══
export default async function S10RaioXRoute(props: { params: Promise<{ place_id: string }> }) {
  const { place_id } = await props.params
  const result = await composeS10(place_id)

  if (!result || !result.blue) {
    return (
      <html lang="pt-BR">
        <head>
          <meta charSet="UTF-8" />
          <title>Raio-X não encontrado | adsentice</title>
        </head>
        <body style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: '2rem', textAlign: 'center' }}>
          <h1>Raio-X não encontrado</h1>
          <p>Lead {place_id} não encontrado ou pipeline indisponível.</p>
        </body>
      </html>
    )
  }

  return <S10RaioXPage output={result.blue} />
}
