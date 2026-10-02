"""Audited annual results (NSE XBRL) for a list of symbols: revenue, profit, equity, borrowings, finance costs, cash flow.

Usage: python3 fundamentals.py symbols.txt   (updates fin.json; caches lists and filings under fin/)
"""
import datetime as dt, json, os, re, subprocess, sys, time, urllib.parse

sys.path.insert(0, os.environ.get('XB_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'india')))
from xb import load  # noqa: E402

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
HERE = os.path.dirname(os.path.abspath(__file__))
FYS = range(2020, 2027)  # fiscal years ending 31 March 2020 to 2026

TAGS = {
    'revenue': ['RevenueFromOperations'],
    'income': ['Income', 'TotalIncome'],
    'interestEarned': ['InterestEarned'],
    'netProfit': ['ProfitLossForPeriod', 'ProfitLossForThePeriod', 'NetProfitLossForThePeriod', 'ProfitLossFromOrdinaryActivitiesAfterTax'],
    'profitOwners': ['ProfitOrLossAttributableToOwnersOfParent', 'ProfitLossAttributableToOwnersOfParent'],
    'pbt': ['ProfitBeforeTax', 'ProfitLossBeforeTax', 'ProfitLossFromOrdinaryActivitiesBeforeTax'],
    'financeCosts': ['FinanceCosts'],
    'equity': ['Equity', 'TotalEquity'],
    'equityOwners': ['EquityAttributableToOwnersOfParent'],
    'shareCapital': ['EquityShareCapital', 'Capital'],
    'otherEquity': ['OtherEquity', 'ReservesAndSurplus'],
    'borrowNC': ['BorrowingsNoncurrent', 'NoncurrentBorrowings'],
    'borrowC': ['BorrowingsCurrent', 'CurrentBorrowings'],
    'borrow': ['Borrowings'],
    'assets': ['Assets', 'TotalAssets'],
    'cfo': ['CashFlowsFromUsedInOperatingActivities'],
    'paidUp': ['PaidUpValueOfEquityShareCapital'],
    'reservesExRev': ['ReserveExcludingRevaluationReserves'],
}


def curl(url, path=None):
    args = ['curl', '-s', '-m', '60', '-A', UA]
    if path:
        args += ['-o', path]
    r = subprocess.run(args + [url], capture_output=True, text=not path)
    time.sleep(0.6)
    return r.stdout


def results_list(sym):
    p = f'{HERE}/fin/list/{sym}.json'
    if os.path.exists(p):
        return json.load(open(p))
    raw = curl(f'https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol={urllib.parse.quote(sym)}&period=Annual')
    try:
        d = json.loads(raw)
    except Exception:
        return None
    json.dump(d, open(p, 'w'))
    return d


def parse_date(s, fmt):
    try:
        return dt.datetime.strptime(s.strip(), fmt)
    except Exception:
        return None


def choose(lst):
    """Per fiscal year: the audited filing with XBRL, consolidated if filed, latest broadcast."""
    best = {}
    for x in lst or []:
        if not x.get('xbrl') or 'Audited' not in (x.get('audited') or '') or 'Un' in (x.get('audited') or ''):
            continue
        end = parse_date(x.get('toDate', ''), '%d-%b-%Y')
        if not end or end.month != 3:
            continue
        fy = end.year
        if fy not in FYS:
            continue
        cons = x.get('consolidated', '') == 'Consolidated'
        when = parse_date(x.get('broadCastDate', ''), '%d-%b-%Y %H:%M:%S') or dt.datetime(1900, 1, 1)
        key = (cons, when)
        if fy not in best or key > best[fy][0]:
            best[fy] = (key, x)
    return {fy: v[1] for fy, v in best.items()}


def extract(path, fy_end):
    """NSE result filings name contexts by convention: FourD is the year to date (the full year in an annual
    filing), OneD the latest quarter or, in annual-only filings, the year; OneI the year-end balance sheet. Some
    older filings use these ids without defining them, and the defined dates are unreliable, so ids decide."""
    ctx, facts = load(path)
    ids = {c for _, c, _, _, _ in facts}
    dur = 'FourD' if 'FourD' in ids else 'OneD'
    vals = {}
    for name, cid, unit, dec, v in facts:
        for key, names in TAGS.items():
            if name in names and key not in vals:
                inst = key in ('equity', 'equityOwners', 'shareCapital', 'otherEquity', 'borrowNC', 'borrowC', 'borrow', 'assets')
                if cid == ('OneI' if inst else dur):
                    try:
                        vals[key] = float(v)
                    except ValueError:
                        pass
    return vals


def main(symfile, outname='fin.json'):
    syms = [l.strip() for l in open(symfile) if l.strip()]
    os.makedirs(f'{HERE}/fin/list', exist_ok=True)
    os.makedirs(f'{HERE}/fin/x', exist_ok=True)
    out = json.load(open(f'{HERE}/{outname}')) if os.path.exists(f'{HERE}/{outname}') else {}
    for n, sym in enumerate(syms):
        if sym in out and out[sym].get('_done'):
            continue
        lst = results_list(sym)
        rec = {'_done': True}
        for fy, x in choose(lst).items():
            p = f'{HERE}/fin/x/{sym}_{fy}.xml'
            if not os.path.exists(p) or os.path.getsize(p) < 3000:
                curl(x['xbrl'], p)
            try:
                vals = extract(p, dt.date(fy, 3, 31))
            except Exception as e:
                vals = {'_error': str(e)[:80]}
            vals.update(consolidated=x.get('consolidated') == 'Consolidated', broadcast=x.get('broadCastDate'), bank=x.get('bank'))
            rec[str(fy)] = vals
        out[sym] = rec
        if n % 10 == 0:
            json.dump(out, open(f'{HERE}/{outname}', 'w'))
            print(n, sym, sorted(k for k in rec if k[0] != '_'), flush=True)
    json.dump(out, open(f'{HERE}/{outname}', 'w'))
    print('done', len(out))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'fin.json')
