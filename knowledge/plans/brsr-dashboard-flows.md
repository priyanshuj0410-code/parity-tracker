---
type: design
title: Parity dashboard (begun as the BRSR build dashboard), user and interaction flows
description: The one-page layout of the local BRSR build dashboard. It covers the owner's eight jobs, where each piece of information lives, how many clicks it takes, and the interaction rules that keep the page steady through its 30-second refresh.
updated: 2026-10-13
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/7b06f399-403a-4106-8d7e-7bd9697da393
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/1753fc3a-e52f-4411-934e-f04f1e3d6c2f
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b0e815e8-8fd2-47b1-af1d-f81a2b7d6515
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/f47ab7b6-a46f-4d22-83d5-5131790b6a49
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/531a80bc-bb43-47ac-a2df-79e769084cf0
---

# Parity dashboard: user and interaction flows

**Where things are:**
- **Page:** `pipeline/india/brsr1000/dashboard/`, read from disk on every request, so an edit shows up without a restart:
  - `index.html`, the shell;
  - `ui.css` and `ui.js`, the component library;
  - `app.js`, the views. The page's Components view (`#view=library`) shows every component.
- **Server:** `pipeline/india/brsr1000/dashboard.py`, serving `http://127.0.0.1:8765`.
- **Visual rules:** [../design.md](../design.md), section 8.
- **Build it serves:** [the batch runbook](../playbooks/brsr1000-batch.md).
- **Real-world references:** [Lazyweb: one-page ops patterns](https://www.lazyweb.com/agentic-search/415b7e49-2f44-4e3a-a883-1acaf9c4cd72).

## How it was designed

1. **Three designs:** three designers each drew the whole page from one angle: action first, status first, or a single list.
2. **Judging:** a judge scored them on six things: the jobs, reach, calm, phone fit, refresh survival and build effort.
3. **Result:** action first won, 44 of 60. The final page grafts on:
   - the status-first design's plain-language run states and its "behind by" amounts;
   - the single-list design's search by clock time.

## The owner's jobs

| Job | Question | Clicks from landing |
|---|---|---|
| J1 | Is the run healthy right now? | 0 on desktop, where the Run pane is docked open; 1 on a phone (tap the strip) |
| J2 | What happened in batch X? | 1 (a run row, or search "b6" or "20:42") |
| J3 | What needs me? | 0 (Needs you is the first section) |
| J4 | Did my files land? | 0 (Files you sent, with a five-step stepper) |
| J5 | Why is company X where it is? | 1 (search, or any company name, or a click on its row); raw records 2 |
| J6 | Breakdowns by status and by FY2024-25 reason | 0 for the counts, 1 for the names |
| J7 | Women's share by level and function | 0 for the ladder, 1 for counts and functions |
| J8 | Ad hoc SQL | 1 to open, 2 with Run |

Typing in the search box is free; selecting a result is a click. Nothing that the old five tabs held is more than 3 clicks away.

## The page

1. **Sticky bar:** the brand, then four cells.
   - **Status:** the state word with a dot, the stage, when it started and the next run.
   - **Progress:** companies done, with a meter.
   - **Finish:** the estimate against the target, and how far behind.
   - **Usage:** against the 78% and 75% gates. It is shown from 1360px, or whenever usage is within 15 points of a gate.
   - **Search and theme:** at the right.
   - On a phone the cells become a strip under the header: the state, its detail and the progress with the finish. Each part ("next run 11:24", "≈ 14:03") wraps whole rather than being cut. The strip stays on screen and holds the search button; the header keeps only the theme. The bar opens the Run pane.
2. **Today column, top to bottom:**
   - **Needs you:**
     - **Fetch by hand:** each row carries its links.
     - **Unmatched files.**
     - **Check:** checker flags that need the owner's judgement. Each row asks its question:
       - Identity: "Is this the right company?"
       - Value: "Is this figure right?"
       - Unit: "Which unit is right?"
       - Basis: "Can it be compared with last year?"

       The row then names its batch and quotes the flag. Seen hides a row, with Undo for 6 seconds; Mark all seen clears the group. Both are remembered in this browser only.
       - **Checked flags:** an attended session that checks a flag records the outcome in `data/check_resolved.json` (`{flag id: {verdict: fine, fixed or owner, note, ask}}`). Fine and fixed flags leave the list, and the company pane shows "Checked:" with the note under the flag. A flag that still needs the owner stays, asking its own question with the note as context. The first check, on 12 October, closed 10 of 11.
     - **Filter pills:** they appear when more than one kind has rows.
   - **Files you sent:** a stepper through In inbox, Matched, Taken in, Read and Done. Finished files fold into Done.
   - **Recent runs:** below 1200px only, since the docked pane holds them on desktop.
   - **Companies (13 October 2026, owner):** No BRSR due yet, then one row per report year from 2021 to 2025, then a 2026 tracker. A year is the one the period starts in, so 2025 is FY2025-26 or CY2025, and 2021 (FY2021-22) is the first BRSR year. A year row counts every company with data for it, so rows overlap: its years in the last records build (`data/records_years.json`, which `to_records.py` writes) plus the year and prior-year column of each reading since. The 2026 tracker counts FY2026-27 and CY2026 readings against the companies due to file them (rankings.py's Files, May drop out and Joins, plus those outside the queue). Each row opens the list filtered to it. The deep pass is no longer a row: every re-read Nivel company has finished it.
     - **No BRSR due yet:** only companies with no BRSR due for FY2025-26: in neither exchange's top 1,000 on a December list up to 2024 (coverage did not lapse before the 2024 sunset rule), or whose own report puts the start later. Its tags say why: Listed since 2025, New to the top 1,000, Listed in 2026.
     - **Why no 2025 report:** companies with a BRSR due and no 2025 data, both those keeping FY2024-25 and those with no usable report (Only an older BRSR, Report not out yet, No permanent employees, No BRSR in its report, No report found, BRSR year not read).
     - Below the rows, "Why FY2024-25 only" as filter tags. The tags are No FY2025-26 BRSR, Retrying, In your inbox, Merged, Insolvent and Delisted. Each opens the list filtered to that reason, with each company's full reason in a tooltip.
     - **The list for no usable report (13 October 2026, owner):** standardised so every row has a value in every column: the name ending in "Ltd." (names.py, so SQLite and the records build match), the better exchange rank on the December 2024 list or "Not ranked", the BRSR due year as "FY2026-27" or "Already due" with the reason in a tooltip, and the reason tag. The listing date and "Nivel company" are gone from the table: most rows had neither.
     - "Not published on the company site" and "not filed with BSE" are one tag (owner, 12 October 2026).
   - **Women's share by level:** the pooled ladder with a 50% tick. A level reported by fewer than 10 companies carries a Few badge.
   - **Query the data.**
3. **Pane:** docked at 480px from 1200px up, a drawer from 720px, a full-screen sheet below that.
   - **Run (the root):**
     - the state sentence and the lock;
     - the open batch's stage rail and its table;
     - Pace, Finish and Left. Pace is measured over the last six batches that ran on the schedule in force; until two have, it is Expected, from how many runs recent batches took;
     - usage meters with gate ticks;
     - a ribbon of every scheduled slot, then one row per run, saying why a slot was lost;
     - the full run log.
   - **Batch:**
     - times and duration;
     - outcome tiles, including corrections;
     - what happened, as a timeline;
     - flags, and reports not found the first time;
     - every company, with where it stands now.
     - Previous and next arrows step through batches.
   - **Gap batch** (g001 on, PARITY-135):
     - times and duration;
     - Filled, Nil table, Wrong year and Unread tiles, or, while open, a three-stage rail (Cut tables, Read, Merge) with fields asked and companies read;
     - every company, with the fields asked for, filled, given as nil and not found, and the reader's note in a tooltip.
   - **Company:** read from top to bottom, it answers in this order:
     - status;
     - why;
     - what happens next (with links when it needs the owner);
     - flags;
     - four value tiles;
     - levels and functions;
     - a trail of searches, downloads, reads and checks;
     - links;
     - raw records in disclosures, plus Open in SQL.
4. **Gap fill:** once the FY2025-26 queue is through, the runs fill gaps ([runbook step 9](../playbooks/brsr1000-batch.md)). Batches of both kinds share one list, one slot ribbon and one prev/next order, by when they opened. The bar's progress, finish and the Run pane's Pace, Finish and Left then follow the gap queue (`data/gaps/queue.json`), marked "gap fill". Finished means both queues are through.
   - **History (PARITY-136):** after the gap fill, the runs read the history stores newest year first. History batches (`h2425-b001` on) join the same list, ribbon and run log, each with its own pane (the year read, another year's report, none usable, and the stage rail while open). The bar's progress and finish then follow the store the runs are on, marked "2024 history", and the Run pane names the years left. The year rows count each store's readings as they close.
5. **Wide views:** Companies (status and reason tags, a sortable table, and a two-line list below 900px), Results and SQL replace the Today column. "Today" goes back, and the pane stays beside them.
6. **Marks and the watch (PARITY-127, PARITY-128):**
   - **Mark:** the pane of a company still on FY2024-25 has a "Mark as" row: No BRSR filed, Merged, Insolvent, Delisted.
     - **No BRSR filed** saves on one click. It is for when the owner has checked the filings and there is none.
     - **Merged, Insolvent and Delisted** open a small form with optional details: the company it merged into and the date, or the date it entered insolvency or was delisted.
     - **A fetch-by-hand row** offers No BRSR filed in one click, and "Other mark" opens the pane for the rest.
   - **After marking:** the company leaves Needs you and joins its reason tag (No FY2025-26 BRSR, Merged, Insolvent or Delisted). A No BRSR filed company shows "Watched daily"; the others leave the watch. A toast offers Undo, which puts back the previous mark, and the pane offers Change and "Undo mark".
   - **The only write:** the mark is the dashboard's only write, to `data/owner_marks.json` (`POST /api/mark`).
   - **Watch status:** the Companies card shows how many companies are watched, the last check and the next. The Run pane has a Watch block. The routine is in [../playbooks/brsr-watch.md](../playbooks/brsr-watch.md).
7. **Meta text lives in tooltips:** an (i) button beside a heading, or the element itself. On a phone a tap opens it. What a decision needs stays visible.

## Interaction rules

- **Routes:** every state lives in the URL hash, for example `#pane=batch:b010`, `#view=companies&status=done-kaggle` or `#view=sql`.
  - Opening a pane item adds a history entry.
  - Filters, sort and the Needs you pill replace the entry, so Back undoes navigation, not filtering.
- **Links:** every navigable thing is a real link, so middle-click opens it in a new tab.
- **Refresh:**
  - Every 30 seconds the page fetches `/api/overview` and `/api/runs`.
  - It fetches the open pane's data only when that can change, such as an open batch or a company in a batch.
  - It pauses while the browser tab is hidden.
- **Rendering:**
  - Each region is rewritten only when its HTML changed.
  - A region that holds a focused input or a text selection is skipped until the next tick.
  - Disclosures, expanded reasons, Seen flags and the SQL text are kept in this browser, so a refresh never closes or clears them.
- **Keys:** `/` or ⌘K opens the search. Arrows and Enter pick a result, and Esc closes the pane. ⌘ Enter runs the SQL.
- **What search finds:**
  - companies, by name, CIN, key or website;
  - batches, as "b6" or "batch 6";
  - runs, by a clock time such as "9:41", matched within 12 minutes in either half of the day;
  - FY2024-25 reasons.
  - An empty field offers places to jump to.

## Run states

The bar's word comes from the lock, the open batch, the run log and usage:
- **Running.**
- **Overrunning:** the lock has been held longer than the run interval: 10 minutes from 13 October 2026, 30 before. Slots follow the schedule in force at each time (`SCHEDULES` in `dashboard.py`).
- **Stuck:** more than 90 minutes, when the next run takes over.
- **Stopped:** the log says STOPPED and the lock is free.
- **Paused by usage:** at a gate.
- **Idle:** names the last close and the next run, or says a slot did not open a batch.
- **Finished.**

**Inferred slots:** a run that stops at the gate or the lock writes nothing, so lost and skipped slots are worked out from batch times. Those rows carry an Estimated badge.

## Endpoints

| Endpoint | What it returns |
|---|---|
| `/api/overview` | progress, gap-fill progress (`gaps`), run state (with the open batch's `kind` and `stageName`), pace for the current phase, Needs you (fetch rows, files, decisions), the ladder |
| `/api/runs` | one row per slot and per attended batch, and the parsed run log |
| `/api/batch?id=` | one batch: times, outcomes, corrections, log, flags, first-search misses, companies; for a gap batch (`kind: gap`), the fields each company was asked for, filled and given as nil |
| `/api/company-view?key=` | one company: status, why, next step, values, levels, functions, trail, links, raw records |
| `/api/companies-all` | every company, with status from the live queue and values from the last SQLite build |
| `/api/hierarchy` | the pooled ladder and job functions |
| `POST /api/sql` | one read-only SELECT or WITH, up to 500 rows |
| `POST /api/mark` | set, change or clear an owner mark (`kind`: noBrsr, merged, insolvent, delisted or null; optional `into`, `since`, `note`) on a company still on FY2024-25; returns the mark and the previous one. Refused from any other origin |

## Not done, and why

**Checker flags have no shared resolved state.** The server is read-only, so Seen lives in one browser. A shared resolved list (`data/flags.resolved.json`) needs the owner's yes.

**Lost slots are inferred.** Recording them exactly would mean `batch.py` appending a line each time gate or lock stops a run. That changes what a scheduled run writes, which the runbook forbids without the owner's yes.
