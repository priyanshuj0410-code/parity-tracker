---
type: plan
title: Evaluation design for norm forecasting
description: How Nivel measures whether forecasting a norm, then seeing the survey result, moves people's beliefs about what others think. Before-and-after questions, a comparison group that answers twice before seeing any result, a sample size, an analysis plan, and the claims it can and cannot support.
status: draft
updated: 2026-10-05
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/395820c3-832b-44af-bdc1-6f583cef4ca2
---

# Evaluation design: does forecasting a norm correct it?

For [Nivel play and markets](nivel-play-and-markets.md) and the MIT Solve application ([mit-solve-application.md](mit-solve-application.md), week 2). The evidence behind it is in the [evidence brief](../research/norm-markets-evidence.md). Questions resolve against the [resolution sources](../research/resolution-sources.md).

## The question
After people forecast what share of a population holds a view, then see the survey's answer, are their estimates of what others believe closer to the truth than they would otherwise be, and does that last?

## Who takes part
- **Adults, 18 and over,** who forecast a norm question in Nivel's markets, or play a norm item in the game's anytime set.
- **Only those who opt in** on a consent screen. Nivel's `/play` and Guess first keep nothing today, and they stay that way. The study runs in a separate, opt-in research mode.
- **No children.** The play side's child-safety rules apply.

## What is asked
For each norm question, such as "What share of men aged 18 to 49 in the survey agreed that…":
1. **Before (T0):** the player's estimate, 0 to 100. In a market, the forecast is the T0 answer.
2. **At the next visit (T1),** at least a week later: the same question again, for both groups at the same point.
3. **Later (T2),** at least four weeks after T0: the same question once more, to see whether a change lasts.

Own views ("do you agree?") are not asked. They add sensitive data, and the claim does not need them.

## The comparison group
- **Assignment:** randomised by question, so each player is in both conditions across questions.
  - **Treated:** the player sees the result right after T0.
  - **Comparison:** the player answers T0 and T1 before seeing any result, and sees it straight after T1.
- **Why:** both groups answer T1 at the same point, so the difference is the result itself, not answering twice or the time between.
- **Not withholding:** every player sees every result. The comparison group sees it about a week later.

## Outcome and analysis
- **Primary outcome:** absolute error, the distance in points between a player's estimate and the survey figure.
- **Effect:** the error at T1, treated against comparison, allowing for each player's T0 error.
- **Secondary outcomes:**
  - error at T2 (does it last);
  - whether the error falls more for questions where people misjudged the most at T0.
- **Model:** a regression of T1 error on assignment, with T0 error as a covariate and a fixed effect for each question. Standard errors are clustered by player. Intention to treat: everyone assigned is analysed, whatever they did next.
- **Pre-registration:** register the plan (AEA RCT Registry or OSF) before the first T0 answer is collected.

## Sample size
- **Assumptions:** detect a 5-point difference in error, assuming errors spread with a standard deviation of 20 points; 5% significance, two-sided; 80% power.
- **Needed:** about 250 answers per arm, from n = 2 × (1.96 + 0.84)² × 20² / 5² ≈ 251.
- **Re-estimate after the pilot:** replace the 20-point assumption with the pilot's own spread, and the clustering by player with the pilot's correlation.

## Claims
- **Supported:** with randomisation, "Seeing the survey result moved players' estimates of what others believe closer to the truth, by N points, against a comparison group."
- **Not supported:**
  - any claim about behaviour (work, hiring, family decisions);
  - any claim about people who did not opt in.
- **Single-group before-and-after numbers,** where no comparison exists, are reported only as stated beliefs before and after, never as an effect.
- **No incentives with money value.** Markets are play money only (Online Gaming Act check, PARITY-51). Estimates are unpaid, which can make them noisier than in studies that paid for accuracy. Report that as a limitation.

## Data and ethics
- **Data kept:**
  - a pseudonymous player id;
  - the question id and the condition;
  - the three estimates and their times.
- **Not kept:** names, contact details, location or device ids.
- **Consent and access:**
  - A Digital Personal Data Protection Act notice and consent at opt-in.
  - Deletion on request.
  - Retention up to the analysis and publication, then deletion of player-level rows.
- **Reporting:** in aggregate only, never for a single player or a group smaller than 20.
- **Ethics review:** an independent board before the pilot, if results are to be published.

## Timeline
- **Week of 10 October:** finalise the instruments and the consent text (MIT Solve plan, week 2).
- **Pilot:** at game nights and in the game's anytime set, which work before the markets exist (PARITY-44).
- **Full run:** with the markets.
- **For the Solve application:** the design and any pilot numbers, clearly labelled.

## Open decisions
- **Where the opt-in research mode lives:** the game, Nivel, or both. It needs a store, which Nivel does not have yet (see the markets architecture, [decision 0017](../decisions/0017-markets-architecture.md)).
- **Which norm questions go first:** from the sources marked "forecast the norm" in the catalogue, once their releases are dated.
