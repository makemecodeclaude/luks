/* LUKS Terminradar – master data and demo data generator.
   All people and appointments are fictitious. In production the data comes from LUKiS (Epic). */
(function () {
  'use strict';
  const R = window.R;

  R.SITES = [
    { id: 'LU', name: 'Luzern' },
    { id: 'SU', name: 'Sursee' },
    { id: 'WO', name: 'Wolhusen' },
  ];
  R.DEPTS = [
    { id: 'kardio', name: 'Kardiologie', prefix: 'K' },
    { id: 'ortho', name: 'Orthopädie', prefix: 'O' },
    { id: 'gyn', name: 'Frauenklinik', prefix: 'F' },
    { id: 'gastro', name: 'Gastroenterologie', prefix: 'G' },
    { id: 'radio', name: 'Radiologie', prefix: 'R' },
    { id: 'labor', name: 'Labor', prefix: 'L' },
    { id: 'nuk', name: 'Nuklearmedizin', prefix: 'N' },
  ];

  R.TYPES = [
    { id: 'erst', name: 'Erstkonsultation', dur: 40 },
    { id: 'kontrolle', name: 'Kontrolle', dur: 20 },
    { id: 'nach', name: 'Nachkontrolle postoperativ', dur: 20 },
    { id: 'echo', name: 'Echokardiographie', dur: 30 },
    { id: 'ergo', name: 'Ergometrie', dur: 30 },
    { id: 'ultra', name: 'Ultraschall', dur: 30 },
    { id: 'gastroskopie', name: 'Gastroskopie', dur: 30 },
    { id: 'mri', name: 'MRI', dur: 45 },
    { id: 'ct', name: 'CT', dur: 20 },
    { id: 'blut', name: 'Blutentnahme', dur: 10 },
    { id: 'szinti', name: 'Szintigraphie', dur: 60 },
  ];

  const DOC = { 1: [[480, 720], [780, 1020]], 2: [[480, 720], [780, 1020]], 3: [[480, 720], [780, 1020]], 4: [[480, 720], [780, 1020]], 5: [[480, 720], [780, 960]] };
  const pick = (h, days) => Object.fromEntries(Object.entries(h).filter(([d]) => days.includes(+d)));
  const DEV = { 1: [[450, 1080]], 2: [[450, 1080]], 3: [[450, 1080]], 4: [[450, 1080]], 5: [[450, 1020]] };
  const LAB = { 1: [[420, 960]], 2: [[420, 960]], 3: [[420, 960]], 4: [[420, 960]], 5: [[420, 900]] };

  R.RESOURCES = [
    { id: 'r1', name: 'Dr. med. Anna Meier', short: 'Dr. Meier', kind: 'arzt', dept: 'kardio', site: 'LU', room: 'Haus 31, K-104', color: '#2F86C6', hours: DOC, types: ['erst', 'kontrolle'], threshold: 20 },
    { id: 'r2', name: 'Dr. med. Lukas Brunner', short: 'Dr. Brunner', kind: 'arzt', dept: 'kardio', site: 'LU', room: 'Haus 31, K-106', color: '#7A5AC8', hours: DOC, types: ['erst', 'kontrolle'], threshold: 20 },
    { id: 'r11', name: 'Echo- und Ergometrieraum K-110', short: 'Echo K-110', kind: 'raum', dept: 'kardio', site: 'LU', room: 'Haus 31, K-110', color: '#C99A12', hours: DEV, types: ['echo', 'ergo'], threshold: 20 },
    { id: 'r3', name: 'Dr. med. Sandra Keller', short: 'Dr. Keller', kind: 'arzt', dept: 'ortho', site: 'LU', room: 'Haus 2, O-12', color: '#1D8A57', hours: DOC, types: ['erst', 'kontrolle', 'nach'], threshold: 20 },
    { id: 'r4', name: 'PD Dr. med. Marco Huber', short: 'PD Dr. Huber', kind: 'arzt', dept: 'ortho', site: 'SU', room: 'Ambulatorium 1', color: '#C26A12', hours: pick(DOC, [1, 3, 5]), types: ['erst', 'kontrolle', 'nach'], threshold: 20 },
    { id: 'r5', name: 'Dr. med. Nina Widmer', short: 'Dr. Widmer', kind: 'arzt', dept: 'gyn', site: 'WO', room: 'Frauenklinik, Raum 3', color: '#C2417A', hours: pick(DOC, [2, 4, 5]), types: ['erst', 'kontrolle', 'ultra'], threshold: 20 },
    { id: 'r6', name: 'Dr. med. Reto Steiner', short: 'Dr. Steiner', kind: 'arzt', dept: 'gastro', site: 'SU', room: 'Endoskopie 2', color: '#0E8C8C', hours: DOC, types: ['erst', 'kontrolle', 'gastroskopie'], threshold: 25 },
    { id: 'r7', name: 'MRI 1 (Haus 31)', short: 'MRI 1', kind: 'geraet', dept: 'radio', site: 'LU', room: 'Haus 31, UG', color: '#5468D4', hours: DEV, types: ['mri'], threshold: 30 },
    { id: 'r8', name: 'CT 2 (Sursee)', short: 'CT 2', kind: 'geraet', dept: 'radio', site: 'SU', room: 'Radiologie EG', color: '#8A6D3B', hours: DEV, types: ['ct'], threshold: 30 },
    { id: 'r9', name: 'Blutentnahme Labor', short: 'Blutentnahme', kind: 'raum', dept: 'labor', site: 'LU', room: 'Haus 31, EG', color: '#64748B', hours: LAB, types: ['blut'], threshold: 30 },
    { id: 'r10', name: 'Gammakamera Szintigraphie', short: 'Gammakamera', kind: 'geraet', dept: 'nuk', site: 'LU', room: 'Haus 10, Nuklearmedizin', color: '#4F7A28', hours: pick(DEV, [1, 2, 3, 4]), types: ['szinti'], threshold: 30 },
  ];

  R.STATUS = {
    geplant: { label: 'Geplant', icon: 'clock', tone: 'neutral' },
    angekommen: { label: 'Angekommen', icon: 'pin', tone: 'info' },
    wartet: { label: 'Wartet', icon: 'hourglass', tone: 'warn' },
    behandlung: { label: 'In Behandlung', icon: 'stetho', tone: 'active' },
    fertig: { label: 'Fertig', icon: 'check', tone: 'ok' },
    noshow: { label: 'Nicht erschienen', icon: 'x', tone: 'bad' },
    abgesagt: { label: 'Abgesagt', icon: 'x', tone: 'muted' },
  };
  R.FLOW = ['geplant', 'angekommen', 'wartet', 'behandlung', 'fertig'];

  R.URGENCY = {
    u48: { label: 'Notfall innert 48 h', short: '48 h', rank: 0, tone: 'bad' },
    u2w: { label: 'Zeitnah innert 2 Wochen', short: '2 Wo.', rank: 1, tone: 'warn' },
    nd: { label: 'Nicht dringend', short: 'n. d.', rank: 2, tone: 'ok' },
  };

  R.DOCS = [
    { id: 'zuw', label: 'Zuweisung' },
    { id: 'bef', label: 'Vorbefunde' },
    { id: 'frg', label: 'Fragebogen' },
    { id: 'dol', label: 'Dolmetscher' },
  ];

  R.ROLES = {
    dispo: { label: 'Disposition', user: 'Sabine Kälin', scope: 'all', pages: ['kalender', 'tag', 'slots', 'warteliste', 'aufgaben', 'wand'], can: { book: 1, edit: 1, status: 1, waitlist: 1 }, visible: ['r1', 'r2'], notif: { verzug: 0, absage: 1, angebot: 1, erinnerung: 1, unterlagen: 1, reserve: 1 } },
    mpa: { label: 'MPA Kardiologie', user: 'Laura Wyss', scope: ['kardio'], pages: ['kalender', 'tag', 'slots', 'warteliste', 'aufgaben', 'wand'], can: { book: 1, edit: 1, status: 1, waitlist: 1 }, visible: ['r1', 'r2'], notif: { verzug: 1, absage: 1, angebot: 1, erinnerung: 0, unterlagen: 1, reserve: 1 } },
    empfang: { label: 'Empfang Kardiologie', user: 'Peter Bucher', scope: ['kardio'], pages: ['tag', 'kalender', 'wand'], can: { status: 1 }, visible: ['r1', 'r2', 'r11'], notif: { verzug: 1, absage: 1, angebot: 0, erinnerung: 0, unterlagen: 0, reserve: 0 } },
    arzt: { label: 'Ärztin Kardiologie', user: 'Dr. med. Anna Meier', scope: ['kardio'], own: 'r1', pages: ['tag', 'kalender'], can: { status: 1 }, visible: ['r1'], notif: { verzug: 1, absage: 0, angebot: 0, erinnerung: 0, unterlagen: 0, reserve: 0 } },
    pflege: { label: 'Pflege (lesend)', user: 'Marco Gisler', scope: ['kardio', 'ortho'], pages: ['tag', 'kalender', 'wand'], can: {}, visible: ['r1', 'r2', 'r3'], notif: { verzug: 1, absage: 0, angebot: 0, erinnerung: 0, unterlagen: 0, reserve: 0 } },
    leitung: { label: 'Abteilungsleitung', user: 'Prof. Dr. med. Thomas Roth', scope: 'all', anon: true, pages: ['kennzahlen', 'kalender', 'tag', 'protokoll'], can: {}, visible: ['r1', 'r2', 'r3'], notif: { verzug: 1, absage: 0, angebot: 0, erinnerung: 0, unterlagen: 0, reserve: 0 } },
  };

  R.NOTIF_KINDS = {
    verzug: { label: 'Verzug über Schwelle', level: 'wichtig' },
    absage: { label: 'Absage / freier Slot', level: 'wichtig' },
    angebot: { label: 'Antwort auf Nachrück-Angebot', level: 'hinweis' },
    erinnerung: { label: 'Unbestätigte Termine (48 h)', level: 'hinweis' },
    unterlagen: { label: 'Fehlende Unterlagen', level: 'hinweis' },
    reserve: { label: 'Reserve-Slot freigegeben', level: 'hinweis' },
  };

  R.res = (id) => R.RESOURCES.find((r) => r.id === id);
  R.type = (id) => R.TYPES.find((t) => t.id === id) || { id, name: id, dur: 20 };
  R.dept = (id) => R.DEPTS.find((d) => d.id === id) || { id, name: id };
  R.site = (id) => R.SITES.find((s) => s.id === id) || { id, name: id };

  /* ---------------------------------------------------------------- demo generator */
  const FIRST = ['Anna', 'Beat', 'Claudia', 'Daniel', 'Elena', 'Fabian', 'Gabriela', 'Hans', 'Irene', 'Jonas', 'Karin', 'Lukas', 'Monika', 'Nicole', 'Oliver', 'Petra', 'Reto', 'Sabrina', 'Thomas', 'Ursula', 'Verena', 'Walter', 'Yvonne', 'Zoe', 'Marco', 'Luca', 'Mia', 'Lea', 'Noah', 'Laura', 'Nina', 'Simon', 'Andrea', 'Bruno', 'Céline', 'Dragan', 'Elif', 'Fatma', 'Giulia', 'Hüseyin', 'Ivana', 'Jasmin', 'Kevin', 'Leonie', 'Mehmet', 'Nadine', 'Pascal', 'Rita', 'Sandro', 'Tamara', 'Urs', 'Vreni', 'Werner', 'Agnes', 'Josef', 'Margrit', 'Arben', 'Ana', 'Tesfay', 'Samira'];
  const LAST = ['Müller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber', 'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Moser', 'Widmer', 'Wyss', 'Graf', 'Roth', 'Bucher', 'Kälin', 'Amstutz', 'Achermann', 'Bühler', 'Bachmann', 'Portmann', 'Stadelmann', 'Wicki', 'Zurmühle', 'Felder', 'Lustenberger', 'Arnold', 'Fuchs', 'Studer', 'Bieri', 'Hofstetter', 'Marti', 'Bucheli', 'Rossi', 'Bernasconi', 'Ferreira', 'Krasniqi', 'Yilmaz', 'Berisha', 'Da Silva', 'Kaufmann', 'Schürmann', 'Imfeld', 'Odermatt', 'Tesfaye', 'Haddad'];
  const LANGS = ['Albanisch', 'Türkisch', 'Portugiesisch', 'Tigrinya', 'Arabisch', 'Italienisch'];

  /* Pick the demo "now": the real time if it falls inside office hours on a weekday,
     otherwise 10:20 on the next weekday, so the demo always shows a running clinic. */
  R.demoOffset = function () {
    const real = new Date();
    const m = real.getHours() * 60 + real.getMinutes();
    const wd = real.getDay();
    if (wd > 0 && wd < 6 && m >= 465 && m <= 1005) return 0;
    const t = new Date(real);
    if (m > 1005 || wd === 0 || wd === 6) t.setDate(t.getDate() + 1);
    while (t.getDay() === 0 || t.getDay() === 6) t.setDate(t.getDate() + 1);
    t.setHours(10, 20, 0, 0);
    return t - real;
  };

  R.generate = function () {
    const now = R.now();
    const today = now.day;
    const rnd = R.rng('luks-' + today);
    const db = { v: 3, generatedFor: today, rev: 1, seq: 1000, patients: [], appts: [], waitlist: [], notifs: [], log: [], verzugSeen: {}, kpiBase: null };
    let tno = 41200;

    for (let i = 0; i < 520; i++) {
      const first = rnd.pick(FIRST), last = rnd.pick(LAST);
      db.patients.push({
        id: 'p' + i, first, last, pid: 'P-' + (100400 + i * 7 + rnd.int(0, 6)),
        born: `${rnd.int(1, 28)}.${R.pad(rnd.int(1, 12))}.${rnd.int(1938, 2006)}`,
        phone: `07${rnd.pick([6, 7, 8, 9])} ${rnd.int(100, 999)} ${rnd.int(10, 99)} ${rnd.int(10, 99)}`,
        lang: rnd.chance(0.07) ? rnd.pick(LANGS) : null,
        channel: rnd.chance(0.55) ? 'MeinLUKS' : 'SMS',
      });
    }
    const patPool = db.patients.slice(0, 470); /* the rest are reserved for the waiting list */

    const pastDays = 42, futureDays = 28;
    const start = R.startOfWeek(R.addDays(today, -pastDays));
    for (let i = 0; i <= R.daysBetween(start, today) + futureDays; i++) {
      const day = R.addDays(start, i);
      if (!R.isWeekday(day)) continue;
      const offset = R.daysBetween(today, day);
      for (const res of R.RESOURCES) {
        const blocks = res.hours[R.dow(day)];
        if (!blocks) continue;
        /* absences */
        if (res.id === 'r2' && offset === 1) { db.appts.push(mk({ res: res.id, day, s: 0, d: 1440, kind: 'block', allDay: true, title: 'Dr. Brunner – Kongress ESC' })); continue; }
        if (res.id === 'r3' && offset >= 6 && offset <= 8 && R.isWeekday(day)) { db.appts.push(mk({ res: res.id, day, s: 0, d: 1440, kind: 'block', allDay: true, title: 'Dr. Keller – Ferien' })); continue; }
        if (res.id === 'r7' && offset === 2) db.appts.push(mk({ res: res.id, day, s: 450, d: 150, kind: 'block', title: 'Wartung MRI 1' }));
        if (res.id === 'r1' && offset === 0) db.appts.push(mk({ res: res.id, day, s: 720, d: 45, kind: 'block', title: 'Rapport Kardiologie' }));

        /* fill rate: past days are well booked, the near future too, later weeks have gaps */
        const fill = offset < 0 ? 0.9 : offset === 0 ? 0.93 : offset <= 3 ? 0.86 : offset <= 10 ? 0.7 : offset <= 20 ? 0.48 : 0.3;
        const reserveAt = res.kind === 'arzt' ? rnd.pick([600, 900, 960]) : -1;
        for (const [a, b] of blocks) {
          let t = a;
          while (t < b) {
            const typeId = rnd.pick(res.types);
            const ty = R.type(typeId);
            const d = ty.dur;
            if (t + d > b) break;
            const busy = db.appts.some((x) => x.res === res.id && x.day === day && x.s < t + d && x.s + x.d > t);
            if (busy) { t += 5; continue; }
            if (t === reserveAt) { db.appts.push(mk({ res: res.id, day, s: t, d: 40, kind: 'reserve', title: 'Reserve dringlich' })); t += 40; continue; }
            if (rnd.chance(fill)) {
              db.appts.push(patientAppt(res, day, t, typeId, offset));
              t += d;
            } else t += rnd.pick([10, 20, d]);
          }
        }
      }
    }

    function mk(o) { return Object.assign({ id: 'a' + (db.seq++), no: 'T-' + (tno++), kind: 'pat', st: 'geplant' }, o); }

    function patientAppt(res, day, s, typeId, offset) {
      const p = rnd.pick(patPool);
      const u = rnd.chance(0.12) ? 'u48' : rnd.chance(0.35) ? 'u2w' : 'nd';
      const wait = Math.round((u === 'u48' ? rnd.int(0, 2) : u === 'u2w' ? rnd.int(4, 14) : rnd.int(14, 60)) * (1 + Math.max(0, -offset) * 0.008));
      const a = mk({ res: res.id, day, s, d: R.type(typeId).dur, type: typeId, pat: p.id, urg: u, ref: R.addDays(day, -wait), channel: p.channel });
      a.docs = { zuw: 1, bef: 1, frg: 1, dol: p.lang ? 1 : null };
      if (offset >= 0) {
        if (rnd.chance(0.03)) a.docs.bef = 0;
        if (rnd.chance(0.02)) a.docs.frg = 0;
        if (rnd.chance(0.008)) a.docs.zuw = 0;
        if (p.lang && rnd.chance(0.3)) a.docs.dol = 0;
      }
      if (offset < 0) {
        const r = rnd();
        if (r < 0.035) {
          a.st = 'abgesagt';
          a.cx = { at: R.addDays(day, -1) + ' 09:10', by: 'Telefon', short: true, refill: rnd.chance(Math.max(0.12, 0.45 + offset * 0.008)) ? 'x' : null };
        } else if (r < 0.035 + Math.max(0.07, 0.08 - offset * 0.0012)) a.st = 'noshow';
        else {
          a.st = 'fertig';
          const late = Math.max(0, Math.round(rnd() * rnd() * 45 - 6 - offset * 0.18));
          a.ta = s - rnd.int(2, 15); a.ts = s + late; a.te = a.ts + a.d + rnd.int(-4, 8);
        }
        a.conf = rnd.chance(0.7) ? 'bestaetigt' : 'gesendet';
      } else if (offset <= 1) {
        a.conf = rnd.chance(0.86) ? 'bestaetigt' : 'gesendet';
      }
      return a;
    }

    /* ---- today: bring the running clinic to life. Each consultation drifts a little;
       Dr. Meier's runs over (complex cases), so her afternoon slips (module 4). */
    const m = Math.floor(now.min);
    for (const res of R.RESOURCES) {
      const list = db.appts.filter((a) => a.res === res.id && a.day === today && a.kind === 'pat').sort((x, y) => x.s - y.s);
      const cap = res.id === 'r1' ? 26 : res.id === 'r6' ? 12 : 4;
      let lag = 0, prevEnd = null;
      for (const a of list) {
        if (prevEnd !== null) lag = Math.max(0, lag - Math.max(0, a.s - prevEnd));
        prevEnd = a.s + a.d;
        const rs = a.s + lag;
        if (rs + a.d <= m) {
          if (res.id !== 'r1' && rnd.chance(0.08)) { a.st = 'noshow'; lag = Math.max(0, lag - a.d); continue; }
          const extra = res.id === 'r1' ? rnd.int(4, 9) : res.id === 'r6' ? rnd.int(0, 5) : rnd.int(-2, 3);
          a.st = 'fertig'; a.ta = a.s - rnd.int(3, 14); a.ts = rs; a.te = rs + a.d + extra;
          lag = Math.min(cap, Math.max(0, lag + extra));
        } else if (rs <= m) {
          a.st = 'behandlung'; a.ta = a.s - rnd.int(3, 12); a.ts = rs;
        } else if (a.s - m <= 25) {
          a.st = rnd.chance(0.5) ? 'wartet' : 'angekommen';
          a.ta = Math.min(m - 1, a.s - rnd.int(2, 15));
        }
      }
    }

    /* A cancellation this morning for a slot later today (concept example) */
    const cxSlot = db.appts.find((a) => a.res === 'r1' && a.day === today && a.kind === 'pat' && a.st === 'geplant' && a.s >= m + 120)
      || db.appts.find((a) => a.res === 'r1' && R.daysBetween(today, a.day) === 1 && a.kind === 'pat');
    if (cxSlot) {
      cxSlot.st = 'abgesagt';
      cxSlot.cx = { at: `${today} ${R.tm(Math.max(450, m - 18))}`, by: 'Telefon', short: true, refill: null, offers: [] };
    }
    /* one more cancellation tomorrow in orthopaedics, reported via the reminder */
    const cx2 = db.appts.find((a) => a.res === 'r3' && R.daysBetween(today, a.day) === 1 && a.kind === 'pat' && a.s >= 780);
    if (cx2) { cx2.st = 'abgesagt'; cx2.conf = 'abgesagt'; cx2.cx = { at: `${today} ${R.tm(Math.max(450, m - 55))}`, by: 'Erinnerung (SMS)', short: true, refill: null, offers: [] }; }

    /* ---- waiting list */
    const wl = [
      ['kardio', 'erst', 'u48', 3, ['LU'], 'Belastungsdyspnoe, Troponin grenzwertig'],
      ['kardio', 'kontrolle', 'u48', 2, ['LU'], 'Neu Vorhofflimmern, Antikoagulation eingeleitet'],
      ['kardio', 'erst', 'u2w', 9, ['LU', 'SU'], 'Synkope unklarer Genese'],
      ['kardio', 'kontrolle', 'u2w', 12, ['LU'], 'Kontrolle nach Medikamentenumstellung'],
      ['kardio', 'erst', 'nd', 34, ['LU'], 'Abklärung Herzgeräusch'],
      ['kardio', 'echo', 'u2w', 6, ['LU'], 'Echo vor Sprechstunde'],
      ['ortho', 'erst', 'u2w', 11, ['LU', 'SU'], 'Gonarthrose, Schmerzen zunehmend'],
      ['ortho', 'nach', 'u48', 1, ['SU'], 'Wundkontrolle nach Hüft-TP'],
      ['ortho', 'erst', 'nd', 45, ['SU'], 'Schulterschmerzen rechts'],
      ['ortho', 'kontrolle', 'nd', 27, ['LU'], 'Verlaufskontrolle Fraktur'],
      ['gyn', 'ultra', 'u2w', 8, ['WO'], 'Zyste links, Verlaufskontrolle'],
      ['gyn', 'erst', 'nd', 21, ['WO'], 'Zuweisung Hausarztpraxis Willisau'],
      ['gastro', 'gastroskopie', 'u2w', 10, ['SU'], 'Dysphagie'],
      ['gastro', 'erst', 'nd', 38, ['SU', 'LU'], 'Reizdarm, Zweitmeinung'],
      ['radio', 'mri', 'u2w', 7, ['LU'], 'MRI Knie vor Sprechstunde'],
      ['radio', 'ct', 'u48', 1, ['SU'], 'CT Thorax, Verdacht Lungenembolie ausgeschlossen? Nachkontrolle'],
      ['nuk', 'szinti', 'nd', 19, ['LU'], 'Skelettszintigraphie'],
      ['labor', 'blut', 'nd', 4, ['LU'], 'Labor vor Kontrolle'],
    ];
    wl.forEach(([dept, type, urg, days, sites, note], i) => {
      const p = db.patients[470 + i];
      db.waitlist.push({ id: 'w' + i, pat: p.id, dept, type, urg, since: R.addDays(today, -days), sites, earliest: today, note, st: 'offen', offers: [] });
    });

    /* ---- log */
    db.log.push({ at: R.stamp(), user: 'System', role: 'LUKiS', action: 'Termindaten synchronisiert', target: `${db.appts.length} Termine` });
    return db;
  };
})();
