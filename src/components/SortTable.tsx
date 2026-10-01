import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  label: string
  right?: boolean
  render: (row: T) => ReactNode
  sort?: (row: T) => number | string | null
  csv?: (row: T) => number | string | null | undefined
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  initial: { key: string; dir: 1 | -1 }
  caption: string
  rowHref?: (row: T) => string
  scroll?: boolean
  rank?: boolean
  download?: string
  summary?: ReactNode
  current?: string
}

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function SortTable<T>({ columns, rows, rowKey, initial, caption, rowHref, scroll, rank, download, summary, current }: Props<T>) {
  const [sort, setSort] = useState(initial)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const get = col.sort
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
    })
  }, [rows, columns, sort])

  const save = () => {
    const cols = columns.filter((c) => c.csv || c.sort)
    const lines = [cols.map((c) => cell(c.label)).join(',')]
    for (const r of sorted) lines.push(cols.map((c) => cell((c.csv ?? c.sort)?.(r))).join(','))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${download}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="table-block">
      {(summary || download) && (
        <div className="table-bar">
          <span className="meta">{summary}</span>
          {download && (
            <button type="button" className="btn-quiet" onClick={save}>
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" /></svg>
              Download CSV
            </button>
          )}
        </div>
      )}
      <div className={scroll ? 'table-wrap scroll' : 'table-wrap'}>
        <table className="data">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {rank && <th className="rank" scope="col"><span className="sr-only">Rank</span>#</th>}
              {columns.map((c) => {
                const active = sort.key === c.key
                return (
                  <th key={c.key} scope="col" className={c.right ? 'r' : undefined}
                    aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    {c.sort ? (
                      <button onClick={() => setSort({ key: c.key, dir: active ? (sort.dir === 1 ? -1 : 1) : -1 })}>
                        {c.label}
                        <svg className={active ? 'sort on' : 'sort'} width="8" height="10" viewBox="0 0 8 10" aria-hidden="true">
                          <path d="M4 0 7.5 4h-7z" opacity={active && sort.dir === -1 ? 0.25 : 1} />
                          <path d="M4 10 .5 6h7z" opacity={active && sort.dir === 1 ? 0.25 : 1} />
                        </svg>
                      </button>
                    ) : c.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const k = rowKey(r)
              return (
                <tr key={k} className={[rowHref && 'link', current === k && 'current'].filter(Boolean).join(' ') || undefined}
                  onClick={rowHref ? (e) => { if (!(e.target as HTMLElement).closest('a')) window.location.hash = rowHref(r) } : undefined}>
                  {rank && <td className="rank">{i + 1}</td>}
                  {columns.map((c) => <td key={c.key} className={c.right ? 'r' : undefined}>{c.render(r)}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
