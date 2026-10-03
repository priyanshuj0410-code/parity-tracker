import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { INDEX_ORDER, companies, indexes, load, marketOf, useLoaded } from '../lib/data'
import { href, navigate } from '../lib/router'
import { PHONE, useMedia } from '../lib/useMedia'
import { EmptyState } from './EmptyState'
import { Logo } from './Logo'
import { Monogram } from './Monogram'

interface Hit { key: string; title: string; sub: string; to: string; seed: string; index: boolean }

/** Whatever has loaded so far: indexes first, then companies. */
const everything = (withIndexes: boolean, withCompanies: boolean): Hit[] => [
  ...(withIndexes ? INDEX_ORDER : []).map((id) => ({ key: 'i-' + id, title: indexes[id].name, sub: `Index · ${indexes[id].market}`, to: href('index', id), seed: id, index: true })),
  ...(withCompanies ? Object.values(companies) : []).map((c) => ({
    key: c.symbol, title: c.name, sub: `${c.symbol.replace(/^(ASX|TSE|EU)-/, '')} · ${marketOf(c).name}`, to: href('company', c.symbol), seed: c.symbol, index: false,
  })),
]

const ICON = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>

export function SiteSearch() {
  const phone = useMedia(PHONE)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const core = useLoaded('core', false)
  const ready = useLoaded('companies', false)
  const warm = () => { load('companies').catch(() => {}) }

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    const ALL = everything(core, ready)
    const starts = ALL.filter((h) => h.title.toLowerCase().startsWith(n) || h.sub.toLowerCase().startsWith(n))
    const rest = ALL.filter((h) => !starts.includes(h) && (h.title.toLowerCase().includes(n) || h.sub.toLowerCase().includes(n)))
    return [...starts, ...rest].slice(0, phone ? 20 : 8)
  }, [q, phone, core, ready])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        if (phone) setSheet(true)
        else input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phone])

  useEffect(() => {
    if (!sheet) return
    warm()
    input.current?.focus()
    document.body.classList.add('locked')
    return () => document.body.classList.remove('locked')
  }, [sheet])

  const close = () => { setQ(''); setOpen(false); setSheet(false); input.current?.blur() }
  const go = (h: Hit) => { navigate(h.to); close() }

  const field = (
    <input
      ref={input} type="search" value={q} placeholder="Search companies and indexes" aria-label="Search companies and indexes"
      role="combobox" aria-autocomplete="list" aria-expanded={(open || sheet) && hits.length > 0}
      aria-controls="search-results" aria-activedescendant={hits[active] ? `sr-${hits[active].key}` : undefined}
      onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true) }}
      onFocus={() => { setOpen(true); warm() }}
      onBlur={() => { if (!sheet) setTimeout(() => setOpen(false), 120) }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
        if (e.key === 'Enter' && hits[active]) go(hits[active])
        if (e.key === 'Escape') close()
      }}
    />
  )
  const results = hits.length > 0 && (open || sheet) && (
    <ul className="search-results" id="search-results" role="listbox">
      {hits.map((h, i) => (
        <li key={h.key} id={`sr-${h.key}`} role="option" aria-selected={i === active} className={i === active ? 'on' : undefined}
          onMouseDown={(e) => { e.preventDefault(); go(h) }} onMouseEnter={() => setActive(i)}>
          {h.index ? <Monogram name={h.title} seed={h.seed} /> : <Logo symbol={h.seed} name={h.title} />}
          <span><span className="sr-title">{h.title}</span><span className="sr-sub">{h.sub}</span></span>
        </li>
      ))}
    </ul>
  )

  if (phone) {
    return (
      <>
        <button type="button" className="icon-btn" aria-label="Search companies and indexes" onClick={() => setSheet(true)}>{ICON}</button>
        {sheet && createPortal(
          <div className="search-sheet" role="dialog" aria-modal="true" aria-label="Search">
            <div className="sheet-bar">
              <div className="search-field">{ICON}{field}</div>
              <button type="button" className="sheet-cancel" onClick={close}>Cancel</button>
            </div>
            {results}
            {q.trim() && !ready && <p className="sheet-hint" role="status">Loading companies…</p>}
            {!results && (!q.trim() ? <p className="sheet-hint">Type a company, ticker or index</p> : ready
              && <div role="status"><EmptyState art="results" compact title={`No companies or indexes match “${q.trim()}”`}>Try a ticker, such as TCS, or an index name.</EmptyState></div>)}
          </div>,
          document.body,
        )}
      </>
    )
  }
  return (
    <div className="search">
      <span className="search-icon">{ICON}</span>
      {field}
      <kbd className="search-kbd" aria-hidden="true">⌘K</kbd>
      {results}
      {open && q.trim() && !ready && <p className="search-empty" role="status">Loading companies…</p>}
      {open && q.trim() && ready && hits.length === 0 && <p className="search-empty" role="status">No companies or indexes match “{q.trim()}”. Try a ticker, such as TCS.</p>}
    </div>
  )
}
