// Country medians on Nivel's shared measures against cultural dimensions (knowledge/research/culture-and-parity-2026-10.md).
// Run: node pipeline/research/culture_corr.mjs
import { readFileSync } from 'node:fs'
const cos = Object.values(JSON.parse(readFileSync(new URL('../../src/data/companies.json', import.meta.url),'utf8')))
const EXC = { DE:'DEU', AS:'NLD', PA:'FRA', BR:'BEL', MC:'ESP', MI:'ITA', HE:'FIN', ST:'SWE', CO:'DNK', WA:'POL', VI:'AUT', IR:'IRL' }
const iso = c => ({IN:'IND',GB:'GBR',AU:'AUS',JP:'JPN'})[c.country] ?? EXC[c.exchange]
const latest = c => { const ks = Object.keys(c.years); return ks.includes('latest') ? 'latest' : ks.sort().at(-1) }
const E = (c,y) => c.country==='IN'||c.country==='JP' ? y.fPerm : y.fAll
const W = (c,y) => { if (c.country!=='IN') return y.gapMean==null?null:1-y.gapMean; if (y.w==null||y.fPerm==null||y.fPerm<=0||y.fPerm>=1||y.w<=0||y.w>=1) return null; return (y.w/y.fPerm)/((1-y.w)/(1-y.fPerm)) }
const med = a => { a=[...a].sort((x,y)=>x-y); const n=a.length; return n%2?a[n>>1]:(a[n/2-1]+a[n/2])/2 }
const by = {}
for (const c of cos) { const k = iso(c); if (!k) continue; const y = c.years[latest(c)]; if (!y) continue; const e=E(c,y), w=W(c,y); if (e==null||w==null||w<0.3||w>1.3) continue; (by[k]??=[]).push({e,w,s:e*w/(e*w+1-e)}) }
// culture
// Hofstede 6-D scores (pdi idv mas uai ltowvs ivr), dimension data matrix 2015-08-16, geerthofstede.com
const H = { SWE:[31,71,5,29,53,78], DEN:[18,74,16,23,35,70], POL:[68,60,64,93,38,29], AUT:[11,55,79,70,60,63], IRE:[28,70,68,35,24,65], IND:[77,48,56,40,51,26], JPN:[54,46,95,92,88,42], GBR:[35,89,66,35,51,69], AUL:[38,90,61,51,21,71], GER:[35,67,66,65,83,40], NET:[38,80,14,53,67,68], FRA:[68,71,43,86,63,48], BEL:[65,75,54,94,82,57], SPA:[57,51,42,86,48,44], ITA:[50,76,70,75,61,30], FIN:[33,63,26,59,38,57] }
const HK = { IND:'IND', JPN:'JPN', GBR:'GBR', AUS:'AUL', DEU:'GER', NLD:'NET', FRA:'FRA', BEL:'BEL', ESP:'SPA', ITA:'ITA', FIN:'FIN', SWE:'SWE', DNK:'DEN', POL:'POL', AUT:'AUT', IRL:'IRE' }
// GLOBE Phase 2 gender egalitarianism [societal practices, societal values]; Germany is West
const GE = { GBR:[3.67,5.17], ITA:[3.24,4.88], IND:[2.90,4.51], JPN:[3.19,4.33], FIN:[3.35,4.24], ESP:[3.01,4.82], NLD:[3.50,4.99], FRA:[3.64,4.40], AUS:[3.40,5.02], DEU:[3.10,4.89], SWE:[3.84,5.15], DNK:[3.93,5.08], POL:[4.02,4.52], AUT:[3.09,4.83], IRL:[3.21,5.14] }
// World Bank SL.TLF.CACT.FE.ZS, 2024 (modelled ILO estimate)
const FLFP = { AUS:62.6, BEL:50.0, DEU:55.6, ESP:53.2, FIN:56.7, FRA:51.8, GBR:57.5, IND:32.4, ITA:41.0, JPN:55.6, NLD:62.9, SWE:61.7, DNK:60.9, POL:51.9, AUT:55.4, IRL:59.8 }
const rows = Object.entries(by).map(([k,a]) => ({ k, n:a.length, E:med(a.map(x=>x.e)), W:med(a.map(x=>x.w)), S:med(a.map(x=>x.s)), pdi:H[HK[k]][0], idv:H[HK[k]][1], mas:H[HK[k]][2], uai:H[HK[k]][3], lto:H[HK[k]][4], ivr:H[HK[k]][5], geP:GE[k]?.[0], geV:GE[k]?.[1], flfp:FLFP[k] }))
rows.sort((a,b)=>a.S-b.S)
console.log('country  n    E     W     S   | pdi idv mas uai lto ivr | GLOBE GE prac/val | FLFP')
for (const r of rows) console.log(`${r.k}  ${String(r.n).padStart(3)}  ${(r.E*100).toFixed(0).padStart(4)} ${(r.W*100).toFixed(0).padStart(5)} ${(r.S*100).toFixed(0).padStart(5)} | ${[r.pdi,r.idv,r.mas,r.uai,r.lto,r.ivr].map(v=>String(v).padStart(3)).join(' ')} | ${r.geP??'  - '} / ${r.geV??'  - '} | ${r.flfp}`)
const rank = a => { const s=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]); const r=Array(a.length); let i=0; while(i<s.length){let j=i; while(j+1<s.length&&s[j+1][0]===s[i][0]) j++; for(let t=i;t<=j;t++) r[s[t][1]]=(i+j)/2; i=j+1} return r }
const pear = (x,y) => { const mx=x.reduce((s,v)=>s+v,0)/x.length, my=y.reduce((s,v)=>s+v,0)/y.length; let a=0,b=0,c=0; for(let i=0;i<x.length;i++){a+=(x[i]-mx)*(y[i]-my); b+=(x[i]-mx)**2; c+=(y[i]-my)**2} return a/Math.sqrt(b*c) }
const sp = (x,y) => pear(rank(x),rank(y))
let seed=7; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648; return seed/2147483648}
const perm = (x,y,r0) => { let hit=0; const N=20000; const yy=[...y]; for(let t=0;t<N;t++){ for(let i=yy.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1)); [yy[i],yy[j]]=[yy[j],yy[i]]} if(Math.abs(sp(x,yy))>=Math.abs(r0)-1e-12) hit++ } return hit/N }
for (const [label, set] of [['all countries', rows], ['countries with 5+ companies', rows.filter(r=>r.n>=5)], ['single-country markets only (IN GB AU JP)', rows.filter(r=>['IND','GBR','AUS','JPN'].includes(r.k))]]) {
  console.log(`\n== ${label} (n=${set.length})`)
  for (const m of ['E','W','S']) {
    const out=[]; for (const d of ['pdi','idv','mas','uai','lto','ivr','geP','geV','flfp']) { const s2=set.filter(r=>r[d]!=null); if (s2.length<4) continue; const r0=sp(s2.map(r=>r[d]), s2.map(r=>r[m])); out.push(`${d} ${r0>=0?'+':''}${r0.toFixed(2)}${s2.length>=6?' p='+perm(s2.map(r=>r[d]), s2.map(r=>r[m]), r0).toFixed(3):''}`) }
    console.log(m+': '+out.join(' | '))
  }
}
