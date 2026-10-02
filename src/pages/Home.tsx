import { Change } from '../components/Change'
import { DataTable } from '../components/DataTable'
import { ParityTrack } from '../components/ParityTrack'
import { Sparkline } from '../components/Sparkline'
import { MARKETS, type MarketStatus } from '../data/markets'
import { INDEX_ORDER, MARKET, companies, indexes, simulations, yoyChange, type Market } from '../lib/data'
import { pct } from '../lib/format'
import { href, usePageTitle } from '../lib/router'

const STATUS: Record<MarketStatus, string> = { live: 'Live', planned: 'Planned', limited: 'Limited data' }
const PACE_INDEX: Record<string, string> = { IN: 'nifty50', GB: 'ftse100', AU: 'asx200', JP: 'nikkei225', EU: 'eurostoxx50' }

interface PaceRow { m: Market; n: number; up: number; down: number; median: number; years: number | null }

function pace(m: Market): PaceRow | null {
  const changes = Object.values(companies)
    .filter((c) => c.country === m.code)
    .map((c) => yoyChange(c))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  if (!changes.length) return null
  const median = changes[Math.floor(changes.length / 2)]
  const level = indexes[PACE_INDEX[m.code]].years[m.latest].headline
  return {
    m, n: changes.length, median,
    up: changes.filter((v) => v >= 0.0005).length,
    down: changes.filter((v) => v <= -0.0005).length,
    years: median > 0 ? Math.round((m.parity - level) / median / 5) * 5 : null,
  }
}

export function Home() {
  usePageTitle('')
  return (
    <>
      <section>
        <h1>How much of the payroll you own <span className="accent">goes to women</span></h1>
        <p className="lead">
          Buy an index fund and you own a small slice of every company in it, including a slice of its wage bill.
          Nivel shows how much of that wage bill is paid to women, using each company's own legally required filings.
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
                    ? <><Change value={ch ? ch.change : null} /> <span className="muted">since {m.label(m.prev)}, same companies</span></>
                    : <span className="muted">First snapshot</span>}</div>
                  <ParityTrack value={y.headline} parity={m.parity} />
                  <div className="tile-context muted">{y.companiesCovered} of {ix.constituents.length + ix.missing.length} companies covered</div>
                </a>
              )
            })}
            {Object.values(simulations).filter((s) => indexes[s.parent]?.country === m.code).map((s) => (
              <a key={s.id} className="card sim-card" href={href('simulation', s.id)}>
                <div className="tile-label">{s.name} · {m.label(s.dataYear)} <span className="badge sim">Simulation</span></div>
                <div className="tile-value">{pct(s.headline.payroll)}</div>
                <div className="tile-context"><Change value={s.headline.payroll - s.headline.parentPayroll} /> <span className="muted">against the {indexes[s.parent].name}</span></div>
                <ParityTrack value={s.headline.payroll} parity={m.parity} />
                <div className="tile-context muted">Every holding pays women at least the {indexes[s.parent].name}'s share. Fictional.</div>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2>Compare across markets</h2>
        <p className="small muted">Each market measures pay differently, so we also put every company on two shared scales: women's share of staff, and women's pay as a share of men's.</p>
        <div className="grid g3">
          {[
            { tab: 'countries', title: 'Countries', text: 'Median company in each market, side by side, with every index on the same scales.' },
            { tab: 'sectors', title: 'Sectors', text: 'Eleven shared sectors, from banks to miners, compared within and across markets.' },
            { tab: 'map', title: 'Parity map', text: 'Every company plotted by how many women it employs and how it pays them.' },
          ].map((t) => (
            <a key={t.tab} className="card link-card" href={href('compare', t.tab)}>
              <h3>{t.title}</h3>
              <p className="small">{t.text}</p>
              <span className="link-more">Open</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2>The pace of change</h2>
        <DataTable caption="The pace of change by market" bare rows={Object.values(MARKET).map(pace).filter((r): r is PaceRow => r !== null)} rowKey={(r) => r.m.code}
          initial={{ key: 'market', dir: 1 }} columns={[
            { key: 'market', label: 'Market', render: (r) => <strong>{r.m.name}</strong>, sort: (r) => Object.keys(MARKET).indexOf(r.m.code) },
            { key: 'median', label: 'Median change', right: true, mobile: 'value', render: (r) => <Change value={r.median} /> },
            { key: 'n', label: 'Compared like for like', right: true, render: (r) => `${r.n} companies, ${r.m.label(r.m.prev)} to ${r.m.label(r.m.latest)}` },
            { key: 'split', label: 'Rose / fell', right: true, render: (r) => `${r.up} / ${r.down}` },
            { key: 'years', label: 'Years to parity at this pace', right: true, render: (r) => (r.years == null ? 'not on track' : `about ${r.years}`) },
          ]} />
        <p className="small muted" style={{ marginTop: 10 }}>Like for like means the same companies in both years. Years to parity is how long a company at its index's level would take to reach 50% at the median pace. One year of change is noisy, so read these as signals, not forecasts.</p>
      </section>

      <section>
        <h2>Markets</h2>
        <p className="small">We only publish comparable numbers where the law makes companies disclose them. Where it does not, we say so.</p>
        <DataTable caption="Market coverage" bare rows={MARKETS} rowKey={(m) => m.market} initial={{ key: 'market', dir: 1 }} columns={[
          { key: 'market', label: 'Market', render: (m) => <strong>{m.market}</strong> },
          { key: 'status', label: 'Status', mobile: 'value', render: (m) => <span className={`status ${m.status}`}>{STATUS[m.status]}</span> },
          { key: 'source', label: 'Source', wide: true, render: (m) => m.source },
          { key: 'required', label: 'What companies must disclose', wide: true, render: (m) => m.required },
          { key: 'indexes', label: 'Indexes', wide: true, render: (m) => m.indexes },
        ]} />
      </section>

      <section>
        <h2>How to read this</h2>
        <ul className="tight">
          <li><strong>The headline</strong> is the share of the payroll an index investor owns that is paid to women. Parity is 50%.</li>
          <li><strong>Like for like</strong> changes only compare companies that reported in both years on the same basis.</li>
          <li><strong>Every number links back</strong> to the company's filing. Estimated or rescaled values carry a badge.</li>
        </ul>
        <p><a className="go" href={href('method')}>Method and limitations</a></p>
      </section>
    </>
  )
}
