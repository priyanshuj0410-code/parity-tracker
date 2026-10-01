import type { ReactNode } from 'react'
import type { Summary } from '../lib/compare'
import { pct } from '../lib/format'

export interface RangeRow { key: string; label: ReactNode; sub?: string; s: Summary | null; href?: string }

export function RangeDots({ rows, parity, max, label, min = 3 }: { rows: RangeRow[]; parity: number; max: number; label: string; min?: number }) {
  const at = (v: number) => (Math.min(Math.max(v, 0), max) / max) * 100
  return (
    <div className="ranges" role="list" aria-label={label}>
      {rows.map((r) => {
        const ok = r.s != null && r.s.n >= min
        return (
          <div className={ok ? 'range-row' : 'range-row thin'} role="listitem" key={r.key}
            title={r.s ? `median ${pct(r.s.median)}, middle half ${pct(r.s.q1)} to ${pct(r.s.q3)}, ${r.s.n} companies` : 'no data'}>
            <div className="name">{r.href ? <a href={r.href}>{r.label}</a> : r.label}<small>{r.sub ?? (r.s ? `${r.s.n} ${r.s.n === 1 ? 'company' : 'companies'}` : 'no data')}</small></div>
            <div className="range-track">
              <div className="parity-mark" style={{ left: `${at(parity)}%` }} />
              {ok && r.s && (
                <>
                  <div className="iqr" style={{ left: `${at(r.s.q1)}%`, width: `${Math.max(at(r.s.q3) - at(r.s.q1), 0.6)}%` }} />
                  <div className="dot" style={{ left: `${at(r.s.median)}%` }} />
                </>
              )}
            </div>
            <div className="range-val">{ok && r.s ? pct(r.s.median) : <span className="muted">{r.s ? 'too few' : 'n/a'}</span>}</div>
          </div>
        )
      })}
      <div className="range-scale" aria-hidden="true">
        <span />
        <div>
          <span style={{ left: 0 }}>0%</span>
          <span className="parity-label" style={{ left: `${at(parity)}%` }}>{pct(parity, 0)} parity</span>
          {max > parity * 1.15 && <span style={{ right: 0 }}>{pct(max, 0)}</span>}
        </div>
        <span />
      </div>
      <div className="range-key" aria-hidden="true"><span className="key"><i className="k-dot" />Median company</span><span className="key"><i className="k-iqr" />Middle half of companies</span><span className="key"><i className="k-par" />Parity</span></div>
    </div>
  )
}
