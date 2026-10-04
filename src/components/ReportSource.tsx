import type { ReportSource } from '../types'

/** A company document a figure was read from, as a link with its page (decision 0015). */
export function ReportRef({ s }: { s: ReportSource }) {
  return <a href={s.url} target="_blank" rel="noreferrer">{s.title}{s.page ? `, page ${s.page}` : ''}</a>
}

/** The documents behind a year's company-report figures, joined with "and". */
export function ReportRefs({ sources }: { sources: ReportSource[] }) {
  return <>{sources.map((s, i) => <span key={s.url + i}>{i > 0 && ' and '}<ReportRef s={s} /></span>)}</>
}

export const fromReport = (sources: ReportSource[] | undefined, field: string) => sources?.find((s) => s.fields.includes(field))
