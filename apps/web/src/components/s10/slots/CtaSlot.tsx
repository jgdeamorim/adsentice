// S10 Raio-X · CTA Slot — corpus-driven morph
import type { PerSlotMutations } from '../../../../../../packages/warp/src/morph-resolver'

export default function CtaSlot(props: {
  output: any; slot: any; T: any; O: any; icon: (name: string) => string
  morph: PerSlotMutations | null
}) {
  const { output, slot, T, O, icon, morph } = props
  const st = slot?.tokens || {}
  const btnPad = st.buttonPadding || T.buttonPaddingBlock + ' ' + T.buttonPaddingInline
  const btnRad = st.buttonRadius || T.buttonRadius
  const sectionPad = st.sectionPadding || morph?.cta?.sectionPadding || '2.5rem 2rem'

  const iconSvg = (name: string) => {
    const markup = icon(name)
    return markup ? <span dangerouslySetInnerHTML={{ __html: markup }} /> : null
  }

  const whatsapp = process.env.WHATSAPP_NUMBER || '5521999999999'

  return (
    <div className="cta" style={{ padding: sectionPad }}>
      <h2>{output.offer}</h2>
      <p>{O?.persona?.offer || 'Diagnóstico gratuito em 30 segundos.'}</p>
      <a
        href={'https://wa.me/' + whatsapp}
        className="cta-btn"
        role="button"
        aria-label={output.cta + ' no WhatsApp'}
        style={{ padding: btnPad, borderRadius: btnRad }}
        target="_blank"
        rel="noopener"
      >
        {iconSvg('message')} {output.cta} no WhatsApp
      </a>
    </div>
  )
}
