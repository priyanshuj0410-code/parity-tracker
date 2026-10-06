import { EARNING, dailyAward, istDay, payouts, planTrade, priceYes, refunds, seed } from './rules.js'
import type { EarningRules } from './rules.js'
import { EngineError } from './types.js'
import type { Ledger, Market, MarketRecord, MarketStore, Outcome, Position, Side, Source } from './types.js'

// What a host supplies. The engine reads only the store and ledger it is
// given, never a host's other tables.
export interface Host {
  store: MarketStore
  ledger: Ledger
  // The host's switch: off means no reads and no trades.
  enabled(): boolean
  // Trades and grants go only to confirmed adults.
  isAdult(userId: string): boolean | Promise<boolean>
  earning?: Partial<EarningRules>
  now?: () => Date
}

export interface WalletView {
  balance: number
  lifetimeEarned: number
  streak: number
  dailyClaimable: boolean
}

export interface DailyClaim extends WalletView {
  claimed: boolean
  awarded: number
}

export interface TradeResult {
  priceYes: number
  position: Position
  balance: number
}

export interface NewMarket {
  subject?: string
  question: string
  criteria?: string
  category?: string
  resolutionDate?: string
  b?: number
  priorYes?: number
  source?: Source
}

function view(r: MarketRecord): Market {
  const { b, qYes, qNo, ...rest } = r
  return { ...rest, priceYes: priceYes(qYes, qNo, b) }
}

export function createEngine(host: Host) {
  const { store, ledger } = host
  const rules: EarningRules = { ...EARNING, ...host.earning }
  const now = host.now ?? (() => new Date())

  async function requireAdult(userId: string): Promise<void> {
    if (!(await host.isAdult(userId))) throw new EngineError('not_adult')
  }

  async function ensureWallet(userId: string): Promise<void> {
    await requireAdult(userId)
    await ledger.open(userId)
    await ledger.credit(userId, rules.welcomeGrant, 'welcome_grant', { dedupKey: `${userId}:welcome` })
  }

  async function wallet(userId: string): Promise<WalletView> {
    await ensureWallet(userId)
    const w = await ledger.wallet(userId)
    return { balance: w.balance, lifetimeEarned: w.lifetimeEarned, streak: w.streak, dailyClaimable: w.lastDaily !== istDay(now()) }
  }

  return {
    enabled: () => host.enabled(),
    ensureWallet,
    wallet,

    // Idempotent per IST day: a second claim the same day awards nothing.
    async claimDaily(userId: string): Promise<DailyClaim> {
      await ensureWallet(userId)
      const w = await ledger.wallet(userId)
      const next = dailyAward(w.lastDaily, w.streak, now(), rules)
      if (!next) return { ...(await wallet(userId)), claimed: false, awarded: 0 }
      const applied = await ledger.credit(userId, next.award, 'daily_login', { dedupKey: `${userId}:daily:${next.day}` })
      if (applied) await ledger.setDaily(userId, next.day, next.streak)
      return { ...(await wallet(userId)), claimed: applied, awarded: applied ? next.award : 0 }
    },

    async markets(subject: string, userId?: string): Promise<(Market & { position?: Position })[]> {
      if (!host.enabled()) return []
      const markets = (await store.list({ subject })).map(view)
      if (!userId || markets.length === 0) return markets
      const held = await store.holdingsFor(userId, markets.map((m) => m.id))
      return markets.map((m) => ({ ...m, position: held.get(m.id) }))
    },

    // Every market regardless of status, with holder and trade counts, so an
    // admin sees what they are about to act on.
    async adminMarkets(limit = 100): Promise<(Market & { holders: number; trades: number })[]> {
      const rows = await store.list({ includeDrafts: true, limit })
      const stats = await store.stats(rows.map((r) => r.id))
      return rows.map((r) => ({ ...view(r), holders: stats.get(r.id)?.holders ?? 0, trades: stats.get(r.id)?.trades ?? 0 }))
    },

    async trade(userId: string, marketId: string, side: Side, shares: number): Promise<TradeResult> {
      if (!host.enabled()) throw new EngineError('markets_disabled')
      await requireAdult(userId)
      const m = await store.get(marketId)
      if (!m) throw new EngineError('no_market')
      const plan = planTrade(m, side, shares, shares < 0 ? await store.holding(userId, marketId) : null)

      if (plan.cost > 0) {
        if (!(await ledger.credit(userId, -plan.cost, 'market_stake', { refId: marketId }))) throw new EngineError('insufficient')
      } else if (plan.cost < 0) {
        await ledger.credit(userId, -plan.cost, 'market_refund', { refId: marketId })
      }

      await store.setQuantities(marketId, plan.qYes, plan.qNo)
      await store.record({ userId, marketId, side, shares, cost: plan.cost, price: plan.priceYes })
      const position = (await store.holding(userId, marketId)) ?? { sharesYes: 0, sharesNo: 0, costBasis: 0 }
      return { priceYes: plan.priceYes, position, balance: (await ledger.wallet(userId)).balance }
    },

    async createMarket(input: NewMarket): Promise<string> {
      const b = input.b ?? 120
      return store.create({
        subject: input.subject ?? null,
        question: input.question,
        criteria: input.criteria ?? '',
        category: input.category ?? 'Other',
        resolutionDate: input.resolutionDate ?? null,
        status: 'open',
        b,
        ...seed(input.priorYes ?? 0.5, b),
        source: input.source ?? null,
      })
    },

    // Idempotent per market and holder.
    async resolveMarket(marketId: string, outcome: Outcome, opts: { sourceUrl?: string } = {}): Promise<void> {
      const m = await store.get(marketId)
      if (!m || (m.status !== 'open' && m.status !== 'resolving')) return
      for (const p of payouts(await store.holdings(marketId), outcome)) {
        await ledger.credit(p.userId, p.amount, 'market_payout', { refId: marketId, dedupKey: `payout:${marketId}:${p.userId}` })
      }
      await store.close(marketId, 'resolved', outcome, opts.sourceUrl ?? null)
    },

    async voidMarket(marketId: string): Promise<void> {
      const m = await store.get(marketId)
      if (!m || m.status === 'resolved' || m.status === 'void') return
      for (const r of refunds(await store.holdings(marketId))) {
        await ledger.credit(r.userId, r.amount, 'market_refund', { refId: marketId, dedupKey: `void:${marketId}:${r.userId}` })
      }
      await store.close(marketId, 'void', null, null)
    },
  }
}

export type Engine = ReturnType<typeof createEngine>
