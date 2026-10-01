import { useState } from 'react'
import { useWidth } from '../lib/useWidth'

export interface Point {
  x: string
  y: number | null
  hollow?: boolean
  note?: string
}

export interface Series {
  id: string
  label: string
  short: string
  color: string
  points: Point[]
}

interface Props {
  series: Series[]
  xs: string[]
  xLabel: (x: string) => string
  fmt: (v: number) => string
  ariaLabel: string
  yMax?: number
  height?: number
  reference?: { y: number; label: string }
}

const M = { t: 16, r: 120, b: 32, l: 44 }

export function LineChart({ series, xs, xLabel, fmt, ariaLabel, yMax = 0.5, height = 260, reference }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const w = Math.max(width, 300)
  const iw = w - M.l - M.r
  const ih = height - M.t - M.b
  const step = xs.length > 1 ? iw / (xs.length - 1) : iw
  const xPos = (i: number) => M.l + (xs.length > 1 ? i * step : iw / 2)
  const yPos = (v: number) => M.t + ih - (Math.min(v, yMax) / yMax) * ih
  const ticks: number[] = []
  for (let t = 0; t <= yMax + 1e-9; t += 0.1) ticks.push(Math.round(t * 10) / 10)

  const path = (s: Series) => {
    let d = ''
    let pen = false
    for (const p of s.points) {
      const i = xs.indexOf(p.x)
      if (p.y == null || p.hollow || i < 0) { pen = false; continue }
      d += `${pen ? 'L' : 'M'}${xPos(i)},${yPos(p.y)}`
      pen = true
    }
    return d
  }

  const ends = series
    .map((s) => {
      const pts = s.points.filter((p) => p.y != null && xs.includes(p.x))
      const last = pts[pts.length - 1]
      return last ? { s, i: xs.indexOf(last.x), v: last.y as number, ty: yPos(last.y as number) } : null
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.ty - b.ty)
  for (let k = 1; k < ends.length; k++) {
    if (ends[k].ty - ends[k - 1].ty < 15) ends[k].ty = ends[k - 1].ty + 15
  }

  const pick = (clientX: number, el: Element) => {
    const x = clientX - el.getBoundingClientRect().left
    setHover(Math.max(0, Math.min(xs.length - 1, Math.round((x - M.l) / step))))
  }

  return (
    <div className="chart" ref={ref}>
      {series.length >= 2 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.id} className="key"><i style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      )}
      <svg width={w} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={M.l} x2={M.l + iw} y1={yPos(t)} y2={yPos(t)} />
            <text className="axis" x={M.l - 8} y={yPos(t)} textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
          </g>
        ))}
        {reference && (
          <g>
            <line className="ref" x1={M.l} x2={M.l + iw} y1={yPos(reference.y)} y2={yPos(reference.y)} />
            <text className="reflabel" x={M.l + 6} y={yPos(reference.y) - 6}>{reference.label}</text>
          </g>
        )}
        {xs.map((x, i) => (
          <text key={x} className="axis" x={xPos(i)} y={height - 10} textAnchor="middle">{xLabel(x)}</text>
        ))}
        {hover != null && <line className="crosshair" x1={xPos(hover)} x2={xPos(hover)} y1={M.t} y2={M.t + ih} />}
        {series.map((s) => (
          <path key={s.id} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) =>
          s.points.map((p) => {
            const i = xs.indexOf(p.x)
            if (p.y == null || i < 0) return null
            return (
              <circle key={s.id + p.x} cx={xPos(i)} cy={yPos(p.y)} r={4}
                fill={p.hollow ? 'var(--paper)' : s.color} stroke={p.hollow ? s.color : 'var(--paper)'} strokeWidth={2} />
            )
          }),
        )}
        {ends.map((e) => (
          <text key={e.s.id} className="endlabel" x={xPos(e.i) + 10} y={e.ty} dominantBaseline="middle">
            {series.length > 1 ? `${e.s.short} ${fmt(e.v)}` : fmt(e.v)}
          </text>
        ))}
        <rect x={M.l - step / 2} y={M.t} width={iw + step} height={ih} fill="transparent"
          onPointerMove={(ev) => pick(ev.clientX, ev.currentTarget.ownerSVGElement ?? ev.currentTarget)}
          onPointerDown={(ev) => pick(ev.clientX, ev.currentTarget.ownerSVGElement ?? ev.currentTarget)}
          onPointerLeave={() => setHover(null)} />
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: Math.min(xPos(hover) + 12, w - 190), top: M.t }}>
          <strong>{xLabel(xs[hover])}</strong>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === xs[hover])
            const val = p && p.y != null ? fmt(p.y) + (p.hollow ? ' (estimated)' : '') : 'no data'
            return <div key={s.id}><i style={{ background: s.color }} />{s.label}: {val}{p?.note ? ` · ${p.note}` : ''}</div>
          })}
        </div>
      )}
    </div>
  )
}
