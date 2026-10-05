import { useEffect, useRef, useState } from 'react'
import type { SpotItem } from '../feeds/spot'
import { Guess } from '../components/Guess'
import { Skeleton } from '../components/Skeleton'
import { GAME, closeness, gameLink, loadFeed, todaysThree } from '../lib/play'
import { usePageTitle } from '../lib/router'

/** Three of the game's figures, played in place, then the way into the game (PARITY-53). Nothing is sent or kept. */
export function Play() {
  usePageTitle('Play')
  const [items, setItems] = useState<SpotItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [at, setAt] = useState(0)
  const [guess, setGuess] = useState<number | null>(null)
  const result = useRef<HTMLDivElement>(null)
  const load = () => loadFeed().then((all) => setItems(todaysThree(all)), () => setFailed(true))
  useEffect(() => { load() }, [])
  useEffect(() => { if (guess != null) result.current?.focus() }, [guess])

  const item = items?.[at]
  const next = () => { setGuess(null); setAt(at + 1) }
  return (
    <>
      <section className="page-head">
        <h1>Guess the figure</h1>
        <p className="meta">Three figures from companies' own filings, the same ones Spot the Stereotype plays. Guess, then see the answer.</p>
      </section>
      <section className="play">
        {failed ? (
          <div className="card"><p>The figures did not load.</p><button type="button" className="btn-quiet" onClick={() => { setFailed(false); load() }}>Try again</button></div>
        ) : !items ? (
          <div className="card"><Skeleton line label="Loading the figures" /></div>
        ) : item ? (
          <div className="card">
            <div className="tile-label">Figure {at + 1} of {items.length}</div>
            {guess == null ? <Guess key={item.id} question={item.question} onReveal={setGuess} /> : (
              <div className="play-answer" ref={result} tabIndex={-1} aria-live="polite">
                <p className="guess-q">{item.question}</p>
                <div className="tile-value hero">{item.answer}<span className="play-of"> out of 100</span></div>
                <p className="guess-result">You guessed {guess}. {closeness(guess, item.answer)}</p>
                <p className="small">{item.source.line} {item.source.rule}</p>
                <p className="small muted">{item.discussion}</p>
                <div className="guess-actions">
                  <button type="button" className="btn-primary" onClick={next}>{at + 1 < items.length ? 'Next figure' : 'Finish'}</button>
                  <a className="go" href={new URL(item.nivel.data).pathname}>See the figures</a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="tile-label">Keep playing</div>
            <p>Spot the Stereotype's workplace set plays these figures and more.</p>
            <div className="guess-actions">
              <a className="btn-primary" href={gameLink(items.at(-1)?.id)}>Play the workplace set</a>
              <a className="go" href={GAME}>Host a game night</a>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
