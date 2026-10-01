import logoReversed from './assets/logo-reversed.svg'
import logo from './assets/logo.svg'
import { InstallButton } from './components/InstallButton'
import { MarketStrip } from './components/MarketStrip'
import { Search } from './components/Search'
import { TabBar } from './components/TabBar'
import { ThemeToggle } from './components/ThemeToggle'
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
  if (head === 'index' && arg) return <IndexPage id={arg} />
  if (head === 'company' && arg) return <Company key={arg} symbol={arg} tab={sub} />
  if (head === 'companies') return <Companies />
  if (head === 'compare') return <Compare tab={arg} focus={sub} />
  if (head === 'method') return <Method />
  return <NotFound />
}

const SECTION: Record<string, string> = { index: '', company: 'companies', companies: 'companies', compare: 'compare', method: 'method' }

export default function Root() {
  const route = useRoute()
  const section = SECTION[route[0] ?? ''] ?? ''
  const at = (name: string) => (section === name ? 'on' : undefined)
  return (
    <>
      <header className="site-header">
        <div className="wrap header-row">
          <a className="brand" href={href('')}><img className="logo-light" src={logo} alt="The Equal Lens" /><img className="logo-dark" src={logoReversed} alt="The Equal Lens" />Parity Tracker</a>
          <nav className="nav" aria-label="Main">
            <a href={href('')} className={at('')}>Indexes</a>
            <a href={href('companies')} className={at('companies')}>Companies</a>
            <a href={href('compare')} className={at('compare')}>Compare</a>
            <a href={href('method')} className={at('method')}>Method</a>
          </nav>
          <Search />
          <InstallButton />
          <ThemeToggle />
        </div>
      </header>
      <MarketStrip current={route[0] === 'index' ? route[1] : undefined} />
      <main className="wrap">
        <Page route={route} />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <img className="logo-light" src={logo} alt="" /><img className="logo-dark" src={logoReversed} alt="" />
          <span>Built with The Equal Lens. Data from companies' own legally required gender pay disclosures in India, the UK, Australia, Japan and the EU, collected {SOURCE_DATE}. Company logos are trademarks of their owners, shown only to identify them. Not investment advice.</span>
        </div>
      </footer>
      <TabBar section={section} />
    </>
  )
}
