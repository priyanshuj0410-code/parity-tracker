---
type: decision
title: App name shortlist starting with N
description: Candidate names beginning with N for the installable Parity Tracker app, with meaning, fit and known conflicts. Proposed, awaiting the co-founders' choice.
status: proposed
date: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6b573de9-f46f-4610-8561-02b11b0e395d
---

# App name shortlist starting with N

The app installs today as **Parity** (home-screen label) and **Parity Tracker by The Equal Lens** (full name). These are the alternatives. A quick web search on 2 October 2026 was the only check made: run a trademark search (India classes 9, 36 and 42, plus the UK and EU) and a domain check before choosing.

| Name | Meaning and fit | Known conflicts and risks |
|---|---|---|
| **Nivel** (recommended) | Spanish and Portuguese for "level": levelling the field. Five letters, easy to say in English and Hindi. Pairs with a tagline like "Level the payroll you own". | No ESG or investing app of that name surfaced. It is a common word, so expect unrelated companies abroad. |
| **Notch** | Moving up a notch: suits a tracker built on year-on-year movement. | Generic English word, hard to own as a trademark or in search. |
| **Narrow** | "Narrow the gap": the name is the mission, as a verb. | Generic word, weak in search. |
| **Nazariya** | Hindi-Urdu for "perspective", extending The Equal Lens's way-of-seeing metaphor. | Long. Close in sound to Nazara Technologies, a listed Indian gaming company. "Nazar" alone also means the evil eye. |
| **Norma** | "Make parity the norm." | A common first name, so it reads as a person. |
| **Naap** | Hindi for "measure". | Naapbooks Ltd is a listed Indian fintech on BSE SME. Not recommended. |
| **Nyaya** | Sanskrit for "justice". | Strong political association with the 2019 NYAY income scheme, and a school of Indian philosophy. Not recommended. |

## Recommendation
**Nivel** for the MIT Solve pitch and a global audience, written as "Nivel by The Equal Lens". **Notch** is the fallback if Nivel fails the trademark check.

## If a name is chosen
Change `name` and `short_name` in `public/manifest.webmanifest`, `apple-mobile-web-app-title` and `<title>` in `index.html`, the header brand in `src/Root.tsx`, and the install hint in `src/components/InstallButton.tsx`.
