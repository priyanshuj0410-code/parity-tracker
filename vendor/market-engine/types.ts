export type Side = 'yes' | 'no'
export type Outcome = 'yes' | 'no'
export type MarketStatus = 'draft' | 'open' | 'resolving' | 'resolved' | 'void'

// The load-bearing legal invariant: no reason moves money in. There is no
// purchase, deposit or top-up, and no transfer or cash-out exists anywhere.
export const LEDGER_REASONS = [
  'welcome_grant',
  'daily_login',
  'streak_bonus',
  'market_stake',
  'market_payout',
  'market_refund',
  'admin_adjust',
] as const
export type LedgerReason = (typeof LEDGER_REASONS)[number]

export class EngineError extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.code = code
  }
}

export interface Source {
  name: string
  url: string
}

// A market belongs to a host-defined subject: a story for Thoth, an index
// figure for Nivel. The engine never interprets it.
export interface MarketRecord {
  id: string
  subject: string | null
  question: string
  criteria: string
  category: string
  resolutionDate: string | null
  status: MarketStatus
  outcome: Outcome | null
  b: number
  qYes: number
  qNo: number
  source: Source | null
  resolutionUrl: string | null
}

export interface Market extends Omit<MarketRecord, 'b' | 'qYes' | 'qNo'> {
  priceYes: number
}

export interface Position {
  sharesYes: number
  sharesNo: number
  costBasis: number
}

export interface Holding extends Position {
  userId: string
}

export interface TradeRow {
  userId: string
  marketId: string
  side: Side
  shares: number
  cost: number
  price: number
}

export interface MarketStore {
  get(id: string): Promise<MarketRecord | null>
  list(q: { subject?: string; includeDrafts?: boolean; limit?: number }): Promise<MarketRecord[]>
  create(m: Omit<MarketRecord, 'id' | 'outcome' | 'resolutionUrl'>): Promise<string>
  setQuantities(id: string, qYes: number, qNo: number): Promise<void>
  close(id: string, status: 'resolved' | 'void', outcome: Outcome | null, resolutionUrl: string | null): Promise<void>
  holding(userId: string, marketId: string): Promise<Position | null>
  holdings(marketId: string): Promise<Holding[]>
  holdingsFor(userId: string, marketIds: string[]): Promise<Map<string, Position>>
  record(t: TradeRow): Promise<void>
  stats(marketIds: string[]): Promise<Map<string, { holders: number; trades: number }>>
}

export interface WalletRecord {
  balance: number
  lifetimeEarned: number
  streak: number
  lastDaily: string | null
}

export interface Ledger {
  open(userId: string): Promise<void>
  // The one way balances move. Returns false for a dedup replay or a missing
  // wallet; an overdraw throws EngineError('insufficient').
  credit(userId: string, delta: number, reason: LedgerReason, opts?: { refId?: string; dedupKey?: string }): Promise<boolean>
  wallet(userId: string): Promise<WalletRecord>
  setDaily(userId: string, day: string, streak: number): Promise<void>
}
