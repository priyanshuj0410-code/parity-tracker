import { useEffect, useId, useState } from 'react'

/**
 * A guess out of 100 on a slider, before a figure is shown (PARITY-53). The parent shows the answer; `onSkip` adds a
 * Skip button. While it is open, the index strip hides the current index's value, so the answer is not in view.
 */
export function Guess({ question, onReveal, onSkip }: { question: string; onReveal: (guess: number) => void; onSkip?: () => void }) {
  const id = useId()
  const [guess, setGuess] = useState(50)
  useEffect(() => {
    document.documentElement.dataset.guess = ''
    return () => { delete document.documentElement.dataset.guess }
  }, [])
  return (
    <div className="guess">
      <p className="guess-q" id={`${id}q`}>{question}</p>
      <div className="guess-row">
        <input id={`${id}in`} type="range" min={0} max={100} step={1} value={guess} onChange={(e) => setGuess(Number(e.target.value))}
          aria-labelledby={`${id}q`} aria-valuetext={`${guess} out of 100`} />
        <output className="guess-value" htmlFor={`${id}in`}>{guess}</output>
      </div>
      <div className="guess-scale" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
      <div className="guess-actions">
        <button type="button" className="btn-primary" onClick={() => onReveal(guess)}>Reveal</button>
        {onSkip && <button type="button" className="btn-quiet" onClick={onSkip}>Skip</button>}
      </div>
    </div>
  )
}
