import type { ReactNode } from 'react'

export function Frac({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <span className="frac">
      <span className="frac-top">{top}</span>
      <span className="frac-bot">{bottom}</span>
    </span>
  )
}

export function Eq({ label, lhs, steps, answer = true }: { label?: string; lhs?: ReactNode; steps: ReactNode[]; answer?: boolean }) {
  return (
    <div className="eq">
      {label && <span className="eq-label">{label}</span>}
      <div className="eq-body">
        {lhs != null && <span className="eq-lhs">{lhs}</span>}
        {steps.map((step, i) => (
          <span key={i} className={answer && i === steps.length - 1 ? 'eq-step ans' : 'eq-step'}>
            {(lhs != null || i > 0) && <span className="op">=</span>}
            {step}
          </span>
        ))}
      </div>
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
      <div className="step-head">
        <span className="step-n" aria-hidden="true">{n}</span>
        <h3>{title}</h3>
        {result != null && (
          <div className="step-result">
            <span className="step-result-value">{result}</span>
            {resultLabel && <span className="step-result-label">{resultLabel}</span>}
          </div>
        )}
      </div>
      <div className="step-body">{children}</div>
    </li>
  )
}
