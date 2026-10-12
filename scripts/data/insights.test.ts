import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildContext, insights, type MarketYears } from '../../src/lib/insights.ts'
import type { Company, CompanyYear, IndexData } from '../../src/types.ts'

const markets: Record<string, MarketYears> = {
  IN: { code: 'IN', latest: '2025-26', prev: '2024-25', years: ['2022-23', '2023-24', '2024-25', '2025-26'], yearStyle: 'fy' },
  GB: { code: 'GB', latest: '2025', prev: '2024', years: ['2022', '2023', '2024', '2025'], yearStyle: 'plain' },
  JP: { code: 'JP', latest: 'latest', years: ['latest'], yearStyle: 'plain' },
}
const year = (y: Partial<CompanyYear>): CompanyYear => ({ w: null, wKind: 'reported', fPerm: null, fAll: null, permHeadcount: null, headcount: null, board: null, boardWomen: null, payrollCr: null, dq: 1, note: '', boundary: 'Standalone', ...y })
const company = (symbol: string, country: string, industry: string, years: Record<string, Partial<CompanyYear>>): Company => ({
  symbol, name: symbol, industry, exchange: 'NSE', country, indexes: [], marketCapCr: null, publicFloatPct: null, filings: {}, payrollWeightCr: null, payrollWeightBasis: null,
  years: Object.fromEntries(Object.entries(years).map(([k, v]) => [k, year(v)])),
})
const textiles = (i: number) => company(`T${i}`, 'IN', 'Textiles', { '2024-25': { w: 0.15 + i / 1000 }, '2025-26': { w: 0.16 + i / 1000 } })

// K.P.R. Mill's FY2025-26 BRSR: 16,623 of 20,308 permanent staff are women, 1 of 12 directors, 60.72% of wages, and
// FY2024-25 restated from 70.68% to 62.22% ("FY24-25 restated by redefining wages as per ISF").
const kpr = company('KPRMILL', 'IN', 'Textiles', {
  '2024-25': { w: 0.6222, wFiled: 0.7068, restatedIn: '2025-26', basisChange: true },
  '2025-26': { w: 0.6072, fPerm: 0.8185, board: 12, boardWomen: 1, staff: { employees: { women: 574, men: 2891 }, workers: { women: 16049, men: 794 }, kmp: { women: 0, men: 2 } } },
})

function ctxOf(cs: Company[], ixs: IndexData[] = [], order: string[] = []) {
  return buildContext(cs, markets, Object.fromEntries(cs.map((c) => [c.symbol, 'Consumer Discretionary'])), ixs, order)
}

test('KPR Mill: the ladder with the legal minimum, the pay mix and the workers-office split, in that order', () => {
  const peers = Array.from({ length: 10 }, (_, i) => textiles(i))
  const got = insights(kpr, ctxOf([kpr, ...peers]))
  assert.deepEqual(got.map((x) => x.text), [
    'Women are 82% of permanent staff and 1 of 12 directors, the minimum the law requires.',
    "Women get 61% of pay because most staff are women; their average pay is 34% of men's.",
    'Women are 95% of workers and 17% of other employees.',
  ])
})

test('the restated rule reads the restated year and its filed figure', () => {
  const got = insights(company('X', 'IN', 'Textiles', { '2024-25': { w: 0.2, wFiled: 0.25, restatedIn: '2025-26' }, '2025-26': { w: 0.21 } }), ctxOf([]))
  assert.equal(got.find((x) => x.rule === 'restated')?.text, 'The FY26 filing restates FY25 from 25.0% to 20.0%.')
})

test('no insight from an estimated share, a figure left out or one under an open data check', () => {
  for (const y of [{ wKind: 'estimated' as const }, { dq: 4 }, { held: true }]) {
    const c = company('X', 'IN', 'Textiles', { '2025-26': { w: 0.61, fPerm: 0.82, board: 12, boardWomen: 0, ...y } })
    assert.deepEqual(insights(c, ctxOf([c])), [])
  }
})

test('a move of more than 15 points is never a big move, and an 8-member board takes "an"', () => {
  const crowd = Array.from({ length: 40 }, (_, i) => company(`C${i}`, 'IN', 'Power', { '2024-25': { w: 0.1 }, '2025-26': { w: 0.1 + i / 4000 } }))
  const jump = company('J', 'IN', 'Power', { '2024-25': { w: 0.03 }, '2025-26': { w: 0.25, board: 8, boardWomen: 1 } })
  const got = insights(jump, ctxOf([jump, ...crowd]))
  assert.ok(!got.some((x) => x.rule === 'big-move'))
  assert.equal(got.find((x) => x.rule === 'board')?.text, 'One woman on an 8-member board, the minimum the law requires.')
})

test('a second sentence on the same staff share gives only its new fact', () => {
  const c = company('PAG', 'GB', 'Banks', { '2025': { w: 0.38, fAll: 0.5, topQuartile: 0.28, bonusGapMean: 0.79, gapMean: 0.39 } })
  const got = insights(c, ctxOf([c])).map((x) => x.text)
  assert.ok(got.includes('Women are 50% of UK staff and 28% of the top pay quartile.'))
  assert.ok(got.includes("Women's mean bonus is 79% below men's."))
  assert.ok(!got.some((t) => t.startsWith('Women are 50% of UK staff and get')))
})

test('Japan counts officers and managers', () => {
  const c = company('TSE-1', 'JP', 'Foods', { latest: { w: 0.2, fPerm: 0.38, managerShare: 0.13, board: 12, boardWomen: 0, gapMean: 0.5 } })
  const got = insights(c, ctxOf([c])).map((x) => x.text)
  assert.ok(got.includes('Women are 38% of regular staff and 13% of managers.'))
  assert.ok(got.includes('No women among 12 officers.'))
})

test('standing names the industry and the index medians', () => {
  const peers = Array.from({ length: 10 }, (_, i) => textiles(i))
  const ix: IndexData = { id: 'nifty500', name: 'Nifty 500', country: 'IN', market: 'India', exchange: 'NSE', weightsAsOf: '', weighting: 'free-float', constituents: [kpr, ...peers].map((c) => ({ symbol: c.symbol, weight: 0.1 })), missing: [], years: {}, yoy: {} }
  const plain = company('KPRMILL', 'IN', 'Textiles', { '2025-26': { w: 0.6072 } })
  const got = insights(plain, ctxOf([plain, ...peers], [ix], ['nifty500']))
  assert.equal(got.find((x) => x.rule === 'standing')?.text, 'Women get 61% of pay, 3.7 times the Textiles median in India (17%) and 3.7 times the Nifty 500 median (17%).')
})
