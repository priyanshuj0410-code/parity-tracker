---
type: decision
title: Fund footprints: attribution, coverage floor and benchmark
description: How Nivel attributes a mutual fund's shares to company payrolls, when a fund's figure is shown, and what it is compared with. Applies to fund pages (F-4) and the portfolio upload (F-5), and keeps fund figures on the same arithmetic as index figures.
status: proposed
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/81a4edff-5dfc-485f-bfec-74f641dcc0bb
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4ebffad3-e9ba-4398-b3ee-32a958b04bcd
---

# Fund footprints: attribution, coverage floor and benchmark

Plan: [Fund and portfolio footprints](../plans/fund-footprints.md). Legal limits: [legal review](../reviews/legal-review-2026-10.md), question 5.

## The decisions

| Question | Decision |
|---|---|
| Attribution | The fund owns holding value ÷ the company's full market cap of its payroll |
| Payroll | Nivel's fixed payroll weight: the company's median reported payroll across years |
| Women's share | The latest fiscal year Nivel publishes; estimates flagged as on company pages |
| Headline | Σ aᵢ·wᵢ·Wᵢ ÷ Σ aᵢ·Wᵢ over the holdings with figures |
| Coverage | Equity value with figures ÷ all equity value, printed beside every figure |
| Floor | Shown at 60% coverage or more; below it, only the coverage |
| Index funds and ETFs | The tracked index's own figure |
| Benchmark | The scheme's Tier 1 benchmark when Nivel computes that index, as a difference in points |
| Order | Never ranked: lists sort by name or assets |

## Attribution

- **aᵢ = Vᵢ ÷ MCᵢ.** Vᵢ is the fund's holding in company i from its monthly portfolio; MCᵢ is the company's full market cap on the same date. Full, not free-float: a shareholder owns a slice of the whole company's payroll.
- **Same arithmetic as the indexes.** An index headline uses a = I × weight ÷ MC, so an index fund holding the index gets the index's figure.
- **Market cap, not enterprise value.** PCAF's financed-emissions method divides by enterprise value including cash (EVIC) to split a company between shareholders and lenders. Nivel attributes only to shareholders, debt and cash are not filed monthly, and banks' deposits would swamp EVIC. Consequence, stated on the method page: a leveraged company's payroll counts in full against its shareholders.
- **Source:** month-end market cap from NSE once consent or a licence is on file ([PARITY-66](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/d0a4b836-049d-4e53-98d6-9bdf266cd884)). Until then, AMFI's half-yearly average market cap list, keyed by ISIN, flagged on the page, with the benchmark recomputed on the same basis so the comparison stays like for like. [AMFI][amfi]

## Coverage and the floor

- **Coverage** is equity value held in companies with figures ÷ all equity value. Foreign shares, ETF units and other funds' units count as uncovered; there is no look-through in v1. Debt, cash, REITs and InvITs are outside equity and shown as the portfolio's equity share.
- **What the indexes show:** every Indian index Nivel computes has figures for 81% (Nifty Next 50) to 100% of its weight. Nifty 500 94%, Midcap 150 94%, Smallcap 250 87% (data collected 1 October 2026).
- **Floor at 60%,** as planned. It leaves room for active funds holding companies outside the Nifty 500, which Nivel has not collected, and coverage is printed beside every figure, so a 65% figure never passes for a full one.
- **Reported share too:** the share of covered payroll that companies reported rather than Nivel estimated, as index pages show ("93% of payroll reported").
- **Recheck with real portfolios (F-3):** if more than a fifth of shown funds sit between 60% and 80%, either raise the floor or collect the next 500 companies.

## Index funds and ETFs

- All 274 index funds and ETFs in Nivel's fund list track indexes Nivel computes. They show their index's figure, as they do now.
- Tracking differences are too small to change the figure, so no portfolio arithmetic is run for them.

## Benchmark

- **SEBI's two-tier benchmarking** (since 1 December 2021): every scheme names a Tier 1 benchmark for its category, as a total return index. [Moneylife][tier]
- **Compared only with that benchmark,** and only when Nivel computes it: Nifty 50, 100, 200, 500, LargeMidcap 250, Midcap 150, Smallcap 250 and the sector indexes. Same fiscal year, same market cap basis, shown as a difference in percentage points.
- **Not covered yet:** BSE 100, BSE 150 MidCap, BSE 250 SmallCap, BSE 500 and Nifty 500 Multicap 50:25:25. The page says "benchmark not covered" rather than swapping in a different index.

## What fund pages never do

- Rank funds, list a "best" fund, grade them or colour them by result.
- Compare one fund with another. Each fund is compared only with its own benchmark.
- Suggest buying, selling or switching.

These keep fund figures arithmetic on disclosed data rather than a rating or advice; counsel's answer to question 5 of the legal review can tighten them.

## Open until F-3 parses real portfolios

- How many funds fall between 60% and 80% coverage.
- How far AMFI's six-month average moves a fund's figure against month-end market caps.

[amfi]: https://portal.amfiindia.com/spages/AverageMarketCapitalization30Jun2026.pdf
[tier]: https://moneylife.in/article/sebi-issues-guidelines-for-twotiered-structure-for-benchmarking-of-mutual-fund-scheme/65467.html
