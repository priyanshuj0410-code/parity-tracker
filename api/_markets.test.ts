import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminRoute, ageOn, playerRoute } from './_markets.js'
import type { Book, Ctx, Details, LogEntry, Players, Proposal, Settlement } from './_markets.js'
import { closesAt, inWeek, outcomeFor, parseSubject } from './_market_rules.js'
import { createEngine, memoryLedger, memoryStore } from '../vendor/market-engine/index.js'
import type { MarketStore } from '../vendor/market-engine/index.js'

const NOW = new Date('2026-10-06T12:00:00Z')

// The engine's in-memory store with UUID ids, as Postgres gives, since the routes check ids.
function uuidStore(): MarketStore {
  const s = memoryStore()
  const toUuid = new Map<string, string>()
  const toMem = new Map<string, string>()
  const u = (m: string) => {
    if (!toUuid.has(m)) {
      const id = `00000000-0000-4000-8000-${String(toUuid.size + 1).padStart(12, '0')}`
      toUuid.set(m, id)
      toMem.set(id, m)
    }
    return toUuid.get(m) as string
  }
  const m = (id: string) => toMem.get(id) ?? id
  const rekey = <V>(map: Map<string, V>) => new Map([...map].map(([k, v]) => [u(k), v]))
  return {
    get: async (id) => {
      const r = await s.get(m(id))
      return r && { ...r, id: u(r.id) }
    },
    list: async (q) => (await s.list(q)).map((r) => ({ ...r, id: u(r.id) })),
    create: async (x) => u(await s.create(x)),
    setQuantities: (id, a, b) => s.setQuantities(m(id), a, b),
    close: (id, status, outcome, url) => s.close(m(id), status, outcome, url),
    holding: (user, id) => s.holding(user, m(id)),
    holdings: (id) => s.holdings(m(id)),
    holdingsFor: async (user, ids) => rekey(await s.holdingsFor(user, ids.map(m))),
    record: (t) => s.record({ ...t, marketId: m(t.marketId) }),
    stats: async (ids) => rekey(await s.stats(ids.map(m))),
  }
}

type TestBook = Book & {
  entries: LogEntry[]
  propose(week: string, body: object): string
  prepare(s: Settlement): void
}

// In-memory book; `propose` and `prepare` stand in for `pnpm markets propose` and `pnpm markets settle`.
function memoryBook(clock: () => Date): TestBook {
  const details = new Map<string, Details>()
  const entries: LogEntry[] = []
  const proposals: Proposal[] = []
  const settlements = new Map<string, Settlement>()
  return {
    entries,
    details: async (ids) => new Map(ids.flatMap((i) => (details.has(i) ? [[i, details.get(i) as Details]] : []))),
    save: async (d) => void details.set(d.marketId, d),
    log: async (e) => void entries.push({ ...e, at: clock().toISOString() }),
    history: async (id) => entries.filter((e) => e.marketId === id),
    proposals: async () => proposals.map((p) => ({ ...p })),
    decide: async (id, status, marketId, reason) => {
      Object.assign(proposals.find((p) => p.id === id) as Proposal, { status, marketId, reason, decidedAt: clock().toISOString() })
    },
    settlements: async (ids) => new Map(ids.flatMap((i) => (settlements.has(i) ? [[i, settlements.get(i) as Settlement]] : []))),
    propose: (week, body) => {
      const id = `10000000-0000-4000-8000-${String(proposals.length + 1).padStart(12, '0')}`
      proposals.push({ id, week, status: 'proposed', body: body as Record<string, unknown>, rationale: 'Test.', marketId: null, reason: null, proposedAt: clock().toISOString(), decidedAt: null })
      return id
    },
    prepare: (s) => void settlements.set(s.marketId, s),
  }
}

type TestCtx = Ctx & { kept: Map<string, number>; book: TestBook; setNow(d: string): void; files: Map<string, string> }

function ctx(enabled = true): TestCtx {
  let now = NOW
  const clock = () => now
  const kept = new Map<string, number>()
  const files = new Map<string, string>()
  const players: Players = {
    isAdult: async (u) => kept.has(u),
    record: async (u, y) => void kept.set(u, y),
    forget: async (u) => void kept.delete(u),
  }
  return {
    kept,
    files,
    setNow: (d) => (now = new Date(d)),
    engine: createEngine({ store: uuidStore(), ledger: memoryLedger(), enabled: () => enabled, isAdult: (u) => players.isAdult(u), now: clock }),
    players,
    book: memoryBook(clock),
    releaseFile: async (id, path) => files.get(`${id}/${path}`) ?? null,
    // "Bearer <user>" signs in as <user>; owner@nivel.test is the admin.
    verify: async (a) => (a?.startsWith('Bearer ') ? { sub: a.slice(7), email: `${a.slice(7)}@nivel.test` } : null),
    admins: ['owner@nivel.test'],
    enabled,
    authUrl: 'https://auth.nivel.test/neondb/auth',
    now: clock,
  }
}

const req = (method: string, path: string, user?: string, body?: unknown) =>
  new Request(`https://nivel.test${path}`, {
    method,
    headers: { ...(user ? { authorization: `Bearer ${user}` } : {}), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const call = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, unknown> })

// Worked examples 2 and 1 of knowledge/plans/market-templates.md, on the weekly cycle (decision 0018): the week opens
// on Sunday 15 November 2026 at 21:00 IST, and PLFS publishes on Tuesday the 17th.
const WEEK = '2026-11-15'
const OPENING = '2026-11-15T15:30:00Z'
const MARKET = {
  template: 'official',
  subject: 'in:women15plus:lfpr-cws:2026-10',
  threshold: 34.2,
  precision: 1,
  question: "Will India's labour force participation rate for women aged 15 and over be at least 34.2% for October 2026?",
  definition: 'Labour force participation rate, current weekly status, women aged 15 and over, all-India.',
  releaseName: 'PLFS monthly bulletin for October 2026',
  scheduledDate: '2026-11-17',
  scheduleDoc: { name: 'MoSPI Advance Release Calendar 2026-27', url: 'https://www.mospi.gov.in/calendar-2026-27.pdf', readOn: '2026-10-06' },
  resolutionLocation: 'All-India female LFPR row, age 15 and over',
  source: { name: 'PLFS, MoSPI', url: 'https://www.mospi.gov.in/' },
}

const NIVEL_MARKET = {
  ...MARKET,
  template: 'nivel-data',
  subject: 'in:nifty50:payshare:fy2026-27',
  threshold: 21,
  question: "Will the Nifty 50's women's share of pay for FY2026-27 be at least 21.0%?",
  definition: "Women's share of each company's pay, weighted by the owned payroll, from BRSR filings.",
  releaseName: "Nivel's first release with FY2026-27 at 90% of payroll reported",
  scheduledDate: '2027-10-29',
  scheduleDoc: { name: "Nivel's release calendar", url: 'https://nivel-equal-lens.vercel.app/method', readOn: '2026-10-06' },
  resolutionLocation: 'indexes/nifty50.json, years["2026-27"].headline',
  source: { name: 'Nivel by The Equal Lens', url: 'https://nivel-equal-lens.vercel.app/index/nifty50' },
}

const admin = async (c: TestCtx, body: object) => call(await adminRoute(req('POST', '/api/markets-admin', 'owner', body), c))
// Proposed on Saturday, approved by the owner: the only way a market is made.
const create = async (c: TestCtx, m: object = MARKET, week = WEEK) => (await admin(c, { action: 'approve', proposalId: c.book.propose(week, m) })).body.id as string
const open = (c: TestCtx) => c.setNow(OPENING)
const adult = (c: TestCtx, u: string) => playerRoute(req('POST', '/api/markets', u, { action: 'age', birthDate: '1990-05-17' }), c)

test('age is whole years to the IST date', () => {
  assert.equal(ageOn('2008-10-06', NOW), 18)
  assert.equal(ageOn('2008-10-07', NOW), 17)
  assert.equal(ageOn('2008-10-07', new Date('2026-10-06T18:30:00Z')), 18)
  for (const bad of ['2008-02-30', '06-10-2008', '2030-01-01', '1890-01-01', '']) assert.equal(ageOn(bad, NOW), null)
})

test('an under-18 is refused and nothing is kept', async () => {
  const c = ctx()
  const r = await call(await playerRoute(req('POST', '/api/markets', 'kid', { action: 'age', birthDate: '2010-01-01' }), c))
  assert.deepEqual([r.status, r.body.error], [403, 'under_18'])
  assert.equal(c.kept.size, 0)
  const w = await call(await playerRoute(req('GET', '/api/markets?view=wallet', 'kid'), c))
  assert.deepEqual([w.status, w.body.error], [403, 'not_adult'])
})

test('an adult keeps only the year, then gets a wallet and trades', async () => {
  const c = ctx()
  const id = await create(c)
  open(c)
  assert.equal((await call(await adult(c, 'ana'))).status, 200)
  assert.equal(c.kept.get('ana'), 1990)
  assert.equal((await call(await playerRoute(req('GET', '/api/markets?view=wallet', 'ana'), c))).body.balance, 1_000)
  const t = await call(await playerRoute(req('POST', '/api/markets', 'ana', { action: 'trade', marketId: id, side: 'yes', shares: 50 }), c))
  assert.equal(t.status, 200)
  const list = await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`, 'ana'), c))
  const [m] = list.body.markets as { position?: { sharesYes: number }; source: { url: string }; details: { threshold: number } }[]
  assert.equal(m.position?.sharesYes, 50)
  assert.equal(m.source.url, MARKET.source.url)
  assert.equal(m.details.threshold, 34.2)
})

test('reads are public, without positions', async () => {
  const c = ctx()
  await create(c)
  open(c)
  const r = await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`), c))
  assert.equal((r.body.markets as unknown[]).length, 1)
  assert.equal((r.body.markets as { position?: unknown }[])[0].position, undefined)
})

test('switched off: reads are empty, actions refused, deletion still works', async () => {
  const c = ctx(false)
  await create(c)
  open(c)
  assert.deepEqual((await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`), c))).body.markets, [])
  const age = await call(await playerRoute(req('POST', '/api/markets', 'ana', { action: 'age', birthDate: '1990-05-17' }), c))
  assert.deepEqual([age.status, age.body.error], [403, 'markets_disabled'])
  assert.equal((await call(await playerRoute(req('POST', '/api/markets', 'ana', { action: 'forget' }), c))).status, 200)
})

test('not configured: reads are empty, everything else is 503', async () => {
  assert.deepEqual((await call(await playerRoute(req('GET', '/api/markets?subject=x'), null))).body, { markets: [] })
  assert.equal((await playerRoute(req('POST', '/api/markets', 'ana', { action: 'claim' }), null)).status, 503)
  assert.equal((await adminRoute(req('GET', '/api/markets-admin', 'owner'), null)).status, 503)
})

test('forget removes the adult record', async () => {
  const c = ctx()
  await playerRoute(req('POST', '/api/markets', 'ana', { action: 'age', birthDate: '1990-05-17' }), c)
  await playerRoute(req('POST', '/api/markets', 'ana', { action: 'forget' }), c)
  assert.equal(c.kept.has('ana'), false)
})

test('only allowlisted admins reach the console', async () => {
  const c = ctx()
  assert.equal((await adminRoute(req('GET', '/api/markets-admin'), c)).status, 401)
  assert.equal((await adminRoute(req('GET', '/api/markets-admin', 'ana'), c)).status, 403)
  assert.equal((await adminRoute(req('GET', '/api/markets-admin', 'owner'), c)).status, 200)
})

test('there is no free create: markets come only from approved proposals', async () => {
  const c = ctx()
  assert.equal((await admin(c, { action: 'create', ...MARKET })).status, 400)
  assert.equal(c.book.entries.length, 0)
})

test('an approved proposal must meet its template and the weekly window', async () => {
  const c = ctx()
  for (const [bad, error] of [
    [{ ...MARKET, template: 'free-text' }, 'bad_request'],
    [{ ...MARKET, subject: 'Nifty 50' }, 'bad_request'],
    [{ ...MARKET, template: 'nivel-data' }, 'bad_request'],
    [{ ...MARKET, scheduleDoc: { ...MARKET.scheduleDoc, url: 'http://example.org' } }, 'bad_request'],
    [{ ...MARKET, source: undefined }, 'bad_request'],
    [{ ...MARKET, question: 'Will the rate rise in October 2026?' }, 'bad_request'],
    [{ ...MARKET, threshold: '34.2' }, 'bad_request'],
    [{ ...MARKET, precision: undefined }, 'bad_request'],
    [{ ...MARKET, scheduledDate: '2026-11-16' }, 'outside_week'],
    [{ ...MARKET, scheduledDate: '2026-11-21' }, 'outside_week'],
    [{ ...NIVEL_MARKET, scheduledDate: '2027-10-28' }, 'already_closed'],
  ] as const) {
    const week = bad.template === 'nivel-data' ? '2027-10-24' : WEEK
    const r = await admin(c, { action: 'approve', proposalId: c.book.propose(week, bad) })
    assert.equal(r.body.error, error, JSON.stringify(bad).slice(0, 80))
  }
  assert.ok(await create(c))
})

test('the weekly window is Tuesday to Friday after the opening Sunday', () => {
  assert.deepEqual(['2026-11-16', '2026-11-17', '2026-11-20', '2026-11-21'].map((d) => inWeek(WEEK, d)), [false, true, true, false])
  assert.equal(inWeek('2026-11-16', '2026-11-18'), false)
})

test('one open market per subject', async () => {
  const c = ctx()
  await create(c)
  assert.equal((await admin(c, { action: 'approve', proposalId: c.book.propose(WEEK, MARKET) })).body.error, 'subject_taken')
})

test('players see a market only from 21:00 IST on its Sunday', async () => {
  const c = ctx()
  const id = await create(c)
  await adult(c, 'ana')
  assert.deepEqual((await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`), c))).body.markets, [])
  assert.equal((await playerRoute(req('GET', `/api/markets?market=${id}`), c)).status, 404)
  const early = await call(await playerRoute(req('POST', '/api/markets', 'ana', { action: 'trade', marketId: id, side: 'yes', shares: 20 }), c))
  assert.equal(early.body.error, 'no_market')
  const listed = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.markets as { upcoming: boolean; details: { opensAt: string } }[]
  assert.deepEqual([listed[0].upcoming, listed[0].details.opensAt], [true, '2026-11-15T15:30:00.000Z'])
  open(c)
  assert.equal(((await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`), c))).body.markets as unknown[]).length, 1)
})

test('a rejected proposal stays rejected, and approval ends with the week', async () => {
  const c = ctx()
  const p = c.book.propose(WEEK, MARKET)
  assert.equal((await admin(c, { action: 'reject', proposalId: p, reason: 'Threshold too easy.' })).status, 200)
  assert.equal((await admin(c, { action: 'approve', proposalId: p })).body.error, 'already_decided')
  const late = c.book.propose(WEEK, { ...MARKET, subject: 'in:women15plus:lfpr-cws:2026-11' })
  c.setNow('2026-11-21T03:30:00Z')
  assert.equal((await admin(c, { action: 'approve', proposalId: late })).body.error, 'week_over')
  const ps = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.proposals as { status: string; reason: string | null; settleBy: string }[]
  assert.deepEqual([ps[0].status, ps[0].reason, ps[0].settleBy], ['rejected', 'Threshold too easy.', '2026-11-21T03:30:00.000Z'])
})

test('a prepared settlement shows on its market in the console', async () => {
  const c = ctx()
  const id = await create(c)
  c.book.prepare({ marketId: id, figure: 35.1, releaseId: null, sourceUrl: 'https://www.mospi.gov.in/plfs-oct-2026.pdf', releaseName: MARKET.releaseName, outcome: 'yes', note: null })
  const [m] = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.markets as { settlement: Settlement }[]
  assert.deepEqual([m.settlement.figure, m.settlement.outcome], [35.1, 'yes'])
})

test('trading closes the day before the release, or at the end of the financial year for Nivel data', async () => {
  const official = closesAt('official', parseSubject(MARKET.subject)!, MARKET.scheduledDate)
  assert.equal(official.toISOString(), '2026-11-16T18:29:00.000Z')
  const nivel = closesAt('nivel-data', parseSubject(NIVEL_MARKET.subject)!, NIVEL_MARKET.scheduledDate)
  assert.equal(nivel.toISOString(), '2027-03-31T18:29:00.000Z')
  const c = ctx()
  const id = await create(c)
  await adult(c, 'ana')
  c.setNow('2026-11-16T18:30:00Z')
  const t = await call(await playerRoute(req('POST', '/api/markets', 'ana', { action: 'trade', marketId: id, side: 'yes', shares: 20 }), c))
  assert.deepEqual([t.status, t.body.error], [400, 'trading_closed'])
})

test('console accounts cannot play', async () => {
  const c = ctx()
  const r = await call(await playerRoute(req('POST', '/api/markets', 'owner', { action: 'age', birthDate: '1980-01-01' }), c))
  assert.deepEqual([r.status, r.body.error], [403, 'console_account'])
})

test('a tie at the source precision is a yes', () => {
  assert.equal(outcomeFor(34.24, 34.2, 1), 'yes')
  assert.equal(outcomeFor(34.15, 34.2, 1), 'yes')
  assert.equal(outcomeFor(34.14, 34.2, 1), 'no')
})

test('resolve: after closing, from the figure, confirmed by the owner, logged once', async () => {
  const c = ctx()
  const id = await create(c)
  open(c)
  await adult(c, 'ana')
  await playerRoute(req('POST', '/api/markets', 'ana', { action: 'trade', marketId: id, side: 'yes', shares: 100 }), c)
  const resolve = (outcome: string, figure = 35.1) => ({ action: 'resolve', marketId: id, outcome, figure, sourceUrl: 'https://www.mospi.gov.in/plfs-oct-2026.pdf', releaseName: MARKET.releaseName })
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', resolve('yes')), c)).status, 409)
  c.setNow('2026-11-17T10:00:00Z')
  const mismatch = await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', resolve('no')), c))
  assert.deepEqual([mismatch.status, mismatch.body.error, mismatch.body.outcome], [409, 'outcome_mismatch', 'yes'])
  assert.equal((await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', resolve('yes')), c))).status, 200)
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', resolve('yes')), c)).status, 409)
  const page = await call(await playerRoute(req('GET', `/api/markets?market=${id}`), c))
  const log = page.body.log as LogEntry[]
  assert.deepEqual(log.map((e) => e.action), ['create', 'resolve'])
  assert.deepEqual([log[1].figure, log[1].outcome], [35.1, 'yes'])
  // Players see "the owner", never the console user's email; the stored log keeps the email.
  assert.deepEqual(log.map((e) => e.by), ['the owner', 'the owner'])
  assert.ok(!JSON.stringify(page.body).includes('@'))
  assert.equal(c.book.entries[1].by, 'owner@nivel.test')
  assert.equal((page.body.market as { status: string }).status, 'resolved')
})

test('Nivel data resolves on the release itself, and only at 90% of payroll reported', async () => {
  // Nivel data cannot run on the weekly cycle (its trading closes at the end of the financial year), so this market is
  // seeded directly, as an earlier cycle could have left one.
  const c = ctx()
  const id = await c.engine.createMarket({ subject: NIVEL_MARKET.subject, question: NIVEL_MARKET.question, priorYes: 0.5 })
  await c.book.save({
    marketId: id, template: 'nivel-data', subject: NIVEL_MARKET.subject, threshold: 21, precision: 2, definition: NIVEL_MARKET.definition,
    releaseName: NIVEL_MARKET.releaseName, scheduledDate: '2027-10-29T00:00:00.000Z', scheduleDoc: NIVEL_MARKET.scheduleDoc,
    closesAt: '2027-03-31T18:29:00.000Z', resolutionLocation: NIVEL_MARKET.resolutionLocation, opensAt: '2026-10-06T00:00:00.000Z',
  })
  c.setNow('2027-10-29T10:00:00Z')
  const year = (share: number) => JSON.stringify({ years: { '2026-27': { headline: 0.2112, reportedPayrollShare: share } } })
  c.files.set('20271029-100000/v1/indexes/nifty50.json', year(0.85))
  const body = { action: 'resolve', marketId: id, outcome: 'yes', releaseId: '20271029-100000', sourceUrl: 'https://nivel-equal-lens.vercel.app/index/nifty50', releaseName: 'Nivel release 20271029-100000' }
  assert.equal((await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', body), c))).body.error, 'not_settled')
  c.files.set('20271029-100000/v1/indexes/nifty50.json', year(0.93))
  const ok = await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', { ...body, figure: 1 }), c))
  assert.deepEqual([ok.status, ok.body.figure, ok.body.outcome], [200, 21.12, 'yes'])
})

test('void needs a reason; overdue is flagged, and a weekly market needs no separate schedule check', async () => {
  const c = ctx()
  const id = await create(c, { ...MARKET, scheduleDoc: { ...MARKET.scheduleDoc, readOn: '2026-11-14' } })
  open(c)
  let listed = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.markets as { checkDue: boolean; overdue: boolean }[]
  assert.deepEqual([listed[0].checkDue, listed[0].overdue], [false, false])
  await admin(c, { action: 'schedule-check', marketId: id, readOn: '2026-11-16', revisedDate: '2026-11-18' })
  c.setNow('2026-12-18T10:00:00Z')
  listed = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.markets as { checkDue: boolean; overdue: boolean }[]
  assert.equal(listed[0].overdue, true)
  assert.equal((await admin(c, { action: 'void', marketId: id })).status, 400)
  assert.equal((await admin(c, { action: 'void', marketId: id, reason: 'overdue' })).status, 200)
  assert.deepEqual(c.book.entries.map((e) => [e.action, e.reason]), [['create', null], ['schedule-check', 'revised date 2026-11-18'], ['void', 'overdue']])
})

test('config says whether markets are set up and on, and where to sign in', async () => {
  const config = async (c: TestCtx | null) => (await call(await playerRoute(req('GET', '/api/markets?view=config'), c))).body
  assert.deepEqual(await config(null), { configured: false, enabled: false, authUrl: null })
  assert.deepEqual(await config(ctx(false)), { configured: true, enabled: false, authUrl: 'https://auth.nivel.test/neondb/auth' })
  assert.deepEqual(await config(ctx()), { configured: true, enabled: true, authUrl: 'https://auth.nivel.test/neondb/auth' })
})
