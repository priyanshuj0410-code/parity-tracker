---
type: reference
title: Markets API
description: Nivel's play-money markets backend. Two edge functions on Thoth's shared engine (vendored), Nivel's own Neon database and Neon Auth, the adult record, the market templates and append-only log, the owner's console endpoints, the environment variables, and the owner's setup steps. Off unless MARKETS_ENABLED is set.
updated: 2026-10-06
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
  - https://app.plane.so/claude-pri/projects/18017c30-d8f6-436a-b4ca-a743d5317720/issues/48185eed-c661-4537-aebf-52d73913abcb
---

# Markets API

The backend for PARITY-44, built as [decision 0017](../decisions/0017-markets-architecture.md) sets out.
- **The engine:** a pinned copy of Thoth's `packages/market-engine` in `vendor/market-engine`. Its interface is in Thoth's `wiki/architecture/market-engine.md`.
- **Nivel's code:** `api/_markets.ts` (routes, adult record, details and log) and `api/_market_rules.ts` (the [templates](../plans/market-templates.md) as code).
- **What's left:** the pages players use (sign-in, the age step and the market view) and the owner's console page.

## Endpoints

| Path | Who | Does |
|---|---|---|
| `GET /api/markets?subject=…` | Anyone | Markets on a subject, each with its template details (threshold, definition, release, scheduled date, closing time). Shows the reader's position when they are signed in and recorded as an adult |
| `GET /api/markets?market=…` | Anyone | One market with its details and its log |
| `GET /api/markets?view=wallet` | Signed-in adult | Balance, lifetime earned, streak, and whether today's grant is claimable |
| `POST /api/markets` `{action: 'age', birthDate}` | Signed in | 18 or over: keeps the year of birth and returns `{adult: true}`. Under 18: `403 under_18`, and nothing is kept |
| `POST /api/markets` `{action: 'trade', marketId, side, shares}` | Signed-in adult | Buy (positive) or sell (negative) 10 to 1,000 shares, until the market's closing time |
| `POST /api/markets` `{action: 'claim'}` | Signed-in adult | The daily grant: 50, plus 10 a streak day, up to 100 |
| `POST /api/markets` `{action: 'forget'}` | Signed in | Deletes the player's adult record, wallet, ledger, trades and positions. Works even while markets are off |
| `GET /api/markets-admin` | Owner | Every market with its details, holders, trades and flags: `closed`, `checkDue` (seven days before the scheduled date) and `overdue` (more than 30 days past it) |
| `POST /api/markets-admin` `{action: 'create', template, subject, threshold, precision?, question, definition, releaseName, scheduledDate, scheduleDoc: {name, url, readOn}, resolutionLocation, source: {name, url}}` | Owner | Opens a yes-or-no market from a template, at 50 out of 100. The subject must fit the template's measure, and only one market per subject may be open. Closing time follows the template |
| `POST /api/markets-admin` `{action: 'schedule-check', marketId, readOn, revisedDate?}` | Owner | Logs the seven-day re-read of the schedule document |
| `POST /api/markets-admin` `{action: 'resolve', marketId, outcome, sourceUrl, releaseName, figure \| releaseId}` | Owner | After closing only. Works out yes or no from the figure and the threshold, at the source's precision. The owner's `outcome` must match, or it returns `409 outcome_mismatch` with the computed one. Nivel data takes a `releaseId` and reads the figure from that release, which needs 90% of payroll reported. Pays 1 per winning share |
| `POST /api/markets-admin` `{action: 'void', marketId, reason, note?}` | Owner | Refunds every stake. `reason` is `overdue`, `cancelled`, `redefined`, `early` or `error` |

**Errors:**
- `401 unauthenticated`
- `403 forbidden`, `not_adult`, `under_18` or `markets_disabled`
- `400 bad_request`, `trading_closed`, `already_closed` or an engine code: `bad_shares`, `insufficient`, `oversell`, `market_closed` or `no_market`
- `403 console_account`: anyone on `ADMIN_EMAILS` cannot play
- `409 subject_taken`, `still_trading`, `outcome_mismatch`, `not_settled` or `already_settled`
- `503 not_configured`
- `502 markets_unavailable`

## Switches and settings

| Variable | Set by | Meaning |
|---|---|---|
| `MARKETS_DATABASE_URL` | Owner | The pooled connection string of Nivel's own Neon project. Tables are created on first use |
| `NEON_AUTH_BASE_URL` | Owner | That project's Neon Auth base URL; tokens are checked against its JWKS |
| `ADMIN_EMAILS` | Owner | The emails allowed into the console, comma-separated |
| `MARKETS_ENABLED` | Owner, after counsel (PARITY-51) and the safeguarding review (PARITY-49) | `1` switches player reads and actions on. While it is unset, reads are empty and actions are refused, but the console works, so markets can be prepared in advance |

**Without the database and auth settings,** reads return no markets and everything else returns `503`. The site is unaffected either way: its pages never call these functions.

## The owner's setup
1. In Neon, create a new project for Nivel, separate from Thoth's, in the region nearest India.
2. Turn on Neon Auth in that project, and copy its base URL.
3. In the Vercel project for Nivel, set `MARKETS_DATABASE_URL`, `NEON_AUTH_BASE_URL` and `ADMIN_EMAILS` for Production and Preview. Leave `MARKETS_ENABLED` unset.
4. Redeploy. The first request creates the tables.

## Data kept
- **Adult record (`players`):** user id and year of birth, for adults only.
- **Engine tables:**
  - `wallets` and `ledger`, which has no money-in reason;
  - `markets`, which holds each market's source and the link it resolved on;
  - `trades` and `positions`.
- **Market records:** `market_details` (each market's template fields) and `market_log`, which is append-only: a trigger refuses any edit or deletion. The log holds console users' emails, not players'.
- **Neon Auth's own records:** the sign-in identity.
- **Deletion:** `forget` removes everything above except the sign-in identity. Prices keep each trade's effect, which holds nothing personal.

**Two gaps, both to close before `MARKETS_ENABLED` is set** (found in the [safeguarding review](../reviews/markets-safeguarding-2026-10.md)):
- **A refused under-18 keeps a sign-in identity.** The age step comes after sign-in, so Neon Auth already holds their identity. The pages will ask for the date of birth before an account is created, so an under-18 never gets one. The server check stays, because the page's check can be bypassed.
- **`forget` leaves the sign-in identity.** Until it is deleted through Neon Auth's admin API, the owner deletes it in the Neon console.

## Engine updates
- **Refreshing the copy:** `scripts/sync-engine.sh <thoth-commit>` copies Thoth's `packages/market-engine/src` into `vendor/market-engine` and records the commit in `VERSION`.
- **Re-pinning:** the copy is pinned to Thoth `eb4d5fc`, the commit on Thoth PR #45. Re-pin to the merged commit once that PR lands.

## Checks
- `pnpm test:markets` runs 16 tests on the routes, using the engine's in-memory adapters. They cover:
  - the age gate, under-18 refusal, adult-only wallets, public reads, the switch and deletion;
  - the admin allowlist and console accounts that cannot play;
  - template-only markets, one per subject, and closing times;
  - resolving from the figure, with the owner's confirmation and ties at the source's precision;
  - Nivel data read from the release at 90% reported;
  - void reasons, schedule checks, overdue flags and the log.
- The engine's own 16 tests run in Thoth (`pnpm test:engine`).
