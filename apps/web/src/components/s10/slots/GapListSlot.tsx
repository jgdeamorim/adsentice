// S10 Raio-X · Gap List Slot — corpus-driven morph
import type { PerSlotMutations } from '../../../../../../packages/warp/src/morph-resolver'

export default function GapListSlot(props: {
  output: any; slot: any; T: any; O: any; icon: (name: string) => string
  morph: PerSlotMutations | null
}) {
  const { output, slot, T, O, icon, morph } = props
  const st = slot?.tokens || {}
  const heading = output.gaps.length + ' ' + (O?.psychology?.primaryEmotion
    ? O.psychology.primaryEmotion.split(' + ')[0] + ' · Oportunidades'
    : 'Gaps e Oportunidades')
  const approach = O?.persona?.approach || 'Análise baseada em dados reais.'

  const sevClass = (sev: string) =>
    sev.includes("Crítico") ? "critico" : sev.includes("Médio") ? "medio" : sev.includes("Força") ? "forca" : "oportunidade"

  const iconSvg = (name: string) => {
    const markup = icon(name)
    return markup ? <span dangerouslySetInnerHTML={{ __html: markup }} /> : null
  }

  const gapStyle = (i: number) => {
    const s: Record<string, string> = { '--i': String(i) }
    if (st.padding) s['padding'] = st.padding as string
    if (st.radius) s['borderRadius'] = st.radius as string
    return s
  }

  return (
    <div className="section">
      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: T.spacing?.[1] || '.5rem' }}>{heading}</h2>
      <p style={{ color: 'var(--muted-fg)', marginBottom: '1.5rem' }}>{approach}</p>
      {output.gaps.map((g: any, idx: number) => {
        const sc = sevClass(g.severity)
        const sevIcon = sc === 'critico' ? 'shield' : sc === 'forca' ? 'star' : 'trend'
        return (
          <div key={idx} className={'gap ' + sc} role="region" aria-label={g.title} style={gapStyle(idx)}>
            <div className="gap-header">
              <span className={'gap-severity ' + sc}>{g.severity}</span>
              <h4>{g.title}</h4>
            </div>
            <p>{g.desc}</p>
            <div className="fix">
              <strong>{iconSvg(sevIcon)} Como resolver:</strong> {g.fix}
            </div>
            <div className="meta-row">
              <span>{iconSvg('trend')} Impacto: {g.impact}</span>
              <span>⏱️ Esforço: {g.effort}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
