import type { ReactNode } from 'react'
import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { ChartFrame } from '../components/ChartFrame'
import { EuGlance, EuSources } from '../components/EuDetail'
import { JapanGlance, JapanSources } from '../components/JapanDetail'
import { LineChart, type Series } from '../components/LineChart'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { ParityTrack } from '../components/ParityTrack'
import { SortTable, type Column } from '../components/SortTable'
import { Tabs } from '../components/Tabs'
import { BASIS, E_PARITY, POINTS, W_PARITY, inMarket, marketName, pointOf, sectorOf, standing, type Point } from '../lib/compare'
import { boardShare, companies, euYear, indexName, marketOf, payRatio, shareChange, workforce, yoyChange } from '../lib/data'
import { crore, pct, pctTick } from '../lib/format'
import { href } from '../lib/router'
import type { Company as Co } from '../types'
import { NotFound } from './NotFound'

const TABS = [['overview', 'Overview'], ['trend', 'Trend'], ['peers', 'Peers'], ['sources', 'Data and sources']] as const
type Tab = (typeof TABS)[number][0]

const ticker = (c: Co) => c.symbol.replace(/^(ASX|TSE|EU)-/, '')

function ScaleCard({ label, value, parity, max, basis, rank, children }: {
  label: string; value: number | null | undefined; parity: number; max: number; basis: string; rank: string | null; children?: ReactNode
}) {
  return (
    <div className="card scale-card">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value == null ? 'n/a' : pct(value)}</div>
      <div className="tile-context muted">{basis}</div>
      {value != null && <ParityTrack value={value} parity={parity} max={max} />}
      {rank && <div className="standing">{rank}</div>}
      {children}
    </div>
  )
}

function Overview({ c, pt }: { c: Co; pt?: Point }) {
  const m = marketOf(c)
  const b = BASIS[c.country]
  const jp = c.country === 'JP'
  const eu = c.country === 'EU'
  const gb = c.country === 'GB'
  const uk = c.country !== 'IN'
  const desc = [...m.years].reverse()
  const latest = desc.find((k) => c.years[k]?.w != null) ?? desc.find((k) => c.years[k])
  const y = latest ? c.years[latest] : undefined
  const prevKey = latest ? m.years[m.years.indexOf(latest) - 1] : undefined
  const p = prevKey ? c.years[prevKey] : undefined
  const ratio = payRatio(c, y)
  const bs = boardShare(y)
  return (
    <>
      <section>
        <div className="section-head">
          <h2>On the shared scales</h2>
          {pt?.e != null && <a className="small" href={href('compare', 'map', c.symbol)}>See it on the parity map</a>}
        </div>
        <div className="grid g3">
          <ScaleCard label="Employment parity" value={pt?.e} parity={E_PARITY} max={1}
            basis={b.employment ? `Women's share of ${b.employment}. Parity is 50%.` : 'Workforce split not collected yet.'} rank={standing(pt, 'e')} />
          <ScaleCard label="Wage parity" value={pt?.w} parity={W_PARITY} max={1.4}
            basis={`Women's average pay as a share of men's${b.approx ? ', approximate' : ''}. Parity is 100%.`} rank={standing(pt, 'w')} />
          <ScaleCard label="Women's share of pay" value={pt?.s} parity={E_PARITY} max={1}
            basis="Implied by the two measures. Parity is 50%." rank={standing(pt, 's')} />
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {pt ? `From the ${m.label(pt.year) === 'latest' ? 'latest' : m.label(pt.year)} disclosure. ` : 'No reported figures to place on the shared scales. '}
          Wage basis: {b.wage}. Rankings compare companies {inMarket(c.country)} only, so differences between markets' rules do not distort them.
        </p>
      </section>

      <section>
        <h2>{jp ? 'Latest disclosure' : eu ? euYear(c) : latest ? m.label(latest) : ''} as reported</h2>
        {jp ? <JapanGlance c={c} /> : eu ? <EuGlance c={c} /> : (
          <div className="grid g4">
            <div className="card">
              <div className="tile-label">{m.wageLabel}</div>
              <div className="tile-value">{pct(y?.w)}</div>
              <div className="tile-context"><DataBadge year={y} /> <Change hideMissing value={latest ? yoyChange(c, latest, prevKey) : null} /></div>
            </div>
            <div className="card">
              <div className="tile-label">{m.workforceLabel}</div>
              <div className="tile-value">{pct(workforce(c, y))}</div>
              <div className="tile-context"><Change hideMissing value={shareChange(workforce(c, p), workforce(c, y))} /></div>
              {y?.permHeadcount ? <div className="tile-context muted">{y.permHeadcount.toLocaleString('en-IN')} permanent staff</div> : null}
              {gb && y?.entityCount ? <div className="tile-context muted">across {y.entityCount} UK {y.entityCount === 1 ? 'employer' : 'employers'}</div> : null}
            </div>
            {uk ? (
              <div className="card">
                <div className="tile-label">Women in the top pay quarter</div>
                <div className="tile-value">{pct(y?.topQuartile)}</div>
                <div className="tile-context"><Change hideMissing value={shareChange(p?.topQuartile, y?.topQuartile)} /></div>
                <div className="tile-context muted">The best-paid quarter of {gb ? 'UK' : 'Australian'} staff.</div>
              </div>
            ) : (
              <div className="card">
                <div className="tile-label">Women on the board</div>
                <div className="tile-value">{y?.board ? `${y.boardWomen} of ${y.board}` : 'n/a'}</div>
                <div className="tile-context">
                  {bs == null ? <span className="muted">Not reported</span> : y?.boardWomen === 0 ? 'No women on the board.' : y?.boardWomen === 1 ? 'Only the legal minimum of one.' : `${pct(bs, 0)} of seats`}
                </div>
              </div>
            )}
            <div className="card">
              <div className="tile-label">Women's average pay</div>
              <div className="tile-value">{ratio == null ? 'n/a' : gb ? `${Math.round(ratio * 100)}p` : uk ? `${Math.round(ratio * 100)}c` : `₹${Math.round(ratio * 100)}`}</div>
              <div className="tile-context muted">{gb
                ? `for every £1 men earn per hour (mean). Median hourly gap: ${pct(y?.gapMedian)}.`
                : uk
                  ? `for every $1 men earn, full-time equivalent (mean).${p?.gapMean != null && y?.gapMean != null ? ` The mean gap was ${pct(p.gapMean)} in ${m.label(prevKey ?? '')}.` : ''}`
                  : 'for every ₹100 paid to men, on average. Approximate: wage share compared with share of permanent staff.'}</div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function Trend({ c }: { c: Co }) {
  const m = marketOf(c)
  const fy = m.label
  const YEARS = m.years
  const uk = c.country !== 'IN'
  const gb = c.country === 'GB'
  if (c.country === 'JP') {
    return <section><p className="small muted">Japan's database holds one snapshot so far, mostly covering FY2025. The trend starts with next year's disclosures.</p></section>
  }
  if (c.country === 'EU') {
    const ys = YEARS.filter((k) => c.years[k])
    return (
      <section>
        <ChartFrame title="Women's average pay as a share of men's" sub="Unadjusted, from each year's CSRD statement"
          table={(
            <div className="table-wrap"><table className="data"><caption className="sr-only">Values by year</caption>
              <thead><tr><th>Year</th><th className="r">Pay as a share of men's</th><th className="r">Unadjusted gap</th><th>Data</th></tr></thead>
              <tbody>{ys.map((k) => <tr key={k}><td>{k}</td><td className="r">{pct(c.years[k].w)}</td><td className="r">{pct(c.years[k].gapMean)}</td><td><DataBadge year={c.years[k]} /></td></tr>)}</tbody>
            </table></div>
          )}>
          <LineChart ariaLabel={`${c.name}: women's pay as a share of men's, by year`} xs={YEARS} xLabel={fy} fmt={(v) => pct(v, 0)} yMax={1}
            reference={{ y: 1, label: 'Parity 100%' }} series={[{ id: 'w', label: m.wageLabel, short: 'Pay', color: 'var(--s1)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.w ?? null })) }]} />
        </ChartFrame>
        <p className="small muted" style={{ marginTop: 10 }}>2024 was the first CSRD reporting year, so the trend is short.</p>
      </section>
    )
  }
  const series: Series[] = [
    {
      id: 'w', label: m.wageLabel, short: uk ? 'Pay' : 'Wages', color: 'var(--s1)',
      points: YEARS.map((k) => ({ x: k, y: c.years[k]?.w ?? null, hollow: c.years[k]?.wKind === 'estimated', note: c.years[k]?.basisChange ? 'reporting basis changed' : undefined })),
    },
    { id: 'f', label: m.workforceLabel, short: uk ? 'Workforce' : 'Staff', color: 'var(--s2)', points: YEARS.map((k) => ({ x: k, y: workforce(c, c.years[k]) })) },
    uk
      ? { id: 't', label: 'Women in the top pay quarter', short: 'Top', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.topQuartile ?? null })) }
      : { id: 'b', label: 'Women on the board', short: 'Board', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: boardShare(c.years[k]) })) },
  ]
  const peak = Math.max(0, ...series.flatMap((s) => s.points.map((pt) => pt.y ?? 0)))
  const yMax = Math.max(0.5, Math.ceil(peak * 10) / 10)
  const rows = YEARS.filter((k) => c.years[k])
  const table = uk ? (
    <div className="table-wrap"><table className="data"><caption className="sr-only">Values by year</caption>
      <thead><tr><th>Year</th><th className="r">Pay to women</th><th className="r">Workforce</th><th className="r">Top quarter</th><th className="r">Mean gap</th><th className="r">Median gap</th><th className="r">Employers</th><th>Data</th></tr></thead>
      <tbody>{rows.map((k) => { const v = c.years[k]; return (
        <tr key={k}><td>{fy(k)}</td><td className="r">{pct(v.w)}</td><td className="r">{pct(v.fAll)}</td><td className="r">{pct(v.topQuartile)}</td><td className="r">{pct(v.gapMean)}</td><td className="r">{pct(v.gapMedian)}</td><td className="r">{v.entityCount}</td><td><DataBadge year={v} /></td></tr>
      ) })}</tbody>
    </table></div>
  ) : (
    <div className="table-wrap"><table className="data"><caption className="sr-only">Values by year</caption>
      <thead><tr><th>Year</th><th className="r">Wages to women</th><th className="r">Permanent staff</th><th className="r">Board</th><th className="r">Payroll</th><th>Data</th><th>Basis</th></tr></thead>
      <tbody>{rows.map((k) => { const v = c.years[k]; return (
        <tr key={k}><td>{fy(k)}</td><td className="r">{pct(v.w)}</td><td className="r">{pct(v.fPerm)}</td><td className="r">{v.board ? `${v.boardWomen} of ${v.board}` : 'n/a'}</td><td className="r">{crore(v.payrollCr)}</td><td><DataBadge year={v} /></td><td>{v.boundary || 'n/a'}</td></tr>
      ) })}</tbody>
    </table></div>
  )
  return (
    <section>
      <ChartFrame title="Trajectory" sub={series.map((s) => s.label).join(', ')} table={table}>
        <LineChart ariaLabel={`${c.name}: ${series.map((s) => s.label.toLowerCase()).join(', ')}, by year`}
          xs={YEARS} xLabel={fy} fmt={pctTick} yMax={yMax}
          reference={{ y: 0.5, label: 'Parity 50%' }} series={series} />
      </ChartFrame>
      <p className="small muted" style={{ marginTop: 10 }}>{gb
        ? 'Pay share is derived from each UK employer\'s mean hourly pay gap and the share of women in its workforce, combined across the group\'s UK employers by size band.'
        : uk
          ? `Pay share is derived from the group's mean full-time-equivalent pay gap and its share of women. ${fy(m.prev)} uses the ${fy(m.latest)} workforce share because the earlier release is not archived, so it is shown hollow.`
          : `Hollow points are estimates from median pay, not reported wage totals, and are not joined to the line. Wage data starts in ${fy('2022-23')}, when the field entered the filing format.`}</p>
    </section>
  )
}

function Peers({ c }: { c: Co }) {
  const sector = sectorOf(c)
  let peers = POINTS.filter((p) => p.c.country === c.country && p.sector === sector)
  let scope = `${sector} companies ${inMarket(c.country)}`
  if (peers.length < 4) {
    peers = POINTS.filter((p) => p.c.country === c.country)
    scope = `all companies ${inMarket(c.country)}, because fewer than four ${sector.toLowerCase()} companies report`
  }
  const eu = c.country === 'EU'
  const columns: Column<Point>[] = [
    { key: 'name', label: 'Company', render: (p) => <span className="name-cell"><Logo symbol={p.c.symbol} name={p.c.name} /><a href={href('company', p.c.symbol)}>{p.c.name}<span className="sub">{ticker(p.c)} · {p.c.industry}</span></a></span>, sort: (p) => p.c.name, csv: (p) => p.c.name },
    ...(eu ? [] : [{ key: 'e', label: 'Employment parity', render: (p: Point) => <Meter value={p.e} parity={E_PARITY} />, sort: (p: Point) => p.e }]),
    { key: 'w', label: 'Wage parity', render: (p) => <Meter value={p.w} parity={W_PARITY} max={1.4} approx={p.c.country === 'IN'} />, sort: (p) => p.w },
    ...(eu ? [] : [{ key: 's', label: 'Implied share of pay', render: (p: Point) => <Meter value={p.s} parity={E_PARITY} />, sort: (p: Point) => p.s }]),
    { key: 'chg', label: 'Change on last year', right: true, render: (p) => <Change value={yoyChange(p.c)} />, sort: (p) => yoyChange(p.c) },
  ]
  return (
    <section>
      <p className="small">Ranked against {scope}, with this company highlighted.</p>
      <SortTable caption={`Peers of ${c.name}`} columns={columns} rows={peers} rowKey={(p) => p.c.symbol} initial={{ key: 'w', dir: -1 }}
        rowHref={(p) => href('company', p.c.symbol)} rank current={c.symbol} scroll download={`peers-${ticker(c)}`} summary={`${peers.length} companies`} />
    </section>
  )
}

function Sources({ c }: { c: Co }) {
  const m = marketOf(c)
  const fy = m.label
  const gb = c.country === 'GB'
  if (c.country === 'JP') return <section><JapanSources c={c} /></section>
  if (c.country === 'EU') return <section><EuSources c={c} /></section>
  if (c.country !== 'IN') {
    return (
      <section>
        <ul className="tight">
          <li><strong>Source:</strong> {gb
            ? 'the UK government\'s gender pay gap service. Employers with 250 or more UK staff report each year, using a snapshot of pay in April.'
            : <>the Workplace Gender Equality Agency's employer gender pay gaps, {fy(m.latest)} release. Employers with 100 or more Australian staff report, and corporate groups report combined results. <a href="https://www.wgea.gov.au/data-statistics/data-explorer" target="_blank" rel="noreferrer">WGEA Data Explorer</a></>}</li>
          {m.years.filter((k) => c.years[k]?.basisChange).map((k) => <li key={k}><strong>{fy(k)}:</strong> the group's reporting employers or their size bands changed from the year before, so this year is left out of like-for-like comparisons.</li>)}
        </ul>
        {c.entities && c.entities.length > 0 && (
          <>
            <h3 style={{ marginTop: 20 }}>{gb ? 'UK employers counted' : 'WGEA reporting entity'} ({gb ? c.entitiesYear : fy(c.entitiesYear ?? m.latest)})</h3>
            <ul className="tight">
              {c.entities.map((e) => (
                <li key={e.name}>{e.name} ({gb ? `${e.size} staff` : e.size}){gb && e.link && /^https?:\/\//.test(e.link) ? <> · <a href={e.link} target="_blank" rel="noreferrer">employer's report</a></> : null}</li>
              ))}
            </ul>
            <p className="small muted">Employers are matched to the listed group by name. If one is missing or wrongly included, tell The Equal Lens team.</p>
          </>
        )}
      </section>
    )
  }
  const notes = m.years.filter((k) => c.years[k]?.note && c.years[k].note !== 'reported')
  return (
    <section>
      <ul className="tight">
        <li><strong>Index weight basis:</strong> payroll of {crore(c.payrollWeightCr)} ({c.payrollWeightBasis ?? 'not available'}).</li>
        {notes.map((k) => <li key={k}><strong>{fy(k)}:</strong> {c.years[k].note}{c.years[k].basisChange ? '; reporting basis changed from the year before, so this year is left out of like-for-like comparisons' : ''}.</li>)}
      </ul>
      <h3 style={{ marginTop: 20 }}>Source filings</h3>
      <ul className="tight">
        {Object.entries(c.filings).reverse().map(([k, f]) => (
          <li key={k}>{fy(k)} BRSR, filed {f.submitted}: <a href={f.xbrl} target="_blank" rel="noreferrer">XBRL</a> · <a href={f.pdf} target="_blank" rel="noreferrer">PDF</a></li>
        ))}
      </ul>
    </section>
  )
}

export function Company({ symbol, tab }: { symbol: string; tab?: string }) {
  const c = companies[symbol]
  if (!c) return <NotFound />
  const m = marketOf(c)
  const sector = sectorOf(c)
  const pt = pointOf(c.symbol)
  const hasData = m.years.some((k) => c.years[k])
  const current: Tab = TABS.some(([id]) => id === tab) ? (tab as Tab) : 'overview'
  return (
    <>
      <section className="page-head">
        <div className="meta"><a href={href('companies')}>Companies</a> / {marketName(c.country)} / {sector}</div>
        <div className="title-row">
          <Logo symbol={c.symbol} name={c.name} size={52} />
          <div>
            <h1>{c.name}</h1>
            <p className="meta">{c.exchange}: {ticker(c)} · {c.industry}{c.marketCapCr != null && <> · market cap {crore(c.marketCapCr)}</>}</p>
          </div>
        </div>
        <div className="chips">{c.indexes.map((id) => <a key={id} className="chip" href={href('index', id)}>{indexName(id)}</a>)}</div>
        {hasData && <Tabs label="Company sections" current={current} items={TABS.map(([id, label]) => ({ id, label, href: href('company', c.symbol, id) }))} />}
      </section>
      {!hasData ? (
        <section><p>{c.noDataReason ?? 'No BRSR filing is available for this company yet, so there is nothing to show. Recent listings file their first report after their first full financial year.'}</p></section>
      ) : current === 'trend' ? <Trend c={c} />
        : current === 'peers' ? <Peers c={c} />
          : current === 'sources' ? <Sources c={c} />
            : <Overview c={c} pt={pt} />}
    </>
  )
}
