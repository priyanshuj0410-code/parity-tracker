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
import { ForecastBlock } from '../components/ForecastBlock'
import { GUESS_FIRST, GuessFirst } from '../components/GuessFirst'
import { Tabs } from '../components/Tabs'
import { indexPoints, summarise } from '../lib/compare'
import { boardShare, companies, indexMarket, indexes, isGroup, payRatio, publishedChange, simulationOf, ticker, useLoaded, useStage, workforce, yoyChange } from '../lib/data'
import { Skeleton, TableSkeleton } from '../components/Skeleton'
import { crore, inr, pct, pctTick } from '../lib/format'
import { href, usePageTitle } from '../lib/router'
import { INDEX_TABS } from '../lib/tabs'
import type { Company, Sector, Yoy } from '../types'
import { NotFound } from './NotFound'

/** `yr` is the year the row shows: the market's latest, or for a group, the year before when the company has not filed yet. */
interface Row { symbol: string; weight: number | null; co: Company; yr: string }

/** The financial year after an Indian year key: "2025-26" gives "2026-27", the year a forecast asks about. */
const nextYear = (y: string) => { const a = Number(y.slice(0, 4)) + 1; return `${a}-${String((a + 1) % 100).padStart(2, '0')}` }

const num = (n: number) => n.toLocaleString('en-IN')
const cr = (rupees: number | null) => crore(rupees == null ? null : Math.round(rupees / 1e7))
const pp = (v: number) => { const p = Math.round(v * 1000) / 10; return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1)}` }
const range = (ch: Yoy) => (ch.interval ? `range ${pp(ch.interval[0])} to ${pp(ch.interval[1])} pp` : '')
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const nameOf = (symbol: string) => companies[symbol]?.name ?? ticker(symbol)
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export function IndexPage({ id, tab }: { id: string; tab?: string }) {
  useStage('core')
  const ready = useLoaded('companies')
  const ix = indexes[id]
  const current = INDEX_TABS.find(([t]) => t === tab) ?? INDEX_TABS[0]
  usePageTitle(!ix ? 'Page not found' : current[0] === 'overview' ? ix.name : `${ix.name} · ${current[1]}`)
  if (!ix) return <NotFound />
  const m = indexMarket(ix)
  const group = isGroup(ix)
  const uk = ix.country !== 'IN'
  const jp = ix.country === 'JP'
  const eu = ix.country === 'EU'
  const weightNote = ix.country === 'AU' ? 'weighted by Australian payroll' : ix.country === 'IN' ? 'weighted by free-float market cap' : 'each company counts equally'
  const headlineLabel = ix.headlineLabel ?? m.headlineLabel
  const left = ix.left ?? []
  const members = [...ix.constituents, ...ix.missing.filter((s) => !left.includes(s)).map((symbol) => ({ symbol, weight: null }))]
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
  const key = `${PREV}>${LATEST}`
  const ch = publishedChange(ix, key)
  const heldBack = ch ? undefined : ix.yoy[key]
  const carried = [...(heldBack?.carriedTop10 ?? []).map(nameOf), ...(heldBack?.carriedIndustries ?? []).map((s) => `all of ${s}`)]
  const xs = m.years.filter((k) => ix.years[k])
  const yearOf = (co: Company) => (group && !co.years[LATEST] && PREV && co.years[PREV] ? PREV : LATEST)
  const rows: Row[] = (group ? members : ix.constituents).filter((c) => companies[c.symbol]).map((c) => ({ ...c, co: companies[c.symbol], yr: yearOf(companies[c.symbol]) }))
  const at = (r: Row) => r.co.years[r.yr]
  const movers = (group ? rows.filter((r) => r.weight != null).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 50) : rows)
    .map((r) => ({ r, d: yoyChange(r.co) }))
    .filter((m): m is { r: Row; d: number } => m.d != null && (!group || Math.abs(m.d) <= 0.15))
  const risers = [...movers].sort((a, b) => b.d - a.d).slice(0, 5).filter((m) => m.d > 0)
  const fallers = [...movers].sort((a, b) => a.d - b.d).slice(0, 5).filter((m) => m.d < 0)
  const noStaff = rows.filter((r) => r.co.noDataReason)
  const noSplit = rows.filter((r) => !r.co.noDataReason && at(r)?.w == null && at(r)?.gapMean != null)
  const noData = rows.filter((r) => !r.co.noDataReason && at(r)?.w == null && at(r)?.gapMean == null)
  const fallback = (r: Row) => r.yr !== LATEST && <span className="sub">{fy(r.yr)} figure</span>
  const noWeight = rows.filter((r) => r.weight == null).length
  const noFigure = rows.filter((r) => at(r)?.w == null).length
  const weight = (w: number | null) => (group && w != null && w < 0.001 ? '<0.1%' : pct(w))
  const leftNames = left.map((s, i) => {
    const why = companies[s]?.latestNote ?? companies[s]?.noDataReason
    return <span key={s}>{i > 0 && '; '}<a href={href('company', s)}>{nameOf(s)}</a>{why && `, ${lowerFirst(why)}`}</span>
  })

  const columns: Column<Row>[] = [
    { key: 'name', label: 'Company', render: (r) => <span className="name-cell"><Logo symbol={r.symbol} name={r.co.name} /><a href={href('company', r.symbol)}>{r.co.name}<span className="sub">{r.co.industry}</span></a></span>, sort: (r) => r.co.name, csv: (r) => r.co.name },
    ...(xs.length > 1 ? [{ key: 'trend', label: 'Trend', mobile: 'hide' as const, priority: 2 as const, render: (r: Row) => <Sparkline values={xs.map((k) => (r.co.years[k]?.wKind === 'reported' ? r.co.years[k].w : null))} label={`${r.co.name} trend`} /> }] : []),
    ...(uk ? [] : [{ key: 'weight', label: 'Weight', right: true, render: (r: Row) => weight(r.weight), sort: (r: Row) => r.weight }]),
    { key: 'w', label: `${m.wageLabel} ${fy(LATEST)}`, short: 'Share of pay', mobile: 'value', phone: (r) => <><ShareFigure year={at(r)} />{fallback(r)}</>, render: (r) => <><span className="nowrap"><Meter value={at(r)?.w} parity={m.parity} /> <DataBadge year={at(r)} /></span>{fallback(r)}</>, sort: (r) => at(r)?.w ?? null, csv: (r) => (r.yr === LATEST ? at(r)?.w ?? null : null) },
    ...(PREV ? [{ key: 'chg', label: `Change since ${fy(PREV)}`, short: '1-year change', right: true, mobile: 'second' as const, phone: (r: Row) => <Change value={yoyChange(r.co)} hideMissing />, render: (r: Row) => <Change value={yoyChange(r.co)} />, sort: (r: Row) => yoyChange(r.co) }] : []),
    { key: 'f', label: m.workforceLabel, right: true, render: (r: Row) => pct(workforce(r.co, at(r))), sort: (r: Row) => workforce(r.co, at(r)) },
    ...(jp || eu
      ? [
          { key: 'pay', label: 'Wage parity', right: true, render: (r: Row) => pct(payRatio(r.co, at(r)), 0), sort: (r: Row) => payRatio(r.co, at(r)) },
          ...(jp ? [{ key: 'b', label: 'Women officers', priority: 3 as const, right: true, render: (r: Row) => pct(boardShare(at(r)) ?? at(r)?.boardShareReported), sort: (r: Row) => boardShare(at(r)) ?? at(r)?.boardShareReported ?? null }] : []),
        ]
      : uk
      ? [
          { key: 'top', label: 'Women in top pay quarter', priority: 3 as const, right: true, render: (r: Row) => pct(at(r)?.topQuartile), sort: (r: Row) => at(r)?.topQuartile ?? null },
          { key: 'gap', label: 'Mean pay gap', right: true, render: (r: Row) => pct(at(r)?.gapMean), sort: (r: Row) => at(r)?.gapMean ?? null },
        ]
      : [{ key: 'b', label: 'Women on board', priority: 3 as const, right: true, render: (r: Row) => { const yy = at(r); return yy?.board ? `${yy.boardWomen} of ${yy.board}` : 'n/a' }, sort: (r: Row) => boardShare(at(r)) }]),
  ]

  const trendTable = (
    <DataTable caption="Trend table" bare rows={xs} rowKey={(k) => k} initial={{ key: 'year', dir: 1 }} columns={[
      { key: 'year', label: 'Year', render: (k) => fy(k), sort: (k) => k },
      { key: 'h', label: m.wageLabel, short: 'Share of pay', right: true, mobile: 'value', render: (k) => pct(ix.years[k].headline) },
      { key: 'n', label: 'Companies covered', right: true, render: (k) => num(ix.years[k].companiesCovered) },
      { key: 'chg', label: 'Like-for-like change', right: true, render: (k) => {
        const i = xs.indexOf(k)
        const pair = i > 0 ? `${xs[i - 1]}>${k}` : ''
        const yy = pair ? publishedChange(ix, pair) : undefined
        if (!yy) return group && ix.yoy[pair] ? <>n/a<span className="sub">Held back</span></> : 'n/a'
        return <><Change value={yy.change} /><span className="sub">{num(yy.companies)} companies{group && yy.interval ? `, ${range(yy)}` : ''}</span></>
      } },
    ]} />
  )
  const change = !PREV
    ? <div className="tile-context"><span className="muted">First snapshot</span></div>
    : !group
    ? <div className="tile-context"><Change value={ch ? ch.change : null} /> <span className="muted">since {fy(PREV)}, {ch?.companies ?? 0} companies like for like</span></div>
    : ch
    ? <>
        <div className="tile-context"><Change value={ch.change} /> <span className="meta">since {fy(PREV)}{ch.interval && `, ${range(ch)}`}{ch.distinguishable === false && ', not distinguishable from zero'}</span></div>
        <div className="tile-context meta">{num(ch.companies)} companies like for like{ch.basisChanges != null && `, ${num(ch.basisChanges)} basis changes left out`}</div>
      </>
    : <div className="tile-context meta">{heldBack ? `Change held back: ${pct(y.carriedPayrollShare, 0)} of payroll carried forward${carried.length ? `, including ${andList(carried)}` : ''}` : 'Level only'}</div>
  const headline = (
    <>
      <div className="tile-label">{headlineLabel} · {fy(LATEST)}</div>
      <div className="tile-value hero">{pct(y.headline)}</div>
      {group && <>
        <div className="tile-context">₹{Math.round(y.headline * 100)} of every ₹100 these companies pay</div>
        {y.medianCompany && <div className="tile-context meta">Median company {pct(y.medianCompany.w)}</div>}
      </>}
      {change}
      <ParityTrack value={y.headline} parity={m.parity} />
      <div className="tile-context muted">{uk ? m.coverage(y.companiesCovered) : group ? `${num(y.companiesCovered)} of ${num(members.length)} companies covered` : `${m.coverage(y.companiesCovered)} · ${pct(y.reportedPayrollShare, 0)} of payroll reported`}</div>
    </>
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
        <p className="meta crumbs">{ix.exchange} · <a href={href('index', ix.id, 'companies')}>{num(members.length)} companies</a> · {group ? 'weighted by payroll' : `members as of ${ix.weightsAsOf}, ${weightNote}`}</p>
        <Tabs label="Index sections" current={current[0]} items={INDEX_TABS.map(([t, label]) => ({ id: t, label, href: t === 'overview' ? href('index', ix.id) : href('index', ix.id, t) }))} />
      </section>

      {current[0] === 'overview' && <>
      <section>
        <div className="grid g2">
          {!group && GUESS_FIRST.has(ix.id)
            ? <GuessFirst name={ix.name} answer={Math.round(y.headline * 100)} item={ix.id === 'nifty50' ? `nv-in-nifty50-payshare-${LATEST}` : undefined}>{headline}</GuessFirst>
            : <div className="card">{headline}</div>}
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
                    <tr><td>Excluded (adjusted gap only, partial scope, not material) or not yet read</td><td className="r nowrap"><strong>{(y.excluded ?? 0) + (y.unresolved ?? 0)}</strong></td></tr>
                  </tbody>
                ) : jp ? (
                  <tbody>
                    <tr><td>{m.workforceLabel}</td><td className="r nowrap"><strong>{pct(y.workforce)}</strong></td></tr>
                    <tr><td>Women in management</td><td className="r nowrap"><strong>{pct(y.managers)}</strong></td></tr>
                    <tr><td>Women among officers<span className="sub">Directors, auditors and executive officers</span></td><td className="r nowrap"><strong>{pct(y.boards)}</strong></td></tr>
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
            <div className="tile-label">{group ? 'Total payroll' : 'For every ₹10 lakh invested'} · {fy(LATEST)}</div>
            <table>
              <caption className="sr-only">{group ? 'Total payroll' : 'Payroll owned per ₹10 lakh'}</caption>
              {group ? (
                <tbody>
                  <tr><td>Total payroll</td><td className="r"><strong className="nowrap">{cr(y.ownedPayroll)}</strong> a year</td></tr>
                  <tr><td>Paid to women</td><td className="r nowrap"><strong>{cr(y.womenWages)}</strong></td></tr>
                  <tr><td>Gap to parity</td><td className="r nowrap"><strong>{cr(y.gap)}</strong></td></tr>
                  <tr><td>{m.workforceLabel}{y.medianCompany && <span className="sub">Median company {pct(y.medianCompany.fPerm)}</span>}</td><td className="r nowrap"><strong>{pct(y.workforce)}</strong></td></tr>
                </tbody>
              ) : (
                <tbody>
                  <tr><td>Payroll you own</td><td className="r nowrap"><strong>{inr(y.ownedPayroll ?? 0)}</strong> a year</td></tr>
                  <tr><td>Paid to women</td><td className="r nowrap"><strong>{inr(y.womenWages ?? 0)}</strong></td></tr>
                  <tr><td>Gap to parity</td><td className="r nowrap"><strong>{inr(y.gap ?? 0)}</strong></td></tr>
                </tbody>
              )}
            </table>
            {group && ch?.staffChange != null && <p className="small" style={{ marginTop: 12 }}><Change value={ch.staffChange} /> <span className="meta">staff since {fy(PREV)}, {num(ch.staffCompanies ?? 0)} companies like for like{ch.basisChanges != null && `, ${num(ch.basisChanges)} basis changes left out`}</span></p>}
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
          {!group && <><strong>Median company:</strong> {!ready ? <Skeleton line label="Loading the median company" /> : <>{sE ? <>women are <strong>{pct(sE.median)}</strong> of staff and </> : null}earn <strong>{sW ? pct(sW.median) : 'n/a'}</strong> of men's pay.</>}{' '}</>}
          <a className="go" href={href('compare', 'countries')}>Compare markets</a>
        </p>
      </section>
      {ix.country === 'IN' && !group && <ForecastBlock subject={`in:${ix.id}:payshare:fy${nextYear(LATEST)}`} />}

      {group && (
        <section>
          <h2>Coverage, {fy(LATEST)}</h2>
          <dl className="details card">
            <div><dt>Reported</dt><dd>{num(y.companiesReported)} companies, {pct(y.reportedPayrollShare)} of payroll</dd></div>
            {PREV && <div><dt>Carried forward from {fy(PREV)}</dt><dd>{num(y.companiesCarried ?? 0)} companies, {pct(y.carriedPayrollShare ?? 0)} of payroll</dd></div>}
            <div><dt>Estimated share of pay</dt><dd>{num(y.companiesEstimated ?? 0)} companies, {pct(y.estimatedPayrollShare ?? 0)} of payroll</dd></div>
            <div><dt>Estimated weight</dt><dd>{pct(y.weightEstimatedPayrollShare ?? 0)} of payroll</dd></div>
            <div><dt>No payroll figure</dt><dd>{num(y.companiesWithoutPayroll ?? 0)} companies, left out of the ₹ figures</dd></div>
            {!!y.companiesUncovered && <div><dt>No usable figure</dt><dd>{num(y.companiesUncovered)} companies</dd></div>}
            <div><dt>Staff with known payroll</dt><dd>{pct(y.staffWithPayrollShare)}</dd></div>
            {left.length > 0 && <div className="wide"><dt>Left the group</dt><dd>{ready ? leftNames : <Skeleton line label="Loading the companies that left" />}</dd></div>}
          </dl>
          <p className="small muted" style={{ marginTop: 10 }}><a className="go" href={href('method')}>Method</a></p>
        </section>
      )}

      {xs.length < 2 ? (
        <section>
          <h2>The trend</h2>
          <EmptyState art="notEnough" title="One snapshot so far">Mostly FY25. The trend starts next year.</EmptyState>
        </section>
      ) : (
      <section>
        <h2>The trend</h2>
        <ChartFrame title={headlineLabel} sub={`${fy(xs[0])} to ${fy(LATEST)} · ${group ? `${num(y.companiesCovered)} companies covered` : m.coverage(y.companiesCovered)} in ${fy(LATEST)}`} table={trendTable}>
        <LineChart
          ariaLabel={`${ix.name}: ${headlineLabel.toLowerCase()}, by year`}
          xs={xs} xLabel={fy} fmt={pctTick}
          reference={{ y: m.parity, label: `Parity ${pct(m.parity, 0)}` }}
          yMax={m.parity}
          series={[{ id: 'h', label: headlineLabel, short: group ? 'Group' : 'Index', color: 'var(--s1)', points: xs.map((k) => ({ x: k, y: ix.years[k].headline })) }]}
        />
        </ChartFrame>
        <p className="small muted" style={{ marginTop: 10 }}>{group ? "Each year weighs companies by that year's payroll. A company with no new filing carries its last figure." : TREND_NOTE[ix.country]}</p>
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
              ...(uk ? [] : [{ key: 'p', label: group ? 'Share of payroll' : 'Share of payroll owned', right: true, render: (s: Sector) => pct(s.payrollShare), sort: (s: Sector) => s.payrollShare }]),
              { key: 'n', label: 'Companies', right: true, render: (s) => s.companies, sort: (s) => s.companies },
            ]} />
          )}>
          <SectorBars sectors={y.sectors} parity={m.parity} payroll={group ? 'all payroll' : undefined} />
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
        <p className="small muted" style={{ marginTop: 10 }}>{group ? 'The 50 largest payrolls. Excludes companies whose reporting basis changed, and moves over 15 pp.' : 'Excludes companies whose reporting basis changed.'}</p>
      </section>}

      {current[0] === 'companies' && <section>
        <h2>{group ? ix.name : `All ${ix.name} companies`}</h2>
        {!ready ? <TableSkeleton rows={10} label="Loading companies" /> : <>
        <DataTable caption={`${ix.name} ${group ? 'companies' : 'constituents'}`} columns={columns} rows={rows} rowKey={(r) => r.symbol} initial={{ key: uk ? 'w' : 'weight', dir: -1 }} rowHref={(r) => href('company', r.symbol)}
          urlState limit={20} rank download={`${ix.id}-companies`} summary={`${num(rows.length)} companies`} />
        <p className="small muted key-note">≈ estimated. pp: percentage points.</p>
        {group ? (noWeight > 0 || noFigure > 0) && (
          <p className="small" style={{ marginTop: 12 }}>
            <strong>Gaps:</strong>{' '}
            {noWeight > 0 && <>not in the {fy(LATEST)} figure, so no weight: {num(noWeight)} companies. </>}
            {noFigure > 0 && <>No usable share of pay: {num(noFigure)} companies.</>}
          </p>
        ) : (ix.missing.length > 0 || noData.length > 0 || noStaff.length > 0 || noSplit.length > 0) && (
          <p className="small" style={{ marginTop: 12 }}>
            <strong>Gaps:</strong>{' '}
            {ix.missing.length > 0 && <>no market data for {ix.missing.join(', ')}. </>}
            {noStaff.length > 0 && (eu
              ? <>No verified figure: {noStaff.map((r) => r.co.name).join(', ')}. </>
              : jp
              ? <>Not in the government database: {noStaff.map((r) => r.co.name).join(', ')}. </>
              : !uk
              ? <>No BRSR figure: {noStaff.map((r) => r.co.name).join(', ')}. </>
              : <>No {ix.country === 'GB' ? 'UK gender pay gap' : 'WGEA'} report (no staff, or no local employer above the threshold): {noStaff.map((r) => r.co.name).join(', ')}. </>)}
            {noSplit.length > 0 && <>No workforce split, so not in the headline: {noSplit.map((r) => r.co.name).join(', ')}. </>}
            {noData.length > 0 && <>No usable {fy(LATEST)} data for {noData.map((r) => r.co.name).join(', ')}.</>}
          </p>
        )}
        {group && left.length > 0 && <p className="small" style={{ marginTop: 12 }}><strong>Left the group:</strong> {leftNames}.</p>}
        </>}
      </section>}
    </>
  )
}
