---
type: decision
title: Parity-Aligned Nifty 500, methodology version 1
description: Pre-registered rules for an illustrative index that keeps the Nifty 500's sector make-up and stays within 20% active share of it, while owning as much women's share of payroll as those limits allow, with a yearly glide path towards parity.
status: accepted
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a70d73ef-ef84-49bb-9056-73da6eb6cfc6
---

# Parity-Aligned Nifty 500, methodology version 1

## Why this index, and what it cannot do
- **The aim:** an index that represents the Indian market and is at parity.
- **The constraint found first,** from 2025-26 data and before any return was computed:
  - Women are 23% of the staff the Nifty 500 owns at market weights, and get 19.5% of its payroll.
  - With the market's sector weights kept and no stock above five times its market weight, the most any weighting reaches is about 29% of payroll and 38% of staff. Reaching that much moves half the portfolio away from the market.
  - Parity (50%) is not reachable without leaving the market. Companies would have to employ more women.
- **So the index does two things:**
  - It closes as much of the gap as representation allows.
  - It raises its target every year, so the remaining gap is visible and owners can press companies on it.
  - This is the structure of the EU's Paris-aligned climate benchmarks, applied to pay.
- **Pay per head:** wage parity (women's pay per head as a share of men's) is not used as a target. For 39 Nifty 500 companies the derived figure exceeds 150%, most likely because wages and headcount cover different workforces in BRSR, so it is not robust enough to steer an index.

## Status
- **Illustrative only:** not investable, not advice, not a rating, and not licensed to any fund.
- **Not shown on Nivel** until the legal review (PARITY-35).
- **Pre-registered:** these rules were committed on 2 October 2026 before any return of this index was computed, and are not changed after.

## Parent and dates
- **Parent:** the Nifty 500, with membership as on 30 September 2026.
  - This brings survivorship bias into past years, which is reported with the results.
- **Rebalancing:** the last trading day of September each year.
  - Backtest portfolios: 2024 and 2025.
  - 2026 is the current composition.
  - Earlier years have no point-in-time wage share (see the Equal 50 results).

## Data at each rebalance date
- **Market weights:** free-float market capitalisation.
  - Market capitalisation comes from NSE's file on the date.
  - Free float is the public shareholding in the latest quarterly pattern on or before 30 June of that year.
  - Weights are normalised to sum to one.
- **Parity:**
  - The BRSR for the fiscal year that ended that March, taken from the company's own filing and received by NSE by the date.
  - Women's share of gross wages must be strictly between 0 and 1.
  - Women's share of permanent staff must be reported.
  - Payroll is that filing's total wages.
- **Missing data:** companies without valid parity data are held at their market weight and are not counted in the parity figures.

## Construction
- **Sectors:** each NSE industry is held at exactly its market weight.
- **Stocks:** each weight is between zero and five times its market weight. Only Nifty 500 members are eligible.
- **Closeness to the market:** active share, half the sum of absolute weight differences from the market, is at most 20%.
- **Objective:** the highest women's share of owned payroll these limits allow.
  - Owned payroll is Σ (weightᵢ ÷ market capᵢ) × payrollᵢ.
  - Women's share of it is the same sum weighted by women's share of wages.
  - The weights are those of the least-active solution at that level.

## The glide path (the proposal for live years)
- **Each year the index publishes three figures:**
  - its own women's share of owned payroll and of owned staff;
  - the Nifty 500's at market weights;
  - the remaining gap to 50%.
- **The target:** the index aims to close at least a tenth of its own remaining gap every year, the analogue of the 7% yearly decarbonisation in the EU's Paris-aligned benchmark.
- **When weighting cannot meet the target within the limits above,** the index says so, and the shortfall is the gap only companies can close.
- **The companies holding the gap:** the index lists those contributing most to the remaining gap, for owners and funds to raise with them.

## Returns and comparison
- **Total return:** month-end NSE closes, adjusted for splits and bonus issues, with dividends reinvested. Weights drift between rebalances.
- **The parent comparison:** the parent at market weights is computed from the same data, so differences come only from the weights.
- **Context:** the Nifty 50 and Sensex ETF proxies, as for the Equal 50.
- **Reported:**
  - return, volatility, largest fall;
  - tracking error, beta and active return against the parent;
  - the parity figures each year;
  - the largest over- and underweights.
- **Sensitivity checks:**
  - stocks capped at three times their market weight;
  - active share limits of 10% and 30%.

## Limits stated with the results
- **History:** two years.
- **Survivorship:** the September 2026 membership is used for all years.
- **Data rules:** as for the Equal 50.
- **Not advice:** past results do not predict future returns, and this is not investment advice.

## Correction to the return calculation (2 October 2026, after the results)
- **What changed:** total return now also values demerged shares, adjusts for rights issues, and follows renamed companies by ISIN. The rules above are unchanged.
- **Reporting:** the [results](../research/parity-aligned-nifty-500-results.md) show the corrected figures and the first ones. The method is in the [Parity 50 results](../research/parity-50-results.md#correction-after-the-first-run).
