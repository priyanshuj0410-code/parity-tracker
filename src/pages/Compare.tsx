import { ChartFrame } from '../components/ChartFrame'
import { Dropdown } from '../components/Dropdown'
import { MarketPicker } from '../components/MarketPicker'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { ParityMap } from '../components/ParityMap'
import { RangeDots, type RangeRow } from '../components/RangeDots'
import { Segmented } from '../components/Segmented'
import { DataTable, type Column } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { BASIS, COMPARE_MARKETS, E_PARITY, MEASURE, POINTS, SECTORS, W_PARITY, indexPoints, marketName, marketPoints, offMapReason, pointOf, summarise, type Measure, type Point, type Summary } from '../lib/compare'
import { INDEX_ORDER, MARKET, companies, indexes, indexMarket, isGroup, useStage } from '../lib/data'
import { pct } from '../lib/format'
import { href, usePageTitle, useQueryState } from '../lib/router'
import { COMPARE_TABS } from '../lib/tabs'
import { PHONE, useMedia } from '../lib/useMedia'
import type { IndexData } from '../types'

const TABS = COMPARE_TABS.map(([id, label]) => ({ id, label, href: id === 'countries' ? href('compare') : href('compare', id) }))
const MAX: Record<Measure, number> = { e: 1, w: 1.4, s: 1 }
const MEASURES: { id: Measure; label: string }[] = [{ id: 'w', label: 'Wage parity' }, { id: 'e', label: 'Employment parity' }, { id: 's', label: 'Share of pay' }]
const MAP_MARKETS = COMPARE_MARKETS

const med = (s: Summary | null) => (s && s.n >= 3 ? pct(s.median) : <span className="muted">n/a</span>)
const iqr = (s: Summary) => `middle half ${Math.round(s.q1 * 100)}–${pct(s.q3, 0)}`
const count = (n: number) => n.toLocaleString('en-IN')
const members = (ix: IndexData) => ix.constituents.length + ix.missing.filter((s) => !ix.left?.includes(s)).length
/** A market with a group (India's All BRSR filers) compares every filer; the others, their index members. */
const population = () => {
  const groups = Object.values(indexes).filter(isGroup)
  return groups.length ? ` ${groups.map((g) => `${g.market}: ${g.name}`).join('; ')}; elsewhere, index members.` : ''
}

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
    sub: r[k] ? `${count(r[k]!.n)} companies · ${k === 'w' ? BASIS[r.code].wage.split(',')[0] : BASIS[r.code].employment ?? ''}` : 'not reported',
    s: r[k],
  }))
  const columns: Column<Row>[] = [
    { key: 'm', label: 'Market', render: (r) => <><strong>{marketName(r.code)}</strong><span className="sub">{count(r.w?.n ?? 0)} companies</span></>, sort: (r) => marketName(r.code), csv: (r) => marketName(r.code) },
    { key: 'e', label: 'Employment parity', phone: (r) => med(r.e), render: (r) => <SummaryCell s={r.e} measure="e" />, sort: (r) => r.e?.median ?? null },
    { key: 'w', label: 'Wage parity', phone: (r) => med(r.w), render: (r) => <SummaryCell s={r.w} measure="w" />, sort: (r) => r.w?.median ?? null },
    { key: 's', label: "Women's share of pay", short: 'Share of pay', phone: (r) => med(r.s), render: (r) => <SummaryCell s={r.s} measure="s" />, sort: (r) => r.s?.median ?? null },
    { key: 'b', label: 'What is measured', priority: 2, mobile: 'hide', render: (r) => <span className="small">{BASIS[r.code].employment ? `Women's share of ${BASIS[r.code].employment}; ` : 'No workforce split yet; '}{BASIS[r.code].wage}</span> },
  ]
  type IxRow = { id: string; pts: Point[] }
  const ixRows: IxRow[] = INDEX_ORDER.map((id) => ({ id, pts: indexPoints(id) }))
  const ixCols: Column<IxRow>[] = [
    { key: 'name', label: 'Index', render: (r) => <a href={href('index', r.id)}>{indexes[r.id].name}<span className="sub">{indexes[r.id].market}</span></a>, sort: (r) => indexes[r.id].name, csv: (r) => indexes[r.id].name },
    { key: 'n', label: 'Companies with data', short: 'With data', right: true, mobile: 'second', render: (r) => `${count(r.pts.length)} of ${count(members(indexes[r.id]))}`, sort: (r) => r.pts.length },
    { key: 'e', label: 'Employment parity', phone: (r) => med(summarise(r.pts.map((p) => p.e))), render: (r) => <SummaryCell s={summarise(r.pts.map((p) => p.e))} measure="e" />, sort: (r) => summarise(r.pts.map((p) => p.e))?.median ?? null },
    { key: 'w', label: 'Wage parity', phone: (r) => med(summarise(r.pts.map((p) => p.w))), render: (r) => <SummaryCell s={summarise(r.pts.map((p) => p.w))} measure="w" />, sort: (r) => summarise(r.pts.map((p) => p.w))?.median ?? null },
    { key: 's', label: 'Share of pay, median company', short: 'Median company', phone: (r) => med(summarise(r.pts.map((p) => p.s))), render: (r) => <SummaryCell s={summarise(r.pts.map((p) => p.s))} measure="s" />, sort: (r) => summarise(r.pts.map((p) => p.s))?.median ?? null },
    { key: 'h', label: ixRows.some((r) => isGroup(indexes[r.id])) ? 'Share of pay, whole index or group' : 'Share of pay, whole index', short: 'Share of pay', right: true, mobile: 'value', phone: (r) => { const m = indexMarket(indexes[r.id]); return pct(indexes[r.id].years[m.latest].headline) }, render: (r) => { const m = indexMarket(indexes[r.id]); return <>{pct(indexes[r.id].years[m.latest].headline)}<span className="sub">{m.label(m.latest) === 'latest' ? 'share of pay' : `share of pay, ${m.label(m.latest)}`}</span></> } },
  ]
  return (
    <>
      <div className="callout">
        <p><strong>Two scales, the same in every market:</strong></p>
        <ul className="tight">
          <li><strong>Employment parity:</strong> women's share of staff. Parity is 50%.</li>
          <li><strong>Wage parity:</strong> women's average pay as a share of men's. Parity is 100%.</li>
        </ul>
        <p className="small">Together they give women's share of pay: E×W ÷ (E×W + 1 − E). Pay bases differ by market. <a className="go" href={href('method')}>Method</a></p>
      </div>
      <div className="grid g2" style={{ marginTop: 24 }}>
        <ChartFrame level={2} title="Employment parity by market" sub="Women's share of staff, median company"
          table={<DataTable caption="Employment parity by market" summary={`${rows.length} markets`} columns={columns.filter((c) => c.key !== 'w' && c.key !== 's')} rows={rows} rowKey={(r) => r.code} initial={{ key: 'e', dir: -1 }} />}>
          <RangeDots label="Employment parity by market" rows={ranges('e')} parity={E_PARITY} max={1} />
        </ChartFrame>
        <ChartFrame level={2} title="Wage parity by market" sub="Women's average pay as a share of men's, median company"
          table={<DataTable caption="Wage parity by market" summary={`${rows.length} markets`} columns={columns.filter((c) => c.key !== 'e' && c.key !== 's')} rows={rows} rowKey={(r) => r.code} initial={{ key: 'w', dir: -1 }} />}>
          <RangeDots label="Wage parity by market" rows={ranges('w')} parity={W_PARITY} max={MAX.w} />
        </ChartFrame>
      </div>
      <h2 style={{ marginTop: 40 }}>Markets side by side</h2>
      <p className="small muted">Median company, latest year.{population()}</p>
      <DataTable caption="Markets on the shared scales" columns={columns} rows={rows} rowKey={(r) => r.code} initial={{ key: 'w', dir: -1 }} download="parity-by-market" summary={`${rows.length} markets`} />
      <h2 style={{ marginTop: 40 }}>Every index on the same scales</h2>
      <p className="small muted">Median company, with each index's headline.</p>
      <DataTable caption="Indexes on the shared scales" columns={ixCols} rows={ixRows} rowKey={(r) => r.id} initial={{ key: 'w', dir: -1 }} rowHref={(r) => href('index', r.id)} download="parity-by-index" summary={`${ixRows.length} indexes`} />
      <p className="small muted" style={{ marginTop: 10 }}>India's wage parity is derived, so approximate. Japan counts regular staff only.</p>
    </>
  )
}

const SHORT_SECTOR: Record<string, string> = {
  'Communication Services': 'Communication', 'Consumer Discretionary': 'Discretionary', 'Consumer Staples': 'Staples', 'Information Technology': 'Technology',
}

/** Phones: every sector against every market in one compact grid. Tap a market to sort by it. */
function SectorGrid({ measure, cell }: { measure: Measure; cell: (code: string, sector: string) => Summary | null }) {
  const [by, setBy] = useQueryState<string>('by', 'IN', COMPARE_MARKETS)
  const val = (code: string, s: string) => { const x = cell(code, s); return x && x.n >= 3 ? x.median : null }
  const rows = [...SECTORS].sort((a, b) => (val(by, b) ?? -1) - (val(by, a) ?? -1))
  return (
    <div className="sgrid-wrap">
      <table className="sgrid">
        <caption className="sr-only">{MEASURE[measure].short} by sector and market, median company, percent</caption>
        <thead>
          <tr>
            <th scope="col">Sector</th>
            {COMPARE_MARKETS.map((code) => (
              <th key={code} scope="col" aria-sort={by === code ? 'descending' : undefined} className={by === code ? 'on' : undefined}>
                <button type="button" onClick={() => setBy(code)} aria-label={`Sort by ${marketName(code)}`}>{MARKET[code].short}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s}>
              <th scope="row">{SHORT_SECTOR[s] ?? s}</th>
              {COMPARE_MARKETS.map((code) => {
                const v = val(code, s)
                return <td key={code} className={by === code ? 'on' : undefined}>{v == null ? <span className="muted" aria-label="no data">·</span> : Math.round(v * 100)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">Median company. A dot: fewer than three companies. Tap a market to sort.</p>
    </div>
  )
}

function Sectors() {
  const [measure, setMeasure] = useQueryState<Measure>('measure', 'w', ['w', 'e', 's'])
  const [market, setMarket] = useQueryState<string>('market', 'IN', COMPARE_MARKETS)
  const phone = useMedia(PHONE)
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
      <ChartFrame level={2} title={`${MEASURE[measure].short} by sector, ${marketName(market)}`} sub="Dot: median company. Bar: middle half of companies. Sectors with fewer than three are left out."
        controls={<MarketPicker label="Market" value={market} onChange={setMarket} options={COMPARE_MARKETS.map((c) => ({ id: c, label: marketName(c) }))} />}
        table={<DataTable caption="Sectors" columns={[mcols[0], mcols.find((c) => c.key === market)!]} rows={SECTORS.map((sector) => ({ sector }))} rowKey={(r) => r.sector} initial={{ key: market, dir: -1 }} summary={`${SECTORS.length} sectors`} />}>
        {empty
          ? <EmptyState art="data" compact title={`No ${MEASURE[measure].short.toLowerCase()} for ${marketName(market)}`}
              actions={<button type="button" className="btn-quiet" onClick={() => setMeasure('w')}>Show wage parity</button>}>
              No workforce split for {marketName(market)} companies.
            </EmptyState>
          : <RangeDots label={`${MEASURE[measure].short} by sector`} rows={rows} parity={MEASURE[measure].parity} max={MAX[measure]} />}
      </ChartFrame>
      <h2 style={{ marginTop: 40 }}>Every sector in every market</h2>
      <p className="small muted">{MEASURE[measure].short}, median company, 11 shared sectors.{population()}</p>
      {phone
        ? <SectorGrid measure={measure} cell={cell} />
        : <DataTable caption="Sectors by market" columns={mcols} rows={SECTORS.map((sector) => ({ sector }))} rowKey={(r) => r.sector} initial={{ key: 'sector', dir: 1 }}
            download={`sectors-${measure}`} summary={`${SECTORS.length} sectors`} />}
      {measure !== 'e' && <p className="small muted" style={{ marginTop: 10 }}>India's wage parity is derived, so approximate.</p>}
    </>
  )
}

function MapTab({ focus }: { focus?: string }) {
  const [view, setView] = useQueryState<'one' | 'facets'>('layout', 'one', ['one', 'facets'])
  const [market, setMarket] = useQueryState<string>('market', 'all', ['all', ...MAP_MARKETS])
  const [sector, setSector] = useQueryState<string>('sector', 'all', ['all', ...SECTORS])
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
  const missing = focus && companies[focus] ? offMapReason(pointOf(focus)) : null
  return (
    <>
      {missing && (
        <EmptyState art="offMap" title={`${companies[focus as string].name} is not on the map`}
          actions={<a className="go" href={href('company', focus as string)}>Open {companies[focus as string].name}</a>}>
          The map needs both measures. {missing}
        </EmptyState>
      )}
      <div className="toolbar">
        <Segmented label="Layout" value={view} onChange={setView} options={[{ id: 'one', label: 'One map' }, { id: 'facets', label: 'By market' }]} />
        {view === 'one' && (
          <MarketPicker label="Highlight a market" value={market} onChange={setMarket}
            options={['all', ...MAP_MARKETS].map((c) => ({ id: c, label: c === 'all' ? 'All markets' : marketName(c) }))} />
        )}
        <Dropdown label="Sector" value={sector} onChange={setSector} options={[{ id: 'all', label: 'All sectors' }, ...SECTORS.map((s) => ({ id: s, label: s }))]} />
      </div>
      <ChartFrame level={2} urlState title="Where companies sit on both scales" sub="Right of the line: half or more staff are women. Above it: women paid at least as much as men."
        table={<DataTable caption="Companies on the parity map" columns={columns} rows={shown} rowKey={(p) => p.c.symbol} initial={{ key: 's', dir: -1 }} rowHref={(p) => href('company', p.c.symbol)} urlState limit={30} rank download="parity-map"
          empty={<EmptyState art="results" compact title="No companies match these filters">Choose another market or sector.</EmptyState>} summary={`${shown.length} companies`} />}>
        {view === 'one' ? (
          <ParityMap points={plotted} on={on} focus={focus} label="Parity map" />
        ) : (
          <div className="facets">
            {MAP_MARKETS.map((code) => (
              <div key={code}>
                <h3>{marketName(code)} <span className="muted">· {plotted.filter((p) => p.c.country === code && inSector(p)).length}</span></h3>
                <ParityMap compact height={260} points={plotted} on={(p) => p.c.country === code && inSector(p)} focus={focus} label={`Parity map, ${marketName(code)}`} />
              </div>
            ))}
          </div>
        )}
      </ChartFrame>
      <ul className="tight small" style={{ marginTop: 14 }}>
        <li><strong>On the map:</strong> {plotted.length} companies with both measures.</li>
        <li><strong>Bases differ:</strong> {MAP_MARKETS.map((c) => `${marketName(c)}: women's share of ${BASIS[c].employment}, ${BASIS[c].wage}`).join('. ')}.</li>
        {pinned > 0 && <li><strong>Off the chart:</strong> {pinned} with wage parity outside 30–150%, pinned to the edge and hollow.</li>}
      </ul>
    </>
  )
}

export function Compare({ tab, focus }: { tab?: string; focus?: string }) {
  useStage('core')
  useStage('companies')
  const current = TABS.some((t) => t.id === tab) ? (tab as string) : 'countries'
  usePageTitle(`Compare · ${TABS.find((t) => t.id === current)?.label}`)
  return (
    <>
      <section className="page-head">
        <h1>Compare <span className="accent">on the same scales</span></h1>
        <p className="lead">How many women companies employ, and how their pay compares with men's, on scales that work in every market.</p>
        <Tabs label="Compare views" items={TABS} current={current} />
      </section>
      <section className="tab-panel" key={current}>
        {current === 'countries' && <Countries />}
        {current === 'sectors' && <Sectors />}
        {current === 'map' && <MapTab focus={focus} />}
      </section>
    </>
  )
}
