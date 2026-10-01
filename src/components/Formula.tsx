import type { ReactNode } from 'react'

export function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="frac">
      <span className="frac-top">{top}</span>
      <span className="frac-bot">{bottom}</span>
    </span>
  )
}

export function Eq({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="eq">
      {label && <span className="eq-label">{label}</span>}
      <span className="eq-body">{children}</span>
    </div>
  )
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="steps">{children}</ol>
}

export function Step({ n, title, children, result, resultLabel }: {
  n: number | string
  title: string
  children: ReactNode
  result?: ReactNode
  resultLabel?: string
}) {
  return (
    <li className="step">
      <span className="step-n" aria-hidden="true">{n}</span>
      <div className="step-body">
        <h3>{title}</h3>
        {children}
      </div>
      {result != null && (
        <div className="step-result">
          {resultLabel && <span className="step-result-label">{resultLabel}</span>}
          <span className="step-result-value">{result}</span>
        </div>
      )}
    </li>
  )
}
