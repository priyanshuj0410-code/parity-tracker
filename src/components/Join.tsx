import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import { ApiError, ageOn, problem, recordAge, signIn, signOut, type Account } from '../lib/markets'
import { GRIEVANCE_EMAIL } from '../lib/contact'
import { href } from '../lib/router'
import { Segmented } from './Segmented'

type Step = 'birth' | 'account' | 'signin' | 'refused'

/**
 * Age before account (safeguarding review, section 3): the date of birth comes first and stays in memory. Under 18,
 * nothing is kept and no account is offered. Otherwise the reader signs in or creates an account, and the server
 * records the year. The screen never says what age passes.
 */
export function Join({ account, onDone }: { account: Account | null; onDone: () => void }) {
  const [step, setStep] = useState<Step>('birth')
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const head = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    head.current?.focus()
  }, [step])

  const refuse = async () => {
    setBirthDate(null)
    if (account) await signOut()
    setStep('refused')
  }
  // Signed in already (an account made before this step): record the age straight away.
  const adultWith = async (date: string) => {
    if (!account) { setBirthDate(date); setStep('account'); return }
    try {
      await recordAge(date)
      onDone()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'under_18') return refuse()
      throw err
    }
  }

  return (
    <div className="card join">
      {step === 'birth' && <BirthStep head={head} signedIn={!!account} onAdult={adultWith} onMinor={refuse} onSignIn={() => setStep('signin')} />}
      {step === 'account' && birthDate && (
        <AccountStep head={head} create onBack={() => { setBirthDate(null); setStep('birth') }} onSignedIn={async () => {
          try {
            await recordAge(birthDate)
          } catch (err) {
            if (err instanceof ApiError && err.code === 'under_18') return refuse()
            throw err
          } finally {
            setBirthDate(null)
          }
          onDone()
        }} />
      )}
      {step === 'signin' && <AccountStep head={head} onBack={() => setStep('birth')} onSignedIn={async () => onDone()} />}
      {step === 'refused' && (
        <div role="status">
          <h2 ref={head} tabIndex={-1}>Markets are for adults</h2>
          <p>Nothing you entered was kept.</p>
          {account && <p className="small">To delete your sign-in, write to the grievance contact{GRIEVANCE_EMAIL ? <>: <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a></> : ', named here before markets open'}.</p>}
          {/* No link to /play: Spot the Stereotype is for adults too. */}
          <div className="actions-row">
            <a className="go" href={href('')}>Go to indexes</a>
          </div>
        </div>
      )}
    </div>
  )
}

function BirthStep({ head, signedIn, onAdult, onMinor, onSignIn }: {
  head: RefObject<HTMLHeadingElement | null>
  signedIn: boolean
  onAdult: (date: string) => Promise<void>
  onMinor: () => void
  onSignIn: () => void
}) {
  const id = useId()
  const [d, setD] = useState('')
  const [m, setM] = useState('')
  const [y, setY] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const [dd, mm, yy] = [Number(d), Number(m), Number(y)]
    const age = /^\d{1,2}$/.test(d) && /^\d{1,2}$/.test(m) && /^\d{4}$/.test(y) ? ageOn(yy, mm, dd) : null
    if (age === null) { setError('Enter a real date of birth, for example 27 3 1994.'); return }
    setError(null)
    if (age < 18) { onMinor(); return }
    setBusy(true)
    try {
      await onAdult(`${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`)
    } catch (err) {
      setError(problem(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <h2 ref={head} tabIndex={-1}>Your date of birth</h2>
      <p className="small">{signedIn ? 'We need it before you forecast.' : 'We check it before you make an account.'} Only the year is kept.</p>
      <fieldset className="dob" aria-describedby={error ? `${id}-err` : undefined}>
        <legend className="sr-only">Date of birth</legend>
        <label>Day<input inputMode="numeric" autoComplete="bday-day" maxLength={2} value={d} onChange={(e) => setD(e.target.value.trim())} aria-invalid={!!error} /></label>
        <label>Month<input inputMode="numeric" autoComplete="bday-month" maxLength={2} value={m} onChange={(e) => setM(e.target.value.trim())} aria-invalid={!!error} /></label>
        <label className="year">Year<input inputMode="numeric" autoComplete="bday-year" maxLength={4} value={y} onChange={(e) => setY(e.target.value.trim())} aria-invalid={!!error} /></label>
      </fieldset>
      {error && <p className="form-error" id={`${id}-err`} role="alert">{error}</p>}
      <div className="actions-row">
        <button type="submit" className="btn-primary" disabled={busy}>Continue</button>
        {!signedIn && <button type="button" className="btn-link" onClick={onSignIn}>I have an account</button>}
      </div>
    </form>
  )
}

export function AccountStep({ head, create = false, onBack, onSignedIn }: {
  head?: RefObject<HTMLHeadingElement | null>
  create?: boolean
  onBack?: () => void
  onSignedIn: () => Promise<void>
}) {
  const [mode, setMode] = useState<'create' | 'signin'>(create ? 'create' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password, mode === 'create')
      await onSignedIn()
    } catch (err) {
      setError(err instanceof ApiError ? problem(err) : (err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit}>
      <h2 ref={head} tabIndex={-1}>{mode === 'create' ? 'Make your account' : 'Sign in'}</h2>
      {create && <Segmented label="Account" value={mode} onChange={setMode} options={[{ id: 'create', label: 'New account' }, { id: 'signin', label: 'I have one' }]} />}
      {mode === 'create' && (
        <details className="explain privacy" open>
          <summary>What Nivel keeps</summary>
          <ul className="tight small">
            <li>Your email and password, to sign you in.</li>
            <li>The year you were born. Never the full date.</li>
            <li>Your Feathers, trades and positions.</li>
            <li>Delete it all from Your Feathers at any time. Questions or complaints go to the grievance contact, then the Data Protection Board of India.</li>
          </ul>
        </details>
      )}
      <div className="fields">
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions-row">
        <button type="submit" className="btn-primary" disabled={busy}>{mode === 'create' ? 'Make account' : 'Sign in'}</button>
        {onBack && <button type="button" className="btn-link" onClick={onBack}>Back</button>}
      </div>
    </form>
  )
}
