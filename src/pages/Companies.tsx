import { useMemo, useState } from 'react'
import { DataBadge, ShareFigure } from '../components/Badge'
import { Change } from '../components/Change'
import { Logo } from '../components/Logo'
import { Meter } from '../components/Meter'
import { DataTable, type Column } from '../components/DataTable'
import { E_PARITY, W_PARITY, percentile, pointOf, sectorOf } from '../lib/compare'
import { INDEX_ORDER, companies, indexes, marketOf, yoyChange } from '../lib/data'
import { ordinal, pct } from '../lib/format'
import { href } from '../lib/router'
import type { Company } from '../types'

const latest = (c: Company) => c.years[marketOf(c).latest]
const rankOf = (c: Company) => { const p = pointOf(c.symbol); return p ? percentile(p, 'w') : null }

const makeColumns = (mixed: boolean): Column<Company>[] => [
  { key: 'name', label: 'Company', render: (c) => <span className="name-cell"><Logo symbol={c.symbol} name={c.name} /><a href={href('company', c.symbol)}>{c.name}<span className="sub">{c.symbol.replace(/^(ASX|TSE|EU)-/, '')} · {marketOf(c).name}</span></a></span>, phone: (c) => <span className="name-cell"><Logo symbol={c.symbol} name={c.name} /><a href={href('company', c.symbol)}>{c.name}<span className="sub">{mixed ? `${marketOf(c).name} · ` : ''}{sectorOf(c)}</span></a></span>, sort: (c) => c.name, csv: (c) => c.name },
  { key: 'sector', label: 'Sector', priority: 3, mobile: 'hide', render: (c) => <span title={c.industry}>{sectorOf(c)}</span>, sort: (c) => sectorOf(c) },
  { key: 'e', label: 'Employment parity', phone: (c) => pct(pointOf(c.symbol)?.e), render: (c) => <Meter value={pointOf(c.symbol)?.e} parity={E_PARITY} />, sort: (c) => pointOf(c.symbol)?.e ?? null },
  {
    key: 'w', label: 'Wage parity', sort: (c) => pointOf(c.symbol)?.w ?? null,
    phone: (c) => { const w = pointOf(c.symbol)?.w; return w == null ? 'n/a' : `${c.country === 'IN' ? '≈' : ''}${pct(w)}` },
    render: (c) => {
      const p = pointOf(c.symbol)
      const m = marketOf(c)
      return <><Meter value={p?.w} parity={W_PARITY} max={1.4} approx={c.country === 'IN'} />{p && p.year !== m.latest && <span className="sub">{m.label(p.year)} figure</span>}</>
    },
  },
  { key: 'rank', label: 'Market percentile', short: 'Percentile', priority: 2, right: true, render: (c) => { const r = rankOf(c); return r == null ? <span className="muted">n/a</span> : ordinal(Math.round(r * 100)) }, sort: (c) => rankOf(c), csv: (c) => { const r = rankOf(c); return r == null ? null : Math.round(r * 100) } },
  { key: 'h', label: 'Share of pay', right: true, mobile: 'value', phone: (c) => <ShareFigure year={latest(c)} />, render: (c) => <span className="nowrap">{pct(latest(c)?.w)} <DataBadge year={latest(c)} /></span>, sort: (c) => latest(c)?.w ?? null },
  { key: 'chg', label: '1-year change', right: true, mobile: 'second', phone: (c) => <Change value={yoyChange(c)} hideMissing />, render: (c) => <Change value={yoyChange(c)} />, sort: (c) => yoyChange(c) },
]

export function Companies() {
  const [q, setQ] = useState('')
  const [ix, setIx] = useState(INDEX_ORDER[0])
  const columns = useMemo(() => makeColumns(ix === 'all'), [ix])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.values(companies).filter((c) =>
      (ix === 'all' || c.indexes.includes(ix)) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.symbol.toLowerCase().includes(needle) || c.industry.toLowerCase().includes(needle)))
  }, [q, ix])

  return (
    <section>
      <h1>Companies</h1>
      <p className="lead">Every company in the indexes we track.</p>
      <details className="explain">
        <summary>What the numbers mean</summary>
        <ul className="tight small">
          <li><strong>Share of pay:</strong> women's share of the company's pay bill. Parity is 50%.</li>
          <li><strong>Employment parity:</strong> women's share of staff. Parity is 50%.</li>
          <li><strong>Wage parity:</strong> women's average pay as a share of men's. Parity is 100%.</li>
          <li><strong>Market percentile:</strong> where wage parity ranks among companies in the same market, which compares fairly across markets.</li>
        </ul>
        <a className="small" href={href('compare')}>How we compare</a>
      </details>
      <div className="controls">
        <input type="search" placeholder="Search by name, symbol or sector" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search companies" />
      </div>
      <div className="pills scroller" role="group" aria-label="Filter by index">
        {['all', ...INDEX_ORDER].map((id) => (
          <button key={id} type="button" className={ix === id ? 'pill on' : 'pill'} aria-pressed={ix === id} onClick={() => setIx(id)}>
            {id === 'all' ? 'All indexes' : indexes[id].name}
          </button>
        ))}
      </div>
      <DataTable key={ix} caption="Companies" columns={columns} rows={rows} rowKey={(c) => c.symbol} rank
        initial={ix === 'all' ? { key: 'name', dir: 1 } : { key: 'h', dir: -1 }} rowHref={(c) => href('company', c.symbol)}
        summary={`${rows.length} companies`} download={`companies-${ix}`} />
    </section>
  )
}
