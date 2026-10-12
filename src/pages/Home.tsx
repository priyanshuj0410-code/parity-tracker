import { Change } from '../components/Change'
import { DataTable } from '../components/DataTable'
import { ParityTrack } from '../components/ParityTrack'
import { Sparkline } from '../components/Sparkline'
import { TableSkeleton } from '../components/Skeleton'
import { INDEX_ORDER, MARKET, MARKETS, companies, indexes, isGroup, publishedChange, simulations, useLoaded, useStage, yoyChange, type Market, type MarketRecord, type MarketStatus } from '../lib/data'
import { pct } from '../lib/format'
import { href, usePageTitle } from '../lib/router'
import type { IndexData, Yoy } from '../types'

const STATUS: Record<MarketStatus, string> = { live: 'Live', planned: 'Planned', limited: 'Limited data' }

/** The live market's indexes as shown above; a market without them keeps its own list. */
const marketIndexes = (m: MarketRecord): string =>
  MARKET[m.code] ? MARKET[m.code].indexes.map((id) => indexes[id].name).join(', ') : m.reporting.indexes ?? ''

/** A market's group (India's All BRSR filers), when it shows one. */
const groupOf = (m: Market): IndexData | undefined => m.indexes.map((id) => indexes[id]).find(isGroup)

const count = (n: number) => n.toLocaleString('en-IN')
const members = (ix: IndexData) => ix.constituents.length + ix.missing.filter((s) => !ix.left?.includes(s)).length
const pp = (v: number) => { const r = Math.round(v * 1000) / 10; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}` }

/** What follows a card's change: the base year, then the group's range, which may not tell the change from zero. */
function since(prev: string, ch?: Yoy): string {
  if (!ch?.interval) return `since ${prev}, same companies`
  const range = `since ${prev}, range ${pp(ch.interval[0])} to ${pp(ch.interval[1])} pp`
  return ch.distinguishable === false ? `${range}, not distinguishable from zero` : range
}

interface PaceRow { m: Market; n: number; up: number; down: number; median: number; years: number | null }

function pace(m: Market): PaceRow | null {
  const changes = Object.values(companies)
    .filter((c) => c.country === m.code)
    .map((c) => yoyChange(c))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  if (!changes.length) return null
  const median = changes[Math.floor(changes.length / 2)]
  const level = (groupOf(m) ?? indexes[m.flagship]).years[m.latest].headline
  return {
    m, n: changes.length, median,
    up: changes.filter((v) => v >= 0.0005).length,
    down: changes.filter((v) => v <= -0.0005).length,
    years: median > 0 ? Math.round((m.parity - level) / median / 5) * 5 : null,
  }
}

export function Home() {
  useStage('core')
  const ready = useLoaded('companies')
  usePageTitle('')
  const groups = INDEX_ORDER.map((id) => indexes[id]).filter(isGroup)
  const paced = Object.values(MARKET).flatMap((m) => { const g = groupOf(m); return g ? [`${m.name}: ${g.name}`] : [] })
  return (
    <>
      <section>
        <h1>How much of the payroll you own <span className="accent">goes to women</span></h1>
        <p className="lead">An index fund owns a slice of every company's wage bill. Nivel shows how much of it goes to women, from the companies' own filings.</p>
      </section>

      {Object.values(MARKET).map((m) => (
        <section key={m.code}>
          <h2>{m.name}</h2>
          <p className="small muted">{m.intro}</p>
          <div className="grid g3">
            {INDEX_ORDER.filter((id) => indexes[id].country === m.code).map((id) => {
              const ix = indexes[id]
              const y = ix.years[m.latest]
              const key = `${m.prev}>${m.latest}`
              const ch = publishedChange(ix, key)
              return (
                <a key={id} className="card" href={href('index', id)}>
                  <div className="tile-label">{ix.name} · {m.label(m.latest)}</div>
                  <div className="card-top">
                    <div className="tile-value">{pct(y.headline)}</div>
                    <Sparkline values={m.years.map((k) => ix.years[k]?.headline ?? null)} width={110} height={34} label={`${ix.name} trend`} />
                  </div>
                  <div className="tile-context">{!m.prev
                    ? <span className="muted">First snapshot</span>
                    : ix.yoy[key]?.shown === false
                      ? <span className="chg flat">Level only</span>
                      : <><Change value={ch ? ch.change : null} /> <span className="muted">{since(m.label(m.prev), ch)}</span></>}</div>
                  <ParityTrack value={y.headline} parity={m.parity} />
                  <div className="tile-context muted">{isGroup(ix) && y.staffWithPayrollShare != null
                    ? `${pct(y.staffWithPayrollShare, 0)} of staff with known payroll`
                    : `${count(y.companiesCovered)} of ${count(members(ix))} companies covered`}</div>
                </a>
              )
            })}
            {Object.values(simulations).filter((s) => indexes[s.parent]?.country === m.code).map((s) => (
              <a key={s.id} className="card sim-card" href={href('simulation', s.id)}>
                <div className="tile-label">{s.name} · {m.label(s.dataYear)} <span className="badge sim">Simulation</span></div>
                <div className="tile-value">{pct(s.headline.payroll)}</div>
                <div className="tile-context"><Change value={s.headline.payroll - s.headline.parentPayroll} /> <span className="muted">against the {indexes[s.parent].name}</span></div>
                <ParityTrack value={s.headline.payroll} parity={m.parity} />
                <div className="tile-context muted">Fictional. Every company beats the {indexes[s.parent].name}.</div>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2>Compare across markets</h2>
        <p className="small muted">Two shared scales: women's share of staff, and women's pay as a share of men's.</p>
        <div className="grid g3">
          {[
            { tab: 'countries', title: 'Countries', text: 'Every market and index on the same scales.' },
            { tab: 'sectors', title: 'Sectors', text: '11 sectors, from banks to miners, across markets.' },
            { tab: 'map', title: 'Parity map', text: 'Every company by how many women it employs and how it pays them.' },
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
        {!ready ? <TableSkeleton rows={5} label="Loading the pace of change" /> : <DataTable caption="The pace of change by market" bare rows={Object.values(MARKET).map(pace).filter((r): r is PaceRow => r !== null)} rowKey={(r) => r.m.code}
          initial={{ key: 'market', dir: 1 }} columns={[
            { key: 'market', label: 'Market', render: (r) => <strong>{r.m.name}</strong>, sort: (r) => Object.keys(MARKET).indexOf(r.m.code) },
            { key: 'median', label: 'Median change', right: true, mobile: 'value', render: (r) => <Change value={r.median} /> },
            { key: 'n', label: 'Compared like for like', right: true, render: (r) => `${count(r.n)} companies, ${r.m.label(r.m.prev)} to ${r.m.label(r.m.latest)}` },
            { key: 'split', label: 'Rose / fell', right: true, render: (r) => `${r.up} / ${r.down}` },
            { key: 'years', label: 'Years to parity at this pace', right: true, render: (r) => (r.years == null ? 'not on track' : `about ${r.years}`) },
          ]} />}
        <p className="small muted" style={{ marginTop: 10 }}>Like for like: the same companies in both years. Years to parity: time for an index to reach 50% at the median pace{paced.length ? ` (${paced.join('; ')})` : ''}.</p>
      </section>

      <section>
        <h2>Markets</h2>
        <p className="small">Only where the law requires disclosure.</p>
        <DataTable caption="Market coverage" bare rows={MARKETS} rowKey={(m) => m.code} initial={{ key: 'market', dir: 1 }} columns={[
          { key: 'market', label: 'Market', render: (m) => <strong>{m.name}</strong> },
          { key: 'status', label: 'Status', mobile: 'value', render: (m) => <span className={`status ${m.status}`}>{STATUS[m.status]}</span> },
          { key: 'source', label: 'Source', wide: true, render: (m) => m.reporting.source },
          { key: 'required', label: 'What companies must disclose', wide: true, render: (m) => m.reporting.required },
          { key: 'indexes', label: 'Indexes', wide: true, render: (m) => marketIndexes(m) },
        ]} />
      </section>

      <section>
        <h2>How to read this</h2>
        <ul className="tight">
          <li><strong>Headline:</strong> women's share of the payroll you own{groups.length ? `; for ${groups.map((g) => g.name).join(', ')}, of all their payroll` : ''}. Parity is 50%.</li>
          <li><strong>Like for like:</strong> only companies that reported in both years on the same basis.</li>
          <li><strong>Sources:</strong> every number links to its filing. Estimates carry a badge.</li>
        </ul>
        <p><a className="go" href={href('method')}>Method</a></p>
      </section>
    </>
  )
}
