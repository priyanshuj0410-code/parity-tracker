import companiesUrl from '../data/companies.json?url'
import indexesUrl from '../data/indexes.json?url'
import simulationsUrl from '../data/simulations.json?url'
import type { Company, CompanyYear, IndexData, Simulation } from '../types'

/**
 * The data ships as its own hashed files, fetched alongside the code (index.html preloads them), so it parses
 * as JSON and stays cached across code-only deploys. The build-time page writer reads the files directly.
 */
async function load(): Promise<[unknown, unknown, unknown]> {
  if (import.meta.env.SSR) {
    return [(await import('../data/companies.json')).default, (await import('../data/indexes.json')).default, (await import('../data/simulations.json')).default]
  }
  const get = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} returned ${res.status}`)
    return res.json()
  }
  return Promise.all([get(companiesUrl), get(indexesUrl), get(simulationsUrl)])
}

const [companiesJson, indexesJson, simulationsJson] = await load()
export const companies = companiesJson as Record<string, Company>
export const indexes = indexesJson as Record<string, IndexData>
/** Fictional indexes, kept apart from the real ones so they never enter the index strip, search or comparisons. */
export const simulations = simulationsJson as Record<string, Simulation>
export const simulationOf = (parent: string): Simulation | undefined => Object.values(simulations).find((s) => s.parent === parent)

export const INDEX_ORDER = ['nifty50', 'sensex', 'niftynext50', 'nifty500', 'niftymidcap150', 'niftysmallcap250', 'ftse100', 'asx200', 'nikkei225', 'eurostoxx50']
export { SOURCE_DATE } from './source'

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
    intro: 'From company BRSR filings. Each company counts by its payroll.',
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
    intro: 'From UK gender pay gap reports: hourly pay, UK staff. Each company counts equally.',
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
    intro: 'From WGEA reports: full-time-equivalent pay, Australian staff. Each company counts by its Australian payroll.',
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
    intro: 'From each employer\'s pay ratio and share of women in regular staff. Each company counts equally. One snapshot so far, mostly FY25.',
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
    intro: 'From each company\'s CSRD pay gap and headcount by gender. Each company counts equally.',
    payPhrase: (r) => `€${Math.round(r * 100)} for every €100 men earn`,
    coverage: (n) => `${n} companies with a pay gap and a workforce split`,
    parity: 0.5,
  },
}

export const euYear = (c: Company): string => (c.years[MARKET.EU.latest] ? MARKET.EU.latest : MARKET.EU.prev)
export const marketOf = (c: Company): Market => MARKET[c.country] ?? MARKET.IN
export const indexMarket = (ix: IndexData): Market => MARKET[ix.country] ?? MARKET.IN

/** A figure the company does publish but that our rules leave out (adjusted, partial or not material), as against one we could not find. */
export const isExcluded = (c: Company): boolean => /adjusted|not material|only for|per country|job-category/i.test(c.noDataReason ?? '')

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
