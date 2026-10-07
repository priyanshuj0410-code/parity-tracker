import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Dropdown } from '../components/Dropdown'
import { EmptyState } from '../components/EmptyState'
import { AccountStep } from '../components/Join'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
import { ApiError, adminAction, adminMarkets, figure, istDate, istTime, outOf100, problem, signOut, type AdminMarket, type Side, type Template } from '../lib/markets'
import { usePageTitle } from '../lib/router'
import { useAccount } from '../lib/useAccount'

const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10)

// Needs the owner's attention first: overdue, then a schedule check due, then closed and waiting for the release.
const rank = (m: AdminMarket) => (m.status !== 'open' && m.status !== 'resolving' ? 4 : m.overdue ? 0 : m.checkDue ? 1 : m.closed ? 2 : 3)

/** The owner's console (`/console`, ADMIN_EMAILS only): every market with its flags, and create, schedule check, resolve and void. */
export function ConsolePage() {
  usePageTitle('Markets console')
  const acct = useAccount()
  const [markets, setMarkets] = useState<AdminMarket[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    adminMarkets().then((ms) => { setError(null); setMarkets([...ms].sort((a, b) => rank(a) - rank(b))) }, (err) => setError(problem(err)))
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
    return <>
      <section>
        <div className="section-head"><h2>Markets</h2><span className="meta">{markets.length} in all · {acct.config.enabled ? 'markets are on' : 'markets are off: players see none'}</span></div>
        {markets.length === 0 ? <p className="small">No markets yet. Create the first below.</p> : (
          <ul className="admin-list">{markets.map((m) => <AdminRow key={m.id} m={m} onChange={load} />)}</ul>
        )}
      </section>
      <section><h2>Create from a template</h2><CreateForm onCreated={load} /></section>
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
          <span className="badge">{STATUS[m.status]}{m.outcome ? `: ${m.outcome}` : ''}</span>
          {live && m.closed && <span className="badge">Closed</span>}
          {m.checkDue && <span className="badge warn">Check due</span>}
          {m.overdue && <span className="badge bad">Overdue</span>}
        </span>
      </div>
      <p className="small muted admin-meta">
        <code>{m.subject}</code> · Yes {outOf100(m.priceYes)} out of 100 · {m.holders} holders · {m.trades} trades
        {d && <> · closes {istTime(d.closesAt)} · release due {istDate(d.scheduledDate)}</>}
      </p>
      {live && d && (
        <div className="actions-row">
          <button type="button" className="btn-quiet" aria-expanded={open === 'check'} onClick={() => setOpen(open === 'check' ? null : 'check')}>Schedule check</button>
          <button type="button" className="btn-quiet" aria-expanded={open === 'resolve'} disabled={!m.closed} onClick={() => setOpen(open === 'resolve' ? null : 'resolve')}>Resolve</button>
          <button type="button" className="btn-quiet" aria-expanded={open === 'void'} onClick={() => setOpen(open === 'void' ? null : 'void')}>Void</button>
          {!m.closed && <span className="small muted">Resolve opens when trading closes.</span>}
        </div>
      )}
      {open === 'check' && <CheckForm id={m.id} onDone={onChange} />}
      {open === 'resolve' && d && <ResolveForm m={m} onDone={onChange} />}
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
  const [outcome, setOutcome] = useState<Side>('yes')
  const [value, setValue] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [releaseName, setReleaseName] = useState(d.releaseName)
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

const TEMPLATES: { id: Template; label: string }[] = [{ id: 'nivel-data', label: 'Nivel data' }, { id: 'official', label: 'Official' }, { id: 'norm', label: 'Norm' }]

const HINT: Record<Template, { subject: string; precision: string }> = {
  'nivel-data': { subject: 'in:nifty50:payshare:fy2026-27', precision: 'Two decimals of a percentage, fixed.' },
  official: { subject: 'in:women15plus:lfpr-cws:2026-10', precision: 'One decimal, fixed.' },
  norm: { subject: 'in:men18plus:wvs-jobsscarce-agree:wave8', precision: '' },
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [template, setTemplate] = useState<Template>('nivel-data')
  const [f, setF] = useState<Record<string, string>>({ readOn: today() })
  const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNote(null)
    try {
      const r = await adminAction<{ id: string; closesAt: string }>({
        action: 'create', template, subject: f.subject?.trim(), threshold: Number(f.threshold),
        ...(template === 'norm' ? { precision: Number(f.precision) } : {}),
        question: f.question?.trim(), definition: f.definition?.trim(), releaseName: f.releaseName?.trim(), scheduledDate: f.scheduledDate,
        scheduleDoc: { name: f.docName?.trim(), url: f.docUrl?.trim(), readOn: f.readOn },
        resolutionLocation: f.location?.trim(), source: { name: f.sourceName?.trim(), url: f.sourceUrl?.trim() },
      })
      setNote({ ok: true, text: `Opened at 50 out of 100. Trading closes at ${istTime(r.closesAt)}.` })
      setF({ readOn: today() })
      onCreated()
    } catch (err) {
      setNote({ ok: false, text: problem(err) })
    } finally {
      setBusy(false)
    }
  }
  const q = f.question ?? ''
  return (
    <form className="card admin-form create" onSubmit={submit}>
      <Segmented label="Template" value={template} onChange={setTemplate} options={TEMPLATES} />
      <div className="fields two">
        <label>Subject<input required maxLength={80} placeholder={HINT[template].subject} value={f.subject ?? ''} onChange={set('subject')} /><span className="hint">market:population:measure:period</span></label>
        <label>Threshold<input type="number" step="any" min={0} max={100} required value={f.threshold ?? ''} onChange={set('threshold')} /><span className="hint">Set by the template's rule, once. {template === 'norm' ? 'Of every 100.' : 'A percentage.'}</span></label>
        {template === 'norm'
          ? <label>Precision, decimals the publisher prints<input type="number" min={0} max={4} step={1} required value={f.precision ?? ''} onChange={set('precision')} /></label>
          : <p className="small muted field-note">Precision: {HINT[template].precision}</p>}
        <label className="wide">Question<input required maxLength={200} value={q} onChange={set('question')} aria-describedby="q-hint" /><span className="hint" id="q-hint">{q.length} of 200. "Will [figure] be at least [threshold] [for period]?"{q && !q.includes('at least') ? ' Needs "at least".' : ''}</span></label>
        <label className="wide">Definition, quoted from the source, with where it is printed<textarea required maxLength={2000} rows={3} value={f.definition ?? ''} onChange={set('definition')} /></label>
        <label>Source publisher and publication<input required maxLength={120} value={f.sourceName ?? ''} onChange={set('sourceName')} /></label>
        <label>Source link<input type="url" required pattern="https://.*" placeholder="https://" value={f.sourceUrl ?? ''} onChange={set('sourceUrl')} /></label>
        <label>Release that settles it<input required maxLength={200} value={f.releaseName ?? ''} onChange={set('releaseName')} /></label>
        <label>Scheduled date<input type="date" required value={f.scheduledDate ?? ''} onChange={set('scheduledDate')} /></label>
        <label>Schedule document, with its version<input required maxLength={200} value={f.docName ?? ''} onChange={set('docName')} /></label>
        <label>Schedule document link<input type="url" required pattern="https://.*" placeholder="https://" value={f.docUrl ?? ''} onChange={set('docUrl')} /></label>
        <label>Read on<input type="date" required value={f.readOn ?? ''} onChange={set('readOn')} /></label>
        <label>Where the result is printed<input required maxLength={500} value={f.location ?? ''} onChange={set('location')} /></label>
      </div>
      <p className="small muted">Opens at 50 out of 100. Trading closes by the template's rule: 23:59 IST the day before the scheduled date, or the end of the financial year for Nivel data if earlier. Voids follow the standard reasons.</p>
      <button type="submit" className="btn-primary" disabled={busy}>Open the market</button>
      {note && <p className={note.ok ? 'small' : 'form-error'} role={note.ok ? 'status' : 'alert'}>{note.text}</p>}
    </form>
  )
}
