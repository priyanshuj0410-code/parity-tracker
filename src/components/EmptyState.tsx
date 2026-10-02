import type { ReactNode } from 'react'

const ART = {
  results: 'no-results-found',
  reports: 'no-reports-yet',
  notEnough: 'not-enough-data-yet',
  data: 'no-data-yet',
} as const

/** An empty or not-yet state: a Lensy illustration, one line on what happened, then a way forward. */
export function EmptyState({ art, title, children, actions, compact }: {
  art: keyof typeof ART
  title: ReactNode
  children?: ReactNode
  actions?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={compact ? 'empty compact' : 'empty'}>
      <img className="empty-art" src={`/illustrations/${ART[art]}.svg`} alt="" width="1140" height="985" loading="lazy" decoding="async" />
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {actions && <div className="actions-row">{actions}</div>}
    </div>
  )
}
