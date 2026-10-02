---
type: review
title: Legal review for counsel, October 2026
description: The Indian rules Nivel's live pages and planned fund and portfolio features touch (SEBI advice, research, ESG rating, index provider and intermediary rules, NSE's data terms, the DPDP Act), Nivel's position on each, what changed now, and the twelve questions counsel must answer.
date: 2026-10-03
status: awaiting counsel
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c08a5bb0-7bff-4ea0-8ced-6553033f6ecc
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/d0a4b836-049d-4e53-98d6-9bdf266cd884
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a772b178-acfd-4d75-94de-018077b10426
---

# Legal review for counsel, October 2026

Prepared by the team from public sources for counsel. It frames the questions; it is not a legal opinion. Ticket: [PARITY-35][p35]. Plan it unblocks: [Fund and portfolio footprints](../plans/fund-footprints.md).

## Verdict

- **Live site: low risk on advice and research rules.** Free, public, the same for every reader, no buy, sell or hold calls.
- **Act now: NSE's data terms.** The pipeline downloads filings and prices from NSE's website by script. NSE's terms need its written consent for that. Refreshes that call NSE are on hold until consent or a licence is on file ([PARITY-66][p66]).
- **Ask counsel first: ESG rating rules.** SEBI counts rule-based scores and rankings as ESG ratings, labelled or not. Nivel publishes disclosed figures, but the market percentile ranks listed companies, and fund footprints would put a figure on listed ETFs.
- **No partnerships yet.** While the Parity 50 page shows returns, a link, licence or co-branded page would put a smallcase manager, broker or fund house in breach of SEBI's 2024 rule against working with unregistered people who make return claims.
- **Portfolio upload can launch as designed** if counsel confirms that reading a statement only on the reader's device keeps Nivel outside the DPDP Act.

## Feature map

| Feature | Status | Rules | Risk | Next |
|---|---|---|---|---|
| Company pages, index headlines, compare, map | Live | Research analyst exclusions, ESG ratings | Low | None |
| Market percentile (company pages, Companies table) | Live | ESG ratings | Medium | Q3 |
| Parity 50 simulation: holdings, weights, simulated returns | Live | Adviser and research rules, ESG ratings, NSE data | Low to medium | Q4, Q6, Q7 |
| Rebuilt Nifty 50 series and index fund line | Live | NSE data policy, NSE Indices licensing and marks | Medium | Q7, Q8 |
| Data collection from nseindia.com | Pipeline, run by hand | NSE website terms | High | On hold, Q1, Q2 |
| Fund footprints (F-4) | Planned | ESG ratings, adviser rules | Medium | Q5 |
| Portfolio upload, CAS read in the browser (F-5) | Planned | DPDP Act, adviser rules | Low if nothing leaves the device | Q10, Q11 |
| Parity 50 as a smallcase with a registered manager | Idea | Intermediary association rule, education circular, PaRRVA | High as the site stands | Q9 |
| Play and prediction markets | Planned | Online Gaming Act, 2025 | Low as designed | [Gaming Act check](gaming-act-check-2026-10.md) |
| Foreign grants and prizes (MIT Solve) | Planned | FCRA, 2010 | Must clear before any money arrives | Q12, [PARITY-67][p67] |

## 1. Investment advice and research

**The rules**
- **Investment Advisers Regulations, 2013:** advice given through any electronic medium widely available to the public is not investment advice (proviso to regulation 2(1)(l), unchanged by the December 2024 amendments). [IA][ia]
- **Research Analysts Regulations, 2014:** a research report excludes statistical summaries of companies' financial data and discussions of broad-based indices. SEBI's July 2025 FAQs repeat this. [RA][ra]

**Nivel's position**
- Free public website. Every reader sees the same pages. No buy, sell or hold calls, no price targets, nothing personal.
- Company pages summarise each company's own filing. Index pages discuss broad-based indices.
- Disclaimers already live: "Not investment advice" in the footer; "Not an ESG rating and not investment advice" on the Method page; "This index does not exist. Not investable, not advice." on the Parity 50 page.

**Where it could tip**
- **Parity 50:** a named list of 50 stocks with weights and five years of simulated returns. Read with a "how to invest" link, it becomes a model portfolio. Keep it unlinked: no broker, fund or smallcase links, no "invest in" copy.
- **Fund pages (planned):** comparing funds invites "switch" readings. No fund-to-fund suggestions.
- **Portfolio upload (planned):** output is about one reader's holdings. Describing them is not advice; suggesting a replacement is.

## 2. ESG rating providers

**The rule**
- Since July 2023 no one may act as an ESG rating provider without SEBI registration (Credit Rating Agencies Regulations, regulation 28C). [AZB][azb]
- An ESG rating (regulation 28B(1)(b)) is a product marketed as an opinion on a listed issuer's or security's ESG profile, issued on a defined ranking system of rating categories, whether or not it is called a rating. [AZB][azb]
- SEBI's FAQs (January 2025) add that rule-based and algorithmic scores built on a published method count. An Indian provider rating Indian assets for Indian users is in scope (Fourth Schedule). [ERP FAQs][erp]

**Nivel's position**
- Nivel republishes companies' own BRSR figures and does arithmetic on them (shares, ratios, weighted averages), each linked to its filing. That is what IOSCO calls an ESG data product, not a rating. [IOSCO][iosco]
- No grades, stars, scores or labels such as "leader" or "laggard". Badges (Reported, Estimated, Rescaled, Missing) describe the data, not the company.

**Features near the line**
- **Market percentile:** a computed rank of each listed company within its market, on a published method. It is the feature most like a ranking. Options: keep it if counsel calls a percentile of one disclosed figure data; otherwise drop it and keep tables sortable by the reader. The table's # column is only the row number in the reader's chosen sort.
- **Parity 50 bar:** a pass or fail screen on one disclosed figure, for a fictional index offered to no one.
- **"Near parity":** a count of companies on the Parity 50 page, not a label on any one company.
- **Fund footprints (planned):** ETF units are listed securities, so a per-fund figure falls inside the definition's reach if it reads as an opinion. Design guard: figure, coverage and method only; no categories; no "best first" default.

## 3. NSE data and index names

**The rules**
- **NSE website terms:** systematic or automated collection, including scraping and data extraction, needs NSE's express written consent. Its robots file disallows the API paths. [NSE terms][nseterms]
- **NSE data policy:** redistributing derived data outside the organisation, and using market data to create indices, need separate agreements. [NSE data policy][nsepolicy]
- **NSE Indices:** products based on its indices need a licence, and its marks need permission. [Index licensing][nsei]

**What Nivel does**
- Scripts fetch BRSR filings, shareholding and market capitalisation from `www.nseindia.com/api`, and bhavcopy prices, index closes and corporate action files from `nsearchives.nseindia.com` (`pipeline/india/fetch_all.py`, `pipeline/india/shp_all.py`, the NSE fetchers in `pipeline/equal50/`).
- Nivel publishes derived series: the Parity 50 and rebuilt Nifty 50 growth lines and returns.
- Pages name the Nifty 50, Nifty 500 and BSE Sensex to describe what they cover.

**Assessment**
- The collection route is the clearest gap in this review. The filings are public documents companies must file, but NSE's terms govern scripted access to its site, and they carry no carve-out for non-commercial use.
- Derived series may need an agreement even though Nivel computes them itself.
- Naming an index to describe its members is ordinary nominative use; a non-affiliation line makes that explicit.

**Changed now**
- **Refresh hold:** the [data pipeline playbook](../playbooks/data-pipeline.md) and the Parity 50 pipeline README say not to run NSE steps until consent or a licence is recorded ([PARITY-66][p66]). Pages keep the figures already collected until counsel answers Q2.
- **Method page:** "Names and logos" now says index names and logos belong to their owners, are used only to identify them, and that Nivel is not affiliated with any of them.

**Options for consent:** (a) ask NSE for written consent for non-commercial research use; (b) license through NSE's data business or a licensed vendor; (c) read BRSR from companies' own annual reports and prices from a licensed vendor.

## 4. Index provider rules

- The Index Providers Regulations, 2024 apply only to providers of significant indices: those tracked by mutual fund schemes with average assets above ₹20,000 crore in each of the last six months. [SEBI circular][sigidx]
- The Parity 50 is fictional and no fund tracks it, so it is outside. Licensing it to a fund would first need NSE's agreement on index creation (section 3).

## 5. Partnerships with registered entities (the smallcase idea)

**The rules**
- **August 2024 amendment:** SEBI-registered entities and their agents may not associate (for money, referrals or technology) with unregistered people who give advice or make claims about returns or performance. Investor education with neither is exempt. [Legal 500][l500]
- **29 January 2025 circular:** people relying on the education exemption may not use market prices from the last three months. [Business Standard][edu]
- **PaRRVA (pilot since December 2025):** verifies the past performance that advisers, research analysts and algo providers advertise. [Business Standard][parrva]
- A smallcase is managed by a SEBI-registered adviser or research analyst. [smallcase][sc]

**Assessment**
- The Parity 50 page shows five years of simulated returns to September 2026. Any paid, referral or technical tie with a smallcase manager, broker or fund house would put that partner in breach of the 2024 rule while those returns stay up.
- A registered manager could not advertise Nivel's simulated returns, as they are not a verified track record.

**Changed now:** nothing on the site. The team's rule until counsel answers Q9: no partnership with a registered entity, and the Parity 50 stays fictional and unlinked.

## 6. Portfolio upload and the DPDP Act

**The rules**
- The Digital Personal Data Protection Act, 2023 governs data fiduciaries, who decide why and how personal data is processed. It does not apply to an individual processing data for personal or domestic purposes (section 3(c)(i)). The DPDP Rules, 2025 phase in the main duties. [EY][ey]

**The design** ([plan](../plans/fund-footprints.md#personal-portfolios))
- The reader opens their CAMS or KFintech statement in the browser. It is parsed there, and nothing is uploaded, stored or logged. No accounts.

**Assessment:** if nothing reaches Nivel, the reader processes their own statement for a personal purpose. Counsel to confirm that supplying the code does not make Nivel a data fiduciary.

**Build checklist for F-5**
- A content security policy on the upload page with `connect-src 'self'`, so the code cannot send data out.
- No third-party scripts on that page. The site has none today beyond Google Fonts.
- No service worker caching, local storage or error reporting that could hold statement contents.
- The statement password goes only to the PDF reader on the device.
- One plain line: what is read, and that it never leaves the device.

## 7. Accuracy and naming companies

- Pages name companies with low figures. Each figure links to the company's own filing, and a corrections address is on the Method page, which keeps the truth and public-interest position strong.
- Keep the Estimated and Rescaled badges, and no adjectives about companies.

## Outside this review

- **FCRA:** money from MIT Solve or any foreign funder is a foreign contribution. An organisation with a social programme needs FCRA registration or prior permission to accept it. Settle the route before the Solve submission on 2 November 2026 ([PARITY-67][p67], [Solve plan](../plans/mit-solve-application.md)).
- **Prediction markets:** see the [Online Gaming Act check](gaming-act-check-2026-10.md) ([PARITY-51][p51]).

## Questions for counsel

1. **NSE terms:** does scripted download of public filings and archive files from NSE's website breach its terms at low volume? What consent or licence fits a non-commercial NGO?
2. **Collected data:** may Nivel keep publishing figures already collected while consent is sought?
3. **Percentile:** is a within-market percentile of one disclosed figure an ESG rating? Is a table of disclosed figures that readers can sort?
4. **Parity 50 bar:** is a pass or fail screen on one disclosed figure, for a fictional index, an ESG rating?
5. **Fund footprints:** can Nivel publish women's share of the payroll each fund owns, with coverage and method, without registering as an ESG rating provider? Which presentation choices matter?
6. **Advice:** do the Parity 50's named holdings, weights and simulated returns stay within the widely-available-media proviso and the research report exclusions?
7. **Derived data:** does publishing the rebuilt Nifty 50 and Parity 50 series need an NSE derived-data or index-creation agreement?
8. **Names:** is naming the Nifty 50 and BSE Sensex in page titles, with the non-affiliation line, enough?
9. **Partnerships:** what would a link, data licence or co-branded page with a smallcase manager, broker or fund house require of Nivel? Would dropping the returns, or lagging them three months, be enough?
10. **Portfolio upload:** is Nivel a data fiduciary if the statement is read only on the reader's device?
11. **Portfolio output:** is showing readers the women's share of their own holdings advice? Which wording keeps it descriptive?
12. **FCRA:** which route applies to a Solve grant or prize, and how long does it take?

## Sources

- [Investment Advisers Regulations, 2013, consolidated to 25 November 2025 (SEBI)][ia]
- [AZB & Partners: overhaul of the adviser and research analyst framework][azbia]
- [Lakshmikumaran & Sridharan: SEBI's research analyst FAQs, 2025][ra]
- [AZB & Partners: SEBI's framework for ESG rating providers][azb]
- [SEBI: FAQs on ESG rating providers, January 2025][erp]
- [IOSCO: ESG ratings and data products providers, final report][iosco]
- [SEBI: significant indices under the Index Providers Regulations, May 2026][sigidx]
- [NSE: website terms of use][nseterms]
- [NSE: data sharing and usage policy][nsepolicy]
- [NSE Indices: index licensing][nsei]
- [Legal 500: SEBI's restrictions on intermediaries and finfluencers, August 2024][l500]
- [Business Standard: price data rules for market education, January 2025][edu]
- [Business Standard: SEBI launches PaRRVA, December 2025][parrva]
- [smallcase: how smallcases are managed][sc]
- [EY: the DPDP Act, 2023 and the DPDP Rules, 2025][ey]

[p35]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c08a5bb0-7bff-4ea0-8ced-6553033f6ecc
[p51]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0d978739-fe5b-4c6a-967d-fcca1fb16b77
[p66]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/d0a4b836-049d-4e53-98d6-9bdf266cd884
[p67]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a772b178-acfd-4d75-94de-018077b10426
[ia]: https://www.sebi.gov.in/sebi_data/attachdocs/aug-2026/1785912187595.pdf
[azbia]: https://www.azbpartners.com/bank/overhaul-of-the-regulatory-framework-for-investment-advisers-and-research-analysts/
[ra]: https://www.lkslaw.com/insights/articles/key-clarifications-under-the-sebi-issued-faqs-2025
[azb]: https://www.azbpartners.com/bank/sebi-introduces-framework-for-esg-rating-providers/
[erp]: https://www.sebi.gov.in/sebi_data/faqfiles/jan-2025/1737114577492.pdf
[iosco]: https://www.iosco.org/library/pubdocs/pdf/IOSCOPD690.pdf
[sigidx]: https://www.sebi.gov.in/legal/circulars/may-2026/-significant-indices-under-sebi-index-providers-regulations-2024_101271.html
[nseterms]: https://www.nseindia.com/static/nse-terms-of-use
[nsepolicy]: https://nsearchives.nseindia.com/web/sites/default/files/inline-files/NSE_Data_Sharing%26Usage_Policy.pdf
[nsei]: https://niftyindices.com/offerings/index-licensing
[l500]: https://www.legal500.com/developments/thought-leadership/securities-law-update-sebi-imposes-restrictions-on-intermediaries-and-finfluencers/
[edu]: https://www.business-standard.com/markets/news/sebi-finfluencer-circular-live-stock-data-market-education-rules-125013000571_1.html
[parrva]: https://www.business-standard.com/amp/markets/news/sebi-launches-return-verification-framework-parrva-to-curb-fake-performance-claims-125120800842_1.html
[sc]: https://www.smallcase.com/blog/investing-the-smallcase-way/
[ey]: https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/pdf/2025/11/ey-india-dpdp-act-2023-and-rules-2025-pov.pdf
