---
type: research
title: Gender disclosure crosswalk
description: Every gender data point any of Nivel's six markets requires or allows, as one catalogue of 324 stable data points and 33 measures, with each market's status for each (disclosed, computable or not available), the instrument and item, the scope, and how exactly Nivel's own measures follow (PARITY-130, decision 6).
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6b636025-64a4-4008-9b22-9c035eb10d14
---

# Gender disclosure crosswalk

Decision 6 of [../plans/cross-market-dataset.md](../plans/cross-market-dataset.md): one row per data point, each market's status beside it, and how exactly each measure follows. The catalogue is the least common multiple of every regime ([the LCM rule](../plans/cross-market-dataset.md)): anything one market discloses has a row, whether or not the others do. Nivel's three measures sit on top.

**How it was built (12 October 2026):**
- **Research:** 109 instruments across India, the UK, Australia, Japan, the EU (CSRD and ESRS, the Pay Transparency Directive, Women on Boards, and France, Germany, Spain, Italy and the Netherlands), the US (federal and state) and the global frameworks (GRI, ISSB and SASB, WEF, WEPs, ISO 30414, ILO, OECD, Equileap). Each was checked by a skeptic; 48 came back with corrections, applied here.
- **Catalogue:** 324 data points from the 270 measures the instruments define, each with a stable id (`<quantity>.<population>.<statistic>[.<element>][.<gender>]`) so a company can later be asked for exactly it (decision 7).
- **Classified per market:** one agent per market, then three skeptics (India and Japan, the UK and Australia, the EU and the US), whose 173 corrections are applied.
- **Data:** the full cells (instrument, item, who files, since when, where it is public, notes) are in [crosswalk/crosswalk.json](crosswalk/crosswalk.json), and the instrument research in [crosswalk/instruments.json](crosswalk/instruments.json).

| Market | Disclosed | Computable | Not available |
|---|---|---|---|
| India | 128 | 25 | 171 |
| UK | 108 | 15 | 201 |
| Australia | 131 | 51 | 142 |
| Japan | 120 | 19 | 185 |
| EU | 159 | 26 | 139 |
| US | 117 | 70 | 137 |

## Nivel's three measures, market by market

S is women's share of pay (parity 50%), E employment parity (women's share of staff), W wage parity (women's mean pay as a share of men's). Exact means a mean on total pay over all staff; approximate means hourly or FTE pay, or a subset of staff.

| Measure | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|
| Women's share of pay | Exact | Approx. | Approx. | Approx. | Approx. | Approx. |
| Employment parity | Exact | Exact | Exact | Approx. | Exact | Exact |
| Wage parity | Approx. | Approx. | Approx. | Exact | Approx. | Approx. |

**Women's share of pay:**
- **India:** Route 1: reported as pay.all.share.annual.women (BRSR P5 EI-3(b), mandatory for the top 1,000 from FY2023-24, assured on the BRSR Core glide path). A mean on total cash pay over all staff on the entity's own payroll. Caveats: contractor-supplied workers' wages are often outside it, and the boundary is standalone or consolidated (method.scope). Route 2 (rupee totals) gives the same share where amounts are filed.
- **UK:** Route 3 only, per GB legal employer: W = 1 - pay.all.gap.hourly.mean (UK-GPG-2017 Reg 2(1)(a)) and E = mean of the four headcount.quartile.share.hourly.women (Reg 2(1)(f)), both on full-pay relevant employees in the April pay period; a group's UK arm combines its employers by size-band midpoints. Hourly, so women's fewer paid hours are missed and S overstates the annual share. Routes 1 and 2 are not available (no pay totals by sex) and route 4 is not (no quartile pay levels). A group S needs a voluntary worldwide mean gap (Bloomberg Q29f) with s414C E, also approximate.
- **Australia:** Route 3: E = headcount.all.share.women (WGEA total workforce % women) and W = 1 - pay.all.gap.fte.mean (WGEA mean annualised FTE total remuneration gap), giving women's share of FTE pay for each corporate group's Australian staff. Approximate: FTE annualisation grosses up part-time and casual pay, more often women's, so it overstates women's share of pay actually paid. Route 4 (quartile shares times quartile average pay) is an approximate cross-check. Not computable for 2022-23, which has medians only. National scope; a worldwide group figure only from company reports.
- **Japan:** No total-pay or share disclosure, so routes 1, 2 and 4 are out. Route 3: W = 1 - pay.all.gap.annual.mean, the WAA mean on annual total pay over all workers (the exact pay input), with E from the optional WAA workforce item. E is the weak side: it is not the average monthly headcount the ratio uses, the all-workers row is rare and can include dispatched workers, and Nivel today pairs all-worker W with regular-staff E (headcount.regular.share.women), which mixes bases. Like-for-like option: pay.regular.gap.annual.mean with headcount.regular.share.women gives the regular-staff share of regular pay, approximate as a subset. E is missing for about 30% of companies.
- **EU:** Route 3 at group level, as Nivel does today: S = E*W/(E*W+1-E) with W = 1 - pay.all.gap.hourly.mean (ESRS S1-16 §97(a), mean hourly, total pay) and E = headcount.all.count.women / (women + men) (ESRS S1-6 §50(a)). Approximate: an hourly W with a headcount E, company-chosen pay elements and scope; 73 of 103 Nivel companies have both. Route 1 does not exist, as no EU rule asks for S. Route 2 comes only from Italy's art. 46 total pay by sex per entity, which covers a biennium and is not public, so it is approximate too; Belgium's personnel costs by gender (NBB, market map) give an approximate public entity route. From 2027 (2026 pay year), per employer: W = 1 - pay.all.gap.annual.mean and E = the mean of headcount.quartile.share.annual.women (PTD Art. 9(1)(a) and (f)), approximate in Italy, whose pay level leaves out non-structural pay. Spain: W from EINF mean annual pay by sex (company-defined pay). Not computable where S1-16 is declared not material (8 of 103) or only adjusted or partial gaps are given (13). W outside 30-130% is not comparable.
- **US:** No US instrument gives S, pay totals or an all-staff mean gap by gender in public. Route 3, approximate: E from headcount.all.share.women (10-K, voluntary) with W = 1 - pay.all.gap.hourly.mean (WEF SCM, full-time relevant employees) or 1 - pay.all.gap.annual.mean (GRI 405-2-a, per category), on the group; rare, since most US companies publish adjusted ratios instead. Statutory but confidential routes the company already files: Route 2 from the Illinois EPRC wage list (Illinois staff) and Route 3 from California mean hourly rates and headcounts (California staff), both subsets. Never exact: no mean on total pay over all US or group staff exists.

**Employment parity:**
- **India:** E = headcount.permanent.count.women / (women + men), from BRSR A-20(a) permanent employees plus permanent workers at FY end (Nivel's base, because contract wages are mostly outside the wage totals). All-staff E (headcount.all.share.women) is also exact from A-20(a), but includes contractor-supplied workers. No average or FTE headcount is filed; an opening and closing average needs two filings.
- **UK:** Group: exact from s.414C(8)(c)(iii) year-end counts by sex, UK-incorporated quoted companies only. UK arm (Nivel's base): the mean of the four hourly quartile shares, exact for each employer's full-pay relevant employees, approximate across a multi-employer group (size-band weights) and for all staff. No average or FTE headcount by sex, so route 3 pairs the quartile E with the hourly W on the same staff.
- **Australia:** headcount.all.share.women from WGEA (women over women and men, headcount on the snapshot date, all Australian employees), or from GEI 1 counts back to 2014-15. A snapshot, not a period average; excludes non-binary staff, contractors and agency workers.
- **Japan:** headcount.regular.share.women (Nivel's Japan base) comes from the optional WAA workforce item (Art 19(1)(iii)ハ), regular-staff row: a subset of staff. An all-workers row is rare and can include dispatched workers. Counts by gender exist only in voluntary GRI 2-7 data, usually group-wide. No average or FTE headcount by gender, so the E that would make route 3 exact is never published.
- **EU:** E = headcount.all.count.women / (headcount.all.count.women + headcount.all.count.men) from ESRS S1-6 §50(a), group, with headcount.all.count.other left out; method.headcount-basis (§50(d)) says year end or average. India's permanent-staff base comes from §50(b) permanent counts (head count or FTE as disclosed). Entity level: Germany's § 21 average headcount by sex every 3 or 5 years; from 2027 the mean of each employer's PTD quartile shares.
- **US:** E = headcount.all.count.women / (women + men) from the EEO-1 consolidated report: US payroll staff in one Q4 pay period, binary sex. Exact for the national arm but confidential, public only where the company publishes its EEO-1 (falling; 2024 is likely the last data year). Otherwise public only as a voluntary 10-K share (headcount.all.share.women, registrant-defined, approximate) or GRI 2-7 group counts. No permanent or regular base exists.

**Wage parity:**
- **India:** Derived: W = (S / (1 - S)) x ((1 - E) / E) with S = pay.all.share.annual.women and E = permanent share. Approximate because wages are paid over the year to a payroll whose coverage of other-than-permanent staff varies, while E is a year-end permanent headcount. Where S is missing, an estimate from P5 EI-3(a) category medians and headcount is badged estimated. W outside 30-130% is not comparable.
- **UK:** W = 1 - pay.all.gap.hourly.mean per legal employer: hourly mean, ordinary pay plus pro-rated bonus, full-pay relevant employees; check the 30 to 130% range. No annual or FTE gap and no pay levels by sex. The median gap (Reg 2(1)(b)) is not W. A group W only from voluntary sources (GRI 405-2 ratios, Bloomberg Q29f), approximate.
- **Australia:** W = 1 - pay.all.gap.fte.mean on annualised FTE total remuneration, from 2023-24. Median gaps (from 2022-23) are not W. Flag W outside 30-130% as not comparable.
- **Japan:** Japan publishes W itself: women's mean annual total pay (salary, allowances, bonuses) as a % of men's, all workers of the legal entity, total wages over average monthly headcount (WAA Art 19(1)(i), repeated in the securities report). W = value / 100. It turns approximate where an employer converts part-timers to FTE or excludes allowances (stated, see method.headcount-basis and method.pay-basis). Mandatory regular and non-regular ratios give subset W, approximate. Apply the 30-130% rule; the pipeline's 20-150% filter is wider.
- **EU:** W = 1 - pay.all.gap.hourly.mean (ESRS S1-16 §97(a)): an hourly mean, group-wide, on company-chosen pay elements. An annual W = 1 - pay.all.gap.annual.mean comes per employer from the PTD (Art. 9(1)(a), total pay, all workers) from 2027, approximate as transposed in Italy (fixed elements only). Spain's EINF means by sex give a group annual W on company-defined pay. Not W: France's Index gap (adjusted), ESRS AR 33 adjusted gaps and the PTD median gaps.
- **US:** W = 1 - pay.all.gap.hourly.mean (WEF SCM, voluntary, full-time relevant employees) or 1 - pay.all.gap.annual.mean (GRI 405-2-a, per category and location, average type unset). Confidential statutory routes: women's over men's California mean hourly rate (W-2 over hours, California staff) or mean annual wages from the Illinois EPRC list (Illinois staff). The usual US figure, an adjusted pay equity ratio (pay.all.gap-adjusted.total), and unadjusted median gaps are not W. Check W against 30-130%.

## Every measure

| Measure | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|
| Women's share of pay | Exact | Approx. | Approx. | Approx. | Approx. | Approx. |
| Employment parity | Exact | Exact | Exact | Approx. | Exact | Exact |
| Wage parity | Approx. | Approx. | Approx. | Exact | Approx. | Approx. |
| Payroll weight | Exact | No | Approx. | Approx. | Approx. | Approx. |
| Gap to parity and its split | Exact | No | Approx. | Approx. | Approx. | Approx. |
| Women on the board | Exact | Exact | Exact | Approx. | Exact | Exact |
| Board roles held by women | Approx. | Approx. | Approx. | Approx. | Approx. | Approx. |
| Women in executive management | Approx. | Exact | Approx. | Approx. | Approx. | Approx. |
| Women in management by level | Approx. | Approx. | Exact | Exact | Approx. | Exact |
| Leadership pipeline | Approx. | Approx. | Approx. | Approx. | Approx. | Approx. |
| Women by pay quartile | No | Exact | Exact | No | Approx. | Approx. |
| Median pay gap | Approx. | Exact | Exact | No | Approx. | Approx. |
| Base pay gap | Approx. | Approx. | Exact | Approx. | Approx. | Approx. |
| Bonus gap and bonus receipt | No | Exact | No | No | Approx. | No |
| Gaps within categories and adjusted gaps | Approx. | Approx. | Approx. | Approx. | Approx. | Approx. |
| Contract type: pay gaps and concentration | Approx. | Approx. | Approx. | Exact | Approx. | Approx. |
| Pay at the top | Exact | No | Approx. | No | Approx. | Approx. |
| Hires | Approx. | Exact | Exact | Exact | Approx. | Approx. |
| Leavers and turnover | Exact | Exact | Approx. | Exact | Approx. | Approx. |
| Promotions and raises | Approx. | Approx. | Exact | Approx. | Approx. | Approx. |
| Parental leave | Exact | Exact | Approx. | Exact | Approx. | Exact |
| Harassment and discrimination complaints | Exact | No | No | Approx. | Approx. | Approx. |
| Training and reviews | Exact | Exact | Exact | Exact | Approx. | Exact |
| Minimum and living wage | Exact | Approx. | Approx. | Approx. | Approx. | Approx. |
| Benefits, unions and disability | Exact | No | No | No | Approx. | No |
| Tenure and long-run retention | No | No | No | Exact | No | Approx. |
| Targets and outcomes | Approx. | Approx. | Approx. | Approx. | Approx. | Approx. |
| Policies and action plans | Approx. | Approx. | Exact | Approx. | Approx. | Approx. |
| Assurance | Exact | Approx. | Approx. | Approx. | Exact | Approx. |
| Disclosure basis | Approx. | Exact | Exact | Approx. | Approx. | Approx. |
| Group and national reconciliation | Approx. | Approx. | Approx. | Approx. | Approx. | Approx. |
| National benchmarks | Exact | Exact | Exact | Exact | Exact | Exact |
| Other comparisons | No | Approx. | Approx. | No | Approx. | Approx. |

Each measure's definition, formula in data point ids and data points are in `catalogue.measures` of the JSON; each market's working is in `grades`.

## Data points

**Key:** A disclosed under a statutory or listing rule; V disclosed only under a voluntary framework or comply-or-explain; C computable exactly from disclosed data points; c computable approximately; · not available. The letter after it is the scope (decision 4): e the legal entity that files, n the national arm (all of a group's filers in that country), g the consolidated group.

### Pay (85)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Women's share of gross annual pay | `pay.all.share.annual.women` | A e | c e | c n | c e | c g | c g |
| Total annual pay paid to women | `pay.all.total.annual.women` | V e | · | c n | c e | A e | c e |
| Total annual pay paid to men | `pay.all.total.annual.men` | C e | · | c n | c e | A e | c e |
| Total annual pay bill | `pay.all.total.annual.total` | V e | · | c n | c e | A g | c g |
| Women's mean hourly pay | `pay.all.mean.hourly.women` | · | · | · | · | c e | c e |
| Men's mean hourly pay | `pay.all.mean.hourly.men` | · | · | · | · | c e | c e |
| Women's median hourly pay | `pay.all.median.hourly.women` | · | · | · | · | · | A e |
| Men's median hourly pay | `pay.all.median.hourly.men` | · | · | · | · | · | A e |
| Women's mean annual pay | `pay.all.mean.annual.women` | c e | · | · | c e | A g | c e |
| Men's mean annual pay | `pay.all.mean.annual.men` | c e | · | · | c e | A g | c e |
| Women's median annual pay | `pay.all.median.annual.women` | · | · | · | · | A e | c e |
| Men's median annual pay | `pay.all.median.annual.men` | · | · | · | · | A e | c e |
| Women's mean full-time-equivalent pay | `pay.all.mean.fte.women` | · | · | c n | · | c e | c e |
| Men's mean full-time-equivalent pay | `pay.all.mean.fte.men` | · | · | c n | · | c e | c e |
| Women's median full-time-equivalent pay | `pay.all.median.fte.women` | · | · | · | · | · | c e |
| Men's median full-time-equivalent pay | `pay.all.median.fte.men` | · | · | · | · | · | c e |
| Women's mean annual base salary | `pay.all.mean.annual-base.women` | · | · | · | · | A e | · |
| Men's mean annual base salary | `pay.all.mean.annual-base.men` | · | · | · | · | A e | · |
| Women's mean full-time-equivalent base salary | `pay.all.mean.fte-base.women` | · | · | · | · | · | · |
| Men's mean full-time-equivalent base salary | `pay.all.mean.fte-base.men` | · | · | · | · | · | · |
| Women's median full-time-equivalent base salary | `pay.all.median.fte-base.women` | · | · | · | · | · | · |
| Men's median full-time-equivalent base salary | `pay.all.median.fte-base.men` | · | · | · | · | · | · |
| Average annual pay, all staff | `pay.all.mean.annual.total` | c e | · | · | A e | c g | c e |
| Average full-time-equivalent pay, all staff | `pay.all.mean.fte.total` | · | · | A n | · | · | c e |
| Mean hourly pay gap | `pay.all.gap.hourly.mean` | · | A e | · | · | A g | V g |
| Median hourly pay gap | `pay.all.gap.hourly.median` | · | A e | · | · | A e | c e |
| Mean annual pay gap | `pay.all.gap.annual.mean` | c e | V g | A | A e | A e | V g |
| Median annual pay gap | `pay.all.gap.annual.median` | · | · | · | · | A e | c e |
| Mean full-time-equivalent pay gap | `pay.all.gap.fte.mean` | · | · | A n | · | · | c e |
| Median full-time-equivalent pay gap | `pay.all.gap.fte.median` | · | · | A n | · | · | c e |
| Mean full-time-equivalent base salary gap | `pay.all.gap.fte-base.mean` | · | · | A n | · | · | · |
| Median full-time-equivalent base salary gap | `pay.all.gap.fte-base.median` | · | · | A n | · | · | · |
| Mean base salary gap | `pay.all.gap.annual-base.mean` | V g | V g | V g | V g | A e | V g |
| Mean basic hourly pay gap | `pay.all.gap.hourly-base.mean` | · | · | · | · | · | · |
| Median basic hourly pay gap | `pay.all.gap.hourly-base.median` | · | · | · | · | · | · |
| Pay gap within age and job groups (France Index) | `pay.all.gap-adjusted.fte` | · | · | · | · | A e | · |
| Adjusted pay gap or ratio (company model) | `pay.all.gap-adjusted.total` | · | V g | A | V e | V g | V g |
| Women's mean bonus, recipients | `pay.recipients.mean.bonus.women` | · | · | · | · | · | · |
| Men's mean bonus, recipients | `pay.recipients.mean.bonus.men` | · | · | · | · | · | · |
| Women's median bonus, recipients | `pay.recipients.median.bonus.women` | · | · | · | · | · | · |
| Men's median bonus, recipients | `pay.recipients.median.bonus.men` | · | · | · | · | · | · |
| Mean bonus gap | `pay.recipients.gap.bonus.mean` | · | A e | · | · | A e | · |
| Median bonus gap | `pay.recipients.gap.bonus.median` | · | A e | · | · | A e | · |
| Mean variable pay gap per worker | `pay.all.gap.bonus.mean` | · | C e | · | · | A e | · |
| Median variable pay gap per worker | `pay.all.gap.bonus.median` | · | · | · | · | A e | · |
| Share of women receiving a bonus | `pay.all.rate.bonus.women` | · | A e | · | · | A e | · |
| Share of men receiving a bonus | `pay.all.rate.bonus.men` | · | A e | · | · | A e | · |
| Share of women receiving benefits in kind | `pay.all.rate.benefits-in-kind.women` | · | · | · | · | A e | · |
| Share of men receiving benefits in kind | `pay.all.rate.benefits-in-kind.men` | · | · | · | · | A e | · |
| Mean annual pay gap, regular staff | `pay.regular.gap.annual.mean` | · | · | · | A e | · | · |
| Mean annual pay gap, non-regular staff | `pay.nonregular.gap.annual.mean` | · | · | · | A e | · | · |
| Mean hourly pay gap, part-time staff | `pay.parttime.gap.hourly.mean` | · | · | · | · | A e | · |
| Median hourly pay gap, part-time staff | `pay.parttime.gap.hourly.median` | · | · | · | · | A e | · |
| Mean hourly pay gap, temporary staff | `pay.temporary.gap.hourly.mean` | · | · | · | · | A e | · |
| Median hourly pay gap, temporary staff | `pay.temporary.gap.hourly.median` | · | · | · | · | A e | · |
| Mean pay gap among managers | `pay.managers.gap.fte.mean` | · | · | · | · | c g | c e |
| Median pay gap among managers | `pay.managers.gap.fte.median` | · | · | · | · | · | c e |
| Mean pay gap among non-managers | `pay.nonmanagers.gap.fte.mean` | · | · | · | · | c g | c e |
| Median pay gap among non-managers | `pay.nonmanagers.gap.fte.median` | · | · | · | · | · | c e |
| Starting pay gap | `pay.new-hires.gap.annual.mean` | · | · | · | · | A e | · |
| Women directors' median remuneration | `pay.board.median.remuneration.women` | A e | · | c g | · | · | c g |
| Men directors' median remuneration | `pay.board.median.remuneration.men` | A e | · | c g | · | · | c g |
| Women KMP's median remuneration | `pay.kmp.median.remuneration.women` | A e | · | c g | · | · | c g |
| Men KMP's median remuneration | `pay.kmp.median.remuneration.men` | A e | · | c g | · | · | c g |
| Women directors' average remuneration | `pay.board.mean.remuneration.women` | c e | · | c g | · | A g | c g |
| Men directors' average remuneration | `pay.board.mean.remuneration.men` | c e | · | c g | · | A g | c g |
| Women executives' average remuneration | `pay.executives.mean.remuneration.women` | c e | · | c g | · | A g | c g |
| Men executives' average remuneration | `pay.executives.mean.remuneration.men` | c e | · | c g | · | A g | c g |
| Total disclosed pay of women key executives | `pay.kmp.total.remuneration.women` | c e | · | c g | · | · | c g |
| Total disclosed pay of men key executives | `pay.kmp.total.remuneration.men` | c e | · | c g | · | · | c g |
| Average pay in each pay quartile | `pay.quartile.mean.fte.total` | · | · | A n | · | · | · |
| Highest pay to median pay ratio | `pay.all.ratio.highest-to-median` | V g | V g | V g | V g | A g | V g |
| CEO pay ratio | `pay.ceo.ratio.ceo-to-median` | A e | A n | · | V g | c g | A g |
| Women's entry-level wage over minimum wage | `pay.entry-level.ratio.minimum-wage.women` | V g | V g | V g | V g | V g | V g |
| Men's entry-level wage over minimum wage | `pay.entry-level.ratio.minimum-wage.men` | V g | V g | V g | V g | V g | V g |
| National mean hourly earnings, women | `pay.economy.mean.hourly.women` | V | V | V | V | V | V |
| National mean hourly earnings, men | `pay.economy.mean.hourly.men` | V | V | V | V | V | V |
| National mean hourly pay gap | `pay.economy.gap.hourly.mean` | C | V | V | V | V | V |
| National median hourly pay gap | `pay.economy.gap.hourly.median` | V | V | V | V | V | V |
| National mean monthly pay gap | `pay.economy.gap.monthly.mean` | V | V | V | V | V | V |
| National median monthly pay gap | `pay.economy.gap.monthly.median` | V | V | V | V | V | V |
| National factor-weighted pay gap | `pay.economy.gap-factor-weighted.hourly.mean` | V | V | V | V | V | V |
| OECD gender wage gap | `pay.economy.gap.fulltime.median` | · | V | V | V | V | V |
| Ethnicity pay gap (UK, proposed) | `pay.all.gap-ethnicity.hourly.mean` | · | V n | A | · | V g | V g |
| Disability pay gap (UK, proposed) | `pay.all.gap-disability.hourly.mean` | · | · | · | · | · | · |

### Headcount (72)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Women's share of each hourly pay quartile | `headcount.quartile.share.hourly.women` | · | A e | · | · | A e | V g |
| Men's share of each hourly pay quartile | `headcount.quartile.share.hourly.men` | · | A e | · | · | A e | c g |
| Women's share of each FTE pay quartile | `headcount.quartile.share.fte.women` | · | · | A n | · | · | · |
| Men's share of each FTE pay quartile | `headcount.quartile.share.fte.men` | · | · | A n | · | · | · |
| Women's share of each annual pay quartile | `headcount.quartile.share.annual.women` | · | V g | A | · | A e | c e |
| Men's share of each annual pay quartile | `headcount.quartile.share.annual.men` | · | c g | c | · | A e | c e |
| Women paid the minimum wage | `headcount.at-minimum-wage.count.women` | A e | · | · | · | · | · |
| Men paid the minimum wage | `headcount.at-minimum-wage.count.men` | A e | · | · | · | · | · |
| Share of staff paid the minimum wage | `headcount.at-minimum-wage.share.total` | C e | · | · | · | · | · |
| Share of women paid a living wage | `headcount.at-or-above-living-wage.share.women` | · | · | · | · | · | · |
| Share of men paid a living wage | `headcount.at-or-above-living-wage.share.men` | · | · | · | · | · | · |
| Women in each pay band | `headcount.pay-band.count.women` | · | · | · | · | · | A e |
| Men in each pay band | `headcount.pay-band.count.men` | · | · | · | · | · | A e |
| Women employees | `headcount.all.count.women` | A e | A g | A e | V g | A g | A n |
| Men employees | `headcount.all.count.men` | A e | A g | A e | V g | A g | A n |
| Employees of another or unreported gender | `headcount.all.count.other` | V e | V g | V g | · | A g | V g |
| Total employees | `headcount.all.count.total` | A e | C g | A n | A e | A g | A g |
| Employer size band | `headcount.all.size-band.total` | C e | A e | A n | V e | C g | C g |
| Women's share of employees | `headcount.all.share.women` | C e | C g | A n | V e | C g | V g |
| Average number of women employees | `headcount.all.average.women` | c e | · | · | · | A e | V g |
| Average number of men employees | `headcount.all.average.men` | c e | · | · | · | A e | V g |
| Women employees, full-time equivalent | `headcount.all.fte.women` | · | · | · | · | A e | V g |
| Men employees, full-time equivalent | `headcount.all.fte.men` | · | · | · | · | A e | V g |
| Group employees in one country | `headcount.national.count.total` | V g | V g | V g | V g | A g | V g |
| Women permanent employees | `headcount.permanent.count.women` | A e | V g | A e | V g | A g | V g |
| Men permanent employees | `headcount.permanent.count.men` | A e | V g | A e | V g | A g | V g |
| Women's share of permanent staff | `headcount.permanent.share.women` | C e | C g | C e | C g | c g | c g |
| Women temporary employees | `headcount.temporary.count.women` | V g | V g | A e | V g | A g | V g |
| Men temporary employees | `headcount.temporary.count.men` | V g | V g | A e | V g | A g | V g |
| Women other than permanent (India) | `headcount.nonpermanent.count.women` | A e | c | c e | · | c g | c g |
| Men other than permanent (India) | `headcount.nonpermanent.count.men` | A e | c | c e | · | c g | c g |
| Women on non-guaranteed hours | `headcount.nonguaranteed.count.women` | V g | V g | V g | V g | A g | V g |
| Men on non-guaranteed hours | `headcount.nonguaranteed.count.men` | V g | V g | V g | V g | A g | V g |
| Women regular staff (Japan) | `headcount.regular.count.women` | · | · | · | c e | · | · |
| Men regular staff (Japan) | `headcount.regular.count.men` | · | · | · | c e | · | · |
| Women's share of regular staff (Japan) | `headcount.regular.share.women` | · | · | · | V e | · | · |
| Women non-regular staff (Japan) | `headcount.nonregular.count.women` | · | · | · | · | · | · |
| Men non-regular staff (Japan) | `headcount.nonregular.count.men` | · | · | · | · | · | · |
| Women's share of non-regular staff (Japan) | `headcount.nonregular.share.women` | · | · | · | V e | · | · |
| Women full-time employees | `headcount.fulltime.count.women` | V g | V g | A e | V g | A e | A e |
| Men full-time employees | `headcount.fulltime.count.men` | V g | V g | A e | V g | A e | A e |
| Women part-time employees | `headcount.parttime.count.women` | V g | V g | A e | V g | A e | A e |
| Men part-time employees | `headcount.parttime.count.men` | V g | V g | A e | V g | A e | A e |
| Women casual employees | `headcount.casual.count.women` | · | · | A e | · | · | A e |
| Men casual employees | `headcount.casual.count.men` | · | · | A e | · | · | A e |
| Women employees with disabilities | `headcount.disabled.count.women` | A e | · | · | · | c g | · |
| Men employees with disabilities | `headcount.disabled.count.men` | A e | · | · | · | c g | · |
| Union membership rate, women | `headcount.permanent.rate.union.women` | A e | · | · | · | · | · |
| Union membership rate, men | `headcount.permanent.rate.union.men` | A e | · | · | · | · | · |
| CEO is a woman | `headcount.ceo.count.women` | · | · | A e | · | · | c g |
| Women key management personnel | `headcount.kmp.count.women` | A e | · | A e | · | · | c g |
| Men key management personnel | `headcount.kmp.count.men` | A e | · | A e | · | · | c g |
| Women's share of key management personnel | `headcount.kmp.share.women` | A e | · | C e | · | · | c g |
| Women in executive management | `headcount.executives.count.women` | · | A g | c e | · | · | c g |
| Men in executive management | `headcount.executives.count.men` | · | A g | c e | · | · | c g |
| Women's share of executive management | `headcount.executives.share.women` | V g | A g | V g | V g | A e | V g |
| Women in top management | `headcount.topmgmt.count.women` | · | V g | c e | · | A g | A n |
| Men in top management | `headcount.topmgmt.count.men` | · | V g | c e | · | A g | A n |
| Women's share of top management | `headcount.topmgmt.share.women` | · | V g | c e | · | A g | c n |
| Women senior managers | `headcount.senior-managers.count.women` | · | A g | A e | · | · | A n |
| Men senior managers | `headcount.senior-managers.count.men` | · | A g | A e | · | · | A n |
| Women's share of senior management | `headcount.senior-managers.share.women` | V g | C g | C e | V g | A e | V g |
| Women managers | `headcount.managers.count.women` | · | · | A e | V e | A g | C n |
| Men managers | `headcount.managers.count.men` | · | · | A e | C e | A g | C n |
| Women's share of managers | `headcount.managers.share.women` | V g | V g | C e | A e | c g | V g |
| Women's share of supervisors (Japan) | `headcount.supervisors.share.women` | · | · | · | V e | · | · |
| Women non-managers | `headcount.nonmanagers.count.women` | · | · | A e | c e | c g | C n |
| Men non-managers | `headcount.nonmanagers.count.men` | · | · | A e | c e | c g | C n |
| Women's share of non-managers | `headcount.nonmanagers.share.women` | V g | V g | C e | c e | c g | C n |
| Women among the ten highest paid | `headcount.top10-earners.count.women` | · | · | · | · | A e | · |
| National share of women in management | `headcount.economy-managers.share.women` | V | V | V | V | V | V |
| National share of women in senior and middle management | `headcount.economy-senior-middle-managers.share.women` | V | V | V | V | V | V |

### Board and leadership seats (20)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Women on the board | `seats.board.count.women` | A e | A g | A e | V e | A g | A g |
| Men on the board | `seats.board.count.men` | A e | A g | A e | V e | A g | c g |
| Directors of another or unstated gender | `seats.board.count.other` | c e | A g | · | · | C g | A g |
| Board size | `seats.board.count.total` | A e | C g | C e | A e | A g | A g |
| Women's share of board seats | `seats.board.share.women` | A e | A g | V g | V e | A g | V g |
| Ratio of women to men on the board | `seats.board.ratio.women-to-men` | C e | C g | C e | C e | A g | c g |
| Women non-executive directors | `seats.board-nonexec.count.women` | · | · | c g | · | A g | c g |
| Men non-executive directors | `seats.board-nonexec.count.men` | · | · | c g | · | A g | c g |
| Women's share of non-executive seats | `seats.board-nonexec.share.women` | · | · | c g | · | A g | c g |
| Women executive directors | `seats.board-exec.count.women` | · | · | c g | · | A g | c g |
| Men executive directors | `seats.board-exec.count.men` | · | · | c g | · | A g | c g |
| Women independent directors | `seats.board-independent.count.women` | · | · | · | · | · | c g |
| Board chair is a woman | `seats.board-chair.count.women` | · | · | A e | · | · | c g |
| Senior board roles held by women | `seats.board-senior-roles.count.women` | · | A g | c g | · | · | c g |
| Women's share of board committee seats | `seats.board-committees.share.women` | V e | V g | V g | V e | V g | V g |
| Committee chairs held by women | `seats.board-committee-chairs.count.women` | · | · | · | · | · | c g |
| Women officers (Japan) | `seats.officers.count.women` | · | · | · | A e | · | · |
| Men officers (Japan) | `seats.officers.count.men` | · | · | · | A e | · | · |
| Women's share of officers (Japan) | `seats.officers.share.women` | · | · | · | A e | · | · |
| Directors from a minority ethnic background | `seats.board.count.minority-ethnic` | · | A g | · | · | V g | A g |

### Hires, leavers and promotions (40)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Women hired | `flows.all.count.hires.women` | V g | V g | A e | V g | A e | V g |
| Men hired | `flows.all.count.hires.men` | V g | V g | A e | V g | A e | V g |
| Women's share of hires | `flows.all.share.hires.women` | V g | V g | C e | V e | c e | V g |
| Hire rate, women | `flows.all.rate.hires.women` | V g | V g | C e | V g | V g | V g |
| Hire rate, men | `flows.all.rate.hires.men` | V g | V g | C e | V g | V g | V g |
| Women who left | `flows.all.count.leavers.women` | V g | V g | V g | V g | V g | V g |
| Men who left | `flows.all.count.leavers.men` | V g | V g | V g | V g | V g | V g |
| Employees who left | `flows.all.count.leavers.total` | V g | V g | V g | V g | A g | V g |
| Turnover rate, women | `flows.all.rate.leavers.women` | V g | V g | V g | V g | V g | V g |
| Turnover rate, men | `flows.all.rate.leavers.men` | V g | V g | V g | V g | V g | V g |
| Turnover rate | `flows.all.rate.leavers.total` | V g | V g | V g | V g | A g | V g |
| Turnover rate, permanent women (India) | `flows.permanent.rate.leavers.women` | A e | · | c e | · | · | · |
| Turnover rate, permanent men (India) | `flows.permanent.rate.leavers.men` | A e | · | c e | · | · | · |
| Women who resigned | `flows.all.count.resignations.women` | · | · | A e | · | · | · |
| Men who resigned | `flows.all.count.resignations.men` | · | · | A e | · | · | · |
| Resignation rate, women | `flows.all.rate.resignations.women` | · | · | C e | · | · | · |
| Resignation rate, men | `flows.all.rate.resignations.men` | · | · | C e | · | · | · |
| Women dismissed | `flows.all.count.dismissals.women` | · | · | · | · | A g | · |
| Men dismissed | `flows.all.count.dismissals.men` | · | · | · | · | A g | · |
| Women promoted | `flows.all.count.promotions.women` | · | · | A e | · | A e | · |
| Men promoted | `flows.all.count.promotions.men` | · | · | A e | · | A e | · |
| Women's share of promotions | `flows.all.share.promotions.women` | V g | V g | C e | V g | c e | V g |
| Promotion rate, women | `flows.all.rate.promotions.women` | · | · | C e | · | c e | · |
| Promotion rate, men | `flows.all.rate.promotions.men` | · | · | C e | · | c e | · |
| Women promoted into management | `flows.nonmanagers.count.promotions-to-manager.women` | · | · | A e | · | · | · |
| Men promoted into management | `flows.nonmanagers.count.promotions-to-manager.men` | · | · | A e | · | · | · |
| Women appointed to management roles | `flows.managers.count.appointments.women` | · | · | A e | · | · | · |
| Men appointed to management roles | `flows.managers.count.appointments.men` | · | · | A e | · | · | · |
| Share of women given a pay rise | `flows.all.rate.raises.women` | · | · | · | · | · | · |
| Share of men given a pay rise | `flows.all.rate.raises.men` | · | · | · | · | · | · |
| Women moved to regular or permanent contracts | `flows.all.count.conversions.women` | · | · | · | V e | · | · |
| Men moved to regular or permanent contracts | `flows.all.count.conversions.men` | · | · | · | V e | · | · |
| Women hired mid-career (Japan) | `flows.all.count.midcareer-hires.women` | · | · | · | V e | · | · |
| Men hired mid-career (Japan) | `flows.all.count.midcareer-hires.men` | · | · | · | V e | · | · |
| Women rehired (Japan) | `flows.all.count.rehires.women` | · | · | · | V e | · | · |
| Men rehired (Japan) | `flows.all.count.rehires.men` | · | · | · | V e | · | · |
| Applicants per hire, women (Japan) | `flows.all.ratio.applicants-per-hire.women` | · | · | · | V e | · | · |
| Applicants per hire, men (Japan) | `flows.all.ratio.applicants-per-hire.men` | · | · | · | V e | · | · |
| Women still employed about 10 years after hire | `flows.hire-cohort.rate.retention-10y.women` | · | · | · | V e | · | · |
| Men still employed about 10 years after hire | `flows.hire-cohort.rate.retention-10y.men` | · | · | · | V e | · | · |

### Parental and carer's leave (26)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Women entitled to parental leave | `leave.all.count.entitled.women` | V g | V g | V g | V g | V g | V g |
| Men entitled to parental leave | `leave.all.count.entitled.men` | V g | V g | V g | V g | V g | V g |
| Share of staff entitled to family leave | `leave.all.rate.entitled.total` | c g | c g | c g | C g | A g | c g |
| Women who took parental leave | `leave.all.count.taken.women` | V g | V g | A e | V g | V g | V g |
| Men who took parental leave | `leave.all.count.taken.men` | V g | V g | A e | V g | V g | V g |
| Family leave uptake, women | `leave.entitled.rate.taken.women` | C g | C g | C g | C g | A g | C g |
| Family leave uptake, men | `leave.entitled.rate.taken.men` | C g | C g | C g | C g | A g | C g |
| Childcare leave uptake, women (Japan) | `leave.new-parents.rate.childcare.women` | · | · | · | V e | · | · |
| Childcare leave uptake, men (Japan) | `leave.new-parents.rate.childcare.men` | · | · | · | A e | · | · |
| Childcare and childcare-purpose leave uptake, men (Japan) | `leave.new-parents.rate.childcare-or-purpose.men` | · | · | · | A e | · | · |
| Women who returned from parental leave | `leave.all.count.returned.women` | V g | V g | V g | V g | V g | V g |
| Men who returned from parental leave | `leave.all.count.returned.men` | V g | V g | V g | V g | V g | V g |
| Return-to-work rate, women | `leave.all.rate.return.women` | V g | V g | V g | V g | V g | V g |
| Return-to-work rate, men | `leave.all.rate.return.men` | V g | V g | V g | V g | V g | V g |
| Women still employed 12 months after return | `leave.all.count.retained-12m.women` | V g | V g | V g | V g | V g | V g |
| Men still employed 12 months after return | `leave.all.count.retained-12m.men` | V g | V g | V g | V g | V g | V g |
| Retention after parental leave, women | `leave.all.rate.retention-12m.women` | V g | V g | V g | V g | V g | V g |
| Retention after parental leave, men | `leave.all.rate.retention-12m.men` | V g | V g | V g | V g | V g | V g |
| Return-to-work rate, permanent women (India) | `leave.permanent.rate.return.women` | A e | · | · | · | · | · |
| Return-to-work rate, permanent men (India) | `leave.permanent.rate.return.men` | A e | · | · | · | · | · |
| Retention after parental leave, permanent women (India) | `leave.permanent.rate.retention-12m.women` | A e | · | · | · | · | · |
| Retention after parental leave, permanent men (India) | `leave.permanent.rate.retention-12m.men` | A e | · | · | · | · | · |
| Women who left during parental leave | `leave.all.count.left-during-leave.women` | · | · | A e | · | · | · |
| Men who left during parental leave | `leave.all.count.left-during-leave.men` | · | · | A e | · | · | · |
| Women given the catch-up raise after maternity leave | `leave.maternity-returners.rate.catch-up-raise.women` | · | · | · | · | A e | · |
| Weeks of employer-paid parental leave | `leave.policy.weeks.paid-parental` | · | · | A e | · | · | · |

### Harassment and discrimination complaints (10)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Sexual harassment complaints | `complaints.all.count.sexual-harassment` | A e | · | · | · | · | · |
| Sexual harassment complaints pending at year end | `complaints.all.count.sexual-harassment-pending` | A e | · | · | · | · | · |
| Sexual harassment cases pending over 90 days | `complaints.all.count.sexual-harassment-pending-90d` | A e | · | · | · | · | · |
| Sexual harassment complaints disposed of | `complaints.all.count.sexual-harassment-disposed` | A e | · | · | · | · | · |
| Sexual harassment complaints upheld | `complaints.all.count.sexual-harassment-upheld` | A e | · | · | · | · | · |
| Sexual harassment complaints per women employed | `complaints.women.rate.sexual-harassment` | A e | · | · | · | · | · |
| Discrimination complaints or incidents | `complaints.all.count.discrimination` | A e | V g | V g | V g | A g | V g |
| Discrimination complaints pending at year end | `complaints.all.count.discrimination-pending` | A e | · | · | V g | V g | V g |
| Discrimination incidents including harassment | `complaints.all.count.discrimination-incl-harassment` | c e | A | V g | V g | A g | V g |
| Action taken on complaints | `complaints.all.text.actions` | A e | V g | V g | V g | V g | V g |

### Training and reviews (9)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Average training hours, women | `training.all.mean.hours.women` | V g | V g | V g | V g | A g | V g |
| Average training hours, men | `training.all.mean.hours.men` | V g | V g | V g | V g | A g | V g |
| Women trained in health and safety | `training.all.rate.health-safety.women` | A e | · | · | · | · | · |
| Men trained in health and safety | `training.all.rate.health-safety.men` | A e | · | · | · | · | · |
| Women given skills training | `training.all.rate.skills.women` | A e | · | · | · | · | · |
| Men given skills training | `training.all.rate.skills.men` | A e | · | · | · | · | · |
| Performance reviews, women | `training.all.rate.reviews.women` | A e | V g | V g | V g | A g | V g |
| Performance reviews, men | `training.all.rate.reviews.men` | A e | V g | V g | V g | A g | V g |
| Anti-harassment workshops held | `training.all.count.harassment-workshops` | A e | · | · | · | · | · |

### Policies (18)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Equal pay policy | `policy.equal-pay.flag` | · | · | A e | · | · | · |
| Pay gap analysis done | `policy.pay-gap-analysis.flag` | · | C e | A e | C e | A e | A e |
| Joint pay assessment triggered | `policy.joint-pay-assessment.flag` | · | · | · | · | A e | · |
| 25% pay difference justified (Spain) | `policy.pay-justification.flag` | · | · | · | · | A e | · |
| Equality or action plan in place | `policy.equality-plan.flag` | · | V e | A e | A e | A e | · |
| Actions in the plan | `policy.action-plan.text` | · | V e | A e | A e | A e | · |
| Board diversity policy | `policy.board-diversity.text` | · | A g | V g | V e | A g | A g |
| Workforce diversity policy | `policy.diversity-inclusion.text` | · | V g | V g | A g | A g | A g |
| Flexible work policy | `policy.flexible-work.flag` | · | · | A e | V e | A g | · |
| Carer support policy | `policy.carer-support.flag` | · | · | A e | · | · | · |
| Family and domestic violence support | `policy.domestic-violence-support.flag` | · | · | A e | · | · | · |
| Harassment prevention policy and process | `policy.harassment.flag` | A e | V g | A e | · | A g | V g |
| Employee consultation on gender equality | `policy.consultation.flag` | · | · | A e | · | A e | · |
| Maternity Benefit Act compliance statement | `policy.maternity-compliance.flag` | A e | · | · | · | · | · |
| Pay range shown in job postings | `policy.pay-range-in-postings.flag` | · | · | · | · | · | A e |
| Pay records kept | `policy.pay-records.flag` | · | · | · | · | A e | A e |
| Outsourcing providers named | `policy.outsourcing-providers.list` | · | · | · | · | · | A e |
| Supporting narrative | `policy.narrative.text` | · | V e | V n | V e | A e | V g |

### Targets (18)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Target share of women on the board | `target.board.share.women` | V e | · | A e | · | A g | V g |
| Target share of women officers (Japan) | `target.officers.share.women` | · | · | · | V e | · | · |
| Target share of women executives | `target.executives.share.women` | V e | · | V g | · | A g | V g |
| Target share of women in top management | `target.topmgmt.share.women` | · | V g | · | · | A g | V g |
| Target share of women managers | `target.managers.share.women` | V e | · | V e | V e | · | V g |
| Target share of women in the workforce | `target.all.share.women` | V e | · | V g | V e | · | V g |
| Target for the under-represented gender among non-managers | `target.nonmanagers.share.women` | · | · | V e | · | · | · |
| Target for promotions into management | `target.promotions-to-manager.share.women` | · | · | V e | · | · | · |
| Target for a pay quartile | `target.quartile.share.women` | · | · | V e | · | · | · |
| Target reduction in the pay gap | `target.all.gap-reduction` | · | · | V e | V e | A e | · |
| Target reduction in managers' pay gap | `target.managers.gap-reduction.fte` | · | · | V e | · | · | · |
| Target reduction in non-managers' pay gap | `target.nonmanagers.gap-reduction.fte` | · | · | V e | · | · | · |
| Target for men's parental leave uptake | `target.parental-leave.rate.men` | · | · | V e | A e | · | · |
| Other selected targets | `target.other.list` | V e | · | A e | A g | A g | V g |
| Target outcome | `target.outcome.status` | V e | · | · | A g | A g | · |
| Board meets the gender rule | `target.board.compliance` | c e | A g | c g | c e | A g | V g |
| A woman holds a senior board role | `target.board-senior-roles.compliance` | · | A g | · | · | · | · |
| Executives meet the gender rule | `target.executives.compliance` | · | · | · | · | C e | · |

### Assurance (4)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Assurance level of gender figures | `assurance.metrics.level` | A e | V g | V g | V g | A g | V g |
| Assurance provider | `assurance.metrics.provider` | A e | V g | V g | V g | A g | V g |
| Gender figures covered by assurance | `assurance.metrics.scope` | A e | V g | V g | V g | A g | V g |
| Signed statement of accuracy | `assurance.statement.signed` | · | A e | A e | A e | A g | A e |

### Basis, scope and other (22)

| Data point | Id | India | UK | Australia | Japan | EU | US |
|---|---|---|---|---|---|---|---|
| Hours worked by women | `hours.all.total.women` | · | · | · | · | A e | A e |
| Hours worked by men | `hours.all.total.men` | · | · | · | · | A e | A e |
| Women's average length of service | `tenure.permanent.mean.years.women` | · | · | · | V e | · | c e |
| Men's average length of service | `tenure.permanent.mean.years.men` | · | · | · | V e | · | c e |
| Gap in average length of service | `tenure.permanent.gap.years` | · | · | · | V e | · | c e |
| Health insurance coverage, women | `benefits.all.rate.health-insurance.women` | A e | · | · | · | · | · |
| Health insurance coverage, men | `benefits.all.rate.health-insurance.men` | A e | · | · | · | · | · |
| Accident insurance coverage, women | `benefits.all.rate.accident-insurance.women` | A e | · | · | · | · | · |
| Accident insurance coverage, men | `benefits.all.rate.accident-insurance.men` | A e | · | · | · | · | · |
| Maternity benefit coverage, women | `benefits.all.rate.maternity.women` | A e | · | · | · | · | · |
| Maternity benefit coverage, men | `benefits.all.rate.maternity.men` | A e | · | · | · | · | · |
| Paternity benefit coverage, women | `benefits.all.rate.paternity.women` | A e | · | · | · | · | · |
| Paternity benefit coverage, men | `benefits.all.rate.paternity.men` | A e | · | · | · | · | · |
| Day-care coverage, women | `benefits.all.rate.day-care.women` | A e | · | · | · | · | · |
| Day-care coverage, men | `benefits.all.rate.day-care.men` | A e | · | · | · | · | · |
| How gender is recorded | `method.gender-basis` | A e | A g | A n | A e | A g | A n |
| Headcount method | `method.headcount-basis` | A e | V g | A n | A e | A g | A n |
| Pay method | `method.pay-basis` | A e | A e | A n | A e | A g | A e |
| Reporting scope | `method.scope` | A e | A e | A n | A e | A g | A n |
| Share of staff covered by pay data | `method.pay-coverage.share` | · | V g | A | · | V g | V g |
| France equality index score | `score.fr-index` | · | · | · | · | A e | · |
| WEPs gap analysis score | `score.weps-tool` | · | · | · | · | · | · |

## Disclosed but not yet in the catalogue

The classifiers found 125 disclosed items the catalogue lacks. Under the LCM rule each gets a data point in the next pass, classified for every market.

| Proposed id | What | Where |
|---|---|---|
| `complaints.all.amount.discrimination-fines` | Fines, penalties and compensation for discrimination incidents | EU: EU-ESRS-2023 S1-17 §103(c) (2026: S1-16 §42(c)); from the market map and the EFRAG check |
| `complaints.all.count.wages` | Wage complaints filed | India: IN-BRSR P5 EI-6 Wages, filed during the year |
| `complaints.all.count.wages-pending` | Wage complaints pending at year end | India: IN-BRSR P5 EI-6 Wages, pending resolution at the end of year |
| `complaints.all.count.workforce-channel` | Complaints filed through channels for own workers | EU: EU-ESRS-2023 S1-17 §103(b) (2026: S1-16 §42(b)); from the market map and the EFRAG check |
| `flows.all.count.internal-appointments.men` | Men appointed internally | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `flows.all.count.internal-appointments.women` | Women appointed internally | Australia: AU-WGEA-GEI-INSTR-2023 s 6 GEI 1; public dataset 'Internal appointments', by manager type |
| `flows.all.count.track-conversions.men` | Men moved to another job type or career track | Japan: JP-WAA Optional category (1) item 男女別の職種又は雇用形態の転換実績, job-type part (MHLW item 12) |
| `flows.all.count.track-conversions.women` | Women moved to another job type or career track | Japan: JP-WAA Optional category (1) item 男女別の職種又は雇用形態の転換実績, job-type part (MHLW item 12, 男女別の職種) |
| `flows.all.gap.promotions.points` | Gap in promotion rates, women against men (points) | EU: FR-INDEX Indicator 3: écart de taux de promotions, the published result (more than 250 employees) |
| `flows.all.gap.raises.points` | Gap in individual raise rates, women against men (points) | EU: FR-INDEX Indicator 2: écart de taux d'augmentations individuelles, the published result |
| `headcount.agency.share.women` | Women's share of dispatched (agency) workers under the employer's direction | Japan: JP-WAA Ordinance Art 19(1)(iii)ハ: the workforce item counts dispatched workers and is published by category |
| `headcount.all.average.total` | Average number of employees in the year | UK: UK-CA2006-S411 Companies Act 2006 s.411(1)(a) (outside the research inputs; verify) |
| `headcount.all.share.disabled` | Workforce share of disabled employees (UK, proposed) | UK: UK-ERDB-EDPG Workforce composition by disability |
| `headcount.all.share.minority-ethnic` | Workforce share from minority ethnic groups (UK, proposed) | UK: UK-ERDB-EDPG Workforce composition by ethnicity |
| `headcount.below-adequate-wage.share.total` | Share of employees paid below an adequate wage, by country | EU: EU-ESRS-2023 S1-10 §69-71 adequate wages (GRI-ESRS index check), no gender split |
| `headcount.contract-type.average.women` | Annual average of permanent, temporary and part-time contracts held by women | EU: ES-EINF Ley 11/2018: annual average of permanent, temporary and part-time contracts by sex, age and classification (market map item) |
| `headcount.disabled.share.total` | Share of employees with disabilities | EU: EU-ESRS-2023 S1-12 §79 (2026: S1-11 §32), no gender split required |
| `headcount.employees.count.men` | Men employees other than workers (India) | India: IN-BRSR A-20(a) Male No. (B): Permanent (D) and Other than permanent (E) employees |
| `headcount.employees.count.women` | Women employees other than workers (India) | India: IN-BRSR A-20(a) Female No. (C): Permanent (D) and Other than permanent (E) employees |
| `headcount.executive-officers.roster` | Named executive officers | US: US-SK-401 Item 401(b) executive officers (10-K or proxy); Item 402(a)(3) named executive officers |
| `headcount.executives-pnl.share.women` | Women's share of profit-and-loss roles on the executive committee | UK: UK-FTSE-WLR 2026 data collection (company-level publication not confirmed) |
| `headcount.executives.count.minority-ethnic` | Executives from a minority ethnic background | UK: UK-FCA-UKLR-DIV UKLR 6 Annex 1R Table 2: executive management by ethnic background |
| `headcount.executives.count.other` | Executives of another or unstated gender | UK: UK-FCA-UKLR-DIV UKLR 6 Annex 1R Table 1: executive management, other categories and 'Not specified/ prefer not to say' rows |
| `headcount.exempt.count.men` | Men in exempt roles (FLSA) | US: US-CA-GOV12999 Pay data report exemption status field, from RY2025 |
| `headcount.exempt.count.women` | Women in exempt roles (FLSA) | US: US-CA-GOV12999 Pay data report exemption status field, from RY2025 |
| `headcount.fulltime.count.total` | Full-time employees | US: US-SK-101c2ii Item 101(h)(4)(xii), smaller reporting companies: total and full-time employees |
| `headcount.heads-of-business.count.men` | Men heads of business | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `headcount.heads-of-business.count.women` | Women heads of business | Australia: AU-WGEA-GEI-INSTR-2023 s 6 GEI 1; public dataset occupation 'Heads of Business' (head of an employing ABN within a group) |
| `headcount.job-category.count.men` | Men in each EEO-1 job category | US: US-EEO1-C1 Component 1, 10 job categories; also US-CA-GOV12999 |
| `headcount.job-category.count.women` | Women in each EEO-1 job category | US: US-EEO1-C1 Component 1, 10 job categories; also US-CA-GOV12999 (23 SOC-based categories from RY2026) |
| `headcount.kmp.list` | Named key management personnel with roles | Australia: Corporations Act 2001 (Cth) Part 2M.3 (not in the research instruments; see market_maps.json) s 300A remuneration report |
| `headcount.labor-contractor.count.men` | Men hired through labor contractors | US: US-CA-GOV12999 Labor contractor employee report |
| `headcount.labor-contractor.count.women` | Women hired through labor contractors | US: US-CA-GOV12999 Labor contractor employee report |
| `headcount.national.count.men` | Group employees in one country or region, men | UK: GRI-2-2021 2-7-a: employees by gender and by region |
| `headcount.national.count.women` | Group employees in one country or region, women | UK: GRI-2-2021 2-7-a: employees by gender and by region |
| `headcount.occupation.count.men` | Men in each non-manager occupation group | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `headcount.occupation.count.women` | Women in each non-manager occupation group | Australia: AU-WGEA-GEI-INSTR-2023 s 6 GEI 1; ANZSCO major groups (OSCA from the 2027 program) |
| `headcount.occupation.segregation.text` | Occupational segregation between women and men | UK: UK-SCOT-PSED-2012 Reg 8: equal pay statement covering occupational segregation (Scottish public authorities) |
| `headcount.other-executives.count.men` | Men other executives and general managers | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `headcount.other-executives.count.women` | Women other executives and general managers | Australia: AU-WGEA-GEI-INSTR-2023 s 5 and s 6 GEI 1 manager category; public dataset occupation 'Other Executives and General Managers' |
| `headcount.other-managers.count.men` | Men other managers, below senior managers | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `headcount.other-managers.count.women` | Women other managers, below senior managers | Australia: AU-WGEA-GEI-INSTR-2023 s 6 GEI 1; public dataset occupation 'Other managers' |
| `headcount.quartile.share.hourly.disabled` | Disabled staff's share of each hourly pay quartile (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by disability: quartile composition |
| `headcount.quartile.share.hourly.minority-ethnic` | Minority ethnic share of each hourly pay quartile (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by ethnicity: quartile composition |
| `headcount.race-ethnicity.count.women` | Women employees by race or ethnicity | US: US-EEO1-C1 Component 1 sex by race/ethnicity; also US-CA-GOV12999 and US-IL-EPA-S11 |
| `headcount.supervisors.count.women` | Women supervisors (Japan) | Japan: JP-WAA Optional category (1) item at 係長級: number of women and total (MHLW item 9) |
| `headcount.technical.share.women` | Women's share of technical or professional staff | UK: SASB-HC TC-SI-330a.3 technical employees; FN-AC-330a.1 and FN-IB-330a.1 professionals |
| `headcount.temporary.average.total` | Average number of temporary staff | Japan: JP-FSA-ORD Form No. 2, employees section: annual average of temporary employees, shown in brackets beside the employee count |
| `headcount.workers.count.men` | Men workers (India, IR Code s.2(zr)) | India: IN-BRSR A-20(a) Male No. (B): Permanent (F) and Other than permanent (G) workers |
| `headcount.workers.count.women` | Women workers (India, IR Code s.2(zr)) | India: IN-BRSR A-20(a) Female No. (C): Permanent (F) and Other than permanent (G) workers |
| `hours.all.mean.overtime-monthly.total` | Average monthly overtime per worker | Japan: JP-WAA Optional category (2) items: average monthly overtime, overall and by employment-management category (MHLW items 6 and 7) |
| `leave.all.count.taken-primary.men` | Men who took primary carer's leave | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `leave.all.count.taken-primary.women` | Women who took primary carer's leave | Australia: AU-WGEA-GEI-INSTR-2023 s 9 GEI 4; public dataset 'Primary carers leave' |
| `leave.all.count.taken-secondary.men` | Men who took secondary carer's leave | Australia: AU-WGEA-GEI-INSTR-2023 As above |
| `leave.all.count.taken-secondary.women` | Women who took secondary carer's leave | Australia: AU-WGEA-GEI-INSTR-2023 s 9 GEI 4; public dataset 'Secondary carers leave' |
| `leave.all.rate.annual-leave-taken.total` | Annual paid leave uptake | Japan: JP-WAA Optional category (2) items: annual paid leave uptake, overall and by category (MHLW item 8) |
| `leave.policy.weeks.paid-parental-secondary` | Weeks of employer-paid leave for secondary carers | Australia: AU-WGEA-GEI-INSTR-2023 Questionnaire Q4.1.3d (lowest and highest entitlement) |
| `method.executive-definition` | How the company defines senior executive | Australia: AU-ASX-CGPR-4 Rec 1.5(c)(3)(A): including how the entity has defined senior executive |
| `method.filing-date` | Filing date and late-filing flag | UK: UK-GPG-2017 Gender pay gap service fields DueDate, DateSubmitted and SubmittedAfterTheDeadline |
| `method.industry-code` | Industry codes of the filing entity | UK: UK-GPG-2017 Gender pay gap service field SicCodes |
| `method.leave-basis` | Which men's childcare-leave rate is published | Japan: JP-CCLA Ordinance Art 71-6: the employer states whether it publishes option (i) or option (ii) |
| `method.nondeclaration.share` | Share of employees not stating their ethnicity or disability (UK, proposed) | UK: UK-ERDB-EDPG Non-declaration rate |
| `method.registry-number` | Registry number of the filing entity (Companies House number and service EmployerId) | UK: UK-GPG-2017 Gender pay gap service fields CompanyNumber and EmployerId |
| `pay.all.gap-disability.hourly.median` | Median disability pay gap (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by disability: median hourly gap |
| `pay.all.gap-ethnicity.hourly.median` | Median ethnicity pay gap (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by ethnicity: median hourly gap |
| `pay.all.mean-change.annual.total` | Year-on-year change in average annual pay | Japan: JP-FSA-ORD February 2026 amendment: change in the filer's average employee pay, from FY ending March 2026 |
| `pay.all.mean.annual-supplements.men` | Men's mean salary supplements and non-salary payments, each component | EU: ES-REGISTRO RD 902/2020 art. 5 (not public) |
| `pay.all.mean.annual-supplements.women` | Women's mean salary supplements and non-salary payments, each component | EU: ES-REGISTRO RD 902/2020 art. 5: mean and median of each salary supplement and non-salary perception by sex (not public) |
| `pay.all.median.annual-base.men` | Men's median base salary | EU: ES-REGISTRO RD 902/2020 art. 5: median of base salary by sex (not public) |
| `pay.all.median.annual-base.women` | Women's median base salary | EU: ES-REGISTRO RD 902/2020 art. 5: median of base salary by sex (not public) |
| `pay.all.median.annual.total` | Median annual total compensation of all employees except the CEO | US: US-SK-402 Item 402(u) pay ratio disclosure |
| `pay.all.rate.bonus.disabled` | Share of disabled and non-disabled staff receiving a bonus (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by disability: bonus proportions |
| `pay.all.rate.bonus.minority-ethnic` | Share of each ethnic group receiving a bonus (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by ethnicity: bonus proportions |
| `pay.all.total.personnel-cost.men` | Personnel costs for men (employer cost) | EU: BE social balance sheet (market map; outside the verified research) Bilan social / sociale balans: personnel costs by gender |
| `pay.all.total.personnel-cost.women` | Personnel costs for women (employer cost) | EU: BE social balance sheet (market map; outside the verified research) Bilan social / sociale balans: personnel costs by gender, per entity, NBB register |
| `pay.board.individual.remuneration` | Each director's total remuneration, by name | EU: EU-SRD2 (outside the verified research) Shareholder Rights Directive (EU) 2017/828 Art. 9b remuneration report; with the board list it gives directors' pay by sex |
| `pay.category.gap.annual.mean` | Mean annual pay gap within an employment-management category | Japan: JP-WAA Ordinance Art 19(2) and the MHLW notice: pay ratio by employment-management category beyond regular and non-regular (MHLW item 14, categories 4 to 8) |
| `pay.category.ratio.women-to-men` | Women-to-men ratio of basic salary and of remuneration, by employee category and location | EU: GRI-405-2016 405-2-a (voluntary; mean or median and time unit not fixed) |
| `pay.ceo.ratio.ceo-to-p25` | CEO pay ratio to the 25th percentile UK employee | UK: UK-CMRR-2018 SI 2018/860 CEO pay ratio, 25th percentile (from the UK market map) |
| `pay.ceo.ratio.ceo-to-p75` | CEO pay ratio to the 75th percentile UK employee | UK: UK-CMRR-2018 SI 2018/860 CEO pay ratio, 75th percentile |
| `pay.comparator-group.median.monthly-fte` | Median monthly FTE pay of the other sex's comparator group, given to one employee on request | EU: DE-ENTGTRANSPG § 11(3) Vergleichsentgelt (individual right to information; never published) |
| `pay.directors.total.remuneration.each` | Each director's total compensation | US: US-SK-402 Item 402(k) Director Compensation table |
| `pay.economy.gap.fulltime-ordinary-weekly.mean` | National gap in full-time ordinary-time weekly earnings (ABS) | Australia: ABS Average Weekly Earnings (cited in AU-WGE-ACT-2012 and AU-WGEA-GPG-PUB interop) Full-time adult average weekly ordinary-time earnings, by sex |
| `pay.employee.records.annual` | Employee list with gender, race or ethnicity, work county, start date and total annual wages | US: US-IL-EPA-S11 EPRC application employee list for the past calendar year (fields not verified by the skeptic) |
| `pay.employees.median.annual.men` | Men employees' median remuneration, excluding board and KMP (India) | India: IN-BRSR P5 EI-3(a) Employees other than BoD and KMP, Male: Number and median |
| `pay.employees.median.annual.women` | Women employees' median remuneration, excluding board and KMP (India) | India: IN-BRSR P5 EI-3(a) Employees other than BoD and KMP, Female: Number and median |
| `pay.kmp.remuneration.each` | Remuneration of each named KMP, directors included | Australia: Corporations Act 2001 (Cth) Part 2M.3 (not in the research instruments; see market_maps.json) s 300A remuneration report: each element of each KMP member's remuneration |
| `pay.national.percentiles.fte.total` | UK employees' total pay and salary at the 25th, 50th and 75th percentiles | UK: UK-CMRR-2018 SI 2018/860: total pay and salary of the percentile employees |
| `pay.neo.total.remuneration.each` | Each named executive officer's total compensation | US: US-SK-402 Item 402(c) Summary Compensation Table, total column |
| `pay.postings.range` | Pay range stated in each job posting | US: US-CA-LAB432.3 Labor Code 432.3(c)(3); also US-NY-LAB194b-NYC, US-WA-RCW49.58.110, US-CO-EPEWA-8-5-201, US-IL-EPA-S10b25, US-MA-C149-105E, US-PAYTRANS-OTHER |
| `pay.recipients.gap-disability.bonus.mean` | Mean disability bonus gap (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by disability: mean bonus gap |
| `pay.recipients.gap-disability.bonus.median` | Median disability bonus gap (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by disability: median bonus gap |
| `pay.recipients.gap-ethnicity.bonus.mean` | Mean ethnicity bonus gap (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by ethnicity: mean bonus gap |
| `pay.recipients.gap-ethnicity.bonus.median` | Median ethnicity bonus gap (UK, proposed) | UK: UK-ERDB-EDPG Same six GPG measures by ethnicity: median bonus gap |
| `pay.workers.median.annual.men` | Men workers' median wages (India) | India: IN-BRSR P5 EI-3(a) Workers, Male: Number and median |
| `pay.workers.median.annual.women` | Women workers' median wages (India) | India: IN-BRSR P5 EI-3(a) Workers, Female: Number and median |
| `policy.action-plan.signatory` | Person responsible for the equality action plan | UK: UK-ERA2025-S33 Responsible person (private and voluntary-sector employers) |
| `policy.board-gender-equality.flag` | Policy for gender equality on the governing body | Australia: AU-WGEA-GEI-INSTR-2023 s 7 GEI 2; questionnaire Q1.5e and Q1.5h |
| `policy.conversion-scheme.flag` | Scheme to move staff between job types or employment forms | Japan: JP-WAA MHLW database programme field 職種・雇用形態転換制度 (optional) |
| `policy.equal-pay-certificate.flag` | Holds an Illinois Equal Pay Registration Certificate | US: US-IL-EPA-S11 820 ILCS 112/11 certificate, renewed every two years |
| `policy.fertility-sick-leave.flag` | Leave for illness or fertility treatment | Japan: JP-WAA MHLW database programme field 病気・不妊治療休暇 (optional) |
| `policy.flexible-work-options.list` | Flexible work options offered to managers and non-managers | Australia: AU-WGEA-GEI-INSTR-2023 s 9; questionnaire Q3.2 |
| `policy.harassment-board-reporting.flag` | Sexual harassment reported to the board and executives, and how often | Australia: AU-WGEA-GEI-INSTR-2023 s 11 GEI 6; questionnaire Q5.8 and 5.8a |
| `policy.harassment-data.list` | Sexual harassment data the employer collects | Australia: AU-WGEA-GEI-INSTR-2023 s 11 GEI 6; questionnaire Q5.7 (formal and informal complaint counts, gender of complainant and accused, outcomes) |
| `policy.harassment-training.flag` | Harassment prevention training, by group trained | Australia: AU-WGEA-GEI-INSTR-2023 s 11 GEI 6; questionnaire Q5.2 and 5.2a |
| `policy.menopause-support.text` | Menopause support actions in the equality action plan | UK: UK-ERA2025-S33 At least one menopause action (GOV.UK action plan guidance, step 2) |
| `policy.paid-parental-leave.flag` | Employer-funded paid parental leave offered | Australia: AU-WGEA-GEI-INSTR-2023 Questionnaire Q4.1, with coverage and access (Q4.1.1b to 4.1.3h) |
| `policy.pay-gap-analysis.type` | Type of pay gap analysis done | Australia: AU-WGEA-GEI-INSTR-2023 s 8(1)(c); questionnaire Q2.2a (like-for-like, by level, overall, comprehensive) |
| `policy.pay-setting.text` | Policy on setting employee pay | Japan: JP-FSA-ORD February 2026 amendment: pay-setting policy in the human-capital section, from FY ending March 2026 |
| `policy.rehire-scheme.flag` | Scheme to rehire former regular staff or hire mid-career | Japan: JP-WAA MHLW database programme field 正社員再雇用・中途採用制度 (optional) |
| `policy.super-on-parental-leave.flag` | Superannuation paid during parental leave | Australia: AU-WGEA-GEI-INSTR-2023 Questionnaire Q4.2 |
| `policy.training-career.flag` | Training and career consulting schemes | Japan: JP-WAA MHLW database programme fields 教育訓練・研修制度 and キャリアコンサルティング制度 (optional) |
| `score.fr-index.indicator-points` | Points scored on each France Index indicator | EU: FR-INDEX Points for indicators 1 to 5, published with the total |
| `score.jp-eruboshi` | Eruboshi or Platinum Eruboshi certification | Japan: JP-WAA Certification for women's advancement under the Act (transitional rules in Art 9-3 from October 2026), shown in the MHLW database |
| `score.jp-kurumin` | Kurumin certification level | Japan: JP-NGA Next-Generation Act certification (Kurumin, Platinum, Plus and Tryout variants), shown in the MHLW database; no verified research record |
| `seats.board-senior-roles.count.minority-ethnic` | Senior board roles held by directors from a minority ethnic background | UK: UK-FCA-UKLR-DIV UKLR 6 Annex 1R Table 2: senior positions on the board by ethnic background |
| `seats.board.count.lgbtq` | Directors who self-identify as LGBTQ+ | US: US-IL-805-8.12 Form BCA 8.12 sexual orientation (since 2022); Nasdaq matrix rows in 2022-2024 proxies |
| `seats.board.list` | Named directors with role, independence and committee seats | Australia: Corporations Act 2001 (Cth) Part 2M.3 (not in the research instruments; see market_maps.json); AU-ASX-CGPR-4 Directors' report names each director (s 300); ASX Recs 2.1, 2.3, 4.1, 7.1 and 8.1 name independent directors and committee members (comply or explain) |
| `seats.board.roster` | Named directors with position, independence and committee roles | US: US-SK-401 Reg S-K Items 401(a), 401(e), 407(a), 407(h) and committee membership in the proxy (DEF 14A); gender only in the company's own honorifics |
| `seats.officers-company-defined.count.women` | Women officers as each employer defines them | Japan: JP-WAA Optional category (1) item 役員に占める女性の割合: number of women and total (MHLW item 11) |
| `seats.officers-company-defined.share.women` | Women's share of officers as each employer defines them | Japan: JP-WAA Optional category (1) item 役員に占める女性の割合 (MHLW item 11, with counts); often includes 執行役員 and advisers, unlike the securities-report count |
| `target.board-ethnic-minority.compliance` | Board has at least one director from a minority ethnic background | UK: UK-FCA-UKLR-DIV UKLR 6.6.6R(9)(a)(iii) |
| `target.board.explanation.text` | Reasons for missing the board targets, and board changes after the reference date | UK: UK-FCA-UKLR-DIV UKLR 6.6.6R(9) |
| `target.board.year` | Year the board gender target is to be reached | Australia: AU-WGEA-GEI-INSTR-2023 s 7 GEI 2; questionnaire Q1.5g.2 |
| `tenure.all.mean.years.total` | Average length of service, all employees | Japan: JP-FSA-ORD Form No. 2, employees section (filer): average years of service (平均勤続年数), not by gender |

## What this means for the cross-market dataset

- **S itself is disclosed only in India.** Everywhere else it follows from E and W (route 3), so its exactness is the weaker of the two.
- **Only Japan publishes W on annual total pay for all staff.** The UK and the EU (ESRS) give hourly means and Australia annualised FTE means: approximate for Nivel. The EU's Pay Transparency Directive adds an annual all-workers mean from 2027.
- **E needs care with the population:** India counts permanent staff, Japan regular staff (an optional item), the UK and Australia national staff, the EU the group's headcount.
- **Scope differs by regime:** India and Japan file per legal entity, the UK and Australia per national employer, ESRS per group. Decision 4's reconciliation (national arms summed against the group, ESRS S1-6 country rows against each nation's filings) depends on the scope letters above.
- **The US has no public statutory gender pay data:** EEO-1 and the state pay data reports are confidential, so US figures come from voluntary reports.

