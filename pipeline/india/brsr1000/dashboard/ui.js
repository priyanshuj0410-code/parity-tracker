/* Parity dashboard: component library (PARITY-126). Each function returns HTML for one component; the
   Components page (#view=library) shows them all. Behaviours at the end: tooltips, safe rendering, keyed patching. */
const UI = (() => {
  const esc = v => v == null ? '' : String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const attr = (k, v) => v == null || v === false || v === '' ? '' : ` ${k}="${esc(v === true ? '' : v)}"`;
  const tipA = t => t ? ` data-tip="${esc(t)}"` : '';
  let href = () => '#'; // the app sets this: navigation patch -> URL
  const navA = p => p ? ` href="${esc(href(p))}" data-nav='${esc(JSON.stringify(p))}'` : '';

  /* Icon: a Material Symbols Rounded glyph. Decorative unless given a label. */
  const ico = (name, o = {}) => `<span class="ico${o.fill ? ' fill' : ''}${o.size ? ' ' + o.size : ''}${o.tone ? ' tone-' + o.tone : ''}${o.cls ? ' ' + o.cls : ''}"${o.label ? ` role="img" aria-label="${esc(o.label)}"` : ' aria-hidden="true"'}>${name}</span>`;
  /* Info: a small (i) button whose tooltip carries a description or meta text. */
  const info = (text, label = 'About this') => text ? `<button type="button" class="info" data-tip="${esc(text)}" aria-label="${esc(label)}">${ico('info', { size: 'sm' })}</button>` : '';
  /* Link: an in-app link that navigates through the app (middle-click still opens a tab). */
  const link = (p, inner, cls = '', o = {}) => `<a class="${cls}"${navA(p)}${tipA(o.tip)}${attr('aria-label', o.label)}>${inner}</a>`;

  /* Badge: a status or data-quality label. Tones: warn (estimated, flagged), good, bad, accent, muted. Not interactive. */
  const badge = (text, o = {}) => `<span class="badge${o.tone ? ' badge--' + o.tone : ''}"${tipA(o.tip)}${o.tip ? ' tabindex="0"' : ''}>${o.icon ? ico(o.icon) : ''}${esc(text)}</span>`;
  /* Tag: a filter that toggles. Shows a count; pressed state is aria-pressed. */
  const tag = o => `<button type="button" class="tag" data-act="${esc(o.act)}" data-v="${esc(o.v ?? '')}" aria-pressed="${!!o.pressed}"${tipA(o.tip)}>${o.icon ? ico(o.icon) : ''}${esc(o.label)}${o.count != null ? `<span class="tag__count">${esc(o.count)}</span>` : ''}</button>`;
  /* Chip: a link to an outside page, opened in a new tab. */
  const chip = o => `<a class="chip" href="${esc(o.url)}" target="_blank" rel="noopener"${tipA(o.tip || o.url)}><span>${esc(o.label)}</span>${ico('open_in_new')}</a>`;
  const chips = ls => ls && ls.length ? `<div class="chips">${ls.map(chip).join('')}</div>` : '';

  /* Buttons: primary (one per view), quiet (text), icon (square, always labelled). */
  const btn = o => `<button type="button" class="btn" data-act="${esc(o.act)}"${attr('data-v', o.v)}>${o.icon ? ico(o.icon) : ''}${esc(o.label)}</button>`;
  /* A quiet button that goes somewhere puts its arrow after the label; one that acts puts its icon before. */
  const quiet = o => { const inner = o.nav ? `<span class="lbl">${esc(o.label)}</span>${ico(o.icon || 'arrow_forward')}` : `${o.icon ? ico(o.icon) : ''}<span class="lbl">${esc(o.label)}</span>`;
    return o.nav ? link(o.nav, inner, 'btn--quiet', { tip: o.tip }) : `<button type="button" class="btn--quiet" data-act="${esc(o.act)}"${attr('data-v', o.v)}${tipA(o.tip)}>${inner}</button>` };
  const iconBtn = o => o.disabled ? `<span class="icon-btn" aria-disabled="true" role="img" aria-label="${esc(o.label)} (none)">${ico(o.icon)}</span>`
    : o.nav ? link(o.nav, ico(o.icon), 'icon-btn', { label: o.label, tip: o.label })
    : `<button type="button" class="icon-btn" data-act="${esc(o.act)}"${attr('data-v', o.v)} aria-label="${esc(o.label)}" data-tip="${esc(o.label)}">${ico(o.icon)}</button>`;

  /* Meter: an inline bar with an optional tick (parity at 50%, or a usage gate). */
  const meter = (v, o = {}) => { const max = o.max || 100, w = Math.max(0, Math.min(100, 100 * (v || 0) / max));
    return `<span class="meter${o.wide ? ' is-wide' : ''}" role="img" aria-label="${esc(o.label || (v == null ? 'no value' : v + ' of ' + max))}"><span class="meter__fill" style="width:${w}%"></span>${o.tick != null ? `<span class="meter__tick" style="left:calc(${100 * o.tick / max}% - 1px)"></span>` : ''}</span>` };
  /* Stat tile: label, one value, an optional unit; context goes in the tooltip. */
  const stat = o => `<div class="stat"${tipA(o.tip)}${o.tip ? ' tabindex="0"' : ''}><div class="stat__label">${esc(o.label)}${o.tip ? ico('info', { size: 'sm', tone: 'muted' }) : ''}</div><div class="stat__value">${o.value}${o.unit ? `<span class="stat__unit">${esc(o.unit)}</span>` : ''}</div>${o.sub ? `<div class="stat__sub">${o.sub}</div>` : ''}</div>`;

  /* List item: lead icon, title, meta line, optional body and foot, trailing slot. The whole row can be a link. */
  /* nav makes the whole row a link; rowNav makes a row that holds its own links or buttons open on a click of its background. */
  const item = o => {
    const tagName = o.nav ? 'a' : 'div', lead = o.lead ? `<span class="item__lead${o.lead.tone ? ' tone-' + o.lead.tone : ''}">${ico(o.lead.icon, { fill: o.lead.fill })}</span>` : '';
    const meta = (o.meta || []).filter(Boolean), go = o.nav || o.rowNav;
    return `<${tagName} class="item${o.lead ? '' : ' no-lead'}${o.rowNav ? ' is-link' : ''}${o.cls ? ' ' + o.cls : ''}"${o.nav ? navA(o.nav) : ''}${o.rowNav ? ` data-row-nav='${esc(JSON.stringify(o.rowNav))}'` : ''}${attr('data-k', o.k)}>${lead}<div class="item__main">
      <div class="item__title"><span class="t"${tipA(o.titleTip)}>${o.title}</span>${o.titleAfter || ''}</div>
      ${o.ask ? `<div class="item__ask">${o.ask}</div>` : ''}${meta.length ? `<div class="item__meta">${meta.map((m, i) => `<span class="m">${m}${i < meta.length - 1 ? '<span class="sep" aria-hidden="true"> · </span>' : ''}</span>`).join('')}</div>` : ''}${o.body ? `<div class="item__body">${o.body}</div>` : ''}${o.foot ? `<div class="item__foot">${o.foot}</div>` : ''}</div>
      <div class="item__trail">${o.trail || ''}${go ? ico('chevron_right') : ''}</div></${tagName}>` };

  /* Heads: a section (h2, count, info, actions) and a group inside it (h3 with icon). */
  const sectionHead = o => `<div class="section-head"><h2${attr('id', o.id)}>${esc(o.title)}</h2>${o.count != null && o.count !== '' ? `<span class="count"${tipA(o.countTip)}${o.countTip ? ' tabindex="0"' : ''}>${esc(o.count)}</span>` : ''}${info(o.info)}<span class="actions">${o.actions || ''}</span></div>`;
  /* One head for groups inside a section and blocks inside a pane: an h3 with an optional icon and count. */
  const groupHead = o => `<div class="group-head"><h3>${o.icon ? ico(o.icon, { size: 'sm' }) : ''}${esc(o.title)}${o.count != null ? `<span class="count">${esc(o.count)}</span>` : ''}</h3>${info(o.info)}<span class="actions">${o.actions || ''}</span></div>`;
  const blockHead = groupHead;
  /* Bar row: a label, a count, a value and a meter with an optional tick; a link when given nav. */
  const barRow = o => `<${o.nav ? 'a' : 'div'} class="barrow"${o.nav ? navA(o.nav) : ''}${attr('data-k', o.k)}><span class="barrow__label">${o.label}</span><span class="barrow__count">${o.count ?? ''}</span><span class="barrow__value">${o.value}</span>${meter(o.v, { tick: o.tick, label: o.meterLabel })}${o.sub ? `<span class="barrow__sub">${o.sub}</span>` : ''}</${o.nav ? 'a' : 'div'}>`;
  /* Gauge: a usage figure against its gate, with one meta line. */
  const gauge = o => `<div class="gauge"><span class="gauge__label">${esc(o.label)}</span><span class="gauge__value ${o.v >= o.gate ? 'tone-bad' : o.v >= o.gate - 15 ? 'tone-warn' : ''}">${o.v ?? 'n/a'}%</span>${meter(o.v, { tick: o.gate, wide: true, label: `${o.v}% used, gate at ${o.gate}%` })}<span class="gauge__meta">${o.meta || ''}</span></div>`;
  /* Flag panel: a checker flag on a tint panel, its kind first. */
  /* Flag panel: a checker flag in the warn tone, with no badge inside (the panel is the status). The kind's icon leads, then the
     finding, a meta line (the kind, left out when the finding opens with it, then the batch or company link) and the owner's note. */
  const flag = o => { const said = o.kind && o.text.toLowerCase().startsWith(o.kind.split(' ')[0].toLowerCase()), meta = [said ? '' : esc(o.kind || ''), o.head].filter(Boolean);
    return `<div class="flag"><span class="flag__lead">${ico(o.icon || 'flag', { label: o.kind || 'Flag' })}</span><div class="flag__main"><div class="flag__text">${o.text}</div>`
      + `${meta.length ? `<div class="flag__meta">${meta.join('<span class="sep" aria-hidden="true"> · </span>')}</div>` : ''}${o.foot ? `<div class="flag__foot">${o.foot}</div>` : ''}</div></div>` };
  /* Key-value line: small facts in a row, separated by space, never wrapping mid-fact. */
  const kv = parts => `<div class="kv">${parts.filter(Boolean).map(p => `<span class="kv__part">${p}</span>`).join('')}</div>`;

  /* Empty state: an icon, one sentence, and an optional line or action. Also used for errors (icon error). */
  const empty = o => `<div class="empty"${o.role ? ` role="${o.role}"` : ''}>${ico(o.icon || 'check_circle', { size: 'xl' })}<div><div class="empty__title">${esc(o.title)}</div>${o.text ? `<div class="empty__text">${o.text}</div>` : ''}${o.action ? `<div style="margin-top:var(--sp-2)">${o.action}</div>` : ''}</div></div>`;
  const skeleton = (label = 'Loading') => `<div class="skeleton" role="status" aria-label="${esc(label)}"><i></i><i></i><i></i></div>`;

  /* Stepper: five steps with the current one ringed; each dot names its step in a tooltip. */
  const steps = (step, o = {}) => { const L = o.labels || ['In inbox', 'Matched', 'Taken in', 'Read', 'Done']; let h = `<span class="steps" role="img" aria-label="Step ${step} of ${L.length}: ${esc(L[step - 1])}">`;
    L.forEach((l, i) => { const n = i + 1, done = n < step || (n === step && step === L.length);
      h += (i ? `<b class="${n <= step ? 'is-done' : ''}"></b>` : '') + `<i class="${done ? 'is-done' : n === step ? (o.problem ? 'is-problem' : 'is-now') : ''}" data-tip="${esc(l)}"></i>` });
    return h + '</span>' };
  /* Stage rail: the batch's eight stages, done ones filled, the current one bold. */
  const rail = (names, ix) => `<div class="rail">${names.map((n, i) => `<span class="${ix != null && i < ix ? 'is-done' : i === ix ? 'is-now' : ''}"${i === ix ? ' aria-current="step"' : ''} data-tip="${esc(n)}">${esc(n)}</span>`).join('')}</div>`;
  /* Slot ribbon: one cell per scheduled run; filled opened a batch, half finished an earlier one, dashed was lost. */
  /* One tab stop for the whole ribbon (arrow keys move between cells). */
  const ribbon = cells => `<div class="ribbon" role="group" aria-label="Every scheduled run; arrow keys move">${cells.map((c, i) => `<button type="button" class="${c.cls || ''}" data-act="slot" data-v="${esc(c.v)}" data-tip="${esc(c.tip)}" aria-label="${esc(c.tip)}" tabindex="${i === cells.length - 1 ? 0 : -1}"></button>`).join('')}</div>
    <div class="legend"><span><i></i>Opened a batch</span><span><i class="is-half"></i>Finished an earlier one</span><span><i class="is-lost"></i>Lost</span></div>`;
  /* Run row: two fixed lines. Line 1 is the time, an icon that carries the outcome, the batch and the duration; line 2 is
     what happened, in one line (the full text in its tooltip). */
  const run = o => `<${o.nav ? 'a' : 'div'} class="run${o.lost ? ' is-lost' : ''}"${o.nav ? navA(o.nav) : ''}${attr('data-slot', o.slot)}><span class="run__time">${esc(o.time)}</span>${ico(o.icon, { tone: o.tone, label: o.iconLabel, cls: 'run__ico' })}`
    + `<span class="run__head">${o.id ? `<span class="run__id">${esc(o.id)}</span>` : ''}<span class="run__word${o.wordTone ? ' tone-' + o.wordTone : ''}">${esc(o.word || '')}</span></span><span class="run__dur">${esc(o.dur || '')}</span>`
    + `${o.nav ? ico('chevron_right', { tone: 'muted', cls: 'run__go' }) : ''}<span class="run__line"${tipA(o.lineTip || o.line)}>${o.line || ''}</span></${o.nav ? 'a' : 'div'}>`;
  /* Timeline: oldest first; a title, its time and one sentence, with the full record in a tooltip a keyboard can reach. */
  const timeline = es => `<ul class="timeline">${es.map(e => `<li${tipA(e.tip)}${e.tip ? ' tabindex="0"' : ''}><div class="tl-title">${esc(e.title)}<span class="tl-time">${esc(e.time || '')}</span>${e.tip ? ico('info', { size: 'sm', tone: 'muted' }) : ''}</div>${e.text ? `<div class="tl-text">${e.text}</div>` : ''}</li>`).join('')}</ul>`;
  /* Table: columns {key,label,cls,sort,tip}; rows already rendered as cells. */
  const table = o => `<table class="table${o.dense ? ' is-dense' : ''}"><thead><tr>${o.cols.map(c => `<th class="${c.cls || ''}"${tipA(c.tip)}>${c.sort ? `<button type="button" data-act="sort" data-v="${esc(c.sort)}">${esc(c.label)}${o.sort === c.sort ? ico('arrow_upward', { size: 'sm' }) : o.sort === '-' + c.sort ? ico('arrow_downward', { size: 'sm' }) : ''}</button>` : esc(c.label)}</th>`).join('')}</tr></thead><tbody${attr('id', o.bodyId)}>${o.rows.join('')}</tbody></table>`;
  /* Disclosure: a details element whose open state the app remembers by id. */
  // bare: right under a card, so it draws no rule of its own and adds no space under its summary (the section's gap follows).
  const disclosure = (id, summary, body, open, o = {}) => `<details class="disclosure${o.bare ? ' is-bare' : ''}" data-id="${esc(id)}"${open ? ' open' : ''}><summary>${ico('chevron_right', { cls: 'chev' })}${summary}</summary>${body}</details>`;

  /* Toast: one short confirmation with an optional action (Undo), at the bottom of the screen for 6 seconds. */
  let toastT;
  const toast = (text, action) => { let el = document.getElementById('toast'); if (!el) { el = document.body.appendChild(document.createElement('div')); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status') }
    el.innerHTML = `<span>${esc(text)}</span>${action ? quiet(action) : ''}`; el.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), 6000) };

  /* ---------- behaviours ---------- */
  /* busy: a region holding a focused field (or any control of a form) or a text selection is left alone by the timer, never by the reader. */
  const busy = el => { const a = document.activeElement; if (a && el.contains(a) && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.closest('form'))) return true;
    if (el.querySelector('.dd.is-open, [data-date].is-open')) return true;
    const s = getSelection(); return !!(s && s.rangeCount && !s.isCollapsed && el.contains(s.anchorNode)) };
  /* put: replace a region's HTML only when it changed. force is for the reader's own actions. */
  const put = (el, html, force) => { if (!el || el._h === html || (!force && busy(el))) return false;
    const a = document.activeElement, q = a && a !== el && el.contains(a) ? (a.id ? '#' + CSS.escape(a.id) : a.dataset.act ? `[data-act="${CSS.escape(a.dataset.act)}"]${a.dataset.v != null ? `[data-v="${CSS.escape(a.dataset.v)}"]` : ''}` : a.getAttribute('href') ? `[href="${CSS.escape(a.getAttribute('href'))}"]` : '') : '';
    el.innerHTML = html; el._h = html; if (q) el.querySelector(q)?.focus({ preventScroll: true }); return true };
  /* patch: reconcile a list by data-k, keeping unchanged rows (and the reader's place) in the DOM. */
  /* Rows that arrive or change after the first fill flash once, so the reader sees what is new. */
  const patch = (el, items, force) => {
    if (!el || (!force && busy(el))) return;
    [...el.children].forEach(c => { if (c.dataset.k === undefined) c.remove() });
    const first = !el._filled; el._filled = true;
    const old = new Map([...el.children].map(c => [c.dataset.k, c])); let prev = null;
    const make = (k, html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); const m = t.content.firstElementChild; m.dataset.k = k; m._h = html;
      if (!first) { m.classList.add('is-new'); setTimeout(() => m.classList.remove('is-new'), 1600) } return m };
    for (const { k, html } of items) {
      let n = old.get(k);
      if (n) { old.delete(k); if (n._h !== html) { const m = make(k, html); n.replaceWith(m); n = m } }
      else n = make(k, html);
      const want = prev ? prev.nextElementSibling : el.firstElementChild; if (n !== want) el.insertBefore(n, want); prev = n
    }
    old.forEach(n => n.remove()) };

  /* Tooltips: one floating element, shown on hover (pointer devices), on keyboard focus, and on tap for info buttons. */
  let tipEl, tipFor = null, hideT, shownAt = 0;
  function showTip(t) {
    const text = t.getAttribute('data-tip'); if (!text) return; shownAt = Date.now();
    tipEl = tipEl || Object.assign(document.body.appendChild(document.createElement('div')), { className: 'tooltip', id: 'tooltip', role: 'tooltip' });
    tipEl.textContent = text; tipFor = t; t.setAttribute('aria-describedby', 'tooltip'); tipEl.classList.add('is-on');
    const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), y = r.top - h - 8; if (y < 8) y = r.bottom + 8;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px' }
  function hideTip() { if (tipEl) tipEl.classList.remove('is-on'); if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null }
  function initTooltips() {
    const hover = matchMedia('(hover:hover)').matches;
    document.addEventListener('mouseover', e => { if (!hover) return; const t = e.target.closest('[data-tip]'); if (t && t !== tipFor) { clearTimeout(hideT); showTip(t) } else if (!t && tipFor) hideTip() });
    // Keyboard focus shows a tip; a tap's own focus does not, so the tap below can toggle it without the two fighting.
    document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (!hover && !e.target.matches(':focus-visible')) return; t ? showTip(t) : hideTip() });
    document.addEventListener('focusout', () => { if (hover) hideTip() });
    document.addEventListener('click', e => { if (hover) return; const t = e.target.closest('.info,[data-tip]:not(a):not(button)');
      if (t) { if (tipFor === t && Date.now() - shownAt > 400) hideTip(); else showTip(t); clearTimeout(hideT); hideT = setTimeout(hideTip, Math.max(5000, (t.getAttribute('data-tip') || '').length * 60)) } else hideTip() }, true);
    addEventListener('scroll', () => { if (Date.now() - shownAt > 250) hideTip() }, true); document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip()
      const rb = e.target.closest?.('.ribbon'); if (rb && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const bs = [...rb.querySelectorAll('button')], i = bs.indexOf(e.target), n = bs[Math.max(0, Math.min(bs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))];
        bs.forEach(b => b.tabIndex = -1); n.tabIndex = 0; n.focus(); e.preventDefault() } }) }

  /* ---------- popovers: the dropdown and the date field ----------
     One open at a time, except a dropdown inside an open calendar. A click outside, Escape or Tab out closes them. */
  let popN = 0; const pops = [];  // open popovers, outermost first: { root, btn, panel, kind }
  function closeFrom(i, focus) { while (pops.length > i) { const p = pops.pop(); if (p.kind === 'dd') p.panel.hidden = true; else p.panel.remove();
    p.btn.setAttribute('aria-expanded', 'false'); p.root.classList.remove('is-open'); if (focus && pops.length === i) p.btn.focus() } }
  const closeTo = (root, focus) => { const i = pops.findIndex(p => p.root === root); if (i >= 0) closeFrom(i, focus) };
  function openPop(root, btn, panel, kind) { if (pops.some(p => p.root === root)) return false; const keep = pops.filter(p => p.root.contains(root)).length; closeFrom(keep, false);
    pops.push({ root, btn, panel, kind }); btn.setAttribute('aria-expanded', 'true'); root.classList.add('is-open') }
  function place(root, panel) {  // below its field, or above when there is no room; inside the window and the pane it sits in
    panel.classList.remove('is-up'); panel.style.left = '';
    const sc = root.closest('.pane'), b = sc && sc.getBoundingClientRect(), hd = sc && sc.querySelector('.pane__head')?.getBoundingClientRect();
    const T = Math.max(0, hd ? hd.bottom : b ? b.top : 0) + 8, B = Math.min(innerHeight, b ? b.bottom : innerHeight) - 8;
    const L = Math.max(0, b ? b.left : 0) + 8, R = Math.min(innerWidth, b ? b.left + sc.clientWidth : innerWidth) - 8;
    const r = panel.getBoundingClientRect(), f = root.getBoundingClientRect();
    if (r.bottom > B && f.top - r.height - 6 > T) panel.classList.add('is-up');
    const w = panel.getBoundingClientRect(); if (w.right > R) panel.style.left = Math.max(L - f.left, R - w.right) + 'px';
    if (!panel.classList.contains('is-up') && w.bottom > B) panel.scrollIntoView({ block: 'nearest' }) }

  // Dropdown: a pill button and a listbox menu, in place of a native select. A pick fires 'ddchange' ({ id, value }) on the .dd.
  const dropdown = o => { const id = o.id || 'dd' + (++popN), cur = o.options.find(x => x.v === o.value) || o.options[0];
    return `<div class="dd${o.cls ? ' ' + o.cls : ''}" id="${esc(id)}" data-value="${esc(cur.v)}"><button type="button" class="dd__btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${esc(id)}-menu" aria-label="${esc(o.label)}: ${esc(cur.label)}">${o.prefix ? `<span class="dd__prefix">${esc(o.prefix)}</span>` : ''}<span class="dd__value">${esc(cur.label)}</span>${ico('expand_more', { cls: 'dd__chev' })}</button>`
      + `<ul class="dd__menu" id="${esc(id)}-menu" role="listbox" tabindex="-1" aria-label="${esc(o.label)}" hidden>${o.options.map((x, i) => `<li role="option" id="${esc(id)}-o${i}" data-v="${esc(x.v)}" data-label="${esc(x.label)}" aria-selected="${x.v === cur.v}">${esc(x.label)}${ico('check', { cls: 'dd__check' })}</li>`).join('')}</ul></div>` };
  function ddActive(menu, i) { const os = [...menu.children]; os.forEach((o, j) => o.classList.toggle('is-active', j === i)); menu.setAttribute('aria-activedescendant', os[i].id); os[i].scrollIntoView({ block: 'nearest' }) }
  function ddOpen(dd) { const btn = dd.querySelector('.dd__btn'), menu = dd.querySelector('.dd__menu'); if (openPop(dd, btn, menu, 'dd') === false) return; menu.hidden = false;
    place(dd, menu); ddActive(menu, Math.max(0, [...menu.children].findIndex(o => o.dataset.v === dd.dataset.value))); menu.focus({ preventScroll: true }) }
  function ddPick(dd, v) { const menu = dd.querySelector('.dd__menu'), btn = dd.querySelector('.dd__btn'), o = [...menu.children].find(x => x.dataset.v === v); if (!o) return;
    dd.dataset.value = v; [...menu.children].forEach(x => x.setAttribute('aria-selected', String(x === o)));
    btn.querySelector('.dd__value').textContent = o.dataset.label; btn.setAttribute('aria-label', `${menu.getAttribute('aria-label')}: ${o.dataset.label}`);
    closeTo(dd, true); dd.dispatchEvent(new CustomEvent('ddchange', { bubbles: true, detail: { id: dd.id, value: v } })) }

  // Date field: type a date in any common form, or pick one from a calendar card. A hidden input holds it as YYYY-MM-DD.
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null; const d = new Date(+m[1], m[2] - 1, +m[3]); return d.getMonth() === m[2] - 1 ? d : null };
  const showDate = s => { const d = fromIso(s); return d ? `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` : '' };
  /* '' for an empty field, null for one that is not a date. Day first (Indian order): 3/6/2024 is 3 June. */
  function parseDate(t) {
    t = (t || '').trim(); if (!t) return '';
    const mon = w => MON.findIndex(x => w.toLowerCase().startsWith(x.toLowerCase())) + 1; let m, y, mo, d;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t))) [y, mo, d] = [+m[1], +m[2], +m[3]];
    else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) [d, mo, y] = [+m[1], +m[2], +m[3]];
    else if ((m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/.exec(t))) [d, mo, y] = [+m[1], mon(m[2]), +m[3]];
    else if ((m = /^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(t))) [mo, d, y] = [mon(m[1]), +m[2], +m[3]];
    else return null;
    const dt = new Date(y, mo - 1, d); return mo >= 1 && y >= 1900 && dt.getMonth() === mo - 1 && dt.getDate() === d ? isoDate(dt) : null }
  const dateField = o => `<span class="datef" data-date><input class="field datef__input" type="text" autocomplete="off" placeholder="${esc(o.placeholder || 'e.g. 3 Jun 2024')}" value="${esc(showDate(o.value))}"${attr('id', o.id)}${attr('aria-label', o.label)}>`
    + `<input type="hidden" name="${esc(o.name)}" value="${esc(o.value || '')}"><button type="button" class="icon-btn datef__btn" aria-label="Choose a date" aria-haspopup="dialog" aria-expanded="false">${ico('calendar_month')}</button></span>`;
  function calHTML(view, sel) {
    const y = view.getFullYear(), m = view.getMonth(), today = isoDate(new Date()), lead = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
    let rows = '', week = '<td></td>'.repeat(lead);
    for (let d = 1; d <= n; d++) { const s = isoDate(new Date(y, m, d));
      week += `<td><button type="button" class="cal__day" data-day="${s}" tabindex="-1" aria-label="${d} ${MONTHS[m]} ${y}"${s === sel ? ' aria-pressed="true"' : ''}${s === today ? ' aria-current="date"' : ''}>${d}</button></td>`;
      if ((lead + d) % 7 === 0) { rows += `<tr>${week}</tr>`; week = '' } }
    if (week) rows += `<tr>${week}${'<td></td>'.repeat(7 - (lead + n) % 7)}</tr>`;
    for (let w = Math.ceil((lead + n) / 7); w < 6; w++) rows += `<tr>${'<td></td>'.repeat(7)}</tr>`;
    const years = []; for (let k = Math.max(new Date().getFullYear() + 1, y); k >= Math.min(1990, y); k--) years.push({ v: String(k), label: String(k) });
    return `<div class="cal__head">${iconBtn({ icon: 'chevron_left', label: 'Previous month', act: 'calPrev' })}${dropdown({ label: 'Month', value: String(m), options: MONTHS.map((x, i) => ({ v: String(i), label: x })), cls: 'cal__month' })}`
      + `${dropdown({ label: 'Year', value: String(y), options: years, cls: 'cal__year' })}${iconBtn({ icon: 'chevron_right', label: 'Next month', act: 'calNext' })}</div>`
      + `<table class="cal__grid" role="grid" aria-label="${MONTHS[m]} ${y}"><thead><tr>${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(x => `<th scope="col" abbr="${x}">${x.slice(0, 2)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
      + `<div class="cal__foot">${quiet({ label: 'Today', act: 'calToday' })}${quiet({ label: 'Clear', act: 'calClear' })}</div>` }
  function calDraw(df, focus) { const panel = df.querySelector('.cal'); panel.innerHTML = calHTML(df._view, df.querySelector('input[type=hidden]').value);
    const f = panel.querySelector(`[data-day="${df._focus}"]`) || panel.querySelector('.cal__day'); f.tabIndex = 0; if (focus === 'day') f.focus();
    else if (focus) panel.querySelector(focus + ' .dd__btn')?.focus() }
  function calOpen(df) { if (df.classList.contains('is-open')) return df.querySelector('.cal__day[tabindex="0"]')?.focus();
    const btn = df.querySelector('.datef__btn'), sel = df.querySelector('input[type=hidden]').value, base = fromIso(sel) || new Date();
    const panel = Object.assign(document.createElement('div'), { className: 'cal', tabIndex: -1 }); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Choose a date');
    openPop(df, btn, panel, 'cal'); df.appendChild(panel); df._view = new Date(base.getFullYear(), base.getMonth(), 1); df._focus = isoDate(base);
    calDraw(df); place(df, panel); panel.querySelector('.cal__day[tabindex="0"]').focus({ preventScroll: true }) }
  function calGo(df, d, focus) { df._focus = isoDate(d); df._view = new Date(d.getFullYear(), d.getMonth(), 1); calDraw(df, focus) }
  const calShift = (d, months) => { const t = new Date(d.getFullYear(), d.getMonth() + months, 1); return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())) };
  function calCommit(df, s, keepText) { const txt = df.querySelector('.datef__input'), hid = df.querySelector('input[type=hidden]');
    if (!keepText) txt.value = showDate(s); txt.removeAttribute('aria-invalid'); if (hid.value !== s) { hid.value = s; hid.dispatchEvent(new Event('input', { bubbles: true })) } }
  function calSet(df, s) { calCommit(df, s); closeTo(df, true) }
  const say = t => { const lv = document.getElementById('live'); if (lv) lv.textContent = t };

  function initPopovers() {
    document.addEventListener('click', e => {
      const t = e.target, ddb = t.closest('.dd__btn'), opt = t.closest('.dd__menu [role=option]'), cb = t.closest('.datef__btn'), cal = t.closest('.cal');
      if (ddb) { const dd = ddb.closest('.dd'); return dd.classList.contains('is-open') ? closeTo(dd, true) : ddOpen(dd) }
      if (opt) return ddPick(opt.closest('.dd'), opt.dataset.v);
      if (cb) { const df = cb.closest('[data-date]'); return df.classList.contains('is-open') ? closeTo(df, true) : calOpen(df) }
      if (cal) { const df = cal.closest('[data-date]'), day = t.closest('[data-day]'), a = t.closest('[data-act]'), f = fromIso(df._focus) || new Date();
        const i = pops.findIndex(p => !p.root.contains(t)); if (i >= 0) closeFrom(i, false);
        if (day) return calSet(df, day.dataset.day);
        if (a && /calPrev|calNext/.test(a.dataset.act)) { calGo(df, calShift(f, a.dataset.act === 'calPrev' ? -1 : 1), null); df.querySelector(`.cal [data-act="${a.dataset.act}"]`)?.focus(); return say(`${MONTHS[df._view.getMonth()]} ${df._view.getFullYear()}`) }
        if (a) ({ calToday: () => calSet(df, isoDate(new Date())), calClear: () => calSet(df, '') })[a.dataset.act]?.();
        return }
      const i = pops.findIndex(p => !p.root.contains(t)); if (i >= 0) closeFrom(i, false) });
    document.addEventListener('ddchange', e => { const df = e.target.closest('.cal') && e.target.closest('[data-date]'); if (!df) return;
      const f = fromIso(df._focus) || new Date(), month = e.target.classList.contains('cal__month');
      const y = month ? f.getFullYear() : +e.detail.value, m = month ? +e.detail.value : f.getMonth();
      calGo(df, new Date(y, m, Math.min(f.getDate(), new Date(y, m + 1, 0).getDate())), month ? '.cal__month' : '.cal__year') });
    document.addEventListener('keydown', e => {
      const t = e.target, menu = t.closest?.('.dd__menu'), day = t.closest?.('.cal__day');
      if (menu) { const os = [...menu.children], cur = os.findIndex(o => o.classList.contains('is-active')), dd = menu.closest('.dd'); let i = null;
        if (e.key === 'ArrowDown') i = Math.min(cur + 1, os.length - 1); else if (e.key === 'ArrowUp') i = Math.max(cur - 1, 0);
        else if (e.key === 'Home') i = 0; else if (e.key === 'End') i = os.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return ddPick(dd, os[cur].dataset.v) }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return closeTo(dd, true) }
        else if (e.key === 'Tab') return closeTo(dd, false);
        else if (e.key.length === 1 && /\S/.test(e.key)) { const k = e.key.toLowerCase(), at = j => os[j].dataset.label.toLowerCase().startsWith(k);
          i = os.findIndex((o, j) => j > cur && at(j)); if (i < 0) i = os.findIndex((o, j) => at(j)); if (i < 0) i = cur }
        if (i !== null) { e.preventDefault(); ddActive(menu, i) } return }
      if (t.closest?.('.dd__btn') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); return ddOpen(t.closest('.dd')) }
      if (day) { const df = day.closest('[data-date]'), d = fromIso(day.dataset.day), wd = (d.getDay() + 6) % 7, add = k => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
        const to = { ArrowLeft: () => add(-1), ArrowRight: () => add(1), ArrowUp: () => add(-7), ArrowDown: () => add(7), Home: () => add(-wd), End: () => add(6 - wd),
          PageUp: () => calShift(d, e.shiftKey ? -12 : -1), PageDown: () => calShift(d, e.shiftKey ? 12 : 1) }[e.key];
        if (to) { e.preventDefault(); return calGo(df, to(), 'day') } }
      const odf = t.closest?.('[data-date]'); if (e.key === 'Escape' && odf?.classList.contains('is-open')) { e.preventDefault(); e.stopPropagation(); return closeTo(odf, !t.matches('.datef__input')) }
      if (t.closest?.('.datef__input') && e.altKey && e.key === 'ArrowDown') { e.preventDefault(); if (!odf.classList.contains('is-open')) t.blur(); calOpen(odf) } }, true);
    document.addEventListener('mousemove', e => { const o = e.target.closest?.('.dd__menu [role=option]'); if (o && !o.classList.contains('is-active')) ddActive(o.parentElement, [...o.parentElement.children].indexOf(o)) });
    document.addEventListener('focusout', e => { const to = e.relatedTarget; if (!to) return; const i = pops.findIndex(p => !p.root.contains(to)); if (i >= 0) closeFrom(i, false) });
    document.addEventListener('input', e => { const ti = e.target.closest?.('.datef__input'); if (!ti) return; const v = parseDate(ti.value); if (v !== null) calCommit(ti.closest('[data-date]'), v, true) }, true);
    document.addEventListener('change', e => { const ti = e.target.closest?.('.datef__input'); if (!ti) return; const v = parseDate(ti.value), df = ti.closest('[data-date]');
      if (v === null) return ti.setAttribute('aria-invalid', 'true'); calCommit(df, v); if (v && df.classList.contains('is-open')) calGo(df, fromIso(v), null) }, true);
    addEventListener('resize', () => pops.forEach(p => place(p.root, p.panel))) }  // a phone keyboard resizes the window: keep them open

  // A small form: labelled fields in a row that wraps, then a primary submit and a quiet Cancel. The app reads values on submit.
  const form = o => `<form class="form" data-form="${esc(o.id)}" aria-label="${esc(o.title)}"><p class="form__title">${esc(o.title)}</p><div class="form__fields">${o.fields.map(f => f.type === 'date'
    ? `<div class="form__field"><label class="form__label" for="${esc(o.id)}-${esc(f.name)}">${esc(f.label)}${f.optional ? ' <span class="form__opt">optional</span>' : ''}</label>${dateField({ id: o.id + '-' + f.name, name: f.name, value: f.value })}</div>`
    : `<label class="form__field"><span class="form__label">${esc(f.label)}${f.optional ? ' <span class="form__opt">optional</span>' : ''}</span><input class="field" name="${esc(f.name)}" type="${esc(f.type || 'text')}"${attr('placeholder', f.placeholder)}${attr('value', f.value)}${attr('maxlength', f.max)} autocomplete="off"></label>`).join('')}</div>
    <div class="form__actions"><button type="submit" class="btn">${o.icon ? ico(o.icon) : ''}${esc(o.submit)}</button>${quiet({ label: 'Cancel', act: o.cancel })}</div></form>`;

  return { esc, ico, info, link, badge, tag, chip, chips, btn, quiet, iconBtn, meter, stat, item, sectionHead, groupHead, blockHead, barRow, gauge, flag, kv, form, dropdown, dateField, parseDate, empty, skeleton,
    steps, rail, ribbon, run, timeline, table, disclosure, toast, busy, put, patch, initTooltips, initPopovers, setHref: f => { href = f } };
})();
