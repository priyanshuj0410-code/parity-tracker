---
type: runbook
title: India data pipeline
description: How the India dataset (BRSR filings for every Nifty 500 company, footprints for the Nifty and BSE indexes, and the index funds and ETFs that track them) is fetched, cleaned and turned into the app's JSON, and how to refresh it.
updated: 2026-10-04
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/04793a6e-433c-4a37-9cb0-b1494804cf0c
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/d0a4b836-049d-4e53-98d6-9bdf266cd884
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aa1e98d8-d58d-4a3e-8d0b-eccea0459975
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/16062d26-a8a8-4072-9fa6-3be0a36b4e5e
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/8ff4741b-d95e-4f6d-a59b-a80a0ce8056d
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3ddee1dc-99b4-4f03-83c8-55cdf3f78b30
  - https://app.plane.so/claude-pri/projects/18017c30-d8f6-436a-b4ca-a743d5317720/issues/3f4b5bd3-f746-4845-847f-e2e7400b79b4
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/f4ecafb2-e14b-40cc-b5d5-9ac2384f4f9b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3e2cafdb-a457-426b-89bc-ce3a1d7b8740
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/9e814581-34cc-49dc-a1ea-75698f44c744
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/25f85b77-2bcc-40a5-9ef9-0ac94da273e0
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c28ef6bf-a0a1-41de-8d63-8f91ab8ef68a
---

# India data pipeline

Scripts are in `pipeline/india/` (Python 3 standard library plus `curl`). The output is loaded into Firestore and reaches the site through a release, with no merge: see [data-backend.md](data-backend.md). Display rules are in [../design.md](../design.md).

**Inputs are not in git.** Index member lists, figures read by hand from reports, name maps and overrides (every data file under `pipeline/` outside `equal50/`) live in Firestore `inputs/` ([data-backend.md](data-backend.md#pipeline-inputs), PARITY-80). Before running any market's pipeline, `pnpm data inputs pull` from the repo root writes them into `pipeline/`. After changing one, such as a member list after a rebalance or a figure read from a report, `pnpm data inputs push pipeline/<file>` stores it. No PR is needed.

## Refresh steps
**On hold for NSE steps.** NSE's website terms need its written consent for scripted collection. Do not run any step that calls `nseindia.com` until consent or a licence is recorded here ([legal review](../reviews/legal-review-2026-10.md#3-nse-data-and-index-names), [PARITY-66](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/d0a4b836-049d-4e53-98d6-9bdf266cd884)).

Run these in a scratch folder with the scripts and inputs copied in.

1. **Constituents:**
   - Download `ind_nifty50list.csv` and `ind_niftynext50list.csv` from `https://nsearchives.nseindia.com/content/indices/`, saved as `n50.csv` and `nn50.csv`.
   - Update `sensex.txt` by hand from the BSE Index Services notice (formerly Asia Index). Reviews are semi-annual: announced in May and November, effective in June and December. Notices are at `https://beta.bseindia.com/downloads/UploadDocs/Notices/{no}/{no}.pdf`; fetch them with a browser user agent, because the site returns 403 to plain clients. Check the BSE SENSEX row itself, since news previews are often wrong. In June 2026 analysts expected Trent out and Hindalco in, but nothing changed.
   - **Nifty index lists (since 2 October 2026):**
     - Download `https://www.niftyindices.com/IndexConstituent/ind_{id}list.csv` for each index in `pipeline/india/indexes/`, saved there as `ind_{id}.csv`.
     - 29 lists download cleanly: the Nifty 100, 200 and 500; Midcap 100 and 150; Smallcap 100 and 250; LargeMidcap 250; MidSmallcap 400; and 19 sector and theme indexes.
     - Some names (Private Bank, India Consumption, Alpha 50 and others) return an HTML page instead of a list. Drop any file whose first line is not the `Company Name,...` header.
     - `build_data.py` reads every list there: membership and footprint for each index, and name, industry and ISIN for each company.
   - Build the symbol list from the Nifty 500 plus the Sensex: `(tail -n +2 indexes/ind_nifty500.csv | cut -d, -f3; cat sensex.txt) | sort -u > syms_nse.txt`
   - The first run for the Nifty 500 fetched 401 new companies in about 40 minutes.
2. **Filings:** `python3 fetch_all.py syms_nse.txt`
   - Calls NSE `api/corporate-bussiness-sustainabilitiy` with `from_date`/`to_date`.
   - Keeps the latest submission per financial year.
   - Downloads XBRL to `xa/{SYMBOL}_{FYEND}.xml`. Encode `&` in symbols (M&M).
3. **Free float:** `python3 shp_all.py` reads `corporate-share-holdings-master` and uses public shareholding % as the free-float proxy.
4. **Market cap:**
   - Download `PR{DDMMYY}.zip` from `nsearchives.nseindia.com/archives/equities/bhavcopy/pr/`.
   - Unzip `mcap{DDMMYYYY}.csv`.
   - Leave it in the scratch folder: `build_data.py` reads the latest `mcap*.csv` there.
5. **Extract:** `python3 extract_all.py` writes `company_years.json` with one record per company-year.
6. **Build:** `python3 build_data.py` writes `out/companies.json` and `out/indexes.json`. From the repo root, `pnpm data load IN <scratch>/out/companies.json <scratch>/out/indexes.json`.
7. **Index funds and ETFs** (`pipeline/funds/`):
   - Download AMFI's scheme list from `https://portal.amfiindia.com/spages/NAVAll.txt`. The `www.amfiindia.com` address now redirects there.
   - `python3 parse_amfi.py NAVAll.txt amfi_schemes.json` turns it into one row per scheme plan, with category and fund house. On 2 October 2026: 14,366 plans, 3,386 schemes, 55 fund houses.
   - `python3 map_passive.py` matches each passive equity scheme to the index it tracks, by name.
     - Rules run from the specific to the general. BSE indexes, variant indexes (equal weight, momentum, quality, value and others) and debt, gold or overseas schemes are excluded.
     - Unmatched schemes are listed for review.
   - `python3 build_funds.py passive_map.json <repo>/src/data/indexes.json out/funds.json` writes the app's fund list (`src/data/` holds the live release after any `pnpm dev` or `pnpm build`). Store it with `pnpm data put datasets funds <scratch>/out/funds.json`.
     - Each fund points at its index.
     - Active funds need each fund house's monthly portfolio file (PARITY-37) and are not in this list.

## Cleaning rules (in code)
- **Units:** payroll per head must be ₹1.5 lakh to ₹75 lakh. Values that only fit after ×1e7 (crore) or ×1e5 (lakh) are rescaled (`dq` 2).
- **Estimates:** missing wage totals are estimated from median pay × headcount by category (`dq` 3, `wKind: estimated`). An estimate is kept only if it passes the per-head check. Estimates are never joined to reported trend lines.
- **Earlier years:** each filing's prior-year column fills the previous year when that year has no reported value.
- **Basis changes:** payroll outside 0.55–1.8×, headcount outside 0.6–1.6×, or a boundary switch versus the previous reported year sets `basisChange`. Those pairs are left out of like-for-like YoY.
- **Fixed weights:** each company's index payroll weight is the median plausible reported payroll from FY2022-23 on.
- **Headcount:** the workforce share uses permanent employees and workers only.
- **Boards:** totals outside 6–20 are discarded as filing errors.

## EU pipeline (Euro Stoxx 50): live
Scripts are in `pipeline/eu/`; the verified values (`eu_values.json`) and headcounts (`eu_headcount.json`) are inputs. `eu_build.py` turns `eu_values.json` into `eu_companies.json` and `eu_indexes.json`; from the repo root, `pnpm data load EU <scratch>/eu_companies.json <scratch>/eu_indexes.json`.

- **Measure:** the CSRD ESRS S1-16 unadjusted gender pay gap, from each company's own sustainability statement. It shows like Japan's, as women's average pay as a share of men's, with parity at 100%. The index is an equal-weighted average.
- **France, Netherlands, Italy:**
  - `esef_find.py` queries the filings.xbrl.org API by entity name for FY2025 ESEF filings.
  - `esef_extract.py` strips the XHTML and prints pay-gap passages, searching English, French and Italian terms.
  - The repository has no German or Spanish FY2025 filings.
- **Germany, Spain, Belgium, Finland:** find the FY2025 report PDF per company, then `./grab.sh CODE URL`, which downloads, runs pdftotext and prints the pay-gap passages.
- **Verification:** every value is read from the source passage before it goes into `eu_values.json`, and the source URL is stored. Search-engine summaries are not trusted: they mixed up adjusted gaps (Adidas) and UK-only figures (Airbus).
- **Sites that block downloads:**
  - `crawl.py` walks HTML report sites.
  - The WebFetch tool saves PDFs under 10 MB locally, which then go through pdftotext. This worked for BMW.
  - Allianz, SAP, Iberdrola and Mercedes return 403 to both routes.
- **Status (2026-10-02, PARITY-8):** 31 of 50 verified, 12 excluded with stated reasons, 7 unresolved. Every company page shows its value with source link, or its reason.
- **Unresolved:**
  - Allianz, SAP, Iberdrola and Mercedes-Benz return 403 to scripts and to WebFetch.
  - AB InBev, Rheinmetall and Prosus have no locatable FY2025 report URL.
  - The Chrome extension was connected but failed with a tab-session error, so these need a manual browser check.
- **URL patterns that worked:**
  - Santander: `informe-financiero-anual/2025/ifa-2025-consolidated-annual-financial-report-en.pdf`
  - Enel: `.../annuali/en/integrated-annual-report_2025.pdf`
  - BBVA: listed on its financial-reports page.
  - Argenx: `reports.argenx.com/2025/_assets/downloads/nfi-…-ar25.pdf`
- **Next refresh:**
  - Air Liquide and EssilorLuxottica: replace the 2024 figures once their FY2025 ESEF filings reach the repository.
  - Retry the 7 unresolved companies from a browser.

## Japan pipeline (Nikkei 225)
Scripts are in `pipeline/jp/`.

1. **Members:** `n225.json` is parsed from the Wikipedia Nikkei 225 components list (as of April 2026, grouped by sector).
2. **Data:** the MHLW women's advancement database open data. `https://positive-ryouritsu.mhlw.go.jp/positivedb/opendata/download_b.html?w=99` returns a zip, despite the `.html` name, holding `99_{YYYYMMDD}_utf8_bom.csv` (all companies, about 90 MB).
   - The site rejects bare curl. Send a browser User-Agent, `Accept-Language: ja`, and the open data page as Referer.
3. **Build:** `python3 jp_build.py`, then from the repo root `pnpm data load JP <scratch>/jp_companies.json <scratch>/jp_indexes.json`.

Japan rules:
- **Join:** on securities code (column 9). Where a code appears more than once, keep the largest employer, then the latest update.
- **Headline:** women's average pay as a share of men's, all workers (column 205), with parity at 100%. Values outside 20–150% are discarded.
- **Other fields:** regular and non-regular ratios (206, 207), women in management (159), and board officers (163–165).
- **Women in regular staff (`fPerm`):** from item 3, women's share of workers by employment category (columns 58–67). Taken only when a category is regular or all staff (正社員, 正規…, 社員, 従業員, 全従業員, 全労働者, 職員, 対象とする労働者すべて); other category mixes are not combined. 105 of 152 covered companies qualify (median 21.4%). This is Japan's employment parity on the shared scales (PARITY-11).
- **Index:** equal-weighted average across covered companies. One snapshot only: the open data holds each company's latest disclosure, so archive each download to build a trend.

## Australia pipeline (S&P/ASX 200)
Scripts are in `pipeline/au/`.

1. **Members:** `asx200.json` is parsed from the Wikipedia S&P/ASX 200 table (as of 5 April 2026). Refresh it after each quarterly rebalance.
2. **Data:** download `https://www.wgea.gov.au/sites/default/files/documents/Employer-Gender-Pay-Gaps-Spreadsheet.xlsx`. WGEA replaces it each March, so archive every release locally: the Wayback Machine only holds the current one.
3. **Load:** `python3 au_load.py` reads the employer, corporate group and group info sheets into `wgea.json`.
4. **Match:** `python3 au_match.py` auto-matches names (first-token index, overlap score ≥ 0.75). Manual fixes are in the input `au/au_overrides.json`: `match` (code to group or employer name), `reject` and `funds`.
5. **Build:** `python3 au_build.py`, then from the repo root `pnpm data load AU <scratch>/au_companies.json <scratch>/au_indexes.json`.

Australia rules:
- **Pay share:** women's share of full-time-equivalent pay is `f(1−g) / (f(1−g) + (1−f))`, using the average total remuneration gap.
- **Earlier year:** 2023-24 gaps are in the same release, but 2023-24 workforce shares are not, so FY24 reuses the FY25 workforce share and is marked estimated.
- **Index:** weighted by Australian payroll, from exact group headcount × average total remuneration (size-band midpoints for single employers).

## UK pipeline (FTSE 100)
Scripts are in `pipeline/uk/`.

1. **Members:** `ftse100.json` is parsed from the Wikipedia FTSE 100 constituents table (members after the 1 October 2026 changes). Refresh it after each quarterly review.
2. **Data:** download `https://gender-pay-gap.service.gov.uk/viewing/download-data/{year}` for every year from 2017, saved as `gpg{year}.csv`. The year is the April snapshot year.
3. **Mapping:** the input `uk/uk_map.json` holds a name regex per FTSE company, with exclusions. Trusts have no staff. Prudential plc has no UK filer since the M&G demerger.
4. **Build:** `python3 uk_build.py`, then from the repo root `pnpm data load GB <scratch>/uk_companies.json <scratch>/uk_indexes.json`.

UK rules:
- **Per employer:** women's share of the workforce is the mean of the four quartile shares. Women's share of pay is `f(1−g) / (f(1−g) + (1−f))`, using the mean hourly gap `g`.
- **Combining a group's employers:** weighted by size-band midpoints (250–499 → 375 … 20,000+ → 30,000).
- **Index:** each company counts equally.
- **Basis change:** if fewer than 70% of the weighted (employer, size band) pairs carry over between two years, in either direction, the pair is left out of like-for-like YoY.

## US pipeline (S&P 500 and Dow): in progress
The US is limited to board seats ([plan](../plans/us-indexes.md), PARITY-6). Scripts are in `pipeline/us/`; run them in a scratch folder like the others.
1. `djia.txt` lists the Dow 30, kept by hand.
2. `python3 fetch_constituents.py` writes `constituents.json`: the S&P 500 with SEC CIKs, from Wikipedia's maintained list. It stops if a Dow member is missing.
3. `python3 fetch_proxies.py` writes `proxies.json` with each company's latest DEF 14A from data.sec.gov. 497 of 503 had one on 2 October 2026.
4. Next (US-2): download the proxies and extract board seats. This needs `SEC_USER_AGENT` set to a name and contact email, because www.sec.gov refuses undeclared clients (403).

## Company-report fallbacks and verified reasons (PARITY-92)
Where the statutory source has nothing, figures from the company's own report are used, with their basis shown ([decision 0015](../decisions/0015-coverage-accounted-for.md)). Each is read from the source passage, and an independent reader checks it before it goes in. They are inputs, so recording one needs no PR:
- **`uk/uk_reports.json`:** `figures` maps a FTSE name to a list of `{year, gapMean (percent, positive = men paid more), womenShare (0 to 1), basis, title, url, page}`, used only for years with no UK employer filing; `reasons` maps a FTSE name to a verified reason, used when the latest year has no figure. Company-report years stay out of the FTSE headlines.
- **`au/au_reports.json`:** the same shape, keyed by ASX code, for companies with no WGEA reporter.
- **`jp/jp_reports.json`:** keyed by securities code: `{status: value | reason, ratio, ratioRegular, ratioNonRegular (percent), share (0 to 1), shareScope, period, ratioSource, shareSource: {title, url, page}, reason}`. The ratio is used only when the company is not in the MHLW database. The share is used only when the database gives none, and only for the listed company's own staff (`parent regular` or `parent all`), like the database. A group-wide share is noted instead.
- **`india/reasons.json`:** symbol to the reason a company has no figure for the latest year (listed during the year, financial year not ended, no employees before a demerger). Figures read from annual reports go in `india/annual_reports.json` as before.

## Shared scale for Japan and the EU (PARITY-20)
`pnpm data publish` runs it on every release, then `sectors.py`, on the assembled data: `python3 pipeline/shared_scale.py <data dir>`.
- **Load EU and Japanese builder output as it is.** Their builders write the pay ratio into `w`, which is above 100% when women are paid more. Publish checks every share of pay after `shared_scale.py` has turned those ratios into shares, so it checks what is published, for every market (PARITY-94, 6 October 2026). The check used to run before shared scale, which meant loading these markets after a local shared-scale run.
- The input `eu/eu_headcount.json` holds ESRS S1-6 headcount by gender (women, men) per EU company and year, read by hand from the same CSRD statements as the pay gap. Percent-only disclosures (ING, Saint-Gobain, Vinci, Siemens Energy) are stored as shares. Not found: Deutsche Bank, Air Liquide, EssilorLuxottica. Publish reads it from Firestore, so a newly read headcount needs only `inputs push`, then publish.
- `shared_scale.py` sets each Japanese and EU company-year's `w` to women's share of pay, S = E·W/(E·W + 1 − E), with W = 1 − `gapMean` and E = `fPerm` (Japan, regular staff) or `fAll` (EU). Without E, `w` is empty and a note explains why; the pay ratio stays in `gapMean`.
- It then recomputes the Nikkei 225 and Euro Stoxx 50 headlines (equal-weighted mean S), `payRatio`, `workforce`, sector averages and like-for-like change. It is idempotent: it reads `gapMean`, `fPerm` and `fAll`, never `w`.
- Results on 2 October 2026: Nikkei 225 19.1% (105 companies), Euro Stoxx 50 37.3% in 2025 (28 companies), +0.2 pp like for like on 24.

## Shared sectors
`pnpm data publish` runs `python3 pipeline/sectors.py <data dir>` on every release. It writes `sectors.json`, mapping every company to one of 11 GICS-style sectors.
- Each exchange's own labels are matched by rule (NSE industries, UK report sectors, GICS for ASX and Euro Stoxx, Nikkei's 36 groups). The script fails if any label is unmatched.
- Nikkei groups that mix sectors are split by company in the input `sector_overrides.json`, which publish reads from Firestore (for example Sony and Panasonic to Consumer Discretionary, Hitachi and FANUC to Industrials, Nintendo to Communication Services).
- See [../decisions/0001-comparable-parity-measures.md](../decisions/0001-comparable-parity-measures.md) for how sectors and the shared scales are used.

## Spot the Stereotype feed (PARITY-52)
The build turns the site's data into `/feeds/spot/v1.json` for the game ([contract](../plans/spot-the-stereotype-anytime-and-nivel.md#5-the-nivel-feed)). Every item ever published is kept in Firestore (`feeds/spot-v1`) and frozen into each release.
1. `pnpm data publish` stops if the feed's items would change, and lists them as new, changed or retired.
2. Read each listed item: the answer, the question's wording and the coverage in its rule.
3. `pnpm data publish --approve-feed` records them in the release. Promoting the release adds them to `feeds/spot-v1`.

Only `pnpm data publish` builds the feed, from the `src/feeds/spot.ts` on the machine that publishes; the app build does not. So a change to the items reaches the game only through a release approved with `--approve-feed`. Publish it from the branch that has the change, and merge that branch before anyone publishes from `main`, or that publish lists the new items as retired and stops.

An item whose reported figures fall below 90% of the payroll drops out and is kept as retired; the build warns which ones it left out.

## Logos (PARITY-14)
Scripts are in `pipeline/logos/`. They edit the pulled `public/logos/{safe}.png` (64×64, safe = symbol with characters outside `A-Za-z0-9_-` replaced by `_`) and `src/data/logos.json` (symbol → file); `pnpm data logos public/logos src/data/logos.json` then stores them in Firestore. The app falls back to initials when a symbol has no file.
1. **Websites:** `targets.py` and `resolve.py` resolve each company's Wikipedia article to its Wikidata item and official website (P856). `india.py` fills Indian companies from the Nifty 50 and Next 50 Wikipedia tables. `jobs.txt` holds `safe, symbol, domain` per company (note the column order).
2. **First pass:** Google's favicon service, the site's `apple-touch-icon`, then DuckDuckGo icons; placeholders are dropped by image hash.
3. **Fill pass:** `fill.py` asks Google's faviconV2 endpoint (size 128) and icon.horse; `fill2.py` adds icons listed in each homepage's `<link rel=icon>` tags (`html_icons.py`) and keeps the largest square image. icon.horse returns grey letter placeholders for unknown sites: probe nonexistent domains to collect their hashes, and check a contact sheet by eye.
4. **Small icons:** anything under 32px is drawn at 32px in the centre of the 64px tile rather than stretched.
5. **Coverage on 2 October 2026:** 595 of 675 companies (Euro Stoxx 50 50/50, FTSE 100 97/100, Nikkei 225 217/225, Nifty 50 44/50, Sensex 27/30, Nifty Next 50 36/50, ASX 200 128/200). Many large Indian and UK sites only publish 16px favicons; a logo API key (logo.dev or Brandfetch) would lift quality, and needs the team to sign up.
6. **Rights:** logos are trademarks of their owners, shown only to identify each company. The footer and method page say so.

## Known data issues (FY2025-26 refresh)
- **Unparseable files:** Torrent Pharma's FY2021-22 XBRL is malformed, and M&M's FY2023-24 file on NSE is near empty.
- **No BRSR yet:** ENRIN and VAML.
- **Missing wage totals:** ITC and IndiGo file no wage totals. ITC is estimated in every year; IndiGo has no usable estimate.
- **Sensex list:** verified current on 2 October 2026 (PARITY-27). The last change took effect on 22 December 2025: InterGlobe Aviation in, Tata Motors Passenger Vehicles out. The June 2026 review (notice 20260522-16, effective 22 June 2026) made no Sensex changes. The July 2026 notice (20260710-37) touched only the IPO indices. The next review is due in December 2026, announced in November.
