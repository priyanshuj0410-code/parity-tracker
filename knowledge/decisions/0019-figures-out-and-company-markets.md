---
type: decision
title: Figures that are out go to Guess, figures not out go to Forecast, and any covered company can have a market
description: The owner's decisions of 7 October 2026. A release now includes a company's own annual report or BRSR, which refreshes its numbers. Play sorts every figure by whether it is out yet. Markets may ask about any covered company, as long-dated forecasts that settle when its report is out. The single-employer rule in the evidence brief is dropped.
status: accepted
updated: 2026-10-07
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c4435c71-67f7-4aec-84d1-f560b520a999
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/644b990b-7ada-44f2-9857-dca106be44bb
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/fa8f8fae-8491-4ea7-a075-2ac30e80f746
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/9dfa4769-00da-4e9c-952b-48cdf05abf7f
---

# Figures out go to Guess; figures not out go to Forecast; any company can have a market

**Status: accepted** by the owner on 7 October 2026. It amends:
- the [weekly cycle](0018-weekly-market-cycle.md);
- the [market templates](../plans/market-templates.md);
- the do-not-ask list in the [evidence brief](../research/norm-markets-evidence.md);
- [Play in the information architecture](../plans/information-architecture.md).

## Decision

**1. A release is any figure coming out**, and two kinds count:
- **A publisher's statistics:** a PLFS bulletin, an ONS release.
- **A company's own annual report or BRSR,** a UK gender pay gap filing, or a WGEA report.

A company's report coming out refreshes its figure. That in turn moves its indexes, its country and its sectors, which are all recomputed on publish ([PARITY-114](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/fa8f8fae-8491-4ea7-a075-2ac30e80f746)). The filings watch finds new reports (PARITY-116). In the interface, a figure is *out*; the word "release" stays internal.

**2. Play sorts every figure by one rule: out or not out.**
- **Out → Guess:** you guess the published figure, then see it.
- **Not out → Forecast:** you call what it will be, with play money, and the market settles when it comes out.
- **A figure moves from Forecast to Guess on the day it comes out.** A figure card's beats follow this: Recall is a Guess on the last published value, and Call it is a Forecast on the next.

**3. Markets may ask about any covered company** (PARITY-117). One example: "Will Infosys's women's share of wages for FY2026-27 be at least X%?"
- **Long-dated:** proposed in any Saturday run and open from Sunday 21:00. Trading closes at the end of the company's financial year, and the market settles when the report carrying that year comes out, often months later.
- **The threshold** comes from the company's last published figure, under the template's rule.
- **The 30-day grace** counts from the statutory filing deadline.
- **The owner's reasoning:** this is a game with play money, and anyone can estimate a company's women's share of staff from public sources such as LinkedIn. So the single-employer item comes off the evidence brief's do-not-ask list.

The weekly cycle stays for figures that come out within a week; company markets run alongside it.

## Consequences
- **A watch per market:** every covered company needs an expected filing window, so Play can show "Out by September", and so new reports can be spotted. India's BRSR files can't be scripted from NSE or BSE until PARITY-66. The source is the company's own site or the owner's downloads.
- **More markets at once:** the console will hold long-dated markets alongside the week's.
- **Trading closes at year end** because by then the figure is set inside the company. That keeps each market a forecast rather than a lookup, whatever the stakes.
- **Counsel:** counsel's review of the Gaming Act (PARITY-51) should see company markets in the list of question types.
