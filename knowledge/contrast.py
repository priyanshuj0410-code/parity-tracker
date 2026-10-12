#!/usr/bin/env python3
"""WCAG 2.x contrast and token checks for the Nivel design system.

The colours are read from src/styles.css (the light :root block and the
:root[data-theme="dark"] block), never retyped here, so a token that moves is
measured where it now is. Four groups of checks:

  1. Text: every text token is 4.5:1 on the paper, card and tint grounds, in both
     themes, and the accent text on the accent fill.
  2. Non-text: the pill edge, the field edge, the focus ring and the three chart
     series are 3:1 on every ground.
  3. The document: every hex in the token tables of knowledge/design.md equals
     the stylesheet's, and every ratio the document states (for example "6.1 on
     card") equals the computed one.
  4. The dash rule: no em dash and no en dash in the design document or in the
     app's source (the Spot feed's own dash detector is the one allowance).

Run from anywhere: python3 knowledge/contrast.py. Exits 1 on any failure. Fix
the token or the document, never the threshold.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "src/styles.css").read_text()
DOC = (ROOT / "knowledge/design.md").read_text()


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def lum(rgb):
    r, g, b = rgb
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


def ratio(fg, bg):
    hi, lo = max(lum(fg), lum(bg)), min(lum(fg), lum(bg))
    return (hi + 0.05) / (lo + 0.05)


def block(opening):
    start = CSS.index(opening)
    end = CSS.index("}", start)
    return CSS[start:end]


def hexes(text):
    return {m[1]: hex_rgb(m[2]) for m in re.finditer(r"(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b", text)}


LIGHT = hexes(block(":root {"))
DARK = hexes(block(':root[data-theme="dark"] {'))
THEMES = {"light": LIGHT, "dark": DARK}

count = [0, 0]
failed = []


def record(ok, line):
    count[0] += 1
    count[1] += ok
    print(("PASS  " if ok else "FAIL  ") + line)
    if not ok:
        failed.append(line)


def check(theme, label, fg, bg, target):
    t = THEMES[theme]
    r = ratio(t[fg], t[bg])
    shown = "#%02X%02X%02X" % t[fg]
    record(r >= target, f"{theme:5s} {label:46s} {shown} {r:5.2f}:1  (target {target})")


GROUNDS = ["--paper", "--card", "--tint"]
TEXT = ["--ink", "--body", "--soft", "--muted", "--violet", "--violet-deep", "--good", "--bad", "--sun-deep"]

for theme, t in THEMES.items():
    print(f"=== {theme.upper()}: TEXT (4.5:1) ===")
    for tok in TEXT:
        if tok not in t:
            continue
        for g in GROUNDS:
            check(theme, f"{tok} on {g}", tok, g, 4.5)
    check(theme, "--on-accent on --violet (pill, skip link)", "--on-accent", "--violet", 4.5)
    for n in ("m2", "m3", "m4"):
        check(theme, f"--{n}-fg on --{n}-bg (monogram)", f"--{n}-fg", f"--{n}-bg", 4.5)

    print(f"\n=== {theme.upper()}: NON-TEXT (3:1) ===")
    for g in GROUNDS:
        check(theme, f"--line-control (pill edge) on {g}", "--line-control", g, 3.0)
    check(theme, "--soft (field edge) on --card", "--soft", "--card", 3.0)
    for g in GROUNDS:
        check(theme, f"--violet (focus ring) on {g}", "--violet", g, 3.0)
    for s in ("--s1", "--s2", "--s3"):
        for g in GROUNDS:
            check(theme, f"{s} (chart series) on {g}", s, g, 3.0)
    print()

print("=== INFORMATIONAL (no target) ===")
for theme, t in THEMES.items():
    for g in GROUNDS:
        print(f"      {theme} --line (card and rule edge) on {g}  = {ratio(t['--line'], t[g]):.2f}")

print("\n=== THE DOCUMENT: token tables ===")


def rows_of(text):
    return [[c.strip() for c in line.strip().strip("|").split("|")] for line in text.splitlines() if line.startswith("| `--")]


dark_at = DOC.index("### Dark theme")
light_rows, dark_rows = rows_of(DOC[:dark_at]), rows_of(DOC[dark_at:])

documented = 0
for rows, theme, col in ((light_rows, "light", 1), (dark_rows, "dark", 1)):
    t = THEMES[theme]
    for cells in rows:
        names = re.findall(r"`(--[\w-]+)`", cells[0])
        values = re.findall(r"#[0-9A-Fa-f]{6}", cells[col])
        if not names or len(names) != len(values):
            continue
        for name, value in zip(names, values):
            if name == "--dot-dim":
                continue
            documented += 1
            have = "#%02X%02X%02X" % t[name] if name in t else None
            record(have == value.upper(), f"design.md ({theme}): {name} {value} is {have or 'not in the stylesheet'}")
record(documented >= 30, f"design.md documents {documented} hex tokens")

dot = re.search(r"--dot-dim:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)", block(":root {"))
dot_dark = re.search(r"--dot-dim:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)", block(':root[data-theme="dark"] {'))
row = next((c for c in light_rows + dark_rows if c[0] == "`--dot-dim`"), None)
if row is None:
    record(False, "design.md has no --dot-dim row in the token table")
else:
    for m, theme in ((dot, "light"), (dot_dark, "dark")):
        want = "#%02X%02X%02X" % tuple(int(x) for x in m.groups()[:3])
        pct = f"{round(float(m[4]) * 100)}%"
        record(want in row[1] + row[2] and pct in row[1] + row[2], f"design.md: --dot-dim ({theme}) is {want} at {pct}")

print("\n=== THE DOCUMENT: stated ratios ===")
for cells in light_rows:
    name = re.findall(r"`(--[\w-]+)`", cells[0])[0]
    if name not in LIGHT:
        continue
    for m in re.finditer(r"(\d+\.\d) on (card|paper|tint)", cells[-1]):
        ground = f"--{m[2]}"
        r = ratio(LIGHT[name], LIGHT[ground])
        record(f"{r:.1f}" == m[1], f"design.md (light): {name} on {ground} is {r:.2f}, states {m[1]}")
for cells in dark_rows:
    names = re.findall(r"`(--[\w-]+)`", cells[0])
    stated = re.findall(r"(?<![\w#.])(\d+\.\d)(?![\w.])", cells[2]) if len(cells) > 2 else []
    if len(names) != len(stated) and len(names) != 1:
        continue
    if len(names) == 1 and stated and names[0] in DARK and names[0] != "--paper" and names[0] != "--card":
        first = stated[0]
        ground = "--violet" if names[0] == "--on-accent" else "--paper"
        r = ratio(DARK[names[0]], DARK[ground])
        record(f"{r:.1f}" == first, f"design.md (dark): {names[0]} on {ground} is {r:.2f}, states {first}")
    elif len(names) == len(stated) == 2:
        for name, s in zip(names, stated):
            r = ratio(DARK[name], DARK["--paper"])
            record(f"{r:.1f}" == s, f"design.md (dark): {name} on --paper is {r:.2f}, states {s}")
for cells in dark_rows:
    names = re.findall(r"`(--[\w-]+)`", cells[0])
    if len(names) != 1 or names[0] not in DARK or len(cells) < 3:
        continue
    for m in re.finditer(r"\((\d+\.\d) on (card|paper|tint)\)", cells[2]):
        r = ratio(DARK[names[0]], DARK[f"--{m[2]}"])
        record(f"{r:.1f}" == m[1], f"design.md (dark): {names[0]} on --{m[2]} is {r:.2f}, states {m[1]}")
for m in re.finditer(r"`(#[0-9A-Fa-f]{6})`/`(#[0-9A-Fa-f]{6})`", DOC):
    r = ratio(hex_rgb(m[2]), hex_rgb(m[1]))
    record(r >= 7.4, f"design.md: monogram tint {m[1]}/{m[2]} is {r:.2f}, states at least 7.4")

print("\n=== THE DASH RULE ===")
DASHES = re.compile("[–—]")
ALLOWED = {"src/feeds/spot.ts"}
scanned = [ROOT / "knowledge/design.md", ROOT / "index.html"]
for folder in ("src", "api"):
    scanned += [p for p in (ROOT / folder).rglob("*") if p.is_file() and p.suffix in {".ts", ".tsx", ".css", ".js", ".mjs", ".html", ".json", ".svg"}]
bad = []
for path in scanned:
    rel = path.relative_to(ROOT).as_posix()
    if rel in ALLOWED or not path.exists():
        continue
    for n, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
        if DASHES.search(line):
            bad.append(f"{rel}:{n}")
record(not bad, f"no em or en dash in the design document or the app source ({len(scanned)} files){': ' + ', '.join(bad[:8]) if bad else ''}")

print(f"\n{count[1]} of {count[0]} checks pass")
if failed:
    print("SOME FAIL: fix the token or the document")
    sys.exit(1)
print("ALL PASS")
