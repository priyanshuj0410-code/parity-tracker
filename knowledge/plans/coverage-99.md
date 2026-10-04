---
type: plan
title: Coverage to 99% accounted for, overnight 5 to 6 October 2026
description: Working plan and progress log for the owner's goal that every live market has at most 1% of members open (no figure and no verified company-side reason). What runs overnight, what waits for the owner, how to resume.
updated: 2026-10-05
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/89a8c85e-7ab4-46eb-9d06-cd28c850b2e6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/2c094b9f-df07-4d46-a8a3-7406f27c738e
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/cc16dda4-8972-4bc8-8b02-d94db43c94a1
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/bf067b45-2bbd-4d70-bdd7-3bfe8dab1114
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b9a4d982-563d-420d-a543-0df9d9238cbf
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/cb3c3975-004a-4ba9-8c8f-346b9bd9713f
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/63876b77-0485-4f55-b912-c3337e1b9dfa
---

# Coverage to 99% accounted for

Rules: [decision 0015](../decisions/0015-coverage-accounted-for.md). Plane: PARITY-87 (parent), 88 India, 89 UK, 90 Australia, 91 Japan, 92 source-display UI, 73 EU.

## Start (live release 20261004-163211, 5 October 2026)
| Market | Members | Figure | Accounted for | Open | Open allowed |
|---|---|---|---|---|---|
| India | 496 | 471 | 0 | 25 | 4 |
| UK | 350 | 190 | 151 | 9 | 3 |
| Australia | 300 | 202 | 98 | 0 | 3 |
| Japan | 496 | 227 | 160 | 109 | 4 |
| EU | 103 | 43 | 14 | 46 | 1 |

Members are the union of each market's shown indexes. "Accounted for" counts a company-side reason only ([decision 0015](../decisions/0015-coverage-accounted-for.md)).

## Order of work
1. **EU (PARITY-73):** add the 26 companies read on 5 October (17 figures, 5 excluded, 4 open), read Danske Bank, Novonesis, Genmab, PKO Bank Polski and Orlen, then re-read the rest that are open. Goes live.
2. **India (PARITY-88):** the 25 open Nifty 500 members from annual reports on company sites. Goes live.
3. **UK (PARITY-89):** check the 55 no-filer companies against the gender pay gap service data and fix name matches; get 2025 filings for the 9 with older years only. Goes live. Group-wide gaps from annual reports are collected as inputs and wait for PARITY-92.
4. **Australia (PARITY-90):** check the 82 no-reporter companies against WGEA data. Goes live. Fallback gaps wait for PARITY-92.
5. **Japan (PARITY-91):** refresh the MHLW open data (goes live), then read company reports for women's share of regular staff and pay ratios (inputs; wait for PARITY-92).
6. **PARITY-92:** the UI that shows a company-report source and basis per year, and the builders that use the fallback inputs. One PR for the owner to merge in the morning.

## Waiting on the owner
- **Browser downloads** (sites that block scripts) into `~/Downloads/nivel-reports/`: E.ON, Ericsson, ArcelorMittal, SAP, Allianz, Iberdrola, Mercedes-Benz, Schaeffler India, and the FY2025-26 BRSRs of ITC Hotels and Piramal Finance. More are added below as they are found.
- **Merge PARITY-92's PR**, after which the fallback figures for Japan, the UK and Australia are loaded and released.

## Resume
- `python3 ~/.claude/usage-guard/usage_guard.py status` first; stop at 80% of the week or the window.
- Pipeline scratch inputs (NSE files, WGEA, gender pay gap CSVs, MHLW CSV) are in the session scratch folder named in the log; `pnpm data inputs pull` restores the inputs.
- Each market: rebuild, check the rebuild matches Firestore before adding anything, then add, `pnpm data load`, `pnpm data publish`, check the report, `pnpm data promote` if every check passes and the release only adds or corrects figures.

## Log
- **5 October 2026, evening:** goal set; decisions recorded; Plane issues 87 to 92 opened.
- **Release 20261005-010951 (live):** 17 EU companies gained figures (Sweden, Germany, Spain, Italy, France).
- **Release 20261005-012730 (live):** 13 more EU figures, including corrections:
  - ABN AMRO: the stored gap was a remuneration ratio; it is 18%.
  - Legrand: the 2024 figure was on a different basis, so it is dropped.
  - Air Liquide and EssilorLuxottica: now FY2025.
  - Prosus: year to March 2026.
  - India: 3 figures (CIE Automotive, Clean Max, Firstsource) and 8 verified reasons (listed during 2025-26, a financial year not ended, no staff before the Vedanta demerger).
- **Coverage after 20261005-012730:**

  | Market | Figure | Accounted for | Open | Accounted-for share |
  |---|---|---|---|---|
  | India | 474 | 8 | 14 | 97.2% |
  | UK | 190 | 151 | 9 | 97.4% |
  | Australia | 202 | 98 | 0 | 100% |
  | Japan | 227 | 160 | 109 | 78.0% |
  | EU | 73 | 22 | 8 | 92.2% |
- **Lesson:** an India reader downloaded seven BRSRs from NSE's archive, against the hold (PARITY-66). Nothing from them was used, the files were deleted, and the seven were re-read from the companies' own sites with exchange sites explicitly forbidden in the prompt.
- **Publish check:** publish checks shares of pay before `shared_scale.py` runs. So EU and Japan records must be loaded after shared scale, as the earlier records were (see the data-pipeline playbook). Moving the check was not done: it removes a safety check, which needs the owner.
- **PRs:** #36 (Japan reads the latest MHLW download) and #37 (India reasons input) merged. #38 (PARITY-92, company-report sources) waits for the owner.
- **Release 20261005-013831 (live):** Piramal Finance's figure, and 6 more India reasons, all from company sites (#40 runs reasons after the 15-point rule). Gillette India's BRSR prints 49.6% of wages to women, which its own tables contradict (about 17%), so it carries a reason instead.
- **UK and Australia checked** (64 and 82 companies, against the official data and their reports):
  - UK: 8 matching misses fixed (2025 figures for Avon, Hollywood Bowl, Halma, Intertek, IWG, Johnson Service, Morgan Advanced Materials, PPHE). Foresight Group and IP Group lose wrong matches. IMI gains its Norgren history (2017 to 2024). 8 older-only companies get verified reasons (#41).
  - Australia: 9 matching misses fixed (FDC, FleetPartners, Freightways, Ingenia, MA Financial, Metals X, Pinnacle, REA Group, Zip).
  - Records loaded; **release held for the owner.** Publish stops at the Spot the Stereotype feed gate: 3 items change (FTSE 100 pence and top quarter, ASX 200 top quarter). The answers children see are unchanged (87, 33, 34), and one rule line moves from 13.0% to 13.1%. Approving changes to a children's feed is the owner's call, so it was not done overnight: `pnpm data publish --approve-feed`, then promote.
  - Open, all sites that block scripts: UK Bridgepoint, Coca-Cola HBC, Energean, Plus500, Shaftesbury Capital; Australia Auckland Airport, Arafura, Antam, Infratil, Karoon, Mesoblast, Neuren, Pantoro, St Barbara, Spark. Each keeps its "no local employer files" reason, which the official data confirms.
  - Company-report group gaps found: Atalaya Mining and Foresight Group (UK, in `uk_reports.json`, used once #38 lands). Contact Energy and Meridian report FY2026 only, a year Australia's market does not have yet, so not used.
