import { useState, type PointerEvent } from 'react'
import { BASIS, E_PARITY, W_PARITY, marketName, type Point } from '../lib/compare'
import { pct } from '../lib/format'
import { href } from '../lib/router'
import { useWidth } from '../lib/useWidth'
import { Logo } from './Logo'

const Y0 = 0.3
const Y1 = 1.5
const XT = [0, 0.25, 0.5, 0.75, 1]
const YT = [0.4, 0.6, 0.8, 1, 1.2, 1.4]

interface Props {
  points: Point[]
  on: (p: Point) => boolean
  label: string
  focus?: string
  height?: number
  compact?: boolean
}

export function ParityMap({ points, on, label, focus, height = 480, compact = false }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<Point | null>(null)
  const w = Math.max(width, 260)
  const narrow = !compact && w < 560
  const M = compact ? { t: 10, r: 12, b: 30, l: 40 } : narrow ? { t: 24, r: 10, b: 36, l: 40 } : { t: 14, r: 18, b: 50, l: 58 }
  const H = narrow ? Math.round(w * 1.05) : height
  const iw = w - M.l - M.r
  const ih = H - M.t - M.b
  const x = (v: number) => M.l + Math.min(Math.max(v, 0), 1) * iw
  const y = (v: number) => M.t + ih - ((Math.min(Math.max(v, Y0), Y1) - Y0) / (Y1 - Y0)) * ih
  const plotted = points.filter((p) => p.e != null && p.w != null)
  const lit = plotted.filter(on)
  const dim = plotted.filter((p) => !on(p))
  const outside = (p: Point) => (p.w as number) > Y1 || (p.w as number) < Y0
  const quad = { tl: 0, tr: 0, bl: 0, br: 0 }
  for (const p of lit) quad[`${(p.w as number) >= W_PARITY ? 't' : 'b'}${(p.e as number) >= E_PARITY ? 'r' : 'l'}` as keyof typeof quad]++
  const focused = focus ? plotted.find((p) => p.c.symbol === focus) : undefined
  const r = compact ? 3.25 : narrow ? 3 : 4.5

  const pick = (ev: PointerEvent<SVGRectElement>) => {
    const box = (ev.currentTarget.ownerSVGElement ?? ev.currentTarget).getBoundingClientRect()
    const px = ev.clientX - box.left
    const py = ev.clientY - box.top
    let best: Point | null = null
    let bd = 24 * 24
    for (const p of lit) {
      const d = (x(p.e as number) - px) ** 2 + (y(p.w as number) - py) ** 2
      if (d < bd) { bd = d; best = p }
    }
    setHover(best)
  }

  const hx = hover ? x(hover.e as number) : 0
  const hy = hover ? y(hover.w as number) : 0
  return (
    <div className={narrow ? 'chart map narrow' : 'chart map'} ref={ref}>
      <svg width={w} height={H} role="img"
        aria-label={`${label}: ${lit.length} companies. ${quad.tr} at or above parity on both measures, ${quad.bl} below on both, ${quad.tl} paid at parity with too few women, ${quad.br} with enough women paid less.`}>
        <rect className="quad-good" x={x(E_PARITY)} y={y(Y1)} width={x(1) - x(E_PARITY)} height={y(W_PARITY) - y(Y1)} />
        {XT.map((t) => (
          <g key={'x' + t}>
            <line className={t === 0 ? 'base-line' : 'grid-line'} x1={x(t)} x2={x(t)} y1={M.t} y2={M.t + ih} />
            <text className="axis" x={x(t)} y={M.t + ih + 16} textAnchor="middle">{pct(t, 0)}</text>
          </g>
        ))}
        {YT.map((t) => (
          <g key={'y' + t}>
            <line className="grid-line" x1={M.l} x2={M.l + iw} y1={y(t)} y2={y(t)} />
            <text className="axis" x={M.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{pct(t, 0)}</text>
          </g>
        ))}
        <line className="ref" x1={x(E_PARITY)} x2={x(E_PARITY)} y1={M.t} y2={M.t + ih} />
        <line className="ref" x1={M.l} x2={M.l + iw} y1={y(W_PARITY)} y2={y(W_PARITY)} />
        {!compact && !narrow && (
          <>
            <text className="axis-title" x={M.l + iw / 2} y={H - 8} textAnchor="middle">Employment parity: women's share of staff</text>
            <text className="axis-title" transform={`translate(14 ${M.t + ih / 2}) rotate(-90)`} textAnchor="middle">Wage parity: women's pay as a share of men's</text>
          </>
        )}
        {narrow && (
          <>
            <text className="axis-title" x={M.l + iw} y={H - 4} textAnchor="end">Women's share of staff →</text>
            <text className="axis-title" x={4} y={12}>↑ Women's pay as a share of men's</text>
          </>
        )}
        {dim.map((p) => <circle key={p.c.symbol} className="pt-dim" cx={x(p.e as number)} cy={y(p.w as number)} r={r - 0.75} />)}
        {lit.map((p) => (
          <circle key={p.c.symbol} className={outside(p) ? 'pt out' : 'pt'} cx={x(p.e as number)} cy={y(p.w as number)} r={hover === p ? r + 2 : r} />
        ))}
        {!compact && !narrow && (
          <g>
            <text className="quad" x={x(1) - 8} y={M.t + 28} textAnchor="end">Parity on both · {quad.tr}</text>
            <text className="quad" x={M.l + 8} y={M.t + 28}>Paid at parity, too few women · {quad.tl}</text>
            <text className="quad" x={M.l + 8} y={M.t + ih - 10}>Too few women, paid less · {quad.bl}</text>
            <text className="quad" x={x(1) - 8} y={M.t + ih - 10} textAnchor="end">Enough women, paid less · {quad.br}</text>
          </g>
        )}
        {focused && (
          <g>
            <circle className="pt-focus" cx={x(focused.e as number)} cy={y(focused.w as number)} r={r + 5} />
            <text className="pt-label" x={x(focused.e as number) + (x(focused.e as number) > w * 0.7 ? -12 : 12)} y={y(focused.w as number) - 10}
              textAnchor={x(focused.e as number) > w * 0.7 ? 'end' : 'start'}>{focused.c.name}</text>
          </g>
        )}
        <rect x={M.l} y={M.t} width={iw} height={ih} fill="transparent" style={{ cursor: hover ? 'pointer' : 'default' }}
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}
          onClick={() => { if (hover) window.location.hash = href('company', hover.c.symbol) }} />
      </svg>
      {narrow && (
        <div className="quad-key" aria-hidden="true">
          <span>Equal pay, few women<b>{quad.tl}</b></span>
          <span className="good">Parity on both<b>{quad.tr}</b></span>
          <span>Paid less, few women<b>{quad.bl}</b></span>
          <span>Paid less, more women<b>{quad.br}</b></span>
        </div>
      )}
      {hover && (
        <div className="tooltip map-tip" style={{ left: Math.max(0, Math.min(w - 240, hx > w / 2 ? hx - 252 : hx + 14)), top: Math.max(0, Math.min(hy - 40, H - 170)) }}>
          <div className="tt-head"><Logo symbol={hover.c.symbol} name={hover.c.name} size={24} /><strong>{hover.c.name}</strong></div>
          <div className="tt-sub">{marketName(hover.c.country)} · {hover.sector}</div>
          <div className="tt-row"><span className="tt-label">Women's share of {BASIS[hover.c.country].employment}</span><span className="tt-val">{pct(hover.e)}</span></div>
          <div className="tt-row"><span className="tt-label">Women's pay per 100 of men's</span><span className="tt-val">{pct(hover.w)}{BASIS[hover.c.country].approx ? ' approx.' : ''}</span></div>
          <div className="tt-row"><span className="tt-label">Implied share of pay</span><span className="tt-val">{pct(hover.s)}</span></div>
          <div className="tt-sub">Click to open</div>
        </div>
      )}
    </div>
  )
}
