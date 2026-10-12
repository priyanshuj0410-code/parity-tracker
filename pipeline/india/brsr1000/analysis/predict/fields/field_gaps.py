"""Within-report field-gap models for Nivel.
Train/CV on Kaggle FY2024-25 parser scans, test on checked readings (sqlite) and on the XBRL panel.
Run: /usr/bin/python3 -I field_gaps.py [--fast]   (numpy/pandas only; all data read-only)
Writes results.json and missing_wage_predictions.csv to data/analysis/predict/fields."""
import sys, os, json, time, warnings, collections, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

# numpy 2.0.x + Apple Accelerate emits spurious "divide by zero / overflow / invalid in matmul" warnings; results are
# finite and are checked against a closed-form fit in the SANITY line below.
warnings.filterwarnings('ignore', category=RuntimeWarning)

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, '..', '..', '..', 'data', 'analysis', 'predict', 'fields')  # outputs, git-ignored
FAST = '--fast' in sys.argv
REPEATS = 3 if FAST else 10
BOOT = 500 if FAST else 3000
RES = {}


# ================================================================ model library
def spec(name, cols, kind):
    return dict(name=name, cols=cols, kind=kind)


def build_fit(sp):
    k = sp['kind']
    if k == 'median':
        return make_fit('median')
    if k == 'id':
        return make_fit('identity')
    if k == 'lin':
        return make_fit('lin', False, False)
    if k == 'logit':
        return make_fit('lin', True, False)
    if k == 'linLAD':
        return make_fit('lin', False, True)
    if k == 'logitLAD':
        return make_fit('lin', True, True)
    if k == 'struct_inv':  # odds(f) = odds(w) / r
        def fp(Xtr, ytr, Xte):
            return expit(logit(Xte[:, 0]) - np.log(Xte[:, 1]))
        return fp
    raise ValueError(k)


def xmat(df, sp):
    k = sp['kind']
    if k == 'median':
        return np.zeros((len(df), 1))
    if k in ('id', 'struct_inv'):
        return df[sp['cols']].values.astype(float)
    return design(df, sp['cols'], k.startswith('logit'))


def complete(df, cols, target):
    m = df[target].notna()
    for c in cols:
        m &= df[c].notna()
    return df[m].reset_index(drop=True)


def is_simple_baseline(name):
    """the baselines the owner asked about: median, staff share as-is, staff share calibrated by a one-variable fit"""
    return name == 'median' or name.startswith('identity') or \
        any(name.startswith('calibrated ' + c) for c in ('fPerm', 'fPW', 'fAll', 'w '))


def best_baseline(models):
    return min([m for m in models if is_simple_baseline(m['name'])], key=lambda m: m['MAE'])


# ================================================================ tiers
def tiers_w():
    T = []
    T.append(('A  staff share (permanent employees)', ['fPerm'], [
        spec('median', [], 'median'),
        spec('identity fPerm', ['fPerm'], 'id'),
        spec('calibrated fPerm (linear)', ['fPerm'], 'lin'),
        spec('calibrated fPerm (logit)', ['fPerm'], 'logit'),
        spec('calibrated fPerm (logit, LAD)', ['fPerm'], 'logitLAD'),
    ]))
    T.append(('B  A + board, KMP, log headcount', ['fPerm', 'fBoard', 'fKmp', 'logHead'], [
        spec('median', [], 'median'),
        spec('identity fPerm', ['fPerm'], 'id'),
        spec('calibrated fPerm (logit)', ['fPerm'], 'logit'),
        spec('full B (logit)', ['fPerm', 'fBoard', 'fKmp', 'logHead'], 'logit'),
        spec('full B (logit, LAD)', ['fPerm', 'fBoard', 'fKmp', 'logHead'], 'logitLAD'),
    ]))
    T.append(('C  A + women/men median pay ratio (employees)', ['fPerm', 'r_emp'], [
        spec('median', [], 'median'),
        spec('identity fPerm', ['fPerm'], 'id'),
        spec('calibrated fPerm (logit)', ['fPerm'], 'logit'),
        spec('structural impl_emp (identity)', ['impl_emp'], 'id'),
        spec('calibrated impl_emp (logit)', ['impl_emp'], 'logit'),
        spec('fPerm + r_emp (logit)', ['fPerm', 'r_emp'], 'logit'),
        spec('fPerm + r_emp (logit, LAD)', ['fPerm', 'r_emp'], 'logitLAD'),
    ]))
    T.append(('C2 C + board, KMP, log headcount', ['fPerm', 'r_emp', 'fBoard', 'fKmp', 'logHead'], [
        spec('median', [], 'median'),
        spec('calibrated fPerm (logit)', ['fPerm'], 'logit'),
        spec('fPerm + r_emp (logit)', ['fPerm', 'r_emp'], 'logit'),
        spec('full C2 (logit)', ['fPerm', 'r_emp', 'fBoard', 'fKmp', 'logHead'], 'logit'),
        spec('full C2 (logit, LAD)', ['fPerm', 'r_emp', 'fBoard', 'fKmp', 'logHead'], 'logitLAD'),
    ]))
    T.append(('D  staff share incl. workers (fPW)', ['fPW'], [
        spec('median', [], 'median'),
        spec('identity fPW', ['fPW'], 'id'),
        spec('calibrated fPW (linear)', ['fPW'], 'lin'),
        spec('calibrated fPW (logit)', ['fPW'], 'logit'),
        spec('calibrated fPW (logit, LAD)', ['fPW'], 'logitLAD'),
    ]))
    T.append(('E  fPW + median pay ratios (employees, workers)', ['fPW', 'r_emp', 'r_wkr', 'impl_all'], [
        spec('median', [], 'median'),
        spec('identity fPW', ['fPW'], 'id'),
        spec('calibrated fPW (logit)', ['fPW'], 'logit'),
        spec('calibrated fPerm (logit)', ['fPerm'], 'logit'),
        spec('structural impl_all (identity)', ['impl_all'], 'id'),
        spec('calibrated impl_all (logit)', ['impl_all'], 'logit'),
        spec('fPW + r_emp + r_wkr (logit)', ['fPW', 'r_emp', 'r_wkr'], 'logit'),
        spec('fPW + r_emp + r_wkr (logit, LAD)', ['fPW', 'r_emp', 'r_wkr'], 'logitLAD'),
        spec('fPerm + r_emp (logit)', ['fPerm', 'r_emp'], 'logit'),
    ]))
    return T


def tiers_w_kmp():
    """does adding KMP / board remuneration (median x headcount) to the implied wage bill help?"""
    return [('E2 implied wage bill with KMP / board pay added', ['impl_all', 'impl_allK', 'impl_allKB'], [
        spec('median', [], 'median'),
        spec('calibrated impl_all (logit)', ['impl_all'], 'logit'),
        spec('structural impl_allK (identity)', ['impl_allK'], 'id'),
        spec('calibrated impl_allK (logit)', ['impl_allK'], 'logit'),
        spec('structural impl_allKB (identity)', ['impl_allKB'], 'id'),
        spec('calibrated impl_allKB (logit)', ['impl_allKB'], 'logit'),
    ]), ('E3 where the structural gain comes from', ['fPW', 'impl_eq', 'impl_all'], [
        spec('median', [], 'median'),
        spec('calibrated fPW (logit)', ['fPW'], 'logit'),
        spec('calibrated impl_eq (logit) [pay-weighted, no gap]', ['impl_eq'], 'logit'),
        spec('calibrated impl_all (logit) [pay-weighted + gap]', ['impl_all'], 'logit'),
        spec('structural impl_all (identity)', ['impl_all'], 'id'),
    ])]


def add_inverse(df):
    """structural inverse of the wage bill: women's share of employees implied by w, from the median-pay tables"""
    ie, iff = [], []
    for w, e, k in zip(df['w'].values, df['_e'].values, df['_k'].values):
        ie.append(inverse_emp_share(w, e, None) if e is not None else np.nan)
        iff.append(inverse_emp_share(w, e, k) if (e is not None and k is not None) else np.nan)
    df['inv_emp'] = ie
    df['inv_full'] = iff
    eq = []
    for e, k in zip(df['_e'].values, df['_k'].values):
        if e is None or k is None:
            eq.append(np.nan)
            continue
        num = e[0] * e[3] + k[0] * k[3]
        den = (e[0] + e[2]) * e[3] + (k[0] + k[2]) * k[3]
        eq.append(100.0 * num / den if den > 0 else np.nan)
    df['impl_eq'] = eq  # wage-bill share if women earned the men's median within each group (no gender pay gap)
    return df


def tiers_f_struct():
    return [('U5 w + both median-pay tables (structural inverse)', ['w', 'inv_emp', 'inv_full'], [
        spec('median', [], 'median'),
        spec('identity w', ['w'], 'id'),
        spec('calibrated w (logit)', ['w'], 'logit'),
        spec('structural inverse employees only (identity)', ['inv_emp'], 'id'),
        spec('structural inverse emp+workers (identity)', ['inv_full'], 'id'),
        spec('calibrated inverse emp+workers (logit)', ['inv_full'], 'logit'),
        spec('w + inv_full (logit)', ['w', 'inv_full'], 'logit'),
    ])]


def tiers_w_checked_extra():
    """fields only the checked readings have: all-staff share including other-than-permanent staff"""
    T = []
    T.append(('F  all-staff share incl. temporary (fAll)', ['fAll'], [
        spec('median', [], 'median'),
        spec('identity fAll', ['fAll'], 'id'),
        spec('calibrated fAll (linear)', ['fAll'], 'lin'),
        spec('calibrated fAll (logit)', ['fAll'], 'logit'),
        spec('calibrated fAll (logit, LAD)', ['fAll'], 'logitLAD'),
    ]))
    T.append(('G  fAll + median pay ratio (employees)', ['fAll', 'r_emp'], [
        spec('median', [], 'median'),
        spec('calibrated fAll (logit)', ['fAll'], 'logit'),
        spec('fAll + r_emp (logit)', ['fAll', 'r_emp'], 'logit'),
        spec('fAll + r_emp (logit, LAD)', ['fAll', 'r_emp'], 'logitLAD'),
    ]))
    return T


def tiers_f():
    """Target 2: women's share of permanent employees (fPerm) from the wage share and the other fields."""
    T = []
    T.append(('U1 wage share only', ['w'], [
        spec('median', [], 'median'),
        spec('identity w', ['w'], 'id'),
        spec('calibrated w (linear)', ['w'], 'lin'),
        spec('calibrated w (logit)', ['w'], 'logit'),
        spec('calibrated w (logit, LAD)', ['w'], 'logitLAD'),
    ]))
    T.append(('U2 w + board, KMP, log headcount', ['w', 'fBoard', 'fKmp', 'logHead'], [
        spec('median', [], 'median'),
        spec('identity w', ['w'], 'id'),
        spec('calibrated w (logit)', ['w'], 'logit'),
        spec('full U2 (logit)', ['w', 'fBoard', 'fKmp', 'logHead'], 'logit'),
        spec('full U2 (logit, LAD)', ['w', 'fBoard', 'fKmp', 'logHead'], 'logitLAD'),
    ]))
    T.append(('U3 w + median pay ratio (employees)', ['w', 'r_emp'], [
        spec('median', [], 'median'),
        spec('identity w', ['w'], 'id'),
        spec('calibrated w (logit)', ['w'], 'logit'),
        spec('structural odds(w)/r_emp', ['w', 'r_emp'], 'struct_inv'),
        spec('w + r_emp (logit)', ['w', 'r_emp'], 'logit'),
        spec('w + r_emp (logit, LAD)', ['w', 'r_emp'], 'logitLAD'),
    ]))
    T.append(('U4 w + workers share + pay ratio', ['w', 'fWkr', 'r_emp'], [
        spec('median', [], 'median'),
        spec('identity w', ['w'], 'id'),
        spec('calibrated w (logit)', ['w'], 'logit'),
        spec('w + r_emp (logit)', ['w', 'r_emp'], 'logit'),
        spec('w + fWkr (logit)', ['w', 'fWkr'], 'logit'),
        spec('w + fWkr + r_emp (logit)', ['w', 'fWkr', 'r_emp'], 'logit'),
        spec('w + fWkr + r_emp (logit, LAD)', ['w', 'fWkr', 'r_emp'], 'logitLAD'),
    ]))
    return T


# ================================================================ runners and printing
def strip(m):
    """JSON-safe copy of a metrics dict"""
    return {k: v for k, v in m.items() if k not in ('pred', 'absErr')}


def run_tiers(df, tiers, target, repeats=REPEATS, seed=7):
    out = []
    for tname, req, models in tiers:
        d = complete(df, req, target)
        if len(d) < 30:
            out.append(dict(tier=tname, n=len(d), models=[]))
            continue
        y = d[target].values.astype(float)
        res = []
        for sp in models:
            m = cv_eval(build_fit(sp), xmat(d, sp), y, repeats=repeats, seed=seed)
            m['name'] = sp['name']
            res.append(m)
        out.append(dict(tier=tname, n=len(d), sd=float(y.std(ddof=1)), iqr=float(np.subtract(*np.percentile(y, [75, 25]))),
                        mean=float(y.mean()), median=float(np.median(y)), models=res))
    return out


def holdout_tiers(train, test, tiers, target, repeats=REPEATS):
    out = []
    for tname, req, models in tiers:
        dtr, dte = complete(train, req, target), complete(test, req, target)
        if len(dte) < 10 or len(dtr) < 30:
            out.append(dict(tier=tname, n=len(dte), models=[]))
            continue
        ytr, yte = dtr[target].values.astype(float), dte[target].values.astype(float)
        res = []
        for sp in models:
            fp = build_fit(sp)
            Xtr, Xte = xmat(dtr, sp), xmat(dte, sp)
            hw = oof_halfwidths(fp, Xtr, ytr, repeats=repeats)
            m = holdout_eval(fp, Xtr, ytr, Xte, yte, hw)
            m['name'] = sp['name']
            res.append(m)
        out.append(dict(tier=tname, n=len(dte), ntrain=len(dtr), sd=float(yte.std(ddof=1)), iqr=float(np.subtract(*np.percentile(yte, [75, 25]))),
                        mean=float(yte.mean()), median=float(np.median(yte)), models=res))
    return out


def fmt(m):
    s = '%-36s MAE=%6.3f R2=%6.3f bias=%+6.3f' % (m['name'], m['MAE'], m['R2'], m['bias'])
    if 'cov80' in m:
        s += ' | abs80 +/-%5.2f cov %.2f | abs90 +/-%5.2f cov %.2f | rel90 med +/-%5.2f cov %.2f' % (
            m['hw80'], m['cov80'], m['hw90'], m['cov90'], m['hwR90_med'], m['covR90'])
    return s


def show(title, res):
    print('\n' + '=' * 130)
    print(title)
    for t in res:
        if not t['models']:
            print('  [%s] n=%d too few' % (t['tier'], t['n']))
            continue
        print('\n  [%s]  n=%d%s  target mean=%.2f median=%.2f SD=%.2f IQR=%.2f' % (
            t['tier'], t['n'], '' if 'ntrain' not in t else ' (train n=%d)' % t['ntrain'], t['mean'], t['median'], t['sd'], t['iqr']))
        bb = best_baseline(t['models'])
        for m in t['models']:
            extra = ''
            if m is not bb and not is_simple_baseline(m['name']):
                d, lo, hi = boot_diff(bb['absErr'], m['absErr'], B=BOOT)
                extra = '  | gain vs [%s]: %+.3f [%+.3f, %+.3f]' % (bb['name'], d, lo, hi)
                m['gain'] = dict(base=bb['name'], baseMAE=bb['MAE'], d=d, lo=lo, hi=hi)
            print('   ' + fmt(m) + extra)
        t['bestBaseline'] = bb['name']


def jsonable(res):
    return [dict({k: v for k, v in t.items() if k != 'models'}, models=[strip(m) for m in t['models']]) for t in res]


# ================================================================ full linear model with imputation
FULL_COLS = ['fPerm', 'fWkr', 'fBoard', 'fKmp', 'logHead', 'r_emp', 'r_wkr']


def full_fit_predict(Xtr, ytr, Xte, ridge=3.0):
    def tf(X):
        cols = []
        for j, c in enumerate(FULL_COLS):
            v = X[:, j]
            if c in ('fPerm', 'fWkr'):
                cols.append(logit(v))
            elif c in ('fBoard', 'fKmp'):
                cols.append(v / 100.0)
            elif c in ('r_emp', 'r_wkr'):
                cols.append(np.log(v))
            else:
                cols.append(v)
        return np.column_stack(cols)
    Ttr, Tte = tf(Xtr), tf(Xte)
    mu = np.nanmean(Ttr, axis=0)
    mu = np.where(np.isnan(mu), 0.0, mu)
    ind = [FULL_COLS.index(c) for c in ('fWkr', 'r_emp', 'r_wkr')]

    def prep(T):
        flags = np.isnan(T[:, ind]).astype(float)
        T = np.where(np.isnan(T), mu, T)
        return T, flags
    Ptr, Ftr = prep(Ttr)
    Pte, Fte = prep(Tte)
    sd = Ptr.std(axis=0)
    sd[sd == 0] = 1.0
    Atr = np.column_stack([np.ones(len(Ptr)), (Ptr - mu) / sd, Ftr])
    Ate = np.column_stack([np.ones(len(Pte)), (Pte - mu) / sd, Fte])
    beta = np.linalg.lstsq(np.vstack([Atr, np.sqrt(ridge) * np.diag([0.0] + [1.0] * (Atr.shape[1] - 1))]),
                           np.concatenate([logit(ytr), np.zeros(Atr.shape[1])]), rcond=None)[0]
    return expit(Ate @ beta)


# ================================================================ cascade
CASCADE_COLS = ['fPerm', 'fPW', 'fBoard', 'fKmp', 'logHead', 'r_emp', 'r_wkr', 'impl_all', 'impl_emp']
CASCADE = [  # richest first; fixed a priori (logit OLS on the complete-case rows of each tier)
    ('impl_all', ['impl_all']),
    ('fPW+r_emp+r_wkr', ['fPW', 'r_emp', 'r_wkr']),
    ('fPerm+r_emp', ['fPerm', 'r_emp']),
    ('fPW', ['fPW']),
    ('fPerm', ['fPerm']),
]


def _dz(X, cols, idx):
    parts = []
    for c, j in zip(cols, idx):
        v = X[:, j]
        parts.append(logit(v) if c in SHARE_LOGIT else (np.log(v) if c in RATIO_LOG else v))
    return np.column_stack(parts)


def cascade_fit_predict(Xtr, ytr, Xte):
    ci = {c: i for i, c in enumerate(CASCADE_COLS)}
    pred = np.full(len(Xte), float(np.median(ytr)))
    done = np.zeros(len(Xte), bool)
    fp = make_fit('lin', True, False)
    for name, cols in CASCADE:
        idx = [ci[c] for c in cols]
        ok_tr = ~np.isnan(Xtr[:, idx]).any(axis=1)
        ok_te = ~np.isnan(Xte[:, idx]).any(axis=1) & ~done
        if ok_tr.sum() < 30 or ok_te.sum() == 0:
            continue
        pred[ok_te] = fp(_dz(Xtr[ok_tr], cols, idx), ytr[ok_tr], _dz(Xte[ok_te], cols, idx))
        done |= ok_te
    return pred


def cascade_tier(row):
    ci = {c: i for i, c in enumerate(CASCADE_COLS)}
    for name, cols in CASCADE:
        if not np.isnan([row[ci[c]] for c in cols]).any():
            return name
    return 'median'


def cascade_rows(df):
    d = df[df['w'].notna()].reset_index(drop=True)
    X = d[CASCADE_COLS].values.astype(float)
    t = np.array([cascade_tier(X[i]) for i in range(len(d))])
    keep = t != 'median'
    return d[keep].reset_index(drop=True), X[keep], t[keep]


def cascade_run(df, label, repeats=REPEATS):
    d, X, tiers = cascade_rows(df)
    y = d['w'].values.astype(float)
    m = cv_eval(cascade_fit_predict, X, y, repeats=repeats, seed=11)
    med = cv_eval(make_fit('median'), np.zeros((len(d), 1)), y, repeats=repeats, seed=11)
    cnt = collections.Counter(tiers)
    print('\n' + '=' * 130)
    print('CASCADE on %s: rows with w and >=1 staff-share field = %d; tier use %s; SD=%.2f IQR=%.2f' % (
        label, len(d), {str(k): v for k, v in cnt.items()}, y.std(ddof=1), np.subtract(*np.percentile(y, [75, 25]))))
    print('   cascade     ' + fmt(dict(m, name='cascade')))
    print('   median only ' + fmt(dict(med, name='median')))
    dd, lo, hi = boot_diff(med['absErr'], m['absErr'], B=BOOT)
    print('   cascade vs median: gain %+.3f [%+.3f, %+.3f]' % (dd, lo, hi))
    per = {}
    for k in cnt:
        mk = tiers == k
        per[k] = dict(n=int(mk.sum()), MAE=float(m['absErr'][mk].mean()), medianMAE=float(med['absErr'][mk].mean()))
        print('     tier %-18s n=%4d  MAE=%.3f  (median baseline on same rows %.3f)' % (k, mk.sum(), per[k]['MAE'], per[k]['medianMAE']))
    return dict(label=label, n=len(d), cascade=strip(m), median=strip(med), gain=[dd, lo, hi], perTier=per)


# ================================================================ industry
SECTOR_NAMES = ['agri/mining', 'food', 'textile/apparel', 'chem/pharma', 'materials', 'machinery/electronics', 'auto', 'wood/paper/oil',
                'other mfg', 'utilities/construction', 'trade/transport', 'hospitality', 'health/edu', 'IT/telecom/media',
                'finance/real estate', 'prof services', 'other']
NIC_RANGES = [(1, 9), (10, 12), (13, 15), (20, 21), (22, 25), (26, 28), (29, 30), (16, 19), (31, 33),
              (35, 43), (45, 53), (55, 56), (85, 88), (58, 63), (64, 68), (69, 82)]


def sector_from_nic2(n2):
    if n2 is None:
        return -1
    n = int(n2)
    for i, (lo, hi) in enumerate(NIC_RANGES):
        if lo <= n <= hi:
            return i
    return 16


NAME_KEYS = [('chem/pharma', r'pharma|drug|laborator|lifescience|life sciences|chem|biotech|remed|medic|health|hospital'),
             ('finance/real estate', r'bank|financ|capital|insur|invest|asset|housing|credit|loan|realty|estate|fincorp|securit|amc|exchange'),
             ('IT/telecom/media', r'infotech|software|technolog|info|digital|system|tele|comm|media|network|data|cyber|consult|solution'),
             ('textile/apparel', r'textile|spinn|mill|garment|apparel|fashion|cotton|denim|fabric|weav|silk|knit|retail|shoes|footwear'),
             ('food', r'food|agro|sugar|tea|coffee|dairy|beverage|brew|distill|rice|milk|biscuit|consumer|nutri|fmcg'),
             ('materials', r'steel|cement|metal|alloy|iron|alumin|zinc|copper|mining|coal|mineral|ceramic|glass|paper|plastic|rubber|tyre|pipes|forg|cast'),
             ('machinery/electronics', r'engineer|electric|electron|machin|motor|auto|vehicle|equipment|tools|bearing|cable|power|energy|infra|construct|ship|rail')]


def sector_from_name(name, sym):
    s = ((name or '') + ' ' + (sym or '')).lower()
    for lab, rx in NAME_KEYS:
        if re.search(rx, s):
            return SECTOR_NAMES.index(lab)
    return 16


def sector_fit_predict(Xtr, ytr, Xte, shrink=5.0, base='median'):
    """X[:,0] = staff share (pp), X[:,1] = sector id (-1 unknown).
    base='median': sector median (fallback overall median when sector n<4).
    base='cal': one-variable logit calibration + shrunken sector offset (logit units)."""
    sec_tr, sec_te = Xtr[:, 1].astype(int), Xte[:, 1].astype(int)
    if base == 'median':
        pred = np.full(len(Xte), np.median(ytr))
        for g in np.unique(sec_te):
            mk = (sec_tr == g) & (g >= 0)
            if mk.sum() >= 4:
                pred[sec_te == g] = np.median(ytr[mk])
        return pred
    A = np.column_stack([np.ones(len(Xtr)), logit(Xtr[:, 0])])
    beta = np.linalg.lstsq(A, logit(ytr), rcond=None)[0]
    res = logit(ytr) - A @ beta
    off = {}
    for g in np.unique(sec_tr):
        if g < 0:
            continue
        mk = sec_tr == g
        off[g] = res[mk].sum() / (mk.sum() + shrink)
    z = beta[0] + beta[1] * logit(Xte[:, 0]) + np.array([off.get(g, 0.0) for g in sec_te])
    return expit(z)


def industry_block(df, label, sec_col, target='w', feature='fPerm', repeats=REPEATS):
    d = df[df[target].notna() & df[feature].notna() & (df[sec_col] >= 0)].reset_index(drop=True)
    y = d[target].values.astype(float)
    X = np.column_stack([d[feature].values.astype(float), d[sec_col].values.astype(float)])
    sizes = collections.Counter(d[sec_col].tolist())
    out = {}
    out['median'] = cv_eval(make_fit('median'), np.zeros((len(d), 1)), y, repeats=repeats, seed=21)
    out['sector median'] = cv_eval(lambda a, b, c: sector_fit_predict(a, b, c, base='median'), X, y, repeats=repeats, seed=21)
    out['calibrated (logit)'] = cv_eval(make_fit('lin', True, False), design(d, [feature], True), y, repeats=repeats, seed=21)
    out['calibrated + sector offset'] = cv_eval(lambda a, b, c: sector_fit_predict(a, b, c, base='cal'), X, y, repeats=repeats, seed=21)
    print('\n' + '-' * 130)
    print('INDUSTRY (%s): n=%d with a sector, %d sectors with n>=4; SD=%.2f' % (label, len(d), sum(1 for v in sizes.values() if v >= 4), y.std(ddof=1)))
    for k, m in out.items():
        print('   ' + fmt(dict(m, name=k)))
    for k, ref in (('sector median', 'median'), ('calibrated + sector offset', 'calibrated (logit)')):
        dd, lo, hi = boot_diff(out[ref]['absErr'], out[k]['absErr'], B=BOOT)
        print('   %s vs %s: gain %+.3f [%+.3f, %+.3f]' % (k, ref, dd, lo, hi))
        out[k]['gain'] = [ref, dd, lo, hi]
    return dict(label=label, n=len(d), sd=float(y.std(ddof=1)), models={k: strip(m) for k, m in out.items()})


# ================================================================ group-level
def group_sim(pred, y, g_sizes=(10, 25, 50, 100), hide=0.2, draws=3000, seed=5):
    """Hide a fraction of company values, estimate the group mean three ways, compare with the true group mean."""
    rng = np.random.RandomState(seed)
    out = {}
    n = len(y)
    glob_med = float(np.median(y))
    for g in g_sizes:
        if g > n:
            continue
        e = {'drop missing': [], 'fill with median': [], 'fill with model': []}
        for _ in range(draws):
            idx = rng.choice(n, g, replace=False)
            h = rng.rand(g) < hide
            if h.sum() == 0 or h.sum() == g:
                continue
            yt = y[idx]
            truth = yt.mean()
            known = yt[~h]
            e['drop missing'].append(abs(known.mean() - truth))
            e['fill with median'].append(abs((known.sum() + glob_med * h.sum()) / g - truth))
            e['fill with model'].append(abs((known.sum() + pred[idx][h].sum()) / g - truth))
        out[g] = {k: float(np.mean(v)) for k, v in e.items()}
    return out


# ================================================================ main
if __name__ == '__main__':
    t0 = time.time()
    K, klog = load_kaggle()
    S, slog = load_checked()
    P = load_panel()
    K, S = add_inverse(K), add_inverse(S)
    Kcv = K[~K['file'].isin(S['file'])].reset_index(drop=True)

    for pth in (SCAN, DB, PANEL):
        print('DATA SNAPSHOT %s modified %s, %d bytes' % (pth, time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(pth))), os.path.getsize(pth)))

    # ---- sanity: BLAS fit equals closed form
    d = complete(K, ['fPerm'], 'w')
    x, y = d['fPerm'].values, d['w'].values
    b1 = (((x - x.mean()) * (y - y.mean())).sum()) / (((x - x.mean()) ** 2).sum())
    b0 = y.mean() - b1 * x.mean()
    bl = np.linalg.lstsq(np.column_stack([np.ones(len(x)), x]), y, rcond=None)[0]
    print('SANITY closed-form OLS vs lstsq: (%.6f, %.6f) vs (%.6f, %.6f)' % (b0, b1, bl[0], bl[1]))

    print('\nFILTERS (field-level, applied before any modelling):')
    print(json.dumps(FILTERS))
    print('KAGGLE LOG', json.dumps(klog))
    print('CHECKED LOG', json.dumps(slog))
    print('Panel rows with reported 0<w<1: %d' % len(P))
    print('Kaggle rows %d; after removing the %d companies that are in the checked set: %d' % (len(K), S['file'].nunique(), len(Kcv)))
    RES['filters'] = dict(FILTERS, kaggleLog=klog, checkedLog=slog, panelRows=len(P))

    # ---- parser accuracy check: Kaggle FY2024-25 wage share vs the FY2025-26 report's prior-year column
    pr = S.merge(K[['file', 'w', 'fy']].rename(columns={'w': 'w_k', 'fy': 'fy_k'}), on='file', how='left')
    pr = pr[pr['w_k'].notna() & pr['w_prior'].notna() & pr['fy_k'].isin(['2024-25', '~2024-25']) & pr['fy'].isin(['2025-26'])]
    dif = (pr['w_k'] - pr['w_prior']).abs()
    print('\nPARSER CHECK: Kaggle wage share (FY24-25) vs checked FY25-26 report prior-year column: n=%d, median |diff|=%.3f, >1pp: %d, >3pp: %d, >10pp: %d'
          % (len(pr), dif.median(), (dif > 1).sum(), (dif > 3).sum(), (dif > 10).sum()))
    RES['parserCheck'] = dict(n=int(len(pr)), medAbsDiff=float(dif.median()), gt1=int((dif > 1).sum()), gt3=int((dif > 3).sum()), gt10=int((dif > 10).sum()))

    # ---- joint-relation outliers (diagnostic; NOT used as a filter in the main results)
    dd = complete(K, ['fPerm'], 'w')
    impl_r = np.exp(logit(dd['w']) - logit(dd['fPerm']))
    print('\nDIAGNOSTIC implied relative pay odds(w)/odds(fPerm): n=%d, share outside [0.1,10] = %.3f, outside [0.2,5] = %.3f; percentiles 5/25/50/75/95 = %s' % (
        len(dd), ((impl_r < 0.1) | (impl_r > 10)).mean(), ((impl_r < 0.2) | (impl_r > 5)).mean(), np.round(np.percentile(impl_r, [5, 25, 50, 75, 95]), 2)))
    K_nojoint = dd[(impl_r >= 0.1) & (impl_r <= 10)]

    # ================= Target 1: Kaggle CV
    TW = tiers_w() + tiers_w_kmp()
    resK = run_tiers(K, TW, 'w')
    show('TARGET 1 (women share of wages): Kaggle 5-fold CV x%d repeats (all isBRSR rows with the needed fields)' % REPEATS, resK)
    RES['T1_kaggle_cv'] = jsonable(resK)

    # full linear model with imputation, same rows as tier A
    dA = complete(K, ['fPerm'], 'w')
    yA = dA['w'].values.astype(float)
    XA = dA[FULL_COLS].values.astype(float)
    mFull = cv_eval(full_fit_predict, XA, yA, repeats=REPEATS, seed=7)
    mA = [m for m in resK[0]['models'] if m['name'] == 'calibrated fPerm (logit)'][0]
    mFull['name'] = 'full linear, mean-impute + flags'
    print('\nFULL LINEAR (all fields, imputed) on tier A rows n=%d' % len(dA))
    print('   ' + fmt(mFull))
    d_, lo_, hi_ = boot_diff(mA['absErr'], mFull['absErr'], B=BOOT)
    print('   gain vs calibrated fPerm (logit): %+.3f [%+.3f, %+.3f]' % (d_, lo_, hi_))
    RES['T1_kaggle_fullLinear'] = dict(strip(mFull), gain=[d_, lo_, hi_], coverage=dict(
        fWkr=float(dA['fWkr'].notna().mean()), r_emp=float(dA['r_emp'].notna().mean()), r_wkr=float(dA['r_wkr'].notna().mean())))

    RES['T1_kaggle_cascade'] = cascade_run(K, 'Kaggle')

    # ================= Target 2: Kaggle CV
    TF = tiers_f() + tiers_f_struct()
    resKf = run_tiers(K, TF, 'fPerm')
    show('TARGET 2 (women share of permanent employees): Kaggle 5-fold CV x%d repeats' % REPEATS, resKf)
    RES['T2_kaggle_cv'] = jsonable(resKf)

    # ================= Hold-out on the checked readings
    resS = holdout_tiers(Kcv, S, TW, 'w')
    show('TARGET 1 hold-out: train on Kaggle (checked companies removed) -> checked FY2025-26 readings', resS)
    RES['T1_checked_holdout'] = jsonable(resS)
    resSf = holdout_tiers(Kcv, S, TF, 'fPerm')
    show('TARGET 2 hold-out: train on Kaggle (checked companies removed) -> checked readings', resSf)
    RES['T2_checked_holdout'] = jsonable(resSf)

    # cascade hold-out on checked
    dS, XS, tS = cascade_rows(S)
    dK, XK, _ = cascade_rows(Kcv)
    yK, yS = dK['w'].values.astype(float), dS['w'].values.astype(float)
    mc = holdout_eval(cascade_fit_predict, XK, yK, XS, yS, oof_halfwidths(cascade_fit_predict, XK, yK, repeats=REPEATS))
    zK, zS = np.zeros((len(yK), 1)), np.zeros((len(yS), 1))
    mm = holdout_eval(make_fit('median'), zK, yK, zS, yS, oof_halfwidths(make_fit('median'), zK, yK, repeats=REPEATS))
    g_ = boot_diff(mm['absErr'], mc['absErr'], B=BOOT)
    print('\nCASCADE hold-out on checked: test n=%d, train n=%d, tiers %s, test SD=%.2f' % (len(dS), len(dK), {str(k): v for k, v in collections.Counter(tS).items()}, yS.std(ddof=1)))
    print('   cascade ' + fmt(dict(mc, name='cascade')))
    print('   median  ' + fmt(dict(mm, name='median')))
    print('   gain vs median %+.3f [%+.3f, %+.3f]' % g_)
    perS = {}
    for k in set(tS):
        mk = tS == k
        perS[k] = dict(n=int(mk.sum()), MAE=float(mc['absErr'][mk].mean()), medianMAE=float(mm['absErr'][mk].mean()))
        print('     tier %-18s n=%3d  MAE=%.3f  (median %.3f)' % (k, mk.sum(), perS[k]['MAE'], perS[k]['medianMAE']))
    RES['T1_checked_cascade'] = dict(n=len(dS), sd=float(yS.std(ddof=1)), cascade=strip(mc), median=strip(mm), gain=list(g_), perTier=perS)

    # full linear on checked hold-out
    dSA = complete(S, ['fPerm'], 'w')
    dKA = complete(Kcv, ['fPerm'], 'w')
    XKA, yKA = dKA[FULL_COLS].values.astype(float), dKA['w'].values.astype(float)
    mFS = holdout_eval(full_fit_predict, XKA, yKA, dSA[FULL_COLS].values.astype(float), dSA['w'].values.astype(float),
                       oof_halfwidths(full_fit_predict, XKA, yKA, repeats=REPEATS))
    print('\nFULL LINEAR hold-out on checked (n=%d, train n=%d): %s' % (len(dSA), len(dKA), fmt(dict(mFS, name='full linear imputed'))))
    RES['T1_checked_fullLinear'] = strip(mFS)

    # ================= Checked-only: recalibrated on checked (CV inside the checked set) incl. fAll
    TWS = TW + tiers_w_checked_extra()
    resSS = run_tiers(S, TWS, 'w')
    show('TARGET 1: 5-fold CV INSIDE the checked set (recalibrated on checked data; includes all-staff share)', resSS)
    RES['T1_checked_cv'] = jsonable(resSS)
    resSSf = run_tiers(S, TF, 'fPerm')
    show('TARGET 2: 5-fold CV INSIDE the checked set', resSSf)
    RES['T2_checked_cv'] = jsonable(resSSf)

    # ================= Industry
    S['sec'] = S['nic2'].apply(sector_from_nic2)
    K['sec'] = [sector_from_name(a, b) for a, b in zip(K['name'], K['id'])]
    RES['industry'] = dict(
        checked_nic=industry_block(S, 'checked readings, NIC 2-digit grouped into 16 sectors', 'sec'),
        kaggle_name=industry_block(K, 'Kaggle, sector guessed from company name (crude)', 'sec'))
    print('\n   NIC2 sectors present in checked set:', {SECTOR_NAMES[k]: v for k, v in sorted(collections.Counter(S[S.sec >= 0].sec).items())})

    # ================= XBRL panel
    PW = [t for t in TW if t[0].startswith('A')] + [(
        'B* A + board, log headcount (no KMP)', ['fPerm', 'fBoard', 'logHead'], [
            spec('median', [], 'median'), spec('identity fPerm', ['fPerm'], 'id'),
            spec('calibrated fPerm (logit)', ['fPerm'], 'logit'),
            spec('fPerm+board+logHead (logit)', ['fPerm', 'fBoard', 'logHead'], 'logit')])]
    Kp = Kcv[~Kcv['nivel'].isin(set(P['sym']))].reset_index(drop=True)
    resP = holdout_tiers(Kp, P, PW, 'w')
    show('TARGET 1 hold-out: train Kaggle (%d rows, panel companies removed) -> XBRL panel, reported w, FY2022-23..FY2025-26 (large caps)' % len(Kp), resP)
    RES['T1_panel_holdout'] = jsonable(resP)
    Pn = P[(~P['prior_col']) & (~P['basisChange'])].reset_index(drop=True)
    resP2 = holdout_tiers(Kp, Pn, [PW[0]], 'w')
    show('  same, panel rows excluding prior-year-column fills and basis changes', resP2)
    RES['T1_panel_holdout_clean'] = jsonable(resP2)
    PWc = [('H  panel own-CV: all-staff share fAll', ['fAll'], [
        spec('median', [], 'median'), spec('identity fAll', ['fAll'], 'id'), spec('calibrated fAll (logit)', ['fAll'], 'logit')]),
        ('H2 panel own-CV: permanent share fPerm', ['fPerm'], [
        spec('median', [], 'median'), spec('identity fPerm', ['fPerm'], 'id'), spec('calibrated fPerm (logit)', ['fPerm'], 'logit')])]
    resPc = run_tiers(P, PWc, 'w')
    show('TARGET 1: 5-fold CV INSIDE the XBRL panel (rows are company-years, folds are NOT by company, so slightly optimistic)', resPc)
    RES['T1_panel_cv'] = jsonable(resPc)

    # ================= Sensitivity on Kaggle tier A
    print('\n' + '=' * 130 + '\nSENSITIVITY (Kaggle tier A):')
    sens = {}
    for lab, dfv in (('all isBRSR rows', K),
                     ('reporting year FY2024-25 only', K[K['fy'].isin(['2024-25', '~2024-25'])]),
                     ('drop rows whose implied relative pay is outside [0.1, 10]', K_nojoint)):
        r = run_tiers(dfv, [TW[0]], 'w')[0]
        gm = lambda nm: [m for m in r['models'] if m['name'] == nm][0]
        sens[lab] = dict(n=r['n'], sd=r['sd'], medianMAE=gm('median')['MAE'], identityMAE=gm('identity fPerm')['MAE'],
                         calMAE=gm('calibrated fPerm (logit)')['MAE'], calR2=gm('calibrated fPerm (logit)')['R2'],
                         cov90=gm('calibrated fPerm (logit)')['cov90'], hw90=gm('calibrated fPerm (logit)')['hw90'])
        print('   %-62s n=%4d SD=%.2f median MAE=%.3f identity MAE=%.3f calibrated MAE=%.3f R2=%.3f' % (
            lab, r['n'], r['sd'], sens[lab]['medianMAE'], sens[lab]['identityMAE'], sens[lab]['calMAE'], sens[lab]['calR2']))
    RES['sensitivity'] = sens

    # ================= Group-level: does imputing help an aggregate?
    print('\n' + '=' * 130 + '\nGROUP LEVEL: hide 20% of company wage shares at random, estimate the group mean (random groups of g companies)')
    gres = {}
    d = complete(K, ['fPerm'], 'w')
    y = d['w'].values.astype(float)
    m = cv_eval(make_fit('lin', False, False), design(d, ['fPerm'], False), y, repeats=REPEATS, seed=31, nested=False)
    gres['Kaggle tier A (fPerm), linear calibration, out-of-fold'] = dict(n=len(y), sd=float(y.std(ddof=1)), groups=group_sim(m['pred'], y))
    d, Xc, _ = cascade_rows(K)
    y = d['w'].values.astype(float)
    m = cv_eval(cascade_fit_predict, Xc, y, repeats=REPEATS, seed=31, nested=False)
    gres['Kaggle cascade, logit calibration, out-of-fold'] = dict(n=len(y), sd=float(y.std(ddof=1)), groups=group_sim(m['pred'], y))
    d = complete(K, ['w'], 'fPerm')
    y = d['fPerm'].values.astype(float)
    m = cv_eval(make_fit('lin', False, False), design(d, ['w'], False), y, repeats=REPEATS, seed=31, nested=False)
    gres['TARGET 2: Kaggle fPerm from w, linear calibration, out-of-fold'] = dict(n=len(y), sd=float(y.std(ddof=1)), groups=group_sim(m['pred'], y))
    for lab, v in gres.items():
        print('  %s (n=%d, SD %.2f)' % (lab, v['n'], v['sd']))
        for g, e in v['groups'].items():
            print('     g=%3d  mean abs error of group mean: drop-missing %.3f | fill-median %.3f | fill-model %.3f' % (g, e['drop missing'], e['fill with median'], e['fill with model']))
    RES['group'] = gres

    # ================= Predictions for the checked readings with wage share missing
    miss = S[S['w'].isna()].copy()
    pool = pd.concat([K[K['w'].notna()], S[S['w'].notna()]], ignore_index=True)
    pool_c, Xp, _ = cascade_rows(pool)
    yp = pool_c['w'].values.astype(float)
    a8, a9, l8, l9 = oof_halfwidths(cascade_fit_predict, Xp, yp, repeats=REPEATS)
    Xm = miss[CASCADE_COLS].values.astype(float)
    miss['tier'] = [cascade_tier(Xm[i]) for i in range(len(miss))]
    miss['pred'] = cascade_fit_predict(Xp, yp, Xm)
    zz = logit(miss['pred'].values)
    miss['lo90'] = expit(zz - l9)
    miss['hi90'] = expit(zz + l9)
    miss.loc[miss['tier'] == 'median', ['pred', 'lo90', 'hi90']] = np.nan
    cols = ['key', 'name', 'tier', 'pred', 'lo90', 'hi90', 'fPerm', 'fPW', 'r_emp', 'w_prior']
    miss[cols].round(2).to_csv(os.path.join(WORK, 'missing_wage_predictions.csv'), index=False)
    print('\nMISSING WAGE SHARE in checked readings: %d rows; usable tiers: %s' % (len(miss), dict(collections.Counter(miss['tier']))))
    print(miss[cols].round(2).to_string())
    RES['missingChecked'] = dict(n=len(miss), tiers=dict(collections.Counter(miss['tier'])))

    # expected MAE for the actual mix of field availability among the missing-wage readings
    perS = RES['T1_checked_cascade']['perTier']
    mix = collections.Counter(miss['tier'])
    num = den = 0.0
    for k, c in mix.items():
        mae = RES['T1_checked_cascade']['median']['MAE'] if k == 'median' else perS.get(k, {}).get('MAE', np.nan)
        num += c * mae
        den += c
    print('\nEXPECTED MAE for the 17 real gaps, weighting checked hold-out tier MAEs by the gaps\' own field mix: %.2f pp (n=%d gaps; tiers %s)' % (num / den, den, dict(mix)))
    print('   share of labelled checked readings with no usable staff field: %.3f; share of the gap readings with none: %.3f' % (
        float(np.mean([cascade_tier(r) == 'median' for r in S[S['w'].notna()][CASCADE_COLS].values.astype(float)])), mix.get('median', 0) / den))
    RES['missingChecked']['expectedMAE'] = num / den

    print('\nCOEFFICIENTS (OLS on logit(w), all Kaggle rows with the fields):')
    for lab, cols in (('A: logit fPerm', ['fPerm']), ('C: logit fPerm + log r_emp', ['fPerm', 'r_emp']), ('E: logit impl_all', ['impl_all']),
                      ('E: logit fPW + log r_emp + log r_wkr', ['fPW', 'r_emp', 'r_wkr'])):
        dd_ = complete(K, cols, 'w')
        A_ = np.column_stack([np.ones(len(dd_)), design(dd_, cols, True)])
        b_ = np.linalg.lstsq(A_, logit(dd_['w'].values), rcond=None)[0]
        print('   %-40s n=%4d  intercept=%+.3f  slopes=%s' % (lab, len(dd_), b_[0], np.round(b_[1:], 3)))

    print('\n' + '=' * 130 + '\nCONDITIONAL COVERAGE of the 90% absolute interval by tercile of the predicted wage share (Kaggle CV)')
    def terc_print(lab, m):
        print('  ' + lab)
        for t in m['terc']:
            print('     pred %5.1f..%5.1f  n=%3d  MAE=%.2f  abs-interval cov90=%.2f | logit-interval cov90=%.2f (median half-width %.1f pp)' % (
                t['predLo'], t['predHi'], t['n'], t['MAE'], t['cov90'], t['covR90'], t['hwR90_med']))
    for tname in ('A ', 'E '):
        t = [x for x in resK if x['tier'].startswith(tname)][0]
        nm = 'calibrated fPerm (logit)' if tname == 'A ' else 'calibrated impl_all (logit)'
        terc_print('tier %s%s (n=%d)' % (tname, nm, t['n']), [m for m in t['models'] if m['name'] == nm][0])
    terc_print('cascade (n=%d)' % RES['T1_kaggle_cascade']['n'], RES['T1_kaggle_cascade']['cascade'])

    json.dump(RES, open(os.path.join(WORK, 'results.json'), 'w'), indent=1, default=float)
    print('\nelapsed %.1fs' % (time.time() - t0))
