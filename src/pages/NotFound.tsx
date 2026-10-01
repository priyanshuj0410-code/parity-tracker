import { href } from '../lib/router'

export function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <p><a href={href('')}>Back to indexes</a></p>
    </section>
  )
}
