import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCountries } from '../../src/feeds/countries.ts'
import { buildSummary } from '../../src/feeds/data-api.ts'
import type { IndexData } from '../../src/types.ts'

const markets = {
  IN: { code: 'IN', name: 'India', status: 'live', years: ['2024-25', '2025-26'] },
  GB: { code: 'GB', name: 'United Kingdom', status: 'live', years: ['2024', '2025'] },
  US: { code: 'US', name: 'United States', status: 'limited' },
}

const india = (w24: number | null, w25: number | null, pay24: number | null, pay25: number | null, industry = 'Information Technology') => ({
  country: 'IN', industry, payrollWeightCr: 100,
  years: {
    ...(w24 === null ? {} : { '2024-25': { w: w24, wKind: 'reported', payrollCr: pay24 } }),
    ...(w25 === null ? {} : { '2025-26': { w: w25, wKind: 'reported', payrollCr: pay25 } }),
  },
})

test("India weights each company by that year's payroll", () => {
  const c = buildCountries(markets, { A: india(0.2, 0.2, 300, 300), B: india(0.4, 0.4, 100, 100) })
  assert.equal(c.IN.years['2025-26'].headline, 0.25) // (0.2*300 + 0.4*100) / 400
  assert.equal(c.IN.weighting, "each company's reported payroll for the year")
})

test('a year without payroll falls back to the median payroll', () => {
  const c = buildCountries(markets, { A: india(0.2, 0.2, null, 300), B: india(0.4, 0.4, 100, 100) })
  assert.equal(c.IN.years['2024-25'].headline, 0.3) // A counts at its median payroll of 100: (0.2*100 + 0.4*100) / 200
})

test('other markets weight companies equally, and markets without years are skipped', () => {
  const c = buildCountries(markets, {
    X: { country: 'GB', industry: 'Retail', years: { '2025': { w: 0.3, wKind: 'reported' } } },
    Y: { country: 'GB', industry: 'Retail', years: { '2025': { w: 0.5, wKind: 'reported' } } },
  })
  assert.equal(c.GB.years['2025'].headline, 0.4)
  assert.equal(c.US, undefined)
})

test('a newly onboarded company moves the country and sector figures with no other change', () => {
  const base = { A: india(0.2, 0.2, 100, 100), B: india(0.4, 0.4, 100, 100) }
  const before = buildCountries(markets, base).IN.years['2025-26']
  const after = buildCountries(markets, { ...base, C: india(null, 0.6, null, 200, 'Banks') }).IN.years['2025-26']
  assert.equal(before.headline, 0.3)
  assert.equal(after.headline, 0.45) // (0.2*100 + 0.4*100 + 0.6*200) / 400
  assert.deepEqual([after.companiesCovered, after.companiesInMarket], [3, 3])
  assert.deepEqual(after.sectors.map((s) => [s.industry, s.w, s.companies]), [['Banks', 0.6, 1], ['Information Technology', 0.3, 2]])
})

test('the change is like-for-like: only companies with a figure in both years', () => {
  const c = buildCountries(markets, { A: india(0.2, 0.3, 100, 100), B: india(null, 0.9, null, 100) })
  assert.deepEqual(c.IN.yoy['2024-25>2025-26'], { from: 0.2, to: 0.3, change: 0.1, companies: 1 })
})

const group = (overrides: object = {}) => ({
  id: 'brsrall', name: 'All BRSR filers', country: 'IN', kind: 'group', weighting: "payroll: each company's own payroll that year", left: ['GONE'],
  years: {
    '2024-25': { headline: 0.19, companiesCovered: 2, companiesReported: 2, sectors: [{ industry: 'Banks', w: 0.2, payrollShare: 0.5, companies: 1 }] },
    '2025-26': { headline: 0.1915, companiesCovered: 2, companiesReported: 1, sectors: [{ industry: 'Banks', w: 0.21, payrollShare: 0.4, companies: 1 }, { industry: 'Information Technology', w: 0.25, payrollShare: 0.6, companies: 1 }] },
  },
  yoy: { '2024-25>2025-26': { from: 0.1896, to: 0.1924, change: 0.0028, companies: 2, interval: [0.0016, 0.0045], distinguishable: true, shown: true } },
  ...overrides,
})

test("India takes its group's own figures and published change instead of recomputing", () => {
  const c = buildCountries(markets, { A: india(0.2, 0.2, 300, 300), B: india(0.4, 0.4, 100, 100), GONE: india(0.5, null, 100, null) }, { brsrall: group() })
  assert.equal(c.IN.years['2025-26'].headline, 0.1915)
  assert.deepEqual([c.IN.years['2025-26'].companiesCovered, c.IN.years['2025-26'].companiesReported, c.IN.years['2025-26'].companiesInMarket], [2, 1, 2])
  assert.deepEqual(c.IN.years['2025-26'].sectors, [{ industry: 'Information Technology', w: 0.25, companies: 1 }, { industry: 'Banks', w: 0.21, companies: 1 }])
  assert.deepEqual(c.IN.yoy, { '2024-25>2025-26': { from: 0.1896, to: 0.1924, change: 0.0028, companies: 2 } })
  assert.equal(c.IN.weighting, "All BRSR filers (indexes/brsrall), weighted by payroll: each company's own payroll that year")
})

test("a change the group holds back stays out of India's figure", () => {
  const held = group({ yoy: { '2024-25>2025-26': { from: 0.18, to: 0.2, change: 0.02, companies: 2, interval: [-0.01, 0.05], distinguishable: false, shown: false } } })
  const c = buildCountries(markets, { A: india(0.2, 0.2, 300, 300) }, { brsrall: held })
  assert.equal(c.IN.years['2025-26'].headline, 0.1915)
  assert.deepEqual(c.IN.yoy, {})
})

test("a group in one market leaves the others as they were", () => {
  const gb = {
    X: { country: 'GB', industry: 'Retail', years: { '2025': { w: 0.3, wKind: 'reported' } } },
    Y: { country: 'GB', industry: 'Retail', years: { '2025': { w: 0.5, wKind: 'reported' } } },
  }
  assert.deepEqual(buildCountries(markets, gb, { brsrall: group() }).GB, buildCountries(markets, gb).GB)
})

test("the summary gives a group's change with its range, and null when the method holds it back", () => {
  const summary = (g: object) => buildSummary(
    { IN: { code: 'IN', name: 'India', status: 'live', latest: '2025-26', prev: '2024-25', yearStyle: 'fy', flagship: 'nifty50', indexes: ['brsrall'] } },
    { brsrall: { ...group(g), market: 'India', exchange: 'NSE and BSE', weightsAsOf: '2025-26', constituents: [], missing: [] } as unknown as IndexData },
  )[0].indexes[0].sinceLastYear
  assert.deepEqual(summary({}), { from: 0.1896, to: 0.1924, change: 0.0028, companies: 2, interval: [0.0016, 0.0045], distinguishable: true })
  assert.equal(summary({ yoy: { '2024-25>2025-26': { from: 0.18, to: 0.2, change: 0.02, companies: 2, shown: false } } }), null)
})
