import { useState } from 'react'
import { pct } from '../lib/format'
import type { CompanyYear, LevelRow } from '../types'
import { ChartFrame } from './ChartFrame'
import { DataTable, type Column } from './DataTable'
import { Meter } from './Meter'
import { Segmented } from './Segmented'

type Kind = 'levels' | 'functions'

const KINDS: Kind[] = ['levels', 'functions']
const ORDER = ['top', 'senior', 'middle', 'junior']
const rank = (r: LevelRow) => { const i = ORDER.indexOf(r.standard ?? ''); return i < 0 ? ORDER.length : i }
const labelOf = (r: LevelRow) => r.level ?? r.function ?? ''
const n0 = (v?: number) => (v == null ? 'n/a' : v.toLocaleString('en-IN'))
const at = (v: number) => `${v * 100}%`

/** A reading's note cut to its first clause, without the reader's remarks on what its text left out. */
const clause = (s?: string) => (s ?? '')
  .replace(/\s*\([^()]*\b(snippet|not given|not marked|not shown|not in text)\b[^()]*\)/gi, '')
  .replace(/,\s*(p\.|page)\s*not [^,;]*/gi, '')
  .split(';')[0].trim()

/** Who a row covers, only when it is not all staff. */
const scopeOf = (r: LevelRow) => { const s = clause(r.scope).split(' (')[0]; return /^(all\b|not stated)/i.test(s) ? '' : s }

const kindsOf = (y: CompanyYear) => KINDS.filter((k) => y[k]?.length)

/** Women's share at each of the company's own levels, or in each job function, with a Levels | Functions switch when it reports both. */
export function LevelBars({ y, yearLabel }: { y: CompanyYear; yearLabel: string }) {
  const kinds = kindsOf(y)
  const [chosen, setChosen] = useState<Kind>(kinds[0])
  const kind = kinds.includes(chosen) ? chosen : kinds[0]
  const rows = [...(y[kind] ?? [])].sort((a, b) => rank(a) - rank(b))
  const wheres = rows.map((r) => clause(r.where))
  const source = [...new Set(wheres)].filter(Boolean).sort((a, b) => wheres.filter((w) => w === b).length - wheres.filter((w) => w === a).length)[0]
  const levels = kind === 'levels'
  const columns: Column<LevelRow>[] = [
    { key: 'name', label: levels ? 'Level' : 'Function', render: (r) => <>{labelOf(r)}{scopeOf(r) && <span className="sub">{scopeOf(r)}</span>}</>, sort: (r) => rows.indexOf(r), csv: labelOf },
    { key: 'women', label: 'Women', right: true, render: (r) => n0(r.women), sort: (r) => r.women ?? null },
    { key: 'men', label: 'Men', right: true, render: (r) => n0(r.men), sort: (r) => r.men ?? null },
    { key: 'share', label: "Women's share", mobile: 'value', phone: (r) => pct(r.share), render: (r) => <Meter value={r.share} parity={0.5} />, sort: (r) => r.share ?? null },
    ...(new Set(wheres).size > 1 ? [{ key: 'where', label: 'Source', wide: true, render: (r: LevelRow) => clause(r.where) || 'n/a' }] : []),
  ]
  return (
    <ChartFrame level={2} title={levels ? 'Women at each level' : 'Women in each function'} sub={[yearLabel, source].filter(Boolean).join(' · ')}
      controls={kinds.length > 1 && <Segmented label="Breakdown" value={kind} onChange={setChosen} options={[{ id: 'levels', label: 'Levels' }, { id: 'functions', label: 'Functions' }]} />}
      table={<DataTable caption={levels ? 'Women at each level' : 'Women in each function'} bare rows={rows} rowKey={(r) => String(rows.indexOf(r))} initial={{ key: 'name', dir: 1 }} columns={columns} />}>
      <div className="bars wide-names wrap-names" role="list" aria-label={`${levels ? "Women's share at each level" : "Women's share in each function"}, ${yearLabel}`}>
        {rows.map((r, i) => (
          <div className="bar-row" role="listitem" key={i}
            title={`${labelOf(r)}: ${pct(r.share)} women${r.women != null && r.men != null ? ` (${n0(r.women)} of ${n0(r.women + r.men)})` : ''}`}>
            <div className="name">{labelOf(r)}{scopeOf(r) && <small>{scopeOf(r)}</small>}</div>
            <div className="bar-track">
              {r.share != null && <div className="bar" style={{ width: at(r.share) }} />}
              <div className="ref-mark" style={{ left: at(0.5) }} />
              <div className="bar-val" style={{ left: at(r.share ?? 0) }}>{pct(r.share)}</div>
            </div>
          </div>
        ))}
        <div className="bar-scale" aria-hidden="true">
          <span />
          <div>
            <span>0%</span>
            <span className="parity-label" style={{ left: at(0.5) }}>50% parity</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </ChartFrame>
  )
}

/** Sources lines naming where each set of rows was found. */
export function LevelSources({ y, yearLabel }: { y: CompanyYear; yearLabel: string }) {
  return kindsOf(y).map((k) => {
    const found = [...new Set(y[k]!.map((r) => clause(r.where)).filter(Boolean))]
    return found.length > 0 && <li key={k}><strong>{yearLabel} {k}:</strong> {found.join('; ').replace(/\.$/, '')}.</li>
  })
}
