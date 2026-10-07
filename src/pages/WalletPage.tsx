import { useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Join } from '../components/Join'
import { Skeleton } from '../components/Skeleton'
import { GRIEVANCE_EMAIL } from '../lib/contact'
import { claim, fmt, forget, problem, signOut } from '../lib/markets'
import { href, usePageTitle } from '../lib/router'
import { useAccount } from '../lib/useAccount'

/** Your Lumens (`/wallet`): balance, streak and the daily claim, then deleting your markets data. */
export function WalletPage() {
  usePageTitle('Your Lumens')
  const acct = useAccount()
  const { config, account, wallet } = acct
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const claimToday = async () => {
    setBusy(true)
    try {
      const w = await claim()
      acct.setWallet(w)
      setNote(w.claimed ? `${fmt(w.awarded ?? 0)} Lumens added. Day ${w.streak} of your streak.` : 'Already claimed today.')
    } catch (err) {
      setNote(problem(err))
    } finally {
      setBusy(false)
    }
  }

  const loading = !config || account === undefined
  return (
    <>
      <section className="page-head">
        <h1>Your Lumens</h1>
        <p className="meta">Play money for Nivel's forecasts.</p>
      </section>
      {loading ? <section><Skeleton line label="Loading your Lumens" /></section>
        : !config.configured || (!config.enabled && !account) ? (
          <section><EmptyState art="data" title="Markets are not open yet" actions={<a className="go" href={href('')}>Go to indexes</a>}>Every figure on Nivel stays open to all.</EmptyState></section>
        ) : <>
          {config.enabled && (
            <section>
              {wallet ? <>
                <div className="grid g3">
                  <div className="card"><div className="tile-label">Balance</div><div className="tile-value">{fmt(wallet.balance)}</div><p className="tile-context">Lumens</p></div>
                  <div className="card"><div className="tile-label">Streak</div><div className="tile-value">{wallet.streak}</div><p className="tile-context">{wallet.streak === 1 ? 'day' : 'days'} in a row</p></div>
                  <div className="card">
                    <div className="tile-label">Today</div>
                    {wallet.dailyClaimable
                      ? <><p className="tile-context">50 Lumens, plus 10 for each day of your streak, up to 100.</p><button type="button" className="btn-primary" disabled={busy} onClick={claimToday}>Claim today's Lumens</button></>
                      : <p className="tile-context">Claimed. The next claim opens at midnight IST.</p>}
                    <p className="small" role="status">{note}</p>
                  </div>
                </div>
                <p className="small muted">{fmt(wallet.lifetimeEarned)} Lumens earned in all.</p>
              </> : <Join key={account?.id ?? 'out'} account={account} onDone={() => void acct.refresh()} />}
              <div className="callout play-money">
                <p><strong>Lumens are play money.</strong> You earn them by visiting and forecasting. You never buy them, never cash them out, and they win no prizes.</p>
              </div>
            </section>
          )}
          {!config.enabled && <section><EmptyState art="data" title="Markets are not open yet">You can still delete your markets data below.</EmptyState></section>}
          {account && <Forget onDone={() => void acct.refresh()} />}
        </>}
    </>
  )
}

function Forget({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      await forget()
      await signOut()
      setStep('done')
    } catch (err) {
      setError(problem(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section id="delete">
      <h2>Delete my data</h2>
      <p>Deletes your adult record, Lumens, trades and positions at once. Prices keep the effect of past trades, with no link to you.</p>
      <p>Your sign-in itself is deleted by the owner on request. Write to the grievance contact{GRIEVANCE_EMAIL ? <>: <a href={`mailto:${GRIEVANCE_EMAIL}?subject=${encodeURIComponent('Nivel markets: delete my sign-in')}`}>{GRIEVANCE_EMAIL}</a></> : ', named here before markets open'}.</p>
      {step === 'idle' && <button type="button" className="btn-quiet danger" onClick={() => setStep('confirm')}>Delete my data</button>}
      {step === 'confirm' && (
        <div className="confirm" role="group" aria-label="Confirm deletion">
          <p><strong>This cannot be undone.</strong></p>
          <div className="actions-row">
            <button type="button" className="btn-danger" disabled={busy} onClick={go}>Delete everything</button>
            <button type="button" className="btn-link" onClick={() => setStep('idle')}>Cancel</button>
          </div>
        </div>
      )}
      {step === 'done' && (
        <p role="status"><strong>Deleted.</strong> You are signed out. <button type="button" className="btn-link" onClick={onDone}>Done</button></p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
