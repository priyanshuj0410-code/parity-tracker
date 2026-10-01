import { pct } from '../lib/format'
import type { Sector } from '../types'

export function SectorBars({ sectors }: { sectors: Sector[] }) {
  const top = Math.max(0.5, Math.ceil(Math.max(...sectors.map((s) => s.w)) * 10) / 10)
  const at = (v: number) => `${(v / top) * 100}%`
  return (
    <div className="bars" role="list" aria-label="Women's share of pay by sector">
      {sectors.map((s) => (
        <div className="bar-row" role="listitem" key={s.industry}
          title={`${s.industry}: ${pct(s.w)} of pay to women${s.payrollShare == null ? '' : ` · ${pct(s.payrollShare)} of the payroll you own`} · ${s.companies} ${s.companies === 1 ? 'company' : 'companies'}`}>
          <div className="name">{s.industry}<small>{s.payrollShare == null ? '' : `${s.payrollShare < 0.01 ? 'under 1%' : pct(s.payrollShare, 0)} of payroll · `}{s.companies} {s.companies === 1 ? 'company' : 'companies'}</small></div>
          <div className="bar-track">
            <div className="bar" style={{ width: at(s.w) }} />
            <div className="parity-mark" style={{ left: at(0.5) }} />
            <div className="bar-val" style={{ left: at(s.w) }}>{pct(s.w)}</div>
          </div>
        </div>
      ))}
      <div className="bar-scale" aria-hidden="true">
        <span />
        <div>
          <span>0%</span>
          <span className="parity-label" style={{ left: at(0.5) }}>50% parity</span>
          {top > 0.5 && <span>{pct(top, 0)}</span>}
        </div>
      </div>
    </div>
  )
}
