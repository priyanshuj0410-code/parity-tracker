---
type: decision
title: Nivel publishes no investment returns
description: Nivel measures who is paid, not how shares perform. The Parity 50's growth chart, returns table, volatility, drawdown and tracking error are removed from the site, the data and the public API, and the pipeline no longer exports them.
status: accepted
updated: 2026-10-03
supersedes: the returns sections of decisions/0008 and 0009 (Parity 50)
---

# Nivel publishes no investment returns

## Decision (owner, 3 October 2026)
"Remove any measurement of the returns; that's not our territory." Nivel shows gender pay and workforce figures from companies' filings. It does not measure or display investment returns, prices, growth of money, volatility, drawdowns or tracking error, for any index, fund or simulation.

## What changed
- **Parity 50 page:** the "What it would have delivered" section (growth of ₹100 chart and its table, the returns table) is gone; "How it is built" says the page shows no returns. The page keeps the bar, holdings, weights, sectors and pay figures.
- **Data:** the `performance` block is removed from `datasets/simulations` in Firestore, so releases, the build and `/data/v1/simulations.json` carry no returns.
- **Code:** `GrowthChart` and the `SimReturns` and `SimVersus` types are deleted; `pipeline/equal50/export_parity50.py` no longer exports returns.
- **Kept:** "per ₹10 lakh invested" on index pages is the payroll a holding owns, not a return.

## Why it also helps legally
Returns were behind several open questions for counsel: research and adviser rules, the 2024 association rule for registered partners, and NSE's derived-data terms. Without them those questions narrow; see [counsel questions](../reviews/counsel-questions-2026-10.md).

## Still in the pipeline
The return calculations in `pipeline/equal50/` (`parity50_v2.py`, the backfill and price fetchers) still exist for the record but feed nothing published. Deleting them is a follow-up.
