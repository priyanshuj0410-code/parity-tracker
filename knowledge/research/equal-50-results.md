---
type: research
title: Equal 50 results, version 1
description: Results of the illustrative Equal 50 index built by the pre-registered rules. Two years of point-in-time history against the Nifty 50 and the Sensex, sensitivity checks, a labelled hindsight run, the current 50 companies, and the limits.
status: draft
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a70d73ef-ef84-49bb-9056-73da6eb6cfc6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4ebffad3-e9ba-4398-b3ee-32a958b04bcd
---

# Equal 50 results, version 1

## Status
- **What it is:** an illustrative, fictional index. It is not investable, not investment advice, and not a rating.
- **Where it may appear:** not on Nivel until the legal review (PARITY-35) covers SEBI's index provider, ESG rating and investment adviser rules.
- **Rules:** those in [0005-equal-50-methodology.md](../decisions/0005-equal-50-methodology.md), committed before any return data was collected (commits 7bfdba5, bfad9d6 and 242546b on 2 October 2026), and not changed after.
- **Reproducing it:** code and data steps are in `pipeline/equal50/`, and the full output is `pipeline/equal50/results/result-2026-10-02.json`.

## In one minute
- **Returns:**
  - Over the two years with point-in-time data, October 2024 to September 2026, the Equal 50 returned −10.8% in total, against −10.3% for the Nifty 50 and −12.1% for the Sensex.
  - That is comparable to both: 0.3 points a year behind the Nifty 50 and 0.7 ahead of the Sensex.
- **Risk:** it was more volatile, 18.0% a year against about 14.5%, with a deeper fall (−18.7% at worst).
- **Parity:** the payroll it owns pays women 27.6% (the September 2026 portfolio), against 20.8% for the Nifty 50 and 22.0% for the Sensex.
- **What it cannot show:** two years, both falling markets, cannot separate skill from luck. Nothing here supports a claim that parity companies outperform, only that this portfolio kept pace.

## Why the history starts in October 2024
- **Fiscal 2021-22:** that year's BRSR had no women's share of wages. One company of 474 reported one.
- **Fiscal 2022-23:**
  - Only 59 companies' own filings carry the figure.
  - Those filings reached NSE after September 2023, when companies revised them into the new format.
  - The other 357 values come from the prior-year column of filings made in 2024.
- **The result:** at the September 2022 and September 2023 rebalance dates, no company had a published wage share, so the rules give no portfolio for those years. The first valid portfolio is September 2024.
- **The hindsight run:** a separate, labelled run starts in September 2023 with the later-published values. It is shown below and is not a valid backtest.

## Results, October 2024 to September 2026
| | Equal 50 | Nifty 50 | Sensex |
|---|---|---|---|
| Total return, cumulative | −10.8% | −10.3% | −12.1% |
| Total return, a year | −5.6% | −5.3% | −6.2% |
| Volatility, a year | 18.0% | 14.5% | 14.4% |
| Largest fall | −18.7% | −14.6% | −16.1% |
| October 2024 to September 2025 | −8.5% | −3.6% | −3.7% |
| October 2025 to September 2026 | −2.6% | −6.9% | −8.7% |

- **Against the Nifty 50:** tracking error 6.9% and beta 1.16.
- **Against the Sensex:** tracking error 7.1% and beta 1.16.
- **Price return only:** −13.5%, against −12.4% for the Nifty 50 price index.
- **Benchmark sources:**
  - Nifty 50 total return: the SBI Nifty 50 ETF.
  - Sensex total return: the ICICI Prudential BSE Sensex ETF, followed by ISIN across its 2023 symbol change.
  - Both are net of their small fees. NSE's own close gives the Nifty 50 price index.

## Sensitivity checks
| Version | Cumulative | A year | Against the Nifty 50, a year |
|---|---|---|---|
| Equal 50, by the rules | −10.8% | −5.6% | −0.3 points |
| Equal weights | +2.0% | +1.0% | +6.3 points |
| Parity score only, no fundamentals screens | −11.3% | −5.8% | −0.5 points |
| No industry cap | −10.4% | −5.4% | −0.1 points |

- **The fundamentals screens and the industry cap changed little.**
- **Equal weighting changed a lot.** That points to company size rather than parity: equal weights tilt the index towards its smaller members.
- **This is a description of two years,** not a reason to switch the rules. Any version 2 would be registered before its own results.

## Hindsight run, from September 2023 (not a valid backtest)
- **Data:** this run uses fiscal 2022-23 wage shares that were published only in 2024.
- **Over three years:** +25.7% in total (+7.9% a year), against +19.2% (+6.0% a year) for the Nifty 50.
- **First year, October 2023 to September 2024:** +41.0%, against +32.9% for the Nifty 50 and +29.7% for the Sensex.
- **It is shown because it was registered as a labelled extra.** It is not evidence: the portfolio was picked with information that did not exist on the date it claims.

## The current portfolio, September 2026
- **Size:** 50 companies, from 175 eligible.
- **Industries:**
  - financial services 10; information technology 10;
  - consumer services 7; healthcare 7;
  - consumer goods 4; realty 4;
  - capital goods 3;
  - services 2; consumer durables 2;
  - telecommunication 1.
- **Largest weights:**
  - SBI, Infosys, TCS and Bharti Airtel, each at the 8% cap;
  - then Titan 7.7%, Bharat Electronics 5.5%, Trent 3.5%, Apollo Hospitals 3.4%, Federal Bank 3.1% and Cipla 3.1%.
- **Parity:** weighted by holding, women are 31.0% of permanent staff, and earn 83.1% of what men earn per head.
- **Why companies were left out in 2026** (a company can fail several tests):
  - return on equity 74;
  - size data 68 (most outside the candidate pool);
  - profit 44;
  - interest cover 33;
  - debt 22;
  - revenue 20;
  - equity missing 8;
  - results missing 5.

## How the rules were applied
- **Point in time:**
  - A wage share counts only from the company's own filing for that year, received by NSE by the rebalance date.
  - Values filled from a later filing's prior-year column are not used.
- **Valid values:** the parity score needs a wage share strictly between 0 and 1. A filing outside that range is a filing error, and that company-year is not used.
- **Candidate pool:**
  - Results, corporate actions and shareholding were collected for each year's top 230 companies by parity score.
  - That pool held enough eligible companies to fill 50 places under the industry cap.
  - Any company outside it ranks lower, so the portfolios are the same as running the rules on all 501.
- **Results:** fiscal 2025 and 2026 results come from NSE's integrated filings, SEBI's format since 2025. Earlier years come from NSE's results filings. Both are read by the same extractor.
- **Corporate actions:** splits and bonus issues adjust prices, and dividends are reinvested. No holding period contained a demerger, rights issue or unexplained move over 60%.

## Limits
- **History:**
  - Two years, both falling markets, is too short to judge.
  - The September 2022 and 2023 portfolios could not be built.
- **Survivorship:** the universe is the Nifty 500 of September 2026, so companies that left it earlier are missing. This flatters past results.
- **Data rules:** as recorded in the methodology, including the ETF proxies for benchmarks.
- **Not advice:** past results do not predict future returns. This is not investment advice, not a rating, and not an index licensed for funds.

## Next
- **Legal review** before the index appears anywhere public (PARITY-35).
- **A rebuild each October** with that year's BRSR, extending the history by a year at a time.
- **A version 2,** if wanted, registered in writing before its results.
