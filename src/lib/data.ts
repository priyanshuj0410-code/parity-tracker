import companiesJson from '../data/companies.json'
import indexesJson from '../data/indexes.json'
import type { Company, CompanyYear, IndexData } from '../types'

export const companies = companiesJson as unknown as Record<string, Company>
export const indexes = indexesJson as unknown as Record<string, IndexData>

export const INDEX_ORDER = ['nifty50', 'sensex', 'niftynext50']
export const YEARS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26']
export const LATEST = '2025-26'
export const PREV = '2024-25'
export const SOURCE_DATE = '1 October 2026'

export function yoyChange(c: Company, y1 = LATEST, y0 = PREV): number | null {
  const a = c.years[y0]
  const b = c.years[y1]
  if (!a || !b || a.wKind !== 'reported' || b.wKind !== 'reported' || b.basisChange) return null
  if (a.w == null || b.w == null) return null
  return b.w - a.w
}

export function shareChange(a?: number | null, b?: number | null): number | null {
  return a == null || b == null ? null : b - a
}

export function boardShare(y?: CompanyYear): number | null {
  return y && y.board ? (y.boardWomen ?? 0) / y.board : null
}

export function payRatio(y?: CompanyYear): number | null {
  if (!y || y.w == null || y.fPerm == null) return null
  if (y.fPerm <= 0 || y.fPerm >= 1 || y.w <= 0 || y.w >= 1) return null
  return (y.w / y.fPerm) / ((1 - y.w) / (1 - y.fPerm))
}

export type Tone = 'ok' | 'warn' | 'bad'

export function dataLabel(y?: CompanyYear): { label: string; tone: Tone } {
  if (!y || y.w == null) return { label: 'Missing', tone: 'bad' }
  if (y.wKind === 'estimated') return { label: 'Estimated', tone: 'warn' }
  if (y.basisChange) return { label: 'Basis changed', tone: 'warn' }
  if (y.dq === 2) return { label: 'Rescaled', tone: 'warn' }
  return { label: 'Reported', tone: 'ok' }
}

export function indexName(id: string): string {
  return indexes[id]?.name ?? id
}
