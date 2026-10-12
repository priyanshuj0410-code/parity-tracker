---
type: plan
title: Rule-based insights on company profiles
description: A fixed set of rules, with no model, that picks up to three notable facts for each company profile from its own figures and its market's distribution, with the conditions, guards, ranking and sentences, prototyped on all 2,399 companies (12 October 2026).
status: accepted and built (owner, 13 October 2026)
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e5e1c562-93d5-4ea0-9dac-976ea4ed89f0
---

# Rule-based insights on company profiles

**The ask (owner, 12 October 2026):** "Figure out rules (algorithms) to present insights like this one... The insights should come up on the profile based on rules without relying on AI". The example was KPR Mill: women are 82% of its permanent staff and 1 of its 12 directors. Its restatement is handled by [decision 0020](../decisions/0020-restatements.md), which runs first, so no insight ever reads a superseded figure.

## How it works

- **Rules, not a model:** each rule reads one company's latest year and its market's figures, fires on a stated condition, and fills a fixed sentence with numbers. The same data always gives the same sentences.
- **Strength:** a rule that fires returns its size against its own threshold (a 40-point gap where 20 is needed scores 2), capped at 3, times its kind's weight.
- **At most three a profile, one of each kind:** where women work, job mix, pay, board, change, standing, data. The strongest of each kind competes; ties go to the order below.
- **No repeats:** when two picked sentences would state the same staff share, the second gives only its new fact ("Women get 44% of pay, 12 points below their share of staff"). A board fact the ladder already states is not repeated.
- **Older years:** a company whose newest figure is from the year before gets its insights prefixed "FY25:".
- **Nothing is forced:** a company with nothing notable shows no insights. That is most UK, Australian, Japanese and EU companies (below).

## Guards (every rule)

- **Reported figures only.** An estimated share, a figure left out (`dq` 4) or a W outside 30 to 130% never feeds a rule. Lenskart's share is an estimate equal to its staff share, which would read as "pay level with men's".
- **No insight on a figure under an open data check:** the release report's cross-checks and one-year jumps. Kaynes, Kirloskar Industries, HPL, Quess and Medanta get none until settled, since each would otherwise lead with a disputed figure.
- **Changes are like for like:** both years reported, no basis change, the restated base where a later filing restates the year, and never a move of more than 15 points.
- **Minimum sizes:** 8 peers for a median, 30 companies for a market's range of changes, 50 people in each staff group compared, 5 board seats.

## The rules

Firing counts are on the 12 October data: India from the release build, the other markets from the live release. A company can fire several rules and show at most three.

| Rule | Kind | Fires when | Sentence | IN | UK | AU | JP | EU |
|---|---|---|---|---|---|---|---|---|
| Ladder | Where | The most senior rung reported (top or senior management, KMP, board or officers, 5+ people) has a women's share 20+ points below the staff share | "Women are 82% of permanent staff and 1 of 12 directors." | 58 | | | 10 | |
| Top quartile | Where | Women's share of the top pay quartile is 15+ points below their staff share | "Women are 27% of Australian staff and 9% of the top pay quartile." | | 35 | 43 | | |
| Managers | Where | Japan: women's share of managers is 15+ points below their share of regular staff | "Women are 38% of regular staff and 13% of managers." | | | | 100 | |
| Workers and office | Job mix | India: women's share of workers and of other employees differ by 40+ points (50+ in each) | "Women are 95% of workers and 17% of other employees." | 14 | | | | |
| Pay below staff | Pay | Share of pay 10+ points below share of staff | "Women are 35% of permanent staff and get 25% of pay." | 51 | 4 | 16 | 34 | 5 |
| Above parity by mix | Pay | Share of pay at 50%+ while wage parity is under 70% | "Women get 61% of pay because most staff are women; their average pay is 34% of men's." | 2 | 1 | 7 | 3 | 1 |
| Wage parity | Pay | Wage parity under 50%, level (99.5 to 101.5%), or above | "Women's average hourly pay is 103% of men's, above parity." (basis named: hourly in the UK, full-time-equivalent in Australia) | 198 | 17 | 11 | 4 | 9 |
| Bonus gap | Pay | UK: mean bonus gap of 40%+ | "Women's mean bonus is 79% below men's." | | 69 | | | |
| Board | Board | No women; India's legal minimum of one on a board of 8+; or 40%+ women | "One woman on a 12-member board, the minimum the law requires." | 305 | | | 2 | |
| Big move | Change | Like-for-like change of 2+ points, in the market's top or bottom tenth | "Women's share of pay rose 2.6 pp since 2024, among the largest rises in the UK." | 146 | 24 | | | 1 |
| Streak | Change | Three or more like-for-like changes in a row in one direction, each 0.2+ points | "Up 4 years running: 44% in 2021 to 49% in 2025." | 38 | 38 | | | |
| Standing | Standing | Twice or under half the median share of pay of its industry in its market (8+ peers, else its sector), and 8+ points apart | "Women get 61% of pay, 3.8 times the Textiles median in India (16%)." | 157 | 10 | 13 | 29 | 1 |
| Restated | Data | The year before was restated by a point or more | "The FY26 filing restates FY25 from 70.7% to 62.2%." | 3 | | | | |

**Coverage:** India 665 of 1,150 companies get at least one insight, the UK 135 of 350, Australia 72 of 300, Japan 138 of 496 and the EU 17 of 103. The other markets disclose fewer fields, and their rules need them.

## Examples (prototype output)

- **K.P.R. Mill:** "Women are 82% of permanent staff and 1 of 12 directors, the minimum the law requires." / "Women get 61% of pay because most staff are women; their average pay is 34% of men's." / "Women are 95% of workers and 17% of other employees."
- **State Bank of India:** "Up 3 years running: 24% in FY23 to 26% in FY26." / "Women are 29% of permanent staff and 1 of 12 directors, the minimum the law requires."
- **TCS:** "Women are 35% of permanent staff and get 25% of pay."
- **Paragon Banking:** "Women's mean bonus is 79% below men's." / "Women are 50% of UK staff and 28% of the top pay quartile."
- **Kikkoman:** "Women are 38% of regular staff and 13% of managers."
- **Steadfast Group:** "Women get 52% of pay because most staff are women; their average pay is 69% of men's." / "Women are 61% of Australian staff and 41% of the top pay quartile."
- **Daimler Truck:** "Women's average pay is 105% of men's, above parity."

## On the profile

- **"What stands out"** on the company Overview, above the shared scales: up to three statement rows, each a sentence with a link to the figures it comes from ("See the board"). No icons, no colour beyond the theme's text tokens, no ranking words beyond the rule's own.
- **Method lists every rule** with its condition, so a reader can check any sentence; the profile block links there ("How these are chosen").
- **Precedent:** Bloomberg's "At a Glance" cards on Lazyweb, a short row of headline facts above the detail; rule checklists (Simply Wall St's checks) for the public list of rules.

## Build, on approval

1. **Pipeline:**
   - India's BRSR staff categories in each record (employees, workers and KMP by gender), which the job-mix rule needs.
   - Decision 0020's fields (`wFiled`, `restatedIn`, `restatedNote`).
   - Each company-year's open data checks (`held`), from the release report.
2. **`src/lib/insights.ts`:** the rules as pure functions, tested against fixtures of the examples above, plus a test that runs every rule over a release and checks each sentence's numbers against the record.
3. **UI:** the "What stands out" block (design.md first) and the Method section.
4. **Release check:** `release.mjs` counts insights per rule and market in the staging report, so a rule that suddenly fires everywhere is seen before it ships.

## The owner's decisions (13 October 2026)

1. **The legal-minimum sentence stays:** "Keep, 1 in 12 is very sad."
2. **Thresholds stay as set:** "Looks good for now."
3. **Standing compares against both:** the industry median among all of the market's companies (every BRSR filer in India) and the median of the company's own index (its first listed index: Nifty 50, then Sensex, Nifty Next 50, Nifty 500 and so on). The sentence names both; it fires when either is twice or under half. Comparing against index peers too raises the rule's count: India 252, the UK 19, Australia 42, Japan 86 and the EU 8.

## Built (13 October 2026)

- **Rules:** `src/lib/insights.ts`, pure, with `buildContext` (the market's industry, sector and index medians and its range of changes) and `insights(company, context)`. Tests: `scripts/data/insights.test.ts`, in `pnpm test:data`, with KPR Mill's own figures.
- **Profile:** "What stands out" on the company Overview (`Company.tsx`, `WhatStandsOut`), and the rules on Method (`#insights`). design.md section 5 records the block.
- **Pipeline:** `to_records.py` writes India's staff split (`staff`: employees, workers and KMP by gender), decision 0020's fields and `held` on every company-year under an open data check.
- **Run on all 2,399 companies:** India 702 with at least one insight, the UK 136, Australia 98, Japan 172, the EU 21.
- **A ladder rung with no women** is left to the board rule, so Japan reads "No women among 12 officers", not "0 of 12 officers".
