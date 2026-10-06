import { EngineError } from './types.js'
import type { Holding, Ledger, LedgerReason, MarketRecord, MarketStore, Position, TradeRow, WalletRecord } from './types.js'

// In-memory adapters, for tests and local development.
export function memoryStore(): MarketStore & { trades: TradeRow[] } {
  const markets = new Map<string, MarketRecord & { createdAt: number }>()
  const positions = new Map<string, Holding & { marketId: string }>()
  const trades: TradeRow[] = []
  let n = 0
  const key = (userId: string, marketId: string) => `${userId}|${marketId}`
  const pos = (h: Holding): Position => ({ sharesYes: h.sharesYes, sharesNo: h.sharesNo, costBasis: h.costBasis })
  const strip = (m: MarketRecord & { createdAt: number }): MarketRecord => {
    const { createdAt, ...rest } = m
    void createdAt
    return rest
  }

  return {
    trades,
    async get(id) {
      const m = markets.get(id)
      return m ? strip(m) : null
    },
    async list({ subject, includeDrafts = false, limit = 100 }) {
      return [...markets.values()]
        .filter((m) => (subject === undefined || m.subject === subject) && (includeDrafts || m.status !== 'draft'))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map(strip)
    },
    async create(m) {
      const id = `m${++n}`
      markets.set(id, { ...m, id, outcome: null, resolutionUrl: null, createdAt: n })
      return id
    },
    async setQuantities(id, qYes, qNo) {
      const m = markets.get(id)
      if (m) Object.assign(m, { qYes, qNo })
    },
    async close(id, status, outcome, resolutionUrl) {
      const m = markets.get(id)
      if (m) Object.assign(m, { status, outcome, resolutionUrl })
    },
    async holding(userId, marketId) {
      const h = positions.get(key(userId, marketId))
      return h ? pos(h) : null
    },
    async holdings(marketId) {
      return [...positions.values()].filter((h) => h.marketId === marketId).map((h) => ({ userId: h.userId, ...pos(h) }))
    },
    async holdingsFor(userId, marketIds) {
      const out = new Map<string, Position>()
      for (const id of marketIds) {
        const h = positions.get(key(userId, id))
        if (h) out.set(id, pos(h))
      }
      return out
    },
    async record(t) {
      trades.push(t)
      const k = key(t.userId, t.marketId)
      const h = positions.get(k) ?? { userId: t.userId, marketId: t.marketId, sharesYes: 0, sharesNo: 0, costBasis: 0 }
      if (t.side === 'yes') h.sharesYes += t.shares
      else h.sharesNo += t.shares
      h.costBasis += t.cost
      positions.set(k, h)
    },
    async stats(marketIds) {
      const out = new Map<string, { holders: number; trades: number }>()
      for (const id of marketIds) {
        out.set(id, {
          holders: [...positions.values()].filter((h) => h.marketId === id).length,
          trades: trades.filter((t) => t.marketId === id).length,
        })
      }
      return out
    },
  }
}

export function memoryLedger(): Ledger & { rows: { userId: string; delta: number; reason: LedgerReason }[] } {
  const wallets = new Map<string, WalletRecord>()
  const seen = new Set<string>()
  const rows: { userId: string; delta: number; reason: LedgerReason }[] = []

  return {
    rows,
    async open(userId) {
      if (!wallets.has(userId)) wallets.set(userId, { balance: 0, lifetimeEarned: 0, streak: 0, lastDaily: null })
    },
    async credit(userId, delta, reason, opts = {}) {
      if (opts.dedupKey && seen.has(opts.dedupKey)) return false
      const w = wallets.get(userId)
      if (!w) return false
      if (w.balance + delta < 0) throw new EngineError('insufficient')
      if (opts.dedupKey) seen.add(opts.dedupKey)
      rows.push({ userId, delta, reason })
      w.balance += delta
      w.lifetimeEarned += Math.max(delta, 0)
      return true
    },
    async wallet(userId) {
      return { ...(wallets.get(userId) ?? { balance: 0, lifetimeEarned: 0, streak: 0, lastDaily: null }) }
    },
    async setDaily(userId, day, streak) {
      const w = wallets.get(userId)
      if (w) Object.assign(w, { lastDaily: day, streak })
    },
  }
}
