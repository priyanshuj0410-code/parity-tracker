---
type: plan
title: US indexes (S&P 500 and Dow), board seats only
description: Plan for adding the S&P 500 and Dow as a limited-data market, measured by women's share of board seats from proxy statements, with the 2026 disclosure findings, the method, the app changes and the open decision.
status: in-progress
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/9099af5a-1024-4b94-a82a-11043ae1a491
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a3048e8e-72b5-4847-8584-e9b02e3e0781
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/70ae7fee-41d2-422e-9eb7-32d6b42aa87b
---

# US indexes: board seats only

## Why the US is limited
- The US has no mandatory gender pay gap or workforce disclosure, so neither shared scale (employment parity, wage parity) can be filled from required filings.
- Nasdaq's board-diversity rule was struck down in December 2024, and many 2026 proxy statements dropped their diversity matrices.
- **The one dependable public signal is who sits on the board:** every company files a proxy statement (DEF 14A) before its annual meeting, naming its director nominees.
- So the US joins as a **limited-data market**. Its headline is women's share of board seats, which is not comparable with the pay-based headlines elsewhere and is never ranked against them.

## What the 2026 proxies actually say (sample, 2 October 2026)

| Company | Proxy filed | Explicit count of women | Biographies say Ms./Mr. or she/he |
|---|---|---|---|
| JPMorgan Chase | 6 Apr 2026 | "6 - Female" | Yes |
| Walmart | 23 Apr 2026 | "27% Female" | Yes |
| Goldman Sachs | 20 Mar 2026 | "5 Women" | Yes |
| Microsoft | 21 Oct 2025 | None (a chart without numbers) | Yes |
| Coca-Cola | 16 Mar 2026 | None (a pie chart without numbers) | No |
| Apple | 8 Jan 2026 | None | Not checked |

- Half the sample states a count. Of the rest, some still describe each director as Ms. or Mr. in the company's own words, and a few give neither.
- **Coverage across the S&P 500:** 497 of 503 companies have a proxy on file, 496 of them from the current season.

## Method
1. **Explicit statement first:** a diversity matrix, "N women", or "X% female" for the nominees standing for election.
2. **Otherwise, the company's own words:** count nominees the proxy describes with "Ms." or "she/her", over all nominees. A nominee described as "they", or with no honorific, counts toward the total but not as a woman, and the company is marked partial.
3. **Otherwise, "not disclosed".**
4. **Never infer gender** from names, photos or outside sources.
5. **Index headline:** women's seats as a share of all seats across companies with data (seat-weighted), with coverage shown beside it.
6. **Optional, later: voluntary EEO-1 reports.** Some companies publish these; they give women's share of the US workforce, which is employment parity on the shared scale. They have to be collected from company reports by hand, so coverage is partial. With no wage parity, US companies stay off the parity map.

## App changes
- **Coverage map:** add the US with status "Limited data".
- **S&P 500 and Dow index pages:**
  - **Headline:** women's share of board seats.
  - **Tabs:** Overview and Companies; Sectors once enough companies have data.
  - **Trend:** none until the next proxy season. The "Not enough data yet" state covers this.
- **Company pages:**
  - Board seats card.
  - EEO-1 workforce share where published.
  - The "Not on the parity map" card, which explains why.
  - Sources tab: the proxy filing link.
- **Compare:** the US is excluded from the pay scales, with a one-line note saying why.
- **Method page:** a "US: board seats only" section with the rules above.

## Steps
1. **US-1 Constituents and proxy index (done):** `pipeline/us/fetch_constituents.py` and `fetch_proxies.py`, plus `djia.txt`.
2. **US-2 Board extraction:**
   - Download the proxies.
   - Extract the explicit statement, or else count the honorifics.
   - Queue partial or unclear companies for review.
3. **US-3 EEO-1 workforce share (optional):** for companies that publish it.
4. **US-4 App integration:** the limited-data market, with index and company pages.
5. **US-5 Method page and design notes.**

## Extraction status (US-2, 2 October 2026)
- **Contact:** the user approved declaring priyanshu.jain@theequallens.com to SEC (`SEC_USER_AGENT="Nivel by The Equal Lens priyanshu.jain@theequallens.com"`).
- **Downloads:** all 497 proxies (1.2 GB, kept in a scratch folder, not the repo) via `fetch_proxy_docs.py`.
- **`extract_board.py`:**
  - Reads each "Director since" biography header for the director's name.
  - Takes the honorific the proxy uses for that surname (Ms./Mrs. or Mr.); otherwise the pronouns near the director's full name.
  - Checks the count against the stated number of nominees.
  - Uses a stated count of women only to settle unresolved directors, and only when it fits.
- **First full run:**
  - High confidence: 121 companies (count matches, no unresolved directors).
  - Review: 211.
  - No biographies found: 165.
  - The confident set gives women 33.6% of seats (420 of 1,251), in line with published S&P 500 board studies.
- **Checks against stated counts:** Apple reads 4 of 8 and 3M 3 of 10. JPMorgan reads 5 of 11 plus 2 unresolved, and its proxy states "6 - Female". Goldman reads 4 of 13 plus 2 unresolved (one is Jan Tighe), against a stated "5 Women".
- **Next:**
  - Widen the biography anchors beyond "Director since" (for example "Age 63", "Joined the Board", tenure lines), which covers most of the 165.
  - Pick up stated counts in summary graphics, such as "6 - Female", for the unresolved 91.
  - Reconcile the 98 count mismatches (retiring directors, duplicated summary tables).
  - Review the rest by hand.
- **Publishing:** nothing goes into the app until a company is high confidence.
