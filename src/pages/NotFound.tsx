import { href, usePageTitle } from '../lib/router'

export function NotFound() {
  usePageTitle('Page not found')
  return (
    <section>
      <h1>Page not found</h1>
      <p className="lead">This link does not match a company, index or page. It may have a typo, or the company may have left the index.</p>
      <p className="actions-row">
        <a className="go" href={href('companies')}>Find a company</a>
        <a className="go" href={href('')}>Go to indexes</a>
      </p>
    </section>
  )
}
