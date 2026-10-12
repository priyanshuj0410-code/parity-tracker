---
type: plan
title: India, from the Nifty 500 to every BRSR filer
description: Plan to add the roughly 690 BRSR filers outside the Nifty 500 to Nivel from the Kaggle FY2024-25 dataset, the decisions taken (years, universe, payroll-weighted group) and the steps to resume the build.
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b0e815e8-8fd2-47b1-af1d-f81a2b7d6515
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e91400bc-1cd0-4aba-bfa5-2a337c998ad4
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4b57376e-d876-4409-87dd-5a0c2faa228e
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/f47ab7b6-a46f-4d22-83d5-5131790b6a49
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/59edeb77-637d-4ab4-924e-43b8a22072b5
---

# India, from the Nifty 500 to every BRSR filer

Source check: [../research/brsr-dataset-2024-25-check.md](../research/brsr-dataset-2024-25-check.md). The dataset is from Kaggle (owner, 11 October 2026).

## Decisions (owner, 11 October 2026)

1. **Years:** FY2024-25 from the Kaggle PDFs, plus FY2023-24 from each filing's prior-year column. FY2025-26 for the new companies comes in a second pass, from company sites.
2. **Universe:** every Kaggle filer with a usable BRSR: about 690 new companies, about 1,190 in India in all.
3. **Grouping:** each new company gets a page and appears under "All" on Companies. One new group covers every BRSR filer, weighted as below. This needs a UI change for the owner to review.
4. **Weighting:** the group is weighted by payroll, not by market cap and not equally.
   - **Women's share of pay:** total women's wages ÷ total payroll across the group, so the headline reads "of every ₹100 these companies pay".
   - **Women's share of staff:** total women ÷ total permanent staff.
   - **Median company:** shown beside both, because the 10 largest payrolls hold 45% of the total and the 50 largest hold 73%.

5. **Latest reports for everyone (owner, 11 October 2026):** download each company's FY2025-26 BRSR and annual report from its own site. This covers all 1,194 companies:
   - 689 new;
   - 22 Nivel companies with no FY2025-26 figure;
   - 483 Nivel companies, for the deep pass.

   Where FY2025-26 is not out, the company keeps Kaggle's FY2024-25.
6. **Hierarchy and job function (owner, 11 October 2026):** break each company's staff down by level and by function.
   - **Hierarchy:** BRSR's mandatory levels (board, KMP, employees, workers, with median pay by gender), plus any finer levels the company reports itself, in the BRSR or the annual report's human capital section: senior, middle and junior management, grades, bands.
   - **Function:** any job functions it reports by gender: STEM, engineering, sales, operations, corporate.
   - **Readings:** each row keeps the company's own label, a standard level or function ([READING.md](../../pipeline/india/brsr1000/READING.md)), and where it was found.
   - **Early evidence:** Kotak Bank's FY2024-25 BRSR alone gives senior management 8.1% women, middle management 19.2% and junior staff 28.8%.
7. **More data points (owner, 11 October 2026):** all three sets below, field by field in [READING.md](../../pipeline/india/brsr1000/READING.md).
   - **A, every filer's BRSR:**
     - minimum wage by gender (P5 EI 2);
     - training (P3 EI 8) and career reviews (P3 EI 9);
     - maternity, paternity and day-care cover (P3 EI 1);
     - union membership (P3 EI 7);
     - sexual-harassment and discrimination complaints (P5 EI 6 and 7);
     - three years of turnover;
     - disability by gender;
     - company context: incorporation year, state, locations, exports, turnover, net worth, assurance.
   - **B, annual reports where given:**
     - hires, promotions and leavers by gender;
     - dated diversity targets;
     - the CEO's gender, and independent vs executive women directors;
     - ownership type and promoter holding;
     - leave, crèche and return-to-work policies;
     - the CEO-to-median pay ratio.
   - **C, after extraction, in SQLite:**
     - PLFS women's share of employment and earnings by industry (NIC), as the labour pool each company draws on;
     - women's labour force participation in each company's registered state.
   - **Cost:** readings are now about 2.5 times larger, and Sonnet also checks every flow and target row, so the 24 hours are at risk. The deep pass on existing companies runs last and takes any slip.
8. **Models (owner):** Haiku finds and reads reports; Sonnet settles disagreements and checks every finer level and function row, plus one agreed reading in ten.
9. **Pacing (owner): done within 24 hours.** Start after the usage reset on 11 October at 14:30. Then run one batch of 25 companies every 30 minutes, as the scheduled task `nivel-brsr1000`: 48 runs.
   - **Speed:** downloads run six companies at a time.
   - **Order:** the queue runs the 689 new companies first, then the 22 Nivel gaps, then the 483-company deep pass. A shortfall lands on the deep pass.
   - **Gates:** a run is skipped when the week is at 78% or more, or the 5-hour window at 75% or more, just under the guard's 80%. Each skipped run costs 25 companies.
   - **Budget (owner, 11 October 2026):** full scope in 24 hours, using the week's allowance. The first batches cost about 2-3% of the week and 8-10% of the 5-hour window each. So the 5-hour gate will pause a few runs in each window, and the finish will likely run some hours past 24.
   - **Steps:** [../playbooks/brsr1000-batch.md](../playbooks/brsr1000-batch.md).
10. **Missing reports: rules, not a model (owner, 11 October 2026).** For a single company, no model beats carrying its last reported value forward. Evidence: [../research/brsr-predictive-models.md](../research/brsr-predictive-models.md).
    - **Ignored on purpose:** large caps' women's share of permanent staff rises about 0.4–0.9 pp a year. The build ignores it, because it is the same shift for every company and tells nothing about any one of them.
    - **Thresholds (owner, 11 October 2026):** one filing year, 30% of payroll, top 10 and top 50, as below.
    - **Company pages and records:**
      - **Two kinds of estimate:**
        - one derived from the same report's own tables stays, as now: a wage total from its median pay × headcount (`dq` 3, badged as estimated, never joined to reported trends);
        - a modelled value, from earlier years, other fields or other companies, never appears on a company page or in a company record.
      - **No filing, no value:** a company without a FY2025-26 BRSR shows its FY2024-25 figure, labelled FY2024-25. It has no FY2025-26 value anywhere: not in its record, the readings table, Companies, Compare or an export.
      - **Where FY2024-25 comes from:** the checked reading, never the parser scan. The year shown is the one printed in the filing. An inferred year (`~`) is flagged, and an unread year shows nothing.
    - **Group figure, using stand-in values:** stand-ins exist only inside the group calculation.
      - **Pay share:** the level is last year's group level plus the reporters' payroll-weighted like-for-like change, so the level and the change agree. Plain carry-forward is the fallback and the sanity check.
      - **Staff share:** each missing company's last share is carried forward, with no pooled change. A like-for-like staff change is shown only with basis-change companies left out, and their count stated.
      - **Weights:** a missing company's weight is its last payroll (filed, or the decision 4 estimate), scaled by the reporters' payroll growth since then. It is never re-estimated from the years left.
      - **Who is carried:** missing companies are never dropped. Only a figure at most one filing year old is carried, and older ones count as uncovered. A merged, demerged, delisted or insolvent company leaves the group, and the page says so.
      - **The page states:** the share of payroll carried forward, and the share of payroll whose weight is estimated.
    - **Publishing the group change:**
      - **Uncertainty:** with a bootstrap interval, the number of companies and the basis-change count. When the interval crosses zero, the page says the change is not distinguishable from zero.
      - **Base year:** the FY2025-26 filing's own prior-year column where it exists. The Kaggle FY2024-25 figure is used only for companies with no FY2025-26 filing.
      - **When to show it:** only when 30% of payroll or less is carried forward and no whole industry or top-10 payer is carried. Otherwise the page shows the level only.
    - **Field gaps in the group sum:**
      - **With an earlier year:** the company's own last year.
      - **No earlier year:** pay share is estimated from staff share with the linear, mean-unbiased calibration, but only outside the top 50 by payroll. A top-50 gap is read again by hand instead.
      - **Neither:** the company is left out and counted as uncovered, never filled with a median.
      - **Excluded from the change:** estimated values never enter the like-for-like change. The page states the estimated share of payroll.
    - **Next year:**
      - **No company forecasts.**
      - **Index ranges:** at most, a range for Nifty 50, Nifty Next 50 and Sensex only. It covers a fixed set of companies, named with their number and share of payroll, and is centred on the carried-forward value.
      - **Wording:** call it a rough range from three yearly changes. The page uses neither "forecast" nor "80%", and says the published figure can move about 2 pp from changes in membership alone.
      - **Fix the history first:** Adani Green's 100% (Nifty Next 50, FY2023-24) and Apollo Hospitals' estimated 62.4% (Nifty 50, FY2022-23).
      - **The all-BRSR group gets no range.**
11. **Late filers: marks and a daily watch (owner, 12 October 2026).** Runbook: [../playbooks/brsr-watch.md](../playbooks/brsr-watch.md). [PARITY-127](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/1753fc3a-e52f-4411-934e-f04f1e3d6c2f).
    - **Marks:** the owner marks a company still on FY2024-25 on the dashboard after checking its filings: No BRSR filed, Merged (into, and the date), Insolvent (since) or Delisted (on), with the details optional. A mark can be changed or undone. It reaches the queue as each batch opens, and replaces any reason the pipeline gave, which comes back if the mark is undone ([PARITY-128](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/f47ab7b6-a46f-4d22-83d5-5131790b6a49)). Merged, insolvent and delisted marks leave the watch and the group under decision 10. The four companies checked on BSE on 11 October (Arihant Capital Markets, Ester Industries, Filatex Fashion and Garware Technical Fibres) are the first marks.
    - **The watch:** every day at 09:15, the routine `nivel-brsr-watch` reads the site again of each company still without a FY2025-26 BRSR: marked, not published, or an annual report without one.
      - **Mondays:** a deeper search as well.
      - **When a BRSR appears:** the company goes back to be read.
      - **After the build:** once the main build has finished, the routine runs that batch itself.
    - **Not watched:** merged, insolvent and delisted companies (Cigniti, India Power, Jaiprakash Associates). They leave the group under decision 10.

12. **Every year from FY2022-23, every mandatory measure, targets and the assurer (owner, 12 October 2026).** [PARITY-129](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/59edeb77-637d-4ab4-924e-43b8a22072b5). The rules are in [../research/brsr-requirements.md](../research/brsr-requirements.md).
    - **Years:** the BRSR has been mandatory since FY2022-23. Each earlier year gets its own store, `data/history/<fy>/`, with its own queue, readings and database, so the FY2025-26 build is never touched (`batch.py history-init`).
      - **Staged, local first (owner's choice):** FY2024-25 first, from the 1,016 Kaggle texts already on disk (no downloads). The 39 companies whose checked reading is already FY2024-25 are copied in as done.
      - **Then FY2023-24 and FY2022-23**, with downloads, after the FY2025-26 build and the gap fill. Not built yet.
      - **Wage share:** it began in FY2023-24, and each report also gives the previous year's, so FY2022-23 comes from the FY2023-24 reports.
    - **Mandatory measures:** `audit.py` checks each reading for the 15 mandatory gender measures, telling a value the reader missed from a table the text lacked.
      - **FY2025-26 audit (12 October):** 92 to 99% for the core measures. Well-being spend (P3 EI 1c), accident insurance and wage complaints were added to the format that day.
      - **Unions:** its heading search missed BRSR's own wording ("employees and worker"), and was fixed the same day.
      - **Gap batches** (`gaps-init`, `gaps-next`, `gapfill.workflow.js`, `gaps-merge`) read only the missing fields and fill empty values. They never overwrite a checked value, and they record a table given as nil as an answer.
    - **Targets:** every goal in Section B Q5, with Q6's progress, plus gender goals stated elsewhere. Each has a topic (gender, emissions, energy, water, waste, CSR, safety, other).
    - **Assurer:** Section A Q14 and Q15, already in every reading, now shown with the Values line.
    - **FY2026-27 markers (built 12 October):** from AMFI's December lists of six-month average market cap (amfiindia.com, with the owner's approval), not the exchanges' own lists, which the pipeline never fetches. `rankings.py` ranks BSE's and NSE's columns separately and sorts each company into Files, Joins, May drop out after FY2026-27, Leaves or Listed in 2026, shown in the company pane and as a filter on the Companies list. The rules and results are in [../research/brsr-requirements.md](../research/brsr-requirements.md).
    - **Mergers and demergers (owner, 12 October: "show merged and demerged entities in relation with each other"):** one store, `data/relations.json`, of 81 events since 1 April 2022 between the build's companies and other listed or newly listed ones: 51 from a candidate list and 30 a sweep of the reports found, each researched from the companies' filings and checked by a skeptic. `relations.py` reads it with the owner's Merged marks. The company pane shows each event from that company's side and breaks its Years table where the change starts; `rankings.py` takes a merged company's ranks only for years the survivor was not listed itself (Piramal Enterprises for Piramal Finance), and counts a company merged away before FY2026-27 ends as leaving.
    - **Top-1,000 companies added (owner, 12 October):** 150 companies in the 31 December 2025 top 1,000 were missing from the build because the Kaggle filings lacked them. They joined the queue as `TOP-<symbol>` entries; the 61 new to the top 1,000 carry "BRSR from FY2026-27" by SEBI's rule. Tata Motors Passenger Vehicles, wrongly merged into the commercial-vehicle entry, was restored.
    - **Order of runs, on the same schedule:** the FY2025-26 queue, then gap batches, then FY2024-25 history batches. Each run does one batch and stops at the usage gate.

## Why payroll

- **The Nifty indexes already weight by payroll.** In `india_calc.index_calc`, the payroll a fund owns is ₹10 lakh × weight ÷ market cap × payroll. Market cap cancels, leaving payroll × public float.
- **The measures agree.** On FY2025-26 data, plain payroll weighting gives 19.69% and the index method gives 19.64%, matching the Nifty 500 headline.
- **The alternatives answer different questions.** Headcount weighting gives 18.61% and says what the average employee's employer pays women, not what share of all pay women receive. The equal-weighted mean is 13.32% and the median 10.0%.

## The payroll problem for new companies

- **Payroll totals are rare.** Only 34 of 689 new filings give a total-wages row beside the women's share.
- **Estimates fill some of the gap.** Payroll can be estimated as median pay × headcount for about half, using the existing estimate rule (`dq` 3, badged as estimated, never joined to reported trends).
- **Headcount is nearly universal.** The permanent headcount table parses for 583 of 689.
- **Companies with no payroll** keep their pages and are left out of the group's ₹ figure. Coverage is shown as the share of the group's staff whose payroll is known.

## Build steps

1. **Extraction (scheduled, unattended):** [../playbooks/brsr1000-batch.md](../playbooks/brsr1000-batch.md) takes each company through these stages:
   - find the latest BRSR and annual report on its own site;
   - download them, keeping text only;
   - cut out the tables;
   - read them (Haiku);
   - settle disagreements (Sonnet).

   Queue and readings live in `pipeline/india/brsr1000/data/`. The queue is keyed by CIN for new companies and by `NIVEL-<symbol>` for existing ones.
   - **Files are the source.** Each agent writes only its own company's files, so parallel work cannot collide and a broken run resumes.
   - **Dashboard:** `python3 pipeline/india/brsr1000/dashboard.py`, then open http://127.0.0.1:8765. It is local only and has four tabs:
     - Progress: pace, ETA against the 24-hour target, batches, usage and the run log.
     - Companies: every company's readings and sources.
     - Hierarchy: pooled women's share by level and function.
     - SQL: read-only queries.
   - **OCR (owner, 11 October 2026):** Tesseract 5.5.3 from Homebrew (`ocr.py`).
     - Any downloaded PDF with no text layer is OCR'd at 200 dpi, up to 400 pages, and its record is marked `ocr`.
     - `ocr_kaggle.py` read the 55 scanned Kaggle files. BRSR filers among them that were never queued are added when the next batch opens.
   - **SQLite is for querying.** Every batch close rebuilds `data/brsr1000.sqlite` from the files (`to_sqlite.py`). Its tables are companies, fetches, readings, median_pay, ladder and functions, and the view `ladder_by_standard` pools women's share at each standard level.
   - **Existing companies:** Nivel's 483 are read in full, but only their finer levels and functions go to Sonnet, since Nivel already holds checked FY2025-26 core figures. Their core reading is kept to cross-check Nivel.
2. **Symbols and names:** map each new company to a symbol and name. 22 Kaggle entries are Nivel companies whose Kaggle file used a BSE code or old ticker (Sun Pharma, JSW Steel, Adani Enterprises, Indian Hotels and others). They carry `nivelMatch` (their Nivel ticker), and their `NIVEL-*` entries are `merged`. Build their readings into the existing Nivel records, not new ones; Tata Motors' pre-demerger CIN maps to TMPV. Run one more duplicate check on verified names before building. Some Kaggle file prefixes are uploader ids, not tickers (Crompton123, dinesh01, kavinavora). Industry comes from the BRSR's NIC code.
3. **Records:** build per company:
   - the latest year: w, payroll (filed total, else median × headcount), permanent and all headcount by gender, board, ladder and functions;
   - the year before: w only.

   Apply the cleaning rules in [../playbooks/data-pipeline.md](../playbooks/data-pipeline.md): units, board totals between 6 and 20, implausible shares.
4. Write records in `build_data.py`'s shape: market cap and float stay null, `indexes` holds the new group only, and filings point to the Kaggle file. Fix the four Nivel values in [PARITY-122](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/1bc88d91-2bc2-4932-8faf-ddce27cc2503) in the same rebuild.
5. Add the group's arithmetic (pooled payroll and headcount) beside `index_calc`, with the missing-report rules in decision 10. Then make the UI change: Home, Companies and Compare counts, the group page, and each company's ladder and functions (design.md first).
6. Load and publish a staging release for review. Promote only on the owner's approval.

**Steps 3 to 5, built 12 October 2026:** `pipeline/india/brsr1000/to_records.py <data dir> <dump dir>` turns the checked readings and `pnpm data dump IN` into `companies.json`, `indexes.json` and `report.json` for `pnpm data load IN`. Its docstring holds the rules. What it adds to the steps above:
- **Units:** a wage total's unit is the filing's, else the one that puts it near 1.3 times the filing's own median pay × headcount. Median pay is scaled the same way (rupees, lakh, crore, million; often unstated). With no total, the payroll is median pay × headcount (`dq` 3, women's share still reported).
- **Industry:** from the NIC 2008 code, else NIC 2004 (some filings give 34300), the activity's words, then the CIN's NIC 2004 digits. Every industry must map in `sectors.py`.
- **Nivel's records:** PARITY-122's four values, Schaeffler's payroll (millions read as crore, ten times too large), the finer levels and functions, and FY2025-26 from the checked reading where the stored record had none (HEGAM, MCX, Schaeffler). Nivel's indexes are recomputed with `index_calc` and replaced only where a figure changed. The report lists every stored value the build's reading disagrees with, for the owner.
- **The group (`brsrall`, `kind: 'group'`):** pooled payroll each year; a missing company stands in with last year's figure, weighted by its payroll scaled by the reporters' growth, and moved by the reporters' like-for-like change (plain carry-forward is the check); calibration from staff share outside the top 50; mergers and demergers in `relations.json` break a company's figures in their first year (`relations.break_fy`); moves of more than 15 points in a year stay out of the change and are listed; a bootstrap range, and `shown` by decision 10's rule.
- **First run, on the partial queue (1,150 companies):** FY26 19.15% of pay across 1,008 companies with payroll, change +0.29 pp (range 0.16 to 0.43) over 841 companies like for like.
- **Stored payroll units:** 62 of Nivel's stored company-years have an impossible payroll per head; a separate task audits them.

The Kaggle text for all 1,051 readable PDFs and the first scan are in `pipeline/india/brsr1000/data/kaggle/`.
