import { useState } from 'react'
import { logoFiles, release } from '../lib/data'
import { Monogram } from './Monogram'

/** A company's logo from the release in use (cached for good, as releases never change), else its monogram. */
export function Logo({ symbol, name, size = 30 }: { symbol: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const file = logoFiles[symbol]
  if (!file || failed || !release.id) return <Monogram name={name} seed={symbol} size={size} />
  return (
    <img className="logo" src={`/data/r/${release.id}/logos/${file}`} alt="" width={size} height={size} loading="lazy" decoding="async"
      style={{ borderRadius: Math.round(size * 0.26) }} onError={() => setFailed(true)} />
  )
}
