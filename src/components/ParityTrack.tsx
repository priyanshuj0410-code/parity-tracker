import { pct } from '../lib/format'

export function ParityTrack({ value }: { value: number }) {
  return (
    <div>
      <div className="track" role="img" aria-label={`${pct(value)} out of a 50% parity line`}>
        <div className="fill" style={{ width: `${Math.min(value / 0.5, 1) * 100}%` }} />
      </div>
      <div className="track-scale"><span>0%</span><span>50% parity</span></div>
    </div>
  )
}
