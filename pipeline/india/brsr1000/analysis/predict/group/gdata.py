"""Dataset builders for the group-figure missing-company simulation. Everything is in percentage points (pp)."""
import sys
import site; sys.path.append(site.getusersitepackages())
import json, re, collections
import numpy as np

PANEL = '/Users/priyanshu/Thoth/knowledge/research/data/companies.json'
PARITY_NOTE = 'prior-year column'
PREVY = {'2023-24': '2022-23', '2024-25': '2023-24', '2022-23': '2021-22'}


class DS:
    """One universe of companies with last-year (s25) and truth-year (s26) shares in pp.
    wt  = weights used for the truth and for observed companies
    wf  = weights used for masked companies in the estimate (equal to wt when weights are treated as known)
    grp = integer industry group, prev = previous-year change (nan if unknown)"""
    def __init__(self, name, ids, s25, s26, wt, wf, grp_labels, prev=None, flags=None, extra=None):
        self.name = name
        self.ids = list(ids)
        self.s25 = np.asarray(s25, float)
        self.s26 = np.asarray(s26, float)
        self.wt = np.asarray(wt, float)
        self.wf = np.asarray(wf, float)
        labs = sorted(set(grp_labels))
        self.glabels = labs
        self.grp = np.array([labs.index(g) for g in grp_labels])
        self.G = len(labs)
        self.prev = np.full(len(self.ids), np.nan) if prev is None else np.asarray(prev, float)
        self.flags = flags or {}
        self.extra = extra or {}
        self.n = len(self.ids)
        b = self.flags.get('basis')
        self.fit_ok = ~np.asarray(b, bool) if b is not None else np.ones(self.n, bool)   # like-for-like companies: used to fit change rules

    def subset(self, keep, name=None):
        keep = np.asarray(keep, bool)
        labs = [self.glabels[g] for g in self.grp[keep]]
        d = DS(name or self.name, [i for i, k in zip(self.ids, keep) if k], self.s25[keep], self.s26[keep],
               self.wt[keep], self.wf[keep], labs, self.prev[keep],
               {k: np.asarray(v)[keep] for k, v in self.flags.items()}, dict(self.extra))
        return d

    def take(self, idx):
        idx = np.asarray(idx)
        labs = [self.glabels[g] for g in self.grp[idx]]
        ex = dict(self.extra)
        for k in ('w25', 'hc25'):
            if k in ex: ex[k] = np.asarray(ex[k])[idx]
        return DS(self.name, [self.ids[i] for i in idx], self.s25[idx], self.s26[idx], self.wt[idx], self.wf[idx], labs, self.prev[idx],
                  {k: np.asarray(v)[idx] for k, v in self.flags.items()}, ex)

    def truth(self):
        return (self.wt * self.s26).sum() / self.wt.sum()

    def last(self):
        return (self.wt * self.s25).sum() / self.wt.sum()

    def signal(self):
        return self.truth() - self.last()

    def lfl_signal(self):
        k = self.fit_ok
        w = self.wt[k]
        return float((w * (self.s26[k] - self.s25[k])).sum() / w.sum())


def load_panel():
    d = json.load(open(PANEL))
    return d


def fixed_weight(c, key_pay='payrollCr', key_hc='headcount', need_reported=True):
    """Payroll weight as in build_data.py: median payroll over FY2022-23..FY2025-26, years with Rs1.5 lakh to Rs75 lakh per head,
    reported years first, then any year with a payroll."""
    def plaus(v):
        return v.get('payrollCr') and v.get('headcount') and 1.5e5 <= v['payrollCr'] * 1e7 / v['headcount'] <= 7.5e6
    rep = sorted(v['payrollCr'] for y, v in c['years'].items() if y >= '2022-23' and v.get('wKind') == 'reported' and plaus(v))
    est = sorted(v['payrollCr'] for y, v in c['years'].items() if y >= '2022-23' and v.get('payrollCr'))
    pick = rep or est
    return (pick[len(pick) // 2], 'reported' if rep else 'estimated') if pick else (None, None)


def fixed_hc_weight(c, hk='permHeadcount'):
    xs = sorted(v[hk] for y, v in c['years'].items() if y >= '2022-23' and v.get(hk))
    return xs[len(xs) // 2] if xs else None


def plaus_pay(v):
    return bool(v and v.get('payrollCr') and v.get('headcount') and 1.5e5 <= v['payrollCr'] * 1e7 / v['headcount'] <= 7.5e6)


def panel_payroll(weights='fixed', no_basis=False, no_leak=False, name=None, y0='2024-25', y1='2025-26'):
    """Payroll figure: women's share of wages. Universe: reported w in FY2024-25 and FY2025-26 and a payroll weight."""
    d = load_panel()
    ids, s25, s26, wt, wf, grp, prev, basis, leak = [], [], [], [], [], [], [], [], []
    w25s, w26s = [], []
    excl = collections.Counter()
    for sym, c in d.items():
        y = c['years']
        a, b = y.get(y0), y.get(y1)
        if not a or not b:
            excl['no filing in one of the two years'] += 1; continue
        if a['wKind'] != 'reported' or b['wKind'] != 'reported' or a['w'] is None or b['w'] is None:
            excl['w not reported in both years'] += 1; continue
        fw, _ = fixed_weight(c)
        if not fw:
            excl['no payroll weight'] += 1; continue
        if a['w'] >= 0.9 or b['w'] >= 0.9:
            excl['implausible w >= 90% (data error)'] += 1; continue
        is_basis = bool(b.get('basisChange'))
        is_leak = PARITY_NOTE in (a.get('note') or '')
        if no_basis and is_basis:
            excl['basis change (LFL set)'] += 1; continue
        if no_leak and is_leak:
            excl['FY24-25 value from FY25-26 prior-year column'] += 1; continue
        ids.append(sym); s25.append(100 * a['w']); s26.append(100 * b['w'])
        p = y.get(PREVY.get(y0))
        prev.append(100 * (a['w'] - p['w']) if p and p['wKind'] == 'reported' and p['w'] is not None else np.nan)
        grp.append(c['industry']); basis.append(is_basis); leak.append(is_leak)
        w25s.append(a['payrollCr'] if plaus_pay(a) else fw); w26s.append(b['payrollCr'] if plaus_pay(b) else fw)
        wt.append(fw); wf.append(fw)
    ds = DS(name or 'panel-payroll', ids, s25, s26, wt, wf, grp, prev, dict(basis=basis, leak=leak),
            dict(excl=dict(excl), n_basis=int(sum(basis)), n_leak=int(sum(leak))))
    if weights == 'actual':
        w25 = np.array(w25s, float); w26 = np.array(w26s, float)
        ds.wt = w26.copy(); ds.wf = w25.copy()          # masked companies fall back to last year's payroll, rescaled below per simulation
        ds.extra['w25'] = w25
        ds.extra['scale_fill'] = True
        ds.name = (name or 'panel-payroll') + '-actualW'
    return ds


def panel_headcount(weights='fixed', name=None, y0='2024-25', y1='2025-26', kind='perm'):
    d = load_panel()
    ids, s25, s26, wt, wf, grp, prev, basis, leak = [], [], [], [], [], [], [], [], []
    h25, h26 = [], []
    excl = collections.Counter()
    for sym, c in d.items():
        y = c['years']
        a, b = y.get(y0), y.get(y1)
        if not a or not b:
            excl['no filing in one of the two years'] += 1; continue
        fk, hk = ('fPerm', 'permHeadcount') if kind == 'perm' else ('fAll', 'headcount')
        if a[fk] is None or b[fk] is None or not a[hk] or not b[hk]:
            excl['staff share missing in a year'] += 1; continue
        fw = fixed_hc_weight(c, hk)
        p = y.get(PREVY.get(y0))
        ids.append(sym); s25.append(100 * a[fk]); s26.append(100 * b[fk])
        prev.append(100 * (a[fk] - p[fk]) if p and p[fk] is not None else np.nan)
        grp.append(c['industry']); basis.append(bool(b.get('basisChange'))); leak.append(PARITY_NOTE in (a.get('note') or ''))
        wt.append(fw); wf.append(fw); h25.append(a[hk]); h26.append(b[hk])
    ds = DS(name or 'panel-headcount', ids, s25, s26, wt, wf, grp, prev, dict(basis=basis, leak=leak),
            dict(excl=dict(excl), n_basis=int(sum(basis)), n_leak=int(sum(leak))))
    if weights == 'actual':
        ds.wt = np.array(h26, float); ds.wf = np.array(h25, float); ds.extra['scale_fill'] = True
        ds.name = (name or 'panel-headcount') + '-actualW'
    return ds


# ---------------------------------------------------------------- brsr1000 (Kaggle last year, checked readings as truth)
def nic_group(code, activity):
    """Broad industry group from the first two digits of the NIC code (division); keyword fallback from the activity text."""
    div = None
    if code:
        s = re.sub(r'\D', '', str(code))
        if len(s) >= 2:
            div = int(s[:2])
    if div is not None and (div == 0 or div > 99):
        div = None
    if div is None and activity:
        a = activity.lower()
        for kw, g in (('bank', 'Finance & insurance'), ('financ', 'Finance & insurance'), ('insur', 'Finance & insurance'),
                      ('pharma', 'Chemicals & pharma'), ('chemical', 'Chemicals & pharma'), ('textile', 'Textiles, apparel & leather'),
                      ('garment', 'Textiles, apparel & leather'), ('power', 'Energy, mining & utilities'), ('oil', 'Energy, mining & utilities'),
                      ('real estate', 'Construction & real estate'), ('construction', 'Construction & real estate'),
                      ('retail', 'Trade, transport & logistics'), ('logistic', 'Trade, transport & logistics'),
                      ('software', 'Hospitality, media, IT & services'), ('education', 'Health, education & other services')):
            if kw in a:
                return g
        return 'Unclassified'
    if div is None:
        return 'Unclassified'
    if div <= 3 or 10 <= div <= 12: return 'Food, agri & beverages'
    if 13 <= div <= 15: return 'Textiles, apparel & leather'
    if div in (20, 21, 22, 19): return 'Chemicals & pharma'
    if 16 <= div <= 18 or 23 <= div <= 25 or 31 <= div <= 33: return 'Metals, minerals & other materials'
    if 26 <= div <= 30: return 'Machinery, electrical, electronics & vehicles'
    if 5 <= div <= 9 or 35 <= div <= 39: return 'Energy, mining & utilities'
    if 41 <= div <= 43 or div == 68: return 'Construction & real estate'
    if 45 <= div <= 53: return 'Trade, transport & logistics'
    if 55 <= div <= 63 or 69 <= div <= 82: return 'Hospitality, media, IT & services'
    if 64 <= div <= 66 or div == 99: return 'Finance & insurance'
    if 84 <= div <= 98: return 'Health, education & other services'
    return 'Unclassified'


def load_snapshot(path='snapshot.json'):
    return json.load(open(path))


def parser_ok(s, require_perm_check=True):
    """Filter for a Kaggle parser reading used as 'last year'. Returns (ok, reason)."""
    if not s: return False, 'no scan row'
    if not s.get('isBRSR'): return False, 'not BRSR'
    if s.get('fy') not in ('2024-25', '~2024-25'): return False, 'reporting year not FY2024-25'
    v = s.get('wageShare')
    if not isinstance(v, float): return False, 'wage share unread/absolute/missing'
    if not (0 < v <= 95): return False, 'wage share outside (0,95]'
    p = s.get('permanent')
    if require_perm_check and p and p.get('total'):
        if abs(v - 100 * p['women'] / p['total']) > 30: return False, 'wage share >30pp from permanent-women share'
    return True, 'ok'


def infer_wage_scale(wt, pe, unit):
    """Return rupee multiplier for wages_total. 'rupees' is trusted; otherwise pick the scale among rupee/lakh/crore that puts
    wages per permanent employee in Rs0.5 lakh to Rs1 crore; None if ambiguous or none fits."""
    if wt is None: return None
    if unit == 'rupees': return 1.0
    if not pe: return None
    fits = [sc for sc in (1.0, 1e5, 1e7) if 0.5e5 <= wt * sc / pe <= 1e7]
    return fits[0] if len(fits) == 1 else None


def brsr_payroll(snap, weights='mixed', last='kaggle', include_tilde=True, perm_check=True, name=None):
    """Payroll figure for the brsr1000 FY2025-26 companies.
    weights: 'mixed' = normalised wages_total where present else permanent headcount x median wage per head; 'headcount' = headcount only."""
    rows = [r for r in snap['rows']]
    excl = collections.Counter()
    # median wage per permanent employee (Rs) from companies with usable wages_total
    per_head = []
    scales = {}
    for r in rows:
        sc = infer_wage_scale(r['wages_total'], r['perm_emp_total'], r['wages_unit'])
        scales[r['key']] = sc
        if sc and r['perm_emp_total']:
            per_head.append(r['wages_total'] * sc / r['perm_emp_total'])
    m = float(np.median(per_head)) if per_head else np.nan
    ids, s25, s26, wt, wf, grp, wsp, kind, hc25 = [], [], [], [], [], [], [], [], []
    for r in rows:
        if r['wage_share_current'] is None:
            excl['no FY25-26 wage share'] += 1; continue
        s = r['scan']
        if last == 'kaggle':
            ok, why = parser_ok(s, perm_check)
            if ok and not include_tilde and s['fy'] != '2024-25': ok, why = False, 'tilde year excluded'
            if not ok:
                excl['Kaggle: ' + why] += 1; continue
            prior = s['wageShare']
        else:  # clean: the prior-year column printed in the FY2025-26 filing itself
            if r['wage_share_prior'] is None:
                excl['no prior-year column'] += 1; continue
            prior = r['wage_share_prior']
        hc = r['perm_emp_total']
        if not hc:
            excl['no permanent headcount (weight)'] += 1; continue
        sc = scales[r['key']]
        if weights == 'mixed' and sc:
            w = r['wages_total'] * sc / 1e7; k = 'payroll'
        elif weights == 'mixed':
            w = hc * m / 1e7; k = 'headcount'
        else:
            w = float(hc); k = 'headcount'
        ids.append(r['key']); s25.append(prior); s26.append(r['wage_share_current']); wt.append(w); wf.append(w)
        grp.append(nic_group(r['nic_code'], r['nic_activity'])); wsp.append(r['wage_share_prior'] if r['wage_share_prior'] is not None else np.nan)
        kind.append(k)
        sp = (s or {}).get('permanent') or {}
        hc25.append(sp.get('total') if sp.get('total') else np.nan)
    prev = []
    for r in rows:
        pass
    ds = DS(name or 'brsr-payroll', ids, s25, s26, wt, wf, grp, None, dict(wkind=kind),
            dict(excl=dict(excl), n_payroll_weight=int(sum(1 for k in kind if k == 'payroll')),
                 n_headcount_weight=int(sum(1 for k in kind if k == 'headcount')), per_head_rupees=m, wsp=np.array(wsp), hc25=np.array(hc25)))
    # previous-year change from the Kaggle pair (FY24-25 minus FY23-24), when available
    key2row = {r['key']: r for r in rows}
    pv = []
    for i in ids:
        s = key2row[i]['scan'] or {}
        b = s.get('wageShareBoth')
        pv.append(b[0] - b[1] if isinstance(b, list) and len(b) == 2 and last == 'kaggle' else np.nan)
    ds.prev = np.array(pv, float)
    return ds


def brsr_headcount(snap, weights='fixed', include_tilde=True, name=None):
    """Headcount figure: women's share of permanent employees. Last year = Kaggle scan permanent employees."""
    excl = collections.Counter()
    ids, s25, s26, wt, wf, grp = [], [], [], [], [], []
    for r in snap['rows']:
        s = r['scan']
        if not s or not s.get('isBRSR') or s.get('fy') not in ('2024-25', '~2024-25') or (not include_tilde and s['fy'] != '2024-25'):
            excl['Kaggle: not a FY2024-25 BRSR'] += 1; continue
        p = s.get('permanent')
        if not p or not p.get('total') or abs(p['men'] + p['women'] - p['total']) > 0.5 or p['total'] < 1:
            excl['Kaggle: permanent counts missing or inconsistent'] += 1; continue
        if not r['perm_emp_total'] or r['perm_emp_women'] is None:
            excl['no FY25-26 permanent counts'] += 1; continue
        ids.append(r['key']); s25.append(100 * p['women'] / p['total']); s26.append(100 * r['perm_emp_women'] / r['perm_emp_total'])
        wt.append(float(r['perm_emp_total'])); wf.append(float(r['perm_emp_total']) if weights == 'fixed' else float(p['total']))
        grp.append(nic_group(r['nic_code'], r['nic_activity']))
    ds = DS(name or 'brsr-headcount', ids, s25, s26, wt, wf, grp, None, {}, dict(excl=dict(excl)))
    if weights != 'fixed':
        ds.extra['scale_fill'] = True
        ds.name = (name or 'brsr-headcount') + '-actualW'
    return ds
