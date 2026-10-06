import { EngineError } from './types.js'
import type { Holding, MarketRecord, Outcome, Position, Side } from './types.js'

// ---- LMSR (log-sum-exp stabilised so large q never overflows) ----
export function cost(qYes: number, qNo: number, b: number): number {
  const a = qYes / b
  const c = qNo / b
  const m = Math.max(a, c)
  return b * (m + Math.log(Math.exp(a - m) + Math.exp(c - m)))
}

export function priceYes(qYes: number, qNo: number, b: number): number {
  const a = qYes / b
  const c = qNo / b
  const m = Math.max(a, c)
  const ey = Math.exp(a - m)
  const en = Math.exp(c - m)
  return ey / (ey + en)
}

// Seed q so the opening price equals the prior: q_yes − q_no = b·ln(p/(1−p)).
export function seed(prior: number, b: number): { qYes: number; qNo: number } {
  const p = Math.min(Math.max(prior, 0.02), 0.98)
  return { qYes: b * Math.log(p / (1 - p)), qNo: 0 }
}

export const MIN_SHARES = 10
export const MAX_SHARES = 1000

export function checkShares(shares: number): void {
  if (!Number.isInteger(shares) || Math.abs(shares) < MIN_SHARES || Math.abs(shares) > MAX_SHARES) {
    throw new EngineError('bad_shares')
  }
}

export interface TradePlan {
  qYes: number
  qNo: number
  cost: number // + the player pays, − the player receives
  priceYes: number
}

// Buy (positive shares) or sell (negative) one side against the house.
export function planTrade(m: MarketRecord, side: Side, shares: number, held: Position | null): TradePlan {
  checkShares(shares)
  if (m.status !== 'open') throw new EngineError('market_closed')
  const qYes = m.qYes + (side === 'yes' ? shares : 0)
  const qNo = m.qNo + (side === 'no' ? shares : 0)
  if (qYes < 0 || qNo < 0) throw new EngineError('oversell')
  if (shares < 0) {
    const have = side === 'yes' ? (held?.sharesYes ?? 0) : (held?.sharesNo ?? 0)
    if (have < -shares) throw new EngineError('oversell')
  }
  return {
    qYes,
    qNo,
    cost: Math.round(cost(qYes, qNo, m.b) - cost(m.qYes, m.qNo, m.b)),
    priceYes: priceYes(qYes, qNo, m.b),
  }
}

// Winners get 1 per share, losers nothing.
export function payouts(holdings: Holding[], outcome: Outcome): { userId: string; amount: number }[] {
  return holdings
    .map((h) => ({ userId: h.userId, amount: Math.max(0, Math.round(outcome === 'yes' ? h.sharesYes : h.sharesNo)) }))
    .filter((p) => p.amount > 0)
}

// A void returns each holder's net cost basis.
export function refunds(holdings: Holding[]): { userId: string; amount: number }[] {
  return holdings.map((h) => ({ userId: h.userId, amount: Math.max(0, h.costBasis) })).filter((r) => r.amount > 0)
}

// True once a market's source is more than graceDays past its scheduled date.
export function graceOver(resolutionDate: string | null, now: Date, graceDays = 30): boolean {
  if (!resolutionDate) return false
  return now.getTime() > new Date(resolutionDate).getTime() + graceDays * 86_400_000
}

// ---- Earning ----
export interface EarningRules {
  welcomeGrant: number
  dailyBase: number
  dailyStreakStep: number
  dailyMax: number
}

export const EARNING: EarningRules = { welcomeGrant: 1_000, dailyBase: 50, dailyStreakStep: 10, dailyMax: 100 }

// IST calendar day, the daily and streak boundary. Serverless clocks are UTC.
export function istDay(now: Date, offsetDays = 0): string {
  return new Date(now.getTime() + 5.5 * 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

// null when today's grant is already claimed.
export function dailyAward(
  lastDaily: string | null,
  streak: number,
  now: Date,
  rules: EarningRules,
): { day: string; streak: number; award: number } | null {
  const day = istDay(now)
  if (lastDaily === day) return null
  const next = lastDaily === istDay(now, -1) ? streak + 1 : 1
  return { day, streak: next, award: Math.min(rules.dailyBase + (next - 1) * rules.dailyStreakStep, rules.dailyMax) }
}
