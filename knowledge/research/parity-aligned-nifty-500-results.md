---
type: research
title: Parity-Aligned Nifty 500 results, version 1
description: An illustrative index that keeps the Nifty 500's sectors and tracks it within about 1% a year while owning a payroll that is 27% women's instead of 19%. Why exact parity cannot represent the market today, the backtest against the parent, sensitivities, and the glide path.
status: draft
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a70d73ef-ef84-49bb-9056-73da6eb6cfc6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4ebffad3-e9ba-4398-b3ee-32a958b04bcd
---

# Parity-Aligned Nifty 500 results, version 1

## Status
- **What it is:** illustrative, not investable, not advice, not a rating.
- **Where it may appear:** not on Nivel until the legal review (PARITY-35).
- **Rules:** [0006-parity-aligned-nifty-500.md](../decisions/0006-parity-aligned-nifty-500.md), committed (35ceed6) before any of its returns were computed.
- **Reproducing it:** code is in `pipeline/equal50/pa500.py` and `parity_frontier.py`, and outputs in `pipeline/equal50/results/`.
- **Proposal:** this replaces the [Equal 50](equal-50-results.md) as the index to propose. The Equal 50 picks 50 companies; this one represents the market. The [Parity 50](parity-50-results.md) is its 50-stock version, sized for a model portfolio.
- **Corrected on 2 October 2026:** demerged shares and rights issues are now valued, and renamed companies are followed by ISIN. The first figures were −7.0% against −6.9%, with tracking error 1.1%. The method is set out in the [Parity 50 results](parity-50-results.md#correction-after-the-first-run).

## In one minute
- **Parity:**
  - The index owns a payroll that is 27.2% women's (September 2026), against 19.3% for the Nifty 500 at market weights.
  - Women are 32.7% of the staff it owns, against 22.8%.
- **It represents the market:**
  - every sector at exactly its market weight;
  - 80% of the portfolio identical to the market;
  - tracking error 1.0% a year;
  - beta 1.01.
- **It earned what the market earned:** −6.5% from October 2024 to September 2026, against −6.3% for the Nifty 500 at market weights.
- **It is not at parity.** No index that represents the Indian market can be today, because the companies employ too few women. The index closes about a quarter of the gap. The glide path and the list of companies holding the gap are how the rest gets closed.

## Why exact parity cannot represent the market
- **The starting point:** at market weights, women are 23% of the staff the Nifty 500 owns and get 19.5% of its payroll (2025-26 data).
- **What reweighting can reach** (an optimiser held the market's sector weights and kept each stock within five times its market weight):

| Women's share of owned payroll | Active share needed | Women's share of owned staff |
|---|---|---|
| 19.5% (market weights) | 0% | 23% |
| 25% | 9% | 29% |
| 27% | 19% | 33% |
| 28% | 31% | 35% |
| 29% | 52% | 38% |
| 50% | not reachable | not reachable |

- **The flagship indexes:**
  - The Nifty 50 and Nifty 100 top out near 26 to 27%, holding sector weights.
  - They reach about 29% even when sectors may move 5 points.
- **Looser limits** (sectors may move 5 points, stocks up to ten times their weight) take the Nifty 500 to 39% at most. Half the owned staff would need more than half the portfolio moved away from the market.
- **Pay per head is not used.** For 39 Nifty 500 companies the derived ratio of women's to men's pay per head exceeds 150%. Wages and headcount most likely cover different workforces in BRSR, which makes the ratio too fragile to target.

## Results, October 2024 to September 2026
| | Parity-Aligned Nifty 500 | Nifty 500, market weights |
|---|---|---|
| Women's share of owned payroll, 2024 | 25.9% | 19.1% |
| Women's share of owned payroll, 2025 | 26.0% | 18.8% |
| Women's share of owned payroll, 2026 | 27.2% | 19.3% |
| Women's share of owned staff, 2026 | 32.7% | 22.8% |
| Total return, cumulative | −6.5% | −6.3% |
| Total return, a year | −3.3% | −3.2% |
| Volatility, a year | 16.9% | 16.8% |
| Largest fall | −17.4% | n/a |

- **Against the parent:** tracking error 1.0%, beta 1.01, active return −0.1 points a year. Sector weights match exactly in every year.
- **Context:** the Nifty 50 returned −10.3% and the Sensex −12.1% over the same months (ETF proxies). The broader market held up better than the large caps.
- **Coverage:** 305 of 442 companies had point-in-time parity data in 2024, 366 of 467 in 2025, and 409 of 495 in 2026. Companies without data are held at their market weight.

## Sensitivity checks
| Version | Payroll to women, 2026 | Tracking error | Active return a year |
|---|---|---|---|
| 20% active share, stocks up to 5x (the rules) | 27.2% | 1.0% | −0.1% |
| Stocks up to 3x | 26.1% | 0.9% | −0.1% |
| 10% active share | 25.4% | 0.7% | +0.5% |
| 30% active share | 28.1% | 1.9% | −1.2% |

Each step closer to parity costs a little more distance from the market. Over two years, returns stayed within about one point a year of the parent either way.

## How it tilts
- **Within each sector, it moves weight towards the companies that employ and pay more women.**
- **Largest overweights, September 2026** (points of weight):
  - Infosys +2.7
  - Apollo Hospitals +1.7
  - Federal Bank +1.5
  - Adani Power +1.1
  - Reliance Industries +1.0
  - Bosch +0.8
  - Lloyds Metals +0.8
  - Canara Bank +0.8
- **Largest underweights** (points of weight):
  - Bajaj Finance −1.3
  - TCS −1.0
  - Maruti Suzuki −0.8
  - Tata Steel −0.8
  - NTPC −0.8
  - HCL Technologies −0.6
  - ONGC −0.6
  - Bajaj Finserv −0.6
- **These are relative choices within a sector,** not verdicts on any company.

## The glide path
- **The rule:** each year the index aims to close at least a tenth of its own remaining gap to 50%.
- **2025:** the target would have been 28.3%, and the index reached 26.0% within its limits.
- **2026:** the target would have been 28.4%, and the index reached 27.2%.
- **Why it fell short:** the market's own figure barely moved (19.1%, 18.8%, 19.3%).
- **What the shortfall is:** the gap that only companies can close. That is why the index also lists the companies holding the gap, for owners and funds to raise with them.

## Limits
- **History:** two years, both falling markets.
- **Survivorship:** the Nifty 500 membership of September 2026 is used for earlier years.
- **Benchmarks:** the parent is rebuilt from the same NSE data rather than taken from NSE's published Nifty 500 total return index.
- **Data rules:** as recorded for the Equal 50 (point-in-time wage share, ETF proxies for context).
- **Not advice:** past results do not predict future returns, and this is not investment advice.

## Next
- **Legal review** before the index appears publicly (PARITY-35).
- **A name**, if the team adopts it.
- **The company list:** publish, each year, the companies contributing most to the remaining gap.
