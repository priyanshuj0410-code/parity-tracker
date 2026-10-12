"""Sanity tests for the numerics (run: python3 -I selftest.py)."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import site; sys.path.append(site.getusersitepackages())
import numpy as np
import nowcast_lib as L
rng = np.random.RandomState(0)
# 1. ridge LOO closed form == brute force
n, p = 40, 4
X = rng.randn(n, p); y = X @ np.array([1., -.5, 0, 0]) + rng.randn(n)
lam = 3.0
xm = X.mean(0); ym = y.mean(); Xc = X - xm; yc = y - ym
U, s, Vt = np.linalg.svd(Xc, full_matrices=False)
f = s**2/(s**2+lam); fit = U @ (f*(U.T@yc)); h = 1/n + (U**2)@f
loo_cf = (yc-fit)/(1-h)
loo_bf = np.zeros(n)
for i in range(n):
    m = np.arange(n) != i
    b0, b = L._ridge_fit(X[m], y[m], lam)
    loo_bf[i] = y[i] - (b0 + X[i]@b)
print('LOO closed form vs brute force max abs diff:', np.abs(loo_cf-loo_bf).max())
# 2. ridge vs lstsq on augmented system
b0, b = L._ridge_fit(X, y, lam)
Xa = np.vstack([Xc, np.sqrt(lam)*np.eye(p)]); ya = np.concatenate([yc, np.zeros(p)])
bl = np.linalg.lstsq(Xa, ya, rcond=None)[0]
print('ridge vs lstsq diff:', np.abs(b-bl).max())
# 3. LAD on data with outliers is closer to the median-regression truth than OLS
x = rng.randn(200, 1); yy = 2*x[:, 0] + rng.standard_t(1.5, 200)
print('LAD slope %.2f OLS slope %.2f (truth 2)' % (L._lad_fit(x, yy, 1e-6)[1][0], L._ridge_fit(x, yy, 1e-6)[1][0]))
# 4. EB pooling recovers group effects
g = rng.randint(0, 6, 300); true = np.array([-1, -.5, 0, 0, .5, 1.])
r = true[g] + rng.randn(300)*0.7
mu, dev = L.eb_shrink(r, g, 6)
print('EB shrunk devs', np.round(dev, 2), 'raw', np.round([r[g==k].mean()-r.mean() for k in range(6)], 2))
g2 = rng.randint(0, 6, 300); r2 = rng.randn(300)
print('EB with no true group effect (should be ~0):', np.round(L.eb_shrink(r2, g2, 6)[1], 3))
# 5. conformal coverage on synthetic iid data via the real code path
recs = []
for i in range(300):
    y0 = rng.rand()*30
    recs.append(dict(cid=i, ind=i % 5, grp=i % 5, yr=0, y0=y0, y1=y0 + 0.3 + rng.standard_t(3)*1.0, dl=np.nan, ls=rng.randn(), ld=0.0))
D = L.Data(recs)
cf = L.conformal_eval(D, 'persist+mean(pooled)', np.ones(D.n, bool), R=6)
print('synthetic conformal coverage (want ~0.8, ~0.9):', {a: round(v['coverage'], 3) for a, v in cf.items()}, 'halfwidths', {a: round(v['halfwidth'], 2) for a, v in cf.items()})
# 6. folds are by company: a company with several pairs lands in one fold
cid = np.repeat(np.arange(50), 3); fo = L.make_folds(cid, 5, np.random.RandomState(1))
print('companies split across folds:', sum(len(set(fo[cid == c])) > 1 for c in range(50)))
