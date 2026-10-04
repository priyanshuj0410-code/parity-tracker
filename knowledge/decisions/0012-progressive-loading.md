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

## Tried and not shipped: one chunk per page (PARITY-81, 4 October 2026)
Lazy-loading each page cut the main file from 430 KB to 233 KB (125 KB to 73 KB compressed), with each page's code preloaded in its prerendered HTML and other pages fetched once the data was in. Both builds were served compressed, as Vercel does, in a fresh browser, timed to first real content:

| Page | One file, 400 kbit/s, 400 ms | Split | One file, 4G, phone CPU at a quarter speed | Split |
|---|---|---|---|---|
| Home | 5.3 s | 6.4 s | 6.4 s | 6.5 s |
| A company | 5.3 s | 6.0 s | 6.7 s | 6.4 s |
| Nifty 50 | 5.4 s | 6.4 s | 6.1 s | 6.1 s |
| Companies | 12.8 s | 13.6 s | 7.0 s | 6.8 s |

On a slow link the extra requests cost more than the smaller file saves; on a fast link with a slow phone the difference is noise. The app stays one file.

**A measurement artefact to know about:** in these tests the first layout of every page took 1.2 seconds (4.7 with the slowed processor), all of it in Chrome's `FontCache::GetFontPlatformData`: the headless browser, started with a fresh profile on macOS, looking up system fonts. With the font cache warm, the whole page's layout takes 7 ms. Visitors' phones do not pay this, so the times above are about a second too slow for both builds alike, and there is no processor-time problem to fix. Warm the browser with one page before timing another.
