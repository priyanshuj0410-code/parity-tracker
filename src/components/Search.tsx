import { useEffect, useMemo, useRef, useState } from 'react'
import { INDEX_ORDER, companies, indexes, marketOf } from '../lib/data'
import { href } from '../lib/router'
import { Monogram } from './Monogram'

interface Hit { key: string; title: string; sub: string; to: string; seed: string }

const ALL: Hit[] = [
  ...INDEX_ORDER.map((id) => ({ key: 'i-' + id, title: indexes[id].name, sub: `Index · ${indexes[id].market}`, to: href('index', id), seed: id })),
  ...Object.values(companies).map((c) => ({
    key: c.symbol, title: c.name, sub: `${c.symbol.replace(/^(ASX|TSE|EU)-/, '')} · ${marketOf(c).name}`, to: href('company', c.symbol), seed: c.symbol,
  })),
]

export function Search() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    const starts = ALL.filter((h) => h.title.toLowerCase().startsWith(n) || h.sub.toLowerCase().startsWith(n))
    const rest = ALL.filter((h) => !starts.includes(h) && (h.title.toLowerCase().includes(n) || h.sub.toLowerCase().includes(n)))
    return [...starts, ...rest].slice(0, 8)
  }, [q])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (h: Hit) => {
    window.location.hash = h.to
    setQ('')
    setOpen(false)
    input.current?.blur()
  }

  return (
    <div className="search">
      <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      <input
        ref={input} type="search" value={q} placeholder="Search companies and indexes" aria-label="Search companies and indexes"
        role="combobox" aria-autocomplete="list" aria-expanded={open && hits.length > 0}
        aria-controls="search-results" aria-activedescendant={hits[active] ? `sr-${hits[active].key}` : undefined}
        onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && hits[active]) go(hits[active])
          if (e.key === 'Escape') { setQ(''); input.current?.blur() }
        }}
      />
      <kbd className="search-kbd" aria-hidden="true">⌘K</kbd>
      {open && hits.length > 0 && (
        <ul className="search-results" id="search-results" role="listbox">
          {hits.map((h, i) => (
            <li key={h.key} id={`sr-${h.key}`} role="option" aria-selected={i === active} className={i === active ? 'on' : undefined}
              onMouseDown={(e) => { e.preventDefault(); go(h) }} onMouseEnter={() => setActive(i)}>
              <Monogram name={h.title} seed={h.seed} />
              <span><span className="sr-title">{h.title}</span><span className="sr-sub">{h.sub}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
