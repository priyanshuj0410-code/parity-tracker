---
type: design-system
title: Nivel design system
description: Visual and writing rules for Nivel (formerly Parity Tracker), derived from The Equal Lens brand package (minimal register) plus a validated chart palette.
updated: 2026-10-02
plane_issues:
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ccb18646-56ef-40e7-8091-87a1a83f7f23
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/f8e47e59-45e2-4e07-a743-4773f2b04774
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/eb5a5943-61a5-4130-991f-afea4703a3b8
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b274889f-1235-4d52-b68c-2fb212171f8a
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/a6405009-0cea-40da-bea8-762ca3d76dbf
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/53ab2a60-d921-489a-b1f8-cb0bfff94455
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/ef865c0d-b01e-439d-b31e-d234bbcbbe82
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/4a6b2d55-5d5f-4713-848c-561e3e343184
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/3ddee1dc-99b4-4f03-83c8-55cdf3f78b30
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/5a065a68-b7a5-4d83-a44b-72136f487dad
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/46ef9975-81f3-4023-9779-f5c717132dc6
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/aa1e98d8-d58d-4a3e-8d0b-eccea0459975
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/b98b37f6-08c0-4d83-b520-c1833aba2285
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/407a23e9-92e6-433a-964d-89201b51fcd9
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/16062d26-a8a8-4072-9fa6-3be0a36b4e5e
  - https://app.plane.so/claude-pri/projects/00987666-dbc9-4caa-8c8d-004db87e6c11/issues/6b573de9-f46f-4610-8561-02b11b0e395d
---

# Nivel design system

The brand reads "Nivel" in the header next to the eQ mark, and "Nivel by The Equal Lens" in the install manifest.

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
| `--good-bg` / `--bad-bg` | `#E5F3EE` / `#FBEAE5` | Change-chip fills (dark: `#133227` / `#3A1D17`) |
| `--bad-ink` | `#A9442F` | Text on `--bad-bg` (5.1:1; `--bad` is only 3.9:1 there). Dark: `#FF8A6E` |
| `--dot-dim` | violet-grey at 28% | Context dots on the parity map (dark: 22%) |

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
- **Header (PARITY-17):** white and sticky, 64px. Left: the eQ mark (30px) and a two-line brand, "Nivel" (Poppins 600, 19px) over "by The Equal Lens" (10.5px, `--soft`). Then the main nav (Indexes, Companies, Compare, Method) as underline tabs. Right: global search (38px field, at most 340px, with a ⌘K hint) and the theme toggle as a borderless 40px icon button. No install button. Below 900px the header is 56px: brand on the left, a search icon and the theme toggle on the right, and the nav moves to the bottom tab bar.
- **Bottom tab bar (below 900px):** four items with 22px line icons and 11px labels: Indexes (chart), Companies (buildings), Compare (balance scale), Method (info). Fixed, white, hairline top border, padded for the home indicator (`safe-area-inset-bottom`). The active item is violet with `aria-current`.
- **Search sheet (below 900px):** the search icon opens a full-screen sheet: a 44px field (16px text, so iOS does not zoom) with a Cancel link, then up to 20 results as tall rows with logo or monogram. The page behind stops scrolling while it is open.
- **Page head:** breadcrumb, title (with a 52px logo tile on company pages), chips, then section tabs. The first section after the page head has no top rule.
- **Index strip:** a white bar under the header on every page, scrolling horizontally. Each item shows name, headline value and like-for-like change. The current index is highlighted with a tint.
- **Card grids** use `auto-fill`, so a market with one index keeps a normal-width card.

## 5. Components
- **Stat tile:** label (Poppins 500, 13px, `--soft`), value (Poppins 600, 32–44px, `--ink`), one line of context. Never a gauge or ring.
- **Change chip:** a filled triangle plus signed percentage points (pp) on a tinted chip, 12px Poppins 600, 6px radius: `--good` on `--good-bg` for rises, `--bad-ink` on `--bad-bg` for falls. Never colour alone. Flat (|change| < 0.05 pp) shows "no change" in `--soft` on `--tint`; missing shows "n/a" with no chip.
- **Data badge:** `Reported`, `Rescaled`, `Estimated` (sun-deep text on tint), `Basis changed`, `Missing`. Every number that is not cleanly reported carries one.
- **Status chip** (coverage map): `Live`, `Planned`, `Limited data`, with text labels, not colour alone.
- **Tables (data tables, `table.data`):**
  - 8px by 12px cells, tabular figures, `--tint` header row with 12px `--soft` labels; the sorted column's label turns `--ink`
  - sortable headers carry a two-triangle sort icon and `aria-sort`; the active direction is solid, the other faded
  - a bar above the table: row count on the left, a quiet "Download CSV" button on the right (exports the visible rows in the current sort)
  - optional rank column (`#`, muted, right-aligned) and a highlighted current row (tint fill plus a 3px violet inner left edge), used for peers
  - company cells: logo tile, name link, then ticker and market or industry as a muted sub-line
  - tables flow with the page: no inner scroll box. The header row stays pinned under the site header (`top: 64px`) while the page scrolls, with rounded outer corners on the first and last cells. Long headers wrap.
  - columns carry a priority: priority 2 hides below 1100px wide and priority 3 below 1000px (sparklines, sector, board), so a desktop table never scrolls sideways
  - **below 900px, lists become two-line rows** (PARITY-23, after testing on a Pixel 9). A header row inside the list (tint) holds the count and one dropdown that both chooses the figure and sorts by it, plus a direction button. Each row: the logo, then the name (Poppins 600, 15px, one line, ellipsis) over a muted subtitle that says only what the list does not already say (the sector; the market too when the list mixes markets). On the right, the figure for the chosen column (16px, tabular), so the visible numbers always run in sorted order and never need a per-row label. When the figure is share of pay, a small second line gives the 1-year change in coloured text. Sorting by name shows share of pay and says so in the header.
  - **row rules:** figures stay right-aligned in one column, so no pills beside them. An estimated figure gets a "≈" prefix with the reason in its tooltip; rescaled and basis-change flags live on the company page. When a second-line value is missing, the line is left out and the figure centres in the row, never a column of "n/a". Everything else lives on the company page or behind the Sort menu.
  - small reference tables (years, a sector breakdown, the markets list) keep detail cards instead: details in a two-column grid under a hairline, long text across both columns.
  - list bars carry a short count ("50 companies") with Sort and a direction button; explanations sit in the text above the table, and there is no CSV button on phones.
  - the Sort dropdown truncates its label so the direction button always stays on screen. Small tables (years, sectors, markets) drop the bar entirely.
  - every table goes through this component, including chart frames' table views and the markets table, so no table on a phone scrolls sideways
  - the whole row opens the company, with the name link kept for keyboard and screen-reader users
- **Meter (inline data bar):** the value, then a 52px by 6px `--line` track with a `--s1` fill and a 2px ink tick at parity. Employment parity and share of pay run 0–100% (tick at 50%); wage parity runs 0–140% (tick at 100%). Replaces bare percentages wherever a value has a parity point.
- **Tabs:** underline tabs for sections that have their own URL (company pages: Overview, Trend, Peers, Data and sources; Compare: Countries, Sectors, Parity map). 14px Poppins 500, `--soft`, active `--violet` with a 2px underline and `aria-current="page"`. They scroll sideways on phones.
- **Segmented control:** for switching views in place (Chart or Table, One map or By market, the measure). A `--tint` well with 3px padding; the selected option is a white raised pill. Buttons carry `aria-pressed`.
- **Chart frame:** every chart sits in a card with a title, a one-line subtitle and a Chart / Table segmented control at the top right, so every chart has a table view one click away. Extra controls (market pills) sit beside the toggle.
- **Scale card (company overview):** label, big value, the basis in one muted line, a parity track with its own scale (0%, parity, maximum), and the market percentile in violet ("Higher than 66% of companies in the UK").
- **Link card:** a card that is one link, with a title, one sentence and a violet "Open →".
- **Install popover (PARITY-18):** never a permanent button. Once per device, 8 seconds into the first visit where the browser can install the app (or on iOS Safari), a card appears bottom-right (above the tab bar on phones): the app icon, "Install Nivel", one line, and Install (or Show me how on iOS) plus Not now. It is marked seen as soon as it appears, so it never returns; after that a quiet "Install the app" link in the footer is the only route.
- **Dropdown (PARITY-19):** replaces native selects. A 32px pill button with an optional muted prefix ("Sort") and a chevron that flips when open; the menu is a card (12px radius, shadow) with 8px-radius options, `--tint` for the active option, violet text and a check for the selected one. Full keyboard support (arrows, Home, End, Enter, Escape) with listbox semantics.
- **Worked steps (PARITY-21, PARITY-22, reworked in PARITY-23):** calculations are numbered cards, never monospace blocks. The header row holds the number badge, the title and the result (20px, with a small label such as "Parity is 50%"), so the answer is visible before the working. The working is a derivation: the left-hand side, then each "= step" as its own unit, with real fractions and the final answer in violet. On desktop the steps run on one line; on phones each "= step" is its own line, so an operator never dangles at a line end and the answer never wraps alone. Reported inputs above the steps are small tiles: label, big value, a muted note.
- **Index card:** name, headline value, sparkline (right of the value), change since last year, parity track, coverage line.
- **Global search:**
  - combobox over every company and index, at most 8 results, monogram plus title plus "symbol · market"
  - opens with ⌘K, Ctrl+K or "/"; arrow keys, Enter and Esc work
- **Logo tile:** the company's own icon on a white rounded square (radius 26% of the size, 1px `--line` border, 2px padding), white in both themes so logos keep their colours. 30px in tables and search, 26px in compact lists, 52px in the company title. Icons smaller than 32px are drawn at half the tile size rather than stretched. Logos are trademarks shown only to identify the company; the footer and method page say so.
- **Monogram (fallback):** when a company has no logo, a tile of the same size and radius with two initials, skipping words like Ltd and Group. Tone is chosen by hashing the symbol across four brand tints:
  - `--tint` with violet
  - `#E6F1F9` with sky deep
  - `#FBE9F0` with rose deep
  - `#E5F3EE` with teal deep

  Indexes in search always use a monogram.
- **Sparkline:**
  - 1.75px line with an end dot, no axes, domain fitted to the data with 15% padding
  - coloured by direction from first to last point (`--good`, `--bad`, `--muted`)
  - always paired with an explicit number or table, never on its own
  - only reported values are plotted
- **Pill filters:** 999px radius, white with `--line` border; selected is violet fill with white text and `aria-pressed`. Used for index filters instead of selects. On phones, a filter group is one row that scrolls sideways rather than wrapping onto several lines.
- **Explainer disclosure:** definitions that every visitor does not need sit in a collapsed "What the numbers mean" disclosure (violet summary with a chevron) under the page lead, not as a paragraph above the controls.
- **Cross-market rule:** every headline is now women's share of pay with parity at 50% (Japan and the EU since PARITY-20), so index headlines can sit side by side. Rankings across markets still use the market percentile, and the basis is always stated nearby.

## 6. Charts
Validated with the dataviz `validate_palette.js` using `--pairs all`, because company charts show all three series at once.
- **Light, against `#FAF8F4`:** all checks pass.
- **Dark, against `#16111E`:** lightness, chroma, normal-vision separation (15.7) and contrast pass. Colour-blind separation is a WARN at 7.1, which is legal only because every chart also carries direct end labels, a legend and a table view. Never ship a dark chart without those.
| Slot | Light | Dark | Brand family |
|---|---|---|---|
| Series 1 | `#6A44A3` | `#9F78DD` | violet |
| Series 2 | `#2F86C6` | `#0BA0AD` | sky (cyan-shifted in dark to separate from violet) |
| Series 3 | `#D2497F` | `#DA5D8A` | rose |

- **Lines:** 2px with round joins. Markers 7px with a 2px card ring, growing to 11px at the hovered year. Estimated points are hollow.
- **Area wash:** single-series line charts get a vertical gradient under the line, series colour from 22% to 0%. Never on multi-series charts.
- **Gridlines:** at most four intervals. The step is the one of 0.5, 0.25 or 0.2 that gives 2–4 intervals with the lowest top, so a 0–50% axis shows 0, 25% and 50% only. The zero line is `--line`, the rest `--mist`. Axis labels drop the decimal on whole percentages.
- **Tooltip:** the year in bold, then one row per series: swatch, label, value, and the change from the previous reported point in good or bad text. It flips to the left of the crosshair past the chart's midpoint.
- **Range-dot plot (countries and sectors):** one row per group with the median as a 14px `--s1` dot with a card ring, the middle half of companies as a 10px `--s1` band at 28% opacity, and a parity tick. The median value sits in a right-hand column. Groups with fewer than three companies are listed as "too few", not plotted. A key explains dot, band and tick.
- **Parity map (scatter):** employment parity on x (0–100%, parity line at 50%) and wage parity on y (30–150%, parity line at 100%). The parity quadrant (top right) is tinted. Quadrant labels with counts sit in the corners with a card-coloured halo, drawn above the dots.
  - One hue only: highlighted companies are `--s1` dots (4.5px radius, 1.5px card ring); everything else is `--dot-dim` context. Markets are compared by highlighting one at a time or by facets ("By market", a 2×2 grid with shared axes), never by four hues: the dataviz all-pairs check caps scatter at three colours.
  - Values outside the axis are pinned to the edge and drawn hollow, and the page says how many.
  - Hover picks the nearest dot within 24px and shows a tooltip with logo, market, sector and all three measures; a click opens the company. A focused company (from its page's "See it on the parity map" link) gets an ink ring and a haloed name label.
  - The table view lists every plotted company with meters, rank and CSV export.
- **Bars:** at most 24px thick, 4px rounded data end, single hue (series 1) for magnitude.
- **Grid:** solid 1px `--mist`, never dashed.
- **Parity reference:** the 50% line is a solid 1px `--muted` rule, labelled at its left end so it never collides with the series end labels on the right.
- **Y axis:** shares run from 0 to 50% so distance to parity is visible. If any value exceeds 50%, the axis or bar scale extends to the next 10%, and the parity mark stays at 50%.
- **Markets:** each market keeps its own metric label (India: share of total wages; UK: share of hourly pay, UK staff), but all are shares of pay on a 0–50% axis with parity at 50%. Pay ratios (parity 100%) appear only as supporting figures, never as a market's headline.
- **Legends and labels:** a legend whenever there are two or more series, plus direct end labels. Text always uses text tokens, never series colours.
- **Hover:** a crosshair and tooltip on lines. Every chart also has a table view with the same numbers.

## 7. Voice (house rules)
- No em dashes. Use colons, commas and full stops. En dashes only for ranges.
- Bold leads a point. Numbers come with the finding attached.
- State limitations before the reader finds them. Show the unflattering rows: missing companies, estimated values, broken filings.
- This is not an ESG rating and not investment advice. Say so on the method page.
