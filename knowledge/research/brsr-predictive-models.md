---
type: research
title: Predicting missing BRSR reports and next year
description: Backtests of models that fill a missing FY2025-26 report, forecast FY2026-27, fill the group figure when companies are missing, and fill a missing field inside a report. No model beats carrying a company's last reported value forward, so the build uses rules, not a model.
updated: 2026-10-11
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4b57376e-d876-4409-87dd-5a0c2faa228e
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b0e815e8-8fd2-47b1-af1d-f81a2b7d6515
---

# Predicting missing BRSR reports and next year

The owner asked whether the data points the [BRSR filer build](../plans/india-brsr-1000.md) captures support predictive models for missing reports and for next year. For a single company, nothing beats carrying its last reported value forward.

Two patterns help, and neither is company-specific:
- **A pooled rise:** large caps' women's share of permanent staff rises about 0.4–0.9 pp a year.
- **Implied wage bill:** reports with both median-pay tables give the wage bill directly, but such reports are rare.

The build therefore uses the rules in [decision 10 of the plan](../plans/india-brsr-1000.md), not a model.

## How it was tested

- **Data, read-only, frozen on 11 October 2026:** frozen except the field-gap hold-out, which reads the live database.
  - **Large caps:** the 100-company panel, Nifty 50 plus Nifty Next 50, FY2021-22 to FY2025-26. It lives in the Thoth repo at `knowledge/research/data/companies.json`, built from XBRL filings.
  - **Earlier years:** the Kaggle FY2024-25 parser scans of 1,067 filers. Their pay share also carries FY2023-24 from the prior-year column, for about four files in five. Other fields carry the current year only.
  - **FY2025-26:** about 200 checked readings from `brsr1000.sqlite`. Most are small and mid caps, since these were the first companies the build reached.
- **Four questions:** fill a missing FY2025-26 report; forecast FY2026-27; fill the group figure when companies are missing; fill a missing field inside a report.
- **Method:**
  - Cross-validation by company, and rolling origins for forecasts. Nothing, including industry means, is fitted on the test rows.
  - Intervals use out-of-sample residuals where possible:
    - pay-share and staff-share bands cover at about their nominal rate;
    - board bands under-cover out of sample (73% at 80%);
    - turnover bands are in-sample;
    - index ranges are only a rough check.
  - Models tried:
    - carry-forward, with and without a pooled drift;
    - industry partial pooling;
    - damped trend and AR(1) on changes;
    - ridge and least-absolute-deviation regressions on last value, last change, industry and size.
- **Verification:** a second agent re-ran each backtest, hunted for leakage and recomputed the key figures. Then two more checked this note against the results. All four backtests reproduced.
  - **Nowcast and field gaps:** no leakage that changes a result.
  - **Group figure:** a weight leak. The headline runs let each missing company keep a weight that includes the missing year. Removing it roughly doubles the errors, and section 3 uses the leak-free figures.
  - **Forecast:** the headline errors use like-for-like pairs, whose filter (boundary unchanged) uses next-year information. Errors on all pairs are given beside them.

## 1. A missing FY2025-26 report

Small and mid caps: last year from the Kaggle scan, compared with the checked FY2025-26 reading.

| Data point | Pairs | Typical error of carrying FY2024-25 forward | Best model |
|---|---|---|---|
| Women's share of pay | 152 | 1.6 pp. 59% within ±1 pp, 77% within ±2 pp | None better |
| Women's share of permanent employees | 161 | 1.4 pp | About 1% better, not significant |
| Women's share of the board | 175 | 1.9 pp. 67% of companies unchanged | None better |
| Women among KMP | 168 | 4.2 pp. 82% unchanged | None better |
| Women's turnover rate | 110 | 11.0 pp | None better; too noisy to estimate |

- **Bands:** carrying the pay share forward has an 80% band of ±2.4 pp and a 90% band of ±4.5–5.1 pp. The between-company spread is 10.8 pp (standard deviation).
- **Later filers:** on the live database (170 pairs) the typical pay-share error is 1.8 pp, so it rises as later filers arrive.
- **What adds nothing:** industry, size and the company's own last change, at any level of pooling.
- **Large caps (100-company panel):** carry-forward error is 0.9 pp for pay share. A pooled upward drift trims about 6–8%. Fitted on earlier years only, the gain's interval touches zero. Industry and size add nothing.
- **Restatements:** 13 of 153 companies' Kaggle FY2024-25 pay shares differ from the FY2025-26 report's own prior-year column.
  - 8 differ by 0.5 pp or less, which is small restatement or rounding.
  - 3 differ by more than 2 pp, 2 of them by more than 5 pp, and those 2 look like parser misreads.
  - The large-cap panel also has real restatements: Cipla FY2023-24 from 19.4% to 16.5%, and Zydus from 11.5% to 5.2%.
- **Noise:** a report's own year-on-year change is 1.5 pp, so part of the 1.6 pp is measurement noise that no model can remove.

## 2. Next year (FY2026-27)

Rolling origins on the 100-company panel, from FY2022-23 to FY2024-25, each predicting the year after. Pay and permanent-staff pairs are like-for-like (boundary unchanged); errors on all pairs are in brackets.

| Data point | Pairs | Carry forward | Best | Verdict |
|---|---|---|---|---|
| Women's share of pay | 219 (all: 257) | 0.80 pp (0.87) | AR(1) 0.77; interval crosses zero | Carry forward |
| Women's share of permanent employees | 225 (all: 266) | 0.95 pp (1.18) | Drift 0.83, -12.5% (all pairs: -11% median drift, -4% mean drift) | Carry forward; the drift is pooled, large caps only |
| Women's share of the board | 258 | 3.5 pp | None | Carry forward |

- **Pay share:** a drift is 0.03–0.04 pp better in two sensitivities. That is immaterial next to a 0.8 pp error.
- **Permanent staff:**
  - The rise is about 0.4–0.9 pp a year depending on the estimator (median about 0.45, mean about 0.6–0.7), and 78% of the panel rose.
  - The drift beats carry-forward at all three origins, but it is the same shift for every company.
  - Small and mid caps show no drift: +0.23 pp a year, standard error 0.18.
- **Bands, all pairs:** pay share ±1.3 pp (80%) and ±1.9 pp (90%).
- **Women's turnover rate (small and mid caps, one transition only):**
  - Carry-forward error is 9.7 pp (131 pairs).
  - No fitted model beat it; two-year smoothing was slightly better, but not significantly.
  - It is unresolved with one transition, and not in the panel.
- **Index ranges:** women's share of pay on the companies with a FY2025-26 figure.

| Index | Companies | FY2025-26, carried forward | Rough FY2026-27 range |
|---|---|---|---|
| Nifty 50 | 49 | 20.8% | 20.6–21.3% |
| Nifty Next 50 | 43 | 18.8% | 18.7–19.3% |
| Sensex | 29 | 22.0% | 21.9–22.5% |

- **How the range was built:** by resampling company-level residuals.
  - **History:** each index has 4 published years and 3 like-for-like changes.
  - **Tilt:** the range sits about 0.2 pp above carry-forward, because it carries the mean of the three observed changes. The index-level backtest (6 cases, overlapping) favours flat carry-forward: error 0.14 pp, against 0.23 for an index drift.
  - **Weighting:** equal-weight company draws instead of payroll weights move the Nifty 50 top by about 0.3 pp.
  - **Coverage:** the range held the outcome in 6–7 of 9 cases at a nominal 80%.
- **Composition moves the headline more than any forecast error:** the set of companies with a figure changes every year.
  - Past headline changes differ from like-for-like ones by up to 2 pp.
  - For Nifty Next 50 in FY2023-24, the headline fell 1.51 pp while like-for-like rose 0.63 pp. The 0.63 includes Adani Green at a 100% women's pay share; without it the figure is 0.34.
  - Nifty 50's FY2022-23 includes an estimated 62.4% for Apollo Hospitals.

## 3. The group figure when companies are missing

Payroll-weighted women's share of pay on the 100-company panel, FY2024-25 to FY2025-26 (86 companies), over 5,000 simulations per pattern. The real change that year was +0.275 pp, with a 95% interval of +0.12 to +0.50.

Each missing company's weight here is its FY2024-25 payroll, as the build will have it. Error of the group figure in pp, mean / 95th percentile:

| Missing 20% of companies | Drop them | Carry forward | Carry forward plus reporters' like-for-like change |
|---|---|---|---|
| At random | 0.71 / 1.78 | 0.101 / 0.286 | 0.076 / 0.233 |
| Smaller ones likelier | 0.36 / 1.06 | 0.105 / 0.258 | 0.093 / 0.232 |
| Whole industries | 1.50 / 4.51 | 0.127 / 0.313 | 0.080 / 0.236 |
| Larger ones likelier (stress) | 3.98 / 6.55 | 0.249 / 0.372 | 0.086 / 0.216 |

- **Dropping is never right:** it is 3–46 times worse, and in every row its error is larger than the year's change itself.
- **Carry forward plus the like-for-like change wins** in every pattern, with a typical error of 0.08–0.09 pp.
  - That is about a third of the year's change.
  - Its 95th percentile, about 0.23 pp, is close to the whole change, so a one-year change needs an interval beside it.
- **Recalculated weights are worse:** re-estimating a missing company's weight from the years left, as a median over years would, gives about 0.13 pp.
- **The leaked headline runs:** weights that know the missing year give 0.037 pp (like-for-like) and 0.055 pp (carry forward) at 20% random. Those figures are optimistic.
- **Staff share is different:**
  - With last-year weights, plain carry-forward beats adding a pooled change (0.205 against 0.263 pp).
  - Basis changes move the staff share: on the panel the all-company change was -0.07 pp while like-for-like was +0.51 pp.
- **Industry models:** no detectable industry effect, from a low-power test on 78 companies in 16 groups.
- **Panel today:** 12 of 98 companies (12%) lack a FY2025-26 pay share. That is 4.8% of payroll weight on recalculated medians. 3 of the 12 (ITC, IndiGo, Varun Beverages) have no FY2024-25 pay share to carry.
- **Small and mid caps:** the fill error is about 0.10–0.14 pp, but this set's own change (+0.41 pp, interval -0.05 to +0.96) is too noisy to show a trend.

## 4. A missing field inside a report

- **The company's own last year is the best fill:** 1.8 pp error, against 3.6 pp for the best one-variable estimate, the calibrated staff share (171 checked readings).
  - Richer fields from the same report give about 2.5–3.3 pp.
  - The implied wage bill, from workers' headcount and both median-pay tables, gives about 1.5 pp. Only 1 of today's 18 missing pay shares has those tables.
- **No earlier year:** estimating pay share from staff share has an error of about 3.5–4.1 pp (R² 0.44–0.50), about a third of the spread. That serves a group, not a company page.
  - The logit calibration has the lower error but under-predicts the mean by 1.1–1.5 pp. Sums need the linear, mean-unbiased one.
  - Board, KMP and size add nothing. Industry adds nothing detectable. Large caps do better, at about 2.8 pp.
- **Real gaps are not typical:** 4 of today's 18 missing pay shares have no staff field either, against 1% of complete readings.
- **In a group:**
  - Filling unweighted means of 25–100 random companies cuts the error by about 40% against dropping, and by about 55% against filling with the median.
  - The median fill is worse than dropping.
  - Weighted by headcount with smaller companies likelier to be missing, the error is about 0.6–0.9 pp.
  - If gaps track the value itself, a bias of about 0.45–0.75 pp remains even at 100 companies.

## Limits

- **Missingness is not random:** the early filers lean small (median permanent headcount 631, against 1,024 across all scans), and why a report is missing cannot be tested here.
- **Re-checks on the live data:** the checked set was frozen at about 200 FY2025-26 readings and has since passed 220.
  - The nowcast, group and field-gap verifiers re-checked on the larger set, and the conclusions held.
  - The forecast was not re-run.
- **Measurement noise:** the parser and the checked readings disagree on a few companies, which inflates every error above.
- **Short history:** large-cap forecasts rest on three origins, and turnover on one transition.
- **Untested:** the combination of carried shares, field-filled shares and estimated payroll weights in one group.

## Reproduce

- **Scripts:** `pipeline/india/brsr1000/analysis/predict/`, in four parts (`nowcast`, `forecast`, `group`, `fields`).
- **Frozen inputs, outputs and verifier checks:** `pipeline/india/brsr1000/data/analysis/predict/` (git-ignored).
  - Each part's `snapshot.py` or `extract_wide.py` re-freezes the live data, which changes the numbers.
  - `fields` reads the live database directly.
  - Each part writes its outputs into its own folder there.
  - The full verified results are in `workflow-result.json`.
- **Re-run, 11 October 2026:**
  - nowcast, forecast and group reproduced byte for byte, apart from timings;
  - fields' Kaggle and panel cross-validation reproduced, and its checked hold-out moved with the live database.

```bash
cd /Users/priyanshu/parity-tracker/pipeline/india/brsr1000
python3 -I analysis/predict/nowcast/nowcast.py && python3 -I analysis/predict/nowcast/selftest.py
python3 -I analysis/predict/forecast/forecast.py
(cd data/analysis/predict/group && python3 -I ../../../../analysis/predict/group/test_sim.py && python3 -I ../../../../analysis/predict/group/run_all.py snapshot_frozen_20261011.json 5000 .)
python3 -I analysis/predict/fields/field_gaps.py > data/analysis/predict/fields/out_full.txt
```

`fields/missing_wage_predictions.csv` holds model estimates for named companies. It is for checking the method only, and is never published.
