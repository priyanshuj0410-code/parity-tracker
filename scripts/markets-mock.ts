// Development only (PARITY-44): /api/markets, /api/markets-admin and a stand-in for Neon Auth, for checking the
// market pages without Neon. Loaded by vite.config.ts's dev server when MARKETS_MOCK is set, never by a build.
// It runs the real routes from api/_markets.ts on the engine's in-memory adapters, seeded with fixtures.
//
//   MARKETS_MOCK=1      markets on        MARKETS_MOCK=off   set up but switched off
//   MARKETS_MOCK_USER=ana@nivel.test     start signed in as that fixture user (ana is an adult; owner@nivel.test is
//                                        the console account; anyone else is signed out). No credentials are typed.
import { adminRoute, playerRoute } from '../api/_markets'
import type { Book, Ctx, Details, LogEntry, Players } from '../api/_markets'
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
  const book: Book = {
    details: async (ids) => new Map(ids.flatMap((i) => (details.has(i) ? [[i, details.get(i) as Details]] : []))),
    save: async (d) => void details.set(d.marketId, d),
    log: async (e) => void entries.push({ ...e, at: now().toISOString() }),
    history: async (id) => entries.filter((e) => e.marketId === id),
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

  // Fixtures: the templates' worked examples, at each stage a market goes through.
  const seeded = (async () => {
    addUser('owner@nivel.test')
    for (const e of ['ana@nivel.test', 'ravi@nivel.test', 'meera@nivel.test']) {
      addUser(e)
      adults.add(users.get(e)!.id)
    }
    const plfs = (month: string, monthName: string, threshold: number, scheduled: string, population = 'women15plus') => ({
      action: 'create', template: 'official', subject: `in:${population}:lfpr-cws:${month}`, threshold,
      question: `Will India's labour force participation rate for women aged 15 and over be at least ${threshold}% for ${monthName}?`,
      definition: 'Labour force participation rate, current weekly status, women aged 15 and over, rural and urban combined (all-India), as printed in the bulletin.',
      releaseName: `PLFS monthly bulletin for ${monthName}`, scheduledDate: scheduled,
      scheduleDoc: { name: 'MoSPI Advance Release Calendar 2026-27, updated 25 May 2026', url: 'https://www.mospi.gov.in/', readOn: '2026-06-01' },
      resolutionLocation: 'All-India female LFPR row, age 15 and over', source: { name: 'Periodic Labour Force Survey, MoSPI', url: 'https://www.mospi.gov.in/' },
    })
    fixed = new Date('2026-06-01T06:00:00Z')
    const resolved = await admin(plfs('2026-07', 'July 2026', 33.8, '2026-08-17', 'women15plus-urban'))
    await admin(plfs('2026-06', 'June 2026', 33.1, '2026-07-15', 'women15plus-rural'))
    fixed = new Date('2026-08-01T06:00:00Z')
    const closed = await admin(plfs('2026-08', 'August 2026', 34.0, '2026-09-15'))
    fixed = new Date('2026-10-06T06:00:00Z')
    const open = await admin(plfs('2026-10', 'October 2026', 34.2, '2026-11-16'))
    const nivel = await admin({
      action: 'create', template: 'nivel-data', subject: 'in:nifty50:payshare:fy2026-27', threshold: 21,
      question: "Will the Nifty 50's women's share of pay for FY2026-27 be at least 21.0%?",
      definition: "Women's share of each company's pay, weighted by the slice of the company an index fund owns times its median yearly wage bill since 2022-23, from BRSR filings. Estimates included and labelled.",
      releaseName: "Nivel's first release with FY2026-27 at 90% of payroll reported", scheduledDate: '2027-10-29',
      scheduleDoc: { name: "Nivel's release calendar", url: 'https://nivel-equal-lens.vercel.app/method', readOn: '2026-10-06' },
      resolutionLocation: 'indexes/nifty50.json, years["2026-27"].headline', source: { name: 'Nivel by The Equal Lens', url: 'https://nivel-equal-lens.vercel.app/index/nifty50' },
    })
    if (enabled) {
      // The first wallet read opens the wallet with its welcome grant, as the pages do before any trade.
      for (const e of ['ana@nivel.test', 'ravi@nivel.test', 'meera@nivel.test']) await playerRoute(send('/api/markets?view=wallet', 'GET', e), ctx)
      fixed = new Date('2026-10-06T08:00:00Z')
      await play('ana@nivel.test', { action: 'trade', marketId: nivel.id, side: 'yes', shares: 120 })
      await play('ravi@nivel.test', { action: 'trade', marketId: nivel.id, side: 'no', shares: 40 })
      await play('meera@nivel.test', { action: 'trade', marketId: open.id, side: 'no', shares: 60 })
      fixed = new Date('2026-06-02T08:00:00Z')
      await play('ana@nivel.test', { action: 'trade', marketId: resolved.id, side: 'yes', shares: 50 })
    }
    fixed = new Date('2026-08-10T06:00:00Z')
    await admin({ action: 'schedule-check', marketId: resolved.id, readOn: '2026-08-10' })
    fixed = new Date('2026-08-18T09:30:00Z')
    await admin({ action: 'resolve', marketId: resolved.id, outcome: 'yes', figure: 34.6, sourceUrl: 'https://www.mospi.gov.in/', releaseName: 'PLFS monthly bulletin for July 2026' })
    fixed = new Date('2026-09-08T06:00:00Z')
    await admin({ action: 'schedule-check', marketId: closed.id, readOn: '2026-09-08', revisedDate: '2026-09-16' })
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
