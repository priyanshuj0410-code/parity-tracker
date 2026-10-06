import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminRoute, ageOn, playerRoute } from './_markets.js'
import type { Ctx, Players } from './_markets.js'
import { createEngine, memoryLedger, memoryStore } from '../vendor/market-engine/index.js'

const NOW = new Date('2026-10-06T12:00:00Z')

function ctx(enabled = true): Ctx & { kept: Map<string, number> } {
  const kept = new Map<string, number>()
  const players: Players = {
    isAdult: async (u) => kept.has(u),
    record: async (u, y) => void kept.set(u, y),
    forget: async (u) => void kept.delete(u),
  }
  return {
    kept,
    engine: createEngine({ store: memoryStore(), ledger: memoryLedger(), enabled: () => enabled, isAdult: (u) => players.isAdult(u), now: () => NOW }),
    players,
    // "Bearer <user>" signs in as <user>; owner@nivel.test is the admin.
    verify: async (a) => (a?.startsWith('Bearer ') ? { sub: a.slice(7), email: `${a.slice(7)}@nivel.test` } : null),
    admins: ['owner@nivel.test'],
    enabled,
    now: () => NOW,
  }
}

const req = (method: string, path: string, user?: string, body?: unknown) =>
  new Request(`https://nivel.test${path}`, {
    method,
    headers: { ...(user ? { authorization: `Bearer ${user}` } : {}), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const call = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, unknown> })

const MARKET = {
  action: 'create',
  subject: 'in:nifty50:payshare:fy2026-27',
  question: "Will the Nifty 50's women's share of pay for FY2026-27 be at least 21%?",
  resolutionDate: '2027-10-01',
  source: { name: 'Nivel release with FY2026-27 BRSR filings', url: 'https://nivel-equal-lens.vercel.app/method' },
}

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
  const id = (await call(await adminRoute(req('POST', '/api/markets-admin', 'owner', MARKET), c))).body.id as string
  assert.equal((await call(await playerRoute(req('POST', '/api/markets', 'ana', { action: 'age', birthDate: '1990-05-17' }), c))).status, 200)
  assert.equal(c.kept.get('ana'), 1990)
  assert.equal((await call(await playerRoute(req('GET', '/api/markets?view=wallet', 'ana'), c))).body.balance, 1_000)
  // The memory store's ids are not UUIDs, so trade through the engine and read back through the route.
  await c.engine.trade('ana', id, 'yes', 50)
  const list = await call(await playerRoute(req('GET', `/api/markets?subject=${MARKET.subject}`, 'ana'), c))
  const [m] = list.body.markets as { position?: { sharesYes: number }; source: { url: string } }[]
  assert.equal(m.position?.sharesYes, 50)
  assert.equal(m.source.url, MARKET.source.url)
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

test('a market needs a subject, a dated release and an https source', async () => {
  const c = ctx()
  for (const bad of [
    { ...MARKET, subject: 'Nifty 50' },
    { ...MARKET, resolutionDate: 'soon' },
    { ...MARKET, source: { name: 'Nivel', url: 'http://example.org' } },
    { ...MARKET, source: undefined },
    { ...MARKET, question: 'Short?' },
  ]) {
    assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', bad), c)).status, 400)
  }
})

test('resolving cites a source link; overdue markets are flagged', async () => {
  const c = ctx()
  await adminRoute(req('POST', '/api/markets-admin', 'owner', { ...MARKET, resolutionDate: '2026-08-10' }), c)
  const listed = await call(await adminRoute(req('GET', '/api/markets-admin', 'owner'), c))
  assert.equal((listed.body.markets as { overdue: boolean }[])[0].overdue, true)
  const noSource = { action: 'resolve', marketId: '00000000-0000-4000-8000-000000000000', outcome: 'yes' }
  assert.equal((await adminRoute(req('POST', '/api/markets-admin', 'owner', noSource), c)).status, 400)
})
