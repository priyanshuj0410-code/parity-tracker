import { useId, useState } from 'react'
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
  area?: boolean
}

const M = { t: 16, r: 112, b: 32, l: 44 }

function niceTicks(yMax: number): number[] {
  let best = { step: 0.1, n: Math.ceil(yMax / 0.1 - 1e-9) }
  for (const step of [0.5, 0.25, 0.2]) {
    const n = Math.ceil(yMax / step - 1e-9)
    if (n >= 2 && n <= 4 && n * step < best.n * best.step + 1e-9) best = { step, n }
  }
  return Array.from({ length: best.n + 1 }, (_, i) => Math.round(i * best.step * 100) / 100)
}

export function LineChart({ series, xs, xLabel, fmt, ariaLabel, yMax = 0.5, height = 260, reference, area = series.length === 1 }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gid = 'wash' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const ticks = niceTicks(yMax)
  const top = ticks[ticks.length - 1]
  const w = Math.max(width, 300)
  const iw = w - M.l - M.r
  const ih = height - M.t - M.b
  const step = xs.length > 1 ? iw / (xs.length - 1) : iw
  const xPos = (i: number) => M.l + (xs.length > 1 ? i * step : iw / 2)
  const yPos = (v: number) => M.t + ih - (Math.min(v, top) / top) * ih

  const runs = (s: Series) => {
    const out: { i: number; y: number }[][] = []
    let cur: { i: number; y: number }[] = []
    for (const p of s.points) {
      const i = xs.indexOf(p.x)
      if (p.y == null || p.hollow || i < 0) { if (cur.length) out.push(cur); cur = []; continue }
      cur.push({ i, y: p.y })
    }
    if (cur.length) out.push(cur)
    return out
  }
  const path = (s: Series) => runs(s).map((r) => r.map((p, k) => `${k ? 'L' : 'M'}${xPos(p.i)},${yPos(p.y)}`).join('')).join('')
  const wash = (s: Series) => runs(s).filter((r) => r.length > 1)
    .map((r) => `M${xPos(r[0].i)},${yPos(0)}` + r.map((p) => `L${xPos(p.i)},${yPos(p.y)}`).join('') + `L${xPos(r[r.length - 1].i)},${yPos(0)}Z`).join('')
  const prevValue = (s: Series, x: string) => {
    const i = s.points.findIndex((p) => p.x === x)
    const a = s.points[i - 1]
    const b = s.points[i]
    return a && b && a.y != null && b.y != null && !a.hollow && !b.hollow ? b.y - a.y : null
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
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={series[0]?.color} stopOpacity={0.22} />
            <stop offset="1" stopColor={series[0]?.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'base-line' : 'grid-line'} x1={M.l} x2={M.l + iw} y1={yPos(t)} y2={yPos(t)} />
            <text className="axis" x={M.l - 10} y={yPos(t)} textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
          </g>
        ))}
        {reference && (
          <g>
            <line className="ref" x1={M.l} x2={M.l + iw} y1={yPos(reference.y)} y2={yPos(reference.y)} />
            <text className="reflabel" x={M.l + 6} y={yPos(reference.y) - 6}>{reference.label}</text>
          </g>
        )}
        {xs.map((x, i) => (
          <text key={x} className={hover === i ? 'axis on' : 'axis'} x={xPos(i)} y={height - 8} textAnchor="middle">{xLabel(x)}</text>
        ))}
        {area && series[0] && <path d={wash(series[0])} fill={`url(#${gid})`} stroke="none" />}
        {hover != null && <line className="crosshair" x1={xPos(hover)} x2={xPos(hover)} y1={M.t} y2={M.t + ih} />}
        {series.map((s) => (
          <path key={s.id} d={path(s)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) =>
          s.points.map((p) => {
            const i = xs.indexOf(p.x)
            if (p.y == null || i < 0) return null
            return (
              <circle key={s.id + p.x} cx={xPos(i)} cy={yPos(p.y)} r={hover === i ? 5.5 : 3.5}
                fill={p.hollow ? 'var(--card)' : s.color} stroke={p.hollow ? s.color : 'var(--card)'} strokeWidth={2} />
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
        <div className="tooltip" style={{ left: xPos(hover) > w / 2 ? xPos(hover) - 232 : xPos(hover) + 14, top: M.t }}>
          <strong>{xLabel(xs[hover])}</strong>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === xs[hover])
            const d = prevValue(s, xs[hover])
            return (
              <div key={s.id} className="tt-row">
                <i style={{ background: s.color }} />
                <span className="tt-label">{s.label}{p?.note ? ` · ${p.note}` : ''}</span>
                <span className="tt-val">{p && p.y != null ? fmt(p.y) + (p.hollow ? ' est.' : '') : 'n/a'}</span>
                {d != null && Math.abs(d) >= 0.0005 && <span className={d > 0 ? 'tt-d up' : 'tt-d down'}>{d > 0 ? '+' : '−'}{Math.abs(d * 100).toFixed(1)}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
