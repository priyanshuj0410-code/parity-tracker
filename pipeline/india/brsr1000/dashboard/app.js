/* Parity dashboard (PARITY-126, PARITY-130), begun as the BRSR build's: one page built only from the components in ui.js. Flows are in
   knowledge/plans/brsr-dashboard-flows.md. State lives in the URL hash; the page refreshes every 30 seconds. */
const { esc, ico } = UI;
const ls = { get(k, d) { try { const v = localStorage.getItem('brsr-' + k); return v == null ? d : JSON.parse(v) } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem('brsr-' + k, JSON.stringify(v)) } catch (e) { } } };
const STARTERS = [['Ladder by level', 'select standard, companies, women_pct_pooled from ladder_by_standard order by companies desc'],
  ['Boards under 20%', "select c.name, r.board_women, r.board_total from readings r join companies c using (key) where r.board_total > 0 and 1.0 * r.board_women / r.board_total < 0.2 order by c.name"],
  ['Companies reporting levels', "select c.name, count(*) levels from ladder l join companies c using (key) where l.standard not in ('board','kmp','staff','workers') group by c.name order by levels desc"]];
const TABLES = ['companies', 'fetches', 'readings', 'median_pay', 'ladder', 'functions', 'disabled', 'turnover_trend', 'min_wage', 'wellbeing', 'unions', 'training', 'reviews', 'flows', 'targets', 'profile', 'ladder_by_standard'];
const S = { o: null, runs: null, all: null, allTag: null, hier: null, pane: { key: null, data: null }, list: null,
  open: new Set(ls.get('open', [])), seen: new Set(ls.get('seen', [])), showSeen: false, more: false, undo: null,
  sql: ls.get('sql', null) || { q: STARTERS[0][1], res: null }, word: null, fail: 0, scroll: new Map(), opener: null };

/* ---------- formats ---------- */
const N = n => n == null ? 'n/a' : Number(n).toLocaleString('en-IN'), pc = n => n == null ? 'n/a' : (+n).toFixed(1) + '%';
const tm = s => s ? String(s).slice(11, 16) : '', day = s => s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + tm(s) : '';
const dur = m => m == null ? '' : m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
const r24 = s => { const m = String(s || '').match(/(\w+) (\d+) at (\d+)(?::(\d+))?(am|pm)/i); if (!m) return s || 'n/a'; const h = +m[3] % 12 + (m[5].toLowerCase() === 'pm' ? 12 : 0); return `${m[2]} ${m[1]}, ${String(h).padStart(2, '0')}:${m[4] || '00'}` };
const ST = { 'done-latest': 'FY2025-26', 'done-kaggle': 'FY2024-25 only', 'no-data': 'No usable report', 'in-batch': 'In a batch', 'todo': 'To do', 'done-deep': 'Deep pass done', 'merged': 'Duplicate' };
const STICON = { 'done-latest': ['check_circle', 'good'], 'done-kaggle': ['history', 'warn'], 'no-data': ['block', 'bad'], 'in-batch': ['progress_activity', 'accent'], 'todo': ['schedule', 'muted'], 'done-deep': ['layers', 'good'] };
const RANK = { 'done-latest': 0, 'done-deep': 0, 'done-kaggle': 1, 'no-data': 2, 'in-batch': 3, 'todo': 4 };
const LV = [['board', 'Board'], ['kmp', 'KMP'], ['top', 'Top'], ['senior', 'Senior'], ['middle', 'Middle'], ['junior', 'Junior'], ['staff', 'Staff'], ['workers', 'Workers']];
const KIND = { identity: ['Identity', 'person_search'], value: ['Value', 'calculate'], unit: ['Unit', 'straighten'], basis: ['Basis', 'compare_arrows'] };
const wide = () => innerWidth >= 1200, phone = () => innerWidth < 720;
const FYOF = y => `FY${y}-${String(y + 1).slice(2)}`;
const DUE27 = ['files', 'atRisk', 'joins']; // rankings.py groups that file a BRSR for FY2026-27
const NOTDUE = ['nd-new-listing', 'nd-new-top', 'nd-2026']; // no BRSR was due for FY2025-26 (dashboard.nodata_why)
// A read company's latest year with data ("2025"), else its state; the deep pass is not a state of its own any more.
const latestOf = c => c.status.startsWith('done') && c.years?.length ? String(c.years[c.years.length - 1]) : ST[c.status] || c.status;
const statusBadge = s => UI.badge(ST[s] || s, { tone: s === 'done-latest' ? 'good' : s === 'done-kaggle' ? 'warn' : s === 'no-data' ? 'bad' : 'muted' });
// A company's badge: its latest year with data once read (2025 good, older warn), else its state.
const yearBadge = c => c.status.startsWith('done') && c.years?.length ? UI.badge(latestOf(c), { tone: +latestOf(c) >= 2025 ? 'good' : 'warn', tip: `Latest data: ${FYOF(+latestOf(c))} or calendar ${latestOf(c)}` }) : statusBadge(c.status);

/* ---------- routing: the hash holds the view, its filters and the open pane ---------- */
const R = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
const href = p => { const r = { ...R(), ...p }; Object.keys(r).forEach(k => (r[k] == null || r[k] === '') && delete r[k]); return '#' + new URLSearchParams(r) };
UI.setHref(href);
const routeKey = () => { const r = R(); delete r.pane; delete r.need; delete r.bf; return new URLSearchParams(r).toString() };
function nav(p, push = true) {
  const h = href(p); if (h === (location.hash || '#')) return render(true);
  S.scroll.set(routeKey(), scrollY);
  const d = history.state?.d || 0;
  if (push) history.pushState({ d: d + 1, pane: !!p.pane, fromBase: !!p.pane && !R().pane }, '', h); else history.replaceState({ ...(history.state || {}), d }, '', h);
  render(true) }
function closePane() { if (history.state?.fromBase && history.state.d > 0) history.back(); else nav({ pane: null }, false) }
const sheetOff = p => wide() ? p : { ...p, pane: null }; // leaving the pane docked on desktop, closing a sheet on a phone

/* ---------- run state ---------- */
function stateOf() {
  const o = S.o;
  if (S.fail) return { tone: 'warn', word: "Can't reach the dashboard", sub: o ? `Showing data from ${tm(o.now)}` : 'No data yet' };
  if (!o) return { tone: '', word: 'Loading', sub: '' };
  const r = o.run, p = o.progress, stage = r.stageName, nx = 'next run ' + tm(r.nextRun), rs = S.runs?.runs || [];
  const last = rs.find(x => x.batch && !x.open && x.closedAt);
  switch (r.word) {
    case 'running': return r.batch ? { tone: 'good', word: `Running ${r.batch}`, sub: `${r.kind === 'gap' ? 'Gap fill at ' : ''}${stage || 'Opening'} · started ${tm(r.since)} · ${nx}` }
      : { tone: 'good', word: 'Starting a run', sub: `Opening a batch · started ${tm(r.since)}` };
    case 'overrunning': return { tone: 'warn', word: `Overrunning ${r.batch || ''}`.trim(), sub: `${r.minutes} min. The ${tm(r.nextRun)} run stops while it holds the lock.` };
    case 'stuck': return { tone: 'bad', word: 'Stuck', sub: `Lock held ${r.minutes} min. The next run takes it over.` };
    case 'stopped': return { tone: 'bad', word: `Stopped ${r.batch || ''}`.trim(), sub: `The next run resumes it · ${nx}` };
    case 'paused': return { tone: 'bad', word: 'Paused by usage', sub: `Week ${r.week}%, session ${r.session}% · ${nx}` };
    case 'finished': return { tone: 'good', word: 'Finished', sub: `${N(p.total)} of ${N(p.total)}. The schedule can be turned off.` };
    default: { const lost = rs[0]; if (lost && lost.outcome === 'lost') return { tone: 'warn', word: 'Idle', sub: `The ${tm(lost.slot)} run did not open a batch · ${nx}` };
      return { tone: '', word: 'Idle', sub: `${last ? last.batch + ' closed ' + tm(last.closedAt) + ' · ' : ''}${nx}` } } } }
const dot = t => `<span class="dot${t ? ' is-' + t : ''}"></span>`;

/* ---------- bar and strip ---------- */
// A strip line as units that wrap whole ("next run 11:24", "≈ 14:03"), so a narrow phone moves a unit down instead of cutting it.
const units = (cls, xs) => `<span class="${cls}">${xs.filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('')}</span>`;
// Measured over recent batches on the current schedule, or, until two have run on it, expected from how long batches take.
const paceWhy = (pa, r) => pa.basis === 'expected' ? `Expected ${pa.rate} an hour: fewer than two batches have run every ${r.slotMin} minutes, so it assumes each takes as many runs as the last ${pa.batches} lasted.`
  : `${pa.rate} companies an hour over the last ${pa.batches} ${pa.phase === 'gaps' ? 'gap ' : ''}batches.`;
function renderBar() {
  const o = S.o, st = stateOf(); UI.put($('#cStatus'), `<span class="bar__v">${dot(st.tone)}${esc(st.word)}</span><span class="bar__s">${esc(st.sub)}</span>`);
  UI.put($('#barAlert'), S.fail ? UI.quiet({ label: 'Try now', icon: 'refresh', act: 'retry' }) : '');
  ['#cProg', '#cFinish', '#cUsage'].forEach(s => $(s).hidden = !o);
  if (!o) return UI.put($('#strip'), `<span class="strip__a">${dot(st.tone)}${esc(st.word)}</span><span class="strip__c">${esc(st.sub)}</span>`);
  const r = o.run, pa = o.pace, gaps = pa.phase === 'gaps', pct = pa.total ? Math.round(100 * pa.done / pa.total) : 0;
  UI.put($('#cProg'), `<span class="bar__v">${N(pa.done)} of ${N(pa.total)}</span><span class="bar__s kv"><span class="mini"><i style="width:${pct}%"></i></span>${pct}%${gaps ? ' · gap fill' : ''}</span>`);
  $('#cProg').dataset.tip = gaps ? `All ${N(o.progress.total)} companies are read. Each run now reads again only the mandatory fields a checked reading lacks.` : '';
  $('#runBtn').dataset.tip = pa.eta ? `${paceWhy(pa, r)} Runs stop at ${r.gates.week}% of the week or ${r.gates.session}% of the session.` : '';
  UI.put($('#cFinish'), pa.eta ? `<span class="bar__v">≈ ${esc(day(pa.eta))}</span><span class="bar__s">${pa.rate} an hour</span>` : '<span class="bar__v tone-muted">Finish shows after two batches</span><span class="bar__s">&nbsp;</span>');
  const g = (v, gate) => `<span class="${v >= gate ? 'tone-bad' : v >= gate - 15 ? 'tone-warn' : ''}">${v ?? 'n/a'}%</span>`;
  $('#cUsage').classList.toggle('is-near', (r.week ?? 0) >= r.gates.week - 15 || (r.session ?? 0) >= r.gates.session - 15);
  UI.put($('#cUsage'), `<span class="bar__v"><span class="bar__l">Week</span> ${g(r.week, r.gates.week)} <span class="bar__l">Session</span> ${g(r.session, r.gates.session)}</span><span class="bar__s">${r.gated ? '<span class="tone-bad">Over a gate</span>' : 'Clear of the gates'}</span>`);
  const soon = s => new Date(s).toDateString() === new Date().toDateString() ? tm(s) : day(s);
  UI.put($('#strip'), `<span class="strip__a">${dot(st.tone)}${esc(st.word)}<span class="end">${ico('chevron_right', { tone: 'muted' })}</span></span>${units('strip__c', st.sub.split(' · '))}${units('strip__b', [(gaps && !st.sub.includes('Gap fill') ? 'Gap fill: ' : '') + `${N(pa.done)} of ${N(pa.total)} (${pct}%)`, pa.eta && '≈ ' + soon(pa.eta)])}`);
  UI.put($('#stripAlert'), S.fail ? UI.quiet({ label: 'Try now', icon: 'refresh', act: 'retry' }) : '');
  const n = needCount(); document.title = (n ? `(${n}) ` : '') + 'Parity · ' + st.word + (S.fail ? ' · offline' : '');
  if (S.word && S.word !== st.word) $('#live').textContent = st.word; S.word = st.word }

/* ---------- Needs you ---------- */
const checks = () => (S.o?.inbox.decisions || []).filter(d => S.showSeen || !S.seen.has(d.id) || S.undo?.id === d.id);
const unmatched = () => (S.o?.inbox.files || []).filter(f => f.problem === 'unmatched');
function needCount() { const i = S.o?.inbox; if (!i) return 0; return i.fetch.length + unmatched().length + (i.decisions || []).filter(d => !S.seen.has(d.id)).length }
function copyPath() { return UI.quiet({ label: 'Copy inbox path', icon: 'content_copy', act: 'copy', v: S.o?.inbox.inbox, tip: S.o?.inbox.inbox }) }
function renderNeeds(force) {
  if (!S.o) { if (S.fail) $('#needs').hidden = false; if (S.fail) UI.put($('#needsBody'), `<div class="card">${UI.empty({ icon: 'cloud_off', title: "Can't reach the dashboard.", text: 'The server at 127.0.0.1:8765 did not answer.', action: UI.btn({ label: 'Try again', icon: 'refresh', act: 'retry' }), role: 'alert' })}</div>`, force); return }
  const i = S.o.inbox, fetch = i.fetch, un = unmatched(), dec = checks(), seenN = (i.decisions || []).filter(d => S.seen.has(d.id)).length, unseen = (i.decisions || []).filter(d => !S.seen.has(d.id)).length;
  const kinds = [['fetch', 'Fetch by hand', fetch.length], ['files', 'Unmatched files', un.length], ['check', 'Check', unseen]].filter(k => k[2] || (k[0] === 'check' && dec.length));
  const f = kinds.some(k => k[0] === R().need) ? R().need : 'all';
  if (R().need && f === 'all') history.replaceState(history.state, '', href({ need: null }));
  $('#needs').hidden = !kinds.length; if (!kinds.length) return;  // nothing for the owner to do: no section at all
  UI.put($('#needsHead'), UI.sectionHead({ title: 'Needs you', count: needCount() || '', info: 'Everything only you can do: reports to fetch by hand, files the pipeline could not match, and checker flags that need your judgement.',
    actions: seenN ? UI.quiet({ label: S.showSeen ? 'Hide seen' : `Show seen (${seenN})`, act: 'showSeen', icon: S.showSeen ? 'visibility_off' : 'visibility' }) : '' }), force);
  let h = kinds.length > 1 ? `<div class="tags" role="group" aria-label="Filter" style="margin-bottom:var(--sp-4)">${[['all', 'All', kinds.reduce((a, k) => a + k[2], 0)], ...kinds].map(k => UI.tag({ label: k[1], count: k[2], act: 'need', v: k[0], pressed: f === k[0] })).join('')}</div>` : '';
  if ((f === 'all' || f === 'fetch') && fetch.length) h += UI.groupHead({ title: 'Fetch by hand', icon: 'download', count: fetch.length, info: 'Sites that block automated visitors, or list reports only in a browser. Save the FY2025-26 BRSR or annual report in the inbox; the next batch takes it in.', actions: copyPath() })
    + `<div class="card list" id="lFetch"></div>`;
  if ((f === 'all' || f === 'files') && un.length) h += UI.groupHead({ title: 'Unmatched files', icon: 'help', count: un.length, info: 'Files in the inbox that match no company by the CIN in their name or text, their Section A name or website, or their file name.' }) + `<div class="card list" id="lUnmatched"></div>`;
  if ((f === 'all' || f === 'check') && dec.length) h += UI.groupHead({ title: 'Check', icon: 'fact_check', count: unseen,
    info: 'Flags from the second checker (Sonnet) that need your judgement: is this the right company, is a figure or unit right, can it be compared with last year. Seen hides one in this browser.',
    actions: UI.quiet({ label: 'Mark all seen', icon: 'done_all', act: 'seenAll' }) }) + `<div class="card list" id="lCheck"></div>`;
  UI.put($('#needsBody'), h, true);
  const L = id => $('#' + id);
  // A fetch row shows three links; the rest wait behind "More links".
  const linksFor = c => { const all = c.links || [], open = S.open.has('links:' + c.key); return UI.chips(open ? all : all.slice(0, 3)) + (all.length > 3 ? `<div class="mt-2">${UI.quiet({ label: open ? 'Fewer links' : `${all.length - 3} more links`, icon: open ? 'expand_less' : 'expand_more', act: 'toggle', v: 'links:' + c.key })}</div>` : '') };
  if (L('lFetch')) UI.patch(L('lFetch'), fetch.map(c => ({ k: c.key, html: UI.item({ lead: { icon: c.again ? 'event_repeat' : 'download', tone: c.again ? 'warn' : 'accent' },
    title: UI.link({ pane: 'company:' + c.key }, esc(c.name), 'tone-ink'), meta: [esc(c.again ? c.progress : c.reason)], foot: linksFor(c),
    trail: UI.quiet({ label: 'No BRSR filed', icon: 'unpublished', act: 'markSet', v: c.key + '|noBrsr', tip: 'You checked its filings and it has none for FY2025-26. It leaves this list and is watched daily.' })
      + UI.quiet({ label: 'Other mark', nav: { pane: 'company:' + c.key }, tip: 'Merged, insolvent or delisted: mark it in the company pane.' }) }) })), true);
  if (L('lUnmatched')) UI.patch(L('lUnmatched'), un.map(x => ({ k: x.file, html: UI.item({ lead: { icon: 'help', tone: 'warn' }, title: `<span class="mono">${esc(x.file)}</span>` }) })), true);
  if (L('lCheck')) { const show = S.more || f === 'check' ? dec : dec.slice(0, 3);
    UI.patch(L('lCheck'), show.map(d => ({ k: d.id, html: S.undo?.id === d.id ? `<div class="item no-lead"><div class="item__main tone-soft">Hidden. ${UI.quiet({ label: 'Undo', act: 'unseen', v: d.id })}</div><div></div></div>`
      : UI.item({ lead: { icon: (KIND[d.kind] || [, 'flag'])[1], tone: 'warn' }, title: UI.link({ pane: 'company:' + d.key }, esc(d.name), 'tone-ink'), ask: esc(d.ask),
        meta: [esc(d.note || d.text), UI.link({ pane: 'batch:' + d.batch }, esc(d.batch), '', { tip: 'Flagged when ' + d.batch + ' closed' })],
        trail: UI.iconBtn({ icon: S.seen.has(d.id) ? 'undo' : 'done', label: S.seen.has(d.id) ? 'Show again' : 'Mark seen', act: S.seen.has(d.id) ? 'unseen' : 'seen', v: d.id }) }) }))
      .concat(show.length < dec.length ? [{ k: 'more', html: `<div class="item no-lead">${UI.quiet({ label: `Show ${dec.length - show.length} more`, icon: 'expand_more', act: 'more' })}<div></div></div>` }] : []), true) } }

/* ---------- Files you sent ---------- */
function renderFiles(force) {
  if (!S.o) return; const fs = S.o.inbox.files.filter(f => f.problem !== 'unmatched'), act = fs.filter(f => !f.done), done = fs.filter(f => f.done);
  $('#files').hidden = !act.length; if (!act.length) return;  // every file read: the section goes until another arrives
  const inbox = (S.o.inbox.inbox || '').replace(/^\/Users\/[^/]+/, '~');
  UI.put($('#filesHead'), UI.sectionHead({ title: 'Files you sent', count: act.length ? `${act.length} in progress` : '', info: `Reports you saved by hand, from the inbox to a checked FY2025-26 reading. Matched files are taken in when the next batch opens, about ${tm(S.o.run.nextRun)}. ${done.length} done.`, actions: copyPath() })
    + `<p class="t-13 tone-soft mb-3">Inbox <span class="mono tone-ink">${esc(inbox)}</span></p>`, force);
  // A matched file's sentence is the same for every file, so it lives in the head; a row says only what differs.
  const row = f => UI.item({ k: f.file, lead: { icon: f.problem ? 'warning' : f.done ? 'task_alt' : 'description', tone: f.problem ? 'warn' : f.done ? 'good' : 'accent' },
    title: f.key ? UI.link({ pane: 'company:' + f.key }, esc(f.name), 'tone-ink') : esc(f.file), titleAfter: f.problem ? UI.badge({ 'older-year': 'Wrong year', 'no-figure': 'No payroll figure' }[f.problem] || 'No BRSR', { tone: 'warn' }) : '',
    meta: [`<span class="mono truncate" data-tip="${esc(f.file)}">${esc(f.file)}</span>`], body: f.done ? (f.problem ? `<div class="t-13 tone-warn">${esc(f.text)}</div>` : '') : UI.steps(f.step, { problem: !!f.problem }) + (f.step === 2 && !f.problem ? '' : `<div class="t-13 ${f.problem ? 'tone-warn' : 'tone-soft'}">${esc(f.text)}</div>`) });
  if (!$('#filesBody')._built) { $('#filesBody').innerHTML = `<div class="card list" id="lFiles"></div><div id="filesDone"></div>`; $('#filesBody')._built = 1 }
  UI.patch($('#lFiles'), act.map(f => ({ k: f.file, html: row(f) })), force);
  UI.put($('#filesDone'), done.length ? UI.disclosure('filesDone', `Done <span class="muted">${done.length}</span>`, `<div class="card list">${done.map(row).join('')}</div>`, S.open.has('filesDone'), { bare: true }) : '', force) }

/* ---------- run rows (shared by Recent runs and the Run pane) ---------- */
function runRow(x) {
  const c = x.counts || {}, stage = x.stopped ? x.stopped.replace(/^at stage /, '') : null, sn = stage && (S.o?.stages || [])[['discover', 'refind', 'browse', 'fetch3', 'snippets', 'read', 'adjudicate', 'final'].indexOf(stage)] || stage;
  // The icon carries the outcome; line 2 says what happened in one line, with the caveat or correction count in its tooltip.
  const counts = c.filled != null ? `Gap fill: ${c.filled} filled${c.nil ? ' · ' + c.nil + ' nil' : ''}${c.wrongYear ? ' · ' + c.wrongYear + ' wrong year' : ''}${c.unread ? ' · ' + c.unread + ' unread' : ''}`
    : c.latest != null ? `${c.latest} FY2025-26 · ${c.kaggle} FY2024-25 only${c.noData ? ' · ' + c.noData + ' no usable report' : ''}${c.deep ? ' · ' + c.deep + ' deep' : ''}` : '';
  const corr = x.corrections ? `${x.corrections.count} corrections across ${x.corrections.companies} companies.` : '';
  const inferred = 'Worked out from batch times: a run that stops at the usage gate or a held lock writes nothing.';
  const lost = x.outcome === 'skipped' || x.outcome === 'lost';
  const k = x.outcome === 'running' ? ['progress_activity', 'good', 'Running', 'good', (x.kind === 'gap' ? 'Gap fill ' : '') + (S.o?.run.stageName ? (x.kind === 'gap' ? 'at ' : 'At ') + S.o.run.stageName : 'opening')]
    : x.outcome === 'resumed' ? ['arrow_circle_right', 'accent', 'Finished', '', 'Left open by an earlier run']
    : lost ? [x.outcome === 'lost' ? 'help' : 'block', x.outcome === 'lost' ? 'warn' : 'muted', x.outcome === 'lost' ? 'No batch' : 'Skipped', '', x.note]
    : sn ? ['error', 'bad', `Stopped at ${sn}`, 'bad', counts]
    : x.overran ? ['timer', 'warn', 'Overran', 'warn', counts]
    : [x.outcome === 'attended' ? 'account_circle' : 'check_circle', 'accent', x.outcome === 'attended' ? 'Started by hand' : '', '', counts];
  return UI.run({ slot: x.slot || x.openedAt, time: x.slot ? tm(x.slot) : tm(x.openedAt), icon: k[0], tone: k[1], iconLabel: k[2] || x.outcome, id: x.batch, word: k[2], wordTone: k[3],
    line: esc((k[4] || '').replace(/\.$/, '')), lineTip: [k[4], c.filled != null ? GAPTIP : '', corr, x.basis === 'inferred' ? inferred : '', x.overran && !lost ? `Ran past its ${x.slotMin}-minute slot, so the next run found the lock held.` : ''].filter(Boolean).join(' '),
    dur: x.outcome === 'resumed' || lost ? '' : dur(x.minutes), lost, nav: x.batch ? { pane: 'batch:' + x.batch } : null }) }
function renderRecent(force) {
  const rs = S.runs?.runs || []; UI.put($('#recentHead'), UI.sectionHead({ title: 'Recent runs', actions: UI.quiet({ label: 'All runs', nav: { pane: 'run' } }) }), force);
  if (!$('#recentBody')._built) { $('#recentBody').innerHTML = '<div class="card list" id="lRecent"></div>'; $('#recentBody')._built = 1 }
  UI.patch($('#lRecent'), rs.slice(0, 5).map(x => ({ k: x.slot || x.batch, html: runRow(x) })), force) }

/* ---------- Companies card and the ladder ---------- */
function renderCos(force) {
  if (!S.o) return; const p = S.o.progress, c = p.counts, tot = p.total, Y = S.o.years, tr = Y.tracker;
  UI.put($('#cosHead'), UI.sectionHead({ title: 'Companies', count: N(tot), countTip: `${N(c.merged || 0)} duplicate entries are not counted.`, info: `A company counts in every year it has data for, so the years overlap. Years are as of the ${tm(Y.builtAt)} records build, plus readings since.`, actions: UI.quiet({ label: 'All companies', nav: { view: 'companies' } }) }), force);
  // No BRSR due yet, then each year it has data for (2021 is FY2021-22, the first BRSR year), then the 2026 tracker.
  const row = (lead, title, meta, n, max, nav, trail) => UI.item({ lead, nav: { view: 'companies', status: null, year: null, why: null, level: null, fy27: null, ...nav }, title, meta: [meta],
    trail: `<span class="strong">${trail || N(n)}</span>${UI.meter(n, { max, label: Math.round(100 * n / (max || 1)) + '% of ' + (max === tot ? 'companies' : 'companies due') })}` });
  const nds = p.nodata || [], notDue = nds.filter(g => !g.due), due = nds.filter(g => g.due), sum = gs => gs.reduce((a, g) => a + g.n, 0);
  const rows = [row({ icon: 'schedule', tone: 'muted' }, 'No BRSR due yet', 'New listings and companies new to the top 1,000', sum(notDue), tot, { status: 'no-data', why: 'nd-notdue' })]
    .concat([2021, 2022, 2023, 2024, 2025].map(y => row({ icon: 'calendar_month', tone: 'muted' }, String(y), `${FYOF(y)} · CY${y}`, Y.years[y] || 0, tot, { year: y })))
    .concat([row({ icon: 'radar', tone: 'accent' }, String(tr.year), `${FYOF(tr.year)} · CY${tr.year} · out from 2027`, tr.read, tr.due, { year: tr.year }, `${N(tr.read)} of ${N(tr.due)}`)])
    .concat([['in-batch', 'In a batch', p.open ? p.open.id : ''], ['todo', 'To do', '']].filter(([k]) => c[k]).map(([k, l, m]) => row({ icon: STICON[k][0], tone: STICON[k][1] }, l, m, c[k], tot, { status: k })));
  // Due but no 2025 report: FY2024-25 only, and those with a BRSR due and no usable report at all.
  const late = (p.fy2425 || []).filter(g => g.tag !== 'retrying').map(g => ({ ...g, status: 'done-kaggle' })).concat(due.map(g => ({ ...g, status: 'no-data' }))); // retrying is a status, not a reason
  UI.put($('#cosBody'), `<div class="card list">${rows.join('')}</div>
    ${late.length ? UI.groupHead({ title: 'Why no 2025 report', count: N(sum(late)), icon: 'filter_list', info: "Companies with a BRSR due for FY2025-26 and no 2025 data: those keeping FY2024-25, and those with no usable report. A tag opens them in the list, with each one's full reason." }) + watchLine() + reasonTags(late) : ''}
    ${notDue.length ? `${UI.groupHead({ title: 'Why no BRSR due yet', icon: 'filter_list', info: 'Not in either exchange\'s top 1,000 on a December list up to 2024, so no BRSR was due for FY2025-26. A tag opens them in the list.' })}${reasonTags(notDue, 'no-data')}` : ''}`, force) }
// Reason tags: each opens the list filtered to that reason; its tooltip names the first companies.
const reasonTags = (gs, st) => `<div class="tags">${gs.map(g => { const status = g.status || st; return `<a class="tag" href="${esc(href({ view: 'companies', status, why: g.tag, year: null }))}" data-nav='${esc(JSON.stringify({ view: 'companies', status, why: g.tag, year: null }))}' data-tip="${esc(g.names.map(x => x.name).slice(0, 6).join(', ') + (g.names.length > 6 ? ' and ' + (g.names.length - 6) + ' more' : ''))}">${esc(g.label)}<span class="tag__count">${g.n}</span></a>` }).join('')}</div>`;
function watchLine() {
  const w = S.o?.watch; if (!w) return '';
  const n = new Date(w.next), dd = Math.round((new Date(n.toDateString()) - new Date(new Date().toDateString())) / 864e5);
  const next = (dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : n.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + ', ' + tm(w.next);
  return `<a class="watchline" href="${esc(href({ pane: 'run' }))}" data-nav='{"pane":"run"}'>${ico('radar', { size: 'sm' })}<span>${w.watching} watched daily for a FY2025-26 BRSR${w.found.length ? ` · ${w.found.length} found` : ''} · next check ${esc(next)}</span></a>` }
function ladderRows(asLinks, counts) {
  const L = Object.fromEntries((S.hier?.ladder || S.o?.ladder || []).map(x => [x.standard, x]));
  return LV.filter(([k]) => L[k]).map(([k, lab]) => { const x = L[k];
    return UI.barRow({ label: lab + (x.companies < 10 ? UI.badge('Few', { tone: 'warn' }) : ''), count: N(x.companies), value: pc(x.women_pct_pooled), v: x.women_pct_pooled, tick: 50, meterLabel: pc(x.women_pct_pooled) + ' women',
      sub: counts ? `${N(x.women)} women, ${N(x.men)} men` : '', nav: asLinks ? { view: 'companies', level: k, status: null, why: null } : null }) }).join('') }
function renderLevels(force) {
  if (!S.o) return; const o = S.o;
  UI.put($('#levelsHead'), UI.sectionHead({ title: "Women's share by level", info: `Pooled across the companies that report each level; the tick marks 50%. "Few" means under 10 companies. ${o.finer || 0} companies report levels finer than BRSR's own. As of the ${tm(o.builtAt)} build.`, actions: UI.quiet({ label: 'Open results', nav: { view: 'results' } }) }), force);
  UI.put($('#levelsBody'), o.ladder?.length ? `<div class="card list">${ladderRows(true)}</div>` : `<div class="card">${UI.empty({ icon: 'bar_chart', title: 'Results appear after the first batch closes.' })}</div>`, force) }
function renderQuery(force) { UI.put($('#query'), `<div class="card list">${UI.item({ lead: { icon: 'database', tone: 'accent' }, nav: { view: 'sql' }, title: 'Query the data', meta: ['Read-only SQL over the readings, up to 500 rows'] })}</div>`, force) }

/* ---------- pane: run ---------- */
function paneRun() {
  const o = S.o, p = o.progress, r = o.run, pa = o.pace, rs = S.runs?.runs || [], slots = rs.filter(x => x.slot), lost = slots.filter(x => x.outcome === 'skipped' || x.outcome === 'lost');
  // Each block is patched by key, so a refresh that changes one figure leaves the reader's focus in the others.
  const B = [];
  B.push({ k: 'lock', html: `<div class="block">${UI.kv([ico(r.state === 'running' ? 'lock' : 'lock_open', { size: 'sm', tone: 'soft' }), `<span class="t-13 tone-soft">${r.state === 'running' ? `Lock held since ${tm(r.since)}` : 'Lock free'}</span>`, UI.info('A lock held over 90 minutes is taken over by the next run.')])}</div>` });
  const openTable = (st) => `<div class="card">${UI.table({ cols: [{ label: '' }, { label: 'Found', cls: 'r', tip: 'FY2025-26 link found' }, { label: 'Fetched', cls: 'r', tip: 'FY2025-26 BRSR downloaded' }, { label: 'Read', cls: 'r' }, { label: 'Accepted', cls: 'r', tip: 'Reading accepted by the checker' }],
    rows: st.map(g => `<tr><td class="nw">${esc(g.group)} ${g.companies}</td><td class="r">${g.fy2526_link_found}</td><td class="r">${g.fy2526_downloaded}</td><td class="r">${g.read}</td><td class="r">${g.accepted}</td></tr>`) })}</div>`;
  const G = o.gaps, gaps = pa.phase === 'gaps';
  if (G?.open) B.push({ k: 'open', html: `<div class="block">${UI.blockHead({ title: 'Open gap batch ' + G.open.id, info: GAPINFO, actions: UI.quiet({ label: 'Details', nav: { pane: 'batch:' + G.open.id } }) })}${UI.rail(o.gapStages, r.stageIndex)}<div class="card">${gapTable(G.open.stages)}</div></div>` });
  if (p.open) B.push({ k: 'open', html: `<div class="block">${UI.blockHead({ title: 'Open batch ' + p.open.id, info: 'Statuses change when the batch closes. Retried companies keep their FY2024-25 data until a checked FY2025-26 reading replaces it.', actions: UI.quiet({ label: 'Details', nav: { pane: 'batch:' + p.open.id } }) })}${UI.rail(o.stages, r.stageIndex)}${openTable(p.open.stages)}</div>` });
  // Pace, the finish it gives, and what is left. Lost runs are one count; the list below shows them.
  const when = d => { const t = new Date(d), n = new Date(), dd = Math.round((new Date(t.toDateString()) - new Date(n.toDateString())) / 864e5); return dd === 0 ? 'Today' : dd === 1 ? 'Tomorrow' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  const lostTip = lost.length ? 'Lost runs: ' + [...lost].sort((a, b) => a.slot < b.slot ? 1 : -1).map(x => day(x.slot)).join(', ') + '. They are highlighted in the list below.' : '';
  B.push({ k: 'pace', html: `<div class="block">${gaps ? UI.blockHead({ title: 'Gap fill', info: GAPINFO }) : ''}<div class="stats">${UI.stat({ label: 'Pace', value: pa.rate ?? 'n/a', unit: '/ h', sub: pa.basis === 'expected' ? 'Expected' : `Last ${pa.batches} ${gaps ? 'gap ' : ''}batches`, tip: paceWhy(pa, r) })}`
    + `${UI.stat({ label: 'Finish', value: pa.eta ? esc(tm(pa.eta)) : 'n/a', sub: pa.eta ? when(pa.eta) : 'After two batches', tip: `At this pace. The earliest it could be is ${day(pa.best)}: one batch of 25 every ${r.slotMin} minutes tops out at ${pa.cap} an hour.` })}`
    + `${UI.stat({ label: 'Left', value: N(pa.left), sub: `of ${N(pa.total)}` })}</div>`
    + `<p class="mt-3 t-13 tone-soft">${slots.length - lost.length} of ${slots.length} runs opened a batch${lost.length ? ` · ${UI.quiet({ label: lost.length + ' lost', act: 'lostRuns', tip: lostTip })}` : ''}</p></div>` });
  B.push({ k: 'usage', html: `<div class="block">${UI.blockHead({ title: 'Usage', info: `Runs stop at ${r.gates.week}% of the week or ${r.gates.session}% of the session.` })}${UI.gauge({ label: 'Week', v: r.week, gate: r.gates.week, meta: `${r.week >= r.gates.week ? 'Over the gate' : 'Clear'} · resets ${esc(r24(r.weekResets))}` })}${UI.gauge({ label: 'Session', v: r.session, gate: r.gates.session, meta: `${r.session >= r.gates.session ? 'Over the gate' : 'Clear'} · resets ${esc(r24(r.sessionResets))}${r.readMinAgo > 10 ? ' · read ' + r.readMinAgo + ' min ago' : ''}` })}</div>` });
  const w = o.watch; if (w) B.push({ k: 'watch', html: `<div class="block">${UI.blockHead({ title: 'Watch', info: 'A daily routine (nivel-brsr-watch) that reads the site of every company with no FY2025-26 BRSR and picks one up when its report appears.' })}<div class="stats">${UI.stat({ label: 'Watching', value: w.watching })}${UI.stat({ label: 'Found', value: w.found.length, tip: w.found.map(x => x.name).join(', ') || 'None yet' })}${UI.stat({ label: 'Next check', value: tm(w.next) })}</div><p class="mt-2 t-13 tone-soft">${w.last ? 'Last check ' + esc(day(w.last)) + ': ' + w.checked + ' read' + (w.blocked ? ', ' + w.blocked + ' sites blocked' : '') : 'No check has run yet.'}</p></div>` });
  B.push({ k: 'runs', html: `<div class="block">${UI.blockHead({ title: 'Runs', count: rs.length, info: 'One row per scheduled run, newest first. A run that stops at the usage gate or a held lock writes nothing, so those rows are worked out from batch times.' })}
    ${UI.ribbon(slots.slice().reverse().map(x => ({ v: x.slot, cls: x.outcome === 'resumed' ? 'is-half' : x.outcome === 'skipped' || x.outcome === 'lost' ? 'is-lost' : x.open ? 'is-now' : '', tip: `${tm(x.slot)}: ${{ opened: 'opened ' + x.batch, running: 'running ' + x.batch, resumed: 'finished ' + x.batch, skipped: 'skipped', lost: 'no batch' }[x.outcome] || x.outcome}` })))}
    <div class="card list mt-3" id="lRuns"></div></div>` });
  B.push({ k: 'log', html: `<div class="block">${UI.disclosure('log', `Run log <span class="muted">${S.runs?.log.length || 0}</span>`, UI.timeline((S.runs?.log || []).map(e => ({ title: (e.batch || (e.kind === 'watch' ? 'Watch' : '')) + ' ' + ({ closed: 'closed', stopped: 'stopped' }[e.kind] || ''), time: (e.when || '').slice(11), text: esc(e.summary), tip: e.detail }))), S.open.has('log'))}</div>` });
  return { title: 'Run', blocks: B, after: () => UI.patch($('#lRuns'), rs.map(x => ({ k: x.slot || x.batch, html: runRow(x) })), true) } }

/* ---------- pane: batch ---------- */
function paneBatch(id) {
  const b = S.pane.data; if (b?.error) return { title: id, body: `<div class="card">${UI.empty({ icon: 'error', title: 'No such batch.', text: esc(id) })}</div>` };
  if (!b || b.id !== id) return { title: 'Batch ' + id, body: UI.skeleton() };
  if (b.kind === 'gap') return paneGap(b, id);
  const s = b.summary || {}, f = R().bf || 'all';
  const runOf = (S.runs?.runs || []).find(x => x.batch === id && x.basis === 'inferred');
  let h = `<div class="block">${UI.kv([b.open ? UI.badge('Open', { tone: 'accent' }) : '', `<span class="t-13 tone-soft">Opened ${esc(day(b.openedAt))}${b.closedAt ? ' · closed ' + tm(b.closedAt) : ''} · ${dur(b.minutes)}</span>`, b.minutes > b.slotMin ? UI.badge('Overran', { tone: 'warn', tip: `Ran past its ${b.slotMin}-minute slot, so the next run found the lock held.` }) : ''])}
    ${runOf ? `<p class="t-13 tone-soft mt-2">${ico('info', { size: 'sm' })} Its run slot is worked out from batch times: a run that stops at the usage gate or a held lock writes nothing.</p>` : ''}</div>`;
  if (b.open && b.stages) h += `<div class="block">${UI.rail(S.o.stages, b.stageIndex)}<div class="card">${UI.table({ cols: [{ label: '' }, { label: 'Found', cls: 'r', tip: 'FY2025-26 link found' }, { label: 'Fetched', cls: 'r', tip: 'FY2025-26 BRSR downloaded' }, { label: 'Read', cls: 'r' }, { label: 'Accepted', cls: 'r' }],
    rows: b.stages.map(g => `<tr><td class="nw">${esc(g.group)} ${g.companies}</td><td class="r">${g.fy2526_link_found}</td><td class="r">${g.fy2526_downloaded}</td><td class="r">${g.read}</td><td class="r">${g.accepted}</td></tr>`) })}</div></div>`;
  else h += `<div class="block stats cols-2">${UI.stat({ label: 'FY2025-26', value: s.latest ?? 'n/a' })}${UI.stat({ label: 'FY2024-25 only', value: s.kaggle ?? 'n/a' })}${UI.stat({ label: 'No usable report', value: s.noData ?? 0 })}${UI.stat({ label: 'Corrections', value: b.corrections ? b.corrections.count : 'n/a', sub: b.corrections ? `across ${b.corrections.companies} companies` : 'none in the log' })}${s.deep ? UI.stat({ label: 'Deep pass', value: s.deep }) : ''}</div>`;
  if (b.log.length) h += `<div class="block">${UI.blockHead({ title: 'What happened' })}${UI.timeline(b.log.map(e => ({ title: { closed: 'Closed', stopped: 'Stopped', watch: 'Watch', note: 'Note' }[e.kind] || 'Note', time: (e.when || '').slice(11), text: esc(e.summary), tip: e.detail })))}</div>`;
  if (b.flags.length) h += `<div class="block">${UI.blockHead({ title: 'Flags', info: 'What the second checker flagged when the batch closed.' })}${b.flags.map(x => UI.flag({ kind: x.check ? KIND[x.check][0] + ' check' : x.kind === 'download' ? 'Download' : '', icon: x.check ? KIND[x.check][1] : x.kind === 'download' ? 'download' : 'flag', head: x.key ? UI.link({ pane: 'company:' + x.key }, esc(x.name || x.key)) : '', text: esc(x.text), foot: x.checked ? 'Checked: ' + esc(x.checked) : '' })).join('')}</div>`;
  if (b.refind.length) h += `<div class="block">${UI.blockHead({ title: 'Not found the first time', info: 'Companies whose FY2025-26 report the first search missed; a second search tried again.' })}<div class="card list">${b.refind.map(x => UI.item({ nav: { pane: 'company:' + x.key }, title: esc(x.name), meta: [`<span data-tip="${esc(x.detail)}">${esc(x.reason)}</span>`] })).join('')}</div></div>`;
  const F = { all: () => 1, latest: c => c.status === 'done-latest', kaggle: c => c.status === 'done-kaggle', retry: c => c.retry || c.later, flagged: c => c.flagged }, cs = b.companies.filter(F[f] || F.all);
  const count = k => b.companies.filter(F[k]).length;
  h += `<div class="block">${UI.blockHead({ title: 'Companies', count: b.companies.length, info: 'How each company closed in this batch, and where it stands now. Some were retries from an earlier batch, or were sent back again later after a fix.' })}
    <div class="tags mb-3">${[['all', 'All'], ['latest', 'FY2025-26'], ['kaggle', 'FY2024-25 only'], ['retry', 'Retried'], ['flagged', 'Flagged']].map(([k, l]) => UI.tag({ label: l, count: count(k), act: 'bf', v: k, pressed: f === k })).join('')}</div>
    <div class="card list">${cs.map(c => UI.item({ nav: { pane: 'company:' + c.key }, title: esc(c.name),
      meta: [c.closedAs && c.closedAs !== c.status ? `<span class="tone-warn">Closed ${esc(ST[c.closedAs] || c.closedAs)}, now ${esc(ST[c.status] || c.status)}</span>` : esc('Closed ' + (ST[c.status] || c.status || '')), c.later ? 'Retried in ' + esc(c.later) : '', c.retry ? 'A retry' : ''],
      trail: c.flagged ? UI.badge('Flagged', { tone: 'warn' }) : '' })).join('') || `<div>${UI.empty({ icon: 'filter_list_off', title: 'None.' })}</div>`}</div></div>`;
  return { title: 'Batch ' + id, body: h, prev: b.prev && { pane: 'batch:' + b.prev }, next: b.next && { pane: 'batch:' + b.next } } }

/* ---------- gap batches (batch.py gaps-*, runbook step 9) ---------- */
const GAPINFO = 'All companies are read. Each run now reads again only the mandatory fields a checked reading lacks, 25 companies at a time. A gap value fills an empty field and never overwrites a checked one.';
const GAPTIP = 'Filled: companies that gained a field. Nil: the report gives a whole table as nil or not applicable. Wrong year: read as another year, so nothing was taken.';
const FIELD = { headcount: 'Headcount', disabledHeadcount: 'Disabled staff', board: 'Board', kmp: 'KMP', turnover: 'Turnover', wellbeing: 'Benefits', wellbeingSpend: 'Well-being spend',
  parental: 'Parental leave', unions: 'Unions', training: 'Training', reviews: 'Reviews', minWage: 'Minimum wage', medianPay: 'Median pay', wageShare: 'Wage share', complaints: 'Complaints' };
const GST = { done: 'Merged', 'wrong-year': 'Wrong year', unread: 'Unread', 'in-batch': 'Being read', todo: 'To do' };
const gapTable = st => UI.table({ cols: [{ label: '' }, { label: 'Fields', cls: 'r', tip: 'Missing fields asked for' }, { label: 'Read', cls: 'r', tip: 'Companies whose missing fields are read' }],
  rows: [`<tr><td class="nw">Companies ${st.companies}</td><td class="r">${st.fields}</td><td class="r">${st.read}</td></tr>`] });
function paneGap(b, id) {
  const s = b.summary || {}, fl = xs => esc(xs.map(f => FIELD[f] || f).join(', '));
  let h = `<div class="block">${UI.kv([b.open ? UI.badge('Open', { tone: 'accent' }) : '', `<span class="t-13 tone-soft">Gap fill · opened ${esc(day(b.openedAt))}${b.closedAt ? ' · closed ' + tm(b.closedAt) : ''} · ${dur(b.minutes)}</span>`, b.minutes > b.slotMin ? UI.badge('Overran', { tone: 'warn', tip: `Ran past its ${b.slotMin}-minute slot, so the next run found the lock held.` }) : ''])}</div>`;
  if (b.open && b.stages) h += `<div class="block">${UI.rail(S.o.gapStages, b.stageIndex)}<div class="card">${gapTable(b.stages)}</div></div>`;
  else h += `<div class="block stats cols-2">${UI.stat({ label: 'Filled', value: s.filled ?? 'n/a', tip: 'Companies that gained at least one field' })}${UI.stat({ label: 'Nil table', value: s.nil ?? 0, tip: 'Companies whose report gives a whole table as nil or not applicable' })}${UI.stat({ label: 'Wrong year', value: s.wrongYear ?? 0, tip: 'Read as another year, so nothing was taken' })}${UI.stat({ label: 'Unread', value: s.unread ?? 0 })}</div>`;
  if (b.log.length) h += `<div class="block">${UI.blockHead({ title: 'What happened' })}${UI.timeline(b.log.map(e => ({ title: { closed: 'Closed', stopped: 'Stopped' }[e.kind] || 'Note', time: (e.when || '').slice(11), text: esc(e.summary), tip: e.detail })))}</div>`;
  h += `<div class="block">${UI.blockHead({ title: 'Companies', count: b.companies.length, info: 'The fields each company was read again for, and what the reading gave.' })}<div class="card list">${b.companies.map(c => {
    const miss = c.asked.filter(f => !c.filled.includes(f) && !c.nil.includes(f));
    return UI.item({ nav: { pane: 'company:' + c.key }, title: esc(c.name),
      meta: b.open ? ['Asked for ' + fl(c.asked), c.read ? 'Read' : ''] : c.status !== 'done' ? ['Asked for ' + fl(c.asked)]
        : [c.filled.length ? 'Filled ' + fl(c.filled) : 'Nothing filled', c.nil.length ? 'Nil ' + fl(c.nil) : '', miss.length ? 'Not found ' + fl(miss) : '', c.notes ? `<span data-tip="${esc(c.notes)}">Note</span>` : ''],
      trail: c.status === 'wrong-year' || c.status === 'unread' ? UI.badge(GST[c.status], { tone: 'warn' }) : '' }) }).join('')}</div></div>`;
  return { title: 'Gap batch ' + id, body: h, prev: b.prev && { pane: 'batch:' + b.prev }, next: b.next && { pane: 'batch:' + b.next } } }

/* ---------- pane: company ---------- */
// The BRSR's own assurance line (Section A Q14 and Q15): who assured or assessed it, and how.
const assuredLine = c => !c.assurance ? '' : c.assurance.provider ? `${c.assurance.type && c.assurance.type !== 'none' ? c.assurance.type + ' assurance' : 'assured'} by ${c.assurance.provider}` : 'not assured';
const num = x => { const n = +x; return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : String(x) };
// Owner marks (PARITY-128). "No BRSR filed" saves on a click; the others open a form for their optional details.
const MARK = { noBrsr: ['unpublished', 'You checked its filings and it has none for FY2025-26. It is watched daily.'],
  merged: ['merge', 'Amalgamated into another company. It leaves the group and the watch.'],
  insolvent: ['gavel', 'In insolvency (CIRP) or liquidation. It leaves the group and the watch.'],
  delisted: ['do_not_disturb_on', 'Its shares are no longer listed. It leaves the group and the watch.'] };
const MARK_FIELDS = { merged: [['into', 'Merged into', 'text', 'Company name'], ['since', 'On', 'date']], insolvent: [['since', 'Since', 'date']], delisted: [['since', 'Delisted on', 'date']] };
function markBlock(c) {
  if (!c.markable && !c.mark) return '';
  const f = S.markForm?.key === c.key ? S.markForm : null, K = c.markKinds;
  if (c.mark && !f && c.mark.kind === 'merged' && (c.relations || []).some(r => r.kind === 'merger' && r.side === 'from')) return '';  // its merger row carries the controls
  if (c.mark && !f) return `<div class="kv" id="markRow" style="margin-top:var(--sp-3)">${UI.badge(K[c.mark.kind], { tone: c.mark.kind === 'noBrsr' ? 'warn' : 'muted', icon: MARK[c.mark.kind][0], tip: `Marked by you on ${day(c.mark.at)}. ${c.mark.note || ''}` })}${c.markable ? UI.quiet({ label: 'Change', icon: 'edit', act: 'markEdit', v: c.key }) : ''}${UI.quiet({ label: 'Undo mark', icon: 'undo', act: 'markSet', v: c.key })}</div>`;
  const pick = Object.keys(K).map(k => UI.quiet({ label: K[k], icon: MARK[k][0], act: k === 'noBrsr' ? 'markSet' : 'markOpen', v: k === 'noBrsr' ? c.key + '|noBrsr' : k, tip: MARK[k][1] })).join('');
  const form = f?.kind ? UI.form({ id: 'mark', title: 'Mark as ' + K[f.kind].toLowerCase(), submit: 'Save mark', icon: 'check', cancel: 'markCancel',
    fields: MARK_FIELDS[f.kind].map(([name, label, type, placeholder]) => ({ name, label, type, placeholder, value: f[name], optional: true, max: type === 'text' ? 120 : null })) }) : '';
  return `<div class="kv" id="markRow" role="group" aria-label="Mark as" style="margin-top:var(--sp-3)"><span class="t-13 tone-soft">Mark as</span>${pick}${f && !f.kind && c.mark ? UI.quiet({ label: 'Cancel', act: 'markCancel' }) : ''}</div>${form}`;
}
// CIN, ISIN and tickers, each labelled; a nationalised bank or LIC has no CIN, and says why.
const idLine = c => { const i = c.ids || {};
  return [c.cin ? `<span class="mono" data-tip="CIN">${esc(c.cin)}</span>` : i.cinNote ? `<span class="tone-muted" data-tip="${esc(i.cinNote)}">No CIN</span>` : `<span class="mono">${esc(c.key)}</span>`,
    i.isin ? `<span class="mono" data-tip="ISIN">${esc(i.isin)}</span>` : '', i.nse ? `<span><span class="tone-muted">NSE</span> <span class="mono">${esc(i.nse)}</span></span>` : '',
    i.bseCode || i.bseId ? `<span><span class="tone-muted">BSE</span> <span class="mono">${esc(i.bseCode || i.bseId)}</span></span>` : ''].join('') };
function paneCompany(k) {
  const c = S.pane.data; if (c?.error) return { title: 'Company', body: `<div class="card">${UI.empty({ icon: 'error', title: 'No such company.', text: esc(k) })}</div>` };
  if (!c || c.key !== k) return { title: 'Company', body: UI.skeleton() };
  const v = c.values, ch = v.share != null && v.prior != null ? v.share - v.prior : null;
  const change = ch == null ? '' : Math.abs(ch) < .05 ? '<span class="tone-soft">No change</span>' : `<span class="${ch > 0 ? 'tone-good' : 'tone-bad'}" style="font:600 13px var(--display)">${ch > 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(1)} pp</span>`;
  const frac = (a, b) => a == null || b == null ? UI.badge('Missing', { tone: 'muted' }) : `${N(a)}<span class="stat__unit">of ${N(b)}</span>`;
  let h = `<div class="block"><div class="kv tone-soft" style="font-size:var(--t-13)">${idLine(c)}${c.kind ? `<span>${esc(c.kind)}</span>` : ''}${c.website ? UI.chip({ label: c.website, url: 'https://' + c.website }) : ''}${c.nameOk ? '' : UI.badge('Name unclear', { tone: 'muted', tip: 'The name read from the filing was unusable, so the website stands in.' })}</div>
    ${c.formerly ? `<p class="tone-soft" style="font-size:var(--t-13);margin-top:var(--sp-1)">Formerly ${esc(c.formerly)}</p>` : ''}
    <div class="kv" style="margin-top:var(--sp-3)">${c.status === 'done-deep' ? (+(String(c.fy || '').match(/20\d\d/) || [0])[0] >= 2025 ? statusBadge('done-latest') : '') : statusBadge(c.status)}${c.fy && c.fy !== '2025-26' && c.status !== 'done-kaggle' ? UI.badge('FY' + c.fy + ' reading', { tone: 'muted' }) : ''}${c.retry ? UI.badge('Retrying', { tone: 'muted' }) : ''}${c.batch ? UI.link({ pane: 'batch:' + c.batch }, 'in ' + esc(c.batch), 'tone-soft', { tip: 'The batch that last took it in' }) : ''}${c.status === 'no-data' && c.listedOn ? `<span class="tone-soft t-13">Listed ${esc(dateLong(c.listedOn))}</span>` : ''}${c.status === 'no-data' && (c.brsrFrom || c.brsrNote) ? `<span class="tone-soft t-13">BRSR due from ${dueCell(c)}</span>` : ''}${c.watched ? `<span class="kv tone-soft" style="font-size:var(--t-13)" data-tip="The daily watch reads its site again and picks up a FY2025-26 BRSR when it appears.">${ico('radar', { size: 'sm' })}Watched daily</span>` : ''}</div>
    ${markBlock(c)}
    ${c.why ? `<p style="margin-top:var(--sp-3);color:var(--ink)">${esc(c.why)}</p>` : ''}${c.next ? `<p class="${c.next.who === 'you' ? 'tone-warn' : 'tone-soft'}" style="margin-top:var(--sp-1)">${c.next.who === 'you' ? 'You: ' : ''}${esc(c.next.text)}</p>` : ''}${c.next?.who === 'you' ? `<div style="margin-top:var(--sp-2)">${UI.chips(c.links)}</div>` : ''}</div>`;
  h += relBlock(c);
  if (c.fy27) h += fy27Block(c.fy27);
  // Open checks ask the owner something, so they stand out; settled ones are history and go under Records.
  const open = c.flags.filter(f => !f.checked), settled = c.flags.filter(f => f.checked);
  if (open.length) h += `<div class="block">${open.map(f => UI.flag({ kind: f.check ? KIND[f.check][0] + ' check' : '', icon: f.check ? KIND[f.check][1] : 'flag', head: UI.link({ pane: 'batch:' + f.batch }, esc(f.batch)), text: esc(f.text) })).join('')}</div>`;
  const vline = [c.fy && c.fy !== '2025-26' && 'FY' + c.fy, v.boundary, assuredLine(c)].filter(Boolean).join(' · ');
  h += `<div class="block">${UI.blockHead({ title: 'Values', info: [c.checkedBy && 'Checked by ' + c.checkedBy + '.', v.builtAt && 'As of the ' + tm(v.builtAt) + ' build.'].filter(Boolean).join(' ') || null })}${vline ? `<p class="t-13 tone-soft mb-2">${esc(vline.charAt(0).toUpperCase() + vline.slice(1))}</p>` : ''}
    <div class="stats cols-2">${UI.stat({ label: 'Share of pay', value: v.share == null ? UI.badge('Missing', { tone: 'muted' }) : pc(v.share), sub: v.prior != null ? `Prior ${pc(v.prior)} ${change}` : '' })}${UI.stat({ label: 'Women in staff', value: v.staffPct == null ? UI.badge('Missing', { tone: 'muted' }) : pc(v.staffPct), sub: v.staffT ? `${N(v.staffW)} of ${N(v.staffT)} permanent` : '' })}
    ${UI.stat({ label: 'Women on board', value: frac(v.boardW, v.boardT) })}${UI.stat({ label: 'Women KMP', value: frac(v.kmpW, v.kmpT), tip: 'Key managerial personnel.' })}</div></div>`;
  // Years: each year's headline figures, from its own report, or (prior) the wage share the next year's report gives for it.
  const na = '<span class="tone-muted">n/a</span>';
  if ((c.years || []).length > 1) h += `<div class="block">${UI.blockHead({ title: 'Years', info: "Each year from its own BRSR. A year with only a share of pay comes from the next year's report." })}<div class="card">${UI.table({ dense: true, cols: [{ label: 'Year' }, { label: 'Share of pay', cls: 'r' }, { label: 'Women in staff', cls: 'r' }, { label: 'Board', cls: 'r' }, { label: 'KMP', cls: 'r' }],
    rows: yearRows(c, y => y.source === 'prior' ? `<tr><td class="nw"><span class="tipped" tabindex="0" data-tip="From FY${esc(nextFy(y.fy))}'s report, which gives only the prior year's share of pay.">FY${esc(y.fy)}</span></td><td class="r">${pc(y.share)}</td><td colspan="3"></td></tr>`
      : `<tr><td class="nw">FY${esc(y.fy)}</td><td class="r">${y.share == null ? na : pc(y.share)}</td><td class="r">${y.staffPct == null ? na : pc(y.staffPct)}</td><td class="r">${y.boardT != null ? y.boardW + ' of ' + y.boardT : na}</td><td class="r">${y.kmpT != null ? y.kmpW + ' of ' + y.kmpT : na}</td></tr>`) })}</div></div>`;
  // Targets: the company's own goals (Section B Q5 with Q6's progress, and gender goals elsewhere), gender first.
  const TOPIC = { gender: 'Gender', emissions: 'Emissions', energy: 'Energy', water: 'Water', waste: 'Waste', csr: 'CSR', safety: 'Safety', other: 'Other' };
  if (c.targets?.length) h += `<div class="block">${UI.blockHead({ title: 'Targets', count: c.targets.length, info: "The company's own stated goals, as its report words them: Section B's commitments with its progress against them, and goals for women set out elsewhere." })}<div class="card list">${[...c.targets].sort((a, b) => (a.topic !== 'gender') - (b.topic !== 'gender')).map(t => UI.item({ title: esc(t.metric),
      meta: [esc(TOPIC[t.topic] || 'Other'), t.target != null ? `Target ${esc(num(t.target))}${t.by_year ? ' by ' + esc(t.by_year) : ''}` : t.by_year ? 'By ' + esc(t.by_year) : '', t.current != null ? `Now ${esc(num(t.current))}` : ''], body: t.progress ? `<div class="t-13 tone-soft">${esc(t.progress)}</div>` : '', trail: t.source ? UI.info(t.source) : '' })).join('')}</div></div>`;
  const fine = c.ladder.filter(x => !['board', 'kmp', 'staff', 'workers'].includes(x.standard));
  if (fine.length) h += `<div class="block">${UI.blockHead({ title: 'Levels' })}<div class="card">${UI.table({ cols: [{ label: 'Level' }, { label: 'Women', cls: 'r' }, { label: 'Men', cls: 'r' }, { label: 'Women %', cls: 'r' }], rows: c.ladder.map(x => `<tr><td>${esc(x.level)}</td><td class="r">${N(x.women)}</td><td class="r">${N(x.men)}</td><td class="r">${pc(x.women_pct)}</td></tr>`) })}</div></div>`;
  if (c.functions.length) h += `<div class="block">${UI.blockHead({ title: 'Job functions' })}<div class="card">${UI.table({ cols: [{ label: 'Function' }, { label: 'Women', cls: 'r' }, { label: 'Men', cls: 'r' }, { label: 'Women %', cls: 'r' }], rows: c.functions.map(x => `<tr><td>${esc(x.function)}</td><td class="r">${N(x.women)}</td><td class="r">${N(x.men)}</td><td class="r">${pc(x.women_pct ?? (x.women != null && x.men != null ? 100 * x.women / (x.women + x.men) : null))}</td></tr>`) })}</div></div>`;
  h += `<div class="block">${UI.blockHead({ title: 'Trail' })}${UI.timeline(c.trail.map(t => t.host !== undefined ? { title: t.step + (t.n > 1 ? ' ×' + t.n : ''), text: `<span class="tone-ink">${esc(t.host || 'source not recorded')}</span>${t.path ? ` <span class="mono">${esc(t.path)}</span>` : ''}<br>${esc([t.code && t.code !== 'ok' ? 'HTTP ' + t.code : '', t.fy ? 'FY' + t.fy : 'year not read', 'BRSR ' + (t.brsr ? 'yes' : 'no')].filter(Boolean).join(' · '))}` } : { title: t.step, text: esc(t.text) }))}</div>`;
  if (c.next?.who !== 'you' && c.links.length) h += `<div class="block">${UI.blockHead({ title: 'Links' })}${UI.chips(c.links)}</div>`;
  const raw = c.raw || {}, rec = [['verified', 'Checked reading', raw.verified], ['haiku', 'First reading (Haiku)', raw.haiku], ['final', 'Settled reading (Sonnet)', raw.final], ['parser', 'Parser', raw.parser], ['found', 'Search record', raw.found], ['dl', 'Downloads', (raw.queue || {}).fetches]];
  const checks = settled.length ? UI.disclosure('rec:checks', `Checks <span class="muted">${settled.length}</span>`, `<div class="card list">${settled.map((f, i) => UI.item({ k: 'chk' + i, cls: 'item--prose', lead: { icon: f.check ? KIND[f.check][1] : 'flag', tone: 'muted' }, title: esc(f.text), meta: [UI.link({ pane: 'batch:' + f.batch }, esc(f.batch)), 'Checked: ' + esc(f.checked)] })).join('')}</div>`, S.open.has('rec:checks')) : '';
  h += `<div class="block">${UI.blockHead({ title: 'Records', actions: UI.quiet({ label: 'Open in SQL', icon: 'database', act: 'opensql', v: c.key }) })}${checks}${rec.map(([id, l, x]) => UI.disclosure('rec:' + id, l + (x ? '' : ' <span class="muted">none</span>'), `<pre class="code">${esc(JSON.stringify(x, null, 1) || 'None.')}</pre>`, S.open.has('rec:' + id))).join('')}</div>`;
  const list = S.list || [], ix = list.indexOf(k);
  return { title: c.name, body: h, prev: ix > 0 && { pane: 'company:' + list[ix - 1] }, next: ix >= 0 && ix < list.length - 1 && { pane: 'company:' + list[ix + 1] } } }

/* ---------- pane frame ---------- */
async function loadPane(pane, force) {
  const [t, id] = pane.split(':'), d = S.pane.data;
  if (!force && S.pane.key === pane && d && !(t === 'batch' && d.open) && !(t === 'company' && ['todo', 'in-batch'].includes(d.status))) return;
  try { const res = await (await fetch(t === 'batch' ? '/api/batch?id=' + encodeURIComponent(id) : '/api/company-view?key=' + encodeURIComponent(id))).json();
    if ((R().pane || '') === pane) { S.pane = { key: pane, data: res }; renderPane(false) } } catch (e) { } }
function renderPane(force) {
  const r = R(), pane = r.pane || (wide() ? 'run' : null), el = $('#pane'), overlay = !wide() && !!r.pane;
  if (overlay && !el.classList.contains('is-open') && !S.opener) S.opener = document.activeElement;  // before inert takes it
  el.classList.toggle('is-open', !!r.pane); $('#scrim').hidden = !overlay;
  ['#bar', '.strip', '#col'].forEach(s => { const n = $(s); if (overlay) n.setAttribute('inert', ''); else n.removeAttribute('inert') });
  if (!overlay && S.opener) { const o = S.opener; S.opener = null; if (document.activeElement === document.body || el.contains(document.activeElement)) o.focus?.() }
  if (!pane) return;
  if (!S.o) { if (S.fail) { UI.put($('#phead'), '<h2 id="paneTitle">Run</h2>', true); UI.put($('#pbody'), UI.empty({ icon: 'cloud_off', title: 'No data yet.', text: 'The dashboard could not be reached.' }), true) } return }
  const [t, id] = pane.split(':'), opening = S.pane.key !== pane;
  if (opening) { S.pane = { key: pane, data: null }; if (t !== 'run') loadPane(pane, true) }
  const v = t === 'batch' ? paneBatch(id) : t === 'company' ? paneCompany(id) : paneRun(), d = history.state?.d || 0;
  UI.put($('#phead'), `${d > 0 && r.pane ? UI.iconBtn({ icon: 'arrow_back', label: 'Back', act: 'back' }) : ''}<h2 id="paneTitle" tabindex="-1">${esc(v.title)}</h2>${'prev' in v || 'next' in v ? UI.iconBtn({ icon: 'chevron_left', label: 'Previous', nav: v.prev || undefined, disabled: !v.prev }) + UI.iconBtn({ icon: 'chevron_right', label: 'Next', nav: v.next || undefined, disabled: !v.next }) : ''}${wide() && t === 'run' && !r.pane ? '' : UI.iconBtn({ icon: 'close', label: 'Close', act: 'close' })}`, true);
  const sk = 'pane:' + pane, pb = $('#pane'), body = $('#pbody');
  if (v.blocks) { if (body._h) { body.replaceChildren(); body._filled = false } body._h = null; UI.patch(body, v.blocks, force) } else UI.put(body, v.body, force);
  if (S.pane.scrollKey !== sk && (v.blocks || S.pane.data)) { pb.scrollTop = S.scroll.get(sk) || 0; S.pane.scrollKey = sk }
  v.after && v.after();
  // Opening a pane from a click moves focus to its title (after the drawer is visible); closing returns it to the opener.
  if (opening && r.pane && (overlay || S.clicked)) requestAnimationFrame(() => $('#paneTitle')?.focus({ preventScroll: true })) }

/* ---------- wide views in the column ---------- */
async function needAll(force) {
  if (S.all && !force) return S.all;
  try { const res = await fetch('/api/companies-all', { headers: S.allTag ? { 'If-None-Match': S.allTag } : {} });
    if (res.status === 200) { S.all = await res.json(); S.allTag = res.headers.get('ETag') } } catch (e) { } return S.all }
function scaffold(v, html) { const el = $('#view'); if (el.dataset.v !== v) { el.dataset.v = v; el.innerHTML = html; el._h = null; return true } return false }
const backBtn = () => `<a class="back" href="${esc(href({ view: null, status: null, cq: null, retry: null, sort: null, lim: null, why: null, level: null, fy27: null, year: null }))}" data-act="today">${ico('arrow_back')}Today</a>`;
const dateLong = s => { const d = new Date(s); return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}` };
// The year a company's BRSR falls due: the company's own words, or SEBI's rule (marked), with the source in the tooltip.
// FY2026-27 (rankings.py): who files, from AMFI's lists of 31 December averages. [badge label, tone, short tag label]
const FY27 = { files: ['Files for FY2026-27', 'accent', 'Files'], joins: ['Joins for FY2026-27', 'accent', 'Joins'], atRisk: ['May drop out after FY2026-27', 'warn', 'May drop out'],
  leaves: ['Leaves', 'muted', 'Leaves'], later: ['BRSR from FY2027-28', 'muted', 'Listed in 2026'], unranked: ['Not ranked', 'muted', 'Not ranked'] };
const EDGE_TIP = "Within 50 places of 1,000 on AMFI's figures. The exchange's own list decides.";
const fy27Badge = (g, edge) => !g ? '' : UI.badge(FY27[g][0], { tone: FY27[g][1] }) + (edge ? ' ' + UI.badge('Near the cut-off', { tone: 'muted', tip: EDGE_TIP }) : '');
// One exchange's rank by year, the exchange that ranks it higher on the newest list (NSE on a tie).
function rankLine(rs) {
  const ys = Object.keys(rs || {}).sort().reverse(); if (!ys.length) return '';
  const top = rs[ys[0]], ex = (top.nse || 1e9) <= (top.bse || 1e9) ? 'nse' : 'bse';
  return `<p class="kv t-13 tone-soft" style="margin-top:var(--sp-2)"><span>${ex.toUpperCase()} rank</span>${ys.map(y => rs[y][ex] ? `<span><span class="tone-muted">${y}</span> ${N(rs[y][ex])}</span>` : '').join('')}</p>` }
function fy27Block(f) {
  return `<div class="block">${UI.blockHead({ title: 'FY2026-27', info: "Ranks are by AMFI's six-month average market cap on 31 December, on each exchange. Near the cut-off, the exchange's own list decides." })}<div class="kv">${fy27Badge(f.group, f.edge)}</div>${f.note ? `<p class="t-13" style="margin-top:var(--sp-2);color:var(--ink)">${esc(f.note)}</p>` : ''}${f.group === 'leaves' ? '' : rankLine(f.ranks)}</div>` }
// Related companies (relations.py): mergers and demergers from this company's side, each other party linked when the build holds it.
const REL_ICON = { merger: 'merge', demerger: 'call_split', 'business-transfer': 'swap_horiz' };
const party = p => p.key ? UI.link({ pane: 'company:' + p.key }, esc(p.name), 'tone-ink') : `${esc(p.name)}<span class="t-12 tone-muted"> · ${p.isin || p.listed || p.wasListed ? 'not in the build' : 'unlisted'}</span>`;
const parties = (ps, f = party) => ps.length < 3 ? ps.map(f).join(' and ') : ps.slice(0, -1).map(f).join(', ') + ' and ' + f(ps[ps.length - 1]);
function relText(r) {
  // "its cement business", "its non-core assets", or "businesses" when one scheme sends several to several companies
  const o = r.others, biz = r.business ? `its ${esc(r.business)}${/assets$/.test(r.business) ? '' : ' business'}` : o.length > 1 ? 'businesses' : 'a business', bizOf = r.business ? esc(r.business) + ' ' : '';
  if (r.kind === 'merger') return r.side === 'from' ? `Merged into ${parties(o)}${r.peers.length ? `, with ${parties(r.peers)}` : ''}.` : `${parties(o)} merged into it.`;
  if (r.kind === 'demerger' && r.side === 'from') {
    const days = [...new Set(o.filter(p => p.new && p.listed).map(p => p.listed))], once = o.length > 1 && days.length === 1 && o.every(p => p.listed);
    return `Demerged ${biz} into ${parties(o, p => party(p) + (!once && p.new && p.listed ? `, listed ${esc(dateLong(p.listed))}` : ''))}${once ? `, all listed ${esc(dateLong(days[0]))}` : ''}.` }
  if (r.kind === 'demerger' && r.me.new) return `Demerged from ${parties(o)}${r.business ? ` as its ${esc(r.business)} business` : ''}${r.me.listed ? `, and listed on ${esc(dateLong(r.me.listed))}` : ''}.`;
  return r.side === 'from' ? `Transferred ${biz} to ${parties(o)}.` : `Took over the ${bizOf}business of ${parties(o)}.`;
}
function relBlock(c) {
  if (!(c.relations || []).length) return '';
  // A merged mark's controls sit on its merger, so the merger is said once.
  const mine = r => r.kind === 'merger' && r.side === 'from' && c.mark?.kind === 'merged';
  return `<div class="block">${UI.blockHead({ title: 'Related companies', info: "Mergers and demergers since FY2022-23, from the companies' own filings and your marks." })}<div class="card list">${c.relations.map((r, i) => UI.item({ k: 'rel' + i, cls: 'item--prose',
    lead: { icon: REL_ICON[r.kind], tone: 'muted' }, title: relText(r),
    meta: [r.effective ? esc(dateLong(r.effective)) : 'Date not recorded', r.fromMark ? 'Your mark' : r.source ? `<span class="tipped" tabindex="0" data-tip="${esc(r.source + (r.quote ? ': ' + r.quote : ''))}">Source</span>` : ''],
    trail: mine(r) ? UI.iconBtn({ icon: 'edit', label: 'Change mark', act: 'markEdit', v: c.key }) + UI.iconBtn({ icon: 'undo', label: 'Undo mark', act: 'markSet', v: c.key }) : '' })).join('')}</div></div>` }
// The break a merger or demerger makes in the Years table, below the first year that includes it.
function breakText(r) {
  const d = r.effective ? ', ' + dateLong(r.effective) : '', what = { merger: 'Merger', demerger: 'Demerger', 'business-transfer': 'Transfer' }[r.kind];
  if (r.kind === 'merger') return `${what}${d}: years below are before it`;
  return `${what}${d}: years below ${r.side === 'from' ? 'include' : 'exclude'} ${r.business ? esc(r.business) : 'it'}` }
const nextFy = fy => `${+fy.slice(0, 4) + 1}-${String(+fy.slice(5) + 1).padStart(2, '0')}`;
function yearRows(c, row) {
  const br = (c.relations || []).filter(r => r.breakFy && !(r.kind === 'demerger' && r.side === 'to' && r.me.new)), fys = c.years.map(y => y.fy);
  // One scheme can merge and demerge on one date (Gujarat Energy): one row says the years below are before them both.
  const line = r => { const same = br.filter(x => x.breakFy === r.breakFy && x.effective === r.effective);
    if (same.length > 1 && same[0] !== r) return '';
    const kinds = [...new Set(same.map(x => ({ merger: 'merger', demerger: 'demerger', 'business-transfer': 'transfer' })[x.kind]))].join(' and ');
    const text = same.length > 1 ? `${kinds.charAt(0).toUpperCase() + kinds.slice(1)}, ${dateLong(r.effective)}: years below are before them` : breakText(r);
    return `<tr class="yr-break"><td colspan="5"><span class="yr-break__in">${ico(REL_ICON[r.kind], { size: 'sm' })}${text}</span></td></tr>` };
  return br.filter(r => r.breakFy > fys[0]).map(line).concat(c.years.flatMap(y => [row(y)].concat(br.filter(r => r.breakFy === y.fy && y.fy !== fys[fys.length - 1]).map(line)))) }
// The year a company owes its first BRSR, the same form on every row: "FY2026-27", or "Already due"; why is in the tooltip.
const dueText = c => { const f = c.dueFrom || c.brsrFrom; return f === 'due' ? 'Already due' : f ? 'FY' + f : '' };
const dueCell = c => dueText(c) ? `<span class="tipped" tabindex="0" data-tip="${esc(c.dueNote || c.brsrNote || '')}">${esc(dueText(c))}</span>` : '<span class="tone-muted">n/a</span>';
const rankCell = (n, ex) => n ? `${N(n)} <span class="t-12 tone-muted">${esc(ex)}</span>` : '<span class="tone-muted">Not ranked</span>';
function viewCompanies(force) {
  const r = R(); scaffold('companies', `${backBtn()}<div id="vHead"></div><div class="toolbar"><div class="field-wrap">${ico('search')}<input class="field" id="cq" placeholder="Name, CIN or website" aria-label="Filter companies" autocomplete="off" style="width:240px"></div>
    ${UI.dropdown({ id: 'measure', cls: 'below-900', label: 'Value to show', prefix: 'Show', value: S.measure || 'share', options: [{ v: 'share', label: 'Share of pay' }, { v: 'women_staff', label: 'Women in staff' }, { v: 'board', label: 'Women on board' }] })}</div><div id="vTags"></div><div id="vBody"></div><div id="vMore"></div>`) && ($('#cq').value = r.cq || '');
  const all = S.all; if (!all) { needAll().then(() => render(true)); return UI.put($('#vBody'), `<div class="card">${UI.skeleton('Loading companies')}</div>`, force) }
  const st = r.status || '', q = (r.cq || '').toLowerCase(), rt = r.retry === '1', why = r.why || '', lev = r.level || '', f27 = r.fy27 || '', yr = +r.year || 0;
  // A year: the companies with data for it; the tracker year (2026), the companies due to file for it.
  const inYear = c => !yr || (yr === S.o?.years.tracker.year ? DUE27.includes(c.fy27) || (c.years || []).includes(yr) : (c.years || []).includes(yr));
  const inStatus = c => !st || (st === 'done-kaggle' ? c.status === 'done-kaggle' || (c.retry && c.retriedFrom === 'done-kaggle') : st === 'no-data' ? c.status === 'no-data' || (c.retry && c.retriedFrom === 'no-data') : st === 'in-batch' ? c.status === 'in-batch' && !c.retry : c.status === st);
  let cs = all.companies.filter(c => inStatus(c) && inYear(c) && (!rt || c.retry) && (!why || c.whyTag === why || (why === 'nd-notdue' && NOTDUE.includes(c.whyTag))) && (!f27 || c.fy27 === f27) && (!lev || (c.levels || []).includes(lev)) && (!q || [c.name, c.key, c.cin, c.isin, c.nse, c.bseCode, c.website, c.formerly].some(x => x && String(x).toLowerCase().includes(q))));
  const sort = r.sort || 'rank', dir = sort.startsWith('-') ? -1 : 1, key = sort.replace('-', '');
  const val = c => key === 'rank' ? (c.status.startsWith('done') && c.years?.length ? 2030 - c.years[c.years.length - 1] : 10 + (RANK[c.status] ?? 9)) : key === 'board' ? (c.board_total ? c.board_women / c.board_total : null) : c[key];
  cs.sort((a, b) => { const x = val(a), y = val(b); return (x == null) - (y == null) || (typeof x === 'number' && typeof y === 'number' ? (x - y) : String(x ?? '').localeCompare(String(y ?? ''))) * dir || a.name.localeCompare(b.name) });
  S.list = cs.map(c => c.key);
  const nwhy = S.o?.progress.nodata || [], side = why === 'nd-notdue' || NOTDUE.includes(why) ? false : nwhy.some(g => g.tag === why && g.due) ? true : null; // the side of a chosen reason
  const whys = st === 'no-data' ? nwhy.filter(g => side === null || g.due === side) : (S.o?.progress.fy2425 || []).filter(g => g.tag !== 'retrying');
  UI.put($('#vHead'), UI.sectionHead({ title: 'Companies', count: `${N(cs.length)} of ${N(all.companies.length)}`, info: `Status is live; values are as of the ${tm(all.builtAt)} build.` }), force);
  const n = k => all.companies.filter(c => !k || (k === 'done-kaggle' ? c.status === k || (c.retry && c.retriedFrom === k) : k === 'in-batch' ? c.status === k && !c.retry : c.status === k)).length;
  const ny = y => all.companies.filter(c => (c.years || []).includes(y)).length;
  UI.put($('#vTags'), `<div class="tags mb-3" role="group" aria-label="Status and year">${UI.tag({ label: 'All', count: N(n('')), act: 'status', v: '', pressed: !st && !yr })}${UI.tag({ label: 'No BRSR due yet', count: N(all.companies.filter(c => c.status === 'no-data' && NOTDUE.includes(c.whyTag)).length), act: 'notdue', pressed: st === 'no-data' && (why === 'nd-notdue' || NOTDUE.includes(why)) })}${[2021, 2022, 2023, 2024, 2025].map(y => UI.tag({ label: String(y), count: N(ny(y)), act: 'year', v: y, pressed: yr === y, tip: `${FYOF(y)} or CY${y}` })).join('')}${[['in-batch', 'In a batch'], ['todo', 'To do'], ['done-kaggle', 'FY2024-25 only']].filter(([k]) => st === k || (k !== 'done-kaggle' && n(k))).map(([k, l]) => UI.tag({ label: l, count: N(n(k)), act: 'status', v: k, pressed: st === k })).join('')}${yr === S.o?.years.tracker.year ? UI.tag({ label: `${yr}: due to file`, icon: 'close', act: 'year', v: yr, pressed: true }) : ''}${UI.tag({ label: 'Retrying', icon: 'replay', act: 'retry', pressed: rt })}${lev ? UI.tag({ label: 'Reports the ' + ((LV.find(x => x[0] === lev) || [, lev])[1]).toLowerCase().replace('kmp', 'KMP') + ' level', icon: 'close', act: 'level', pressed: true }) : ''}</div>
    ${all.fy27 ? `<div class="kv mb-3" role="group" aria-label="FY2026-27"><span class="t-13 tone-soft" data-tip="Who files a BRSR for FY2026-27, from AMFI's lists of average market cap from 1 July to 31 December 2025.">FY2026-27</span>${Object.keys(FY27).map(g => [g, all.companies.filter(c => c.fy27 === g).length]).filter(([, n]) => n).map(([g, n]) => UI.tag({ label: FY27[g][2], count: N(n), act: 'fy27', v: g, pressed: f27 === g })).join('')}</div>` : ''}
    ${(st === 'done-kaggle' || st === 'no-data') && whys.length ? `<div class="kv mb-3" role="group" aria-label="${st === 'no-data' ? 'Why no usable report' : 'Why FY2024-25 only'}"><span class="t-13 tone-soft">Why</span>${whys.map(g => UI.tag({ label: g.label, count: g.n, act: 'why', v: g.tag, pressed: why === g.tag })).join('')}</div>` : ''}`, force);
  const lim = +r.lim || 100, shown = cs.slice(0, lim), showWhy = (st === 'done-kaggle' || st === 'no-data') && (!why || why === 'nd-notdue'); // one reason chosen: the column would repeat it
  // No usable report: the value columns would all be n/a, so the December 2024 rank and the year the BRSR falls due take their place, a value on every row.
  const nd = st === 'no-data'; if ($('#measure')) $('#measure').style.display = nd ? 'none' : '';
  const nameCell = c => `${UI.link({ pane: 'company:' + c.key }, esc(c.name), 'tone-ink')}${c.nameOk ? '' : ' ' + UI.badge('Name unclear', { tone: 'muted', tip: 'The name read from the filing was unusable, so the website stands in.' })}<span class="sub">${esc(c.cin || c.key)}</span>`;
  const na = '<span class="tone-muted">n/a</span>';
  if (!phone() && innerWidth >= 900) {
    if (!$('#vBody').querySelector('table')) $('#vBody').innerHTML = `<div class="card">${UI.table({ cols: [], rows: [], bodyId: 'cBody', dense: true })}</div>`;
    const showSt = !st; // with a status filter every row has the same status, so the column goes
    const showLv = !nd && !(wide() && innerWidth < 1360); // the docked pane leaves the column too narrow for Levels below 1360px; no-data rows have none
    const cols = [{ label: 'Company', sort: 'name' }].concat(showSt ? [{ label: 'Latest', sort: 'rank' }] : []).concat(nd ? [{ label: 'Rank, Dec 2024', cls: 'r', sort: 'rank24' }, { label: 'BRSR due from', sort: 'dueFrom' }] : [{ label: 'Share of pay', cls: 'r', sort: 'share' }, { label: 'Women in staff', cls: 'r', sort: 'women_staff' }, { label: 'Board', cls: 'r', sort: 'board' }, { label: 'KMP', cls: 'r' }])
      .concat(showWhy ? [{ label: 'Why' }] : f27 ? [{ label: 'Rank, Dec 2025', cls: 'r', sort: 'fy27Rank' }] : showLv ? [{ label: 'Levels', cls: 'r', sort: 'finer_levels' }] : []);
    UI.put($('#vBody thead'), `<tr>${cols.map(c => `<th class="${c.cls || ''}">${c.sort ? `<button type="button" data-act="sort" data-v="${c.sort}">${esc(c.label)}${key === c.sort ? ico(dir > 0 ? 'arrow_upward' : 'arrow_downward', { size: 'sm' }) : ''}</button>` : esc(c.label)}</th>`).join('')}</tr>`, true);
    UI.patch($('#cBody'), shown.length ? shown.map(c => ({ k: c.key, html: `<tr class="is-link" data-row-nav='${esc(JSON.stringify({ pane: 'company:' + c.key }))}'><td class="lead">${nameCell(c)}</td>${showSt ? `<td>${yearBadge(c)}${c.retry ? ' ' + UI.badge('Retrying', { tone: 'muted' }) : ''}</td>` : ''}
      ${nd ? `<td class="r">${rankCell(c.rank24, c.rank24Ex)}</td><td>${dueCell(c)}</td>` : c.status === 'todo' || (c.status === 'in-batch' && c.share == null) ? `<td colspan="4" class="tone-muted">${c.status === 'todo' && (c.ownerFile || c.retry) ? 'Read in the next batch' : 'Not read yet'}</td>` : `<td class="r">${c.share == null ? na : pc(c.share)}</td><td class="r">${c.women_staff == null ? na : pc(c.women_staff)}</td><td class="r">${c.board_total != null ? c.board_women + ' of ' + c.board_total : na}</td><td class="r">${c.kmp_total != null ? c.kmp_women + ' of ' + c.kmp_total : na}</td>`}
      ${showWhy ? `<td>${c.whyLabel ? UI.badge(c.whyLabel, { tone: c.status === 'no-data' ? 'muted' : 'warn', tip: c.why }) : ''}</td>` : f27 ? `<td class="r">${c.fy27Rank ? `${c.fy27Edge ? UI.badge('Near', { tone: 'muted', tip: EDGE_TIP }) + ' ' : ''}${N(c.fy27Rank)} <span class="t-12 tone-muted">${c.fy27Ex}</span>` : na}</td>` : showLv ? `<td class="r">${c.finer_levels || ''}</td>` : ''}</tr>` }))
      : [{ k: 'none', html: `<tr><td colspan="7">${UI.empty({ icon: 'search_off', title: `No company matches${q ? ` '${esc(r.cq)}'` : ''}.`, text: 'Try a CIN or part of the name.', action: UI.quiet({ label: 'Clear filters', icon: 'filter_list_off', act: 'clearFilters' }) })}</td></tr>` }], true);
  } else {
    if (!$('#vBody').querySelector('#cList')) $('#vBody').innerHTML = '<div class="card list" id="cList"></div>';
    const m = S.measure || 'share', mv = c => m === 'board' ? (c.board_total != null ? c.board_women + ' of ' + c.board_total : 'n/a') : pc(c[m]);
    UI.patch($('#cList'), shown.length ? shown.map(c => ({ k: c.key, html: UI.item({ nav: { pane: 'company:' + c.key }, title: esc(c.name), meta: nd ? [showWhy && c.whyLabel ? esc(c.whyLabel) : '', c.rank24 ? `Rank ${N(c.rank24)} on ${esc(c.rank24Ex)}, Dec 2024` : 'Not ranked, Dec 2024', dueText(c) ? 'BRSR due ' + esc(dueText(c) === 'Already due' ? 'already' : 'from ' + dueText(c)) : ''] : [esc(latestOf(c)), c.batch && c.status === 'in-batch' ? esc(c.batch) : '', showWhy && c.whyLabel ? esc(c.whyLabel) : '', f27 && c.fy27Rank ? `Rank ${N(c.fy27Rank)} on ${c.fy27Ex}` : ''], trail: nd ? '' : c.status === 'todo' ? `<span class="tone-muted t-13">${c.ownerFile || c.retry ? 'Next batch' : 'Not read'}</span>` : `<span class="strong">${mv(c)}</span>` }) }))
      : [{ k: 'none', html: UI.empty({ icon: 'search_off', title: 'No company matches.', action: UI.quiet({ label: 'Clear filters', icon: 'filter_list_off', act: 'clearFilters' }) }) }], true) }
  UI.put($('#vMore'), (cs.length > lim ? `<div class="mt-3">${UI.quiet({ label: `Show all ${N(cs.length)}`, icon: 'expand_more', act: 'all' })}</div>` : '') + outsideBuild(all, f27), true) }
// Files and Joins hold companies the build does not: each exchange's top 1,000 on 31 December 2025 that are not in it.
function outsideBuild(all, f27) {
  if (!all.fy27 || (f27 !== 'files' && f27 !== 'joins')) return '';
  const xs = all.fy27.outside.filter(x => x.joins === (f27 === 'joins')); if (!xs.length) return '';
  const row = x => UI.item({ k: x.isin, lead: { icon: 'add_business', tone: 'muted' }, title: esc(x.name), titleAfter: (x.left ? UI.badge('May have left', { tone: 'muted', tip: 'On both exchanges in December 2024, on BSE only now: AMFI keeps some companies that have since been delisted or merged.' }) : '') + (x.edge ? ' ' + UI.badge('Near the cut-off', { tone: 'muted', tip: EDGE_TIP }) : ''),
    meta: [`<span class="mono">${esc(x.nse || x.bse || '')}</span>`, esc(x.isin)], trail: `<span class="strong">${N(x.rank)}</span> <span class="t-12 tone-muted">${x.exchange}</span>` });
  return `<div class="mt-3">${UI.disclosure('fy27out', `Not in the build <span class="muted">${xs.length}</span>`, `<p class="t-13 tone-soft mb-2">In the top 1,000 on 31 December 2025, so ${f27 === 'joins' ? 'their first required BRSR is FY2026-27' : 'they file for FY2026-27'}, but missing from the Kaggle filings the build started from.</p><div class="card list">${xs.map(row).join('')}</div>`, S.open.has('fy27out'), { bare: true })}</div>` }
function viewResults(force) {
  scaffold('results', `${backBtn()}<div id="vHead"></div><div id="vBody"></div>`);
  if (!S.hier) { fetch('/api/hierarchy').then(r => r.json()).then(d => { S.hier = d; render(true) }); return UI.put($('#vBody'), `<div class="card">${UI.skeleton()}</div>`, force) }
  const L = Object.fromEntries((S.hier.ladder || []).map(x => [x.standard, x]));
  UI.put($('#vHead'), UI.sectionHead({ title: 'Results', info: "Women's share at each level and in each job function, pooled across the companies that report it." }), force);
  const ladder = !phone() ? `<div class="card">${UI.table({ cols: [{ label: 'Level' }, { label: 'Companies', cls: 'r' }, { label: 'Women', cls: 'r' }, { label: 'Men', cls: 'r' }, { label: "Women's share", cls: 'r' }, { label: '' }],
    rows: LV.filter(([k]) => L[k]).map(([k, l]) => { const x = L[k]; return `<tr class="is-link" data-row-nav='${esc(JSON.stringify({ view: 'companies', level: k, status: null, why: null }))}'><td>${l} ${x.companies < 10 ? UI.badge('Few', { tone: 'warn', tip: 'Fewer than 10 companies report this level.' }) : ''}</td><td class="r">${N(x.companies)}</td><td class="r">${N(x.women)}</td><td class="r">${N(x.men)}</td><td class="r">${pc(x.women_pct_pooled)}</td><td style="width:30%">${UI.meter(x.women_pct_pooled, { tick: 50, wide: true })}</td></tr>` }) })}</div>`
    : `<div class="card list">${ladderRows(true, true)}</div>`;
  const fn = S.hier.functions || [];
  UI.put($('#vBody'), `${UI.groupHead({ title: 'Ladder', icon: 'stairs', info: 'A row opens the companies that report that level.' })}${ladder}
    ${UI.groupHead({ title: 'Job functions', icon: 'work', info: "Most companies report a function only as a percentage, so a function's share is the average of each company's share." })}
    ${fn.length ? `<div class="card">${UI.table({ cols: [{ label: 'Function' }, { label: 'Companies', cls: 'r' }, { label: "Women's share", cls: 'r', tip: 'Average of each company\'s share' }], rows: fn.map(x => `<tr><td>${esc(x.standard.charAt(0).toUpperCase() + x.standard.slice(1))}</td><td class="r">${N(x.companies)}</td><td class="r">${pc(x.women_pct_avg)}</td></tr>`) })}</div>` : `<div class="card">${UI.empty({ icon: 'work_off', title: 'No company has reported job functions yet.' })}</div>`}
    <p class="mt-4">${UI.quiet({ label: "See every company's values", nav: { view: 'companies', sort: '-share', level: null } })}</p>`, force) }
function sqlResult() { const res = S.sql.res; if (!res) return ''; if (res.error) return `<p class="tone-bad" role="alert">${esc(res.error)}</p>`;
  return `<p class="t-13 tone-soft mb-2">${res.rows.length} row${res.rows.length === 1 ? '' : 's'}${res.rows.length === 500 ? ' (the most it shows)' : ''}</p>${res.rows.length ? `<div class="card scroll-x">${UI.table({ cols: Object.keys(res.rows[0]).map(k => ({ label: k })), rows: res.rows.map(x => `<tr>${Object.values(x).map(v => `<td>${esc(v)}</td>`).join('')}</tr>`) })}</div>` : ''}` }
function viewSql(force) {
  if (scaffold('sql', `${backBtn()}<div id="vHead"></div><textarea class="field" id="sqlq" aria-label="SQL query" spellcheck="false"></textarea>
    <div class="toolbar" style="margin-top:var(--sp-2)">${UI.btn({ label: 'Run', icon: 'play_arrow', act: 'sqlrun' })}<span class="kbd">⌘ Enter</span></div>
    ${UI.groupHead({ title: 'Starters', icon: 'bolt' })}<div class="tags">${STARTERS.map(([l, s]) => `<button type="button" class="tag" data-act="sqlset" data-v="${esc(s)}">${esc(l)}</button>`).join('')}</div>
    <div style="margin-top:var(--sp-3)">${UI.disclosure('tables', `Tables <span class="muted">${TABLES.length}</span>`, `<div class="tags" style="padding-bottom:var(--sp-3)">${TABLES.map(t => `<button type="button" class="tag" data-act="sqlset" data-v="select * from ${t} limit 20">${t}</button>`).join('')}</div>`, S.open.has('tables'))}</div>
    <div id="sqlres" style="margin-top:var(--sp-4)"></div>`)) $('#sqlq').value = S.sql.q;
  UI.put($('#vHead'), UI.sectionHead({ title: 'Query the data', info: 'Read-only: one SELECT or WITH query. Results stop at 500 rows.' }), force);
  UI.put($('#sqlres'), sqlResult(), true) }
async function runSql() { const q = $('#sqlq').value; S.sql = { q, res: null }; UI.put($('#sqlres'), UI.skeleton('Running'), true);
  try { S.sql.res = await (await fetch('/api/sql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) })).json() } catch (e) { S.sql.res = { error: "Can't reach the dashboard." } }
  ls.set('sql', JSON.stringify(S.sql).length < 200000 ? S.sql : { q, res: null }); UI.put($('#sqlres'), sqlResult(), true) }

/* ---------- Components: every library component in its states ---------- */
function viewLibrary(force) {
  if (!scaffold('library', '<div id="lib"></div>') && !force) return;
  const ex = (title, note, body) => `<section class="section">${UI.sectionHead({ title, info: note })}${body}</section>`;
  const run = o => UI.run({ time: '22:42', icon: 'check_circle', tone: 'accent', id: 'b013', line: '22 FY2025-26 · 3 FY2024-25 only', dur: '21 min', nav: { view: 'library' }, ...o });
  const icons = [['check_circle', 'FY2025-26, or a batch opened'], ['history', 'FY2024-25 only'], ['block', 'No usable report, or a skipped run'], ['progress_activity', 'In a batch, or running'], ['schedule', 'To do'], ['error', 'Stopped'], ['timer', 'Overran'], ['download', 'Fetch by hand'], ['fact_check', 'Check'], ['description', 'A file you sent'], ['unpublished', 'No BRSR filed'], ['merge', 'Merged'], ['gavel', 'Insolvent'], ['do_not_disturb_on', 'Delisted'], ['radar', 'Watched'], ['database', 'SQL'], ['info', 'A tooltip']];
  $('#lib').innerHTML = `${backBtn()}<div class="section-head"><h2 class="page-title">Components</h2>${UI.info('The building blocks of this page, in every state. Each is a function in ui.js with its style in ui.css; the app adds no styles of its own.')}</div>
  ${ex('Bar and strip', 'The sticky bar on desktop, the strip on phones. The whole status area opens the Run pane.', `<div class="card"><div class="bar" style="position:static"><div class="brand"><span class="brand__name">Nivel</span><span class="brand__sub">Parity</span></div><span class="bar__cells"><span class="bar__cell"><span class="bar__v"><span class="dot is-good"></span>Running b018</span><span class="bar__s">Read · started 01:43 · next run 02:12</span></span><span class="bar__cell"><span class="bar__v">348 of 1,194</span><span class="bar__s kv"><span class="mini"><i style="width:29%"></i></span>29%</span></span></span></div></div>
    <div class="card mt-3"><div class="strip" style="display:flex;position:static"><span class="strip__link"><span class="strip__a"><span class="dot is-warn"></span>Overrunning b016</span><span class="strip__c">38 min. The 01:12 run stops while it holds the lock.</span></span></div></div>`)}
  ${ex('Heads', 'A section head (h2, count, info, actions), and a group head inside it (h3 with icon and count).', `${UI.sectionHead({ title: 'Section title', count: 12, info: 'A description that lives in a tooltip.', actions: UI.quiet({ label: 'An action', icon: 'content_copy', act: 'noop' }) })}${UI.groupHead({ title: 'Group title', icon: 'fact_check', count: 3, info: 'What this group holds.', actions: UI.quiet({ label: 'Go somewhere', nav: { view: 'library' } }) })}`)}
  ${ex('Icons', 'Material Symbols Rounded: 20px and outlined; 16px in tags and heads, 14px in badges and chips.', `<div class="card list">${icons.map(([n, m]) => UI.item({ lead: { icon: n, tone: 'accent' }, title: `<span class="mono">${n}</span>`, meta: [m] })).join('')}</div>`)}
  ${ex('Badges', 'Status and data-quality labels. Never interactive.', `<div class="lib-row">${UI.badge('FY2025-26', { tone: 'good' })}${UI.badge('FY2024-25 only', { tone: 'warn' })}${UI.badge('No usable report', { tone: 'bad' })}${UI.badge('Open', { tone: 'accent' })}${UI.badge('Retrying', { tone: 'muted' })}${UI.badge('Few', { tone: 'warn', tip: 'Fewer than 10 companies' })}${UI.badge('No BRSR filed', { tone: 'warn', icon: 'unpublished' })}${UI.badge('Merged', { tone: 'muted', icon: 'merge' })}${UI.badge('Missing', { tone: 'muted' })}</div>`)}
  ${ex('Tags', 'Filters that toggle, with a count. Pressed shows the filter in use.', `<div class="tags">${UI.tag({ label: 'All', count: 12, act: 'noop', pressed: true })}${UI.tag({ label: 'Fetch by hand', count: 1, act: 'noop' })}${UI.tag({ label: 'Retrying', icon: 'replay', act: 'noop' })}${UI.tag({ label: 'Reports senior level', icon: 'close', act: 'noop', pressed: true })}</div>`)}
  ${ex('Chips', 'Links to outside pages, opened in a new tab.', UI.chips([{ label: 'PDF FY2025-26 …mgrT.pdf', url: 'https://example.com/report.pdf' }, { label: '/investors', url: 'https://example.com/investors' }, { label: 'web search', url: 'https://www.google.com' }]))}
  ${ex('Buttons', 'One primary per view; quiet for the rest (an arrow after the label when it goes somewhere); icon buttons always labelled.', `<div class="lib-row">${UI.btn({ label: 'Run', icon: 'play_arrow', act: 'noop' })}${UI.quiet({ label: 'Copy inbox path', icon: 'content_copy', act: 'noop' })}${UI.quiet({ label: 'All companies', nav: { view: 'library' } })}${UI.iconBtn({ icon: 'close', label: 'Close', act: 'noop' })}${UI.iconBtn({ icon: 'chevron_left', label: 'Previous', disabled: true })}${UI.info('A tooltip for meta text and descriptions')}</div>`)}
  ${ex('Tooltip', 'Meta text and descriptions. It shows on hover, on keyboard focus, and on a tap of an (i) on a phone.', `<div class="lib-row">${UI.info('Shown on hover, on focus, and on tap.')}<span class="tipped t-13" tabindex="0" data-tip="Text with a dotted underline carries a tooltip too.">Text with a tooltip</span></div>`)}
  ${ex('Fields, dropdown, date and search', 'Fields have a 1px soft border. The dropdown replaces native selects (arrows, Home, End, a letter, Enter, Escape). The date field takes a typed date or opens a calendar: arrows move a day, Page Up and Down a month, with Shift a year. The search lists companies, batches, runs by time and reasons.', `<div class="toolbar"><div class="field-wrap">${ico('search')}<input class="field" placeholder="Name, CIN or website" aria-label="Example field"></div>${UI.dropdown({ id: 'libdd', label: 'Example dropdown', prefix: 'Sort', value: 'share', options: [{ v: 'share', label: 'Share of pay' }, { v: 'staff', label: 'Women in staff' }, { v: 'board', label: 'Women on board' }] })}<span style="width:200px">${UI.dateField({ id: 'libdate', name: 'libdate', value: '2024-06-03', label: 'Example date' })}</span></div><textarea class="field" aria-label="Example query">select * from readings limit 20</textarea>
    <div class="card mt-3"><div class="search__group">Companies</div><button type="button" class="search__opt" tabindex="-1">${ico('check_circle')}<b>Allcargo Logistics Limited</b><span class="s">FY2025-26</span></button><div class="search__group">Runs</div><button type="button" class="search__opt" tabindex="-1" aria-selected="true">${ico('history')}<b>20:42 run</b><span class="s">skipped</span></button></div>`)}
  ${ex('Form', 'Labelled fields that wrap, a primary submit and a quiet Cancel. Used for a mark with details.', UI.form({ id: 'lib', title: 'Mark as merged', submit: 'Save mark', icon: 'check', cancel: 'noop', fields: [{ name: 'into', label: 'Merged into', placeholder: 'Company name', optional: true }, { name: 'since', label: 'On', type: 'date', optional: true }] }))}
  ${ex('List items', 'Lead icon, title, an optional question, meta line (parts joined by middots), body and foot. A row that opens something ends in a chevron.', `<div class="card list">${UI.item({ lead: { icon: 'download', tone: 'accent' }, title: 'A company that needs a download', meta: ['Blocks automated visitors'], foot: UI.chips([{ label: 'home page', url: 'https://example.com' }]), trail: UI.quiet({ label: 'No BRSR filed', icon: 'unpublished', act: 'noop' }) + UI.quiet({ label: 'Other mark', nav: { view: 'library' } }) })}${UI.item({ lead: { icon: 'person_search', tone: 'warn' }, title: 'A company to check', ask: 'Is this the right company?', meta: ['The flag text, quoted from the checker', 'b010'], trail: UI.iconBtn({ icon: 'done', label: 'Mark seen', act: 'noop' }) })}${UI.item({ lead: { icon: 'check_circle', tone: 'good' }, nav: { view: 'library' }, title: 'A row that opens something', trail: '<span class="strong">265</span>' + UI.meter(22) })}${UI.item({ title: 'A row without a lead icon', meta: ['For lists inside a pane'] })}</div>`)}
  ${ex('Stat tiles', 'One value each; context in the tooltip.', `<div class="stats">${UI.stat({ label: 'Pace', value: '37.5', unit: '/ h', tip: 'Companies an hour over the last 6 batches.' })}${UI.stat({ label: 'Finish', value: '23:16', sub: 'Today' })}${UI.stat({ label: 'Left', value: '915', sub: 'of 1,194' })}</div>`)}
  ${ex('Bar rows, meters and gauges', 'A tick marks parity (50%) or a usage gate.', `<div class="card list">${UI.barRow({ label: 'Board', count: '264', value: '20.8%', v: 20.8, tick: 50 })}${UI.barRow({ label: 'Top' + UI.badge('Few', { tone: 'warn' }), count: '3', value: '18.2%', v: 18.2, tick: 50, sub: '8 women, 39 men' })}</div><div class="mt-4">${UI.gauge({ label: 'Week', v: 24, gate: 78, meta: 'Clear · resets 18 Oct, 14:30' })}${UI.gauge({ label: 'Session', v: 66, gate: 75, meta: 'Near the gate' })}</div>`)}
  ${ex('Stepper, rail and ribbon', "A file's five steps; a batch's eight stages; one cell per scheduled run (one tab stop, arrow keys move).", `${UI.steps(2)} ${UI.steps(3, { problem: true })} ${UI.steps(5)}${UI.rail(['Find', 'Search again', 'Browser', 'Download', 'Cut tables', 'Read', 'Settle', 'Close'], 5)}${UI.ribbon([{ v: 'a', tip: 'opened' }, { v: 'b', cls: 'is-half', tip: 'finished an earlier one' }, { v: 'c', cls: 'is-lost', tip: 'lost' }, { v: 'd', cls: 'is-now', tip: 'running' }])}`)}
  ${ex('Run rows', 'Two fixed lines. The icon carries the outcome; line 2 says what happened, with caveats in its tooltip.', `<div class="card list">${run({})}${run({ time: '01:12', icon: 'progress_activity', tone: 'good', id: 'b017', word: 'Running', wordTone: 'good', line: 'At Read', dur: '16 min' })}${run({ time: '00:12', icon: 'timer', tone: 'warn', id: 'b016', word: 'Overran', wordTone: 'warn', dur: '51 min' })}${run({ time: '20:12', icon: 'error', tone: 'bad', id: 'b010', word: 'Stopped at Read', wordTone: 'bad', dur: '1h 10m' })}${run({ time: '21:12', icon: 'arrow_circle_right', id: 'b010', word: 'Finished', line: 'Left open by an earlier run', dur: '' })}${run({ time: '20:42', icon: 'block', tone: 'muted', id: '', word: 'Skipped', line: 'b010 still held the lock, so this run stopped', dur: '', lost: true, nav: null })}${run({ time: '14:32', icon: 'account_circle', tone: 'accent', id: 'b001', word: 'Started by hand', dur: '35 min' })}</div>`)}
  ${ex('Timeline', 'Oldest first; an (i) marks a full record in its tooltip.', UI.timeline([{ title: 'Stopped', time: '20:43', text: 'Stopped at Read.', tip: 'The full log line' }, { title: 'Closed', time: '21:24', text: 'Closed after resuming: 19 FY2025-26, 6 FY2024-25 only.' }]))}
  ${ex('Table', 'Tabular figures, a sticky header, right-aligned numbers, sortable columns.', `<div class="card">${UI.table({ sort: '-share', cols: [{ label: 'Level', sort: 'name' }, { label: 'Companies', cls: 'r' }, { label: "Women's share", cls: 'r', sort: 'share' }], rows: ['<tr><td>Board</td><td class="r">264</td><td class="r">20.8%</td></tr>', '<tr><td>KMP</td><td class="r">264</td><td class="r">13.9%</td></tr>'] })}</div>`)}
  ${ex('Disclosure', 'Closed and open; the open state is remembered.', UI.disclosure('lib-d', 'Checked reading', '<pre class="code">{ "fy": "2025-26" }</pre>', false) + UI.disclosure('lib-d2', 'Downloads <span class="muted">2</span>', '<pre class="code">[ … ]</pre>', true))}
  ${ex('Key-value line and flag panel', 'Small facts in a row; a checker flag with its kind.', UI.kv(['<span class="mono">L63010MH2004PLC073508</span>', 'New filer', UI.chip({ label: 'allcargologistics.com', url: 'https://allcargologistics.com' })]) + `<div class="mt-3">${UI.flag({ kind: 'Identity check', icon: 'person_search', head: UI.link({ view: 'library' }, 'b010'), text: "Identity mismatch, report CIN is another company's." }) + UI.flag({ kind: 'Value check', icon: 'calculate', head: UI.link({ view: 'library' }, 'Gloster Limited'), text: 'Gloster 3(b) wage share headed FY2024-25, current kept null', foot: "Checked: fixed, the 3(b) table kept last year's headers." })}</div>`)}
  ${ex('Pane head', 'Back (in-app history only), the title as the pane h2, previous and next, close.', `<div class="card"><div class="pane__head" style="position:static">${UI.iconBtn({ icon: 'arrow_back', label: 'Back', act: 'noop' })}<h2>Batch b010</h2>${UI.iconBtn({ icon: 'chevron_left', label: 'Previous', act: 'noop' })}${UI.iconBtn({ icon: 'chevron_right', label: 'Next', disabled: true })}${UI.iconBtn({ icon: 'close', label: 'Close', act: 'noop' })}</div></div>`)}
  ${ex('Empty, error and loading', 'One sentence; an action when there is one.', `<div class="card list">${UI.empty({ icon: 'task_alt', title: 'Nothing needs you.', text: '9 companies have no FY2025-26 report to fetch.' })}${UI.empty({ icon: 'cloud_off', title: "Can't reach the dashboard.", action: UI.btn({ label: 'Try again', icon: 'refresh', act: 'noop' }) })}${UI.skeleton()}</div>`)}
  ${ex('Toast', 'A short confirmation with Undo, for 6 seconds.', UI.btn({ label: 'Show a toast', icon: 'notifications', act: 'demoToast' }))}` }

/* ---------- render ---------- */
function render(force) {
  const r = R(), v = r.view; $('#today').hidden = !!v; $('#view').hidden = !v; if (!v) $('#view').dataset.v = '';
  renderBar();
  if (!v) { renderNeeds(force); if (S.o) { renderFiles(force); renderRecent(force); renderCos(force); renderLevels(force); renderQuery(force);
    UI.put($('#foot'), `<span data-tip="Refreshes every 30 seconds">Updated ${esc(String(S.o.now).slice(11, 19))}</span><a href="${esc(href({ view: 'library' }))}" data-nav='{"view":"library"}'>Components</a>`, force) } }
  else if (S.o || v === 'library') ({ companies: viewCompanies, results: viewResults, sql: viewSql, library: viewLibrary }[v] || (() => { }))(force);
  renderPane(force); themeBtn() }
async function tick(manual) {
  if (document.hidden && !manual) return;
  try { const [o, rs] = await Promise.all([fetch('/api/overview').then(x => { if (!x.ok) throw 0; return x.json() }), fetch('/api/runs').then(x => x.json())]); S.o = o; S.runs = rs; S.fail = 0;
    if (R().view === 'companies') await needAll(true); const p = R().pane; if (p && p !== 'run') await loadPane(p) } catch (e) { S.fail++ }
  render(!!manual) }

/* ---------- search ---------- */
let sel = -1, items = [];
const jump = [['Needs you', 'notifications', () => goToday('#needs')], ['Files you sent', 'description', () => goToday('#files')], ['Companies', 'apartment', () => goToday('#cos')],
  ["Women's share by level", 'bar_chart', () => goToday('#levels')], ['Runs', 'history', () => nav({ pane: 'run' })], ['Query the data', 'database', () => nav(sheetOff({ view: 'sql' }))],
  ['All companies', 'table_rows', () => nav({ view: 'companies' })], ['Results', 'stairs', () => nav({ view: 'results' })], ['Components', 'widgets', () => nav({ view: 'library' })]];
function goToday(sel) { nav(sheetOff({ view: null })); requestAnimationFrame(() => $(sel)?.scrollIntoView({ behavior: 'smooth' })) }
function searchItems(q) {
  q = q.trim().toLowerCase(); const out = [], add = (g, icon, l, s, act) => out.push({ g, icon, l, s, act });
  const shown = jump.filter(([l]) => !(l === 'Needs you' && $('#needs').hidden) && !(l === 'Files you sent' && $('#files').hidden));  // no jump to a hidden section
  if (!q) { shown.forEach(([l, i, a]) => add('Jump to', i, l, '', a)); return out }
  shown.filter(([l]) => l.toLowerCase().split(/\W+/).some(w => w.startsWith(q)) || (q === 'sql' && l === 'Query the data')).forEach(([l, i, a]) => add('Jump to', i, l, '', a));
  const m = q.match(/^(b|g|batch\s*|gap\s*)0*(\d{1,3})$/) || q.match(/^()0*(\d{1,3})$/); if (m) { const id = (m[1][0] === 'g' ? 'g' : 'b') + m[2].padStart(3, '0'); if ((S.runs?.runs || []).some(x => x.batch === id)) add('Batches', 'inventory_2', id, 'batch', () => nav({ pane: 'batch:' + id })) }
  const t = q.match(/^(\d{1,2})[:.](\d{2})$/);
  if (t) { const cands = [+t[1] % 24, (+t[1] + 12) % 24].map(h => h * 60 + +t[2]), mins = s => s ? +s.slice(11, 13) * 60 + +s.slice(14, 16) : null;
    const hits = (S.runs?.runs || []).map(x => { const a = mins(x.openedAt || x.slot), z = x.closedAt ? mins(x.closedAt) : a + 30, s = mins(x.slot);
      const exact = cands.some(c => s != null && c === s), inside = cands.some(c => a != null && c >= a && c <= z), padded = cands.some(c => a != null && c >= a - 10 && c <= z + 10), near = cands.some(c => s != null && Math.abs(c - s) <= 12);
      return { x, score: exact ? 0 : inside ? 1 : padded ? 2 : near ? 3 : 9, gap: Math.min(...cands.map(c => Math.abs(c - (s ?? a ?? 0)))) } }).filter(h => h.score < 9).sort((a, b) => a.score - b.score || a.gap - b.gap).slice(0, 4);
    hits.forEach(({ x }) => add('Runs', 'history', (x.slot ? tm(x.slot) : tm(x.openedAt)) + ' run', { opened: 'opened ' + x.batch, running: 'running ' + x.batch, resumed: 'finished ' + x.batch, skipped: 'skipped', lost: 'no batch', attended: 'attended ' + x.batch }[x.outcome],
      () => x.batch && x.outcome !== 'skipped' && x.outcome !== 'lost' ? nav({ pane: 'batch:' + x.batch }) : (nav({ pane: 'run' }), setTimeout(() => flashSlot(x.slot), 80)))) }
  if (!S.all) out.push({ g: 'Companies', l: 'Loading companies…', loading: true });
  else (S.all.companies || []).filter(c => [c.name, c.key, c.cin, c.isin, c.nse, c.bseCode, c.website, c.formerly].some(x => x && String(x).toLowerCase().includes(q))).slice(0, 8)
    .forEach(c => add('Companies', STICON[c.status]?.[0] || 'apartment', c.name, (ST[c.status] || c.status) + (c.retry ? ', retrying' : ''), () => { S.list = null; nav({ pane: 'company:' + c.key }) }));
  [['done-kaggle', S.o?.progress.fy2425], ['no-data', S.o?.progress.nodata]].forEach(([status, gs]) => (gs || []).filter(g => g.tag !== 'retrying' && g.label.toLowerCase().split(/\W+/).some(w => w.length > 2 && w.startsWith(q))).forEach(g => add('Reasons', 'filter_list', g.label, g.n + ' companies', () => nav({ view: 'companies', status, why: g.tag }))));
  return out }
function drawSearch() {
  const q = $('#q').value; items = searchItems(q); const box = $('#sr'); box.hidden = false; $('#q').setAttribute('aria-expanded', 'true'); let g = '', h = '';
  items.forEach((x, i) => { if (x.g !== g) { g = x.g; h += `<div class="search__group">${esc(g)}</div>` }
    h += x.loading ? `<div class="search__none">${esc(x.l)}</div>` : `<button type="button" class="search__opt" role="option" tabindex="-1" id="opt${i}" data-i="${i}" aria-selected="${i === sel}">${ico(x.icon || 'arrow_forward')}<b>${esc(x.l)}</b>${x.s ? `<span class="s">${esc(x.s)}</span>` : ''}</button>` });
  box.innerHTML = h || `<div class="search__none">No match for '${esc(q)}'. Try a company name, CIN, batch id or a time like 9:41.</div>`;
  if (sel >= 0) $('#q').setAttribute('aria-activedescendant', 'opt' + sel); else $('#q').removeAttribute('aria-activedescendant') }
function closeSearch() { $('#sr').hidden = true; $('#q').setAttribute('aria-expanded', 'false'); sel = -1; document.body.classList.remove('is-searching') }
function pick(i) { const x = items[i]; if (!x || x.loading) return; closeSearch(); $('#q').value = ''; $('#q').blur(); x.act() }
$('#q').addEventListener('focus', () => { needAll().then(() => { if (document.activeElement === $('#q')) drawSearch() }); sel = -1; drawSearch() });
$('#q').addEventListener('input', () => { sel = $('#q').value.trim() ? 0 : -1; drawSearch() });
$('#q').addEventListener('keydown', e => {
  const n = items.filter(x => !x.loading).length;
  if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); drawSearch(); e.preventDefault() } else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); drawSearch(); e.preventDefault() }
  else if (e.key === 'Enter') { if (sel >= 0 && n) pick(sel); e.preventDefault() } else if (e.key === 'Escape') { closeSearch(); $('#q').blur() } });
$('#sr').addEventListener('mousedown', e => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); pick(+b.dataset.i) } });
$('#q').addEventListener('blur', () => setTimeout(() => { if (!phone()) closeSearch() }, 150));

/* ---------- events ---------- */
const saveOpen = () => ls.set('open', [...S.open]);
function flashSlot(s, stay) { const el = document.querySelector(`#lRuns [data-slot="${CSS.escape(s)}"]`), p = $('#pane'); if (!el) return;
  if (!stay) { if (wide() || p.classList.contains('is-open')) p.scrollTo({ top: el.offsetTop - p.clientHeight / 2, behavior: 'smooth' }); else el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1600) }
document.addEventListener('click', e => {
  const n = e.target.closest('[data-nav]');
  if (n && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); const p = JSON.parse(n.dataset.nav);
    if (p.pane && !n.closest('#view')) S.list = null;
    const pushing = !(p.pane && R().pane && n.closest('#phead')); S.clicked = true; nav(p, pushing); S.clicked = false; if ('view' in p && !p.pane) restoreOrTop(); return }
  const a = e.target.closest('[data-act]');
  if (!a) { const row = e.target.closest('[data-row-nav]'); if (row && !e.target.closest('a,button,input,select,summary')) { if (!row.closest('#view')) S.list = null; S.clicked = true; nav(JSON.parse(row.dataset.rowNav)); S.clicked = false } return }
  const v = a.dataset.v, act = a.dataset.act; S.clickedAct = a;  // Safari does not focus a clicked button
  const acts = {
    need: () => nav({ need: v === 'all' ? null : v }, false),
    seen: () => { S.seen.add(v); ls.set('seen', [...S.seen]); S.undo = { id: v }; clearTimeout(S.undoT); S.undoT = setTimeout(() => { S.undo = null; renderNeeds(true) }, 6000); render(true) },
    unseen: () => { S.seen.delete(v); ls.set('seen', [...S.seen]); S.undo = null; render(true) },
    seenAll: () => { const ids = (S.o?.inbox.decisions || []).map(d => d.id).filter(id => !S.seen.has(id)); ids.forEach(id => S.seen.add(id)); ls.set('seen', [...S.seen]); S.undo = null; S.undoAll = ids; render(true);
      UI.toast(`${ids.length} checks marked seen.`, { label: 'Undo', act: 'unseenAll' }) },
    unseenAll: () => { (S.undoAll || []).forEach(id => S.seen.delete(id)); ls.set('seen', [...S.seen]); S.undoAll = null; render(true) },
    showSeen: () => { S.showSeen = !S.showSeen; render(true) }, more: () => { S.more = true; render(true) },
    toggle: () => { S.open.has(v) ? S.open.delete(v) : S.open.add(v); saveOpen(); render(true); document.querySelector(`[data-act="toggle"][data-v="${CSS.escape(v)}"]`)?.focus() },
    copy: () => { navigator.clipboard?.writeText(v); const t = a.innerHTML; a.innerHTML = ico('check') + 'Copied'; setTimeout(() => { a.innerHTML = t }, 1500) },
    close: closePane, back: () => history.back(), retry: () => tick(true),
    today: () => { e.preventDefault(); nav({ view: null, status: null, cq: null, retry: null, sort: null, lim: null, why: null, level: null, fy27: null, year: null }); restoreOrTop() },
    slot: () => { if (!wide() && R().pane !== 'run') nav({ pane: 'run' }); setTimeout(() => flashSlot(v), 80) },
    lostRuns: () => { const ls = (S.runs?.runs || []).filter(x => x.slot && (x.outcome === 'skipped' || x.outcome === 'lost')).map(x => x.slot); ls.forEach((x, i) => setTimeout(() => flashSlot(x, i > 0), 80)) },
    bf: () => nav({ bf: v === 'all' ? null : v }, false), status: () => nav({ status: v || null, year: null, why: null, lim: null }, false), why: () => nav({ why: R().why === v ? null : v }, false), fy27: () => nav({ fy27: R().fy27 === v ? null : v, lim: null }, false),
    level: () => nav({ level: null }, false), notdue: () => nav({ status: 'no-data', why: 'nd-notdue', year: null, lim: null }, false), year: () => nav({ year: +R().year === +v ? null : v, status: null, why: null, lim: null }, false), sort: () => { const s = R().sort || 'rank'; nav({ sort: s === v ? '-' + v : v }, false) }, all: () => nav({ lim: 5000 }, false),
    clearFilters: () => { nav({ status: null, cq: null, retry: null, why: null, level: null, fy27: null, year: null }, false); $('#cq') && ($('#cq').value = '') },
    opensql: () => { S.sql = { q: `select * from readings where key = '${v}'`, res: null }; $('#view').dataset.v = ''; nav(sheetOff({ view: 'sql' })) },
    sqlset: () => { S.sql = { q: v, res: null }; $('#sqlq').value = v; ls.set('sql', S.sql); runSql() }, sqlrun: runSql,
    demoToast: () => UI.toast('Arihant Capital Markets Limited: marked no BRSR filed.', { label: 'Undo', act: 'noop' }),
    markSet: () => { const [key, kind] = v.split('|'); setMark(key, { kind: kind || null }) },
    markOpen: () => { const c = S.pane.data, m = c.mark?.kind === v ? c.mark : {}; S.markForm = { key: c.key, kind: v, into: m.into || '', since: m.since || '' };
      render(true); $('#pbody form[data-form="mark"] input')?.focus() },
    markEdit: () => { S.markForm = { key: v, kind: null }; render(true); $('#markRow [data-act]')?.focus() },
    markCancel: () => { const k = S.markForm?.kind; S.markForm = null; render(true); ($('#markRow [data-act="markEdit"]') || $(`#markRow [data-v="${k}"]`))?.focus() },
    markUndo: () => { const u = S.markUndo; S.markUndo = null; if (u) setMark(u.key, u.prev ? { kind: u.prev.kind, into: u.prev.into, since: u.prev.since, note: u.prev.note, at: u.prev.at } : { kind: null }, u) },
    searchOpen: () => { document.body.classList.add('is-searching'); $('#q').focus() }, searchClose: () => { closeSearch(); $('#q').value = '' }, theme: cycleTheme, noop: () => { } };
  if (act === 'retry' && a.closest('#vTags')) return nav({ retry: R().retry === '1' ? null : '1' }, false);
  (acts[act] || (() => { }))() });
async function setMark(key, m, undo) {
  if (S.marking) return; S.marking = true;  // one at a time: a double click sends one mark
  const from = document.activeElement !== document.body ? document.activeElement : S.clickedAct, fromPane = !!(from && from.closest('#pane, .toast')), row = from?.closest('#needs [data-k]'), nextK = row?.nextElementSibling?.dataset.k;
  const name = undo?.name || (S.o?.inbox.fetch.find(c => c.key === key) || (S.pane.data?.key === key && S.pane.data) || {}).name || key;
  let r;
  try { r = await (await fetch('/api/mark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, ...m }) })).json() } catch (e) { r = { error: "Can't reach the dashboard." } }
  if (r.error) { S.marking = false; return UI.toast(r.error) }
  S.markForm = null; clearTimeout(S.markUndoT);
  S.markUndo = undo ? null : { key, name, prev: r.prev }; if (S.markUndo) S.markUndoT = setTimeout(() => { S.markUndo = null }, 6000);  // Undo lasts as long as its toast
  const word = r.mark ? 'marked ' + ({ noBrsr: 'no BRSR filed' }[r.mark.kind] || r.mark.kind) : 'mark removed';
  UI.toast(undo ? `${name}: undone.` : `${name}: ${word}.`, undo ? null : { label: 'Undo', act: 'markUndo' });
  try { if (S.pane.key === 'company:' + key) await loadPane(S.pane.key, true); await tick(true) } finally { S.marking = false }
  // Focus stays where the owner was: the control itself, the pane's mark line, the next row, or the company's restored row.
  const at = s => document.querySelector(s);
  if (from?.isConnected && from !== document.body) return from.focus();
  (fromPane && S.pane.key === 'company:' + key && at('#pbody #markRow [data-act]')
    || nextK && at(`#needs [data-k="${CSS.escape(nextK)}"] [data-act]`) || at(`#needs [data-k="${CSS.escape(key)}"] [data-act]`) || at('#needs'))?.focus() }
function restoreOrTop() { const y = S.scroll.get(routeKey()); requestAnimationFrame(() => scrollTo(0, y || 0)) }
document.addEventListener('input', e => { const i = e.target; if (S.markForm && i.name && i.closest('form[data-form="mark"]')) S.markForm[i.name] = i.value });
document.addEventListener('submit', e => { const f = e.target; e.preventDefault(); if (f.dataset.form !== 'mark') return;
  const m = S.markForm, di = f.querySelector('.datef__input'), since = di ? UI.parseDate(di.value) : undefined;
  if (since === null) { di.setAttribute('aria-invalid', 'true'); di.focus(); return UI.toast('Enter the date like 3 Jun 2024.') }
  if (m?.kind) setMark(m.key, { kind: m.kind, into: f.elements.into?.value, since, note: S.pane.data?.mark?.note }) });
document.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && d.dataset.id) { d.open ? S.open.add(d.dataset.id) : S.open.delete(d.dataset.id); saveOpen() } }, true);
let ct; document.addEventListener('input', e => {
  if (e.target.id === 'cq') { clearTimeout(ct); ct = setTimeout(() => { history.replaceState(history.state, '', href({ cq: e.target.value || null, lim: null })); viewCompanies(true) }, 150) }
  if (e.target.id === 'sqlq') { S.sql = { q: e.target.value, res: S.sql.res }; ls.set('sql', JSON.stringify(S.sql).length < 200000 ? S.sql : { q: S.sql.q, res: null }) } });
document.addEventListener('ddchange', e => { if (e.detail.id === 'measure') { S.measure = e.detail.value; viewCompanies(true) } });
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName, typing = /INPUT|TEXTAREA|SELECT/.test(tag);
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); if (phone()) document.body.classList.add('is-searching'); $('#q').focus(); return }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && document.activeElement?.id === 'sqlq') { e.preventDefault(); runSql(); return }
  if (typing) return;
  if (e.key === 'Escape' && R().pane) closePane();
  if ((e.key === '[' || e.key === ']') && R().pane) { const l = $(`#phead a[aria-label="${e.key === '[' ? 'Previous' : 'Next'}"]`); if (l) l.click() } });
$('#scrim').addEventListener('click', closePane);
addEventListener('popstate', () => { render(true); restoreOrTop() });
// Layout follows the width only: a phone keyboard changes the height, and a redraw then would drop the field being typed in.
let lastW = innerWidth; addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(window._rz); window._rz = setTimeout(() => { $('#view').dataset.v = ''; render(true) }, 150) });
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() });

/* ---------- theme ---------- */
const TH = ['system', 'light', 'dark'];
function themeNow() { const u = new URLSearchParams(location.search).get('theme'); return u === 'light' || u === 'dark' ? u : ls.get('theme-choice', 'system') }
function themeBtn() { const t = themeNow(), b = $('#theme'); b.setAttribute('aria-label', 'Theme: ' + t); b.dataset.tip = 'Theme: ' + t + '. Click to change.'; b.innerHTML = ico({ system: 'contrast', light: 'light_mode', dark: 'dark_mode' }[t]) }
function cycleTheme() { const t = TH[(TH.indexOf(themeNow()) + 1) % 3]; ls.set('theme-choice', t); try { t === 'system' ? localStorage.removeItem('pt-theme') : localStorage.setItem('pt-theme', t) } catch (e) { }
  if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; themeBtn() }

function $(s, r = document) { return r.querySelector(s) }
let st_; addEventListener('scroll', () => { cancelAnimationFrame(st_); st_ = requestAnimationFrame(() => S.scroll.set(routeKey(), scrollY)) }, { passive: true });
$('#pane').addEventListener('scroll', () => { if (S.pane.key) S.scroll.set('pane:' + S.pane.key, $('#pane').scrollTop) }, { passive: true });
document.fonts?.load('20px "Material Symbols Rounded"').then(() => document.documentElement.classList.add('icons'), () => { });
UI.initTooltips(); UI.initPopovers(); history.scrollRestoration = 'manual'; if (!history.state) history.replaceState({ d: 0 }, '', location.href);
tick(true); setInterval(tick, 30000);
