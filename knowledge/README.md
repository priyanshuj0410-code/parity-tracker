---
type: index
title: Nivel knowledge repository
description: OKF knowledge for Nivel (formerly Parity Tracker), a public tracker of women's share of payroll for stock indexes and their companies, built with The Equal Lens.
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c3ec5678-d63b-4dd8-b080-607f10ae9c50
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/997c6dda-88ad-486d-8634-571ca6978989
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aa1e98d8-d58d-4a3e-8d0b-eccea0459975
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/db4c43c6-0bdb-4dec-a387-338867b35576
---

# Nivel knowledge

The app was renamed from Parity Tracker to Nivel on 2 October 2026 ([decisions/0002](decisions/0002-app-name-shortlist.md)). The repository, Vercel and Plane identifiers still say `parity-tracker` and `PARITY`. The working wiki for chats is in [../wiki/index.md](../wiki/index.md). This folder holds OKF documents.

- [design.md](design.md): design system (Equal Lens minimal register, validated chart palette, voice)
- [plane.config.md](plane.config.md): Plane workspace, project and state IDs
- [playbooks/data-backend.md](playbooks/data-backend.md): load, publish, preview, promote and roll back data releases from Firestore, with no merge
- [playbooks/app-data-layers.md](playbooks/app-data-layers.md): how Nivel keeps data and app layers apart, a proposal for the other apps (SwipeEd and Spot the Stereotype have not adopted it), and the stricter rules for children's apps
- [reference/data-api-v1.md](reference/data-api-v1.md): the public data API at /data/v1/ for Spot the Stereotype, SwipeEd and others
- [reference/markets-api.md](reference/markets-api.md): the play-money markets backend (off by default): endpoints, settings, the adult record and the owner's setup
- [playbooks/data-pipeline.md](playbooks/data-pipeline.md): how each market's dataset is built and refreshed, plus shared sectors and logos
- [playbooks/brsr-watch.md](playbooks/brsr-watch.md): the daily watch for late BRSR filers, and the owner's "No BRSR filed" marks
- [playbooks/deploy.md](playbooks/deploy.md): shipping to production from the CLI, and the free-plan upload limit
- [decisions/0001-comparable-parity-measures.md](decisions/0001-comparable-parity-measures.md): the shared scales (employment parity, wage parity) that make every company and index comparable
- [decisions/0002-app-name-shortlist.md](decisions/0002-app-name-shortlist.md): the N-name shortlist and the choice of Nivel
- [decisions/0003-path-urls-and-prerendered-pages.md](decisions/0003-path-urls-and-prerendered-pages.md): plain path URLs with one prerendered HTML file per page, so shared links preview their own page
- [decisions/0004-data-as-separate-files.md](decisions/0004-data-as-separate-files.md): company and index data load as hashed JSON files alongside the code, not inside it
- [decisions/0011-data-backend.md](decisions/0011-data-backend.md): data moves to a free Firebase project; releases go live by preview and promote, with no merge
- [decisions/0012-progressive-loading.md](decisions/0012-progressive-loading.md): pages show as their own data arrives, from static files rather than live database reads
- [decisions/0013-no-investment-returns.md](decisions/0013-no-investment-returns.md): Nivel publishes no returns, prices or growth figures
- [decisions/0014-data-separate-from-app.md](decisions/0014-data-separate-from-app.md): the app holds no data; edge functions serve releases and page previews; promote moves a pointer, with no rebuild
- [decisions/0015-coverage-accounted-for.md](decisions/0015-coverage-accounted-for.md): coverage means every company has a figure or a verified company-side reason; company reports are a fallback with their basis shown
- [decisions/0016-static-releases.md](decisions/0016-static-releases.md): the site reads releases from static files on the nivel-data Vercel project, never Firestore, so a quota cannot take it down
- [decisions/0017-markets-architecture.md](decisions/0017-markets-architecture.md): accepted. Nivel's markets use Thoth's engine as a shared package, with Nivel's own sign-in, ledger and database, and no shared pool
- [decisions/0019-figures-out-and-company-markets.md](decisions/0019-figures-out-and-company-markets.md): accepted. Figures out go to Guess, figures not out go to Forecast; a company's report coming out is a release; any covered company can have a long-dated market
- [decisions/0020-restatements.md](decisions/0020-restatements.md): accepted. A later filing supersedes an earlier one for the same year unless it says the years are not comparable; rounding ignored, large unexplained restatements checked first (PARITY-134)
- [decisions/0018-weekly-market-cycle.md](decisions/0018-weekly-market-cycle.md): accepted. Claude proposes markets each Saturday, the owner approves them, they open Sunday night and settle by the next Saturday; no free creation
- [plans/coverage-99.md](plans/coverage-99.md): overnight plan and log for 99% coverage in every live market
- [decisions/0010-fund-footprint-method.md](decisions/0010-fund-footprint-method.md): fund footprints: attribution by market cap, a 60% coverage floor, comparison only with each fund's Tier 1 benchmark, and no ranking
- [plans/brsr-dashboard-flows.md](plans/brsr-dashboard-flows.md): the Parity dashboard (begun as the BRSR build dashboard) as one page, with the owner's eight jobs, click depth, interaction rules and run states
- [plans/us-indexes.md](plans/us-indexes.md): adding the S&P 500 and Dow as a limited-data market, measured by women's share of board seats
- [plans/fund-footprints.md](plans/fund-footprints.md): women's share of the payroll a mutual fund or personal portfolio owns
- [plans/nivel-play-and-markets.md](plans/nivel-play-and-markets.md): Nivel's play side (Spot the Stereotype) and its prediction markets on a shared engine
- [plans/data-visualisation.md](plans/data-visualisation.md): proposed visualisations for all 24 cases in the manner of The Pudding, with four signature forms (the Hundred, three marks, the ladder, the parity clock) and honesty rules
- [plans/information-architecture.md](plans/information-architecture.md): agreed IA v2, with four tabs (Play as the default page, Track, Stories, Me), the affinity map, research evidence, addresses and the staged build
- [plans/spot-the-stereotype-anytime-and-nivel.md](plans/spot-the-stereotype-anytime-and-nivel.md): for the game team, anytime play without the discussion steps, the Nivel feed for a workplace theme, and bringing Nivel's readers to play
- [plans/mit-solve-application.md](plans/mit-solve-application.md): the draft MIT Solve 2027 application and the plan to submit it by 2 November 2026
- [research/norm-markets-evidence.md](research/norm-markets-evidence.md): evidence brief on misperceived norms about women's work, what to forecast and what not to, and neutral wording
- [research/resolution-sources.md](research/resolution-sources.md): the dated publications markets can resolve against, with schedules
- [plans/market-templates.md](plans/market-templates.md): the spec for market templates (Nivel data, PLFS, norms), the subject format, closing, resolving and voiding, and the resolution log
- [plans/markets-evaluation.md](plans/markets-evaluation.md): evaluation design for norm forecasting, with a comparison group, sample size, analysis plan and claims
- [plans/queue-2026-10-06.md](plans/queue-2026-10-06.md): the two jobs queued for the 6 October usage reset (Thoth's engine package and the markets docs), with their prompts
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
- [decisions/0009-parity-50-backfill.md](decisions/0009-parity-50-backfill.md): the stand-in figures that extend the Parity 50 and Nifty 50 comparison back to September 2021
- [research/parity-50-v2-results.md](research/parity-50-v2-results.md): version 2 results, what the bar keeps out, and the version shown on Nivel as a simulation
- [plans/cross-market-dataset.md](plans/cross-market-dataset.md): extending the Parity dataset to every Nivel organisation in every market from official government filings, the owner's decisions, India's release first, and the crosswalk table's specification (PARITY-130)
- [plans/profile-insights.md](plans/profile-insights.md): accepted and built. Up to three rule-based insights on each company profile, with no model: the rules, guards, ranking, sentences and firing rates on all 2,399 companies (PARITY-134)
- [plans/india-brsr-1000.md](plans/india-brsr-1000.md): adding every BRSR filer to India from the Kaggle dataset, with a payroll-weighted group, the decisions and the steps to resume
- [research/gender-disclosure-crosswalk.md](research/gender-disclosure-crosswalk.md): every gender data point in six markets as 324 stable ids and 33 measures, each market's status (disclosed, computable, not available) with the instrument and scope, and how exactly Nivel's S, E and W follow (PARITY-130)
- [research/issb-gender-baseline.md](research/issb-gender-baseline.md): the ISSB as the global anchor for gender data: no gender metric in IFRS S1 or S2, SASB representation metrics in a few industries, the workforce project at research stage, adoption by market
- [research/brsr-predictive-models.md](research/brsr-predictive-models.md): backtests of models for missing BRSR reports, next year, the group figure and field gaps; carrying forward wins, so the build uses rules
- [research/brsr-requirements.md](research/brsr-requirements.md): who must file a BRSR and from when, the BRSR Core assurance glide path, the gender disclosures behind Nivel's figures, and the binding gender rules outside BRSR, checked against SEBI and MCA texts (12 October 2026)
- [research/brsr-dataset-2024-25-check.md](research/brsr-dataset-2024-25-check.md): the shared third-party BRSR dataset checked: FY2024-25 filings from NSE's archive, overlap with Nivel, four Nivel values it shows to be wrong, and the open question on using it
- [research/india-payroll-units-2026-10.md](research/india-payroll-units-2026-10.md): the 62 India payrolls outside ₹1.5 lakh to ₹75 lakh a head, what each one is, how the Nifty indexes move once they are settled, and what is left for the owner
- [reviews/design-audit-2026-10.md](reviews/design-audit-2026-10.md): design audit against Kite, Coin and Groww, with before and after screenshots
- [reviews/legal-review-2026-10.md](reviews/legal-review-2026-10.md): the SEBI, NSE, DPDP and FCRA rules Nivel touches, what changed, and twelve questions for counsel
- [reviews/gaming-act-check-2026-10.md](reviews/gaming-act-check-2026-10.md): why Nivel's play-money markets are an online social game under the 2025 Act, the build rules that keep them one, and seven questions for counsel
- [reviews/markets-safeguarding-2026-10.md](reviews/markets-safeguarding-2026-10.md): draft for the owner's sign-off. The markets' 18+ gate, what data is kept and for how long, moderation of norm questions, deletion, incident steps and questions for counsel
- [reviews/ux-audit-2026-10-02.md](reviews/ux-audit-2026-10-02.md): ship-readiness audit against Nielsen's heuristics, Apple HIG, Material 3, Gestalt and WCAG 2.2 AA, with a reusable checker

Research history (the first tests that led to this app) lives in the Thoth repo under `knowledge/research/`.
