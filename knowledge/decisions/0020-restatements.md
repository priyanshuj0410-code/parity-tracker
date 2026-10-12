---
type: decision
title: "0020: Restated figures: a later filing supersedes, unless it says the years are not comparable"
description: How Nivel handles a year that a later filing restates (KPR Mill's FY2024-25 wage share, 70.68% as filed and 62.22% in the FY2025-26 filing's prior-year column), from a survey of 328 Indian restatements and the filings' own notes.
status: accepted (owner, 13 October 2026)
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e5e1c562-93d5-4ea0-9dac-976ea4ed89f0
---

# 0020: Restated figures

## Context

A BRSR gives each figure for the year and the year before. When the second differs from what last year's filing said, the year has been restated. KPR Mill is the clearest case: its FY2024-25 BRSR gave women 70.68% of wages, and its FY2025-26 BRSR gives FY2024-25 as 62.22%, with the note "FY24-25 restated by redefining wages as per ISF". Nivel shows 70.7% for FY2024-25 with a note, so the company's own page reads as a 10-point fall when the like-for-like change is 1.5 points.

**Survey (12 October 2026):** 328 Indian companies have both a filed FY2024-25 wage share and the FY2025-26 filing's prior-year figure.

| Difference | Companies |
|---|---|
| Under 0.05 pp (rounding) | 272 |
| 0.05 to 0.5 pp | 36 |
| 0.5 to 1 pp | 10 |
| 1 to 5 pp | 8 |
| Over 5 pp | 2 (KPR Mill −8.5, KSB −5.6) |

About 25 filings explain a restatement next to the wage share table. The reasons fall into three kinds:
- **A new method on the same basis:** wages redefined under SEBI's Industry Standards Forum (ISF) for BRSR Core, an updated calculation, or validated payroll data (IPCA Labs: "restated from 8.51% to 6.39% based on validated payroll data").
- **A wider scope:** "restated to incorporate data pertaining to permanent employees and workers" (Usha Martin).
- **Not comparable:** a merger or demerger (Dalmia Bharat's refractory demerger; JK Tyre: "reflects the operations of the merged entity and are not comparable"), or "previous year's figures are not restated and hence not comparable" (Delhivery).

## Decision (accepted by the owner, 13 October 2026)

A later official filing supersedes an earlier one for the same year, unless it says the two years are not comparable. In every market:

1. **Rounding is not a restatement.** A difference under 0.1 pp (0.5 pp when either figure is printed as a whole percent) changes nothing and shows nothing.
2. **Not comparable:** when the later filing says so, or a merger, demerger or boundary change breaks the company in that year (`relations.break_fy`, a change of boundary), the year keeps its filed figure. The change between the two years is a basis change, left out of every like-for-like change, and the page says "Not comparable with FY25" with the filing's reason.
3. **Restated:** in every other case, the restated figure becomes the year's figure everywhere: the company page, its trend and peers, every index and group, and exports.
   - The filed figure is kept (`wFiled`), with the filing that restated it (`restatedIn`) and its own words (`restatedNote`).
   - The year shows a **Restated** badge, whose tooltip reads: "Filed as 70.7%. The FY26 filing restates it to 62.2%: wages redefined as per ISF."
   - The year is now on the next year's basis, so the change into it from the year before is a basis change, unless that year was restated on the same basis too.
4. **Checked before applied:** a restatement of 5 points or more that the filing does not explain, or one the 15-point rule or the plausibility checks reject, is held for a reading check and listed in the release report, not applied (KSB's −5.6 has no stated reason).
5. **The latest filing wins:** a year restated twice takes the latest figure; every earlier value is kept.
6. **Indexes:** Nivel's index history is recomputed with restated figures at the next release, and the release report lists each restatement with its index effect.

**Per market:** India applies it to every BRSR figure with a prior-year column (wage share, turnover, complaints). The UK, Australia and Japan publish a revised report in place of the original, which the next download picks up: rule 3 with the source's own revision date. The EU's CSRD statements must explain restated comparatives (ESRS 1, section 7.4), so rules 2 and 3 apply as written.

## Consequences

- KPR Mill shows FY2024-25 as 62.2% (Restated, filed 70.7%), FY2025-26 as 60.7%, a 1.5-point fall, and its FY2023-24 to FY2024-25 change becomes a basis change.
- 56 companies' FY2024-25 figures move by 0.05 pp or more, 10 of them by a point or more. Their indexes' FY2024-25 headlines move slightly, as the release report will show.
- **Built 13 October 2026:** `CompanyYear` gains `wFiled`, `restatedIn` and `restatedNote`; `dataLabel` gains the Restated badge (design.md section 5), and Calculations names the restatement under the change step. `to_records.py` (`restate`) reads each filing's note in the 45 lines after its wage share table and applies the rules above.
- **First run:** 30 restated (KPR Mill's FY2024-25 is 62.2%, first filed 70.7%), 6 kept as not comparable (Chambal Fertilisers and Elgi Equipments in their own words; TMPV's demerger), and 4 held for a reading check (Gillette, KPIT, whose 0.3% prior-year figure is a misread, Nazara and Zydus Lifesciences).
