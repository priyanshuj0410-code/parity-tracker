---
type: plan
title: Spot the Stereotype anytime play and the Nivel connection
description: Plan for The Equal Lens's game team. A one-person mode of Spot the Stereotype on the same reviewed banks without the discussion steps, Nivel's prediction markets as the place the discussion continues, a workplace theme fed by Nivel's figures through a versioned feed, and the entry points that bring Nivel's readers to play.
status: draft
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a7d95186-1e6e-4db7-a8ea-2e8f2b947b04
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3e2cafdb-a457-426b-89bc-ce3a1d7b8740
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/bd128ee2-934e-4d5e-93c2-b0078d245c88
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4fb24fb0-7ea1-419f-8ee7-ce8f9d2eb5ac
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/931fede3-f0eb-4e15-860c-5540fd87f30b
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/355c70c1-b1c1-4680-8a3d-8308f85eaa22
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/69cda411-005d-4cb3-811a-7478e5382838
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/a0554e43-8b6e-4a41-a3be-2a6989704411
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/6d2b78c9-fde4-46ec-abd2-7c04ff2f065c
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/71d8cd73-f873-4292-906f-a8c6369eaf38
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/cbd8b53f-d4f0-4109-bac1-a5d722cc9e7f
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/b8eef84a-37fb-40cf-ac54-efb1726065ba
  - https://app.plane.so/the-equal-lens/projects/8471aa75-1701-46fc-9b61-ff150a1da516/issues/231a2f6d-10e6-46bf-a272-76f257e9f150
---

# Spot the Stereotype: anytime play and the Nivel connection

For The Equal Lens's game team. It was written from a read-only pass over the game's repository and knowledge base on 2 October 2026 (section 10 lists what was read), and nothing here changes that repository. Every game-side item is a proposal for the game's owner to accept, change or refuse. They are filed as BIAS-40 (the parent, with this plan attached) and BIAS-41 to BIAS-48 in The Equal Lens's Plane workspace. Nivel's side is PARITY-52 to PARITY-54, under PARITY-47. The wider picture is in [nivel-play-and-markets.md](nivel-play-and-markets.md). The shareable version of this page is at https://claude.ai/artifact/QYFgW7fHANR5veNCfv49Ay (private until shared from its Share menu).

## In one minute
- **Nights stay the heart of the game.** The 75-minute hosted night is where people argue, change their minds and remember it.
- **Anytime play is new:** one person, one phone, no host and no call, for about five minutes. It deals from the same reviewed banks and scores by the same rules, without the discussion steps.
- **The crowd replaces the room.** Players predict how other players answered, from counts kept per item. Nothing about the player is kept.
- **The discussion moves to Nivel's markets.** A night's discussion prompt, twist cards and change-of-mind vote each have a market equivalent: the question, the new information and the price moving.
- **A workplace theme on Nivel's figures.** Nivel publishes a versioned feed of round 1 items at `/feeds/spot/v1.json`. The game pulls it at build time. The owner decided on 2 October 2026 that entries deal as soon as they are pulled, and the review can still fix or cut any of them (section 8, decision 6).
- **Players come from Nivel.** A Guess first card on index pages, a `/play` page and deep links take readers into the workplace set. The game links back to the data and the markets.

## 1. What the game is today
- **Surfaces:** a phone for every player (`/?r=CODE`), a console the host never shares, and a stage shared into the call. Rooms live at `spot/{CODE}` in the Firebase Realtime Database instance `praxis-2ffa8`, shared with The Keepers.
- **The loop:** ask, locked, reveal, discuss, revote, shift, flip, next. Since the owner's decision 2 of 27 September 2026, the welcome, twist cards, friend card and closing wall are steps on the stage.
- **Who answers:** the host chooses teams or individuals at setup. A room of individuals is called a solo room (`mode: 'solo'`). That is why the new mode needs another name.
- **Themes:** six. Bollywood is the only one ready. Work and leadership, family, relationships, childhood and money are drafts.

| Part | Format | Bank | Scored on |
|---|---|---|---|
| Cold open | finish the line | `COLD_OPEN`, 52 films | a point a word, and the whole line two more than its words |
| Round 1 | guess a published figure | `STATS`, 32 figures, one a night | closeness: 10 dead on, a point less for every 5 off, never below 1 |
| Round 2 | rate the line, then predict the room | `RATE_LINES`, 114 lines, six a night | the prediction only, never the rating |
| Round 3 | count the films | none yet: ten films and two codings are owed | films out of ten, times ten, by closeness |
| Round 4 | same word, two people | `ADJECTIVES`, four a night | the prediction only, never the vote |
| Round 5 | rewrite | round 2's lines | unscored |
| Finale | name the film | `NAME_LINES`, 100 films, five a night | 1 for the film, 2 for the year, 1 for a year within two |
| Draft themes | is there a stereotype here? (`judge`, `read`) | written into `themes.ts` | predicting the room, with the player's own vote left out |

**Rules that bind any new mode:**
- **Points for prediction and recall, never for opinion** (rulebook section 8; build spec section 5). No scoring path may reward a position, and accuracy is scored, never speed.
- **The owner's review gates content.** Every bank entry is marked ok, fix, cut or unsure in a review page. `pnpm apply-review` writes it, and every surface reads the banks through it (decision 1). `pnpm check` fails when an entry has changed since it was reviewed, or when the bank no longer holds a reviewed entry (`banks/review.md` section 7).
- **Every round 1 question stands alone.** It names who ran the study, the sample, the period and the exact group. Figures are read as raw text. `cite.saw` quotes the source. A computed percentage shows its arithmetic in `source.rule` (`banks/stats.md` sections 2 and 4).
- **The draw rules:** no film or song twice in a night, floors on round 2's lines, and a round 4 word whose rule lands on men (`banks/consistency.md` section 10).
- **Privacy:** no names, accounts, analytics or third-party scripts. Votes exist only as counts. Rooms go dark 12 hours after they open (build spec section 6).
- **Writing:** British spelling, sentence case and no em dashes. The interface refuses "Correct!", "You got it wrong", "winner", "score", "points", "streak", "rank" and "level" (`design-system/writing.md`).
- **Safety:** a heavy round opens with rule 6, and the helplines are one press away on every screen (`flows.md` section 2).
- **Content ships in the bundle.** It is never fetched at runtime (build spec section 10).

**Where things stand:**
- One night has run on the Bollywood rounds, with 14 players.
- Round 3 does not run.
- The hunch is run by the host and is not in the app.
- The dark-on-time database rules are written but not deployed.
- Anonymous sign-in is not built (decision 4).

## 2. Anytime play

### 2.1 What it is
- **One person, any time.** One phone, with no host, stage, call or room code.
- **About five minutes:** a set of six to eight items from the same reviewed banks, scored by the same rules.
- **No discussion steps.** The talking continues in Nivel's markets (section 3).
- **Nights stay the flagship.** Anytime play is the way in and the habit between nights. Every set ends by offering a night.
- **Name:** "anytime play". "Solo" already means a hosted room of individuals.
- **Where:** a route on the same app (proposed: `/?play=work`). It reuses the phone's screens, components and tokens. There is no console and no stage.

### 2.2 A set
| Bollywood set | Workplace set |
|---|---|
| Finish the line: 1 line | Guess the figure: 2 Nivel figures, a pair where one exists |
| Guess the figure: 1 published figure | Same word, two people: 4 words, then one prediction |
| Rate the line: 4 lines, then one prediction | Is there a stereotype here?: 2 scenarios, each with a prediction, one with its flip |
| Same word, two people: 4 words, then one prediction | |
| Name the film: 2 lines | |

- **Decided otherwise on 2 October 2026: a draw from the whole bank from day one** (section 8, decision 4). The case for a weekly set, kept for the record:
- **Start with a weekly set.** Everyone gets the same items for a week, for three reasons:
  - Answers pile up on a few items, so crowds pass the floor quickly.
  - The owner can check the set as a whole.
  - "This week's set" is a reason to come back that needs no streak.
  - A "play more" draw from the whole bank comes once crowds are big enough.
- **The draw rules hold within a set:**
  - No film or song twice.
  - At least one plainly affectionate line among the rated lines, so the set does not read as a lecture.
  - One trait word whose rule lands on men.
- **No clocks.** Nights time their steps to keep a room moving. One person needs no clock, and accuracy, not speed, is what scores.

### 2.3 Format by format
| Format | On a night | In anytime play |
|---|---|---|
| Finish the line | the matcher proposes and the line is shown | kept. The matcher decides alone, so each line needs its `also` spellings. The whole line is shown after |
| Guess the figure | guess, reveal, discuss, twist cards, change of mind | kept as guess and reveal, with the source line and rule. The discussion line and twist cards go to the market. Heavy figures are left out |
| Rate the line | six lines, then the room's share of "romantic" | kept with four lines, then the crowd's share. Rule 6 opens it when the round is heavy |
| Count the films | not running | out until the films are coded |
| Same word, two people | four words, then the room's share | kept: four words, then the crowd's share. The counter-card rule holds |
| Rewrite | unscored writing, shared on the stage | out. Free text needs a reader, and anytime play keeps no text |
| Name the film | five lines | kept with two lines |
| Is there a stereotype here? | vote, predict the room without you, flip | kept: vote, then predict the crowd without you. The flip is a second vote with no prediction |
| Twist cards, change of mind, discussion, friend card, closing wall, hunch | stage steps and the host's calls | out. The first three continue in the markets |

### 2.4 Predicting the crowd without a room
- **The crowd** is everyone who answered the same item in anytime play. Night tallies are never mixed in. They are deleted with the room, and a room of friends is a different setting.
- **Counts only:** per item, a count for each option and a total, kept as long as the item is dealt. No answer is stored against a person or a device.
- **Leave yourself out.** The phone subtracts its own answer from the counts it reads, so the target never includes the player.
  - Nights now include a player's own answer on rounds 2 and 4 (decided 25 September 2026), so that one number can be read out to the room.
  - With no room to read to, that reason does not apply here.
- **A floor of 30.** A prediction is compared with the crowd only once the item has at least 30 other answers.
  - Below that, the phone says "Not enough answers yet" and keeps the prediction on the device.
  - On the next visit, it shows how the prediction compares with the crowd at that time.
  - Tune the number in the pilot.
- **Show the working the night's way:** "19 of 32 said romantic, so 59".
- **The accepted trade changes.**
  - On a night, any phone that can increment a counter can write any number to it. The build accepts that for 6 to 16 invited people (build spec section 3). A public page cannot.
  - The minimum for anytime play:
    - database rules that accept only +1 per write on the anytime node;
    - one increment per item per set, guarded on the phone;
    - the floor above.
  - A determined script can still add answers. Crowd shares are therefore for play only, and never settle a market until an abuse check exists (section 3).

### 2.5 How a set ends
- **Each reveal** says how close the player was in the game's own words, never "correct" or "wrong".
- **The end screen leads with what the player noticed:** the items where their read of the crowd was furthest off, which is where a misperceived norm shows. A total, if any, comes after.
  - There is no rank, leaderboard or streak, because `writing.md` refuses all three.
- **Predictions waiting on a crowd** are listed, with when to come back.
- **Three ways on:**
  - join or book a night;
  - see the data behind a figure in Nivel;
  - take a figure further in Nivel's markets.
- **A share card:** the story card's "everybody else" variant, since a set of one is not a placement (`sharing.md` section 3.4).
  - It could carry the anytime play link. A night's card carries no link because there was no public page to send anyone to (`sharing.md` section 3.3).
  - The owner decides.

### 2.6 What anytime play keeps
- **On the server:**
  - each item's count for every option;
  - if the owner agrees, a count of arrivals by source (section 6.3).
  - Nothing else.
- **On the phone:** the current set's answers and any predictions waiting on a crowd, with "Forget my answers" on the end screen.
- **Never:** names, accounts, emails, IP addresses, device fingerprints, analytics or free text.
- **This is a new promise and needs the owner's words.** Nights promise that nothing is kept by default, while anytime play keeps counts indefinitely. Proposed line: "We keep how many people chose each answer. Nothing about you."

### 2.7 Safety and age
- **Adults only.**
  - Nights rely on the sign-up form, where people declare they are 18 or over (build spec section 6).
  - Anytime play has no sign-up, so its first screen says it is for adults, 18 and over. It stores only a flag on the device.
  - As on nights, there is no age gate and no date of birth.
- **Heavy content:**
  - Figures flagged `heavy` (violence, harassment or coercion in the figure itself) were proposed out of anytime play, because on a night a host holds the conversation that follows them. **Decided otherwise on 2 October 2026: everything is dealt, heavy figures included, each opened with rule 6** (section 8, decision 5).
  - Heavy rate lines open with rule 6, as on nights.
  - The helplines are on every screen.
- **No free text,** so nothing needs moderating.
- **Under-18s:** Nivel never promotes the game to them, and the markets have their own age gate (PARITY-49).

### 2.8 Where it runs
- **The database is shared.** The game shares `praxis-2ffa8` with The Keepers.
  - If that project is on Firebase's free Spark plan, the database allows 100 simultaneous connections. Live nights, Keepers tables and every anytime player would share them.
  - A rush of readers from Nivel could lock out a live night.
- **Recommended:** anytime play holds no open connection. It reads an item's counts once and writes its increments once.
  - Before a public launch, either:
    - move to the paid Blaze plan with a second database instance for anytime counts (build spec section 10, option 1); or
    - keep the counts in a separate store.
- **The ruleset is one file for the whole instance.** The anytime node joins the union with The Keepers' rules. It passes `pnpm rules` and ships in the same deploy as the dark-on-time rules, which are still waiting.

## 3. Where the discussion goes: Nivel's markets
Anytime play has no room to argue in. The argument continues in Nivel's markets, where forecasting with earned play money stands in for talking.

| On a night | What it does | In Nivel's markets |
|---|---|---|
| Discussion: the round's discussion line, Lensy's cue, breakouts | the room argues about why | a market question on the same figure. Buying and selling is the argument |
| Twist cards, which weaken or strengthen the pattern | new information mid-argument | a dated "New information" entry on the market, with its rule line. The price moves if it matters |
| "Has your view changed?" (revote and shift) | counts changes of mind | the price before and after each piece of new information, and each forecaster's own change of position, which is never marked right or wrong |
| The flip | the same situation with a different gender | stays in the game as a second vote |
| Rewrite, friend card, closing wall | writing and private reflection | not carried over. Markets take no free text until there is moderation |

**How a round becomes a market:**
- **Forecast the data.** From a Nivel item: "Will women's share of the Nifty 50's wage bill be 22% or more in 2026-27?" It resolves on Nivel's refresh after the 2026-27 filings, around October 2027.
- **Forecast the norm.** From a published survey in the resolution source catalogue (PARITY-43), for example women's labour force participation in the next Periodic Labour Force Survey bulletin.
- **Forecast the crowd (later).** "Will more than half of anytime players say 'Ambitious' reads as praise for both?" It would resolve on the game's counts at a stated date, but only after an abuse check and the owner's sign-off.

**Carried over from the markets plan:**
- Adults only.
- Play money is earned and never bought.
- A market resolves only against a named, dated source, shown before anyone forecasts.
- No individual is ever named.

**The game stays free of all of it.** It has no tokens, balances, stakes or prizes. The token side is checked under PARITY-51.

**Lensy hands over.** At a figure's reveal, Lensy asks the discussion question, never answers it, and points to the market: "What would close it? Take it further in Nivel."

## 4. The workplace theme on Nivel's figures

### 4.1 Rounds
| Part | Format | Content | Status |
|---|---|---|---|
| Guess the figure | `published` | Nivel's figures, through the feed (section 5) | new. PARITY-52, then the game's pull |
| Same word, two people | `traits` | `wk-same-word`: Direct, Detail-oriented, Ambitious, Quiet in meetings. More to write | draft |
| Is there a stereotype here? | `judge` | `wk-interrupt`, and `wk-aggressive` with its flip. More to write | draft |
| Count out of ten (later) | `coded` | a count from Nivel's data, such as how many of the ten largest Nifty 50 companies have women as at least a quarter of permanent staff | idea, for feed v2 |

**Balance.** Content pack section 4 asks for about 7 in 20 scenarios to land on a man, and both draft scenarios land on women. The next ones should include men in caring roles, such as a father asking for leave or a man in a caring job.

### 4.2 Eight starter items from Nivel's data
From Nivel's data collected on 1 October 2026. Questions are drafts for the game's editor. The answer is the figure rounded to a whole number out of 100. Each item's discussion line is in the feed.

| Feed id | Question (draft) | Answer | Told at the reveal |
|---|---|---|---|
| `nv-in-nifty50-payshare-2025-26` | If you own a Nifty 50 index fund, you own a slice of each company's wage bill. Out of every ₹100 of that wage bill in 2025-26, how many rupees went to women? | 21 | **Source:** Nivel by The Equal Lens, from the companies' BRSR filings. **Rule:** Nivel's arithmetic, weighting each company by how much of it the index holds. 49 of the 50 companies have figures; 46 reported them directly, covering 93% of the payroll, and the other three are Nivel's estimates. It counts all pay, so fewer women employed and lower pay per woman are mixed together |
| `nv-in-nifty50-gapsplit-2025-26` | In 2025-26, women got about a fifth of the wage bill a Nifty 50 index fund holds, against half at parity. Nivel splits that shortfall into two causes: fewer women employed, and less pay for each woman employed. Out of every 100 rupees of the shortfall, how many come from fewer women employed? | 77 | **Rule:** Nivel's split of the gap to parity. It does not compare pay for the same job |
| `nv-in-nifty50-it-2025-26` | The Nifty 50 includes four IT companies. Out of every ₹100 they paid their staff in 2025-26, how many rupees went to women? | 26 | **Pair:** the index's five automobile companies paid women ₹6 of every ₹100 |
| `nv-in-nifty50-auto-2025-26` | The Nifty 50 includes five automobile and auto parts companies. Out of every ₹100 they paid their staff in 2025-26, how many rupees went to women? | 6 | **Pair:** the index's four IT companies paid women ₹26 |
| `nv-gb-ftse100-pence-2025` | In 2025, 80 FTSE 100 companies reported their UK gender pay gaps. Taking the average company, for every £1 a man earned an hour, how many pence did a woman earn? | 87 | **Source:** the UK government's gender pay gap service, averaged by Nivel. **Rule:** UK staff only and mean hourly pay. Each company counts equally, and it compares all men with all women, not the same job |
| `nv-gb-ftse100-topquarter-2025` | In 2025, 80 FTSE 100 companies reported who sits in each quarter of their UK pay scale. Out of every 100 people in the best-paid quarter, how many were women? | 33 | **Pair:** women were 41 of every 100 UK staff overall |
| `nv-au-asx200-topquarter-2024-25` | 146 ASX 200 companies report their staff to Australia's Workplace Gender Equality Agency. Out of every 100 people in their best-paid quarter of jobs in 2024-25, how many were women? | 34 | **Pair:** women were 44 of every 100 Australian staff overall |
| `nv-jp-nikkei225-managers` | Japanese employers report to a government database how many of their managers are women. Taking the average Nikkei 225 company that reports it, out of every 100 managers, how many are women? | 11 | **Source:** Japan's Ministry of Health, Labour and Welfare database, mostly 2025 figures. **Rule:** each employer's own definition of a manager |

### 4.3 Writing rules for Nivel items
- **The stats bank's rules apply in full:**
  - The question stands alone, and names who, the sample, the period and the exact group.
  - It never says "the same study".
  - Arithmetic is shown in `source.rule`.
  - `source.rule` names what the figure does not measure.
- **Nivel's rules apply too:**
  - Name measures the way Nivel does: women's share of pay, employment parity, wage parity.
  - Never rank markets against each other, because their measures differ.
  - Never rank by the absolute rupee gap.
  - Leave out estimates and basis changes, except as a stated share of an index's coverage.
- **Nivel's own figures are labelled as Nivel's.** Nivel is The Equal Lens's own product, so a figure is Nivel's arithmetic on public filings.
  - The source line says so.
  - The linked Nivel page shows every step and links to each filing. That meets round 1's bar: "a figure that cannot be found again by a host with a browser does not belong here".
- **Voice:** read once by an Indian English speaker, British spelling, no em dashes, ₹ with Indian digit grouping.

### 4.4 Do not ship
- An item that compares markets, such as "Which country's index pays women most?". India's figure is weighted by payroll and the UK's is an equal-weighted hourly gap.
- Company-level items in v1. They put a named company into a game, so that is the owner's call for v2.
- Any company Nivel lists as excluded or unresolved, any estimated figure, and any basis change.
- US board seats, until the US extraction is high confidence (PARITY-30).
- An absolute rupee gap as a headline.

## 5. The Nivel feed

### 5.1 The contract
One static file at `https://nivel-equal-lens.vercel.app/feeds/spot/v1.json`, with a JSON Schema beside it at `v1.schema.json`. Each item has the shape of the game's `Stat` (`src/game/banks/types.ts`), plus a `nivel` block the game can keep or drop:

```json
{
  "kind": "nivel-spot-feed",
  "version": 1,
  "generatedAt": "2026-10-16T09:00:00Z",
  "dataAsOf": "2026-10-01",
  "items": [
    {
      "id": "nv-in-nifty50-payshare-2025-26",
      "format": "published",
      "theme": "work",
      "question": "If you own a Nifty 50 index fund, you own a slice of each company's wage bill. Out of every ₹100 of that wage bill in 2025-26, how many rupees went to women?",
      "answer": 21,
      "discussion": "Is the gap about what women are paid, or about who gets hired?",
      "source": {
        "line": "Nivel by The Equal Lens, from the companies' BRSR filings, 2025-26.",
        "rule": "Nivel's arithmetic, weighting each company by how much of it the index holds. 46 of 49 companies reported directly, 93% of the payroll. It mixes fewer women employed with lower pay per woman."
      },
      "cite": {
        "from": "https://nivel-equal-lens.vercel.app/index/nifty50",
        "saw": "Women's share of pay (payroll you own) 20.8%, FY2025-26"
      },
      "nivel": {
        "exact": 20.78,
        "period": "2025-26",
        "market": "IN",
        "status": "current",
        "pair": "nv-in-nifty50-auto-2025-26",
        "replaces": "nv-in-nifty50-payshare-2024-25",
        "data": "https://nivel-equal-lens.vercel.app/index/nifty50",
        "markets": []
      }
    }
  ]
}
```

### 5.2 What Nivel promises (PARITY-52)
- **Regenerated on every Nivel deploy,** from the same data files the site uses, with `generatedAt` and `dataAsOf` at the top.
- **An hour's cache and open CORS,** so a script or the review page can fetch it.
- **The version is in the path.** A breaking change becomes v2 at a new path, and v1 stays until the game moves.
- **Ids carry the period and never change meaning.**
  - A corrected figure keeps its id. Its changed answer then fails the game's `pnpm check` until it is reviewed again, which is the review working as designed.
  - A refresh adds the new period's items and marks the old ones `retired` instead of dropping them. The game's review can then cut them, because a reviewed entry that disappears fails `pnpm check`.
- **Only qualifying figures.** Only reported figures, and only index items whose reported figures cover at least 90% of the payroll. Each item states its coverage.
- **A check fails Nivel's build** on any of:
  - a missing field;
  - an answer outside 0 to 100;
  - a phrase that assumes an earlier question;
  - an em dash.

### 5.3 What the game does with it (proposed)
- **`pnpm pull-nivel`:**
  - Fetches the feed and checks its kind, version and every field.
  - Refuses the whole file on any error, as `apply-review` does.
  - Writes `src/game/banks/nivel.ts`, generated, with the URL, `generatedAt` and `dataAsOf` in its header.
  - Prints the new, changed and retired ids.
- **A `nivel` bank in the review.** `BankKey` gains `nivel`, and `reviewed.ts` reads it through the review like every bank. A fix may replace `question`, `answer` and `discussion`, as for `stat`.
- **The workplace theme's published part deals from `NIVEL`:** one a night, two in anytime play.
- **A stricter gate for entries a machine wrote (proposed; not taken).** A Nivel entry would deal only once it is reviewed ok or fixed. **The owner decided on 2 October 2026 that Nivel entries deal once pulled** (section 8, decision 6).
  - Decision 1 deals unreviewed entries.
  - A feed can change on any deploy, so the owner's sign-off should come first.
- **Retired entries:** the pull marks them and the reviewer cuts them.

### 5.4 Keeping it fresh
| Market | Source | New figures usually land |
|---|---|---|
| India | BRSR, in annual reports | July to September, for the year to March |
| United Kingdom | gender pay gap service | by early April |
| Australia | WGEA | early in the year |
| Japan | women's advancement database | through the year |
| European Union | CSRD sustainability statements | spring, with annual reports |

- **A weekly job in the game's repository** runs the pull and opens a pull request when the feed has moved. It needs no secrets, because the feed is public.
- **Nothing deals until a person applies the review.** Fresh data arrives as a reviewed change, never silently.

### 5.5 Why not fetch at runtime
- **The build spec forbids it:** content is compiled into the bundle and never fetched at runtime, a lesson from a real Keepers table.
- **It would skip the owner's review.**
- **A Nivel deploy would change a night already running.**

## 6. Bringing players from Nivel

### 6.1 In Nivel (PARITY-53)
- **Guess first** on the Indian index Overview tabs: "Out of every ₹100 of payroll this index holds, how much goes to women?"
  - The reader moves a 0 to 100 slider, then sees the figure, how close they were in words, and "Play the workplace set".
  - It can be skipped in one tap, the choice is remembered on the device, and it never hides the number from a returning reader.
- **A `/play` page:** three feed items played in place, then two doors:
  - Spot the Stereotype: the anytime workplace set, and how to get a night.
  - Nivel's markets, once they are live.
- **A Play link** in the header menu and the footer.
- **The Method page** says the same figures are played in the game.
- **Until anytime play ships,** the links go to the game's home and the night sign-up.

### 6.2 In the game (proposed)
- **A deep link:** `/?play=work&from=nivel&item=<feed id>`. The `item` names the figure the reader just guessed in Nivel, so the set starts after it instead of repeating it.
- **After a Nivel figure's reveal:**
  - "See the companies behind this" goes to Nivel's index page.
  - "Take it further" goes to the market, once there is one.
- **At the end of every set, in every theme:** "Where this shows up at work" goes to Nivel's `/play`.

### 6.3 Counting without tracking
- **The game keeps counters only:**
  - arrivals per source per week, from `from=nivel`;
  - sets started and finished per week.
  - No ids, and no per-player times.
- **Nivel has no analytics.** Arrivals from the game are counted later by the markets' own counter (`from=spot`).
- **Use in the MIT Solve application:**
  - These counts are the reach claim.
  - Belief change is measured by the markets' before-and-after questions (PARITY-45).

## 7. Phases and tickets
| Phase | Target | The game (BIAS, proposed) | Nivel (PARITY) | Done when |
|---|---|---|---|---|
| 0. Agree | by 9 October | the owner reads this and settles section 8 | | the decisions are written into the game's knowledge |
| 1. The feed, and a taste in Nivel | by 16 October | | PARITY-52 feed v1, PARITY-53 `/play` and Guess first | eight items in the feed, and three played on `/play` |
| 2. The workplace theme on a night | by 23 October, for the Solve demo | pull the feed into a reviewed `nivel` bank; bring the workplace theme to ready | | a host can run a workplace night |
| 3. Anytime play pilot | November | anytime play; crowd counts and their rules; the draw rule for a set; copy on what is kept and on age | PARITY-53 links switch to anytime play | two themes playable, and the most dealt items past the floor |
| 4. Discussion in markets | when markets ship (PARITY-44) | "Take it further" on reveals | PARITY-54 | a Nivel item's market shows its twist cards as new information |
| 5. Crowd markets | after an abuse check | the abuse check on counts | PARITY-54, later part | the owner signs off |

**BIAS tickets, filed on 2 October 2026** in The Equal Lens's workspace under BIAS-40, each with this plan attached:
1. BIAS-41 Anytime play: one person, one phone, no host (sections 2.1 to 2.5).
2. BIAS-42 Crowd counts for anytime play (sections 2.4 and 2.8). Depends on BIAS-37, which deploys the rooms-go-dark rules.
3. BIAS-43 The draw rule for anytime play (sections 2.2 and 2.7; a whole-bank draw, decision 4).
4. BIAS-44 Pull Nivel's feed into a reviewed `nivel` bank (section 5.3). Depends on PARITY-52.
5. BIAS-45 Bring the workplace theme to ready (section 4).
6. BIAS-46 Arrivals from Nivel, and links back to Nivel (sections 6.2 and 6.3).
7. BIAS-47 A share card for anytime play (section 2.5).
8. BIAS-48 Copy for anytime play: what is kept, and adults only (sections 2.6 and 2.7).

## 8. Decisions for the game's owner

**Decided on 2 October 2026**, each put to the owner one at a time. The answers are recorded in the game's record, `knowledge/product/anytime.md` in the game's repository, which wins where this plan disagrees. Decisions 4, 5 and 6 went against the recommendation below.

1. **Anytime play exists, under that name, at `/?play=<theme>`.** Recommended: yes. **Decided: yes, as recommended.**
2. **What it keeps:** per-item counts indefinitely, and nothing about the player. Recommended: yes, with the line in section 2.6. **Decided: yes, with the line in section 2.6.**
3. **The crowd target leaves the player out, with a floor of 30.** Recommended: yes. **Decided: yes, with a floor of 30.**
4. **A weekly set before a draw from the whole bank.** Recommended: yes. **Decided: no, a draw from the whole bank from day one.**
5. **Heavy content:** heavy figures out of anytime play, and heavy rate lines in with rule 6. Recommended: yes. **Decided: everything in, heavy figures too, each opened with rule 6.**
6. **Nivel entries deal only once reviewed.** Recommended: yes. This is stricter than decision 1, for entries a machine wrote. **Decided: no, they deal once pulled; the review can still fix or cut them.**
7. **Database capacity before a public launch:** the Blaze plan with a second instance, or a separate store. Recommended: decide before phase 3. **Decided: chosen before any public link points at anytime play; until then it holds no open connection.**
8. **Counts of arrivals by source.** Recommended: yes, counts only. **Decided: yes, counts only.**
9. **The share card carries the anytime play link.** Recommended: yes. **Decided: yes.**
10. **Crowd counts as a market resolution source.** Recommended: not until an abuse check exists. **Decided: not until an abuse check exists.**
11. **Company-level Nivel items.** Recommended: not in v1. **Decided: not in v1.**

## 9. Risks and limits
- **Less talk, less change.** A night works because people who know each other argue.
  - Anytime play corrects a guess, but nobody argues back, and a market is a thinner kind of argument.
  - Claims stay at stated beliefs, measured in the markets (PARITY-45).
- **Stuffed counts.** Covered in section 2.4.
- **A crowd is not a survey.** Players choose to play, so every crowd share reads "players' answers, not a survey", never "what Indians think".
- **One shared database.** Covered in section 2.8: a shared connection limit, and one ruleset for three uses.
- **Nivel's own figures.** Covered in section 4.3.
- **Spoilers.** An item's answer can be shared or looked up. Nothing is at stake, so it costs only the player's own surprise. A whole-bank draw (decision 4) makes it less likely than a weekly set would have.
- **Stale figures.** Items carry their period and are retired on a refresh.
- **The game's own debts come first:**
  - the database rules are not deployed;
  - anonymous sign-in is not built;
  - the recognition test and the lyric check are still owed.
  - Anytime play should not ship before the rules are deployed.

## 10. Sources read
**From the spot-the-stereotype repository** (read only, 2 October 2026):
- `README.md`.
- `knowledge/build-spec.md` sections 1 to 3, 5, 6, 10 and 11.
- `knowledge/product/flows.md` sections 1, 2, 8 and 9.
- `formats.md`, `formats-full-night.md`, `content-pack.md` section 4, `setup-wizard.md` and `teams.md`.
- `sharing.md` sections 1, 3 and 4.
- `review-sixteen-players.md`.
- `banks/stats.md` sections 1 to 4, `banks/review.md`, and `banks/consistency.md` section 10.
- `human-checks/README.md` and `design-system/writing.md`.
- `src/game/themes.ts` and `src/game/banks/types.ts`.

**From Nivel:** `src/data/indexes.json` (data collected 1 October 2026), [nivel-play-and-markets.md](nivel-play-and-markets.md) and [mit-solve-application.md](mit-solve-application.md).
