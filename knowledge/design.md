---
type: design-system
title: Parity Tracker design system
description: Visual and writing rules for Parity Tracker, derived from The Equal Lens brand package (minimal register) plus a validated chart palette.
updated: 2026-10-01
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3ddee1dc-99b4-4f03-83c8-55cdf3f78b30
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

## 3. Type
- **Poppins** (400/500/600/700): headings, numbers, UI labels, table headers.
- **Nunito Sans** (400/600/700): body copy and table cells.
- Hero numbers use Poppins 600 with proportional figures. Tables use tabular figures.
- Headings are sentence case. Two-tone headlines use ink for the first half and `.accent` (violet) for the second.

## 4. Layout
- Max content width 1120px, 16px side gutter on phones, 24px from 720px up.
- Cards: white, 1px `--line` border, 12px radius, no shadow.
- Sections are separated by a 1px `--mist` rule and 40px spacing.

## 5. Components
- **Stat tile:** label (Poppins 500, 13px, `--soft`), value (Poppins 600, 32–44px, `--ink`), one line of context. Never a gauge or ring.
- **Change indicator:** arrow glyph plus signed percentage points (pp), in `--good` or `--bad`. Never colour alone. Flat (|change| < 0.05 pp) shows "no change" in `--muted`.
- **Data badge:** `Reported`, `Rescaled`, `Estimated` (sun-deep text on tint), `Basis changed`, `Missing`. Every number that is not cleanly reported carries one.
- **Status chip** (coverage map): `Live`, `Planned`, `Limited data`, with text labels, not colour alone.
- **Tables:** sortable headers (`aria-sort`), tabular figures, `--tint` header row, hairline row rules, a sticky first column on small screens.
- **Index card:** name, headline value, change since last year, sparkline, coverage line.

## 6. Charts
Validated with the dataviz `validate_palette.js` against `#FAF8F4`. All checks pass.
| Slot | Hex | Brand family |
|---|---|---|
| Series 1 | `#6A44A3` | violet |
| Series 2 | `#2F86C6` | sky |
| Series 3 | `#D2497F` | rose |

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
