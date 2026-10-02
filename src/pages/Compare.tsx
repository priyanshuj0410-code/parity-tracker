import { useState } from 'react'
import { ChartFrame } from '../components/ChartFrame'
import { Dropdown } from '../components/Dropdown'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { ParityMap } from '../components/ParityMap'
import { RangeDots, type RangeRow } from '../components/RangeDots'
import { Segmented } from '../components/Segmented'
import { DataTable, type Column } from '../components/DataTable'
import { Tabs } from '../components/Tabs'
import { BASIS, COMPARE_MARKETS, E_PARITY, MEASURE, POINTS, SECTORS, W_PARITY, indexPoints, marketName, marketPoints, summarise, type Measure, type Point, type Summary } from '../lib/compare'
import { INDEX_ORDER, indexMarket, indexes } from '../lib/data'
import { pct } from '../lib/format'
import { href } from '../lib/router'

const TABS = [
  { id: 'countries', label: 'Countries', href: href('compare', 'countries') },
  { id: 'sectors', label: 'Sectors', href: href('compare', 'sectors') },
  { id: 'map', label: 'Parity map', href: href('compare', 'map') },
]
const MAX: Record<Measure, number> = { e: 1, w: 1.4, s: 1 }
const MEASURES: { id: Measure; label: string }[] = [{ id: 'w', label: 'Wage parity' }, { id: 'e', label: 'Employment parity' }, { id: 's', label: 'Share of pay' }]
const MAP_MARKETS = COMPARE_MARKETS

const med = (s: Summary | null) => (s && s.n >= 3 ? pct(s.median) : <span className="muted">n/a</span>)
const iqr = (s: Summary) => `middle half ${Math.round(s.q1 * 100)}–${pct(s.q3, 0)}`

function SummaryCell({ s, measure, min = 3, n = false }: { s: Summary | null; measure: Measure; min?: number; n?: boolean }) {
  if (!s) return <span className="muted">not reported</span>
  if (s.n < min) return <span className="muted">{s.n} {s.n === 1 ? 'company' : 'companies'}</span>
  return <><Meter value={s.median} parity={MEASURE[measure].parity} max={MAX[measure]} /><span className="sub">{iqr(s)}{n ? ` · ${s.n}` : ''}</span></>
}

function Countries() {
  const rows = COMPARE_MARKETS.map((code) => {
    const pts = marketPoints(code)
    return { code, e: summarise(pts.map((p) => p.e)), w: summarise(pts.map((p) => p.w)), s: summarise(pts.map((p) => p.s)) }
  })
  type Row = (typeof rows)[number]
  const ranges = (k: Measure): RangeRow[] => rows.map((r) => ({
    key: r.code, label: marketName(r.code),
    sub: r[k] ? `${r[k]!.n} companies · ${k === 'w' ? BASIS[r.code].wage.split(',')[0] : BASIS[r.code].employment ?? ''}` : 'not reported',
    s: r[k],
  }))
  const columns: Column<Row>[] = [
    { key: 'm', label: 'Market', render: (r) => <><strong>{marketName(r.code)}</strong><span className="sub">{r.w?.n ?? 0} companies</span></>, sort: (r) => marketName(r.code), csv: (r) => marketName(r.code) },
    { key: 'e', label: 'Employment parity', phone: (r) => med(r.e), render: (r) => <SummaryCell s={r.e} measure="e" />, sort: (r) => r.e?.median ?? null },
    { key: 'w', label: 'Wage parity', phone: (r) => med(r.w), render: (r) => <SummaryCell s={r.w} measure="w" />, sort: (r) => r.w?.median ?? null },
    { key: 's', label: 'Implied share of pay', short: 'Share of pay', phone: (r) => med(r.s), render: (r) => <SummaryCell s={r.s} measure="s" />, sort: (r) => r.s?.median ?? null },
    { key: 'b', label: 'What is measured', priority: 2, mobile: 'hide', render: (r) => <span className="small">{BASIS[r.code].employment ? `Women's share of ${BASIS[r.code].employment}; ` : 'No workforce split yet; '}{BASIS[r.code].wage}</span> },
  ]
  type IxRow = { id: string; pts: Point[] }
  const ixRows: IxRow[] = INDEX_ORDER.map((id) => ({ id, pts: indexPoints(id) }))
  const ixCols: Column<IxRow>[] = [
    { key: 'name', label: 'Index', render: (r) => <a href={href('index', r.id)}>{indexes[r.id].name}<span className="sub">{indexes[r.id].market}</span></a>, sort: (r) => indexes[r.id].name, csv: (r) => indexes[r.id].name },
    { key: 'n', label: 'Companies with data', short: 'With data', right: true, mobile: 'second', render: (r) => `${r.pts.length} of ${indexes[r.id].constituents.length + indexes[r.id].missing.length}`, sort: (r) => r.pts.length },
    { key: 'e', label: 'Employment parity', phone: (r) => med(summarise(r.pts.map((p) => p.e))), render: (r) => <SummaryCell s={summarise(r.pts.map((p) => p.e))} measure="e" />, sort: (r) => summarise(r.pts.map((p) => p.e))?.median ?? null },
    { key: 'w', label: 'Wage parity', phone: (r) => med(summarise(r.pts.map((p) => p.w))), render: (r) => <SummaryCell s={summarise(r.pts.map((p) => p.w))} measure="w" />, sort: (r) => summarise(r.pts.map((p) => p.w))?.median ?? null },
    { key: 's', label: 'Implied share of pay', short: 'Implied share', phone: (r) => med(summarise(r.pts.map((p) => p.s))), render: (r) => <SummaryCell s={summarise(r.pts.map((p) => p.s))} measure="s" />, sort: (r) => summarise(r.pts.map((p) => p.s))?.median ?? null },
    { key: 'h', label: 'Headline share of pay', short: 'Share of pay', right: true, mobile: 'value', phone: (r) => { const m = indexMarket(indexes[r.id]); return pct(indexes[r.id].years[m.latest].headline) }, render: (r) => { const m = indexMarket(indexes[r.id]); return <>{pct(indexes[r.id].years[m.latest].headline)}<span className="sub">{m.label(m.latest) === 'latest' ? 'share of pay' : `share of pay, ${m.label(m.latest)}`}</span></> } },
  ]
  return (
    <>
      <div className="callout">
        <p><strong>Two scales that mean the same thing everywhere.</strong> Each market's law asks for different numbers, so we convert what each company reports into two measures:</p>
        <ul className="tight">
          <li><strong>Employment parity:</strong> women's share of staff. Parity is 50%.</li>
          <li><strong>Wage parity:</strong> women's average pay as a share of men's. Parity is 100%.</li>
        </ul>
        <p className="small">Together they imply women's share of the pay bill: E×W ÷ (E×W + 1 − E). Bases still differ (hourly, annual, full-time equivalent), so read gaps of a few points as noise. <a href={href('method')}>How we compare</a></p>
      </div>
      <div className="grid g2" style={{ marginTop: 24 }}>
        <ChartFrame title="Employment parity by market" sub="Women's share of staff, median company"
          table={<DataTable caption="Employment parity by market" columns={columns.filter((c) => c.key !== 'w' && c.key !== 's')} rows={rows} rowKey={(r) => r.code} initial={{ key: 'e', dir: -1 }} />}>
          <RangeDots label="Employment parity by market" rows={ranges('e')} parity={E_PARITY} max={1} />
        </ChartFrame>
        <ChartFrame title="Wage parity by market" sub="Women's average pay as a share of men's, median company"
          table={<DataTable caption="Wage parity by market" columns={columns.filter((c) => c.key !== 'e' && c.key !== 's')} rows={rows} rowKey={(r) => r.code} initial={{ key: 'w', dir: -1 }} />}>
          <RangeDots label="Wage parity by market" rows={ranges('w')} parity={W_PARITY} max={MAX.w} />
        </ChartFrame>
      </div>
      <h2 style={{ marginTop: 40 }}>Markets side by side</h2>
      <p className="small muted">The median company in each market, from its latest reported year.</p>
      <DataTable caption="Markets on the shared scales" columns={columns} rows={rows} rowKey={(r) => r.code} initial={{ key: 'w', dir: -1 }} download="parity-by-market" summary={`${rows.length} markets`} />
      <h2 style={{ marginTop: 40 }}>Every index on the same scales</h2>
      <p className="small muted">The median constituent company. Each index's own headline is shown for reference.</p>
      <DataTable caption="Indexes on the shared scales" columns={ixCols} rows={ixRows} rowKey={(r) => r.id} initial={{ key: 'w', dir: -1 }} rowHref={(r) => href('index', r.id)} download="parity-by-index" summary={`${ixRows.length} indexes`} />
      <p className="small muted" style={{ marginTop: 10 }}>Every index headline is now women's share of pay, so the last column reads on one 50% scale. India's wage parity is derived from the wage share and the share of permanent staff, so it is approximate. Japan's workforce split is regular staff only.</p>
    </>
  )
}

function Sectors() {
  const [measure, setMeasure] = useState<Measure>('w')
  const [market, setMarket] = useState('IN')
  const cell = (code: string, sector: string) => summarise(marketPoints(code).filter((p) => p.sector === sector).map((p) => p[measure]))
  const rows: RangeRow[] = SECTORS.map((s) => ({ key: s, label: s, s: cell(market, s) }))
    .sort((a, b) => (b.s && b.s.n >= 3 ? b.s.median : -1) - (a.s && a.s.n >= 3 ? a.s.median : -1))
  const empty = rows.every((r) => !r.s)
  type MRow = { sector: string }
  const mcols: Column<MRow>[] = [
    { key: 'sector', label: 'Sector', render: (r) => <strong>{r.sector}</strong>, sort: (r) => r.sector, csv: (r) => r.sector },
    ...COMPARE_MARKETS.map((code): Column<MRow> => ({
      key: code, label: marketName(code), mobile: code === 'IN' ? 'value' : undefined, phone: (r) => med(cell(code, r.sector)),
      render: (r) => <SummaryCell s={cell(code, r.sector)} measure={measure} n />,
      sort: (r) => { const s = cell(code, r.sector); return s && s.n >= 3 ? s.median : null },
    })),
  ]
  return (
    <>
      <div className="toolbar">
        <Segmented label="Measure" value={measure} onChange={setMeasure} options={MEASURES} />
        <span className="small muted">{MEASURE[measure].label}. {MEASURE[measure].note}</span>
      </div>
      <ChartFrame title={`${MEASURE[measure].short} by sector, ${marketName(market)}`} sub="Median company in each sector, with the middle half of companies. Sectors with fewer than three companies are not plotted."
        controls={<div className="pills compact" role="group" aria-label="Market">{COMPARE_MARKETS.map((c) => <button key={c} type="button" className={market === c ? 'pill on' : 'pill'} aria-pressed={market === c} onClick={() => setMarket(c)}>{marketName(c)}</button>)}</div>}
        table={<DataTable caption="Sectors" columns={[mcols[0], mcols.find((c) => c.key === market)!]} rows={SECTORS.map((sector) => ({ sector }))} rowKey={(r) => r.sector} initial={{ key: market, dir: -1 }} />}>
        {empty
          ? <p className="small muted">{marketName(market)} companies do not report a workforce split in the data we hold, so this measure is not available. Try wage parity.</p>
          : <RangeDots label={`${MEASURE[measure].short} by sector`} rows={rows} parity={MEASURE[measure].parity} max={MAX[measure]} />}
      </ChartFrame>
      <h2 style={{ marginTop: 40 }}>Every sector in every market</h2>
      <p className="small muted">{MEASURE[measure].short}, median company. Sectors follow a shared 11-sector scheme mapped from each exchange's own labels.</p>
      <DataTable caption="Sectors by market" columns={mcols} rows={SECTORS.map((sector) => ({ sector }))} rowKey={(r) => r.sector} initial={{ key: 'sector', dir: 1 }}
        download={`sectors-${measure}`} summary={`${SECTORS.length} sectors`} />
      {measure !== 'e' && <p className="small muted" style={{ marginTop: 10 }}>India's wage parity is derived from the wage share and the share of permanent staff, so treat Indian sector figures as approximate.</p>}
    </>
  )
}

function MapTab({ focus }: { focus?: string }) {
  const [view, setView] = useState<'one' | 'facets'>('one')
  const [market, setMarket] = useState('all')
  const [sector, setSector] = useState('all')
  const inSector = (p: Point) => sector === 'all' || p.sector === sector
  const on = (p: Point) => (market === 'all' || p.c.country === market) && inSector(p)
  const plotted = POINTS.filter((p) => p.e != null && p.w != null)
  const shown = plotted.filter(on)
  const pinned = shown.filter((p) => (p.w as number) > 1.5 || (p.w as number) < 0.3).length
  const columns: Column<Point>[] = [
    { key: 'name', label: 'Company', render: (p) => <span className="name-cell"><Logo symbol={p.c.symbol} name={p.c.name} /><a href={href('company', p.c.symbol)}>{p.c.name}<span className="sub">{marketName(p.c.country)}</span></a></span>, sort: (p) => p.c.name, csv: (p) => p.c.name },
    { key: 'sector', label: 'Sector', render: (p) => p.sector, sort: (p) => p.sector },
    { key: 'e', label: 'Employment parity', phone: (p) => pct(p.e), render: (p) => <Meter value={p.e} parity={E_PARITY} />, sort: (p) => p.e },
    { key: 'w', label: 'Wage parity', phone: (p) => p.w == null ? 'n/a' : `${p.c.country === 'IN' ? '≈' : ''}${pct(p.w)}`, render: (p) => <Meter value={p.w} parity={W_PARITY} max={MAX.w} approx={p.c.country === 'IN'} />, sort: (p) => p.w },
    { key: 's', label: 'Share of pay', mobile: 'value', phone: (p) => pct(p.s), render: (p) => <Meter value={p.s} parity={E_PARITY} />, sort: (p) => p.s },
  ]
  return (
    <>
      <div className="toolbar">
        <Segmented label="Layout" value={view} onChange={setView} options={[{ id: 'one', label: 'One map' }, { id: 'facets', label: 'By market' }]} />
        {view === 'one' && (
          <div className="pills compact" role="group" aria-label="Highlight a market">
            {['all', ...MAP_MARKETS].map((c) => <button key={c} type="button" className={market === c ? 'pill on' : 'pill'} aria-pressed={market === c} onClick={() => setMarket(c)}>{c === 'all' ? 'All markets' : marketName(c)}</button>)}
          </div>
        )}
        <Dropdown label="Sector" value={sector} onChange={setSector} options={[{ id: 'all', label: 'All sectors' }, ...SECTORS.map((s) => ({ id: s, label: s }))]} />
      </div>
      <ChartFrame title="Where companies sit on both scales" sub="Each dot is a company. Right of the line: half or more of staff are women. Above the line: women are paid at least as much as men on average."
        table={<DataTable caption="Companies on the parity map" columns={columns} rows={shown} rowKey={(p) => p.c.symbol} initial={{ key: 's', dir: -1 }} rowHref={(p) => href('company', p.c.symbol)} rank download="parity-map" summary={`${shown.length} companies`} />}>
        {view === 'one' ? (
          <ParityMap points={plotted} on={on} focus={focus} label="Parity map" />
        ) : (
          <div className="facets">
            {MAP_MARKETS.map((code) => (
              <div key={code}>
                <h4>{marketName(code)} <span className="muted">· {plotted.filter((p) => p.c.country === code && inSector(p)).length}</span></h4>
                <ParityMap compact height={260} points={plotted} on={(p) => p.c.country === code && inSector(p)} focus={focus} label={`Parity map, ${marketName(code)}`} />
              </div>
            ))}
          </div>
        )}
      </ChartFrame>
      <ul className="tight small" style={{ marginTop: 14 }}>
        <li><strong>Who is on the map:</strong> {plotted.length} companies that report both a workforce split and a pay comparison. Companies with only one of the two are in the tables but not on the map.</li>
        <li><strong>Bases differ:</strong> {MAP_MARKETS.map((c) => `${marketName(c)}: women's share of ${BASIS[c].employment}, ${BASIS[c].wage}`).join('. ')}.</li>
        {pinned > 0 && <li><strong>Off the chart:</strong> {pinned} {pinned === 1 ? 'company has' : 'companies have'} wage parity outside 30–150%, mostly derived Indian figures. They are pinned to the edge and drawn hollow.</li>}
      </ul>
    </>
  )
}

export function Compare({ tab, focus }: { tab?: string; focus?: string }) {
  const current = TABS.some((t) => t.id === tab) ? (tab as string) : 'countries'
  return (
    <>
      <section className="page-head">
        <h1>Compare <span className="accent">on the same scales</span></h1>
        <p className="lead">Every company and index, measured two ways that mean the same thing in every market: how many women they employ, and how women's pay compares with men's.</p>
        <Tabs label="Compare views" items={TABS} current={current} />
      </section>
      <section className="tab-panel">
        {current === 'countries' && <Countries />}
        {current === 'sectors' && <Sectors />}
        {current === 'map' && <MapTab focus={focus} />}
      </section>
    </>
  )
}
