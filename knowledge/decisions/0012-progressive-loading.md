---
type: decision
title: Progressive loading from static files, not live database reads
description: Pages show as soon as their own data arrives. Data loads in two stages (indexes, then companies), a company page fetches its own small file first, and every placeholder, failure and retry is designed. Data stays static on the CDN rather than being read live from Firestore.
status: accepted
updated: 2026-10-03
supersedes: decisions/0004-data-as-separate-files.md (loading order only)
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/39903f09-b70b-48dd-88c7-a10bce33c7c6
---

# Progressive loading from static files

## Why
- **First visits were slow on poor networks.** The app downloaded every data file (about 400 KB compressed, 3.3 MB raw) before drawing anything. At 400 kbit/s with 400 ms latency, Home took 22 seconds and a company page 12.
- **The owner asked (3 October 2026)** for faster reads that hold up on a choppy network, with loading, empty and error states designed throughout.

## Decision
- **Not live database reads.** Reading Firestore while people browse would be slower (a database round trip plus about 100 KB of SDK, against files on Vercel's CDN), fail on every dropped request, and use up the free plan's 50,000 daily reads after about 30 visitors who open the Companies list. The data changes a few times a month, so live updates add nothing. Releases stay the way data reaches the site ([0011](0011-data-backend.md)).
- **Two stages instead of one download:**
  - `core`: indexes and simulations, about 60 KB compressed, preloaded by every page. The header, index strip, Home, index pages and company headers need only this.
  - `companies`: every company, about 320 KB compressed, fetched after the first page is up, or straight away by a page that needs it (Companies, Compare, Method, the Parity 50).
- **A company page** fetches that company's own file (`/data/v1/companies/{file}.json`, about 2.5 KB), which its prerendered HTML preloads alongside the code. Rankings against other companies, Peers and Calculations fill in when the full set lands.
- **Each part waits only for what it needs:** a page suspends on its stage (`useStage`) and the nearest Suspense boundary shows a skeleton; a part that can wait (`useLoaded`) shows its own skeleton in place, so the rest of the page is usable.
- **Patchy networks:** each file is tried three times with backoff (0.8 s, then 1.6 s). A stage that still fails stays failed until Try again or the connection returns; it never loops.
- **Offline:** the service worker caches every file it serves (cache first, refreshed in the background), so pages opened before work offline.

## Measured (3 October 2026, local preview without compression, fresh browser, 400 kbit/s and 400 ms latency)
| Page | Before | After (first content) |
|---|---|---|
| Home | 22.5 s | 8.0 s, pace table at 15.3 s |
| A company | 12.1 s | 5.6 s |
| Nifty 50 | 13.4 s | 5.2 s, movers at 13.2 s |
| Companies | 15.6 s | 12.4 s (needs every company) |

## States (see [design.md](../design.md))
- Boot: the Nivel mark over "Loading Nivel" until the code runs.
- Page on its way: a page skeleton (title, three tiles, a list).
- Part on its way: a skeleton in the part's own shape (table rows, a line under a scale card, strip chips).
- Part failed: "This part didn't load." (or "loads when you're back online") with Try again.
- Page failed: "Something went wrong" or "You're offline", with Try again (retries in place) and Go to indexes; it retries by itself on reconnect.

## Next
- Split each page's code into its own chunk; after this change, the app's own code (about 430 KB raw) is the largest thing a first visit waits for.
