import { useState, type ReactNode } from 'react'
import { Segmented } from './Segmented'

export function ChartFrame({ title, sub, table, children, controls }: {
  title?: ReactNode
  sub?: ReactNode
  table: ReactNode
  children: ReactNode
  controls?: ReactNode
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <div className="frame">
      <div className="frame-head">
        <div className="frame-title">
          {title && <h3>{title}</h3>}
          {sub && <p className="small muted">{sub}</p>}
        </div>
        <Segmented label="View" value={view} onChange={setView} options={[{ id: 'chart', label: 'Chart' }, { id: 'table', label: 'Table' }]} />
      </div>
      {controls && <div className="frame-filters">{controls}</div>}
      {view === 'chart' ? children : <div className="frame-table">{table}</div>}
    </div>
  )
}
