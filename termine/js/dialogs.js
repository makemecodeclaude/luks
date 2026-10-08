/* LUKS Terminradar – detail panel, editor, gap filler, confirmations, toasts and actions */
(function () {
  'use strict';
  const R = window.R;
  const { $, $$, esc, icon, tm } = R;

  /* ---------------------------------------------------------------- toast */
  R.toast = function (msg, o = {}) {
    const host = $('#toasts');
    const el = R.h(`<div class="toast tone-${o.tone || 'ok'}" role="status">${icon(o.tone === 'bad' ? 'alert' : o.tone === 'warn' ? 'info' : 'check')}<span>${esc(msg)}</span>${o.action ? `<button class="toast-act">${esc(o.action.label)}</button>` : ''}<button class="toast-x" aria-label="Schliessen">${icon('x')}</button></div>`);
    host.appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.querySelector('.toast-x').onclick = kill;
    if (o.action) el.querySelector('.toast-act').onclick = () => { o.action.fn(); kill(); R.render(); };
    setTimeout(kill, o.ms || (o.action ? 7000 : 4200));
  };

  /* ---------------------------------------------------------------- modal */
  R.modal = function ({ title, body, actions = [], wide, onClose, cls = '' }) {
    const el = R.h(`<div class="modal-bg"><div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="modal-h"><h2>${esc(title)}</h2><button class="icon-btn" data-x aria-label="Schliessen">${icon('x')}</button></header>
      <div class="modal-b"></div>
      ${actions.length ? `<footer class="modal-f">${actions.map((a, i) => `<button class="btn ${a.primary ? 'btn-primary' : a.tone === 'bad' ? 'btn-bad' : 'btn-ghost'}" data-a="${i}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`).join('')}</footer>` : ''}
    </div></div>`);
    const b = el.querySelector('.modal-b');
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    document.body.appendChild(el);
    const close = () => { el.remove(); document.removeEventListener('keydown', key); if (onClose) onClose(); };
    const key = (e) => { if (e.key === 'Escape' && document.body.lastElementChild === el) close(); };
    document.addEventListener('keydown', key);
    el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
    el.querySelector('[data-x]').onclick = close;
    $$('[data-a]', el).forEach((btn) => (btn.onclick = () => { const r = actions[+btn.dataset.a].fn ? actions[+btn.dataset.a].fn(el) : undefined; if (r !== false) close(); }));
    const f = el.querySelector('input:not([type=hidden]), select, textarea, .btn-primary');
    if (f) setTimeout(() => f.focus(), 30);
    el.close = close;
    return el;
  };
  R.confirmBox = function (title, text, okLabel, tone) {
    return new Promise((res) => {
      let done = false;
      R.modal({ title, body: `<p class="muted">${esc(text)}</p>`, actions: [{ label: 'Abbrechen', fn: () => {} }, { label: okLabel, primary: tone !== 'bad', tone, fn: () => { done = true; res(true); } }], onClose: () => { if (!done) res(false); } });
    });
  };

  /* ---------------------------------------------------------------- chips */
  R.statusChip = (st) => { const s = R.STATUS[st]; return `<span class="chip tone-${s.tone}">${icon(s.icon)}${s.label}</span>`; };
  R.urgChip = (u, short) => { const x = R.URGENCY[u]; return x ? `<span class="chip urg tone-${x.tone}" title="${x.label}"><i class="dot-i"></i>${short ? x.short : x.label}</span>` : ''; };
  R.docsChips = (a) => R.DOCS.filter((d) => a.docs && a.docs[d.id] !== null && a.docs[d.id] !== undefined).map((d) => `<span class="doc-c ${a.docs[d.id] ? 'ok' : 'miss'}" title="${d.label}: ${a.docs[d.id] ? 'bereit' : 'fehlt'}">${icon(a.docs[d.id] ? 'check' : 'x')}${d.label}</span>`).join('');

  /* ---------------------------------------------------------------- status (A02) */
  R.setStatus = function (a, st) {
    if (!R.can('status')) { R.toast('Ihre Rolle hat nur Leserechte.', { tone: 'warn' }); return; }
    const m = Math.floor(R.now().min);
    R.mutate(() => {
      a.st = st;
      if (st === 'geplant') { delete a.ta; delete a.ts; delete a.te; }
      if (st === 'angekommen' || st === 'wartet') { a.ta = a.ta ?? m; delete a.ts; delete a.te; }
      if (st === 'behandlung') { a.ta = a.ta ?? m; a.ts = m; delete a.te; }
      if (st === 'fertig') { a.ts = a.ts ?? m; a.te = m; }
    }, { action: 'Status: ' + R.STATUS[st].label, target: a.no });
    R.toast(`${a.no} · ${R.STATUS[st].label}`, { tone: st === 'noshow' ? 'warn' : 'ok' });
    R.render();
  };
  R.nextStatus = (a) => { const i = R.FLOW.indexOf(a.st); return i >= 0 && i < R.FLOW.length - 1 ? R.FLOW[i + 1] : null; };

  /* ---------------------------------------------------------------- detail panel */
  R.openAppt = function (id) {
    const a = R.appt(id);
    if (!a) return;
    const reopen = R.peekId === id;
    R.peekId = id;
    const res = R.res(a.res);
    const sees = R.seesPatient(a);
    if (R.isPatient(a) && sees && !reopen) R.audit('Termin geöffnet', a.no);
    const p = R.isPatient(a) ? R.pat(a.pat) : null;
    const di = a.day === R.now().day ? R.delayInfo(a.res) : null;
    const proj = di && di.proj[a.id];
    const canStatus = R.can('status') && R.inScope(res);
    const canEdit = R.can('edit') && R.inScope(res);
    const st = R.STATUS[a.st];
    const future = R.until(a.day, a.s) > 0;
    const peek = $('#peek');

    let html = `<header class="peek-h" style="--c:${res.color}">
        <div><p class="eyebrow">${a.kind === 'pat' ? esc(R.type(a.type).name) : a.kind === 'reserve' ? 'Reserve-Slot' : 'Blocker'}</p>
        <h2>${esc(R.patLabel(a))}</h2></div>
        <button class="icon-btn" id="peek-x" aria-label="Schliessen">${icon('x')}</button></header>
      <div class="peek-b">
      <div class="kv">
        <span>${icon('cal')}</span><div><b>${R.flong(a.day)}</b><br>${a.allDay ? 'ganztags' : `${tm(a.s)}–${tm(a.s + a.d)} · ${a.d} Min.`}${proj && proj - a.s >= 5 ? `<br><span class="txt-warn">voraussichtlich ${tm(proj)} (+${Math.round(proj - a.s)} Min.)</span>` : ''}</div>
        <span>${icon(res.kind === 'arzt' ? 'stetho' : res.kind === 'raum' ? 'room' : 'device')}</span><div><b>${esc(res.name)}</b><br>${esc(R.dept(res.dept).name)} · ${esc(R.site(res.site).name)} · ${esc(res.room)}</div>`;
    if (p && sees) {
      html += `<span>${icon('user')}</span><div><b>${R.ui.privacy ? esc(R.initials(p.first, p.last)) : esc(p.last + ' ' + p.first)}</b><br>${R.ui.privacy ? '' : `geb. ${esc(p.born)} · `}${esc(p.pid)} · ${esc(a.no)}<br>${R.ui.privacy ? '' : `${icon('phone', 'i-inline')} ${esc(p.phone)} · `}Kanal: ${esc(a.channel || p.channel)}</div>`;
    } else if (a.kind === 'pat') {
      html += `<span>${icon('shield')}</span><div class="muted">Patientendaten ausgeblendet: Ihre Rolle hat keinen Behandlungs- oder Planungsbezug zu dieser Klinik.</div>`;
    }
    html += `</div>`;

    if (a.kind === 'pat') {
      html += `<div class="row-chips">${R.statusChip(a.st)}${R.urgChip(a.urg)}${a.combo ? `<span class="chip">${icon('combo')}Kombitermin</span>` : ''}</div>`;
      if (a.st !== 'abgesagt') {
        html += `<section class="pk-sec"><h3>Status</h3><div class="stepper">${R.FLOW.map((s, i) => {
          const cur = R.FLOW.indexOf(a.st);
          return `<button class="step ${s === a.st ? 'on' : i < cur ? 'done' : ''}" data-st="${s}" ${canStatus ? '' : 'disabled'}>${icon(R.STATUS[s].icon)}<span>${R.STATUS[s].label}</span></button>`;
        }).join('')}</div>
        <div class="st-times muted">${a.ta !== undefined ? `Ankunft ${tm(a.ta)}` : ''}${a.ts !== undefined ? ` · Beginn ${tm(a.ts)}` : ''}${a.te !== undefined ? ` · Ende ${tm(a.te)}` : ''}${a.ta !== undefined && a.ts === undefined && a.day === R.now().day ? ` · wartet seit ${Math.round(R.now().min - a.ta)} Min.` : ''}</div>
        ${canStatus && a.st !== 'noshow' && a.st !== 'fertig' ? `<button class="btn btn-ghost sm" data-st="noshow">${icon('x')}Nicht erschienen</button>` : ''}
        ${a.sms ? `<p class="note-s">${icon('sms')} SMS ${a.sms.at.slice(11)}: neue voraussichtliche Zeit ${tm(a.sms.eta)}</p>` : ''}</section>`;
      } else if (a.cx) {
        html += `<section class="pk-sec"><h3>Absage</h3><p class="muted">${esc(a.cx.at.slice(11))} · ${esc(a.cx.by)}${a.cx.reason ? ' · ' + esc(a.cx.reason) : ''}</p>${a.cx.refill ? `<p class="txt-ok">${icon('check', 'i-inline')} Slot wiederbesetzt</p>` : future && R.can('waitlist') ? `<button class="btn btn-primary sm" id="pk-fill">${icon('queue')}Nachrücker vorschlagen</button>` : ''}</section>`;
      }
      if (a.docs && sees) {
        html += `<section class="pk-sec"><h3>Unterlagen-Check <span class="amp tone-${R.docTone(a)}"></span></h3><div class="docs-list">${R.DOCS.map((d) => {
          const v = a.docs[d.id];
          if (v === null || v === undefined) return d.id === 'dol' ? '' : '';
          return `<label class="chk"><input type="checkbox" data-doc="${d.id}" ${v ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><span>${d.label}${d.id === 'dol' && p && p.lang ? ' (' + esc(p.lang) + ')' : ''}</span></label>`;
        }).join('')}</div></section>`;
      }
      if (future && a.st === 'geplant') {
        const cmap = { bestaetigt: ['ok', 'check', 'Bestätigt'], gesendet: ['warn', 'help', 'Erinnerung gesendet, unbestätigt'], abgesagt: ['bad', 'x', 'Per Erinnerung abgesagt'] };
        const c = cmap[a.conf];
        html += `<section class="pk-sec"><h3>Erinnerung (48 h vorher)</h3>${c ? `<span class="chip tone-${c[0]}">${icon(c[1])}${c[2]}</span>` : '<span class="muted">Noch nicht versendet</span>'}
          ${canEdit ? `<div class="btn-row">${!a.conf ? `<button class="btn btn-ghost sm" id="pk-remind">${icon('send')}Jetzt erinnern</button>` : ''}${a.conf === 'gesendet' ? `<button class="btn btn-ghost sm" id="pk-confirm">${icon('phone')}Telefonisch bestätigt</button>` : ''}${a.conf === 'gesendet' ? `<button class="btn btn-ghost sm" id="pk-ob">${icon('layers')}${a.ob ? 'Doppelbelegung aufheben' : 'Doppelbelegung erlauben'}</button>` : ''}</div>` : ''}</section>`;
      }
      if (a.note && sees) html += `<section class="pk-sec"><h3>Notiz</h3><p>${esc(a.note)}</p></section>`;
      if (a.ref && sees) html += `<p class="muted small">Zuweisung vom ${R.fdate(a.ref)} · Wartezeit bis zum Termin ${R.daysBetween(a.ref, a.day)} Tage</p>`;
    }
    html += `<p class="lukis">${icon('sync')} LUKiS-Termin ${esc(a.no)} · führendes System</p></div>`;
    const acts = [];
    if (canEdit && a.st !== 'abgesagt' && a.st !== 'fertig') {
      acts.push(`<button class="btn btn-ghost" id="pk-edit">${icon('edit')}Bearbeiten</button>`);
      if (a.kind === 'pat' && future) acts.push(`<button class="btn btn-ghost" id="pk-move">${icon('swap')}Neuen Termin suchen</button>`);
      if (a.kind === 'pat' && future) acts.push(`<button class="btn btn-bad" id="pk-cancel">${icon('x')}Absagen</button>`);
      if (a.kind !== 'pat') acts.push(`<button class="btn btn-bad" id="pk-del">${icon('trash')}Entfernen</button>`);
    }
    if (canStatus && a.kind === 'pat' && R.nextStatus(a) && a.st !== 'abgesagt' && a.st !== 'noshow' && a.day === R.now().day) {
      acts.unshift(`<button class="btn btn-primary" data-st="${R.nextStatus(a)}">${icon('arrowR')}${R.STATUS[R.nextStatus(a)].label}</button>`);
    }
    html += acts.length ? `<footer class="peek-f">${acts.join('')}</footer>` : '';
    peek.innerHTML = html;
    peek.hidden = false;
    document.body.classList.add('peek-open');
    $('#peek-x').onclick = R.closePeek;
    $$('[data-st]', peek).forEach((b) => (b.onclick = () => { R.setStatus(a, b.dataset.st); R.openAppt(a.id); }));
    $$('[data-doc]', peek).forEach((c) => (c.onchange = () => { R.mutate(() => { a.docs[c.dataset.doc] = c.checked ? 1 : 0; }, { action: `Unterlagen: ${R.DOCS.find((d) => d.id === c.dataset.doc).label} ${c.checked ? 'bereit' : 'fehlt'}`, target: a.no }); R.render(); R.openAppt(a.id); }));
    const on = (sel, fn) => { const el = $(sel, peek); if (el) el.onclick = fn; };
    on('#pk-edit', () => R.openEditor({ edit: a.id }));
    on('#pk-move', () => { R.slotCtx = { move: a.id, type: a.type, dept: res.dept, site: res.site }; R.closePeek(); R.go('slots'); });
    on('#pk-cancel', () => R.askCancel(a));
    on('#pk-del', async () => { if (await R.confirmBox('Eintrag entfernen?', `«${a.title}» wird entfernt.`, 'Entfernen', 'bad')) { R.mutate((db) => { db.appts = db.appts.filter((x) => x !== a); }, { action: 'Blocker entfernt', target: a.title }); R.closePeek(); R.render(); } });
    on('#pk-fill', () => R.openGapFill({ res: a.res, day: a.day, s: a.s, d: a.d }, a));
    on('#pk-remind', () => { R.sendReminders([a]); R.openAppt(a.id); });
    on('#pk-confirm', () => { R.mutate(() => { a.conf = 'bestaetigt'; a.ob = false; }, { action: 'Termin telefonisch bestätigt', target: a.no }); R.render(); R.openAppt(a.id); });
    on('#pk-ob', () => { R.mutate(() => { a.ob = !a.ob; }, { action: a.ob ? 'Doppelbelegung aufgehoben' : 'Doppelbelegung erlaubt', target: a.no }); R.render(); R.openAppt(a.id); });
  };
  R.closePeek = () => { const p = $('#peek'); p.hidden = true; R.peekId = null; document.body.classList.remove('peek-open'); };

  /* ---------------------------------------------------------------- cancel (→ A05) */
  R.askCancel = function (a) {
    const body = R.h(`<div class="form"><p class="muted">${esc(R.patLabel(a))} · ${R.fdate(a.day, { wd: true })} ${tm(a.s)} · ${esc(R.res(a.res).short)}</p>
      <label class="fld"><span>Abgesagt durch</span><select id="cx-by"><option>Telefon</option><option>MeinLUKS</option><option>Zuweisende Praxis</option><option>Klinik (intern)</option></select></label>
      <label class="fld"><span>Grund (optional)</span><input id="cx-reason" type="text" placeholder="z. B. krank, Terminkollision"></label></div>`);
    R.modal({ title: 'Termin absagen', body, actions: [{ label: 'Zurück' }, { label: 'Absagen und Nachrücker suchen', tone: 'bad', fn: (el) => { R.cancelAppt(a, $('#cx-by', el).value, $('#cx-reason', el).value); } }] });
  };
  R.cancelAppt = function (a, by, reason, quiet) {
    const short = R.until(a.day, a.s) < 48 * 60;
    R.mutate(() => { a.st = 'abgesagt'; a.cx = { at: R.stamp(), by, reason: reason || '', short, refill: null, offers: [] }; }, { action: 'Termin abgesagt (' + by + ')', target: a.no });
    const res = R.res(a.res);
    const cands = R.candidates({ res: a.res, day: a.day, s: a.s, d: a.d });
    R.notify('absage', `Absage ${res.short}, ${R.relDay(a.day)} ${tm(a.s)} · ${cands.length} passende Nachrücker`, { appt: a.id, dept: res.dept, page: 'warteliste', silent: !quiet });
    R.closePeek();
    R.render();
    if (!quiet && R.can('waitlist')) R.openGapFill({ res: a.res, day: a.day, s: a.s, d: a.d }, a);
  };

  /* ---------------------------------------------------------------- gap filler (A05) */
  R.openGapFill = function (slot, cxAppt) {
    const res = R.res(slot.res);
    const t0 = Date.now();
    const draw = (el) => {
      const cands = R.candidates(slot).slice(0, 5);
      const pending = R.db.waitlist.filter((w) => w.st === 'angebot' && w.offerSlot && w.offerSlot.day === slot.day && w.offerSlot.s === slot.s && w.offerSlot.res === slot.res);
      const filled = cxAppt && cxAppt.cx && cxAppt.cx.refill;
      el.querySelector('.modal-b').innerHTML = `
        <div class="gap-slot" style="--c:${res.color}"><b>${R.flong(slot.day)}, ${tm(slot.s)}–${tm(slot.s + slot.d)}</b><span>${esc(res.name)} · ${esc(R.site(res.site).name)} · ${slot.d} Min.</span></div>
        ${filled ? `<p class="banner tone-ok">${icon('check')} Slot wiederbesetzt und in LUKiS gebucht.</p>` : ''}
        ${pending.map((w) => `<p class="banner tone-info">${icon('send')} Angebot an ${esc(R.wlName(w))} gesendet (${esc(w.offers[w.offers.length - 1].via)}) · wartet auf Antwort …</p>`).join('')}
        <h3 class="h3">Vorschläge von der Warteliste <small>sortiert nach Dringlichkeit und Wartedauer</small></h3>
        ${cands.length ? `<ol class="cands">${cands.map(({ w, wait }, i) => `<li class="cand">
          <span class="cand-n">${i + 1}</span>
          <div class="cand-b"><b>${esc(R.wlName(w))}</b> ${R.urgChip(w.urg)}<br><span class="muted">${esc(R.type(w.type).name)} · wartet seit ${wait} Tagen · ${esc(w.note)}</span></div>
          <div class="cand-a">${filled || pending.length ? '' : `<button class="btn btn-primary sm" data-offer="${w.id}" data-via="${esc(R.pat(w.pat).channel)}">${icon('send')}Angebot per ${esc(R.pat(w.pat).channel)}</button><button class="btn btn-ghost sm" data-book="${w.id}" title="Direkt buchen, z. B. nach telefonischer Zusage">${icon('check')}Direkt buchen</button>`}</div></li>`).join('')}</ol>`
        : '<p class="empty">Keine passende Person auf der Warteliste. Der Slot erscheint im Freie-Slots-Finder.</p>'}
        <p class="muted small">${icon('info', 'i-inline')} Das System schlägt vor, ein Mensch entscheidet. Die Antwort der Patientin kommt automatisch zurück; bei Zusage wird der Termin in LUKiS gebucht.</p>`;
      $$('[data-offer]', el).forEach((b) => (b.onclick = () => {
        const w = R.db.waitlist.find((x) => x.id === b.dataset.offer);
        R.sendOffer(w, slot, b.dataset.via, cxAppt, t0);
        draw(el);
      }));
      $$('[data-book]', el).forEach((b) => (b.onclick = () => {
        const w = R.db.waitlist.find((x) => x.id === b.dataset.book);
        R.bookFromWaitlist(w, slot, 'telefonisch');
        draw(el);
      }));
    };
    const el = R.modal({ title: 'Lückenfüller · freier Slot', body: '', wide: true, actions: [{ label: 'Schliessen' }], onClose: () => { R.gapRedraw = null; } });
    R.gapRedraw = () => { if (document.body.contains(el)) draw(el); };
    draw(el);
  };
  R.wlName = (w) => { const p = R.pat(w.pat); return R.ui.privacy || R.role().anon ? `${R.initials(p.first, p.last)} · ${p.pid}` : `${p.last} ${p.first}`; };

  R.sendOffer = function (w, slot, via, cxAppt, t0) {
    const res = R.res(slot.res);
    R.mutate(() => {
      w.st = 'angebot'; w.offerSlot = slot;
      w.offers.push({ at: R.stamp(), via, slot, st: 'gesendet' });
      if (cxAppt && cxAppt.cx) cxAppt.cx.offers = (cxAppt.cx.offers || []).concat([{ wl: w.id, at: R.stamp() }]);
    }, { action: `Nachrück-Angebot per ${via}`, target: `${R.pat(w.pat).pid} → ${R.fdate(slot.day)} ${tm(slot.s)}` });
    const secs = t0 ? Math.round((Date.now() - t0) / 1000) : null;
    R.toast(`Angebot per ${via} gesendet${secs !== null ? ` · ${secs < 60 ? secs + ' s' : Math.round(secs / 60) + ' Min.'} nach Öffnen des Slots` : ''}.`);
    /* simulated reply from MeinLUKS / SMS */
    const accept = Math.random() < 0.78;
    setTimeout(() => {
      const ww = R.db.waitlist.find((x) => x.id === w.id);
      if (!ww || ww.st !== 'angebot') return;
      if (accept) {
        R.bookFromWaitlist(ww, slot, via, true);
        R.notify('angebot', `Zusage über ${via}: ${R.wlName(ww)} kommt ${R.relDay(slot.day)} ${tm(slot.s)} (${res.short}). Slot wiederbesetzt.`, { dept: res.dept, page: 'warteliste' });
      } else {
        R.mutate(() => { ww.st = 'offen'; ww.offerSlot = null; ww.offers[ww.offers.length - 1].st = 'abgelehnt'; }, { action: 'Nachrück-Angebot abgelehnt', target: R.pat(ww.pat).pid });
        R.notify('angebot', `Absage auf Angebot: ${R.wlName(ww)} kann ${R.relDay(slot.day)} ${tm(slot.s)} nicht. Nächste Person anbieten.`, { dept: res.dept, page: 'warteliste' });
      }
      if (R.gapRedraw) R.gapRedraw();
      R.render();
    }, 3500 + Math.random() * 4000);
    R.render();
  };

  R.bookFromWaitlist = function (w, slot, via, viaOffer) {
    const p = R.pat(w.pat);
    const ty = R.type(w.type);
    const a = { id: R.newId('a'), no: R.newNo(), kind: 'pat', st: 'geplant', res: slot.res, day: slot.day, s: slot.s, d: Math.min(ty.dur, slot.d), type: w.type, pat: p.id, urg: w.urg, ref: w.since, channel: p.channel, conf: 'bestaetigt', docs: { zuw: 1, bef: 0, frg: 0, dol: p.lang ? 0 : null }, note: w.note };
    R.insertAppt(a, { action: viaOffer ? `Nachrücker gebucht (Zusage ${via})` : 'Nachrücker gebucht (' + via + ')', target: `${a.no} · ${p.pid}` }, (db) => {
      w.st = 'gebucht'; w.appt = a.id; w.offerSlot = null;
      if (w.offers.length) w.offers[w.offers.length - 1].st = 'angenommen';
    });
    if (!viaOffer) R.toast(`${a.no} gebucht · in LUKiS übernommen · Bestätigung per ${p.channel}.`);
    R.render();
    return a;
  };

  /* insert a booking: consumes reserve time and marks a refilled cancellation */
  R.insertAppt = function (a, log, extra) {
    R.mutate((db) => {
      db.appts.push(a);
      for (const b of R.day(a.day)) {
        if (b.res !== a.res || b === a) continue;
        if (b.kind === 'reserve' && b.st !== 'abgesagt' && b.s < a.s + a.d && b.s + b.d > a.s) {
          if (a.s <= b.s && a.s + a.d < b.s + b.d) { b.d = b.s + b.d - (a.s + a.d); b.s = a.s + a.d; if (b.d < 10) b.st = 'abgesagt'; }
          else b.st = 'abgesagt';
        }
        if (b.st === 'abgesagt' && b.cx && !b.cx.refill && b.s < a.s + a.d && b.s + b.d > a.s) b.cx.refill = a.id;
      }
      if (extra) extra(db);
    }, log);
  };

  /* ---------------------------------------------------------------- reminders (A09) */
  R.sendReminders = function (list) {
    const todo = list.filter((a) => !a.conf && a.st === 'geplant');
    if (!todo.length) { R.toast('Alle Termine im 48-Stunden-Fenster sind bereits erinnert.'); return; }
    R.mutate(() => todo.forEach((a) => (a.conf = 'gesendet')), { action: `Erinnerungen versendet (${todo.length})`, target: 'SMS / MeinLUKS' });
    R.toast(`${todo.length} Erinnerungen mit «Bestätigen / Absagen» versendet.`);
    setTimeout(() => {
      let ok = 0, cx = 0;
      const cancelled = [];
      R.mutate(() => {
        todo.forEach((a, i) => {
          if (a.conf !== 'gesendet') return;
          const r = Math.random();
          if (r < 0.62) { a.conf = 'bestaetigt'; ok++; }
          else if (r < 0.62 + (todo.length > 3 ? 0.08 : 0) || (i === 0 && todo.length > 5)) { a.conf = 'abgesagt'; cancelled.push(a); }
        });
      }, { action: `Antworten auf Erinnerungen: ${ok} bestätigt`, target: '' });
      cancelled.forEach((a) => { R.cancelAppt(a, 'Erinnerung (' + (a.channel || 'SMS') + ')', '', true); cx++; });
      R.toast(`Antworten: ${ok} bestätigt, ${cx} abgesagt, ${todo.length - ok - cx} noch offen.`, { tone: cx ? 'warn' : 'ok' });
      R.render();
    }, 3200);
    R.render();
  };

  /* ---------------------------------------------------------------- delay SMS (A06) */
  R.sendDelaySms = function (resId) {
    const di = R.delayInfo(resId);
    const res = R.res(resId);
    const targets = R.day(R.now().day).filter((a) => a.res === resId && a.st === 'geplant' && di.proj[a.id] && di.proj[a.id] - a.s >= 10 && !a.sms).slice(0, 3);
    if (!targets.length) { R.toast('Keine weiteren Patientinnen mit relevanter Verschiebung.'); return; }
    R.mutate(() => targets.forEach((a) => { a.sms = { at: R.stamp(), eta: Math.round(di.proj[a.id] / 5) * 5 }; }), { action: `Verzugs-SMS an ${targets.length} Patientinnen`, target: res.short });
    R.toast(`SMS an ${targets.length} Patientinnen: neue voraussichtliche Zeit (${targets.map((a) => tm(a.sms.eta)).join(', ')}).`);
    R.render();
  };

  /* ---------------------------------------------------------------- patient picker (shared) */
  function patientField(host, o = {}) {
    let wl = o.wl ? R.db.waitlist.find((w) => w.id === o.wl && w.st === 'offen') || null : null;
    let chosen = o.pat ? R.pat(o.pat) : wl ? R.pat(wl.pat) : null;
    let isNew = false;
    const draw = () => {
      const dept = o.dept ? o.dept() : null;
      const sugg = R.db.waitlist.filter((w) => w.st === 'offen' && (!dept || w.dept === dept)).sort((x, y) => R.URGENCY[x.urg].rank - R.URGENCY[y.urg].rank || (x.since < y.since ? -1 : 1)).slice(0, 4);
      host.innerHTML = chosen ? `<div class="pat-chosen"><span>${icon('user')}</span><div><b>${esc(chosen.last + ' ' + chosen.first)}</b><br><small>${esc(chosen.pid)} · geb. ${esc(chosen.born)}${wl ? ' · von der Warteliste' : ''}</small></div><button type="button" class="icon-btn sm" id="pf-clear" aria-label="Andere Person wählen">${icon('x')}</button></div>`
        : isNew ? `<div class="grid2">
          <label class="fld"><span>Vorname</span><input id="pf-first" required></label>
          <label class="fld"><span>Nachname</span><input id="pf-last" required></label>
          <label class="fld"><span>Geburtsdatum</span><input id="pf-born" placeholder="TT.MM.JJJJ"></label>
          <label class="fld"><span>Natel</span><input id="pf-phone" placeholder="079 123 45 67"></label></div>
          <button type="button" class="link" id="pf-back">Bestehende Person suchen</button>`
        : `<div class="pf-search"><span>${icon('search')}</span><input id="pf-q" type="search" placeholder="Name oder Patientennummer" autocomplete="off"></div>
          <div class="pf-res" id="pf-res"></div>
          ${sugg.length ? `<p class="pf-lbl">Von der Warteliste${dept ? ' · ' + esc(R.dept(dept).name) : ''}</p><div class="pf-sugg">${sugg.map((w) => `<button type="button" class="pf-item" data-wl="${w.id}">${R.urgChip(w.urg, true)}<span>${esc(R.wlName(w))}</span><small>${esc(R.type(w.type).name)} · ${R.daysBetween(w.since, R.now().day)} T.</small></button>`).join('')}</div>` : ''}
          <button type="button" class="link" id="pf-new">${icon('plus', 'i-inline')} Neue Person erfassen</button>`;
      const q = $('#pf-q', host);
      if (q) q.oninput = () => {
        const s = R.fold(q.value.trim());
        const list = s.length < 2 ? [] : R.db.patients.filter((p) => R.fold(`${p.last} ${p.first} ${p.first} ${p.last} ${p.pid}`).includes(s)).slice(0, 6);
        $('#pf-res', host).innerHTML = list.map((p) => `<button type="button" class="pf-item" data-p="${p.id}"><span>${esc(p.last + ' ' + p.first)}</span><small>${esc(p.pid)} · ${esc(p.born)}</small></button>`).join('') || (s.length >= 2 ? '<p class="muted small">Keine Person gefunden.</p>' : '');
        $$('[data-p]', host).forEach((b) => (b.onclick = () => { chosen = R.pat(b.dataset.p); wl = null; draw(); if (o.onChange) o.onChange(); }));
      };
      $$('[data-wl]', host).forEach((b) => (b.onclick = () => { wl = R.db.waitlist.find((w) => w.id === b.dataset.wl); chosen = R.pat(wl.pat); draw(); if (o.onChange) o.onChange({ wl }); }));
      const on = (id, fn) => { const el = $(id, host); if (el) el.onclick = fn; };
      on('#pf-clear', () => { chosen = null; wl = null; draw(); });
      on('#pf-new', () => { isNew = true; draw(); });
      on('#pf-back', () => { isNew = false; draw(); });
    };
    draw();
    return {
      redraw: draw,
      value() {
        if (chosen) return { pat: chosen, wl };
        if (isNew) {
          const f = $('#pf-first', host).value.trim(), l = $('#pf-last', host).value.trim();
          if (!f || !l) return null;
          return { create: { first: f, last: l, born: $('#pf-born', host).value.trim() || '–', phone: $('#pf-phone', host).value.trim() || '–' } };
        }
        return null;
      },
    };
  }
  function ensurePatient(v) {
    if (v.pat) return v.pat;
    const p = Object.assign({ id: R.newId('p'), pid: 'P-' + (200000 + R.db.seq), lang: null, channel: 'SMS' }, v.create);
    R.db.patients.push(p);
    R.patById.set(p.id, p);
    return p;
  }

  R.patientField = patientField;
  R.ensurePatient = ensurePatient;

  /* ---------------------------------------------------------------- editor */
  R.openEditor = function (o = {}) {
    if (!R.can('book') && !o.edit) { R.toast('Ihre Rolle kann keine Termine buchen.', { tone: 'warn' }); return; }
    const a = o.edit ? R.appt(o.edit) : null;
    const scoped = R.RESOURCES.filter((r) => R.inScope(r));
    const init = a ? Object.assign({}, a) : { kind: 'pat', res: o.res && R.inScope(R.res(o.res)) ? o.res : scoped[0].id, day: o.day || R.ui.date, s: o.s ?? 540, d: o.d, type: o.type, urg: o.urg || 'nd', docs: { zuw: 1, bef: 1, frg: 1, dol: null } };
    if (!init.type) init.type = R.res(init.res).types[0];
    if (!init.d) init.d = R.type(init.type).dur;
    const body = R.h(`<form class="form" id="ed-form" novalidate>
      ${a ? '' : `<div class="seg" role="radiogroup" aria-label="Art">${[['pat', 'Patiententermin'], ['reserve', 'Reserve dringlich'], ['block', 'Blocker / Abwesenheit']].map(([k, l]) => `<label><input type="radio" name="ed-kind" value="${k}" ${init.kind === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`}
      <div class="only-pat"><p class="pf-lbl">Patientin / Patient</p><div id="ed-pat"></div></div>
      <div class="only-block"><label class="fld"><span>Titel</span><input id="ed-title" value="${esc(a && a.title || '')}" placeholder="z. B. Rapport, Wartung, Ferien"></label></div>
      <div class="grid2">
        <label class="fld"><span>Ressource</span><select id="ed-res">${R.DEPTS.map((d) => { const rs = scoped.filter((r) => r.dept === d.id); return rs.length ? `<optgroup label="${esc(d.name)}">${rs.map((r) => `<option value="${r.id}" ${r.id === init.res ? 'selected' : ''}>${esc(r.name)} · ${esc(R.site(r.site).name)}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></label>
        <label class="fld only-pat"><span>Termintyp</span><select id="ed-type"></select></label>
        <label class="fld"><span>Datum</span><input type="date" id="ed-day" value="${init.day}" required></label>
        <div class="grid2 tight"><label class="fld"><span>Beginn</span><input type="time" id="ed-s" value="${tm(init.s)}" step="300" required></label>
        <label class="fld"><span>Dauer (Min.)</span><input type="number" id="ed-d" value="${init.d}" min="5" max="480" step="5" required></label></div>
      </div>
      <div class="only-pat"><p class="pf-lbl">Dringlichkeit</p><div class="seg urg-seg">${Object.entries(R.URGENCY).map(([k, u]) => `<label class="tone-${u.tone}"><input type="radio" name="ed-urg" value="${k}" ${init.urg === k ? 'checked' : ''}><span><i class="dot-i"></i>${u.label}</span></label>`).join('')}</div></div>
      <div class="only-pat"><p class="pf-lbl">Unterlagen</p><div class="docs-list">${R.DOCS.map((d) => d.id === 'dol' ? `<label class="chk"><input type="checkbox" id="ed-dolneed" ${init.docs && init.docs.dol !== null && init.docs.dol !== undefined ? 'checked' : ''}><span>Dolmetscher nötig</span></label><label class="chk"><input type="checkbox" id="ed-dol" ${init.docs && init.docs.dol ? 'checked' : ''}><span>Dolmetscher organisiert</span></label>` : `<label class="chk"><input type="checkbox" data-doc="${d.id}" ${!init.docs || init.docs[d.id] ? 'checked' : ''}><span>${d.label} vorhanden</span></label>`).join('')}</div></div>
      <label class="fld only-pat"><span>Notiz</span><textarea id="ed-note" rows="2" placeholder="Fragestellung, Hinweise">${esc(a && a.note || '')}</textarea></label>
      <p class="ed-check" id="ed-check" aria-live="polite"></p>
    </form>`);
    const el = R.modal({
      title: a ? `Termin bearbeiten · ${a.no}` : 'Neuer Termin', body, wide: true,
      actions: [{ label: 'Abbrechen' }, { label: a ? 'Speichern' : 'In LUKiS buchen', primary: true, icon: 'check', fn: () => save() }],
    });
    const f = $('#ed-form', el);
    const kind = () => (a ? a.kind : f.querySelector('[name=ed-kind]:checked').value);
    const pf = patientField($('#ed-pat', el), { pat: a && a.pat, wl: o.wl, dept: () => R.res($('#ed-res', el).value).dept, onChange: (x) => { if (x && x.wl) { const w = x.wl; const r = R.res($('#ed-res', el).value); if (r.types.includes(w.type)) { $('#ed-type', el).value = w.type; $('#ed-d', el).value = R.type(w.type).dur; } f.querySelector(`[name=ed-urg][value=${w.urg}]`).checked = true; check(); } } });
    if (a && !R.seesPatient(a)) $('#ed-pat', el).innerHTML = '<p class="muted">Patientendaten ausgeblendet.</p>';
    const fillTypes = () => {
      const r = R.res($('#ed-res', el).value);
      const cur = $('#ed-type', el).value || init.type;
      $('#ed-type', el).innerHTML = r.types.map((t) => `<option value="${t}" ${t === cur ? 'selected' : ''}>${esc(R.type(t).name)} (${R.type(t).dur} Min.)</option>`).join('');
    };
    const setKind = () => { const k = kind(); el.querySelector('.modal').dataset.kind = k; };
    fillTypes(); setKind();
    if (o.wl) { const w = R.db.waitlist.find((x) => x.id === o.wl && x.st === 'offen'); if (w) { if (R.res(init.res).types.includes(w.type)) $('#ed-type', el).value = w.type; const u = f.querySelector(`[name=ed-urg][value=${w.urg}]`); if (u) u.checked = true; } }
    const check = () => {
      const res = $('#ed-res', el).value, day = $('#ed-day', el).value, s = R.ptm($('#ed-s', el).value || '0:00'), d = +$('#ed-d', el).value;
      const out = $('#ed-check', el);
      if (!day || !d) { out.innerHTML = ''; return; }
      const r = R.res(res);
      const clash = R.conflicts(res, day, s, d, a && a.id).filter((b) => b.kind !== 'reserve' || kind() === 'reserve');
      const resv = R.conflicts(res, day, s, d, a && a.id).filter((b) => b.kind === 'reserve' && kind() !== 'reserve');
      const inHours = (r.hours[R.dow(day)] || []).some(([x, y]) => s >= x && s + d <= y);
      if (clash.length) out.innerHTML = `<span class="txt-bad">${icon('alert', 'i-inline')} Konflikt mit ${clash[0].kind === 'pat' ? esc(clash[0].no) : esc(clash[0].title)} (${tm(clash[0].s)}–${tm(clash[0].s + clash[0].d)})</span>`;
      else if (!inHours && kind() !== 'block') out.innerHTML = `<span class="txt-warn">${icon('info', 'i-inline')} Ausserhalb der Sprechstundenzeit von ${esc(r.short)}</span>`;
      else if (resv.length) out.innerHTML = `<span class="txt-warn">${icon('lightning', 'i-inline')} Belegt einen Reserve-Slot für dringliche Fälle</span>`;
      else out.innerHTML = `<span class="txt-ok">${icon('check', 'i-inline')} Frei · ${R.fdate(day, { wd: true })} ${tm(s)}–${tm(s + d)}</span>`;
      return clash.length === 0;
    };
    $('#ed-res', el).onchange = () => { fillTypes(); $('#ed-d', el).value = R.type($('#ed-type', el).value).dur; pf.redraw(); check(); };
    $('#ed-type', el).onchange = () => { $('#ed-d', el).value = R.type($('#ed-type', el).value).dur; check(); };
    ['#ed-day', '#ed-s', '#ed-d'].forEach((id) => ($(id, el).oninput = check));
    $$('[name=ed-kind]', el).forEach((r) => (r.onchange = () => { setKind(); check(); }));
    check();

    function save() {
      const k = kind();
      const res = $('#ed-res', el).value, day = $('#ed-day', el).value, s = R.ptm($('#ed-s', el).value), d = +$('#ed-d', el).value;
      if (!day || !d || isNaN(s)) { R.toast('Bitte Datum, Beginn und Dauer angeben.', { tone: 'bad' }); return false; }
      if (!check()) { R.toast('Der Zeitraum ist bereits belegt. Bitte anderen Zeitpunkt wählen.', { tone: 'bad' }); return false; }
      const docs = {};
      $$('[data-doc]', el).forEach((c) => (docs[c.dataset.doc] = c.checked ? 1 : 0));
      docs.dol = $('#ed-dolneed', el).checked ? ($('#ed-dol', el).checked ? 1 : 0) : null;
      const urg = (f.querySelector('[name=ed-urg]:checked') || {}).value || 'nd';
      if (a) {
        const fields = { res, day, s, d, note: $('#ed-note', el).value };
        if (a.kind === 'pat') Object.assign(fields, { type: $('#ed-type', el).value, urg, docs });
        else fields.title = $('#ed-title', el).value || a.title;
        R.mutate(() => Object.assign(a, fields), { action: 'Termin geändert', target: a.no });
        R.toast(`${a.no} gespeichert · in LUKiS übernommen.`);
        R.render(); if (R.peekId === a.id) R.openAppt(a.id);
        return;
      }
      const n = { id: R.newId('a'), no: R.newNo(), kind: k, st: 'geplant', res, day, s, d };
      if (k === 'pat') {
        const v = pf.value();
        if (!v) { R.toast('Bitte eine Person wählen oder neu erfassen.', { tone: 'bad' }); return false; }
        const p = ensurePatient(v);
        Object.assign(n, { pat: p.id, type: $('#ed-type', el).value, urg, docs, ref: v.wl ? v.wl.since : R.now().day, channel: p.channel, note: $('#ed-note', el).value });
        R.insertAppt(n, { action: 'Termin gebucht', target: `${n.no} · ${p.pid}` }, () => { if (v.wl) { v.wl.st = 'gebucht'; v.wl.appt = n.id; } });
        R.toast(`${n.no} gebucht: ${R.fdate(day, { wd: true })} ${tm(s)} · in LUKiS übernommen · Aufgebot per ${p.channel}.`);
      } else {
        n.title = $('#ed-title', el).value || (k === 'reserve' ? 'Reserve dringlich' : 'Blocker');
        R.insertAppt(n, { action: k === 'reserve' ? 'Reserve-Slot angelegt' : 'Blocker angelegt', target: `${R.res(res).short} ${R.fdate(day)} ${tm(s)}` });
        R.toast(`${n.title} eingetragen.`);
      }
      R.ui.date = day;
      R.render();
    }
  };

  /* ---------------------------------------------------------------- combined booking (A04) */
  R.bookCombo = function (variant) {
    const body = R.h(`<div class="form"><div class="combo-sum">${variant.steps.map((s) => `<div style="--c:${R.res(s.res).color}"><b>${tm(s.s)}–${tm(s.s + s.d)}</b> ${esc(R.type(s.type).name)} · ${esc(R.res(s.res).short)}</div>`).join('')}</div>
      <p class="pf-lbl">Patientin / Patient</p><div id="cb-pat"></div>
      <p class="pf-lbl">Dringlichkeit</p><div class="seg urg-seg">${Object.entries(R.URGENCY).map(([k, u]) => `<label class="tone-${u.tone}"><input type="radio" name="cb-urg" value="${k}" ${k === 'u2w' ? 'checked' : ''}><span><i class="dot-i"></i>${u.label}</span></label>`).join('')}</div></div>`);
    let pf;
    const el = R.modal({
      title: `Kombitermin buchen · ${R.flong(variant.day)}`, body, wide: true,
      actions: [{ label: 'Abbrechen' }, { label: `${variant.steps.length} Termine buchen`, primary: true, icon: 'check', fn: () => {
        const v = pf.value();
        if (!v) { R.toast('Bitte eine Person wählen.', { tone: 'bad' }); return false; }
        const p = ensurePatient(v);
        const urg = el.querySelector('[name=cb-urg]:checked').value;
        const combo = R.newId('c');
        const nos = [];
        variant.steps.forEach((s, i) => {
          const n = { id: R.newId('a'), no: R.newNo(), kind: 'pat', st: 'geplant', res: s.res, day: variant.day, s: s.s, d: s.d, type: s.type, pat: p.id, urg, ref: R.now().day, channel: p.channel, combo, docs: { zuw: 1, bef: i === 0 ? 1 : 0, frg: 1, dol: p.lang ? 0 : null } };
          nos.push(n.no);
          R.insertAppt(n, { action: `Kombitermin ${i + 1}/${variant.steps.length} gebucht`, target: `${n.no} · ${p.pid}` }, () => { if (v.wl && i === 0) { v.wl.st = 'gebucht'; v.wl.appt = n.id; } });
        });
        R.toast(`Kombitermin gebucht (${nos.join(', ')}) · ein gemeinsames Aufgebot per ${p.channel}.`);
        R.render();
      } }],
    });
    pf = patientField($('#cb-pat', el), {});
  };
})();
