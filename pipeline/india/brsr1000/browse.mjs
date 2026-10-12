// Read report links from investor pages that build their links with JavaScript (PARITY-123). Headless Chrome opens a
// company's home page and its usual investor paths, waits for the page to load, and collects every PDF link, plus the
// investor sub-pages one click away. It never tries to get past a site's bot protection: a 401/403/429/503 answer or a
// challenge page ("Access Denied", "Just a moment") ends that company's visit and records it as blocked.
//
//   node browse.mjs <data dir> <key> [<key> ...]      writes <data>/browse/<key>.json
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [data, ...keys] = process.argv.slice(2)
const Q = JSON.parse(readFileSync(join(data, 'queue.json'), 'utf8'))
mkdirSync(join(data, 'browse'), { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9700 + Math.floor(Math.random() * 200)
// A profile of its own per run, so a batch's browse step and the daily watch can run at the same time.
const profile = join(data, 'tmp', 'chrome-' + process.pid)
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let tabs
for (let i = 0; i < 100 && !tabs; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json() } catch { await sleep(300) } }
if (!tabs) { console.error('Chrome did not start'); chrome.kill(); process.exit(2) }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let n = 0; const pend = new Map(); let lastStatus = null; const pdfReq = new Set()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || {}); pend.delete(m.id) }
  if (m.method === 'Network.responseReceived' && m.params.type === 'Document') lastStatus = m.params.response.status
  if (m.method === 'Network.requestWillBeSent' && /\.pdf(\?|$)/i.test(m.params.request.url)) pdfReq.add(m.params.request.url)
  // An alert or confirm box freezes the page and every later command until someone answers it.
  if (m.method === 'Page.javascriptDialogOpening') ws.send(JSON.stringify({ id: ++n, method: 'Page.handleJavaScriptDialog', params: { accept: true } }))
})
// Chrome may never answer a command on a dead or frozen page; give up after 15 seconds so one site cannot stall the run.
const send = (method, params = {}) => new Promise((r, j) => {
  const id = ++n
  const t = setTimeout(() => { pend.delete(id); j(new Error(`${method} timed out`)) }, 15000)
  pend.set(id, (v) => { clearTimeout(t); r(v) }); ws.send(JSON.stringify({ id, method, params }))
})
const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result?.value
await send('Page.enable'); await send('Network.enable')

const PATHS = ['', '/investors', '/investor-relations', '/investor', '/annual-reports', '/annual-report', '/financials', '/reports',
  '/shareholders', '/regulation-46', '/disclosures-under-regulation-46', '/investor/annual-reports', '/investors/annual-reports',
  '/brsr', '/investor/brsr', '/sustainability']
const CHALLENGE = /access denied|just a moment|attention required|request unsuccessful|are you a robot|captcha|forbidden/i
const score = (h, t) => {
  const s = `${h} ${t}`.toLowerCase()
  return (/2025-?26|fy ?26|2026/.test(s) ? 4 : 0) + (/brsr|business.?responsibility/.test(s) ? 3 : 0) +
         (/annual.?report|integrated/.test(s) ? 2 : 0) - (/2024-?25|2023|2022|notice|policy|results|outcome/.test(s) ? 2 : 0)
}

async function visit(url) {
  lastStatus = null
  await send('Page.navigate', { url })
  for (let i = 0; i < 20; i++) { await sleep(400); if ((await ev('document.readyState')) === 'complete') break }
  await sleep(2500)  // let scripts fetch and draw the document lists
  const title = (await ev('document.title')) || ''
  const body = (await ev('document.body ? document.body.innerText.slice(0, 400) : ""')) || ''
  const blocked = [401, 403, 429, 503].includes(lastStatus) || CHALLENGE.test(title) || (CHALLENGE.test(body) && body.length < 400)
  const links = blocked ? [] : (await ev(`[...document.querySelectorAll('a[href],iframe[src],embed[src],object[data]')]
      .map(a => ({ href: a.href || a.src || a.data, text: (a.innerText || a.title || '').trim().slice(0, 140) }))
      .filter(l => l.href && l.href.startsWith('http'))`)) || []
  return { url, status: lastStatus, title: title.slice(0, 120), blocked, links }
}

for (const key of keys) {
  const site = (Q[key]?.website || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const out = { key, site, pages: [], pdfs: [], blocked: false }
  if (!site) { out.note = 'no website on record'; writeFileSync(join(data, 'browse', key + '.json'), JSON.stringify(out, null, 1)); continue }
  pdfReq.clear()
  const seen = new Set(); const queue = PATHS.map((p) => `https://www.${site.replace(/^www\./, '')}${p}`)
  const host = site.replace(/^www\./, '')
  const deadline = Date.now() + 120000  // two minutes per company
  while (queue.length && out.pages.length < 24) {
    if (Date.now() > deadline) { out.note = 'stopped at the two-minute limit'; break }
    const u = queue.shift(); if (seen.has(u)) continue; seen.add(u)
    let r; try { r = await visit(u) } catch (e) { out.pages.push({ url: u, error: String(e).slice(0, 80) }); continue }
    out.pages.push({ url: u, status: r.status, title: r.title, blocked: r.blocked, links: r.links.length })
    if (r.blocked) { out.blocked = true; if (out.pages.filter((p) => p.blocked).length >= 2) break; continue }
    for (const l of r.links) {
      if (/\.pdf(\?|#|$)/i.test(l.href) || /\/pdf\//i.test(l.href)) out.pdfs.push({ ...l, score: score(l.href, l.text) })
      else if (l.href.includes(host) && /investor|annual|report|brsr|financ|sustainab|disclos|share/i.test(l.href + l.text) && !seen.has(l.href)) queue.push(l.href.split('#')[0])
    }
  }
  for (const u of pdfReq) out.pdfs.push({ href: u, text: '(requested by the page)', score: score(u, '') })
  const uniq = new Map(); for (const p of out.pdfs) if (!uniq.has(p.href) || uniq.get(p.href).score < p.score) uniq.set(p.href, p)
  out.pdfs = [...uniq.values()].sort((a, b) => b.score - a.score).slice(0, 40)
  writeFileSync(join(data, 'browse', key + '.json'), JSON.stringify(out, null, 1))
  console.log(key, site, 'pages', out.pages.length, 'pdfs', out.pdfs.length, 'blocked', out.blocked, 'best', out.pdfs[0]?.score, out.pdfs[0]?.href?.slice(-70))
}
ws.close(); chrome.kill()
import('node:fs').then(fs => setTimeout(() => fs.rmSync(profile, { recursive: true, force: true }), 500))
