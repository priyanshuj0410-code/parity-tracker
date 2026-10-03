import sectorsJson from '../data/sectors.json'
import type { Company, CompanyYear } from '../types'
import { MARKET, afterLoad, companies, indexes, marketOf, payRatio, type Market } from './data'

export const SECTOR = sectorsJson as Record<string, string>
export const SECTORS = [...new Set(Object.values(SECTOR))].sort()
export const sectorOf = (c: Company): string => SECTOR[c.symbol] ?? c.industry

/** India's derived wage parity outside this range comes from mismatched staff bases, not pay. */
export const W_PLAUSIBLE = [0.3, 1.3] as const
export const E_PARITY = 0.5
export const W_PARITY = 1

export type Basis = Market['basis']
export const BASIS: Record<string, Basis> = Object.fromEntries(Object.values(MARKET).map((m) => [m.code, m.basis]))
export const COMPARE_MARKETS = Object.keys(MARKET)

export function employmentParity(c: Company, y?: CompanyYear): number | null {
  if (!y) return null
  return c.country === 'IN' || c.country === 'JP' ? y.fPerm : y.fAll
}

export const wageParity = payRatio

export function impliedShare(e: number | null, w: number | null): number | null {
  if (e == null || w == null) return null
  return (e * w) / (e * w + 1 - e)
}

export interface Point {
  c: Company
  year: string
  e: number | null
  w: number | null
  s: number | null
  sector: string
  /** India only: a derived wage parity outside the plausible range, kept for display but left out of comparisons. */
  wRaw?: number
}

function build(c: Company): Point | null {
  const m = marketOf(c)
  for (const year of [m.latest, m.prev]) {
    const y = year ? c.years[year] : undefined
    if (!y || (c.country === 'IN' && y.wKind !== 'reported')) continue
    const e = employmentParity(c, y)
    const w = wageParity(c, y)
    if (w == null) continue
    if (c.country === 'IN') {
      const ok = w >= W_PLAUSIBLE[0] && w <= W_PLAUSIBLE[1]
      return { c, year, e, w: ok ? w : null, s: y.w, sector: sectorOf(c), wRaw: ok ? undefined : w }
    }
    return { c, year, e, w, s: impliedShare(e, w), sector: sectorOf(c) }
  }
  return null
}

/** Every company's point on the shared scales, filled when the companies stage lands. */
export const POINTS: Point[] = []
const BY_SYMBOL = new Map<string, Point>()
afterLoad('companies', () => {
  for (const c of Object.values(companies)) {
    const p = build(c)
    if (p) { POINTS.push(p); BY_SYMBOL.set(c.symbol, p) }
  }
})
export const pointOf = (symbol: string): Point | undefined => BY_SYMBOL.get(symbol)
/** A company's point, worked out from the company alone when the full set has not landed yet. */
export const pointFor = (c: Company): Point | undefined => BY_SYMBOL.get(c.symbol) ?? build(c) ?? undefined

/** Why a company is missing from the parity map, which needs both scales, or null when it is on the map. */
export function offMapReason(p: Point | undefined): string | null {
  if (p && p.e != null && p.w != null) return null
  if (p?.wRaw != null) return 'Its wage figure is outside the plausible range.'
  if (!p || p.w == null) return 'No usable pay comparison.'
  return 'It does not report a workforce split.'
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN
  const i = (sorted.length - 1) * q
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

export interface Summary { n: number; q1: number; median: number; q3: number }

export function summarise(values: (number | null)[]): Summary | null {
  const v = values.filter((x): x is number => x != null).sort((a, b) => a - b)
  if (!v.length) return null
  return { n: v.length, q1: quantile(v, 0.25), median: quantile(v, 0.5), q3: quantile(v, 0.75) }
}

export type Measure = 'w' | 'e' | 's'
export const MEASURE: Record<Measure, { label: string; short: string; parity: number; note: string }> = {
  w: { label: "Wage parity: women's average pay as a share of men's", short: 'Wage parity', parity: W_PARITY, note: 'Parity is 100%.' },
  e: { label: "Employment parity: women's share of staff", short: 'Employment parity', parity: E_PARITY, note: 'Parity is 50%.' },
  s: { label: "Women's share of pay, implied by the two", short: "Share of pay", parity: E_PARITY, note: 'Parity is 50%.' },
}

export function percentile(p: Point, measure: Measure): number | null {
  const v = p[measure]
  if (v == null) return null
  const peers = POINTS.filter((q) => q.c.country === p.c.country && q[measure] != null)
  if (peers.length < 5) return null
  const below = peers.filter((q) => (q[measure] as number) < v).length
  const equal = peers.filter((q) => q[measure] === v).length
  return (below + equal / 2) / peers.length
}

export const marketPoints = (code: string) => POINTS.filter((p) => p.c.country === code)

export function indexPoints(id: string): Point[] {
  const ix = indexes[id]
  return ix ? ix.constituents.map((k) => BY_SYMBOL.get(k.symbol)).filter((p): p is Point => p !== undefined) : []
}

export const marketName = (code: string) => MARKET[code]?.name ?? code

const IN_MARKET: Record<string, string> = { IN: 'in India', GB: 'in the UK', AU: 'in Australia', JP: 'in Japan', EU: 'in the Euro Stoxx 50' }
export const inMarket = (code: string) => IN_MARKET[code] ?? `in ${marketName(code)}`

export function standing(p: Point | undefined, measure: Measure): string | null {
  const r = p ? percentile(p, measure) : null
  return r == null || !p ? null : `Higher than ${Math.round(r * 100)}% of companies ${inMarket(p.c.country)}`
}
