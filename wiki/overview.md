---
type: overview
updated: 2026-10-01
---

# parity-tracker — overview

> The living synthesis of parity-tracker. Keep this current as the project evolves — it is the first thing a new chat reads.

## What it is
A public tracker, built with The Equal Lens for its MIT Solve pitch, of how much of the payroll an index investor owns is paid to women. It applies the financed-emissions attribution method to gender, using companies' own legally required filings, and shows trajectories for indexes and their companies.

## Current state
- **v1 (2026-10-01):** India only. Covers the Nifty 50, Sensex and Nifty Next 50 (98 companies with filings, FY2021-22 to FY2025-26) from SEBI BRSR XBRL.
- **Pages:** indexes overview with a market coverage map, index detail, company trajectories, companies directory, and method and limitations.
- **Next markets:** UK (gender pay gap service), Japan (EDINET), Australia (WGEA), EU (CSRD). The US is limited to board data.
- **Design rules:** [../knowledge/design.md](../knowledge/design.md). Pipeline runbook: [../knowledge/playbooks/data-pipeline.md](../knowledge/playbooks/data-pipeline.md).

## Stack
Vite + React + TypeScript, static data in `src/data/*.json`, hash routing, Vercel. Data pipeline in Python under `pipeline/india/`.

## Related
[index](index.md) · [tickets / board](tickets/index.md)
