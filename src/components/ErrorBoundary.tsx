import { Component, type ReactNode } from 'react'
import { retryFailed } from '../lib/data'
import { href } from '../lib/router'
import { EmptyState } from './EmptyState'

/**
 * A page that throws, usually because its data did not arrive: says so, retries in place on Try again, and
 * retries by itself when the connection comes back. `quiet` renders a fallback instead, for parts like the
 * index strip that should never take the page down with them.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; quiet?: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  /** A new section of the same page (another tab) gets a fresh try without remounting the page. */
  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }

  retry = () => {
    retryFailed()
    this.setState({ failed: false })
  }

  componentDidMount() {
    window.addEventListener('online', this.retry)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.retry)
  }

  render() {
    if (!this.state.failed) return this.props.children
    if (this.props.quiet !== undefined) return this.props.quiet
    const offline = !navigator.onLine
    return (
      <section>
        <h1>{offline ? "You're offline" : 'Something went wrong'}</h1>
        <EmptyState art={offline ? 'offline' : 'error'}
          title={offline ? 'Connect to finish loading' : "This page didn't load"}
          actions={<><button type="button" className="btn-primary" onClick={this.retry}>Try again</button><a className="go" href={href('')}>Go to indexes</a></>}>
          {offline ? "It loads by itself when you're back online. Pages you've opened still work offline." : 'The figures are fine. Try again, or reload the page.'}
        </EmptyState>
      </section>
    )
  }
}
