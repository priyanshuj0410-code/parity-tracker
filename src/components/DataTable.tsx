import { useMemo, useState, type ReactNode } from 'react'
import { navigate, query, setQuery } from '../lib/router'
import { PHONE, useMedia } from '../lib/useMedia'
import { Dropdown } from './Dropdown'

export interface Column<T> {
  key: string
  label: string
  short?: string
  right?: boolean
  render: (row: T) => ReactNode
  sort?: (row: T) => number | string | null
  csv?: (row: T) => number | string | null | undefined
  /** Phones: the row title, the figure on the right, the small line under it, a labelled detail (cards only), or hidden. */
  mobile?: 'title' | 'value' | 'second' | 'meta' | 'hide'
  /** Phones: a compact rendering used instead of render. */
  phone?: (row: T) => ReactNode
  /** Phones: a detail that spans the full card width (long text). */
  wide?: boolean
  /** Desktop: 2 hides the column below 1100px wide, 3 below 1000px. */
  priority?: 2 | 3
}

type Sort = { key: string; dir: 1 | -1 }

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  initial: Sort
  caption: string
  rowHref?: (row: T) => string
  rank?: boolean
  download?: string
  summary?: ReactNode
  current?: string
  /** Small tables: shown as detail cards on phones, with no sort or download controls. */
  bare?: boolean
  /** The page's main list: its sort and expansion live in the URL, so Back and shared links keep them. */
  urlState?: boolean
  /** Phones: show this many rows, then a Show all button. */
  limit?: number
  /** Shown instead of the table when there are no rows. */
  empty?: ReactNode
}

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const DOWNLOAD_ICON = <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" /></svg>

export function DataTable<T>({ columns, rows, rowKey, initial, caption, rowHref, rank, download, summary, current, bare, urlState, limit, empty }: Props<T>) {
  const [sort, setSortState] = useState<Sort>(() => {
    const s = urlState ? query().get('sort') : null
    const key = s?.replace(/^-/, '')
    return s && key && columns.some((c) => c.key === key && c.sort) ? { key, dir: s.startsWith('-') ? -1 : 1 } : initial
  })
  const [all, setAll] = useState(() => !!urlState && query().get('all') === '1')
  const setSort = (next: Sort) => {
    setSortState(next)
    if (urlState) setQuery({ sort: next.key === initial.key && next.dir === initial.dir ? null : `${next.dir === -1 ? '-' : ''}${next.key}` })
  }
  const showAll = () => {
    setAll(true)
    if (urlState) setQuery({ all: '1' })
  }
  const phone = useMedia(PHONE)
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
  const open = (e: { target: EventTarget }, r: T) => {
    if (rowHref && !(e.target as HTMLElement).closest('a, button')) navigate(rowHref(r))
  }

  if (rows.length === 0 && empty) return <div className="table-block"><div className="empty-state">{empty}</div></div>

  if (phone) {
    const role = (c: Column<T>, i: number) => c.mobile ?? (i === 0 ? 'title' : 'meta')
    const title = columns.find((c, i) => role(c, i) === 'title')
    const value = columns.find((c, i) => role(c, i) === 'value')
    const metas = columns.filter((c, i) => role(c, i) === 'meta')
    const sortable = columns.filter((c) => c.sort)
    if (!bare) {
      const sortedCol = columns.find((c) => c.key === sort.key)
      const byMetric = sortedCol && sortedCol !== title && sortedCol.mobile !== 'hide'
      const primary = byMetric ? sortedCol : value
      const second = primary === value ? columns.find((c) => c.mobile === 'second') : undefined
      const metrics = sortable.filter((c) => c !== title && c.mobile !== 'hide')
      const options = [...metrics, ...sortable.filter((c) => !metrics.includes(c))]
      const cut = limit && !all && sorted.length > limit ? limit : 0
      return (
        <div className="table-block">
          <div className="mtable">
            <div className="mtable-head">
              <span className="mtable-count">{summary}{!byMetric && primary ? ` · ${primary.short ?? primary.label}` : ''}</span>
              <div className="list-tools">
                {metrics.length > 1
                  ? <Dropdown label="Show and sort by" value={sort.key} options={options.map((c) => ({ id: c.key, label: c === title ? 'Name, A to Z' : c.short ?? c.label }))}
                      onChange={(k) => setSort({ key: k, dir: k === sort.key ? sort.dir : k === title?.key ? 1 : -1 })} />
                  : primary && <span className="mtable-metric">{primary.short ?? primary.label}</span>}
                <button type="button" className="btn-icon" onClick={() => setSort({ ...sort, dir: sort.dir === 1 ? -1 : 1 })}
                  aria-label={sort.dir === 1 ? 'Sorted ascending. Switch to descending.' : 'Sorted descending. Switch to ascending.'}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {sort.dir === -1 ? <path d="M12 5v14m0 0-5-5m5 5 5-5" /> : <path d="M12 19V5m0 0-5 5m5-5 5 5" />}
                  </svg>
                </button>
              </div>
            </div>
            <ul className="mrows" aria-label={caption}>
              {(cut ? sorted.slice(0, cut) : sorted).map((r) => {
                const k = rowKey(r)
                const line = second ? (second.phone ?? second.render)(r) : null
                return (
                  <li key={k} className={[rowHref && 'link', current === k && 'current'].filter(Boolean).join(' ') || undefined} onClick={(e) => open(e, r)}>
                    <div className="mr-main">{title && (title.phone ?? title.render)(r)}</div>
                    {primary && (
                      <div className="mr-side">
                        <div className="mr-value">{(primary.phone ?? primary.render)(r)}</div>
                        {line != null && line !== false && <div className="mr-second">{line}</div>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {cut > 0 && <button type="button" className="mtable-more" onClick={showAll}>Show all {sorted.length}</button>}
          </div>
        </div>
      )
    }
    return (
      <div className="table-block">
        <ol className="mlist" aria-label={caption}>
          {sorted.map((r, i) => {
            const k = rowKey(r)
            return (
              <li key={k} className={[rowHref && 'link', current === k && 'current'].filter(Boolean).join(' ') || undefined} onClick={(e) => open(e, r)}>
                <div className="mrow-top">
                  {rank && <span className="mrank">{i + 1}</span>}
                  <div className="mrow-title">{title && (title.phone ?? title.render)(r)}</div>
                  {value && <div className="mrow-value">{(value.phone ?? value.render)(r)}</div>}
                </div>
                {metas.length > 0 && (
                  <dl className="mrow-meta">
                    {metas.map((c) => <div key={c.key} className={c.wide ? 'wide' : undefined}><dt>{c.short ?? c.label}</dt><dd>{(c.phone ?? c.render)(r)}</dd></div>)}
                  </dl>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    )
  }

  const cls = (c: Column<T>) => [c.right && 'r', c.priority && `p${c.priority}`].filter(Boolean).join(' ') || undefined
  return (
    <div className="table-block">
      {(summary || download) && (
        <div className="table-bar">
          <span className="meta">{summary}</span>
          {download && <button type="button" className="btn-quiet" onClick={save}>{DOWNLOAD_ICON}Download CSV</button>}
        </div>
      )}
      <div className="table-wrap flow">
        <table className="data">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {rank && <th className="rank" scope="col"><span className="sr-only">Rank</span>#</th>}
              {columns.map((c) => {
                const active = sort.key === c.key
                return (
                  <th key={c.key} scope="col" className={cls(c)} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                    {c.sort ? (
                      <button onClick={() => setSort({ key: c.key, dir: active ? (sort.dir === 1 ? -1 : 1) : c.key === 'name' ? 1 : -1 })}>
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
                <tr key={k} className={[rowHref && 'link', current === k && 'current'].filter(Boolean).join(' ') || undefined} onClick={(e) => open(e, r)}>
                  {rank && <td className="rank">{i + 1}</td>}
                  {columns.map((c) => <td key={c.key} className={cls(c)}>{c.render(r)}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
