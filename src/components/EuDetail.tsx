import { MARKET, euYear } from '../lib/data'
import { pct } from '../lib/format'
import type { Company } from '../types'
import { Change } from './Change'
import { DataBadge } from './Badge'
import { ParityTrack } from './ParityTrack'

export function EuGlance({ c }: { c: Company }) {
  const m = MARKET.EU
  const key = euYear(c)
  const y = c.years[key]
  const p = key === m.latest ? c.years[m.prev] : undefined
  const source = c.entities?.[0]
  return (
        <div className="grid g4 tiles">
          <div className="card">
            <div className="tile-label">Women's share of pay</div>
            <div className="tile-value">{pct(y.w)}</div>
            <div className="tile-context"><DataBadge year={y} quiet /> <Change hideMissing value={p?.w != null && y.w != null ? y.w - p.w : null} /></div>
            {y.w != null && <ParityTrack value={y.w} parity={0.5} />}
          </div>
          <div className="card">
            <div className="tile-label">Unadjusted gender pay gap</div>
            <div className="tile-value">{pct(y.gapMean)}</div>
            <div className="tile-context muted">Women earn €{y.gapMean == null ? 'n/a' : Math.round((1 - y.gapMean) * 100)} per €100 of men's. {p?.gapMean != null ? `${pct(p.gapMean)} in ${m.prev}.` : key === m.prev ? `Latest verified year is ${m.prev}.` : 'First verified year.'}</div>
          </div>
          <div className="card">
            <div className="tile-label">Women in workforce</div>
            <div className="tile-value">{pct(y.fAll)}</div>
            <div className="tile-context muted">{y.headcountWomen != null && y.headcountMen != null ? `${y.headcountWomen.toLocaleString('en-GB')} women, ${y.headcountMen.toLocaleString('en-GB')} men` : y.fAll != null ? 'Share as reported' : 'Not located in the statement'}</div>
          </div>
          <div className="card">
            <div className="tile-label">How the company measures pay</div>
            <div className="tile-context">{source?.size}</div>
          </div>
        </div>
  )
}

export function EuSources({ c }: { c: Company }) {
  const source = c.entities?.[0]
  return (
        <ul className="tight">
          <li><strong>Source:</strong> the company's own CSRD sustainability statement: the pay gap from ESRS S1-16 and headcount by gender from S1-6, read directly from the document. {source?.link && /^https?:\/\//.test(source.link) && <a href={source.link} target="_blank" rel="noreferrer">Source document</a>}</li>
          <li><strong>Positive gap:</strong> men earn more on average. A negative gap means women's average pay is higher, usually because of the mix of jobs.</li>
          <li><strong>Workforce split:</strong> women's share counts women and men only; employees recorded as other or not disclosed are left out.</li>
        </ul>
  )
}
