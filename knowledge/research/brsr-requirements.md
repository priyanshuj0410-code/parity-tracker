---
type: research
title: BRSR requirements and gender targets, as of 12 October 2026
description: Who must file a BRSR and from when, what BRSR Core assurance applies to which years, the disclosures behind Nivel's gender figures, and the binding gender rules outside BRSR, each checked against SEBI and MCA texts.
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b0e815e8-8fd2-47b1-af1d-f81a2b7d6515
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/59edeb77-637d-4ab4-924e-43b8a22072b5
---

# BRSR requirements and gender targets

Researched on 12 October 2026 by three researchers, each checked claim by claim by a skeptic against primary texts (SEBI circulars, the LODR Regulations consolidated to 14 July 2026, the LODR master circular last updated 30 January 2026, MCA rules). Of 85 claims, 65 were confirmed, 18 corrected and 2 left unverified (marked below); the sunset was confirmed against the notified text on 12 October. The full claim list with sources is in the build's analysis data (`data/analysis/brsr-requirements-claims.json`). Related: [plans/india-brsr-1000.md](../plans/india-brsr-1000.md).

## Who must file, and from when

- **The rule:** LODR Regulation 34(2)(f). The top 1,000 listed entities by market capitalisation must include a BRSR in their annual report, in SEBI's format (now Annexure 16 of the LODR master circular, with the guidance note at Annexure 17 and BRSR Core at Annexure 17A). Others, SME-listed companies included, may file voluntarily.
- **History:** introduced by circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562 (10 May 2021): voluntary for FY2021-22, mandatory from FY2022-23, replacing the Business Responsibility Report. The updated format with the BRSR Core indicators (circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122, 12 July 2023) applies from FY2023-24.
- **How the top 1,000 is ranked (since 31 December 2024):** every recognised stock exchange prepares its own list on 31 December, ranking companies by average market capitalisation from 1 July to 31 December (Regulation 3(2)(a), as amended by SEBI/LAD-NRO/GN/2024/177 of 17 May 2024, in force from 31 December 2024). The first list was as on 31 December 2024. Before that, the ranking was market value on 31 March. The regulation does not say which exchange's rank counts; the Expert Committee's interim report (January 2024, para 1.3.2(b)) recommended the higher, so Nivel counts a company in BSE's or NSE's top 1,000.
- **When a newcomer starts:** a company entering the list must have systems in place by 1 April, or by the start of its next financial year if later, and reports in that year's annual report. So the 31 December 2025 list governs FY2026-27 BRSRs. A company listed during a year is ranked on that year's list, on its average over the time it was listed (SEBI Board memo, 15 March 2024; the regulation itself has no separate rule for new listings). This is the rule behind the dashboard's "BRSR due from" column.
- **Leaving (checked against the notified text on 12 October 2026):** coverage continues "unless its ranking changes … remaining outside the applicable threshold for a period of three consecutive years" (Regulation 3(2A)), and then ceases "at the end of the financial year following the 31st December of the third consecutive year" (3(2B); for a January to December year, three months after that 31 December). Only the December lists count, from 2024. So no company drops out for FY2026-27 on rank alone: one outside on the 2024, 2025 and 2026 lists files for the last time for FY2026-27, which the Expert Committee's worked example (Company X, ranked 1,020, 1,100 and 1,150) confirms. Before 31 December 2024 coverage never lapsed ("shall continue to apply … even if they fall below such thresholds"), so everyone covered under the old rule is covered for FY2026-27.
- **Not leaving:** a company in insolvency (CIRP) stays covered. Regulations 15(2A) and 15(2B) lift the board and committee rules during CIRP, not Regulation 34. It is only unlikely to file. Merged and delisted companies do leave.
- **SME-listed companies** file only voluntarily (the third proviso to Regulation 34(2)(f) groups them with "the remaining listed entities"), even with a top-1,000 market cap.
- **Filing:** the BRSR is part of the annual report, filed with the exchanges on or before dispatch to shareholders (Regulation 34(1)). The exchanges also require XBRL and PDF filings on their portals (a secondary source; the LODR master circular has no BRSR XBRL rule).
- **Nothing beyond the top 1,000:** "BRSR Lite" for unlisted companies was a 2020 MCA committee recommendation that was never implemented. SEBI has made no BRSR change since 28 March 2025.

## Who files for FY2026-27 (rankings.py, 12 October 2026)

AMFI's half-yearly lists of six-month average market cap stand in for the exchanges' lists, which the pipeline does not fetch (PARITY-66). Its December files average the same July to December window as Regulation 3(2)(a) and give BSE's, NSE's and MSEI's averages in their own columns; BSE's and NSE's are ranked separately. The files are in `~/brsr reports 2025-26/rankings/` (from amfiindia.com), the method in [../playbooks/brsr1000-batch.md](../playbooks/brsr1000-batch.md) step 10.

- **Cut-offs:** the 1,000th company on 31 December 2025 has an average of about ₹2,760 crore on NSE (Pokarna) and ₹2,990 crore on BSE. 1,037 companies are in one top 1,000 or both.
- **In the build, after adding the 150 top-1,000 companies the Kaggle filings lacked:** 1,045 file for FY2026-27, 94 join (first time in the top 1,000), 193 may drop out after FY2026-27 (outside on 2024 and 2025), 4 leave (merged, delisted or amalgamated) and 7 listed in 2026 (BRSR from FY2027-28 if in the top 1,000 on 31 December 2026). 140 are within 50 places of 1,000, where the exchange's own list decides.
- **Limits:** AMFI's figures are not the exchanges' lists; SME-listed companies are not removed, since the file does not mark them; and the 2022 and 2023 December averages only stand in for the old rule's 31 March lists. Five independent checks (parse, matches, joins, at-risk, rule) were run on 12 October; the parse was rebuilt from word positions after they found AMFI's MSEI column being read as NSE.

## BRSR Core and assurance

- **BRSR Core:** a subset of BRSR indicators under nine ESG attributes that need third-party assurance, now "assessment or assurance". Since circular SEBI/HO/CFD/CFD-PoD-1/P/CIR/2025/42 (28 March 2025), "assessment" means a third-party assessment under standards from the Industry Standards Forum (ASSOCHAM, CII, FICCI). Reporting must follow the Forum's BRSR Core reporting standards from FY2024-25 (circular 2024/177, 20 December 2024). *Unverified:* whether the Forum has published a separate assessment standard.
- **Glide path (unchanged since 2023):** top 150 for FY2023-24, top 250 for FY2024-25, **top 500 for FY2025-26**, **top 1,000 for FY2026-27**. Nothing found defers any year.
- **Value chain:** partners each making up 2% or more of purchases or sales, with coverage capped at 75%. Disclosure is voluntary for the top 250 from FY2025-26, and its assessment or assurance is voluntary from FY2026-27. In 2023 this had been comply-or-explain from FY2024-25.
- **The assurer:** the board must ensure expertise and no conflict of interest; the provider need not be a chartered accountant (SEBI LODR FAQs, 23 April 2025). The BRSR's Section A Q14 and Q15 name the provider and the type of assurance.

## The disclosures behind Nivel's figures

| Item | What it asks | Since | BRSR Core |
|---|---|---|---|
| Section A Q20(a) | Employees and workers, permanent and other than permanent, by male and female | FY2022-23 (Q18 in the 2021 format) | No |
| Section A Q20(b) | Differently abled employees and workers, by gender | FY2022-23 | No |
| Section A Q21 | Women on the board and among KMP (number and %) | FY2022-23 (Q19) | No |
| Section A Q22 | Turnover of permanent staff by gender, three years | FY2022-23 (Q20) | No |
| P3 EI 1(a), 1(b) | Health, accident, maternity, paternity and day care cover, by gender | FY2022-23 | No |
| P3 EI 1(c) | Well-being spend as % of revenue | FY2023-24 | Yes (attribute 5) |
| P3 EI 5 | Return to work and retention after parental leave, by gender | FY2022-23 | Yes (attribute 5) |
| P3 EI 7, 8, 9 | Union membership, training and reviews, by gender | FY2022-23 | No |
| P5 EI 2 | Paid minimum wage or more, by gender | FY2022-23 | No |
| P5 EI 3(a) | Median remuneration by gender: board, KMP, employees, workers (current year only) | FY2022-23 (was EI 3) | No |
| **P5 EI 3(b)** | **Gross wages paid to females as % of total wages, current and previous year** | **FY2023-24** | **Yes (attribute 6, Enabling Gender Diversity in Business)** |
| P5 EI 7 | POSH complaints: number, as % of female staff, upheld | FY2023-24 | Yes (attribute 6) |

- **Essential vs Leadership:** Essential indicators are mandatory for every mandated filer; Leadership indicators are voluntary. None of Principle 3's Leadership indicators is split by gender.
- **What this means for Nivel:** the women's share of payroll (P5 EI 3(b)) is mandatory for the top 1,000 from FY2023-24. It is assessed or assured for the top 500 in FY2025-26 and for all top 1,000 from FY2026-27. The headcount, board and KMP figures are mandatory but never need assurance.
- **Scope caveat:** SEBI's guidance does not say whether "total wages" in 3(b) covers other-than-permanent and contract staff. Companies differ: Mahindra & Mahindra's FY2025-26 figure (8.46%) counts permanent employees and workers only. Wages are defined by section 2(y) of the Code on Wages. Nivel should show the basis where a company states it.

## Targets

- **BRSR sets no gender target.** It is a disclosure framework. Section B Q5 to Q7 ask only for the company's own commitments and targets, and its performance against them.
- **Binding rules that BRSR filers meet:**
  - **LODR Regulation 17(1)(a):** at least one woman director on the board of every listed entity Regulation 17 applies to (in force 1 December 2015). Small entities (paid-up capital up to Rs 10 crore and net worth up to Rs 25 crore) and SME-listed entities are exempt under Regulation 15(2).
  - **The proviso:** the top 1,000 must have at least one **independent** woman director (top 500 from 1 April 2019, top 1,000 from 1 April 2020; ranking follows Regulation 3(2) since 31 December 2024). Exchanges fine Rs 5,000 a day, and two consecutive quarters of breach can lead to suspension of trading.
  - **Companies Act section 149(1) with Rule 3** of the 2014 Directors Rules: at least one woman director in every listed company, and in other public companies with paid-up capital of Rs 100 crore or turnover of Rs 300 crore. Penalties are under section 172.
  - **Code on Wages, section 3:** no gender discrimination in wages for the same or similar work, or in recruitment. In force from 21 November 2025, replacing the Equal Remuneration Act 1976.
  - **Board's report (Companies (Accounts) Rules, amended July 2025):** POSH complaint counts and a Maternity Benefit Act compliance statement, for all companies.
- **Nothing new pending:** MCA told the Lok Sabha on 12 August 2026 that no new diversity targets are under consideration (as reported by IANS). SEBI has no pending BRSR or gender proposal. The Corporate Laws (Amendment) Bill 2026 is with a Joint Parliamentary Committee and has no gender provisions.

## Ideas for Nivel (not yet agreed)

- Show whether a company's FY2025-26 wage share was assessed or assured (Section A Q14 and Q15): done in the dashboard's company pane on 12 October (PARITY-129). From FY2026-27 every top-1,000 figure will be.
- Record the wage-share basis (permanent only, or all staff) when a company states it, and say so beside the figure.
