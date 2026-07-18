// S10 Raio-X · Score Slot — corpus-driven morph
import type { PerSlotMutations } from '../../../../../../packages/warp/src/morph-resolver'

export default function ScoreSlot(props: {
  output: any; slot: any; T: any; morph: PerSlotMutations | null
}) {
  const { output, T, morph } = props
  const p = output.p; const s = output.s; const a = output.a
  const fit = Math.min(output.fit, 100)
  const eng = Math.min(output.eng, 100)
  const ints = Math.min(output.ints, 100)

  const barGap = morph?.score?.barGap || T.spacing?.[0] || '.625rem'

  return (
    <div className="score-card" role="region" aria-label={'Diagnóstico de ' + output.name + ': score ' + output.score + ' de 100'}>
      <div className="score-ring" role="progressbar" aria-label={'Score ' + output.score + ' de 100'}>
        <div className="score-inner" aria-hidden="true">
          <div className="score-value">{output.score}</div>
          <div className="score-label">de 100</div>
        </div>
      </div>
      <div className="score-info">
        <h2>{output.name}</h2>
        <div className="score-level" role="status" aria-label={'Nível de consciência: ' + output.level}>
          {output.level} · {output.nichoName}
        </div>
        <div className="score-bars" style={{ gap: barGap } as React.CSSProperties}>
          <div className="score-bar">
            <span className="score-bar-label">Presença</span>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: fit + '%', background: p }} />
            </div>
            <span className="score-bar-val">{output.fit}%</span>
          </div>
          <div className="score-bar">
            <span className="score-bar-label">Engajamento</span>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: eng + '%', background: a }} />
            </div>
            <span className="score-bar-val">{output.eng}%</span>
          </div>
          <div className="score-bar">
            <span className="score-bar-label">Intenção</span>
            <div className="score-bar-track">
              <div className="score-bar-fill" style={{ width: ints + '%', background: s }} />
            </div>
            <span className="score-bar-val">{output.ints}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
