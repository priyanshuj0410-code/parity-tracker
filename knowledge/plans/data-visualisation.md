---
type: plan
title: Data visualisation, case by case, in the manner of The Pudding
description: How Nivel should show its figures so they are engaging, entertaining and easy to grasp. For each of 24 cases, the traditional way, Nivel's way today, and the proposed way, with the technique it borrows, a relatable framing on a real figure, the data it needs and its honesty rules. Four signature forms give Nivel an identity. Researched on 7 October 2026 from The Pudding and other newsrooms.
status: proposed
updated: 2026-10-07
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a4efe8a8-1f01-4d4c-97a0-a553212a81c6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/9dfa4769-00da-4e9c-952b-48cdf05abf7f
---

# Data visualisation, case by case

Before the new structure is built ([information architecture v2](information-architecture.md)), every figure needs a better form. This plan proposes one per case. It follows the [design system](../design.md) (section 6, Charts): one axis, the validated palette, colour never alone, a table view for every chart, end labels, reduced motion honoured.

**How it was researched.** Three agents on 7 October 2026: one read six Pudding stories and The Pudding's own guide to making stories; one collected ten framings from the NYT, the ONS, the FT, the Fawcett Society, the US Census and Iceland's 2016 walkout; one inventoried Nivel's 24 cases from the code and the live data. The proposals and the honesty checks below were written from that research in the main session, because the usage guard stopped the proposal and critic agents. An independent critic pass is still owed (section 6).

## 1. What The Pudding does, and what Nivel borrows

| Technique | Where The Pudding does it | Nivel borrows it for |
|---|---|---|
| Guess first, then reveal | ["The Physical Traits that Define Men and Women in Literature"](https://pudding.cool/2020/07/gendered-descriptions/): ten descriptions, pick man or woman, then the charts | Recall on every figure card (C15, C16) |
| Your guess against the crowd and the truth | ["The Birthday Paradox Experiment"](https://pudding.cool/2018/04/birthday-paradox/): the average reader's guess drawn on the true curve | The three-marks line (C15, C18, C19, C23) |
| The reader's own data joins the dataset | The same story adds the reader's birthday to a live chart | Your fund or employer as a highlighted mark (C14, C20) |
| Build the total from a few real cases up to everyone | The same story: 21 visitors, then 20 trials, then everyone | Adding companies one by one until the index figure appears (C04, C13) |
| Everyday-object yardstick | ["Women's Pockets are Inferior"](https://pudding.cool/2018/08/pockets/): pick a phone, see which pockets fit it | The Hundred: ₹100 of payroll as 100 cells (C01 and throughout) |
| Answer the obvious objection in the design | The pockets story compares only 32-inch jeans, and says so | Hiring versus pay split (C02), same-sector peers (C09) |
| A median person as protagonist | ["Sizing Chaos"](https://pudding.cool/2026/02/womens-sizing): the median girl from 11 to adulthood | "Your ₹10 lakh" and "the median company" (C02, C24) |
| Familiar case first, full census second | ["Film Dialogue by Gender"](https://pudding.cool/2017/03/film-dialogue/): Disney first, then 2,000 films | Infosys first, then the Nifty 500 (C09, C23) |
| Story first, then explore | The same story: a searchable explorer after the findings | Parity map story mode, then the explorer (C12) |
| One dot per real entity | ["34,476 Comic Book Characters"](https://pudding.cool/2017/07/comics/): a swarm of 2,862 teams | Peers strip, members view (C04, C09) |
| Draw the real shape; then against now | Pockets to scale; a size 8 in 1995 against 2021 | Then-and-now hundreds (C03, C13) |
| Methods out loud | Film dialogue calls itself a census and admits its errors | The calculations tab as a flow of rupees (C07) |
| Pick the step format for the device | [Making Internet Things, part 3](https://pudding.cool/process/how-to-make-dope-shit-part-3/): scrolling story, stacked charts or tap-through | Scroll steps on desktop, stacked cards on phones (C13, C23) |

**From other newsrooms:** the NYT's "You Draw It" (commit to a guess before seeing the line), the ONS's "find the pay gap for your job" (put the reader in the data), and the FT's "89% of women work at companies with a gap" (count people, not companies). The Equal Pay Day family (the date women stop being paid, Iceland's 2:38pm walkout) is **not** borrowed: it only works for a pay gap, and Nivel's figure is not one (section 2).

## 2. Honesty rules for every form
Nivel's headline is women's share of the payroll an index fund owns. It mixes how many women there are with what they are paid. So:
1. **It is not a pay gap.** Never "women work free from November", never a date, never a clock. Never "women earn 26% of what men earn".
2. **It is not a headcount.** Never "21 of every 100 workers". A grid of people is honest only for employment parity (Infosys: 39 of 100 staff are women). A grid of rupees is honest for share of pay.
3. **The rupee framing names the payroll.** "Of every ₹100 of payroll a Nifty 50 fund owns, ₹20.85 goes to women." The existing payPhrase, "₹26 for every ₹100 paid to men", reads as a per-head comparison; keep it only with "of the wage bill" attached, and never beside the per-head figure (Infosys: ₹63 per head is wage parity, ₹41 of the wage bill is the share ratio).
4. **Say which change.** The Nifty 50 moved +0.40 pts across all companies and +0.34 pts like-for-like on 42 companies. Any mark that says "it moved" says which, and the like-for-like one is the default.
5. **Close figures are explained, not hidden.** India is 19.27% across all covered companies and 19.38% on the Nifty 500, because the weights differ. Show one, label its basis, and link the other.
6. **Rates are not shares.** PLFS participation (34.2%) is a rate of people, whose comparator is men's rate, not 50%. It never sits on the 0 to 50% share axis.
7. **Estimates are hollow, coverage is visible.** A figure built on 480 of 505 companies says so beside the mark.
8. **A projection is not a forecast.** "Parity in 2111 at this pace" is labelled with its method (the median company's change).
9. **Play money is not money.** Lumens never look like coins or notes; the Hundred's cells are payroll rupees, drawn as plain squares.

## 3. Four signature forms
These recur across the cases, the way The Pudding is known for its forms.

**The Hundred.** ₹100 of payroll as a 10 by 10 grid of ₹1 cells, filling from the left: 20.85 cells for the Nifty 50, with the last cell part-filled. A hairline at cell 50 marks parity. The same grid shows an index, a company, a sector, a country or a fund, so a reader learns it once. It is also the input for a guess (drag to fill) and the stage for a reveal (the fill moves from your guess to the truth). Honest because its unit is rupees.

**Three marks.** One horizontal line from 0 to 50 with three marks: your guess, the crowd's median, the published figure. It shows a reveal (C15), a result (C18) and a bias (C19) in one form. The crowd mark appears only after the reader commits.

**The ladder.** Companies or sectors as bars whose width is their share of the payroll and whose fill is women's share of it (a Marimekko). Width says what matters to the index figure, fill says how it does. The index figure is the line through them. HDFC Bank is wide; a two-company sector is a sliver.

**The parity clock.** A timeline from the first year of data to the year parity arrives at the current pace, with the method named and, if the reader gives a birth year, where they would be on it. Nivel's most emotional number (about 85 years for the Nifty 50's median company), out of the table and into a picture.

## 4. The cases
Each case: the traditional way (and Nivel today), the proposed way, the technique, a relatable framing on a real figure (release 20261007-153413), data, honesty and accessibility notes, effort (S, M, L) and priority (P1 to P3).

### The figure itself

**C01 Index headline.** *Traditional:* a stat tile, "20.8%", a triangle and "+0.3 pp". *Proposed:* the Hundred, 20.85 cells filled, parity hairline at 50, caption "Of every ₹100 of payroll a Nifty 50 fund owns, ₹20.85 goes to women". The change is the last cell's edge, with "+0.34 since FY25, same 42 companies". *Framing:* the ₹100 note everyone knows. *Data:* available. *Honesty:* cells are rupees, not people; the like-for-like change is the default. *Access:* the grid has a text equivalent and a table. S, P1.

**C02 Your ₹10 lakh, and the gap split.** *Traditional:* a three-row table and a stacked bar of the gap. *Proposed:* "Your ₹10 lakh" as a strip: the payroll it owns, split into paid to women and paid to men, with the parity shortfall as a dashed extension ("₹X more to women would be half"). One toggle re-splits the gap into hiring and pay. *Technique:* the median protagonist (a typical SIP), the objection answered (is it hiring or pay?). *Data:* available for India. S, P1.

**C03 Trend over years.** *Traditional:* a 2px line on a 0 to 50% axis, flat to the eye. *Proposed:* keep the honest line, and under it a staircase of like-for-like yearly changes, one small bar a year, signed, "same 42 companies", and the parity clock. *Technique:* then against now. *Honesty:* the line (all companies) and the stairs (like-for-like) disagree by design, and both are labelled. Never zoom the share axis. M, P2.

**C04 Members: who moves the number.** *Traditional:* a sortable table with meters. *Proposed:* the ladder: 50 bars, width by payroll owned, fill by women's share, sorted by width, the index figure as the line through them. A scroll step adds companies one by one until the Nifty 50 figure appears. *Technique:* build the total from real cases; one mark per entity. *Framing:* "HDFC Bank is ₹10 of your ₹100". *Data:* available (weights, payroll weights). M, P1.

**C05 Sectors within an index.** *Traditional:* bars by share, with payroll weight in small text. *Proposed:* the ladder by sector: "where the ₹100 goes". IT is 37 cells wide and 25.73% filled; a two-company sector is a sliver. *Data:* available (sector payroll shares). S, P1.

**C06 Company figure.** *Traditional:* three percentages on three parity scales. *Proposed:* lead with the Hundred (Infosys: ₹29.15 of every ₹100 of its wage bill). Then its two parts with their own marks: a people grid for staff (39 of 100 are women, parity 50) and a per-head dumbbell (women earn ₹63 for every ₹100 a man earns, parity ₹100). Three units, three marks, never one label. *Honesty:* rule 3. M, P1.

**C07 From the filing to the figure.** *Traditional:* algebra cards. *Proposed:* a flow of rupees: the filing's total wage bill splits into women's and men's, and the share falls out; the second step splits the gap. *Technique:* methods out loud. S, P2.

**C08 Company trend.** *Traditional:* three lines, the board line dominating. *Proposed:* small multiples, one per measure on its own scale with its own parity line; board seats as a dot strip, not a line. S, P2.

**C09 Peers.** *Traditional:* a ranked table. *Proposed:* a strip of dots on 0 to 50, one per peer, the company highlighted, the median marked: "Infosys sits 3rd of 24 IT companies". *Technique:* familiar case first, one dot per entity. S, P1.

### Comparing

**C10 Countries side by side.** *Traditional:* range dots of the two component measures, with the headline only in a table. *Proposed:* five Hundreds in a row, sorted: EU 37.03, UK 36.27, Australia 33.86, India 19.27, Japan 18.94, each with its basis ("480 of 505 companies"; "equal weight" for Australia until PARITY-115) and a band for the middle half of companies. *Honesty:* rule 5. S, P1.

**C11 Sectors across markets.** *Traditional:* a measure switch, a market picker and a 55-cell grid. *Proposed:* a dot matrix: sectors as rows, five markets as columns, each cell a dot sized and filled by share with its number, hollow for fewer than three companies. Row spread shows "universal or Indian". M, P2.

**C12 The parity map.** *Traditional:* a scatter with two parity lines. *Proposed:* keep it, add iso-lines of equal share of pay so the headline is visible on the map, and a story mode that steps through the quadrants before the explorer opens. *Technique:* story first, then explore. M, P2.

**C13 Simulations.** *Traditional:* stat cards and long tables. *Proposed:* "the bar" as a scroll story on the ladder: raise the bar to the index's own average and watch two-thirds of the money fall below it; the held set re-forms. Labelled as a simulation throughout. M, P3.

**C14 Fund and portfolio footprint.** *Not built.* *Proposed:* "your money's Hundred": pick a fund, or add holdings on the device, and the Hundred fills with your footprint, the benchmark as a ghost outline, and the uncovered part greyed ("₹12 of your ₹100 is in companies with no figure"). *Technique:* the reader's data joins the dataset. *Honesty:* coverage visible; no rating or ranking (SEBI). L, P2.

### Play

**C15 Guess first.** *Traditional:* a slider starting at 50, then a text reveal. *Proposed:* the Hundred as the input, empty at the start (no anchor at parity); the reveal animates the fill from your guess to the truth; then the three marks line. *Data:* the crowd mark needs a store of guesses, not built. S, P1.

**C16 The figure card's beats.** *Traditional:* every reveal a big number, mixed units on one slider. *Proposed:* each card uses its unit's own mark: the Hundred for shares of pay (rupees, pence, cents), a people grid for shares of staff or managers, each with its own parity line. Recall fills it; Call it plants a flag at the threshold, sized by the stake; Wait shows the crowd's flag and "out Tuesday"; Result lands the truth and resolves the flags. M, P1.

**C17 The crowd's view.** *Traditional:* a number; a gauge is banned. *Proposed:* a tug strip: Yes fills to 62, No takes the rest, captioned "the crowd's view: 62 out of 100 for yes". It sits under the figure's Hundred, so the share (a grid) and the chance (a strip) are different objects. *Honesty:* the price is not a count of players. S, P1.

**C18 Saturday results.** *Not built.* *Proposed:* a result card per figure: the Hundred with the threshold flag and the truth landed, the margin in words ("34.3 against at least 34.2: yes, by a tenth"), the crowd's final strip, your call; then a form-guide row of ticks and crosses for you and the crowd across the week. *Honesty:* the margin is always shown, because results hinge on tenths. M, P2.

### Me

**C19 Stats and calibration.** *Not built.* *Proposed:* bias arrows: each past guess an arrow from your guess to the truth on the 0 to 50 line, stacked, with the summary "you guess 6 points high on India and 3 low on the UK". Forecasts as a plain tally with Lumens. No Brier scores, no grades. *Technique:* your guess against the truth, made personal. M, P2.

### Track and official statistics

**C20 Track rows.** *Not built.* *Proposed:* each row a miniature Hundred (a sparkbar), the figure and the like-for-like change; shares plot together on one axis. Official statistics rows carry a different mark, a rate strip with men's rate as the comparator tick, and never join the share axis (rule 6). S, P1.

**C21 PLFS participation.** *Not built (PARITY-112).* *Proposed:* a dumbbell a month, women's rate against men's, with rural and urban as two more dumbbells, and the monthly steps since 2025 as a small line. "34.2% of women aged 15 and over were in the labour force in October 2025, 38.4% in villages and 25.4% in cities." M, P2.

**C22 Long-dated company forecasts.** *Not built (PARITY-117).* *Proposed:* the company's Hundred with the threshold flag, and a magnifier panel showing 28 to 31 where the last figure, the threshold and the crowd sit; a countdown "out by September 2027". M, P3.

### Stories

**C23 The weekly recap.** *Not built.* *Proposed:* a fixed three-part template: the week's results as cards (C18); "what people believed", a three-marks line per figure; "what moved", like-for-like arrows. Scroll steps on desktop, stacked cards on phones. M, P2.

**C24 Pace of change.** *Traditional:* a table whose last column says "about 85". *Proposed:* the parity clock, with the method named and an optional "you would be 112". *Honesty:* rule 8. S, P1.

## 5. Build order
1. **The Hundred component** and the ladder, shared by most cases.
2. **P1:** C01, C02, C04, C05, C06, C09, C10, C15, C16, C17, C20, C24.
3. **P2:** C03, C07, C08, C11, C12, C14, C18, C19, C21, C23.
4. **P3:** C13, C22.

Each form is checked against the design system before it ships: the palette validator for any new colour use, axe at 390px and 1280px in both themes, reduced motion, and a table view. New patterns are recorded in design.md.

## 6. Still owed
- **An independent critic pass** on these proposals, once agents are allowed again (the usage guard's week resets on 11 October).
- **The Pudding research was partial:** six stories read, not eight, and The Pudding's pages were read as text, not watched. Worth a second look at two of their interactives in a browser before building the Hundred's reveal animation.
- **A data bug** found on the way: Vakrangee is filed under "IT", not "Information Technology", which makes a one-company sector row for India (PARITY-118).
