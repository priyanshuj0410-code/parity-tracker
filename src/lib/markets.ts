// Nivel's play-money markets in the browser (PARITY-44): the /api/markets calls, sign-in with Neon Auth, and the
// age step's arithmetic. Markets stay invisible unless /api/markets says they are set up and on.

export type Template = 'nivel-data' | 'official' | 'norm'
export type Side = 'yes' | 'no'

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
  opensAt: string
}

export interface Position { sharesYes: number; sharesNo: number; costBasis: number }

export interface Market {
  id: string
  subject: string | null
  question: string
  status: 'draft' | 'open' | 'resolving' | 'resolved' | 'void'
  outcome: Side | null
  priceYes: number
  source: { name: string; url: string } | null
  resolutionUrl: string | null
  position?: Position
  details: Details | null
}

export interface Settlement { marketId: string; figure: number | null; releaseId: string | null; sourceUrl: string; releaseName: string; outcome: Side | null; note: string | null }

export interface AdminMarket extends Market {
  holders: number
  trades: number
  upcoming: boolean
  closed: boolean
  checkDue: boolean
  overdue: boolean
  settlement: Settlement | null
}

// A market Claude proposes on Saturday for the owner to approve (decision 0018).
export interface Proposal {
  id: string
  week: string
  status: 'proposed' | 'approved' | 'rejected'
  body: {
    template: Template
    subject: string
    threshold: number
    precision?: number
    question: string
    definition: string
    releaseName: string
    scheduledDate: string
    scheduleDoc: { name: string; url: string; readOn: string }
    resolutionLocation: string
    source: { name: string; url: string }
  }
  rationale: string
  marketId: string | null
  reason: string | null
  opensAt: string
  settleBy: string
}

export interface LogEntry {
  action: 'create' | 'schedule-check' | 'resolve' | 'void'
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

export interface Wallet { balance: number; lifetimeEarned: number; streak: number; dailyClaimable: boolean; claimed?: boolean; awarded?: number }
export interface Config { configured: boolean; enabled: boolean; authUrl: string | null }

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly body: Record<string, unknown>
  constructor(status: number, body: Record<string, unknown>) {
    super(String(body.error ?? status))
    this.status = status
    this.code = String(body.error ?? 'markets_unavailable')
    this.body = body
  }
}

// --- Sign-in: Neon Auth is Better Auth, reached over fetch. Its base URL comes from the server at run time.

let authUrl: string | null = null
let jwt: string | null = null
// Better Auth's session token, sent as a bearer when the browser keeps no cross-site cookie.
let sessionToken: string | null = null

export interface Account { id: string; email: string }

async function auth(path: string, body?: object, bearer = false): Promise<Response> {
  if (!authUrl) throw new ApiError(503, { error: 'not_configured' })
  return fetch(`${authUrl.replace(/\/$/, '')}${path}`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(bearer && sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** The signed-in account, with its JWT kept in memory for /api/markets; null when signed out. */
export async function session(): Promise<Account | null> {
  if (!authUrl) return null
  for (const bearer of sessionToken ? [false, true] : [false]) {
    try {
      const r = await auth('/get-session', undefined, bearer)
      const data = r.ok ? ((await r.json()) as { user?: { id?: string; email?: string } } | null) : null
      if (!data?.user?.id) continue
      jwt = r.headers.get('set-auth-jwt')
      if (!jwt) {
        const t = await auth('/token', undefined, bearer)
        jwt = t.ok ? ((await t.json()) as { token?: string }).token ?? null : null
      }
      if (jwt) return { id: data.user.id, email: data.user.email ?? '' }
    } catch {
      // Auth unreachable: signed out.
    }
  }
  jwt = null
  return null
}

const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'That email and password do not match an account.',
  USER_ALREADY_EXISTS: 'An account with this email exists. Sign in instead.',
  PASSWORD_TOO_SHORT: 'Use a password of at least 8 characters.',
  INVALID_EMAIL: 'Enter a valid email address.',
}

/** Signs in, or creates the account first. Throws a sentence to show the reader. */
export async function signIn(email: string, password: string, create: boolean): Promise<Account> {
  let r: Response
  try {
    r = await auth(create ? '/sign-up/email' : '/sign-in/email', create ? { email, password, name: '' } : { email, password })
  } catch {
    throw new Error('Sign-in is unreachable. Try again.')
  }
  const body = (await r.json().catch(() => ({}))) as { token?: string; code?: string }
  if (!r.ok) throw new Error(AUTH_ERRORS[body.code ?? ''] ?? 'Sign-in failed. Try again.')
  sessionToken = body.token ?? null
  const account = await session()
  if (!account) throw new Error('Sign-in failed. Try again.')
  return account
}

export async function signOut(): Promise<void> {
  try { await auth('/sign-out', {}, true) } catch { /* Local state clears regardless. */ }
  jwt = null
  sessionToken = null
}

// --- The markets API.

async function api<T>(path: string, body?: object): Promise<T> {
  let r: Response
  try {
    r = await fetch(path, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, { error: 'offline' })
  }
  const data = (await r.json().catch(() => ({ error: 'markets_unavailable' }))) as Record<string, unknown>
  if (!r.ok) throw new ApiError(r.status, data)
  return data as T
}

let configured: Promise<Config> | null = null

/** Whether markets are set up and on, and where to sign in. Off whenever the API is missing or fails. */
export function config(): Promise<Config> {
  configured ??= api<Config>('/api/markets?view=config')
    .then((c) => { authUrl = c.authUrl; return c })
    .catch(() => { configured = null; return { configured: false, enabled: false, authUrl: null } })
  return configured
}

export const marketsOn = (subject: string) => api<{ markets: Market[] }>(`/api/markets?subject=${encodeURIComponent(subject)}`).then((r) => r.markets)
export const marketById = (id: string) => api<{ market: Market; log: LogEntry[] }>(`/api/markets?market=${encodeURIComponent(id)}`)
export const wallet = () => api<Wallet>('/api/markets?view=wallet')
export const recordAge = (birthDate: string) => api<{ adult: true }>('/api/markets', { action: 'age', birthDate })
export const trade = (marketId: string, side: Side, shares: number) =>
  api<{ priceYes: number; position: Position; balance: number }>('/api/markets', { action: 'trade', marketId, side, shares })
export const claim = () => api<Wallet>('/api/markets', { action: 'claim' })
export const forget = () => api<{ ok: true }>('/api/markets', { action: 'forget' })
export const adminConsole = () => api<{ markets: AdminMarket[]; proposals: Proposal[] }>('/api/markets-admin')
export const adminAction = <T = { ok: true }>(body: Record<string, unknown>) => api<T>('/api/markets-admin', body)

/** One sentence for an API error. */
export function problem(err: unknown): string {
  const code = err instanceof ApiError ? err.code : ''
  const SAY: Record<string, string> = {
    offline: 'You are offline. Try again when the connection is back.',
    unauthenticated: 'Sign in again to continue.',
    markets_disabled: 'Markets are not open yet.',
    not_configured: 'Markets are not open yet.',
    not_adult: 'Markets are for adults. Give your date of birth first.',
    under_18: 'Markets are for adults.',
    console_account: 'Console accounts cannot play.',
    forbidden: 'This account has no console access.',
    trading_closed: 'Trading has closed on this market.',
    market_closed: 'Trading has closed on this market.',
    insufficient: 'Not enough Lumens for this trade.',
    oversell: 'You cannot sell more shares than you hold.',
    bad_shares: 'Trade between 10 and 1,000 shares.',
    no_market: 'This market does not exist.',
    subject_taken: 'A market on this subject is already open.',
    already_closed: 'That scheduled date closes trading before the market opens.',
    still_trading: 'Trading has not closed yet.',
    already_settled: 'This market is already resolved or voided.',
    not_settled: 'That release does not settle the market: the year is missing or under 90% of payroll is reported.',
    bad_request: 'Check the fields and try again.',
  }
  return SAY[code] ?? 'Markets are unavailable. Try again.'
}

// --- Dates and figures.

const IST = 5.5 * 3_600_000
const istParts = (iso: string) => new Date(Date.parse(iso) + IST)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "31 March 2027" for a date or instant, in IST. */
export function istDate(iso: string): string {
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : istParts(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** "23:59 IST, 31 March 2027". */
export function istTime(iso: string): string {
  const d = istParts(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST, ${istDate(iso)}`
}

/** The yes price as a whole number out of 100. */
export const outOf100 = (priceYes: number) => Math.round(priceYes * 100)

export const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

/** A threshold or figure in the market's own unit: a percentage, or a number of every 100 people for norms. */
export function figure(d: Details, n: number): string {
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: d.template === 'norm' ? 0 : 1, maximumFractionDigits: Math.max(d.precision, 1) })
  return d.template === 'norm' ? `${s} of every 100` : `${s}%`
}

/** Whole years from a birth date to today's IST date, as the server counts them; null for an impossible date. */
export function ageOn(y: number, m: number, d: number, now = new Date()): number | null {
  const born = new Date(Date.UTC(y, m - 1, d))
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== m - 1 || born.getUTCDate() !== d) return null
  const [ty, tm, td] = new Date(now.getTime() + IST).toISOString().slice(0, 10).split('-').map(Number)
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0)
  return age < 0 || age > 120 ? null : age
}

/** Trading is over: past the closing time, or no longer open. */
export const tradingClosed = (m: Market, now = Date.now()) => m.status !== 'open' || !m.details || now >= Date.parse(m.details.closesAt)
