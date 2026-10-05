---
type: decision
title: Coverage means every company accounted for, with company reports as a fallback
description: The owner's goal of 99% coverage in every live market counts a company as covered when it has a figure or a verified, company-side reason for having none. Where the statutory source has nothing, figures from the company's own reports are used with their basis shown. Overnight, checked releases may go live and pipeline PRs may merge after CI.
status: accepted
updated: 2026-10-05
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/89a8c85e-7ab4-46eb-9d06-cd28c850b2e6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/63876b77-0485-4f55-b912-c3337e1b9dfa
---

# Coverage means every company accounted for

## Why
On 5 October 2026 the owner set a goal: all live markets (India, UK, Australia, Japan, EU) at 99% coverage. A literal 99% of index members with a figure is impossible in the UK and Australia. About 150 UK and 100 Australian members are trusts and funds with no staff, or have no employer above the legal reporting threshold (250 UK staff, 100 Australian staff).

## Decision (owner's choices, 5 October 2026)
- **Covered** means a figure, or a verified reason on the company's side for having none: no employees of its own, below the reporting threshold, assessed the gap as not material, reports only an adjusted gap, listed or demerged too recently to have reported, or says its data is missing.
- **Open** means anything on our side: not read yet, a report we could not find, or a site that blocks scripts. The goal is at most 1% open per market, measured on the live release. Blocked sites go on a list for the owner to download by browser; they are never worked around.
- **Fallback sources,** used only where the statutory or regulator source has nothing, always with their basis shown on the company's page:
  - **Japan:** women's share of staff, and the pay ratio when it is not in the MHLW database, from the company's integrated, ESG or securities report. On 5 October 2026 the owner also allowed EDINET, the FSA's filing system, for securities reports: through its public viewer, one PDF at a time with pauses, no API key, stopping if it blocks scripts. A document ID may be found through search or other pages, but every figure comes from the EDINET PDF itself.
  - **India:** the BRSR section of the company's annual report, from its own website. Scripted NSE access stays on hold ([PARITY-66](../reviews/legal-review-2026-10.md)).
  - **UK and Australia:** a company's voluntary group-wide gender pay gap from its annual report, with women's share of its staff, when no UK or Australian employer files. This is a different basis from the statutory figure and is labelled as such.
- **Showing the basis needs a UI change** (PARITY-92). The Sources tab states the statutory source as fixed text, so fallback figures for Japan, the UK and Australia wait for that change and the owner's merge. India's annual-report path already shows its source.
- **Going live overnight:** a release that passes every publish check and only adds or corrects figures may be promoted without the owner. Each one is written up in [the plan](../plans/coverage-99.md).
- **Merges:** PRs touching only pipeline scripts, data tooling and knowledge docs may be merged after CI passes. UI changes wait for the owner.
- **Agents:** report reading runs as multi-agent workflows with adversarial checks on every figure, within the usage guard (stop at 80% of the week or the 5-hour window).

## Rules for every figure
- Read from the source passage in a document downloaded from the company's own site or an official registry, never from a search summary. Record the URL, the page and a short quote.
- Unadjusted, company-wide only. Adjusted, per-country, per-grade or "equal pay for equal work" figures give a stated exclusion instead.
- When a comparison year was calculated on a different basis, it is left out rather than compared.
