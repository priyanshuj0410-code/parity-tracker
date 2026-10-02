---
type: decision
title: Load company and index data as separate files
description: Why Nivel's company and index data moved out of the JavaScript bundle into hashed JSON files fetched with the code, and how loading, failure, caching and the build-time page writer handle it.
status: accepted
date: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/9c902b7a-2193-4304-a208-7fcd1fdf3a69
---

# Load company and index data as separate files

## Context

The [UX audit](../reviews/ux-audit-2026-10-02.md) (m10) found one 1.32 MB JavaScript file, 73% of it company data (959 KB). That meant three problems:
- Every code deploy made returning readers download the data again.
- The data was parsed as code, which is slower than parsing JSON.
- Nothing could appear until the whole file arrived.

## Decision

1. **Hashed JSON files.** `src/lib/data.ts` imports `companies.json` and `indexes.json` with `?url`, so Vite emits them as `assets/companies-<hash>.json` and `assets/indexes-<hash>.json`. The module fetches both in parallel with a top-level `await`. Every other module keeps reading `companies` and `indexes` synchronously, because ES modules wait for that await before they run.
2. **Preload.** A small Vite plugin (`vite.config.ts`) adds `<link rel="preload" as="fetch" crossorigin>` for both files to `index.html`, so they download alongside the code. The prerendered pages inherit the links, and the service worker precaches them, since its regex reads `/assets/` URLs from `index.html`.
3. **Build-time page writer.** Under `import.meta.env.SSR`, `data.ts` imports the JSON directly instead of fetching it. The client build drops that branch, so the data never re-enters the bundle.
4. **Loading and failure.**
   - `#root` starts with a small splash (the Nivel mark and "Loading Nivel") that React replaces.
   - If a script error or a failed data fetch stops the app before it renders, an inline listener in `index.html` replaces the splash with "Nivel could not load", plus a reload link. If the device is offline, it also asks the reader to check their connection.
   - After React renders, the error boundary takes over.
5. **Caching.** `vercel.json` serves `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`; the hashes change whenever the content does. The service worker cache name moved to `nivel-v3`.

## Consequences

- **Smaller script:** the main script is 396 KB (118 KB compressed), down from 1.32 MB, and the build's large-chunk warning is gone.
- **Smaller data:** the data compresses to 96 KB and 11 KB as JSON, less than it took inside the script.
- **Faster repeat visits:** a code-only deploy leaves the cached data untouched, and hashed assets are never revalidated.
- **Total first-visit download is about the same**, but the two halves arrive in parallel and the page shows a loading state instead of a blank screen.
- **Logo and sector maps stay bundled:** `logos.json` (15 KB) and `sectors.json` (19 KB) are too small to be worth a request.
