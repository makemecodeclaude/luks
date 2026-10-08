/* LUKS Terminradar – scheduling logic: free slots, combined appointments, delay, waiting list, KPIs */
(function () {
  'use strict';
  const R = window.R;

  const busyStates = (a) => a.st !== 'abgesagt';
  R.isPatient = (a) => a.kind === 'pat';
  R.reserveReleased = (a) => a.kind === 'reserve' && R.until(a.day, a.s) <= 24 * 60;

  function subtract(iv, a, b) {
    const out = [];
    for (const [x, y] of iv) {
      if (b <= x || a >= y) { out.push([x, y]); continue; }
      if (a > x) out.push([x, a]);
      if (b < y) out.push([b, y]);
    }
    return out;
  }

  /* Free intervals of one resource on one day. Reserve slots stay blocked unless
     the search is for an urgent case or they are released (less than 24 h ahead, A07). */
  R.freeIntervals = function (res, day, opt = {}) {
    const n = R.now();
    if (day < n.day) return [];
    let iv = (res.hours[R.dow(day)] || []).map((x) => x.slice());
    if (day === n.day) iv = subtract(iv, 0, Math.ceil(n.min / 5) * 5);
    const reserves = [];
    for (const a of R.day(day)) {
      if (a.res !== res.id || !busyStates(a)) continue;
      if (a.allDay) return [];
      if (a.kind === 'reserve' && (opt.urgent || R.reserveReleased(a))) { reserves.push(a); continue; }
      iv = subtract(iv, a.s, a.s + a.d);
    }
    iv = iv.filter(([x, y]) => y - x >= 5);
    iv.reserves = reserves;
    return iv;
  };

  function chunk(res, day, iv, dur, max) {
    const out = [];
    for (const [a, b] of iv) {
      let t = Math.ceil(a / 5) * 5;
      while (t + dur <= b && out.length < max) {
        const rv = iv.reserves.find((r) => r.s < t + dur && r.s + r.d > t);
        out.push({ res: res.id, day, s: t, d: dur, reserve: !!rv, reserveId: rv ? rv.id : null });
        t += dur;
      }
    }
    return out;
  }

  /* resources that offer a given appointment type / department */
  R.resourcesFor = function (f) {
    return R.RESOURCES.filter((r) =>
      (!f.res || r.id === f.res) &&
      (!f.dept || r.dept === f.dept) &&
      (!f.type || r.types.includes(f.type)) &&
      (!f.site || r.site === f.site));
  };

  /* A03 – free slots, nearest first. */
  R.findSlots = function (f) {
    const n = R.now();
    const from = f.from && f.from > n.day ? f.from : n.day;
    const to = f.to || R.addDays(from, 14);
    const dur = f.dur || (f.type ? R.type(f.type).dur : 20);
    const resList = R.resourcesFor(f);
    const out = [];
    for (let day = from; day <= to; day = R.addDays(day, 1)) {
      if (!R.isWeekday(day)) continue;
      for (const res of resList) {
        const iv = R.freeIntervals(res, day, { urgent: f.urgent });
        let slots = chunk(res, day, iv, dur, 40);
        if (f.part === 'am') slots = slots.filter((s) => s.s < 720);
        if (f.part === 'pm') slots = slots.filter((s) => s.s >= 720);
        out.push(...slots);
        /* unconfirmed appointments released for double booking (A09) */
        for (const a of R.day(day)) {
          if (a.res === res.id && a.ob && a.st === 'geplant' && a.d >= dur && R.until(day, a.s) > 0) out.push({ res: res.id, day, s: a.s, d: dur, overbook: true, of: a.id });
        }
      }
    }
    out.sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : x.s - y.s));
    return out;
  };

  /* earliest start >= t inside the free intervals with room for dur */
  function earliest(iv, t, dur) {
    for (const [a, b] of iv) {
      const s = Math.ceil(Math.max(a, t) / 5) * 5;
      if (s + dur <= b) return s;
    }
    return null;
  }

  /* A04 – combined appointments: fixed order, minimum gap, same site and day. */
  R.findCombos = function (steps, f) {
    const n = R.now();
    const from = f.from && f.from > n.day ? f.from : n.day;
    const to = f.to || R.addDays(from, 14);
    const gap = f.gap ?? 15, maxGap = f.maxGap ?? 120;
    const out = [];
    for (let day = from; day <= to && out.length < (f.limit || 12); day = R.addDays(day, 1)) {
      if (!R.isWeekday(day)) continue;
      for (const site of R.SITES) {
        if (f.site && f.site !== site.id) continue;
        const pools = steps.map((st) => R.resourcesFor({ type: st.type, site: site.id, res: st.res, dept: st.dept }).map((res) => ({ res, iv: R.freeIntervals(res, day), dur: R.type(st.type).dur })));
        if (pools.some((p) => !p.length)) continue;
        let perDay = 0, cursor = 0;
        while (perDay < 4 && cursor < 1440) {
          /* first step: earliest start >= cursor across its resources */
          let first = null;
          for (const p of pools[0]) { const s = earliest(p.iv, cursor, p.dur); if (s !== null && (!first || s < first.s)) first = { res: p.res.id, s, d: p.dur }; }
          if (!first) break;
          const chain = [first];
          let ok = true;
          for (let i = 1; i < pools.length; i++) {
            const prevEnd = chain[i - 1].s + chain[i - 1].d;
            let best = null;
            for (const p of pools[i]) {
              const s = earliest(p.iv, prevEnd + gap, p.dur);
              if (s !== null && s - prevEnd <= maxGap && (!best || s < best.s)) best = { res: p.res.id, s, d: p.dur };
            }
            if (!best) { ok = false; break; }
            chain.push(best);
          }
          if (ok) {
            out.push({ day, site: site.id, steps: chain.map((c, i) => Object.assign(c, { type: steps[i].type, day })), total: chain[chain.length - 1].s + chain[chain.length - 1].d - chain[0].s });
            perDay++;
            cursor = first.s + 60; /* next variant: at least an hour later */
          } else cursor = first.s + 15;
        }
      }
    }
    return out.slice(0, f.limit || 12);
  };

  /* A06 – running delay per consultation, projected start of everyone still to come. */
  R.delayInfo = function (resId, day) {
    const n = R.now();
    const out = { delay: 0, proj: {}, current: null, next: null, waiting: 0, overdue: [] };
    if (day && day !== n.day) return out;
    const list = R.day(n.day).filter((a) => a.res === resId && R.isPatient(a) && a.st !== 'abgesagt' && a.st !== 'noshow');
    let free = n.min;
    for (const a of list) {
      if (a.st === 'behandlung') { out.current = a; free = Math.max(n.min, (a.ts ?? a.s) + a.d); }
    }
    let t = free, first = null;
    for (const a of list) {
      if (!['geplant', 'angekommen', 'wartet'].includes(a.st)) continue;
      if (a.st === 'geplant' && a.s + 15 < n.min) { out.overdue.push(a); continue; }
      const ps = Math.max(a.s, t);
      out.proj[a.id] = ps;
      if (first === null) { first = ps - a.s; out.next = a; }
      if (a.st !== 'geplant') out.waiting++;
      t = ps + a.d;
    }
    out.delay = Math.max(0, Math.round(first ?? (out.current ? n.min - ((out.current.ts ?? out.current.s) + out.current.d) : 0)));
    return out;
  };
  R.delayTone = (d, thr) => (d >= thr ? 'bad' : d >= Math.max(8, thr / 2) ? 'warn' : 'ok');

  /* A05 – waiting list candidates for a free slot: same clinic, fitting type, site, sorted by urgency then waiting time */
  R.candidates = function (slot) {
    const res = R.res(slot.res);
    const n = R.now();
    return R.db.waitlist
      .filter((w) => w.st === 'offen' && w.dept === res.dept && res.types.includes(w.type) && R.type(w.type).dur <= slot.d && (!w.sites || !w.sites.length || w.sites.includes(res.site)) && (!w.earliest || w.earliest <= slot.day))
      .map((w) => ({ w, wait: R.daysBetween(w.since, n.day), u: R.URGENCY[w.urg].rank }))
      .sort((x, y) => x.u - y.u || y.wait - x.wait);
  };

  /* freed slots: short-notice cancellations not yet refilled + released reserve slots */
  R.openGaps = function () {
    const n = R.now();
    const out = [];
    for (let i = 0; i <= 14; i++) {
      const day = R.addDays(n.day, i);
      for (const a of R.day(day)) {
        if (R.until(day, a.s) < 0) continue;
        if (!R.inScope(R.res(a.res))) continue;
        if (a.st === 'abgesagt' && a.cx && !a.cx.refill) {
          const taken = R.day(day).some((b) => b !== a && b.res === a.res && b.st !== 'abgesagt' && b.s < a.s + a.d && b.s + b.d > a.s);
          if (!taken) out.push({ kind: 'absage', a, slot: { res: a.res, day, s: a.s, d: a.d } });
        }
        if (a.kind === 'reserve' && a.st !== 'abgesagt' && R.reserveReleased(a)) out.push({ kind: 'reserve', a, slot: { res: a.res, day, s: a.s, d: a.d } });
      }
    }
    return out;
  };

  /* A08 – document check for appointments within the next 3 working days */
  R.docTasks = function () {
    const n = R.now();
    const until = R.addWorkdays(n.day, 3);
    const out = [];
    for (let d = n.day; d <= until; d = R.addDays(d, 1)) {
      for (const a of R.day(d)) {
        if (!R.isPatient(a) || a.st === 'abgesagt' || !a.docs || R.until(d, a.s) < 0) continue;
        if (!R.inScope(R.res(a.res))) continue;
        const missing = R.DOCS.filter((x) => a.docs[x.id] === 0);
        if (missing.length) out.push({ a, missing });
      }
    }
    return out;
  };
  R.docTone = (a) => {
    if (!a.docs) return null;
    const miss = R.DOCS.filter((x) => a.docs[x.id] === 0).length;
    return miss === 0 ? 'ok' : miss === 1 ? 'warn' : 'bad';
  };

  /* A09 – reminder window: appointments in the next 48 h */
  R.reminderSet = function () {
    const out = [];
    const n = R.now();
    for (let i = 0; i <= 3; i++) {
      const d = R.addDays(n.day, i);
      for (const a of R.day(d)) {
        const u = R.until(d, a.s);
        if (!R.isPatient(a) || u < 0 || u > 48 * 60) continue;
        if (!R.inScope(R.res(a.res))) continue;
        out.push(a);
      }
    }
    return out;
  };

  /* A10 – weekly KPIs per clinic (no personal data) */
  R.kpis = function (dept, weeks = 6) {
    const n = R.now();
    const thisMon = R.startOfWeek(n.day);
    const rows = [];
    for (let w = weeks; w >= 1; w--) {
      const mon = R.addDays(thisMon, -7 * w);
      let work = 0, booked = 0, waitDays = [], onsite = [], done = 0, noshow = 0, shortCx = 0, refilled = 0, appts = 0;
      for (let i = 0; i < 5; i++) {
        const day = R.addDays(mon, i);
        for (const res of R.RESOURCES) {
          if (dept && res.dept !== dept) continue;
          const blocks = res.hours[R.dow(day)] || [];
          const absent = R.day(day).some((a) => a.res === res.id && a.allDay);
          if (!absent) work += blocks.reduce((s, [a, b]) => s + b - a, 0);
        }
        for (const a of R.day(day)) {
          if (dept && R.res(a.res).dept !== dept) continue;
          if (!R.isPatient(a)) continue;
          if (a.st === 'abgesagt') { if (a.cx && a.cx.short) { shortCx++; if (a.cx.refill) { refilled++; booked += a.d; } } continue; }
          appts++;
          if (a.st === 'fertig') { done++; booked += a.d; onsite.push(Math.max(0, a.ts - a.s)); }
          if (a.st === 'noshow') noshow++;
          if (a.ref) waitDays.push(R.daysBetween(a.ref, a.day));
        }
      }
      const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
      rows.push({
        week: R.isoWeek(mon), mon, appts,
        util: work ? booked / work : null,
        waitDays: avg(waitDays),
        onsite: avg(onsite),
        noshow: done + noshow ? noshow / (done + noshow) : null,
        refill: shortCx ? refilled / shortCx : null,
        shortCx, refilled,
      });
    }
    return rows;
  };
})();
