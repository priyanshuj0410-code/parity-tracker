import { Component, type ReactNode } from 'react'
import { href } from '../lib/router'
import { EmptyState } from './EmptyState'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const offline = !navigator.onLine
    return (
      <section>
        <h1>{offline ? "You're offline" : 'Something went wrong'}</h1>
        <EmptyState art={offline ? 'offline' : 'error'}
          title={offline ? 'Connect to finish loading' : "This page didn't load"}
          actions={<><button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload the page</button><a className="go" href={href('')}>Go to indexes</a></>}>
          {offline ? "Reconnect and reload. Pages you've opened still work offline." : 'The figures are fine. Reload to try again.'}
        </EmptyState>
      </section>
    )
  }
}
