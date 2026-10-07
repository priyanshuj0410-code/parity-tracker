import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Dropdown } from '../components/Dropdown'
import { EmptyState } from '../components/EmptyState'
import { AccountStep } from '../components/Join'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
import { ApiError, adminAction, adminConsole, figure, fmt, istDate, istTime, outOf100, problem, signOut, type AdminMarket, type Proposal, type Side } from '../lib/markets'
import { usePageTitle } from '../lib/router'
import { useAccount } from '../lib/useAccount'

const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10)

// Needs the owner's attention first: overdue, then a settlement ready to confirm, then closed, then a schedule check.
const rank = (m: AdminMarket) =>
  m.status !== 'open' && m.status !== 'resolving' ? 5 : m.overdue ? 0 : m.closed && m.settlement ? 1 : m.closed ? 2 : m.checkDue ? 3 : 4

/**
 * The owner's console (`/console`, ADMIN_EMAILS only). Claude proposes the week's markets on Saturday; the owner
 * approves or rejects each, and approved markets open at 21:00 IST on Sunday (decision 0018). Below, every market with
 * its flags and any settlement Claude prepared, plus schedule check, resolve and void. There is no free create.
 */
export function ConsolePage() {
  usePageTitle('Markets console')
  const acct = useAccount()
  const [markets, setMarkets] = useState<AdminMarket[] | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    adminConsole().then((r) => {
      setError(null)
      setMarkets([...r.markets].sort((a, b) => rank(a) - rank(b)))
      setProposals(r.proposals)
    }, (err) => setError(problem(err)))
  }, [])
  useEffect(() => { if (acct.account) load() }, [acct.account, load])

  const body = (): ReactNode => {
    if (!acct.config || acct.account === undefined) return <Skeleton line label="Loading the console" />
    if (!acct.config.configured) return <EmptyState art="data" title="Markets are not set up">Set MARKETS_DATABASE_URL, NEON_AUTH_BASE_URL and ADMIN_EMAILS in Vercel, then redeploy.</EmptyState>
    if (!acct.account) return <div className="card join"><AccountStep onSignedIn={() => acct.refresh()} /></div>
    if (error) {
      return (
        <div className="card">
          <p className="form-error" role="alert">{error}</p>
          <div className="actions-row">
            <button type="button" className="btn-quiet" onClick={load}>Try again</button>
            <button type="button" className="btn-link" onClick={async () => { await signOut(); await acct.refresh() }}>Sign out</button>
          </div>
        </div>
      )
    }
    if (!markets) return <Skeleton line label="Loading markets" />
    const waiting = proposals.filter((p) => p.status === 'proposed')
    const decided = proposals.filter((p) => p.status !== 'proposed')
    return <>
      <section>
        <div className="section-head"><h2>Proposals</h2><span className="meta">Claude proposes each Saturday by 09:00 IST · approved markets open Sunday 21:00 IST</span></div>
        {waiting.length === 0 ? <p className="small">No proposals waiting. The next arrive on Saturday morning.</p> : (
          <ul className="admin-list">{waiting.map((p) => <ProposalRow key={p.id} p={p} onChange={load} />)}</ul>
        )}
        {decided.length > 0 && (
          <details className="decided">
            <summary>Decided in the last 14 days ({decided.length})</summary>
            <ul className="admin-list">{decided.map((p) => <ProposalRow key={p.id} p={p} onChange={load} />)}</ul>
          </details>
        )}
      </section>
      <section>
        <div className="section-head"><h2>Markets</h2><span className="meta">{markets.length} in all · {acct.config.enabled ? 'markets are on' : 'markets are off: players see none'}</span></div>
        {markets.length === 0 ? <p className="small">No markets yet. They open from approved proposals.</p> : (
          <ul className="admin-list">{markets.map((m) => <AdminRow key={m.id} m={m} onChange={load} />)}</ul>
        )}
      </section>
    </>
  }

  return (
    <>
      <section className="page-head">
        <h1>Markets console</h1>
        <p className="meta">Owner only. Every action is logged, and players see you as "the owner".{acct.account && <> Signed in as {acct.account.email}.</>}</p>
      </section>
      {body()}
    </>
  )
}

const STATUS: Record<AdminMarket['status'], string> = { draft: 'Draft', open: 'Open', resolving: 'Resolving', resolved: 'Resolved', void: 'Voided' }

function AdminRow({ m, onChange }: { m: AdminMarket; onChange: () => void }) {
  const [open, setOpen] = useState<'check' | 'resolve' | 'void' | null>(null)
  const d = m.details
  const live = m.status === 'open' || m.status === 'resolving'
  return (
    <li className="card admin-row">
      <div className="admin-top">
        <a className="admin-q" href={`/market?id=${m.id}`}>{m.question}</a>
        <span className="flags">
          <span className="badge">{live && m.upcoming && d ? `Opens ${istTime(d.opensAt)}` : live && m.closed ? 'Trading closed' : STATUS[m.status]}{m.outcome ? `: ${m.outcome}` : ''}</span>
          {live && m.closed && m.settlement && <span className="badge warn">Ready to settle</span>}
          {m.checkDue && <span className="badge warn">Check due</span>}
          {m.overdue && <span className="badge bad">Overdue</span>}
        </span>
      </div>
      <p className="small muted admin-meta">
        <code>{m.subject}</code> · Yes {outOf100(m.priceYes)} out of 100 · {m.holders} {m.holders === 1 ? 'holder' : 'holders'} · {m.trades} {m.trades === 1 ? 'trade' : 'trades'}
        {d && <> · closes {istTime(d.closesAt)} · release due {istDate(d.scheduledDate)}</>}
      </p>
      {live && m.settlement && (
        <p className="small settlement">
          Prepared: {m.settlement.figure !== null && d ? figure(d, m.settlement.figure) : `release ${m.settlement.releaseId}`}
          {m.settlement.outcome && <> against at least {d ? figure(d, d.threshold) : ''} gives <strong>{m.settlement.outcome}</strong></>}
          {' · '}<a href={m.settlement.sourceUrl}>{m.settlement.releaseName}</a>
          {m.settlement.note && <> · {m.settlement.note}</>}
        </p>
      )}
      {live && d && (
        <div className="actions-row">
          <button type="button" className="btn-quiet" aria-expanded={open === 'check'} onClick={() => setOpen(open === 'check' ? null : 'check')}>Schedule check</button>
          <button type="button" className="btn-quiet" aria-expanded={open === 'resolve'} disabled={!m.closed} onClick={() => setOpen(open === 'resolve' ? null : 'resolve')}>Resolve</button>
          <button type="button" className="btn-quiet" aria-expanded={open === 'void'} onClick={() => setOpen(open === 'void' ? null : 'void')}>Void</button>
          {!m.closed && <span className="small muted">Resolve opens when trading closes.</span>}
        </div>
      )}
      {open === 'check' && <CheckForm id={m.id} onDone={onChange} />}
      {open === 'resolve' && d && <ResolveForm key={m.settlement ? 'prepared' : 'blank'} m={m} onDone={onChange} />}
      {open === 'void' && <VoidForm id={m.id} onDone={onChange} />}
    </li>
  )
}

/** Runs one console action, showing the outcome or the error under the form. */
function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const run = async (body: Record<string, unknown>, ok: string, onError?: (err: ApiError) => boolean) => {
    setBusy(true)
    setNote(null)
    try {
      await adminAction(body)
      setNote({ ok: true, text: ok })
      onDone()
    } catch (err) {
      if (!(err instanceof ApiError && onError?.(err))) setNote({ ok: false, text: problem(err) })
    } finally {
      setBusy(false)
    }
  }
  const out = note && <p className={note.ok ? 'small' : 'form-error'} role={note.ok ? 'status' : 'alert'}>{note.text}</p>
  return { busy, run, out }
}

function CheckForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [readOn, setReadOn] = useState(today())
  const [revised, setRevised] = useState('')
  const { busy, run, out } = useAction(onDone)
  return (
    <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void run({ action: 'schedule-check', marketId: id, readOn, ...(revised ? { revisedDate: revised } : {}) }, 'Schedule check logged.') }}>
      <div className="fields two">
        <label>Read the schedule on<input type="date" required value={readOn} onChange={(e) => setReadOn(e.target.value)} /></label>
        <label>Revised release date, if it moved<input type="date" value={revised} onChange={(e) => setRevised(e.target.value)} /></label>
      </div>
      <p className="small muted">A revised date is logged. It never extends the 30-day grace period.</p>
      <button type="submit" className="btn-primary" disabled={busy}>Log the check</button>
      {out}
    </form>
  )
}

function ResolveForm({ m, onDone }: { m: AdminMarket; onDone: () => void }) {
  const d = m.details!
  const nivel = d.template === 'nivel-data'
  // Starts from the settlement Claude prepared, if any; the owner checks it and confirms.
  const s = m.settlement
  const [outcome, setOutcome] = useState<Side>(s?.outcome ?? 'yes')
  const [value, setValue] = useState(s ? (nivel ? (s.releaseId ?? '') : s.figure !== null ? String(s.figure) : '') : '')
  const [sourceUrl, setSourceUrl] = useState(s?.sourceUrl ?? '')
  const [releaseName, setReleaseName] = useState(s?.releaseName ?? d.releaseName)
  const [mismatch, setMismatch] = useState<{ figure: number; outcome: Side } | null>(null)
  const { busy, run, out } = useAction(onDone)
  const send = (o: Side) => run(
    { action: 'resolve', marketId: m.id, outcome: o, sourceUrl, releaseName, ...(nivel ? { releaseId: value.trim() } : { figure: Number(value) }) },
    `Resolved ${o}. Winning shares paid.`,
    (err) => {
      if (err.code !== 'outcome_mismatch') return false
      setMismatch({ figure: Number(err.body.figure), outcome: err.body.outcome as Side })
      return true
    },
  )
  const submit = (e: FormEvent) => { e.preventDefault(); setMismatch(null); void send(outcome) }
  return (
    <form className="admin-form" onSubmit={submit}>
      <Segmented label="Outcome" value={outcome} onChange={setOutcome} options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]} />
      <div className="fields two">
        {nivel
          ? <label>Release id<input required pattern="\d{8}-\d{6}" placeholder="20271029-100000" value={value} onChange={(e) => setValue(e.target.value)} /><span className="hint">The figure is read from this release, never typed.</span></label>
          : <label>Figure, as published<input type="number" step="any" required value={value} onChange={(e) => setValue(e.target.value)} /><span className="hint">Threshold: at least {figure(d, d.threshold)}</span></label>}
        <label>Release link<input type="url" required pattern="https://.*" placeholder="https://" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></label>
        <label className="wide">Release name<input required maxLength={200} value={releaseName} onChange={(e) => setReleaseName(e.target.value)} /></label>
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>Resolve {outcome}</button>
      {mismatch && (
        <div className="confirm" role="alert">
          <p>The figure {figure(d, mismatch.figure)} against at least {figure(d, d.threshold)} gives <strong>{mismatch.outcome}</strong>, not {outcome}.</p>
          <div className="actions-row">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => { setOutcome(mismatch.outcome); setMismatch(null); void send(mismatch.outcome) }}>Resolve {mismatch.outcome}</button>
            <button type="button" className="btn-link" onClick={() => setMismatch(null)}>Cancel</button>
          </div>
        </div>
      )}
      {out}
    </form>
  )
}

const REASONS = [
  { id: 'overdue', label: 'Overdue: over 30 days late' },
  { id: 'cancelled', label: 'Cancelled publication' },
  { id: 'redefined', label: 'Definition changed' },
  { id: 'early', label: 'Released before closing' },
  { id: 'error', label: 'Error in the question' },
] as const

function VoidForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [reason, setReason] = useState<(typeof REASONS)[number]['id']>('overdue')
  const [note, setNote] = useState('')
  const { busy, run, out } = useAction(onDone)
  return (
    <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void run({ action: 'void', marketId: id, reason, ...(note.trim() ? { note: note.trim() } : {}) }, 'Voided. Every stake returned.') }}>
      <div className="fields">
        <div className="field"><span id={`reason-${id}`}>Reason</span><Dropdown label="Reason" value={reason} onChange={setReason} options={[...REASONS]} /></div>
        <label>Note for the log, optional<textarea maxLength={500} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      </div>
      <button type="submit" className="btn-danger" disabled={busy}>Void and return every stake</button>
      {out}
    </form>
  )
}

function ProposalRow({ p, onChange }: { p: Proposal; onChange: () => void }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const { busy, run, out } = useAction(onChange)
  const b = p.body
  const pct = (n: number) => `${fmt(n)}${b.template === 'norm' ? ' of every 100' : '%'}`
  return (
    <li className="card admin-row proposal">
      <div className="admin-top">
        <span className="admin-q">{b.question}</span>
        <span className="flags"><span className="badge">{p.status === 'proposed' ? 'Proposed' : p.status === 'approved' ? 'Approved' : 'Rejected'}</span></span>
      </div>
      <p className="small muted admin-meta">
        <code>{b.subject}</code> · at least {pct(b.threshold)} · {b.releaseName}, due {istDate(b.scheduledDate)} · opens {istTime(p.opensAt)} · settles by {istTime(p.settleBy)}
      </p>
      <p className="small">{p.rationale}</p>
      <details>
        <summary>Definition and sources</summary>
        <dl className="details small">
          <dt>Definition</dt><dd>{b.definition}</dd>
          <dt>Source</dt><dd><a href={b.source.url}>{b.source.name}</a></dd>
          <dt>Schedule</dt><dd><a href={b.scheduleDoc.url}>{b.scheduleDoc.name}</a>, read on {istDate(b.scheduleDoc.readOn)}</dd>
          <dt>Where it is printed</dt><dd>{b.resolutionLocation}</dd>
        </dl>
      </details>
      {p.status === 'rejected' && p.reason && <p className="small muted">Rejected: {p.reason}</p>}
      {p.status === 'proposed' && (
        <div className="actions-row">
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void run({ action: 'approve', proposalId: p.id }, `Approved. Opens ${istTime(p.opensAt)}.`)}>Approve</button>
          <button type="button" className="btn-quiet" aria-expanded={rejecting} onClick={() => setRejecting(!rejecting)}>Reject</button>
        </div>
      )}
      {rejecting && p.status === 'proposed' && (
        <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void run({ action: 'reject', proposalId: p.id, ...(reason.trim() ? { reason: reason.trim() } : {}) }, 'Rejected.') }}>
          <div className="fields">
            <label>Why (optional, helps next Saturday's proposals)<input maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>Reject proposal</button>
        </form>
      )}
      {out}
    </li>
  )
}
