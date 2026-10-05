import { useState, type ReactNode } from 'react'
import { closeness, gameLink, markGuessFirst, metGuessFirst } from '../lib/play'
import { Guess } from './Guess'

/** The Indian indexes whose Overview asks before it shows (PARITY-53). */
export const GUESS_FIRST = new Set(['nifty50', 'sensex', 'niftynext50'])

/**
 * Guess first: an index's headline card waits for a guess or a skip, once per device; a returning reader sees the
 * number straight away. `answer` is the headline out of 100; `item` the Spot feed's id for the same figure, if any.
 */
export function GuessFirst({ name, answer, item, children }: { name: string; answer: number; item?: string; children: ReactNode }) {
  const [asking, setAsking] = useState(() => !metGuessFirst())
  const [guess, setGuess] = useState<number | null>(null)
  const done = (g: number | null) => { markGuessFirst(); setGuess(g); setAsking(false) }
  if (asking) return (
    <div className="card">
      <div className="tile-label">Guess first</div>
      <Guess question={`Out of every ₹100 of payroll the ${name} holds, how much goes to women?`} onReveal={done} onSkip={() => done(null)} />
    </div>
  )
  return (
    <div className="card">
      {children}
      {guess != null && (
        <p className="guess-result" role="status">
          You guessed ₹{guess}. {closeness(guess, answer, (n) => `₹${n}`)} <a className="go" href={gameLink(item)}>Play the workplace set</a>
        </p>
      )}
    </div>
  )
}
