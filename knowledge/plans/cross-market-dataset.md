---
type: plan
title: Cross-market dataset (every Nivel organisation, all markets)
description: The owner's decisions of 12 October 2026 for extending the Parity dataset beyond India's BRSR build to every Nivel market, the order of work (India's release first), what each market has today, and the specification of the measures crosswalk table.
status: planning
updated: 2026-10-13
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6b636025-64a4-4008-9b22-9c035eb10d14
---

# Cross-market dataset

The Parity dataset began as India's BRSR filer build ([india-brsr-1000.md](india-brsr-1000.md), PARITY-123 and PARITY-129). The owner asked on 12 October 2026 to extend it to every organisation on Nivel across its markets ([PARITY-130](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6b636025-64a4-4008-9b22-9c035eb10d14)). Nivel holds 1,754 companies: India 505, Japan 496, the UK 350, Australia 300 and the EU 103; the US is a stub with none.

## Decisions (owner, 12 October 2026)

1. **Sources: official government filings, as for India.** Each market's statutory filings are the source:
   - the UK: the GOV.UK gender pay gap service;
   - Australia: WGEA;
   - Japan: the MHLW women's advancement database and EDINET securities reports;
   - the EU: CSRD and ESEF statements filed with national storage (OAMs, then ESAP);
   - the US: SEC EDGAR.

   The company's own report stays the read-and-checked fallback ([decision 0015](../decisions/0015-coverage-accounted-for.md)). Registries for identifiers (Companies House, ABN, the corporate number) and GLEIF are separate questions.
2. **Universe: Nivel's index members first, then grow,** as India grew from the Nifty 500 to every BRSR filer.
3. **Years: each regime's own history, at least five years.**
4. **Basis: both, reconciled (owner, 12 October: "Use both... lead with national filings for that nation's entry... also report a consolidated group level profile, where their group and national numbers should match").** A multinational's statutory filing covers its staff in one country (the UK's legal employers, WGEA's Australian employers, Japan's listed entity, an Indian standalone BRSR), while its annual report covers the group worldwide. So:
   - **Entities:** each listed group links to the national entities that file for it, each keyed by its registry number: Companies House, ABN, the corporate number, the CIN, and later the EU's legal entities under the Pay Transparency Directive.
   - **National entry:** a company's entry in a market leads with that nation's filings, and that market's index uses only them.
   - **Group profile:** every group also gets a consolidated profile from its annual report (worldwide headcount by gender, board, executives, any group pay gap), with every national filing from every market attached.
   - **Reconciliation:** the group and national numbers must agree. National headcounts summed across markets cannot exceed the group's. Where a group reports headcount by country (ESRS S1-6 requires it for each country with at least 50 staff and 10% of the total), each country's figure is checked against that nation's filing. A mismatch is flagged with both figures, never smoothed over. The national and group figures never mix inside one index average.
5. **India first: finish and release the India work** before any other market starts (below).
6. **The crosswalk is a table:**
   - one row per measure;
   - the data points each measure needs;
   - for each market, whether each data point is readily available (disclosed), computable (and from what, exact or approximate), or not available at all.

   It starts from Nivel's own measures and widens to the least common multiple of every regime: [../research/gender-disclosure-crosswalk.md](../research/gender-disclosure-crosswalk.md), built 12 October 2026 with 324 data points and 33 measures; 125 more items found in the classification wait for the next pass.
7. **Later, not now:** use that table to ask organisations to share the data points as their own systems report them. The data points therefore get stable ids and definitions, so a company can be asked for exactly them.

8. **Which markets next: those adopting the ISSB standards (owner, 13 October 2026).** Brazil, Sri Lanka and similar markets join Nivel's six, because they report against the same global baseline ([../research/issb-gender-baseline.md](../research/issb-gender-baseline.md)).
   - **The catch:** IFRS S1 and S2 carry no gender metric, so each market still needs its own public gender source for S, E and W, as each of the six has (BRSR, the UK pay gap regulations, WGEA, the Japanese ordinance, ESRS S1).
   - **So each candidate is researched the crosswalk's way:** its ISSB status (adopted, phase-in, scope), then its public gender instruments, classified against the 324 data points. A market joins the build when it has a public source for at least one of S, E and W.
   - **Candidates to research first** (from memory, not yet checked): Brazil (CVM Resolution 193; the 2023 Equal Pay Law's twice-yearly pay transparency reports; the CVM reference form's workforce by gender and level), Sri Lanka (SLFRS S1 and S2), Hong Kong (HKEX ESG code: workforce and turnover by gender), Singapore and Malaysia (exchange core metrics on gender diversity), Chile (CMF NCG 461: pay gap by job category), Canada (CBCA diversity disclosure), Mexico, Turkey, Nigeria, Pakistan, Kenya and South Africa.
   - **When:** after the weekly usage reset (18 October 2026, 14:30); week usage was 78% on 13 October.

## Order of work

1. **India, finish:**
   - the FY2025-26 queue (about 290 left on 12 October, running on schedule);
   - the gap fill;
   - the history stores back to FY2021-22 for five years: FY2024-25 from the Kaggle texts, then FY2023-24, FY2022-23 and FY2021-22 with downloads.
2. **India, release** (build steps 2 to 6 in [india-brsr-1000.md](india-brsr-1000.md)):
   - put the code under version control;
   - build records in the app's shape;
   - add the payroll-weighted all-BRSR group;
   - make the UI changes;
   - publish a staging release, promoted only on the owner's approval.

   FY2025-26 can go out first, with the history years in later releases.
3. **Generalise the core** (about two attended sessions):
   - one store per market under a shared core;
   - a shared reading schema with per-market extensions;
   - a market column in the database;
   - per-market audit lists;
   - a market filter on the dashboard.
4. **Market adapters, Nivel index members first**, each about one session plus its reading batches.

## Where each market stands (mapping, 12 October 2026)

| Market | Nivel companies | Official source today | Years held | Missing next to India |
|---|---|---|---|---|
| UK | 350 (FTSE 350) | GOV.UK pay gap CSVs, matched by employer-name regex | 2017–2025 | Companies House keys (in the CSVs, unused); board, executives, real headcount, group figures, readings, identifiers |
| Australia | 300 (ASX 300) | one WGEA spreadsheet | 2024-25, plus an estimated 2023-24 | WGEA's public dataset back to 2014-15 (levels, hires, leavers, carer's leave, targets); ABN keys |
| Japan | 496 (Nikkei 225, TOPIX 500) | one MHLW snapshot | the latest only | history (MHLW archives, EDINET yuho from FY2022); corporate numbers and EDINET codes (no ISIN held) |
| EU | 103 | CSRD statements read by hand | FY2024, FY2025 | five years (pre-CSRD reports via OAMs); LEIs; a queue, second reader and audit |
| US | 0 | none (the first board-seat pass's outputs are lost) | none | everything; proxies and 10-Ks on EDGAR |

The full maps, with each market's measures against India's, identifiers, risks and the owner's remaining questions, are in the workflow output of 12 October (run wf_5a8462aa-39e).

## The crosswalk table (decision 6)

| Column | What it holds |
|---|---|
| Measure | A Nivel measure (women's share of pay, employment parity, wage parity) or a wider one (board, executives, managers by level, quartiles, bonus gap, hires and leavers, parental leave, harassment complaints, targets, assurance) |
| Data points | The atoms the measure needs, each with a stable id: what is counted (pay, headcount, people events, seats), gender, population (all, permanent, regular, full-time, national, by level, quartile or category), statistic (total, mean, median, share, gap), pay element (hourly, annual, base, total, bonus), period and scope (entity, national arm, group) |
| Per market | For each data point: available (with the instrument and item, such as BRSR P5 EI 3b or UK Reg. 2(1)(a)), computable (from which data points, exact or approximate), or not available |
| Exactness | For each Nivel measure and market, how exactly it can be computed: exact (a mean on total pay, all staff), approximate (hourly or full-time-equivalent means), or not computable (median-only or adjusted gaps) |
| Scope | Each data point's scope: the legal entity, the national arm (all of a group's filers in one country) or the group, and the reconciliation rule that ties the national arms to the group (decision 4) |
