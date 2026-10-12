import { Suspense, type ReactNode } from 'react'
import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { Calculations, GroupWeight } from '../components/Calculations'
import { ChartFrame } from '../components/ChartFrame'
import { EuGlance, EuSources } from '../components/EuDetail'
import { JapanGlance, JapanSources } from '../components/JapanDetail'
import { LevelBars, LevelSources } from '../components/LevelBars'
import { ReportRefs } from '../components/ReportSource'
import { LineChart, type Series } from '../components/LineChart'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { ParityTrack } from '../components/ParityTrack'
import { DataTable, type Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { BASIS, E_PARITY, POINTS, W_PARITY, inMarket, marketName, offMapReason, pointFor, sectorOf, standing, type Point } from '../lib/compare'
import { INDEX_ORDER, boardShare, companyInsights, sourceDate, euYear, indexName, indexes, isGroup, loadCompany, ticker, useCompany, useLoaded, useStage, isExcluded, marketOf, payRatio, shareChange, workforce, yoyChange } from '../lib/data'
import { crore, pct, pctTick } from '../lib/format'
import { correctionHref } from '../lib/contact'
import { href, usePageTitle } from '../lib/router'
import { COMPANY_TABS } from '../lib/tabs'
import type { Company as Co, Filing } from '../types'
import { NotFound } from './NotFound'
import { Skeleton, TableSkeleton } from '../components/Skeleton'

const TABS = COMPANY_TABS
type Tab = (typeof TABS)[number][0]

/** India's BRSR copies without an XBRL file, by where the PDF sits. */
const FILED: Record<NonNullable<Filing['kind']>, string> = { website: 'company website', annualReport: 'in the annual report', exchange: 'filed with the exchange' }
const isUrl = (s: string) => /^https?:\/\//.test(s)

/** The group the company belongs to, if any (India's All BRSR filers), and a note when it is outside the group's ₹ figure. */
function groupOf(c: Co) {
  const ix = c.indexes.map((id) => indexes[id]).find(isGroup)
  const note = !ix ? '' : ix.left?.includes(c.symbol) ? 'left the group' : ix.missing.includes(c.symbol) ? 'no payroll figure' : ''
  return { ix, note }
}

/** India: the newest year with the company's own levels or job functions, which may have no usable wage share. */
const levelYearOf = (c: Co) => [...marketOf(c).years].reverse().find((k) => c.years[k]?.levels?.length || c.years[k]?.functions?.length)

function ScaleCard({ label, value, parity, max, basis, rank, children, empty = 'n/a' }: {
  label: string; value: number | null | undefined; parity: number; max: number; basis: string; rank: ReactNode; children?: ReactNode; empty?: string
}) {
  return (
    <div className="card scale-card">
      <div className="tile-label">{label}</div>
      <div className={value == null ? 'tile-value none' : 'tile-value'}>{value == null ? empty : pct(value)}</div>
      <div className="tile-context muted">{basis}</div>
      {value != null && <ParityTrack value={value} parity={parity} max={max} />}
      {rank && <div className="standing">{rank}</div>}
      {children}
    </div>
  )
}

const TAB_NAME = { trend: 'Trend', peers: 'Peers', calculations: 'Calculations' } as const

/** Up to three facts the rules pick (src/lib/insights.ts, PARITY-134); nothing when no rule fires. */
function WhatStandsOut({ c }: { c: Co }) {
  const found = companyInsights(c)
  if (!found.length) return null
  return (
    <section>
      <h2>What stands out</h2>
      <ul className="card insights">
        {found.map((i) => (
          <li key={i.rule}>
            <span>{i.text}</span>
            {i.tab && <a className="go small" href={href('company', c.symbol, i.tab)}>{TAB_NAME[i.tab]}</a>}
          </li>
        ))}
      </ul>
      <p className="small muted"><a href={`${href('method')}#insights`}>How these are chosen</a></p>
    </section>
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
  const older = c.country === 'IN' && latest && !c.years[m.latest]
  const levelYear = levelYearOf(c)
  const y = latest ? c.years[latest] : undefined
  const prevKey = latest ? m.years[m.years.indexOf(latest) - 1] : undefined
  const p = prevKey ? c.years[prevKey] : undefined
  const ratio = payRatio(c, y)
  const bs = boardShare(y)
  const offMap = offMapReason(pt)
  const ranked = useLoaded('companies')
  const rank = (measure: 'e' | 'w' | 's') => (ranked ? standing(pt, measure) : <Skeleton line label="Ranking against other companies" />)
  return (
    <>
      {ranked && <WhatStandsOut c={c} />}
      <section>
        <div className="section-head">
          <h2>On the shared scales</h2>
          {!offMap && <a className="go small" href={href('compare', 'map', c.symbol)}>Parity map</a>}
        </div>
        {older && <p className="small"><strong>{c.latestNote ?? `No ${m.label(m.latest)} BRSR yet`}:</strong> showing {m.label(latest)}.</p>}
        <div className="grid g3">
          <ScaleCard label="Employment parity" value={pt?.e} parity={E_PARITY} max={1}
            basis={b.employment ? `Women's share of ${b.employment}. Parity is 50%.` : 'No workforce split yet.'} rank={rank('e')} />
          <ScaleCard label="Wage parity" value={pt?.w} parity={W_PARITY} max={1.4} empty={pt?.wRaw != null ? 'Not comparable' : 'n/a'}
            basis={pt?.wRaw != null
              ? `Derived ${pct(pt.wRaw, 0)} is outside 30-130%, so it is not ranked: wages and headcount cover different staff.`
              : `Women's average pay as a share of men's${b.approx ? ', approximate' : ''}. Parity is 100%.`} rank={rank('w')} />
          <ScaleCard label="Women's share of pay" value={pt?.s} parity={E_PARITY} max={1}
            basis="Implied by the two measures. Parity is 50%." rank={rank('s')} />
        </div>
        {offMap && <EmptyState art="offMap" title="Not on the parity map">The map needs both employment and wage parity. {offMap}</EmptyState>}
        <p className="small muted" style={{ marginTop: 10 }}>
          {pt ? `${m.label(pt.year) === 'latest' ? 'Latest' : m.label(pt.year)} disclosure. ` : 'No reported figures yet. '}
          Wage basis: {b.wage}. Ranked {inMarket(c.country)} only.
        </p>
      </section>

      <section>
        <h2>{jp ? 'Latest disclosure' : eu ? euYear(c) : latest ? m.label(latest) : ''} as reported</h2>
        {jp ? <JapanGlance c={c} /> : eu ? <EuGlance c={c} /> : (
          <div className="grid g4 tiles">
            <div className="card">
              <div className="tile-label">{m.wageLabel}</div>
              <div className="tile-value">{pct(y?.w)}</div>
              <div className="tile-context"><DataBadge year={y} quiet /> <Change hideMissing value={latest ? yoyChange(c, latest, prevKey) : null} /></div>
            </div>
            <div className="card">
              <div className="tile-label">{m.workforceLabel}</div>
              <div className="tile-value">{pct(workforce(c, y))}</div>
              <div className="tile-context"><Change hideMissing value={shareChange(workforce(c, p), workforce(c, y))} /></div>
              {y?.permHeadcount ? <div className="tile-context muted">of {y.permHeadcount.toLocaleString('en-IN')} permanent staff</div> : null}
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
            {uk && (
              <div className="card">
                <div className="tile-label">Wage parity</div>
                <div className="tile-value">{ratio == null ? 'n/a' : gb ? `${Math.round(ratio * 100)}p` : `${Math.round(ratio * 100)}c`}</div>
                <div className="tile-context muted">{gb
                  ? `per £1 men earn per hour (mean). Median hourly gap ${pct(y?.gapMedian)}.`
                  : `per $1 men earn, full-time equivalent (mean).${p?.gapMean != null && y?.gapMean != null ? ` The gap was ${pct(p.gapMean)} in ${m.label(prevKey ?? '')}.` : ''}`}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {levelYear && <section><LevelBars y={c.years[levelYear]} yearLabel={m.label(levelYear)} /></section>}
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
    return <section><EmptyState art="notEnough" title="One snapshot so far">Mostly FY25. The trend starts next year.</EmptyState></section>
  }
  if (c.country === 'EU') {
    const ys = YEARS.filter((k) => c.years[k])
    if (ys.length < 2) return <section><EmptyState art="notEnough" title="One year so far">One CSRD statement{ys[0] ? `, for ${ys[0]}` : ''}. The trend starts with the next.</EmptyState></section>
    return (
      <section>
        <ChartFrame level={2} title="Women's share of pay and of the workforce" sub="From CSRD statements: pay gap (S1-16), headcount by gender (S1-6)"
          table={(
            <DataTable caption="Values by year" bare rows={ys} rowKey={(k) => k} initial={{ key: 'year', dir: 1 }} columns={[
              { key: 'year', label: 'Year', render: (k) => k, sort: (k) => k },
              { key: 'w', label: 'Share of pay', right: true, mobile: 'value', render: (k) => pct(c.years[k].w) },
              { key: 'f', label: m.workforceLabel, right: true, render: (k) => pct(c.years[k].fAll) },
              { key: 'r', label: 'Wage parity', right: true, render: (k) => pct(payRatio(c, c.years[k]), 0) },
              { key: 'g', label: 'Unadjusted gap', right: true, render: (k) => pct(c.years[k].gapMean) },
              { key: 'd', label: 'Data', render: (k) => <DataBadge year={c.years[k]} /> },
            ]} />
          )}>
          <LineChart ariaLabel={`${c.name}: women's share of pay and of the workforce, by year`} xs={YEARS} xLabel={fy} fmt={pctTick}
            yMax={Math.max(0.5, Math.ceil(Math.max(0, ...ys.map((k) => Math.max(c.years[k].w ?? 0, c.years[k].fAll ?? 0))) * 10) / 10)}
            reference={{ y: 0.5, label: 'Parity 50%' }}
            series={[
              { id: 'w', label: m.wageLabel, short: 'Pay', color: 'var(--s1)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.w ?? null })) },
              { id: 'f', label: m.workforceLabel, short: 'Staff', color: 'var(--s2)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.fAll ?? null })) },
            ]} />
        </ChartFrame>
        <p className="small muted" style={{ marginTop: 10 }}>CSRD reporting began in 2024.</p>
      </section>
    )
  }
  const series: Series[] = [
    {
      id: 'w', label: m.wageLabel, short: 'Pay', color: 'var(--s1)',
      points: YEARS.map((k) => ({ x: k, y: c.years[k]?.w ?? null, hollow: c.years[k]?.wKind === 'estimated', note: c.years[k]?.basisChange ? 'reporting basis changed' : undefined })),
    },
    { id: 'f', label: m.workforceLabel, short: 'Staff', color: 'var(--s2)', points: YEARS.map((k) => ({ x: k, y: workforce(c, c.years[k]) })) },
    uk
      ? { id: 't', label: 'Women in the top pay quarter', short: 'Top', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.topQuartile ?? null })) }
      : { id: 'b', label: 'Women on the board', short: 'Board', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: boardShare(c.years[k]) })) },
  ]
  const peak = Math.max(0, ...series.flatMap((s) => s.points.map((pt) => pt.y ?? 0)))
  const yMax = Math.max(0.5, Math.ceil(peak * 10) / 10)
  const rows = YEARS.filter((k) => c.years[k])
  if (rows.length < 2) return <section><EmptyState art="notEnough" title="One year so far">One year of figures{rows[0] ? `, for ${fy(rows[0])}` : ''}. The trend starts with the next report.</EmptyState></section>
  const table = uk ? (
    <DataTable caption="Values by year" bare rows={rows} rowKey={(k) => k} initial={{ key: 'year', dir: 1 }} columns={[
      { key: 'year', label: 'Year', render: (k) => fy(k), sort: (k) => k },
      { key: 'w', label: m.wageLabel, short: 'Share of pay', right: true, mobile: 'value', render: (k) => pct(c.years[k].w) },
      { key: 'f', label: 'Workforce', right: true, render: (k) => pct(c.years[k].fAll) },
      { key: 't', label: 'Top quarter', right: true, render: (k) => pct(c.years[k].topQuartile) },
      { key: 'g', label: 'Mean gap', right: true, render: (k) => pct(c.years[k].gapMean) },
      ...(gb ? [
        { key: 'gm', label: 'Median gap', right: true, render: (k: string) => pct(c.years[k].gapMedian) },
        { key: 'e', label: 'Employers', right: true, render: (k: string) => c.years[k].entityCount },
      ] : []),
      { key: 'd', label: 'Data', render: (k) => <DataBadge year={c.years[k]} /> },
    ]} />
  ) : (
    <DataTable caption="Values by year" bare rows={rows} rowKey={(k) => k} initial={{ key: 'year', dir: 1 }} columns={[
      { key: 'year', label: 'Year', render: (k) => fy(k), sort: (k) => k },
      { key: 'w', label: 'Wages to women', right: true, mobile: 'value', render: (k) => pct(c.years[k].w) },
      { key: 'f', label: 'Permanent staff', right: true, render: (k) => pct(c.years[k].fPerm) },
      { key: 'b', label: 'Board', right: true, render: (k) => { const v = c.years[k]; return v.board ? `${v.boardWomen} of ${v.board}` : 'n/a' } },
      { key: 'p', label: 'Payroll', right: true, render: (k) => crore(c.years[k].payrollCr) },
      { key: 'd', label: 'Data', render: (k) => <DataBadge year={c.years[k]} /> },
      { key: 'basis', label: 'Basis', wide: true, render: (k) => c.years[k].boundary || 'n/a' },
    ]} />
  )
  return (
    <section>
      <ChartFrame level={2} title="Trajectory" sub={series.map((s) => s.label).join(', ')} table={table}>
        <LineChart ariaLabel={`${c.name}: ${series.map((s) => s.label.toLowerCase()).join(', ')}, by year`}
          xs={YEARS} xLabel={fy} fmt={pctTick} yMax={yMax}
          reference={{ y: 0.5, label: 'Parity 50%' }} series={series} />
      </ChartFrame>
      <p className="small muted" style={{ marginTop: 10 }}>{gb
        ? 'Derived from each UK employer\'s mean hourly pay gap and share of women, combined by size band.'
        : uk
          ? `Derived from the group's full-time-equivalent pay gap and share of women. ${fy(m.prev)} (hollow) uses ${fy(m.latest)} workforce shares.`
          : `Hollow points: estimated from median pay. Wage data starts in ${fy('2022-23')}.`}</p>
    </section>
  )
}

function Peers({ c }: { c: Co }) {
  useStage('companies')
  const sector = sectorOf(c)
  const m = marketOf(c)
  const older = (p: Point) => p.c.country === 'IN' && p.year !== m.latest
  let peers = POINTS.filter((p) => p.c.country === c.country && p.sector === sector)
  let scope = `${sector} companies ${inMarket(c.country)}`
  if (peers.length < 4) {
    peers = POINTS.filter((p) => p.c.country === c.country)
    scope = `all companies ${inMarket(c.country)}, because fewer than four ${sector.toLowerCase()} companies report`
  }
  const columns: Column<Point>[] = [
    { key: 'name', label: 'Company', render: (p) => <span className="name-cell"><Logo symbol={p.c.symbol} name={p.c.name} /><a href={href('company', p.c.symbol)}>{p.c.name}<span className="sub">{ticker(p.c.symbol)} · {p.c.industry}{older(p) && ` · ${m.label(p.year)} figure`}</span></a></span>, sort: (p) => p.c.name, csv: (p) => p.c.name },
    { key: 'e', label: 'Employment parity', phone: (p) => pct(p.e), render: (p) => <Meter value={p.e} parity={E_PARITY} />, sort: (p) => p.e },
    { key: 'w', label: 'Wage parity', phone: (p) => p.w == null ? 'n/a' : `${p.c.country === 'IN' ? '≈' : ''}${pct(p.w)}`, render: (p) => <Meter value={p.w} parity={W_PARITY} max={1.4} approx={p.c.country === 'IN'} />, sort: (p) => p.w },
    { key: 's', label: 'Share of pay', mobile: 'value', phone: (p) => pct(p.s), render: (p) => <Meter value={p.s} parity={E_PARITY} />, sort: (p) => p.s },
    { key: 'chg', label: 'Change on last year', short: '1-year change', right: true, mobile: 'second', phone: (p) => <Change value={yoyChange(p.c)} hideMissing />, render: (p) => <Change value={yoyChange(p.c)} />, sort: (p) => yoyChange(p.c) },
  ]
  return (
    <section>
      <p className="small">Ranked against {scope}, with this company highlighted.</p>
      <DataTable caption={`Peers of ${c.name}`} columns={columns} rows={peers} rowKey={(p) => p.c.symbol} initial={{ key: 's', dir: -1 }}
        rowHref={(p) => href('company', p.c.symbol)} urlState rank current={c.symbol} download={`peers-${ticker(c.symbol)}`} summary={`${peers.length} companies`} />
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
    const own = c.years[m.latest]?.reportSources
    return (
      <section>
        <ul className="tight">
          {own?.length ? (
            <li><strong>Source:</strong> no {gb ? 'UK employer in the group files with the UK gender pay gap service' : 'Australian employer in the group reports to WGEA'}, so the {fy(m.latest)} figures are the company's own, from its <ReportRefs sources={own} /> ({own.map((s) => s.scope).join('; ')}). They are not the statutory figures.</li>
          ) : <li><strong>Source:</strong> {gb
            ? 'UK gender pay gap service. Employers with 250+ UK staff, April pay snapshot.'
            : <>WGEA employer gender pay gaps, {fy(m.latest)} release. Employers with 100+ Australian staff; groups report combined. <a href="https://www.wgea.gov.au/data-statistics/data-explorer" target="_blank" rel="noreferrer">WGEA Data Explorer</a></>}</li>}
          {m.years.filter((k) => c.years[k]?.basisChange).map((k) => <li key={k}><strong>{fy(k)}:</strong> reporting employers changed, so not compared like for like.</li>)}
        </ul>
        {c.entities && c.entities.length > 0 && (
          <>
            <h2 className="h-sub">{gb ? 'UK employers counted' : 'WGEA reporting entity'} ({gb ? c.entitiesYear : fy(c.entitiesYear ?? m.latest)})</h2>
            <ul className="tight">
              {c.entities.map((e) => (
                <li key={e.name}>{e.name} ({gb ? `${e.size} staff` : e.size}){gb && e.link && /^https?:\/\//.test(e.link) ? <> · <a href={e.link} target="_blank" rel="noreferrer">employer's report</a></> : null}</li>
              ))}
            </ul>
            <p className="small muted">Matched by name. Wrong match? <a href={correctionHref(`${c.name} employers`)}>Report a correction</a>.</p>
          </>
        )}
      </section>
    )
  }
  const note = (k: string) => (c.years[k]?.note === 'reported' ? '' : c.years[k]?.note)
  const notes = m.years.filter((k) => note(k) || c.years[k]?.basisChange)
  const freeFloat = c.indexes.some((id) => indexes[id] && !isGroup(indexes[id]))
  const { ix: group } = groupOf(c)
  const levelYear = levelYearOf(c)
  return (
    <section>
      <ul className="tight">
        {freeFloat && <li><strong>Index weight basis:</strong> payroll of {crore(c.payrollWeightCr)} ({c.payrollWeightBasis ?? 'not available'}).</li>}
        {group && <li><strong>{group.name}:</strong> <GroupWeight c={c} ix={group} /></li>}
        {notes.map((k) => <li key={k}><strong>{fy(k)}:</strong> {[note(k), c.years[k].basisChange && 'basis changed, so not compared like for like'].filter(Boolean).join('; ').replace(/^./, (ch) => ch.toUpperCase())}.</li>)}
        {levelYear && <LevelSources y={c.years[levelYear]} yearLabel={fy(levelYear)} />}
      </ul>
      <h2 className="h-sub">Source filings</h2>
      <ul className="tight filings">
        {Object.entries(c.filings).reverse().map(([k, f]) => {
          const pdf = isUrl(f.pdf) && <a href={f.pdf} target="_blank" rel="noreferrer">PDF</a>
          return (
            <li key={k}>{f.xbrl
              ? <>{fy(k)} BRSR, filed {f.submitted}: <a href={f.xbrl} target="_blank" rel="noreferrer">XBRL</a>{pdf && <> · {pdf}</>}</>
              : pdf ? <>{fy(k)} BRSR, {FILED[f.kind ?? 'annualReport']}: {pdf}</> : <>{fy(k)} BRSR (copy not linked)</>}</li>
          )
        })}
      </ul>
    </section>
  )
}

export function Company({ symbol, tab }: { symbol: string; tab?: string }) {
  loadCompany(symbol)
  useStage('core')
  const c = useCompany(symbol)
  const tabLabel = tab && tab !== 'overview' ? TABS.find(([id]) => id === tab)?.[1] : undefined
  usePageTitle(!c ? 'Page not found' : tabLabel ? `${c.name} · ${tabLabel}` : c.name)
  if (!c) return <NotFound />
  const m = marketOf(c)
  const sector = sectorOf(c)
  const pt = pointFor(c)
  const hasData = m.years.some((k) => c.years[k])
  const group = groupOf(c)
  const listed = c.indexes.some((id) => INDEX_ORDER.includes(id))
  const current: Tab = TABS.some(([id]) => id === tab) ? (tab as Tab) : 'overview'
  return (
    <>
      <section className="page-head">
        <div className="meta crumbs"><a href={href('companies') + (listed ? '' : '?index=all')}>Companies</a> / {marketName(c.country)} / {sector}</div>
        <div className="title-row">
          <Logo symbol={c.symbol} name={c.name} size={52} />
          <div>
            <h1>{c.name}</h1>
            <p className="meta">{c.exchange}: {ticker(c.symbol)} · {c.industry}{c.marketCapCr != null && <> · market cap {crore(c.marketCapCr)}</>}{c.formerly && <> · Formerly {c.formerly}</>}</p>
          </div>
        </div>
        <p className="meta member-of">{c.indexes.map((id, i) => (
          <span key={id}>{i > 0 && ' · '}<a className="go" href={href('index', id)}>{indexName(id)}</a>{id === group.ix?.id && group.note && <span className="muted"> ({group.note})</span>}</span>
        ))}</p>
        {hasData && <Tabs label="Company sections" current={current} items={TABS.map(([id, label]) => ({ id, label, href: id === 'overview' ? href('company', c.symbol) : href('company', c.symbol, id) }))} />}
      </section>
      {!hasData ? (
        <section>{isExcluded(c)
          ? <EmptyState art="excluded" title="Figure excluded">{c.noDataReason}. Nivel uses unadjusted, company-wide figures only.</EmptyState>
          : <EmptyState art="reports" title="No gender pay report to show">{c.noDataReason ?? 'No BRSR filing yet. New listings file after their first full year.'}</EmptyState>}</section>
      ) : current === 'trend' ? <Trend c={c} />
        : current === 'peers' ? <Suspense fallback={<TableSkeleton rows={8} label="Loading peers" />}><Peers c={c} /></Suspense>
          : current === 'sources' ? <><Sources c={c} /><p className="small muted correction">Checked against the filings on {sourceDate()}. <a className="go" href={correctionHref(c.name)}>Report a correction</a></p></>
            : current === 'calculations' ? <Suspense fallback={<TableSkeleton rows={6} label="Loading the calculation" />}><Calculations c={c} pt={pt} /></Suspense>
            : <Overview c={c} pt={pt} />}
    </>
  )
}
