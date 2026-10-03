---
type: playbook
title: Deploying Nivel to Vercel
description: How to ship Nivel to production from the CLI, and the free-plan upload limit that the prerendered pages can hit.
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/5e3c90ab-26c8-4dca-9e8b-eff1cd6ecc37
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/04793a6e-433c-4a37-9cb0-b1494804cf0c
---

# Deploying Nivel to Vercel

Production is https://nivel-equal-lens.vercel.app (project `parity-tracker`, scope `priyanshuj0410-5861s-projects`). Vercel builds remotely with `pnpm build`, which also writes the 3,401 prerendered pages ([decisions/0003](../decisions/0003-path-urls-and-prerendered-pages.md)).

This page is for app code. `pnpm build` first pulls the live data release from Firestore, so a deploy always carries the live data, and data changes ship with `pnpm data promote`, which rebuilds production through the deploy hook ([data-backend.md](data-backend.md)).

## Ship

1. Merge the PR into `main`, then `git pull` locally.
2. Deploy as one archive:

   ```bash
   vercel deploy --prod --yes --archive=tgz --scope priyanshuj0410-5861s-projects
   ```

3. Check that a page serves its own preview tags:

   ```bash
   curl -s https://nivel-equal-lens.vercel.app/company/TCS | grep -o '<title>[^<]*'
   ```

Preview deployments sit behind Vercel login, so per-page previews can only be checked on production.

## The upload limit

The free plan allows 5,000 uploaded files a day. An upload that includes `dist/` sends more than 3,400 files, so two such deploys in a day hit the cap. The CLI then fails with "Upload aborted" or `api-upload-free`. Two guards:
- `.vercelignore` leaves out `dist/` (Vercel rebuilds it), the brand source files in `Nivel/`, `knowledge/`, `wiki/` and `pipeline/`.
- `--archive=tgz` sends one archive instead of individual files.
