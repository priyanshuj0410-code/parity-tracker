import { pct } from '../lib/format'
import type { Sector } from '../types'

export function SectorBars({ sectors }: { sectors: Sector[] }) {
  return (
    <div className="bars" role="list" aria-label="Women's share of wages by sector">
      {sectors.map((s) => (
        <div className="bar-row" role="listitem" key={s.industry}
          title={`${s.industry}: ${pct(s.w)} of wages to women · ${pct(s.payrollShare)} of the payroll you own · ${s.companies} ${s.companies === 1 ? 'company' : 'companies'}`}>
          <div className="name">{s.industry}<small>{s.payrollShare < 0.01 ? 'under 1%' : pct(s.payrollShare, 0)} of payroll · {s.companies} {s.companies === 1 ? 'company' : 'companies'}</small></div>
          <div className="bar-track">
            <div className="bar" style={{ width: `${(s.w / 0.5) * 100}%` }} />
            <div className="bar-val" style={{ left: `${(s.w / 0.5) * 100}%` }}>{pct(s.w)}</div>
          </div>
        </div>
      ))}
      <div className="bar-scale" aria-hidden="true"><span /><div><span>0%</span><span>50% parity</span></div></div>
    </div>
  )
}
