"""Print the BRSR passages Nivel needs from an annual report or standalone BRSR PDF.

Usage: python3 ar_extract.py report.pdf [more.pdf ...]
For each file: women's share of wages (BRSR Core, Principle 5), the wage totals, permanent
employees and workers by gender (Section A), the board's composition, and the promoter
holding (for the public float). A person reads the passages and records the figures in
annual_reports.json; nothing is parsed into the data unread.
"""
import re
import subprocess
import sys

KEYS = [
    ('wage share', r'gross\s+wages\s+paid\s+to\s+(females?|women)\s+as\s+(a\s+)?%'),
    ('wages', r'gross\s+wages\s+paid\s+to\s+(females?|women)(?!\s+as)'),
    ('employees', r'employees\s+and\s+workers\s*\(including\s+differently'),
    ('permanent', r'\bpermanent\s*\(\s*[DF]\s*\)'),
    ('board', r'board\s+of\s+directors\s+\d+\s+\d+\s+[\d.]+\s*%?'),
    ('salaries', r'salaries,?\s+wages'),
    ('median', r'median\s+remuneration'),
    ('promoter', r'promoters?\s*(&|and)\s*promoter\s+group'),
]


def text_of(path):
    """Pages as (number, text), via poppler's pdftotext, which also reads files pypdf rejects."""
    raw = subprocess.run(['pdftotext', path, '-'], capture_output=True, text=True).stdout
    return [(i + 1, re.sub(r'\s+', ' ', t)) for i, t in enumerate(raw.split('\f'))]


for path in sys.argv[1:]:
    pages = text_of(path)
    print(f'== {path}: {len(pages)} pages')
    for label, pat in KEYS:
        hits = 0
        for n, t in pages:
            for m in re.finditer(pat, t, re.I):
                print(f'[{label} p{n}] {t[m.start():m.start() + 330]}')
                hits += 1
                if hits >= 2:
                    break
            if hits >= 2:
                break
        if not hits:
            print(f'[{label}] not found')
