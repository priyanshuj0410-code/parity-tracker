---
type: plan
title: Nivel play and prediction markets
description: Plan for Nivel's two engagement layers, Spot the Stereotype (The Equal Lens's bias game) and prediction markets on women's pay, work and norms, hosted in Nivel on a prediction market engine shared with Thoth.
status: planned
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/66905658-70ce-4e96-a7c0-effb34139826
  - https://app.plane.so/claude-pri/projects/18017c30-d8f6-436a-b4ca-a743d5317720/issues/d3d482ab-c1bf-43df-9a9b-3ea19e3d3564
---

# Nivel play and prediction markets

## Who owns what
- **Nivel** is The Equal Lens's product, and everything in this plan lives in Nivel.
- **Thoth** is a separate play-money prediction market for all news items. It is not related to The Equal Lens and is not in use now.
- **The common engine** is the one shared piece: a prediction market engine (markets, pricing, play-money balances, resolution), built once and used by both apps.
- **If Thoth goes live,** the two apps' markets can merge into one pool with two entry points:
  - Nivel, for people who come for women's pay and work.
  - Thoth, for people who come for the news.

## Play: Spot the Stereotype
- **What it is:** The Equal Lens's live game night, built on its Bollywood Bias Detective rulebook (v3.1), becomes Nivel's play side. It is live at spot-the-stereotype.vercel.app, from its own repository, which this plan only reads.
- **How it runs:** 75 minutes, online, for urban Indians aged 20 to 35. A host runs it from one console on a video call, a shared stage shows the question, and each team answers on its own phone. "The talking is the game."
- **Formats:**
  - Finish a famous line.
  - Guess a published figure.
  - Rate lines, then predict the room.
  - Count how many films do something.
  - Judge whether a trait is treated as praise in a hero, a heroine, both or neither, then wager on the room.
  - Name the film and year.
  - Rewrite a line to keep the romance, which is deliberately unscored.
- **The scoring rule:** "points for prediction and recall, never for opinion". This is the misperceived-norms mechanism, played live among friends.
- **Privacy:** it keeps nothing by default. No accounts, names never beside answers, and counts only.
- **With Nivel:**
  - Nivel links to game nights.
  - A proposed Nivel round would use the published-figure format with Nivel's numbers, for example women's share of the Nifty 50 payroll, guessed cold and then revealed. It needs the owner's agreement and the rulebook's fit check.
- **Safeguarding:** if young people play, The Equal Lens's child-safety rules apply. The play side never connects to markets or tokens for anyone under 18.

## Forecasting: prediction markets in Nivel
- **Three loops:**
  1. **Forecast the data.** Nivel's own next figures, and official statistics such as women's labour force participation in the Periodic Labour Force Survey.
  2. **Forecast the norm.** What other people believe, resolved against published surveys. This targets misperceived social norms: Bursztyn, González and Yanagizawa-Drott (2020) found most Saudi men privately supported women working outside the home but underestimated how many other men agreed, and correcting the belief changed behaviour.
  3. **See your own bias.** After resolution, players see how their forecasts about women compared with the data, as calibration by topic.
- **Built on the common engine:** markets from templates, pricing, a play-money balance, resolution against named and dated sources, and an 18+ age gate.
- **Play money only:** tokens are earned, cannot be bought or cashed out, and carry no prizes of monetary value (Promotion and Regulation of Online Gaming Act, 2025).

## Resolution sources (to confirm schedules)
- **Nivel's own yearly refresh:** pay share, staff share and board seats.
- **Periodic Labour Force Survey quarterly bulletins:** women's labour force participation.
- **Time Use Survey:** unpaid care work.
- **National Family Health Survey:** attitudes and decision-making.
- **World Values Survey and Pew:** attitude questions.
- A question resolves only against a named, dated publication, and the source is shown before anyone forecasts.

## Safeguards
- **Adults only for markets.** Spot the Stereotype follows The Equal Lens's child-safety rules.
- **Neutral wording:** questions about norms describe beliefs without endorsing them, and every result links to its source.
- **No individuals:** questions name companies or populations, never people.

## Evaluation
- **Before and after:** a short question on each norm a player forecast, asking what they think others believe.
- **Claims stay limited:** with a single group measured before and after, the claim covers stated beliefs, not behaviour.
- **A comparison group** that never sees the result would strengthen the evidence.

## MIT Solve
The application draft is in [mit-solve-application.md](mit-solve-application.md). It is for the 2027 Global Economic Prosperity Challenge, due 2 November 2026.

## Steps
- **In Nivel (PARITY):**
  - Evidence brief.
  - Resolution source catalogue.
  - Markets in Nivel on the common engine.
  - Evaluation design.
  - MIT Solve application.
  - Spot the Stereotype in Nivel.
  - Market templates and resolution workflow.
  - Age gate and safeguarding review.
  - Personal calibration view.
  - Online Gaming Act check.
- **Shared engine (THOTH):**
  - Extract the market engine and play-money ledger from Thoth.
  - A host integration interface.
  - A later plan for the merged pool with two entry points.
