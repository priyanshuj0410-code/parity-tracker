import companiesUrl from '../data/companies.json?url'
import indexesUrl from '../data/indexes.json?url'
import simulationsUrl from '../data/simulations.json?url'
import marketsJson from '../data/markets.json'
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

export { SOURCE_DATE } from './source'

export type MarketStatus = 'live' | 'planned' | 'limited'

/** A market as stored in Firestore (`markets/{code}`): every setting that changes with the data, not the method. */
export interface MarketRecord {
  code: string
  name: string
  order: number
  status: MarketStatus
  /** The Home page's coverage table; `indexes` only for markets without live indexes. */
  reporting: { source: string; required: string; indexes?: string }
}

interface LiveMarketRecord extends MarketRecord {
  years: string[]
  latest: string
  prev: string
  yearStyle: 'fy' | 'plain'
  wageLabel: string
  workforceLabel: string
  headlineLabel: string
  intro: string
  /** Templates: {n} is pence (or cents, yen…) per 100, or a company count. */
  payPhrase: string
  coverageText: string
  parity: number
  /** The index the Home page paces the market by, and the indexes shown, in order. */
  flagship: string
  indexes: string[]
  short: string
  basis: { employment: string | null; wage: string; approx?: boolean }
  /** Method page lines; {firstYear} and {latestYear} take the market's year labels. */
  sources: { label: string; text: string }[]
}

export interface Market extends Omit<LiveMarketRecord, 'payPhrase'> {
  label: (year: string) => string
  payPhrase: (ratio: number) => string
  coverage: (n: number) => string
}

/** Every market, live or not, in display order. */
export const MARKETS = Object.values(marketsJson) as MarketRecord[]

export const MARKET: Record<string, Market> = Object.fromEntries(
  (MARKETS.filter((m) => m.status === 'live') as LiveMarketRecord[]).map((m) => [m.code, {
    ...m,
    label: m.yearStyle === 'fy' ? (y: string) => 'FY' + y.slice(-2) : (y: string) => y,
    payPhrase: (r: number) => m.payPhrase.replace('{n}', String(Math.round(r * 100))),
    coverage: (n: number) => m.coverageText.replace('{n}', String(n)),
  }]),
)

export const INDEX_ORDER = Object.values(MARKET).flatMap((m) => m.indexes)

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
