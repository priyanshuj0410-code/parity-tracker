import { NA } from '../lib/format'

export function Change({ value, unit = 'pp', hideMissing = false }: { value: number | null; unit?: string; hideMissing?: boolean }) {
  if (value == null) return hideMissing ? null : <span className="chg none">{NA}</span>
  const pts = value * 100
  if (Math.abs(pts) < 0.05) return <span className="chg flat">no change</span>
  const up = pts > 0
  return (
    <span className={`chg ${up ? 'up' : 'down'}`} aria-label={`${up ? 'up' : 'down'} ${Math.abs(pts).toFixed(1)} percentage points`}>
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d={up ? 'M4 1 7.5 7h-7z' : 'M4 7 .5 1h7z'} fill="currentColor" /></svg>
      {up ? '+' : '−'}{Math.abs(pts).toFixed(1)} {unit}
    </span>
  )
}
