import { Eq, Frac, Step, Steps } from '../components/Formula'
import { CORRECTIONS_EMAIL, correctionHref } from '../lib/contact'
import { href, usePageTitle } from '../lib/router'
import { MARKET, companies, indexes, sourceDate, useStage } from '../lib/data'
import { inr, pct } from '../lib/format'


const EXAMPLE_OF: [string, string, string, string, string][] = [
  ['GB', 'TSCO', 'mean hourly pay gap and the pay quarters', 'Mean hourly pay gap, UK staff', "E: average of women's share in the four pay quarters"],
  ['AU', 'ASX-WOW', 'full-time-equivalent pay gap and workforce', 'Average total pay gap, full-time equivalent', "E: women's share of the Australian workforce"],
  ['JP', 'TSE-6758', 'pay ratio and regular staff', "W: reported directly as women's pay per 100 of men's", "E: women's share of regular staff"],
  ['EU', 'EU-ADS.DE', 'pay gap (S1-16) and headcount (S1-6)', 'Unadjusted gender pay gap', 'E: women ÷ (women + men), by headcount'],
]
const EXAMPLES = EXAMPLE_OF.flatMap(([code, symbol, inputs, wNote, eNote]) => {
  const c = companies[symbol]
  const y = c?.years[MARKET[code].latest]
  const e = code === 'JP' ? y?.fPerm : y?.fAll
  if (!c || !y || y.gapMean == null || e == null) return []
  const w = 1 - y.gapMean
  return [{ code, name: c.name, inputs, wNote, eNote, gap: y.gapMean, w, e, s: (e * w) / (e * w + 1 - e) }]
})

export function Method() {
  useStage('core')
  useStage('companies')
  usePageTitle('Method')
  const IN = MARKET.IN
  const GB = MARKET.GB
  const LATEST = IN.latest
  const fy = IN.label
  const ny = indexes.nifty50.years[LATEST]
  const all = Object.values(companies).filter((c) => c.country === 'IN')
  const latest = all.map((c) => c.years[LATEST]).filter(Boolean)
  const estimated = latest.filter((y) => y.wKind === 'estimated').length
  const rescaled = latest.filter((y) => y.dq === 2).length
  const missing = all.filter((c) => c.years[LATEST]?.w == null).length
  const basis = all.reduce((n, c) => n + IN.years.filter((k) => c.years[k]?.basisChange).length, 0)
  const uk = Object.values(companies).filter((c) => c.country === 'GB')
  const ukCovered = uk.filter((c) => c.years[GB.latest]).length
  const ukNone = uk.filter((c) => c.noDataReason).length

  return (
    <>
      <section>
        <h1>Method and <span className="accent">limitations</span></h1>
        <p className="lead">Limitations first.</p>
      </section>

      <section>
        <h2>Limitations</h2>
        <ul className="tight">
          <li><strong>One scale, different inputs.</strong> Every headline is women's share of pay (parity 50%). India reports it directly. The UK and Australia start from local hourly and full-time pay gaps, Japan from annual pay ratios, the EU from unadjusted gaps. The US requires no disclosure.</li>
          <li><strong>EU: read by hand, 19 of 50 missing.</strong> Each figure comes from the company's CSRD statement. 12 are excluded (adjusted gap only, partial scope or not material). 7 could not be found: Allianz, SAP, Iberdrola, Mercedes-Benz, AB InBev, Rheinmetall, Prosus. Air Liquide and EssilorLuxottica show 2024. Deutsche Bank, Air Liquide and EssilorLuxottica have no headcount by gender, so no share of pay.</li>
          <li><strong>Japan: one self-reported snapshot.</strong> About a third of the Nikkei 225 publish elsewhere and are missing. Holding companies may cover head-office staff only. Mostly FY2025 (April 2025 to March 2026).</li>
          <li><strong>Australia: one year of workforce data.</strong> Earlier releases are not archived, so FY24 reuses FY25 workforce shares. ASX 200 as of April 2026, matched to WGEA groups by name. New Zealand, offshore and fund members have no Australian report.</li>
          <li><strong>UK: UK staff only.</strong> Global groups like HSBC are measured on their UK employers. {ukNone} FTSE 100 members have no report (investment trusts, or no UK employer of 250+). {ukCovered} have {GB.label(GB.latest)} data.</li>
          <li><strong>UK groups are matched by name.</strong> Reports come from legal employers, so subsidiaries with unrelated names can be missed. Every match is listed on the company page.</li>
          <li><strong>UK pay is hourly.</strong> Women work more part-time, so their share of annual pay is lower. Employers are weighted by size-band midpoints; each FTSE 100 company counts equally.</li>
          <li><strong>Filings contain errors.</strong> In {fy(LATEST)}, {rescaled} companies filed wages in the wrong unit (rescaled), {estimated} needed estimates from median pay, and {missing} have no usable wage data. Each is badged.</li>
          <li><strong>Reporting bases change.</strong> {basis} company-years jumped in payroll, headcount or scope. They stay in trends, not in like-for-like comparisons.</li>
          <li><strong>Contract workers are mostly missing.</strong> BRSR wages cover the company's own payroll. Over 1.3 million contract workers in the Nifty 50 and Next 50 are largely outside it; 5% of them are women.</li>
          <li><strong>Scope differs.</strong> Some file for the parent only (standalone), others for the group (consolidated).</li>
          <li><strong>Ownership uses market cap.</strong> Free float is approximated by public shareholding.</li>
          <li><strong>Index membership is a snapshot,</strong> as of 30 September 2026. The Sensex last changed in December 2025: InterGlobe Aviation replaced Tata Motors Passenger Vehicles.</li>
          <li><strong>Small moves are noise.</strong> Year-on-year changes under 0.5 points are within reporting differences.</li>
        </ul>
      </section>

      <section>
        <h2>What we measure</h2>
        <p>You own a slice of each company in an index, so a slice of its payroll. We attribute payroll the way climate accounting attributes financed emissions (PCAF), then measure the share paid to women.</p>
        <p>Example: ₹10 lakh in a Nifty 50 index fund, {fy(LATEST)} filings.</p>
        <Steps>
          <Step n={1} title="Your slice of each company">
            <p>Your holding divided by the company's market value.</p>
            <Eq lhs="slice" answer={false} steps={[<Frac key="1" top="your holding in the company" bottom="the company's market value" />]} />
          </Step>
          <Step n={2} title="The payroll you own" resultLabel="A year, per ₹10 lakh" result={inr(ny.ownedPayroll ?? 0)}>
            <p>Each company's yearly wage bill times your slice, summed.</p>
            <Eq lhs="payroll you own" steps={['Σ slice × company payroll', inr(ny.ownedPayroll ?? 0)]} />
          </Step>
          <Step n={3} title="How much of it goes to women" resultLabel="Parity is 50%" result={pct(ny.headline)}>
            <p>Each company reports women's share of its wages. Applied to your payroll, it gives the wages paid to women.</p>
            <Eq lhs="women's share" steps={[<Frac key="1" top="wages paid to women" bottom="payroll you own" />, <Frac key="2" top={inr(ny.womenWages ?? 0)} bottom={inr(ny.ownedPayroll ?? 0)} />, pct(ny.headline)]} />
          </Step>
          <Step n={4} title="The gap to parity" resultLabel="A year, per ₹10 lakh" result={inr(ny.gap ?? 0)}>
            <p>At parity, half the payroll you own would go to women.</p>
            <Eq lhs="gap" steps={[`50% × ${inr(ny.ownedPayroll ?? 0)} − ${inr(ny.womenWages ?? 0)}`, inr(ny.gap ?? 0)]} />
            {ny.representationShare != null && ny.payShare != null && <p>{pct(ny.representationShare, 0)} of that gap is too few women employed, and {pct(ny.payShare, 0)} is women paid less on average.</p>}
          </Step>
        </Steps>
        <p style={{ marginTop: 16 }}>We rank by share, not rupee gap: a rupee gap rewards companies that employ few people.</p>
      </section>

      <section>
        <h2>From each market's disclosure to women's share of pay</h2>
        <p>India reports women's share of wages directly. Elsewhere it comes from women's share of staff (E) and women's average pay as a share of men's (W). Examples use real companies' latest figures.</p>
        <Steps>
          <Step n="IN" title="India: reported directly">
            <p>BRSR reports women's share of gross wages, so no conversion. For comparison we also derive E and W (see any Indian company's Calculations tab).</p>
          </Step>
          {EXAMPLES.map((x) => (
            <Step key={x.code} n={x.code} title={`${MARKET[x.code].name}: ${x.inputs}`} resultLabel={x.name} result={pct(x.s)}>
              <Eq label={x.wNote} lhs="W" answer={false} steps={x.code === 'JP' ? [pct(x.w)] : [`100% − ${pct(x.gap)}`, pct(x.w)]} />
              <Eq label={x.eNote} lhs="E" answer={false} steps={[pct(x.e)]} />
              <Eq label="Women's share of pay" lhs="S" steps={[<Frac key="1" top="E × W" bottom="E × W + (100% − E)" />, <Frac key="2" top={`${pct(x.e)} × ${pct(x.w)}`} bottom={`${pct(x.e)} × ${pct(x.w)} + ${pct(1 - x.e)}`} />, pct(x.s)]} />
            </Step>
          ))}
        </Steps>
      </section>

      <section>
        <h2>Where the data comes from</h2>
        <ul className="tight">
          {Object.values(MARKET).flatMap((m) => m.sources.map((x) => (
            <li key={m.code + x.label}><strong>{x.label}:</strong> {x.text.replace('{firstYear}', m.label(m.years[0])).replace('{latestYear}', m.label(m.latest))}</li>
          )))}
          <li><strong>Collected:</strong> {sourceDate()}.</li>
        </ul>
      </section>

      <section>
        <h2>How we clean it</h2>
        <ul className="tight">
          <li><strong>Units:</strong> payroll per head must fall between ₹1.5 lakh and ₹75 lakh a year. Values filed in crore or lakh are rescaled and badged.</li>
          <li><strong>Fixed weights:</strong> each company's index weight uses its median reported payroll across years, so one bad filing cannot swing an index.</li>
          <li><strong>Estimates:</strong> missing wage totals are estimated from median pay and headcount by gender, badged, and never joined to a reported trend.</li>
          <li><strong>Permanent staff:</strong> the workforce share uses permanent staff, as contract wages are not in the totals.</li>
          <li><strong>UK basis changes:</strong> if under 70% of a group's weighted UK employers carry over with the same size band, the pair is not compared like for like.</li>
        </ul>
      </section>

      <section id="compare">
        <h2>How we compare across markets</h2>
        <p>Headlines from different markets aren't directly comparable, so every company is also put on two shared measures.</p>
        <ul className="tight">
          <li><strong>Employment parity (E):</strong> women's share of staff (parity 50%). India: permanent staff. UK, Australia: staff in that country. Japan: regular staff. EU: headcount (S1-6).</li>
          <li><strong>Wage parity (W):</strong> women's average pay as a share of men's (parity 100%). UK: hourly. Australia: full-time equivalent. Japan: annual, all workers. EU: as each company defines it. India: derived from the wage and staff shares, so approximate. Outside 30–130% it is marked not comparable and left out of wage rankings and the map.</li>
          <li><strong>Women's share of pay:</strong> E×W ÷ (E×W + 1 − E). The headline for Japan and the EU. It matches India's reported share and the UK and Australian employer-level figures.</li>
          <li><strong>Market percentile:</strong> wage parity rank within the company's own market.</li>
          <li><strong>Sectors:</strong> exchange labels mapped to 11 shared sectors; mixed Nikkei groups are split company by company.</li>
          <li><strong>Medians:</strong> country and sector comparisons use the median company and the middle half, so extreme filings don't move them.</li>
        </ul>
        <p className="small muted">Pay bases still differ, so small gaps between markets are noise.</p>
      </section>

      <section>
        <h2>Names and logos</h2>
        <p className="small">Index names and logos belong to their owners and are used only to identify them. Nivel is not affiliated with any of them. Without a clear icon, we show initials.</p>
      </section>

      <section>
        <h2>What this is not</h2>
        <p>Not an ESG rating and not investment advice. Arithmetic on companies' own published figures, each linked to its filing.</p>
      </section>

      <section>
        <h2>The same figures, played</h2>
        <p>Spot the Stereotype, The Equal Lens's game, plays these figures as questions. Each one carries its source and rule, and only reported figures covering at least 90% of the payroll go in.</p>
        <p><a className="go" href={href('play')}>Play three</a></p>
      </section>

      <section>
        <h2>Corrections</h2>
        <p>Checked against the filings on {sourceDate()}. Found an error? Email the company and the figure.</p>
        <p><a className="go" href={correctionHref()}>{CORRECTIONS_EMAIL}</a></p>
      </section>
    </>
  )
}
