---
type: index
title: Nivel knowledge repository
description: OKF knowledge for Nivel (formerly Parity Tracker), a public tracker of women's share of payroll for stock indexes and their companies, built with The Equal Lens.
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c3ec5678-d63b-4dd8-b080-607f10ae9c50
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aa1e98d8-d58d-4a3e-8d0b-eccea0459975
---

# Nivel knowledge

The app was renamed from Parity Tracker to Nivel on 2 October 2026 ([decisions/0002](decisions/0002-app-name-shortlist.md)). The repository, Vercel and Plane identifiers still say `parity-tracker` and `PARITY`. The working wiki for chats is in [../wiki/index.md](../wiki/index.md). This folder holds OKF documents.

- [design.md](design.md): design system (Equal Lens minimal register, validated chart palette, voice)
- [plane.config.md](plane.config.md): Plane workspace, project and state IDs
- [playbooks/data-pipeline.md](playbooks/data-pipeline.md): how each market's dataset is built and refreshed, plus shared sectors and logos
- [decisions/0001-comparable-parity-measures.md](decisions/0001-comparable-parity-measures.md): the shared scales (employment parity, wage parity) that make every company and index comparable
- [decisions/0002-app-name-shortlist.md](decisions/0002-app-name-shortlist.md): the N-name shortlist and the choice of Nivel
- [reviews/design-audit-2026-10.md](reviews/design-audit-2026-10.md): design audit against Kite, Coin and Groww, with before and after screenshots
- [reviews/ux-audit-2026-10-02.md](reviews/ux-audit-2026-10-02.md): ship-readiness audit against Nielsen's heuristics, Apple HIG, Material 3, Gestalt and WCAG 2.2 AA, with a reusable checker

Research history (the first tests that led to this app) lives in the Thoth repo under `knowledge/research/`.
