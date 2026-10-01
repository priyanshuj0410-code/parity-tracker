import { pct } from '../lib/format'

export function Meter({ value, parity, max = 1, digits = 1, approx = false }: { value: number | null | undefined; parity: number; max?: number; digits?: number; approx?: boolean }) {
  if (value == null) return <span className="muted">n/a</span>
  return (
    <span className="meter" title={approx ? 'Approximate: derived from the wage share and the share of permanent staff' : undefined}>
      <span className="meter-val">{approx ? '≈' : ''}{pct(value, digits)}</span>
      <span className="meter-track" aria-hidden="true">
        <span className="meter-fill" style={{ width: `${Math.min(Math.max(value, 0) / max, 1) * 100}%` }} />
        <span className="meter-par" style={{ left: `${(parity / max) * 100}%` }} />
      </span>
    </span>
  )
}
