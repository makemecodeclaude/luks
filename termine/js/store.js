/* LUKS Terminradar – state, persistence, live sync between screens, audit log, notifications */
(function () {
  'use strict';
  const R = window.R;
  const DB_KEY = 'luks-radar-db-v3', UI_KEY = 'luks-radar-ui-v3';

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };

  const UI_DEFAULT = {
    page: 'kalender', view: 'workweek', date: null, role: 'dispo', hidden: {}, visible: null,
    privacy: false, theme: 'system', lockMin: 5, filterStatus: [], filterUrg: [], showWeekend: false,
    notif: {}, demoClock: true, sideOpen: true, density: 'normal',
  };

  R.ui = Object.assign({}, UI_DEFAULT, safeParse(ls.get(UI_KEY)) || {});
  R.clockOffset = R.ui.demoClock ? R.demoOffset() : 0;

  function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  R.loadDb = function () {
    const stored = safeParse(ls.get(DB_KEY));
    if (stored && stored.v === 3 && stored.generatedFor === R.now().day) { R.db = stored; R.fresh = false; }
    else { R.db = R.generate(); R.fresh = !!stored; R.saveDb(true); }
    R.reindex();
  };

  /* ---------------------------------------------------------------- index */
  R.reindex = function () {
    const by = new Map();
    for (const a of R.db.appts) { if (!by.has(a.day)) by.set(a.day, []); by.get(a.day).push(a); }
    for (const list of by.values()) list.sort((x, y) => x.s - y.s);
    R.byDay = by;
    R.patById = new Map(R.db.patients.map((p) => [p.id, p]));
    R.apptById = new Map(R.db.appts.map((a) => [a.id, a]));
  };
  R.day = (k) => R.byDay.get(k) || [];
  R.pat = (id) => R.patById.get(id);
  R.appt = (id) => R.apptById.get(id);

  /* ---------------------------------------------------------------- persistence + live sync (A02) */
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('luks-radar') : null;
  const tabId = R.uid('tab');
  R.saveDb = function (silent) {
    R.db.rev = (R.db.rev || 0) + 1;
    ls.set(DB_KEY, JSON.stringify(R.db));
    if (!silent && chan) chan.postMessage({ type: 'db', from: tabId, rev: R.db.rev });
  };
  R.saveUi = R.debounce(() => ls.set(UI_KEY, JSON.stringify(R.ui)), 150);

  function onRemote() {
    const stored = safeParse(ls.get(DB_KEY));
    if (!stored || stored.rev === R.db.rev) return;
    R.db = stored; R.reindex();
    R.lastSync = Date.now();
    if (R.onRemoteChange) R.onRemoteChange();
  }
  if (chan) chan.onmessage = (e) => { if (e.data && e.data.from !== tabId) onRemote(); };
  window.addEventListener('storage', (e) => { if (e.key === DB_KEY) onRemote(); });

  /* Every write goes through here: change, write back (LUKiS), log, sync. */
  R.mutate = function (fn, log) {
    fn(R.db);
    if (log) R.audit(log.action, log.target, true);
    R.reindex();
    R.saveDb();
    R.lastSync = Date.now();
    if (R.onLocalChange) R.onLocalChange();
  };

  R.newId = (p) => p + (R.db.seq++);
  R.newNo = () => 'T-' + (50000 + R.db.seq++);

  /* ---------------------------------------------------------------- roles (A11) */
  R.role = () => R.ROLES[R.ui.role] || R.ROLES.dispo;
  R.can = (k) => !!R.role().can[k];
  R.inScope = (resOrDept) => {
    const sc = R.role().scope;
    const dept = typeof resOrDept === 'string' ? resOrDept : resOrDept.dept;
    return sc === 'all' || sc.includes(dept);
  };
  /* may this role see patient identity for the appointment? */
  R.seesPatient = (a) => {
    const role = R.role();
    if (role.anon) return false;
    return R.inScope(R.res(a.res));
  };

  /* ---------------------------------------------------------------- display names (A12) */
  R.patLabel = function (a, opt = {}) {
    if (a.kind === 'block' || a.kind === 'reserve') return a.title;
    const p = R.pat(a.pat);
    if (!p) return 'Termin';
    if (!R.seesPatient(a)) return 'Belegt';
    if (R.ui.privacy || opt.public) return `${R.initials(p.first, p.last)} · ${a.no}`;
    return `${p.last} ${p.first}`;
  };

  /* ---------------------------------------------------------------- audit log (A12) */
  R.audit = function (action, target, skipSave) {
    const role = R.role();
    R.db.log.unshift({ at: R.stamp(), user: role.user, role: role.label, action, target: target || '' });
    if (R.db.log.length > 600) R.db.log.length = 600;
    if (!skipSave) R.saveDb();
  };

  /* ---------------------------------------------------------------- notifications (A16) */
  R.notifOn = (kind) => {
    const own = (R.ui.notif[R.ui.role] || {});
    return kind in own ? !!own[kind] : !!R.role().notif[kind];
  };
  R.notify = function (kind, text, o = {}) {
    const n = { id: R.uid('n'), kind, text, at: R.stamp(), appt: o.appt || null, dept: o.dept || null, page: o.page || null, read: {} };
    R.mutate((db) => { db.notifs.unshift(n); if (db.notifs.length > 120) db.notifs.length = 120; });
    if (!o.silent && R.notifVisible(n) && R.onNotify) R.onNotify(n);
    return n;
  };
  R.notifVisible = (n) => R.notifOn(n.kind) && (!n.dept || R.inScope(n.dept));
  R.myNotifs = () => R.db.notifs.filter(R.notifVisible);
  R.unread = () => R.myNotifs().filter((n) => !n.read[R.ui.role]).length;
})();
