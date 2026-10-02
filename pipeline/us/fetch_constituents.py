"""S&P 500 constituents with SEC CIKs, from Wikipedia's maintained list. Writes constituents.json.

The Dow 30 is kept by hand in djia.txt (it changes rarely); every Dow member is also in the S&P 500.
"""
import html
import json
import re
import urllib.request

URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'


def cells(row):
    return [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.S)]


def main():
    req = urllib.request.Request(URL, headers={'User-Agent': 'Nivel research (The Equal Lens)'})
    page = urllib.request.urlopen(req, timeout=60).read().decode()
    table = page[page.index('id="constituents"'):]
    table = table[:table.index('</table>')]
    rows = [cells(r) for r in re.findall(r'<tr[^>]*>(.*?)</tr>', table, re.S)[1:]]
    sp500 = [{'symbol': c[0], 'name': c[1], 'sector': c[2], 'industry': c[3], 'cik': c[6]} for c in rows if len(c) >= 7]
    djia = [l.strip() for l in open('djia.txt') if l.strip()]
    missing = [s for s in djia if s not in {x['symbol'] for x in sp500}]
    if missing:
        raise SystemExit(f'Dow members missing from the S&P 500 list: {missing}')
    json.dump({'source': URL, 'sp500': sp500, 'djia': djia}, open('constituents.json', 'w'), indent=1)
    print(f'{len(sp500)} S&P 500 constituents, {len(djia)} Dow members')


if __name__ == '__main__':
    main()
