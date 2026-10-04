import { useLayoutEffect, useRef } from 'react'
import { revealInRow } from '../lib/reveal'

export interface TabItem { id: string; label: string; href: string }

/** Section tabs: switching keeps the page where it is (data-scroll="keep"), and the current tab stays in view in a row that scrolls sideways. */
export function Tabs({ items, current, label }: { items: TabItem[]; current: string; label: string }) {
  const nav = useRef<HTMLElement>(null)
  useLayoutEffect(() => revealInRow(nav.current, '.tab.on'), [current])
  return (
    <nav className="tabs" aria-label={label} ref={nav}>
      {items.map((t) => (
        <a key={t.id} href={t.href} data-scroll="keep" className={t.id === current ? 'tab on' : 'tab'} aria-current={t.id === current ? 'page' : undefined}>{t.label}</a>
      ))}
    </nav>
  )
}
