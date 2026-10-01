export const NA = 'n/a'

export function pct(v: number | null | undefined, digits = 1): string {
  return v == null ? NA : `${(v * 100).toFixed(digits)}%`
}

export function inr(v: number): string {
  return '₹' + Math.round(v).toLocaleString('en-IN')
}

export function crore(v: number | null | undefined): string {
  return v == null ? NA : `₹${v.toLocaleString('en-IN')} cr`
}

export function fy(label: string): string {
  return 'FY' + label.slice(-2)
}
