---
type: runbook
title: BRSR filer build, one batch
description: What each scheduled run of the BRSR filer build does, every 10 minutes (every 30 until 13 October 2026). It takes 25 companies through finding their latest reports, downloading them, cutting the tables, reading them (Haiku) and settling disagreements (Sonnet), then stops.
updated: 2026-10-13
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b0e815e8-8fd2-47b1-af1d-f81a2b7d6515
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/531a80bc-bb43-47ac-a2df-79e769084cf0
---

# BRSR filer build, one batch

Plan and decisions: [../plans/india-brsr-1000.md](../plans/india-brsr-1000.md). Code: `pipeline/india/brsr1000/`. Working data: `pipeline/india/brsr1000/data/` (git-ignored).

In the commands below, `D` is the absolute data path, `/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data`. `B` is `python3 pipeline/india/brsr1000/batch.py`. Run everything from `/Users/priyanshu/parity-tracker`.

## 0. Gate (pacing)

1. **Usage:** run `B gate D`. If it exits 3, **stop**: the guard is tripped, the week is at 78% or more, or the 5-hour window is at 75% or more. The run does no work and writes nothing; the next run, 10 minutes later, tries again.
2. **Lock:** run `B lock D`. If it exits 3, another run took the lock under 90 minutes ago: **stop**. Exit 0 means this run now holds it. If it says `stale`, a run died mid-batch: resume its batch.
   - The lock also points the repo's Plane marker (`.plane_current_issue`) at PARITY-123, freshly. The global Plane guard hook only allows file writes against an open issue named less than 4 hours ago, and every batch is PARITY-123 work.
   - `B unlock D` gives the marker back if another chat had it on a different issue within the last 4 hours, so that chat's work is not credited to PARITY-123.
   - Never edit the marker or the hook by hand in a run. Otherwise write `{"state": "busy", "since": "<now, ISO>"}` to it.

## 1. Open or resume a batch

1. **Status:** run `B status D`, then `B next D 25`. The output gives the batch id, its stage and its keys.
2. **Queue done:** if it reports `"open": null`, the queue is finished. Go to step 7.
3. **Resume:** if the stage is past discover, skip ahead to that stage. Stages run in this order:

   | Stage | Next step |
   |---|---|
   | discover | step 2 |
   | refind | step 2, item 3 |
   | browse | step 2, item 4 |
   | fetch3 | step 2, item 4 (the last `B fetch D`) |
   | snippets | step 3 |
   | read | step 4 |
   | adjudicate | step 5 |
   | final | step 6 |

Opening a batch (`B next`) also does the owner's side:
- **Inbox:** it takes any reports the owner saved by hand in `~/brsr reports 2025-26/inbox/`. `inbox.py` matches each to its company (the dashboard uses the same matcher to show where a waiting file will go), trying in turn:
  1. a CIN in the file name (the queue entry with that key first, then any entry with that CIN in the queue or `identifiers.json`);
  2. the name in the owner's label, "<Name> is <CIN> - <file>.pdf";
  3. the CIN printed in the file;
  4. the Section A name;
  5. the website;
  6. the file name.

  Names match after accents are folded ("Nestlé" is "Nestle"), and a short name ("KSB", "MRF") only by an exact, unique match. A CIN in the label that the company had none for is recorded on it; a label whose CIN belongs to another company is not matched by name. Until 12 October 2026 a company without a CIN in the queue could not be matched by a labelled file, and short names were skipped.

  It records the file as a download and moves it to `inbox/done/`. A company with a file waiting goes to the head of the queue.
  - **Closed companies go back:** a FY2024-25 company goes back through the recheck below. A Nivel company whose deep pass is done, or a "no usable report" company, goes back here when the file replaces its text with a FY2025-26 BRSR.
  - **Image-drawn reports:** a BRSR whose text has no CIN is read with OCR, both here and in `fetch.py`.
  - **No match:** files it cannot match stay in the inbox and show on the dashboard. Renaming one to its CIN always matches.
- **Recheck:** it sends companies whose FY2025-26 text has arrived back to be read. That includes a "no usable report" company with no reason recorded whose text was taken in as of an unread year and now reads as FY2025-26, as Schaeffler's calendar 2025 report did after the year parser learned the far January-to-December window (12 October 2026).
- **Downloads refused with a 403** (`fetch.py`): after the browser user agent is refused, it asks once more as plain curl, under curl's own name. Some company firewalls (Schaeffler India's Akamai) refuse a browser identity sent by a script but serve curl. It never disguises itself further: a site that refuses both (Bank of India) goes to the owner's inbox.
- **Reporting years** (`brsr_fields.is_latest`): FY2025-26 or later, with a calendar 2025 report (January to December) counting as FY2025-26. An unread year is never treated as current.
- **Companies added after OCR** (`kaggle/pending_add.json`) join only when no entry already has their CIN or Kaggle id. Kamdhenu was queued twice before this check (merged on 12 October).
- **No company left:** `next` still saves the queue before it reports `open: null`, so pending changes, marks and inbox takes are kept at the end of the build.
- **Pending changes:** it applies `D/pending.json`, changes queued by an attended session while a batch was running.

The dashboard (one page; flows in [../plans/brsr-dashboard-flows.md](../plans/brsr-dashboard-flows.md)) opens on "Needs you". It lists:
- every company only a person can fetch (sites that block automated visitors, or report lists that only appear in a browser), with links to try;
- unmatched inbox files;
- Check flags: check each against the report text, fix the accepted reading (`verified/<key>.json`, with an `ownerChecks` entry giving the edits and why), and record the outcome in `data/check_resolved.json`;
- checker flags that need a decision.

"Files you sent" tracks each saved file to Done. A saved file that turns out to be an older year's BRSR puts the company back on the list, with the year it held.

## 2. Find and download reports (stage discover)

1. **Find:** if any key lacks `D/found/<key>.json`, run the Workflow tool with:
   - `scriptPath`: `pipeline/india/brsr1000/discover.workflow.js`
   - `args`: `{"data": D, "keys": [the keys without a found file]}`

   Haiku agents search each company's own site; every company they cannot place goes to Sonnet in the same workflow. Wait for the completion notification.
2. **Download:** run `B fetch D`.
   - It works on six companies at a time, tries each one's found URLs in order (and their www, no-www and other-scheme forms), and keeps only the text.
   - It refuses NSE and BSE.
   - It also fetches the annual report when the BRSR came on its own.
   - It prints the next stage. `refind` means some companies still have no FY2025-26 BRSR; `D/batch/current.json` lists them under `refind` with the reason for each.
3. **Search again (stage refind):** run the Workflow tool with:
   - `scriptPath`: `pipeline/india/brsr1000/discover.workflow.js`
   - `args`: `{"data": D, "keys": [the keys under "refind"], "mode": "refind"}`

   Sonnet agents search again with each failure's reason. Wait for completion, then run `B fetch D` once more.
4. **Browser (stage browse):** if the stage is now `browse`, run `B browse D`. Headless Chrome reads report links from investor pages that draw them with JavaScript (no model calls; up to ten minutes). Then, at stage `fetch3`, run `B fetch D` a last time. Companies still without a FY2025-26 BRSR keep their Kaggle FY2024-25 report.

## 3. Cut tables (stage snippets)

Run `B snippets D`. It prints `read`, the keys to read. A retried company with nothing newer keeps its earlier checked reading and is not read again (`skipRead`).

## 4. Read (stage read)

1. **Read:** run the Workflow tool with:
   - `scriptPath`: `pipeline/india/brsr1000/read.workflow.js`
   - `args`: `{"data": D, "spec": "/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/READING.md", "keys": [the keys under "readKeys" in D/batch/current.json]}`

   If `readKeys` is empty, skip to step 4, item 2.

   Haiku agents write `D/read/<key>.haiku.json`. Wait for completion.
2. **Merge:** run `B merge D`. It compares each reading with the parser. It sends the following to the second checker:
   - every disagreement;
   - every missing reading;
   - one agreed reading in ten;
   - every reading that has finer levels or job functions.

## 5. Settle (stage adjudicate)

If `D/batch/current.json` lists disputes or unread keys:
1. **Settle:** run the Workflow tool with:
   - `scriptPath`: `pipeline/india/brsr1000/adjudicate.workflow.js`
   - `args`: `{"data": D, "spec": ".../READING.md" (as above), "keys": [the dispute keys plus the unread keys]}`

   Sonnet agents write `D/read/<key>.final.json`. Wait for completion.
2. **Missing results:** any key still without a final file stays on the haiku reading only if `merge` agreed it. Otherwise it is closed as no-data.

## 6. Close (stage final)

1. **Close the batch:** run `B final D`. It also rebuilds `D/brsr1000.sqlite` from the files.
2. **Log it:** append one line to `D/logs/runs.md`:
   - the date and time;
   - the batch id;
   - the latest, Kaggle-only and no-data counts;
   - the number of corrections the second checker made;
   - the usage reading from step 0.
3. **Plane:** run `python3 pipeline/india/brsr1000/plane_note.py b0e815e8-8fd2-47b1-af1d-f81a2b7d6515 "<that line>"`.
4. **Release the lock:** run `B unlock D`.
5. **Stop.** One batch per run is the pacing. Runs start every 10 minutes (owner, 13 October 2026; every 30 before). A batch that takes longer holds the lock, so the runs in its slots stop at step 2 and the next free slot takes the next batch.

## 7. When the queue is finished

1. **Summary (once):** if `D/logs/runs.md` has no line saying the FY2025-26 queue finished, run `B status D` and write the summary as a Plane comment on PARITY-123: counts by status, and how many companies reported finer levels or functions. Then append that line to the log.
2. **Gaps first:** the owner asked on 12 October 2026 for every mandatory measure (PARITY-129). If `D/gaps/queue.json` does not exist, run `python3 pipeline/india/brsr1000/audit.py D` and then `B gaps-init D`. Then go to step 9. Keep the lock you hold on `D`.
3. **History next:** when step 9 reports `"open": null`, and `D/history/2024-25/queue.json` exists, go to step 8 with `H` = `D/history/2024-25`.
4. **All done:** only when steps 8 and 9 both report `"open": null`:
   - **Turn off the schedule:** use `mcp__scheduled-tasks__update_scheduled_task` to disable the task `nivel-brsr1000`.
   - **Release the lock:** run `B unlock D`.
   - **Hand back:** the build itself (records, the payroll-weighted group, the UI and a staging release) waits for an attended session with the owner.

## 8. History batches (an earlier year, from local texts)

A history store, `D/history/<fy>/`, holds one earlier year. Its texts are already on disk (the FY2024-25 Kaggle reports), so there is no search or download. Its batches start at the snippets stage, and it never touches the owner's inbox, marks or the watch. The pacing is the same: one batch of 25 per run.

1. **Open:** run `B next H 25`. If it reports `"open": null`, this store is finished: go back to step 7.3. Otherwise note the id (`h2425-b…`) and resume at its stage.
2. **Cut tables:** run `B snippets H`.
3. **Read:** run the Workflow tool with `scriptPath` `pipeline/india/brsr1000/read.workflow.js` and `args` `{"data": H, "spec": "<absolute path to pipeline/india/brsr1000/READING.md>", "keys": [the read keys]}`. Then run `B merge H`.
4. **Settle:** if `H/batch/current.json` lists disputes or unread keys, run `pipeline/india/brsr1000/adjudicate.workflow.js` the same way with `data` = `H`.
5. **Close:** run `B final H`. It closes each company as `done` (that year), `wrong-year` (a report of another year, kept for that year's store) or `no-data`, and builds `H/brsr1000.sqlite`.
6. **Log it:** append one line to `D/logs/runs.md`: `- <date time> IST | <id> | FY2024-25 history: done N, wrong year N, no data N | corrections N | usage week W%, session S%`. Write the same line as a Plane comment on PARITY-129 (`python3 pipeline/india/brsr1000/plane_note.py 59edeb77-637d-4ab4-924e-43b8a22072b5 "<that line>"`).
7. **Release the lock:** run `B unlock D`, and stop.

## 9. Gap batches (missing mandatory fields of FY2025-26 readings)

`audit.py` lists, for each checked reading, the mandatory measures it lacks although the report's table was there, and the measures added on 12 October 2026 (well-being spend, accident insurance, wage complaints). `B gaps-init D` queues them. A gap batch reads only those fields for 25 companies and fills empty values; it never overwrites a checked value.

1. **Open:** run `B gaps-next D 25`. If it reports `"open": null`, go back to step 7.3. It cuts the companies' snippets again and prints `items`, each a key and its fields.
2. **Read:** run the Workflow tool with `scriptPath` `pipeline/india/brsr1000/gapfill.workflow.js` and `args` `{"data": D, "spec": "<absolute path to pipeline/india/brsr1000/READING.md>", "items": [the items]}`. Haiku agents write `D/read/<key>.gap.json`.
3. **Merge:** run `B gaps-merge D`. It fills the readings, records `gapFill` in each, and rebuilds `D/brsr1000.sqlite`.
4. **Log it:** append one line to `D/logs/runs.md`: `- <date time> IST | <id> | gap fill: filled N, nil N, wrong year N, unread N | usage week W%, session S%`, and the same line as a Plane comment on PARITY-129 (`python3 pipeline/india/brsr1000/plane_note.py 59edeb77-637d-4ab4-924e-43b8a22072b5 "<that line>"`).
5. **Release the lock:** run `B unlock D`, and stop.

## 10. Rankings: who files for FY2026-27 (attended, not part of a run)

`python3 pipeline/india/brsr1000/rankings.py D "/Users/priyanshu/brsr reports 2025-26/rankings"` reads AMFI's December lists of six-month average market cap (`amfi-avg-mcap-dec<YYYY>.pdf`, from amfiindia.com, never NSE or BSE), ranks each exchange's column, matches the build's companies and writes `D/rankings/fy2026-27.json`. It takes seconds and uses no tokens.
- **Run it again** when companies are added to the queue or renamed. A merged, insolvent or delisted mark shows as Leaves at once without a run.
- **What the lists cannot tell** goes in `D/rankings/manual.json`, by queue key: `isin` for a rename the names cannot match, `predecessors` for a listed company merged into it (Piramal Enterprises into Piramal Finance), `note`, `edge: true`, and `group` with `note` where a filing shows a company has gone (Gujarat State Petronet).
- **Identifiers:** `python3 pipeline/india/brsr1000/identifiers.py D` writes `D/identifiers.json`, each company's CIN, ISIN, NSE symbol and BSE scrip ID and code, with where each came from (the checked reading, the queue, AMFI's December list, the filing's own cover letter, or `D/identifiers_manual.json` for researched ones). It runs at every batch close before `to_sqlite.py`, which writes them into the `companies` table along with names as `names.py` reads them (title case for a name printed in capitals) and a `formerly` column. A scrip code is kept only where the filing labels it, its letter names the company's own NSE symbol, and no other company has it. On 12 October 2026 every company had an ISIN, a CIN (or, for SBI, LIC and the nationalised banks, a note that a body set up by its own Act has none) and a ticker; 569 gaps were researched by a nine-agent workflow and 40 codes read from filings were spot-checked, all correct.
- **Mergers and demergers:** add an event to `D/relations.json` (format in `pipeline/india/brsr1000/relations.py`): kind, the parties with their queue keys and ISINs, the business moved, the effective and appointed dates, listing dates of new companies, and the source with a short quote. An owner's Merged mark on the dashboard counts as a merger until the file holds one. Re-run rankings.py afterwards.
- **A reading under the wrong key:** `B move D FROM TO [KEY.field=value ...]` (closed batch only) moves the reading, its download records and every file named for FROM to TO, and leaves FROM to be read again. It was first used on 12 October 2026 for Tata Motors: the commercial-vehicle reading moved from the old Tata Motors CIN to NIVEL-TMCV, and that CIN became Tata Motors Passenger Vehicles again, with its FY2024-25 reading back and NIVEL-TMPV merged into it.
- **Two readings of one company:** keep the filing entry (KG- or CIN key) and merge the NIVEL entry into it, as `B dedupe` does. When the NIVEL entry's deep reading is a superset that agrees on every core figure (Colgate, 12 October 2026), it becomes the filing entry's reading and the first one is kept beside it as `.replaced`.
- **Names:** at each batch open only a FY2025-26 reading renames a company, so an older reading cannot bring back a former name.
- **Companies missing from the build:** the Companies list shows them under Files or Joins as "Not in the build". Adding them means a `D/kaggle/pending_add.json` of `TOP-<symbol>` entries (kind `new`, with `isin`), which the next batch puts at the end of the queue; rankings.py reads that file and `pending.json` as the queue will be.
- **The rules** it applies are in [../research/brsr-requirements.md](../research/brsr-requirements.md). It is written for the 2024 and 2025 lists. The December 2026 list (in AMFI's January 2027 file) is the first that can end a company's coverage, so it needs a change to the code then, not just a new file.

## Rules for every run

- **Read nothing yourself:** the orchestrating session does not read reports. The workflows' Haiku and Sonnet agents do.
- **Sources:** never use nseindia.com or bseindia.com (PARITY-66). Company sites only.
- **Hands off the live system:**
  - Do not commit, push, open PRs or run `pnpm data load` or `publish`.
  - Do not edit anything outside `pipeline/india/brsr1000/data/`, apart from the Plane comment.
- **Secrets:** never print `$PLANE_API_TOKEN`.
- **When something breaks:** if a step fails twice, write what failed to `D/logs/runs.md` and to the Plane comment, run `B unlock D` and stop.
