"""Loaders, field-level filters and CV machinery for the within-report field-gap study.
Read-only on all data. Everything is normalised to percentage points (shares in 0..100)."""
import sys
import site; sys.path.append(site.getusersitepackages())
import json, math, sqlite3
import numpy as np
import pandas as pd

SCAN = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/kaggle/scan.json'
DB = '/Users/priyanshu/parity-tracker/pipeline/india/brsr1000/data/brsr1000.sqlite'
PANEL = '/Users/priyanshu/Thoth/knowledge/research/data/companies.json'

EPS = 0.0025  # logit clip, 0.25 pp


def logit(p):
    p = np.clip(np.asarray(p, float) / 100.0, EPS, 1 - EPS)
    return np.log(p / (1 - p))


def expit(z):
    return 100.0 / (1.0 + np.exp(-np.asarray(z, float)))


def share(w, t):
    return 100.0 * w / t if (t is not None and t > 0 and w is not None) else np.nan


# ---------------------------------------------------------------- filters
FILTERS = dict(
    perm_total_min=20,        # permanent employees total
    perm_sum_tol=0.02,        # |men+women-total| <= 2% of total (or 1 head)
    board_total=(3, 20),      # Companies Act minimum 3 directors; >20 is a misread
    kmp_total=(1, 15),
    wkr_total_min=20,         # workers in the median-pay table
    ratio_band=(0.2, 5.0),    # women/men median pay; outside is a unit or column misread
)


def clean_counts(men, women, total=None, tmin=0, tol=0.02):
    """Return (men, women, total) or None if inconsistent."""
    if men is None or women is None:
        return None
    if men < 0 or women < 0:
        return None
    t = men + women if total is None else total
    if t < max(tmin, 1):
        return None
    if total is not None and abs(men + women - total) > max(1.0, tol * total):
        return None
    return men, women, t


def ratio_ok(rm, rw):
    if rm is None or rw is None or rm <= 0 or rw <= 0:
        return np.nan
    r = rw / rm
    lo, hi = FILTERS['ratio_band']
    return r if lo <= r <= hi else np.nan


def implied_share(parts):
    """parts: list of (n_women, med_women, n_men, med_men). Bill share of women if everyone earned the median."""
    bw = bm = 0.0
    for p in parts:
        if p is None:
            return np.nan
        nw, mw, nm, mm = p
        if nw is None or nm is None or nw < 0 or nm < 0:
            return np.nan
        if nw > 0 and (mw is None or mw <= 0):
            return np.nan
        if nm > 0 and (mm is None or mm <= 0):
            return np.nan
        bw += nw * (mw or 0.0)
        bm += nm * (mm or 0.0)
    return 100.0 * bw / (bw + bm) if (bw + bm) > 0 else np.nan


def inverse_emp_share(w, e, k):
    """Women's share of the median-table employee headcount implied by the wage share w (pp), when everyone earns the group median.
    e, k = (n_women, med_women, n_men, med_men) for employees and workers (k may be None: employees only)."""
    if e is None or np.isnan(w) or not (0 < w < 100):
        return np.nan
    ew, emw, em, emm = e
    if None in (ew, emw, em, emm) or emw <= 0 or emm <= 0 or ew + em <= 0:
        return np.nan
    wb = mb = 0.0
    if k is not None:
        kw, kmw, km, kmm = k
        if None in (kw, kmw, km, kmm) or kmw <= 0 or kmm <= 0:
            return np.nan
        wb, mb = kw * kmw, km * kmm
    q = w / 100.0
    N = ew + em
    x = (q * (N * emm + mb) - (1 - q) * wb) / (emw * (1 - q) + q * emm)
    return 100.0 * min(max(x / N, 0.0), 1.0)


def finish(d):
    """Derived columns shared by every source."""
    d['logHead'] = np.log(d['permTotal']) if 'permTotal' in d else np.nan
    return d


# ---------------------------------------------------------------- Kaggle
def load_kaggle(fy_only=False):
    s = json.load(open(SCAN))
    rows = []
    log = dict(files=len(s))
    brsr = [x for x in s if x.get('isBRSR')]
    log['isBRSR'] = len(brsr)
    cnt = dict(w_float=0, w_unread=0, w_none=0, w_absolute=0, w_zero_dropped=0, w_hi=0,
               perm_present=0, perm_ok=0, board_present=0, board_ok=0, kmp_present=0, kmp_ok=0,
               emp_med_present=0, emp_ratio_ok=0, wkr_present=0, wkr_ratio_ok=0, wkr_count_ok=0)
    for x in brsr:
        if fy_only and x.get('fy') not in ('2024-25', '~2024-25'):
            continue
        r = dict(file=x['file'], id=x['id'], name=x.get('name'), fy=x.get('fy'), nivel=x.get('nivel'))
        # target
        w = x.get('wageShare')
        if isinstance(w, float):
            cnt['w_float'] += 1
        elif w == 'unread':
            cnt['w_unread'] += 1
        elif w == 'absolute':
            cnt['w_absolute'] += 1
        else:
            cnt['w_none'] += 1
        w = w if isinstance(w, float) and 0 <= w <= 100 else np.nan
        wb = x.get('wageShareBoth')
        wp = wb[1] if isinstance(wb, list) and len(wb) > 1 and 0 <= wb[1] <= 100 else np.nan
        # permanent employees
        p = x.get('permanent')
        pe = None
        if isinstance(p, dict):
            cnt['perm_present'] += 1
            pe = clean_counts(p.get('men'), p.get('women'), p.get('total'), FILTERS['perm_total_min'], FILTERS['perm_sum_tol'])
            if pe:
                cnt['perm_ok'] += 1
        fPerm = share(pe[1], pe[2]) if pe else np.nan
        permTotal = pe[2] if pe else np.nan
        if not np.isnan(w) and w == 0 and not (pe and pe[1] == 0):
            cnt['w_zero_dropped'] += 1
            w = np.nan  # zero wage share while women are employed: misread
        # board / kmp
        wm = x.get('women') if isinstance(x.get('women'), dict) else {}
        b = wm.get('board')
        fBoard = np.nan
        if b:
            cnt['board_present'] += 1
            lo, hi = FILTERS['board_total']
            if b.get('total') is not None and b.get('women') is not None and lo <= b['total'] <= hi and 0 <= b['women'] <= b['total']:
                fBoard = share(b['women'], b['total'])
                cnt['board_ok'] += 1
        k = wm.get('kmp')
        fKmp = np.nan
        if k:
            cnt['kmp_present'] += 1
            lo, hi = FILTERS['kmp_total']
            if k.get('total') is not None and k.get('women') is not None and lo <= k['total'] <= hi and 0 <= k['women'] <= k['total']:
                fKmp = share(k['women'], k['total'])
                cnt['kmp_ok'] += 1
        # median pay table
        mp = x.get('medianPay') if isinstance(x.get('medianPay'), dict) else {}
        e, wk = mp.get('employees'), mp.get('workers')
        r_emp = r_wkr = fWkr = np.nan
        parts = []
        if e:
            cnt['emp_med_present'] += 1
            r_emp = ratio_ok(e.get('menMedian'), e.get('womenMedian'))
            if not np.isnan(r_emp):
                cnt['emp_ratio_ok'] += 1
        if wk:
            cnt['wkr_present'] += 1
            r_wkr = ratio_ok(wk.get('menMedian'), wk.get('womenMedian'))
            if not np.isnan(r_wkr):
                cnt['wkr_ratio_ok'] += 1
            wc = clean_counts(wk.get('men'), wk.get('women'), None, FILTERS['wkr_total_min'])
            if wc:
                fWkr = share(wc[1], wc[2])
                cnt['wkr_count_ok'] += 1
        impl_emp = impl_all = impl_allK = impl_allKB = np.nan
        tup = lambda g: (g.get('women'), g.get('womenMedian'), g.get('men'), g.get('menMedian')) if g else None
        te_, tw_, tk_, tb_ = tup(e), tup(wk), tup(mp.get('kmp')), tup(mp.get('board'))
        if e and not np.isnan(r_emp):
            impl_emp = implied_share([te_])
            if wk and not np.isnan(r_wkr) and wk.get('women') is not None:
                impl_all = implied_share([te_, tw_])
                impl_allK = implied_share([te_, tw_, tk_])
                impl_allKB = implied_share([te_, tw_, tk_, tb_])
        raw = dict(e_t=te_ if (e and not np.isnan(r_emp)) else None, k_t=tw_ if (wk and not np.isnan(r_wkr)) else None)
        # permanent employees + workers share (workers counts from the median table)
        fPW = np.nan
        if pe and not np.isnan(fWkr):
            wc = clean_counts(wk.get('men'), wk.get('women'), None, FILTERS['wkr_total_min'])
            fPW = share(pe[1] + wc[1], pe[2] + wc[2])
        r.update(w=w, w_prior=wp, fPerm=fPerm, fWkr=fWkr, fPW=fPW, fAll=np.nan, fBoard=fBoard, fKmp=fKmp,
                 r_emp=r_emp, r_wkr=r_wkr, impl_emp=impl_emp, impl_all=impl_all, impl_allK=impl_allK, impl_allKB=impl_allKB,
                 inv_emp=np.nan, inv_full=np.nan, _e=raw['e_t'], _k=raw['k_t'],
                 permTotal=permTotal, nic2=None, src='kaggle')
        rows.append(r)
    df = pd.DataFrame(rows)
    df['logHead'] = np.log(df['permTotal'])
    log.update(cnt)
    log['rows'] = len(df)
    return df, log


# ---------------------------------------------------------------- checked readings (sqlite)
def nic2(code):
    if code is None:
        return None
    s = ''.join(ch for ch in str(code) if ch.isdigit())
    return s[:2] if len(s) >= 2 else None


def load_checked():
    c = sqlite3.connect('file:%s?mode=ro' % DB, uri=True)
    c.row_factory = sqlite3.Row
    rd = [dict(r) for r in c.execute(
        "select r.*, c.kaggle_file, c.kaggle_fy, c.checked_by, c.name from readings r join companies c on c.key=r.key")]
    mp = {}
    for r in c.execute("select * from median_pay"):
        mp[(r['key'], r['level'])] = dict(r)
    c.close()
    rows = []
    cnt = dict(readings=len(rd), latest=0, w_null=0, w_null_but_perm=0, perm_ok=0)
    for x in rd:
        if x['fy'] not in ('2025-26', 'CY2025', 'CY2024'):
            continue  # the 10 'done-kaggle' rows re-read the same FY2024-25 file the parser scanned: not independent
        cnt['latest'] += 1
        w = x['wage_share_current']
        if w is None:
            cnt['w_null'] += 1
        w = np.nan if w is None else float(w)
        pe = clean_counts(x['perm_emp_men'], x['perm_emp_women'], x['perm_emp_total'], FILTERS['perm_total_min'], FILTERS['perm_sum_tol'])
        if pe:
            cnt['perm_ok'] += 1
            if np.isnan(w):
                cnt['w_null_but_perm'] += 1
        fPerm = share(pe[1], pe[2]) if pe else np.nan
        pwk = clean_counts(x['perm_wkr_men'], x['perm_wkr_women'], x['perm_wkr_total'], FILTERS['wkr_total_min'], FILTERS['perm_sum_tol'])
        fWkr = share(pwk[1], pwk[2]) if pwk else np.nan
        fPW = share(pe[1] + pwk[1], pe[2] + pwk[2]) if (pe and pwk) else np.nan
        # all staff incl. other-than-permanent
        tot = wom = 0.0
        ok = True
        for pre in ('perm_emp', 'temp_emp', 'perm_wkr', 'temp_wkr'):
            t, wmn = x[pre + '_total'], x[pre + '_women']
            if t is None or wmn is None:
                ok = False
                break
            tot += t
            wom += wmn
        fAll = share(wom, tot) if ok and tot >= FILTERS['perm_total_min'] else np.nan
        b_t, b_w = x['board_total'], x['board_women']
        lo, hi = FILTERS['board_total']
        fBoard = share(b_w, b_t) if (b_t is not None and b_w is not None and lo <= b_t <= hi and 0 <= b_w <= b_t) else np.nan
        k_t, k_w = x['kmp_total'], x['kmp_women']
        lo, hi = FILTERS['kmp_total']
        fKmp = share(k_w, k_t) if (k_t is not None and k_w is not None and lo <= k_t <= hi and 0 <= k_w <= k_t) else np.nan
        e, wk = mp.get((x['key'], 'employees')), mp.get((x['key'], 'workers'))
        r_emp = ratio_ok(e['men_median'], e['women_median']) if e else np.nan
        r_wkr = ratio_ok(wk['men_median'], wk['women_median']) if wk else np.nan
        impl_emp = impl_all = impl_allK = impl_allKB = np.nan
        tup = lambda g: (g['women'], g['women_median'], g['men'], g['men_median']) if g else None
        te_, tw_, tk_, tb_ = tup(e), tup(wk), tup(mp.get((x['key'], 'kmp'))), tup(mp.get((x['key'], 'board')))
        if e and not np.isnan(r_emp):
            impl_emp = implied_share([te_])
            if wk and not np.isnan(r_wkr):
                impl_all = implied_share([te_, tw_])
                impl_allK = implied_share([te_, tw_, tk_])
                impl_allKB = implied_share([te_, tw_, tk_, tb_])
        raw = dict(e_t=te_ if (e and not np.isnan(r_emp)) else None, k_t=tw_ if (wk and not np.isnan(r_wkr)) else None)
        rows.append(dict(key=x['key'], name=x['name'], fy=x['fy'], file=x['kaggle_file'], w=w,
                         w_prior=np.nan if x['wage_share_prior'] is None else float(x['wage_share_prior']),
                         fPerm=fPerm, fWkr=fWkr, fPW=fPW, fAll=fAll, fBoard=fBoard, fKmp=fKmp,
                         r_emp=r_emp, r_wkr=r_wkr, impl_emp=impl_emp, impl_all=impl_all, impl_allK=impl_allK, impl_allKB=impl_allKB,
                         inv_emp=np.nan, inv_full=np.nan, _e=raw['e_t'], _k=raw['k_t'],
                         permTotal=pe[2] if pe else np.nan, nic_code=x['nic_code'], nic2=nic2(x['nic_code']),
                         src='checked'))
    df = pd.DataFrame(rows)
    df['logHead'] = np.log(df['permTotal'])
    return df, cnt


# ---------------------------------------------------------------- 100-company XBRL panel
def load_panel():
    D = json.load(open(PANEL))
    rows = []
    for sym, v in D.items():
        for fy, y in v['years'].items():
            if y.get('wKind') != 'reported' or y.get('w') is None or not (0 < y['w'] < 1):
                continue  # w == 1.0 (100%) is an XBRL error (Adani Green FY2023-24)
            note = y.get('note') or ''
            ph, hc = y.get('permHeadcount'), y.get('headcount')
            fp = y.get('fPerm')
            fa = y.get('fAll')
            bt, bw = y.get('board'), y.get('boardWomen')
            rows.append(dict(sym=sym, fy=fy, w=100.0 * y['w'],
                             fPerm=100.0 * fp if fp is not None and ph and ph >= FILTERS['perm_total_min'] else np.nan,
                             fAll=100.0 * fa if fa is not None else np.nan,
                             fBoard=share(bw, bt) if bt and FILTERS['board_total'][0] <= bt <= FILTERS['board_total'][1] and bw is not None and 0 <= bw <= bt else np.nan,
                             permTotal=ph if ph else np.nan,
                             prior_col='prior-year' in note, basisChange=bool(y.get('basisChange')), dq=y.get('dq'),
                             src='panel'))
    df = pd.DataFrame(rows)
    df['logHead'] = np.log(df['permTotal'])
    return df


# ---------------------------------------------------------------- design matrices
SHARE_LOGIT = {'fPerm', 'fWkr', 'fPW', 'fAll', 'w', 'impl_emp', 'impl_all', 'impl_allK', 'impl_allKB', 'inv_emp', 'inv_full', 'impl_eq'}
SHARE_RAW = {'fBoard', 'fKmp'}
RATIO_LOG = {'r_emp', 'r_wkr'}


def design(df, cols, logit_mode):
    parts = []
    for c in cols:
        v = df[c].values.astype(float)
        if c in SHARE_LOGIT:
            parts.append(logit(v) if logit_mode else v)
        elif c in SHARE_RAW:
            parts.append(v / 100.0 if logit_mode else v)
        elif c in RATIO_LOG:
            parts.append(np.log(v) if logit_mode else v)
        else:
            parts.append(v)
    return np.column_stack(parts) if parts else np.empty((len(df), 0))


# ---------------------------------------------------------------- fitters (all return predict(Xte) in pp)
def _lstsq(A, y, ridge=0.0):
    if ridge > 0:
        p = A.shape[1]
        pen = np.eye(p) * ridge
        pen[0, 0] = 0.0  # intercept unpenalised
        return np.linalg.solve(A.T @ A + pen, A.T @ y)
    return np.linalg.lstsq(A, y, rcond=None)[0]


def _lad(A, y, ridge=0.0, iters=80, delta=0.05):
    """Least absolute deviations by IRLS on a sqrt-weighted least-squares system (stable for near-singular designs)."""
    p = A.shape[1]
    pen = np.sqrt(ridge) * np.eye(p) if ridge > 0 else np.zeros((p, p))
    pen[0, 0] = 0.0
    beta = _lstsq(A, y, ridge)
    for _ in range(iters):
        r = np.abs(y - A @ beta)
        sw = 1.0 / np.sqrt(np.maximum(r, delta))
        Aw = np.vstack([A * sw[:, None], pen])
        yw = np.concatenate([y * sw, np.zeros(p)])
        new = np.linalg.lstsq(Aw, yw, rcond=None)[0]
        if np.max(np.abs(new - beta)) < 1e-7:
            beta = new
            break
        beta = new
    return beta


def make_fit(kind, logit_mode=False, robust=False, ridge=0.0):
    """kind: 'median' | 'identity' | 'lin'. For 'lin' the design matrix columns are already transformed."""
    def fit_predict(Xtr, ytr, Xte):
        if kind == 'median':
            return np.full(len(Xte), float(np.median(ytr)))
        if kind == 'identity':
            return Xte[:, 0].copy()
        A = np.column_stack([np.ones(len(Xtr)), Xtr])
        At = np.column_stack([np.ones(len(Xte)), Xte])
        yt = logit(ytr) if logit_mode else ytr
        beta = _lad(A, yt, ridge, delta=0.05 if logit_mode else 0.2) if robust else _lstsq(A, yt, ridge)
        z = At @ beta
        return expit(z) if logit_mode else np.clip(z, 0, 100)
    return fit_predict


# ---------------------------------------------------------------- cross-validation
def _q(res, p):
    n = len(res)
    k = min(n, int(math.ceil((n + 1) * p)))
    return float(np.sort(res)[k - 1])


def lerr(y, p):
    """absolute error on the logit scale (relative-error measure)"""
    return np.abs(logit(y) - logit(p))


def cv_once(fit_predict, X, y, rng, K=5, nested=True):
    n = len(y)
    idx = rng.permutation(n)
    folds = np.array_split(idx, K)
    pred = np.empty(n)
    q = np.empty((4, n))  # abs 80, abs 90, logit 80, logit 90
    for f in range(K):
        te = folds[f]
        tr = np.concatenate([folds[g] for g in range(K) if g != f])
        pred[te] = fit_predict(X[tr], y[tr], X[te])
        if nested:
            inner = np.array_split(rng.permutation(len(tr)), K)
            oof = np.empty(len(tr))
            for g in range(K):
                it = inner[g]
                itr = np.concatenate([inner[h] for h in range(K) if h != g])
                oof[it] = fit_predict(X[tr][itr], y[tr][itr], X[tr][it])
            res = np.abs(y[tr] - oof)
            lres = lerr(y[tr], oof)
            q[0, te] = _q(res, 0.8)
            q[1, te] = _q(res, 0.9)
            q[2, te] = _q(lres, 0.8)
            q[3, te] = _q(lres, 0.9)
    return pred, q


def cv_eval(fit_predict, X, y, repeats=10, seed=0, K=5, nested=True):
    n = len(y)
    P = np.empty((repeats, n))
    Q = np.empty((repeats, 4, n))
    for r in range(repeats):
        rng = np.random.RandomState(seed + r)
        P[r], Q[r] = cv_once(fit_predict, X, y, rng, K, nested)
    ae = np.abs(P - y[None, :])
    le = np.abs(logit(y)[None, :] - logit(P))
    out = dict(n=n, pred=P.mean(axis=0), absErr=ae.mean(axis=0),
               MAE=float(ae.mean()),
               R2=float(np.mean([1 - ((P[r] - y) ** 2).sum() / ((y - y.mean()) ** 2).sum() for r in range(repeats)])),
               bias=float((P - y[None, :]).mean()))
    if nested:
        out['cov80'] = float((ae <= Q[:, 0]).mean())
        out['cov90'] = float((ae <= Q[:, 1]).mean())
        out['hw80'] = float(Q[:, 0].mean())
        out['hw90'] = float(Q[:, 1].mean())
        # relative (logit-scale) intervals: expit(z -/+ q)
        z = logit(P)
        w80 = (expit(z + Q[:, 2]) - expit(z - Q[:, 2])) / 2
        w90 = (expit(z + Q[:, 3]) - expit(z - Q[:, 3])) / 2
        out['covR80'] = float((le <= Q[:, 2]).mean())
        out['covR90'] = float((le <= Q[:, 3]).mean())
        out['hwR80_med'] = float(np.median(w80))
        out['hwR90_med'] = float(np.median(w90))
        # coverage by tercile of predicted value (absolute intervals and relative ones)
        pm = P.mean(axis=0)
        cuts = np.percentile(pm, [33.3, 66.7])
        grp = np.digitize(pm, cuts)
        out['terc'] = []
        for g in range(3):
            mk = grp == g
            if mk.sum() == 0:
                continue
            out['terc'].append(dict(n=int(mk.sum()), predLo=float(pm[mk].min()), predHi=float(pm[mk].max()),
                                    MAE=float(ae[:, mk].mean()),
                                    cov90=float((ae[:, mk] <= Q[:, 1][:, mk]).mean()),
                                    covR90=float((le[:, mk] <= Q[:, 3][:, mk]).mean()),
                                    hwR90_med=float(np.median(w90[:, mk]))))
    return out


def boot_diff(e_base, e_model, B=3000, seed=1):
    """paired bootstrap of mean(e_base - e_model) over rows; positive = model better"""
    rng = np.random.RandomState(seed)
    d = np.asarray(e_base) - np.asarray(e_model)
    n = len(d)
    ms = np.array([d[rng.randint(0, n, n)].mean() for _ in range(B)])
    return float(d.mean()), float(np.percentile(ms, 2.5)), float(np.percentile(ms, 97.5))


def holdout_eval(fit_predict, Xtr, ytr, Xte, yte, hw=None):
    """hw: (abs80, abs90, logit80, logit90) half-widths from training OOF residuals"""
    p = fit_predict(Xtr, ytr, Xte)
    ae = np.abs(p - yte)
    le = lerr(yte, p)
    out = dict(n=len(yte), pred=p, absErr=ae, MAE=float(ae.mean()),
               R2=float(1 - ((p - yte) ** 2).sum() / ((yte - yte.mean()) ** 2).sum()),
               bias=float((p - yte).mean()))
    if hw is not None:
        a8, a9, l8, l9 = hw
        z = logit(p)
        out.update(cov80=float((ae <= a8).mean()), cov90=float((ae <= a9).mean()), hw80=a8, hw90=a9,
                   covR80=float((le <= l8).mean()), covR90=float((le <= l9).mean()),
                   hwR80_med=float(np.median((expit(z + l8) - expit(z - l8)) / 2)),
                   hwR90_med=float(np.median((expit(z + l9) - expit(z - l9)) / 2)))
    return out


def oof_halfwidths(fit_predict, X, y, repeats=10, seed=100, K=5):
    """Pooled out-of-fold residual quantiles (80/90%), absolute and logit-scale, from training data."""
    res, lres = [], []
    for r in range(repeats):
        rng = np.random.RandomState(seed + r)
        idx = rng.permutation(len(y))
        folds = np.array_split(idx, K)
        oof = np.empty(len(y))
        for f in range(K):
            te = folds[f]
            tr = np.concatenate([folds[g] for g in range(K) if g != f])
            oof[te] = fit_predict(X[tr], y[tr], X[te])
        res.append(np.abs(y - oof))
        lres.append(lerr(y, oof))
    res, lres = np.concatenate(res), np.concatenate(lres)
    return (float(np.quantile(res, 0.8)), float(np.quantile(res, 0.9)),
            float(np.quantile(lres, 0.8)), float(np.quantile(lres, 0.9)))
