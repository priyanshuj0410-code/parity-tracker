---
type: decision
title: Data backend on Firebase, with releases that need no merge
description: Nivel's data moves out of the code repo into a free Firebase project. Pipelines write records to Firestore; a publish command freezes them into a release, builds a preview, and a promote command takes it live by rebuilding the unchanged app. Merges are for app code only.
status: accepted
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b8e24bab-221d-4ed9-99f5-434428caaa1b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/459f7fb5-a97a-4064-be30-d339eaaedfd9
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/90451686-6a03-48ed-b2e7-993e5649a10b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e178d8a6-05a3-4bbb-8419-8a9ff168593b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/04793a6e-433c-4a37-9cb0-b1494804cf0c
---

# Data backend on Firebase, with releases that need no merge

## Why
- **Today every data change is a code change.** New filings, companies, indexes or countries land as edits to `src/data/*.json`, `public/logos/` and hard-coded lists (`INDEX_ORDER`, the `MARKET` labels in `src/lib/data.ts`, `MARKETS` in `src/data/markets.ts`, `PACE_INDEX` on Home), so each one needs a PR and a merge.
- **The owner's rule (3 October 2026):** data updates of any kind must not need a merge. Merges are for app updates.

## Decision
- **Backend:** a new Firebase project for Nivel on the free Spark plan, separate from `the-equal-lens` (the games' Realtime Database), so neither project's quotas, rules or keys touch the other.
- **Firestore only.** Cloud Storage and Cloud Functions need the paid Blaze plan, so this design uses neither.
- **Static site stays.** A release rebuilds the same app code with new data; pages stay prerendered, fast and offline-capable.
- **Preview, then promote** (owner's choice): every release gets a preview site; nothing goes live until someone promotes it.

## Data model (Firestore)

| Collection | Holds | Written by |
|---|---|---|
| `markets/{code}` | Labels, measures, parity lines, year labels, coverage wording, sources text, flagship index, display order | Hand, once per country |
| `indexes/{id}` | Name, market, display order, weighting, as-of date, constituents | Pipelines |
| `companies/{symbol}` | Name, sector, exchange, indexes, years, filings, entities, logo key | Pipelines |
| `funds/{id}`, `simulations/{id}` | Fund list, Parity 50 | Pipelines |
| `logos/{chunk}` | 64×64 PNGs as base64, about 300 per chunk | Logo pipeline |
| `feeds/spot-v1` | Every Spot the Stereotype item ever published | Publish |
| `releases/{id}` | Status (staging, live, retired), who and when, record counts, check results; subcollection `chunks/{n}` with the frozen JSON, each under 900 KB | Publish |
| `channels/{live,staging}` | The release each channel points to | Publish and promote |

- **Security rules:** public read on `releases`, `channels` and `logos` (the data is published anyway); no client writes anywhere.
- **No keys anywhere.** The organisation blocks service account keys (`iam.managed.disableServiceAccountKeyCreation`), which is the safer default. Pipelines write as the `nivel-pipeline` service account (Cloud Datastore User only) by impersonation: a person's own Google login (Application Default Credentials) borrows its rights for each run. If publishing later runs from GitHub Actions, it uses Workload Identity Federation, also keyless.
- **Index figures are computed at publish,** by the same Python that computes them today (`shared_scale.py`, `sectors.py`, the index builders), so the numbers cannot drift from the method.

## The flow
1. **Collect:** a market pipeline runs as now, then `pipeline/backend/load.py <market>` upserts its companies and indexes into Firestore. Two markets can load at once without touching each other.
2. **Publish:** `pnpm data:publish` reads every record, computes aggregates, and runs the checks that today live in PR review:
   - schema and required fields;
   - coverage per index, and a list of companies that gained or lost a figure;
   - flagship headlines that moved, with the companies behind each move;
   - the Spot the Stereotype feed gate (a changed or retired item needs `--approve-feed`).
   It writes the release as `staging`, then deploys a Vercel preview built from it and prints the preview link and a change report.
3. **Promote:** `pnpm data:promote <release>` points `channels/live` at the release and calls the Vercel production deploy hook. The live site rebuilds from `main` with the new data. `pnpm data:rollback` points it back.

## Build order
PARITY-75 schema and loader, PARITY-76 publish and promote, PARITY-77 app reads releases, PARITY-78 pipelines and playbooks (parent PARITY-74). Built on 3 October 2026; how to run it: [data-backend.md](../playbooks/data-backend.md).

## What changes in the app (one PR, after the reset)
- **Prebuild:** `scripts/fetch-data.mjs` reads `channels/live`, or `DATA_RELEASE` for a preview, through Firestore's REST API (no key needed for public reads), and writes `src/data/*.json` and `public/logos/` before `vite build`.
- **`src/data/` leaves git,** except a small fixture for tests and offline development.
- **Hard-coded lists become data:** `INDEX_ORDER`, `MARKET`, `MARKETS`, `PACE_INDEX` and the per-market lines of the Method page's sources read from `markets` and `indexes`.
- **`src/feeds/spot-v1.json` moves** to `feeds/spot-v1`.

## What still needs a merge
- **App code:** new pages, layouts, components, measures or chart types.
- **Pipeline code:** a new parser for a new source. Once merged, every later refresh with it publishes without one.
- **Not yet moved (follow-up):** hand-read inputs that live in pipeline files, such as `pipeline/india/annual_reports.json` and `float_overrides.json`, `pipeline/eu/eu_values.json` and the EU headcounts, sector overrides, and the AU and UK name maps. A figure read from a report reaches the site through a release without a merge, but recording it in git still takes one ([PR #26](https://github.com/priyanshuj0410-code/parity-tracker/pull/26)). They should move to `inputs/{name}` records.

## Limits on the free plan
- **Firestore:** 1 GiB stored, 50,000 reads a day, 20,000 writes a day, 10 GiB downloaded a month. On Spark, a quota stops the service until the next day; it never bills.
- **Sizes today:** data about 3 MB, logos about 3 MB. A release is about 10 chunks, so 1 GiB holds well over 100 releases; retired releases older than a year are deleted.
- **A full refresh writes about 2,000 records,** and a build reads about 30 documents, well inside the daily quotas.

## Setup for the owner (no cost)
1. Create a Firebase project for Nivel on the Spark plan.
2. Create a Firestore database in Native mode, region `asia-south1` (Mumbai).
3. Create the `nivel-pipeline` service account with the Cloud Datastore User role (no key), grant your own account Service Account Token Creator on it, install the Google Cloud CLI and run `gcloud auth application-default login --impersonate-service-account=nivel-pipeline@nivel-equal-lens.iam.gserviceaccount.com`. Put `FIREBASE_PROJECT=nivel-equal-lens` in `.env`.
4. In Vercel, add a production deploy hook for `main` and put its URL in `.env` as `VERCEL_DEPLOY_HOOK`.

**Done, 3 October 2026.** Checked: the login impersonates `nivel-pipeline`, a test write and delete succeeded, and `.env` holds both values. The database ID is `default`, not the usual `(default)`, and is on the free tier. Every Firestore path uses `projects/nivel-equal-lens/databases/default`, so `load.py`, the `data:` commands and `fetch-data.mjs` use `default` (overridable with `FIRESTORE_DATABASE`, now in `.env`), never `(default)`.

## As built (3 October 2026)
Changes from the design above, each for a reason:
- **One Node client, not Python:** `pnpm data load` replaces `pipeline/backend/load.py`, and `pnpm data publish|promote|rollback|status` replace the `data:` scripts. The build's pull needs a JavaScript client anyway, so loading, publishing and pulling share one (`scripts/data/firestore.mjs`, the REST API, no SDK). Pipelines stay in Python and hand over JSON files.
- **Records hold their JSON as a string,** with `country` beside it for queries. It round-trips byte for byte, which a typed Firestore map does not (key order, whole numbers).
- **`datasets/{funds,simulations,logos}`** replace `funds/{id}` and `simulations/{id}`: their builders always replace the whole list. Logos are one record per PNG in `logos/{file}`.
- **Content-addressed `blobs/{sha256}`** replace `releases/{id}/chunks/{n}`: a release lists its files' blobs, so an unchanged file costs nothing to store again. Logos are packed into 16 groups per release.
- **No fixture:** `src/data/` holds whatever release was last pulled; `DATA_RELEASE=local` builds from it offline. The repo has no tests that would need a fixture.
- **Checked:** the first load matched every record in the old files exactly (1,754 companies, 40 indexes, 595 logos, the feed and the datasets). A release built from it rebuilt all 8,818 page heads identically, with the same data. Rendered pages matched the live site except the Home markets table (now lists every index shown) and the order of the Method page's source lines (market order).

## Alternatives considered
- **Supabase:** Postgres suits tabular data and the markets ledger, but a free project pauses after a week idle, and the $25 a month plan would be needed to avoid that.
- **Firebase with Cloud Storage:** cleaner for logos and snapshots, but needs the Blaze plan.
- **Live queries at runtime:** would drop prerendered pages and the offline app.

## Known costs
- **Nivel's prediction markets (PARITY-44):** the shared engine's ledger is written for Postgres. Hosting markets on Firestore means porting it; this decision does not settle that.
