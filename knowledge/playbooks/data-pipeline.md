---
type: runbook
title: India data pipeline
description: How the India dataset (BRSR filings for the Nifty 50, Nifty Next 50 and Sensex) is fetched, cleaned and turned into the app's JSON, and how to refresh it.
updated: 2026-10-01
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3ddee1dc-99b4-4f03-83c8-55cdf3f78b30
  - https://app.plane.so/claude-pri/projects/18017c30-d8f6-436a-b4ca-a743d5317720/issues/3f4b5bd3-f746-4845-847f-e2e7400b79b4
---

# India data pipeline

Scripts are in `pipeline/india/` (Python 3 standard library plus `curl`). The output is `src/data/companies.json` and `src/data/indexes.json`. Display rules are in [../design.md](../design.md).

## Refresh steps
Run these in a scratch folder with the scripts copied in.

1. **Constituents:**
   - Download `ind_nifty50list.csv` and `ind_niftynext50list.csv` from `https://nsearchives.nseindia.com/content/indices/`, saved as `n50.csv` and `nn50.csv`.
   - Update `sensex.txt` by hand from the Asia Index notice.
   - Build the symbol list: `(tail -n +2 n50.csv; tail -n +2 nn50.csv) | cut -d, -f3 | sort -u > syms_nse.txt`
2. **Filings:** `python3 fetch_all.py syms_nse.txt`
   - Calls NSE `api/corporate-bussiness-sustainabilitiy` with `from_date`/`to_date`.
   - Keeps the latest submission per financial year.
   - Downloads XBRL to `xa/{SYMBOL}_{FYEND}.xml`. Encode `&` in symbols (M&M).
3. **Free float:** `python3 shp_all.py` reads `corporate-share-holdings-master` and uses public shareholding % as the free-float proxy.
4. **Market cap:**
   - Download `PR{DDMMYY}.zip` from `nsearchives.nseindia.com/archives/equities/bhavcopy/pr/`.
   - Unzip `mcap{DDMMYYYY}.csv`.
   - Update the file name in `build_data.py`.
5. **Extract:** `python3 extract_all.py` writes `company_years.json` with one record per company-year.
6. **Build:** `python3 build_data.py` writes `out/companies.json` and `out/indexes.json`. Copy both into `src/data/`.

## Cleaning rules (in code)
- **Units:** payroll per head must be ₹1.5 lakh to ₹75 lakh. Values that only fit after ×1e7 (crore) or ×1e5 (lakh) are rescaled (`dq` 2).
- **Estimates:** missing wage totals are estimated from median pay × headcount by category (`dq` 3, `wKind: estimated`). An estimate is kept only if it passes the per-head check. Estimates are never joined to reported trend lines.
- **Earlier years:** each filing's prior-year column fills the previous year when that year has no reported value.
- **Basis changes:** payroll outside 0.55–1.8×, headcount outside 0.6–1.6×, or a boundary switch versus the previous reported year sets `basisChange`. Those pairs are left out of like-for-like YoY.
- **Fixed weights:** each company's index payroll weight is the median plausible reported payroll from FY2022-23 on.
- **Headcount:** the workforce share uses permanent employees and workers only.
- **Boards:** totals outside 6–20 are discarded as filing errors.

## Japan pipeline (Nikkei 225)
Scripts are in `pipeline/jp/`.

1. **Members:** `n225.json` is parsed from the Wikipedia Nikkei 225 components list (as of April 2026, grouped by sector).
2. **Data:** the MHLW women's advancement database open data. `https://positive-ryouritsu.mhlw.go.jp/positivedb/opendata/download_b.html?w=99` returns a zip, despite the `.html` name, holding `99_{YYYYMMDD}_utf8_bom.csv` (all companies, about 90 MB).
   - The site rejects bare curl. Send a browser User-Agent, `Accept-Language: ja`, and the open data page as Referer.
3. **Build:** `python3 jp_build.py`, then `python3 ../merge_markets.py`.

Japan rules:
- **Join:** on securities code (column 9). Where a code appears more than once, keep the largest employer, then the latest update.
- **Headline:** women's average pay as a share of men's, all workers (column 205), with parity at 100%. Values outside 20–150% are discarded.
- **Other fields:** regular and non-regular ratios (206, 207), women in management (159), and board officers (163–165).
- **Index:** equal-weighted average across covered companies. One snapshot only: the open data holds each company's latest disclosure, so archive each download to build a trend.

## Australia pipeline (S&P/ASX 200)
Scripts are in `pipeline/au/`.

1. **Members:** `asx200.json` is parsed from the Wikipedia S&P/ASX 200 table (as of 5 April 2026). Refresh it after each quarterly rebalance.
2. **Data:** download `https://www.wgea.gov.au/sites/default/files/documents/Employer-Gender-Pay-Gaps-Spreadsheet.xlsx`. WGEA replaces it each March, so archive every release locally: the Wayback Machine only holds the current one.
3. **Load:** `python3 au_load.py` reads the employer, corporate group and group info sheets into `wgea.json`.
4. **Match:** `python3 au_match.py` auto-matches names (first-token index, overlap score ≥ 0.75). Manual fixes are the `OVR`, `REJECT` and `FUNDS` sets in `au_build.py`.
5. **Build:** `python3 au_build.py`, then `python3 ../merge_markets.py`.

Australia rules:
- **Pay share:** women's share of full-time-equivalent pay is `f(1−g) / (f(1−g) + (1−f))`, using the average total remuneration gap.
- **Earlier year:** 2023-24 gaps are in the same release, but 2023-24 workforce shares are not, so FY24 reuses the FY25 workforce share and is marked estimated.
- **Index:** weighted by Australian payroll, from exact group headcount × average total remuneration (size-band midpoints for single employers).

## UK pipeline (FTSE 100)
Scripts are in `pipeline/uk/`; `pipeline/merge_markets.py` merges all markets into `src/data/`.

1. **Members:** `ftse100.json` is parsed from the Wikipedia FTSE 100 constituents table (members after the 1 October 2026 changes). Refresh it after each quarterly review.
2. **Data:** download `https://gender-pay-gap.service.gov.uk/viewing/download-data/{year}` for every year from 2017, saved as `gpg{year}.csv`. The year is the April snapshot year.
3. **Mapping:** `uk_map.py` holds a name regex per FTSE company, with exclusions. Trusts have no staff. Prudential plc has no UK filer since the M&G demerger.
4. **Build:** `python3 uk_build.py`, then `python3 merge_markets.py`.

UK rules:
- **Per employer:** women's share of the workforce is the mean of the four quartile shares. Women's share of pay is `f(1−g) / (f(1−g) + (1−f))`, using the mean hourly gap `g`.
- **Combining a group's employers:** weighted by size-band midpoints (250–499 → 375 … 20,000+ → 30,000).
- **Index:** each company counts equally.
- **Basis change:** if fewer than 70% of the weighted (employer, size band) pairs carry over between two years, in either direction, the pair is left out of like-for-like YoY.

## Known data issues (FY2025-26 refresh)
- **Unparseable files:** Torrent Pharma's FY2021-22 XBRL is malformed, and M&M's FY2023-24 file on NSE is near empty.
- **No BRSR yet:** ENRIN and VAML.
- **Missing wage totals:** ITC and IndiGo file no wage totals. ITC is estimated in every year; IndiGo has no usable estimate.
- **Sensex list:** as of December 2025. The June 2026 change is unconfirmed.
