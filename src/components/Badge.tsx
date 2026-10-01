import { dataLabel } from '../lib/data'
import type { CompanyYear } from '../types'

export function DataBadge({ year }: { year?: CompanyYear }) {
  const { label, tone } = dataLabel(year)
  if (tone === 'ok') return <span className="badge">{label}</span>
  return <span className={`badge ${tone}`} title={year?.note || undefined}>{label}</span>
}
