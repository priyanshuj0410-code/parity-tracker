import { EngineError, LEDGER_REASONS } from './types.js'
import type { Ledger, MarketRecord, MarketStore, Outcome, Position } from './types.js'

// Any client with a parameterised query, such as neon(url) from
// @neondatabase/serverless. The host owns the connection.
export interface Db {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>
}

type Table = 'markets' | 'trades' | 'positions' | 'wallets' | 'ledger'

export interface PostgresOptions {
  // Table names, for a host whose tables already exist under other names.
  tables?: Partial<Record<Table, string>>
  // Thoth keys markets by story_id; new hosts use the default, subject.
  subjectColumn?: string
  // False for a markets table without source_name, source_url and resolution_url.
  sourceColumns?: boolean
}

const IDENT = /^[a-z_][a-z0-9_]*$/

function resolve(opts: PostgresOptions) {
  const t: Record<Table, string> = { markets: 'markets', trades: 'trades', positions: 'positions', wallets: 'wallets', ledger: 'ledger', ...opts.tables }
  const subject = opts.subjectColumn ?? 'subject'
  for (const name of [...Object.values(t), subject]) {
    if (!IDENT.test(name)) throw new Error(`bad identifier: ${name}`)
  }
  return { t, subject, sources: opts.sourceColumns ?? true }
}

const num = (v: unknown) => Number(v ?? 0)
const day = (v: unknown) => (v ? new Date(v as string).toISOString().slice(0, 10) : null)
const position = (r: Record<string, unknown>): Position => ({
  sharesYes: num(r.shares_yes),
  sharesNo: num(r.shares_no),
  costBasis: num(r.cost_basis),
})

export function postgresStore(db: Db, opts: PostgresOptions = {}): MarketStore {
  const { t, subject, sources } = resolve(opts)

  const toRecord = (r: Record<string, unknown>): MarketRecord => ({
    id: r.id as string,
    subject: (r[subject] as string | null) ?? null,
    question: r.question as string,
    criteria: r.criteria as string,
    category: r.category as string,
    resolutionDate: r.resolution_date ? new Date(r.resolution_date as string).toISOString() : null,
    status: r.status as MarketRecord['status'],
    outcome: (r.outcome as Outcome | null) ?? null,
    b: num(r.b),
    qYes: num(r.q_yes),
    qNo: num(r.q_no),
    source: sources && r.source_url ? { name: r.source_name as string, url: r.source_url as string } : null,
    resolutionUrl: sources ? ((r.resolution_url as string | null) ?? null) : null,
  })

  async function counts(table: string, ids: string[]): Promise<Map<string, number>> {
    const rows = await db.query(`SELECT market_id, count(*)::int AS n FROM ${table} WHERE market_id = ANY($1) GROUP BY market_id`, [ids])
    return new Map(rows.map((r) => [r.market_id as string, num(r.n)]))
  }

  return {
    async get(id) {
      const rows = await db.query(`SELECT * FROM ${t.markets} WHERE id = $1`, [id])
      return rows[0] ? toRecord(rows[0]) : null
    },
    async list({ subject: s, includeDrafts = false, limit = 100 }) {
      const where: string[] = []
      const params: unknown[] = []
      if (s !== undefined) where.push(`${subject} = $${params.push(s)}`)
      if (!includeDrafts) where.push(`status != 'draft'`)
      const rows = await db.query(
        `SELECT * FROM ${t.markets} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT $${params.push(limit)}`,
        params,
      )
      return rows.map(toRecord)
    },
    async create(m) {
      const cols = [subject, 'question', 'criteria', 'category', 'resolution_date', 'b', 'q_yes', 'q_no', 'status']
      const vals: unknown[] = [m.subject, m.question, m.criteria, m.category, m.resolutionDate, m.b, m.qYes, m.qNo, m.status]
      if (sources) {
        cols.push('source_name', 'source_url')
        vals.push(m.source?.name ?? null, m.source?.url ?? null)
      }
      const rows = await db.query(
        `INSERT INTO ${t.markets} (${cols.join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
        vals,
      )
      return rows[0].id as string
    },
    async setQuantities(id, qYes, qNo) {
      await db.query(`UPDATE ${t.markets} SET q_yes = $2, q_no = $3 WHERE id = $1`, [id, qYes, qNo])
    },
    async close(id, status, outcome, resolutionUrl) {
      if (sources) {
        await db.query(`UPDATE ${t.markets} SET status = $2, outcome = $3, resolution_url = $4, resolved_at = now() WHERE id = $1`, [id, status, outcome, resolutionUrl])
      } else {
        await db.query(`UPDATE ${t.markets} SET status = $2, outcome = $3, resolved_at = now() WHERE id = $1`, [id, status, outcome])
      }
    },
    async holding(userId, marketId) {
      const rows = await db.query(`SELECT shares_yes, shares_no, cost_basis FROM ${t.positions} WHERE user_id = $1 AND market_id = $2`, [userId, marketId])
      return rows[0] ? position(rows[0]) : null
    },
    async holdings(marketId) {
      const rows = await db.query(`SELECT user_id, shares_yes, shares_no, cost_basis FROM ${t.positions} WHERE market_id = $1`, [marketId])
      return rows.map((r) => ({ userId: r.user_id as string, ...position(r) }))
    },
    async holdingsFor(userId, marketIds) {
      const rows = await db.query(
        `SELECT market_id, shares_yes, shares_no, cost_basis FROM ${t.positions} WHERE user_id = $1 AND market_id = ANY($2)`,
        [userId, marketIds],
      )
      return new Map(rows.map((r) => [r.market_id as string, position(r)]))
    },
    async record(tr) {
      const yes = tr.side === 'yes' ? tr.shares : 0
      const no = tr.side === 'no' ? tr.shares : 0
      await db.query(`INSERT INTO ${t.trades} (user_id, market_id, side, shares, cost, price) VALUES ($1, $2, $3, $4, $5, $6)`, [
        tr.userId, tr.marketId, tr.side, tr.shares, tr.cost, tr.price,
      ])
      await db.query(
        `INSERT INTO ${t.positions} AS p (user_id, market_id, shares_yes, shares_no, cost_basis) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, market_id) DO UPDATE SET
           shares_yes = p.shares_yes + $3, shares_no = p.shares_no + $4, cost_basis = p.cost_basis + $5`,
        [tr.userId, tr.marketId, yes, no, tr.cost],
      )
    },
    async stats(marketIds) {
      if (marketIds.length === 0) return new Map()
      const [holders, trades] = await Promise.all([counts(t.positions, marketIds), counts(t.trades, marketIds)])
      return new Map(marketIds.map((id) => [id, { holders: holders.get(id) ?? 0, trades: trades.get(id) ?? 0 }]))
    },
  }
}

export function postgresLedger(db: Db, opts: PostgresOptions = {}): Ledger {
  const { t } = resolve(opts)
  return {
    async open(userId) {
      await db.query(`INSERT INTO ${t.wallets} (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId])
    },
    // One statement inserts the ledger row and updates the cached balance
    // atomically. The balance >= 0 CHECK is the spend guard, and dedup_key
    // makes a credit idempotent.
    async credit(userId, delta, reason, o = {}) {
      try {
        const rows = await db.query(
          `WITH led AS (
             INSERT INTO ${t.ledger} (user_id, delta, reason, ref_id, dedup_key) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (dedup_key) DO NOTHING
             RETURNING delta
           )
           UPDATE ${t.wallets} SET
             balance = balance + (SELECT delta FROM led),
             lifetime_earned = lifetime_earned + GREATEST((SELECT delta FROM led), 0)
           WHERE user_id = $1 AND EXISTS (SELECT 1 FROM led)
           RETURNING balance`,
          [userId, delta, reason, o.refId ?? null, o.dedupKey ?? null],
        )
        return rows.length > 0
      } catch (err) {
        if ((err as { code?: string }).code === '23514') throw new EngineError('insufficient')
        throw err
      }
    },
    async wallet(userId) {
      const rows = await db.query(`SELECT balance, lifetime_earned, streak, last_daily FROM ${t.wallets} WHERE user_id = $1`, [userId])
      const w = rows[0] ?? {}
      return { balance: num(w.balance), lifetimeEarned: num(w.lifetime_earned), streak: num(w.streak), lastDaily: day(w.last_daily) }
    },
    async setDaily(userId, d, streak) {
      await db.query(`UPDATE ${t.wallets} SET last_daily = $2, streak = $3 WHERE user_id = $1`, [userId, d, streak])
    },
  }
}

// The schema for a new host. Thoth keeps its own tables (lib/store.ts), which
// this matches apart from story_id and the source columns.
export async function migrate(db: Db, opts: PostgresOptions = {}): Promise<void> {
  const { t, subject } = resolve(opts)
  const reasons = LEDGER_REASONS.map((r) => `'${r}'`).join(',')
  const statements = [
    `CREATE TABLE IF NOT EXISTS ${t.wallets} (
      user_id text PRIMARY KEY,
      balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
      lifetime_earned bigint NOT NULL DEFAULT 0,
      streak int NOT NULL DEFAULT 0,
      last_daily date,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS ${t.ledger} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      delta bigint NOT NULL,
      reason text NOT NULL CHECK (reason IN (${reasons})),
      ref_id text,
      dedup_key text UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS ${t.ledger}_user_idx ON ${t.ledger} (user_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS ${t.markets} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ${subject} text,
      question text NOT NULL,
      criteria text NOT NULL DEFAULT '',
      category text NOT NULL DEFAULT 'Other',
      resolution_date timestamptz,
      status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','resolving','resolved','void')),
      outcome text CHECK (outcome IN ('yes','no')),
      b numeric NOT NULL DEFAULT 120,
      q_yes numeric NOT NULL DEFAULT 0,
      q_no numeric NOT NULL DEFAULT 0,
      source_name text,
      source_url text,
      resolution_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz
    )`,
    `CREATE INDEX IF NOT EXISTS ${t.markets}_subject_idx ON ${t.markets} (${subject})`,
    `CREATE INDEX IF NOT EXISTS ${t.markets}_status_idx ON ${t.markets} (status, resolution_date)`,
    `CREATE TABLE IF NOT EXISTS ${t.trades} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      market_id uuid NOT NULL,
      side text NOT NULL CHECK (side IN ('yes','no')),
      shares numeric NOT NULL,
      cost bigint NOT NULL,
      price numeric NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS ${t.trades}_market_idx ON ${t.trades} (market_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS ${t.positions} (
      user_id text NOT NULL,
      market_id uuid NOT NULL,
      shares_yes numeric NOT NULL DEFAULT 0,
      shares_no numeric NOT NULL DEFAULT 0,
      cost_basis bigint NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, market_id)
    )`,
  ]
  for (const s of statements) await db.query(s)
}
