import companiesJson from '../data/companies.json'
import indexesJson from '../data/indexes.json'
import type { Company, CompanyYear, IndexData } from '../types'

export const companies = companiesJson as unknown as Record<string, Company>
export const indexes = indexesJson as unknown as Record<string, IndexData>

export const INDEX_ORDER = ['nifty50', 'sensex', 'niftynext50', 'ftse100', 'asx200', 'nikkei225', 'eurostoxx50']
export const SOURCE_DATE = '1 October 2026'

export interface Market {
  code: string
  name: string
  years: string[]
  latest: string
  prev: string
  label: (year: string) => string
  wageLabel: string
  workforceLabel: string
  headlineLabel: string
  intro: string
  payPhrase: (ratio: number) => string
  coverage: (n: number) => string
  parity: number
}

export const MARKET: Record<string, Market> = {
  IN: {
    code: 'IN', name: 'India',
    years: ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'], latest: '2025-26', prev: '2024-25',
    label: (y) => 'FY' + y.slice(-2),
    wageLabel: "Women's share of pay",
    workforceLabel: 'Employment parity (permanent staff)',
    headlineLabel: "Women's share of pay (payroll you own)",
    intro: 'Company BRSR filings give total wages paid to women, so the index figure weights each company by its payroll.',
    payPhrase: (r) => `₹${Math.round(r * 100)} for every ₹100 paid to men`,
    coverage: (n) => `${n} companies covered`,
    parity: 0.5,
  },
  GB: {
    code: 'GB', name: 'United Kingdom',
    years: ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'], latest: '2025', prev: '2024',
    label: (y) => y,
    wageLabel: "Women's share of pay (hourly, UK staff)",
    workforceLabel: 'Employment parity (UK staff)',
    headlineLabel: "Women's share of pay (average company, UK staff)",
    intro: 'UK gender pay gap reports cover UK staff only and give hourly pay with no payroll totals, so each company counts equally and the measure differs from India\'s.',
    payPhrase: (r) => `${Math.round(r * 100)}p for every £1 men earn per hour`,
    coverage: (n) => `${n} companies with UK gender pay gap reports`,
    parity: 0.5,
  },
  AU: {
    code: 'AU', name: 'Australia',
    years: ['2023-24', '2024-25'], latest: '2024-25', prev: '2023-24',
    label: (y) => 'FY' + y.slice(-2),
    wageLabel: "Women's share of pay (full-time equivalent, Australian staff)",
    workforceLabel: 'Employment parity (Australian staff)',
    headlineLabel: "Women's share of pay (payroll you own, Australian staff)",
    intro: 'WGEA reports cover Australian staff and give full-time-equivalent pay with exact group headcounts, so the index figure weights each company by its Australian payroll.',
    payPhrase: (r) => `${Math.round(r * 100)}c for every $1 men earn (full-time equivalent)`,
    coverage: (n) => `${n} companies with WGEA reports`,
    parity: 0.5,
  },
  JP: {
    code: 'JP', name: 'Japan',
    years: ['latest'], latest: 'latest', prev: '',
    label: () => 'latest',
    wageLabel: "Women's share of pay",
    workforceLabel: 'Employment parity (regular staff)',
    headlineLabel: "Women's share of pay (average company)",
    intro: 'Japanese employers disclose women\'s average pay as a share of men\'s and women\'s share of regular staff. Together they give women\'s share of pay, on the same 50% scale as other markets. Each company counts equally. One snapshot so far, mostly FY2025.',
    payPhrase: (r) => `¥${Math.round(r * 100)} for every ¥100 men earn`,
    coverage: (n) => `${n} companies with a pay ratio and a workforce split`,
    parity: 0.5,
  },
  EU: {
    code: 'EU', name: 'European Union',
    years: ['2024', '2025'], latest: '2025', prev: '2024',
    label: (y) => y,
    wageLabel: "Women's share of pay",
    workforceLabel: 'Employment parity (employees)',
    headlineLabel: "Women's share of pay (average company)",
    intro: 'EU companies report an unadjusted gender pay gap (ESRS S1-16) and headcount by gender (S1-6) under CSRD. Together they give women\'s share of pay, on the same 50% scale as other markets. Each company counts equally, read from its own sustainability statement.',
    payPhrase: (r) => `€${Math.round(r * 100)} for every €100 men earn`,
    coverage: (n) => `${n} companies with a pay gap and a workforce split`,
    parity: 0.5,
  },
}

export const euYear = (c: Company): string => (c.years[MARKET.EU.latest] ? MARKET.EU.latest : MARKET.EU.prev)
export const marketOf = (c: Company): Market => MARKET[c.country] ?? MARKET.IN
export const indexMarket = (ix: IndexData): Market => MARKET[ix.country] ?? MARKET.IN

export function workforce(c: Company, y?: CompanyYear): number | null {
  if (!y) return null
  return c.country === 'IN' || c.country === 'JP' ? y.fPerm : y.fAll
}

export function yoyChange(c: Company, y1?: string, y0?: string): number | null {
  const m = marketOf(c)
  const a = c.years[y0 ?? m.prev]
  const b = c.years[y1 ?? m.latest]
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

export function payRatio(c: Company, y?: CompanyYear): number | null {
  if (!y) return null
  if (c.country !== 'IN') return y.gapMean == null ? null : 1 - y.gapMean
  if (y.w == null || y.fPerm == null) return null
  if (y.fPerm <= 0 || y.fPerm >= 1 || y.w <= 0 || y.w >= 1) return null
  return (y.w / y.fPerm) / ((1 - y.w) / (1 - y.fPerm))
}

export type Tone = 'ok' | 'warn' | 'bad'

export function dataLabel(y?: CompanyYear): { label: string; tone: Tone } {
  if (y && y.w == null && y.gapMean != null) return { label: 'No staff split', tone: 'warn' }
  if (!y || y.w == null) return { label: 'Missing', tone: 'bad' }
  if (y.wKind === 'estimated') return { label: 'Estimated', tone: 'warn' }
  if (y.basisChange) return { label: 'Basis changed', tone: 'warn' }
  if (y.dq === 2) return { label: 'Rescaled', tone: 'warn' }
  return { label: 'Reported', tone: 'ok' }
}

export function indexName(id: string): string {
  return indexes[id]?.name ?? id
}
