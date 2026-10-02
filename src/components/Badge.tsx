import { dataLabel } from '../lib/data'
import type { CompanyYear } from '../types'

export function DataBadge({ year, quiet = false }: { year?: CompanyYear; quiet?: boolean }) {
  const { label, tone } = dataLabel(year)
  if (tone === 'ok') return quiet ? null : <span className="badge">{label}</span>
  return <span className={`badge ${tone}`} title={year?.note || undefined}>{label}</span>
}
