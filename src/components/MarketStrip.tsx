import { useLayoutEffect, useRef } from 'react'
import { INDEX_ORDER, indexMarket, indexes, useStage } from '../lib/data'
import { revealInRow } from '../lib/reveal'
import { pct } from '../lib/format'
import { href } from '../lib/router'

export function MarketStrip({ current }: { current?: string }) {
  useStage('core')
  const row = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => revealInRow(row.current, '.strip-item.on', 32), [current])
  return (
    <nav className="strip" aria-label="Indexes">
      <div className="wrap strip-row" ref={row}>
        {INDEX_ORDER.map((id) => {
          const ix = indexes[id]
          const m = indexMarket(ix)
          const raw = m.prev ? ix.yoy[`${m.prev}>${m.latest}`]?.change : undefined
          const ch = raw == null ? undefined : Math.abs(raw) < 0.0005 ? 0 : raw
          const tone = ch == null || ch === 0 ? 'flat' : ch > 0 ? 'up' : 'down'
          return (
            <a key={id} href={href('index', id)} className={`strip-item${current === id ? ' on' : ''}`}>
              <span className="strip-name">{ix.name}</span>
              <span className="strip-val">{pct(ix.years[m.latest].headline)}</span>
              {ch != null && <span className={`strip-chg ${tone}`}>{ch > 0 ? '+' : ch < 0 ? '−' : ''}{Math.abs(ch * 100).toFixed(1)}</span>}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
