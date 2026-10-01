---
type: decision
title: Comparable parity measures across markets
description: How Nivel puts every company and index on two shared scales, employment parity and wage parity, so they can be compared across India, the UK, Australia, Japan and the EU, and what stays non-comparable.
status: accepted
date: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aa1e98d8-d58d-4a3e-8d0b-eccea0459975
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b98b37f6-08c0-4d83-b520-c1833aba2285
---

# Comparable parity measures across markets

## Context
Each market's law asks for different numbers:
- **India (BRSR):** wages paid to women as a share of total wages, plus headcounts by gender.
- **UK:** mean and median hourly pay gaps and pay quartiles, UK staff only.
- **Australia (WGEA):** full-time-equivalent total pay gaps and headcounts, Australian staff.
- **Japan (MHLW):** women's annual pay as a share of men's, plus workforce shares by employment category.
- **EU (CSRD):** an unadjusted pay gap defined by each company (ESRS S1-16).

The market headlines (share of payroll, share of hourly pay, pay ratio) cannot be read against each other, so until now the app forbade cross-market ranking. The team asked for a way to make every index and company comparable.

## Decision
Convert what every company reports into two shared measures, and derive everything else from them. Code: `src/lib/compare.ts`.

| Measure | Definition | Parity |
|---|---|---|
| **Employment parity (E)** | Women's share of staff | 50% |
| **Wage parity (W)** | Women's average pay as a share of men's | 100% |
| **Women's share of pay (S)** | E×W ÷ (E×W + 1 − E) | 50% |

Basis by market (shown in the app wherever the numbers appear):

| Market | E basis | W basis |
|---|---|---|
| India | Permanent staff | Annual wages, derived as (w/f) ÷ ((1−w)/(1−f)); approximate |
| UK | UK staff (mean of quartile shares) | 1 − mean hourly gap |
| Australia | Australian staff | 1 − mean full-time-equivalent total pay gap |
| Japan | Regular staff (new field, 105 of 152 companies) | Annual pay, all workers |
| EU | Not collected yet | 1 − unadjusted gap, company-defined |

Rules:
1. **Latest reported year.** Each company contributes its latest reported year, or the one before. Estimated values are left out.
2. **Medians and the middle half.** Country, index and sector comparisons use the median company and show the interquartile range, so a few extreme filings (mostly derived Indian ratios) do not move them.
3. **Percentiles for cross-market rankings.** A company's rank is its percentile on wage parity within its own market. Percentiles compare fairly across markets because each company is measured on its own market's basis.
4. **Shared sectors.** Every company maps to one of 11 GICS-style sectors (`pipeline/sectors.py`), with Nikkei's mixed groups split by company.
5. **The headline stays.** Each market's own headline is still shown on index and company pages, labelled as the market's own measure.

## Where it shows
- **Compare › Countries:** range-dot charts and a table per market, plus every index on the same scales.
- **Compare › Sectors:** sector medians for a chosen market and a sector × market matrix.
- **Compare › Parity map:** every company plotted with E on the x axis and W on the y axis, parity lines at 50% and 100%, quadrant counts, and facets by market.
- **Company pages:** E, W and S cards with the market percentile, plus a peers tab ranked within the same market and sector.
- **Companies directory:** E, W and market percentile columns.

## Consequences and limits
- **Bases still differ.** Hourly against annual pay, and part-time staff in or out, move W by a few points. The app says to treat small cross-market gaps as noise.
- **India's W is approximate.** Wage totals cover all employees while the staff share is permanent staff only. Five companies fall outside 30–150% and are pinned to the edge of the map, drawn hollow.
- **EU has no E yet.** CSRD statements give headcount by gender under ESRS S1-6, but we have not extracted it, so EU companies are absent from the map and the E and S columns. This is a follow-up.
- **Japan's E and W cover different groups.** E is regular staff and W is all workers. The alternative (regular-staff W) would break consistency with the Japan headline.

## Alternatives considered
- **A single composite score per company.** Rejected: it hides whether the gap is too few women or women paid less, which the map makes visible.
- **Z-scores within each market.** Rejected for the UI: harder to explain than percentiles, with the same ranking.
- **Pooled cross-market rankings on raw W.** Rejected: rewards markets whose pay basis flatters the gap (hourly over annual).

## Follow-ups
- Extract ESRS S1-6 headcount by gender for the 31 verified EU companies.
- Archive each Japanese open-data download to give Japan a trend.
- Revisit the Indian W derivation once BRSR Core assurance covers wage totals by employee type.
