import { Change } from '../components/Change'
import { ParityTrack } from '../components/ParityTrack'
import { MARKETS, type MarketStatus } from '../data/markets'
import { INDEX_ORDER, LATEST, PREV, companies, indexes, yoyChange } from '../lib/data'
import { fy, pct } from '../lib/format'
import { href } from '../lib/router'

const STATUS: Record<MarketStatus, string> = { live: 'Live', planned: 'Planned', limited: 'Limited data' }

export function Home() {
  const changes = Object.values(companies)
    .map((c) => yoyChange(c))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  const median = changes[Math.floor(changes.length / 2)]
  const up = changes.filter((v) => v >= 0.0005).length
  const down = changes.filter((v) => v <= -0.0005).length
  const n50 = indexes.nifty50.years[LATEST]
  const years = median > 0 ? Math.round((0.5 - n50.headline) / median / 5) * 5 : null

  return (
    <>
      <section>
        <h1>How much of the payroll you own <span className="accent">goes to women</span></h1>
        <p className="lead">
          Buy an index fund and you own a small slice of every company in it, including a slice of its wage bill.
          Parity Tracker shows how much of that wage bill is paid to women, using each company's own legally required filings.
        </p>
      </section>

      <section>
        <h2>Indexes</h2>
        <div className="grid g3">
          {INDEX_ORDER.map((id) => {
            const ix = indexes[id]
            const y = ix.years[LATEST]
            const ch = ix.yoy[`${PREV}>${LATEST}`]
            return (
              <a key={id} className="card" href={href('index', id)}>
                <div className="tile-label">{ix.name} · {fy(LATEST)}</div>
                <div className="tile-value">{pct(y.headline)}</div>
                <div className="tile-context"><Change value={ch ? ch.change : null} /> <span className="muted">like for like since {fy(PREV)}</span></div>
                <ParityTrack value={y.headline} />
                <div className="tile-context muted">{y.companiesCovered} of {ix.constituents.length + ix.missing.length} companies covered</div>
              </a>
            )
          })}
        </div>
      </section>

      <section>
        <h2>The pace of change</h2>
        <div className="callout">
          <p>
            <strong>{changes.length} companies</strong> can be compared like for like between {fy(PREV)} and {fy(LATEST)}.
            {' '}{up} raised women's share of wages and {down} lowered it. The median change was <strong>{(median * 100).toFixed(1)} percentage points</strong>.
          </p>
          {years && (
            <p>
              At that pace, a company at the Nifty 50 level ({pct(n50.headline)}) would take about <strong>{years} years</strong> to reach 50%.
              This is one year of change, so read it as a signal, not a forecast.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2>Markets</h2>
        <p className="small">We only publish comparable numbers where the law makes companies disclose them. Where it does not, we say so.</p>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Market coverage</caption>
            <thead>
              <tr><th>Market</th><th>Status</th><th>Source</th><th>What companies must disclose</th><th>Indexes</th></tr>
            </thead>
            <tbody>
              {MARKETS.map((m) => (
                <tr key={m.market}>
                  <td><strong>{m.market}</strong></td>
                  <td><span className={`status ${m.status}`}>{STATUS[m.status]}</span></td>
                  <td>{m.source}</td>
                  <td>{m.required}</td>
                  <td>{m.indexes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>How to read this</h2>
        <ul className="tight">
          <li><strong>The headline</strong> is the share of the payroll an index investor owns that is paid to women. Parity is 50%.</li>
          <li><strong>Like for like</strong> changes only compare companies that reported in both years on the same basis.</li>
          <li><strong>Every number links back</strong> to the company's filing. Estimated or rescaled values carry a badge.</li>
        </ul>
        <p><a href={href('method')}>Method and limitations</a></p>
      </section>
    </>
  )
}
