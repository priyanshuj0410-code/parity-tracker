export const NA = 'n/a'

export function pct(v: number | null | undefined, digits = 1): string {
  return v == null ? NA : `${(v * 100).toFixed(digits)}%`
}

export const ordinal = (n: number): string => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')

export const pctTick =(v: number): string => pct(v, Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? 0 : 1)

export function inr(v: number): string {
  return '₹' + Math.round(v).toLocaleString('en-IN')
}

export function crore(v: number | null | undefined): string {
  return v == null ? NA : `₹${v.toLocaleString('en-IN')} cr`
}
