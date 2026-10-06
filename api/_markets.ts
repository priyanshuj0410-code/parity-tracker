// Nivel's play-money markets (PARITY-44, decision 0017): the shared engine from Thoth (vendor/market-engine) on
// Nivel's own Neon database and Neon Auth, run by the templates in knowledge/plans/market-templates.md (PARITY-48).
// Off unless MARKETS_ENABLED is '1'; the owner switches it on only after counsel (PARITY-51) and the safeguarding
// review (PARITY-49).
import { neon } from '@neondatabase/serverless'
import { EngineError, createEngine, graceOver, migrate, neonAuthVerifier, postgresLedger, postgresStore } from '../vendor/market-engine/index.js'
import type { Claims, Db, Engine, Market, Side } from '../vendor/market-engine/index.js'
import { PRECISION, TEMPLATES, VOID_REASONS, checkDue, closesAt, fitsTemplate, nivelFigure, outcomeFor, parseSubject } from './_market_rules.js'
import type { Template, VoidReason } from './_market_rules.js'

// Adults only. A row means "adult: yes"; the year of birth is all that is kept, and nothing is kept for anyone
// under 18.
export interface Players {
  isAdult(userId: string): Promise<boolean>
  record(userId: string, birthYear: number): Promise<void>
  forget(userId: string): Promise<void>
}

// What the templates add to an engine market, kept in Nivel's own table, since the engine never interprets them.
export interface Details {
  marketId: string
  template: Template
  subject: string
  threshold: number
  precision: number
  definition: string
  releaseName: string
  scheduledDate: string
  scheduleDoc: { name: string; url: string; readOn: string }
  closesAt: string
  resolutionLocation: string
}

export type LogAction = 'create' | 'schedule-check' | 'resolve' | 'void'

export interface LogEntry {
  marketId: string
  subject: string
  action: LogAction
  at: string
  figure: number | null
  threshold: number | null
  outcome: string | null
  sourceUrl: string | null
  releaseName: string | null
  releaseId: string | null
  scheduleDoc: string | null
  readOn: string | null
  reason: string | null
  by: string
}

// Market details and the append-only log (section 6 of the templates).
export interface Book {
  details(marketIds: string[]): Promise<Map<string, Details>>
  save(d: Details): Promise<void>
  log(e: Omit<LogEntry, 'at'>): Promise<void>
  history(marketId: string): Promise<LogEntry[]>
}

export interface Ctx {
  engine: Engine
  players: Players
  book: Book
  // A file of a published Nivel release, for Nivel data markets.
  releaseFile(releaseId: string, path: string): Promise<string | null>
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

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)
const day = (v: unknown) => (v ? new Date(v as string).toISOString().slice(0, 10) : null)

export function postgresBook(db: Db): Book {
  return {
    async details(ids) {
      if (ids.length === 0) return new Map()
      const rows = await db.query('SELECT * FROM market_details WHERE market_id = ANY($1)', [ids])
      return new Map(rows.map((r) => [r.market_id as string, {
        marketId: r.market_id as string,
        template: r.template as Template,
        subject: r.subject as string,
        threshold: Number(r.threshold),
        precision: Number(r.precision),
        definition: r.definition as string,
        releaseName: r.release_name as string,
        scheduledDate: iso(r.scheduled_date) as string,
        scheduleDoc: { name: r.schedule_doc as string, url: r.schedule_url as string, readOn: day(r.schedule_read_on) as string },
        closesAt: iso(r.closes_at) as string,
        resolutionLocation: r.resolution_location as string,
      }]))
    },
    async save(d) {
      await db.query(
        `INSERT INTO market_details (market_id, template, subject, threshold, precision, definition, release_name, scheduled_date,
           schedule_doc, schedule_url, schedule_read_on, closes_at, resolution_location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [d.marketId, d.template, d.subject, d.threshold, d.precision, d.definition, d.releaseName, d.scheduledDate,
          d.scheduleDoc.name, d.scheduleDoc.url, d.scheduleDoc.readOn, d.closesAt, d.resolutionLocation],
      )
    },
    async log(e) {
      await db.query(
        `INSERT INTO market_log (market_id, subject, action, figure, threshold, outcome, source_url, release_name, release_id,
           schedule_doc, read_on, reason, by_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [e.marketId, e.subject, e.action, e.figure, e.threshold, e.outcome, e.sourceUrl, e.releaseName, e.releaseId,
          e.scheduleDoc, e.readOn, e.reason, e.by],
      )
    },
    async history(marketId) {
      const rows = await db.query('SELECT * FROM market_log WHERE market_id = $1 ORDER BY id', [marketId])
      return rows.map((r) => ({
        marketId: r.market_id as string,
        subject: r.subject as string,
        action: r.action as LogAction,
        at: iso(r.at) as string,
        figure: r.figure == null ? null : Number(r.figure),
        threshold: r.threshold == null ? null : Number(r.threshold),
        outcome: (r.outcome as string | null) ?? null,
        sourceUrl: (r.source_url as string | null) ?? null,
        releaseName: (r.release_name as string | null) ?? null,
        releaseId: (r.release_id as string | null) ?? null,
        scheduleDoc: (r.schedule_doc as string | null) ?? null,
        readOn: day(r.read_on),
        reason: (r.reason as string | null) ?? null,
        by: r.by_email as string,
      }))
    },
  }
}

let ready: Promise<void> | null = null

async function setup(db: Db): Promise<void> {
  await migrate(db)
  const statements = [
    `CREATE TABLE IF NOT EXISTS players (
      user_id text PRIMARY KEY,
      birth_year int NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS market_details (
      market_id uuid PRIMARY KEY,
      template text NOT NULL CHECK (template IN ('nivel-data','official','norm')),
      subject text NOT NULL,
      threshold numeric NOT NULL,
      precision int NOT NULL,
      definition text NOT NULL,
      release_name text NOT NULL,
      scheduled_date timestamptz NOT NULL,
      schedule_doc text NOT NULL,
      schedule_url text NOT NULL,
      schedule_read_on date NOT NULL,
      closes_at timestamptz NOT NULL,
      resolution_location text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS market_log (
      id bigserial PRIMARY KEY,
      market_id uuid NOT NULL,
      subject text NOT NULL,
      action text NOT NULL CHECK (action IN ('create','schedule-check','resolve','void')),
      at timestamptz NOT NULL DEFAULT now(),
      figure numeric,
      threshold numeric,
      outcome text,
      source_url text,
      release_name text,
      release_id text,
      schedule_doc text,
      read_on date,
      reason text,
      by_email text NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS market_log_market_idx ON market_log (market_id, id)',
    // Append-only: no entry is ever edited or deleted.
    `CREATE OR REPLACE FUNCTION market_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
     BEGIN RAISE EXCEPTION 'market_log is append-only'; END $$`,
    `CREATE OR REPLACE TRIGGER market_log_no_change BEFORE UPDATE OR DELETE ON market_log
     FOR EACH ROW EXECUTE FUNCTION market_log_append_only()`,
  ]
  for (const s of statements) await db.query(s)
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
  // @ts-expect-error: plain JavaScript, shared with the data and page functions.
  const { file } = (await import('./_data.js')) as { file(id: string, path: string): Promise<string | null> }
  const enabled = env.MARKETS_ENABLED === '1'
  const players = postgresPlayers(db)
  const verify = neonAuthVerifier(auth)
  return {
    engine: createEngine({ store: postgresStore(db), ledger: postgresLedger(db), enabled: () => enabled, isAdult: (u) => players.isAdult(u) }),
    players,
    book: postgresBook(db),
    releaseFile: (id, path) => file(id, path),
    verify: (a) => verify(a ?? undefined),
    admins: (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    enabled,
    now: () => new Date(),
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RELEASE_ID = /^\d{8}-\d{6}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const HTTPS = /^https:\/\/[^\s]{4,500}$/
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max

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

const isConsole = (ctx: Ctx, claims: Claims) => !!claims.email && ctx.admins.includes(claims.email.toLowerCase())

async function withDetails<M extends Market>(ctx: Ctx, markets: M[]): Promise<(M & { details: Details | null })[]> {
  const details = await ctx.book.details(markets.map((m) => m.id))
  return markets.map((m) => ({ ...m, details: details.get(m.id) ?? null }))
}

// Players: GET ?subject= lists markets with their details (public; with the reader's position when signed in),
// GET ?market= one market with its log, GET ?view=wallet, and POST actions age, trade, claim and forget.
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
      const reader = claims && (await ctx.players.isAdult(claims.sub)) ? claims.sub : undefined
      const id = q.get('market')
      if (id !== null) {
        if (!UUID.test(id)) return json({ error: 'bad_request' }, 400)
        const d = (await ctx.book.details([id])).get(id)
        const m = d && (await ctx.engine.markets(d.subject, reader)).find((x) => x.id === id)
        if (!d || !m) return json({ error: 'no_market' }, 404)
        return json({ market: { ...m, details: d }, log: await ctx.book.history(id) })
      }
      const subject = q.get('subject') ?? ''
      if (!parseSubject(subject)) return json({ error: 'bad_request' }, 400)
      return json({ markets: await withDetails(ctx, await ctx.engine.markets(subject, reader)) })
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
    // Nobody who resolves markets plays them (templates, section 3).
    if (isConsole(ctx, claims)) return json({ error: 'console_account' }, 403)

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
      const d = (await ctx.book.details([b.marketId])).get(b.marketId)
      if (!d) return json({ error: 'no_market' }, 400)
      if (ctx.now().getTime() >= Date.parse(d.closesAt)) return json({ error: 'trading_closed' }, 400)
      return json(await ctx.engine.trade(claims.sub, b.marketId, b.side as Side, b.shares))
    }
    if (b.action === 'claim') return json(await ctx.engine.claimDaily(claims.sub))
    return json({ error: 'bad_request' }, 400)
  } catch (err) {
    return failure(err)
  }
}

const NO_LOG = { figure: null, threshold: null, outcome: null, sourceUrl: null, releaseName: null, releaseId: null, scheduleDoc: null, readOn: null, reason: null }

// The owner's console: GET lists every market with its details and flags; POST create (from a template only),
// schedule-check, resolve (from the figure, confirmed by the owner) and void (with a reason). Every action is logged.
// Works while markets are off, so markets can be prepared dark.
export async function adminRoute(req: Request, ctx: Ctx | null): Promise<Response> {
  if (!ctx) return json({ error: 'not_configured' }, 503)
  try {
    const claims = await ctx.verify(req.headers.get('authorization'))
    if (!claims) return json({ error: 'unauthenticated' }, 401)
    if (!isConsole(ctx, claims)) return json({ error: 'forbidden' }, 403)
    const by = claims.email as string
    const now = ctx.now()

    if (req.method === 'GET') {
      const markets = await withDetails(ctx, await ctx.engine.adminMarkets())
      return json({
        markets: markets.map((m) => ({
          ...m,
          closed: !!m.details && now.getTime() >= Date.parse(m.details.closesAt),
          checkDue: m.status === 'open' && !!m.details && checkDue(m.details.scheduledDate, now),
          overdue: m.status === 'open' && graceOver(m.resolutionDate, now),
        })),
      })
    }
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
    const b = await body(req)

    if (b.action === 'create') {
      const template = TEMPLATES.find((t) => t === b.template)
      const subject = typeof b.subject === 'string' ? parseSubject(b.subject) : null
      const doc = (b.scheduleDoc ?? {}) as Record<string, unknown>
      const src = (b.source ?? {}) as Record<string, unknown>
      const given = Number.isInteger(b.precision) && (b.precision as number) >= 0 && (b.precision as number) <= 4 ? (b.precision as number) : null
      const precision = template ? (PRECISION[template] ?? given) : null
      const ok =
        template && subject && fitsTemplate(template, subject) && precision !== null &&
        typeof b.threshold === 'number' && b.threshold > 0 && b.threshold < 100 &&
        text(b.question, 200) && b.question.includes('at least') &&
        text(b.definition, 2000) && text(b.releaseName, 200) && text(b.resolutionLocation, 500) &&
        typeof b.scheduledDate === 'string' && DATE.test(b.scheduledDate) && Date.parse(b.scheduledDate) > now.getTime() &&
        text(doc.name, 200) && typeof doc.url === 'string' && HTTPS.test(doc.url) && typeof doc.readOn === 'string' && DATE.test(doc.readOn) &&
        text(src.name, 120) && typeof src.url === 'string' && HTTPS.test(src.url)
      if (!ok || !template || !subject || precision === null) return json({ error: 'bad_request' }, 400)
      const subjectId = b.subject as string
      // One open market per subject while markets are yes-or-no.
      const taken = (await ctx.engine.adminMarkets()).some((m) => m.subject === subjectId && (m.status === 'open' || m.status === 'resolving'))
      if (taken) return json({ error: 'subject_taken' }, 409)
      const close = closesAt(template, subject, b.scheduledDate as string)
      if (close.getTime() <= now.getTime()) return json({ error: 'already_closed' }, 400)
      const id = await ctx.engine.createMarket({
        subject: subjectId,
        question: b.question as string,
        criteria: b.definition as string,
        category: template,
        resolutionDate: new Date(b.scheduledDate as string).toISOString(),
        priorYes: 0.5,
        source: { name: src.name as string, url: src.url as string },
      })
      const details: Details = {
        marketId: id,
        template,
        subject: subjectId,
        threshold: b.threshold as number,
        precision,
        definition: b.definition as string,
        releaseName: b.releaseName as string,
        scheduledDate: new Date(b.scheduledDate as string).toISOString(),
        scheduleDoc: { name: doc.name as string, url: doc.url as string, readOn: doc.readOn as string },
        closesAt: close.toISOString(),
        resolutionLocation: b.resolutionLocation as string,
      }
      await ctx.book.save(details)
      await ctx.book.log({ ...NO_LOG, marketId: id, subject: subjectId, action: 'create', threshold: details.threshold, scheduleDoc: details.scheduleDoc.name, readOn: details.scheduleDoc.readOn, by })
      return json({ id, closesAt: details.closesAt })
    }

    if (typeof b.marketId !== 'string' || !UUID.test(b.marketId)) return json({ error: 'bad_request' }, 400)
    const d = (await ctx.book.details([b.marketId])).get(b.marketId)
    if (!d) return json({ error: 'no_market' }, 404)
    const entry = { ...NO_LOG, marketId: d.marketId, subject: d.subject, by }
    if (b.action === 'resolve' || b.action === 'void') {
      const settled = (await ctx.book.history(d.marketId)).some((e) => e.action === 'resolve' || e.action === 'void')
      if (settled) return json({ error: 'already_settled' }, 409)
    }

    // The seven-day re-read of the schedule document. A revised date is logged; it never extends the grace period.
    if (b.action === 'schedule-check') {
      if (typeof b.readOn !== 'string' || !DATE.test(b.readOn)) return json({ error: 'bad_request' }, 400)
      const revised = typeof b.revisedDate === 'string' && DATE.test(b.revisedDate) ? `revised date ${b.revisedDate}` : null
      await ctx.book.log({ ...entry, action: 'schedule-check', scheduleDoc: d.scheduleDoc.name, readOn: b.readOn, reason: revised })
      return json({ ok: true })
    }

    if (b.action === 'resolve') {
      if ((b.outcome !== 'yes' && b.outcome !== 'no') || typeof b.sourceUrl !== 'string' || !HTTPS.test(b.sourceUrl) || !text(b.releaseName, 200)) {
        return json({ error: 'bad_request' }, 400)
      }
      if (now.getTime() < Date.parse(d.closesAt)) return json({ error: 'still_trading' }, 409)
      let figure: number | null
      let releaseId: string | null = null
      if (d.template === 'nivel-data') {
        // Read from the release itself, never typed in.
        if (typeof b.releaseId !== 'string' || !RELEASE_ID.test(b.releaseId)) return json({ error: 'bad_request' }, 400)
        releaseId = b.releaseId
        const s = parseSubject(d.subject)
        const index = s && (await ctx.releaseFile(releaseId, `v1/indexes/${s.population}.json`))
        figure = s && index ? nivelFigure(index, s.period) : null
        if (figure === null) return json({ error: 'not_settled' }, 409)
      } else {
        if (typeof b.figure !== 'number' || !Number.isFinite(b.figure)) return json({ error: 'bad_request' }, 400)
        figure = b.figure
      }
      // The owner confirms the outcome the threshold gives.
      const outcome = outcomeFor(figure, d.threshold, d.precision)
      if (outcome !== b.outcome) return json({ error: 'outcome_mismatch', figure, threshold: d.threshold, outcome }, 409)
      await ctx.engine.resolveMarket(d.marketId, outcome, { sourceUrl: b.sourceUrl })
      await ctx.book.log({ ...entry, action: 'resolve', figure, threshold: d.threshold, outcome, sourceUrl: b.sourceUrl, releaseName: b.releaseName, releaseId })
      return json({ ok: true, figure, outcome })
    }

    if (b.action === 'void') {
      const reason = VOID_REASONS.find((r) => r === b.reason) as VoidReason | undefined
      if (!reason) return json({ error: 'bad_request' }, 400)
      const note = typeof b.note === 'string' && b.note.length <= 500 ? `: ${b.note}` : ''
      await ctx.engine.voidMarket(d.marketId)
      await ctx.book.log({ ...entry, action: 'void', reason: reason + note })
      return json({ ok: true })
    }
    return json({ error: 'bad_request' }, 400)
  } catch (err) {
    return failure(err)
  }
}
