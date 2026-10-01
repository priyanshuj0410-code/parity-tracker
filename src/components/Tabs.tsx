export interface TabItem { id: string; label: string; href: string }

export function Tabs({ items, current, label }: { items: TabItem[]; current: string; label: string }) {
  return (
    <nav className="tabs" aria-label={label}>
      {items.map((t) => (
        <a key={t.id} href={t.href} className={t.id === current ? 'tab on' : 'tab'} aria-current={t.id === current ? 'page' : undefined}>{t.label}</a>
      ))}
    </nav>
  )
}
