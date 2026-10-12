---
type: research
title: Third-party BRSR dataset, FY2024-25, checked
description: What the shared "BRSR Reports Dataset (FY 2025-26)" actually holds (FY2024-25 filings from NSE's archive), how its coverage overlaps Nivel's India set, how its women's-wage-share figures compare with Nivel's, the four Nivel values it shows to be wrong, and what it could add to the Out of 100 work.
updated: 2026-10-11
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e91400bc-1cd0-4aba-bfa5-2a337c998ad4
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/1bc88d91-2bc2-4932-8faf-ddce27cc2503
---

# Third-party BRSR dataset, FY2024-25, checked

Location: `~/brsr reports 2025-26/` (1,067 PDFs, 3.1 GB, `metadata.csv`, `README.md`). Scan script: `scratchpad/brsr25/scan.py`, reusing the parsers from the [Out of 100 extraction](out-of-100-new-data-points.md). Checked 11 October 2026.

## What it is

- **Year: FY2024-25, not FY2025-26.** Files were filed between April 2025 and March 2026, mostly July to September 2025. 1,007 of 1,051 readable reports state 2024-25. Calendar-year reporters (ABB, Sanofi India, Huhtamaki, Vesuvius, Foseco) are 2024; Castrol and CRISIL are 2025.
- **Source: NSE's filing archive.** Every file name follows NSE's attachment pattern, `SYMBOL_DDMMYYYYHHMMSS_name.pdf`. The README claims no source and no licence.
- **Quality:**
  - 16 PDFs are truncated and will not open (ACC, Adani Green, Cipla, PNB, Schaeffler, Satin and 10 more).
  - 49 have little or no text: scans or cover letters.
  - 34 have no BRSR heading: intimation letters or a full annual report.
  - That leaves 1,007 usable BRSRs.
- **Metadata adds nothing:** titles are file names, and category, source and language are all "unknown".

## Overlap with Nivel

- **333 of Nivel's 505 Indian companies** are in the dataset (318 usable): 34 of the Nifty 50, 33 of the Next 50, 100 Midcap 150 and 159 Smallcap 250 companies.
  - Matching is by ticker, ticker with a suffix stripped (ACC_1, ARVIND1), or entity name.
  - Missing Nifty 50 names include Reliance, ICICI Bank, Axis Bank, Maruti, Sun Pharma and Tata Steel.
- **Gaps it fills:**
  - 6 of the 12 Nifty 50 reports missing from the FY2025-26 extraction (Infosys, Hindustan Unilever, L&T, BSE, M&M, Eternal). Their figures here are for FY2024-25.
  - FY2024-25 for 5 Nivel companies that have none: BLS, Central Bank, Inox Wind, KSB, Vakrangee.
  - Gillette, which Nivel lists as no data.
- **689 usable reports are from companies outside Nivel.** They are smaller: the median has 711 permanent staff. Their median women's wage share is 6.9%, against 10.0% for the Nivel overlap.

## Cross-check of Nivel's FY2024-25 women's wage share

- **Agreement:** across 268 companies, Nivel's figure matches the filing's FY2024-25 column in 259. The rest are within rounding, or are cases where the filing gives a rounded whole number and Nivel holds more decimals.
- **Four values to fix** ([PARITY-122](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/1bc88d91-2bc2-4932-8faf-ddce27cc2503)):
  - **MFSL**: Nivel has 45.1 for 2024-25 and 42.7 for 2023-24. Both are Max Financial and Axis Max Life added together. The filing gives MFSL alone as 22.1 and 21.0.
  - **Titagarh**: Nivel has 4.18, which is the filing's 2023-24 column. FY2024-25 is 5.14. This is the only case of a one-year shift among 37 values that Nivel took "from the prior-year column of the next filing".
  - **TD Power Systems**: Nivel has 5.69. The FY2024-25 filing says 7.2.
  - **United Spirits**: Nivel has 21.65, the same figure as BSE. The filing says 22%.
- **Prior-year column:** Nivel's 2023-24 value differs from this column in 24 of 264 companies. Some of these will be restatements, so they are not errors by default.

## What it can add to Out of 100

The Out of 100 tables are present in most usable reports (automatic parse, not hand-checked):

| Table | Found in |
|---|---|
| Women on board | 938 |
| Women in KMP | 892 |
| Parental-leave return and retention | 903 |
| Turnover by gender | 846 |
| Permanent headcount by gender | 824 |
| Median pay by level | 558 |

The parser's error rate on the Nifty 50 was about a third, so these tables need hand-checking before any figure is used. With checking, the dataset gives a FY2024-25 baseline across about 1,000 companies, and a one-year change for the 26 Nifty 50 companies also hand-checked for FY2025-26.

## Open question

The files come from NSE's archive, and NSE's terms require written consent for scripted collection ([PARITY-66](../reviews/legal-review-2026-10.md)). Reading local copies does not touch nseindia.com. But [coverage-99](../plans/coverage-99.md) treated NSE-archive copies as off-limits for published figures. Until the owner decides, use the dataset only for checks like this one, and re-read any value Nivel publishes from the company's own report.
