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
          title={offline ? 'This page needs a connection to finish loading' : 'This page hit an error while loading'}
          actions={<><button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload the page</button><a className="go" href={href('')}>Go to indexes</a></>}>
          {offline ? 'Reconnect and reload. Pages you have already opened keep working offline.' : 'The figures are not affected. Reloading usually fixes it.'}
        </EmptyState>
      </section>
    )
  }
}
