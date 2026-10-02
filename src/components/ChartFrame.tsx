import { useState, type ReactNode } from 'react'
import { useQueryState } from '../lib/router'
import { Segmented } from './Segmented'

type View = 'chart' | 'table'

export function ChartFrame({ title, sub, table, children, controls, level = 3, urlState }: {
  title?: ReactNode
  sub?: ReactNode
  table: ReactNode
  children: ReactNode
  controls?: ReactNode
  level?: 2 | 3
  /** The page's main chart: the Chart or Table choice lives in the URL, so Back keeps it. */
  urlState?: boolean
}) {
  const [local, setLocal] = useState<View>('chart')
  const [inUrl, setInUrl] = useQueryState<View>('show', 'chart', ['chart', 'table'])
  const [view, setView] = urlState ? [inUrl, setInUrl] : [local, setLocal]
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className="frame">
      <div className="frame-head">
        <div className="frame-title">
          {title && <Heading>{title}</Heading>}
          {sub && <p className="small muted">{sub}</p>}
        </div>
        <Segmented label="View" value={view} onChange={setView} options={[{ id: 'chart', label: 'Chart' }, { id: 'table', label: 'Table' }]} />
      </div>
      {controls && <div className="frame-filters">{controls}</div>}
      {view === 'chart' ? children : <div className="frame-table">{table}</div>}
    </div>
  )
}
