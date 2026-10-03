import { DataBadge, ShareFigure } from '../components/Badge'
import { Change } from '../components/Change'
import { ChartFrame } from '../components/ChartFrame'
import { LineChart } from '../components/LineChart'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { Sparkline } from '../components/Sparkline'
import { ParityTrack } from '../components/ParityTrack'
import { SectorBars } from '../components/SectorBars'
import { DataTable, type Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { indexPoints, summarise } from '../lib/compare'
import { boardShare, companies, indexMarket, indexes, payRatio, simulationOf, useLoaded, useStage, workforce, yoyChange } from '../lib/data'
import { Skeleton, TableSkeleton } from '../components/Skeleton'
import { inr, pct, pctTick } from '../lib/format'
import { href, usePageTitle } from '../lib/router'
import { INDEX_TABS } from '../lib/tabs'
import type { Company, Sector } from '../types'
import { NotFound } from './NotFound'

interface Row { symbol: string; weight: number | null; co: Company }

export function IndexPage({ id, tab }: { id: string; tab?: string }) {
  useStage('core')
  const ready = useLoaded('companies')
  const ix = indexes[id]
  const current = INDEX_TABS.find(([t]) => t === tab) ?? INDEX_TABS[0]
  usePageTitle(!ix ? 'Page not found' : current[0] === 'overview' ? ix.name : `${ix.name} · ${current[1]}`)
  if (!ix) return <NotFound />
  const m = indexMarket(ix)
  const uk = ix.country !== 'IN'
  const jp = ix.country === 'JP'
  const eu = ix.country === 'EU'
  const weightNote = ix.country === 'AU' ? 'weighted by Australian payroll' : ix.country === 'IN' ? 'weighted by free-float market cap' : 'each company counts equally'
  const TREND_NOTE: Record<string, string> = {
    IN: 'Payroll weights are fixed across years, so the line moves only with pay.',
    GB: 'Like for like leaves out companies whose reporting employers changed. 2019 has fewer reports: enforcement paused in the pandemic.',
    AU: 'FY24 uses FY25 workforce shares, as the earlier release is not archived.',
    JP: '',
    EU: 'CSRD reporting began in 2024. Companies define pay differently: hourly or annual, base or total.',
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
  const noSplit = rows.filter((r) => !r.co.noDataReason && r.co.years[LATEST]?.w == null && r.co.years[LATEST]?.gapMean != null)
  const noData = rows.filter((r) => !r.co.noDataReason && r.co.years[LATEST]?.w == null && r.co.years[LATEST]?.gapMean == null)

  const columns: Column<Row>[] = [
    { key: 'name', label: 'Company', render: (r) => <span className="name-cell"><Logo symbol={r.symbol} name={r.co.name} /><a href={href('company', r.symbol)}>{r.co.name}<span className="sub">{r.co.industry}</span></a></span>, sort: (r) => r.co.name, csv: (r) => r.co.name },
    ...(xs.length > 1 ? [{ key: 'trend', label: 'Trend', mobile: 'hide' as const, priority: 2 as const, render: (r: Row) => <Sparkline values={xs.map((k) => (r.co.years[k]?.wKind === 'reported' ? r.co.years[k].w : null))} label={`${r.co.name} trend`} /> }] : []),
    ...(uk ? [] : [{ key: 'weight', label: 'Weight', right: true, render: (r: Row) => pct(r.weight), sort: (r: Row) => r.weight }]),
    { key: 'w', label: `${m.wageLabel} ${fy(LATEST)}`, short: 'Share of pay', mobile: 'value', phone: (r) => <ShareFigure year={r.co.years[LATEST]} />, render: (r) => <span className="nowrap"><Meter value={r.co.years[LATEST]?.w} parity={m.parity} /> <DataBadge year={r.co.years[LATEST]} /></span>, sort: (r) => r.co.years[LATEST]?.w ?? null },
    ...(PREV ? [{ key: 'chg', label: `Change since ${fy(PREV)}`, short: '1-year change', right: true, mobile: 'second' as const, phone: (r: Row) => <Change value={yoyChange(r.co)} hideMissing />, render: (r: Row) => <Change value={yoyChange(r.co)} />, sort: (r: Row) => yoyChange(r.co) }] : []),
    { key: 'f', label: m.workforceLabel, right: true, render: (r: Row) => pct(workforce(r.co, r.co.years[LATEST])), sort: (r: Row) => workforce(r.co, r.co.years[LATEST]) },
    ...(jp || eu
      ? [
          { key: 'pay', label: 'Wage parity', right: true, render: (r: Row) => pct(payRatio(r.co, r.co.years[LATEST]), 0), sort: (r: Row) => payRatio(r.co, r.co.years[LATEST]) },
          ...(jp ? [{ key: 'b', label: 'Women on board', priority: 3 as const, right: true, render: (r: Row) => pct(boardShare(r.co.years[LATEST]) ?? r.co.years[LATEST]?.boardShareReported), sort: (r: Row) => boardShare(r.co.years[LATEST]) ?? r.co.years[LATEST]?.boardShareReported ?? null }] : []),
        ]
      : uk
      ? [
          { key: 'top', label: 'Women in top pay quarter', priority: 3 as const, right: true, render: (r: Row) => pct(r.co.years[LATEST]?.topQuartile), sort: (r: Row) => r.co.years[LATEST]?.topQuartile ?? null },
          { key: 'gap', label: 'Mean pay gap', right: true, render: (r: Row) => pct(r.co.years[LATEST]?.gapMean), sort: (r: Row) => r.co.years[LATEST]?.gapMean ?? null },
        ]
      : [{ key: 'b', label: 'Women on board', priority: 3 as const, right: true, render: (r: Row) => { const yy = r.co.years[LATEST]; return yy?.board ? `${yy.boardWomen} of ${yy.board}` : 'n/a' }, sort: (r: Row) => boardShare(r.co.years[LATEST]) }]),
  ]

  const trendTable = (
    <DataTable caption="Trend table" bare rows={xs} rowKey={(k) => k} initial={{ key: 'year', dir: 1 }} columns={[
      { key: 'year', label: 'Year', render: (k) => fy(k), sort: (k) => k },
      { key: 'h', label: m.wageLabel, short: 'Share of pay', right: true, mobile: 'value', render: (k) => pct(ix.years[k].headline) },
      { key: 'n', label: 'Companies covered', right: true, render: (k) => ix.years[k].companiesCovered },
      { key: 'chg', label: 'Like-for-like change', right: true, render: (k) => { const i = xs.indexOf(k); const yy = i > 0 ? ix.yoy[`${xs[i - 1]}>${k}`] : undefined; return yy ? <><Change value={yy.change} /><span className="sub">{yy.companies} companies</span></> : 'n/a' } },
    ]} />
  )
  const pts = indexPoints(ix.id)
  const sE = summarise(pts.map((p) => p.e))
  const sW = summarise(pts.map((p) => p.w))
  const sim = simulationOf(ix.id)

  return (
    <>
      <section className="page-head">
        <div className="meta crumbs"><a href={href('')}>Indexes</a> / {ix.market}</div>
        <h1>{ix.name}</h1>
        <p className="meta crumbs">{ix.exchange} · <a href={href('index', ix.id, 'companies')}>{ix.constituents.length + ix.missing.length} companies</a> · members as of {ix.weightsAsOf}, {weightNote}</p>
        <Tabs label="Index sections" current={current[0]} items={INDEX_TABS.map(([t, label]) => ({ id: t, label, href: t === 'overview' ? href('index', ix.id) : href('index', ix.id, t) }))} />
      </section>

      {current[0] === 'overview' && <>
      <section>
        <div className="grid g2">
          <div className="card">
            <div className="tile-label">{m.headlineLabel} · {fy(LATEST)}</div>
            <div className="tile-value hero">{pct(y.headline)}</div>
            <div className="tile-context">{PREV
              ? <><Change value={ch ? ch.change : null} /> <span className="muted">since {fy(PREV)}, {ch?.companies ?? 0} companies like for like</span></>
              : <span className="muted">First snapshot</span>}</div>
            <ParityTrack value={y.headline} parity={m.parity} />
            <div className="tile-context muted">{uk ? m.coverage(y.companiesCovered) : `${m.coverage(y.companiesCovered)} · ${pct(y.reportedPayrollShare, 0)} of payroll reported`}</div>
          </div>
          {uk ? (
            <div className="card">
              <div className="tile-label">{eu ? 'Coverage' : 'Pay structure'} · {fy(LATEST)}</div>
              <table>
                <caption className="sr-only">Pay structure</caption>
                {eu ? (
                  <tbody>
                    <tr><td>{m.workforceLabel}</td><td className="r nowrap"><strong>{pct(y.workforce)}</strong></td></tr>
                    <tr><td>Pay gap verified from company statements</td><td className="r nowrap"><strong>{y.verified} of 50</strong></td></tr>
                    <tr><td>Of those, with a workforce split too</td><td className="r nowrap"><strong>{y.companiesCovered}</strong></td></tr>
                    <tr><td>Excluded (adjusted gap only, partial scope, not material) or not located</td><td className="r nowrap"><strong>{(y.excluded ?? 0) + (y.unresolved ?? 0)}</strong></td></tr>
                  </tbody>
                ) : jp ? (
                  <tbody>
                    <tr><td>{m.workforceLabel}</td><td className="r nowrap"><strong>{pct(y.workforce)}</strong></td></tr>
                    <tr><td>Women in management</td><td className="r nowrap"><strong>{pct(y.managers)}</strong></td></tr>
                    <tr><td>Women on boards</td><td className="r nowrap"><strong>{pct(y.boards)}</strong></td></tr>
                  </tbody>
                ) : (
                  <tbody>
                    <tr><td>{m.workforceLabel}</td><td className="r nowrap"><strong>{pct(y.workforce)}</strong></td></tr>
                    <tr><td>Women in the top pay quarter</td><td className="r nowrap"><strong>{pct(y.topQuartile)}</strong></td></tr>
                    <tr><td>Mean pay gap</td><td className="r nowrap"><strong>{pct(y.gapMean)}</strong></td></tr>
                  </tbody>
                )}
              </table>
              {jp && y.payRatio != null && <p className="small" style={{ marginTop: 12 }}>Women earn <strong>{m.payPhrase(y.payRatio)}</strong> and hold <strong>{pct(y.managers, 0)}</strong> of management jobs ({y.payRatioCompanies} companies).</p>}
              {eu && y.payRatio != null && <p className="small" style={{ marginTop: 12 }}>Women earn <strong>{m.payPhrase(y.payRatio)}</strong> ({y.payRatioCompanies} companies with a verified gap).</p>}
              {!jp && !eu && y.gapMean != null && <p className="small" style={{ marginTop: 12 }}>Women earn <strong>{m.payPhrase(1 - y.gapMean)}</strong> and hold fewer of the best-paid jobs.</p>}
            </div>
          ) : (
          <div className="card">
            <div className="tile-label">For every ₹10 lakh invested · {fy(LATEST)}</div>
            <table>
              <caption className="sr-only">Payroll owned per ₹10 lakh</caption>
              <tbody>
                <tr><td>Payroll you own</td><td className="r nowrap"><strong>{inr(y.ownedPayroll ?? 0)}</strong> a year</td></tr>
                <tr><td>Paid to women</td><td className="r nowrap"><strong>{inr(y.womenWages ?? 0)}</strong></td></tr>
                <tr><td>Gap to parity</td><td className="r nowrap"><strong>{inr(y.gap ?? 0)}</strong></td></tr>
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
          <strong>Median company:</strong> {!ready ? <Skeleton line label="Loading the median company" /> : <>{sE ? <>women are <strong>{pct(sE.median)}</strong> of staff and </> : null}earn <strong>{sW ? pct(sW.median) : 'n/a'}</strong> of men's pay.</>}{' '}
          <a className="go" href={href('compare', 'countries')}>Compare markets</a>
        </p>
      </section>

      {xs.length < 2 ? (
        <section>
          <h2>The trend</h2>
          <EmptyState art="notEnough" title="One snapshot so far">Mostly FY25. The trend starts next year.</EmptyState>
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

      {sim && (
        <section>
          <a className="card sim-card link-card" href={href('simulation', sim.id)}>
            <span className="badge sim">Simulation</span>
            <h3>{sim.name}: only companies above {pct(sim.bar)}</h3>
            <p className="small">A fictional index. {sim.out.companies} of the {ix.name}'s 50 companies miss the bar.</p>
            <span className="link-more">Open</span>
          </a>
        </section>
      )}
      </>}

      {current[0] === 'sectors' && <section>
        <h2>By sector, {fy(LATEST)}</h2>
        <ChartFrame title={m.wageLabel} sub={uk ? 'Average company, exchange sectors' : 'Payroll-weighted, exchange sectors'}
          table={(
            <DataTable caption="By sector" bare rows={y.sectors} rowKey={(s) => s.industry} initial={{ key: 'w', dir: -1 }} columns={[
              { key: 'sector', label: 'Sector', render: (s) => s.industry, sort: (s) => s.industry },
              { key: 'w', label: m.wageLabel, short: 'Share of pay', right: true, mobile: 'value', render: (s) => pct(s.w), sort: (s) => s.w },
              ...(uk ? [] : [{ key: 'p', label: 'Share of payroll owned', right: true, render: (s: Sector) => pct(s.payrollShare), sort: (s: Sector) => s.payrollShare }]),
              { key: 'n', label: 'Companies', right: true, render: (s) => s.companies, sort: (s) => s.companies },
            ]} />
          )}>
          <SectorBars sectors={y.sectors} parity={m.parity} />
        </ChartFrame>
        <p className="small muted" style={{ marginTop: 10 }}><a className="go" href={href('compare', 'sectors')}>Compare sectors across markets</a></p>
      </section>}

      {current[0] === 'overview' && PREV && <section>
        <h2>Biggest moves since {fy(PREV)}</h2>
        <div className="grid g2">
          {[{ title: 'Rose most', list: risers }, { title: 'Fell most', list: fallers }].map((g) => (
            <div className="card" key={g.title}>
              <h3>{g.title}</h3>
              {!ready ? <TableSkeleton rows={5} compact label={`Loading ${g.title.toLowerCase()}`} /> : g.list.length === 0 ? <p className="muted small">None</p> : (
                <table className="movers">
                  <caption className="sr-only">{g.title}</caption>
                  <tbody>
                    {g.list.map((m) => (
                      <tr key={m.r.symbol}>
                        <td><span className="name-cell"><Logo symbol={m.r.symbol} name={m.r.co.name} size={26} /><a href={href('company', m.r.symbol)}>{m.r.co.name}</a></span></td>
                        <td className="r mv-val">{pct(m.r.co.years[LATEST]?.w)}</td>
                        <td className="r"><Change value={m.d} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Excludes companies whose reporting basis changed.</p>
      </section>}

      {current[0] === 'companies' && <section>
        <h2>All {ix.name} companies</h2>
        {!ready ? <TableSkeleton rows={10} label="Loading companies" /> : <>
        <DataTable caption={`${ix.name} constituents`} columns={columns} rows={rows} rowKey={(r) => r.symbol} initial={{ key: uk ? 'w' : 'weight', dir: -1 }} rowHref={(r) => href('company', r.symbol)}
          urlState limit={20} rank download={`${ix.id}-companies`} summary={`${rows.length} companies`} />
        <p className="small muted key-note">≈ estimated. pp: percentage points.</p>
        {(ix.missing.length > 0 || noData.length > 0 || noStaff.length > 0 || noSplit.length > 0) && (
          <p className="small" style={{ marginTop: 12 }}>
            <strong>Gaps:</strong>{' '}
            {ix.missing.length > 0 && <>no market data for {ix.missing.join(', ')}. </>}
            {noStaff.length > 0 && (eu
              ? <>No verified figure: {noStaff.map((r) => r.co.name).join(', ')}. </>
              : jp
              ? <>Not in the government database: {noStaff.map((r) => r.co.name).join(', ')}. </>
              : <>No {ix.country === 'GB' ? 'UK gender pay gap' : 'WGEA'} report (no staff, or no local employer above the threshold): {noStaff.map((r) => r.co.name).join(', ')}. </>)}
            {noSplit.length > 0 && <>No workforce split, so not in the headline: {noSplit.map((r) => r.co.name).join(', ')}. </>}
            {noData.length > 0 && <>No usable {fy(LATEST)} data for {noData.map((r) => r.co.name).join(', ')}.</>}
          </p>
        )}
        </>}
      </section>}
    </>
  )
}
