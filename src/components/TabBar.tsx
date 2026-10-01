import { href } from '../lib/router'

const ITEMS = [
  { id: '', label: 'Indexes', icon: 'M4 4v16h16M7.5 14.5l3.5-4 3 2.5 5-6' },
  { id: 'companies', label: 'Companies', icon: 'M4 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14M14 10h5a1 1 0 0 1 1 1v9M2.5 20h19M8 9h2M8 13h2M8 17h2' },
  { id: 'compare', label: 'Compare', icon: 'M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a2.5 2.5 0 0 0 5 0zM19 8l-2.5 6a2.5 2.5 0 0 0 5 0z' },
  { id: 'method', label: 'Method', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01' },
]

export function TabBar({ section }: { section: string }) {
  return (
    <nav className="tabbar" aria-label="Sections">
      {ITEMS.map((t) => (
        <a key={t.id} href={href(t.id)} className={section === t.id ? 'on' : undefined} aria-current={section === t.id ? 'page' : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
          {t.label}
        </a>
      ))}
    </nav>
  )
}
