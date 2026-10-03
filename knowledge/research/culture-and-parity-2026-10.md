---
type: research
title: Culture and workplace parity across the five reporting markets
description: First test of whether Hofstede's six dimensions, GLOBE gender egalitarianism and women's labour force participation line up with Nivel's company medians in ten countries. Culture tracks whether women are employed, not how they are paid. Hypothesis-generating only.
updated: 2026-10-03
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/cb163c7c-eea8-4685-b4ab-4348f1430904
---

# Culture and workplace parity across the five reporting markets

Script: `pipeline/research/culture_corr.mjs`. Data collected 1 October 2026.

## Question
Do the national culture scores used in cross-cultural research line up with how many women large companies employ, and how they pay them?

## Data
- **Nivel:** each country's median company on the shared measures, latest year: women's share of staff (E), pay per head as a share of men's (W), women's share of pay (S). Companies with W outside 30% to 130% are left out, as on the Compare page.
- **Countries:** India, Japan, the UK and Australia by market; EU companies by listing exchange (Germany, France, Netherlands, Italy, Spain, Finland). Belgium drops out with no comparable company.
- **Culture:** Hofstede's six dimensions (dimension data matrix, 2015); GLOBE Phase 2 gender egalitarianism, practices and values (Belgium not scored).
- **Context:** women's labour force participation, World Bank modelled ILO estimate, 2024.

| Country | Companies | Staff (E) | Pay per head (W) | Share of pay (S) | Masculinity | GLOBE gender egalitarianism (practices) | Women's participation |
|---|---|---|---|---|---|---|---|
| India | 396 | 12% | 83% | 10% | 56 | 2.90 | 32% |
| Japan | 105 | 21% | 73% | 17% | 95 | 3.19 | 56% |
| Italy | 3 | 29% | 90% | 27% | 70 | 3.24 | 41% |
| Germany | 10 | 35% | 89% | 32% | 66 | 3.10 | 56% |
| Australia | 146 | 40% | 83% | 34% | 61 | 3.40 | 63% |
| UK | 81 | 43% | 89% | 39% | 66 | 3.67 | 58% |
| Netherlands | 5 | 46% | 86% | 39% | 14 | 3.50 | 63% |
| Spain | 3 | 52% | 73% | 44% | 42 | 3.01 | 53% |
| France | 6 | 51% | 93% | 44% | 43 | 3.64 | 52% |
| Finland | 1 | 51% | 79% | 45% | 26 | 3.35 | 57% |

## Results (Spearman, permutation p from 20,000 shuffles)
- **Masculinity against women's share of staff:** −0.71 (p = 0.025, ten countries). The same for share of pay.
- **GLOBE gender egalitarianism (practices) against share of staff:** +0.86 (p = 0.02) in the seven countries with five or more companies; +0.37 across all ten.
- **Pay per head:** no dimension reaches p < 0.05. Individualism comes closest (+0.56, p = 0.10).
- **Women's labour force participation:** only +0.33 with share of staff. Japan is the outlier: 56% of Japanese women are in the labour force, but they are 21% of Nikkei 225 companies' regular staff.

## What it says
- **Culture tracks who is hired, not what they are paid.** This matches the variance split in the five-market pitches: country explains 37% of the variation in share of staff and almost none of the variation in pay per head.
- **Japan's gap is about regular jobs.** Women work, but outside the regular staff that the figure counts.

## Limits
- **Ten countries, 27 tests.** One or two results below p = 0.05 are expected by chance, and neither survives a Bonferroni correction (0.05 ÷ 27 ≈ 0.002). Treat both as leads.
- **EU workforces are global.** A German company's CSRD headcount covers its staff worldwide, so the listing country is a weak proxy for the culture its staff work in. India, Japan, the UK and Australia report national staff.
- **Thin EU cells:** Italy, Spain and Finland rest on one to three companies.
- **Country scores are old:** Hofstede 2015, GLOBE about 2004.
- **Country-level association says nothing about any one company or person.**

## Next
Rerun once the market expansion lands. Twenty or more countries, with nationally scoped staff figures, would turn these leads into a test.
