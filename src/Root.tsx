import logo from './assets/logo.svg'
import { SOURCE_DATE } from './lib/data'
import { href, useRoute } from './lib/router'
import { Companies } from './pages/Companies'
import { CompanyPage } from './pages/CompanyPage'
import { Home } from './pages/Home'
import { IndexPage } from './pages/IndexPage'
import { Method } from './pages/Method'
import { NotFound } from './pages/NotFound'

function Page({ route }: { route: string[] }) {
  const [head, arg] = route
  if (!head) return <Home />
  if (head === 'index' && arg) return <IndexPage id={arg} />
  if (head === 'company' && arg) return <CompanyPage symbol={arg} />
  if (head === 'companies') return <Companies />
  if (head === 'method') return <Method />
  return <NotFound />
}

export default function Root() {
  const route = useRoute()
  const at = (name: string) => (route[0] ?? '') === name || (name === '' && route[0] === 'index') ? 'on' : undefined
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href={href('')}><img src={logo} alt="The Equal Lens" />Parity Tracker</a>
          <nav className="nav" aria-label="Main">
            <a href={href('')} className={at('')}>Indexes</a>
            <a href={href('companies')} className={route[0] === 'company' ? 'on' : at('companies')}>Companies</a>
            <a href={href('method')} className={at('method')}>Method</a>
          </nav>
        </div>
      </header>
      <main className="wrap">
        <Page route={route} />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <img src={logo} alt="" />
          <span>Built with The Equal Lens. Data from company BRSR filings via NSE, collected {SOURCE_DATE}. Not investment advice.</span>
        </div>
      </footer>
    </>
  )
}
