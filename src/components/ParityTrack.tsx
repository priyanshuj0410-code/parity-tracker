import { pct } from '../lib/format'

export function ParityTrack({ value, parity = 0.5 }: { value: number; parity?: number }) {
  return (
    <div>
      <div className="track" role="img" aria-label={`${pct(value)} out of a ${pct(parity, 0)} parity line`}>
        <div className="fill" style={{ width: `${Math.min(value / parity, 1) * 100}%` }} />
      </div>
      <div className="track-scale"><span>0%</span><span>{pct(parity, 0)} parity</span></div>
    </div>
  )
}
