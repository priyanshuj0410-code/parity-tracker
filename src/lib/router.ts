import { useEffect, useLayoutEffect, useState } from 'react'

const path = () => window.location.hash.split('?')[0]

function parse(): string[] {
  return path()
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
}

/** In-app navigation is a new page and starts at the top; browser Back and Forward return to where the reader was. */
let pushed = false
let restoreTo: number | null = null
let current = path()
const scrolls = new Map<string, number>()

document.addEventListener('click', (e) => {
  const link = (e.target as Element).closest?.('a[href^="#/"]')
  if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) pushed = true
}, true)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

export function navigate(to: string) {
  pushed = true
  window.location.hash = to
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      scrolls.set(current, window.scrollY)
      current = path()
      restoreTo = pushed ? 0 : scrolls.get(current) ?? 0
      pushed = false
      setRoute(parse())
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  useLayoutEffect(() => {
    if (restoreTo == null) return
    window.scrollTo(0, restoreTo)
    restoreTo = null
  }, [route])
  return route
}

export function query(): URLSearchParams {
  const i = window.location.hash.indexOf('?')
  return new URLSearchParams(i < 0 ? '' : window.location.hash.slice(i + 1))
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
    history.replaceState(history.state, '', (path() || '#/') + (s ? `?${s}` : ''))
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

export function href(...parts: string[]): string {
  return '#/' + parts.map(encodeURIComponent).join('/')
}
