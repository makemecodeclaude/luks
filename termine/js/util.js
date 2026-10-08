/* LUKS Terminradar – shared helpers (dates, DOM, icons, random) */
(function () {
  'use strict';
  const R = (window.R = window.R || {});

  /* ---------------------------------------------------------------- DOM */
  R.$ = (s, el = document) => el.querySelector(s);
  R.$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  R.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  R.h = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  /* ---------------------------------------------------------------- dates
     A day is a key "YYYY-MM-DD"; times are minutes after midnight. */
  const pad = (n) => String(n).padStart(2, '0');
  R.pad = pad;
  R.dk = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  R.pd = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  R.addDays = (k, n) => { const d = R.pd(k); d.setDate(d.getDate() + n); return R.dk(d); };
  R.dow = (k) => R.pd(k).getDay();
  R.isWeekday = (k) => { const w = R.dow(k); return w > 0 && w < 6; };
  R.daysBetween = (a, b) => {
    const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
  };
  R.startOfWeek = (k) => { const w = (R.dow(k) + 6) % 7; return R.addDays(k, -w); };
  R.isoWeek = (k) => {
    const d = R.pd(k); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 864e5 + 1) / 7);
  };
  R.addWorkdays = (k, n) => { let d = k, c = 0; while (c < n) { d = R.addDays(d, 1); if (R.isWeekday(d)) c++; } return d; };

  R.WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  R.WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  R.MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  R.tm = (m) => `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
  R.ptm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
  R.fdate = (k, o = {}) => {
    const d = R.pd(k);
    const base = `${d.getDate()}.${pad(d.getMonth() + 1)}.${o.short ? '' : d.getFullYear()}`;
    return o.wd ? `${R.WD[d.getDay()]} ${base}` : base;
  };
  R.flong = (k) => { const d = R.pd(k); return `${R.WDL[d.getDay()]}, ${d.getDate()}. ${R.MON[d.getMonth()]} ${d.getFullYear()}`; };
  R.dur = (m) => (m < 60 ? `${m} Min.` : `${Math.floor(m / 60)} Std.${m % 60 ? ' ' + (m % 60) + ' Min.' : ''}`);
  R.dayName = (k) => { const n = R.daysBetween(R.now().day, k); return n === 0 ? 'Heute' : n === 1 ? 'Morgen' : R.WDL[R.dow(k)]; };
  R.relDay = (k) => {
    const n = R.daysBetween(R.now().day, k);
    return n === 0 ? 'Heute' : n === 1 ? 'Morgen' : n === -1 ? 'Gestern' : R.fdate(k, { wd: true, short: true });
  };

  /* Clock with an optional demo offset, so the demo always runs in office hours. */
  R.clockOffset = 0;
  R.now = function () {
    const d = new Date(Date.now() + R.clockOffset);
    return { date: d, day: R.dk(d), min: d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 };
  };
  R.stamp = () => { const n = R.now(); return `${n.day} ${R.tm(Math.floor(n.min))}`; };
  /* minutes from now until (day, min); negative = past */
  R.until = (day, min) => { const n = R.now(); return R.daysBetween(n.day, day) * 1440 + min - n.min; };

  /* ---------------------------------------------------------------- random */
  R.rng = function (seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    const f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };

  /* ---------------------------------------------------------------- icons (24px line set) */
  const P = {
    apps: '<circle cx="5" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="19" cy="5" r="1.4"/><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/><circle cx="5" cy="19" r="1.4"/><circle cx="12" cy="19" r="1.4"/><circle cx="19" cy="19" r="1.4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.7-1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    calPlus: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    day: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M5 9h14"/>',
    workweek: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16M15 4v16"/>',
    week: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M7 4v16M12 4v16M17 4v16"/>',
    month: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M3 15h18M9 9.5V20M15 9.5V20"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M9 9v11M15 9v11"/><circle cx="6" cy="6.5" r=".5"/><circle cx="12" cy="6.5" r=".5"/><circle cx="18" cy="6.5" r=".5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    filter: '<path d="M4 5h16l-6.2 7.5V19l-3.6-1.8v-4.7z"/>',
    print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
    share: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2H10"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    up: '<path d="m5 15 7-7 7 7"/>',
    down: '<path d="m5 9 7 7 7-7"/>',
    arrowR: '<path d="M4 12h16M13 5l7 7-7 7"/>',
    arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    hourglass: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 8 5 8 8.5s-8 4.5-8 8.5M16 3.5c0 4-8 5-8 8.5s8 4.5 8 8.5"/>',
    slots: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h3M13 14h3M8 17h3" stroke-dasharray="0"/>',
    queue: '<path d="M4 6h10M4 11h10M4 16h6"/><path d="M17 13v7M14 17l3 3 3-3"/>',
    tasks: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="m8.5 11 1.6 1.6L13 9.7M8.5 16.5l1.6 1.6 2.9-2.9"/><path d="M15 12h1.5M15 17.5h1.5"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8 20.5h8M12 16.5v4"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    log: '<path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12.5A.5.5 0 0 1 5.5 20V4a.5.5 0 0 1 .5-.5z"/><path d="M14.5 3.5V8H19M8.5 12h7M8.5 15.5h7M8.5 9h3"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
    sms: '<path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H9l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
    alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.1"/>',
    doc: '<path d="M6 3.5h8.5l4 4V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5V8h4.5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4.5 19.5h15"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.4M12 17.2v.1"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.6 3.3M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.3-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    sync: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    stetho: '<path d="M6 3.5v5a4 4 0 0 0 8 0v-5"/><path d="M10 12.5v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10.5" r="2"/>',
    room: '<path d="M4 20.5V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v15.5M2.5 20.5h19M15 9h4a1 1 0 0 1 1 1v10.5"/><path d="M11.5 12.5v.5"/>',
    device: '<rect x="3" y="5" width="18" height="11" rx="5.5"/><circle cx="12" cy="10.5" r="3"/><path d="M8 20h8M12 16v4"/>',
    swap: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13"/>',
    send: '<path d="M21 3 10 14M21 3l-6.5 18-4.5-7-7-4.5z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5L18.5 7M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    combo: '<rect x="3" y="4" width="6" height="5" rx="1.5"/><rect x="9" y="10" width="6" height="5" rx="1.5"/><rect x="15" y="16" width="6" height="5" rx="1.5"/><path d="M6 9v3.5h3M12 15v3.5h3"/>',
    lightning: '<path d="M13 2.5 4.5 13.5H12L11 21.5l8.5-11H12z"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    excel: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="m8 8 8 8M16 8l-8 8"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  };
  R.ICONS = P;
  R.icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.dot}</svg>`;

  /* ---------------------------------------------------------------- misc */
  R.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  R.uid = (p) => p + Math.random().toString(36).slice(2, 9);
  R.initials = (first, last) => `${(first || '?')[0]}. ${(last || '?')[0]}.`;
  R.fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  R.pct = (x, d = 0) => (x === null || x === undefined || isNaN(x) ? '–' : (x * 100).toFixed(d).replace('.', ',') + ' %');
  R.num = (x, d = 0) => (x === null || x === undefined || isNaN(x) ? '–' : x.toFixed(d).replace('.', ','));
})();
