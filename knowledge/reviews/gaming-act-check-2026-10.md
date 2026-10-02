---
type: review
title: Online Gaming Act check for Nivel's markets, October 2026
description: Whether Nivel's planned play-money prediction markets are an online social game rather than a banned online money game under the Promotion and Regulation of Online Gaming Act, 2025 and its 2026 Rules, the design rules that keep them there, and seven questions for counsel.
date: 2026-10-03
status: awaiting counsel
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0d978739-fe5b-4c6a-967d-fcca1fb16b77
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ce4141c0-7f43-42bf-9dd1-81fe9784d7e5
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/77e2fcc4-1068-4086-a2c1-2d37bad5db68
---

# Online Gaming Act check for Nivel's markets, October 2026

Prepared by the team from public sources for counsel; not a legal opinion. Ticket: [PARITY-51][p51]. Plan: [Nivel play and markets](../plans/nivel-play-and-markets.md). Companion: [legal review](legal-review-2026-10.md).

## Verdict

- **As designed, the markets are an online social game.** Tokens are earned, never bought, never transferred or cashed out, and win nothing of monetary value. The Act's ban turns on stakes, and its "other stakes" covers only things bought with money, directly or indirectly.
- **No registration today.** The 2026 Rules require it only for e-sports and for social game categories the government notifies. We found no notified category.
- **One leak ends it.** A donation that grants tokens, an ad that pays tokens, or a cash prize would make the markets a banned money game: up to three years in prison, a ₹1 crore fine, or both.
- **Thoth's sign-off does not cover Nivel.** The Equal Lens is a separate operator and needs its own opinion before markets launch.

## The law

- **Online money game:** played by paying a fee or staking money or other stakes, expecting money or other enrichment in return, whether skill, chance or both decides it. Offering, advertising and processing payments for one are banned (sections 5 to 7). [SCC Online][scc]
- **Other stakes:** anything treated as equivalent or convertible to money, including credits, coins and tokens, real or virtual, bought with money directly, indirectly, or as part of an online game. [Taxguru][tg]
- **Online social game:** offered only for recreation, entertainment or skill development. A subscription or one-time access fee is allowed; stakes and monetary gain are not. [PRS][prs]
- **Penalties (section 9):** offering a money game, up to three years, ₹1 crore, or both; advertising one, up to two years, ₹50 lakh, or both; more for repeat offences. [NeGD][negd]
- **2026 Rules (notified 22 April, in force 1 May 2026):** the Online Gaming Authority of India decides whether a game is a money game, on its own motion, when a provider seeks e-sport status, or when a notified category applies. It weighs entry fees, expected winnings, the revenue model, and whether rewards or in-game assets can be transferred, redeemed or monetised outside the game. [Mondaq][mq], [law.asia][la]
- **Provider duties:** summaries of the Rules list user safety features (age verification, parental controls, time limits, grievance routes, fair play monitoring) and data kept in India. Which bind an unregistered social game is question 4. [Mondaq][mq]

## Nivel's design against the test

| What the Authority weighs | Nivel's design | Holds while |
|---|---|---|
| Fee to play | Free | No paid tier gives market access or tokens |
| Money or bought tokens staked | Tokens come only from sign-up, daily visits, streaks and payouts | No donation, grant, sponsorship or ad ever credits tokens |
| Winnings worth money | No prizes of monetary value | No cash, vouchers, goods or scholarships tied to results |
| Assets leaving the game | No transfer, gifting or cash-out | No exchange with any currency that has value, Thoth's included |
| Revenue model | Grant-funded NGO, no ads on markets | No income rises with play |

## Build rules (acceptance for PARITY-44)

1. **Ledger:** only earned credits, stakes, payouts and refunds. No purchase, deposit, top-up, transfer or cash-out reason or function, enforced in the schema as in Thoth's ledger.
2. **Money and tokens never meet:** donation, grant and workshop pages never mention tokens, rank or badges, and no payment grants them.
3. **No ads for tokens.**
4. **Recognition only:** forecasting earns calibration views and public credit, nothing of monetary value.
5. **Tokens stay inside:** no transfers between players, no export, no exchange rate.
6. **No merged pool with Thoth** until counsel answers question 6. One currency across two operators makes each depend on the other's compliance.
7. **Adults only:** 18+ gate on markets; the play side never touches tokens for anyone under 18.
8. **No markets on prices of securities or index levels.** Resolve on published statistics and Nivel's own figures, which keeps markets clear of SEBI's rules.

## Other rules the markets touch

- **DPDP Act:** accounts and balances are personal data, so Nivel becomes a data fiduciary for markets: notice, consent, a grievance contact, deletion on request. The 18+ gate keeps out children's data, which needs verifiable parental consent, only if it works (question 7).
- **Wording:** the plan's safeguards stand: neutral questions about norms, no individuals named, every result linked to its source.

## Questions for counsel

1. **Stakes:** does an earned-only, non-transferable token with no monetary prizes fall outside "other stakes", making the markets an online social game?
2. **Indirect purchase:** could anything The Equal Lens does with money (donations, grants, sponsorships, paid workplace sessions) count as buying tokens "by indirect means"? What separation is enough?
3. **Recognition:** can top forecasters get a certificate, a public leaderboard place or an event invitation without creating a monetary gain?
4. **Duties:** which 2026 Rules duties (safety features, grievance routes, data kept in India) apply to an unregistered social game? Nivel is hosted outside India.
5. **Determination:** can Nivel ask the Authority to confirm social game status before launch, or is there no route unless a category is notified?
6. **Thoth:** does sharing one engine and one token pool with Thoth, a separate operator, change the analysis?
7. **Age gate:** how strong must the 18+ gate be, for the Rules' safety duties and the DPDP Act's children's data rules?

## Sources

- [SCC Online: the Act's scope, rules and penalties][scc]
- [Taxguru: the Promotion and Regulation of Online Gaming Act, 2025][tg]
- [PRS Legislative Research: Online Gaming Bill, 2025 summary][prs]
- [NeGD Laws as Code: the Act's text][negd]
- [Mondaq: Promotion and Regulation of Online Gaming Rules, 2026][mq]
- [law.asia: how the 2026 Rules decide money game status][la]
- [All India Radio: the 2026 Rules come into force][air]

[p51]: https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/0d978739-fe5b-4c6a-967d-fcca1fb16b77
[scc]: https://www.scconline.com/blog/post/2025/08/24/promotion-regulation-online-gaming-act-2025-legal-reform/
[tg]: https://taxguru.in/corporate-law/promotion-regulation-online-gaming-act-2025.html
[prs]: https://prsindia.org/files/bills_acts/bills_parliament/2025/Bill_Summary-Online_Gaming_Bill_2025.pdf
[negd]: https://lawascode.negd.in/laws/the-promotion-and-regulation-of-online-gaming-act-2025
[mq]: https://www.mondaq.com/india/gaming/1782762/promotion-and-regulation-of-online-gaming-rules-2026
[la]: https://law.asia/india-online-gaming-regulations/
[air]: https://newsonair.gov.in/promotion-regulation-of-online-gaming-rules-2026-comes-into-force/
