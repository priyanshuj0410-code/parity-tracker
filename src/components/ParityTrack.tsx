import { pct } from '../lib/format'

export function ParityTrack({ value, parity = 0.5, max = parity }: { value: number; parity?: number; max?: number }) {
  const at = (v: number) => `${(Math.min(Math.max(v, 0), max) / max) * 100}%`
  return (
    <div>
      <div className="track" role="img" aria-label={`${pct(value)} against a ${pct(parity, 0)} parity line`}>
        <div className="fill" style={{ width: at(value) }} />
        {max > parity && <div className="track-par" style={{ left: at(parity) }} />}
      </div>
      <div className="track-scale">
        <span>0%</span>
        {max > parity ? <><span className="track-par-label" style={{ left: at(parity) }}>{pct(parity, 0)} parity</span><span>{pct(max, 0)}</span></> : <span>{pct(parity, 0)} parity</span>}
      </div>
    </div>
  )
}
