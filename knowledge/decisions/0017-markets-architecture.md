---
type: decision
title: Nivel's markets run on Thoth's engine as a package, with Nivel's own accounts, ledger and database
description: How Nivel would host play-money prediction markets. It reuses Thoth's tested engine as a shared package, keeps its own sign-in, ledger and Postgres database, never shares a pool or an operator with Thoth, and keeps the static site independent. Proposed; needs the owner's choices below and counsel's answers before anything goes live.
status: proposed
updated: 2026-10-05
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/8c45b074-94e8-4151-b8ad-2ba57a6e145d
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4fb24fb0-7ea1-419f-8ee7-ce8f9d2eb5ac
---

# Nivel's markets: Thoth's engine as a package, Nivel's own everything else

**Status: proposed.**
- Plan: [Nivel play and markets](../plans/nivel-play-and-markets.md).
- Legal: [Online Gaming Act check](../reviews/gaming-act-check-2026-10.md), awaiting counsel.
- What to ask and how: [evidence brief](../research/norm-markets-evidence.md) and [resolution sources](../research/resolution-sources.md).
- Measurement: [evaluation design](../plans/markets-evaluation.md).

## Context

**Nivel today has no accounts and no writes.**
- The site serves static releases ([decision 0016](0016-static-releases.md)).
- Firestore, on the free plan, is the store of record that only the data tools touch.
- Markets need sign-in, an 18+ gate, a balance per player, trades, positions, and someone to resolve and void markets.

**Thoth's engine exists and is tested.**
- In `/Users/priyanshu/Thoth`, `lib/market.ts` prices yes-or-no markets with LMSR as the house maker. It trades, resolves and voids, with a share size from 10 to 1,000.
- `lib/wallet.ts` keeps a "Feathers" ledger: a welcome grant and daily earnings, never bought or cashed out.
- Both write to Neon Postgres. Sign-in is Neon Auth (JWT, checked against its JWKS) and administration is THOTH-028. Everything sits behind a `MARKETS_ENABLED` switch.
- **It is not yet a package:**
  - the tables are created in Thoth's own `store.ts`, beside its news tables;
  - markets hang off news stories.
- THOTH-4 (extract the engine and ledger) and THOTH-5 (a host interface) are open.

**The Gaming Act check sets build rules.**
- Play money only: tokens earned, never bought, never cashed out, no prizes of money value.
- Adults only.
- **No merged pool with Thoth** until counsel answers question 6. One currency across two operators would make each depend on the other's compliance.
- Thoth and The Equal Lens are unrelated organisations. The engine is the only shared piece.

## Options

| Option | For | Against |
|---|---|---|
| **1. Shared package, Nivel's own accounts, ledger and database** (chosen) | Reuses tested pricing and ledger code. Nivel's players, balances and data stay Nivel's, which keeps the pools separate (rule 6). If the markets go down, the static site does not | THOTH-4 and 5 must happen first. A second database and sign-in to run |
| 2. Nivel calls Thoth's running service | The least new code | One operator for two unrelated organisations: shared personal data, shared compliance, and in effect a merged pool. Ruled out by rule 6 and by data protection |
| 3. Rebuild the engine on Firestore | One backend for Nivel | Duplicates the pricing and ledger logic. Firestore's free plan caps writes at 20,000 a day, and a quota outage has happened before |

## Decision (proposed)

**The engine (Thoth repo):**
- **THOTH-4:** extract `lib/market.ts` and `lib/wallet.ts` into a package that does not depend on any storage. It holds:
  - the LMSR maths;
  - the trade, resolve and void rules;
  - the earning rules for the ledger;
  - a `MarketStore` and `Ledger` interface, with a Postgres adapter and its own schema migration;
  - no news stories and no story ids. A market belongs to a host-defined subject.
- **THOTH-5, a host interface:** the host supplies:
  - the signed-in user id;
  - the adult check;
  - the market subject;
  - its question templates and resolution sources;
  - its own database connection.

  The package never reads a host's other tables.

**Nivel:**
- **Its own Postgres** (a Neon project of its own), used for writes only. Reads of Nivel's figures stay on the static site.
- **Sign-in:** Nivel's own (owner's choice below), giving a user id.
- **Adults only:** a date of birth at sign-up. Only "adult: yes" and the year are kept, and nothing is kept for anyone under 18.
- **API:** `api/markets/*` functions using the package. Admin resolution follows Thoth's console pattern, under PARITY-48.
- **Questions:**
  - First, yes-or-no thresholds on one figure, such as "Will the Nifty 50's women's share of pay for FY27 be at least 21%?". The engine supports these as it stands.
  - Later, bracketed answers (multi-outcome LMSR), if THOTH-4 takes them on.
- **Off until the gates are passed:** behind `MARKETS_ENABLED`, off by default, until:
  - counsel answers the Gaming Act questions (PARITY-51);
  - the safeguarding review (PARITY-49) is done.

**The game:**
- The feed's `nivel.markets` lists any open market on a figure, as PARITY-54 plans. The game already links a reveal to a figure's first market.

## Consequences
- **Nivel holds personal data for the first time:** sign-in identities and play records.
  - A privacy notice under the Digital Personal Data Protection Act.
  - Deletion on request.
  - Retention limits.
- **A second free database to watch.** Markets write little, so Neon's free plan should hold, and a cold start delays only a trade, never a page.
- **Separate pools are permanent** until counsel says otherwise. "Two entry points, one pool" (THOTH-6) waits on counsel.

## Owner decisions needed
1. **Approve option 1:** a shared package with separate accounts, ledger and database.
2. **Sign-in:**
   - **Neon Auth,** as Thoth uses, with the same code path.
   - **Firebase Auth,** in Nivel's existing Firebase project, which keeps one vendor for Nivel.
3. **First question format:** yes-or-no thresholds now, brackets later. The alternative is to build brackets first.
4. **Who resolves markets,** and the grace period when a source is late (PARITY-48).
