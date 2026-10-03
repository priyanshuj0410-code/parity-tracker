---
type: reference
title: Nivel data API v1
description: The contract for reading Nivel's published data from other apps (Spot the Stereotype, SwipeEd and anyone else). Static JSON at https://nivel-equal-lens.vercel.app/data/v1/, rebuilt with every promoted release, open to any origin.
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/39903f09-b70b-48dd-88c7-a10bce33c7c6
---

# Nivel data API v1

Base URL: `https://nivel-equal-lens.vercel.app/data/v1/`. Plain static JSON, `Access-Control-Allow-Origin: *`, cached for an hour. There is no key and no rate limit beyond Vercel's. Code: `src/feeds/data-api.ts` and the `dataApi` plugin in `vite.config.ts`. How these files differ from Spot the Stereotype's own feed: the feed (`/feeds/spot/v1.json`) is a curated, gated list of game items; this API is the raw published data.

## Start here
1. `GET manifest.json`: the release id, the date the figures were collected, and every file's URL, size and SHA-256. Poll it (once a day is plenty) and refetch the others only when `release` changes.
2. `GET summary.json` (about 4 KB) for the headline numbers, or the per-entity files for detail. Avoid the full files on phones.

## Files
| File | Size | Holds |
|---|---|---|
| `manifest.json` | 2 KB | `api`, `version` (1), `release`, `collected` (YYYY-MM-DD), `generatedAt`, `attribution`, `files` |
| `summary.json` | 4 KB | Per live market: `market`, `name`, `year`, `yearLabel`, `flagship`, and its shown indexes with `headline`, `companiesCovered`, `constituents`, `sinceLastYear` and the Nivel `url` |
| `markets.json` | 15 KB | Every market (live or not): labels, years, the indexes shown, reporting rules, sources |
| `indexes/{id}.json` | 2 to 60 KB | One index: name, market, weighting, constituents and weights, figures per year (`headline`, coverage, sectors), like-for-like changes (`yoy`) |
| `companies/{file}.json` | about 2.5 KB | One company: name, industry, exchange, indexes, figures per year, filings. `{file}` is the symbol with characters outside A–Z, a–z, 0–9, dot and hyphen replaced by `_` and their hex code (`M&M` is `M_26M`) |
| `indexes.json`, `companies.json` | 0.4 MB, 2.6 MB | Everything, keyed by id or symbol |
| `sectors.json` | 50 KB | Symbol to one of 11 GICS-style sectors |
| `funds.json` | 66 KB | Indian index funds and ETFs, with the index each tracks |
| `simulations.json` | 20 KB | The Parity 50, a fictional index (never present it as investable) |
| `logos.json` | 15 KB | Symbol to logo file; logos are at `https://nivel-equal-lens.vercel.app/logos/{file}` |

## Field meanings
- Shares are fractions from 0 to 1 (`0.2079` is 20.79%), rounded to four places. Parity for a share is 0.5 and for a pay ratio 1.
- `w`: women's share of pay. `fPerm`, `fAll`: women's share of permanent staff, or of all staff. `gapMean`: the mean pay gap (pay ratio is `1 - gapMean`).
- `wKind`: `reported` or `estimated`. An estimate must carry a label wherever it is shown. `dq` grades the figure (1 reported, 2 rescaled, 3 estimated, 4 unusable); `note` says why in plain words.
- Years are keyed by each market's own labels (`2025-26` in India, `2025` in the UK and EU, `latest` in Japan); `markets.json` lists them in order with `latest` and `prev`.
- The full types are `Company`, `IndexData` and `Simulation` in `src/types.ts`.

## Rules for apps that use it
- **Attribute and link.** Show "Nivel by The Equal Lens" and link the company or index page (`url` in the summary, or `https://nivel-equal-lens.vercel.app/company/{symbol}`).
- **Keep the badges.** An estimated figure is labelled as one; a missing figure is shown as missing, never as zero.
- **No advice.** Nothing built on this data may read as investment advice or rate a company as a buy or a sell.
- **Children's apps** pick figures through their own content review, as Spot the Stereotype does with its feed; this API is unreviewed for children.
- **Cache, don't hammer.** Read the manifest first; respect the one-hour cache.

## Stability
- v1 only grows: new files and new fields can appear; nothing is removed, renamed or redefined. Ignore fields you don't know.
- A breaking change ships as `/data/v2/` next to v1, which keeps serving for at least six months after v2 is announced in this file.
- Figures change whenever a release is promoted; `release` in the manifest changes with them.
- One removal, on 3 October 2026, before any app used v1: the Parity 50's `performance` block (returns), as Nivel publishes no investment returns ([decision 0013](../decisions/0013-no-investment-returns.md)).
