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

Why and what: [decision 0011](../decisions/0011-data-backend.md) (records and releases) and [decision 0014](../decisions/0014-data-separate-from-app.md) (the app holds no data; the edge serves releases). Per-market pipeline steps: [data-pipeline.md](data-pipeline.md).

## The loop
1. **Run a pipeline** as its section in [data-pipeline.md](data-pipeline.md) says. It writes JSON files in its scratch folder.
2. **Load:** `pnpm data load <market> <companies.json> <indexes.json>` replaces that market's companies and upserts its indexes. It prints what was added, changed and removed, refuses a file with another market's companies, and refuses to remove more than 10% of a market without `--force`.
3. **Publish:** `pnpm data publish` (add `--collected=YYYY-MM-DD` when the figures were collected on a new day). It assembles every record, runs `shared_scale.py` and `sectors.py`, checks everything, works out every page's title and description with the app's own code, and writes a staging release holding every file the site serves. It prints a change report against the live release (companies added or removed, figures gained, lost or changed, coverage per index, and flagship headlines with the companies behind each move) and a preview link: the live site with `?release={id}`.
4. **Check the preview,** then **promote:** `pnpm data promote`. The live channel points at the release; the site serves it within about five minutes, as edge caches refresh. Nothing is built, deployed or merged.
5. **If something is wrong:** `pnpm data rollback` points back at the release before.

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
- **No data in the build.** `pnpm build` compiles the app only. Every page is served by `api/page.js`, which adds the page's title, link-preview tags, the release id and preloads; `api/data.js` serves `/data/...`, `/feeds/spot/...` and `/logos/...` from the release in Firestore, cached at the edge (a release's files for a year, the live pointer for two minutes).
- **In the browser** the app loads `/data/r/{release}/app/core.json` (markets, indexes, simulations, sectors, logo map), then `v1/companies.json`, or one company's file first.
- **`pnpm dev`** serves the data paths from Firestore through the same handler; add `?release={id}` to a URL to see a staged release.
- **Before deploying,** `pnpm build && node scripts/serve-local.mjs` runs the build with the functions and rewrites as Vercel does.
- **Pipelines that read published data** (the funds builder, the logo pipeline) get a local copy with `node scripts/data/pull.mjs` (into `src/data/`, `src/feeds/` and `public/logos/`, none in git).

## Access
- Writes use your Google login, impersonating `nivel-pipeline` (no keys): `gcloud auth application-default login --impersonate-service-account=nivel-pipeline@nivel-equal-lens.iam.gserviceaccount.com`. Run it again if a command reports an expired login.
- The edge functions read without a login: `firestore.rules` makes `channels`, `releases` and `blobs` public. Deploy the rules after changing them: `firebase deploy --only firestore:rules --project nivel-equal-lens`. Always name the project: the Firebase CLI's active project for the home folder is another one (`praxis-2ffa8`), and even a `--dry-run` deploy creates a missing database there.
- The database ID is `default`, not `(default)`, and it must be the **Standard** edition: Enterprise counts reads by size, and a few builds exhaust its free quota. If it ever needs recreating: `firebase firestore:databases:create default --location asia-south1 --edition standard --project nivel-equal-lens`, redeploy the rules, then `seed` from a pulled release and `verify`.

## Storage and quotas (Spark plan, free)
- Records: `markets`, `indexes`, `companies` (one per company, about 1,750), `datasets` (funds, simulations, logo map), `logos` (one PNG each), `feeds/spot-v1`. Each holds its JSON as a string, so it round-trips exactly.
- Releases: `releases/{id}` lists its files as content-addressed `blobs` (SHA-256, under 900 KB each). A release that changes one file stores only that file's new blobs.
- A publish reads about 2,400 documents and writes only the blobs that changed (every company's file once, the first time). The site reads Firestore only when an edge cache misses: about two reads per file per region per release, and one for the live pointer every two minutes per region. The daily limits are 50,000 reads and 20,000 writes. When a limit is hit, Firestore returns 429 until the daily reset (midnight Pacific time) and builds fail, while the live site keeps serving its last build.
