import { useState } from 'react'
import logosJson from '../data/logos.json'
import { Monogram } from './Monogram'

const LOGOS = logosJson as Record<string, string>

export function Logo({ symbol, name, size = 30 }: { symbol: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const file = LOGOS[symbol]
  if (!file || failed) return <Monogram name={name} seed={symbol} size={size} />
  return (
    <img className="logo" src={`/logos/${file}`} alt="" width={size} height={size} loading="lazy" decoding="async"
      style={{ borderRadius: Math.round(size * 0.26) }} onError={() => setFailed(true)} />
  )
}
