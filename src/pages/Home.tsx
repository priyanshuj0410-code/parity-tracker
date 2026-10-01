import { Change } from '../components/Change'
import { ParityTrack } from '../components/ParityTrack'
import { Sparkline } from '../components/Sparkline'
import { MARKETS, type MarketStatus } from '../data/markets'
import { INDEX_ORDER, MARKET, companies, indexes, yoyChange, type Market } from '../lib/data'
import { pct } from '../lib/format'
import { href } from '../lib/router'

const STATUS: Record<MarketStatus, string> = { live: 'Live', planned: 'Planned', limited: 'Limited data' }
const PACE_INDEX: Record<string, string> = { IN: 'nifty50', GB: 'ftse100', AU: 'asx200', JP: 'nikkei225', EU: 'eurostoxx50' }

function Pace({ m }: { m: Market }) {
  const changes = Object.values(companies)
    .filter((c) => c.country === m.code)
    .map((c) => yoyChange(c))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  if (!changes.length) return null
  const median = changes[Math.floor(changes.length / 2)]
  const up = changes.filter((v) => v >= 0.0005).length
  const down = changes.filter((v) => v <= -0.0005).length
  const ix = indexes[PACE_INDEX[m.code]]
  const level = ix.years[m.latest].headline
  const years = median > 0 ? Math.round((m.parity - level) / median / 5) * 5 : null
  return (
    <p>
      <strong>{m.name}:</strong> {changes.length} companies can be compared like for like between {m.label(m.prev)} and {m.label(m.latest)}.
      {' '}{up} raised women's share of pay and {down} lowered it, a median change of <strong>{(median * 100).toFixed(1)} percentage points</strong>.
      {years != null && <> At that pace, a company at the {ix.name} level ({pct(level)}) would take about <strong>{years} years</strong> to reach {pct(m.parity, 0)}.</>}
    </p>
  )
}

export function Home() {
  return (
    <>
      <section>
        <h1>How much of the payroll you own <span className="accent">goes to women</span></h1>
        <p className="lead">
          Buy an index fund and you own a small slice of every company in it, including a slice of its wage bill.
          Parity Tracker shows how much of that wage bill is paid to women, using each company's own legally required filings.
        </p>
      </section>

      {Object.values(MARKET).map((m) => (
        <section key={m.code}>
          <h2>{m.name}</h2>
          <p className="small muted">{m.intro}</p>
          <div className="grid g3">
            {INDEX_ORDER.filter((id) => indexes[id].country === m.code).map((id) => {
              const ix = indexes[id]
              const y = ix.years[m.latest]
              const ch = ix.yoy[`${m.prev}>${m.latest}`]
              return (
                <a key={id} className="card" href={href('index', id)}>
                  <div className="tile-label">{ix.name} · {m.label(m.latest)}</div>
                  <div className="card-top">
                    <div className="tile-value">{pct(y.headline)}</div>
                    <Sparkline values={m.years.map((k) => ix.years[k]?.headline ?? null)} width={110} height={34} label={`${ix.name} trend`} />
                  </div>
                  <div className="tile-context">{m.prev
                    ? <><Change value={ch ? ch.change : null} /> <span className="muted">like for like since {m.label(m.prev)}</span></>
                    : <span className="muted">First snapshot</span>}</div>
                  <ParityTrack value={y.headline} parity={m.parity} />
                  <div className="tile-context muted">{y.companiesCovered} of {ix.constituents.length + ix.missing.length} companies covered</div>
                </a>
              )
            })}
          </div>
        </section>
      ))}

      <section>
        <h2>The pace of change</h2>
        <div className="callout">
          {Object.values(MARKET).map((m) => <Pace key={m.code} m={m} />)}
          <p className="small">One year of change is noisy, so read these as signals, not forecasts.</p>
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
