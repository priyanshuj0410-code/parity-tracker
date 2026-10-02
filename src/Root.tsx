import mark from './assets/nivel-mark.svg'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { InstallLink, InstallPrompt } from './components/InstallPrompt'
import { MarketStrip } from './components/MarketStrip'
import { SiteSearch } from './components/SiteSearch'
import { TabBar } from './components/TabBar'
import { ThemeToggle } from './components/ThemeToggle'
import { correctionHref } from './lib/contact'
import { SOURCE_DATE } from './lib/data'
import { href, useRoute } from './lib/router'
import { Companies } from './pages/Companies'
import { Company } from './pages/Company'
import { Compare } from './pages/Compare'
import { Home } from './pages/Home'
import { IndexPage } from './pages/IndexPage'
import { Method } from './pages/Method'
import { NotFound } from './pages/NotFound'

function Page({ route }: { route: string[] }) {
  const [head, arg, sub] = route
  if (!head) return <Home />
  if (head === 'index' && arg) return <IndexPage id={arg} tab={sub} />
  if (head === 'company' && arg) return <Company key={arg} symbol={arg} tab={sub} />
  if (head === 'companies') return <Companies />
  if (head === 'compare') return <Compare tab={arg} focus={sub} />
  if (head === 'method') return <Method />
  return <NotFound />
}

const onConnection = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) }
}

const SECTION: Record<string, string> = { index: '', company: 'companies', companies: 'companies', compare: 'compare', method: 'method' }

export default function Root() {
  const route = useRoute()
  const section = SECTION[route[0] ?? ''] ?? ''
  const at = (name: string) => (section === name ? 'on' : undefined)
  const online = useSyncExternalStore(onConnection, () => navigator.onLine)
  const [announce, setAnnounce] = useState('')
  const first = useRef(true)
  const where = route.join('/')
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = window.setTimeout(() => {
      setAnnounce(document.title)
      const h1 = document.querySelector<HTMLElement>('main h1')
      if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }) }
    }, 60)
    return () => window.clearTimeout(t)
  }, [where])
  return (
    <>
      <a className="skip-link" href="#content" onClick={(e) => { e.preventDefault(); document.getElementById('content')?.focus() }}>Skip to content</a>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>
      <header className="site-header">
        <div className="wrap header-row">
          <a className="brand" href={href('')} aria-label="Nivel by The Equal Lens, home">
            <img src={mark} alt="" width="276" height="317" />
            <span className="brand-text"><span className="brand-name">Nivel</span><span className="brand-by">by The Equal Lens</span></span>
          </a>
          <nav className="nav" aria-label="Main">
            <a href={href('')} className={at('')}>Indexes</a>
            <a href={href('companies')} className={at('companies')}>Companies</a>
            <a href={href('compare')} className={at('compare')}>Compare</a>
            <a href={href('method')} className={at('method')}>Method</a>
          </nav>
          <div className="header-actions">
            <SiteSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {!online && <p className="offline-bar" role="status">Offline. Showing data collected {SOURCE_DATE}.</p>}
      <MarketStrip current={route[0] === 'index' ? route[1] : undefined} />
      <main id="content" tabIndex={-1} className="wrap">
        <ErrorBoundary key={where}><Page route={route} /></ErrorBoundary>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <img src={mark} alt="" width="276" height="317" />
          <span>Built with The Equal Lens from companies' own legally required gender pay disclosures, collected {SOURCE_DATE}. Not investment advice.</span>
          <span className="footer-links"><a className="go" href={correctionHref()}>Report a correction</a><InstallLink /></span>
        </div>
      </footer>
      <TabBar section={section} />
      <InstallPrompt />
    </>
  )
}
