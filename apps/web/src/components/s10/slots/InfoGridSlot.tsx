// S10 Raio-X · Info Grid Slot — corpus-driven morph
import type { PerSlotMutations } from '../../../../../../packages/warp/src/morph-resolver'

function stars(r: number): string {
  return r >= 5 ? "★★★★★" : "★".repeat(Math.max(1, Math.round(r))) + "☆".repeat(Math.max(0, 5 - Math.round(r)))
}

export default function InfoGridSlot(props: {
  output: any; slot: any; icon: (name: string) => string
  morph: PerSlotMutations | null
}) {
  const { output, slot, icon, morph } = props
  const ds = stars(output.rating)
  const st = slot?.tokens || {}
  const cols = slot?.columns || morph?.infoCards?.columns || 3

  const inlinePad = st.padding || morph?.infoCards?.padding
  const inlineRad = st.radius || morph?.infoCards?.borderRadius

  const iconSvg = (name: string) => {
    const markup = icon(name)
    return markup ? <span dangerouslySetInnerHTML={{ __html: markup }} /> : null
  }

  const cardStyle = (i: number) => {
    const s: Record<string, string> = { '--i': String(i) }
    if (inlinePad) s['padding'] = inlinePad as string
    if (inlineRad) s['borderRadius'] = inlineRad as string
    return s
  }

  return (
    <div className="info-grid" style={{ '--cols': cols } as React.CSSProperties}>
      <div className="info-card" role="region" aria-label="Google Meu Negócio" style={cardStyle(0)}>
        <h4>Google Meu Negócio</h4>
        <div className="value stars">{ds}</div>
        <div className="meta">{output.rating.toFixed(1)}★ · {output.reviews} avaliações</div>
        <div className="status ok">{output.photos} fotos · {output.claimed}</div>
      </div>
      <div className="info-card" role="region" aria-label="Website" style={cardStyle(1)}>
        <h4>Website</h4>
        <div className="value" style={{ fontSize: '1.1rem', wordBreak: 'break-all' }}>
          {String(output.website || 'sem site').slice(0, 35)}
        </div>
        <div className="meta">{output.local}</div>
        <div className="status ok">{iconSvg('shield')} {output.website ? 'Online' : 'Offline'}</div>
      </div>
      <div className="info-card" role="region" aria-label="Concorrência" style={cardStyle(2)}>
        <h4>Concorrência</h4>
        <div className="value">{output.competitors > 1 ? output.competitors - 1 : '—'}</div>
        <div className="meta">{output.nichoName.toLowerCase()}s na região</div>
        <div className="status ok">{iconSvg('chart')} Score {output.score}/100</div>
      </div>
    </div>
  )
}
