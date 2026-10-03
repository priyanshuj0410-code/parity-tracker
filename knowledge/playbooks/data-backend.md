---
type: runbook
title: Data backend
description: How Nivel's data gets from a pipeline to the live site without a merge. Pipelines load records into Firestore, `pnpm data publish` freezes them into a checked release with a preview, and `pnpm data promote` takes it live.
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b8e24bab-221d-4ed9-99f5-434428caaa1b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/459f7fb5-a97a-4064-be30-d339eaaedfd9
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/90451686-6a03-48ed-b2e7-993e5649a10b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e178d8a6-05a3-4bbb-8419-8a9ff168593b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/04793a6e-433c-4a37-9cb0-b1494804cf0c
---

# Data backend

Why and what: [decision 0011](../decisions/0011-data-backend.md). Per-market pipeline steps: [data-pipeline.md](data-pipeline.md).

## The loop
1. **Run a pipeline** as its section in [data-pipeline.md](data-pipeline.md) says. It writes JSON files in its scratch folder.
2. **Load:** `pnpm data load <market> <companies.json> <indexes.json>` replaces that market's companies and upserts its indexes. It prints what was added, changed and removed, refuses a file with another market's companies, and refuses to remove more than 10% of a market without `--force`.
3. **Publish:** `pnpm data publish` (add `--collected=YYYY-MM-DD` when the figures were collected on a new day). It assembles every record, runs `shared_scale.py` and `sectors.py`, checks everything, writes a staging release and deploys a Vercel preview of `origin/main` built from it. It prints a change report against the live release: companies added or removed, figures gained, lost or changed, coverage per index, and flagship headlines with the companies behind each move.
4. **Check the preview,** then **promote:** `pnpm data promote`. The live channel points at the release and Vercel rebuilds production. Nothing is merged.
5. **If something is wrong:** `pnpm data rollback` returns to the release before and rebuilds.

`pnpm data status` shows the live and staged releases.

## Other records
| Change | Command |
|---|---|
| Market settings: labels, years, flagship, indexes shown and their order, Home table, Method source lines | `pnpm -s data get markets IN > in.json`, edit, `pnpm data put markets IN in.json` |
| A new country | `put markets <code>` with `status: live` and the fields in `MarketRecord` (`src/lib/data.ts`), then `load` it. A new reporting regime also needs app code for its method page and calculations. |
| A new index | Ship it in the market's indexes file and `load`; add its id to the market's `indexes` to show it |
| Index funds and ETFs, Parity 50 | `pnpm data put datasets funds <file>`, `pnpm data put datasets simulations <file>` |
| Logos | `pnpm data logos public/logos src/data/logos.json` |
| One index record | `pnpm data put indexes <id> <file>`, `pnpm data rm indexes <id>` |

Every change reaches the site only through publish and promote.

## What blocks a release
- A company or index missing required fields, in a market that is not live, or pointing at a company or index that does not exist.
- A market whose flagship or shown indexes are missing or lack the latest year.
- A logo map naming a file with no logo record.
- `sectors.py` meeting an industry label it cannot map.
- Spot the Stereotype feed problems, or feed changes not approved with `--approve-feed` ([data-pipeline.md](data-pipeline.md#spot-the-stereotype-feed-parity-52)).

## The app's side
- `pnpm build` and `pnpm dev` first run `scripts/data/pull.mjs`, which writes the live release into `src/data/`, `src/feeds/spot-v1.json` and `public/logos/`. None of these are in git.
- `DATA_RELEASE=<id>` builds a named release (publish uses it for previews). `DATA_RELEASE=local` keeps the files on disk, for working offline.
- `src/data/release.json` carries the release id and collection date, which the footer and Method page show.

## Access
- Writes use your Google login, impersonating `nivel-pipeline` (no keys): `gcloud auth application-default login --impersonate-service-account=nivel-pipeline@nivel-equal-lens.iam.gserviceaccount.com`. Run it again if a command reports an expired login.
- Builds read without a login: `firestore.rules` makes `channels`, `releases` and `blobs` public. Deploy the rules after changing them: `firebase deploy --only firestore:rules --project nivel-equal-lens`. Always name the project: the Firebase CLI's active project for the home folder is another one (`praxis-2ffa8`), and even a `--dry-run` deploy creates a missing database there.
- The database ID is `default`, not `(default)`.

## Storage and quotas (Spark plan, free)
- Records: `markets`, `indexes`, `companies` (one per company, about 1,750), `datasets` (funds, simulations, logo map), `logos` (one PNG each), `feeds/spot-v1`. Each holds its JSON as a string, so it round-trips exactly.
- Releases: `releases/{id}` lists its files as content-addressed `blobs` (SHA-256, under 900 KB each). A release that changes one file stores only that file's new blobs.
- A publish reads about 2,400 documents and writes about 30; a build reads about 30. The daily limits are 50,000 reads and 20,000 writes.
