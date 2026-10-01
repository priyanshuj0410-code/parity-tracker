import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export interface DropdownOption<T extends string> { id: T; label: string }

export function Dropdown<T extends string>({ label, value, options, onChange, prefix }: {
  label: string
  value: T
  options: DropdownOption<T>[]
  onChange: (v: T) => void
  prefix?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const id = useId()
  const current = options.find((o) => o.id === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    list.current?.focus()
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  const show = () => { setActive(Math.max(0, options.findIndex((o) => o.id === value))); setOpen(true) }
  const pick = (i: number) => { onChange(options[i].id); setOpen(false); root.current?.querySelector('button')?.focus() }
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active) }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); if (e.key === 'Escape') root.current?.querySelector('button')?.focus() }
  }

  return (
    <div className="dd" ref={root}>
      <button type="button" className={open ? 'dd-btn open' : 'dd-btn'} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        aria-label={`${label}: ${current.label}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show() } }}>
        {prefix && <span className="dd-prefix">{prefix}</span>}
        <span className="dd-value">{current.label}</span>
        <svg className="dd-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul className="dd-menu" role="listbox" id={id} ref={list} tabIndex={-1} aria-label={label}
          aria-activedescendant={`${id}-${active}`} onKeyDown={onListKey}>
          {options.map((o, i) => (
            <li key={o.id} id={`${id}-${i}`} role="option" aria-selected={o.id === value}
              className={[i === active && 'active', o.id === value && 'on'].filter(Boolean).join(' ') || undefined}
              onPointerEnter={() => setActive(i)} onClick={() => pick(i)}>
              <span>{o.label}</span>
              {o.id === value && <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m3 7.5 2.6 2.6L11 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
