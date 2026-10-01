import { MARKET } from '../lib/data'
import { pct } from '../lib/format'
import type { Company } from '../types'
import { Change } from './Change'
import { DataBadge } from './Badge'
import { ParityTrack } from './ParityTrack'

export function EuDetail({ c }: { c: Company }) {
  const m = MARKET.EU
  const key = c.years[m.latest] ? m.latest : m.prev
  const y = c.years[key]
  const p = key === m.latest ? c.years[m.prev] : undefined
  const source = c.entities?.[0]
  return (
    <>
      <section>
        <h2>{key} at a glance</h2>
        <div className="grid g3">
          <div className="card">
            <div className="tile-label">Women's average pay as a share of men's</div>
            <div className="tile-value">{pct(y.w)}</div>
            <div className="tile-context"><DataBadge year={y} /> <Change hideMissing value={p?.w != null && y.w != null ? y.w - p.w : null} /></div>
            {y.w != null && <ParityTrack value={y.w} parity={1} />}
          </div>
          <div className="card">
            <div className="tile-label">Unadjusted gender pay gap</div>
            <div className="tile-value">{pct(y.gapMean)}</div>
            <div className="tile-context muted">{p?.gapMean != null ? `${pct(p.gapMean)} in ${m.prev}` : key === m.prev ? `Latest verified year is ${m.prev}` : 'First verified year'}</div>
          </div>
          <div className="card">
            <div className="tile-label">How the company measures it</div>
            <div className="tile-context">{source?.size}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>About this data</h2>
        <ul className="tight">
          <li><strong>Source:</strong> the company's own CSRD sustainability statement (ESRS S1-16), read directly from the document. {source?.link && /^https?:\/\//.test(source.link) && <a href={source.link} target="_blank" rel="noreferrer">Source document</a>}</li>
          <li><strong>Positive gap:</strong> men earn more on average. A negative gap means women's average pay is higher, usually because of the mix of jobs.</li>
        </ul>
      </section>
    </>
  )
}
