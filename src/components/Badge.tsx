import { dataLabel } from '../lib/data'
import { pct } from '../lib/format'
import type { CompanyYear } from '../types'

export function ShareFigure({ year }: { year?: CompanyYear }) {
  if (year?.w == null) return <span className="muted">n/a</span>
  const est = year.wKind === 'estimated'
  return <span title={est ? 'Estimated from median pay: no wage total was filed' : undefined}>{est ? '≈' : ''}{pct(year.w)}</span>
}

export function DataBadge({ year, quiet = false }: { year?: CompanyYear; quiet?: boolean }) {
  const { label, tone } = dataLabel(year)
  if (tone === 'ok') return quiet ? null : <span className="badge">{label}</span>
  return <span className={`badge ${tone}`} title={year?.note || undefined}>{label}</span>
}
