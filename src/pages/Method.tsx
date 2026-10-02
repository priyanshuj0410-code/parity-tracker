import { Eq, Frac, Step, Steps } from '../components/Formula'
import { MARKET, SOURCE_DATE, companies, indexes } from '../lib/data'
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
        <p className="lead">The limitations come first, because a reader should not have to find them.</p>
      </section>

      <section>
        <h2>Limitations</h2>
        <ul className="tight">
          <li><strong>Five markets, one scale, different inputs.</strong> Every headline is women's share of pay, where parity is 50%. India reports it as a share of total wages. The UK and Australia start from hourly and full-time-equivalent pay gaps for local staff. Japan starts from annual pay ratios and regular staff, and the EU from unadjusted gaps and headcount. Read differences of a few points between markets as noise. The US requires no gender pay disclosure, so US numbers will be limited to board seats.</li>
          <li><strong>The EU is read by hand, and 19 of 50 are missing.</strong> There is no central database yet, so each figure was read from the company's own CSRD sustainability statement and linked. 12 companies are excluded for stated reasons (only an adjusted gap, a partial scope, or the gap assessed as not material) and 7 could not be reached or located (Allianz, SAP, Iberdrola, Mercedes-Benz, AB InBev, Rheinmetall, Prosus). Air Liquide and EssilorLuxottica show 2024 because their 2025 statements were not yet in the public filings repository. Headcount by gender (ESRS S1-6) comes from the same statements; it was not found for Deutsche Bank, Air Liquide or EssilorLuxottica, which show a pay gap but no share of pay.</li>
          <li><strong>Japan is one snapshot of listed companies' own staff.</strong> Figures come from the labour ministry's open database, which companies fill in themselves; about a third of Nikkei 225 members publish elsewhere and are missing. For holding companies the figures can cover only head-office staff. Most periods are FY2025 (April 2025 to March 2026).</li>
          <li><strong>Australia has one year of workforce data.</strong> The regulator's spreadsheet is replaced each year and earlier versions are not archived, so FY24 values reuse each company's FY25 workforce share and show only the pay gap's movement. ASX 200 membership is as of April 2026, matched to WGEA groups by name; New Zealand, offshore and fund members have no Australian report.</li>
          <li><strong>UK figures cover UK staff only.</strong> A global group like HSBC or Unilever is measured on its UK employers, not its worldwide workforce. {ukNone} FTSE 100 members have no UK report: investment trusts with no staff, or groups with no UK employer of 250 or more people. {ukCovered} have data for {GB.label(GB.latest)}.</li>
          <li><strong>UK groups are matched to their employers by name.</strong> Reports are filed by legal employers, not listed groups, so we match subsidiaries by name and list every match on the company page. Some subsidiaries with unrelated names will be missed.</li>
          <li><strong>UK pay is hourly.</strong> Women do more part-time work, so their share of annual pay is lower than their share of hourly pay. Size bands are coarse, so employers are weighted by band midpoints and the FTSE 100 figure counts each company equally.</li>
          <li><strong>Company filings contain errors.</strong> In {fy(LATEST)}, {rescaled} companies filed wages in the wrong unit (we rescaled them), {estimated} needed estimates from median pay, and {missing} have no usable wage data. Each one is badged.</li>
          <li><strong>Reporting bases change.</strong> We found {basis} company-years where payroll, headcount or reporting scope jumped. They stay in company trajectories but are left out of like-for-like comparisons.</li>
          <li><strong>Contract workers are mostly invisible.</strong> BRSR wages cover people on the company's own payroll. Over 1.3 million contract workers across the Nifty 50 and Nifty Next 50 are largely outside the wage figures, and about 5% of them are women.</li>
          <li><strong>Scope differs by company.</strong> Some file for the parent company only (standalone), others for the whole group (consolidated). Standalone filings leave out subsidiaries' payroll.</li>
          <li><strong>Ownership uses market cap, not enterprise value.</strong> Free float is approximated by public shareholding, not the index providers' exact factors.</li>
          <li><strong>Index membership is a snapshot.</strong> Constituents are as of 30 September 2026. The June 2026 Sensex rebalance (reported in advance as Trent out, Hindalco in) is not yet reflected.</li>
          <li><strong>One year of change is noisy.</strong> Year-on-year moves under half a percentage point are within the range of reporting differences.</li>
        </ul>
      </section>

      <section>
        <h2>What we measure</h2>
        <p>An index investor owns a slice of each company. We attribute each company's payroll to the investor in proportion to that slice, the same way climate accounting attributes financed emissions (the PCAF method), then ask how much of the owned payroll is paid to women.</p>
        <p>The worked example is ₹10 lakh in a Nifty 50 index fund, using {fy(LATEST)} filings.</p>
        <Steps>
          <Step n={1} title="Your slice of each company">
            <p>An index fund holds every company in proportion to its free-float market value, so your slice of a company is your holding divided by its value.</p>
            <Eq lhs="slice" answer={false} steps={[<Frac key="1" top="your holding in the company" bottom="the company's market value" />]} />
          </Step>
          <Step n={2} title="The payroll you own" resultLabel="A year, per ₹10 lakh" result={inr(ny.ownedPayroll ?? 0)}>
            <p>Each company's yearly wage bill, times your slice of it, added up across the index.</p>
            <Eq lhs="payroll you own" steps={['Σ slice × company payroll', inr(ny.ownedPayroll ?? 0)]} />
          </Step>
          <Step n={3} title="How much of it goes to women" resultLabel="Parity is 50%" result={pct(ny.headline)}>
            <p>Every company reports women's share of its wages. Applied to the payroll you own, that gives the wages paid to women.</p>
            <Eq lhs="women's share" steps={[<Frac key="1" top="wages paid to women" bottom="payroll you own" />, <Frac key="2" top={inr(ny.womenWages ?? 0)} bottom={inr(ny.ownedPayroll ?? 0)} />, pct(ny.headline)]} />
          </Step>
          <Step n={4} title="The gap to parity" resultLabel="A year, per ₹10 lakh" result={inr(ny.gap ?? 0)}>
            <p>At parity, half the payroll you own would go to women.</p>
            <Eq lhs="gap" steps={[`50% × ${inr(ny.ownedPayroll ?? 0)} − ${inr(ny.womenWages ?? 0)}`, inr(ny.gap ?? 0)]} />
            {ny.representationShare != null && ny.payShare != null && <p>{pct(ny.representationShare, 0)} of that gap is too few women employed, and {pct(ny.payShare, 0)} is women paid less on average.</p>}
          </Step>
        </Steps>
        <p style={{ marginTop: 16 }}>We rank by the share, never by the rupee gap. A rupee gap rewards companies that employ few people at all.</p>
      </section>

      <section>
        <h2>From each market's disclosure to women's share of pay</h2>
        <p>Only India reports women's share of wages directly. Everywhere else we work it out from two numbers each company does report: women's share of staff (E) and women's average pay as a share of men's (W). Each example uses a real company's latest figures.</p>
        <Steps>
          <Step n="IN" title="India: reported directly">
            <p>BRSR asks for gross wages paid to women as a share of all wages, so the headline needs no conversion. To compare with other markets, we also derive E from permanent staff and W from the two shares (see any Indian company's calculations tab).</p>
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
          <li><strong>Company data:</strong> Business Responsibility and Sustainability Reports (BRSR), which SEBI requires from India's top 1,000 listed companies. We read the machine-readable XBRL versions published by NSE, {fy(IN.years[0])} to {fy(LATEST)}. Women's share of wages is a BRSR Core field and is assured for the largest companies.</li>
          <li><strong>Market data:</strong> NSE market capitalisation on 30 September 2026 and the latest shareholding patterns.</li>
          <li><strong>UK company data:</strong> the government's gender pay gap service, every reporting year from {GB.years[0]} to {GB.label(GB.latest)}. FTSE 100 membership is as of 1 October 2026.</li>
          <li><strong>EU company data:</strong> unadjusted gender pay gaps (ESRS S1-16) and headcount by gender (S1-6) from CSRD sustainability statements, via the filings.xbrl.org ESEF repository for French, Dutch and Italian filers and the companies' own report PDFs or pages for the rest. Euro Stoxx 50 membership is as of September 2025.</li>
          <li><strong>Japanese company data:</strong> the Ministry of Health, Labour and Welfare's women's advancement database open data (downloaded 2 October 2026), joined to Nikkei 225 members (as of April 2026) by securities code.</li>
          <li><strong>Australian company data:</strong> the Workplace Gender Equality Agency's employer gender pay gaps spreadsheet (2024-25 results, with 2023-24 gaps). Corporate-group results are used where a group reports, with exact headcounts and average remuneration to weight the ASX 200 figure.</li>
          <li><strong>Collected:</strong> {SOURCE_DATE}.</li>
        </ul>
      </section>

      <section>
        <h2>How we clean it</h2>
        <ul className="tight">
          <li><strong>Units:</strong> payroll per head must fall between ₹1.5 lakh and ₹75 lakh a year. Values filed in crore or lakh are rescaled and badged.</li>
          <li><strong>Fixed weights:</strong> each company's index weight uses its median reported payroll across years, so one bad filing cannot swing an index.</li>
          <li><strong>Reported vs estimated:</strong> where wage totals are missing we estimate from median pay by gender and headcount, mark the value as estimated, and never join it to a reported trend.</li>
          <li><strong>Permanent staff:</strong> the workforce share uses permanent employees and workers, because contract workers' wages are not in the wage totals.</li>
          <li><strong>UK basis changes:</strong> if fewer than 70% of a group's weighted UK employers carry over between two years with the same size band, in either direction, the pair is left out of like-for-like comparisons.</li>
        </ul>
      </section>

      <section id="compare">
        <h2>How we compare across markets</h2>
        <p>Each market's law asks for different numbers, so a headline from one market cannot be read against another's. We convert what every company reports into two shared measures.</p>
        <ul className="tight">
          <li><strong>Employment parity (E):</strong> women's share of staff. Parity is 50%. India: permanent staff. UK and Australia: all staff in that country. Japan: regular staff, from the same government database. EU: employees by headcount, from ESRS S1-6.</li>
          <li><strong>Wage parity (W):</strong> women's average pay as a share of men's. Parity is 100%. UK: mean hourly pay. Australia: mean full-time-equivalent pay. Japan: mean annual pay of all workers. EU: the unadjusted gap as each company defines it. India: derived from the wage share and the share of permanent staff, so it is approximate.</li>
          <li><strong>Women's share of pay:</strong> implied by the two, E×W ÷ (E×W + 1 − E). This is the headline for Japan and the EU. For India it equals the reported share, and for the UK and Australia it closely matches the employer-level calculation.</li>
          <li><strong>Market percentile:</strong> where a company's wage parity sits among companies in its own market. Percentiles compare fairly across markets because each company is measured on its own market's basis.</li>
          <li><strong>Sectors:</strong> each exchange's own labels are mapped to 11 shared, GICS-style sectors. Nikkei groups that mix sectors (electric machinery, precision instruments, services) are split company by company.</li>
          <li><strong>Medians, not averages:</strong> country and sector comparisons use the median company and show the middle half of companies, so a few extreme filings do not move them.</li>
        </ul>
        <p className="small muted">Bases still differ: hourly against annual pay, part-time staff in or out. Treat differences of a few points between markets as noise, and use the parity map and percentiles rather than raw cross-market rankings.</p>
      </section>

      <section>
        <h2>Logos</h2>
        <p className="small">Company logos are trademarks of their owners and are shown only to identify each company. They come from each company's own website icon. Where no clear icon exists, we show the company's initials instead.</p>
      </section>

      <section>
        <h2>What this is not</h2>
        <p>This is not an ESG rating and not investment advice. It is arithmetic on figures that companies publish themselves, with every number linked to its source filing.</p>
        <p>Built with The Equal Lens. If you find an error, tell The Equal Lens team and we will correct it.</p>
      </section>
    </>
  )
}
