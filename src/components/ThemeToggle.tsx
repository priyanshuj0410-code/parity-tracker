import { useState } from 'react'

type Theme = 'system' | 'light' | 'dark'
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<Theme, string> = { system: 'Theme: matches your device', light: 'Theme: light', dark: 'Theme: dark' }

function current(): Theme {
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' || t === 'dark' ? t : 'system'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(current)

  const cycle = () => {
    const t = NEXT[theme]
    if (t === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', t)
    try {
      if (t === 'system') localStorage.removeItem('pt-theme')
      else localStorage.setItem('pt-theme', t)
    } catch {
      // storage unavailable (private mode); the choice still applies for this visit
    }
    setTheme(t)
  }

  return (
    <button type="button" className="theme-toggle" onClick={cycle} aria-label={`${LABEL[theme]}. Switch to ${NEXT[theme]}.`} title={LABEL[theme]}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {theme === 'light' && <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
        {theme === 'dark' && <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
        {theme === 'system' && <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" /></>}
      </svg>
    </button>
  )
}
