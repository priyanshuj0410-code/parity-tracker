import { useEffect, useLayoutEffect, useState } from 'react'
import { href, segments } from './paths'

export { href }

// Links shared before October 2026 used #/ routes.
if (location.hash.startsWith('#/')) {
  const [p, q] = location.hash.slice(1).split('?')
  history.replaceState(null, '', href(...segments(p)) + (q ? `?${q}` : ''))
}

const keyOf = () => (history.state as { k?: number } | null)?.k

/**
 * In-app navigation is a new page and starts at the top; Back and Forward return each page to where the reader left it.
 * Section tabs (links marked data-scroll="keep") change only the part below them, so the page stays where it is and
 * the tabs stay under the reader's finger.
 */
let entry = keyOf() ?? Date.now()
if (keyOf() == null) history.replaceState({ k: entry }, '')
let restoreTo: number | null = null
const scrolls = new Map<number, number>()
const listeners = new Set<() => void>()
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

function arrive(next: number, scroll: 'top' | 'keep' | 'restore') {
  scrolls.set(entry, window.scrollY)
  entry = next
  restoreTo = scroll === 'top' ? 0 : scroll === 'keep' ? null : scrolls.get(entry) ?? 0
  listeners.forEach((l) => l())
}

export function navigate(to: string, { keepScroll = false } = {}) {
  if (to === location.pathname + location.search) { if (!keepScroll) window.scrollTo(0, 0); return }
  const k = Date.now() + Math.random()
  history.pushState({ k }, '', to)
  arrive(k, keepScroll ? 'keep' : 'top')
}

window.addEventListener('popstate', () => arrive(keyOf() ?? 0, 'restore'))

document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as Element).closest?.('a[href]')
  if (!(a instanceof HTMLAnchorElement) || a.target || a.hasAttribute('download')) return
  const url = new URL(a.href)
  if (url.origin !== location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return
  e.preventDefault()
  navigate(url.pathname + url.search, { keepScroll: a.dataset.scroll === 'keep' })
})

export function useRoute(): string[] {
  const [route, setRoute] = useState(() => segments(location.pathname))
  useEffect(() => {
    const on = () => setRoute(segments(location.pathname))
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  useLayoutEffect(() => {
    if (restoreTo == null) return
    window.scrollTo(0, restoreTo)
    restoreTo = null
  }, [route])
  return route
}

export function query(): URLSearchParams {
  return new URLSearchParams(location.search)
}

/** Keeps view state (filters, sorts) in the URL without adding history entries. */
export function setQuery(params: Record<string, string | null>) {
  const q = query()
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') q.delete(k)
    else q.set(k, v)
  }
  const s = q.toString()
  try {
    history.replaceState(history.state, '', location.pathname + (s ? `?${s}` : ''))
  } catch {
    // Safari rate-limits replaceState while someone types fast; the next change brings the URL up to date.
  }
}

/** A filter that lives in the URL, so Back and shared links keep it. The default value is left out of the URL. */
export function useQueryState<T extends string>(key: string, initial: T, allowed?: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const v = query().get(key)
    return v != null && (!allowed || (allowed as readonly string[]).includes(v)) ? (v as T) : initial
  })
  const set = (v: T) => {
    setValue(v)
    setQuery({ [key]: v === initial ? null : v })
  }
  return [value, set]
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Nivel` : 'Nivel · The Equal Lens'
  }, [title])
}
