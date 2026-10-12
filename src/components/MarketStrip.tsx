import { useLayoutEffect, useRef } from 'react'
import { INDEX_ORDER, indexMarket, indexes, publishedChange, useStage } from '../lib/data'
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
          const key = `${m.prev}>${m.latest}`
          const pub = m.prev ? publishedChange(ix, key) : undefined
          const held = !!m.prev && ix.yoy[key]?.shown === false
          const ch = pub == null ? undefined : Math.abs(pub.change) < 0.0005 ? 0 : pub.change
          const tone = ch == null || ch === 0 || pub?.distinguishable === false ? 'flat' : ch > 0 ? 'up' : 'down'
          return (
            <a key={id} href={href('index', id)} className={`strip-item${current === id ? ' on' : ''}`}>
              <span className="strip-name">{ix.name}</span>
              <span className="strip-val">{pct(ix.years[m.latest].headline)}</span>
              {held && <span className="strip-chg held">Level only</span>}
              {ch != null && <span className={`strip-chg ${tone}`}>{ch > 0 ? '+' : ch < 0 ? '−' : ''}{Math.abs(ch * 100).toFixed(1)}</span>}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
