---
type: runbook
title: Data backend
description: How Nivel's data gets from a pipeline to the live site without a merge. Pipelines load records into Firestore, `pnpm data publish` freezes them into a checked release with a preview, and `pnpm data promote` takes it live.
updated: 2026-10-06
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0a029a2e-4cf0-416d-b597-5a9da58d51ef
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/7424a532-a7b5-453f-8f99-52a34bf1bf39
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b8e24bab-221d-4ed9-99f5-434428caaa1b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/459f7fb5-a97a-4064-be30-d339eaaedfd9
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/90451686-6a03-48ed-b2e7-993e5649a10b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/e178d8a6-05a3-4bbb-8419-8a9ff168593b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/04793a6e-433c-4a37-9cb0-b1494804cf0c
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/25f85b77-2bcc-40a5-9ef9-0ac94da273e0
---

# Data backend

Why and what: [decision 0011](../decisions/0011-data-backend.md) (records and releases) and [decision 0014](../decisions/0014-data-separate-from-app.md) (the app holds no data; the edge serves releases). Per-market pipeline steps: [data-pipeline.md](data-pipeline.md).

## The loop
1. **Run a pipeline** as its section in [data-pipeline.md](data-pipeline.md) says, after `pnpm data inputs pull`. It writes JSON files in its scratch folder. If you changed an input on the way (a figure read from a report, a member list), `pnpm data inputs push` stores it.
2. **Load:** `pnpm data load <market> <companies.json> <indexes.json>` replaces that market's companies and upserts its indexes. It prints what was added, changed and removed, refuses a file with another market's companies, and refuses to remove more than 10% of a market without `--force`.
3. **Publish:** `pnpm data publish` (add `--collected=YYYY-MM-DD` when the figures were collected on a new day). It assembles every record, runs `shared_scale.py` and `sectors.py`, checks everything, works out every page's title and description with the app's own code, and writes a staging release holding every file the site serves. It prints a change report against the live release (companies added or removed, figures gained, lost or changed, coverage per index, and flagship headlines with the companies behind each move) and a preview link: Nivel's protected team address with `?release={id}`. Open it signed in to Vercel. The staged release is only on the data site's protected staging deployment, never on the public site.
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
| A market's records as stored, to correct and load again | `pnpm data dump <market> <dir>` writes `companies.json` and `indexes.json`, the files `load` takes |

Every change reaches the site only through publish and promote.

## Pipeline inputs
What the pipelines read that is not code: index member lists, figures read by hand from reports (`india/annual_reports.json`, `eu/eu_values.json`, `eu/eu_headcount.json`), overrides (`india/float_overrides.json`, `au/au_overrides.json`, `sector_overrides.json`) and name maps (`uk/uk_map.json`). Every data file under `pipeline/` outside `equal50/` is one record `inputs/{path, slashes as dots}` holding the file's exact text. None is in git (PARITY-80), so recording a figure needs no PR.

| Step | Command |
|---|---|
| Get them, before running a pipeline | `pnpm data inputs pull` writes every input into `pipeline/` |
| See what differs from Firestore | `pnpm data inputs` lists each input changed here, newer in Firestore, or both; exits 1 if any |
| Store what you changed | `pnpm data inputs push` stores every pulled input changed here; name files to store only those, or a new file to add it |
| Retire one | `pnpm data rm inputs <path, slashes as dots>`, such as `india.indexes.ind_niftymedia.csv` |

- **No lost work.** `pipeline/.inputs.json` remembers each input as last pulled or pushed. `pull` refuses to overwrite a local edit not yet pushed, and `push` refuses a file whose record someone else changed since your pull. `--force` overrides either.
- **Publish reads two inputs itself:** `sector_overrides.json` (for `sectors.py`) and `eu/eu_headcount.json` (for `shared_scale.py`), straight from Firestore, never a local copy. A newly read EU headcount or a sector split is `inputs push`, then publish.
- **Market pipelines read the pulled files.** A newly read India figure: add it to `pipeline/india/annual_reports.json`, `inputs push`, run the India build, `load`, publish.
- **Checked on 4 October 2026:** all 50 inputs pulled back byte for byte, and a release published from Firestore's inputs matched the live release in every file except the four that carry the release id or time.

## What blocks a release
- A company or index missing required fields, in a market that is not live, or pointing at a company or index that does not exist.
- A market whose flagship or shown indexes are missing or lack the latest year.
- A logo map naming a file with no logo record.
- `sectors.py` meeting an industry label it cannot map.
- Spot the Stereotype feed problems, or feed changes not approved with `--approve-feed` ([data-pipeline.md](data-pipeline.md#spot-the-stereotype-feed-parity-52)).

## The app's side
- **No data in the build.** `pnpm build` compiles the app only. Every page is served by `api/page.js`, which adds the page's title, link-preview tags, the release id and preloads. `api/data.js` serves `/data/...`, `/feeds/spot/...` and `/logos/...`, cached at the edge (a release's files for a year, the live pointer for two minutes).
- **Served from static files, never from Firestore** ([decision 0016](../decisions/0016-static-releases.md)). The static Vercel project `nivel-data` (`https://nivel-data.vercel.app`) holds the live and previous releases as plain files (`r/{release}/...`, `live.json`). Publish deploys the same folder, staged release and `staging.json` included, as a protected preview at `nivel-data-staging.vercel.app`. Promote and rollback deploy the public site, leaving out any release still staged. All three work in `.data-site/` (not in git) and upload only changed files. A release missing from that folder is rebuilt from Firestore. The site never reads Firestore, so a quota can hold up a publish but never take the site down.
- **In the browser** the app loads `/data/r/{release}/app/core.json` (markets, indexes, simulations, sectors, logo map), then `v1/companies.json`, or one company's file first.
- **`pnpm dev`** serves the data paths from the static site through the same handler. To see a staged release locally, run it as `NIVEL_DATA_BYPASS=<secret> pnpm dev` and add `?release={id}`.
- **One-time setup for previews** ([PARITY-102](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6dd9ff11-979f-4664-a07e-03af2d1f7ce8)):
  1. In Vercel, open the nivel-data project's Deployment Protection settings. Keep Vercel Authentication on, and create a Protection Bypass for Automation secret.
  2. Set it as `NIVEL_DATA_BYPASS` in the nivel project, for Production and Preview.
  3. Redeploy.

  Without the secret, previews of a staged release fall back to the live one.
- **Before deploying,** `pnpm build && node scripts/serve-local.mjs` runs the build with the functions and rewrites as Vercel does.
- **Pipelines that read published data** (the funds builder, the logo pipeline) get a local copy with `node --env-file=.env scripts/data/pull.mjs` (into `src/data/`, `src/feeds/` and `public/logos/`, none in git). It needs the Google login below.

## Access
- Writes use your Google login, impersonating `nivel-pipeline` (no keys): `gcloud auth application-default login --impersonate-service-account=nivel-pipeline@nivel-equal-lens.iam.gserviceaccount.com`. Run it again if a command reports an expired login.
- The static data site is deployed with your Vercel CLI login (the `.data-site/` folder is linked to `nivel-data`). `firestore.rules` makes nothing public ([PARITY-101](https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0a029a2e-4cf0-416d-b597-5a9da58d51ef)): every data tool signs its reads. `FIREBASE_PROJECT` and `FIRESTORE_DATABASE` must be set in `.env`, since the tools have no default project. Deploy the rules after changing them: `firebase deploy --only firestore:rules --project nivel-equal-lens`. Always name the project: the Firebase CLI's active project for the home folder is another one (`praxis-2ffa8`), and even a `--dry-run` deploy creates a missing database there.
- The database ID is `default`, not `(default)`, and it must be the **Standard** edition: Enterprise counts reads by size, and a few builds exhaust its free quota. If it ever needs recreating: `firebase firestore:databases:create default --location asia-south1 --edition standard --project nivel-equal-lens`, redeploy the rules, then `seed` from a pulled release and `verify`.

## Storage and quotas (Spark plan, free)
- Records: `markets`, `indexes`, `companies` (one per company, about 1,750), `datasets` (funds, simulations, logo map), `logos` (one PNG each), `feeds/spot-v1`, `inputs` (about 50 pipeline files, 500 KB). Each holds its JSON as a string, so it round-trips exactly.
- Releases: `releases/{id}` lists its files as content-addressed `blobs` (SHA-256, under 900 KB each). A release that changes one file stores only that file's new blobs.
- A publish reads about 2,400 documents and writes only the blobs that changed (every company's file once, the first time). A release missing from `.data-site/` costs about 3,000 more reads to rebuild. The site reads nothing from Firestore. The daily limits are 50,000 reads and 20,000 writes. When a limit is hit, Firestore returns 429 until the daily reset (midnight Pacific time, 12:30 IST): the data commands wait, and the site keeps serving.
- On 6 October 2026, before [decision 0016](../decisions/0016-static-releases.md), the site itself read Firestore on cache misses, and a heavy publishing day took it down for about two hours.
