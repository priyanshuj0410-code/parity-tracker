import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Join } from '../components/Join'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
import { grievanceHref } from '../lib/contact'
import { ApiError, figure, fmt, istDate, istTime, marketById, outOf100, problem, trade, tradingClosed, type Details, type LogEntry, type Market, type Side } from '../lib/markets'
import { href, query, usePageTitle } from '../lib/router'
import { useAccount } from '../lib/useAccount'

/** One market (`/market?id=`): the question and its source, the price, the rules, trading, the reader's position and the log. */
export function MarketPage() {
  usePageTitle('Forecast')
  const id = query().get('id') ?? ''
  const acct = useAccount()
  const [data, setData] = useState<{ market: Market; log: LogEntry[] } | 'missing' | 'failed' | null>(null)
  const load = useCallback(() => {
    marketById(id).then(setData, (err) => setData(err instanceof ApiError && (err.status === 404 || err.status === 400) ? 'missing' : 'failed'))
  }, [id])
  // After the account check, so a signed-in adult's request carries their sign-in and returns their position.
  useEffect(() => {
    if (acct.account !== undefined && acct.config?.enabled) load()
  }, [acct.account, acct.config, load])

  if (acct.config && !acct.config.enabled) return <Closed />
  if (data === 'missing') {
    return (
      <section>
        <h1>Forecast not found</h1>
        <EmptyState art="notFound" title="No forecast here" actions={<a className="go" href={href('')}>Go to indexes</a>}>Check the link.</EmptyState>
      </section>
    )
  }
  if (data === 'failed') {
    return (
      <section>
        <h1>Forecast</h1>
        <p className="sk-failed">This part didn't load. <button type="button" className="btn-quiet" onClick={() => { setData(null); load() }}>Try again</button></p>
      </section>
    )
  }
  if (!data || acct.account === undefined) return <section><Skeleton line label="Loading the forecast" /></section>

  const { market: m, log } = data
  const d = m.details
  const closed = tradingClosed(m)
  const yes = outOf100(m.priceYes)
  const report = grievanceHref(`report question ${m.id}`)
  const held = m.position && (m.position.sharesYes > 0 || m.position.sharesNo > 0) ? m.position : null
  return (
    <>
      <section className="page-head">
        <div className="meta crumbs"><a href={href('')}>Indexes</a> / Forecast</div>
        <h1>{m.question}</h1>
        {d && (
          <p className="meta">
            Resolves on {d.releaseName}, due {istDate(d.scheduledDate)}.{m.source && <> <a href={m.source.url} rel="noopener">{m.source.name}</a></>}
          </p>
        )}
      </section>

      <section>
        <div className="grid g2">
          <div className="card">
            <div className="tile-label">{closed ? 'Final forecast for yes' : 'Forecast for yes'}</div>
            <div className="tile-value hero">{yes}<span className="play-of"> out of 100</span></div>
            <p className="tile-context">No: {100 - yes} out of 100. A winning share pays 1 Lumen.</p>
            <p className="small market-state">
              {m.status === 'resolved' ? <strong>Resolved: {m.outcome}.</strong>
                : m.status === 'void' ? <strong>Voided. Every stake was returned.</strong>
                : closed ? <strong>Trading closed{d ? ` at ${istTime(d.closesAt)}` : ''}.</strong>
                : d && <>Trading closes at {istTime(d.closesAt)}.</>}
            </p>
          </div>
          {!closed && (acct.adult
            ? <TradeCard market={m} balance={acct.wallet?.balance ?? 0} onTraded={(balance) => { if (acct.wallet) acct.setWallet({ ...acct.wallet, balance }); load() }} />
            : <Join key={acct.account?.id ?? 'out'} account={acct.account} onDone={() => void acct.refresh()} />)}
          {held && (
            <div className="card">
              <div className="tile-label">Your position</div>
              <dl className="facts">
                <div><dt>Yes shares</dt><dd>{fmt(held.sharesYes)}</dd></div>
                <div><dt>No shares</dt><dd>{fmt(held.sharesNo)}</dd></div>
                <div><dt>Lumens in</dt><dd>{fmt(held.costBasis)}</dd></div>
              </dl>
              <a className="go" href={href('wallet')}>Your Lumens</a>
            </div>
          )}
        </div>
      </section>

      {d && (
        <section>
          <h2>How it resolves</h2>
          <dl className="details card">
            <div className="wide"><dt>Definition</dt><dd>{d.definition}</dd></div>
            <div><dt>Threshold</dt><dd>At least {figure(d, d.threshold)}, at the precision the source publishes. A tie is a yes.</dd></div>
            <div><dt>Trading closes</dt><dd>{istTime(d.closesAt)}</dd></div>
            <div><dt>Release</dt><dd>{d.releaseName}, due {istDate(d.scheduledDate)}</dd></div>
            <div><dt>Schedule</dt><dd><a href={d.scheduleDoc.url} rel="noopener">{d.scheduleDoc.name}</a>, read on {istDate(d.scheduleDoc.readOn)}</dd></div>
            <div><dt>Where the figure is printed</dt><dd>{d.resolutionLocation}</dd></div>
            {m.source && <div><dt>Source</dt><dd><a href={m.source.url} rel="noopener">{m.source.name}</a></dd></div>}
            <div className="wide"><dt>Voided, with every stake returned, if</dt><dd>the release is more than 30 days late, is cancelled, changes its definition or comes out before trading closes, or the question has an error.</dd></div>
          </dl>
        </section>
      )}

      <section>
        <h2>Log</h2>
        <ol className="timeline">
          {log.map((e, i) => <LogItem key={i} e={e} d={d} />)}
        </ol>
        <p className="small report">{report ? <a href={report}>Report this question</a> : 'Report this question to the grievance contact, named here before markets open.'}</p>
      </section>
    </>
  )
}

function Closed() {
  return (
    <section>
      <h1>Forecast</h1>
      <EmptyState art="data" title="Markets are not open yet" actions={<a className="go" href={href('')}>Go to indexes</a>}>Every figure on Nivel stays open to all.</EmptyState>
    </section>
  )
}

const ACTION: Record<LogEntry['action'], string> = { create: 'Opened', 'schedule-check': 'Schedule re-read', resolve: 'Resolved', void: 'Voided' }

function LogItem({ e, d }: { e: LogEntry; d: Details | null }) {
  const revised = e.reason?.match(/^revised date (\d{4}-\d{2}-\d{2})$/)?.[1]
  return (
    <li>
      <p className="tl-head"><strong>{ACTION[e.action]}</strong><time dateTime={e.at}>{istTime(e.at)}</time></p>
      <p className="small">
        {e.action === 'create' && <>At 50 out of 100. Threshold: at least {d && e.threshold != null ? figure(d, e.threshold) : e.threshold}. Schedule from {e.scheduleDoc}, read on {e.readOn && istDate(e.readOn)}.</>}
        {e.action === 'schedule-check' && <>{e.scheduleDoc}, read on {e.readOn && istDate(e.readOn)}.{revised && ` Revised date: ${istDate(revised)}.`}</>}
        {e.action === 'resolve' && <>
          {e.outcome === 'yes' ? 'Yes' : 'No'}: the figure was {d && e.figure != null ? figure(d, e.figure) : e.figure}, against at least {d && e.threshold != null ? figure(d, e.threshold) : e.threshold}. {e.releaseName}{e.releaseId && ` (release ${e.releaseId})`}.
          {e.sourceUrl && <> <a href={e.sourceUrl} rel="noopener">Source</a>.</>}
        </>}
        {e.action === 'void' && <>Reason: {e.reason}. Every stake was returned.</>}
        {' '}By {e.by}.
      </p>
    </li>
  )
}

function TradeCard({ market, balance, onTraded }: { market: Market; balance: number; onTraded: (balance: number) => void }) {
  const [dir, setDir] = useState<'buy' | 'sell'>('buy')
  const [side, setSide] = useState<Side>('yes')
  const [shares, setShares] = useState('100')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const n = Number(shares)
  const valid = Number.isInteger(n) && n >= 10 && n <= 1000
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) { setNote({ ok: false, text: 'Trade between 10 and 1,000 shares.' }); return }
    setBusy(true)
    try {
      const r = await trade(market.id, side, dir === 'buy' ? n : -n)
      setNote({ ok: true, text: `${dir === 'buy' ? 'Bought' : 'Sold'} ${fmt(n)} ${side} shares. Yes is now ${outOf100(r.priceYes)} out of 100. You have ${fmt(r.balance)} Lumens.` })
      onTraded(r.balance)
    } catch (err) {
      setNote({ ok: false, text: problem(err) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="card trade" onSubmit={submit}>
      <div className="tile-label">Forecast</div>
      <div className="trade-switches">
        <Segmented label="Buy or sell" value={dir} onChange={setDir} options={[{ id: 'buy', label: 'Buy' }, { id: 'sell', label: 'Sell' }]} />
        <Segmented label="Side" value={side} onChange={setSide} options={[{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]} />
      </div>
      <div className="fields">
        <label>Shares, 10 to 1,000<input type="number" inputMode="numeric" min={10} max={1000} step={10} value={shares} onChange={(e) => setShares(e.target.value)} aria-invalid={!valid} /></label>
      </div>
      <div className="actions-row">
        <button type="submit" className="btn-primary" disabled={busy}>{dir === 'buy' ? 'Buy' : 'Sell'} {valid ? fmt(n) : ''} {side}</button>
        <span className="small muted">You have {fmt(balance)} Lumens</span>
      </div>
      <p className={note?.ok === false ? 'form-error' : 'small'} role="status">{note?.text}</p>
    </form>
  )
}
