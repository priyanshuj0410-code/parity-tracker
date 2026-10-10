---
type: research
title: Resolution source catalogue for Nivel's markets
description: The publications Nivel's markets can resolve against, with what each measures, its latest release, when the next one is due and where the schedule is set. A market opens only when its source has a named, dated release.
updated: 2026-10-10
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/119d2d51-b5bb-47a4-b0de-88529c71863f
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
---

# Resolution source catalogue

For [Nivel play and markets](../plans/nivel-play-and-markets.md). What to ask, and how, is in the [evidence brief](norm-markets-evidence.md); the market templates are in [market-templates.md](../plans/market-templates.md) (PARITY-48).

## The rule
- **A question resolves only against a named, dated publication.** The source, its exact question or definition and its expected date are shown before anyone forecasts.
- **If a release slips,** the market stays open for up to 30 days past the scheduled date, then is voided and stakes return. It is also voided if the publication is cancelled or the measure changes definition. The owner resolves each market, citing the source link ([decision 0017](../decisions/0017-markets-architecture.md), PARITY-48).
- **Schedules drift,** so each market records the schedule document it relied on and the date that document was read.

**Widened on 7 October 2026** ([decision 0018](../decisions/0018-weekly-market-cycle.md)): weekly markets may use any official statistics release on women's work and pay that publishes to a calendar, in India or elsewhere, such as MoSPI, the Labour Bureau, ONS, ABS, WGEA, Japan's statistics bureau and Eurostat. The Saturday run checks each one's calendar and records it in the proposal. Add a row here when a new source is first used.

## Sources

| Source | What a market can use | Latest release | Next release and its schedule | Fit |
|---|---|---|---|---|
| **Nivel's own releases** | Women's share of pay, employment parity and board seats for an index, from BRSR (India), the UK gender pay gap service, WGEA (Australia), the MHLW database (Japan) and CSRD statements (EU) | Release 20261005-165058, data collected 5 October 2026 | India: FY2026-27 BRSR filings arrive with annual reports, mostly by September 2027. UK: April 2026 pay, filed by April 2027. Each market's refresh is logged in [data-pipeline.md](../playbooks/data-pipeline.md) | **Forecast the data.** Index level only. Resolves on the Nivel release that first carries the year |
| **Periodic Labour Force Survey (PLFS), MoSPI** | Women's labour force participation rate, current weekly status, age 15 and over; rural, urban and all-India | Quarterly bulletin for April to June 2026, out 10 August 2026; monthly bulletins (May 2026's came out on 15 June); Annual Report 2025, press note 27 March 2026 | Monthly bulletins around the 15th of the next month; quarterly bulletins about six weeks after the quarter. Set in MoSPI's [Advance Release Calendar 2026-27](https://www.mospi.gov.in/uploads/documents/releaseCalender/1779709510470-ADVANCE%20RELEASE%20CALENDAR%202026-27%20Updated%2025.05.2026.pdf) (updated 25 May 2026) | **Forecast the data.** The best fit: frequent, dated, one clear definition |
| **Labour Force, Australia, ABS** | Women's participation rate and employment-to-population ratio, civilian population aged 15 and over, seasonally adjusted (tables "Participation rate, Seasonally adjusted" and "Employment-to-population ratio, Seasonally adjusted", Females column) | [September 2025](https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/sep-2025), released 16 October 2025: participation 63.3%, employment-to-population 60.6% | Monthly, mid-month on a Thursday. September 2026's is due 15 October 2026, in the [ABS release calendar for October 2026](https://www.abs.gov.au/release-calendar/future-releases/202610/rcc_labour) (read 10 October 2026). Seasonally adjusted figures are revised each month; a threshold uses the figure as first published | **Forecast the data.** First used in the week opening 11 October 2026 |
| **Time Use Survey (TUS), MoSPI** | Minutes a day women and men spend on unpaid domestic services and caregiving | TUS 2024 (January to December 2024), released 25 February 2025. Women's unpaid domestic work went from 315 minutes a day in 2019 to 305 in 2024 | No round announced; rounds so far were 2019 and 2024 | **Baseline only** until a round is scheduled. Use it for reveals and the game, not markets |
| **National Family Health Survey (NFHS-6, 2023-24), Ministry of Health** | Women's role in household decisions, ownership of assets and a bank account, and work for pay. Not the attitudes-to-violence items (see the [evidence brief](norm-markets-evidence.md#3-what-to-forecast-and-what-not-to)) | Fact sheets, 29 May 2026 (101 indicators; all states and union territories except Manipur) | The national report with the detailed tables is announced but undated (reported 8 June 2026) | **Forecast the norm,** once the report has a date. The fact sheets carry health indicators only, so no norm market can open on them |
| **World Values Survey (WVS)** | Shares agreeing with statements on women and work, such as "When jobs are scarce, men should have more right to a job than women" | Wave 7 (2017 to 2022) | Wave 8 fieldwork runs 2024 to 2026. India's release date is not published | **Forecast the norm,** once wave 8 is dated for India |
| **Pew Research Center** | Indian adults' views on gender roles in families and society | ["How Indians View Gender Roles in Families and Society"](https://www.pewresearch.org/religion/2022/03/02/how-indians-view-gender-roles-in-families-and-society/), March 2022, from a 2019-20 survey | No repeat announced | **Baseline only:** reveals and the game. No market without a dated repeat |

## Not yet checked
- **India's fieldwork date and question list in WVS wave 8.**
- **The NFHS-6 national report's date and which household-decision items it repeats from NFHS-5.**
- **WGEA's yearly release month.** Nivel's Australian figures follow WGEA's employer releases; confirm the month before an Australian market opens.
