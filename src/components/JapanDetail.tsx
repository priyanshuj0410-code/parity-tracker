import { boardShare } from '../lib/data'
import { pct } from '../lib/format'
import type { Company } from '../types'
import { DataBadge } from './Badge'
import { ParityTrack } from './ParityTrack'

export function JapanGlance({ c }: { c: Company }) {
  const y = c.years.latest
  const board = boardShare(y) ?? y.boardShareReported ?? null
  return (
        <div className="grid g4">
          <div className="card">
            <div className="tile-label">Women's average pay as a share of men's</div>
            <div className="tile-value">{pct(y.w)}</div>
            <div className="tile-context"><DataBadge year={y} /> <span className="muted">all workers</span></div>
            {y.w != null && <ParityTrack value={y.w} parity={1} />}
          </div>
          <div className="card">
            <div className="tile-label">Regular staff</div>
            <div className="tile-value">{pct(y.ratioRegular)}</div>
            <div className="tile-context muted">Non-regular staff: {pct(y.ratioNonRegular)}</div>
          </div>
          <div className="card">
            <div className="tile-label">Women in management</div>
            <div className="tile-value">{pct(y.managerShare)}</div>
          </div>
          <div className="card">
            <div className="tile-label">Women on the board</div>
            <div className="tile-value">{y.board ? `${y.boardWomen} of ${y.board}` : pct(board)}</div>
            {y.board ? <div className="tile-context muted">{pct(board, 0)} of seats</div> : null}
          </div>
        </div>
  )
}

export function JapanSources({ c }: { c: Company }) {
  const y = c.years.latest
  const entity = c.entities?.[0]
  return (
        <ul className="tight">
          <li><strong>Source:</strong> the Ministry of Health, Labour and Welfare's women's advancement database, open data downloaded on 2 October 2026. <a href="https://positive-ryouritsu.mhlw.go.jp/positivedb/" target="_blank" rel="noreferrer">Database</a></li>
          {entity && <li><strong>Reporting employer:</strong> {entity.name} ({entity.size})</li>}
          {y.period && <li><strong>Pay period:</strong> {y.period}</li>}
          {y.updated && <li><strong>Last updated by the company:</strong> {y.updated}</li>}
          <li><strong>Scope:</strong> the listed company's own employees. For holding companies this can be a small head-office staff rather than the whole group.</li>
          <li><strong>Women in regular staff:</strong> {y.fPerm != null ? `${pct(y.fPerm)}, from the same database. Used as employment parity.` : 'not disclosed in the database, so this company is not on the parity map.'}</li>
        </ul>
  )
}
