// The market templates and resolution rules from knowledge/plans/market-templates.md (PARITY-48), as code. Pure
// functions, so the console and the tests share them.

export const TEMPLATES = ['nivel-data', 'official', 'norm'] as const
export type Template = (typeof TEMPLATES)[number]

export const VOID_REASONS = ['overdue', 'cancelled', 'redefined', 'early', 'error'] as const
export type VoidReason = (typeof VOID_REASONS)[number]

// {market}:{population}:{measure}:{period}, section 2.
const SUBJECT =
  /^(in|gb|au|jp|eu):[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*:(fy\d{4}-\d{2}|\d{4}(-(0[1-9]|1[0-2]))?|\d{4}-[a-z]{3}-[a-z]{3}|[a-z]+\d+)$/

export interface Subject {
  market: string
  population: string
  measure: string
  period: string
}

export function parseSubject(s: string): Subject | null {
  if (s.length > 80 || !SUBJECT.test(s)) return null
  const [market, population, measure, period] = s.split(':')
  return { market, population, measure, period }
}

// Measures in use (section 2), by template. Norm measures are {survey}-{item}-{answer}, fixed when the owner
// approves the item.
// Official measures are slugs named when the owner approves a market on a new statistic (decision 0018 widened the
// sources to any official release with a published calendar).
const MEASURES: Record<Template, (m: string) => boolean> = {
  'nivel-data': (m) => m === 'payshare',
  official: (m) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(m),
  norm: (m) => /^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(m),
}

export const fitsTemplate = (t: Template, s: Subject) => MEASURES[t](s.measure)

// Decimals each template's source publishes (section 3). Official statistics and norms take the publisher's own.
export const PRECISION: Record<Template, number | null> = { 'nivel-data': 2, official: null, norm: null }

const DAY = 86_400_000
const IST = 5.5 * 3_600_000

/** 23:59 IST on a calendar date (YYYY-MM-DD), as an instant. */
const endOfIstDay = (date: string) => new Date(Date.parse(`${date}T23:59:00Z`) - IST)

/**
 * When trading closes (section 5): 23:59 IST the day before the scheduled date, or, for Nivel data, the end of the
 * financial year the figure covers if that is earlier.
 */
export function closesAt(t: Template, s: Subject, scheduled: string): Date {
  const dayBefore = new Date(Date.parse(`${scheduled.slice(0, 10)}T00:00:00Z`) - DAY).toISOString().slice(0, 10)
  const close = endOfIstDay(dayBefore)
  const fy = /^fy(\d{4})-\d{2}$/.exec(s.period)
  if (t === 'nivel-data' && fy) {
    const yearEnd = endOfIstDay(`${Number(fy[1]) + 1}-03-31`)
    return yearEnd < close ? yearEnd : close
  }
  return close
}

// ---- The weekly cycle (decision 0018) ----
// Proposals are ready by 09:00 IST on Saturday; approved markets open at 21:00 IST on Sunday; each settles by 09:00 IST
// the next Saturday. The source must publish Tuesday to Friday of that week, so every market trades for at least a day.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

export const isSunday = (date: string) => DATE_RE.test(date) && new Date(`${date}T00:00:00Z`).getUTCDay() === 0

/** When a week's markets open: 21:00 IST on its Sunday. */
export const opensAt = (sunday: string) => new Date(Date.parse(`${sunday}T21:00:00Z`) - IST)

/** When a week's markets must be settled: 09:00 IST on the Saturday after its Sunday. */
export const settleBy = (sunday: string) => new Date(Date.parse(`${addDays(sunday, 6)}T09:00:00Z`) - IST)

/** The source's scheduled date falls Tuesday to Friday of the week that opens on `sunday`. */
export function inWeek(sunday: string, scheduled: string): boolean {
  const d = scheduled.slice(0, 10)
  return isSunday(sunday) && DATE_RE.test(d) && d >= addDays(sunday, 2) && d <= addDays(sunday, 5)
}

/** The figure at the source's precision, compared with "at least": a tie is a yes (section 1). */
export function outcomeFor(figure: number, threshold: number, precision: number): 'yes' | 'no' {
  const f = Math.round(figure * 10 ** precision) / 10 ** precision
  return f >= threshold ? 'yes' : 'no'
}

/**
 * The seven-day schedule check (section 6, step 1) is due: within seven days of the scheduled date, and the schedule
 * document was last read before that window opened. A weekly market's document is read on its Saturday, so never.
 */
export const checkDue = (scheduled: string, readOn: string, now: Date) =>
  now.getTime() >= Date.parse(scheduled) - 7 * DAY && Date.parse(readOn) < Date.parse(scheduled) - 7 * DAY

/** The data API year key for a Nivel data period: fy2026-27 is "2026-27". */
export const nivelYear = (period: string) => /^fy(\d{4}-\d{2})$/.exec(period)?.[1] ?? null

/**
 * A Nivel data figure from a release's index file: the headline as a percentage, or null when the year is missing or
 * under 90% of the owned payroll is reported, since a thinner release does not settle a market (section 3).
 */
export function nivelFigure(indexJson: string, period: string): number | null {
  const year = nivelYear(period)
  const y = year ? (JSON.parse(indexJson) as { years?: Record<string, { headline?: number; reportedPayrollShare?: number }> }).years?.[year] : null
  if (!y || typeof y.headline !== 'number' || (y.reportedPayrollShare ?? 0) < 0.9) return null
  return y.headline * 100
}
