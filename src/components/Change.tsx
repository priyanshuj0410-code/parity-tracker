import { NA } from '../lib/format'

export function Change({ value, unit = 'pp', hideMissing = false }: { value: number | null; unit?: string; hideMissing?: boolean }) {
  if (value == null) return hideMissing ? null : <span className="chg flat">{NA}</span>
  const pts = value * 100
  if (Math.abs(pts) < 0.05) return <span className="chg flat">no change</span>
  const up = pts > 0
  const text = `${up ? '▲ +' : '▼ −'}${Math.abs(pts).toFixed(1)} ${unit}`
  return (
    <span className={`chg ${up ? 'up' : 'down'}`} aria-label={`${up ? 'up' : 'down'} ${Math.abs(pts).toFixed(1)} percentage points`}>
      {text}
    </span>
  )
}
