import { Change } from '../components/Change'
import { ChartFrame } from '../components/ChartFrame'
import { DataTable, type Column } from '../components/DataTable'
import { GrowthChart } from '../components/GrowthChart'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { ParityTrack } from '../components/ParityTrack'
import { MARKET, companies, indexes, simulations } from '../lib/data'
import { pct } from '../lib/format'
import { href, usePageTitle } from '../lib/router'
import type { SimHolding, SimLeft, Simulation } from '../types'
import { NotFound } from './NotFound'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

const monthLabel = (k: string) => `${MONTHS[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(0, 4)}`
const longDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`
const nameOf = (s: string) => companies[s]?.name ?? s
const short = (s: string) => nameOf(s).replace(/\s+(Ltd\.?|Limited)$/i, '')
const ret = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(1)}%`
const points = (v: number) => Math.abs(v * 100).toFixed(1)
const listOf = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const nameCell = (symbol: string, sub: string) => (
  <span className="name-cell"><Logo symbol={symbol} name={nameOf(symbol)} /><a href={href('company', symbol)}>{nameOf(symbol)}<span className="sub">{sub}</span></a></span>
)

/** Each sector's share of the simulation as a bar, with the real index's share as a tick, so a sector that drops out still shows where it was. */
function SectorMix({ sim, parentName }: { sim: Simulation; parentName: string }) {
  const top = Math.ceil(Math.max(...sim.sectors.flatMap((s) => [s.sim, s.parent])) * 10) / 10
  const at = (v: number) => `${(v / top) * 100}%`
  return (
    <div className="bars wide-names" role="list" aria-label={`Share of the ${sim.name} and the ${parentName} in each sector`}>
      {sim.sectors.map((s) => (
        <div className="bar-row" role="listitem" key={s.sector} title={`${s.sector}: ${pct(s.sim)} of the ${sim.name}, ${pct(s.parent)} of the ${parentName}`}>
          <div className="name">{s.sector}<small>{s.sim === 0 ? `none held · ${parentName} ${pct(s.parent, 0)}` : s.parent === 0 ? `none in the ${parentName}` : `${parentName} ${pct(s.parent, 0)}`}</small></div>
          <div className="bar-track">
            {s.sim > 0 && <div className="bar" style={{ width: at(s.sim) }} />}
            {s.parent > 0 && <div className="ref-mark" style={{ left: at(s.parent) }} />}
            <div className="bar-val" style={{ left: at(Math.max(s.sim, s.parent)) }}>{pct(s.sim, 0)}</div>
          </div>
        </div>
      ))}
      <div className="bar-scale" aria-hidden="true"><span /><div><span>0%</span><span>{pct(top, 0)}</span></div></div>
      <div className="keys">
        <span className="key"><i style={{ background: 'var(--s1)' }} />{sim.name}</span>
        <span className="key"><i className="tick" />{parentName}</span>
      </div>
    </div>
  )
}

export function SimulationPage({ id }: { id: string }) {
  const sim = simulations[id]
  usePageTitle(sim ? `${sim.name}, a simulation` : 'Page not found')
  if (!sim) return <NotFound />
  const parent = indexes[sim.parent]
  const m = MARKET[parent.country]
  const fy = m.label(sim.dataYear)
  const h = sim.headline
  const p = sim.performance
  const st = p.stats
  const first = p.months[0]
  const last = p.months[p.months.length - 1]
  const five = p.five
  const bfill = p.backfill
  const etf = p.etfStats
  const backfilled = (k: string) => k <= p.backfillUntil && k !== p.months[0]
  const biggest = sim.left[0]
  const outSectors = sim.out.sectors

  const held: Column<SimHolding>[] = [
    { key: 'name', label: 'Company', render: (c) => nameCell(c.symbol, c.parent > 0 ? `${c.sector} · in the ${parent.name}` : c.sector), sort: (c) => nameOf(c.symbol), csv: (c) => nameOf(c.symbol) },
    { key: 'w', label: `${m.wageLabel} ${fy}`, short: 'Share of pay', mobile: 'second', phone: (c) => <span className="muted">{pct(c.w)} of pay to women</span>, render: (c) => <Meter value={c.w} parity={m.parity} />, sort: (c) => c.w, csv: (c) => c.w },
    { key: 'e', label: 'Women in permanent staff', priority: 2, right: true, render: (c) => pct(c.e), sort: (c) => c.e, csv: (c) => c.e },
    { key: 'sim', label: `Weight in the ${sim.name}`, short: 'Weight', right: true, mobile: 'value', render: (c) => pct(c.sim), sort: (c) => c.sim, csv: (c) => c.sim },
  ]
  const left: Column<SimLeft>[] = [
    { key: 'name', label: 'Company', render: (c) => nameCell(c.symbol, c.sector), sort: (c) => nameOf(c.symbol), csv: (c) => nameOf(c.symbol) },
    {
      key: 'w', label: `${m.wageLabel} ${fy}`, short: 'Share of pay', mobile: 'second',
      phone: (c) => <span className="muted">{c.w == null ? 'no usable figures' : `${pct(c.w)} of pay to women`}</span>,
      render: (c) => (c.w == null ? <span className="muted">no usable figures</span> : <Meter value={c.w} parity={m.parity} />), sort: (c) => c.w, csv: (c) => c.w,
    },
    { key: 'parent', label: `Weight in the ${parent.name}`, short: 'Weight', right: true, mobile: 'value', render: (c) => pct(c.parent), sort: (c) => c.parent, csv: (c) => c.parent },
    { key: 'why', label: 'Why', priority: 2, render: (c) => (c.reason === 'below' ? `${points(sim.bar - (c.w ?? 0))} points below the bar` : 'Filing has no usable figures'), sort: (c) => c.w, csv: (c) => c.reason },
  ]

  return (
    <>
      <section className="page-head">
        <div className="meta crumbs"><a href={href('')}>Indexes</a> / Simulation</div>
        <h1>{sim.name} <span className="badge sim">Simulation</span></h1>
        <p className="meta crumbs">
          A fictional index of the 50 largest Nifty 500 companies that pay women at least the <a href={href('index', parent.id)}>{parent.name}</a>'s share · rebuilt each September · as of {longDate(sim.asOf)}
        </p>
        <p className="sim-note" role="note">
          <strong>This index does not exist.</strong> We built it to show what holding only companies that clear a parity bar could look like.
          Nobody can invest in it, it is not investment advice, and simulated results do not predict future returns.
        </p>
      </section>

      <section>
        <h2>Every company pays women at least <span className="accent">{pct(sim.bar)}</span></h2>
        <p className="lead">
          That is the {parent.name}'s own figure: {pct(sim.bar)} of the payroll it owns goes to women. The {sim.name} holds only companies that do at least as well,
          the 50 largest of the {sim.eligible} that qualify, and leans towards those that clear the bar by most.
        </p>
        <div className="grid g2">
          <div className="card">
            <div className="tile-label">{parent.name} · {fy}</div>
            <div className="tile-value">{pct(h.parentPayroll)}</div>
            <div className="tile-context muted">{m.headlineLabel}</div>
            <ParityTrack value={h.parentPayroll} parity={m.parity} />
            <div className="tile-context muted">Lowest holding: {short(h.parentLowest.symbol)}, {pct(h.parentLowest.w)}</div>
          </div>
          <div className="card sim-card">
            <div className="tile-label">{sim.name} · {fy} <span className="badge sim">Simulation</span></div>
            <div className="tile-value">{pct(h.payroll)}</div>
            <div className="tile-context"><Change value={h.payroll - h.parentPayroll} /> <span className="muted">against the {parent.name}</span></div>
            <ParityTrack value={h.payroll} parity={m.parity} />
            <div className="tile-context muted">Lowest holding: {short(h.lowest.symbol)}, {pct(h.lowest.w)}</div>
          </div>
        </div>
        <div className="card table-card" style={{ marginTop: 16 }}>
          <table>
            <caption className="sr-only">{sim.name} and {parent.name} compared, {fy}</caption>
            <thead><tr><th scope="col">{fy}</th><th scope="col" className="r">{sim.name}</th><th scope="col" className="r">{parent.name}</th></tr></thead>
            <tbody>
              <tr><td>Women's share of the payroll you own</td><td className="r">{pct(h.payroll)}</td><td className="r">{pct(h.parentPayroll)}</td></tr>
              <tr><td>The average holding: women's share of pay</td><td className="r">{pct(h.pay)}</td><td className="r">{pct(h.parentPay)}</td></tr>
              <tr><td>The average holding: women's share of staff</td><td className="r">{pct(h.staff)}</td><td className="r">{pct(h.parentStaff)}</td></tr>
              <tr><td>The lowest holding: women's share of pay</td><td className="r">{pct(h.lowest.w)}</td><td className="r">{pct(h.parentLowest.w)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Rebuilt each September with that year's bar: {listOf(sim.years.map((y) => `${pct(y.payroll)} in ${m.label(y.year)} with a bar of ${pct(y.bar)}`))}.
          The average holding weights each company by its share of the index.
        </p>
      </section>

      <section>
        <h2>What the bar keeps out</h2>
        <p>
          <strong>{sim.out.companies} of the {parent.name}'s 50 companies</strong>, holding {pct(sim.out.weight, 0)} of its money, pay women less than the {parent.name}'s own share or report no usable figures.
          Only {sim.out.kept} make it in.{biggest?.reason === 'below' && biggest.w != null && <> {short(biggest.symbol)}, its largest company, misses by {points(sim.bar - biggest.w)} points.</>}
        </p>
        {outSectors.length > 0 && (
          <p>
            <strong>{WORDS[outSectors.length] ?? outSectors.length} sectors have no holding at all:</strong> {listOf(outSectors.map((s) => s.sector))},
            together {pct(outSectors.reduce((a, s) => a + s.weight, 0), 0)} of the {parent.name}.
          </p>
        )}
        <ChartFrame title="Where the money goes" sub={`Share of each index in each sector, ${fy}`}
          table={(
            <DataTable caption="Sector shares" bare rows={sim.sectors} rowKey={(s) => s.sector} initial={{ key: 'sim', dir: -1 }} columns={[
              { key: 'sector', label: 'Sector', render: (s) => s.sector, sort: (s) => s.sector },
              { key: 'sim', label: sim.name, right: true, mobile: 'value', render: (s) => pct(s.sim), sort: (s) => s.sim },
              { key: 'parent', label: parent.name, right: true, render: (s) => pct(s.parent), sort: (s) => s.parent },
            ]} />
          )}>
          <SectorMix sim={sim} parentName={parent.name} />
        </ChartFrame>
        <h3 style={{ marginTop: 28 }}>{parent.name} companies left out</h3>
        <DataTable caption={`${parent.name} companies the ${sim.name} leaves out`} columns={left} rows={sim.left} rowKey={(c) => c.symbol} initial={{ key: 'parent', dir: -1 }}
          rowHref={(c) => href('company', c.symbol)} limit={20} download={`${sim.id}-left-out`} summary={`${sim.left.length} companies`} />
      </section>

      <section>
        <h2>The 50 companies</h2>
        <p>
          {sim.out.kept} are in the {parent.name}. The rest are large companies from the wider Nifty 500. Weights follow company size,
          tilted towards companies that pay women a larger share, with no company above 8%.
        </p>
        <DataTable caption={`${sim.name} companies`} columns={held} rows={sim.holdings} rowKey={(c) => c.symbol} initial={{ key: 'sim', dir: -1 }}
          rowHref={(c) => href('company', c.symbol)} limit={20} download={`${sim.id}-companies`} summary={`${sim.holdings.length} companies`} />
      </section>

      <section>
        <h2>What it would have delivered</h2>
        <p>
          ₹100 put into each at the end of {monthLabel(first)}, with dividends reinvested and the index rebuilt each September.
          The shaded years are backfilled: no company published women's share of wages until mid-2024, so for those years the {sim.name} picks companies using figures they published later.
        </p>
        <ChartFrame title="Growth of ₹100" sub={`${monthLabel(first)} to ${monthLabel(last)}, month-end values`}
          table={(
            <DataTable caption="Growth of ₹100" bare rows={p.months} rowKey={(k) => k} initial={{ key: 'month', dir: 1 }} columns={[
              { key: 'month', label: 'Month', render: (k) => <>{monthLabel(k)}{backfilled(k) && <span className="sub">backfilled</span>}</>, sort: (k) => k },
              { key: 'sim', label: sim.name, right: true, mobile: 'value', render: (k) => `₹${p.sim[p.months.indexOf(k)].toFixed(1)}`, sort: (k) => p.sim[p.months.indexOf(k)] },
              { key: 'parent', label: `${parent.name}, rebuilt`, right: true, render: (k) => `₹${p.parent[p.months.indexOf(k)].toFixed(1)}`, sort: (k) => p.parent[p.months.indexOf(k)] },
              { key: 'etf', label: 'Index fund', right: true, render: (k) => `₹${p.etf[p.months.indexOf(k)].toFixed(1)}`, sort: (k) => p.etf[p.months.indexOf(k)] },
            ]} />
          )}>
          <GrowthChart months={p.months} xLabel={monthLabel} shade={{ until: p.backfillUntil, label: 'Backfilled' }}
            ariaLabel={`Growth of ₹100 in the ${sim.name}, the ${parent.name} rebuilt the same way, and a ${parent.name} index fund, ${monthLabel(first)} to ${monthLabel(last)}`}
            series={[
              { id: 'sim', label: sim.name, short: sim.name, color: 'var(--s1)', dashed: true, values: p.sim },
              { id: 'parent', label: `${parent.name}, rebuilt`, short: parent.name, color: 'var(--s2)', values: p.parent },
              { id: 'etf', label: 'Index fund', short: 'Index fund', color: 'var(--s3)', values: p.etf },
            ]} />
        </ChartFrame>
        <div style={{ marginTop: 16 }}>
          <DataTable caption={`Returns of the ${sim.name}, the ${parent.name} rebuilt the same way, and a ${parent.name} index fund`} bare rows={[
            { key: 'five', label: `Five years, ${monthLabel(first)} to ${monthLabel(last)}`, sim: ret(five.sim.cumulative), parent: ret(five.parent.cumulative), etf: ret(etf.full.cumulative) },
            { key: 'backfill', label: `Backfilled, ${monthLabel(first)} to ${monthLabel(p.backfillUntil)}`, sim: ret(bfill.sim.cumulative), parent: ret(bfill.parent.cumulative), etf: ret(etf.backfill.cumulative) },
            { key: 'live', label: `At the time, ${monthLabel(p.backfillUntil)} to ${monthLabel(last)}`, sim: ret(st.sim.cumulative), parent: ret(st.parent.cumulative), etf: ret(etf.live.cumulative) },
            { key: 'year', label: 'A year, over five years', sim: ret(five.sim.annualised), parent: ret(five.parent.annualised), etf: ret(etf.full.annualised) },
            { key: 'vol', label: 'Volatility, a year', sim: pct(five.sim.volatility), parent: pct(five.parent.volatility), etf: pct(etf.full.volatility) },
            { key: 'fall', label: 'Largest fall', sim: ret(five.sim.maxDrawdown), parent: ret(five.parent.maxDrawdown), etf: ret(etf.full.maxDrawdown) },
            { key: 'te', label: `Tracking error against the rebuilt ${parent.name}`, sim: pct(five.trackingError), parent: 'n/a', etf: 'n/a' },
          ]} rowKey={(r) => r.key} initial={{ key: 'label', dir: 1 }} columns={[
            { key: 'label', label: 'Return', mobile: 'title', render: (r) => r.label },
            { key: 'sim', label: sim.name, right: true, mobile: 'meta', render: (r) => r.sim },
            { key: 'parent', label: `${parent.name}, rebuilt`, right: true, mobile: 'meta', render: (r) => r.parent },
            { key: 'etf', label: 'Index fund', right: true, mobile: 'meta', render: (r) => r.etf },
          ]} />
        </div>
        <ul className="tight" style={{ marginTop: 16 }}>
          <li>
            <strong>Over five years it kept pace.</strong> It returned {ret(five.sim.cumulative)} against {ret(five.parent.cumulative)} for the {parent.name} rebuilt the same way,
            with bigger swings: its largest fall was {ret(five.sim.maxDrawdown)} against {ret(five.parent.maxDrawdown)}.
          </li>
          <li>
            <strong>The backfill flatters both lines.</strong> Both use today's members, so companies that shrank or left since 2021 are missing. Over five years the rebuilt {parent.name} returned {ret(five.parent.cumulative)},
            against {ret(etf.full.cumulative)} for a real index fund. The {sim.name} also picks companies using figures published later: {listOf(p.backfillYears.map((y) => `${y.laterFigures} of 50 in the September 20${y.year.slice(-2)} rebuild`))}.
          </li>
          <li>
            <strong>Only the last two years use information available at the time.</strong> Both lost money then: {ret(st.sim.cumulative)} against {ret(st.parent.cumulative)}, and {ret(etf.live.cumulative)} for the index fund.
          </li>
          <li><strong>Simulated results settle nothing.</strong> They cannot show whether parity pays, and they do not predict future returns.</li>
        </ul>
      </section>

      <section>
        <h2>Why the bar is not 50%</h2>
        <p><strong>The bar is the market's own level, not parity.</strong> Raise it to 25% and only {sim.at25} large companies in the whole Nifty 500 qualify, too few for an index of 50.</p>
        <p>
          <strong>Very few companies are near parity.</strong> Of {sim.nearParity.of} large listed employers with usable figures, only {sim.nearParity.count} come close to parity in both who they employ and how they pay them.
          Choosing companies cannot close the rest of the gap. Companies have to hire, promote and pay women more.
        </p>
      </section>

      <section>
        <h2>How it is built</h2>
        <ul className="tight">
          <li>The bar is the {parent.name}'s own women's share of the payroll it owns, with the same data, set again each September: {pct(sim.bar)} in {fy}.</li>
          <li>A Nifty 500 company qualifies if women get at least the bar as a share of its total wages and it has at least 1,000 permanent staff, so that a handful of people cannot set its figure.</li>
          <li>The index holds the 50 largest qualifying companies by the market value of shares the public holds.</li>
          <li>Each weight is that value times the company's women's share of pay divided by the bar, so companies that clear the bar by more weigh more. No company is above 8%, and there are no sector limits.</li>
          <li>From the September 2024 rebuild on, only figures from a company's own filing count: filed before the rebuild, and reported rather than estimated.</li>
          <li>Returns include dividends, splits, bonus issues and demergers. The {parent.name} it is compared with is rebuilt from the same prices, using its September 2026 members.</li>
          <li>
            Before September 2024 the history is backfilled. The September 2021, 2022 and 2023 rebuilds use each company's figures for that year if any filing reports them, and otherwise the earliest later year.
            They also use the earliest shareholding pattern on record, and today's shares outstanding, adjusted for splits and bonus issues.
          </li>
          <li>"Close to parity" means women are 35% to 65% of permanent staff and are paid at least 80% of what men are paid per head, among companies with at least 1,000 staff.</li>
          <li>We wrote these rules down before calculating any return. An earlier version kept the {parent.name}'s sector mix, and so held companies where women get as little as 1.5% of the pay. We replaced it.</li>
        </ul>
        <p><a className="go" href={href('method')}>How Nivel's figures are made</a></p>
      </section>
    </>
  )
}
