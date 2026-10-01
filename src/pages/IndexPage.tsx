import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { LineChart } from '../components/LineChart'
import { ParityTrack } from '../components/ParityTrack'
import { SectorBars } from '../components/SectorBars'
import { SortTable, type Column } from '../components/SortTable'
import { LATEST, PREV, YEARS, boardShare, companies, indexes, yoyChange } from '../lib/data'
import { fy, inr, pct } from '../lib/format'
import { href } from '../lib/router'
import type { Company } from '../types'
import { NotFound } from './NotFound'

interface Row { symbol: string; weight: number; co: Company }

export function IndexPage({ id }: { id: string }) {
  const ix = indexes[id]
  if (!ix) return <NotFound />
  const y = ix.years[LATEST]
  const ch = ix.yoy[`${PREV}>${LATEST}`]
  const xs = YEARS.filter((k) => ix.years[k])
  const rows: Row[] = ix.constituents.filter((c) => companies[c.symbol]).map((c) => ({ ...c, co: companies[c.symbol] }))
  const movers = rows
    .map((r) => ({ r, d: yoyChange(r.co) }))
    .filter((m): m is { r: Row; d: number } => m.d != null)
  const risers = [...movers].sort((a, b) => b.d - a.d).slice(0, 5).filter((m) => m.d > 0)
  const fallers = [...movers].sort((a, b) => a.d - b.d).slice(0, 5).filter((m) => m.d < 0)
  const noData = rows.filter((r) => r.co.years[LATEST]?.w == null)

  const columns: Column<Row>[] = [
    { key: 'name', label: 'Company', render: (r) => <a href={href('company', r.symbol)}>{r.co.name}<span className="sub">{r.co.industry}</span></a>, sort: (r) => r.co.name },
    { key: 'weight', label: 'Weight', right: true, render: (r) => pct(r.weight), sort: (r) => r.weight },
    { key: 'w', label: `Women's share of wages ${fy(LATEST)}`, right: true, render: (r) => <>{pct(r.co.years[LATEST]?.w)} <DataBadge year={r.co.years[LATEST]} /></>, sort: (r) => r.co.years[LATEST]?.w ?? null },
    { key: 'chg', label: `Change since ${fy(PREV)}`, right: true, render: (r) => <Change value={yoyChange(r.co)} />, sort: (r) => yoyChange(r.co) },
    { key: 'f', label: 'Women in permanent staff', right: true, render: (r) => pct(r.co.years[LATEST]?.fPerm), sort: (r) => r.co.years[LATEST]?.fPerm ?? null },
    { key: 'b', label: 'Women on board', right: true, render: (r) => { const yy = r.co.years[LATEST]; return yy?.board ? `${yy.boardWomen} of ${yy.board}` : 'n/a' }, sort: (r) => boardShare(r.co.years[LATEST]) },
  ]

  return (
    <>
      <section>
        <div className="meta"><a href={href('')}>Indexes</a> / {ix.market}</div>
        <h1>{ix.name}</h1>
        <p className="meta">{ix.exchange} · {ix.constituents.length + ix.missing.length} companies · weights as of {ix.weightsAsOf}</p>
        <div className="grid g2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="tile-label">Women's share of the payroll you own · {fy(LATEST)}</div>
            <div className="tile-value hero">{pct(y.headline)}</div>
            <div className="tile-context"><Change value={ch ? ch.change : null} /> <span className="muted">like for like across {ch?.companies ?? 0} companies since {fy(PREV)}</span></div>
            <ParityTrack value={y.headline} />
            <div className="tile-context muted">{y.companiesCovered} companies covered · {pct(y.reportedPayrollShare, 0)} of payroll from reported values</div>
          </div>
          <div className="card">
            <div className="tile-label">For every ₹10 lakh invested · {fy(LATEST)}</div>
            <table>
              <caption className="sr-only">Payroll owned per ₹10 lakh</caption>
              <tbody>
                <tr><td>Payroll you own</td><td className="r"><strong>{inr(y.ownedPayroll)}</strong> a year</td></tr>
                <tr><td>Paid to women</td><td className="r"><strong>{inr(y.womenWages)}</strong></td></tr>
                <tr><td>Gap to parity</td><td className="r"><strong>{inr(y.gap)}</strong></td></tr>
              </tbody>
            </table>
            {y.representationShare != null && y.payShare != null && (
              <>
                <div className="split" role="img" aria-label={`${pct(y.representationShare, 0)} of the gap is too few women employed, ${pct(y.payShare, 0)} is women paid less on average`}>
                  <span style={{ width: `${y.representationShare * 100}%`, background: 'var(--s1)' }} />
                  <span style={{ width: `${y.payShare * 100}%`, background: 'var(--s2)' }} />
                </div>
                <div className="keys">
                  <span className="key"><i style={{ background: 'var(--s1)' }} />{pct(y.representationShare, 0)} too few women employed</span>
                  <span className="key"><i style={{ background: 'var(--s2)' }} />{pct(y.payShare, 0)} women paid less on average</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2>The trend</h2>
        <LineChart
          ariaLabel={`${ix.name}: women's share of the payroll you own, by year`}
          xs={xs} xLabel={fy} fmt={(v) => pct(v, v === Math.round(v * 10) / 10 ? 0 : 1)}
          reference={{ y: 0.5, label: 'Parity 50%' }}
          series={[{ id: 'h', label: "Women's share of payroll", short: 'Payroll', color: 'var(--s1)', points: xs.map((k) => ({ x: k, y: ix.years[k].headline })) }]}
        />
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <caption className="sr-only">Trend table</caption>
            <thead><tr><th>Year</th><th className="r">Women's share of payroll</th><th className="r">Companies covered</th><th className="r">Like-for-like change</th></tr></thead>
            <tbody>
              {xs.map((k, i) => {
                const yy = i > 0 ? ix.yoy[`${xs[i - 1]}>${k}`] : undefined
                return (
                  <tr key={k}>
                    <td>{fy(k)}</td>
                    <td className="r">{pct(ix.years[k].headline)}</td>
                    <td className="r">{ix.years[k].companiesCovered}</td>
                    <td className="r">{yy ? <><Change value={yy.change} /> <span className="sub">{yy.companies} companies</span></> : 'n/a'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Each company keeps a fixed payroll weight across years, so the line moves when women's share of wages moves, not when payroll mix shifts.</p>
      </section>

      <section>
        <h2>By sector, {fy(LATEST)}</h2>
        <SectorBars sectors={y.sectors} />
      </section>

      <section>
        <h2>Biggest moves since {fy(PREV)}</h2>
        <div className="grid g2">
          {[{ title: 'Rose most', list: risers }, { title: 'Fell most', list: fallers }].map((g) => (
            <div className="card" key={g.title}>
              <h3>{g.title}</h3>
              {g.list.length === 0 ? <p className="muted small">None</p> : (
                <table>
                  <caption className="sr-only">{g.title}</caption>
                  <tbody>
                    {g.list.map((m) => (
                      <tr key={m.r.symbol}>
                        <td><a href={href('company', m.r.symbol)}>{m.r.co.name}</a></td>
                        <td className="r">{pct(m.r.co.years[LATEST]?.w)}</td>
                        <td className="r"><Change value={m.d} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Companies whose reporting basis changed between the two years are left out of this comparison.</p>
      </section>

      <section>
        <h2>All {ix.name} companies</h2>
        <SortTable caption={`${ix.name} constituents`} columns={columns} rows={rows} rowKey={(r) => r.symbol} initial={{ key: 'weight', dir: -1 }} />
        {(ix.missing.length > 0 || noData.length > 0) && (
          <p className="small" style={{ marginTop: 12 }}>
            <strong>Gaps:</strong>{' '}
            {ix.missing.length > 0 && <>no market data for {ix.missing.join(', ')}. </>}
            {noData.length > 0 && <>No usable {fy(LATEST)} wage data for {noData.map((r) => r.co.name).join(', ')}.</>}
          </p>
        )}
      </section>
    </>
  )
}
