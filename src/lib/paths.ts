/** App paths. Dots in tickers (EU-ADS.DE) travel as underscores, so static hosts never mistake a page for a file. */
export function href(...parts: string[]): string {
  return '/' + parts.map((p) => encodeURIComponent(p).replace(/\./g, '_')).join('/')
}

export function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((s) => decodeURIComponent(s).replace(/_/g, '.'))
}
