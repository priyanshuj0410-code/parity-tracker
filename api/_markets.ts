// Nivel's play-money markets (PARITY-44, decision 0017): the shared engine from Thoth (vendor/market-engine) on
// Nivel's own Neon database and Neon Auth. Off unless MARKETS_ENABLED is '1'; the owner switches it on only after
// counsel (PARITY-51) and the safeguarding review (PARITY-49).
import { neon } from '@neondatabase/serverless'
import { EngineError, createEngine, graceOver, migrate, neonAuthVerifier, postgresLedger, postgresStore } from '../vendor/market-engine/index.js'
import type { Claims, Db, Engine, Side } from '../vendor/market-engine/index.js'

// Adults only. A row means "adult: yes"; the year of birth is all that is kept, and nothing is kept for anyone
// under 18.
export interface Players {
  isAdult(userId: string): Promise<boolean>
  record(userId: string, birthYear: number): Promise<void>
  forget(userId: string): Promise<void>
}

export interface Ctx {
  engine: Engine
  players: Players
  verify(authorization: string | null): Promise<Claims | null>
  admins: string[]
  enabled: boolean
  now: () => Date
}

export function postgresPlayers(db: Db): Players {
  return {
    async isAdult(userId) {
      return (await db.query('SELECT 1 FROM players WHERE user_id = $1', [userId])).length > 0
    },
    async record(userId, birthYear) {
      await db.query('INSERT INTO players (user_id, birth_year) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [userId, birthYear])
    },
    // Deletion on request: the player's record, wallet, ledger, trades and positions. Market prices keep the trades'
    // effect, which holds nothing personal.
    async forget(userId) {
      for (const table of ['positions', 'trades', 'ledger', 'wallets', 'players']) {
        await db.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId])
      }
    },
  }
}

let ready: Promise<void> | null = null

async function setup(db: Db): Promise<void> {
  await migrate(db)
  await db.query(`CREATE TABLE IF NOT EXISTS players (
    user_id text PRIMARY KEY,
    birth_year int NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`)
}

// null until the owner has set up Nivel's Neon project and its environment variables.
export async function ctxFromEnv(env: Record<string, string | undefined> = process.env): Promise<Ctx | null> {
  const url = env.MARKETS_DATABASE_URL
  const auth = env.NEON_AUTH_BASE_URL
  if (!url || !auth) return null
  const db = neon(url) as unknown as Db
  ready ??= setup(db).catch((err) => {
    ready = null
    throw err
  })
  await ready
  const enabled = env.MARKETS_ENABLED === '1'
  const players = postgresPlayers(db)
  const verify = neonAuthVerifier(auth)
  return {
    engine: createEngine({ store: postgresStore(db), ledger: postgresLedger(db), enabled: () => enabled, isAdult: (u) => players.isAdult(u) }),
    players,
    verify: (a) => verify(a ?? undefined),
    admins: (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    enabled,
    now: () => new Date(),
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SUBJECT = /^[a-z0-9][a-z0-9:._-]{0,79}$/
const HTTPS = /^https:\/\/[^\s]{4,500}$/

// Whole years from a YYYY-MM-DD birth date to today's IST date. null for a date that is malformed, in the future or
// more than 120 years back.
export function ageOn(birthDate: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const born = new Date(Date.UTC(y, mo - 1, d))
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d) return null
  const [ty, tm, td] = new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10).split('-').map(Number)
  const age = ty - y - (tm < mo || (tm === mo && td < d) ? 1 : 0)
  return age < 0 || age > 120 ? null : age
}

function failure(err: unknown): Response {
  if (err instanceof EngineError) {
    return json({ error: err.code }, err.code === 'not_adult' || err.code === 'markets_disabled' ? 403 : 400)
  }
  return json({ error: 'markets_unavailable' }, 502)
}

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json()
    return typeof b === 'object' && b !== null ? (b as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Players: GET ?subject= lists markets (public; with the reader's position when signed in), GET ?view=wallet, and
// POST actions age, trade, claim and forget.
export async function playerRoute(req: Request, ctx: Ctx | null): Promise<Response> {
  const q = new URL(req.url).searchParams
  if (!ctx) return req.method === 'GET' && !q.get('view') ? json({ markets: [] }) : json({ error: 'not_configured' }, 503)
  try {
    const claims = await ctx.verify(req.headers.get('authorization'))
    if (req.method === 'GET') {
      if (q.get('view') === 'wallet') {
        if (!claims) return json({ error: 'unauthenticated' }, 401)
        if (!ctx.enabled) return json({ error: 'markets_disabled' }, 403)
        return json(await ctx.engine.wallet(claims.sub))
      }
      const subject = q.get('subject') ?? ''
      if (!SUBJECT.test(subject)) return json({ error: 'bad_request' }, 400)
      const adult = claims ? await ctx.players.isAdult(claims.sub) : false
      return json({ markets: await ctx.engine.markets(subject, adult ? claims?.sub : undefined) })
    }
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
    if (!claims) return json({ error: 'unauthenticated' }, 401)
    const b = await body(req)

    // Deletion works even while markets are off.
    if (b.action === 'forget') {
      await ctx.players.forget(claims.sub)
      return json({ ok: true })
    }
    if (!ctx.enabled) return json({ error: 'markets_disabled' }, 403)

    if (b.action === 'age') {
      const age = typeof b.birthDate === 'string' ? ageOn(b.birthDate, ctx.now()) : null
      if (age === null) return json({ error: 'bad_request' }, 400)
      if (age < 18) return json({ error: 'under_18' }, 403)
      await ctx.players.record(claims.sub, Number((b.birthDate as string).slice(0, 4)))
      return json({ adult: true })
    }
    if (b.action === 'trade') {
      if (typeof b.marketId !== 'string' || !UUID.test(b.marketId)) return json({ error: 'bad_request' }, 400)
      if (b.side !== 'yes' && b.side !== 'no') return json({ error: 'bad_request' }, 400)
      if (typeof b.shares !== 'number') return json({ error: 'bad_request' }, 400)
      return json(await ctx.engine.trade(claims.sub, b.marketId, b.side as Side, b.shares))
    }
    if (b.action === 'claim') return json(await ctx.engine.claimDaily(claims.sub))
    return json({ error: 'bad_request' }, 400)
  } catch (err) {
    return failure(err)
  }
}

// The owner's console: GET lists every market, flagging those whose source is over 30 days late; POST create,
// resolve (citing the source link) and void. Works while markets are off, so markets can be prepared dark.
export async function adminRoute(req: Request, ctx: Ctx | null): Promise<Response> {
  if (!ctx) return json({ error: 'not_configured' }, 503)
  try {
    const claims = await ctx.verify(req.headers.get('authorization'))
    if (!claims) return json({ error: 'unauthenticated' }, 401)
    if (!claims.email || !ctx.admins.includes(claims.email.toLowerCase())) return json({ error: 'forbidden' }, 403)

    if (req.method === 'GET') {
      const now = ctx.now()
      const markets = await ctx.engine.adminMarkets()
      return json({ markets: markets.map((m) => ({ ...m, overdue: m.status === 'open' && graceOver(m.resolutionDate, now) })) })
    }
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
    const b = await body(req)

    if (b.action === 'create') {
      const src = (b.source ?? {}) as Record<string, unknown>
      const ok =
        typeof b.subject === 'string' && SUBJECT.test(b.subject) &&
        typeof b.question === 'string' && b.question.length >= 10 && b.question.length <= 200 &&
        (b.criteria === undefined || (typeof b.criteria === 'string' && b.criteria.length <= 2000)) &&
        typeof b.resolutionDate === 'string' && !Number.isNaN(Date.parse(b.resolutionDate)) &&
        (b.priorYes === undefined || (typeof b.priorYes === 'number' && b.priorYes > 0 && b.priorYes < 1)) &&
        typeof src.name === 'string' && src.name.length > 0 && src.name.length <= 120 &&
        typeof src.url === 'string' && HTTPS.test(src.url)
      if (!ok) return json({ error: 'bad_request' }, 400)
      const id = await ctx.engine.createMarket({
        subject: b.subject as string,
        question: b.question as string,
        criteria: b.criteria as string | undefined,
        category: 'Nivel',
        resolutionDate: new Date(b.resolutionDate as string).toISOString(),
        priorYes: b.priorYes as number | undefined,
        source: { name: src.name as string, url: src.url as string },
      })
      return json({ id })
    }
    if (typeof b.marketId !== 'string' || !UUID.test(b.marketId)) return json({ error: 'bad_request' }, 400)
    if (b.action === 'resolve') {
      if ((b.outcome !== 'yes' && b.outcome !== 'no') || typeof b.sourceUrl !== 'string' || !HTTPS.test(b.sourceUrl)) {
        return json({ error: 'bad_request' }, 400)
      }
      await ctx.engine.resolveMarket(b.marketId, b.outcome, { sourceUrl: b.sourceUrl })
      return json({ ok: true })
    }
    if (b.action === 'void') {
      await ctx.engine.voidMarket(b.marketId)
      return json({ ok: true })
    }
    return json({ error: 'bad_request' }, 400)
  } catch (err) {
    return failure(err)
  }
}
