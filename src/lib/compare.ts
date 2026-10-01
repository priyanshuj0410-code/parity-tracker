import sectorsJson from '../data/sectors.json'
import type { Company, CompanyYear } from '../types'
import { MARKET, companies, indexes, marketOf, payRatio } from './data'

export const SECTOR = sectorsJson as Record<string, string>
export const SECTORS = [...new Set(Object.values(SECTOR))].sort()
export const sectorOf = (c: Company): string => SECTOR[c.symbol] ?? c.industry

export const E_PARITY = 0.5
export const W_PARITY = 1

export interface Basis { employment: string | null; wage: string; approx?: boolean }
export const BASIS: Record<string, Basis> = {
  IN: { employment: 'permanent staff', wage: 'annual wages, derived from wage share and staff share', approx: true },
  GB: { employment: 'UK staff', wage: 'mean hourly pay, UK staff' },
  AU: { employment: 'Australian staff', wage: 'mean full-time-equivalent pay, Australian staff' },
  JP: { employment: 'regular staff', wage: 'mean annual pay, all workers' },
  EU: { employment: null, wage: 'unadjusted mean pay, as each company defines it' },
}
export const COMPARE_MARKETS = ['IN', 'GB', 'AU', 'JP', 'EU']

export function employmentParity(c: Company, y?: CompanyYear): number | null {
  if (!y) return null
  if (c.country === 'IN' || c.country === 'JP') return y.fPerm
  if (c.country === 'GB' || c.country === 'AU') return y.fAll
  return null
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
}

function build(c: Company): Point | null {
  const m = marketOf(c)
  for (const year of [m.latest, m.prev]) {
    const y = year ? c.years[year] : undefined
    if (!y || y.w == null || y.wKind !== 'reported') continue
    const e = employmentParity(c, y)
    const w = wageParity(c, y)
    if (w == null) continue
    return { c, year, e, w, s: impliedShare(e, w), sector: sectorOf(c) }
  }
  return null
}

export const POINTS: Point[] = Object.values(companies).map(build).filter((p): p is Point => p !== null)
const BY_SYMBOL = new Map(POINTS.map((p) => [p.c.symbol, p]))
export const pointOf = (symbol: string): Point | undefined => BY_SYMBOL.get(symbol)

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
