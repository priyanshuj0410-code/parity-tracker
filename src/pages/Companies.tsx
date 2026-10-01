import { useMemo, useState } from 'react'
import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { SortTable, type Column } from '../components/SortTable'
import { INDEX_ORDER, companies, indexes, marketOf, workforce, yoyChange } from '../lib/data'
import { pct } from '../lib/format'
import { href } from '../lib/router'
import type { Company } from '../types'

const latest = (c: Company) => c.years[marketOf(c).latest]

const columns: Column<Company>[] = [
  { key: 'name', label: 'Company', render: (c) => <a href={href('company', c.symbol)}>{c.name}<span className="sub">{c.symbol}</span></a>, sort: (c) => c.name },
  { key: 'market', label: 'Market', render: (c) => <>{marketOf(c).name}<span className="sub">{marketOf(c).label(marketOf(c).latest)}</span></>, sort: (c) => marketOf(c).name },
  { key: 'sector', label: 'Sector', render: (c) => c.industry, sort: (c) => c.industry },
  { key: 'w', label: "Women's share of pay", right: true, render: (c) => <>{pct(latest(c)?.w)} <DataBadge year={latest(c)} /></>, sort: (c) => latest(c)?.w ?? null },
  { key: 'chg', label: 'Change on last year', right: true, render: (c) => <Change value={yoyChange(c)} />, sort: (c) => yoyChange(c) },
  { key: 'f', label: 'Women in workforce', right: true, render: (c) => pct(workforce(c, latest(c))), sort: (c) => workforce(c, latest(c)) },
]

export function Companies() {
  const [q, setQ] = useState('')
  const [ix, setIx] = useState('all')
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
      <p className="small muted">India figures are shares of total wages from BRSR filings. UK figures are shares of hourly pay for UK staff from gender pay gap reports. Compare companies within a market, not across them.</p>
      <div className="controls">
        <input type="search" placeholder="Search by name, symbol or sector" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search companies" />
        <select value={ix} onChange={(e) => setIx(e.target.value)} aria-label="Filter by index">
          <option value="all">All indexes</option>
          {INDEX_ORDER.map((id) => <option key={id} value={id}>{indexes[id].name}</option>)}
        </select>
      </div>
      <p className="meta">{rows.length} companies</p>
      <SortTable caption="Companies" columns={columns} rows={rows} rowKey={(c) => c.symbol} initial={{ key: 'w', dir: -1 }} />
    </section>
  )
}
