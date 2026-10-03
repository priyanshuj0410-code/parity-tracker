import { use, useSyncExternalStore } from 'react'
import companiesUrl from '../data/companies.json?url'
import indexesUrl from '../data/indexes.json?url'
import simulationsUrl from '../data/simulations.json?url'
import marketsJson from '../data/markets.json'
import release from '../data/release.json'
import { companyFile } from '../feeds/data-api'
import type { Company, CompanyYear, IndexData, Simulation } from '../types'

/**
 * Data arrives in stages, so a page shows as soon as its own part is in (decision 0012):
 * - `core`: indexes and simulations, about 60 KB compressed, preloaded by index.html;
 * - `companies`: every company, about 320 KB compressed, fetched once the first page is up, or at once by a
 *   page that needs it. A company page fetches that one company's file first.
 * The maps below are filled in place when a stage lands, so code that runs after it sees the data.
 * Files are hashed or carry the release id, so the service worker can serve them offline and two releases
 * never mix. The build-time page writer loads everything up front.
 */
export const companies: Record<string, Company> = {}
export const indexes: Record<string, IndexData> = {}
/** Fictional indexes, kept apart from the real ones so they never enter the index strip, search or comparisons. */
export const simulations: Record<string, Simulation> = {}
export const simulationOf = (parent: string): Simulation | undefined => Object.values(simulations).find((s) => s.parent === parent)

export type Stage = 'core' | 'companies'
const done = new Set<Stage>()
const pending = new Map<Stage, Promise<void>>()
const listeners = new Set<() => void>()
const fills: Record<Stage, (() => void)[]> = { core: [], companies: [] }
const landed = (stage: Stage) => {
  done.add(stage)
  for (const fill of fills[stage]) fill()
  for (const cb of listeners) cb()
}

/** Fill a table derived from a stage once it lands (at once if it has), before any page re-renders. */
export function afterLoad(stage: Stage, fill: () => void) {
  if (done.has(stage)) fill()
  else fills[stage].push(fill)
}

/** Patchy networks drop requests: try three times, backing off, before giving up. */
async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${url} returned ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === 2) throw err
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt))
    }
  }
}

const LOADERS: Record<Stage, () => Promise<void>> = {
  core: async () => {
    const [ix, sims] = await Promise.all([getJson<typeof indexes>(indexesUrl), getJson<typeof simulations>(simulationsUrl)])
    Object.assign(indexes, ix)
    Object.assign(simulations, sims)
  },
  companies: async () => {
    Object.assign(companies, await getJson<typeof companies>(companiesUrl))
  },
}

/** A failed stage stays failed (and its page shows the error) until Try again or the connection asks again. */
const failed = new Set<Stage>()
const errors = new Map<Stage, unknown>()
const notify = () => { for (const cb of listeners) cb() }

/** Start (or join) a stage. A failed stage can be asked for again. */
export function load(stage: Stage): Promise<void> {
  let p = pending.get(stage)
  if (!p) {
    if (failed.delete(stage)) notify()
    p = LOADERS[stage]().then(() => landed(stage), (err) => {
      pending.delete(stage)
      failed.add(stage)
      errors.set(stage, err)
      notify()
      throw err
    })
    pending.set(stage, p)
  }
  return p
}

/** Ask again for every stage that failed: from Try again, or when the connection comes back. */
export function retryFailed() {
  for (const symbol of failedCompanies) single.delete(symbol)
  failedCompanies.clear()
  for (const stage of [...failed]) load(stage).catch(() => {})
}

export const isLoaded = (stage: Stage) => done.has(stage)
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }

/** True while any stage has failed and not been asked for again. */
export const useFailed = (): boolean => useSyncExternalStore(subscribe, () => failed.size > 0, () => false)

/** For a page that cannot show without a stage: suspends until it lands (the nearest Suspense shows a skeleton). */
export function useStage(stage: Stage): void {
  if (failed.has(stage)) throw errors.get(stage)
  if (!done.has(stage)) use(load(stage))
}

/** For a part that can wait: true once the stage has landed. Starts it meanwhile unless `start` is false. */
export function useLoaded(stage: Stage, start = true): boolean {
  const ready = useSyncExternalStore(subscribe, () => done.has(stage), () => true)
  if (!ready && start && !failed.has(stage)) load(stage).catch(() => {})
  return ready
}

const single = new Map<string, Promise<Company | undefined>>()
const failedCompanies = new Set<string>()

/** One company, from its own small file when the full set has not landed yet. Undefined if there is no such company. */
export function loadCompany(symbol: string): Promise<Company | undefined> {
  let p = single.get(symbol)
  if (!p) {
    const whole = () => load('companies').then(() => companies[symbol])
    p = done.has('companies') || import.meta.env.DEV ? whole()
      : fetch(`/data/v1/companies/${companyFile(symbol)}.json?r=${release.id}`)
        .then((res) => (res.status === 404 ? undefined : res.ok ? res.json() : whole()), whole)
    p.catch(() => failedCompanies.add(symbol))
    single.set(symbol, p)
  }
  return p
}

/** The company for a page: at once when the full set is in, else suspends on its own file. */
export function useCompany(symbol: string): Company | undefined {
  return done.has('companies') ? companies[symbol] : use(loadCompany(symbol))
}

if (import.meta.env.SSR) {
  Object.assign(companies, (await import('../data/companies.json')).default)
  Object.assign(indexes, (await import('../data/indexes.json')).default)
  Object.assign(simulations, (await import('../data/simulations.json')).default)
  done.add('core').add('companies')
} else {
  window.addEventListener('online', retryFailed)
  load('core')
    .then(() => new Promise((r) => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 2000 }) : setTimeout(r, 1000))))
    .then(() => load('companies'))
    .catch(() => {})
}

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
