import { useMemo, useState } from 'react'
import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { SortTable, type Column } from '../components/SortTable'
import { INDEX_ORDER, LATEST, PREV, boardShare, companies, indexes, yoyChange } from '../lib/data'
import { fy, pct } from '../lib/format'
import { href } from '../lib/router'
import type { Company } from '../types'

const columns: Column<Company>[] = [
  { key: 'name', label: 'Company', render: (c) => <a href={href('company', c.symbol)}>{c.name}<span className="sub">{c.symbol}</span></a>, sort: (c) => c.name },
  { key: 'sector', label: 'Sector', render: (c) => c.industry, sort: (c) => c.industry },
  { key: 'w', label: `Women's share of wages ${fy(LATEST)}`, right: true, render: (c) => <>{pct(c.years[LATEST]?.w)} <DataBadge year={c.years[LATEST]} /></>, sort: (c) => c.years[LATEST]?.w ?? null },
  { key: 'chg', label: `Change since ${fy(PREV)}`, right: true, render: (c) => <Change value={yoyChange(c)} />, sort: (c) => yoyChange(c) },
  { key: 'f', label: 'Women in permanent staff', right: true, render: (c) => pct(c.years[LATEST]?.fPerm), sort: (c) => c.years[LATEST]?.fPerm ?? null },
  { key: 'b', label: 'Women on board', right: true, render: (c) => pct(boardShare(c.years[LATEST]), 0), sort: (c) => boardShare(c.years[LATEST]) },
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
