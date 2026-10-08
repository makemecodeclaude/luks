/* LUKS Terminradar – pages: calendar, day overview, free slots, waiting list, tasks, KPIs, wall screen, audit log */
(function () {
  'use strict';
  const R = window.R;
  const { $, $$, esc, icon, tm } = R;
  R.pages = {};

  const pageHead = (eyebrow, title, right = '', lead = '') => `<header class="page-h"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div><div class="page-h-r">${right}</div></header>`;
  const dayNav = (k) => `<div class="daynav"><button class="btn btn-ghost sm" data-dn="today">${icon('arrowR')}Heute</button><button class="icon-btn" data-dn="-1" aria-label="Vorheriger Tag">${icon('left')}</button><button class="icon-btn" data-dn="1" aria-label="Nächster Tag">${icon('right')}</button></div>`;
  function bindDayNav(host) {
    $$('[data-dn]', host).forEach((b) => (b.onclick = () => {
      if (b.dataset.dn === 'today') R.ui.date = R.now().day;
      else { let d = R.addDays(R.ui.date, +b.dataset.dn); while (!R.isWeekday(d)) d = R.addDays(d, +b.dataset.dn); R.ui.date = d; }
      R.render();
    }));
  }
  const pubNo = (a) => `${R.dept(R.res(a.res).dept).prefix}-${a.no.slice(-3)}`;
  R.pubNo = pubNo;

  /* ================================================================ calendar */
  R.pages.kalender = function (main) {
    const n = R.now();
    const vis = R.visibleRes().filter((r) => r.kind === 'arzt' || r.kind === 'raum' || r.kind === 'geraet');
    let worst = null;
    for (const r of vis) { const d = R.delayInfo(r.id).delay; if (!worst || d > worst.d) worst = { r, d }; }
    const tone = worst ? R.delayTone(worst.d, worst.r.threshold) : 'ok';
    const pill = worst && worst.d >= 5 ? `${icon('clock')}Verzug +${worst.d} Min. · ${esc(worst.r.short)}` : `${icon('check')}Sprechstunden im Plan`;
    main.innerHTML = `<div class="cal-page">
      <div class="cal-bar">
        <button class="btn btn-outline" id="cb-today">${icon('arrowR')}Heute</button>
        <button class="icon-btn" id="cb-prev" aria-label="Zurück">${icon('left')}</button>
        <button class="icon-btn" id="cb-next" aria-label="Weiter">${icon('right')}</button>
        <label class="cal-label"><span>${esc(R.calLabel())}</span>${icon('down')}<input type="date" id="cb-date" value="${R.ui.date}" aria-label="Datum wählen"></label>
        <div class="cal-bar-r">
          ${R.ui.filterStatus.length || R.ui.filterUrg.length ? `<button class="chip tone-info" id="cb-unfilter">${icon('filter')}Filter aktiv · zurücksetzen</button>` : ''}
          <button class="pill-status tone-${tone}" id="cb-delay" title="Zur Tagesübersicht">${pill}</button>
        </div>
      </div>
      <div class="cal-host" id="cal-host"></div>
    </div>`;
    const host = $('#cal-host', main);
    if (R.ui.view === 'month') R.renderMonth(host); else R.renderTimeGrid(host);
    $('#cb-today', main).onclick = () => { R.ui.date = n.day; R.calScroll = undefined; R.render(); };
    $('#cb-prev', main).onclick = () => { R.calStep(-1); R.render(); };
    $('#cb-next', main).onclick = () => { R.calStep(1); R.render(); };
    $('#cb-date', main).onchange = (e) => { if (e.target.value) { R.ui.date = e.target.value; R.render(); } };
    $('#cb-delay', main).onclick = () => R.go('tag');
    const uf = $('#cb-unfilter', main); if (uf) uf.onclick = () => { R.ui.filterStatus = []; R.ui.filterUrg = []; R.render(); };
  };

  /* ================================================================ module 1: day overview (A01, A02, A06) */
  R.pages.tag = function (main) {
    const n = R.now();
    const day = R.ui.date;
    const isToday = day === n.day;
    const role = R.role();
    const scoped = R.RESOURCES.filter((r) => R.inScope(r));
    if (!R.ui.dayRes || !R.ui.dayRes.every((id) => scoped.some((r) => r.id === id))) R.ui.dayRes = role.own ? [role.own] : scoped.filter((r) => role.visible.includes(r.id)).map((r) => r.id);
    const sel = new Set(R.ui.dayRes);
    const list = R.day(day).filter((a) => R.isPatient(a) && sel.has(a.res));
    const delays = {};
    if (isToday) for (const id of sel) delays[id] = R.delayInfo(id);
    const count = (st) => list.filter((a) => a.st === st).length;

    const delayCards = isToday ? [...sel].map((id) => {
      const r = R.res(id), di = delays[id];
      if (!R.day(day).some((a) => a.res === id && R.isPatient(a))) return '';
      const tone = R.delayTone(di.delay, r.threshold);
      return `<article class="dcard tone-${tone}" style="--c:${r.color}">
        <header><span class="sw"></span><b>${esc(r.short)}</b><span class="amp tone-${tone}" aria-hidden="true"></span><span class="dcard-v">${di.delay >= 5 ? '+' + di.delay + ' Min.' : 'im Plan'}</span></header>
        <p>${di.current ? `${icon('stetho', 'i-inline')} In Behandlung seit ${tm(di.current.ts)} · ${esc(R.patLabel(di.current))}` : `${icon('clock', 'i-inline')} Niemand in Behandlung`}</p>
        <p>${icon('hourglass', 'i-inline')} ${di.waiting} wartend${di.next ? ` · nächste ${tm(di.next.s)} → ≈ ${tm(di.proj[di.next.id])}` : ''}</p>
        ${di.overdue.length ? `<p class="txt-warn">${icon('alert', 'i-inline')} ${di.overdue.length} noch nicht erschienen</p>` : ''}
        <footer><label class="thr">Schwelle <input type="number" min="5" max="90" step="5" value="${r.threshold}" data-thr="${id}" ${R.can('status') ? '' : 'disabled'}> Min.</label>
        ${R.can('status') && di.delay >= 10 ? `<button class="btn btn-ghost sm" data-sms="${id}">${icon('sms')}SMS an nächste</button>` : ''}</footer>
      </article>`;
    }).join('') : '';

    const rows = list.map((a) => {
      const r = R.res(a.res);
      const proj = isToday && delays[a.res] ? delays[a.res].proj[a.id] : null;
      const late = proj ? Math.round(proj - a.s) : 0;
      const tone = a.st === 'abgesagt' || a.st === 'noshow' || a.st === 'fertig' ? null : R.delayTone(late, r.threshold);
      const nx = R.nextStatus(a);
      const canSt = R.can('status') && isToday && nx && !['abgesagt', 'noshow'].includes(a.st);
      const wait = a.ta !== undefined && a.ts === undefined && isToday ? Math.round(n.min - a.ta) : null;
      return `<tr data-id="${a.id}" class="st-${a.st}">
        <td class="t-time"><b>${tm(a.s)}</b><small>${a.d}′</small></td>
        <td class="t-proj">${tone ? `<span class="amp tone-${tone}" title="${late >= 5 ? 'Verzug ' + late + ' Min.' : 'im Plan'}"></span>${late >= 5 ? `≈ ${tm(proj)}` : ''}` : ''}</td>
        <td class="t-pat"><b>${esc(R.patLabel(a))}</b>${wait !== null ? `<small class="txt-warn">wartet ${wait} Min.</small>` : ''}</td>
        <td>${esc(R.type(a.type).name)}</td>
        <td><span class="sw" style="--c:${r.color}"></span>${esc(r.short)}</td>
        <td>${R.urgChip(a.urg, true)}</td>
        <td class="t-docs">${a.docs && tone ? `<span class="amp tone-${R.docTone(a)}" title="Unterlagen"></span>` : ''}${a.conf === 'gesendet' && R.until(a.day, a.s) > 0 ? '<span class="b-q" title="unbestätigt">?</span>' : ''}</td>
        <td>${R.statusChip(a.st)}</td>
        <td class="t-act">${canSt ? `<button class="btn btn-soft sm" data-next="${a.id}">${icon(R.STATUS[nx].icon)}${R.STATUS[nx].label}</button>` : ''}</td>
      </tr>`;
    }).join('');

    main.innerHTML = `<div class="page">
      ${pageHead('Modul 1 · Tagesübersicht', R.flong(day), `${dayNav(day)}<button class="btn btn-ghost" id="t-print">${icon('print')}Tagesliste drucken</button><button class="btn btn-ghost" id="t-tl">${icon('columns')}Zeitleiste</button>`)}
      <div class="res-chips" role="group" aria-label="Ressourcen">${scoped.map((r) => `<button class="rchip ${sel.has(r.id) ? 'on' : ''}" data-rc="${r.id}" style="--c:${r.color}" aria-pressed="${sel.has(r.id)}"><span class="sw"></span>${esc(r.short)}</button>`).join('')}</div>
      <div class="sumbar">${['geplant', 'angekommen', 'wartet', 'behandlung', 'fertig', 'noshow', 'abgesagt'].map((st) => `<div class="sum tone-${R.STATUS[st].tone}">${icon(R.STATUS[st].icon)}<b>${count(st)}</b><span>${R.STATUS[st].label}</span></div>`).join('')}</div>
      ${delayCards ? `<section class="dcards">${delayCards}</section>` : ''}
      <div class="tbl-wrap"><table class="daylist">
        <thead><tr><th>Zeit</th><th>Ampel</th><th>Patient/in</th><th>Termintyp</th><th>Ressource</th><th>Dringl.</th><th>Unterl.</th><th>Status</th><th><span class="sr-only">Aktion</span></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="9" class="empty">Keine Termine für die gewählten Ressourcen.</td></tr>`}</tbody>
      </table></div>
      <p class="print-only">Ausdruck ${R.fdate(n.day)} ${tm(Math.floor(n.min))} · ${esc(role.user)} · LUKiS bleibt das führende System und die Rückfallebene.</p>
    </div>`;
    bindDayNav(main);
    $$('[data-rc]', main).forEach((b) => (b.onclick = () => { const id = b.dataset.rc; R.ui.dayRes = sel.has(id) ? R.ui.dayRes.filter((x) => x !== id) : R.ui.dayRes.concat(id); R.render(); }));
    $$('tbody tr[data-id]', main).forEach((tr) => (tr.onclick = (e) => { if (!e.target.closest('button')) R.openAppt(tr.dataset.id); }));
    $$('[data-next]', main).forEach((b) => (b.onclick = () => { const a = R.appt(b.dataset.next); R.setStatus(a, R.nextStatus(a)); }));
    $$('[data-sms]', main).forEach((b) => (b.onclick = () => R.sendDelaySms(b.dataset.sms)));
    $$('[data-thr]', main).forEach((i) => (i.onchange = () => {
      const r = R.res(i.dataset.thr); const v = Math.max(5, Math.min(90, +i.value || 20));
      r.threshold = v; R.ui.thresholds = Object.assign(R.ui.thresholds || {}, { [r.id]: v }); R.saveUi();
      R.audit('Verzugsschwelle ' + v + ' Min.', r.short); R.render();
    }));
    $('#t-print', main).onclick = () => { R.audit('Tagesliste gedruckt', R.fdate(day)); window.print(); };
    $('#t-tl', main).onclick = () => { R.ui.view = 'resources'; R.ui.visible = [...sel]; R.go('kalender'); };
  };

  /* ================================================================ module 2: free slots (A03, A04, A07) */
  const typeOptions = () => {
    const out = [];
    for (const d of R.DEPTS) {
      const types = [...new Set(R.RESOURCES.filter((r) => r.dept === d.id).flatMap((r) => r.types))];
      for (const t of types) out.push({ key: `${d.id}:${t}`, dept: d.id, type: t, label: `${d.name} · ${R.type(t).name}` });
    }
    return out;
  };
  R.pages.slots = function (main) {
    const n = R.now();
    const ctx = R.slotCtx || {};
    const moving = ctx.move ? R.appt(ctx.move) : null;
    const f = (R.slotF = Object.assign({ mode: 'single', dept: 'kardio', type: 'kontrolle', res: '', site: '', from: n.day, to: R.addDays(n.day, 14), urgent: false, part: '', gap: 15, steps: ['labor:blut', 'kardio:echo', 'kardio:erst'] }, R.slotF || {}));
    if (ctx.dept) { f.dept = ctx.dept; f.type = ctx.type || f.type; f.urgent = !!ctx.urgent; f.mode = 'single'; if (ctx.site) f.site = ctx.site; ctx.dept = null; }
    if (f.from < n.day) f.from = n.day;
    const deptTypes = [...new Set(R.RESOURCES.filter((r) => r.dept === f.dept).flatMap((r) => r.types))];
    if (!deptTypes.includes(f.type)) f.type = deptTypes[0];
    const resOpts = R.RESOURCES.filter((r) => r.dept === f.dept && r.types.includes(f.type));
    if (f.res && !resOpts.some((r) => r.id === f.res)) f.res = '';

    const siteSeg = (name, val) => `<div class="seg sm" role="radiogroup" aria-label="Standort">${[['', 'Alle'], ...R.SITES.map((s) => [s.id, s.name])].map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${val === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
    const rangeFields = `<label class="fld"><span>Von</span><input type="date" id="sf-from" value="${f.from}" min="${n.day}"></label><label class="fld"><span>Bis</span><input type="date" id="sf-to" value="${f.to}" min="${n.day}"></label>`;

    let body = '';
    if (f.mode === 'single') {
      const t0 = performance.now();
      const slots = R.findSlots({ dept: f.dept, type: f.type, res: f.res || null, site: f.site || null, from: f.from, to: f.to, urgent: f.urgent, part: f.part });
      const ms = Math.max(1, Math.round(performance.now() - t0));
      const groups = new Map();
      for (const s of slots) { const k = s.day + '|' + s.res; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
      const first = slots[0];
      body = `<div class="filters">
          <label class="fld"><span>Fachgebiet</span><select id="sf-dept">${R.DEPTS.map((d) => `<option value="${d.id}" ${d.id === f.dept ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
          <label class="fld"><span>Termintyp</span><select id="sf-type">${deptTypes.map((t) => `<option value="${t}" ${t === f.type ? 'selected' : ''}>${esc(R.type(t).name)} · ${R.type(t).dur} Min.</option>`).join('')}</select></label>
          <label class="fld"><span>Ärztin / Ressource</span><select id="sf-res"><option value="">Alle</option>${resOpts.map((r) => `<option value="${r.id}" ${r.id === f.res ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
          ${rangeFields}
          <div class="fld"><span>Standort</span>${siteSeg('sf-site', f.site)}</div>
          <div class="fld"><span>Tageszeit</span><div class="seg sm">${[['', 'Ganzer Tag'], ['am', 'Vormittag'], ['pm', 'Nachmittag']].map(([v, l]) => `<label><input type="radio" name="sf-part" value="${v}" ${f.part === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
          <label class="chk urgent-t"><input type="checkbox" id="sf-urg" ${f.urgent ? 'checked' : ''}><span>${icon('lightning', 'i-inline')} Dringlich (innert 48 h): Reserve-Slots einbeziehen</span></label>
        </div>
        <p class="meta-line">${slots.length >= 1 ? `${slots.length} freie Termine` : 'Keine freien Termine'} · gesucht in ${ms} ms · nächster passender zuoberst</p>
        ${first ? `<div class="next-slot" style="--c:${R.res(first.res).color}"><div><p class="eyebrow">Nächster passender Termin</p><b>${R.flong(first.day)}, ${tm(first.s)}–${tm(first.s + first.d)}</b><span>${esc(R.res(first.res).name)} · ${esc(R.site(R.res(first.res).site).name)} · ${esc(R.res(first.res).room)}${first.reserve ? ' · Reserve-Slot' : ''}</span></div><button class="btn btn-primary" data-slot="0">${icon(moving ? 'swap' : 'check')}${moving ? 'Hierhin verschieben' : 'Buchen'}</button></div>` : ''}
        <div class="slot-groups">${[...groups.values()].map((g) => {
          const r = R.res(g[0].res);
          return `<div class="sg"><div class="sg-h"><b>${R.dayName(g[0].day)}</b><span>${R.fdate(g[0].day)}</span></div><div class="sg-r" style="--c:${r.color}"><span class="sw"></span><div><b>${esc(r.short)}</b><small>${esc(R.site(r.site).name)} · ${esc(r.room)}</small></div></div>
            <div class="sg-times">${g.map((s) => `<button class="tchip${s.reserve ? ' reserve' : ''}${s.overbook ? ' overbook' : ''}" data-slot="${slots.indexOf(s)}" title="${s.reserve ? 'Reserve für Dringliche' + (R.until(s.day, s.s) <= 1440 ? ' · freigegeben' : '') : s.overbook ? 'Doppelbelegung (unbestätigter Termin)' : 'frei'}">${s.reserve ? icon('lightning', 'i-inline') : s.overbook ? icon('layers', 'i-inline') : ''}${tm(s.s)}</button>`).join('')}</div></div>`;
        }).join('') || '<p class="empty">Im gewählten Zeitraum ist nichts frei. Zeitraum verlängern oder anderen Standort wählen.</p>'}</div>`;
      main._slots = slots;
    } else {
      const opts = typeOptions();
      const t0 = performance.now();
      const steps = f.steps.map((k) => { const [dept, type] = k.split(':'); return { dept, type }; });
      const combos = R.findCombos(steps, { site: f.site || null, from: f.from, to: f.to, gap: f.gap, limit: 9 });
      const ms = Math.max(1, Math.round(performance.now() - t0));
      main._combos = combos;
      body = `<div class="filters combo-f">
          <div class="steps-ed">${f.steps.map((k, i) => `<div class="step-ed"><span class="step-n">${i + 1}</span><select data-step="${i}" aria-label="Schritt ${i + 1}">${opts.map((o) => `<option value="${o.key}" ${o.key === k ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${f.steps.length > 2 ? `<button class="icon-btn sm" data-rm="${i}" aria-label="Schritt entfernen">${icon('x')}</button>` : ''}</div>`).join('')}
          ${f.steps.length < 4 ? `<button class="btn btn-ghost sm" id="cf-add">${icon('plus')}Stelle hinzufügen</button>` : ''}</div>
          <label class="fld"><span>Mindestabstand (Min.)</span><input type="number" id="cf-gap" min="0" max="120" step="5" value="${f.gap}"></label>
          ${rangeFields}
          <div class="fld"><span>Standort</span>${siteSeg('sf-site', f.site)}</div>
        </div>
        <p class="meta-line">${combos.length} Varianten am selben Tag · feste Reihenfolge · gesucht in ${ms} ms</p>
        <div class="combos">${combos.map((c, i) => {
          const s0 = c.steps[0].s, span = c.total;
          return `<article class="combo"><header><b>${R.dayName(c.day)}, ${R.fdate(c.day)}</b><span>${esc(R.site(c.site).name)} · ${tm(s0)}–${tm(s0 + span)} (${R.dur(span)})</span></header>
            <div class="combo-tl">${c.steps.map((s) => `<div class="cs" style="--c:${R.res(s.res).color};left:${((s.s - s0) / span) * 100}%;width:${(s.d / span) * 100}%" title="${esc(R.type(s.type).name)} ${tm(s.s)}"></div>`).join('')}</div>
            <ol>${c.steps.map((s) => `<li><b>${tm(s.s)}</b> ${esc(R.type(s.type).name)} <span class="muted">· ${esc(R.res(s.res).short)}</span></li>`).join('')}</ol>
            <button class="btn btn-primary sm" data-combo="${i}" ${R.can('book') ? '' : 'disabled'}>${icon('check')}Alle buchen</button></article>`;
        }).join('') || '<p class="empty">Keine Kombination gefunden. Abstand verringern, Zeitraum verlängern oder Standort «Alle» wählen.</p>'}</div>`;
    }

    main.innerHTML = `<div class="page">
      ${pageHead('Modul 2 · Freie-Slots-Finder', 'Freie Termine finden', `<div class="seg" role="tablist"><label><input type="radio" name="sf-mode" value="single" ${f.mode === 'single' ? 'checked' : ''}><span>${icon('slots')}Einzeltermin</span></label><label><input type="radio" name="sf-mode" value="combo" ${f.mode === 'combo' ? 'checked' : ''}><span>${icon('combo')}Kombitermin</span></label></div>`)}
      ${moving ? `<div class="banner tone-info">${icon('swap')}<span>Neuen Termin für <b>${esc(R.patLabel(moving))}</b> (${esc(moving.no)}, bisher ${R.fdate(moving.day, { wd: true })} ${tm(moving.s)}) wählen.</span><button class="btn btn-ghost sm" id="sf-cancelmove">Abbrechen</button></div>` : ''}
      ${body}
    </div>`;

    const upd = () => R.render();
    const on = (id, ev, fn) => { const el = $(id, main); if (el) el[ev] = fn; };
    on('#sf-dept', 'onchange', (e) => { f.dept = e.target.value; f.res = ''; upd(); });
    on('#sf-type', 'onchange', (e) => { f.type = e.target.value; upd(); });
    on('#sf-res', 'onchange', (e) => { f.res = e.target.value; upd(); });
    on('#sf-from', 'onchange', (e) => { f.from = e.target.value || n.day; if (f.to < f.from) f.to = R.addDays(f.from, 7); upd(); });
    on('#sf-to', 'onchange', (e) => { f.to = e.target.value || R.addDays(f.from, 14); upd(); });
    on('#sf-urg', 'onchange', (e) => { f.urgent = e.target.checked; upd(); });
    on('#cf-gap', 'onchange', (e) => { f.gap = Math.max(0, +e.target.value || 0); upd(); });
    on('#cf-add', 'onclick', () => { f.steps.push('kardio:kontrolle'); upd(); });
    on('#sf-cancelmove', 'onclick', () => { R.slotCtx = null; upd(); });
    $$('[name=sf-site]', main).forEach((r) => (r.onchange = () => { f.site = r.value; upd(); }));
    $$('[name=sf-part]', main).forEach((r) => (r.onchange = () => { f.part = r.value; upd(); }));
    $$('[name=sf-mode]', main).forEach((r) => (r.onchange = () => { f.mode = r.value; upd(); }));
    $$('[data-step]', main).forEach((s) => (s.onchange = () => { f.steps[+s.dataset.step] = s.value; upd(); }));
    $$('[data-rm]', main).forEach((b) => (b.onclick = () => { f.steps.splice(+b.dataset.rm, 1); upd(); }));
    $$('[data-combo]', main).forEach((b) => (b.onclick = () => R.bookCombo(main._combos[+b.dataset.combo])));
    $$('[data-slot]', main).forEach((b) => (b.onclick = () => {
      const s = main._slots[+b.dataset.slot];
      if (moving) {
        R.slotCtx = null;
        R.moveAppt(moving, { day: s.day, s: s.s, d: moving.d, res: s.res });
        R.ui.date = s.day; R.go('kalender');
        return;
      }
      if (!R.can('book')) { R.toast('Ihre Rolle kann keine Termine buchen.', { tone: 'warn' }); return; }
      R.openEditor({ res: s.res, day: s.day, s: s.s, d: s.d, type: f.type, urg: s.reserve ? 'u48' : f.urgent ? 'u48' : 'nd', wl: ctx.wl });
    }));
  };

  /* ================================================================ module 3: waiting list (A05, A07) */
  R.pages.warteliste = function (main) {
    const n = R.now();
    const gaps = R.openGaps();
    const fd = R.ui.wlDept || '';
    const wl = R.db.waitlist.filter((w) => R.inScope(w.dept) && (!fd || w.dept === fd) && w.st !== 'entfernt')
      .sort((x, y) => (x.st === 'gebucht') - (y.st === 'gebucht') || R.URGENCY[x.urg].rank - R.URGENCY[y.urg].rank || (x.since < y.since ? -1 : 1));
    const stChip = (w) => w.st === 'offen' ? '<span class="chip tone-neutral">offen</span>' : w.st === 'angebot' ? `<span class="chip tone-info">${icon('send')}Angebot gesendet</span>` : `<span class="chip tone-ok">${icon('check')}gebucht${w.appt && R.appt(w.appt) ? ' ' + R.fdate(R.appt(w.appt).day, { short: true }) + ' ' + tm(R.appt(w.appt).s) : ''}</span>`;
    main.innerHTML = `<div class="page">
      ${pageHead('Modul 3 · Warteliste und Lückenfüller', 'Freie Slots wiederbesetzen', R.can('waitlist') ? `<button class="btn btn-primary" id="wl-add">${icon('plus')}Auf Warteliste setzen</button>` : '')}
      <section><h2 class="h2">${icon('alert', 'i-inline')} Freigewordene Slots <span class="count">${gaps.length}</span></h2>
        <div class="gaps">${gaps.map((g, i) => {
          const r = R.res(g.slot.res);
          const c = R.candidates(g.slot);
          const ago = g.a.cx ? Math.max(0, Math.round(-R.until(g.a.cx.at.slice(0, 10), R.ptm(g.a.cx.at.slice(11))))) : null;
          const pend = R.db.waitlist.some((w) => w.st === 'angebot' && w.offerSlot && w.offerSlot.day === g.slot.day && w.offerSlot.s === g.slot.s && w.offerSlot.res === g.slot.res);
          return `<article class="gap" style="--c:${r.color}"><header><span class="chip ${g.kind === 'absage' ? 'tone-bad' : 'tone-warn'}">${g.kind === 'absage' ? 'Absage' : icon('lightning') + 'Reserve frei'}</span>${ago !== null ? `<small class="muted">vor ${ago < 60 ? ago + ' Min.' : Math.round(ago / 60) + ' Std.'} · ${esc(g.a.cx.by)}</small>` : '<small class="muted">nicht für Dringliche gebraucht</small>'}</header>
            <b>${R.relDay(g.slot.day)}, ${tm(g.slot.s)}–${tm(g.slot.s + g.slot.d)}</b><span>${esc(r.short)} · ${esc(R.site(r.site).name)}</span>
            <footer>${pend ? `<span class="chip tone-info">${icon('send')}Angebot offen</span>` : `<span class="muted small">${c.length} passende Nachrücker</span>`}${R.can('waitlist') ? `<button class="btn btn-primary sm" data-gap="${i}">${icon('queue')}Vorschlagen</button>` : ''}</footer></article>`;
        }).join('') || '<p class="empty">Keine offenen Lücken. Neue Absagen erscheinen hier sofort.</p>'}</div></section>
      <section><div class="sec-h"><h2 class="h2">Warteliste <span class="count">${wl.filter((w) => w.st !== 'gebucht').length}</span></h2>
        <select id="wl-dept" aria-label="Fachgebiet"><option value="">Alle Fachgebiete</option>${R.DEPTS.filter((d) => R.inScope(d.id)).map((d) => `<option value="${d.id}" ${fd === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Dringlichkeit</th><th>Person</th><th>Fachgebiet · Termintyp</th><th>Wartet</th><th>Standort</th><th>Status</th><th><span class="sr-only">Aktionen</span></th></tr></thead>
          <tbody>${wl.map((w) => `<tr class="${w.st === 'gebucht' ? 'done' : ''}">
            <td>${R.urgChip(w.urg)}</td>
            <td><b>${esc(R.wlName(w))}</b><small class="muted block">${esc(w.note)}</small></td>
            <td>${esc(R.dept(w.dept).name)} · ${esc(R.type(w.type).name)}</td>
            <td class="num">${R.daysBetween(w.since, n.day)} ${R.daysBetween(w.since, n.day) === 1 ? 'Tag' : 'Tage'}</td>
            <td>${(w.sites || []).map((s) => esc(R.site(s).name)).join(', ') || 'alle'}</td>
            <td>${stChip(w)}</td>
            <td class="t-act">${w.st === 'offen' && R.can('waitlist') ? `<button class="btn btn-soft sm" data-find="${w.id}">${icon('search')}Slot suchen</button><button class="icon-btn sm" data-rmw="${w.id}" aria-label="Von der Warteliste entfernen" title="Entfernen">${icon('trash')}</button>` : ''}</td>
          </tr>`).join('')}</tbody></table></div></section>
    </div>`;
    $$('[data-gap]', main).forEach((b) => (b.onclick = () => { const g = gaps[+b.dataset.gap]; R.openGapFill(g.slot, g.kind === 'absage' ? g.a : null); }));
    $('#wl-dept', main).onchange = (e) => { R.ui.wlDept = e.target.value; R.render(); };
    $$('[data-find]', main).forEach((b) => (b.onclick = () => {
      const w = R.db.waitlist.find((x) => x.id === b.dataset.find);
      R.slotCtx = { dept: w.dept, type: w.type, urgent: w.urg === 'u48', wl: w.id, site: w.sites && w.sites.length === 1 ? w.sites[0] : '' };
      R.go('slots');
    }));
    $$('[data-rmw]', main).forEach((b) => (b.onclick = async () => {
      const w = R.db.waitlist.find((x) => x.id === b.dataset.rmw);
      if (await R.confirmBox('Von der Warteliste entfernen?', `${R.wlName(w)} wird von der Warteliste entfernt.`, 'Entfernen', 'bad')) { R.mutate(() => { w.st = 'entfernt'; }, { action: 'Von Warteliste entfernt', target: R.pat(w.pat).pid }); R.render(); }
    }));
    const add = $('#wl-add', main);
    if (add) add.onclick = () => {
      const body = R.h(`<div class="form"><p class="pf-lbl">Patientin / Patient</p><div id="wa-pat"></div>
        <div class="grid2"><label class="fld"><span>Fachgebiet · Termintyp</span><select id="wa-t">${typeOptions().filter((o) => R.inScope(o.dept)).map((o) => `<option value="${o.key}">${esc(o.label)}</option>`).join('')}</select></label>
        <div class="fld"><span>Standortwunsch</span><div class="seg sm">${R.SITES.map((s) => `<label><input type="checkbox" name="wa-site" value="${s.id}" ${s.id === 'LU' ? 'checked' : ''}><span>${s.name}</span></label>`).join('')}</div></div></div>
        <p class="pf-lbl">Dringlichkeit</p><div class="seg urg-seg">${Object.entries(R.URGENCY).map(([k, u]) => `<label class="tone-${u.tone}"><input type="radio" name="wa-urg" value="${k}" ${k === 'u2w' ? 'checked' : ''}><span><i class="dot-i"></i>${u.label}</span></label>`).join('')}</div>
        <label class="fld"><span>Fragestellung / Notiz</span><input id="wa-note" placeholder="z. B. Zuweisung Hausarzt, Dyspnoe"></label></div>`);
      let pf;
      const el = R.modal({ title: 'Auf Warteliste setzen', body, wide: true, actions: [{ label: 'Abbrechen' }, { label: 'Hinzufügen', primary: true, fn: () => {
        const v = pf.value();
        if (!v) { R.toast('Bitte eine Person wählen.', { tone: 'bad' }); return false; }
        const p = R.ensurePatient(v);
        const [dept, type] = $('#wa-t', el).value.split(':');
        const w = { id: R.newId('w'), pat: p.id, dept, type, urg: el.querySelector('[name=wa-urg]:checked').value, since: R.now().day, sites: $$('[name=wa-site]:checked', el).map((x) => x.value), earliest: R.now().day, note: $('#wa-note', el).value || 'Neu erfasst', st: 'offen', offers: [] };
        R.mutate((db) => db.waitlist.push(w), { action: 'Auf Warteliste gesetzt', target: p.pid });
        R.toast('Auf der Warteliste. Bei passenden Absagen wird die Person vorgeschlagen.');
        R.render();
      } }] });
      pf = R.patientField($('#wa-pat', el), {});
    };
  };

  /* ================================================================ modules 5 + 6: tasks (A08, A09) */
  R.pages.aufgaben = function (main) {
    const tasks = R.docTasks();
    const rem = R.reminderSet();
    const k = { all: rem.length, ok: rem.filter((a) => a.conf === 'bestaetigt').length, open: rem.filter((a) => a.conf === 'gesendet' && a.st === 'geplant').length, cx: rem.filter((a) => a.conf === 'abgesagt').length, none: rem.filter((a) => !a.conf && a.st === 'geplant').length };
    const unconf = rem.filter((a) => a.conf === 'gesendet' && a.st === 'geplant');
    const canE = R.can('edit');
    main.innerHTML = `<div class="page">
      ${pageHead('Module 5 und 6 · Aufgaben', 'Unterlagen und Erinnerungen')}
      <section><div class="sec-h"><h2 class="h2">${icon('doc', 'i-inline')} Unterlagen-Check <span class="count">${tasks.length}</span></h2><span class="muted small">Termine der nächsten 3 Arbeitstage, bei denen etwas fehlt</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Termin</th><th>Patient/in</th><th>Ressource</th><th>Fehlt</th><th><span class="sr-only">Aktionen</span></th></tr></thead>
          <tbody>${tasks.map(({ a, missing }) => `<tr><td class="nowrap"><span class="amp tone-${R.docTone(a)}"></span> <b>${R.relDay(a.day)}</b> ${tm(a.s)}</td><td><button class="link" data-open="${a.id}">${esc(R.patLabel(a))}</button><small class="muted block">${esc(R.type(a.type).name)}</small></td><td>${esc(R.res(a.res).short)}</td>
            <td>${missing.map((m) => `<button class="doc-c miss${canE ? ' act' : ''}" data-fix="${a.id}:${m.id}" ${canE ? '' : 'disabled'} title="Als vorhanden markieren">${icon('x')}${m.label}</button>`).join(' ')}</td>
            <td class="t-act">${a.docReq ? `<span class="muted small">angefordert ${esc(a.docReq.slice(11))}</span>` : canE ? `<button class="btn btn-soft sm" data-req="${a.id}">${icon('send')}Anfordern</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Alle Unterlagen sind bereit.</td></tr>'}</tbody></table></div></section>
      <section><div class="sec-h"><h2 class="h2">${icon('bell', 'i-inline')} Erinnerungen 48 Stunden vorher</h2>${canE ? `<button class="btn btn-primary" id="rem-send" ${k.none ? '' : 'disabled'}>${icon('send')}Erinnerungen senden (${k.none})</button>` : ''}</div>
        <div class="tiles">
          <div class="tile"><span>Termine im Fenster</span><b>${k.all}</b></div>
          <div class="tile tone-ok"><span>${icon('check', 'i-inline')} Bestätigt</span><b>${k.ok}</b></div>
          <div class="tile tone-warn"><span>${icon('help', 'i-inline')} Unbestätigt</span><b>${k.open}</b></div>
          <div class="tile tone-bad"><span>${icon('x', 'i-inline')} Per Erinnerung abgesagt</span><b>${k.cx}</b></div>
          <div class="tile"><span>Noch nicht erinnert</span><b>${k.none}</b></div>
        </div>
        <h3 class="h3">Unbestätigte Termine <small>nachtelefonieren oder Slot für eine Doppelbelegung freigeben</small></h3>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Termin</th><th>Patient/in</th><th>Ressource</th><th>Kanal</th><th><span class="sr-only">Aktionen</span></th></tr></thead>
          <tbody>${unconf.map((a) => { const p = R.pat(a.pat); return `<tr><td class="nowrap"><b>${R.relDay(a.day)}</b> ${tm(a.s)}</td><td><button class="link" data-open="${a.id}">${esc(R.patLabel(a))}</button>${R.seesPatient(a) && !R.ui.privacy ? `<small class="muted block">${icon('phone', 'i-inline')} ${esc(p.phone)}</small>` : ''}</td><td>${esc(R.res(a.res).short)}</td><td>${esc(a.channel || p.channel)}</td>
            <td class="t-act">${canE ? `<button class="btn btn-soft sm" data-conf="${a.id}">${icon('phone')}Bestätigt</button><button class="btn btn-ghost sm${a.ob ? ' on' : ''}" data-ob="${a.id}">${icon('layers')}${a.ob ? 'Doppelbelegung frei' : 'Doppelt belegen'}</button><button class="btn btn-ghost sm" data-cx="${a.id}">${icon('x')}Absage</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Keine unbestätigten Termine.</td></tr>'}</tbody></table></div>
      </section></div>`;
    $$('[data-open]', main).forEach((b) => (b.onclick = () => R.openAppt(b.dataset.open)));
    $$('[data-fix]', main).forEach((b) => (b.onclick = () => { const [id, doc] = b.dataset.fix.split(':'); const a = R.appt(id); R.mutate(() => { a.docs[doc] = 1; }, { action: `Unterlagen: ${R.DOCS.find((d) => d.id === doc).label} bereit`, target: a.no }); R.render(); }));
    $$('[data-req]', main).forEach((b) => (b.onclick = () => { const a = R.appt(b.dataset.req); R.mutate(() => { a.docReq = R.stamp(); }, { action: 'Unterlagen bei Praxis angefordert', target: a.no }); R.toast('Anfrage an die zuweisende Praxis gesendet (LUKSLink).'); R.render(); }));
    $$('[data-conf]', main).forEach((b) => (b.onclick = () => { const a = R.appt(b.dataset.conf); R.mutate(() => { a.conf = 'bestaetigt'; a.ob = false; }, { action: 'Termin telefonisch bestätigt', target: a.no }); R.render(); }));
    $$('[data-ob]', main).forEach((b) => (b.onclick = () => { const a = R.appt(b.dataset.ob); R.mutate(() => { a.ob = !a.ob; }, { action: a.ob ? 'Doppelbelegung aufgehoben' : 'Doppelbelegung erlaubt', target: a.no }); R.render(); }));
    $$('[data-cx]', main).forEach((b) => (b.onclick = () => R.askCancel(R.appt(b.dataset.cx))));
    const rs = $('#rem-send', main); if (rs) rs.onclick = () => R.sendReminders(rem);
  };

  /* ================================================================ module 7: KPI cockpit (A10) */
  const KPI = [
    { key: 'util', label: 'Auslastung', fmt: (v) => R.pct(v), unit: '%', target: null, better: 'up', note: 'gebuchte Minuten / Sprechstundenzeit' },
    { key: 'waitDays', label: 'Wartezeit bis zum Termin', fmt: (v) => R.num(v, 1) + ' Tage', target: -0.2, better: 'down', note: 'Zuweisung bis Termin' },
    { key: 'onsite', label: 'Wartezeit vor Ort', fmt: (v) => R.num(v, 1) + ' Min.', target: -0.25, better: 'down', note: 'geplant bis Behandlungsbeginn' },
    { key: 'noshow', label: 'No-Show-Quote', fmt: (v) => R.pct(v, 1), target: -0.3, better: 'down', note: 'nicht erschienen ohne Absage' },
    { key: 'refill', label: 'Wiederbesetzte Slots', fmt: (v) => R.pct(v), target: 0.5, abs: true, better: 'up', note: 'kurzfristige Absagen neu vergeben' },
  ];
  function barChart(rows, k) {
    const W = 300, H = 128, pl = 6, pr = 6, pt = 18, pb = 22;
    const vals = rows.map((r) => r[k.key]);
    const base = vals[0];
    const tgt = k.target === null ? null : k.abs ? k.target : base !== null ? base * (1 + k.target) : null;
    const max = Math.max(...vals.filter((v) => v !== null), tgt || 0) * 1.15 || 1;
    const bw = (W - pl - pr) / rows.length;
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    const bars = rows.map((r, i) => {
      const v = r[k.key]; if (v === null) return '';
      const x = pl + i * bw + bw * 0.22, w = bw * 0.56, top = y(v), h = H - pb - top;
      const last = i === rows.length - 1;
      return `<g class="bar${last ? ' last' : ''}" tabindex="0" data-tip="KW ${r.week}: ${esc(k.fmt(v))}"><rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${H - pt - pb}" fill="transparent"/><path d="M${x},${H - pb} V${top + 4} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${H - pb} Z"/>${last ? `<text class="v" x="${x + w / 2}" y="${top - 5}" text-anchor="middle">${esc(k.fmt(v))}</text>` : ''}</g>`;
    }).join('');
    const labels = rows.map((r, i) => `<text class="ax" x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">KW ${r.week}</text>`).join('');
    const tl = tgt !== null ? `<line class="tgt" x1="${pl}" x2="${W - pr}" y1="${y(tgt)}" y2="${y(tgt)}"/>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" class="kchart" role="img" aria-label="${esc(k.label)} pro Woche"><line class="base" x1="${pl}" x2="${W - pr}" y1="${H - pb}" y2="${H - pb}"/>${bars}${tl}${labels}</svg>`;
  }
  R.pages.kennzahlen = function (main) {
    const dept = R.ui.kpiDept || '';
    const rows = R.kpis(dept || null, 6);
    const last = rows[rows.length - 1], base = rows[0];
    main.innerHTML = `<div class="page">
      ${pageHead('Modul 7 · Kennzahlen-Cockpit', 'Wirkung des Terminradars', `<select id="k-dept" aria-label="Klinik"><option value="">Alle Kliniken</option>${R.DEPTS.map((d) => `<option value="${d.id}" ${d.id === dept ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select><button class="btn btn-primary" id="k-xlsx">${icon('download')}Excel-Export</button>`, 'Wochenwerte der letzten sechs Wochen, täglich um 06:00 aus LUKiS aktualisiert. Ohne Personendaten. Zielwerte sind Annahmen aus dem Konzept.')}
      <div class="ktiles">${KPI.map((k) => {
        const v = last[k.key], b = base[k.key];
        const delta = v !== null && b ? (v - b) / b : null;
        const good = delta === null ? null : k.better === 'down' ? delta < 0 : delta > 0;
        return `<article class="ktile"><p class="eyebrow">${esc(k.label)}</p><b class="kv">${esc(k.fmt(v))}</b>
          <p class="kd ${good === null ? '' : good ? 'txt-ok' : 'txt-bad'}">${delta === null ? '–' : `${icon(delta < 0 ? 'down' : 'up', 'i-inline')} ${delta > 0 ? '+' : ''}${R.pct(delta)} seit KW ${base.week}`}</p>
          ${barChart(rows, k)}
          <p class="muted small">${esc(k.note)}</p>
          ${k.target !== null ? `<p class="ktgt"><i></i>Ziel ${k.abs ? 'über ' + esc(k.fmt(k.target)) : `${R.pct(k.target)}${b ? " → " + esc(k.fmt(b * (1 + k.target))) : ""}`}</p>` : '<p class="ktgt none">Kein Zielwert, Steuerungsgrösse</p>'}</article>`;
      }).join('')}</div>
      <section><h2 class="h2">Tabellenansicht</h2><div class="tbl-wrap"><table class="tbl num-tbl">
        <thead><tr><th>Woche</th><th>Termine</th>${KPI.map((k) => `<th>${esc(k.label)}</th>`).join('')}<th>Kurzfr. Absagen</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>KW ${r.week} <small class="muted">ab ${R.fdate(r.mon, { short: true })}</small></td><td>${r.appts}</td>${KPI.map((k) => `<td>${esc(k.fmt(r[k.key]))}</td>`).join('')}<td>${r.shortCx} (${r.refilled} neu vergeben)</td></tr>`).join('')}</tbody></table></div></section>
      <div class="chart-tip" id="chart-tip" hidden></div>
    </div>`;
    $('#k-dept', main).onchange = (e) => { R.ui.kpiDept = e.target.value; R.render(); };
    $('#k-xlsx', main).onclick = () => {
      const header = ['Klinik', 'KW', 'Woche ab', 'Termine', 'Auslastung', 'Wartezeit bis Termin (Tage)', 'Wartezeit vor Ort (Min.)', 'No-Show-Quote', 'Wiederbesetzte Slots', 'Kurzfristige Absagen', 'Davon neu vergeben'];
      const data = [header];
      for (const d of [null, ...R.DEPTS]) {
        for (const r of R.kpis(d ? d.id : null, 6)) data.push([d ? d.name : 'Alle Kliniken', r.week, R.fdate(r.mon), r.appts, round(r.util, 3), round(r.waitDays, 1), round(r.onsite, 1), round(r.noshow, 3), round(r.refill, 3), r.shortCx, r.refilled]);
      }
      R.downloadXlsx(`LUKS-Terminradar-Kennzahlen-${R.now().day}.xlsx`, 'Kennzahlen', data);
      R.audit('Kennzahlen exportiert (Excel)', 'ohne Personendaten');
    };
    const tip = $('#chart-tip', main);
    $$('.bar', main).forEach((g) => {
      const show = () => { const r = g.getBoundingClientRect(); tip.textContent = g.dataset.tip; tip.hidden = false; tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.top - 8 + 'px'; };
      g.addEventListener('pointerenter', show); g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => (tip.hidden = true)); g.addEventListener('blur', () => (tip.hidden = true));
    });
  };
  const round = (v, d) => (v === null || v === undefined ? '' : Math.round(v * 10 ** d) / 10 ** d);

  /* ================================================================ wall screen (A12) */
  R.pages.wand = function (main) {
    const n = R.now();
    const depts = R.DEPTS.filter((d) => R.inScope(d.id) && R.RESOURCES.some((r) => r.dept === d.id));
    let dept = R.ui.wallDept;
    if (!depts.some((d) => d.id === dept)) dept = depts[0].id;
    const res = R.RESOURCES.filter((r) => r.dept === dept && R.day(n.day).some((a) => a.res === r.id && R.isPatient(a)));
    const cols = res.map((r) => {
      const di = R.delayInfo(r.id);
      const up = R.day(n.day).filter((a) => a.res === r.id && R.isPatient(a) && ['angekommen', 'wartet', 'geplant'].includes(a.st) && di.proj[a.id] !== undefined).slice(0, 5);
      const tone = R.delayTone(di.delay, r.threshold);
      return `<section class="wcol"><header><b>${esc(r.kind === 'arzt' ? 'Sprechstunde ' + r.short : r.short)}</b><span>${esc(r.room)}</span></header>
        <div class="wnow"><small>Aufgerufen</small><strong>${di.current ? pubNo(di.current) : '–'}</strong></div>
        ${di.delay >= 10 ? `<p class="wdelay tone-${tone}">${icon('clock')} Aktuell ca. ${Math.round(di.delay / 5) * 5} Min. Verzögerung</p>` : `<p class="wdelay tone-ok">${icon('check')} Im Zeitplan</p>`}
        <ol class="wnext">${up.map((a) => `<li><b>${pubNo(a)}</b><span>${a.st === 'geplant' ? 'erwartet' : 'bitte warten'}</span><time>ca. ${tm(Math.round(di.proj[a.id] / 5) * 5)}</time></li>`).join('') || '<li class="muted">Keine weiteren Aufrufe</li>'}</ol></section>`;
    }).join('');
    main.innerHTML = `<div class="wall">
      <header class="wall-h"><div class="wall-brand"><span class="brand-mark"></span><div><b>${esc(R.dept(dept).name)}</b><span>Wartebereich · LUKS ${esc(R.site(res[0] ? res[0].site : 'LU').name)}</span></div></div>
        <div class="wall-ctl"><select id="w-dept" aria-label="Abteilung">${depts.map((d) => `<option value="${d.id}" ${d.id === dept ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select><button class="btn btn-ghost-inv" id="w-full">${icon('fullscreen')}Vollbild</button></div>
        <time class="wall-clock">${tm(Math.floor(n.min))}</time></header>
      <div class="wall-cols">${cols || '<p class="empty">Heute keine Sprechstunden.</p>'}</div>
      <footer class="wall-f">${icon('shield', 'i-inline')} Aus Datenschutzgründen zeigen wir nur Terminnummern. Ihre Nummer steht auf dem Aufgebot und in MeinLUKS. Bei Fragen hilft Ihnen der Empfang.</footer>
    </div>`;
    $('#w-dept', main).onchange = (e) => { R.ui.wallDept = e.target.value; R.render(); };
    $('#w-full', main).onclick = () => {
      document.body.classList.toggle('wall-mode');
      const el = document.documentElement;
      if (document.body.classList.contains('wall-mode') && el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  };

  /* ================================================================ audit log (A12) */
  R.pages.protokoll = function (main) {
    const q = R.fold(R.ui.logQ || '');
    const rows = R.db.log.filter((l) => !q || R.fold(`${l.user} ${l.role} ${l.action} ${l.target}`).includes(q));
    main.innerHTML = `<div class="page">
      ${pageHead('Datenschutz · Zugriffsprotokoll', 'Wer hat wann was getan', `<div class="pf-search"><span>${icon('search')}</span><input id="lg-q" type="search" placeholder="Person, Aktion, Termin" value="${esc(R.ui.logQ || '')}"></div>`, 'Jeder Zugriff auf Patientendaten und jede Änderung wird protokolliert (Datenschutzgesetz, besonders schützenswerte Daten).')}
      <div class="tbl-wrap"><table class="tbl log">
        <thead><tr><th>Zeit</th><th>Person</th><th>Rolle</th><th>Aktion</th><th>Objekt</th></tr></thead>
        <tbody>${rows.slice(0, 300).map((l) => `<tr><td class="nowrap num">${esc(R.fdate(l.at.slice(0, 10), { short: true }))} ${esc(l.at.slice(11))}</td><td>${esc(l.user)}</td><td>${esc(l.role)}</td><td>${esc(l.action)}</td><td>${esc(l.target)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Keine Einträge.</td></tr>'}</tbody></table></div>
    </div>`;
    const inp = $('#lg-q', main);
    inp.oninput = R.debounce(() => { R.ui.logQ = inp.value; R.render(); const i = $('#lg-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 200);
  };
})();
