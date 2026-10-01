import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { ChartFrame } from '../components/ChartFrame'
import { LineChart } from '../components/LineChart'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { Sparkline } from '../components/Sparkline'
import { ParityTrack } from '../components/ParityTrack'
import { SectorBars } from '../components/SectorBars'
import { SortTable, type Column } from '../components/SortTable'
import { indexPoints, summarise } from '../lib/compare'
import { boardShare, companies, indexMarket, indexes, workforce, yoyChange } from '../lib/data'
import { inr, pct, pctTick } from '../lib/format'
import { href } from '../lib/router'
import type { Company } from '../types'
import { NotFound } from './NotFound'

interface Row { symbol: string; weight: number | null; co: Company }

export function IndexPage({ id }: { id: string }) {
  const ix = indexes[id]
  if (!ix) return <NotFound />
  const m = indexMarket(ix)
  const uk = ix.country !== 'IN'
  const jp = ix.country === 'JP'
  const eu = ix.country === 'EU'
  const weightNote = ix.country === 'AU' ? 'weighted by Australian payroll' : ix.country === 'IN' ? 'weighted by free-float market cap' : 'each company counts equally'
  const TREND_NOTE: Record<string, string> = {
    IN: 'Each company keeps a fixed payroll weight across years, so the line moves when women\'s share of wages moves, not when payroll mix shifts.',
    GB: 'Each company counts equally. Like-for-like changes leave out companies whose UK reporting employers or size bands changed between the two years. Fewer reports exist for 2019 because enforcement was suspended during the pandemic.',
    AU: 'Two years so far. The earlier release is not archived, so FY24 values hold each company\'s workforce share at its FY25 level and the change reflects pay gaps only.',
    JP: '',
    EU: 'Each company counts equally. 2024 was the first CSRD reporting year, so the trend is short. Companies define pay slightly differently (hourly or annual, base or total), so compare a company with itself over time.',
  }
  const LATEST = m.latest
  const PREV = m.prev
  const fy = m.label
  const y = ix.years[LATEST]
  const ch = ix.yoy[`${PREV}>${LATEST}`]
  const xs = m.years.filter((k) => ix.years[k])
  const rows: Row[] = ix.constituents.filter((c) => companies[c.symbol]).map((c) => ({ ...c, co: companies[c.symbol] }))
  const movers = rows
    .map((r) => ({ r, d: yoyChange(r.co) }))
    .filter((m): m is { r: Row; d: number } => m.d != null)
  const risers = [...movers].sort((a, b) => b.d - a.d).slice(0, 5).filter((m) => m.d > 0)
  const fallers = [...movers].sort((a, b) => a.d - b.d).slice(0, 5).filter((m) => m.d < 0)
  const noStaff = rows.filter((r) => r.co.noDataReason)
  const noData = rows.filter((r) => !r.co.noDataReason && r.co.years[LATEST]?.w == null)

  const columns: Column<Row>[] = [
    { key: 'name', label: 'Company', render: (r) => <span className="name-cell"><Logo symbol={r.symbol} name={r.co.name} /><a href={href('company', r.symbol)}>{r.co.name}<span className="sub">{r.co.industry}</span></a></span>, sort: (r) => r.co.name, csv: (r) => r.co.name },
    ...(xs.length > 1 ? [{ key: 'trend', label: 'Trend', render: (r: Row) => <Sparkline values={xs.map((k) => (r.co.years[k]?.wKind === 'reported' ? r.co.years[k].w : null))} label={`${r.co.name} trend`} /> }] : []),
    ...(uk ? [] : [{ key: 'weight', label: 'Weight', right: true, render: (r: Row) => pct(r.weight), sort: (r: Row) => r.weight }]),
    { key: 'w', label: `${m.wageLabel} ${fy(LATEST)}`, render: (r) => <span className="nowrap"><Meter value={r.co.years[LATEST]?.w} parity={m.parity} max={m.parity === 1 ? 1.4 : 1} /> <DataBadge year={r.co.years[LATEST]} /></span>, sort: (r) => r.co.years[LATEST]?.w ?? null },
    ...(PREV ? [{ key: 'chg', label: `Change since ${fy(PREV)}`, right: true, render: (r: Row) => <Change value={yoyChange(r.co)} />, sort: (r: Row) => yoyChange(r.co) }] : []),
    ...(eu ? [] : [{ key: 'f', label: m.workforceLabel, right: true, render: (r: Row) => pct(workforce(r.co, r.co.years[LATEST])), sort: (r: Row) => workforce(r.co, r.co.years[LATEST]) }]),
    ...(eu
      ? [{ key: 'gap', label: 'Unadjusted pay gap', right: true, render: (r: Row) => pct(r.co.years[LATEST]?.gapMean), sort: (r: Row) => r.co.years[LATEST]?.gapMean ?? null }]
      : jp
      ? [
          { key: 'b', label: 'Women on board', right: true, render: (r: Row) => pct(boardShare(r.co.years[LATEST]) ?? r.co.years[LATEST]?.boardShareReported), sort: (r: Row) => boardShare(r.co.years[LATEST]) ?? r.co.years[LATEST]?.boardShareReported ?? null },
          { key: 'reg', label: 'Regular staff pay ratio', right: true, render: (r: Row) => pct(r.co.years[LATEST]?.ratioRegular), sort: (r: Row) => r.co.years[LATEST]?.ratioRegular ?? null },
        ]
      : uk
      ? [
          { key: 'top', label: 'Women in top pay quarter', right: true, render: (r: Row) => pct(r.co.years[LATEST]?.topQuartile), sort: (r: Row) => r.co.years[LATEST]?.topQuartile ?? null },
          { key: 'gap', label: 'Mean pay gap', right: true, render: (r: Row) => pct(r.co.years[LATEST]?.gapMean), sort: (r: Row) => r.co.years[LATEST]?.gapMean ?? null },
        ]
      : [{ key: 'b', label: 'Women on board', right: true, render: (r: Row) => { const yy = r.co.years[LATEST]; return yy?.board ? `${yy.boardWomen} of ${yy.board}` : 'n/a' }, sort: (r: Row) => boardShare(r.co.years[LATEST]) }]),
  ]

  const trendTable = (
    <div className="table-wrap">
      <table className="data">
        <caption className="sr-only">Trend table</caption>
        <thead><tr><th>Year</th><th className="r">{eu ? "Women's pay as a share of men's" : ix.country === 'GB' ? "Women's share of pay" : "Women's share of payroll"}</th><th className="r">Companies covered</th><th className="r">Like-for-like change</th></tr></thead>
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
  )
  const pts = indexPoints(ix.id)
  const sE = summarise(pts.map((p) => p.e))
  const sW = summarise(pts.map((p) => p.w))

  return (
    <>
      <section>
        <div className="meta"><a href={href('')}>Indexes</a> / {ix.market}</div>
        <h1>{ix.name}</h1>
        <p className="meta">{ix.exchange} · {ix.constituents.length + ix.missing.length} companies · members as of {ix.weightsAsOf}, {weightNote}</p>
        <div className="grid g2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="tile-label">{m.headlineLabel} · {fy(LATEST)}</div>
            <div className="tile-value hero">{pct(y.headline)}</div>
            <div className="tile-context">{PREV
              ? <><Change value={ch ? ch.change : null} /> <span className="muted">like for like across {ch?.companies ?? 0} companies since {fy(PREV)}</span></>
              : <span className="muted">First snapshot</span>}</div>
            <ParityTrack value={y.headline} parity={m.parity} />
            <div className="tile-context muted">{uk ? m.coverage(y.companiesCovered) : `${m.coverage(y.companiesCovered)} · ${pct(y.reportedPayrollShare, 0)} of payroll from reported values`}</div>
          </div>
          {uk ? (
            <div className="card">
              <div className="tile-label">{eu ? 'Coverage' : 'Pay structure'} · {fy(LATEST)}</div>
              <table>
                <caption className="sr-only">Pay structure</caption>
                {eu ? (
                  <tbody>
                    <tr><td>Verified from company statements</td><td className="r"><strong>{y.verified} of 50</strong></td></tr>
                    <tr><td>Excluded: adjusted only, partial scope or not material</td><td className="r"><strong>{y.excluded}</strong></td></tr>
                    <tr><td>Not yet located or access blocked</td><td className="r"><strong>{y.unresolved}</strong></td></tr>
                  </tbody>
                ) : jp ? (
                  <tbody>
                    <tr><td>Women in management</td><td className="r"><strong>{pct(y.managers)}</strong></td></tr>
                    <tr><td>Women on boards</td><td className="r"><strong>{pct(y.boards)}</strong></td></tr>
                    <tr><td>Regular staff: women's pay as a share of men's</td><td className="r"><strong>{pct(y.ratioRegular)}</strong></td></tr>
                  </tbody>
                ) : (
                  <tbody>
                    <tr><td>{m.workforceLabel}</td><td className="r"><strong>{pct(y.workforce)}</strong></td></tr>
                    <tr><td>Women in the top pay quarter</td><td className="r"><strong>{pct(y.topQuartile)}</strong></td></tr>
                    <tr><td>Mean pay gap</td><td className="r"><strong>{pct(y.gapMean)}</strong></td></tr>
                  </tbody>
                )}
              </table>
              {jp && <p className="small" style={{ marginTop: 12 }}>Women earn about <strong>{m.payPhrase(y.headline)}</strong> and hold <strong>{pct(y.managers, 0)}</strong> of management jobs.</p>}
              {eu && <p className="small" style={{ marginTop: 12 }}>At the average company with a verified figure, women earn about <strong>{m.payPhrase(y.headline)}</strong>. Every excluded or missing company is listed below with its reason.</p>}
              {!jp && !eu && y.gapMean != null && <p className="small" style={{ marginTop: 12 }}>Women earn about <strong>{m.payPhrase(1 - y.gapMean)}</strong>, and hold fewer of the best-paid jobs than their share of the workforce.</p>}
            </div>
          ) : (
          <div className="card">
            <div className="tile-label">For every ₹10 lakh invested · {fy(LATEST)}</div>
            <table>
              <caption className="sr-only">Payroll owned per ₹10 lakh</caption>
              <tbody>
                <tr><td>Payroll you own</td><td className="r"><strong>{inr(y.ownedPayroll ?? 0)}</strong> a year</td></tr>
                <tr><td>Paid to women</td><td className="r"><strong>{inr(y.womenWages ?? 0)}</strong></td></tr>
                <tr><td>Gap to parity</td><td className="r"><strong>{inr(y.gap ?? 0)}</strong></td></tr>
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
          )}
        </div>
        <p className="small" style={{ marginTop: 14 }}>
          <strong>On the shared scales:</strong> the median company has {sE ? <>women as <strong>{pct(sE.median)}</strong> of staff and </> : null}pays women <strong>{sW ? pct(sW.median) : 'n/a'}</strong> of what it pays men, on average.{' '}
          <a href={href('compare', 'countries')}>Compare with other markets</a>
        </p>
      </section>

      {xs.length < 2 ? (
        <section>
          <h2>The trend</h2>
          <p className="small muted">One snapshot so far, mostly covering FY2025. The trend starts with next year's disclosures.</p>
        </section>
      ) : (
      <section>
        <h2>The trend</h2>
        <ChartFrame title={m.headlineLabel} sub={`${fy(xs[0])} to ${fy(LATEST)} · ${m.coverage(y.companiesCovered)} in ${fy(LATEST)}`} table={trendTable}>
        <LineChart
          ariaLabel={`${ix.name}: ${m.headlineLabel.toLowerCase()}, by year`}
          xs={xs} xLabel={fy} fmt={pctTick}
          reference={{ y: m.parity, label: `Parity ${pct(m.parity, 0)}` }}
          yMax={m.parity}
          series={[{ id: 'h', label: m.headlineLabel, short: 'Index', color: 'var(--s1)', points: xs.map((k) => ({ x: k, y: ix.years[k].headline })) }]}
        />
        </ChartFrame>
        <p className="small muted" style={{ marginTop: 10 }}>{TREND_NOTE[ix.country]}</p>
      </section>
      )}

      <section>
        <h2>By sector, {fy(LATEST)}</h2>
        <ChartFrame title={m.wageLabel} sub={uk ? 'Average company in each sector, using the exchange\'s own sector labels' : 'Payroll-weighted, using the exchange\'s own sector labels'}
          table={(
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">By sector</caption>
                <thead><tr><th>Sector</th><th className="r">{m.wageLabel}</th>{!uk && <th className="r">Share of payroll owned</th>}<th className="r">Companies</th></tr></thead>
                <tbody>{y.sectors.map((s) => <tr key={s.industry}><td>{s.industry}</td><td className="r">{pct(s.w)}</td>{!uk && <td className="r">{pct(s.payrollShare)}</td>}<td className="r">{s.companies}</td></tr>)}</tbody>
              </table>
            </div>
          )}>
          <SectorBars sectors={y.sectors} parity={m.parity} />
        </ChartFrame>
        <p className="small muted" style={{ marginTop: 10 }}><a href={href('compare', 'sectors')}>Compare sectors across markets</a> on a shared 11-sector scheme.</p>
      </section>

      {PREV && <section>
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
                        <td><span className="name-cell"><Logo symbol={m.r.symbol} name={m.r.co.name} size={26} /><a href={href('company', m.r.symbol)}>{m.r.co.name}</a></span></td>
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
      </section>}

      <section>
        <h2>All {ix.name} companies</h2>
        <SortTable caption={`${ix.name} constituents`} columns={columns} rows={rows} rowKey={(r) => r.symbol} initial={{ key: uk ? 'w' : 'weight', dir: -1 }} rowHref={(r) => href('company', r.symbol)} scroll
          rank download={`${ix.id}-companies`} summary={`${rows.length} companies · tap a row for its profile`} />
        {(ix.missing.length > 0 || noData.length > 0 || noStaff.length > 0) && (
          <p className="small" style={{ marginTop: 12 }}>
            <strong>Gaps:</strong>{' '}
            {ix.missing.length > 0 && <>no market data for {ix.missing.join(', ')}. </>}
            {noStaff.length > 0 && (eu
              ? <>No verified figure for {noStaff.map((r) => r.co.name).join(', ')}. Each company's page gives the reason. </>
              : jp
              ? <>Not in the government database: {noStaff.map((r) => r.co.name).join(', ')}. These companies may publish the figures on their own websites instead. </>
              : <>No {ix.country === 'GB' ? 'UK gender pay gap' : 'WGEA'} report for {noStaff.map((r) => r.co.name).join(', ')} (funds and trusts without staff, or no local employer above the reporting threshold). </>)}
            {noData.length > 0 && <>No usable {fy(LATEST)} data for {noData.map((r) => r.co.name).join(', ')}.</>}
          </p>
        )}
      </section>
    </>
  )
}
