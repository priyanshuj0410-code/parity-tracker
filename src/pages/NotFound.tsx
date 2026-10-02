import { EmptyState } from '../components/EmptyState'
import { href, usePageTitle } from '../lib/router'

export function NotFound() {
  usePageTitle('Page not found')
  return (
    <section>
      <h1>Page not found</h1>
      <EmptyState art="notFound" title="This link does not match a company, index or page"
        actions={<><a className="go" href={href('companies')}>Find a company</a><a className="go" href={href('')}>Go to indexes</a></>}>
        It may have a typo, or the company may have left the index.
      </EmptyState>
    </section>
  )
}
