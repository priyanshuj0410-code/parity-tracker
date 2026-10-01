import { DataBadge } from '../components/Badge'
import { Change } from '../components/Change'
import { LineChart, type Series } from '../components/LineChart'
import { boardShare, companies, indexName, marketOf, payRatio, shareChange, workforce, yoyChange } from '../lib/data'
import { crore, pct } from '../lib/format'
import { href } from '../lib/router'
import { NotFound } from './NotFound'

export function CompanyPage({ symbol }: { symbol: string }) {
  const c = companies[symbol]
  if (!c) return <NotFound />
  const m = marketOf(c)
  const uk = c.country !== 'IN'
  const gb = c.country === 'GB'
  const YEARS = m.years
  const fy = m.label
  const desc = [...YEARS].reverse()
  const latest = desc.find((k) => c.years[k]?.w != null) ?? desc.find((k) => c.years[k])
  const y = latest ? c.years[latest] : undefined
  const prevKey = latest ? YEARS[YEARS.indexOf(latest) - 1] : undefined
  const p = prevKey ? c.years[prevKey] : undefined
  const ratio = payRatio(c, y)
  const bs = boardShare(y)

  const series: Series[] = [
    {
      id: 'w', label: m.wageLabel, short: uk ? 'Pay' : 'Wages', color: 'var(--s1)',
      points: YEARS.map((k) => ({
        x: k, y: c.years[k]?.w ?? null, hollow: c.years[k]?.wKind === 'estimated',
        note: c.years[k]?.basisChange ? 'reporting basis changed' : undefined,
      })),
    },
    { id: 'f', label: m.workforceLabel, short: uk ? 'Workforce' : 'Staff', color: 'var(--s2)', points: YEARS.map((k) => ({ x: k, y: workforce(c, c.years[k]) })) },
    uk
      ? { id: 't', label: 'Women in the top pay quarter', short: 'Top', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: c.years[k]?.topQuartile ?? null })) }
      : { id: 'b', label: 'Women on the board', short: 'Board', color: 'var(--s3)', points: YEARS.map((k) => ({ x: k, y: boardShare(c.years[k]) })) },
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
        <p className="meta">{m.name} · {c.exchange}: {c.symbol.replace(/^ASX-/, '')}{c.marketCapCr != null && <> · market cap {crore(c.marketCapCr)}</>}</p>
        <div>{c.indexes.map((id) => <a key={id} className="chip" href={href('index', id)}>{indexName(id)}</a>)}</div>
      </section>

      {!hasData ? (
        <section><p>{c.noDataReason ?? 'No BRSR filing is available for this company yet, so there is nothing to show. Recent listings file their first report after their first full financial year.'}</p></section>
      ) : (
        <>
          <section>
            <h2>{latest ? fy(latest) : ''} at a glance</h2>
            <div className="grid g4">
              <div className="card">
                <div className="tile-label">{m.wageLabel}</div>
                <div className="tile-value">{pct(y?.w)}</div>
                <div className="tile-context"><DataBadge year={y} /> <Change hideMissing value={latest ? yoyChange(c, latest, prevKey) : null} /></div>
              </div>
              <div className="card">
                <div className="tile-label">{m.workforceLabel}</div>
                <div className="tile-value">{pct(workforce(c, y))}</div>
                <div className="tile-context"><Change hideMissing value={shareChange(workforce(c, p), workforce(c, y))} /></div>
                {y?.permHeadcount ? <div className="tile-context muted">{y.permHeadcount.toLocaleString('en-IN')} permanent staff</div> : null}
                {gb && y?.entityCount ? <div className="tile-context muted">across {y.entityCount} UK {y.entityCount === 1 ? 'employer' : 'employers'}</div> : null}
              </div>
              {uk ? (
                <div className="card">
                  <div className="tile-label">Women in the top pay quarter</div>
                  <div className="tile-value">{pct(y?.topQuartile)}</div>
                  <div className="tile-context"><Change hideMissing value={shareChange(p?.topQuartile, y?.topQuartile)} /></div>
                  <div className="tile-context muted">The best-paid quarter of {gb ? 'UK' : 'Australian'} staff.</div>
                </div>
              ) : (
                <div className="card">
                  <div className="tile-label">Women on the board</div>
                  <div className="tile-value">{y?.board ? `${y.boardWomen} of ${y.board}` : 'n/a'}</div>
                  <div className="tile-context">
                    {bs == null ? <span className="muted">Not reported</span> : y?.boardWomen === 0 ? 'No women on the board.' : y?.boardWomen === 1 ? 'Only the legal minimum of one.' : `${pct(bs, 0)} of seats`}
                  </div>
                </div>
              )}
              <div className="card">
                <div className="tile-label">Women's average pay</div>
                <div className="tile-value">{ratio == null ? 'n/a' : gb ? `${Math.round(ratio * 100)}p` : uk ? `${Math.round(ratio * 100)}c` : `₹${Math.round(ratio * 100)}`}</div>
                <div className="tile-context muted">{gb
                  ? `for every £1 men earn per hour (mean). Median hourly gap: ${pct(y?.gapMedian)}.`
                  : uk
                    ? `for every $1 men earn, full-time equivalent (mean).${p?.gapMean != null && y?.gapMean != null ? ` The mean gap was ${pct(p.gapMean)} in ${fy(prevKey ?? '')}.` : ''}`
                    : 'for every ₹100 paid to men, on average. Approximate: wage share compared with share of permanent staff.'}</div>
              </div>
            </div>
          </section>

          <section>
            <h2>Trajectory</h2>
            <LineChart ariaLabel={`${c.name}: ${series.map((s) => s.label.toLowerCase()).join(', ')}, by year`}
              xs={YEARS} xLabel={fy} fmt={(v) => pct(v, v === Math.round(v * 10) / 10 ? 0 : 1)} yMax={yMax}
              reference={{ y: 0.5, label: 'Parity 50%' }} series={series} />
            <p className="small muted" style={{ marginTop: 8 }}>{gb
              ? 'Pay share is derived from each UK employer\'s mean hourly pay gap and the share of women in its workforce, combined across the group\'s UK employers by size band.'
              : uk
                ? `Pay share is derived from the group's mean full-time-equivalent pay gap and its share of women. ${fy(m.prev)} uses the ${fy(m.latest)} workforce share because the earlier release is not archived, so it is shown hollow.`
                : `Hollow points are estimates from median pay, not reported wage totals, and are not joined to the line. Wage data starts in ${fy('2022-23')}, when the field entered the filing format.`}</p>
            {uk ? (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <caption className="sr-only">Values by year</caption>
                  <thead><tr><th>Year</th><th className="r">Pay to women</th><th className="r">Workforce</th><th className="r">Top quarter</th><th className="r">Mean gap</th><th className="r">Median gap</th><th className="r">Employers</th><th>Data</th></tr></thead>
                  <tbody>
                    {YEARS.filter((k) => c.years[k]).map((k) => {
                      const v = c.years[k]
                      return (
                        <tr key={k}>
                          <td>{fy(k)}</td>
                          <td className="r">{pct(v.w)}</td>
                          <td className="r">{pct(v.fAll)}</td>
                          <td className="r">{pct(v.topQuartile)}</td>
                          <td className="r">{pct(v.gapMean)}</td>
                          <td className="r">{pct(v.gapMedian)}</td>
                          <td className="r">{v.entityCount}</td>
                          <td><DataBadge year={v} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
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
            )}
          </section>

          {uk ? (
            <section>
              <h2>About this data</h2>
              <ul className="tight">
                <li><strong>Source:</strong> {gb
                  ? 'the UK government\'s gender pay gap service. Employers with 250 or more UK staff report each year, using a snapshot of pay in April.'
                  : <>the Workplace Gender Equality Agency's employer gender pay gaps, {fy(m.latest)} release. Employers with 100 or more Australian staff report, and corporate groups report combined results. <a href="https://www.wgea.gov.au/data-statistics/data-explorer" target="_blank" rel="noreferrer">WGEA Data Explorer</a></>}</li>
                {YEARS.filter((k) => c.years[k]?.basisChange).map((k) => <li key={k}><strong>{fy(k)}:</strong> the group's reporting employers or their size bands changed from the year before, so this year is left out of like-for-like comparisons.</li>)}
              </ul>
              {c.entities && c.entities.length > 0 && (
                <>
                  <h3 style={{ marginTop: 20 }}>{gb ? 'UK employers counted' : 'WGEA reporting entity'} ({gb ? c.entitiesYear : fy(c.entitiesYear ?? m.latest)})</h3>
                  <ul className="tight">
                    {c.entities.map((e) => (
                      <li key={e.name}>{e.name} ({gb ? `${e.size} staff` : e.size}){gb && e.link && /^https?:\/\//.test(e.link) ? <> · <a href={e.link} target="_blank" rel="noreferrer">employer's report</a></> : null}</li>
                    ))}
                  </ul>
                  <p className="small muted">Employers are matched to the listed group by name. If one is missing or wrongly included, tell The Equal Lens team.</p>
                </>
              )}
            </section>
          ) : (
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
          )}
        </>
      )}
    </>
  )
}
