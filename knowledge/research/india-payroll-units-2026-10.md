---
type: research
title: India payrolls outside ₹1.5 lakh to ₹75 lakh a head, settled
description: The 62 stored India company-years whose payroll per permanent employee fell outside ₹1.5 lakh to ₹75 lakh, what each one is, how it is recorded in india/wage_units.json, how Nifty headlines and payroll weights move, and the follow-ups left for the owner.
updated: 2026-10-12
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/2b377e00-9ef4-4fc1-9acd-77a811cf248f
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0a029a2e-4cf0-416d-b597-5a9da58d51ef
---

# India payrolls outside ₹1.5 lakh to ₹75 lakh a head, settled (PARITY-131)

Payroll weights every Nifty index (`india_calc.set_basis_and_weights`, `index_calc`), so a payroll ten times off moves headlines. On 12 October 2026, 62 stored company-years had a payroll per permanent employee outside ₹1.5 lakh to ₹75 lakh. Method and rules: [data-pipeline.md](../playbooks/data-pipeline.md).

## What the stored records were
- **PARITY-95 and PARITY-98 never reached Firestore.** That day's dump of India matched the 5 October 10:23 release copy (`20261005-102358`) in every company and index. So `wage_units.json`'s 32 corrections, among them Bata, PI Industries, Motherson Sumi Wiring, Polycab and Schaeffler, account for 16 of the 62.
- **Most of the rest are not unit slips.** Where a year's own filing had no wage total, `extract_all.py` kept that year's median pay × headcount estimate as the payroll. It took the dq and the note ("payroll total missing") from the next filing's prior-year column (`W=p['W'] or y['W']`). Those estimates are tiny wherever the medians are monthly: GAIL, Trident, UNO Minda, BLS, Poly Medicure and Aster DM.
- **Some figures are not wages at all:** a headcount (Minda Corp), a digit too many (Lupin), a month's wages (Aster DM, Azad), and men's median times men's headcount (SBI 2021-22).

## Decisions (46, in `wage_units.json`)
Every decision was checked against the company's audited employee benefits expense on the stored boundary, and against median pay × headcount where the medians allow. Sources were the local FY2025-26 annual-report texts, the FY2024-25 exchange BRSR texts, and company websites; nothing came from NSE or BSE (PARITY-66). Each entry's `evidence` gives the figures and pages.

**Confirmed as stored (11).** These are genuinely high or low a head. Each is recorded with `unit: rupees` and `filed` equal to the stored total, so it changes nothing:

| Company-year | Why it is genuine |
|---|---|
| 360ONE 2024-25 | Wealth manager, ₹94 lakh a head; 1.28 times expense, the one year above 1.1 |
| JIOFIN 2025-26 | 75 staff, 0.96 times expense |
| JMFINANCIL 2025-26 | 252 staff; equals salaries, bonus and allowances |
| LINDEINDIA 2024-25, 2025-26 | Covers 2,419 staff, most supplied by a joint venture; ₹9.6 to 9.8 lakh a head of all staff |
| GESHIP 2023-24 to 2025-26 | Equals standalone salaries and wages; most staff are seafarers on contract |
| KPRMILL 2022-23, 2023-24 | Rupees is the only unit that fits; ₹1.0 to 1.1 lakh a head at a mill; a narrower total than later years |
| DOMS 2023-24 | 0.69 times expense; the stored headcount counts workers twice |

**No usable total (35).** `unit: null`, so the payroll goes:

| Kind | Company-years |
|---|---|
| Median estimate kept in place of a missing total | AMBER 22-23; BAJAJHLDNG 22-23 to 24-25; BLS 22-23, 23-24; GAIL 22-23, 24-25; GESHIP 21-22, 22-23; GMRAIRPORT 24-25; MOTHERSON 22-23, 23-24; POLYMED 22-23; TRIDENT 23-24; UNOMINDA 22-23, 24-25; ZENSARTECH 23-24; SBIN 21-22 |
| A month's wages printed as the total | ASTERDM 22-23 to 24-25; AZAD 23-24, 24-25; POLYMED 23-24 |
| No unit fits the filed total | ANGELONE 23-24; IFCI 22-23, 23-24; INDIAMART 23-24; LUPIN 23-24 (a digit too many); PNB 25-26; UPL 22-23 to 24-25 |
| Headcount in the wage field | MINDACORP 24-25 |

After these, rebuilding from the dump with `rebuild_records.py` leaves 11 company-years outside the band, all of them confirmed entries.

## How the indexes move
These figures compare the stored records with the rebuild that applies all 78 entries (PARITY-95's 32 plus these 46). They are the women's share of owned payroll, 2025-26, in points:

| Index | Before | After | Change |
|---|---|---|---|
| Nifty Smallcap 250 | 19.64% | 15.85% | −3.79 |
| Nifty Smallcap 100 | 21.02% | 17.62% | −3.40 |
| Nifty Consumer Durables | 14.48% | 11.79% | −2.69 |
| Nifty MidSmallcap 400 | 17.80% | 16.27% | −1.53 |
| Nifty Infrastructure | 10.51% | 11.58% | +1.07 |
| Nifty Next 50 | 18.56% | 19.37% | +0.81 |
| Nifty MNC | 13.20% | 12.94% | −0.26 |
| Nifty 500 | 19.64% | 19.39% | −0.25 |
| Nifty 100 | 20.40% | 20.60% | +0.20 |
| Nifty 200, LargeMidcap 250 | | | +0.17 |
| Nifty Midcap 150 | 16.45% | 16.52% | +0.07 |
| Nifty 50, Sensex | | | +0.06 |
| Nifty Auto | | | +0.05 |

Earlier years move by similar amounts (Consumer Durables 2022-23 −2.64, Smallcap 250 2022-23 −2.83). The 46 new decisions alone move no headline by more than 0.12 points (Nifty Midcap 150, from Aster DM). Their larger effect is on year-on-year changes, where corrected payrolls clear false basis-change flags:
- Nifty Pharma 2023-24 to 2024-25: −0.18 to −0.04 points, Lupin back in.
- Nifty Healthcare: −0.29 to −0.13.
- Nifty Consumer Durables 2024-25 to 2025-26: +3.99 to +1.53.

**Payroll weights that change** (₹ crore):
- PARITY-95's entries: Aether 287 → 46, Bata 3,824 → 382, Bosch 128 → 1,281, CESC 100 → 1,000, Firstsource 6,604 → 764, IndiGo 567 → 5,671, LG Electronics 81 → 809, Motherson Sumi Wiring 17,932 → 1,793, PI Industries 381 → 566, Polycab 10,000 → 660, Schaeffler 3,725 → 413, Signature Global 758 → 148.
- These decisions: Aster DM 68 → 529, GAIL 73 → 79, and Bajaj Holdings 247 → none.
- Free-float weights do not change.

Bajaj Holdings' every stored payroll was a median estimate, and FY2025-26 has none. It leaves the payroll-weighted Nifty 100, 200, 500, Next 50 and LargeMidcap 250, which then cover one company fewer.

## Coordination with PARITY-129
`to_records.py` (the India release from the BRSR filer build) reads `india/wage_units.json` and applies it to the dump, as `rebuild_records.apply_units` does. It dropped its own Schaeffler fix and nulls a payroll equal to the headcount. A confirmed entry gives the stored payroll and is skipped. Like `apply_units`, it changes dq and note only on years with a reported share, so SBIN 2021-22, INDIAMART 2023-24 and GESHIP 2021-22 keep their own notes. It also restores IndiaMART's FY2023-24 women's wage share to 14.9%, the figure in that year's BRSR and in the next filing's prior-year column. On a fresh dump all 78 entries apply, and the only years left out of band are the 11 confirmed ones.

## Left for the owner
1. **Store the input and load:** `pnpm data inputs push india/wage_units.json`. The PARITY-129 release then loads India with the corrections. Without it, `rebuild_records.py` on a fresh dump, then `pnpm data load IN`.
2. **98 more median estimates sit inside the band:** company-years carrying a payroll under a "payroll total missing" note. They count toward weights as reported payroll unless a build treats dq 3 as estimated. Examples: GAIL 2023-24, UNO Minda 2023-24, Zensar 2022-23, Trident 2022-23, Tech Mahindra 2023-24 and 2024-25, Persistent. Fixing `extract_all.py`'s merge stops new ones.
3. **GAIL's weight is about 25 times too small** (₹79 crore against about ₹2,000 crore of employee costs), and Bajaj Holdings (about ₹40 crore) has none. Neither files a wage total, so `wage_units.json` cannot hold a figure for them. A badged estimate from annualised medians or from expense would.
4. **DOMS's FY2023-24 permanent headcount** (16,106) counts its 7,361 workers twice; 8,745 is right. This bears on its share of women in permanent staff.
5. **Boundaries that do not match:** Motherson's and Zensar's BRSR wage totals look India-only against consolidated headcounts. UPL's FY2024-25 boundary is the India region. Kept as they are; worth a look when the filings are at hand.
