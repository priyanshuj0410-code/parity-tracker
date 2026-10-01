interface Props {
  values: (number | null)[]
  width?: number
  height?: number
  label: string
}

export function Sparkline({ values, width = 96, height = 28, label }: Props) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null)
  if (pts.length < 2) return <span className="spark-empty" aria-hidden="true" />
  const min = Math.min(...pts.map((p) => p.v))
  const max = Math.max(...pts.map((p) => p.v))
  const pad = Math.max((max - min) * 0.15, 0.002)
  const lo = min - pad
  const hi = max + pad
  const x = (i: number) => 2 + (i / (values.length - 1)) * (width - 6)
  const y = (v: number) => height - 3 - ((v - lo) / (hi - lo)) * (height - 6)
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const first = pts[0].v
  const last = pts[pts.length - 1].v
  const tone = Math.abs(last - first) < 0.0005 ? 'flat' : last > first ? 'up' : 'down'
  return (
    <svg className={`spark ${tone}`} width={width} height={height} role="img" aria-label={label}>
      <path d={d} fill="none" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(pts[pts.length - 1].i)} cy={y(last)} r={2.5} />
    </svg>
  )
}
