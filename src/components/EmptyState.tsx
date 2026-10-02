import type { ReactNode } from 'react'

const ART = {
  results: ['no-results-found', 1117, 978],
  reports: ['no-reports-yet', 1168, 981],
  notEnough: ['not-enough-data-yet', 1126, 1053],
  data: ['no-data-yet', 1167, 998],
  notFound: ['page-not-found', 1536, 897],
  error: ['something-went-wrong', 1473, 839],
  offline: ['youre-offline', 1619, 872],
  excluded: ['figure-excluded', 1398, 873],
  offMap: ['not-on-parity-map', 1312, 1199],
} as const

/** An empty or not-yet state: a Lensy illustration, one line on what happened, then a way forward. */
export function EmptyState({ art, title, children, actions, compact }: {
  art: keyof typeof ART
  title: ReactNode
  children?: ReactNode
  actions?: ReactNode
  compact?: boolean
}) {
  const [file, w, h] = ART[art]
  return (
    <div className={compact ? 'empty compact' : 'empty'}>
      <img className={w / h > 1.4 ? 'empty-art wide' : 'empty-art'} src={`/illustrations/${file}.svg`} alt="" width={w} height={h} loading="lazy" decoding="async" />
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {actions && <div className="actions-row">{actions}</div>}
    </div>
  )
}
