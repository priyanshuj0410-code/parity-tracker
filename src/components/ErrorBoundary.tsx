import { Component, type ReactNode } from 'react'
import { href } from '../lib/router'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <section>
        <h1>Something went wrong</h1>
        <p className="lead">This page hit an error while loading. The figures are not affected.</p>
        <p className="actions-row">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload the page</button>
          <a href={href('')}>Go to indexes</a>
        </p>
      </section>
    )
  }
}
