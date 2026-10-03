---
type: playbook
title: Separate data and app layers (The Equal Lens apps)
description: How Nivel, Spot the Stereotype and SwipeEd keep content and data out of their app code, each in its own free Firebase project, published through checked releases, so a data change never needs a merge and one app never reaches into another's database.
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/39903f09-b70b-48dd-88c7-a10bce33c7c6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b8e24bab-221d-4ed9-99f5-434428caaa1b
---

# Separate data and app layers

Nivel is the working example: [decision 0011](../decisions/0011-data-backend.md) (backend), [decision 0012](../decisions/0012-progressive-loading.md) (loading), [data-backend.md](data-backend.md) (running it), [data API v1](../reference/data-api-v1.md) (sharing it).

## The rules
1. **Merges are for code.** Content and data (figures, game items, questions, cards, translations of them) live in the app's database and reach users through releases. A new item, a fix or a new language never needs a pull request.
2. **One app, one Firebase project.** Separate quotas, rules and access. Never read or write another app's database: use its published API, as Spot does with Nivel's feed.
3. **Two kinds of data, kept apart:**
   - **Content** (the same for every user): records, then checked releases, frozen into static files at build time and served from the CDN. Fast, offline, cheap.
   - **Live state** (scores, progress, rooms, anything a user creates): read and written at runtime, under per-user security rules, in its own collections or database. Never mixed into content releases.
4. **Nothing ships unchecked.** Publish runs the app's checks, builds a preview, and a person promotes it. Rollback is one command.
5. **No keys.** Pipelines write as a service account that people borrow through their own Google login (impersonation). Organisation policy blocks service-account keys; keep it that way.

## Setting up an app (about an hour, free)
1. **Project:** a new Firebase project for the app on the Spark plan, named after it (`spot-the-stereotype-data`, `swipeed-data`).
2. **Database:** Firestore, **Standard edition**, region `asia-south1`:
   ```bash
   firebase firestore:databases:create "(default)" --location asia-south1 --edition standard --project <project>
   ```
   The console can create Enterprise instead, which counts reads by size; Nivel's ran out of free reads on its first day. Check the edition before building on it.
3. **Access:** a `<app>-pipeline` service account with Cloud Datastore User only, no key. Give each maintainer Service Account Token Creator on it, then on their machine:
   ```bash
   gcloud auth application-default login --impersonate-service-account=<app>-pipeline@<project>.iam.gserviceaccount.com
   ```
4. **Rules:** public `get`/`read` only on `channels`, `releases` and `blobs`; nothing else readable; no client writes to content. Copy Nivel's `firestore.rules`. Live-state collections get their own per-user rules.
5. **Deploy hook:** a Vercel production deploy hook in the app's `.env` as `VERCEL_DEPLOY_HOOK`, with `FIREBASE_PROJECT` and `FIRESTORE_DATABASE`.
6. **Firebase CLI:** always pass `--project` (and `--account` if several are signed in). The CLI's default project for the home folder belongs to another product.

## The toolkit to copy from Nivel
| File | Reuse |
|---|---|
| `scripts/data/firestore.mjs` | As is: REST client, keyless writes, public reads, content-addressed blobs |
| `scripts/data/pull.mjs` | As is, with the app's file list: runs before every build |
| `scripts/data/release.mjs` | The flow as is; replace `check()` and `report()` with the app's own checks (for a game: every item answerable, no dashes, reading level, child-safety review flags) |
| `scripts/data/cli.mjs` | Keep `put`, `get`, `rm`, `seed`, `verify`; replace `load` with the app's own import |
| Loading pattern | Two stages and per-item files, as in `src/lib/data.ts`, with skeletons and failed states from `src/components/Skeleton.tsx` and `ErrorBoundary.tsx` |

For a Next.js app (SwipeEd), run the pull before `next build` (in `prebuild`, after the existing gates) and import the pulled JSON from server components; the rest is the same.

## Children's apps (Spot the Stereotype, SwipeEd)
- Content releases pass the `child-safe-content` rules before promotion; the preview is where a reviewer checks them.
- Live state collects no personal data from children: no names, emails, photos or free text tied to a person. Use anonymous session ids. India's DPDP Act 2023 requires verifiable parental consent before processing any child's personal data, so design so that none is processed.
- Data borrowed from another app (Nivel's figures in a SwipeEd card) goes through the borrowing app's own content review before children see it.

## Budgets on the free plan
- Firestore: 50,000 reads and 20,000 writes a day, 1 GiB stored in total. At a daily limit it stops until the next day, and never bills. Plan per build (Nivel: about 30 reads) and per publish (about 2,400).
- Content is read at build time, never per visitor. Live state is read per user, so keep it small and index the queries.

## Sharing data between the apps
- Each app publishes what others may use as a versioned static API (`/data/v1/` on its own site), additive within a version, with a manifest carrying the release id.
- Consumers read the manifest first, cache, attribute, and never depend on fields outside the documented contract.
- Nivel's: [data API v1](../reference/data-api-v1.md); Spot the Stereotype's game feed: `/feeds/spot/v1.json`.

## Onboarding checklist for Spot the Stereotype and SwipeEd
- [ ] Inventory content now held in the repo (item lists, question banks, card decks, copy that changes with data) and live state (scores, rooms).
- [ ] Create the Firebase project and Standard database; set up access, rules and the deploy hook.
- [ ] Seed content records from today's files, then `verify` an exact match.
- [ ] Add `pull` before the build, remove the content files from git, publish, preview, promote.
- [ ] Move live state to its own collections or database with per-user rules.
- [ ] Publish the app's own API if others will read it, and record it in the app's knowledge base.
