import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gdata import *; from gsim import *
rng=np.random.default_rng(3)
n=60
s25=rng.uniform(5,40,n); w=rng.lognormal(0,1,n); grp=['g%d'%(i%6) for i in range(n)]
def mk(s26): return DS('t',range(n),s25,s26,w,w,grp)
# 1. no change: all rules exact
ds=mk(s25.copy()); mask=np.zeros(n,bool); mask[rng.choice(n,12,replace=False)]=True
e=estimate(ds,mask)
assert all(abs(e[r]-ds.truth())<1e-9 for r in RULES if r!='a_drop'), e
# 2. constant +1.0 change
ds=mk(s25+1.0); e=estimate(ds,mask); T=ds.truth()
s=(w[mask]).sum()/w.sum()
assert abs(e['b_carry']-(T-s*1.0))<1e-9
for r in ('c1_pooled','c2_industry','d_shrink','d2_shrink_rev'): assert abs(e[r]-T)<1e-9,(r,e[r],T)
assert abs(e['a_drop']-(w[~mask]*(s25+1)[~mask]).sum()/w[~mask].sum())<1e-12
# 3. c1 level = T25 + mu exactly when fit = obs
s26=s25+rng.normal(0.3,1,n); ds=mk(s26); e=estimate(ds,mask)
mu=(w[~mask]*(s26-s25)[~mask]).sum()/w[~mask].sum()
assert abs(e['c1_pooled']-(ds.last()+mu))<1e-9
assert abs(e['_a_lfl_change']-mu)<1e-12
# 4. error identity with brute-force for rule b
brute=((w[~mask]*s26[~mask]).sum()+(w[mask]*s25[mask]).sum())/w.sum()
assert abs(e['b_carry']-brute)<1e-12
# 5. masks: counts and patterns
for pat in ('random','small','large'):
    m=make_masks(ds,pat,0.2,200,np.random.default_rng(1)); assert (m.sum(1)==12).all()
ms=make_masks(ds,'small',0.2,2000,np.random.default_rng(1)).mean(0); ml=make_masks(ds,'large',0.2,2000,np.random.default_rng(1)).mean(0)
order=np.argsort(w)
print('small-biased: P(masked) smallest 5 %.2f largest 5 %.2f'%(ms[order[:5]].mean(),ms[order[-5:]].mean()),'| large-biased smallest 5 %.2f largest 5 %.2f'%(ml[order[:5]].mean(),ml[order[-5:]].mean()))
mc=make_masks(ds,'cluster',0.2,300,np.random.default_rng(1))
gi=ds.grp
ok=all(all(mc[i][gi==g].all() or (~mc[i][gi==g]).all() for g in range(ds.G)) for i in range(300))
print('cluster masks whole industries:',ok,'mean masked frac %.2f'%mc.mean())
# 6. fit_ok exclusion
ds2=mk(s26); ds2.fit_ok=np.ones(n,bool); ds2.fit_ok[:10]=False
e2=estimate(ds2,np.isin(np.arange(n),[20,21,22]))
print('all tests passed')
