import { boardShare } from '../lib/data'
import { pct } from '../lib/format'
import type { Company } from '../types'
import { DataBadge } from './Badge'
import { ParityTrack } from './ParityTrack'

export function JapanGlance({ c }: { c: Company }) {
  const y = c.years.latest
  const board = boardShare(y) ?? y.boardShareReported ?? null
  return (
        <div className="grid g4 tiles">
          <div className="card">
            <div className="tile-label">Women's share of pay</div>
            <div className="tile-value">{pct(y.w)}</div>
            <div className="tile-context"><DataBadge year={y} quiet /></div>
            {y.w != null && <ParityTrack value={y.w} parity={0.5} />}
          </div>
          <div className="card">
            <div className="tile-label">Women's pay per ¥100 of men's</div>
            <div className="tile-value">{y.gapMean == null ? 'n/a' : `¥${Math.round((1 - y.gapMean) * 100)}`}</div>
            <div className="tile-context muted">All workers. Regular staff: {pct(y.ratioRegular, 0)}; non-regular: {pct(y.ratioNonRegular, 0)}.</div>
          </div>
          <div className="card">
            <div className="tile-label">Women in regular staff</div>
            <div className="tile-value">{pct(y.fPerm)}</div>
            <div className="tile-context muted">{y.fPerm == null ? 'Not disclosed' : 'Share of regular employees'}</div>
          </div>
          <div className="card">
            <div className="tile-label">Women in management</div>
            <div className="tile-value">{pct(y.managerShare)}</div>
            <div className="tile-context muted">Board: {y.board ? `${y.boardWomen} of ${y.board}` : pct(board)}</div>
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
          <li><strong>Scope:</strong> the listed company's own employees; for holding companies, often head office only.</li>
          <li><strong>Women in regular staff:</strong> {y.fPerm != null ? `${pct(y.fPerm)}, from the same database.` : 'not disclosed, so no share of pay and not in the Nikkei 225 headline.'}</li>
        </ul>
  )
}
