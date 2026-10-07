---
type: decision
title: Markets run on a weekly cycle that Claude proposes and the owner approves
description: Nivel's markets come only from proposals Claude makes each Saturday morning. The owner approves them in the console, they open on Sunday night, and each settles by the next Saturday morning on a dated official release. There is no free market creation. Decided by the owner on 7 October 2026.
status: accepted
updated: 2026-10-07
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
---

# Markets run on a weekly cycle

**Status: accepted** by the owner on 7 October 2026. It builds on [decision 0017](0017-markets-architecture.md) and changes how markets are made under the [market templates](../plans/market-templates.md). Markets stay off for players until counsel (PARITY-51) and the safeguarding review (PARITY-49), so the cycle runs dark until then.

## Decision

**The weekly cycle, in IST:**

| When | What happens |
|---|---|
| Saturday, by 09:00 | Claude files the coming week's proposals, and prepares the settlement of every market whose release came out |
| Saturday and Sunday | The owner approves or rejects each proposal in `/console`, and confirms each prepared settlement |
| Sunday, 21:00 | Approved markets open to players |
| Tuesday to Friday | Each market's source publishes. Trading closes at 23:59 the day before |
| Next Saturday, by 09:00 | Each market is settled: Claude prepares it and the owner confirms |

**There is no free creation.** The console's create form and the API's `create` action are gone. Every market comes from a proposal the owner approved, and the owner stays the only one who resolves ([decision 0017](0017-markets-architecture.md)).

**Sources are wider.** A market may resolve on any official statistics release about women's work and pay that publishes to a calendar, such as:
- in India, MoSPI, the Labour Bureau and ministries;
- elsewhere, the UK's ONS, Australia's ABS and WGEA, Japan's statistics bureau and Eurostat.

The rules of the templates still hold:
- a named, dated publication;
- a threshold set once, by rule;
- neutral wording;
- the do-not-ask list.

A week with nothing eligible gets no markets, and the Saturday run says so.

## Consequences
- **The release must fall Tuesday to Friday** of the market's week, so every market trades for at least a day. Approval fails outside that window (`outside_week`).
- **Nivel's own figure cannot run weekly.** Its trading closes at the end of the financial year, months before a release week, because company filings make the answer public. Nivel data markets stay in the templates for later.
- **The 30-day grace stays.** A source that slips past Saturday leaves its market open. The owner voids it as overdue after 30 days.
- **A market is hidden from players until 21:00 on its Sunday.** The console shows it as "Opens …".
- **Settlements are prepared, never applied by Claude.** `pnpm markets settle` records the figure, its source and the outcome. The owner confirms in the console, which checks the outcome against the threshold.

## How it runs
- **`pnpm markets`** (`scripts/markets/cli.mjs`): `list`, `propose <file>` and `settle <file>`, each with `--dry-run`. It reaches Nivel's database through the owner's Neon CLI login and never prints the connection string.
- **The Saturday run:** the scheduled task `nivel-markets-saturday`, at 07:00 IST every Saturday.
- **The owner's console** (`/console`): proposals with Approve and Reject, and each market's prepared settlement above its Resolve form.
- **Reference:** [markets-api.md](../reference/markets-api.md).
