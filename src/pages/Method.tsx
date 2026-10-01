import { LATEST, SOURCE_DATE, YEARS, companies } from '../lib/data'
import { fy } from '../lib/format'

export function Method() {
  const all = Object.values(companies)
  const latest = all.map((c) => c.years[LATEST]).filter(Boolean)
  const estimated = latest.filter((y) => y.wKind === 'estimated').length
  const rescaled = latest.filter((y) => y.dq === 2).length
  const missing = all.filter((c) => c.years[LATEST]?.w == null).length
  const basis = all.reduce((n, c) => n + YEARS.filter((k) => c.years[k]?.basisChange).length, 0)

  return (
    <>
      <section>
        <h1>Method and <span className="accent">limitations</span></h1>
        <p className="lead">The limitations come first, because a reader should not have to find them.</p>
      </section>

      <section>
        <h2>Limitations</h2>
        <ul className="tight">
          <li><strong>India only, for now.</strong> The UK, Japan, Australia and the EU require gender pay disclosure and are next. The US requires none, so US numbers will be limited to board seats.</li>
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
      </section>

      <section>
        <h2>Where the data comes from</h2>
        <ul className="tight">
          <li><strong>Company data:</strong> Business Responsibility and Sustainability Reports (BRSR), which SEBI requires from India's top 1,000 listed companies. We read the machine-readable XBRL versions published by NSE, {fy(YEARS[0])} to {fy(LATEST)}. Women's share of wages is a BRSR Core field and is assured for the largest companies.</li>
          <li><strong>Market data:</strong> NSE market capitalisation on 30 September 2026 and the latest shareholding patterns.</li>
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
