"""Nowcast study: models, cross-validation, intervals. Numpy only.
Imported by nowcast.py (the script path is added to sys.path explicitly, scratch dir contains only our own files)."""
import sys
import site; sys.path.append(site.getusersitepackages())  # numpy lives in the user site; -I drops it
import math, warnings
import numpy as np
# numpy 2.0.2 + Apple Accelerate raises spurious FP flags in matmul; results are checked finite below (see check_finite)
warnings.filterwarnings('ignore', category=RuntimeWarning)

# ----------------------------------------------------------------------------- dataset
class Data:
    """Pairs (company, year step). All values in percentage points (pp). d = y1 - y0 is the modelled quantity."""
    def __init__(self, recs):
        f = lambda k, dt=float: np.array([r[k] for r in recs], dtype=dt)
        self.n = len(recs)
        self.cid = f('cid', int)
        self.ind = f('ind', int)
        self.grp = f('grp', int)
        self.yr = f('yr', int)
        self.y0 = f('y0')
        self.y1 = f('y1')
        self.d = self.y1 - self.y0
        self.dl = f('dl')            # last change (nan when unknown)
        self.ls = f('ls')            # log headcount
        self.ld = f('ld')            # log denominator count (e.g. board size)
        self.nind = int(self.ind.max()) + 1 if self.n else 0
        self.ngrp = int(self.grp.max()) + 1 if self.n else 0
        self.yrs = np.unique(self.yr)
        self.nyr = len(self.yrs)
        self.flags = {k: np.array([bool(r.get(k, False)) for r in recs]) for k in ('basis', 'prior', 'misread', 'zero', 'last')}
        self.keys = [r.get('key', '') for r in recs]
        self.same_ind_grp = bool(np.array_equal(self.ind, self.grp))

# ----------------------------------------------------------------------------- building blocks
def year_base(D, tr, te, min_n=8):
    d = D.d[tr]
    pooled = d.mean()
    btr = np.full(len(tr), pooled); bte = np.full(len(te), pooled)
    if D.nyr > 1:
        for u in D.yrs:
            m = D.yr[tr] == u
            if m.sum() >= min_n:
                mu = d[m].mean()
                btr[m] = mu
                bte[D.yr[te] == u] = mu
    return btr, bte

def eb_shrink(r, g, G):
    """Empirical-Bayes (one-way random effects, method of moments) partial pooling of group means of r.
    Returns (overall mean of r, shrunk deviation per group)."""
    N = len(r); mu = r.mean()
    ng = np.bincount(g, minlength=G).astype(float)
    sg = np.bincount(g, weights=r, minlength=G)
    present = ng > 0
    mg = np.where(present, sg / np.maximum(ng, 1), mu)
    Gp = int(present.sum())
    dev = np.zeros(G)
    if Gp < 2 or N - Gp < 1:
        return mu, dev
    msw = float(np.sum((r - mg[g]) ** 2) / (N - Gp))
    msb = float(np.sum(ng[present] * (mg[present] - mu) ** 2) / (Gp - 1))
    n0 = (N - float(np.sum(ng ** 2)) / N) / (Gp - 1)
    tau2 = max(0.0, (msb - msw) / n0) if n0 > 0 else 0.0
    if tau2 <= 1e-12 or msw <= 0:
        return mu, dev
    lam = tau2 / (tau2 + msw / np.maximum(ng, 1))
    dev = np.where(present, lam * (mg - mu), 0.0)
    return mu, dev

def _pool(D, tr, te, level):
    g_all = D.ind if level == 'ind' else D.grp
    G = D.nind if level == 'ind' else D.ngrp
    btr, bte = year_base(D, tr, te)
    r = D.d[tr] - btr
    mu, dev = eb_shrink(r, g_all[tr], G)
    return btr, bte, mu, dev, g_all

def m_persist(D, tr, te): return np.zeros(len(te))
def m_mean_pooled(D, tr, te): return np.full(len(te), D.d[tr].mean())
def m_mean_year(D, tr, te): return year_base(D, tr, te)[1]
def m_median_year(D, tr, te):
    d = D.d[tr]; out = np.full(len(te), np.median(d))
    if D.nyr > 1:
        for u in D.yrs:
            m = D.yr[tr] == u
            if m.sum() >= 8: out[D.yr[te] == u] = np.median(d[m])
    return out
def m_pool_grp(D, tr, te):
    btr, bte, mu, dev, g = _pool(D, tr, te, 'grp'); return bte + mu + dev[g[te]]
def m_pool_ind(D, tr, te):
    btr, bte, mu, dev, g = _pool(D, tr, te, 'ind'); return bte + mu + dev[g[te]]

def m_trend(D, tr, te):
    """Company's own last change, shrunk toward the (partially pooled) industry change. Slope clipped to [0,1]."""
    btr, bte, mu, dev, g = _pool(D, tr, te, 'grp')
    base_te = bte + mu + dev[g[te]]
    have = ~np.isnan(D.dl[tr])
    if have.sum() < 10:
        return base_te
    mu_dl, dev_dl = eb_shrink(D.dl[tr][have], g[tr][have], D.ngrp)
    x_tr = D.dl[tr][have] - (mu_dl + dev_dl[g[tr][have]])
    r2 = (D.d[tr] - btr - mu - dev[g[tr]])[have]
    den = float(np.sum(x_tr ** 2))
    b = float(np.clip(np.sum(x_tr * r2) / den, 0.0, 1.0)) if den > 1e-12 else 0.0
    x_te = np.where(np.isnan(D.dl[te]), 0.0, D.dl[te] - (mu_dl + dev_dl[g[te]]))
    return base_te + b * x_te

# ----------------------------------------------------------------------------- ridge / LAD
LAMS = np.array([0.1, 1, 3, 10, 30, 100, 300, 1000, 1e5])

def _design(D, tr, te, kind):
    cols_tr, cols_te = [], []
    def add(a):
        cols_tr.append(a[tr]); cols_te.append(a[te])
    add(D.y0)
    if kind in ('core', 'full'):
        have = ~np.isnan(D.dl[tr])
        if have.sum() >= 10:
            m = D.dl[tr][have].mean()
            dlc = np.where(np.isnan(D.dl), 0.0, D.dl - m)
            add(dlc)
            miss = np.isnan(D.dl).astype(float)
            if 0 < miss[tr].sum() < len(tr): add(miss)
        add(D.ls)
    if kind == 'full':
        if np.ptp(D.ld[tr]) > 0: add(D.ld)
        for k in range(D.ngrp):
            ind = (D.grp == k).astype(float)
            if 2 <= ind[tr].sum() <= len(tr) - 2: add(ind)
    if D.nyr > 1:
        for u in np.unique(D.yr[tr])[1:]:
            add((D.yr == u).astype(float))
    Xtr = np.column_stack(cols_tr); Xte = np.column_stack(cols_te)
    mu = Xtr.mean(0); sd = Xtr.std(0)
    keep = sd > 1e-9
    return (Xtr[:, keep] - mu[keep]) / sd[keep], (Xte[:, keep] - mu[keep]) / sd[keep]

def _ridge_pick(X, y):
    n = len(y)
    xm = X.mean(0); ym = y.mean()
    Xc = X - xm; yc = y - ym
    U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
    Uty = U.T @ yc
    best = (np.inf, LAMS[-1])
    for lam in LAMS:
        f = s ** 2 / (s ** 2 + lam)
        fit = U @ (f * Uty)
        h = 1.0 / n + (U ** 2) @ f
        res = (yc - fit) / (1 - np.minimum(h, 0.999))
        crit = float(np.mean(np.abs(res)))
        if crit < best[0]: best = (crit, lam)
    return best[1]

def _ridge_fit(X, y, lam):
    xm = X.mean(0); ym = y.mean()
    Xc = X - xm; yc = y - ym
    A = Xc.T @ Xc + lam * np.eye(X.shape[1])
    beta = np.linalg.solve(A, Xc.T @ yc)
    return ym - xm @ beta, beta

def _lad_fit(X, y, lam, iters=30, delta=0.25):
    n, p = X.shape
    w = np.ones(n)
    for _ in range(iters):
        W = w / w.sum()
        xm = W @ X; ym = W @ y
        Xc = X - xm; yc = y - ym
        A = Xc.T @ (Xc * w[:, None]) / w.mean() + lam * np.eye(p)
        beta = np.linalg.solve(A, Xc.T @ (w * yc) / w.mean())
        b0 = ym - xm @ beta
        r = y - b0 - X @ beta
        w = 1.0 / np.maximum(np.abs(r), delta)
    return b0, beta

def _linear(D, tr, te, kind, lad):
    Xtr, Xte = _design(D, tr, te, kind)
    y = D.d[tr]
    if Xtr.shape[1] == 0: return np.full(len(te), y.mean())
    lam = _ridge_pick(Xtr, y)
    b0, beta = (_lad_fit if lad else _ridge_fit)(Xtr, y, lam)
    return b0 + Xte @ beta

def m_ridge_rev(D, tr, te): return _linear(D, tr, te, 'rev', False)
def m_ridge_core(D, tr, te): return _linear(D, tr, te, 'core', False)
def m_ridge_full(D, tr, te): return _linear(D, tr, te, 'full', False)
def m_lad_core(D, tr, te): return _linear(D, tr, te, 'core', True)
def m_lad_full(D, tr, te): return _linear(D, tr, te, 'full', True)

MODELS = {
    'persistence': m_persist,
    'persist+mean(pooled)': m_mean_pooled,
    'persist+mean(year)': m_mean_year,
    'persist+median(year)': m_median_year,
    'pool_industry(NIC2/sector)': m_pool_ind,
    'pool_industry(coarse)': m_pool_grp,
    'own_trend_shrunk': m_trend,
    'ridge(last value)': m_ridge_rev,
    'ridge(value,trend,size)': m_ridge_core,
    'ridge(+industry)': m_ridge_full,
    'LAD(value,trend,size)': m_lad_core,
    'LAD(+industry)': m_lad_full,
}

def model_names(D):
    names = list(MODELS)
    if D.nyr == 1:
        names.remove('persist+mean(year)')            # identical to pooled when there is a single year
    if D.same_ind_grp:
        names.remove('pool_industry(NIC2/sector)')
    return names

# ----------------------------------------------------------------------------- cross-validation
def make_folds(cid, K, rng):
    u = np.unique(cid)
    perm = rng.permutation(len(u))
    fold_of = {c: i % K for i, c in zip(range(len(u)), u[perm])}
    return np.array([fold_of[c] for c in cid])

def check_finite(*arrs):
    for a in arrs:
        if not np.all(np.isfinite(a)):
            raise RuntimeError('non-finite prediction')

def oof_repeated(D, names, K=5, R=20, seed=0):
    """Out-of-fold predicted change, shape (R, n) per model, plus fold ids (R, n). Folds are by company."""
    preds = {m: np.zeros((R, D.n)) for m in names}
    folds = np.zeros((R, D.n), dtype=int)
    for r in range(R):
        rng = np.random.RandomState(seed * 1000 + r)
        fo = make_folds(D.cid, K, rng); folds[r] = fo
        for k in range(K):
            te = np.where(fo == k)[0]; tr = np.where(fo != k)[0]
            for m in names:
                preds[m][r, te] = MODELS[m](D, tr, te)
    for m in names: check_finite(preds[m])
    return preds, folds

def oof_loo(D, names):
    preds = {m: np.zeros(D.n) for m in names}
    for c in np.unique(D.cid):
        te = np.where(D.cid == c)[0]; tr = np.where(D.cid != c)[0]
        for m in names:
            preds[m][te] = MODELS[m](D, tr, te)
    for m in names: check_finite(preds[m])
    return preds

def auto_nested(D, names, mask, K=5, R=10, seed=7, K_in=5):
    """Nested model selection: within each outer training fold choose the candidate with the lowest inner-CV MAE
    (on the evaluation mask), refit on the whole training fold, predict the test fold."""
    preds = np.zeros((R, D.n)); chosen = {m: 0 for m in names}
    for r in range(R):
        rng = np.random.RandomState(seed * 1000 + r)
        fo = make_folds(D.cid, K, rng)
        for k in range(K):
            te = np.where(fo == k)[0]; tr = np.where(fo != k)[0]
            fi = make_folds(D.cid[tr], K_in, np.random.RandomState(seed * 7919 + r * 31 + k))
            errs = {m: np.zeros(len(tr)) for m in names}
            for j in range(K_in):
                ite = np.where(fi == j)[0]; itr = np.where(fi != j)[0]
                for m in names:
                    errs[m][ite] = np.abs(D.d[tr][ite] - MODELS[m](D, tr[itr], tr[ite]))
            sel = mask[tr] if mask[tr].sum() >= 20 else np.ones(len(tr), bool)
            best = min(names, key=lambda m: errs[m][sel].mean())
            chosen[best] += 1
            preds[r, te] = MODELS[best](D, tr, te)
    check_finite(preds)
    return preds, chosen

def conformal_eval(D, name, mask, alphas=(0.2, 0.1), K=5, R=10, seed=11, K_in=5):
    """Nested split/cross-conformal: for each outer fold the interval half-width is the (1-alpha) conformal quantile of
    inner-CV absolute residuals on the training fold (evaluation-mask pairs only); coverage is measured on the held-out fold."""
    hw = {a: [] for a in alphas}; cov_hit = {a: 0 for a in alphas}; cov_n = 0
    for r in range(R):
        rng = np.random.RandomState(seed * 1000 + r)
        fo = make_folds(D.cid, K, rng)
        for k in range(K):
            te = np.where(fo == k)[0]; tr = np.where(fo != k)[0]
            if name == 'persistence':
                res = np.abs(D.d[tr])
                pr = np.zeros(len(te))
            else:
                fi = make_folds(D.cid[tr], K_in, np.random.RandomState(seed * 7919 + r * 31 + k))
                res = np.zeros(len(tr))
                for j in range(K_in):
                    ite = np.where(fi == j)[0]; itr = np.where(fi != j)[0]
                    res[ite] = np.abs(D.d[tr][ite] - MODELS[name](D, tr[itr], tr[ite]))
                pr = MODELS[name](D, tr, te)
            rm = np.sort(res[mask[tr]])
            n = len(rm)
            tm = mask[te]
            err = np.abs(D.d[te] - pr)[tm]
            cov_n += tm.sum()
            for a in alphas:
                kk = int(math.ceil((n + 1) * (1 - a)))
                q = rm[min(kk, n) - 1]
                hw[a].append(q)
                cov_hit[a] += int(np.sum(err <= q + 1e-12))
    return {a: dict(halfwidth=float(np.mean(hw[a])), coverage=cov_hit[a] / cov_n) for a in alphas}

# ----------------------------------------------------------------------------- metrics
def boot_diff(cid, e_base, e_model, B=2000, seed=3, mask=None):
    """Cluster (by company) bootstrap of mean(e_base - e_model) and of the relative improvement."""
    if mask is not None:
        cid = cid[mask]; e_base = e_base[mask]; e_model = e_model[mask]
    u, inv = np.unique(cid, return_inverse=True)
    G = len(u)
    sd = np.bincount(inv, weights=e_base - e_model, minlength=G)
    sb = np.bincount(inv, weights=e_base, minlength=G)
    cnt = np.bincount(inv, minlength=G).astype(float)
    rng = np.random.RandomState(seed)
    ids = rng.randint(0, G, size=(B, G))
    num = sd[ids].sum(1); den = cnt[ids].sum(1); bas = sb[ids].sum(1)
    diff = num / den; rel = num / bas
    return dict(diff=float(sd.sum() / cnt.sum()), diff_ci=(float(np.percentile(diff, 2.5)), float(np.percentile(diff, 97.5))),
                rel=float(sd.sum() / sb.sum()), rel_ci=(float(np.percentile(rel, 2.5)), float(np.percentile(rel, 97.5))))

def agg_error(D, pred_delta, folds, mask, min_cell=8):
    """Mean over (repeat, fold, year) cells of |mean(pred - actual)| for the held-out companies: the error on the
    average change if that cell's companies were missing. pred_delta: (R, n)."""
    R = folds.shape[0]; out = []
    for r in range(R):
        for k in np.unique(folds[r]):
            for u in D.yrs:
                m = (folds[r] == k) & (D.yr == u) & mask
                if m.sum() >= min_cell:
                    out.append(abs(float(np.mean(pred_delta[r][m] - D.d[m]))))
    return float(np.mean(out)) if out else float('nan'), len(out)

def describe_persistence(d):
    a = np.abs(d)
    return dict(n=int(len(d)), mean_abs=float(a.mean()), median_abs=float(np.median(a)), p90_abs=float(np.percentile(a, 90)),
                within1=float(np.mean(a <= 1.0)), within2=float(np.mean(a <= 2.0)), within05=float(np.mean(a <= 0.5)),
                mean_signed=float(d.mean()), se_signed=float(d.std(ddof=1) / math.sqrt(len(d))), rmse=float(math.sqrt(np.mean(d ** 2))),
                share_unchanged=float(np.mean(a < 0.005)))
