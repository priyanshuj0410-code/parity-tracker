---
type: design-system
title: Parity Tracker design system
description: Visual and writing rules for Parity Tracker, derived from The Equal Lens brand package (minimal register) plus a validated chart palette.
updated: 2026-10-01
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3ddee1dc-99b4-4f03-83c8-55cdf3f78b30
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/5a065a68-b7a5-4d83-a44b-72136f487dad
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/46ef9975-81f3-4023-9779-f5c717132dc6
---

# Parity Tracker design system

Source: The Equal Lens brand package (`equal-lens` skill, `references/brand.md` and `voice.md`). Patterns were checked against references from Lazyweb: investing.com's major-indices table with sparklines, WSJ's leaders and laggards tables, and ESG Book's score dashboard. We copied the first two and rejected the third's circular gauges.

## 1. Register
**Minimal register.** The data is the hero.
- Warm paper background.
- A 34px eQ mark in the header corner.
- Hairline rules.
- Violet only in headings and the primary series.
- No mascot. Baloo 2 is not loaded.

## 2. Tokens
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FAF8F4` | Page background |
| `--card` | `#FFFFFF` | Card surface |
| `--ink` | `#221436` | Primary text, hero numbers |
| `--body` | `#574B70` | Running text |
| `--soft` | `#7F65A4` | Secondary text, captions |
| `--muted` | `#9286AE` | Tertiary labels, axis text |
| `--violet` | `#553286` | Headings, links, accent half of headlines |
| `--violet-deep` | `#42266B` | Hover on links and buttons |
| `--mist` | `#E7E0F1` | Hairline rules, chart gridlines |
| `--line` | `#E7DEF4` | Card borders |
| `--tint` | `#F4F0FA` | Chips, table header fill, selected row |
| `--good` | `#0F6E56` | Text for increases (teal deep) |
| `--bad` | `#C2553F` | Text for decreases (coral deep) |
| `--sun-deep` | `#B97F0E` | Estimated or flagged data labels |

### Dark theme (PARITY-10)
**Switching:**
- The theme follows the device (`prefers-color-scheme`) unless the header toggle sets `data-theme="light"` or `"dark"` on `<html>`.
- The choice persists in `localStorage` (`pt-theme`).
- A pre-paint script in `index.html` applies it before first render, so there's no flash.
- `?theme=dark` or `?theme=light` in the URL forces a theme, for screenshots and shared links.
- Dark mode uses the reversed (white) logo.

| Token | Dark value | WCAG on page (#16111E) |
|---|---|---|
| `--paper` | `#16111E` | page |
| `--card` | `#1F1829` | surface |
| `--ink` | `#F2EEF8` | 16.2 |
| `--body` | `#CEC5DD` | 11.2 |
| `--soft` | `#AA9CC6` | 7.3 |
| `--muted` | `#9B8FB4` | 6.2 (5.1 on tint) |
| `--violet` | `#C3A8F0` | 9.0 |
| `--mist` / `--line` / `--tint` | `#2C2339` / `#352B45` / `#2A2138` | rules, borders, fills |
| `--good` / `--bad` | `#4CC79A` / `#FF8A6E` | 8.8 / 8.0 |
| `--sun-deep` | `#F2C05C` | 11.0 |
| `--on-accent` | `#16111E` | text on violet pills (9.0) |

Monogram tints in dark mode are `#16304A`/`#8CC8EE`, `#3A1C2C`/`#F29BC2` and `#133227`/`#7FD9B5`, all at least 7.4 contrast. Shadows use `--shadow` (light: violet ink at 10%; dark: black at 45%).

## 3. Type
- **Poppins** (400/500/600/700): headings, numbers, UI labels, table headers.
- **Nunito Sans** (400/600/700): body copy and table cells.
- Hero numbers use Poppins 600 with proportional figures. Tables use tabular figures.
- Headings are sentence case. Two-tone headlines use ink for the first half and `.accent` (violet) for the second.
- Headings use Poppins 600, never 700, with −0.01em tracking: h1 26–36px, h2 20px. This matches the restrained weights of investing apps (audit 2026-10).

## 4. Layout
- Max content width 1120px, 16px side gutter on phones, 24px from 720px up.
- Cards: white, 1px `--line` border, 12px radius, no shadow.
- Sections are separated by a 1px `--mist` rule and 40px spacing.
- **Header:** white and sticky. Brand, then main nav (active item gets a 2px violet underline), then global search on the right. Below 720px, search goes full width and the nav takes its own row.
- **Index strip:** a white bar under the header on every page, scrolling horizontally. Each item shows name, headline value and like-for-like change. The current index is highlighted with a tint.
- **Card grids** use `auto-fill`, so a market with one index keeps a normal-width card.

## 5. Components
- **Stat tile:** label (Poppins 500, 13px, `--soft`), value (Poppins 600, 32–44px, `--ink`), one line of context. Never a gauge or ring.
- **Change indicator:** arrow glyph plus signed percentage points (pp), in `--good` or `--bad`. Never colour alone. Flat (|change| < 0.05 pp) shows "no change" in `--muted`.
- **Data badge:** `Reported`, `Rescaled`, `Estimated` (sun-deep text on tint), `Basis changed`, `Missing`. Every number that is not cleanly reported carries one.
- **Status chip** (coverage map): `Live`, `Planned`, `Limited data`, with text labels, not colour alone.
- **Tables:**
  - sortable headers (`aria-sort`), tabular figures, `--tint` header row, hairline row rules, a sticky first column on small screens
  - long lists sit in a 72vh scroll area with a sticky header
  - the whole row opens the company, with the name link kept for keyboard and screen-reader users
- **Index card:** name, headline value, sparkline (right of the value), change since last year, parity track, coverage line.
- **Global search:**
  - combobox over every company and index, at most 8 results, monogram plus title plus "symbol · market"
  - opens with ⌘K, Ctrl+K or "/"; arrow keys, Enter and Esc work
- **Monogram:** 30px circle (44px in page titles) with two initials, skipping words like Ltd and Group. Tone is chosen by hashing the symbol across four brand tints:
  - `--tint` with violet
  - `#E6F1F9` with sky deep
  - `#FBE9F0` with rose deep
  - `#E5F3EE` with teal deep

  Used instead of company logos, which are trademarks.
- **Sparkline:**
  - 1.75px line with an end dot, no axes, domain fitted to the data with 15% padding
  - coloured by direction from first to last point (`--good`, `--bad`, `--muted`)
  - always paired with an explicit number or table, never on its own
  - only reported values are plotted
- **Pill filters:** 999px radius, white with `--line` border; selected is violet fill with white text and `aria-pressed`. Used for index filters instead of selects.
- **Cross-market rule:** never sort or rank across markets by the headline measure. The directory opens on one index, "All indexes" sorts by name, and the headline column states its unit per row.

## 6. Charts
Validated with the dataviz `validate_palette.js` using `--pairs all`, because company charts show all three series at once.
- **Light, against `#FAF8F4`:** all checks pass.
- **Dark, against `#16111E`:** lightness, chroma, normal-vision separation (15.7) and contrast pass. Colour-blind separation is a WARN at 7.1, which is legal only because every chart also carries direct end labels, a legend and a table view. Never ship a dark chart without those.
| Slot | Light | Dark | Brand family |
|---|---|---|---|
| Series 1 | `#6A44A3` | `#9F78DD` | violet |
| Series 2 | `#2F86C6` | `#0BA0AD` | sky (cyan-shifted in dark to separate from violet) |
| Series 3 | `#D2497F` | `#DA5D8A` | rose |

- **Lines:** 2px with round joins. Markers 8px with a 2px paper ring. Estimated points are hollow.
- **Bars:** at most 24px thick, 4px rounded data end, single hue (series 1) for magnitude.
- **Grid:** solid 1px `--mist`, never dashed.
- **Parity reference:** the 50% line is a solid 1px `--muted` rule, labelled at its left end so it never collides with the series end labels on the right.
- **Y axis:** shares run from 0 to 50% so distance to parity is visible. If any value exceeds 50%, the axis or bar scale extends to the next 10%, and the parity mark stays at 50%.
- **Markets:** each market has its own metric label (India: share of total wages; UK: share of hourly pay, UK staff). Never compare across markets in one chart.
- **Legends and labels:** a legend whenever there are two or more series, plus direct end labels. Text always uses text tokens, never series colours.
- **Hover:** a crosshair and tooltip on lines. Every chart also has a table view with the same numbers.

## 7. Voice (house rules)
- No em dashes. Use colons, commas and full stops. En dashes only for ranges.
- Bold leads a point. Numbers come with the finding attached.
- State limitations before the reader finds them. Show the unflattering rows: missing companies, estimated values, broken filings.
- This is not an ESG rating and not investment advice. Say so on the method page.
