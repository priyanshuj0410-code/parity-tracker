/**
 * Playing Nivel's figures (PARITY-53): guess first, then the game. Nothing leaves the device: no analytics, no server
 * writes; the only thing kept is whether this reader has met Guess first, so a returning reader always sees the number.
 */
import type { SpotItem } from '../feeds/spot'

/** Spot the Stereotype's anytime workplace set. `item` is the figure just guessed here, so the set starts after it. */
export const GAME = 'https://stereotype.vercel.app'
export const gameLink = (item?: string) => `${GAME}/?play=work&from=nivel${item ? `&item=${encodeURIComponent(item)}` : ''}`

const points = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`
/** How close a guess was, in words: no score, rank or streak. `unit` writes the distance, as rupees or points. */
export function closeness(guess: number, answer: number, unit = points): string {
  const off = Math.abs(guess - answer)
  return off === 0 ? 'Spot on.' : `${unit(off)} ${guess > answer ? 'too high' : 'too low'}.`
}

const MET = 'nivel-guess-first'
/** True once this device has guessed or skipped; also true when storage is closed, so the number is never hidden twice. */
export const metGuessFirst = () => { try { return localStorage.getItem(MET) === '1' } catch { return true } }
export const markGuessFirst = () => { try { localStorage.setItem(MET, '1') } catch { /* private mode: nothing to keep */ } }

/** Three current figures, the same for everyone on a given day and spread across the feed, which runs market by market. */
export function todaysThree(items: SpotItem[], day = Math.floor(Date.now() / 86_400_000)): SpotItem[] {
  const live = items.filter((i) => i.nivel.status === 'current')
  if (live.length <= 3) return live
  const step = Math.floor(live.length / 3)
  return [0, 1, 2].map((k) => live[(day + k * step) % live.length])
}

export async function loadFeed(): Promise<SpotItem[]> {
  const res = await fetch('/feeds/spot/v1.json')
  if (!res.ok) throw new Error(`The figures did not load (${res.status})`)
  return (await res.json()).items
}
