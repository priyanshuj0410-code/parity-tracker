---
type: playbook
title: Separate data and app layers (The Equal Lens apps)
description: How Nivel keeps its data out of its app code, with Firestore as the store of record and checked releases served as static files, so a data change never needs a merge. A proposal for the other Equal Lens apps, not a standard. SwipeEd and Spot the Stereotype have not adopted it, and children's apps follow stricter rules.
updated: 2026-10-06
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/39903f09-b70b-48dd-88c7-a10bce33c7c6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b8e24bab-221d-4ed9-99f5-434428caaa1b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/db4c43c6-0bdb-4dec-a387-338867b35576
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0a029a2e-4cf0-416d-b597-5a9da58d51ef
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6dd9ff11-979f-4664-a07e-03af2d1f7ce8
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/77e2fcc4-1068-4086-a2c1-2d37bad5db68
---

# Separate data and app layers

**This is how Nivel works, and a proposal for the other apps.**

| App | Status |
|---|---|
| Nivel | Adopted: [decision 0011](../decisions/0011-data-backend.md) (backend), [0012](../decisions/0012-progressive-loading.md) (loading), [0014](../decisions/0014-data-separate-from-app.md) (data served apart from the app), [0016](../decisions/0016-static-releases.md) (static releases) |
| SwipeEd | Not adopted. Content stays in git under its build gates, and progress stays on the device ([SwipeEd decision](https://github.com/priyanshuj0410-code/swipeed-equal-lens/blob/main/knowledge/architecture/content-and-progress.md), SWED-133) |
| Spot the Stereotype | Not adopted. Its live rooms run on Realtime Database with anonymous sign-in, in The Equal Lens's Firebase project (BIAS-38) |

Running it: [data-backend.md](data-backend.md). Sharing it: [data API v1](../reference/data-api-v1.md). Corrected on 6 October 2026 from the SwipeEd review in [PARITY-84][p84].

## The rules
1. **Merges are for code.** In Nivel, content and data (figures, feed items, translations of them) live in the database and reach users through releases. A new figure or a fix never needs a pull request.
   - **SwipeEd is exempt.** Its content is JSON in git, checked by its build gates, and the owner's merge is the promote step.
2. **One app, one Firebase project.** Separate quotas, rules and access. Never read or write another app's database: use its published API, as Spot does with Nivel's feed.
3. **Two kinds of data, kept apart:**
   - **Content** (the same for every user): records, then checked releases. Nivel's edge functions serve each release as static files from its data site, so a promote moves a pointer and nothing is rebuilt ([0014](../decisions/0014-data-separate-from-app.md), [0016](../decisions/0016-static-releases.md)). Offline comes from the service worker, not from this layer, so it is no reason to adopt it.
   - **Live state** (scores, rooms, anything a user creates): read and written at runtime under per-user rules, never mixed into content releases.
   - **SwipeEd keeps all progress on the device.** It has no server-side live state.
4. **Nothing ships unchecked.** Publish runs the app's checks and stages a release; a person previews and promotes it. Rollback is one command. For children's apps a preview is not a child-safety review (see below).
5. **No keys.** Pipelines write as a service account that people borrow through their own Google login (impersonation). Organisation policy blocks service-account keys; keep it that way.

## Before adopting it: the costs
- **Firestore's free plan (Spark):** 50,000 reads, 20,000 writes and 20,000 deletes a day, and 1 GiB stored. A document holds at most 1 MiB, so large files are split into blobs, as Nivel's `firestore.mjs` does.
- **A quota hit stops every publish** until the reset at midnight Pacific time. It never bills. On 6 October 2026 a day of publishing used up Nivel's reads and took the site down, because the edge then read Firestore. Since [0016](../decisions/0016-static-releases.md) the site reads only static files, so a quota hit holds up publishing, never the site.
- **Vercel Hobby is for non-commercial use.** It caps function calls and edge requests a month, 100 deployments a day and 100 MB of static files per deployment.
- **Setup** takes about an hour, all on free plans.

## Setting up an app
1. **Project:** a new Firebase project for the app on the Spark plan, named `<app>-data`.
2. **Database:** Firestore, **Standard edition**, region `asia-south1`:
   ```bash
   firebase firestore:databases:create "(default)" --location asia-south1 --edition standard --project <project>
   ```
   The console can create Enterprise instead, which counts reads by size; Nivel's ran out of free reads on its first day. Check the edition before building on it.
3. **Access:** a `<app>-pipeline` service account with Cloud Datastore User only, no key. Give each maintainer Service Account Token Creator on it, then on their machine:
   ```bash
   gcloud auth application-default login --impersonate-service-account=<app>-pipeline@<project>.iam.gserviceaccount.com
   ```
4. **Rules: no public reads.** Since [0016](../decisions/0016-static-releases.md) only the data tools read Firestore, and they use the pipeline's credentials, which the rules do not govern. Live-state collections get their own per-user rules.
   - **Nivel's `firestore.rules` deny everything** ([PARITY-101][p101]). They were deployed on 6 October 2026, and unsigned reads now return 403. Copy them.
   - **Children's apps get no public reads at all.**
5. **Serve releases as static files** ([0014](../decisions/0014-data-separate-from-app.md), [0016](../decisions/0016-static-releases.md)):
   - Publish writes the release to a static Vercel project (Nivel's is `nivel-data`).
   - Edge functions in the app's own project serve its files and fill each page's link-preview tags.
   - Promote rewrites `live.json`. Nothing is rebuilt, and there is no deploy hook.
   - Serve only promoted releases, and keep previews of a staged release to the owner. Nivel's edge still serves a staged release to anyone with its id ([PARITY-102][p102]).
6. **Firebase CLI:** always pass `--project` (and `--account` if several are signed in). The CLI's default project for the home folder belongs to another product.

## The toolkit to copy from Nivel
**Remove Nivel's defaults first.** `scripts/data/firestore.mjs` now throws unless `FIREBASE_PROJECT` and `FIRESTORE_DATABASE` are set ([PARITY-101][p101]), but `api/_data.js:7` still falls back to Nivel's data site. Check the impersonated account's project before any write. Nothing is copied as it is.

| File | Reuse |
|---|---|
| `scripts/data/firestore.mjs` | REST client, keyless writes, content-addressed blobs. Signed reads only |
| `scripts/data/release.mjs` | The flow. Replace `check()` and `report()` with the app's own checks, and record a role label, not the username (`release.mjs:223`) |
| `scripts/data/site.mjs` | Writes the static data site and its `live.json` and `staging.json` channels, uploading changed files only |
| `scripts/data/cli.mjs` | Keep `put`, `get`, `rm`, `seed`, `verify`; replace `load` with the app's own import |
| `api/_data.js`, `api/data.js`, `api/page.js` | The edge side: serve a release's files from the data site and fill each page's preview tags. Change the origin and the page lookup. Unknown pages and files return 404 |
| `scripts/serve-local.mjs` | Runs a build with the functions and rewrites, as Vercel does, before deploying |
| Loading pattern | Two stages and per-item files, as in `src/lib/data.ts`, with skeletons and failed states from `src/components/Skeleton.tsx` and `ErrorBoundary.tsx` |

## Children's apps (SwipeEd)
SwipeEd is The Equal Lens's only app for children. Spot the Stereotype is adult content, for game nights of adults aged 20 to 35 ([markets safeguarding review](../reviews/markets-safeguarding-2026-10.md)), so this section does not bind it.

- **The `child-safe-content` rules apply** to every item children see.
- **Content passes the app's own gates,** not Nivel's release checks. For SwipeEd that means the helpline allowlist, word limits per age band, its lints and dedup. Add a per-scenario diff, and an explicit approval flag for any change to a safety beat, a helpline or the help sheet. A preview is not the child-safety review.
- **No runtime promote for children's content.** With releases served at runtime no build gate sees the content, and a promote changes what children see within about five minutes. Content reaches children only through a build that ran the gates.
- **If a children's app ever pulls content from a store,** pull first, into the same source paths the gates read. The gates must fail on a missing or short bank. SwipeEd loads its games on the client, so the pulled files are imported where the games load.
- **Live state collects no personal data from children:** no names, emails, photos or free text tied to a person.
  - A persistent session id is pseudonymous, not anonymous, so progress tied to it is a child's personal data.
  - The DPDP Act 2023, section 9, requires verifiable parental consent for it. That applies until counsel answers question 14 ([counsel questions](../reviews/counsel-questions-2026-10.md)).
  - The default is SwipeEd's: progress stays on the device.
- **Borrowed data** (Nivel's figures in a SwipeEd card) passes the borrowing app's own content review before children see it. Children's apps snapshot it at build time, pin the release id, and never fetch it from a child's device.

## Budgets on the free plan
- **Nivel's site never reads Firestore;** only the data tools do. A publish costs about 2,400 reads, so plan publishes against the 50,000 a day.
- **Live state is read per user,** so keep it small and index the queries.

## Sharing data between the apps
- Each app publishes what others may use as a versioned static API (`/data/v1/` on its own site), additive within a version, with a manifest carrying the release id.
- Consumers read the manifest first, cache, attribute, and never depend on fields outside the documented contract.
- Nivel's: [data API v1](../reference/data-api-v1.md); Spot the Stereotype's game feed: `/feeds/spot/v1.json`.

## Checklist for an app that adopts it
- [ ] Inventory content now held in the repo (item lists, question banks, copy that changes with data) and live state (scores, rooms).
- [ ] Create the Firebase project and Standard database; set up access, and rules with no public reads.
- [ ] Seed content records from today's files, then `verify` an exact match.
- [ ] Add the data site, the edge functions and the rewrites; publish, preview, promote.
- [ ] Remove the content files from git and the build. Not for SwipeEd, whose content stays in git.
- [ ] Move live state to its own collections with per-user rules. Not for SwipeEd, whose progress stays on the device.
- [ ] Publish the app's own API if others will read it, and record it in the app's knowledge base.

## The SwipeEd review of Nivel, checked on 6 October 2026
The review ([PARITY-84][p84]) read Nivel at commit 10e7b22 on 4 October. Each major finding, and those decisions 0014 and 0016 touched, against main at 558af9c:

| Finding | Status |
|---|---|
| **Major:** missing data and asset files return 200 HTML, cached as immutable | **Fixed.** On the live site, an unknown page, company or asset returns 404 with `max-age=0`, and a missing data, feed or logo file returns 404 as plain text. `public/sw.js` caches only successful responses, and `loadCompany` treats a 404 as no such company |
| **Major:** Firestore rules expose staged releases and the publisher's username | **Fixed:** [PARITY-101][p101]. The rules deny everything, and were deployed on 6 October 2026: unsigned reads of `channels` and `releases` return 403. Every data-tool read is signed, new releases record `pipeline` instead of a username, and there is no default project. Older release documents keep their username until the owner scrubs them |
| Decision 0014 serves any release, staged ones included | **Open:** [PARITY-102][p102] (serve only promoted releases; owner-only previews) |
| Unknown pages are soft 404s | **Fixed:** pages must be listed in the release's `app/pages.json`, and `/company/NOPE` returns 404 |
| Release id and data maps compiled into the bundle; `?r=` does not pin a release | **Fixed** by [0014](../decisions/0014-data-separate-from-app.md): the release id comes from the page's `nivel-release` tag, markets come from `core.json`, and files load from `/data/r/{release}/` |

[p84]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/db4c43c6-0bdb-4dec-a387-338867b35576
[p101]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0a029a2e-4cf0-416d-b597-5a9da58d51ef
[p102]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6dd9ff11-979f-4664-a07e-03af2d1f7ce8
