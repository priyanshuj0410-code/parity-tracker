import { useEffect, useState } from 'react'
import { config, istTime, marketsOn, outOf100, tradingClosed, type Market } from '../lib/markets'

/**
 * An index's open forecast, if it has one (PARITY-44). Renders nothing while markets are off, not set up or
 * unreachable, so the page around it never changes.
 */
export function ForecastBlock({ subject }: { subject: string }) {
  const [m, setM] = useState<Market | null>(null)
  useEffect(() => {
    let gone = false
    config()
      .then((c) => (c.enabled ? marketsOn(subject) : []))
      .then((ms) => { if (!gone) setM(ms.find((x) => !tradingClosed(x)) ?? null) }, () => {})
    return () => { gone = true }
  }, [subject])
  if (!m?.details) return null
  return (
    <section>
      <a className="card forecast" href={`/market?id=${m.id}`}>
        <div className="tile-label">Forecast with Lumens</div>
        <p className="guess-q">{m.question}</p>
        <div className="forecast-row">
          <span className="tile-value">{outOf100(m.priceYes)}<span className="play-of"> out of 100 for yes</span></span>
          <span className="small muted">Closes {istTime(m.details.closesAt)}</span>
        </div>
        <span className="link-more">Open the forecast</span>
      </a>
    </section>
  )
}
