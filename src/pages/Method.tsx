import { MARKET, SOURCE_DATE, companies } from '../lib/data'

export function Method() {
  const IN = MARKET.IN
  const GB = MARKET.GB
  const LATEST = IN.latest
  const fy = IN.label
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
          <li><strong>Four markets so far, measured differently.</strong> India's figures are shares of total wages; the UK's are shares of hourly pay for UK staff; Australia's are shares of full-time-equivalent pay for Australian staff; Japan's are women's average pay as a share of men's, where parity is 100%. Compare companies within a market, not across. The EU requires gender pay disclosure and is next. The US requires none, so US numbers will be limited to board seats.</li>
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
        <pre className="formula">{`slice           = holding value / market cap
payroll you own = Σ slice × company payroll
women's share   = Σ slice × payroll × women's share of wages
                  ÷ payroll you own

gap to parity   = 50% × payroll you own − wages paid to women
  too few women employed  = Σ slice × payroll × (50% − women's share of permanent staff)
  women paid less         = Σ slice × payroll × (women's share of staff − women's share of wages)`}</pre>
        <p>We rank by the share, never by the rupee gap. A rupee gap rewards companies that employ few people at all.</p>
        <p>UK reports give the mean hourly pay gap and the share of women in each quarter of the pay distribution, not payroll totals. We derive women's share of hourly pay for each employer, then combine a group's employers by size band:</p>
        <pre className="formula">{`women in workforce  f = average of women's share in the four pay quarters
women's share of pay  = f × (1 − mean gap) ÷ (f × (1 − mean gap) + (1 − f))`}</pre>
      </section>

      <section>
        <h2>Where the data comes from</h2>
        <ul className="tight">
          <li><strong>Company data:</strong> Business Responsibility and Sustainability Reports (BRSR), which SEBI requires from India's top 1,000 listed companies. We read the machine-readable XBRL versions published by NSE, {fy(IN.years[0])} to {fy(LATEST)}. Women's share of wages is a BRSR Core field and is assured for the largest companies.</li>
          <li><strong>Market data:</strong> NSE market capitalisation on 30 September 2026 and the latest shareholding patterns.</li>
          <li><strong>UK company data:</strong> the government's gender pay gap service, every reporting year from {GB.years[0]} to {GB.label(GB.latest)}. FTSE 100 membership is as of 1 October 2026.</li>
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

      <section>
        <h2>What this is not</h2>
        <p>This is not an ESG rating and not investment advice. It is arithmetic on figures that companies publish themselves, with every number linked to its source filing.</p>
        <p>Built with The Equal Lens. If you find an error, tell The Equal Lens team and we will correct it.</p>
      </section>
    </>
  )
}
