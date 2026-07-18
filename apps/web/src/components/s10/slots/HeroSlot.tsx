// S10 Raio-X · Hero Slot — corpus-driven morph
import type { PerSlotMutations } from '../../../../../../packages/warp/src/morph-resolver'

export default function HeroSlot(props: {
  output: any; slot: any; O: any; icon: (name: string) => string
  morph: PerSlotMutations | null
}) {
  const { output, O, icon, morph } = props
  const badgeLabel = O?.persona?.offer || output.nichoName
  const emotionLabel = O?.psychology?.primaryEmotion
    ? O.psychology.primaryEmotion.split(' + ')[0]
    : output.seg

  const iconSvg = icon('search')

  return (
    <header className="hero" role="banner" aria-label={output.headline || 'Diagnóstico Raio-X'}>
      <div className="hero-content">
        <div className="hero-badge" role="status" aria-label={badgeLabel}>
          {iconSvg ? <span dangerouslySetInnerHTML={{ __html: iconSvg }} /> : null}
          {' '}{emotionLabel} · {badgeLabel}
        </div>
        <h1>{output.headline}</h1>
        <p className="subtitle">{output.subtitle}</p>
      </div>
    </header>
  )
}
