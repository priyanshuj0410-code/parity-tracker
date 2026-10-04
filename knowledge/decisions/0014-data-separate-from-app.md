---
type: decision
title: Data served separately from the app, in the same Vercel project
description: The app's build holds no data. Edge functions in the same Vercel project serve each release's files from Firestore through Vercel's CDN, fill each page's link-preview tags from the live release, and promote only moves a pointer. Data releases never rebuild the app; app deploys never touch data.
status: accepted
updated: 2026-10-04
supersedes: the build-time pull in decisions/0011-data-backend.md and the static page writer in decisions/0003-path-urls-and-prerendered-pages.md
---

# Data served separately from the app

## Why
- **The owner's rule (4 October 2026):** keep data and app separate, for the long term, as data grows.
- **Before this:** each build pulled the live release, compiled the market list, sectors, logo map and release date into the JavaScript, and wrote 8,818 HTML pages from the data. Every data release rebuilt and redeployed the whole app, and that work grew with every company and country.

## Decision
- **One Vercel project** (owner's choice), with two edge functions beside the static app:
  - `api/data.js` serves `/data/...`, `/feeds/spot/...` and `/logos/...` from the releases in Firestore (public reads). A release's files never change, so they are cached for a year; only the live pointer (`/data/live.json`) is refreshed, every few minutes.
  - `api/page.js` serves every page: the app's shell with that page's title, description and link-preview tags from the live release, the release id, and preloads for the data the page needs. Cached at the edge for five minutes.
- **The app holds no data.** It reads the release id from its page (or `/data/live.json`), then loads `core.json` (markets, indexes, simulations, sectors, logo map), then companies, from `/data/r/{release}/...`. Logos come from the release too.
- **Publish** freezes everything a release serves: per-company and per-index files, the public `/data/v1/` files and manifest, the app's `core.json`, every page's title and description (worked out by the app's own code), and the Spot the Stereotype feed. Files are content-addressed, so an unchanged company costs nothing to store again.
- **Promote** writes the live pointer in Firestore. Nothing is built or deployed; the site follows within the pointer's cache time.
- **Preview** is the live site with `?release={id}`: the page function and the app use that release instead of the live one.

## What stays
- Firestore is the system of record; records, releases, checks, change reports and rollback work as in [0011](0011-data-backend.md).
- Pages load progressively with the designed states of [0012](0012-progressive-loading.md); the service worker keeps them working offline.
- The public API (`/data/v1/`) and the Spot feed (`/feeds/spot/v1.json`) keep their addresses, now served from the live release.

## Costs and limits
- Firestore is read only on a cache miss: about two reads per file per region per release, and one per region every few minutes for the pointer.
- Vercel's Hobby plan is for non-commercial use and caps function invocations and edge requests a month; cached responses do not invoke the functions. Heavy growth means the Pro plan.
- After a promote, visitors see the new data within about five minutes, not at once.
