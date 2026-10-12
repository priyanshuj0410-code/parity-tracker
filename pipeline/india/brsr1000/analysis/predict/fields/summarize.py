import json, os
R = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'analysis', 'predict', 'fields', 'results.json')))
print(json.dumps(R['filters']['kaggleLog']))
print(json.dumps(R['parserCheck']))
def tab(sec, tiers=None, names=None):
    print('\n###', sec)
    for t in R[sec]:
        if tiers and not any(t['tier'].startswith(x) for x in tiers): continue
        if not t['models']: continue
        print('[%s] n=%d mean=%.2f med=%.2f SD=%.2f IQR=%.2f' % (t['tier'], t['n'], t['mean'], t['median'], t['sd'], t['iqr']))
        for m in t['models']:
            if names and not any(m['name'].startswith(x) for x in names): continue
            g = m.get('gain')
            print('   %-48s MAE %.2f R2 %.2f cov80 %.2f(+/-%.1f) cov90 %.2f(+/-%.1f) logit90 cov %.2f hw %.1f%s' % (
                m['name'], m['MAE'], m['R2'], m['cov80'], m['hw80'], m['cov90'], m['hw90'], m['covR90'], m['hwR90_med'],
                (' | gain %.2f [%.2f, %.2f] vs %s (%.2f)' % (g['d'], g['lo'], g['hi'], g['base'], g['baseMAE'])) if g else ''))
for sec in ('T1_kaggle_cv', 'T1_checked_holdout', 'T1_checked_cv', 'T2_kaggle_cv', 'T2_checked_holdout', 'T2_checked_cv'):
    tab(sec)
