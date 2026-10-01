---
type: review
title: Design audit against Kite, Coin and Groww (October 2026)
description: How Parity Tracker compares with the investing apps its audience uses daily, what was changed to close the gap, and what was deliberately not copied.
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/5a065a68-b7a5-4d83-a44b-72136f487dad
---

# Design audit: Parity Tracker next to Kite, Coin and Groww

## References used
- **Groww, live public pages:** index detail (`groww.in/indices/nifty`) and stock detail (`groww.in/stocks/tata-consultancy-services-ltd`), screenshotted on 2 October 2026.
- **Groww screener table:** from Lazyweb (`groww.in/stocks/intraday`). Lazyweb has no Zerodha screens.
- **Coin, public shell:** header with a centred ⌘K fund search, and a footer carrying regulatory registrations.
- **Kite:** its public conventions, since the app sits behind a login. A dense white UI, index values in the top bar, "/" to search, and tabular figures throughout.

Lazyweb coverage for Indian brokers is thin, so the Groww captures carry most of the comparison.

## What professional investing apps share
1. **Search is the main navigation.** It's a persistent field in the header with a keyboard shortcut (Groww and Coin ⌘K, Kite "/").
2. **The market is always on screen.** Kite keeps NIFTY 50 and SENSEX values visible; Groww leads every page with the index or stock value.
3. **The hero puts value and change together.** A large figure with a coloured signed change and its period ("−198.50 (0.88%) 1D").
4. **Lists carry trend at a glance.** Groww's screener puts a mini line chart in every row, with sortable columns and filter chips above the table.
5. **Rows are identifiable and clickable.** Logos anchor each row, the whole row opens the instrument, and headers stay visible on long lists.
6. **Restraint.** White surfaces, medium heading weights, one accent colour, green and red only for direction.
7. **Trust lines.** Data delay notices ("prices are delayed") and regulatory registrations in the footer.

## Scorecard
| Area | Reference pattern | Before | After |
|---|---|---|---|
| Search | Header search with ⌘K or "/" | None, only a directory filter | Global search across 675 companies and 7 indexes, ⌘K and "/", arrow keys and Enter |
| Market context | Index values always visible | Only on the home page | Index strip under the header on every page, with headline and like-for-like change, linking to each index |
| Hero | Value + coloured change + period | Already strong | Unchanged |
| Trend at a glance | Sparklines on cards and rows | Parity bar only | Sparklines on index cards and a Trend column in constituent tables, coloured by direction |
| Row identity | Logos | Text only | Monogram badges (initials on brand tints); real logos avoided for trademark reasons |
| Tables | Sticky headers, row click | Header scrolled away; only the name was a link | Sticky header inside a 72vh scroll area; the whole row opens the company |
| Filters | Chips | Dropdown | Pill filters for index |
| Navigation | Active-tab indicator | Colour change only | Underline on the active section; white sticky header |
| Typography | Medium weights | Poppins 700 headlines read heavy | Headlines at 600, slightly tighter tracking |
| Cross-market comparison | Not applicable to brokers | "All indexes" ranked companies across markets by non-comparable measures (BMW at 109.9% topped India's payroll shares) | Directory opens on one index; "All" sorts by name; the column is now "Headline measure" with a per-market unit hint |
| Layout bugs | Not applicable | Content flush against the header; single-index markets stretched one card across the page; "−0.0" in change labels | Fixed |

Screenshots: `assets/before-*.jpg` and `assets/after-*.jpg` (1280px), plus `assets/after-500px.jpg`. Headless Chrome cannot render below 500px, so narrower phones are still untested on a device.

## Deliberately not copied
- **Buy or trade calls to action, and promotional side rails.** This is not a trading app and must not read as investment advice.
- **Real-time tickers and period toggles (1D to 5Y).** The data is annual, with at most nine points per series. Toggles would promise a precision the data does not have.
- **A red and green heavy palette.** Direction colours are kept to change indicators and sparklines; the rest stays in the Equal Lens minimal register.
- **Company logos.** They are trademarks and add a licensing question. Monograms give row identity without one.

## Next, not yet done
- **Section tabs on company pages,** as Groww uses (Overview, Trend, Data and sources) to shorten long pages.
- **Compare view:** two companies or two indexes side by side within a market.
- **Dark mode:** done in PARITY-10. It follows the device setting, has a header toggle, and uses a validated dark chart palette. Screenshots are in `assets/dark-*.jpg`.
- **CSV export of index tables,** for researchers and journalists.
- **Device testing below 500px** on a real phone.
