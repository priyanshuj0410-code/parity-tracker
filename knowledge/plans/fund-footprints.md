---
type: plan
title: Fund and portfolio footprints
description: Plan for showing women's share of the payroll a mutual fund or a personal portfolio owns, starting with Indian mutual funds' monthly portfolios, then a portfolio statement read only in the browser, with the method, legal questions and steps.
status: planned
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4ebffad3-e9ba-4398-b3ee-32a958b04bcd
---

# Fund and portfolio footprints

## The idea
- An index fund owns a slice of every company in its index. Nivel already shows the payroll that slice represents, and how much of it goes to women.
- This plan extends the same arithmetic to:
  - **Mutual funds**, from the holdings they publish every month.
  - **A reader's own portfolio**, from the consolidated account statement (CAS) they already receive.
- This is the original "financed emissions, but for pay" idea from the early research, whose files sit in the Thoth repository ([nifty50-gender-payroll-footprint](../../../Thoth/knowledge/research/nifty50-gender-payroll-footprint.md)).

## Method
- **Headline:** women's share of the payroll the fund owns, Σ aᵢ·wᵢ·Wᵢ ÷ Σ aᵢ·Wᵢ, where:
  - aᵢ is the fund's holding value divided by the company's market cap (enterprise value is not available, and the method page will say so);
  - wᵢ is the company's women's share of pay;
  - Wᵢ is its payroll.
- **Coverage:** the share of the fund's equity value held in companies with usable data, shown beside every figure. Below a coverage floor (to be set, around 60%), the figure is shown as indicative or not at all.
- **Never ranked by the rupee parity gap:** that rewards capital-heavy companies that employ few people. Funds are compared on the share, with coverage.
- **Comparison with the fund's benchmark index:** for example a Nifty 50 fund against the Nifty 50 headline. The "No benchmark selected" illustration is for the picker.

## Data
- **Fund portfolios:** SEBI requires every scheme to publish its full portfolio monthly. Files come from each fund house's site in its own spreadsheet format, so parsers are per fund house. Start with the 10 largest fund houses' equity schemes.
- **Matching:** by ISIN, which Nivel's company records already carry. Holdings outside the tracked indexes count as uncovered.
- **Later:** fund houses' quarterly voting disclosures, which show how each fund voted on gender-related resolutions. That is the stewardship lever.

## Personal portfolios
- Readers upload their CAMS/KFintech consolidated account statement, which is a password-protected PDF.
- **It is parsed only in the browser**, with nothing uploaded or stored. The app keeps only scheme names and values in memory.
- No accounts are needed. Clear copy says what is read and that nothing leaves the device.

## Legal questions (before launch)
- **SEBI's ESG Rating Provider rules (2023):** a fund-level gender figure must not look like a rating. Present it as arithmetic on disclosed data, with no scores, grades or stars. Legal advice is needed on where the line sits.
- **Investment adviser rules:** no buy, sell or switch suggestions, and "not investment advice" on every fund page.
- **Digital Personal Data Protection Act, 2023:** the CAS contains personal data, so processing stays on the device with no storage and plain consent copy. Confirm with counsel.

## Steps
1. **F-1 Legal review:** the three questions above. The team and counsel own it, and it blocks launch, not building.
2. **F-2 Method note:** attribution, coverage floor and benchmark choice, recorded in [decision 0010](../decisions/0010-fund-footprint-method.md) (proposed).
3. **F-3 Fund portfolio pipeline:** the 10 largest fund houses' equity schemes, monthly, matched by ISIN.
4. **F-4 Fund pages:** footprint, coverage, top contributors, and comparison with the benchmark.
5. **F-5 Portfolio upload:** in-browser CAS parsing that keeps nothing.
6. **F-6 Stewardship (later):** voting records on gender-related resolutions.
