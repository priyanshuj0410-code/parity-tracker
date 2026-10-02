---
type: decision
title: Parity 50 backfilled history, September 2021 to September 2024
description: Pre-registered method for extending the Parity 50 (version 2) and its Nifty 50 comparison back to September 2021 with stand-in figures, because no company published women's share of wages before mid-2024. The backfilled years are labelled as such wherever they appear.
status: accepted
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/cfd4fc00-28c9-43dc-8b60-492a98f25568
---

# Parity 50 backfilled history, September 2021 to September 2024

## Why a backfill
- **The request:** the owner asked for five years of history for the Nifty 50 and the Parity 50 (3 October 2026).
- **The constraint:** the Parity 50 ([0008](0008-parity-50-v2.md)) selects on women's share of wages. No company had published that figure at the September 2021, 2022 or 2023 rebuilds:
  - in fiscal 2021-22 one company of 474 reported it;
  - fiscal 2022-23 figures appeared only in filings made after September 2023.
  So any history before September 2024 has to use figures published later.
- **This is a backfill, not a backtest.** It is shown as an illustration, shaded and labelled, and never added to the point-in-time results without saying so.

## Rebuilds
- **Backfilled:** the last trading day of September 2021, 2022 and 2023.
- **Point in time:** September 2024, 2025 and 2026, unchanged from 0008.

## Stand-in figures for the backfilled rebuilds
- **Parity figures:** for a rebuild in September of year Y, each company's figures come from the fiscal year ending March Y if any filing reports them. Otherwise they come from the earliest later fiscal year that does.
  - The figures used are women's share of wages, women's share of permanent staff, permanent staff and payroll.
  - The usual validity rules apply: wage share strictly between 0 and 1, reported payroll.
  - Coverage checked before any return: 323 Nifty 500 companies have fiscal 2022-23 figures, 78 start at 2023-24, 59 later, and 41 have none.
- **Free float:** the latest shareholding pattern on or before 30 June of year Y. NSE's history starts at September 2021, so for the 2021 rebuild most companies use their September 2021 pattern.
- **Market capitalisation:** NSE's file on the rebuild date, as in 0008. A company not listed on that date is not in the universe that year.

## Rules applied
- **Bar, eligibility, selection and weights:** as in 0008, with the stand-in figures. The bar is the Nifty 50's own women's share of the payroll owned at that date's weights.
- **Universe:** the Nifty 500 of September 2026, as in 0008.
- **The comparison:** the Nifty 50 at free-float weights, rebuilt the same way.
- **Returns:** as in 0008. Demergers, rights issues and renamed companies between October 2021 and September 2024 are valued by the same rules.

## Reported
- **Periods:** five years (October 2021 to September 2026), the backfilled three (October 2021 to September 2024) and the point-in-time two, each against the Nifty 50.
- **Context:** the SBI Nifty 50 ETF for the same months, which carries neither bias.
- **Each backfilled rebuild:** the bar, how many companies qualify, and how many use figures from a later year.

## The two biases, stated wherever the backfill is shown
- **Later figures:** companies are picked using pay figures they published later.
- **Today's survivors:** the universe is today's Nifty 500, so companies that shrank or left since 2021 are missing. This flatters both lines, the Parity 50's more, because it reaches beyond the Nifty 50 into companies that are large today.
