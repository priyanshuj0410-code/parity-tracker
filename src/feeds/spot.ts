import type { Company, IndexData } from '../types.ts'

/**
 * Spot the Stereotype's feed of round 1 figures, version 1 (PARITY-52). The contract is section 5 of
 * knowledge/plans/spot-the-stereotype-anytime-and-nivel.md; the game reads it with `pnpm pull-nivel`.
 * Each item has the shape of the game's `NivelStat`, plus `format`.
 */
export const SITE = 'https://nivel-equal-lens.vercel.app'

export interface SpotItem {
  id: string
  format: 'published'
  theme: string
  question: string
  answer: number
  discussion: string
  source: { line: string; rule: string }
  cite: { from: string; saw: string }
  nivel: {
    exact: number
    period: string
    market: string
    status: 'current' | 'retired'
    pair?: string
    replaces?: string
    data: string
    markets: string[]
  }
}

interface Data {
  indexes: Record<string, IndexData>
  companies: Record<string, Company>
}

interface Draft {
  slot: string
  period: string
  market: string
  value: number
  question: string
  discussion: string
  line: string
  rule: string
  page: string
  saw: string
  pair?: string
}

/** Only figures whose reported data covers this share of the payroll go in. */
const MIN_REPORTED = 0.9
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`
const count = (n: number) => WORDS[n] ?? String(n)
const slug = (period: string) => period.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const idOf = (slot: string, period: string) => `nv-${slot}-${slug(period)}`
const latest = (ix: IndexData) => Object.keys(ix.years).sort().at(-1) as string
const fyShort = (y: string) => 'FY' + y.slice(-2)

/** The item with its keys in one order, so a change shows as a change and nothing else does. */
function canonical(i: SpotItem): SpotItem {
  const { exact, period, market, status, pair, replaces, data, markets } = i.nivel
  return {
    id: i.id, format: i.format, theme: i.theme, question: i.question, answer: i.answer, discussion: i.discussion,
    source: { line: i.source.line, rule: i.source.rule },
    cite: { from: i.cite.from, saw: i.cite.saw },
    nivel: { exact, period, market, status, ...(pair ? { pair } : {}), ...(replaces ? { replaces } : {}), data, markets: [...markets] },
  }
}

function make(d: Draft): SpotItem {
  const page = `${SITE}/${d.page}`
  return canonical({
    id: idOf(d.slot, d.period), format: 'published', theme: 'work', question: d.question, answer: Math.round(d.value * 100), discussion: d.discussion,
    source: { line: d.line, rule: d.rule }, cite: { from: page, saw: d.saw },
    nivel: { exact: Math.round(d.value * 10000) / 100, period: d.period, market: d.market, status: 'current', pair: d.pair && idOf(d.pair, d.period), data: page, markets: [] },
  })
}

/** The payroll an index fund owns in each company, as Nivel weights it, and how much of it is reported rather than estimated. */
function owned(ix: IndexData, companies: Record<string, Company>, y: string, industry?: string) {
  let all = 0, reported = 0, n = 0, nReported = 0
  for (const { symbol, weight } of ix.constituents) {
    const c = companies[symbol]
    const r = c?.years[y]
    if (!c || !r || r.w == null || !weight || !c.marketCapCr || !c.payrollWeightCr || (industry && c.industry !== industry)) continue
    const o = (weight / c.marketCapCr) * c.payrollWeightCr
    all += o
    n += 1
    if (r.wKind === 'reported') { reported += o; nReported += 1 }
  }
  return { n, nReported, share: all ? reported / all : 0 }
}

function coverageLine(n: number, nReported: number, share: number): string {
  return nReported === n ? `All ${count(n)} reported directly.` : `${nReported} of ${n} companies reported directly, ${pct(share, 0)} of the payroll.`
}

type Built = { draft: Draft } | { skip: string }

function india({ indexes, companies }: Data): Built[] {
  const ix = indexes.nifty50
  const y = latest(ix)
  const v = ix.years[y]
  const line = `Nivel by The Equal Lens, from the companies' BRSR filings, ${y}.`
  const weighting = "Nivel's arithmetic, weighting each company by how much of it the index holds."
  const mixes = 'It mixes fewer women employed with lower pay per woman, and does not compare pay for the same job.'
  const all = owned(ix, companies, y)
  const out: Built[] = []
  if (all.share < MIN_REPORTED) return [{ skip: `Nifty 50 ${y}: reported figures cover ${pct(all.share, 0)} of the payroll` }]
  const coverage = coverageLine(all.n, all.nReported, all.share)
  out.push({ draft: {
    slot: 'in-nifty50-payshare', period: y, market: 'IN', value: v.headline,
    question: `If you own a Nifty 50 index fund, you own a slice of each company's wage bill. Out of every ₹100 of that wage bill in ${y}, how many rupees went to women?`,
    discussion: 'Is the gap about what women are paid, or about who gets hired?',
    line, rule: `${weighting} ${coverage} ${mixes}`,
    page: 'index/nifty50', saw: `Women's share of pay (payroll you own) · ${fyShort(y)}: ${pct(v.headline)}`,
  } })
  if (v.representationShare != null && v.payShare != null) out.push({ draft: {
    slot: 'in-nifty50-gapsplit', period: y, market: 'IN', value: v.representationShare,
    question: `A Nifty 50 index fund owns a slice of each company's wage bill, and women get less than half of it. Nivel splits that shortfall into two causes: fewer women employed, and less pay for each woman employed. Out of every ₹100 of the shortfall in ${y}, how many rupees come from fewer women employed?`,
    discussion: 'Which is harder to change: who gets hired, or what they are paid?',
    line, rule: `Nivel's split of the gap to half the wage bill, using permanent staff and weighting each company by how much of it the index holds. ${coverage} It does not compare pay for the same job.`,
    page: 'index/nifty50', saw: `${pct(v.representationShare, 0)} too few women employed, ${pct(v.payShare, 0)} women paid less on average (${fyShort(y)})`,
  } })
  // IT and autos, the plan's first pair, miss the 90% bar: Tech Mahindra's and Mahindra & Mahindra's figures are estimates.
  const sectors: [string, string, string, string, string][] = [
    ['in-nifty50-health', 'Healthcare', 'healthcare companies', "Many people picture healthcare as women's work. What might explain this figure?", 'in-nifty50-metals'],
    ['in-nifty50-metals', 'Metals & Mining', 'metals and mining companies', 'Why might metal and mining companies employ and pay so few women, and what would change it?', 'in-nifty50-health'],
  ]
  for (const [slot, industry, plural, discussion, pair] of sectors) {
    const s = v.sectors.find((x) => x.industry === industry)
    const cov = owned(ix, companies, y, industry)
    if (!s || cov.n !== s.companies) { out.push({ skip: `${slot}: sector ${industry} not found or its companies do not match` }); continue }
    if (cov.share < MIN_REPORTED) { out.push({ skip: `${slot}: reported figures cover ${pct(cov.share, 0)} of the payroll` }); continue }
    out.push({ draft: {
      slot, period: y, market: 'IN', value: s.w, pair,
      question: `The Nifty 50 includes ${count(s.companies)} ${plural}. Out of every ₹100 of their wage bill that a Nifty 50 index fund owns, how many rupees went to women in ${y}?`,
      discussion, line, rule: `${weighting} ${coverageLine(cov.n, cov.nReported, cov.share)} ${mixes}`,
      page: 'index/nifty50/sectors', saw: `Sectors · ${fyShort(y)}: ${industry}, women's share of pay ${pct(s.w)}`,
    } })
  }
  return out
}

function uk({ indexes }: Data): Built[] {
  const y = latest(indexes.ftse100)
  const v = indexes.ftse100.years[y]
  if (v.gapMean == null || v.topQuartile == null || v.workforce == null) return [{ skip: `FTSE 100 ${y}: pay structure missing` }]
  const n = v.companiesReported
  const line = `The UK government's gender pay gap service, averaged by Nivel by The Equal Lens, ${y}.`
  return [
    { draft: {
      slot: 'gb-ftse100-pence', period: y, market: 'GB', value: 1 - v.gapMean,
      question: `In ${y}, ${n} FTSE 100 companies reported their UK gender pay gaps. In the average company, for every £1 a man earned an hour, how many pence did a woman earn?`,
      discussion: 'If men and women get the same pay for the same job, why can the average gap still be large?',
      line, rule: `£1 less the average of each company's mean hourly pay gap, ${pct(v.gapMean)}, each company counting equally. UK staff only. It compares all men with all women, not pay for the same job.`,
      page: 'index/ftse100', saw: `Pay structure · ${y}: mean pay gap ${pct(v.gapMean)}`,
    } },
    { draft: {
      slot: 'gb-ftse100-topquarter', period: y, market: 'GB', value: v.topQuartile,
      question: `In ${y}, ${n} FTSE 100 companies reported who sits in each quarter of their UK pay scale. In the average company, out of every 100 people in the best-paid quarter, how many were women?`,
      discussion: 'Why are fewer women in the best-paid quarter than in the company as a whole?',
      line, rule: `Nivel's average of each company's share of women in its best-paid quarter, each company counting equally. UK staff only. Women were ${Math.round(v.workforce * 100)} of every 100 UK staff overall, averaged the same way.`,
      page: 'index/ftse100', saw: `Pay structure · ${y}: women in the top pay quarter ${pct(v.topQuartile)}`,
    } },
  ]
}

function australia({ indexes }: Data): Built[] {
  const y = latest(indexes.asx200)
  const v = indexes.asx200.years[y]
  if (v.topQuartile == null || v.workforce == null) return [{ skip: `ASX 200 ${y}: pay structure missing` }]
  return [{ draft: {
    slot: 'au-asx200-topquarter', period: y, market: 'AU', value: v.topQuartile,
    question: `${v.companiesReported} ASX 200 companies report their Australian staff to the Workplace Gender Equality Agency. Weighting each company by its wage bill, out of every 100 people in the best-paid quarter of jobs in ${y}, how many were women?`,
    discussion: 'What would it take for the best-paid quarter to look like the whole workforce?',
    line: `Australia's Workplace Gender Equality Agency, averaged by Nivel by The Equal Lens, ${y}.`,
    rule: `Nivel's average of each company's share of women in its best-paid quarter, weighted by its Australian wage bill. Australian staff only, groups as they report. Women were ${Math.round(v.workforce * 100)} of every 100 Australian staff overall, weighted the same way.`,
    page: 'index/asx200', saw: `Pay structure · ${fyShort(y)}: women in the top pay quarter ${pct(v.topQuartile)}`,
  } }]
}

function japan({ indexes, companies }: Data): Built[] {
  const v = indexes.nikkei225.years[latest(indexes.nikkei225)]
  const rows = indexes.nikkei225.constituents.map((c) => companies[c.symbol]?.years.latest).filter((r) => r?.managerShare != null)
  if (v.managers == null || !rows.length) return [{ skip: 'Nikkei 225: no manager shares' }]
  const years = new Map<string, number>()
  for (const r of rows) {
    const start = r?.period?.match(/(\d{4})/)?.[1]
    if (start) years.set(start, (years.get(start) ?? 0) + 1)
  }
  const [year, most] = [...years].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  if (most / rows.length < 0.8) return [{ skip: `Nikkei 225: reporting periods are mixed (${year} for ${most} of ${rows.length})` }]
  return [{ draft: {
    slot: 'jp-nikkei225-managers', period: year, market: 'JP', value: v.managers,
    question: `${rows.length} Nikkei 225 companies report to a Japanese government database how many of their managers are women. In the average company's latest report, mostly for ${year}, out of every 100 managers, how many were women?`,
    discussion: 'What would need to change for more women to become managers?',
    line: "Japan's Ministry of Health, Labour and Welfare database, averaged by Nivel by The Equal Lens.",
    rule: `Nivel's average of each company's share of women among its managers, each company counting equally, using each employer's own definition of a manager. ${most} of the ${rows.length} reports start in ${year}.`,
    page: 'index/nikkei225', saw: `Pay structure · latest: women in management ${pct(v.managers)}`,
  } }]
}

/** The current items, in the order the plan lists them, and the reason for each one left out. */
export function buildSpot(data: Data): { items: SpotItem[]; skipped: string[] } {
  const built = [...india(data), ...uk(data), ...australia(data), ...japan(data)]
  return {
    items: built.flatMap((b) => ('draft' in b ? [make(b.draft)] : [])),
    skipped: built.flatMap((b) => ('skip' in b ? [b.skip] : [])),
  }
}

const slotOf = (i: SpotItem) => i.id.slice(0, -(slug(i.nivel.period).length + 1))

/**
 * Today's items merged with every item published before. An item that drops out is kept as `retired`, and a new
 * period's item names the one it `replaces`. `changes` lists what differs from what was published.
 */
export function mergeSpot(current: SpotItem[], published: SpotItem[]): { items: SpotItem[]; changes: string[] } {
  const before = new Map(published.map((i) => [i.id, canonical(i)]))
  const ids = new Set(current.map((i) => i.id))
  const changes: string[] = []
  const items = current.map((i) => {
    const was = before.get(i.id)
    const replaces = was?.nivel.replaces ?? published
      .filter((p) => p.id !== i.id && slotOf(p) === slotOf(i) && p.nivel.period < i.nivel.period)
      .sort((a, b) => b.nivel.period.localeCompare(a.nivel.period))[0]?.id
    const item = canonical({ ...i, nivel: { ...i.nivel, replaces } })
    if (!was) changes.push(`new: ${i.id}`)
    else if (JSON.stringify(was) !== JSON.stringify(item)) changes.push(`changed: ${i.id}`)
    return item
  })
  for (const p of before.values()) {
    if (ids.has(p.id)) continue
    if (p.nivel.status !== 'retired') changes.push(`retired: ${p.id}`)
    items.push(canonical({ ...p, nivel: { ...p.nivel, status: 'retired' } }))
  }
  return { items, changes }
}

const DASH = /[–—]/
const ECHO = /\b(the same (study|survey|report|data|companies|index)|as before|again|previous(ly)?|this time|earlier)\b/i

/** Nivel's own gate (plan section 5.2), stricter than the game's pull: every problem, or none. */
export function checkSpot(items: SpotItem[]): string[] {
  const problems: string[] = []
  const ids = new Set(items.map((i) => i.id))
  if (ids.size !== items.length) problems.push('an id appears twice')
  for (const i of items) {
    const bad = (why: string) => problems.push(`${i.id || '(no id)'}: ${why}`)
    const texts: Record<string, unknown> = {
      theme: i.theme, question: i.question, discussion: i.discussion, 'source.line': i.source?.line, 'source.rule': i.source?.rule,
      'cite.from': i.cite?.from, 'cite.saw': i.cite?.saw, 'nivel.period': i.nivel?.period, 'nivel.market': i.nivel?.market, 'nivel.data': i.nivel?.data,
    }
    const missing = Object.entries(texts).filter(([, v]) => typeof v !== 'string' || !v.trim()).map(([k]) => k)
    if (missing.length) { bad(`missing ${missing.join(', ')}`); continue }
    if (!/^nv-[a-z0-9-]{3,80}$/.test(i.id) || !i.id.endsWith(`-${slug(i.nivel.period)}`)) bad('id is not nv-, lower-case letters, digits and hyphens, ending in its period')
    if (i.format !== 'published') bad('format is not "published"')
    for (const k of ['question', 'discussion', 'source.line', 'source.rule', 'cite.saw']) if (DASH.test(texts[k] as string)) bad(`${k} has an em or en dash`)
    for (const k of ['question', 'discussion']) if (ECHO.test(texts[k] as string)) bad(`${k} assumes an earlier question`)
    if (!Number.isInteger(i.answer) || i.answer < 0 || i.answer > 100) bad('answer is not a whole number from 0 to 100')
    if (!(i.nivel.exact >= 0 && i.nivel.exact <= 100) || Math.round(i.nivel.exact) !== i.answer) bad('nivel.exact is not the answer before rounding')
    if (i.nivel.status !== 'current' && i.nivel.status !== 'retired') bad('nivel.status is neither current nor retired')
    for (const u of [i.cite.from, i.nivel.data, ...i.nivel.markets]) if (!u.startsWith(`${SITE}/`)) bad(`${u} is not a page on Nivel`)
    if (/\/compan(y|ies)(\/|$)/.test(new URL(i.nivel.data).pathname)) bad('links to company pages, which v1 leaves out')
    for (const f of ['pair', 'replaces'] as const) if (i.nivel[f] && !ids.has(i.nivel[f])) bad(`nivel.${f} ${i.nivel[f]} is not in the feed`)
  }
  return problems
}

const ID = { type: 'string', pattern: '^nv-[a-z0-9-]{3,80}$' }
const TEXT = { type: 'string', minLength: 1, pattern: '^[^–—]*$', description: 'Read aloud in the room: no em or en dashes.' }
const PAGE = { type: 'string', pattern: `^${SITE.replace(/\./g, '\\.')}/`, description: 'A page on Nivel.' }

/** Published beside the feed at /feeds/spot/v1.schema.json. */
export const SPOT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SITE}/feeds/spot/v1.schema.json`,
  title: "Nivel's figures for Spot the Stereotype, version 1",
  description: 'Round 1 figures for the workplace theme. A breaking change moves to v2 at a new path; ids never change meaning.',
  type: 'object',
  required: ['kind', 'version', 'generatedAt', 'dataAsOf', 'items'],
  additionalProperties: false,
  properties: {
    kind: { const: 'nivel-spot-feed' },
    version: { const: 1 },
    generatedAt: { type: 'string', format: 'date-time', description: 'When this deploy built the feed.' },
    dataAsOf: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'When Nivel collected the figures.' },
    items: { type: 'array', items: { $ref: '#/$defs/item' } },
  },
  $defs: {
    item: {
      type: 'object',
      required: ['id', 'format', 'theme', 'question', 'answer', 'discussion', 'source', 'cite', 'nivel'],
      additionalProperties: false,
      properties: {
        id: { ...ID, description: 'Ends in the period. A corrected figure keeps its id; a new period gets a new one.' },
        format: { const: 'published' },
        theme: { type: 'string', minLength: 1 },
        question: TEXT,
        answer: { type: 'integer', minimum: 0, maximum: 100, description: 'The figure out of 100, rounded.' },
        discussion: TEXT,
        source: { type: 'object', required: ['line', 'rule'], additionalProperties: false, properties: { line: TEXT, rule: TEXT } },
        cite: {
          type: 'object', required: ['from', 'saw'], additionalProperties: false,
          properties: { from: PAGE, saw: { type: 'string', minLength: 1, description: 'What the page shows.' } },
        },
        nivel: {
          type: 'object', required: ['exact', 'period', 'market', 'status', 'data', 'markets'], additionalProperties: false,
          properties: {
            exact: { type: 'number', minimum: 0, maximum: 100, description: 'The figure out of 100 before rounding.' },
            period: { type: 'string', minLength: 1 },
            market: { enum: ['IN', 'GB', 'AU', 'JP', 'EU'] },
            status: { enum: ['current', 'retired'], description: 'A retired item stays in the feed and is never dealt.' },
            pair: { ...ID, description: 'An item that contrasts with this one.' },
            replaces: { ...ID, description: 'The earlier period of the same figure.' },
            data: PAGE,
            markets: { type: 'array', items: PAGE, description: "Nivel's markets on the figure." },
          },
        },
      },
    },
  },
}
