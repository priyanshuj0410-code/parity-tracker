import type { Company, CompanyYear, IndexData } from '../types'

/**
 * Up to three notable facts for a company's profile, from fixed rules and no model (knowledge/plans/profile-insights.md,
 * PARITY-134). Each rule reads the company's latest year and its market's figures, fires on a stated condition and
 * fills a fixed sentence; the same data always gives the same sentences. Pure: the app builds the context once from a
 * release, and the tests run the same functions in Node.
 */

export type InsightKind = 'where' | 'mix' | 'pay' | 'board' | 'change' | 'standing' | 'data'
export interface Insight {
  rule: string
  kind: InsightKind
  text: string
  strength: number
  /** The company tab whose figures it comes from. */
  tab?: 'trend' | 'peers' | 'calculations'
}

export interface MarketYears { code: string; latest: string; prev?: string; years: string[]; yearStyle?: string }
export interface InsightContext {
  markets: Record<string, MarketYears>
  sectorOf: Record<string, string>
  industry: Map<string, number[]>
  sector: Map<string, number[]>
  index: Map<string, { name: string; values: number[] }>
  indexOf: Record<string, string>
  changes: Map<string, number[]>
}

const KIND_WEIGHT: Record<InsightKind, number> = { where: 1, mix: 0.9, pay: 1, board: 0.8, change: 0.8, standing: 0.6, data: 0.5 }
const IN_MARKET: Record<string, string> = { IN: 'India', GB: 'the UK', AU: 'Australia', JP: 'Japan', EU: 'the EU' }
const STAFF: Record<string, string> = { IN: 'permanent staff', JP: 'regular staff', GB: 'UK staff', AU: 'Australian staff', EU: 'staff' }
const PAY: Record<string, string> = { GB: 'average hourly pay', AU: 'average full-time-equivalent pay' }

const pct = (x: number) => `${Math.round(x * 100)}%`
const pp = (d: number) => `${(Math.abs(d) * 100).toFixed(1)} pp`
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
const quantile = (xs: number[], q: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))] }
const article = (n: number) => ([8, 11, 18].includes(n) || (n >= 80 && n < 90) ? 'an' : 'a')
const fyLabel = (m: MarketYears, y: string) => (m.yearStyle === 'fy' && /^\d{4}-\d\d$/.test(y) ? `FY${y.slice(5)}` : y)

const usable = (y?: CompanyYear) => !!y && y.w != null && y.wKind === 'reported' && y.dq !== 4
const staffShare = (c: Company, y: CompanyYear) => (c.country === 'IN' || c.country === 'JP' ? y.fPerm : y.fAll) ?? null
function wageParity(c: Company, y: CompanyYear): number | null {
  if (c.country !== 'IN') return y.gapMean == null ? null : 1 - y.gapMean
  if (y.w == null || y.fPerm == null || !(y.fPerm > 0 && y.fPerm < 1 && y.w > 0 && y.w < 1)) return null
  return (y.w / y.fPerm) / ((1 - y.w) / (1 - y.fPerm))
}

/** A like-for-like change into y1: both reported, no basis change, never more than 15 points (checked, not shown). */
function change(c: Company, y1: string, y0: string): number | null {
  const a = c.years[y0], b = c.years[y1]
  if (!usable(a) || !usable(b) || b.basisChange) return null
  const d = b.w! - a.w!
  return Math.abs(d) > 0.15 ? null : d
}

/** The year a profile speaks for: the market's latest, else the year before (prefixed with its label). */
function latest(c: Company, m: MarketYears): [string, CompanyYear] | null {
  for (const y of [m.latest, m.prev]) if (y && c.years[y]?.w != null) return [y, c.years[y]]
  return null
}

type Rule = { id: string; kind: InsightKind; weight: number; tab?: Insight['tab']; run: (c: Company, y: CompanyYear, yk: string, m: MarketYears, ctx: InsightContext) => [number, string] | null }

const RULES: Rule[] = [
  {
    id: 'ladder', kind: 'where', weight: 1,
    // The most senior rung reported (top or senior management, KMP, board or officers; 5+ people, some of them women)
    // 20 points or more below the staff share.
    run: (c, y) => {
      const e = staffShare(c, y)
      if (e == null) return null
      const rungs: { rank: number; share: number; text: string }[] = []
      for (const lv of y.levels ?? []) {
        const n = (lv.women ?? 0) + (lv.men ?? 0)
        if ((lv.standard === 'top' || lv.standard === 'senior') && lv.share != null && (n >= 5 || lv.women == null))
          rungs.push({ rank: lv.standard === 'top' ? 2 : 1, share: lv.share, text: `${pct(lv.share)} of ${lv.standard} management` })
      }
      const kmp = y.staff?.kmp
      if (kmp && kmp.women > 0 && kmp.women + kmp.men >= 5) rungs.push({ rank: 2, share: kmp.women / (kmp.women + kmp.men), text: `${kmp.women} of ${kmp.women + kmp.men} key managers` })
      if (y.board && y.boardWomen && y.board >= 5) {  // no women at all is the board rule's sentence
        const who = c.country === 'JP' ? 'officers' : 'directors'
        const minimum = c.country === 'IN' && y.boardWomen === 1 && y.board >= 8 ? ', the minimum the law requires' : ''
        rungs.push({ rank: 3, share: y.boardWomen / y.board, text: `${y.boardWomen} of ${y.board} ${who}${minimum}` })
      }
      if (!rungs.length) return null
      const top = rungs.reduce((a, b) => (e - b.share > e - a.share || (e - b.share === e - a.share && b.rank > a.rank) ? b : a))
      if (e - top.share < 0.2) return null
      return [(e - top.share) / 0.2, `Women are ${pct(e)} of ${STAFF[c.country]} and ${top.text}.`]
    },
  },
  {
    id: 'top-quartile', kind: 'where', weight: 1,
    // UK, Australia: women's share of the top pay quartile 15 points or more below their staff share.
    run: (c, y) => {
      const e = staffShare(c, y), tq = y.topQuartile
      if (e == null || tq == null || e - tq < 0.15) return null
      return [(e - tq) / 0.15, `Women are ${pct(e)} of ${STAFF[c.country]} and ${pct(tq)} of the top pay quartile.`]
    },
  },
  {
    id: 'managers', kind: 'where', weight: 1,
    // Japan: women's share of managers 15 points or more below their share of regular staff.
    run: (c, y) => {
      const e = staffShare(c, y), ms = y.managerShare
      if (c.country !== 'JP' || e == null || ms == null || e - ms < 0.15) return null
      return [(e - ms) / 0.15, `Women are ${pct(e)} of regular staff and ${pct(ms)} of managers.`]
    },
  },
  {
    id: 'workers-office', kind: 'mix', weight: 1,
    // India: women's share of workers and of other employees 40 points or more apart, 50+ people in each.
    run: (c, y) => {
      const wk = y.staff?.workers, em = y.staff?.employees
      if (c.country !== 'IN' || !wk || !em || wk.women + wk.men < 50 || em.women + em.men < 50) return null
      const fw = wk.women / (wk.women + wk.men), fe = em.women / (em.women + em.men)
      if (Math.abs(fw - fe) < 0.4) return null
      const [hi, lo] = fw > fe ? [`${pct(fw)} of workers`, `${pct(fe)} of other employees`] : [`${pct(fe)} of other employees`, `${pct(fw)} of workers`]
      return [Math.abs(fw - fe) / 0.4, `Women are ${hi} and ${lo}.`]
    },
  },
  {
    id: 'above-parity-mix', kind: 'pay', weight: 1.2, tab: 'calculations',
    // A share of pay at or above parity only because most staff are women: S 50%+ while wage parity is under 70%.
    run: (c, y) => {
      const w = wageParity(c, y)
      if (y.w! < 0.5 || w == null || w >= 0.7 || w < 0.3) return null
      return [2, `Women get ${pct(y.w!)} of pay because most staff are women; their ${PAY[c.country] ?? 'average pay'} is ${pct(w)} of men's.`]
    },
  },
  {
    id: 'pay-below-staff', kind: 'pay', weight: 1, tab: 'calculations',
    // A share of pay 10 points or more below the share of staff.
    run: (c, y) => {
      const e = staffShare(c, y)
      if (e == null || e - y.w! < 0.1) return null
      return [(e - y.w!) / 0.1, `Women are ${pct(e)} of ${STAFF[c.country]} and get ${pct(y.w!)} of pay.`]
    },
  },
  {
    id: 'wage-parity', kind: 'pay', weight: 0.9, tab: 'calculations',
    // Wage parity under 50% (and comparable), level with men's (99.5 to 101.5%), or above.
    run: (c, y) => {
      const w = wageParity(c, y), pay = PAY[c.country] ?? 'average pay'
      if (w == null || w < 0.3 || w > 1.3) return null
      if (w < 0.5) return [(0.5 - w) / 0.1 + 1, `Women's ${pay} is ${pct(w)} of men's.`]
      if (w >= 0.995 && w < 1.015) return [1, `Women's ${pay} is level with men's.`]
      if (w >= 1.015) return [1 + (w - 1) / 0.1, `Women's ${pay} is ${pct(w)} of men's, above parity.`]
      return null
    },
  },
  {
    id: 'bonus-gap', kind: 'pay', weight: 0.8,
    // UK: a mean bonus gap of 40% or more.
    run: (_c, y) => (y.bonusGapMean != null && y.bonusGapMean >= 0.4 ? [1 + (y.bonusGapMean - 0.4) / 0.2, `Women's mean bonus is ${pct(y.bonusGapMean)} below men's.`] : null),
  },
  {
    id: 'board', kind: 'board', weight: 1,
    // No women; India's legal minimum of one on a board of 8+; or 40% and more.
    run: (c, y) => {
      const b = y.board, bw = y.boardWomen
      if (!b || bw == null || b < 5) return null
      if (bw === 0) return [2, c.country === 'JP' ? `No women among ${b} officers.` : `No women on ${article(b)} ${b}-member board.${c.country === 'IN' ? ' Listed companies must have at least one.' : ''}`]
      if (bw === 1 && c.country === 'IN' && b >= 8) return [1, `One woman on ${article(b)} ${b}-member board, the minimum the law requires.`]
      if (bw / b >= 0.4) return [1 + (bw / b - 0.4) / 0.1, `Women hold ${bw} of ${b} ${c.country === 'JP' ? 'officer posts' : 'board seats'}.`]
      return null
    },
  },
  {
    id: 'big-move', kind: 'change', weight: 1, tab: 'trend',
    // A like-for-like change of 2 points or more, in the market's top or bottom tenth.
    run: (c, _y, yk, m, ctx) => {
      if (!m.prev || yk !== m.latest) return null
      const d = change(c, m.latest, m.prev), xs = ctx.changes.get(c.country) ?? []
      if (d == null || Math.abs(d) < 0.02 || xs.length < 30) return null
      if (d > 0 && d >= quantile(xs, 0.9)) return [d / 0.02, `Women's share of pay rose ${pp(d)} since ${fyLabel(m, m.prev)}, among the largest rises in ${IN_MARKET[c.country]}.`]
      if (d < 0 && d <= quantile(xs, 0.1)) return [-d / 0.02, `Women's share of pay fell ${pp(d)} since ${fyLabel(m, m.prev)}, among the largest falls in ${IN_MARKET[c.country]}.`]
      return null
    },
  },
  {
    id: 'streak', kind: 'change', weight: 1, tab: 'trend',
    // Three or more like-for-like changes in a row in one direction, each 0.2 points or more, ending in the latest year.
    run: (c, _y, yk, m) => {
      const ys = m.years.filter((k) => c.years[k])
      let run: string[] = [], sign = 0
      for (let i = 1; i < ys.length; i++) {
        const d = change(c, ys[i], ys[i - 1])
        const s = d == null || Math.abs(d) < 0.002 ? 0 : d > 0 ? 1 : -1
        if (s && s === sign) run.push(ys[i])
        else if (s) { run = [ys[i - 1], ys[i]]; sign = s }
        else { run = []; sign = 0 }
      }
      if (run.length < 4 || run[run.length - 1] !== yk) return null
      const a = c.years[run[0]].w!, b = c.years[run[run.length - 1]].w!
      return [run.length - 2, `${sign > 0 ? 'Up' : 'Down'} ${run.length - 1} years running: ${pct(a)} in ${fyLabel(m, run[0])} to ${pct(b)} in ${fyLabel(m, run[run.length - 1])}.`]
    },
  },
  {
    id: 'standing', kind: 'standing', weight: 0.7, tab: 'peers',
    // Twice or under half the median share of pay of its industry in its market (8+ peers, else its sector), or of its
    // index, and 8 points or more apart. The sentence names both comparisons it has.
    run: (c, y, _yk, _m, ctx) => {
      let peers = ctx.industry.get(`${c.country}|${c.industry}`) ?? [], label = c.industry
      if (peers.length < 8) { peers = ctx.sector.get(`${c.country}|${ctx.sectorOf[c.symbol]}`) ?? []; label = ctx.sectorOf[c.symbol] }
      const parts: { med: number; text: string }[] = []
      if (peers.length >= 8) parts.push({ med: median(peers), text: `the ${label} median in ${IN_MARKET[c.country]}` })
      const ix = ctx.index.get(ctx.indexOf[c.symbol] ?? '')
      if (ix && ix.values.length >= 8) parts.push({ med: median(ix.values), text: `the ${ix.name} median` })
      const crosses = (med: number) => Math.abs(y.w! - med) >= 0.08 && (y.w! >= 2 * med || y.w! <= med / 2)
      if (!parts.some((p) => crosses(p.med))) return null
      const say = (p: { med: number; text: string }) => (y.w! >= 2 * p.med ? `${(y.w! / p.med).toFixed(1)} times ${p.text}` : y.w! <= p.med / 2 ? `under half ${p.text}` : `${y.w! > p.med ? 'above' : 'below'} ${p.text}`) + ` (${pct(p.med)})`
      const strength = Math.max(...parts.filter((p) => crosses(p.med)).map((p) => Math.max(y.w! / p.med, p.med / y.w!)))
      return [strength, `Women get ${pct(y.w!)} of pay, ${parts.map(say).join(' and ')}.`]
    },
  },
  {
    id: 'restated', kind: 'data', weight: 1, tab: 'calculations',
    // The year before was restated by a point or more in this year's filing (decision 0020).
    run: (c, _y, yk, m) => {
      const p = m.prev ? c.years[m.prev] : undefined
      if (!p || p.restatedIn !== yk || p.wFiled == null || p.w == null || Math.abs(p.w - p.wFiled) < 0.01) return null
      return [Math.abs(p.w - p.wFiled) / 0.01, `The ${fyLabel(m, yk)} filing restates ${fyLabel(m, m.prev!)} from ${(p.wFiled * 100).toFixed(1)}% to ${(p.w * 100).toFixed(1)}%.`]
    },
  },
]

/** Every rule, for the Method page: id, kind and the condition it fires on (the comment above each). */
export const INSIGHT_RULES = RULES.map(({ id, kind }) => ({ id, kind }))

/** The context the rules compare against, built once from a release's companies and indexes. */
export function buildContext(companies: Company[], markets: Record<string, MarketYears>, sectorOf: Record<string, string>, indexes: IndexData[], indexOrder: string[]): InsightContext {
  const ctx: InsightContext = { markets, sectorOf, industry: new Map(), sector: new Map(), index: new Map(), indexOf: {}, changes: new Map() }
  const push = <K>(map: Map<K, number[]>, k: K, v: number) => { const a = map.get(k); if (a) a.push(v); else map.set(k, [v]) }
  const latestW: Record<string, number> = {}
  for (const c of companies) {
    const m = markets[c.country]
    if (!m) continue
    const l = latest(c, m)
    if (!l || !usable(l[1])) continue
    latestW[c.symbol] = l[1].w!
    push(ctx.industry, `${c.country}|${c.industry}`, l[1].w!)
    push(ctx.sector, `${c.country}|${sectorOf[c.symbol] ?? c.industry}`, l[1].w!)
    if (m.prev) { const d = change(c, m.latest, m.prev); if (d != null) push(ctx.changes, c.country, d) }
  }
  const real = indexes.filter((ix) => ix.kind !== 'group')
  const order = [...real].sort((a, b) => (indexOrder.indexOf(a.id) + 1 || 999) - (indexOrder.indexOf(b.id) + 1 || 999))
  for (const ix of order) {
    const members = [...ix.constituents.map((x) => x.symbol), ...ix.missing]
    ctx.index.set(ix.id, { name: ix.name, values: members.map((s) => latestW[s]).filter((v) => v != null) })
    if (!indexOrder.includes(ix.id)) continue
    for (const s of members) ctx.indexOf[s] ??= ix.id
  }
  return ctx
}

/** The company's insights: reported figures only, none from a figure under an open data check, at most three, one of each kind. */
export function insights(c: Company, ctx: InsightContext): Insight[] {
  const m = ctx.markets[c.country]
  const l = m && latest(c, m)
  if (!l) return []
  const [yk, y] = l
  if (!usable(y) || y.held) return []
  const fired: Insight[] = []
  for (const r of RULES) {
    const out = r.run(c, y, yk, m, ctx)
    if (out) fired.push({ rule: r.id, kind: r.kind, text: out[1], strength: Math.min(out[0], 3) * r.weight * KIND_WEIGHT[r.kind], tab: r.tab })
  }
  fired.sort((a, b) => b.strength - a.strength)
  const picked: Insight[] = []
  const e = staffShare(c, y)
  for (const f of fired) {
    if (picked.some((p) => p.kind === f.kind)) continue
    if (f.rule === 'board' && picked.some((p) => p.rule === 'ladder' && /directors|officers/.test(p.text))) continue
    if (f.rule === 'pay-below-staff' && e != null && picked.some((p) => p.text.startsWith(`Women are ${pct(e)} of`)))
      f.text = `Women get ${pct(y.w!)} of pay, ${Math.round((e - y.w!) * 100)} points below their share of staff.`
    picked.push(f)
    if (picked.length === 3) break
  }
  return yk === m.latest ? picked : picked.map((p) => ({ ...p, text: `${fyLabel(m, yk)}: ${p.text}` }))
}
