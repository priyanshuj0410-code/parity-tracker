---
type: review
title: Markets safeguarding review, October 2026 (draft)
description: Draft for the owner's sign-off. How Nivel's play-money markets keep out anyone under 18, what personal data they keep and for how long, how norm questions are moderated, how deletion works, what to do in an incident, and the open questions for counsel. Markets stay off until the owner signs it and counsel answers.
date: 2026-10-06
status: draft
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/77e2fcc4-1068-4086-a2c1-2d37bad5db68
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0d978739-fe5b-4c6a-967d-fcca1fb16b77
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/22f00c69-4996-4ab0-8301-bb28ad98052b
---

# Markets safeguarding review, October 2026

**Status: draft, not signed.** It does not pass the gate. Markets stay off (`MARKETS_ENABLED` unset) until the owner signs this review and counsel answers the Gaming Act questions ([PARITY-51][p51]).
- **Ticket:** [PARITY-49][p49].
- **Design:** [decision 0017](../decisions/0017-markets-architecture.md).
- **Backend under review:** PR #59 ([PARITY-44][p44], [markets API](../reference/markets-api.md)).
- **Templates:** [market templates](../plans/market-templates.md).
- **Law:** [Gaming Act check](gaming-act-check-2026-10.md).

Prepared by the team from public sources; not a legal opinion.

## 1. Summary
- **Markets are for adults only.** Anyone under 18 is refused outright, and nothing about them is kept.
- **Why outright:** India's DPDP Act needs a parent's verifiable consent before any child's data is processed. Nivel will not build a consent route for a play-money game.
- **Spot the Stereotype is adult content.** Only SwipeEd, a separate Equal Lens app, serves children, and it never links to markets or tokens.
- **Players write nothing others see.** The only words on a market are its question, made from a template and checked by the owner.
- **Deletion works at once, in the app,** even while markets are off.
- **Eight build changes** are needed before sign-off ([section 3](#3-the-age-gate)).

## 2. Who the markets are for
| Product | Audience | Markets or tokens |
|---|---|---|
| Nivel's markets | Adults, 18 and over | Play money only ([Gaming Act check](gaming-act-check-2026-10.md)) |
| Spot the Stereotype | Adults: game nights for urban Indians aged 20 to 35 | Its reveals may link to a figure's market (PARITY-54). No tokens inside the game |
| SwipeEd | Children and teenagers | **Never.** No link to markets, tokens or market pages |

- **Earlier pages grouped Spot with the children's apps.** This review corrects the [data-layer playbook](../playbooks/app-data-layers.md), the [play and markets plan](../plans/nivel-play-and-markets.md) and the note on counsel question 14.
- **SwipeEd keeps progress on the device** and fetches nothing from a child's device ([SwipeEd decision](https://github.com/priyanshuj0410-code/swipeed-equal-lens/blob/main/knowledge/architecture/content-and-progress.md)). A GitHub code search of its repository found no reference to Nivel on 6 October 2026.
- **Ask of the SwipeEd team:** a build gate that fails on any link to Nivel's market pages. SwipeEd's tickets live in The Equal Lens's Plane workspace, so the owner files it there.
- **No Equal Lens programme for children carries a market link,** in print, in a session or online.

## 3. The age gate
**The flow:**
1. The player signs in with Neon Auth, in Nivel's own Neon project.
2. Before any market action, the app asks for a date of birth.
   - The screen does not say what age passes, so it does not invite a false answer.
   - There is no pre-filled date.
3. The server works out the age on the IST date (`ageOn` in PR #59).
4. **18 or over:** Nivel keeps "adult: yes" and the year of birth. The full date is neither stored nor logged.
5. **Under 18:** the request is refused (`under_18`) and nothing is kept.
   - The sign-in identity is deleted at once and the player is signed out.
   - The message says: "Markets are for adults. Your sign-in has been removed." It links back to Nivel's free pages, which suit every age.
6. **Retries:** a refused person could try again with a false date. Nivel keeps nothing that would stop it, because a marker would itself be a child's data (counsel question B).

**What is kept:**

| Data | Adults | Under 18 |
|---|---|---|
| Sign-in identity (Neon Auth) | While the account exists | Deleted at once on refusal |
| Full date of birth | Never kept | Never kept |
| "Adult: yes" and year of birth | While the account exists | Nothing |
| Wallet, ledger, trades, positions | While the account exists | Never created |

**Strength:** the gate is a self-declaration. Counsel question 15 asks how strong it must be. If counsel wants more, Rule 10 of the DPDP Rules names identity records and virtual tokens such as DigiLocker as ways to verify age.

**Build changes for PARITY-44 before sign-off:**
1. **Delete the sign-in identity when the age step refuses.** PR #59 keeps nothing in its own tables, but the Neon Auth identity made at sign-in stays.
2. **`forget` deletes the sign-in identity too.** The [markets API](../reference/markets-api.md) says it is deleted in Neon Auth but not by what.
3. **Never log the age step's request body.** True in PR #59 today; keep it so.
4. **A neutral age screen,** as in step 2 of the flow.
5. **A privacy notice before sign-in** ([section 6](#6-deletion-and-retention)).
6. **"Report this question"** on every market, to the grievance contact ([section 5](#5-moderating-norm-questions)).
7. **Console accounts cannot trade** ([market templates](../plans/market-templates.md#8-what-the-build-needs-parity-44)).
8. **No public names** at launch ([section 5](#5-moderating-norm-questions)).

## 4. Why under-18s are refused outright
- **A child is anyone under 18** under the Digital Personal Data Protection Act, 2023, section 2(f).
- **Section 9(1):** a data fiduciary must get the verifiable consent of a parent or lawful guardian before processing any personal data of a child. Rule 10 of the DPDP Rules, 2025 sets how that consent is verified.
- **Section 9(3):** no tracking or behavioural monitoring of children, and no targeted advertising at them.
- **Markets record what a player forecasts and trades.** For a child, that is personal data needing a parent's verified consent, and close to the monitoring section 9(3) bars.
- **So the markets refuse under-18s and keep nothing.** That is simpler and safer than a parental consent route, which Nivel will not build for a play-money game. The Gaming Act check's build rule 7 already sets adults only.
- **When the duties bind:** the Rules were notified on 14 November 2025. Most duties, including Rules 6, 7 and 10, apply from 13 May 2027 ([Mondaq][mq-dpdp], [SCC Online][scc-dpdp]). Nivel follows them from launch (counsel question E).

## 5. Moderating norm questions
- **No user-generated content.** Players cannot write questions, comments, messages or names that others see.
- **No public names at launch.** If a leaderboard comes later (counsel question 18 on recognition), names are generated, never typed.
- **Questions come only from templates** ([market templates](../plans/market-templates.md)). There is no free-text market.
- **Norm items come from an approved list.** The owner approves each survey item once against the do-not-ask list, and the approval is logged:
  - no violence, harassment or abuse, even where a survey asks;
  - no splits by religion or caste;
  - no named people and no single companies;
  - no "should" questions to players: they forecast what share said something, never whether it is right.
- **A second reader** from The Equal Lens checks each norm market's wording against the [evidence brief](../research/norm-markets-evidence.md#4-wording-describe-beliefs-never-endorse-them) before it opens (owner decision 2).
- **Results are shown plainly:** the figure, the source link and the definition. No commentary, and none of the brief's loaded words.
- **Reports:**
  - every market has "Report this question", which reaches the grievance contact;
  - the owner answers within 7 days;
  - a question that breaks the rules is voided with the reason `error`, and logged.

## 6. Deletion and retention
**Privacy notice,** shown before sign-in (DPDP Act, section 5):
- what is collected and why;
- how to delete it and withdraw consent;
- the grievance contact;
- the right to complain to the Data Protection Board.

Offered in English and Hindi; section 5(3) allows any language in the Eighth Schedule.

**Deletion on request:**
- **In the app:** "Delete my markets data" (`forget`) works even while markets are off. It deletes, at once:
  - the adult record;
  - the wallet and ledger entries;
  - trades and positions;
  - the sign-in identity (build change 2).
- **By email** to the grievance contact: done within 7 days and confirmed by email.
- **What remains:** prices and market totals keep the effect of past trades, with no link to the person. The resolution log holds no player data.
- **Backups:** Neon's restore history keeps a deleted row until its window passes. The privacy notice states the window.

**Retention:**

| Data | Kept for |
|---|---|
| Adult record, wallet, ledger, trades, positions, sign-in identity | While the account exists |
| Inactive accounts | Deleted after 24 months without a sign-in, with an email 30 days before (owner decision 3) |
| Anything about a refused under-18 | Nothing |
| Research answers (the opt-in study in [markets evaluation](../plans/markets-evaluation.md)) | Pseudonymous; deleted at the player's request, and at the latest after publication |
| Resolution log | Permanently; it holds no player data |
| Platform logs (Vercel, Neon) | The platforms' own windows; no request bodies. Rule 6 asks for a year of logs for breach detection (counsel question C) |

## 7. Incident steps
**The first step is always the same:** unset `MARKETS_ENABLED`. Player actions stop at once and reads return nothing; the static site is unaffected.

| Incident | Then |
|---|---|
| **Personal data breach** | Rotate the database credentials. Work out what data, whose, how many, and whether a child is among them. Tell each person affected without delay, and the Data Protection Board at once, with a full report within 72 hours (Rule 7). CERT-In's six-hour reporting may also apply (counsel question D) |
| **A child found playing** | Delete the account and everything tied to it, as `forget` does. Keep only an incident note with no identifiers. Their trades' effect on prices stays, with no link to them |
| **A harmful or wrong question** | Void it with the reason `error`, log it, and add a short note on the market's page |
| **Tokens gain money value** (a donation, an ad or a prize that grants or rewards tokens) | Remove the cause, then tell counsel. The Gaming Act check calls this the one leak that ends social game status |

**For every incident:**
- open a Plane ticket and an incident note in `knowledge/reviews/`, with when it was found and when it was contained;
- within 14 days, write up the cause and the fix;
- the owner signs the write-up before markets are switched back on.

## 8. Open questions for counsel
**Already in the [shared questions](counsel-questions-2026-10.md):**
- **15:** how strong must the 18+ gate be, for the Gaming Rules' safety duties and the DPDP Act's children's data rules?
- **14:** the children's games and the DPDP Act. Spot the Stereotype is adult content, so this now covers SwipeEd only.
- **19:** which 2026 Rules duties (age verification, parental controls, grievance routes, data kept in India) apply to an unregistered social game hosted outside India?
- **18:** can top forecasters get public credit without creating a monetary gain?

**New, to add when the shared document is next sent:**
- **A. Sign-in before the age step:** does a refused under-18's sign-in identity, held for seconds before deletion, count as processing a child's data? Is deletion at once enough, or must the age step come before an account exists?
- **B. Retries:** may Nivel keep a marker that identifies no one, such as a salted hash of the email, to stop a refused person retrying? Or must it keep nothing?
- **C. Logs:** does Rule 6's year of logs apply to Nivel's markets, and how does it sit with deletion on request?
- **D. Breach reporting:** does CERT-In's six-hour rule bind The Equal Lens as a non-profit?
- **E. Timing:** which DPDP duties bind if markets launch before 13 May 2027?

## 9. The gate
The owner signs when all of these are done:
- [ ] PARITY-44's build makes the eight changes in [section 3](#3-the-age-gate).
- [ ] The privacy notice is written, in English and Hindi, and shown before sign-in.
- [ ] A grievance contact is named.
- [ ] The owner decisions below are made.
- [ ] Counsel has answered the questions in section 8 (PARITY-51).
- [ ] The SwipeEd team confirms its gate blocks links to markets.

## Owner decisions
1. **Sign-off of this review,** once the gate list is done.
2. **A second reader** for norm questions, and who.
3. **The inactivity period:** 24 months proposed.
4. **Self-declared age** at launch, unless counsel asks for more.

**Signed:** not yet. **Date:** not yet.

## Sources
- [Mondaq: the DPDP Rules, 2025 notified][mq-dpdp]
- [SCC Online: DPDP Rules, 2025, key highlights][scc-dpdp]
- [EY: the DPDP Act, 2023 and the DPDP Rules, 2025][ey]

[p44]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
[p49]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/77e2fcc4-1068-4086-a2c1-2d37bad5db68
[p51]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0d978739-fe5b-4c6a-967d-fcca1fb16b77
[mq-dpdp]: https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified
[scc-dpdp]: https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/
[ey]: https://www.ey.com/content/dam/ey-unified-site/ey-com/en-in/pdf/2025/11/ey-india-dpdp-act-2023-and-rules-2025-pov.pdf
