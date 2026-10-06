---
type: decision
title: Releases are served as static files, so a database quota never stops the site
description: The live site reads released data only from a static Vercel project (nivel-data) holding the live, staged and previous releases as plain files. Firestore stays the free store of record and is read only by the data tools. A quota can hold up a publish, never the site.
status: accepted
updated: 2026-10-06
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6dd9ff11-979f-4664-a07e-03af2d1f7ce8
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c2dc9e56-13d2-4bdb-9af6-88f71718a548
---

# Releases are served as static files

## Why
On 6 October 2026 a day of publishing used up Firestore's free daily reads (50,000 on the Spark plan). Under [decision 0014](0014-data-separate-from-app.md) the edge functions read each release file from Firestore the first time an edge region needed it. Once the quota was gone, every uncached file returned 503 until the reset at midnight Pacific, including the new release's core data, so pages showed "This part didn't load". The owner chose to stay on free plans and to remove the cause instead.

## Options weighed
| Option | Why not, or why |
|---|---|
| Firestore Blaze billing | Lifts the cap for pennies, but the owner wants free plans. |
| Supabase or Neon in the read path | Free plans cap compute or pause when idle; running out would stop the site for longer (Neon until the next month). Moving databases does not remove the risk. |
| Vercel Blob | 10,000 operations on Hobby, then a 30-day lockout. |
| Cloudflare R2 | Large free allowance, but a new account. |
| **Static files on Vercel (chosen)** | No new account, no per-read quota, served from the CDN. Publishing deploys changed files only. |

## Decision
- **nivel-data,** a static Vercel project in the same account (`https://nivel-data.vercel.app`), holds:
  - `r/{release}/...`: the served files of a release (`v1/`, `app/`, `feeds/spot/`), its logo PNGs and `release.json`;
  - `live.json` and `staging.json`: the channels.
- **What it keeps:** the live, staged and previous live releases only, which is about 3,000 files and 15 MB each, under Hobby's 100 MB deployment limit.
- **The data tools write it:**
  - Publish adds the release as staging, deployed only to `nivel-data-staging.vercel.app`, a preview deployment that Vercel Authentication keeps to the project's members. The public `nivel-data.vercel.app` never holds a staged release or `staging.json` (PARITY-102).
  - Promote and rollback rewrite `live.json`, deploying the public site before Firestore's channels change.
  - Each deploy uploads only changed files. `scripts/data/site.mjs` does the work in the local folder `.data-site/`, which is not in git, and rebuilds any missing release from Firestore.
- **The edge functions** (`api/_data.js`, `api/page.js`) fetch from the static site, with the same public addresses and cache rules as decision 0014. They never read Firestore.
- **Firestore** stays the free store of record (records, inputs, the release archive). Only `pnpm data` commands read it. If its quota runs out, publishing waits for the reset and the site carries on serving the last release.

## Limits
- **Vercel Hobby:** 100 deployments a day; 100 MB of static files per deployment.
- **A preview** (`?release=`) of the live or previous release works anywhere. A staged release shows only on Nivel's protected addresses: preview deployments, a deployment's own URL and `nivel-priyanshuj0410-5861s-projects.vercel.app`. Their edge functions read it from the staging deployment with the nivel-data project's protection-bypass secret (`NIVEL_DATA_BYPASS`). This holds only while both projects keep Vercel Authentication on.
