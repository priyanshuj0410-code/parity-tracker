import { retryFailed, useFailed } from '../lib/data'

/**
 * Placeholders for data still on its way (decision 0012). They hold the space the content will take, so nothing
 * jumps when it lands, and fade in only after 300ms, so a fast or cached load never flashes grey. If the data
 * fails to arrive they say so and offer Try again; it also retries by itself when the connection comes back.
 */
function Unavailable() {
  return (
    <span className="sk-failed" role="status">
      {navigator.onLine ? "This part didn't load." : "This part loads when you're back online."}{' '}
      <button type="button" className="btn-quiet" onClick={retryFailed}>Try again</button>
    </span>
  )
}

export function Skeleton({ label, line, width }: { label: string; line?: boolean; width?: string }) {
  if (useFailed()) return <Unavailable />
  return <span className={line ? 'sk sk-line' : 'sk'} style={width ? { width } : undefined} role="status" aria-label={label} />
}

const WIDTHS = ['62%', '48%', '71%', '55%', '66%', '44%', '58%', '69%', '51%', '64%']

export function TableSkeleton({ rows, label, compact }: { rows: number; label: string; compact?: boolean }) {
  if (useFailed()) return <Unavailable />
  return (
    <div className={compact ? 'sk-table compact' : 'sk-table'} role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-row" key={i}>
          <span className="sk sk-logo" />
          <span className="sk sk-text" style={{ width: WIDTHS[i % WIDTHS.length] }} />
          <span className="sk sk-num" />
        </div>
      ))}
    </div>
  )
}

/** A whole page on its way: title, three tiles and a list, the shape most pages share. */
export function PageSkeleton() {
  return (
    <section className="sk-page" role="status" aria-label="Loading this page" aria-busy="true">
      <span className="sk sk-crumbs" />
      <span className="sk sk-title" />
      <div className="grid g3">
        {[0, 1, 2].map((i) => <div className="card sk-tile" key={i}><span className="sk sk-line" /><span className="sk sk-value" /><span className="sk sk-line" /></div>)}
      </div>
      <TableSkeleton rows={6} label="Loading" />
    </section>
  )
}

/** The index strip's shape while the indexes load. */
export function StripSkeleton() {
  return (
    <nav className="strip" aria-label="Indexes" aria-busy="true">
      <div className="wrap strip-row">{[0, 1, 2, 3, 4, 5].map((i) => <span className="sk sk-chip" key={i} />)}</div>
    </nav>
  )
}
