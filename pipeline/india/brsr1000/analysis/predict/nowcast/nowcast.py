"""Nowcast feasibility study for Nivel. Run:  python3 -I nowcast.py [--refresh]
Reads only the frozen snapshot in data/analysis/predict/nowcast/snap (made by snapshot.py from the live read-only sources).
Writes report.txt and results.json to data/analysis/predict/nowcast/out."""
import sys, os, json, re, math, collections, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import site; sys.path.append(site.getusersitepackages())  # numpy lives in the user site; -I drops it
import numpy as np
from nowcast_lib import *           # noqa
from nowcast_lib import _ridge_pick, _ridge_fit, _lad_fit

WORK = os.path.join(HERE, '..', '..', '..', 'data', 'analysis', 'predict', 'nowcast')  # frozen inputs and outputs, git-ignored
SNAP = os.path.join(WORK, 'snap'); OUT = os.path.join(WORK, 'out'); os.makedirs(OUT, exist_ok=True)
REPORT = []
def P(*a):
    s = ' '.join(str(x) for x in a)
    print(s); REPORT.append(s)

# ============================================================================ build test set A
def nic2(code):
    if not code: return None
    m = re.findall(r'\d+', str(code))
    if not m or len(m[0]) < 2: return None
    return m[0][:2]

def nic_group(d2):
    if d2 is None: return 'unknown'
    n = int(d2)
    if n <= 9: return 'agri_mining'
    if n <= 12: return 'food_bev'
    if n <= 18: return 'textile_wood_paper'
    if n in (19, 20, 22): return 'chem_petro_rubber'
    if n == 21: return 'pharma'
    if n <= 25: return 'minerals_metals'
    if n <= 30: return 'machinery_auto_elec'
    if n <= 33: return 'other_mfg'
    if n <= 43: return 'utilities_construction'
    if n <= 56: return 'trade_transport_hospitality'
    if n <= 63: return 'ict_media'
    if n <= 66: return 'finance'
    return 'services_other'

def finalize(recs, min_grp=6):
    """strings -> ints; coarse groups with fewer than min_grp companies merge into 'other_small'."""
    if not recs: return None
    cids = {}; inds = {}
    for r in recs:
        r['cid'] = cids.setdefault(r['key'], len(cids))
    cnt = collections.Counter(); seen = set()
    for r in recs:
        if (r['key']) not in seen: seen.add(r['key']); cnt[r['grp_l']] += 1
    for r in recs:
        if cnt[r['grp_l']] < min_grp: r['grp_l'] = 'other_small'
    gl = {}; il = {}; yl = {}
    for r in recs:
        r['ind'] = il.setdefault(r['ind_l'], len(il))
        r['grp'] = gl.setdefault(r['grp_l'], len(gl))
        r['yr'] = r['yr_l']
    return Data(recs)

def build_A():
    db = json.load(open(os.path.join(SNAP, 'db.json')))
    scan = {x['file']: x for x in json.load(open(os.path.join(SNAP, 'scan.json')))}
    comp = {c['key']: c for c in db['companies']}
    rd = [r for r in db['readings'] if r['fy'] == '2025-26']
    allperm = [math.log(s['permanent']['total']) for s in scan.values() if s.get('permanent') and s['permanent'].get('total', 0) > 0]
    med_ls = float(np.median(allperm))
    T = ['wage', 'perm', 'board', 'kmp', 'turn', 'turnL']
    recs = {t: [] for t in T}; drops = {t: collections.Counter() for t in T}
    n_base = collections.Counter()
    isnum = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    for r in rd:
        c = comp[r['key']]; s = scan.get(c['kaggle_file'])
        if s is None:
            for t in T: drops[t]['no matching scan row'] += 1
            continue
        if s['fy'] not in ('2024-25', '~2024-25'):
            n_base['baseline not FY2024-25 (scan fy=%s)' % s['fy']] += 1
            for t in T: drops[t]['scan reporting year is not FY2024-25 (%s)' % s['fy']] += 1
            continue
        n_base['ok'] += 1
        perm = s.get('permanent')
        ls = math.log(perm['total']) if perm and perm.get('total', 0) > 0 else med_ls
        d2 = nic2(r['nic_code'])
        base = dict(key=r['key'], ind_l=d2 or 'NA', grp_l=nic_group(d2), yr_l=0, ls=ls)
        hc_ratio = (r['perm_emp_total'] / perm['total']) if (perm and perm.get('total', 0) > 0 and r['perm_emp_total']) else None
        base['basis'] = bool(hc_ratio is not None and not (0.6 <= hc_ratio <= 1.6))
        # ---- wage share (pp)
        sw, both = s.get('wageShare'), s.get('wageShareBoth')
        cur, pri = r['wage_share_current'], r['wage_share_prior']
        if not isnum(sw): drops['wage']['scan wage share missing / unread / absolute'] += 1
        elif not (0 <= sw <= 100): drops['wage']['scan wage share outside 0-100'] += 1
        elif cur is None: drops['wage']['checked FY2025-26 wage share missing'] += 1
        elif not (0 <= cur <= 100): drops['wage']['checked FY2025-26 wage share outside 0-100'] += 1
        else:
            dl = float('nan')
            if isinstance(both, list) and len(both) == 2 and isnum(both[1]) and abs(both[0] - sw) < 0.011 and 0 <= both[1] <= 100:
                dl = sw - both[1]
            rec = dict(base, y0=sw, y1=cur, dl=dl, ld=ls)
            rec['misread'] = bool(pri is not None and abs(sw - pri) > 5)
            rec['prior_gap'] = (sw - pri) if pri is not None else None
            recs['wage'].append(rec)
        # ---- permanent employees
        pe_ok = perm and perm.get('total', 0) > 0 and 0 <= perm['women'] <= perm['total'] and abs(perm['men'] + perm['women'] - perm['total']) <= 0.5
        pt, pw, pm = r['perm_emp_total'], r['perm_emp_women'], r['perm_emp_men']
        if not perm: drops['perm']['scan permanent-employee table missing'] += 1
        elif not pe_ok: drops['perm']['scan permanent counts inconsistent (men+women != total)'] += 1
        elif not pt or pw is None: drops['perm']['checked FY2025-26 permanent employees missing'] += 1
        elif not (0 <= pw <= pt and (pm is None or abs(pm + pw - pt) <= 0.5)): drops['perm']['checked FY2025-26 permanent counts inconsistent'] += 1
        else:
            recs['perm'].append(dict(base, y0=100 * perm['women'] / perm['total'], y1=100 * pw / pt, dl=float('nan'), ld=ls))
        # ---- board
        b = (s.get('women') or {}).get('board')
        bt, bw = r['board_total'], r['board_women']
        if not b: drops['board']['scan board table missing'] += 1
        elif not (3 <= b['total'] <= 25 and 0 <= b['women'] <= b['total']): drops['board']['scan board counts implausible (total outside 3-25 or women>total)'] += 1
        elif not bt or bw is None: drops['board']['checked FY2025-26 board missing'] += 1
        elif not (3 <= bt <= 25 and 0 <= bw <= bt): drops['board']['checked FY2025-26 board implausible'] += 1
        else:
            recs['board'].append(dict(base, y0=100 * b['women'] / b['total'], y1=100 * bw / bt, dl=float('nan'), ld=math.log(b['total'])))
        # ---- KMP
        k = (s.get('women') or {}).get('kmp')
        kt, kw = r['kmp_total'], r['kmp_women']
        if not k: drops['kmp']['scan KMP table missing'] += 1
        elif not (1 <= k['total'] <= 15 and 0 <= k['women'] <= k['total']): drops['kmp']['scan KMP counts implausible (total outside 1-15 or women>total)'] += 1
        elif not kt or kw is None: drops['kmp']['checked FY2025-26 KMP missing'] += 1
        elif not (1 <= kt <= 15 and 0 <= kw <= kt): drops['kmp']['checked FY2025-26 KMP implausible'] += 1
        else:
            recs['kmp'].append(dict(base, y0=100 * k['women'] / k['total'], y1=100 * kw / kt, dl=float('nan'), ld=math.log(k['total'])))
        # ---- women's turnover rate
        tv = s.get('turnover')
        def tov_ok(w, m, t):
            if w is None or m is None or t is None: return False
            if not (0 <= w <= 100 and 0 <= m <= 100 and 0 <= t <= 100): return False
            return min(w, m) - 0.5 <= t <= max(w, m) + 0.5
        if not tv or tv.get('women') is None: drops['turn']['scan turnover table missing'] += 1
        elif not tov_ok(tv['women'], tv.get('men'), tv.get('total')): drops['turn']['scan turnover implausible/inconsistent (outside 0-100 or total not between men and women)'] += 1
        elif r['turnover_women'] is None: drops['turn']['checked FY2025-26 turnover missing'] += 1
        elif not tov_ok(r['turnover_women'], r['turnover_men'], r['turnover_total']): drops['turn']['checked FY2025-26 turnover implausible/inconsistent'] += 1
        else:
            rec = dict(base, y0=tv['women'], y1=r['turnover_women'], dl=float('nan'), ld=ls)
            rec['zero'] = (tv['women'] == 0 or r['turnover_women'] == 0)
            recs['turn'].append(rec)
        # looser turnover filter (sensitivity): only require women's rate within 0-100 in both sources
        if tv and tv.get('women') is not None and r['turnover_women'] is not None and 0 <= tv['women'] <= 100 and 0 <= r['turnover_women'] <= 100:
            rec = dict(base, y0=tv['women'], y1=r['turnover_women'], dl=float('nan'), ld=ls)
            rec['zero'] = (tv['women'] == 0 or r['turnover_women'] == 0)
            recs['turnL'].append(rec)
    return {t: finalize(recs[t]) for t in T}, recs, drops, n_base

# ============================================================================ build test set B
FYS = ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26']
def build_B():
    Pn = json.load(open(os.path.join(SNAP, 'panel.json')))
    hcs = [math.log(y['headcount']) for p in Pn.values() for y in p['years'].values() if y.get('headcount')]
    med_ls = float(np.median(hcs))
    cnt = collections.Counter(p['industry'] for p in Pn.values())
    def val(y, t):
        if y is None: return None
        if t == 'w':
            return y['w'] * 100 if (y.get('wKind') == 'reported' and y.get('w') is not None and 0 <= y['w'] <= 0.6) else None
        if t in ('fPerm', 'fAll'):
            v = y.get(t)
            return v * 100 if (v is not None and 0 <= v <= 1) else None
        if t == 'board':
            b, bw = y.get('board'), y.get('boardWomen')
            return 100 * bw / b if (b and 3 <= b <= 25 and bw is not None and 0 <= bw <= b) else None
    T = ['w', 'fPerm', 'board', 'fAll']
    recs = {t: [] for t in T}; drops = {t: collections.Counter() for t in T}
    for sym, p in Pn.items():
        for ia in range(1, 4):
            a, b = FYS[ia], FYS[ia + 1]
            ya, yb = p['years'].get(a), p['years'].get(b)
            for t in T:
                if not ya or not yb: drops[t]['year missing in panel'] += 1; continue
                va, vb = val(ya, t), val(yb, t)
                if va is None or vb is None:
                    drops[t]['value missing, estimated (not reported) or implausible'] += 1; continue
                vp = val(p['years'].get(FYS[ia - 1]), t)
                hc = ya.get('headcount') or ya.get('permHeadcount')
                ls = math.log(hc) if hc else med_ls
                ld = ls
                if t == 'board': ld = math.log(ya['board'])
                prior = ('prior-year column' in (ya.get('note') or '')) or ('prior-year column' in (yb.get('note') or ''))
                recs[t].append(dict(key=sym, ind_l=p['industry'], grp_l=p['industry'], yr_l=ia - 1, y0=va, y1=vb,
                                    dl=(va - vp) if vp is not None else float('nan'), ls=ls, ld=ld,
                                    basis=bool(yb.get('basisChange')), prior=(prior if t == 'w' else False), last=(b == '2025-26')))
    return {t: finalize(recs[t], min_grp=5) for t in T}, recs, drops

# ============================================================================ analysis of one dataset
def fmt(x, nd=2): return 'nan' if x is None or (isinstance(x, float) and math.isnan(x)) else ('%.*f' % (nd, x))

def history_wage(Dw, db, scan, comp, rd):
    """Supplementary: learn the change dynamics from ~900 OTHER scanned companies' FY2023-24 -> FY2024-25 change (both columns of the
    FY2024-25 report), then apply to the test-set companies' FY2024-25 -> FY2025-26 step. Out-of-time and out-of-company."""
    isnum = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    test_files = {comp[r['key']]['kaggle_file'] for r in rd}
    allp = [math.log(x['permanent']['total']) for x in scan.values() if x.get('permanent') and x['permanent'].get('total', 0) > 0]
    med = float(np.median(allp))
    rows = []
    for x in scan.values():
        if x['file'] in test_files or x.get('fy') not in ('2024-25', '~2024-25'): continue
        sw, both = x.get('wageShare'), x.get('wageShareBoth')
        if not (isnum(sw) and 0 <= sw <= 100 and isinstance(both, list) and len(both) == 2 and isnum(both[1]) and 0 <= both[1] <= 100 and abs(both[0] - sw) < 0.011): continue
        pm = x.get('permanent'); ls = math.log(pm['total']) if pm and pm.get('total', 0) > 0 else med
        rows.append((both[1], sw, ls))
    R = np.array(rows); y0, y1, ls = R[:, 0], R[:, 1], R[:, 2]; d = y1 - y0
    out = dict(n_train=int(len(R)), train_mean_change=float(d.mean()), train_median_change=float(np.median(d)), train_mean_abs=float(np.abs(d).mean()),
               train_se=float(d.std(ddof=1) / math.sqrt(len(d))))
    # test: the same step on the nowcast set
    te_d = Dw.d; te_y0 = Dw.y0; te_ls = Dw.ls
    X = np.column_stack([y0, ls]); mu = X.mean(0); sd = X.std(0)
    Xs = (X - mu) / sd; Xt = (np.column_stack([te_y0, te_ls]) - mu) / sd
    preds = {'persistence': np.zeros(Dw.n), 'persist+train median change': np.full(Dw.n, np.median(d)), 'persist+train mean change': np.full(Dw.n, d.mean())}
    lam = _ridge_pick(Xs, d)
    b0, b = _ridge_fit(Xs, d, lam); preds['ridge(level,size)'] = b0 + Xt @ b
    b0, b = _lad_fit(Xs, d, lam); preds['LAD(level,size)'] = b0 + Xt @ b
    out['coef_ridge_level_size_standardized'] = [float(v) for v in _ridge_fit(Xs, d, lam)[1]]
    err = {k: np.abs(te_d - v) for k, v in preds.items()}
    out['test_n'] = int(Dw.n)
    out['test'] = {}
    for k in preds:
        bd = boot_diff(Dw.cid, err['persistence'], err[k]) if k != 'persistence' else None
        out['test'][k] = dict(mae=float(err[k].mean()), rel=(bd['rel'] if bd else 0.0), rel_ci=(bd['rel_ci'] if bd else (0.0, 0.0)))
    out['test_mean_change'] = float(te_d.mean()); out['test_median_change'] = float(np.median(te_d))
    P('\nSUPPLEMENT: wage share nowcast with dynamics learned on %d other scanned companies (FY2023-24 -> FY2024-25 change, both columns of the FY2024-25 report)' % len(R))
    P('  train change: mean %+.2f (SE %.2f) median %+.2f | test (FY2024-25 -> FY2025-26) change: mean %+.2f median %+.2f' % (out['train_mean_change'], out['train_se'], out['train_median_change'], out['test_mean_change'], out['test_median_change']))
    for k, v in out['test'].items():
        P('  %-30s test MAE %.3f  vs persistence %+.1f%% [%.1f%%, %.1f%%]' % (k, v['mae'], 100 * v['rel'], 100 * v['rel_ci'][0], 100 * v['rel_ci'][1]))
    P('  standardized ridge coefficients (level, size):', [round(v, 3) for v in out['coef_ridge_level_size_standardized']])
    return out

def analyze(title, D, mask, submasks, R=20, forward=False, verbose=True):
    t0 = time.time()
    names = model_names(D)
    res = dict(title=title, n=int(mask.sum()), n_all_pairs=int(D.n), companies=int(len(np.unique(D.cid[mask]))))
    y1m = D.y1[mask]
    res['spread'] = dict(sd=float(y1m.std(ddof=1)), iqr=float(np.percentile(y1m, 75) - np.percentile(y1m, 25)), mean=float(y1m.mean()),
                         sd_change=float(D.d[mask].std(ddof=1)))
    res['persistence'] = describe_persistence(D.d[mask])
    ml = mask & D.flags['last']
    if D.flags['last'].any() and ml.sum() >= 20: res['persistence_last'] = describe_persistence(D.d[ml])
    preds, folds = oof_repeated(D, names, K=5, R=R, seed=1)
    err = {m: np.abs(D.d[None, :] - preds[m]).mean(0) for m in names}
    sq = {m: ((D.d[None, :] - preds[m]) ** 2).mean(0) for m in names}
    tab = {}
    for m in names:
        bd = boot_diff(D.cid, err['persistence'], err[m], mask=mask) if m != 'persistence' else None
        tab[m] = dict(mae=float(err[m][mask].mean()), medae=float(np.median(err[m][mask])), rmse=float(math.sqrt(sq[m][mask].mean())),
                      rel=(bd['rel'] if bd else 0.0), rel_ci=(bd['rel_ci'] if bd else (0.0, 0.0)), diff=(bd['diff'] if bd else 0.0))
    res['models'] = tab
    cand = [m for m in names if m != 'persistence']
    best = min(cand, key=lambda m: tab[m]['mae'])           # best non-persistence candidate (used for intervals and subsets)
    res['best_fixed'] = best
    res['best_overall'] = best if tab[best]['mae'] < tab['persistence']['mae'] else 'persistence'
    mk = mask
    def corr(a, b):
        ok = ~(np.isnan(a) | np.isnan(b))
        return (float(np.corrcoef(a[ok], b[ok])[0, 1]), int(ok.sum())) if ok.sum() >= 10 else (None, int(ok.sum()))
    res['diag'] = dict(corr_level_change=corr(D.y0[mk], D.d[mk]), corr_lastchange_change=corr(D.dl[mk], D.d[mk]),
                       share_up=float(np.mean(D.d[mk] > 0.005)), share_down=float(np.mean(D.d[mk] < -0.005)))
    if D.nyr > 1:
        res['by_pair_year'] = {int(u): dict(n=int(np.sum(mk & (D.yr == u))), mean=float(D.d[mk & (D.yr == u)].mean()), median=float(np.median(D.d[mk & (D.yr == u)])),
                                            persistence_mae=float(np.abs(D.d[mk & (D.yr == u)]).mean())) for u in D.yrs if np.sum(mk & (D.yr == u)) >= 10}
    # nested auto selection
    pa, chosen = auto_nested(D, names, mask, K=5, R=10, seed=7)
    err_auto = np.abs(D.d[None, :] - pa).mean(0)
    # persistence error for the same set is err['persistence'] (deterministic)
    bd = boot_diff(D.cid, err['persistence'], err_auto, mask=mask)
    res['auto'] = dict(mae=float(err_auto[mask].mean()), rel=bd['rel'], rel_ci=bd['rel_ci'], diff_ci=bd['diff_ci'], chosen={k: v for k, v in chosen.items() if v})
    # leave-one-company-out check
    loo = oof_loo(D, names)
    res['loo'] = {m: float(np.abs(D.d - loo[m])[mask].mean()) for m in names}
    # intervals
    res['intervals'] = {'persistence': conformal_eval(D, 'persistence', mask), best: conformal_eval(D, best, mask)}
    # aggregate error (a missing cell's average change)
    ag = {}
    for m in ('persistence', best, 'persist+mean(year)' if 'persist+mean(year)' in names else 'persist+mean(pooled)'):
        v, ncell = agg_error(D, preds[m], folds, mask)
        ag[m] = v
    res['aggregate'] = dict(err=ag, cells=ncell)
    # by size tercile (log headcount at the earlier year)
    q = np.percentile(D.ls[mask], [33.3, 66.7]); terc = {}
    for lab, lo, hi in (('small', -np.inf, q[0]), ('mid', q[0], q[1]), ('large', q[1], np.inf)):
        mm = mask & (D.ls > lo) & (D.ls <= hi)
        if mm.sum() >= 10:
            terc[lab] = dict(n=int(mm.sum()), persistence=float(err['persistence'][mm].mean()), best=float(err[best][mm].mean()),
                             persistence_q80=float(np.percentile(np.abs(D.d[mm]), 80)), persistence_q90=float(np.percentile(np.abs(D.d[mm]), 90)),
                             headcount_range=(float(np.exp(D.ls[mm].min())), float(np.exp(D.ls[mm].max()))))
    res['by_size'] = terc
    # sub-masks
    sub = {}
    for lab, sm in submasks.items():
        mm = sm
        if mm.sum() >= 15:
            sub[lab] = dict(n=int(mm.sum()), persistence=float(err['persistence'][mm].mean()), best=float(err[best][mm].mean()),
                            auto=float(err_auto[mm].mean()), mean_year=float(err['persist+mean(year)' if 'persist+mean(year)' in names else 'persist+mean(pooled)'][mm].mean()))
    res['submasks'] = sub
    # forward-in-time check
    if forward and D.nyr > 1:
        fw = {}
        for u in D.yrs[1:]:
            tr = np.where(D.yr < u)[0]; te = np.where((D.yr == u) & mask)[0]
            if len(te) < 15 or len(tr) < 30: continue
            row = {}
            for m in names:
                row[m] = float(np.abs(D.d[te] - MODELS[m](D, tr, te)).mean())
            fw[int(u)] = dict(n_train=int(len(tr)), n_test=int(len(te)), mae=row)
        res['forward'] = fw
    # verdict
    res['verdict'] = verdict(res)
    res['seconds'] = time.time() - t0
    if verbose: print_analysis(res, names, D, mask)
    return res

def verdict(res):
    """Pre-declared rule (see report): usable-company needs (1) a nested-CV MAE gain >= 10% over persistence whose 95% bootstrap CI
    excludes 0, (2) MAE <= 0.25 x between-company SD, and (3) a company-specific gain, i.e. the best model beats the best
    pooled-shift baseline (persistence + pooled mean/median change) by >= 5%. Gains from a pooled drift alone are group-level.
    group-only = (1) holds without (2)/(3), or the average change of a missing set is predicted >= 30% better with a drift >= 2 SE.
    Otherwise not-better-than-persistence."""
    n = res['n']
    if n < 40: return dict(verdict='too-little-data', why='n=%d < 40' % n)
    sd = res['spread']['sd']
    a = res['auto']
    best = res['best_fixed']; bm = res['models'][best]['mae']
    shift = min(res['models'][m]['mae'] for m in ('persist+mean(pooled)', 'persist+mean(year)', 'persist+median(year)') if m in res['models'])
    company_gain = 1 - bm / shift
    u1 = (a['rel'] >= 0.10) and (a['rel_ci'][0] > 0)
    u2 = max(a['mae'], bm) <= 0.25 * sd
    u3 = company_gain >= 0.05
    ag = res['aggregate']['err']; agp = ag['persistence']; agb = min(ag[best], ag.get('persist+mean(year)', ag.get('persist+mean(pooled)', 9e9)), ag.get('persist+mean(pooled)', 9e9))
    ps = res['persistence']
    drift = abs(ps['mean_signed']) >= 2 * ps['se_signed']
    agg_gain = (agp - agb) / agp if agp > 0 else 0.0
    if u1 and u2 and u3: v = 'usable-company'
    elif u1: v = 'group-only'
    elif agg_gain >= 0.30 and drift: v = 'group-only'
    else: v = 'not-better-than-persistence'
    return dict(verdict=v, u1_beats_persistence=bool(u1), u2_error_small_vs_spread=bool(u2), u3_company_specific=bool(u3), company_specific_gain=float(company_gain),
                agg_gain=float(agg_gain), drift_2se=bool(drift),
                why=('nested-auto MAE gain %.1f%% (95%% CI %.1f..%.1f); best fixed %s MAE %.3f vs best pooled-shift %.3f (company-specific gain %.1f%%); '
                     'max(auto,best)=%.2f vs 0.25*SD=%.2f; aggregate-error gain %.0f%%; mean change %+.2f pp (SE %.2f)') % (
                    100 * a['rel'], 100 * a['rel_ci'][0], 100 * a['rel_ci'][1], best, bm, shift, 100 * company_gain, max(a['mae'], bm), 0.25 * sd, 100 * agg_gain, ps['mean_signed'], ps['se_signed']))

def print_analysis(res, names, D, mask):
    P('\n' + '=' * 100); P(res['title']); P('=' * 100)
    s = res['spread']; ps = res['persistence']
    P('pairs n=%d (companies %d; %d pairs before mask) | level SD %.2f pp, IQR %.2f pp, mean %.2f | SD of change %.2f' % (
        res['n'], res['companies'], res['n_all_pairs'], s['sd'], s['iqr'], s['mean'], s['sd_change']))
    P('PERSISTENCE (carry last year forward): MAE %.2f | median |chg| %.2f | share unchanged(<0.005pp) %.0f%% | within +/-0.5pp %.0f%% | +/-1pp %.0f%% | +/-2pp %.0f%% | p90 |chg| %.2f | RMSE %.2f | mean change %+.2f (SE %.2f)' % (
        ps['mean_abs'], ps['median_abs'], 100 * ps['share_unchanged'], 100 * ps['within05'], 100 * ps['within1'], 100 * ps['within2'], ps['p90_abs'], ps['rmse'], ps['mean_signed'], ps['se_signed']))
    if 'persistence_last' in res:
        pl = res['persistence_last']
        P('  persistence, last pair only (FY24-25 > FY25-26): n=%d MAE %.2f median %.2f within +/-1pp %.0f%% +/-2pp %.0f%% p90 %.2f mean change %+.2f' % (pl['n'], pl['mean_abs'], pl['median_abs'], 100 * pl['within1'], 100 * pl['within2'], pl['p90_abs'], pl['mean_signed']))
    P('%-30s %7s %7s %7s %9s  %-22s %7s' % ('model (20x5-fold CV by company)', 'MAE', 'MedAE', 'RMSE', 'vs persist', '95% CI of rel. gain', 'LOO MAE'))
    for m in names:
        t = res['models'][m]
        P('%-30s %7.3f %7.3f %7.3f %8.1f%%  [%6.1f%%,%6.1f%%]       %7.3f' % (m, t['mae'], t['medae'], t['rmse'], 100 * t['rel'], 100 * t['rel_ci'][0], 100 * t['rel_ci'][1], res['loo'][m]))
    a = res['auto']
    P('NESTED auto-select (honest): MAE %.3f  rel gain %.1f%% [%.1f%%, %.1f%%] | chosen: %s' % (a['mae'], 100 * a['rel'], 100 * a['rel_ci'][0], 100 * a['rel_ci'][1], a['chosen']))
    P('best fixed candidate: %s | best overall (incl. persistence): %s' % (res['best_fixed'], res['best_overall']))
    dg = res['diag']
    P('  diagnostics: corr(level, change) %s | corr(last change, change) %s | share up %.0f%% down %.0f%%' % (dg['corr_level_change'], dg['corr_lastchange_change'], 100 * dg['share_up'], 100 * dg['share_down']))
    for u, v in res.get('by_pair_year', {}).items():
        P('  pair-year idx %d: n=%d mean change %+.2f median %+.2f persistence MAE %.2f' % (u, v['n'], v['mean'], v['median'], v['persistence_mae']))
    for k, v in res['intervals'].items():
        P('  intervals %-28s 80%%: +/-%.2f cover %.1f%% | 90%%: +/-%.2f cover %.1f%%' % (k, v[0.2]['halfwidth'], 100 * v[0.2]['coverage'], v[0.1]['halfwidth'], 100 * v[0.1]['coverage']))
    P('  aggregate error of the average change for a missing cell (pp): %s (cells %d)' % ({k: round(v, 3) for k, v in res['aggregate']['err'].items()}, res['aggregate']['cells']))
    for k, v in res['by_size'].items():
        P('  size %-5s n=%3d headcount %.0f..%.0f | persistence MAE %.2f (|err| q80 %.2f q90 %.2f) | best %.2f' % (k, v['n'], v['headcount_range'][0], v['headcount_range'][1], v['persistence'], v['persistence_q80'], v['persistence_q90'], v['best']))
    for k, v in res['submasks'].items():
        P('  subset %-38s n=%3d persistence %.2f | mean(chg) %.2f | best %.2f | auto %.2f' % (k, v['n'], v['persistence'], v['mean_year'], v['best'], v['auto']))
    if 'forward' in res:
        for u, v in res['forward'].items():
            row = v['mae']
            P('  forward (train earlier pair-years only) test year idx %d: n_train %d n_test %d | ' % (u, v['n_train'], v['n_test']) + ' | '.join('%s %.2f' % (k, x) for k, x in row.items() if k in ('persistence', 'persist+mean(pooled)', 'pool_industry(coarse)', 'ridge(value,trend,size)', 'ridge(+industry)', 'LAD(value,trend,size)', 'own_trend_shrunk')))
    P('VERDICT: %s | %s' % (res['verdict']['verdict'], res['verdict']['why']))

# ============================================================================ main
def main():
    results = {}
    P('Nowcast study run %s' % time.strftime('%Y-%m-%d %H:%M:%S'))
    snapdb = json.load(open(os.path.join(SNAP, 'db.json')))
    P('snapshot of live sources taken', snapdb['taken'], '| readings rows', len(snapdb['readings']))
    # ------------------------------------------------------------- A
    DA, recA, dropA, nbase = build_A()
    P('\nTEST SET A: Kaggle FY2024-25 scan -> checked FY2025-26 readings. Baseline-year filter:', dict(nbase))
    for t, c in dropA.items(): P('  drops %-6s %s' % (t, dict(c)))
    P('  usable pairs:', {t: (DA[t].n if DA[t] else 0) for t in DA})
    # restatement diagnostics for A
    db = snapdb; scan = {x['file']: x for x in json.load(open(os.path.join(SNAP, 'scan.json')))}
    comp = {c['key']: c for c in db['companies']}
    tt = collections.defaultdict(dict)
    for t in db['turnover_trend']: tt[t['key']][t['fy']] = t
    rd = [r for r in db['readings'] if r['fy'] == '2025-26']
    gap, within, stp = [], [], []
    tg = []
    for r in rd:
        s = scan[comp[r['key']]['kaggle_file']]
        if s['fy'] not in ('2024-25', '~2024-25'): continue
        sw, pri, cur = s.get('wageShare'), r['wage_share_prior'], r['wage_share_current']
        okf = lambda v: isinstance(v, (int, float)) and 0 <= v <= 100
        if okf(sw) and okf(pri): gap.append(sw - pri)
        if okf(pri) and okf(cur): within.append(cur - pri)
        if okf(sw) and okf(cur): stp.append(cur - sw)
        tv = s.get('turnover'); t2 = tt[r['key']].get('2024-25')
        if tv and tv.get('women') is not None and t2 and t2['women'] is not None and 0 <= tv['women'] <= 100 and 0 <= t2['women'] <= 100:
            tg.append(tv['women'] - t2['women'])
    gap, within, stp, tg = map(np.array, (gap, within, stp, tg))
    rest = dict(
        wage_scan_vs_prior=dict(n=len(gap), identical_005=float(np.mean(np.abs(gap) <= 0.05)), within05=float(np.mean(np.abs(gap) <= 0.5)), within1=float(np.mean(np.abs(gap) <= 1)),
                                gt2=int(np.sum(np.abs(gap) > 2)), gt5=int(np.sum(np.abs(gap) > 5)), mean_abs=float(np.abs(gap).mean()), median_abs=float(np.median(np.abs(gap))),
                                mean_abs_excl_gt5=float(np.abs(gap[np.abs(gap) <= 5]).mean())),
        wage_within_report_change=dict(n=len(within), mean_abs=float(np.abs(within).mean()), median_abs=float(np.median(np.abs(within))), within1=float(np.mean(np.abs(within) <= 1)), within2=float(np.mean(np.abs(within) <= 2))),
        wage_scan_to_current=dict(n=len(stp), mean_abs=float(np.abs(stp).mean()), median_abs=float(np.median(np.abs(stp)))),
        turnover_scan_vs_trend2425=dict(n=len(tg), identical_05=float(np.mean(np.abs(tg) <= 0.5)), within2=float(np.mean(np.abs(tg) <= 2)), gt5=int(np.sum(np.abs(tg) > 5)), mean_abs=float(np.abs(tg).mean()), median_abs=float(np.median(np.abs(tg)))))
    P('\nRESTATEMENT / MISREAD CHECK (FY2024-25 value in the Kaggle scan vs the prior-year column of the checked FY2025-26 report):')
    for k, v in rest.items(): P('  %-28s %s' % (k, {a: (round(b, 3) if isinstance(b, float) else b) for a, b in v.items()}))
    absg = np.abs(gap)
    rest['wage_scan_vs_prior_counts'] = {'n': len(gap), 'gt0.05': int((absg > 0.05).sum()), 'gt0.5': int((absg > 0.5).sum()), 'gt1': int((absg > 1).sum()),
                                         'gt2': int((absg > 2).sum()), 'gt5': int((absg > 5).sum())}
    P('  wage_scan_vs_prior_counts   ', rest['wage_scan_vs_prior_counts'])
    results['restatement'] = rest
    # representativeness of the test set
    sz_all = np.array([x['permanent']['total'] for x in scan.values() if x.get('permanent') and x['permanent'].get('total', 0) > 0])
    sz_te = np.array([scan[comp[r['key']]['kaggle_file']]['permanent']['total'] for r in rd if scan[comp[r['key']]['kaggle_file']].get('permanent') and scan[comp[r['key']]['kaggle_file']]['permanent'].get('total', 0) > 0])
    results['representativeness'] = dict(all_scans_n=int(len(sz_all)), all_scans_median_perm_headcount=float(np.median(sz_all)), test_n=int(len(sz_te)), test_median_perm_headcount=float(np.median(sz_te)),
                                         all_p25_p75=[float(np.percentile(sz_all, 25)), float(np.percentile(sz_all, 75))], test_p25_p75=[float(np.percentile(sz_te, 25)), float(np.percentile(sz_te, 75))])
    P('  test-set size vs all scans (permanent headcount):', results['representativeness'])
    results['A_wage_history'] = history_wage(DA['wage'], db, scan, comp, rd)
    results['A_drops'] = {t: dict(c) for t, c in dropA.items()}
    results['A_baseline'] = dict(nbase)

    labelA = dict(wage="A: women's share of wages", perm="A: women's share of permanent employees", board="A: women's share of the board",
                  kmp='A: women among KMP', turn="A: women's turnover rate")
    labelA['turnL'] = "A: women's turnover rate, looser filter (range 0-100 only)"
    for t in ('wage', 'perm', 'board', 'kmp', 'turn', 'turnL'):
        D = DA[t]
        if D is None or D.n < 40:
            P('\nSKIPPED %s: only %d pairs' % (labelA[t], 0 if D is None else D.n)); results['A_' + t] = dict(skipped=True, n=0 if D is None else D.n); continue
        mask = np.ones(D.n, bool)
        sub = {'excl. headcount jump (basis-change proxy)': ~D.flags['basis']}
        if t == 'wage': sub['excl. |scan - prior col| > 5pp (suspected misread)'] = ~D.flags['misread']
        if t in ('turn', 'turnL'): sub['excl. zero in either year'] = ~D.flags['zero']
        results['A_' + t] = analyze(labelA[t] + ' (scan FY2024-25 -> checked FY2025-26)', D, mask, sub)
    P('\nSKIPPED A: women\'s share of permanent WORKERS: the checked FY2025-26 readings have it for ~129 companies, but neither the Kaggle scan nor the panel carries a FY2024-25 permanent-worker count, so there is no baseline and no pair.')

    # ------------------------------------------------------------- B
    DB, recB, dropB = build_B()
    P('\n\nTEST SET B: 100-company panel, consecutive-year pairs 22-23>23-24, 23-24>24-25, 24-25>25-26 (company-grouped CV; forward check separately)')
    for t, c in dropB.items(): P('  drops %-6s %s' % (t, dict(c)))
    P('  usable pairs:', {t: (DB[t].n if DB[t] else 0) for t in DB}, ' by pair-year:', {t: dict(zip(*np.unique(DB[t].yr, return_counts=True))) for t in DB})
    results['B_drops'] = {t: dict(c) for t, c in dropB.items()}
    labelB = dict(w="B: women's share of wages", fPerm="B: women's share of permanent employees", board="B: women's share of the board", fAll="B: women's share of all staff (extra)")
    for t in ('w', 'fPerm', 'board', 'fAll'):
        D = DB[t]
        allm = np.ones(D.n, bool)
        sub = {'all pairs (no mask)': allm, 'excl. basis-change pairs': ~D.flags['basis'], 'last pair only (FY24-25 > FY25-26)': D.flags['last'],
               'earlier pairs only': ~D.flags['last']}
        if t == 'w':
            sub['own-filing pairs (no prior-year column)'] = ~D.flags['prior']
            sub['own-filing and excl. basis-change'] = (~D.flags['prior']) & (~D.flags['basis'])
            sub['prior-year-column pairs only'] = D.flags['prior']
            mask = ~D.flags['prior']
        else:
            mask = allm
        results['B_' + t] = analyze(labelB[t] + (' [primary mask: both values from own-year filings]' if t == 'w' else ' [all pairs]'), D, mask, sub, forward=True)
    P('\nSKIPPED B: women among KMP, women\'s turnover rate and permanent-worker share: the panel carries none of them.')
    P('\n' + '=' * 100); P('SUMMARY (pp; MAE from 20x5-fold company-grouped CV; auto = nested model selection)'); P('=' * 100)
    P('%-62s %4s %6s %-26s %6s %6s %7s %-14s %-26s %-26s %s' % ('target', 'n', 'persMAE', 'best overall', 'bestMAE', 'autoMAE', 'SD', 'auto gain', 'persist 80%/90% (cover)', 'best 80%/90% (cover)', 'verdict'))
    for k, r in results.items():
        if not isinstance(r, dict) or 'models' not in r: continue
        bo = r['best_overall']; iv = r['intervals']
        pi = iv['persistence']; bi = iv.get(bo, pi)
        P('%-62s %4d %6.2f  %-26s %6.2f %6.2f %7.2f %5.1f%% [%4.1f,%4.1f] +/-%.2f(%.0f%%)/+/-%.2f(%.0f%%)   +/-%.2f(%.0f%%)/+/-%.2f(%.0f%%)   %s' % (
            r['title'][:62], r['n'], r['models']['persistence']['mae'], bo, r['models'][bo]['mae'], r['auto']['mae'], r['spread']['sd'], 100 * r['auto']['rel'], 100 * r['auto']['rel_ci'][0], 100 * r['auto']['rel_ci'][1],
            pi[0.2]['halfwidth'], 100 * pi[0.2]['coverage'], pi[0.1]['halfwidth'], 100 * pi[0.1]['coverage'], bi[0.2]['halfwidth'], 100 * bi[0.2]['coverage'], bi[0.1]['halfwidth'], 100 * bi[0.1]['coverage'], r['verdict']['verdict']))
    json.dump(results, open(os.path.join(OUT, 'results.json'), 'w'), indent=1, default=lambda o: float(o) if isinstance(o, (np.floating, np.integer)) else str(o))
    open(os.path.join(OUT, 'report.txt'), 'w').write('\n'.join(REPORT))

if __name__ == '__main__':
    main()
