---
type: runbook
title: Late BRSR filers, the daily watch
description: What the daily nivel-brsr-watch routine does. It reads the site of every company with no FY2025-26 BRSR again, downloads any new FY2025-26 report, and sends a company back to be read when its BRSR appears.
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/1753fc3a-e52f-4411-934e-f04f1e3d6c2f
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b0e815e8-8fd2-47b1-af1d-f81a2b7d6515
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/f47ab7b6-a46f-4d22-83d5-5131790b6a49
---

# Late BRSR filers: the daily watch

- **Plan:** [../plans/india-brsr-1000.md](../plans/india-brsr-1000.md), decision 11.
- **Batch steps:** [brsr1000-batch.md](brsr1000-batch.md).
- **Code:**
  - `pipeline/india/brsr1000/marks.py` (owner marks, the watch list, finds);
  - `batch.py watch`.

## What it watches

Every company still on FY2024-25 whose FY2025-26 BRSR has not appeared:
- **Owner marks:** the owner marked it "No BRSR filed" on the dashboard after checking its filings. Marks live in `data/owner_marks.json` as `{"marks": {key: {kind, at, into, since, note}}}`, which only the dashboard writes.
- **Not on the site:** its site has not published the report.
- **Report without a BRSR:** its annual report came without one.
- **Not out yet (12 October 2026):** closed with no usable report because its FY2025-26 report is not published yet (the dashboard's "Report not out yet" tag), such as ITI, whose AGM was extended, or Enrin, whose year ends in September. A find sends it back to be read and clears that reason. The watch reads the site on record, so each needs a website.

Merged, insolvent and delisted companies are left out: they will not file again. That is either the owner's mark (Merged, Insolvent or Delisted, which takes effect at once) or a reason the pipeline gave.

## Commands

`D` is `/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data` and `B` is `python3 pipeline/india/brsr1000/batch.py`, run from `/Users/priyanshu/parity-tracker`.

- `B watch D`: checks every watched company.
  - **Read:** headless Chrome reads each site's report links, from company sites only, never NSE or BSE.
  - **Download:** up to three new FY2025-26 links are downloaded and checked; image-drawn BRSRs are read with OCR.
  - **Find:** a real FY2025-26 BRSR leaves `D/watch/found/<key>.json`.
  - **Record:** the result goes to `D/watch/latest.json`, with one line in `D/logs/runs.md`.
  - **Queue:** it never writes `queue.json`, so it can run beside a batch without the lock. It takes about 2 minutes a company.
- `B watch D <key> …`: the same, for named companies.
- **When a batch opens:** `B next` sends every find back to be read, at the head of the queue, and closes the company's mark (finds are applied before the recheck, so the mark always closes). It also writes the owner's marks into the queue, and closes any mark on a company read as FY2025-26 since. The watch list reads the marks as they stand, so a mark or an undo counts at once.

## The routine (nivel-brsr-watch, daily at 09:15, starting about 09:21)

1. **Gate:** run `B gate D`. If it exits 3, stop.
2. **Watch:** run `B watch D`.
3. **Mondays, a deeper search:** for the companies still watched, run the Workflow tool with `scriptPath` `pipeline/india/brsr1000/discover.workflow.js` and `args` `{"data": D, "keys": [those keys], "mode": "refind"}`. Then run `B watch D <those keys>`, so the links it found are tried.
4. **Finds:** if the watch found any company:
   - **Build still running:** if `D/queue.json` has companies to do or a batch is open, stop. The next scheduled build batch reads them.
   - **Build finished:** run one batch for them, following [brsr1000-batch.md](brsr1000-batch.md) steps 0 to 6 with two changes:
     - use `B lock D --issue=PARITY-127|1753fc3a-e52f-4411-934e-f04f1e3d6c2f` and `B unlock D --issue=PARITY-127|1753fc3a-e52f-4411-934e-f04f1e3d6c2f`;
     - open it with `B next D 25`.
5. **Plane:** only when something was found, run `python3 pipeline/india/brsr1000/plane_note.py 1753fc3a-e52f-4411-934e-f04f1e3d6c2f "<the watch line from D/logs/runs.md>"`.

## Rules

- **Sources:** company sites only. Never use nseindia.com or bseindia.com.
- **Secrets:** never print `$PLANE_API_TOKEN`.
- **Hands off the live system:** no commits, pushes, PRs, `pnpm data load` or publish.
- **Code:** do not edit code. Edit nothing outside `D` apart from the Plane comment.
- **Owner marks:** do not edit `D/owner_marks.json` by hand. The dashboard and `B next` maintain it, one writer at a time (`owner_marks.lock`).
- **When a step fails twice:** write what failed to `D/logs/runs.md`, run `B unlock D` with the same `--issue` if you took the lock, and stop.
