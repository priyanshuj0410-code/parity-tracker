---
type: index
title: Nivel knowledge repository
description: OKF knowledge for Nivel (formerly Parity Tracker), a public tracker of women's share of payroll for stock indexes and their companies, built with The Equal Lens.
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c3ec5678-d63b-4dd8-b080-607f10ae9c50
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/997c6dda-88ad-486d-8634-571ca6978989
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aa1e98d8-d58d-4a3e-8d0b-eccea0459975
---

# Nivel knowledge

The app was renamed from Parity Tracker to Nivel on 2 October 2026 ([decisions/0002](decisions/0002-app-name-shortlist.md)). The repository, Vercel and Plane identifiers still say `parity-tracker` and `PARITY`. The working wiki for chats is in [../wiki/index.md](../wiki/index.md). This folder holds OKF documents.

- [design.md](design.md): design system (Equal Lens minimal register, validated chart palette, voice)
- [plane.config.md](plane.config.md): Plane workspace, project and state IDs
- [playbooks/data-pipeline.md](playbooks/data-pipeline.md): how each market's dataset is built and refreshed, plus shared sectors and logos
- [playbooks/deploy.md](playbooks/deploy.md): shipping to production from the CLI, and the free-plan upload limit
- [decisions/0001-comparable-parity-measures.md](decisions/0001-comparable-parity-measures.md): the shared scales (employment parity, wage parity) that make every company and index comparable
- [decisions/0002-app-name-shortlist.md](decisions/0002-app-name-shortlist.md): the N-name shortlist and the choice of Nivel
- [decisions/0003-path-urls-and-prerendered-pages.md](decisions/0003-path-urls-and-prerendered-pages.md): plain path URLs with one prerendered HTML file per page, so shared links preview their own page
- [decisions/0004-data-as-separate-files.md](decisions/0004-data-as-separate-files.md): company and index data load as hashed JSON files alongside the code, not inside it
- [plans/us-indexes.md](plans/us-indexes.md): adding the S&P 500 and Dow as a limited-data market, measured by women's share of board seats
- [plans/fund-footprints.md](plans/fund-footprints.md): women's share of the payroll a mutual fund or personal portfolio owns
- [plans/nivel-play-and-markets.md](plans/nivel-play-and-markets.md): Nivel's play side (Spot the Stereotype) and its prediction markets on a shared engine
- [plans/spot-the-stereotype-anytime-and-nivel.md](plans/spot-the-stereotype-anytime-and-nivel.md): for the game team, anytime play without the discussion steps, the Nivel feed for a workplace theme, and bringing Nivel's readers to play
- [plans/mit-solve-application.md](plans/mit-solve-application.md): the draft MIT Solve 2027 application and the plan to submit it by 2 November 2026
- [research/personas-and-journeys.md](research/personas-and-journeys.md): proto-personas and customer journeys for Nivel, Spot the Stereotype and the markets, with the plan to validate them
- [research/solve-innovation-assessment.md](research/solve-innovation-assessment.md): competitors, past Solver teams and literature, scored on Solve's Innovative Approach criterion
- [research/solve-winning-pitches.md](research/solve-winning-pitches.md): what six winning Solve applications have in common, the AI for Humanity Prize, and how Nivel's draft compares
- [research/solve-criteria-check.md](research/solve-criteria-check.md): the reframed draft scored on every Solve criterion, under Economic Prosperity and under Learning, with the fix for each gap
- [research/solve-swipeed-learning-check.md](research/solve-swipeed-learning-check.md): whether The Equal Lens's SwipeEd app fits Solve's 2027 Learning challenge, and what must change first
- [decisions/0005-equal-50-methodology.md](decisions/0005-equal-50-methodology.md): the pre-registered rules for the illustrative Equal 50 index
- [research/equal-50-results.md](research/equal-50-results.md): Equal 50 results against the Nifty 50 and Sensex, sensitivities and limits
- [decisions/0006-parity-aligned-nifty-500.md](decisions/0006-parity-aligned-nifty-500.md): pre-registered rules for the Parity-Aligned Nifty 500, an index that represents the market and tilts towards parity
- [research/parity-aligned-nifty-500-results.md](research/parity-aligned-nifty-500-results.md): why exact parity cannot represent the market, and the Parity-Aligned Nifty 500 backtest
- [decisions/0007-parity-50.md](decisions/0007-parity-50.md): pre-registered rules for the Parity 50, a 50-stock large-cap portfolio sized for a model portfolio such as a smallcase
- [research/parity-50-results.md](research/parity-50-results.md): Parity 50 backtest against the Nifty 50, its concentration in Infosys, the gap list, and the data correction made after the first run
- [decisions/0008-parity-50-v2.md](decisions/0008-parity-50-v2.md): Parity 50 version 2, where every holding pays women at least the Nifty 50's own share
- [research/parity-50-v2-results.md](research/parity-50-v2-results.md): version 2 results, what the bar keeps out, and the version shown on Nivel as a simulation
- [reviews/design-audit-2026-10.md](reviews/design-audit-2026-10.md): design audit against Kite, Coin and Groww, with before and after screenshots
- [reviews/legal-review-2026-10.md](reviews/legal-review-2026-10.md): the SEBI, NSE, DPDP and FCRA rules Nivel touches, what changed, and twelve questions for counsel
- [reviews/ux-audit-2026-10-02.md](reviews/ux-audit-2026-10-02.md): ship-readiness audit against Nielsen's heuristics, Apple HIG, Material 3, Gestalt and WCAG 2.2 AA, with a reusable checker

Research history (the first tests that led to this app) lives in the Thoth repo under `knowledge/research/`.
