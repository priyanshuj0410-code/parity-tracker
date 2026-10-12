import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import warnings; warnings.filterwarnings('ignore')
from common import *
K,_=load_kaggle(); S,_=load_checked()
d=K[K.w.notna()&K.fPerm.notna()].reset_index(drop=True)
y=d.w.values
def run(name, X, fit):
    m=cv_eval(fit, X, y, repeats=5, seed=3, nested=False)
    print('%-34s MAE=%.3f R2=%.3f'%(name,m['MAE'],m['R2']))
    return m
z=logit(d.fPerm.values)
base=run('logit-logit', z[:,None], make_fit('lin',True,False))
run('logit-logit + quad', np.column_stack([z,z**2]), make_fit('lin',True,False))
# log-log
def loglog(Xtr,ytr,Xte):
    A=np.column_stack([np.ones(len(Xtr)),np.log(np.maximum(Xtr[:,0],0.2))]); b=np.linalg.lstsq(A,np.log(np.maximum(ytr,0.2)),rcond=None)[0]
    At=np.column_stack([np.ones(len(Xte)),np.log(np.maximum(Xte[:,0],0.2))]); return np.clip(np.exp(At@b),0,100)
run('log-log (floor 0.2pp)', d.fPerm.values[:,None], loglog)
# kNN on logit fPerm
def knn(Xtr,ytr,Xte,k=25):
    out=[]
    for x in Xte[:,0]:
        idx=np.argsort(np.abs(Xtr[:,0]-x))[:k]; out.append(np.median(ytr[idx]))
    return np.array(out)
run('kNN k=25 median on logit fPerm', z[:,None], knn)
run('identity', d.fPerm.values[:,None], make_fit('identity'))
# with headcount interaction
run('logit + logHead + logHead*z', np.column_stack([z,d.logHead.values,d.logHead.values*z]), make_fit('lin',True,False))
