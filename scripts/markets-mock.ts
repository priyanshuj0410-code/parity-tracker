// Development only (PARITY-44): /api/markets, /api/markets-admin and a stand-in for Neon Auth, for checking the
// market pages without Neon. Loaded by vite.config.ts's dev server when MARKETS_MOCK is set, never by a build.
// It runs the real routes from api/_markets.ts on the engine's in-memory adapters, seeded with fixtures.
//
//   MARKETS_MOCK=1      markets on        MARKETS_MOCK=off   set up but switched off
//   MARKETS_MOCK_USER=ana@nivel.test     start signed in as that fixture user (ana is an adult; owner@nivel.test is
//                                        the console account; anyone else is signed out). No credentials are typed.
import { adminRoute, playerRoute } from '../api/_markets'
import type { Book, Ctx, Details, LogEntry, Players, Proposal, Settlement } from '../api/_markets'
import { createEngine, memoryLedger, memoryStore } from '../vendor/market-engine/index'
import type { MarketStore } from '../vendor/market-engine/index'

// The in-memory store with UUID ids, as Postgres gives, since the routes check ids.
function uuidStore(): MarketStore {
  const s = memoryStore()
  const toUuid = new Map<string, string>()
  const toMem = new Map<string, string>()
  const u = (m: string) => {
    if (!toUuid.has(m)) {
      const id = crypto.randomUUID()
      toUuid.set(m, id)
      toMem.set(id, m)
    }
    return toUuid.get(m) as string
  }
  const m = (id: string) => toMem.get(id) ?? id
  const rekey = <V>(map: Map<string, V>) => new Map([...map].map(([k, v]) => [u(k), v]))
  return {
    get: async (id) => { const r = await s.get(m(id)); return r && { ...r, id: u(r.id) } },
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

interface User { id: string; email: string; password: string }

export function createMock(env: Record<string, string | undefined>) {
  const enabled = env.MARKETS_MOCK !== 'off'
  let fixed: Date | null = null
  const now = () => fixed ?? new Date()
  const users = new Map<string, User>()
  const adults = new Set<string>()
  const details = new Map<string, Details>()
  const entries: LogEntry[] = []
  const players: Players = {
    isAdult: async (u) => adults.has(u),
    record: async (u) => void adults.add(u),
    forget: async (u) => void adults.delete(u),
  }
  const proposals: Proposal[] = []
  const settlements = new Map<string, Settlement>()
  const book: Book = {
    details: async (ids) => new Map(ids.flatMap((i) => (details.has(i) ? [[i, details.get(i) as Details]] : []))),
    save: async (d) => void details.set(d.marketId, d),
    log: async (e) => void entries.push({ ...e, at: now().toISOString() }),
    history: async (id) => entries.filter((e) => e.marketId === id),
    proposals: async () => proposals.map((p) => ({ ...p })),
    decide: async (id, status, marketId, reason) => {
      Object.assign(proposals.find((p) => p.id === id) as Proposal, { status, marketId, reason, decidedAt: now().toISOString() })
    },
    settlements: async (ids) => new Map(ids.flatMap((i) => (settlements.has(i) ? [[i, settlements.get(i) as Settlement]] : []))),
  }
  // Stands in for `pnpm markets propose`.
  // The schedule document is read on the Saturday the proposal is made, as the weekly run does.
  const propose = (week: string, body: object, rationale: string) => {
    const id = crypto.randomUUID()
    const saturday = new Date(Date.parse(`${week}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
    const b = body as Record<string, unknown> & { scheduleDoc: Record<string, string> }
    const withRead = { ...b, scheduleDoc: { ...b.scheduleDoc, readOn: saturday } }
    proposals.push({ id, week, status: 'proposed', body: withRead, rationale, marketId: null, reason: null, proposedAt: now().toISOString(), decidedAt: null })
    return id
  }
  const ctx: Ctx = {
    engine: createEngine({ store: uuidStore(), ledger: memoryLedger(), enabled: () => enabled, isAdult: (u) => players.isAdult(u), now }),
    players,
    book,
    releaseFile: async () => null,
    verify: async (a) => {
      const user = a?.startsWith('Bearer mockjwt.') ? [...users.values()].find((x) => x.id === a.slice(15)) : undefined
      return user ? { sub: user.id, email: user.email } : null
    },
    admins: ['owner@nivel.test'],
    enabled,
    authUrl: '/__mock-auth',
    now,
  }

  const addUser = (email: string) => {
    const user = { id: crypto.randomUUID(), email, password: crypto.randomUUID() }
    users.set(email, user)
    return user
  }
  const jwtFor = (email: string) => `mockjwt.${users.get(email)?.id}`
  const send = (path: string, method = 'GET', email?: string, body?: unknown) =>
    new Request(`http://mock${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(email ? { authorization: `Bearer ${jwtFor(email)}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  const admin = async (body: object) => (await (await adminRoute(send('/api/markets-admin', 'POST', 'owner@nivel.test', body), ctx)).json()) as { id: string }
  const play = (email: string, body: object) => playerRoute(send('/api/markets', 'POST', email, body), ctx)

  // Fixtures: three weeks of the Saturday cycle (decision 0018), with markets at each stage and the week's proposals.
  const seeded = (async () => {
    addUser('owner@nivel.test')
    for (const e of ['ana@nivel.test', 'ravi@nivel.test', 'meera@nivel.test']) {
      addUser(e)
      adults.add(users.get(e)!.id)
    }
    const plfs = (month: string, monthName: string, threshold: number, scheduled: string, population = 'women15plus', area = 'rural and urban combined (all-India)') => ({
      template: 'official', subject: `in:${population}:lfpr-cws:${month}`, threshold, precision: 1,
      question: `Will India's labour force participation rate for women aged 15 and over be at least ${threshold}% for ${monthName}?`,
      definition: `Labour force participation rate, current weekly status, women aged 15 and over, ${area}, as printed in the bulletin.`,
      releaseName: `PLFS monthly bulletin for ${monthName}`, scheduledDate: scheduled,
      scheduleDoc: { name: 'MoSPI Advance Release Calendar 2026-27, updated 25 May 2026', url: 'https://www.mospi.gov.in/', readOn: scheduled.slice(0, 8) + '01' },
      resolutionLocation: 'Female LFPR row, age 15 and over', source: { name: 'Periodic Labour Force Survey, MoSPI', url: 'https://www.mospi.gov.in/' },
    })
    const approve = async (week: string, body: object, rationale: string) => admin({ action: 'approve', proposalId: propose(week, body, rationale) })

    // Week of 27 September: resolved.
    fixed = new Date('2026-09-26T05:00:00Z')
    const resolved = await approve('2026-09-27', plfs('2026-08', 'August 2026', 34.0, '2026-09-29'), 'August a year earlier, as published.')
    // Week of 4 October: one closed with a settlement prepared, one still trading.
    fixed = new Date('2026-10-03T05:00:00Z')
    const ready = await approve('2026-10-04', plfs('2026-09', 'September 2026', 33.1, '2026-10-06', 'women15plus-rural', 'rural'), 'September a year earlier, rural.')
    const trading = await approve('2026-10-04', plfs('2026-09', 'September 2026', 25.4, '2026-10-09', 'women15plus-urban', 'urban'), 'September a year earlier, urban.')
    // Week of 11 October: one approved and waiting to open, two proposals waiting, one rejected.
    fixed = new Date('2026-10-10T03:30:00Z')
    await approve('2026-10-11', plfs('2026-jul-sep', 'July to September 2026', 33.6, '2026-10-14', 'women15plus', 'all-India, quarterly'), 'The same quarter a year earlier.')
    propose('2026-10-11', {
      ...plfs('2026-09', 'September 2026', 31.7, '2026-10-16'), subject: 'in:women15plus:wpr-cws:2026-09',
      question: "Will India's worker population ratio for women aged 15 and over be at least 31.7% for September 2026?",
      definition: 'Worker population ratio, current weekly status, women aged 15 and over, all-India, as printed in the bulletin.',
    }, 'September a year earlier. The ratio of women working, from the same bulletin as participation.')
    propose('2026-10-11', {
      template: 'official', subject: 'gb:women16plus:emp-rate:2026-jun-aug', threshold: 72.1, precision: 1,
      question: "Will the UK's employment rate for women aged 16 to 64 be at least 72.1% for June to August 2026?",
      definition: "Employment rate, women aged 16 to 64, seasonally adjusted, from the ONS Labour Force Survey (table A02).",
      releaseName: 'ONS Labour market overview, UK: October 2026', scheduledDate: '2026-10-13',
      scheduleDoc: { name: 'ONS release calendar', url: 'https://www.ons.gov.uk/releasecalendar', readOn: '2026-10-10' },
      resolutionLocation: 'Table A02, women aged 16 to 64, employment rate', source: { name: 'Office for National Statistics', url: 'https://www.ons.gov.uk/' },
    }, 'The same three months a year earlier, rounded to the nearest tenth.')
    const rejected = propose('2026-10-11', { ...plfs('2026-09', 'September 2026', 40, '2026-10-16'), subject: 'in:women15plus-rural:lfpr-cws:2026-10' }, 'A round number.')
    await admin({ action: 'reject', proposalId: rejected, reason: 'Not tied to a published figure.' })

    if (enabled) {
      // The first wallet read opens the wallet with its welcome grant, as the pages do before any trade.
      for (const e of ['ana@nivel.test', 'ravi@nivel.test', 'meera@nivel.test']) await playerRoute(send('/api/markets?view=wallet', 'GET', e), ctx)
      fixed = new Date('2026-09-28T08:00:00Z')
      await play('ana@nivel.test', { action: 'trade', marketId: resolved.id, side: 'yes', shares: 50 })
      fixed = new Date('2026-10-05T08:00:00Z')
      await play('ana@nivel.test', { action: 'trade', marketId: ready.id, side: 'yes', shares: 120 })
      await play('ravi@nivel.test', { action: 'trade', marketId: trading.id, side: 'no', shares: 40 })
      await play('meera@nivel.test', { action: 'trade', marketId: trading.id, side: 'yes', shares: 60 })
    }
    fixed = new Date('2026-09-30T05:00:00Z')
    await admin({ action: 'resolve', marketId: resolved.id, outcome: 'yes', figure: 34.6, sourceUrl: 'https://www.mospi.gov.in/', releaseName: 'PLFS monthly bulletin for August 2026' })
    settlements.set(ready.id, { marketId: ready.id, figure: 32.8, releaseId: null, sourceUrl: 'https://www.mospi.gov.in/', releaseName: 'PLFS monthly bulletin for September 2026', outcome: 'no', note: 'Rural female LFPR, table 1.' })
    fixed = null
  })()

  let auto = env.MARKETS_MOCK_USER ?? null
  const sessionUser = (req: Request) => {
    const bearer = req.headers.get('authorization')?.match(/^Bearer sess-(.+)$/)?.[1]
    const cookie = req.headers.get('cookie')?.match(/mock_session=([^;]+)/)?.[1]
    const id = bearer ?? cookie
    return [...users.values()].find((u) => u.id === id) ?? (auto ? users.get(auto) : undefined)
  }
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

  /** Answers a dev-server request, or null when the path is not one of the mock's. */
  return async function handle(req: Request): Promise<Response | null> {
    const path = new URL(req.url).pathname
    if (!path.startsWith('/api/markets') && !path.startsWith('/__mock-auth/')) return null
    await seeded
    if (path === '/api/markets') return playerRoute(req, ctx)
    if (path === '/api/markets-admin') return adminRoute(req, ctx)
    const body = req.method === 'POST' ? ((await req.json().catch(() => ({}))) as { email?: string; password?: string }) : {}
    const signedIn = (u: User) => json({ token: `sess-${u.id}`, user: { id: u.id, email: u.email } }, 200, { 'set-cookie': `mock_session=${u.id}; Path=/; SameSite=Lax` })
    switch (path) {
      case '/__mock-auth/sign-up/email': {
        if (!body.email || !body.password) return json({ code: 'INVALID_EMAIL' }, 400)
        if (users.has(body.email)) return json({ code: 'USER_ALREADY_EXISTS' }, 422)
        if (body.password.length < 8) return json({ code: 'PASSWORD_TOO_SHORT' }, 400)
        const u = addUser(body.email)
        u.password = body.password
        return signedIn(u)
      }
      case '/__mock-auth/sign-in/email': {
        const u = body.email ? users.get(body.email) : undefined
        return u && u.password === body.password ? signedIn(u) : json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, 401)
      }
      case '/__mock-auth/get-session': {
        const u = sessionUser(req)
        return u ? json({ user: { id: u.id, email: u.email }, session: {} }, 200, { 'set-auth-jwt': jwtFor(u.email) }) : json(null)
      }
      case '/__mock-auth/sign-out':
        auto = null
        return json({ success: true }, 200, { 'set-cookie': 'mock_session=; Path=/; Max-Age=0' })
    }
    return json({ code: 'NOT_FOUND' }, 404)
  }
}
