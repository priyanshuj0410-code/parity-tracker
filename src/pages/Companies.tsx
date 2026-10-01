import { useMemo, useState } from 'react'
import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { Monogram } from '../components/Monogram'
import { SortTable, type Column } from '../components/SortTable'
import { INDEX_ORDER, companies, indexes, marketOf, workforce, yoyChange } from '../lib/data'
import { pct } from '../lib/format'
import { href } from '../lib/router'
import type { Company } from '../types'

const latest = (c: Company) => c.years[marketOf(c).latest]

const columns: Column<Company>[] = [
  { key: 'name', label: 'Company', render: (c) => <span className="name-cell"><Monogram name={c.name} seed={c.symbol} /><a href={href('company', c.symbol)}>{c.name}<span className="sub">{c.symbol.replace(/^(ASX|TSE|EU)-/, '')}</span></a></span>, sort: (c) => c.name },
  { key: 'market', label: 'Market', render: (c) => <span className="nowrap">{marketOf(c).name}<span className="sub">{marketOf(c).label(marketOf(c).latest)}</span></span>, sort: (c) => marketOf(c).name },
  { key: 'sector', label: 'Sector', render: (c) => c.industry, sort: (c) => c.industry },
  { key: 'w', label: 'Headline measure', right: true, render: (c) => <>{pct(latest(c)?.w)} <DataBadge year={latest(c)} /><span className="sub">{c.country === 'JP' || c.country === 'EU' ? "of men's average pay" : "women's share of pay"}</span></>, sort: (c) => latest(c)?.w ?? null },
  { key: 'chg', label: 'Change on last year', right: true, render: (c) => <Change value={yoyChange(c)} />, sort: (c) => yoyChange(c) },
  { key: 'f', label: 'Women in workforce', right: true, render: (c) => pct(c.country === 'JP' ? null : workforce(c, latest(c))), sort: (c) => (c.country === 'JP' ? null : workforce(c, latest(c))) },
]

export function Companies() {
  const [q, setQ] = useState('')
  const [ix, setIx] = useState(INDEX_ORDER[0])
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.values(companies).filter((c) =>
      (ix === 'all' || c.indexes.includes(ix)) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.symbol.toLowerCase().includes(needle) || c.industry.toLowerCase().includes(needle)))
  }, [q, ix])

  return (
    <section>
      <h1>Companies</h1>
      <p className="lead">Every company in the indexes we track, with its own trajectory. Sort by any column.</p>
      <p className="small muted">India figures are shares of total wages from BRSR filings. UK figures are shares of hourly pay for UK staff from gender pay gap reports. Australian figures are shares of full-time-equivalent pay for Australian staff from WGEA reports. Japanese and EU figures are women's average pay as a share of men's, where parity is 100%, not 50%. Compare companies within a market, not across them.</p>
      <div className="controls">
        <input type="search" placeholder="Search by name, symbol or sector" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search companies" />
      </div>
      <div className="pills" role="group" aria-label="Filter by index" style={{ marginBottom: 14 }}>
        {['all', ...INDEX_ORDER].map((id) => (
          <button key={id} type="button" className={ix === id ? 'pill on' : 'pill'} aria-pressed={ix === id} onClick={() => setIx(id)}>
            {id === 'all' ? 'All indexes' : indexes[id].name}
          </button>
        ))}
      </div>
      <p className="meta">{rows.length} companies</p>
      <SortTable key={ix} caption="Companies" columns={columns} rows={rows} rowKey={(c) => c.symbol}
        initial={ix === 'all' ? { key: 'name', dir: 1 } : { key: 'w', dir: -1 }} rowHref={(c) => href('company', c.symbol)} scroll />
    </section>
  )
}
