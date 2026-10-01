import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  label: string
  right?: boolean
  render: (row: T) => ReactNode
  sort?: (row: T) => number | string | null
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  initial: { key: string; dir: 1 | -1 }
  caption: string
  rowHref?: (row: T) => string
  scroll?: boolean
}

export function SortTable<T>({ columns, rows, rowKey, initial, caption, rowHref, scroll }: Props<T>) {
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

  return (
    <div className={scroll ? 'table-wrap scroll' : 'table-wrap'}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort.key === c.key
              return (
                <th key={c.key} className={c.right ? 'r' : undefined}
                  aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button onClick={() => setSort({ key: c.key, dir: active ? (sort.dir === 1 ? -1 : 1) : -1 })}>
                      {c.label}<span aria-hidden="true">{active ? (sort.dir === 1 ? '↑' : '↓') : ''}</span>
                    </button>
                  ) : c.label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={rowHref ? 'link' : undefined}
              onClick={rowHref ? (e) => { if (!(e.target as HTMLElement).closest('a')) window.location.hash = rowHref(r) } : undefined}>
              {columns.map((c) => <td key={c.key} className={c.right ? 'r' : undefined}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
