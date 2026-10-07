---
type: plan
title: Market templates and resolution workflow
description: The spec PARITY-44's build follows for Nivel's yes-or-no markets. Three templates (Nivel data, official statistics from PLFS, norms), the subject format, the wording rules and the do-not-ask list, how a market closes, resolves and voids, the resolution log, and three worked examples.
status: spec
updated: 2026-10-06
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/119d2d51-b5bb-47a4-b0de-88529c71863f
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4313243b-a30d-45bb-986c-7fd3e4f349e0
---

# Market templates and resolution workflow

**Since 7 October 2026, markets run on the weekly cycle in [decision 0018](../decisions/0018-weekly-market-cycle.md):**
- Claude proposes them each Saturday, the owner approves, they open at 21:00 IST on Sunday, and they settle by 09:00 IST the next Saturday.
- A release must fall Tuesday to Friday of its week.
- The official template covers any dated official release on women's work and pay, with the publisher's own precision.
- Nivel data markets do not fit the weekly cycle (section 5).
- The console has no create form.

The rest of this spec still applies.

The spec for [PARITY-48][p48]. The code is [PARITY-44][p44]'s. Built on:
- [Decision 0017](../decisions/0017-markets-architecture.md): yes-or-no thresholds first; the owner resolves, citing the source link; 30 days' grace.
- [Resolution sources](../research/resolution-sources.md): which publications a market may use.
- [Evidence brief](../research/norm-markets-evidence.md): what to ask (section 3) and how to word it (section 4).
- [Gaming Act check](../reviews/gaming-act-check-2026-10.md): build rule 8, no markets on prices or index levels.

## 1. What every market carries
A market is made only from a template. The console has no free-text market. Every field below is shown to players before anyone forecasts, and stored with the market.

| Field | What it holds |
|---|---|
| Template | `nivel-data`, `official` or `norm` |
| Subject | The figure the market resolves on ([section 2](#2-the-subject)) |
| Source | Publisher and publication, with a link |
| Definition | The source's exact definition of the figure, quoted or closely paraphrased, with where it is printed |
| Release | The named publication that settles the market, such as "PLFS monthly bulletin for October 2026" |
| Scheduled date | The date that release is due, from the schedule document |
| Schedule document | The document the date comes from, with its link and version |
| Read on | The date the owner read that document. Re-read seven days before the scheduled date |
| Threshold rule | How the threshold was set ([section 3](#3-the-three-templates)), and the threshold itself |
| Question | The wording players see ([section 4](#4-wording)), at most 200 characters |
| Trading closes | Date and time in IST ([section 5](#5-closing)) |
| Resolution link | Where the result is printed: the page, table or field. The release's own address is added at resolution |
| Void rules | The standard ones ([section 6](#6-resolution-workflow)), plus any the template adds |

**Comparison is always "at least"** (the figure is greater than or equal to the threshold). It is made at the precision the source publishes, so a tie is a yes.

**The threshold is set once,** by the template's rule, before the market opens. It never moves.

**The opening price is 50 out of 100** (`priorYes` 0.5). Each rule picks a threshold near the last published figure, so an even start is fair.

## 2. The subject
A subject names one figure: what is measured, for whom, and for which period. A market sits on a subject, and the threshold lives in the market. The engine never interprets the subject ([decision 0017](../decisions/0017-markets-architecture.md)); Nivel's code does.

**Format:** `{market}:{population}:{measure}:{period}`, all lower case. Example: `in:nifty50:payshare:fy2026-27`.

| Part | Holds | Form | Examples |
|---|---|---|---|
| market | The country or region the figure describes | Nivel's market codes, lower case | `in`, `gb`, `au`, `jp`, `eu` |
| population | A Nivel index, or the people a statistic or survey describes | An index id as in the [data API](../reference/data-api-v1.md). Otherwise `women`, `men` or `all`, then the age (`15plus`, `18plus`, `15to49`), then `-rural` or `-urban` when the figure is not national | `nifty50`, `women15plus`, `women15plus-rural`, `men18plus` |
| measure | What is measured, from the vocabulary below | Words joined by hyphens | `payshare`, `lfpr-cws`, `wvs-jobsscarce-agree` |
| period | The source's own reference period | `fy2026-27` (Indian financial year), `2026` (calendar or reporting year), `2026-10` (month), `2026-oct-dec` (quarter), `wave8` (survey round) | `fy2026-27`, `2026-10`, `wave8` |

**Rules:**
- Exactly four parts, joined by colons. Inside a part: `a` to `z`, `0` to `9` and single hyphens.
- At most 80 characters. Pattern: `^(in|gb|au|jp|eu):[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*:(fy\d{4}-\d{2}|\d{4}(-(0[1-9]|1[0-2]))?|\d{4}-[a-z]{3}-[a-z]{3}|[a-z]+\d+)$`. It is a stricter form of the `SUBJECT` check in PARITY-44's `api/_markets.ts`.
- **One open market per subject** while markets are yes-or-no. Brackets come later.
- **Same frame both ways** (brief, section 4, rule 4) uses two subjects, such as `men18plus` and `women18plus`, opened together.

**Measures in use:**

| Measure | Template | Meaning |
|---|---|---|
| `payshare` | Nivel data | Women's share of pay, the payroll an index fund owns: Nivel's India index headline |
| `lfpr-cws` | Official | Labour force participation rate, current weekly status |
| `{survey}-{item}-{answer}` | Norm | The share giving one answer to one survey item. The slug is fixed when the owner approves the item, as in `wvs-jobsscarce-agree` |

Add a row here before any market uses a new measure.

**The Spot feed's ids map one to one.** Subject `in:nifty50:payshare:fy2025-26` is feed item `nv-in-nifty50-payshare-2025-26`: colons become hyphens, `fy` is dropped and `nv-` is added. PARITY-54 uses this to fill each item's `nivel.markets`.

## 3. The three templates

### Nivel data (`nivel-data`)
- **Source:** Nivel's own published release. The figure is the data API's `indexes/{id}.json`, `years[{year}].headline`, shown on the index page.
- **Definition:** Nivel's own, quoted from the release. For India: women's share of each company's pay, weighted by the slice of the company an index fund owns times its median yearly wage bill since 2022-23, from company BRSR filings. Estimates are included and labelled, as on the site.
- **Release:** the first Nivel release on or after the scheduled date that shows the year for the index with at least 90% of the owned payroll from reported figures (`reportedPayrollShare` of 0.90 or more). A thinner release does not settle it.
- **Scheduled date:** set by the owner from Nivel's release calendar.
- **Schedule document:** Nivel's release calendar. **It does not exist yet** (owner decision 1).
- **Threshold rule:** the index's last published headline for the same measure, rounded to the nearest half point.
- **Precision:** the API's four decimal places of a fraction (two of a percentage). The market card shows that exact figure, because the site rounds to one decimal place.
- **Index level only.** No market on a single company, a sector of a few companies, or an index's price or level.
- **Integrity:** Nivel publishes the figure and its owner resolves the market. So:
  - the method is the one in force when the market opens, and a change voids the market;
  - the figure comes from the pipeline, never typed in;
  - nobody with console access or the data tools trades;
  - the release id goes into the log.

### Official statistics (`official`)
- **Source:** a government statistics release with a published calendar. For now, only the Periodic Labour Force Survey (PLFS) from MoSPI.
- **Definition (PLFS):**
  - **Labour force participation rate:** the share of the population in the labour force, working or seeking or available for work.
  - **Current weekly status:** activity over the 7 days before the survey date.
  - **The figure:** the share for the stated sex, age and area, as printed in the bulletin's table.
- **Release:** a named monthly or quarterly bulletin.
- **Scheduled date and schedule document:** the date in MoSPI's [Advance Release Calendar 2026-27](https://www.mospi.gov.in/uploads/documents/releaseCalender/1779709510470-ADVANCE%20RELEASE%20CALENDAR%202026-27%20Updated%2025.05.2026.pdf) (updated 25 May 2026), or a later update. Record the version.
- **Threshold rule:** the same month or quarter a year earlier, as published. This takes out the seasonal swing in women's farm work.
- **Precision:** one decimal place, as the bulletin prints it.

### Norms (`norm`)
- **Source:** a published survey with a dated release: WVS, NFHS or Pew, as listed in resolution sources.
- **Definition:**
  - the survey's exact question wording, its answer options, the population, the sample and the fieldwork years;
  - the share counts every answer category on the stated side;
  - "Don't know" and no answer are shown as the survey reports them, never folded into a side (brief, section 4, rule 6).
- **Release:** the named survey report or data release.
- **Scheduled date:** the publisher's announced date. **No date, no market:** without one, a norm market stays a draft.
- **Threshold rule:** the same survey series' previous figure for the same item and population, rounded to the nearest whole number. If the series has none, 50.
- **Precision:** as the publisher prints it.
- **Items come from an approved list.** The owner approves each survey item once, against the do-not-ask list below, and the approval is logged. Moderation of norm questions is in the safeguarding review (PARITY-49).

## 4. Wording
**The evidence brief's rules (section 4):**
1. **Quote the survey.** Give the question's own wording, the population, the year and the source, and link it.
2. **Say who answered.** "Of every 100 men surveyed, how many said…", never "do people think…".
3. **No loaded words.** Not "wrongly", "still", "backward" or "progressive". Neutral verbs only: said, agreed, answered.
4. **Same frame both ways.** Where a survey asks men and women, open both markets.
5. **A number out of 100** for a share of people.
6. **"Don't know" is shown as the survey reports it.**
7. **British spelling, readable in Indian English, no em dashes.**
8. **Translation** keeps the survey's own translated wording where one exists, and is back-translated where it does not.

**For thresholds:**
- **One pattern:** "Will [figure] be at least [threshold] [for period]?"
- **Name the population plainly:** "the Nifty 50's", not "in the Nifty 50".
- **The source line sits under the question:** the release, its scheduled date, and a link.
- **At most 200 characters,** the console's limit.

**Do not ask** (brief, section 3). The templates block most of this by design; the owner checks the rest when approving an item:
- About a named person, or a single small company. Index and population level only.
- Whether a view is right. A survey item may contain "should"; the market asks what share agreed, never whether they were right.
- About violence, harassment or abuse, even where a survey asks.
- Splits by religion or caste. The population vocabulary has no such parts.
- Questions with no named, dated publication to resolve against.
- Questions a player could move: nothing on a single employer's own staff figures.
- Prices of securities or index levels (Gaming Act check, build rule 8).

## 5. Closing
- **Default:** trading closes at 23:59 IST on the day before the scheduled date.
- **Earlier where part of the answer appears first:**
  - **Nivel data** closes at the end of the period, because companies start filing after it. FY2026-27 closes on 31 March 2027.
  - **A PLFS quarter** closes the day before the first monthly bulletin for any month in it.
- **Published before trading closes:** the market is voided, because some trades may have seen the answer.
- **After closing,** the market waits in `resolving` until the release or the end of the grace period.

## 6. Resolution workflow
1. **Seven days before the scheduled date,** the console flags the market. The owner re-reads the schedule document and logs the date read. A revised date is logged too, but it never extends the grace period.
2. **Trading closes** at the stated time.
3. **On release,** the owner opens the publication and reads the figure where the template says. In the console they enter:
   - the figure;
   - the release's own https link.

   For Nivel data the console reads the figure from the release itself, and nobody types it. The console works out yes or no from the threshold, and the owner confirms.
4. **The engine pays** one Feather a winning share.
5. **Void and return every stake** when:
   - **overdue:** the release is more than 30 days past the scheduled date recorded when the market opened (PR #59 already flags this as `overdue`);
   - **cancelled:** the publication is cancelled;
   - **redefined:** the definition changes, such as the age band, the reference period, the survey design or Nivel's method;
   - **early:** the release came out before trading closed;
   - **error:** a mistake in the question or its setup, found before resolution.
6. **Resolutions are final.**
   - A later revision by the source does not reopen a market.
   - If the owner misread a figure, every holder is adjusted to the right outcome through the ledger's `admin_adjust` reason, with the reason logged.
7. **Questions from players** go to the grievance contact in the privacy notice (PARITY-49). The owner answers within 7 days, and the answer is logged.

### The log
- **Every action is logged:** create, schedule check, close, resolve, void and adjust.
- **The log is append-only.** No entry is edited or deleted.
- **Each entry holds:**
  - the market id and subject;
  - the action and its time (UTC);
  - the figure read, the threshold and the outcome;
  - the source link and the release name, plus the release id for Nivel data;
  - the schedule document and the date it was read;
  - the reason, for a void or an adjustment;
  - the console user.
- **Players see each market's log** on the market's page, with the console user shown as "the owner".
- **The log is the lasting record.** Nivel's static data site holds only the live, staged and previous releases ([decision 0016](../decisions/0016-static-releases.md)), so a release's link stops working after two promotes. The log keeps the figure and the release id, and Firestore keeps the archive.

## 7. Worked examples
All three use releases from [resolution sources](../research/resolution-sources.md).

### Example 1: Nivel data, the Nifty 50's pay share for FY2026-27
| Field | Value |
|---|---|
| Subject | `in:nifty50:payshare:fy2026-27` |
| Source | Nivel by The Equal Lens, [Nifty 50 page](https://nivel-equal-lens.vercel.app/index/nifty50); data API `indexes/nifty50.json`, `years["2026-27"].headline` |
| Definition | Women's share of each company's pay, weighted by the slice of the company an index fund owns times its median yearly wage bill since 2022-23, from BRSR filings. Estimates included and labelled |
| Release | Nivel's first release on or after the scheduled date showing FY2026-27 for the Nifty 50 with at least 90% of the owned payroll reported |
| Scheduled date | 29 October 2027, set by the owner. FY2026-27 filings arrive with annual reports, mostly by September 2027 |
| Schedule document | Nivel's release calendar, read on the day the market opens. Not yet published |
| Threshold rule | FY2025-26 headline 20.85% (release 20261005-165058), to the nearest half point: **21.0%** |
| Question | "Will the Nifty 50's women's share of pay for FY2026-27 be at least 21.0%?" |
| Source line | "Resolves on Nivel's first release with FY2026-27 at 90% of payroll reported, due 29 October 2027." |
| Trading closes | 23:59 IST, 31 March 2027, the end of the financial year |
| Resolution link | The release's `indexes/nifty50.json`, with the release id, and the Nifty 50 page |
| Void if | No qualifying release by 28 November 2027; Nivel's method changes; the standard reasons |

### Example 2: official statistics, PLFS for October 2026
| Field | Value |
|---|---|
| Subject | `in:women15plus:lfpr-cws:2026-10` |
| Source | Periodic Labour Force Survey, MoSPI (National Statistics Office) |
| Definition | Labour force participation rate, current weekly status, women aged 15 and over, rural and urban combined (all-India) |
| Release | PLFS monthly bulletin for October 2026 |
| Scheduled date | 15 November 2026, from a web search of the calendar's contents on 6 October 2026. **Unconfirmed:** that is a Sunday, and October 2025's bulletin came out on Monday 17 November 2025, after the 15th fell on a Saturday |
| Schedule document | MoSPI Advance Release Calendar 2026-27, updated 25 May 2026. The owner reads the date there and records it before the market leaves draft |
| Threshold rule | October 2025, as published: **34.2%** (PLFS monthly bulletin for October 2025, released 17 November 2025) |
| Question | "Will India's labour force participation rate for women aged 15 and over be at least 34.2% for October 2026?" |
| Source line | "Resolves on MoSPI's PLFS monthly bulletin for October 2026 (current weekly status), due 15 November 2026." |
| Trading closes | 23:59 IST on the day before the confirmed date |
| Resolution link | The bulletin on mospi.gov.in, recorded at resolution, at its all-India female LFPR row for age 15 and over |
| Void if | Not out within 30 days of the recorded date; the age band or the weekly reference period changes; the standard reasons |

The threshold comes from MoSPI's [October 2025 bulletin](https://www.mospi.gov.in/uploads/publications_reports/publications_reports1763373689682_9d2b3f40-f54e-494f-8d05-5bee8cda9a66_Final_MB_October_2025_13112025.pdf), read through [IANS's report](https://ianslive.in/indias-labour-force-participation-rate-rises-to-6-month-high-in-oct--20251117163604). The owner checks it against the bulletin before opening.

### Example 3: norms, men and women on jobs when jobs are scarce
| Field | Value |
|---|---|
| Subjects | `in:men18plus:wvs-jobsscarce-agree:wave8` and `in:women18plus:wvs-jobsscarce-agree:wave8`, opened together |
| Source | World Values Survey, wave 8, India |
| Definition | The share of respondents of that sex who agreed with "When jobs are scarce, men should have more right to a job than women", counting every agree category the questionnaire offers. "Don't know" and no answer are shown as the WVS reports them. The Hindi wording is the questionnaire's own |
| Release | The WVS data release that first includes India's wave 8 |
| Scheduled date | **None.** India's wave 8 release date is not published |
| Schedule document | None yet |
| Threshold rule | India's wave 7 figure for the same item and sex (fieldwork 2023, released April 2024), to the nearest whole number. Read it from the WVS data when the market is drafted |
| Question | "In the World Values Survey's next India round, will at least [N] of every 100 men surveyed agree that 'when jobs are scarce, men should have more right to a job than women'?" The women's market reads the same |
| Source line | "Resolves on the World Values Survey's wave 8 release for India." |
| Trading closes | 23:59 IST on the day before the scheduled date |
| Resolution link | The WVS wave 8 India data on worldvaluessurvey.org |
| Status | **Draft only.** It cannot open until the WVS publishes a date for India's wave 8 |

The item says "should". The market asks what share of each group agreed, never whether the view is right (brief, section 3).

## 8. What the build needs (PARITY-44)
**Built in PR #59** ([markets-api.md](../reference/markets-api.md)), as of 6 October 2026:
- the template registry, the strict subject check, per-market details and one open market per subject;
- closing times, resolving from the figure with the owner's confirmation, void reasons and the append-only log;
- console accounts that cannot trade.

**Still to build:** drafts for markets with no scheduled date, and the `admin_adjust` correction. The full list as specified:
- **A template registry,** so the console builds each market from a template and the template's fields. No free-text markets.
- **The stricter subject check** in section 2.
- **Fields per market:** template, threshold, precision, schedule document, its link and version, the date read, closing time and resolution location. Nivel's own table, keyed by market id, since the engine never interprets them.
- **Trading stops at the closing time,** whatever the status.
- **Resolve takes the figure,** works out the outcome from the threshold, and asks the owner to confirm.
- **Void takes a reason:** overdue, cancelled, redefined, early or error.
- **The append-only log** in section 6, shown on each market's page.
- **A draft state** for markets without a scheduled date, and a flag seven days before each date.
- **Console accounts cannot trade.**
- **One open market per subject.**

## 9. Owner decisions
1. **Nivel's release calendar.** Nivel data markets need a public schedule document. Publish one before the first opens, such as a page listing each market's next release date.
2. **The 90% reported-payroll bar** for a Nivel release to settle a market.
3. **An early release voids the market,** rather than refunding only the trades made after it.
4. **The grace period counts from the date recorded at opening,** even if the source later moves its date.

[p48]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
[p44]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
