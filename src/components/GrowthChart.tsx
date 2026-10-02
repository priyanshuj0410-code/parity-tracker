import { useState } from 'react'
import { useWidth } from '../lib/useWidth'

export interface GrowthSeries {
  id: string
  label: string
  short: string
  color: string
  /** Simulated series are dashed, so they never pass for a real index. */
  dashed?: boolean
  values: number[]
}

interface Props {
  series: GrowthSeries[]
  months: string[]
  xLabel: (month: string) => string
  ariaLabel: string
  start?: number
  height?: number
  /** A shaded band from the first month to `until`, for a stretch built from data published later. */
  shade?: { until: string; label: string }
}

const MARGIN = { t: 16, b: 32, l: 44 }
const DASH = '6 4'

/** Two to four gridline intervals on a round step, covering the data and the starting value. */
function ticksFor(lo: number, hi: number): number[] {
  for (const step of [5, 10, 20, 25, 50]) {
    const a = Math.floor(lo / step) * step
    const n = Math.ceil((hi - a) / step - 1e-9)
    if (n >= 2 && n <= 4) return Array.from({ length: n + 1 }, (_, i) => a + i * step)
  }
  const step = Math.ceil((hi - lo) / 4)
  return Array.from({ length: 5 }, (_, i) => Math.floor(lo) + i * step)
}

const money = (v: number) => `₹${v.toFixed(1)}`
const since = (v: number, start: number) => {
  const d = (v / start - 1) * 100
  return `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(1)}%`
}

/** Monthly value of ₹100 invested at the start. Markers only at the end and the hovered month, as monthly lines would drown in dots. */
export function GrowthChart({ series, months, xLabel, ariaLabel, start = 100, height = 260, shade }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const all = series.flatMap((s) => s.values).concat(start)
  const ticks = ticksFor(Math.min(...all), Math.max(...all))
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const last = months.length - 1
  // The legend names the series, so end labels carry only the value and keep the plot wide.
  const endText = (v: number) => `₹${Math.round(v)}`
  const M = { ...MARGIN, r: 18 + 7 * Math.max(...series.map((s) => endText(s.values[last]).length)) }
  const w = Math.max(width, 260)
  const iw = w - M.l - M.r
  const ih = height - M.t - M.b
  const step = iw / Math.max(months.length - 1, 1)
  const xPos = (i: number) => M.l + i * step
  const yPos = (v: number) => M.t + ih - ((v - lo) / (hi - lo)) * ih
  const every = [6, 12, 24].find((n) => n * step >= 64) ?? 24
  const shadeEnd = shade ? months.indexOf(shade.until) : -1

  const ends = series
    .map((s) => ({ s, v: s.values[last], ty: yPos(s.values[last]) }))
    .sort((a, b) => a.ty - b.ty)
  for (let k = 1; k < ends.length; k++) {
    if (ends[k].ty - ends[k - 1].ty < 15) ends[k].ty = ends[k - 1].ty + 15
  }

  const pick = (clientX: number, el: Element) => {
    const x = clientX - el.getBoundingClientRect().left
    setHover(Math.max(0, Math.min(last, Math.round((x - M.l) / step))))
  }
  const swatch = (s: GrowthSeries) => (s.dashed ? `repeating-linear-gradient(90deg, ${s.color} 0 5px, transparent 5px 8px)` : s.color)

  return (
    <div className="chart" ref={ref}>
      <div className="legend">
        {series.map((s) => (
          <span key={s.id} className="key"><i style={{ background: swatch(s) }} />{s.label}</span>
        ))}
      </div>
      <svg width={w} height={height} role="img" aria-label={ariaLabel}>
        {shade && shadeEnd > 0 && (
          <g>
            <rect className="band" x={xPos(0)} y={M.t} width={xPos(shadeEnd) - xPos(0)} height={ih} />
            <text className="bandlabel" x={xPos(0) + 6} y={M.t + 14}>{shade.label}</text>
          </g>
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={M.l} x2={M.l + iw} y1={yPos(t)} y2={yPos(t)} />
            <text className="axis" x={M.l - 10} y={yPos(t)} textAnchor="end" dominantBaseline="middle">₹{t}</text>
          </g>
        ))}
        <line className="ref" x1={M.l} x2={M.l + iw} y1={yPos(start)} y2={yPos(start)} />
        {months.map((k, i) => (i % every === 0 || hover === i) && (
          <text key={k} className={hover === i ? 'axis on' : 'axis'} x={xPos(i)} y={height - 8} textAnchor="middle">{xLabel(k)}</text>
        ))}
        {hover != null && <line className="crosshair" x1={xPos(hover)} x2={xPos(hover)} y1={M.t} y2={M.t + ih} />}
        {series.map((s) => (
          <path key={s.id} d={s.values.map((v, i) => `${i ? 'L' : 'M'}${xPos(i)},${yPos(v)}`).join('')} fill="none" stroke={s.color} strokeWidth={2}
            strokeDasharray={s.dashed ? DASH : undefined} strokeLinejoin="round" strokeLinecap={s.dashed ? 'butt' : 'round'} />
        ))}
        {series.map((s) => [last, hover].filter((i): i is number => i != null).map((i) => (
          <circle key={s.id + i} cx={xPos(i)} cy={yPos(s.values[i])} r={hover === i ? 5.5 : 3.5} fill={s.color} stroke="var(--card)" strokeWidth={2} />
        )))}
        {ends.map((e) => (
          <text key={e.s.id} className="endlabel" x={xPos(last) + 10} y={e.ty} dominantBaseline="middle">{endText(e.v)}</text>
        ))}
        <rect x={M.l - step / 2} y={M.t} width={iw + step} height={ih} fill="transparent"
          onPointerMove={(ev) => pick(ev.clientX, ev.currentTarget.ownerSVGElement ?? ev.currentTarget)}
          onPointerDown={(ev) => pick(ev.clientX, ev.currentTarget.ownerSVGElement ?? ev.currentTarget)}
          onPointerLeave={() => setHover(null)} />
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: xPos(hover) > w / 2 ? xPos(hover) - 232 : xPos(hover) + 14, top: M.t }}>
          <strong>{xLabel(months[hover])}</strong>
          {shade && hover <= shadeEnd && <div className="tt-sub">{shade.label}</div>}
          {series.map((s) => (
            <div key={s.id} className="tt-row">
              <i style={{ background: s.color }} />
              <span className="tt-label">{s.short}</span>
              <span className="tt-val">{money(s.values[hover])}</span>
              {hover > 0 && <span className={s.values[hover] >= start ? 'tt-d up' : 'tt-d down'}>{since(s.values[hover], start)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
