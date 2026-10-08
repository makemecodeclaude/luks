/* LUKS Terminradar – app shell: top bar, rail, ribbon, sidebar, routing, roles, notifications, search, lock */
(function () {
  'use strict';
  const R = window.R;
  const { $, $$, esc, icon, tm } = R;

  const PAGES = {
    kalender: { label: 'Kalender', icon: 'cal' },
    tag: { label: 'Tagesübersicht', rail: 'Tagesliste', icon: 'list' },
    slots: { label: 'Freie Slots', icon: 'slots' },
    warteliste: { label: 'Warteliste', icon: 'queue' },
    aufgaben: { label: 'Aufgaben', icon: 'tasks' },
    kennzahlen: { label: 'Kennzahlen', icon: 'chart' },
    wand: { label: 'Wandbildschirm', rail: 'Wartezone', icon: 'monitor' },
    protokoll: { label: 'Protokoll', icon: 'log' },
  };
  const VIEWS = [['day', 'Tag', 'day'], ['workweek', 'Arbeitswoche', 'workweek'], ['week', 'Woche', 'week'], ['month', 'Monat', 'month'], ['resources', 'Ressourcen', 'columns']];
  let ribbonTab = 'start';

  /* ---------------------------------------------------------------- routing */
  R.go = function (page) {
    if (!PAGES[page]) page = 'kalender';
    R.ui.page = page;
    if (location.hash.slice(1) !== page) history.replaceState(null, '', '#' + page);
    R.closePeek();
    document.body.classList.remove('side-drawer');
    R.render();
    const m = $('#main'); if (m) m.scrollTop = 0;
  };
  window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (PAGES[p] && p !== R.ui.page) R.go(p); });

  /* ---------------------------------------------------------------- render */
  R.render = function () {
    R.saveUi();
    const role = R.role();
    const allowed = role.pages.includes(R.ui.page);
    document.body.dataset.page = R.ui.page;
    document.body.classList.toggle('privacy', !!R.ui.privacy);
    renderTop();
    renderRail();
    renderRibbon();
    const side = $('#side');
    const showSide = R.ui.page === 'kalender' && allowed;
    side.hidden = !showSide;
    if (showSide) renderSide(side);
    const main = $('#main');
    if (!allowed) {
      main.innerHTML = `<div class="page"><div class="denied">${icon('shield')}<h1>Keine Berechtigung</h1><p class="muted">Die Rolle «${esc(role.label)}» hat keinen Zugriff auf «${esc(PAGES[R.ui.page].label)}». Die Rechte stammen aus den LUKiS-Rollen.</p><button class="btn btn-primary" id="den-go">${icon('arrowR')}Zu ${esc(PAGES[role.pages[0]].label)}</button></div></div>`;
      $('#den-go').onclick = () => R.go(role.pages[0]);
    } else {
      R.pages[R.ui.page](main);
    }
    if (R.peekId) { if (R.appt(R.peekId)) R.openAppt(R.peekId); else R.closePeek(); }
  };

  function renderTop() {
    const role = R.role();
    const ini = role.user.replace(/^(Prof\. |Dr\. med\. |PD )+/g, '').split(' ').map((x) => x[0]).join('').slice(0, 2);
    $('#tb-user').innerHTML = `<span class="avatar">${esc(ini)}</span><span class="tb-user-t"><b>${esc(role.user)}</b><small>${esc(role.label)}</small></span>`;
    const u = R.unread();
    $('#tb-bell').innerHTML = icon('bell') + (u ? `<span class="badge">${u > 9 ? '9+' : u}</span>` : '');
    $('#tb-bell').setAttribute('aria-label', `Benachrichtigungen${u ? ', ' + u + ' ungelesen' : ''}`);
    const n = R.now();
    const clock = $('#tb-clock');
    clock.innerHTML = `${icon('clock')}<span>${R.clockOffset ? 'Demo-Uhr · ' : ''}${R.WD[n.date.getDay()]} ${tm(Math.floor(n.min))}</span>`;
    clock.title = R.clockOffset ? 'Demo-Uhr: Die Demo läuft in Sprechstundenzeit. In den Einstellungen auf Echtzeit umstellen.' : 'Echtzeit';
    const ago = Math.max(1, Math.round((Date.now() - (R.lastSync || Date.now())) / 1000));
    $('#tb-sync').innerHTML = `${icon('sync')}<span>LUKiS · vor ${ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' Min.'}</span>`;
  }

  function badgeFor(page) {
    if (page === 'warteliste') return R.openGaps().length;
    if (page === 'aufgaben') return R.docTasks().length + R.reminderSet().filter((a) => a.conf === 'gesendet' && a.st === 'geplant').length;
    if (page === 'tag') { const n = R.now(); return R.day(n.day).filter((a) => R.inScope(R.res(a.res)) && (a.st === 'wartet' || a.st === 'angekommen')).length; }
    return 0;
  }
  function renderRail() {
    const role = R.role();
    $('#rail').innerHTML = role.pages.map((p) => {
      const b = badgeFor(p);
      return `<a href="#${p}" class="rail-i${R.ui.page === p ? ' on' : ''}" title="${PAGES[p].label}" ${R.ui.page === p ? 'aria-current="page"' : ''}>${icon(PAGES[p].icon)}<span>${PAGES[p].rail || PAGES[p].label}</span>${b ? `<i class="rail-b${p === 'tag' ? ' info' : ''}">${b}</i>` : ''}</a>`;
    }).join('');
  }

  /* ---------------------------------------------------------------- ribbon (Outlook-like) */
  function rbtn(id, ico, label, o = {}) {
    return `<button class="rb ${o.big ? 'big' : ''} ${o.on ? 'on' : ''}" id="${id}" ${o.disabled ? 'disabled' : ''} ${o.pressed !== undefined ? `aria-pressed="${o.pressed}"` : ''} title="${esc(o.title || label.replace(/&shy;/g, ''))}">${icon(ico)}<span>${label}</span></button>`;
  }
  function renderRibbon() {
    const onCal = R.ui.page === 'kalender';
    const tabs = [['start', 'Startseite'], ['view', 'Ansicht'], ['help', 'Hilfe']];
    let groups = '';
    if (ribbonTab === 'start') {
      const nf = R.ui.filterStatus.length + R.ui.filterUrg.length;
      groups = `
        <div class="rg">${rbtn('rb-new', 'calPlus', 'Neuer Termin', { big: true, disabled: !R.can('book') })}<small>Neu</small></div>
        <div class="rg"><div class="rg-row">${VIEWS.map(([v, l, ic]) => rbtn('rb-v-' + v, ic, l, { on: onCal && R.ui.view === v, pressed: onCal && R.ui.view === v })).join('')}</div><small>Anordnen</small></div>
        <div class="rg">${rbtn('rb-filter', 'filter', `Filter${nf ? ' (' + nf + ')' : ''}`, { on: nf > 0 })}<small>Filter</small></div>
        <div class="rg"><div class="rg-row">${R.role().pages.includes('slots') ? rbtn('rb-slots', 'slots', 'Freie Slots') : ''}${R.role().pages.includes('slots') ? rbtn('rb-combo', 'combo', 'Kombi&shy;termin') : ''}${R.role().pages.includes('warteliste') ? rbtn('rb-wl', 'queue', 'Warte&shy;liste') : ''}${rbtn('rb-tag', 'list', 'Tages&shy;übersicht')}</div><small>Terminradar</small></div>
        <div class="rg"><div class="rg-row">${rbtn('rb-print', 'print', 'Drucken')}${R.role().pages.includes('wand') ? rbtn('rb-wall', 'monitor', 'Wand&shy;bildschirm') : ''}</div><small>Teilen</small></div>`;
    } else if (ribbonTab === 'view') {
      groups = `
        <div class="rg">${rbtn('rb-priv', R.ui.privacy ? 'eyeOff' : 'eye', 'Datenschutz-Ansicht', { on: R.ui.privacy, pressed: !!R.ui.privacy, big: true, title: 'Nur Initialen und Terminnummern anzeigen' })}<small>Datenschutz</small></div>
        <div class="rg"><div class="rg-row">${rbtn('rb-dens', 'layers', 'Kompakt', { on: R.ui.density === 'compact', pressed: R.ui.density === 'compact' })}${rbtn('rb-we', 'week', 'Wochenende', { on: R.ui.showWeekend, pressed: !!R.ui.showWeekend })}${rbtn('rb-theme', R.ui.theme === 'dark' ? 'moon' : R.ui.theme === 'light' ? 'sun' : 'monitor', R.ui.theme === 'dark' ? 'Dunkel' : R.ui.theme === 'light' ? 'Hell' : 'System')}</div><small>Darstellung</small></div>
        <div class="rg">${rbtn('rb-lock', 'lock', 'Jetzt sperren')}<small>Sicherheit</small></div>
        <div class="rg">${rbtn('rb-settings', 'gear', 'Einstel&shy;lungen')}<small>Optionen</small></div>`;
    } else {
      groups = `
        <div class="rg"><div class="rg-row">${rbtn('rb-guide', 'help', 'Kurz&shy;anleitung')}${rbtn('rb-keys', 'keyboard', 'Tasten&shy;kürzel')}${rbtn('rb-req', 'tasks', 'Anforde&shy;rungen')}</div><small>Hilfe</small></div>
        <div class="rg">${rbtn('rb-reset', 'refresh', 'Demo-Daten zurücksetzen')}<small>Demo</small></div>`;
    }
    $('#ribbon').innerHTML = `<div class="rb-tabs" role="tablist"><button class="icon-btn" id="rb-side" aria-label="Seitenleiste ein-/ausblenden">${icon('menu')}</button>${tabs.map(([k, l]) => `<button role="tab" class="rb-tab${ribbonTab === k ? ' on' : ''}" data-tab="${k}" aria-selected="${ribbonTab === k}">${l}</button>`).join('')}</div><div class="rb-groups">${groups}</div>`;
    bindRibbon();
  }
  function bindRibbon() {
    const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
    $$('[data-tab]').forEach((b) => (b.onclick = () => { ribbonTab = b.dataset.tab; renderRibbon(); }));
    on('rb-side', () => { if (window.innerWidth < 900) document.body.classList.toggle('side-drawer'); else { R.ui.sideOpen = !R.ui.sideOpen; document.body.classList.toggle('side-closed', !R.ui.sideOpen); } if (R.ui.page !== 'kalender') R.go('kalender'); });
    on('rb-new', () => R.openEditor({ day: R.ui.date >= R.now().day ? R.ui.date : R.now().day, s: nextQuarter() }));
    VIEWS.forEach(([v]) => on('rb-v-' + v, () => { R.ui.view = v; if (R.ui.page !== 'kalender') R.go('kalender'); else R.render(); }));
    on('rb-filter', openFilter);
    on('rb-slots', () => { R.slotF = Object.assign(R.slotF || {}, { mode: 'single' }); R.go('slots'); });
    on('rb-combo', () => { R.slotF = Object.assign(R.slotF || {}, { mode: 'combo' }); R.go('slots'); });
    on('rb-wl', () => R.go('warteliste'));
    on('rb-tag', () => R.go('tag'));
    on('rb-print', () => { if (R.ui.page !== 'tag') { R.go('tag'); setTimeout(() => window.print(), 150); } else window.print(); R.audit('Tagesliste gedruckt', R.fdate(R.ui.date)); });
    on('rb-wall', () => R.go('wand'));
    on('rb-priv', () => { R.ui.privacy = !R.ui.privacy; R.audit(R.ui.privacy ? 'Datenschutz-Ansicht ein' : 'Datenschutz-Ansicht aus', ''); R.render(); });
    on('rb-dens', () => { R.ui.density = R.ui.density === 'compact' ? 'normal' : 'compact'; R.calScroll = undefined; R.render(); });
    on('rb-we', () => { R.ui.showWeekend = !R.ui.showWeekend; R.render(); });
    on('rb-theme', () => { R.ui.theme = R.ui.theme === 'system' ? 'light' : R.ui.theme === 'light' ? 'dark' : 'system'; applyTheme(); R.render(); });
    on('rb-lock', () => R.lock(true));
    on('rb-settings', openSettings);
    on('rb-guide', openGuide);
    on('rb-keys', openKeys);
    on('rb-req', openReq);
    on('rb-reset', resetDemo);
  }
  const nextQuarter = () => { const m = Math.ceil((R.now().min + 5) / 15) * 15; return Math.min(Math.max(m, 480), 16 * 60); };

  function openFilter() {
    const body = R.h(`<div class="form">
      <p class="pf-lbl">Status</p><div class="chk-grid">${Object.entries(R.STATUS).map(([k, s]) => `<label class="chk"><input type="checkbox" name="f-st" value="${k}" ${R.ui.filterStatus.includes(k) ? 'checked' : ''}><span>${R.statusChip(k)}</span></label>`).join('')}</div>
      <p class="pf-lbl">Dringlichkeit</p><div class="chk-grid">${Object.keys(R.URGENCY).map((k) => `<label class="chk"><input type="checkbox" name="f-u" value="${k}" ${R.ui.filterUrg.includes(k) ? 'checked' : ''}><span>${R.urgChip(k)}</span></label>`).join('')}</div>
      <p class="muted small">Ohne Auswahl werden alle Termine gezeigt. Blocker und Reserve-Slots bleiben sichtbar.</p></div>`);
    R.modal({ title: 'Filter', body, actions: [{ label: 'Zurücksetzen', fn: () => { R.ui.filterStatus = []; R.ui.filterUrg = []; R.render(); } }, { label: 'Anwenden', primary: true, fn: (el) => { R.ui.filterStatus = $$('[name=f-st]:checked', el).map((x) => x.value); R.ui.filterUrg = $$('[name=f-u]:checked', el).map((x) => x.value); if (R.ui.page !== 'kalender') R.go('kalender'); else R.render(); } }] });
  }

  /* ---------------------------------------------------------------- sidebar */
  function renderSide(side) {
    const vis = new Set(R.visibleRes().map((r) => r.id));
    const groups = R.DEPTS.map((d) => ({ d, rs: R.RESOURCES.filter((r) => r.dept === d.id) })).filter((g) => g.rs.length);
    const mine = groups.filter((g) => R.inScope(g.d.id)), other = groups.filter((g) => !R.inScope(g.d.id));
    const grp = (g, locked) => `<details class="cal-grp" ${g.rs.some((r) => vis.has(r.id)) || !locked ? 'open' : ''}><summary>${icon('right', 'chev')}<span>${esc(g.d.name)}</span>${locked ? `<span class="lockd" title="Nur Belegung sichtbar, keine Patientendaten">${icon('lock')}</span>` : ''}</summary>
      ${g.rs.map((r) => `<label class="cal-item" style="--c:${r.color}"><input type="checkbox" data-vis="${r.id}" ${vis.has(r.id) ? 'checked' : ''}><span class="cb"></span><span class="ci-t">${esc(r.short)}<small>${icon(r.kind === 'arzt' ? 'stetho' : r.kind === 'raum' ? 'room' : 'device', 'i-inline')} ${esc(R.site(r.site).name)}</small></span></label>`).join('')}</details>`;
    side.innerHTML = `<div class="mini" id="mini"></div>
      ${R.role().pages.includes('slots') ? `<button class="side-link" id="sd-find">${icon('slots')}Freien Termin suchen</button>` : ''}
      ${R.role().pages.includes('warteliste') ? `<button class="side-link" id="sd-wl">${icon('queue')}Warteliste öffnen</button>` : ''}
      <div class="side-sec"><h3>Meine Kalender</h3>${mine.map((g) => grp(g, false)).join('')}</div>
      ${other.length ? `<div class="side-sec"><h3>Weitere Kalender</h3>${other.map((g) => grp(g, true)).join('')}</div>` : ''}
      <div class="side-sec legend"><h3>Legende</h3>
        <span><i class="lg lg-res"></i>Reserve für Dringliche</span><span><i class="lg lg-block"></i>Blocker / Abwesenheit</span><span><i class="lg lg-cx"></i>Abgesagt, Slot frei</span>
        <span>${icon('lightning', 'i-inline lg-u')} Dringlich (48 h)</span><span><b class="b-q">?</b> unbestätigt</span><span>${icon('doc', 'i-inline lg-d')} Unterlagen fehlen</span></div>
      <p class="side-foot">Demo mit fiktiven Daten · führendes System: LUKiS</p>`;
    R.renderMini($('#mini', side));
    $$('[data-vis]', side).forEach((c) => (c.onchange = () => {
      const cur = new Set(R.visibleRes().map((r) => r.id));
      if (c.checked) cur.add(c.dataset.vis); else cur.delete(c.dataset.vis);
      R.ui.visible = R.RESOURCES.filter((r) => cur.has(r.id)).map((r) => r.id);
      R.render();
    }));
    const f = $('#sd-find', side); if (f) f.onclick = () => R.go('slots');
    const w = $('#sd-wl', side); if (w) w.onclick = () => R.go('warteliste');
  }

  /* ---------------------------------------------------------------- notifications (A16) */
  function openNotifs() {
    const pop = $('#notif-panel');
    if (!pop.hidden) { pop.hidden = true; return; }
    const list = R.myNotifs().slice(0, 30);
    const imp = list.filter((n) => R.NOTIF_KINDS[n.kind].level === 'wichtig'), hint = list.filter((n) => R.NOTIF_KINDS[n.kind].level !== 'wichtig');
    const item = (n) => `<button class="nf ${n.read[R.ui.role] ? '' : 'new'} lvl-${R.NOTIF_KINDS[n.kind].level}" data-n="${n.id}">${icon(n.kind === 'verzug' ? 'clock' : n.kind === 'absage' ? 'alert' : n.kind === 'angebot' ? 'send' : n.kind === 'unterlagen' ? 'doc' : n.kind === 'reserve' ? 'lightning' : 'bell')}<span><b>${esc(n.text)}</b><small>${esc(R.relDay(n.at.slice(0, 10)))} ${esc(n.at.slice(11))} · ${esc(R.NOTIF_KINDS[n.kind].label)}</small></span></button>`;
    pop.innerHTML = `<header><b>Benachrichtigungen</b><button class="link" id="nf-set">${icon('gear', 'i-inline')} Einstellen</button></header>
      ${imp.length ? `<p class="nf-h">Wichtig</p>${imp.map(item).join('')}` : ''}
      ${hint.length ? `<p class="nf-h">Hinweise</p>${hint.map(item).join('')}` : ''}
      ${list.length ? '' : '<p class="empty">Keine Meldungen für Ihre Rolle.</p>'}
      <p class="nf-foot">Nur Meldungen, bei denen Ihre Rolle handeln muss.</p>`;
    pop.hidden = false;
    $$('[data-n]', pop).forEach((b) => (b.onclick = () => {
      const n = R.db.notifs.find((x) => x.id === b.dataset.n);
      pop.hidden = true;
      if (n.appt && R.appt(n.appt)) { const a = R.appt(n.appt); R.ui.date = a.day; if (n.page && R.role().pages.includes(n.page)) R.go(n.page); else R.go(R.role().pages.includes('kalender') ? 'kalender' : R.role().pages[0]); R.openAppt(a.id); }
      else if (n.page && R.role().pages.includes(n.page)) R.go(n.page);
      else if (n.kind === 'verzug') R.go('tag');
    }));
    $('#nf-set', pop).onclick = () => { pop.hidden = true; openSettings(); };
    R.mutate(() => R.myNotifs().forEach((n) => (n.read[R.ui.role] = 1)));
    renderTop();
  }
  R.onNotify = function (n) {
    if (R.booting) return;
    const lvl = R.NOTIF_KINDS[n.kind].level;
    if (lvl === 'wichtig') R.toast(n.text, { tone: 'warn', ms: 8000, action: n.appt ? { label: 'Öffnen', fn: () => { const a = R.appt(n.appt); if (a) { R.ui.date = a.day; R.openAppt(a.id); } } } : n.kind === 'verzug' ? { label: 'Ansehen', fn: () => R.go('tag') } : null });
    renderTop();
  };

  /* background checks: delay threshold (A06), released reserves (A07), daily hints */
  function checks() {
    const n = R.now();
    const seen = R.db.verzugSeen || (R.db.verzugSeen = {});
    for (const r of R.RESOURCES) {
      if (!R.day(n.day).some((a) => a.res === r.id && R.isPatient(a))) continue;
      const d = R.delayInfo(r.id).delay;
      const lvl = d >= r.threshold ? Math.floor((d - r.threshold) / 15) : -1;
      const key = r.id + '|' + n.day;
      if (lvl > (seen[key] ?? -1)) {
        seen[key] = lvl;
        R.notify('verzug', `Verzug ${d} Min. · ${r.kind === 'arzt' ? 'Sprechstunde ' : ''}${r.short} (Schwelle ${r.threshold} Min.)`, { dept: r.dept, page: 'tag' });
      } else if (lvl < (seen[key] ?? -1)) { seen[key] = lvl; R.saveDb(true); }
    }
    const rs = R.db.reserveSeen || (R.db.reserveSeen = {});
    for (let i = 0; i <= 1; i++) {
      for (const a of R.day(R.addDays(n.day, i))) {
        if (a.kind === 'reserve' && a.st !== 'abgesagt' && R.reserveReleased(a) && R.until(a.day, a.s) > 0 && !rs[a.id]) {
          rs[a.id] = 1;
          const res = R.res(a.res);
          R.notify('reserve', `Reserve-Slot ${res.short} ${R.relDay(a.day)} ${tm(a.s)} nicht gebraucht und zur Vergabe freigegeben.`, { dept: res.dept, page: 'warteliste' });
        }
      }
    }
    const daily = R.db.daily || (R.db.daily = {});
    if (daily.day !== n.day) {
      daily.day = n.day;
      const t = R.docTasks().length;
      const un = R.reminderSet().filter((a) => a.conf === 'gesendet' && a.st === 'geplant').length;
      if (t) R.notify('unterlagen', `${t} Termine in den nächsten 3 Arbeitstagen mit fehlenden Unterlagen.`, { page: 'aufgaben' });
      if (un) R.notify('erinnerung', `${un} Termine in den nächsten 48 Stunden sind nicht bestätigt.`, { page: 'aufgaben' });
      for (const a of R.openGaps().filter((g) => g.kind === 'absage')) R.notify('absage', `Absage ${R.res(a.a.res).short}, ${R.relDay(a.slot.day)} ${tm(a.slot.s)} (${a.a.cx.by}) · Slot noch frei`, { appt: a.a.id, dept: R.res(a.a.res).dept, page: 'warteliste' });
    }
  }

  /* ---------------------------------------------------------------- search */
  function bindSearch() {
    const q = $('#q'), out = $('#q-res');
    const run = () => {
      const s = R.fold(q.value.trim());
      if (s.length < 2) { out.hidden = true; return; }
      const role = R.role();
      const hits = [];
      const ap = R.db.appts.find((a) => R.fold(a.no) === s || R.fold(a.no) === 't-' + s);
      if (ap && R.inScope(R.res(ap.res))) hits.push({ a: ap, label: `${ap.no} · ${R.patLabel(ap)}`, sub: `${R.fdate(ap.day, { wd: true })} ${tm(ap.s)} · ${R.res(ap.res).short}` });
      if (!role.anon) {
        const n = R.now();
        for (const p of R.db.patients) {
          if (hits.length > 7) break;
          if (!R.fold(`${p.last} ${p.first} ${p.first} ${p.last} ${p.pid}`).includes(s)) continue;
          const appts = R.db.appts.filter((a) => a.pat === p.id && R.inScope(R.res(a.res)) && a.st !== 'abgesagt').sort((x, y) => (x.day + R.pad(x.s)).localeCompare(y.day + R.pad(y.s)));
          const next = appts.find((a) => a.day >= n.day) || appts[appts.length - 1];
          const wl = R.db.waitlist.find((w) => w.pat === p.id && w.st !== 'entfernt' && R.inScope(w.dept));
          if (!next && !wl) continue;
          hits.push({ a: next, wl, label: R.ui.privacy ? `${R.initials(p.first, p.last)} · ${p.pid}` : `${p.last} ${p.first}`, sub: next ? `${next.day >= n.day ? 'Nächster Termin' : 'Letzter Termin'} ${R.fdate(next.day, { wd: true })} ${tm(next.s)} · ${R.type(next.type).name}` : `Warteliste · ${R.dept(wl.dept).name}` });
        }
      }
      out.innerHTML = hits.map((h, i) => `<button class="q-hit" data-i="${i}">${icon(h.a ? 'cal' : 'queue')}<span><b>${esc(h.label)}</b><small>${esc(h.sub)}</small></span></button>`).join('') || `<p class="empty">${role.anon ? 'Ihre Rolle sieht keine Patientendaten. Suche nach Terminnummer möglich.' : 'Nichts gefunden.'}</p>`;
      out.hidden = false;
      $$('.q-hit', out).forEach((b) => (b.onclick = () => {
        const h = hits[+b.dataset.i];
        out.hidden = true; q.value = '';
        R.audit('Suche', h.a ? h.a.no : 'Warteliste');
        if (h.a) { R.ui.date = h.a.day; R.go(R.role().pages.includes('kalender') ? 'kalender' : R.role().pages[0]); R.openAppt(h.a.id); }
        else R.go('warteliste');
      }));
    };
    q.addEventListener('input', R.debounce(run, 120));
    q.addEventListener('focus', run);
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = $('.q-hit', out); if (f) f.click(); } if (e.key === 'Escape') { out.hidden = true; q.blur(); } });
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.tb-search')) out.hidden = true;
      if (!e.target.closest('#notif-panel, #tb-bell')) $('#notif-panel').hidden = true;
      if (!e.target.closest('#user-menu, #tb-user')) $('#user-menu').hidden = true;
    });
  }

  /* ---------------------------------------------------------------- user menu + roles (A11, A13) */
  function openUser() {
    const pop = $('#user-menu');
    if (!pop.hidden) { pop.hidden = true; return; }
    const role = R.role();
    pop.innerHTML = `<div class="um-h"><b>${esc(role.user)}</b><small>${esc(role.label)}</small><span class="chip tone-ok">${icon('shield')}Spitalkonto · SSO mit 2FA</span></div>
      <p class="nf-h">Rolle wechseln (Demo)</p>
      ${Object.entries(R.ROLES).map(([k, r]) => `<button class="um-r${k === R.ui.role ? ' on' : ''}" data-role="${k}"><span><b>${esc(r.label)}</b><small>${esc(r.user)} · ${r.scope === 'all' ? 'alle Kliniken' : r.scope.map((d) => R.dept(d).name).join(', ')}${r.anon ? ' · anonymisiert' : ''}</small></span>${k === R.ui.role ? icon('check') : ''}</button>`).join('')}
      <footer><button class="btn btn-ghost sm" id="um-set">${icon('gear')}Einstellungen</button><button class="btn btn-ghost sm" id="um-lock">${icon('lock')}Sperren</button></footer>`;
    pop.hidden = false;
    $$('[data-role]', pop).forEach((b) => (b.onclick = () => { pop.hidden = true; switchRole(b.dataset.role); }));
    $('#um-set', pop).onclick = () => { pop.hidden = true; openSettings(); };
    $('#um-lock', pop).onclick = () => { pop.hidden = true; R.lock(true); };
  }
  function switchRole(k) {
    if (k === R.ui.role) return;
    R.ui.role = k;
    const role = R.role();
    R.ui.visible = role.visible.slice();
    R.ui.dayRes = null;
    R.audit('Anmeldung (SSO, Rolle aus LUKiS)', role.label);
    R.toast(`Angemeldet als ${role.user} · ${role.label}`);
    R.go(role.pages.includes(R.ui.page) ? R.ui.page : role.pages[0]);
  }

  /* ---------------------------------------------------------------- settings */
  function openSettings() {
    const role = R.role();
    const body = R.h(`<div class="form settings">
      <section><h3 class="h3">Benachrichtigungen für «${esc(role.label)}»</h3><p class="muted small">Wichtige Meldungen erscheinen zusätzlich als Hinweis am Bildschirmrand.</p>
        <div class="chk-grid">${Object.entries(R.NOTIF_KINDS).map(([k, n]) => `<label class="switch"><input type="checkbox" data-nk="${k}" ${R.notifOn(k) ? 'checked' : ''}><span class="sw-ui"></span><span>${esc(n.label)} <small class="muted">${n.level}</small></span></label>`).join('')}</div></section>
      <section><h3 class="h3">Verzugsschwellen</h3><div class="thr-grid">${R.RESOURCES.filter((r) => R.inScope(r)).map((r) => `<label class="fld row"><span><i class="sw" style="--c:${r.color}"></i>${esc(r.short)}</span><input type="number" min="5" max="90" step="5" value="${r.threshold}" data-th="${r.id}"> Min.</label>`).join('')}</div></section>
      <section class="grid2"><label class="fld"><span>Automatische Sperre nach Inaktivität</span><select id="st-lock">${[1, 3, 5, 10, 15].map((m) => `<option value="${m}" ${R.ui.lockMin === m ? 'selected' : ''}>${m} Min.</option>`).join('')}</select></label>
        <label class="fld"><span>Design</span><select id="st-theme"><option value="system" ${R.ui.theme === 'system' ? 'selected' : ''}>Wie System</option><option value="light" ${R.ui.theme === 'light' ? 'selected' : ''}>Hell</option><option value="dark" ${R.ui.theme === 'dark' ? 'selected' : ''}>Dunkel</option></select></label></section>
      <section><label class="switch"><input type="checkbox" id="st-demo" ${R.ui.demoClock ? 'checked' : ''}><span class="sw-ui"></span><span>Demo-Uhr: ausserhalb der Sprechstundenzeit auf 10:20 am nächsten Werktag springen</span></label></section>
    </div>`);
    R.modal({ title: 'Einstellungen', body, wide: true, actions: [{ label: 'Abbrechen' }, { label: 'Speichern', primary: true, fn: (el) => {
      const own = (R.ui.notif[R.ui.role] = {});
      $$('[data-nk]', el).forEach((c) => (own[c.dataset.nk] = c.checked ? 1 : 0));
      R.ui.thresholds = R.ui.thresholds || {};
      $$('[data-th]', el).forEach((i) => { const v = Math.max(5, Math.min(90, +i.value || 20)); R.res(i.dataset.th).threshold = v; R.ui.thresholds[i.dataset.th] = v; });
      R.ui.lockMin = +$('#st-lock', el).value;
      R.ui.theme = $('#st-theme', el).value; applyTheme();
      const demo = $('#st-demo', el).checked;
      if (demo !== R.ui.demoClock) { R.ui.demoClock = demo; R.clockOffset = demo ? R.demoOffset() : 0; if (R.db.generatedFor !== R.now().day) { R.db = R.generate(); R.reindex(); R.saveDb(); } }
      R.audit('Einstellungen geändert', '');
      R.toast('Einstellungen gespeichert.');
      R.render();
    } }] });
  }
  async function resetDemo() {
    if (!(await R.confirmBox('Demo-Daten zurücksetzen?', 'Alle Änderungen dieser Demo (Buchungen, Status, Warteliste, Protokoll) werden verworfen und neu erzeugt.', 'Zurücksetzen', 'bad'))) return;
    R.db = R.generate(); R.reindex(); R.saveDb();
    R.closePeek(); R.toast('Demo-Daten neu erzeugt.'); R.render();
  }

  /* ---------------------------------------------------------------- help */
  function openGuide() {
    R.modal({ title: 'Kurzanleitung', wide: true, body: `<div class="guide">
      <section><h3>${icon('list')} Tagesübersicht</h3><p>Alle Termine des Tages mit Ampel und Status. Mit dem Knopf rechts setzen Sie den nächsten Status (angekommen → wartet → in Behandlung → fertig). Änderungen sehen alle Bildschirme sofort.</p></section>
      <section><h3>${icon('cal')} Kalender</h3><p>Wie in Outlook: Ansicht oben wählen, links Kalender ein- und ausblenden. Termine ziehen zum Verschieben, unten am Termin ziehen für die Dauer, in eine freie Fläche ziehen für einen neuen Termin.</p></section>
      <section><h3>${icon('slots')} Freie Slots</h3><p>Fachgebiet und Termintyp wählen, der nächste passende Termin steht zuoberst. Für Dringliche (48 h) die Reserve-Slots einbeziehen. Kombitermine planen mehrere Stellen am selben Tag in fester Reihenfolge.</p></section>
      <section><h3>${icon('queue')} Absage und Nachrücken</h3><p>Termin öffnen → Absagen. Das System schlägt passende Personen von der Warteliste vor. «Angebot senden» schickt SMS oder MeinLUKS-Nachricht, die Antwort kommt automatisch zurück.</p></section>
      <section><h3>${icon('shield')} Datenschutz</h3><p>Die Datenschutz-Ansicht (Ansicht → Datenschutz) zeigt nur Initialen und Terminnummern. Nach ${R.ui.lockMin} Min. ohne Eingabe sperrt sich der Arbeitsplatz. Jeder Zugriff wird protokolliert.</p></section>
      <section><h3>${icon('sync')} LUKiS</h3><p>LUKiS bleibt das führende System. Das Terminradar liest Termine und schreibt nur bestätigte Buchungen zurück. Bei einem Ausfall: Tagesliste drucken und in LUKiS weiterarbeiten.</p></section></div>` });
  }
  function openKeys() {
    const k = [['N', 'Neuer Termin'], ['T', 'Heute'], ['← / →', 'Zurück / weiter'], ['1 – 5', 'Tag, Arbeitswoche, Woche, Monat, Ressourcen'], ['/', 'Suchen'], ['G dann K/T/S/W/A', 'Gehe zu Kalender, Tagesübersicht, Slots, Warteliste, Aufgaben'], ['Esc', 'Schliessen'], ['?', 'Diese Hilfe']];
    R.modal({ title: 'Tastenkürzel', body: `<table class="tbl keys">${k.map(([a, b]) => `<tr><td><kbd>${a}</kbd></td><td>${b}</td></tr>`).join('')}</table>` });
  }
  function openReq() {
    const rows = [
      ['A01', 'Tagesübersicht auf einen Blick', 'Tagesübersicht: kompakte Liste (30 Zeilen auf 24″), Zeitleiste nach Ressource'],
      ['A02', 'Status in Echtzeit', 'Status-Schritte im Termin und in der Liste; Live-Abgleich zwischen Fenstern/Bildschirmen'],
      ['A03', 'Freie Termine schnell finden', 'Freie Slots: Filter Fachgebiet, Typ, Dauer, Ärztin, Standort, Zeitraum; Suchzeit wird angezeigt'],
      ['A04', 'Kombitermine', 'Freie Slots → Kombitermin: Reihenfolge, Mindestabstand, mehrere Varianten pro Tag'],
      ['A05', 'Warteliste und Nachrücken', 'Absage → Vorschläge nach Dringlichkeit und Wartedauer → Angebot per SMS/MeinLUKS mit automatischer Antwort'],
      ['A06', 'Verzug früh erkennen', 'Verzugsberechnung je Sprechstunde, Schwelle einstellbar, Meldung und SMS an nächste Patientinnen'],
      ['A07', 'Dringlichkeit einheitlich', 'Drei Stufen überall farbig; Reserve-Slots werden 24 h vorher freigegeben'],
      ['A08', 'Unterlagen-Check', 'Ampel je Termin; Aufgabenliste für die nächsten 3 Arbeitstage'],
      ['A09', 'Erinnerungen gegen No-Shows', 'Erinnerung 48 h vorher, unbestätigte markiert, Doppelbelegung, Absage löst A05 aus'],
      ['A10', 'Kennzahlen', 'Cockpit pro Klinik und Woche; Excel-Export ohne Personendaten'],
      ['A11', 'Rollenbasierte Ansichten', 'Rollen wechseln im Benutzermenü; andere Kliniken nur als «Belegt»'],
      ['A12', 'Datenschutz', 'Datenschutz-Ansicht, Wandbildschirm mit Terminnummern, Sperre nach Inaktivität, Zugriffsprotokoll'],
      ['A13', 'Anbindung an LUKiS', 'Simuliert: Buchungen werden «in LUKiS übernommen», Anmeldung über Spitalkonto'],
      ['A14', 'Einfache Bedienung', 'Deutsch, Outlook-ähnlich, häufige Aufgaben mit 1–2 Klicks'],
      ['A15', 'Tablet und Diensthandy', 'Responsive bis 360 px, Touch-Ziele ab 44 px'],
      ['A16', 'Gezielte Benachrichtigungen', 'Pro Rolle einstellbar, «Wichtig» getrennt von «Hinweisen», Klick führt zum Termin'],
      ['A17', 'Verfügbarkeit, Notfallbetrieb', 'Statische App ohne Server, Tagesliste druckbar, LUKiS als Rückfallebene'],
    ];
    R.modal({ title: 'Anforderungen A01–A17 im Prototyp', wide: true, body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nr.</th><th>Anforderung</th><th>Umsetzung</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="muted">${r[2]}</td></tr>`).join('')}</tbody></table></div>` });
  }

  /* ---------------------------------------------------------------- lock (A12) */
  let lastInput = Date.now();
  R.lock = function (manual) {
    const el = $('#lock');
    if (!el.hidden) return;
    const role = R.role();
    el.innerHTML = `<div class="lock-card"><span class="brand-mark lg"></span><h2>Arbeitsplatz gesperrt</h2><p class="muted">${manual ? 'Manuell gesperrt' : `Nach ${R.ui.lockMin} Min. ohne Eingabe gesperrt`} · ${esc(role.user)}</p><button class="btn btn-primary" id="unlock">${icon('unlock')}Mit Spitalkonto entsperren</button><p class="muted small" id="lock-msg">Anmeldung über Single Sign-on mit Zwei-Faktor-Bestätigung</p></div>`;
    el.hidden = false;
    document.body.classList.add('locked');
    R.closePeek();
    $$('.modal-bg').forEach((m) => m.close && m.close());
    R.audit(manual ? 'Arbeitsplatz gesperrt' : 'Automatische Sperre', '');
    $('#unlock').onclick = () => {
      $('#lock-msg').textContent = 'Bestätigung auf dem Diensthandy …';
      $('#unlock').disabled = true;
      setTimeout(() => { el.hidden = true; document.body.classList.remove('locked'); lastInput = Date.now(); R.audit('Entsperrt (SSO, 2FA)', ''); R.render(); }, 900);
    };
    setTimeout(() => $('#unlock').focus(), 50);
  };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => (lastInput = Date.now()), { passive: true }));

  /* ---------------------------------------------------------------- keyboard */
  let gPrefix = false;
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.body.classList.contains('locked') || $('.modal-bg')) return;
    const k = e.key;
    if (gPrefix) {
      gPrefix = false;
      const map = { k: 'kalender', t: 'tag', s: 'slots', w: 'warteliste', a: 'aufgaben', z: 'kennzahlen' };
      if (map[k] && R.role().pages.includes(map[k])) { R.go(map[k]); e.preventDefault(); }
      return;
    }
    if (k === 'g') { gPrefix = true; setTimeout(() => (gPrefix = false), 1200); return; }
    if (k === 'Escape') { R.closePeek(); return; }
    if (k === '/') { e.preventDefault(); $('#q').focus(); return; }
    if (k === '?') { openKeys(); return; }
    if (k === 'n' && R.can('book')) { e.preventDefault(); R.openEditor({ day: R.ui.date >= R.now().day ? R.ui.date : R.now().day, s: nextQuarter() }); return; }
    if (k === 't') { R.ui.date = R.now().day; R.calScroll = undefined; R.render(); return; }
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && (R.ui.page === 'kalender' || R.ui.page === 'tag')) {
      if (R.ui.page === 'kalender') R.calStep(k === 'ArrowLeft' ? -1 : 1); else { let d = R.addDays(R.ui.date, k === 'ArrowLeft' ? -1 : 1); while (!R.isWeekday(d)) d = R.addDays(d, k === 'ArrowLeft' ? -1 : 1); R.ui.date = d; }
      R.render(); return;
    }
    const v = { 1: 'day', 2: 'workweek', 3: 'week', 4: 'month', 5: 'resources' }[k];
    if (v) { R.ui.view = v; if (R.ui.page !== 'kalender') R.go('kalender'); else R.render(); }
  });

  /* ---------------------------------------------------------------- theme */
  function applyTheme() {
    if (R.ui.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', R.ui.theme);
  }

  /* ---------------------------------------------------------------- boot */
  function canRefresh() {
    const ae = document.activeElement;
    return !$('.modal-bg') && !document.body.classList.contains('is-dragging') && !document.body.classList.contains('locked') && !(ae && ae.closest && ae.closest('#main input, #main select, #main textarea, .tb-search'));
  }
  function boot() {
    R.loadDb();
    for (const [id, v] of Object.entries(R.ui.thresholds || {})) if (R.res(id)) R.res(id).threshold = v;
    if (!R.ui.date || R.ui.date < R.addDays(R.now().day, -60)) R.ui.date = R.now().day;
    if (R.fresh) R.ui.date = R.now().day;
    if (!R.ui.visible) R.ui.visible = R.role().visible.slice();
    if (window.innerWidth < 760 && ['workweek', 'week'].includes(R.ui.view)) R.ui.view = 'day';
    if (!R.isWeekday(R.ui.date) && R.ui.view === 'day' && !R.ui.showWeekend) R.ui.date = R.now().day;
    const hp = location.hash.slice(1);
    if (PAGES[hp]) R.ui.page = hp;
    if (!R.role().pages.includes(R.ui.page)) R.ui.page = R.role().pages[0];
    applyTheme();
    document.body.classList.toggle('side-closed', !R.ui.sideOpen);
    $('#tb-bell').onclick = openNotifs;
    $('#tb-user').onclick = openUser;
    $('#tb-gear').onclick = openSettings;
    $('#tb-lock').onclick = () => R.lock(true);
    $('#tb-clock').onclick = openSettings;
    $('#tb-apps').onclick = () => R.toast('LUKiS, MeinLUKS-Admin und LUKSLink öffnen sich im Spitalnetz.', { tone: 'warn' });
    $('#side-scrim').onclick = () => document.body.classList.remove('side-drawer');
    bindSearch();
    R.lastSync = Date.now();
    R.audit('Anmeldung (SSO, Rolle aus LUKiS)', R.role().label);
    R.booting = true;
    checks();
    R.booting = false;
    R.render();
    if (R.fresh) R.toast('Demo-Daten für heute neu erzeugt.');

    R.onRemoteChange = () => { if (canRefresh()) R.render(); else renderTop(); };
    R.onLocalChange = () => renderTop();
    setInterval(() => {
      checks();
      if (canRefresh() && ['kalender', 'tag', 'wand', 'warteliste'].includes(R.ui.page)) R.render(); else renderTop();
    }, 15000);
    setInterval(() => {
      if (document.body.classList.contains('wall-mode') || R.ui.page === 'wand') { lastInput = Date.now(); return; }
      if (Date.now() - lastInput > R.ui.lockMin * 60000) R.lock(false);
    }, 5000);
    setInterval(() => { R.lastSync = Date.now(); }, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
