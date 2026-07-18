// S10 Raio-X · Footer Slot — corpus-driven morph
import type { PerSlotMutations } from '../../../../../../packages/warp/src/morph-resolver'

export default function FooterSlot(props: {
  output: any; slot: any; T: any; O: any
  morph: PerSlotMutations | null
}) {
  const { output, T, O, morph } = props
  const st = props.slot?.tokens || {}

  return (
    <footer className="footer" style={{
      padding: st.padding || morph?.footer?.padding || (T.sectionSpacing + ' 0'),
      marginTop: st.marginTop || (T.spacing?.[4] || '2rem'),
    }}>
      <div className="container">
        <p>Diagnóstico gerado por <span>adsentice</span> — {O?.persona?.who || 'inteligência de mercado para negócios locais.'}</p>
        <p style={{ marginTop: T.spacing?.[0] || '.25rem' }}>
          Dados: Google Meu Negócio · website · mercado local · {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </footer>
  )
}
