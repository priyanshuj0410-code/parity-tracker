import type { ReactNode } from 'react'
import { POINTS, inMarket, marketName, type Point } from '../lib/compare'
import { indexName, indexes, marketOf, yoyChange } from '../lib/data'
import { crore, ordinal, pct } from '../lib/format'
import type { Company, CompanyYear } from '../types'
import { Eq, Frac, Step, Steps } from './Formula'

const n0 = (v: number) => Math.round(v).toLocaleString('en-GB')
const r3 = (v: number) => v.toFixed(3)

function Input({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return <div><dt>{label}</dt><dd>{value}{note && <small>{note}</small>}</dd></div>
}

const SOURCE: Record<string, string> = {
  IN: 'BRSR filing (SEBI), via NSE',
  GB: 'UK gender pay gap service, UK employers combined by size band',
  AU: 'Workplace Gender Equality Agency (WGEA)',
  JP: "Labour ministry's women's advancement database",
  EU: 'CSRD sustainability statement (ESRS S1-16 pay gap, S1-6 headcount)',
}

function Reported({ c, y, year }: { c: Company; y: CompanyYear; year: string }) {
  const m = marketOf(c)
  const items: ReactNode[] = []
  if (c.country === 'IN') {
    items.push(<Input key="w" label="Women's share of gross wages" value={pct(y.w)} note={y.wKind === 'estimated' ? 'Estimated from median pay: no wage total filed' : `${m.label(year)}, as filed`} />)
    if (y.permHeadcount && y.fPerm != null) items.push(<Input key="h" label="Permanent staff" value={n0(y.permHeadcount)} note={`about ${n0(y.permHeadcount * y.fPerm)} women`} />)
    else items.push(<Input key="f" label="Women in permanent staff" value={pct(y.fPerm)} />)
    if (y.payrollCr) items.push(<Input key="p" label="Total wages" value={crore(y.payrollCr)} />)
    if (y.board) items.push(<Input key="b" label="Board" value={`${y.boardWomen} of ${y.board}`} note="women directors" />)
  } else if (c.country === 'GB' || c.country === 'AU') {
    items.push(<Input key="g" label={c.country === 'GB' ? 'Mean hourly pay gap' : 'Average total pay gap (full-time equivalent)'} value={pct(y.gapMean)} note="men's average minus women's, as a share of men's" />)
    items.push(<Input key="f" label={c.country === 'GB' ? "Women's share of the four pay quarters (average)" : 'Women in Australian workforce'} value={pct(y.fAll)} />)
    if (y.topQuartile != null) items.push(<Input key="t" label="Women in the top pay quarter" value={pct(y.topQuartile)} />)
    if (c.country === 'GB' && y.entityCount) items.push(<Input key="e" label="UK employers combined" value={y.entityCount} />)
    if (c.country === 'AU' && y.headcount) items.push(<Input key="h" label="Australian headcount" value={n0(y.headcount)} />)
  } else if (c.country === 'JP') {
    items.push(<Input key="r" label="Women's pay as a share of men's" value={pct(y.gapMean == null ? null : 1 - y.gapMean)} note="all workers" />)
    items.push(<Input key="rr" label="Regular and non-regular staff" value={`${pct(y.ratioRegular, 0)} · ${pct(y.ratioNonRegular, 0)}`} />)
    items.push(<Input key="f" label="Women in regular staff" value={pct(y.fPerm)} note={y.fPerm == null ? 'not disclosed' : undefined} />)
  } else {
    items.push(<Input key="g" label="Unadjusted gender pay gap" value={pct(y.gapMean)} note={c.entities?.[0]?.size} />)
    if (y.headcountWomen != null && y.headcountMen != null) {
      items.push(<Input key="w" label="Women (headcount)" value={n0(y.headcountWomen)} />)
      items.push(<Input key="m" label="Men (headcount)" value={n0(y.headcountMen)} />)
    } else items.push(<Input key="f" label="Women in workforce" value={pct(y.fAll)} note={y.fAll == null ? 'not located in the statement' : 'reported as a share'} />)
  }
  return <dl className="inputs">{items}</dl>
}

export function Calculations({ c, pt }: { c: Company; pt?: Point }) {
  const m = marketOf(c)
  const desc = [...m.years].reverse()
  const year = pt?.year ?? desc.find((k) => c.years[k]) ?? m.latest
  const y = c.years[year]
  if (!y) return <section><p className="small muted">No reported figures to work from.</p></section>
  const E = pt?.e ?? null
  const W = pt?.w ?? null
  const S = pt?.s ?? null
  const peers = POINTS.filter((p) => p.c.country === c.country)
  const below = pt ? peers.filter((p) => (p.w as number) < (pt.w as number)).length : 0
  const ties = pt ? peers.filter((p) => p.w === pt.w).length : 0
  const prev = m.years[m.years.indexOf(year) - 1]
  const change = prev ? yoyChange(c, year, prev) : null
  const firstIndex = c.indexes.map((id) => indexes[id]).find(Boolean)
  const weight = firstIndex?.constituents.find((k) => k.symbol === c.symbol)?.weight ?? null
  let n = 0

  return (
    <>
      <section>
        <h2>What {c.name} reported</h2>
        <p className="small muted">{SOURCE[c.country]}, {m.label(year) === 'latest' ? 'latest disclosure' : m.label(year)}. Every other number on this page is worked out from these.</p>
        <Reported c={c} y={y} year={year} />
      </section>

      <section>
        <h2>How we get from there to our numbers</h2>
        <Steps>
          <Step n={++n} title="Employment parity: women's share of staff" resultLabel="Parity is 50%" result={pct(E)}>
            {c.country === 'IN' && y.permHeadcount && y.fPerm != null ? (
              <><p>Women as a share of permanent staff. Contract workers are left out because their wages are not in the wage total.</p>
                <Eq lhs="E" steps={[<Frac key="1" top="women" bottom="permanent staff" />, <Frac key="2" top={n0(y.permHeadcount * y.fPerm)} bottom={n0(y.permHeadcount)} />, pct(E)]} /></>
            ) : c.country === 'EU' && y.headcountWomen != null && y.headcountMen != null ? (
              <><p>Women as a share of employees who are recorded as women or men.</p>
                <Eq lhs="E" steps={[<Frac key="1" top="women" bottom="women + men" />, <Frac key="2" top={n0(y.headcountWomen)} bottom={`${n0(y.headcountWomen)} + ${n0(y.headcountMen)}`} />, pct(E)]} /></>
            ) : c.country === 'GB' ? (
              <p>Each pay quarter holds a quarter of the staff, so the average of women's share across the four quarters is women's share of the whole workforce: <strong>{pct(E)}</strong>.</p>
            ) : (
              <p>{E == null ? 'Not disclosed, so the next steps cannot be completed.' : <>Reported directly as <strong>{pct(E)}</strong>{c.country === 'JP' ? ' of regular staff' : ''}.</>}</p>
            )}
          </Step>

          <Step n={++n} title="Wage parity: women's average pay as a share of men's" resultLabel="Parity is 100%" result={pct(W)}>
            {c.country === 'IN' && y.w != null && E != null && W != null ? (
              <><p>BRSR gives women's share of the wage bill, not average pay, so we compare each group's share of wages with its share of staff.</p>
                <Eq label="Women's pay per head, relative" answer={false} lhs={<Frac top="share of wages" bottom="share of staff" />} steps={[<Frac key="1" top={pct(y.w)} bottom={pct(E)} />, r3(y.w / E)]} />
                <Eq label="Men's pay per head, relative" answer={false} lhs={<Frac top={pct(1 - y.w)} bottom={pct(1 - E)} />} steps={[r3((1 - y.w) / (1 - E))]} />
                <Eq label="Wage parity" lhs="W" steps={[<Frac key="1" top={r3(y.w / E)} bottom={r3((1 - y.w) / (1 - E))} />, pct(W)]} />
                <p className="small muted">Approximate: wage totals cover all employees while the staff share is permanent staff only.</p></>
            ) : c.country === 'JP' ? (
              <p>Reported directly: women's average annual pay is <strong>{pct(W)}</strong> of men's, across all workers.</p>
            ) : y.gapMean != null ? (
              <><p>A pay gap is the shortfall in women's average pay, so wage parity is what is left.</p>
                <Eq lhs="W" steps={[`100% − ${pct(y.gapMean)}`, pct(W)]} /></>
            ) : <p>No pay gap reported.</p>}
          </Step>

          <Step n={++n} title="Women's share of pay" resultLabel="Parity is 50%" result={pct(S)}>
            {E != null && W != null && S != null ? (
              <><p>If women are E of staff and earn W of what men earn on average, this is their share of the whole pay bill.</p>
                <Eq lhs="S" steps={[<Frac key="1" top="E × W" bottom="E × W + (100% − E)" />, <Frac key="2" top={`${pct(E)} × ${pct(W)}`} bottom={`${pct(E)} × ${pct(W)} + ${pct(1 - E)}`} />, <Frac key="3" top={pct(E * W)} bottom={pct(E * W + 1 - E)} />, pct(S)]} />
                {c.country === 'IN' && <p className="small muted">This matches the reported wage share, as it should: steps 1 and 2 only unpack it.</p>}
                {c.country === 'GB' && y.w != null && Math.abs(y.w - S) >= 0.0005 && <p className="small muted">The FTSE 100 figure uses {pct(y.w)}, worked out employer by employer and combined by size band, which differs slightly from this one-step version.</p>}</>
            ) : <p>Needs both of the numbers above.</p>}
          </Step>

          {pt && (
            <Step n={++n} title={`Rank among companies ${inMarket(c.country)}`} resultLabel="Market percentile" result={ordinal(Math.round(((below + ties / 2) / peers.length) * 100))}>
              <p>Wage parity is measured differently in each market, so we rank only against companies measured the same way: those with lower wage parity, plus half of those level with it (this company included).</p>
              <Eq lhs={<Frac top={`${below} + ${ties === 1 ? '½' : `${ties} ÷ 2`}`} bottom={`${peers.length} companies`} />} steps={[pct((below + ties / 2) / peers.length, 0)]} />
            </Step>
          )}

          {change != null && prev && (
            <Step n={++n} title={`Change since ${m.label(prev)}`} resultLabel="Like for like" result={`${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change * 100).toFixed(1)} pp`}>
              <p>Women's share of pay this year minus last year, counted only when both years were reported on the same basis.</p>
              <Eq lhs={`${pct(c.years[year].w)} − ${pct(c.years[prev].w)}`} steps={[`${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change * 100).toFixed(1)} percentage points`]} />
            </Step>
          )}

          {firstIndex && (
            <Step n={++n} title={`How it counts in the ${indexName(firstIndex.id)}`} result={weight != null ? pct(weight) : 'equal'} resultLabel="Weight">
              <p>{c.country === 'IN'
                ? `An index investor owns each company in proportion to its free-float market value. Its payroll counts towards the index figure with that weight${c.payrollWeightCr ? `, using a payroll of ${crore(c.payrollWeightCr)} (${c.payrollWeightBasis})` : ''}.`
                : c.country === 'AU'
                  ? 'The ASX 200 figure weights each company by its Australian payroll: group headcount times average pay.'
                  : `Each company counts equally in the ${marketName(c.country)} average, because these reports give no payroll totals to weight by.`}</p>
            </Step>
          )}
        </Steps>
      </section>

      {(y.note || y.basisChange || y.wKind === 'estimated' || y.dq === 2) && (
        <section>
          <h2>Checks on this filing</h2>
          <ul className="tight">
            {y.wKind === 'estimated' && <li><strong>Estimated:</strong> no wage total was filed, so women's share of wages was estimated from median pay by gender and headcount.</li>}
            {y.dq === 2 && <li><strong>Rescaled:</strong> the filing used the wrong unit for wages, so we rescaled it.</li>}
            {y.basisChange && <li><strong>Basis changed:</strong> payroll, headcount or reporting scope jumped from the year before, so this year is left out of like-for-like changes.</li>}
            {y.note && y.note !== 'reported' && <li><strong>Note:</strong> {y.note}.</li>}
          </ul>
        </section>
      )}
    </>
  )
}
