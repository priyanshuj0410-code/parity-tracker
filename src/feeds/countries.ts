/**
 * Country figures: women's share of pay across every company Nivel covers in a market, with each market's sectors.
 * Computed at publish time from the release's own company records, so a company added to a market moves its country
 * and sector figures with no other change (PARITY-114).
 *
 * Weighting follows what each market's published records hold:
 * - A market with a group (India's All BRSR filers, `kind: 'group'`) takes the group's own figures: its headline,
 *   coverage and sectors each year and only the changes it publishes, so the two never disagree (decision 10).
 * - India without one: each company's reported payroll for the year (BRSR wages), or its median payroll when that year has none.
 * - Everywhere else: equal weight across companies, as the UK, Japanese and EU indexes do, because the published
 *   records hold no payroll totals. Australia's estimated wage bills stay inside its pipeline for now (PARITY-115).
 */

interface CompanyYear { w?: number | null; wKind?: string; payrollCr?: number | null }
interface CompanyRecord { country: string; industry?: string | null; payrollWeightCr?: number | null; years?: Record<string, CompanyYear> }
interface MarketRecord { code: string; name: string; status: string; years?: string[] }
interface IndexRecord {
  id: string
  name: string
  country: string
  kind?: string
  weighting: string
  left?: string[]
  years: Record<string, { headline: number; companiesCovered: number; companiesReported: number; sectors: { industry: string; w: number; companies: number }[] }>
  yoy: Record<string, { from: number; to: number; change: number; companies: number; shown?: boolean }>
}

export interface CountryYear {
  headline: number
  companiesCovered: number
  companiesReported: number
  companiesInMarket: number
  sectors: { industry: string; w: number; companies: number }[]
}

export interface CountryData {
  market: string
  name: string
  weighting: string
  years: Record<string, CountryYear>
  yoy: Record<string, { from: number; to: number; change: number; companies: number }>
}

const rd = (n: number) => Math.round(n * 10000) / 10000

const WEIGHTING: Record<string, string> = {
  IN: "each company's reported payroll for the year",
}
const EQUAL = 'equal weight across companies (no payroll totals in the published records)'

/** A company's weight in its market's figure for a year, or null when it cannot count. */
function weight(market: string, c: CompanyRecord, y: CompanyYear): number | null {
  if (market !== 'IN') return 1
  const w = y.payrollCr ?? c.payrollWeightCr ?? null
  return w !== null && w > 0 ? w : null
}

/** Weighted share of pay over [weight, share] pairs. */
function share(pairs: [number, number][]): number {
  const total = pairs.reduce((s, [w]) => s + w, 0)
  return pairs.reduce((s, [w, f]) => s + w * f, 0) / total
}

/** The market's figure as its group publishes it: the group's years, and only the changes it shows. */
function fromGroup(m: MarketRecord, g: IndexRecord, members: number): CountryData {
  const years: Record<string, CountryYear> = {}
  for (const y of m.years ?? []) {
    const v = g.years[y]
    if (!v) continue
    years[y] = {
      headline: v.headline,
      companiesCovered: v.companiesCovered,
      companiesReported: v.companiesReported,
      companiesInMarket: members,
      sectors: v.sectors.map(({ industry, w, companies }) => ({ industry, w, companies })).sort((a, b) => b.w - a.w),
    }
  }
  const yoy: CountryData['yoy'] = {}
  for (const [key, ch] of Object.entries(g.yoy)) {
    if (ch.shown !== false) yoy[key] = { from: ch.from, to: ch.to, change: ch.change, companies: ch.companies }
  }
  return { market: m.code, name: m.name, weighting: `${g.name} (indexes/${g.id}), weighted by ${g.weighting}`, years, yoy }
}

export function buildCountries(markets: Record<string, MarketRecord>, companies: Record<string, CompanyRecord>, indexes: Record<string, IndexRecord> = {}): Record<string, CountryData> {
  const out: Record<string, CountryData> = {}
  for (const m of Object.values(markets)) {
    if (m.status !== 'live' || !m.years?.length) continue
    const group = Object.values(indexes).find((ix) => ix.kind === 'group' && ix.country === m.code)
    if (group) {
      const left = new Set(group.left ?? [])
      out[m.code] = fromGroup(m, group, Object.entries(companies).filter(([symbol, c]) => c.country === m.code && !left.has(symbol)).length)
      continue
    }
    const members = Object.values(companies).filter((c) => c.country === m.code)
    const counted = (y: string) =>
      members.flatMap((c) => {
        const cy = c.years?.[y]
        const w = cy && typeof cy.w === 'number' ? weight(m.code, c, cy) : null
        return cy && w !== null ? [{ c, cy, w }] : []
      })
    const years: Record<string, CountryYear> = {}
    for (const y of m.years) {
      const rows = counted(y)
      if (rows.length === 0) continue
      const bySector = new Map<string, [number, number][]>()
      for (const r of rows) {
        const key = r.c.industry ?? 'Other'
        bySector.set(key, [...(bySector.get(key) ?? []), [r.w, r.cy.w as number]])
      }
      years[y] = {
        headline: rd(share(rows.map((r) => [r.w, r.cy.w as number]))),
        companiesCovered: rows.length,
        companiesReported: rows.filter((r) => r.cy.wKind === 'reported').length,
        companiesInMarket: members.length,
        sectors: [...bySector].map(([industry, pairs]) => ({ industry, w: rd(share(pairs)), companies: pairs.length })).sort((a, b) => b.w - a.w),
      }
    }
    // Like-for-like change: only companies with a figure in both years, each year weighted as above.
    const yoy: CountryData['yoy'] = {}
    const ys = m.years.filter((y) => years[y])
    for (let i = 1; i < ys.length; i++) {
      const [a, b] = [ys[i - 1], ys[i]]
      const both = members.flatMap((c) => {
        const ca = c.years?.[a], cb = c.years?.[b]
        const wa = ca && typeof ca.w === 'number' ? weight(m.code, c, ca) : null
        const wb = cb && typeof cb.w === 'number' ? weight(m.code, c, cb) : null
        return wa !== null && wb !== null ? [{ a: [wa, ca!.w as number] as [number, number], b: [wb, cb!.w as number] as [number, number] }] : []
      })
      if (both.length === 0) continue
      const from = share(both.map((x) => x.a)), to = share(both.map((x) => x.b))
      yoy[`${a}>${b}`] = { from: rd(from), to: rd(to), change: rd(to - from), companies: both.length }
    }
    out[m.code] = { market: m.code, name: m.name, weighting: WEIGHTING[m.code] ?? EQUAL, years, yoy }
  }
  return out
}
