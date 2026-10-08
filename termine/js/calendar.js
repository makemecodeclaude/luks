/* LUKS Terminradar – calendar views (day, work week, week, month, resources) and mini calendar */
(function () {
  'use strict';
  const R = window.R;
  const { $, $$, esc, icon, tm } = R;
  const H0 = 7 * 60, H1 = 19 * 60;
  const hourPx = () => (R.ui.density === 'compact' ? 42 : 56);
  const SNAP = 5;

  R.visibleRes = () => {
    const ids = R.ui.visible || R.role().visible;
    return R.RESOURCES.filter((r) => ids.includes(r.id));
  };

  function passesFilter(a) {
    if (R.ui.filterStatus.length && R.isPatient(a) && !R.ui.filterStatus.includes(a.st)) return false;
    if (R.ui.filterUrg.length && R.isPatient(a) && !R.ui.filterUrg.includes(a.urg)) return false;
    return true;
  }

  /* ---------------------------------------------------------------- range + labels */
  R.calRange = function () {
    const d = R.ui.date, v = R.ui.view;
    if (v === 'day' || v === 'resources') return [d];
    if (v === 'workweek' || v === 'week') {
      const mon = R.startOfWeek(d);
      return Array.from({ length: v === 'week' ? 7 : 5 }, (_, i) => R.addDays(mon, i));
    }
    return [d];
  };
  R.calLabel = function () {
    const v = R.ui.view, d = R.pd(R.ui.date);
    if (v === 'month') return `${R.MON[d.getMonth()]} ${d.getFullYear()}`;
    if (v === 'day') return R.flong(R.ui.date);
    if (v === 'resources') return `${R.flong(R.ui.date)} · nach Ressource`;
    const r = R.calRange(), a = R.pd(r[0]), b = R.pd(r[r.length - 1]);
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}.–${b.getDate()}. ${R.MON[a.getMonth()]} ${a.getFullYear()}`;
    return `${a.getDate()}. ${R.MON[a.getMonth()]} – ${b.getDate()}. ${R.MON[b.getMonth()]} ${b.getFullYear()}`;
  };
  R.calStep = function (dir) {
    const v = R.ui.view;
    if (v === 'month') { const d = R.pd(R.ui.date); d.setDate(1); d.setMonth(d.getMonth() + dir); R.ui.date = R.dk(d); return; }
    if (v === 'workweek' || v === 'week') { R.ui.date = R.addDays(R.ui.date, 7 * dir); return; }
    let d = R.addDays(R.ui.date, dir);
    if (!R.ui.showWeekend) while (!R.isWeekday(d)) d = R.addDays(d, dir);
    R.ui.date = d;
  };

  /* ---------------------------------------------------------------- event layout */
  function lanes(evts) {
    const sorted = evts.slice().sort((a, b) => a.s - b.s || b.d - a.d);
    let cluster = [], end = -1;
    const flush = () => { const ends = []; for (const e of cluster) { let i = ends.findIndex((x) => x <= e.s); if (i < 0) { i = ends.length; ends.push(0); } ends[i] = e.s + e.d; e._lane = i; } for (const e of cluster) e._n = ends.length; cluster = []; };
    for (const e of sorted) { if (e.s >= end && cluster.length) flush(); cluster.push(e); end = Math.max(end, e.s + e.d); }
    if (cluster.length) flush();
    return sorted;
  }

  /* several calendars in one day column: one sub-column per calendar (Outlook split view) */
  function splitByRes(evts) {
    const order = R.visibleRes().map((r) => r.id);
    const k = Math.max(1, order.length);
    const out = [];
    order.forEach((id, i) => {
      for (const e of lanes(evts.filter((a) => a.res === id))) { e._lane = i * e._n + e._lane; e._n = e._n * k; out.push(e); }
    });
    return out;
  }

  function evClasses(a) {
    const c = ['ev', 'st-' + a.st, 'k-' + a.kind];
    if (a.kind === 'reserve' && R.reserveReleased(a)) c.push('released');
    if (!R.seesPatient(a) && R.isPatient(a)) c.push('masked');
    return c.join(' ');
  }

  function evHtml(a, colIdx, delay) {
    const res = R.res(a.res);
    const px = hourPx() / 60;
    const top = (Math.max(a.s, H0) - H0) * px;
    const h = Math.max(10, (Math.min(a.s + a.d, H1) - Math.max(a.s, H0)) * px - 2);
    const left = (a._lane / a._n) * 100, width = 100 / a._n;
    const st = R.STATUS[a.st];
    const badges = [];
    if (R.isPatient(a)) {
      if (a.urg === 'u48') badges.push(`<span class="b-urg" title="${R.URGENCY.u48.label}">${icon('lightning')}</span>`);
      if (a.conf === 'gesendet' && R.until(a.day, a.s) > 0 && R.until(a.day, a.s) < 48 * 60) badges.push(`<span class="b-q" title="Erinnerung nicht bestätigt">?</span>`);
      if (R.docTone(a) && R.docTone(a) !== 'ok' && R.until(a.day, a.s) > 0) badges.push(`<span class="b-doc" title="Unterlagen unvollständig">${icon('doc')}</span>`);
      if (a.st !== 'geplant') badges.push(`<span class="b-st tone-${st.tone}" title="${st.label}">${icon(st.icon)}</span>`);
    }
    const proj = delay && delay.proj[a.id];
    const late = proj && proj - a.s >= 5 ? `<span class="ev-late">≈ ${tm(proj)}</span>` : '';
    const sub = a.kind === 'pat' ? `${esc(R.type(a.type).name)}${R.ui.view !== 'resources' && R.visibleRes().length > 1 ? ' · ' + esc(res.short) : ''}` : a.kind === 'reserve' ? (R.reserveReleased(a) ? 'freigegeben (< 24 h)' : 'für Dringliche') : esc(res.short);
    const small = h < 30;
    return `<div class="${evClasses(a)}${small ? ' small' : ''}${h < 15 ? ' tiny' : ''}" data-id="${a.id}" data-col="${colIdx}" tabindex="0" role="button"
      style="--c:${res.color};top:${top}px;height:${h}px;left:calc(${left}% + 1px);width:calc(${width}% - 3px)"
      aria-label="${esc(tm(a.s) + ' ' + R.patLabel(a) + ', ' + (a.kind === 'pat' ? R.type(a.type).name + ', ' + st.label : ''))}">
      <div class="ev-t"><b>${tm(a.s)}</b> ${esc(R.patLabel(a))}</div>
      ${small ? '' : `<div class="ev-s">${sub}</div>`}
      ${late}
      <span class="ev-badges">${badges.join('')}</span>
      ${R.can('edit') && a.st !== 'fertig' && !a.allDay ? '<i class="ev-rz" aria-hidden="true"></i>' : ''}
    </div>`;
  }

  /* ---------------------------------------------------------------- time grid */
  function columns() {
    if (R.ui.view === 'resources') return R.visibleRes().map((r) => ({ day: R.ui.date, res: r }));
    return R.calRange().filter((d) => R.ui.view !== 'day' || true).map((d) => ({ day: d, res: null }));
  }

  function colEvents(col, vis) {
    return R.day(col.day).filter((a) => (col.res ? a.res === col.res.id : vis.has(a.res)) && passesFilter(a));
  }

  function workBands(col) {
    const resList = col.res ? [col.res] : R.visibleRes();
    let bands = [];
    for (const r of resList) bands.push(...(r.hours[R.dow(col.day)] || []));
    bands.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const b of bands) { const l = merged[merged.length - 1]; if (l && b[0] <= l[1]) l[1] = Math.max(l[1], b[1]); else merged.push(b.slice()); }
    const px = hourPx() / 60;
    return merged.map(([a, b]) => `<div class="work" style="top:${(Math.max(a, H0) - H0) * px}px;height:${(Math.min(b, H1) - Math.max(a, H0)) * px}px"></div>`).join('');
  }

  function headHtml(col) {
    const n = R.now();
    if (col.res) {
      const r = col.res;
      const isToday = col.day === n.day;
      const di = isToday ? R.delayInfo(r.id) : null;
      const tone = di ? R.delayTone(di.delay, r.threshold) : 'ok';
      const chip = di && R.isPatient ? `<span class="chip tone-${tone}" title="Verzug, Schwelle ${r.threshold} Min.">${icon(tone === 'ok' ? 'check' : 'clock')}${di.delay >= 5 ? '+' + di.delay + ' Min.' : 'im Plan'}</span>` : '';
      return `<div class="ch res" style="--c:${r.color}"><span class="ch-sw"></span><div class="ch-txt"><b>${esc(r.short)}</b><small>${esc(R.dept(r.dept).name)} · ${esc(R.site(r.site).name)}</small></div>${chip}</div>`;
    }
    const d = R.pd(col.day);
    return `<button class="ch day${col.day === n.day ? ' today' : ''}" data-goto="${col.day}"><span class="ch-num">${d.getDate()}</span><span class="ch-wd">${R.WD[d.getDay()]}</span></button>`;
  }

  R.renderTimeGrid = function (host) {
    const cols = columns();
    const vis = new Set(R.visibleRes().map((r) => r.id));
    const n = R.now();
    const px = hourPx() / 60;
    const delays = {};
    if (cols.some((c) => c.day === n.day)) for (const r of R.visibleRes()) delays[r.id] = R.delayInfo(r.id);

    const tmpl = `56px repeat(${cols.length}, minmax(${R.ui.view === 'resources' ? 150 : 110}px, 1fr))`;
    let allday = '', grid = '';
    cols.forEach((col, i) => {
      const evs = colEvents(col, vis);
      const ad = evs.filter((a) => a.allDay);
      allday += `<div class="ad-cell">${ad.map((a) => `<div class="ad-ev" style="--c:${R.res(a.res).color}" data-id="${a.id}" tabindex="0" role="button">${esc(a.title)}</div>`).join('')}</div>`;
      const timed = col.res ? lanes(evs.filter((a) => !a.allDay)) : splitByRes(evs.filter((a) => !a.allDay));
      const dl = col.res ? delays[col.res.id] : null;
      let nowLine = '';
      if (col.day === n.day && n.min >= H0 && n.min <= H1) nowLine = `<div class="now-line" style="top:${(n.min - H0) * px}px"><i></i></div>`;
      grid += `<div class="col${col.day === n.day ? ' is-today' : ''}${R.isWeekday(col.day) ? '' : ' weekend'}" data-col="${i}" data-day="${col.day}" ${col.res ? `data-res="${col.res.id}"` : ''}>
        ${workBands(col)}${timed.map((a) => evHtml(a, i, dl || (col.day === n.day ? delays[a.res] : null))).join('')}${nowLine}</div>`;
    });
    let gutter = '';
    for (let m = H0; m < H1; m += 60) gutter += `<div class="hr" style="height:${hourPx()}px"><span>${m / 60}</span></div>`;

    host.innerHTML = `
      <div class="tg" style="--hour:${hourPx()}px">
        <div class="tg-head" style="grid-template-columns:${tmpl}"><div class="tg-corner">${R.ui.view === 'resources' ? '' : 'KW ' + R.isoWeek(cols[0].day)}</div>${cols.map(headHtml).join('')}</div>
        <div class="tg-allday" style="grid-template-columns:${tmpl}"><div class="tg-corner sm">ganztags</div>${allday}</div>
        <div class="tg-scroll" id="tg-scroll">
          <div class="tg-grid" style="grid-template-columns:${tmpl};height:${(H1 - H0) * px}px">
            <div class="gutter">${gutter}</div>${grid}
          </div>
        </div>
      </div>`;
    const sc = $('#tg-scroll', host);
    if (R.calScroll === undefined) R.calScroll = Math.max(0, (Math.min(Math.max(n.min, 8 * 60), 16 * 60) - H0 - 70) * px);
    sc.scrollTop = R.calScroll;
    sc.addEventListener('scroll', () => { R.calScroll = sc.scrollTop; }, { passive: true });
    /* keep the header columns aligned with the scrolling body (scrollbar width, horizontal scroll) */
    const sbw = sc.offsetWidth - sc.clientWidth;
    $$('.tg-head, .tg-allday', host).forEach((el) => { el.style.paddingRight = sbw + 'px'; });
    sc.addEventListener('scroll', () => { $$('.tg-head, .tg-allday', host).forEach((el) => { el.scrollLeft = sc.scrollLeft; }); }, { passive: true });
    bindGrid(host, cols);
  };

  /* ---------------------------------------------------------------- pointer interaction: move, resize, create */
  function bindGrid(host, cols) {
    const grid = $('.tg-grid', host);
    const px = hourPx() / 60;
    const colEls = $$('.col', grid);
    const minAt = (col, y) => { const r = col.getBoundingClientRect(); return Math.round(((y - r.top) / px + H0) / SNAP) * SNAP; };
    const colAt = (x) => colEls.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x < r.right; });

    $$('[data-goto]', host).forEach((b) => b.addEventListener('click', () => { R.ui.date = b.dataset.goto; R.ui.view = 'day'; R.render(); }));
    $$('.ad-ev', host).forEach((el) => el.addEventListener('click', () => R.openAppt(el.dataset.id)));

    grid.addEventListener('keydown', (e) => {
      const ev = e.target.closest('.ev');
      if (ev && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); R.openAppt(ev.dataset.id); }
    });

    grid.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const evEl = e.target.closest('.ev');
      const colEl = e.target.closest('.col');
      if (!colEl) return;
      if (evEl) startEventDrag(e, evEl, e.target.classList.contains('ev-rz'));
      else startCreate(e, colEl);
    });

    function editable(a) {
      if (!R.can('edit') || a.allDay) return false;
      if (!R.inScope(R.res(a.res))) return false;
      return ['geplant', 'angekommen'].includes(a.st) || a.kind !== 'pat';
    }

    function startEventDrag(e, el, resize) {
      const a = R.appt(el.dataset.id);
      const sx = e.clientX, sy = e.clientY;
      let moved = false, target = null;
      const canDrag = editable(a);
      const startCol = colEl(el);
      const offsetMin = minAt(startCol, sy) - a.s;
      el.setPointerCapture(e.pointerId);
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        if (!canDrag) return;
        if (!moved) { moved = true; el.classList.add('dragging'); document.body.classList.add('is-dragging'); }
        if (resize) {
          const end = Math.max(a.s + 10, Math.min(H1, minAt(startCol, ev.clientY)));
          el.style.height = (end - a.s) * px - 2 + 'px';
          target = { col: startCol, s: a.s, d: end - a.s };
          tip(el, `${tm(a.s)}–${tm(end)}`);
        } else {
          const c = colAt(ev.clientX) || startCol;
          let s = Math.max(H0, Math.min(H1 - a.d, minAt(c, ev.clientY) - offsetMin));
          s = Math.round(s / SNAP) * SNAP;
          if (c !== el.parentElement) c.appendChild(el);
          el.style.top = (s - H0) * px + 'px';
          el.style.left = '1px'; el.style.width = 'calc(100% - 3px)';
          target = { col: c, s, d: a.d };
          tip(el, `${tm(s)}–${tm(s + a.d)}`);
        }
      };
      const up = () => {
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        document.body.classList.remove('is-dragging');
        if (!moved) { R.openAppt(a.id); return; }
        const day = target.col.dataset.day, res = target.col.dataset.res || a.res;
        R.moveAppt(a, { day, s: target.s, d: target.d, res });
      };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    }

    function startCreate(e, col) {
      if (!R.can('book')) return;
      const s0 = Math.min(H1 - 10, Math.max(H0, Math.floor(minAt(col, e.clientY) / 15) * 15));
      const sel = R.h(`<div class="sel" style="top:${(s0 - H0) * px}px;height:${15 * px}px"><span>${tm(s0)}</span></div>`);
      col.appendChild(sel);
      let s1 = s0 + 15;
      col.setPointerCapture(e.pointerId);
      const move = (ev) => {
        s1 = Math.max(s0 + 10, Math.min(H1, Math.ceil(minAt(col, ev.clientY) / 5) * 5));
        sel.style.height = (s1 - s0) * px + 'px';
        sel.firstChild.textContent = `${tm(s0)}–${tm(s1)}`;
      };
      const up = () => {
        col.removeEventListener('pointermove', move); col.removeEventListener('pointerup', up); col.removeEventListener('pointercancel', up);
        sel.remove();
        const day = col.dataset.day;
        const res = col.dataset.res || (R.visibleRes().find((r) => R.inScope(r) && (r.hours[R.dow(day)] || []).some(([a, b]) => s0 >= a && s0 < b)) || R.visibleRes()[0] || R.RESOURCES[0]).id;
        R.openEditor({ day, s: s0, d: s1 - s0 > 15 ? s1 - s0 : null, res });
      };
      col.addEventListener('pointermove', move); col.addEventListener('pointerup', up); col.addEventListener('pointercancel', up);
    }

    function colEl(el) { return el.closest('.col'); }
    function tip(el, txt) { let t = el.querySelector('.drag-tip'); if (!t) { t = document.createElement('span'); t.className = 'drag-tip'; el.appendChild(t); } t.textContent = txt; }
  }

  /* move/resize with conflict check and write-back */
  R.conflicts = function (res, day, s, d, ignoreId) {
    return R.day(day).filter((b) => b.id !== ignoreId && b.res === res && b.st !== 'abgesagt' && (b.allDay || (b.s < s + d && b.s + b.d > s)));
  };
  R.moveAppt = function (a, to) {
    const clash = R.conflicts(to.res, to.day, to.s, to.d, a.id).filter((b) => b.kind !== 'reserve');
    if (clash.length) {
      R.toast(`Nicht verschoben: Konflikt mit ${clash[0].kind === 'pat' ? clash[0].no : clash[0].title} um ${tm(clash[0].s)}.`, { tone: 'bad' });
      R.render();
      return;
    }
    const res = R.res(to.res);
    if (a.type && !res.types.includes(a.type)) {
      R.toast(`${res.short} bietet «${R.type(a.type).name}» nicht an.`, { tone: 'bad' });
      R.render();
      return;
    }
    const before = { day: a.day, s: a.s, d: a.d, res: a.res };
    const inHours = (res.hours[R.dow(to.day)] || []).some(([x, y]) => to.s >= x && to.s + to.d <= y);
    R.mutate(() => { Object.assign(a, to); if (a.conf) a.conf = null; }, { action: before.d !== to.d && before.s === to.s ? 'Dauer geändert' : 'Termin verschoben', target: `${a.no} → ${R.fdate(to.day)} ${tm(to.s)}` });
    R.toast(`${a.kind === 'pat' ? a.no : a.title}: ${R.fdate(to.day, { wd: true })} ${tm(to.s)}–${tm(to.s + to.d)} · in LUKiS übernommen${inHours ? '' : ' · ausserhalb der Sprechstundenzeit'}`, {
      tone: inHours ? 'ok' : 'warn',
      action: { label: 'Rückgängig', fn: () => R.mutate(() => Object.assign(a, before), { action: 'Verschiebung rückgängig', target: a.no }) },
    });
    R.render();
  };

  /* ---------------------------------------------------------------- month */
  R.renderMonth = function (host) {
    const d = R.pd(R.ui.date);
    const first = R.dk(new Date(d.getFullYear(), d.getMonth(), 1));
    const start = R.startOfWeek(first);
    const vis = new Set(R.visibleRes().map((r) => r.id));
    const n = R.now();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const day = R.addDays(start, i);
      const inMonth = R.pd(day).getMonth() === d.getMonth();
      const evs = R.day(day).filter((a) => vis.has(a.res) && passesFilter(a) && a.st !== 'abgesagt');
      const pats = evs.filter(R.isPatient);
      const show = evs.filter((a) => a.allDay).concat(pats.slice(0, 3));
      cells += `<div class="mc${inMonth ? '' : ' out'}${day === n.day ? ' today' : ''}${R.isWeekday(day) ? '' : ' weekend'}" data-day="${day}">
        <button class="mc-num" data-goto="${day}" aria-label="${R.flong(day)}">${R.pd(day).getDate()}</button>
        ${show.map((a) => `<div class="mc-ev${a.allDay ? ' all' : ''}" style="--c:${R.res(a.res).color}" data-id="${a.id}" tabindex="0" role="button">${a.allDay ? '' : `<b>${tm(a.s)}</b> `}${esc(R.patLabel(a))}</div>`).join('')}
        ${pats.length > 3 ? `<button class="mc-more" data-goto="${day}">+${pats.length - 3} weitere</button>` : ''}
      </div>`;
    }
    host.innerHTML = `<div class="month"><div class="mh">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((x) => `<div>${x}</div>`).join('')}</div><div class="mg">${cells}</div></div>`;
    $$('[data-goto]', host).forEach((b) => b.addEventListener('click', () => { R.ui.date = b.dataset.goto; R.ui.view = 'day'; R.render(); }));
    $$('.mc-ev', host).forEach((el) => el.addEventListener('click', () => R.openAppt(el.dataset.id)));
    $$('.mc', host).forEach((c) => c.addEventListener('dblclick', (e) => { if (e.target === c && R.can('book')) R.openEditor({ day: c.dataset.day, s: 540 }); }));
  };

  /* ---------------------------------------------------------------- mini calendar */
  R.miniMonth = null;
  R.renderMini = function (host) {
    const sel = R.ui.date;
    if (!R.miniMonth) R.miniMonth = sel.slice(0, 7);
    const [y, m] = R.miniMonth.split('-').map(Number);
    const first = R.dk(new Date(y, m - 1, 1));
    const start = R.startOfWeek(first);
    const range = new Set(R.ui.view === 'month' ? [] : R.calRange());
    const n = R.now();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const day = R.addDays(start, i);
      const dd = R.pd(day);
      const cls = ['mm-d'];
      if (dd.getMonth() !== m - 1) cls.push('out');
      if (range.has(day)) cls.push('in');
      if (day === sel) cls.push('pick');
      if (day === n.day) cls.push('today');
      if (i % 7 === 0) cls.push('first');
      if (i % 7 === 6 || (R.ui.view === 'workweek' && i % 7 === 4)) cls.push('last');
      cells += `<button class="${cls.join(' ')}" data-d="${day}" aria-label="${R.flong(day)}">${dd.getDate()}</button>`;
    }
    host.innerHTML = `<div class="mm-head"><button class="icon-btn sm" data-mm="-1" aria-label="Vorheriger Monat">${icon('up')}</button><b>${R.MON[m - 1]} ${y}</b><button class="icon-btn sm" data-mm="1" aria-label="Nächster Monat">${icon('down')}</button></div>
      <div class="mm-grid">${['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((x) => `<span class="mm-wd">${x}</span>`).join('')}${cells}</div>`;
    $$('[data-mm]', host).forEach((b) => b.addEventListener('click', () => { const d = new Date(y, m - 1 + +b.dataset.mm, 1); R.miniMonth = R.dk(d).slice(0, 7); R.renderMini(host); }));
    $$('.mm-d', host).forEach((b) => b.addEventListener('click', () => { R.ui.date = b.dataset.d; R.miniMonth = null; if (R.ui.page !== 'kalender' && R.ui.page !== 'tag') R.go('kalender'); else R.render(); }));
  };
})();
