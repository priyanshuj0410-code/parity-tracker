import mark from './assets/nivel-mark.svg'
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { InstallLink, InstallPrompt } from './components/InstallPrompt'
import { MarketStrip } from './components/MarketStrip'
import { PageSkeleton, StripSkeleton } from './components/Skeleton'
import { SiteSearch } from './components/SiteSearch'
import { TabBar } from './components/TabBar'
import { ThemeToggle } from './components/ThemeToggle'
import { correctionHref } from './lib/contact'
import { sourceDate, useLoaded } from './lib/data'
import { href, useRoute } from './lib/router'
import { Companies } from './pages/Companies'
import { Company } from './pages/Company'
import { Compare } from './pages/Compare'
import { Home } from './pages/Home'
import { IndexPage } from './pages/IndexPage'
import { Method } from './pages/Method'
import { NotFound } from './pages/NotFound'
import { SimulationPage } from './pages/SimulationPage'

function Page({ route }: { route: string[] }) {
  const [head, arg, sub] = route
  if (!head) return <Home />
  if (head === 'index' && arg) return <IndexPage id={arg} tab={sub} />
  if (head === 'simulation' && arg) return <SimulationPage id={arg} />
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

const PAGED = new Set(['company', 'index', 'simulation'])
const SECTION: Record<string, string> ={ index: '', simulation: '', company: 'companies', companies: 'companies', compare: 'compare', method: 'method' }

export default function Root() {
  const route = useRoute()
  const section = SECTION[route[0] ?? ''] ?? ''
  const at = (name: string) => (section === name ? 'on' : undefined)
  const online = useSyncExternalStore(onConnection, () => navigator.onLine)
  useLoaded('core', false)
  const collected = sourceDate()
  const [announce, setAnnounce] = useState('')
  const first = useRef(true)
  const where = route.join('/')
  // The page without its section tab: switching tabs keeps the page mounted, so its head never flashes.
  const page = route.slice(0, PAGED.has(route[0] ?? '') ? 2 : 1).join('/')
  const lastPage = useRef(page)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const newPage = lastPage.current !== page
    lastPage.current = page
    const t = window.setTimeout(() => {
      setAnnounce(document.title)
      // A new page moves focus to its heading; a new tab leaves it on the tab the reader chose.
      const h1 = newPage && document.querySelector<HTMLElement>('main h1')
      if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }) }
    }, 60)
    return () => window.clearTimeout(t)
  }, [where, page])
  return (
    <>
      <a className="skip-link" href="#content" onClick={(e) => { e.preventDefault(); document.getElementById('content')?.focus() }}>Skip to content</a>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>
      <header className="site-header">
        <div className="wrap header-row">
          <a className="brand" href={href('')} aria-label="Nivel by The Equal Lens, home">
            <img src={mark} alt="" width="834" height="619" />
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
      {!online && <p className="offline-bar" role="status">{collected ? `Offline. Showing data collected ${collected}.` : 'Offline. Showing saved data.'}</p>}
      <ErrorBoundary quiet={null}><Suspense fallback={<StripSkeleton />}><MarketStrip current={route[0] === 'index' ? route[1] : undefined} /></Suspense></ErrorBoundary>
      <main id="content" tabIndex={-1} className="wrap">
        <ErrorBoundary key={page} resetKey={where}><Suspense fallback={<PageSkeleton />}><Page route={route} /></Suspense></ErrorBoundary>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <img src={mark} alt="" width="834" height="619" />
          <span>By The Equal Lens, from companies' own gender pay filings{collected && `, collected ${collected}`}. Not investment advice.</span>
          <span className="footer-links"><a className="go" href={correctionHref()}>Report a correction</a><InstallLink /></span>
        </div>
      </footer>
      <TabBar section={section} />
      <InstallPrompt />
    </>
  )
}
