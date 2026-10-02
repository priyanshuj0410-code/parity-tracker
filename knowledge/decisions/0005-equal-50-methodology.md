---
type: decision
title: Equal 50 index methodology, version 1
description: Pre-registered rules for the Equal 50, an illustrative index of 50 large Indian companies with the highest employment and wage parity that pass corporate finance quality screens, built point in time and compared with the Nifty 50 and the Sensex.
status: accepted
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a70d73ef-ef84-49bb-9056-73da6eb6cfc6
---

# Equal 50 index methodology, version 1

## Status
- **Illustrative only.** This is a fictional index. It is not investable, not investment advice, not an ESG rating, and not an index licensed for use by any fund.
- **Pre-registered.** These rules were written and committed on 2 October 2026, before any return data was collected. They are not changed after seeing results. A change means a version 2 with its own date, and version 1's results stay published.
- **Not shown on Nivel** until the legal review (PARITY-35) covers SEBI's index provider rules, its ESG rating rules and investment adviser rules.

## Purpose
To show whether large Indian companies with the highest employment and wage parity, screened on corporate finance fundamentals, have kept pace with the Nifty 50 and the Sensex.

## Universe
- **Membership:** companies in the Nifty 500 on 30 September 2026.
- **Survivorship:** companies that left the Nifty 500 before that date are absent from earlier portfolios. This flatters past results, and is reported as a limit.

## Rebalance dates
- **When:** the last trading day of September in 2022, 2023, 2024, 2025 and 2026.
- **Why September:** listed companies publish BRSR with their annual reports, so by then most have filed for the fiscal year that ended in March.
- **The September 2026 portfolio** is the current composition and has no performance yet.

## Point-in-time data
At each rebalance date, only data published before that date is used:
- **Parity:** the BRSR for the fiscal year that ended the previous March, submitted to NSE on or before the rebalance date.
- **Fundamentals:** audited annual results for the last three fiscal years, broadcast on or before the rebalance date. Consolidated figures are used where filed, otherwise standalone.
- **Size:** market capitalisation from NSE's market capitalisation file on the rebalance date. Free float is the public shareholding in the latest quarterly shareholding pattern ended before the rebalance date.

## Eligibility
A company is eligible only if every test it faces holds.

**Data:**
1. Women's share of gross wages is reported in BRSR, not estimated.
2. Women's share of permanent employees is reported.

**Scale:**

3. At least 1,000 permanent employees, so that parity describes a real workforce.
4. Free-float market capitalisation of at least ₹2,000 crore.

**Profitability:**

5. Positive net profit in each of the last two fiscal years.
6. Return on equity of at least 10% in the latest fiscal year: net profit divided by the average of total equity at the last two year-ends.

**Growth:**

7. Revenue from operations in the latest fiscal year no lower than two years earlier. For banks and other lenders, total income stands in for revenue.

**Balance sheet (not applied to banks, lenders and insurers):**

8. Total borrowings no more than total equity, so debt to equity is at most 1.0.
9. Interest cover of at least 3, where finance costs are above zero: profit before tax plus finance costs, divided by finance costs.

## The parity score
- **E** is women's share of permanent employees.
- **W** is women's average pay as a share of men's: (w ÷ E) ÷ ((1 − w) ÷ (1 − E)), where w is women's share of gross wages. These are Nivel's shared scales ([0001](0001-comparable-parity-measures.md)).
- **Employment balance:** b_E = min(E, 1 − E) ÷ 0.5. It is 1 at parity and 0 when the workforce is all one gender.
- **Wage balance:** b_W = min(W, 1 ÷ W). It is 1 at parity.
- **Parity score:** P = √(b_E × b_W).
  - It is high only when both employment and pay are balanced.
  - It is symmetric: a workforce that is 90% women is no more equal than one that is 90% men.

## Selection
1. **Rank** eligible companies by P, breaking ties by larger free-float market capitalisation.
2. **Take the top 50,** with no more than 10 from any one industry. Industries follow NSE's classification in the Nifty 500 list.
3. **If fewer than 50 are eligible,** the index holds every eligible company and says how many.

## Weighting
- **Base weight:** free-float market capitalisation.
- **Caps:** 8% for any one company and 30% for any one industry. The excess is redistributed in proportion until both caps hold.
- **Between rebalances,** weights drift with prices.

## Returns
- **Total return** in rupees, from month-end closing prices on NSE's daily files:
  - prices are adjusted for splits and bonus issues;
  - cash dividends are reinvested at the month-end after the ex-date.
- **Price return** is reported as well.
- **Not adjusted in version 1:** rights issues, demergers and schemes of arrangement.
  - Any holding period that contains one is flagged.
  - The results are reported with and without those periods.
- **Benchmarks:** the Nifty 50 and the Sensex, as total return indexes where available and otherwise as price indexes, on the same month-end dates. The report says which was used.

## Data rules, set on 2 October 2026 before any result
These were found while collecting the data, before any portfolio or return was computed.
- **Equity:**
  - Year-end total equity comes from the balance sheet where the filing tags it.
  - Annual results filed before about 2023, and some banks' later ones, carry no machine-readable balance sheet. For those, equity is paid-up equity capital plus reserves excluding revaluation reserves, as the results report them. Where both exist, the two agree.
- **Average equity:** where the earlier year-end equity is unavailable, the latest year-end alone is used.
- **Borrowings:** where no balance sheet is filed, test 8 (debt to equity) cannot be applied, so test 9 (interest cover) stands alone.
- **Market capitalisation in 2022 and 2023:** NSE's archive has no market capitalisation file for those dates.
  - It is calculated as the month-end close times shares outstanding.
  - Shares are taken from the September 2024 file, adjusted for splits and bonus issues in between.
  - New issues of shares in between are not captured.
- **Free float:** public shareholding from the latest quarterly shareholding pattern on or before the quarter ended June of the rebalance year.
- **Benchmarks:**
  - Neither niftyindices.com nor BSE serves its total return index to automated requests.
  - Total returns are therefore proxied by the largest growth-option ETF on NSE tracking each index. Those returns are net of the ETF's small fee.
  - The Nifty 50 price return uses NSE's own index close.
  - **Nifty 50 total return:** the SBI Nifty 50 ETF (SETFNIF50).
  - **Sensex total return:** the ICICI Prudential BSE Sensex ETF (ISIN INF346A01034).
    - It is followed by its ISIN, because its NSE symbol changed from ICICISENSX to SENSEXIETF in December 2023.
    - UTI's Sensex ETF gives the same four-year growth to within 0.1%.
    - No Sensex price index could be fetched: BSE refused automated requests.
- **Revenue test (7):** where the fiscal year two years back is not available by the rebalance date, the latest year is compared with the year before it.
- **Missing results:** a company without audited annual results for the latest two fiscal years, broadcast by the rebalance date, is not eligible.

## Reported, whatever it shows
- Cumulative and annualised return, and each period's return.
- Annualised volatility from monthly returns.
- Maximum drawdown.
- Tracking error and beta against each benchmark.
- The index's women's share of the payroll it owns, beside each benchmark's.
- **Sensitivity checks:**
  - equal weights instead of market-cap weights;
  - the parity score alone, without the fundamentals screens;
  - no industry cap.

## Limits stated with the results
- **History:**
  - Four years of history is too short to separate skill from luck or from sector swings.
  - BRSR was voluntary for fiscal 2021-22, so the 2022 portfolio rests on fewer filers.
- **Survivorship:** the bias described under Universe.
- **Corporate actions:** those not adjusted in version 1.
- **Past results do not predict future returns.**
- **What it is not:** this is not investment advice, not a rating, and not an index licensed for funds.
