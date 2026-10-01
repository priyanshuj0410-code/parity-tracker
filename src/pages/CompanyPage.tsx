import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { LineChart, type Series } from '../components/LineChart'
import { YEARS, boardShare, companies, indexName, payRatio, shareChange, yoyChange } from '../lib/data'
import { crore, fy, pct } from '../lib/format'
import { href } from '../lib/router'
import { NotFound } from './NotFound'

export function CompanyPage({ symbol }: { symbol: string }) {
  const c = companies[symbol]
  if (!c) return <NotFound />
  const desc = [...YEARS].reverse()
  const latest = desc.find((k) => c.years[k]?.w != null) ?? desc.find((k) => c.years[k])
  const y = latest ? c.years[latest] : undefined
  const prevKey = latest ? YEARS[YEARS.indexOf(latest) - 1] : undefined
  const p = prevKey ? c.years[prevKey] : undefined
  const ratio = payRatio(y)
  const bs = boardShare(y)

  const series: Series[] = [
    {
      id: 'w', label: "Women's share of wages", short: 'Wages', color: 'var(--s1)',
      points: YEARS.map((k) => ({
        x: k, y: c.years[k]?.w ?? null, hollow: c.years[k]?.wKind === 'estimated',
        note: c.years[k]?.basisChange ? 'reporting basis changed' : undefined,
      })),
    },
    { id: 'f', label: 'Women in permanent staff', short: 'Staff', color: 'var(--s2)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.fPerm ?? null })) },
    { id: 'b', label: 'Women on the board', short: 'Board', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: boardShare(c.years[k]) })) },
  ]
  const peak = Math.max(0, ...series.flatMap((s) => s.points.map((pt) => pt.y ?? 0)))
  const yMax = Math.max(0.5, Math.ceil(peak * 10) / 10)
  const notes = YEARS.filter((k) => c.years[k]?.note && c.years[k].note !== 'reported')
  const hasData = YEARS.some((k) => c.years[k])

  return (
    <>
      <section>
        <div className="meta"><a href={href('companies')}>Companies</a> / {c.industry}</div>
        <h1>{c.name}</h1>
        <p className="meta">{c.exchange}: {c.symbol} · market cap {crore(c.marketCapCr)}</p>
        <div>{c.indexes.map((id) => <a key={id} className="chip" href={href('index', id)}>{indexName(id)}</a>)}</div>
      </section>

      {!hasData ? (
        <section><p>No BRSR filing is available for this company yet, so there is nothing to show. Recent listings file their first report after their first full financial year.</p></section>
      ) : (
        <>
          <section>
            <h2>{latest ? fy(latest) : ''} at a glance</h2>
            <div className="grid g4">
              <div className="card">
                <div className="tile-label">Women's share of wages</div>
                <div className="tile-value">{pct(y?.w)}</div>
                <div className="tile-context"><DataBadge year={y} /> <Change value={latest ? yoyChange(c, latest, prevKey) : null} /></div>
              </div>
              <div className="card">
                <div className="tile-label">Women in permanent staff</div>
                <div className="tile-value">{pct(y?.fPerm)}</div>
                <div className="tile-context"><Change value={shareChange(p?.fPerm, y?.fPerm)} /></div>
                {y?.permHeadcount ? <div className="tile-context muted">{y.permHeadcount.toLocaleString('en-IN')} permanent staff</div> : null}
              </div>
              <div className="card">
                <div className="tile-label">Women on the board</div>
                <div className="tile-value">{y?.board ? `${y.boardWomen} of ${y.board}` : 'n/a'}</div>
                <div className="tile-context">
                  {bs == null ? <span className="muted">Not reported</span> : y?.boardWomen === 0 ? 'No women on the board.' : y?.boardWomen === 1 ? 'Only the legal minimum of one.' : `${pct(bs, 0)} of seats`}
                </div>
              </div>
              <div className="card">
                <div className="tile-label">Women's average pay</div>
                <div className="tile-value">{ratio == null ? 'n/a' : `₹${Math.round(ratio * 100)}`}</div>
                <div className="tile-context muted">for every ₹100 paid to men, on average. Approximate: wage share compared with share of permanent staff.</div>
              </div>
            </div>
          </section>

          <section>
            <h2>Trajectory</h2>
            <LineChart ariaLabel={`${c.name}: women's share of wages, permanent staff and board seats by year`}
              xs={YEARS} xLabel={fy} fmt={(v) => pct(v, v === Math.round(v * 10) / 10 ? 0 : 1)} yMax={yMax}
              reference={{ y: 0.5, label: 'Parity 50%' }} series={series} />
            <p className="small muted" style={{ marginTop: 8 }}>Hollow points are estimates from median pay, not reported wage totals, and are not joined to the line. Wage data starts in {fy('2022-23')}, when the field entered the filing format.</p>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <caption className="sr-only">Values by year</caption>
                <thead><tr><th>Year</th><th className="r">Wages to women</th><th className="r">Permanent staff</th><th className="r">Board</th><th className="r">Payroll</th><th>Data</th><th>Basis</th></tr></thead>
                <tbody>
                  {YEARS.filter((k) => c.years[k]).map((k) => {
                    const v = c.years[k]
                    return (
                      <tr key={k}>
                        <td>{fy(k)}</td>
                        <td className="r">{pct(v.w)}</td>
                        <td className="r">{pct(v.fPerm)}</td>
                        <td className="r">{v.board ? `${v.boardWomen} of ${v.board}` : 'n/a'}</td>
                        <td className="r">{crore(v.payrollCr)}</td>
                        <td><DataBadge year={v} /></td>
                        <td>{v.boundary || 'n/a'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>About this data</h2>
            <ul className="tight">
              <li><strong>Index weight basis:</strong> payroll of {crore(c.payrollWeightCr)} ({c.payrollWeightBasis ?? 'not available'}).</li>
              {notes.map((k) => <li key={k}><strong>{fy(k)}:</strong> {c.years[k].note}{c.years[k].basisChange ? '; reporting basis changed from the year before, so this year is left out of like-for-like comparisons' : ''}.</li>)}
            </ul>
            <h3 style={{ marginTop: 20 }}>Source filings</h3>
            <ul className="tight">
              {Object.entries(c.filings).reverse().map(([k, f]) => (
                <li key={k}>{fy(k)} BRSR, filed {f.submitted}: <a href={f.xbrl} target="_blank" rel="noreferrer">XBRL</a> · <a href={f.pdf} target="_blank" rel="noreferrer">PDF</a></li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  )
}
