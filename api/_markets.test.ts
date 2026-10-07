import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminRoute, ageOn, playerRoute } from './_markets.js'
import type { Book, Ctx, Details, LogEntry, Players } from './_markets.js'
import { closesAt, outcomeFor, parseSubject } from './_market_rules.js'
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

function memoryBook(clock: () => Date): Book & { entries: LogEntry[] } {
  const details = new Map<string, Details>()
  const entries: LogEntry[] = []
  return {
    entries,
    details: async (ids) => new Map(ids.flatMap((i) => (details.has(i) ? [[i, details.get(i) as Details]] : []))),
    save: async (d) => void details.set(d.marketId, d),
    log: async (e) => void entries.push({ ...e, at: clock().toISOString() }),
    history: async (id) => entries.filter((e) => e.marketId === id),
  }
}

type TestCtx = Ctx & { kept: Map<string, number>; book: Book & { entries: LogEntry[] }; setNow(d: string): void; files: Map<string, string> }

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

// Worked examples 2 and 1 of knowledge/plans/market-templates.md.
const MARKET = {
  action: 'create',
  template: 'official',
  subject: 'in:women15plus:lfpr-cws:2026-10',
  threshold: 34.2,
  question: "Will India's labour force participation rate for women aged 15 and over be at least 34.2% for October 2026?",
  definition: 'Labour force participation rate, current weekly status, women aged 15 and over, all-India.',
  releaseName: 'PLFS monthly bulletin for October 2026',
  scheduledDate: '2026-11-16',
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

const create = async (c: TestCtx, m: object = MARKET) => (await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', m), c))).body.id as string
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
  await adminRoute(req('POST', '/api/markets-admin', 'owner', MARKET), c)
  const r = await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`), c))
  assert.equal((r.body.markets as unknown[]).length, 1)
  assert.equal((r.body.markets as { position?: unknown }[])[0].position, undefined)
})

test('switched off: reads are empty, actions refused, deletion still works', async () => {
  const c = ctx(false)
  await adminRoute(req('POST', '/api/markets-admin', 'owner', MARKET), c)
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

test('a market is made only from a template and its fields', async () => {
  const c = ctx()
  for (const bad of [
    { ...MARKET, template: 'free-text' },
    { ...MARKET, subject: 'Nifty 50' },
    { ...MARKET, subject: 'in:women15plus:payshare:2026-10' },
    { ...MARKET, scheduledDate: '2026-10-01' },
    { ...MARKET, scheduleDoc: { ...MARKET.scheduleDoc, url: 'http://example.org' } },
    { ...MARKET, source: undefined },
    { ...MARKET, question: 'Will the rate rise in October 2026?' },
    { ...MARKET, threshold: '34.2' },
    { ...MARKET, template: 'norm', subject: 'in:men18plus:wvs-jobsscarce-agree:wave8' },
  ]) {
    assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', bad), c)).status, 400)
  }
  assert.ok(await create(c))
})

test('one open market per subject', async () => {
  const c = ctx()
  await create(c)
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', MARKET), c)).status, 409)
})

test('trading closes the day before the release, or at the end of the financial year for Nivel data', async () => {
  const official = closesAt('official', parseSubject(MARKET.subject)!, MARKET.scheduledDate)
  assert.equal(official.toISOString(), '2026-11-15T18:29:00.000Z')
  const nivel = closesAt('nivel-data', parseSubject(NIVEL_MARKET.subject)!, NIVEL_MARKET.scheduledDate)
  assert.equal(nivel.toISOString(), '2027-03-31T18:29:00.000Z')
  const c = ctx()
  const id = await create(c)
  await adult(c, 'ana')
  c.setNow('2026-11-15T18:30:00Z')
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
  await adult(c, 'ana')
  await playerRoute(req('POST', '/api/markets', 'ana', { action: 'trade', marketId: id, side: 'yes', shares: 100 }), c)
  const resolve = (outcome: string, figure = 35.1) => ({ action: 'resolve', marketId: id, outcome, figure, sourceUrl: 'https://www.mospi.gov.in/plfs-oct-2026.pdf', releaseName: MARKET.releaseName })
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', resolve('yes')), c)).status, 409)
  c.setNow('2026-11-16T10:00:00Z')
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
  const c = ctx()
  const id = await create(c, NIVEL_MARKET)
  c.setNow('2027-10-29T10:00:00Z')
  const year = (share: number) => JSON.stringify({ years: { '2026-27': { headline: 0.2112, reportedPayrollShare: share } } })
  c.files.set('20271029-100000/v1/indexes/nifty50.json', year(0.85))
  const body = { action: 'resolve', marketId: id, outcome: 'yes', releaseId: '20271029-100000', sourceUrl: 'https://nivel-equal-lens.vercel.app/index/nifty50', releaseName: 'Nivel release 20271029-100000' }
  assert.equal((await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', body), c))).body.error, 'not_settled')
  c.files.set('20271029-100000/v1/indexes/nifty50.json', year(0.93))
  const ok = await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', { ...body, figure: 1 }), c))
  assert.deepEqual([ok.status, ok.body.figure, ok.body.outcome], [200, 21.12, 'yes'])
})

test('void needs a reason, and overdue and schedule checks are flagged', async () => {
  const c = ctx()
  const id = await create(c)
  c.setNow('2026-11-10T10:00:00Z')
  let listed = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.markets as { checkDue: boolean; overdue: boolean }[]
  assert.deepEqual([listed[0].checkDue, listed[0].overdue], [true, false])
  await adminRoute(req('POST', '/api/markets-admin', 'owner', { action: 'schedule-check', marketId: id, readOn: '2026-11-10', revisedDate: '2026-11-17' }), c)
  c.setNow('2026-12-17T10:00:00Z')
  listed = (await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))).body.markets as { checkDue: boolean; overdue: boolean }[]
  assert.equal(listed[0].overdue, true)
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', { action: 'void', marketId: id }), c)).status, 400)
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', { action: 'void', marketId: id, reason: 'overdue' }), c)).status, 200)
  assert.deepEqual(c.book.entries.map((e) => [e.action, e.reason]), [['create', null], ['schedule-check', 'revised date 2026-11-17'], ['void', 'overdue']])
})

test('config says whether markets are set up and on, and where to sign in', async () => {
  const config = async (c: TestCtx | null) => (await call(await playerRoute(req('GET', '/api/markets?view=config'), c))).body
  assert.deepEqual(await config(null), { configured: false, enabled: false, authUrl: null })
  assert.deepEqual(await config(ctx(false)), { configured: true, enabled: false, authUrl: 'https://auth.nivel.test/neondb/auth' })
  assert.deepEqual(await config(ctx()), { configured: true, enabled: true, authUrl: 'https://auth.nivel.test/neondb/auth' })
})
