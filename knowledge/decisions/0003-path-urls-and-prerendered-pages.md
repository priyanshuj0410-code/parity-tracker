---
type: decision
title: Path URLs and prerendered pages
description: Why Nivel moved from #/ hash routes to plain paths with one prerendered HTML file per page, and how old links, tickers with dots and Back navigation are handled.
status: accepted
date: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/997c6dda-88ad-486d-8634-571ca6978989
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/c3ec5678-d63b-4dd8-b080-607f10ae9c50
---

# Path URLs and prerendered pages

## Context

The [UX audit](../reviews/ux-audit-2026-10-02.md) (M6) found two problems with `#/` hash routes:
- Every shared link previewed the same home page. Crawlers and chat apps never see anything after the `#`.
- Sharing is the main way an awareness product spreads, so per-page previews matter more than they would for a tool.

## Decision

1. **Plain paths.** `src/lib/router.ts` uses the History API:
   - A document-level click handler keeps same-origin links inside the app. Links to files, new tabs, downloads and modified clicks are left to the browser.
   - `navigate()` pushes an entry, and `popstate` handles Back and Forward.
   - View state (sort, filters, search, Show all) lives in the query string, written with `replaceState`.
2. **Scroll memory per history entry.** Each entry gets a key in `history.state`. When an entry is left, its scroll position is recorded. Back and Forward restore it, and new pages start at the top. This is more reliable than listening for scroll events.
3. **Old links keep working.** A `#/route` URL is rewritten to its path on load.
4. **Dots travel as underscores.** Static hosts and dev servers treat a final segment with a dot as a file, so `EU-ADS.DE` becomes `/company/EU-ADS_DE`. No ticker contains an underscore (checked against all 675). `src/lib/paths.ts` is the only place that encodes and decodes.
5. **Prerendered heads, not prerendered bodies.**
   - After `vite build`, an SSR build of `src/prerender-routes.ts` lists every page with its title and description. The lists come from the same data and helpers the app uses.
   - `scripts/prerender.mjs` writes `dist/<path>.html` (3,401 files) from `dist/index.html`, replacing the title, description, Open Graph title, description and URL, and the canonical link.
   - The body stays the app shell. A body prerender would need hydration that matches the phone layout, which a server cannot know.
6. **Hosting.** `vercel.json` sets `cleanUrls`, so `/company/TCS` serves `company/TCS.html`, and rewrites everything else to `/index.html`. The service worker's cache name moved to `nivel-v2`.

## Consequences

- **Previews:** WhatsApp, LinkedIn, Slack and X show each page's own title and figures. Search engines get distinct titles, descriptions and canonical URLs.
- **Build cost:** the build takes about a second longer and adds about 12 MB of small HTML files.
- **Dev servers:** `vite dev` and `vite preview` fall back to the shell for every path, so local pages carry the default meta. Only the deployed site serves the per-page files.
- **Tests:** the audit checker and the axe sweep use path URLs. Old `#/` URLs are covered by the redirect test in the PARITY-25 navigation check.
