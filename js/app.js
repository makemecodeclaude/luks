/* LUKS Info-Terminal – application (no build step, runs from file:// in kiosk mode) */
(function () {
  'use strict';

  const C = window.LUKS_CONFIG;
  const D = window.LUKS_DATA;
  const I = window.LUKS_I18N;
  const { icon, flag } = window.LUKS_GFX;

  const NATIONAL = ['de', 'fr', 'it', 'rm'];
  const MAIN_LANGS = ['de', 'fr', 'it', 'rm', 'en'];
  const EXTRA_LANGS = ['pt', 'sq', 'es', 'tr'];
  const MAP_W = 2000, MAP_H = 777;
  const params0 = new URLSearchParams(location.search);
  const DEMO_SCAN = C.demoScan || params0.has('demo');

  const state = {
    lang: C.defaultLang,
    large: false,
    extraOpen: false,
    query: '',
    overlay: null,
    overlayKind: '',
    timers: [],
    stream: null,
  };

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const t = (k, vars, lang) => I.t(k, vars, lang || state.lang);
  const L = (o, lang) => I.pick(o, lang || state.lang);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const locale = (lang) => (I.LANGS[lang || state.lang] || I.LANGS.de).locale;
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const catOf = (id) => byId(D.CATS, id);
  const building = (id) => byId(D.BUILDINGS, id);
  const later = (fn, ms) => { const h = setTimeout(fn, ms); state.timers.push(h); return h; };
  const every = (fn, ms) => { const h = setInterval(fn, ms); state.timers.push(h); return h; };
  const clearTimers = () => { state.timers.forEach((h) => { clearTimeout(h); clearInterval(h); }); state.timers = []; };
  const verifyTag = (item) => (item && item.verify && C.showVerifyHints ? `<span class="tag verify">${esc(t('demo'))}</span>` : '');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const countLabel = (n) => (n === 1 ? t('location1') : t('locations', { n }));

  function fmtTime(d, lang) {
    try { return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(d); }
    catch (e) { return d.toTimeString().slice(0, 5); }
  }
  function fmtDate(d) {
    try { return new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d); }
    catch (e) { return d.toDateString(); }
  }
  function weekday(i) {
    const d = new Date(2024, 0, 7 + i); // 7 Jan 2024 = Sunday
    try { return new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(d); }
    catch (e) { return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][i]; }
  }
  function fmtHours(hours) {
    if (!hours || !hours.length) return '';
    return hours.map((h) => {
      const d = h.d;
      let days;
      if (d.length === 7) days = `${weekday(1)}–${weekday(0)}`;
      else if (d.length > 2 && d.every((x, i) => i === 0 || x === d[i - 1] + 1)) days = `${weekday(d[0])}–${weekday(d[d.length - 1])}`;
      else days = d.map(weekday).join(', ');
      const time = h.f === '00:00' && h.t === '24:00' ? '24 h' : `${h.f}–${h.t}`;
      return `${days} ${time}`;
    }).join(' · ');
  }
  function isOpen(hours, now = new Date()) {
    if (!hours || !hours.length) return null;
    const mins = now.getHours() * 60 + now.getMinutes();
    const m = (s) => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
    return hours.some((h) => h.d.includes(now.getDay()) && mins >= m(h.f) && mins < m(h.t));
  }
  function floorLabel(n) {
    if (n === undefined || n === null) return '';
    if (n === 0) return t('floor0');
    return n > 0 ? t('floorN', { n }) : t('floorMinus');
  }
  function buildingLabel(id) {
    const b = building(id);
    if (!b) return '';
    const nm = L(b.name);
    return /\d/.test(nm) ? nm : `${t('house')} ${b.id} · ${nm}`;
  }
  function locLine(item) {
    if (!item.building) return t('locationTbd');
    const b = building(item.building);
    const parts = [buildingLabel(item.building)];
    if (item.floor !== undefined) parts.push(floorLabel(item.floor));
    if (b) parts.push(`${t('gridRef')} ${b.grid}`);
    return parts.join(' · ');
  }

  /* ---------- items that can be shown on the map ---------- */
  function placeTitle(p) { return p.name ? L(p.name) : t('cat_' + p.cat); }
  function allPins() {
    const pins = D.PLACES.map((p) => ({ key: 'place:' + p.id, cat: p.cat, x: p.x, y: p.y, title: placeTitle(p), item: p, badge: p.badge }));
    D.RESTAURANTS.filter((r) => r.x != null).forEach((r) => pins.push({ key: 'rest:' + r.id, cat: 'food', x: r.x, y: r.y, title: r.name, item: r }));
    return pins;
  }
  function pinsOf(cat) { return allPins().filter((p) => cat === 'all' || p.cat === cat); }
  function resolveTarget(key) {
    if (!key) return null;
    const [kind, id] = key.split(':');
    if (kind === 'place') { const p = byId(D.PLACES, id); return p && { key, x: p.x, y: p.y, title: placeTitle(p), cat: p.cat, item: p }; }
    if (kind === 'rest') { const r = byId(D.RESTAURANTS, id); return r && r.x != null && { key, x: r.x, y: r.y, title: r.name, cat: 'food', item: r }; }
    if (kind === 'dir') { const d = byId(D.DIRECTORY, id); return d && { key, x: d.x, y: d.y, title: L(d.name), cat: 'dir', icon: typeIcon(d.type), item: d }; }
    if (kind === 'bld') { const b = building(id); return b && { key, x: b.x, y: b.y, title: buildingLabel(id), cat: 'bld', icon: 'building', item: { building: id } }; }
    return null;
  }
  const catIcon = (cat) => (catOf(cat) ? catOf(cat).icon : 'pin');
  const typeIcon = (type) => ({ dept: 'building', doctor: 'stethoscope', service: 'service', place: 'pin', food: 'food', bld: 'building' }[type] || 'pin');

  /* ---------- shared UI pieces ---------- */
  function clockHtml() { return '<div class="clock" aria-hidden="true"><span class="clock-time"></span><span class="clock-date"></span></div>'; }
  function brandHtml() {
    return `<div class="brand"><span class="brand-mark">${icon('mark')}</span><span class="brand-text"><strong>LUKS</strong><small>Luzerner Kantonsspital</small></span></div>`;
  }
  function topbar(kind) {
    if (kind === 'landing') {
      const dots = MAIN_LANGS.map((l) => `<button class="lang-dot${l === state.lang ? ' on' : ''}" data-action="setLang" data-lang="${l}" aria-pressed="${l === state.lang}" aria-label="${esc(I.LANGS[l].name)}">${flag(I.LANGS[l].flag)}<span>${l.toUpperCase()}</span></button>`).join('');
      return `<header class="topbar">${brandHtml()}<div class="topbar-right"><div class="lang-dots" role="group" aria-label="${esc(t('language'))}">${dots}</div>${clockHtml()}</div></header>`;
    }
    const langChip = kind === 'lang' ? '' :
      `<button class="pill-btn" data-go="#/sprache" aria-label="${esc(t('language'))}">${flag(I.LANGS[state.lang].flag)}<span>${esc(I.LANGS[state.lang].name)}</span></button>`;
    return `<header class="topbar">
      <div class="nav-btns">
        <button class="sq-btn home" data-action="home" aria-label="${esc(t('home'))}">${icon('home')}</button>
        <button class="sq-btn back" data-action="back" aria-label="${esc(t('back'))}">${icon('arrowL')}</button>
      </div>
      ${brandHtml()}
      <div class="topbar-right">${langChip}
        <button class="pill-btn icon-only" data-action="textSize" aria-pressed="${state.large}" aria-label="${esc(t('textSize'))}" title="${esc(t('textSize'))}">${icon('textSize')}</button>
        ${clockHtml()}
      </div>
    </header>`;
  }
  function helpButton(xl) {
    const sub = xl
      ? MAIN_LANGS.filter((l) => l !== state.lang).map((l) => t('help', null, l)).join(' · ')
      : t('helpSub');
    return `<button class="help-btn${xl ? ' xl' : ''}" data-action="help">
      <span class="help-ico">${icon('headset')}</span>
      <span class="help-text"><strong>${esc(t('help'))}</strong><small>${esc(sub)}</small></span>
      <span class="arrow-circ">${icon('arrowUR')}</span>
    </button>`;
  }
  const helpbar = () => `<div class="helpbar">${helpButton(false)}</div>`;
  const pageHead = (eyebrow, title, lead) => `<header class="page-head"><p class="eyebrow">${esc(eyebrow)}</p><h1 class="display-s">${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</header>`;

  /* ======================================================================
     Page 1 – Start / QR check-in
     ====================================================================== */
  function pageLanding() {
    const others = (key) => NATIONAL.filter((l) => l !== state.lang).map((l) => t(key, null, l)).join(' · ');
    const greet = NATIONAL.map((l, i) => `<span lang="${l}"${i ? ' class="soft"' : ''}>${esc(t('welcome', null, l))}.</span>`).join(' ');
    const rows = NATIONAL.map((l) => `<li lang="${l}"${l === state.lang ? ' class="on"' : ''}>${flag(I.LANGS[l].flag)}<div><strong>${esc(t('scanTitle', null, l))}</strong><span>${esc(t('scanSub', null, l))}</span></div></li>`).join('');
    const camBtn = 'BarcodeDetector' in window ? 'data-action="camera"' : 'tabindex="-1"';
    return `<section class="page landing">
      ${topbar('landing')}
      <div class="page-body">
        <header class="hero">
          <p class="eyebrow">${esc(t('kioskName'))} · Luzern</p>
          <h1 class="display">${greet}</h1>
        </header>
        <div class="scan-group">
          <div class="scan-card card">
            <button class="scan-visual" ${camBtn} aria-label="QR">${icon('qr')}<span class="scan-line"></span></button>
            <ul class="scan-langs">${rows}</ul>
          </div>
          <div class="scan-pointer">${icon('arrowDown')}<span>${esc(t('scannerHere'))}</span></div>
          ${DEMO_SCAN ? '<button class="ghost-btn" data-action="demoScan">Demo · QR-Scan simulieren</button>' : ''}
        </div>
        <div class="action-row">
          <button class="tile" data-action="ticket">
            <span class="tile-ico">${icon('ticket')}</span>
            <span class="tile-title">${esc(t('noQr'))}</span>
            <span class="tile-sub">${esc(t('noQrSub'))}</span>
            <span class="tile-alt">${esc(others('noQr'))}</span>
            <span class="arrow-circ">${icon('printer')}</span>
          </button>
          <button class="tile" data-go="#/sprache">
            <span class="tile-ico">${icon('info')}</span>
            <span class="tile-title">${esc(t('moreInfo'))}</span>
            <span class="tile-sub">${esc(t('moreInfoSub'))}</span>
            <span class="tile-alt">${esc(others('moreInfo'))}</span>
            <span class="arrow-circ">${icon('arrowUR')}</span>
          </button>
        </div>
        ${helpButton(true)}
      </div>
    </section>`;
  }

  /* ======================================================================
     Page 3 – Language selection
     ====================================================================== */
  function pageLanguage() {
    const words = [...new Set(MAIN_LANGS.map((l) => t('language', null, l)))];
    const title = words.map((w, i) => `<span${i ? ' class="soft"' : ''}>${esc(w)}</span>`).join(' · ');
    const card = (l, small) => `<button class="tile lang-card" data-action="pickLang" data-lang="${l}" lang="${l}">
        ${flag(I.LANGS[l].flag)}
        <span><span class="lang-name">${esc(I.LANGS[l].name)}</span><br><span class="tile-sub">${esc(t('langContinue', null, l))}</span></span>
        ${small ? '' : `<span class="arrow-circ">${icon('arrowUR')}</span>`}
      </button>`;
    const more = `<button class="tile lang-card more" data-action="toggleExtra" aria-expanded="${state.extraOpen}">
        <span class="flag-cluster">${EXTRA_LANGS.map((l) => flag(I.LANGS[l].flag)).join('')}</span>
        <span><span class="lang-name">${esc(t('moreLangs'))}</span><br><span class="tile-sub">${EXTRA_LANGS.map((l) => esc(I.LANGS[l].name)).join(' · ')}</span></span>
        <span class="arrow-circ">${icon(state.extraOpen ? 'x' : 'chevD')}</span>
      </button>`;
    const extra = state.extraOpen ? `<div class="lang-extra" role="group" aria-label="${esc(t('moreLangsSub'))}">${EXTRA_LANGS.map((l) => card(l, true)).join('')}</div>` : '';
    return `<section class="page lang-page">
      ${topbar('lang')}
      <div class="page-body">
        <header class="page-head">
          <p class="eyebrow">${MAIN_LANGS.map((l) => esc(t('langEyebrow', null, l))).join(' · ')}</p>
          <h1 class="display">${title}</h1>
          <p class="lead">${esc(t('langTitle'))}</p>
        </header>
        <div class="lang-grid">${MAIN_LANGS.map((l) => card(l)).join('')}${more}${extra}</div>
      </div>
      ${helpbar()}
    </section>`;
  }

  /* ======================================================================
     Page 4 – Information hub
     ====================================================================== */
  function pageHub() {
    const servIcons = D.CATS.filter((c) => c.services).map((c) => `<span title="${esc(t('cat_' + c.id))}">${icon(c.icon)}</span>`).join('');
    const quick = [
      ['place:er-b', 'emergency', 'emergency'], ['place:info-31', 'info', 'info'], ['place:pharmacy-31', 'pharmacy', 'pharmacy'],
      ['rest:feingut', 'food', null, 'Feingut'], ['place:bus-1', 'bus', 'bus'], ['place:park-34', 'parking', 'parking'],
    ].map(([key, cat, label, name]) => `<button class="chip" data-go="#/info/karte?cat=${cat}&focus=${key}">${icon(catIcon(cat))}${esc(name || t('cat_' + label))}</button>`).join('');
    const card = (go, ic, title, sub, extra = '') => `<button class="tile hub-card" data-go="${go}">
        <span class="tile-ico">${icon(ic)}</span>
        <span class="tile-title">${esc(t(title))}</span>
        <span class="tile-sub">${esc(t(sub))}</span>
        ${extra}
        <span class="arrow-circ">${icon('arrowUR')}</span>
      </button>`;
    return `<section class="page hub">
      ${topbar('inner')}
      <div class="page-body">
        <div class="wave" aria-hidden="true"></div>
        ${pageHead(t('hubEyebrow'), t('hubTitle'))}
        <div class="hub-grid">
          ${card('#/info/karte', 'map', 'mapT', 'mapS')}
          ${card('#/info/gastro', 'food', 'foodT', 'foodS')}
          ${card('#/info/services', 'signpost', 'servT', 'servS', `<span class="mini-icons">${servIcons}</span>`)}
          ${card('#/info/suche', 'search', 'searchT', 'searchS', `<span class="fake-search">${icon('search')}${esc(t('searchExample'))}</span>`)}
        </div>
        <div class="quick">
          <p class="section-label">${esc(t('quick'))}</p>
          <div class="chips">${quick}</div>
        </div>
      </div>
      ${helpbar()}
    </section>`;
  }

  /* ---------- Site map ---------- */
  function mapSvg(pins, target) {
    const yah = C.terminalPos;
    let vb = [0, 0, MAP_W, MAP_H];
    if (target) {
      const ratio = MAP_W / MAP_H;
      const x0 = Math.min(target.x, yah.x) - 170, x1 = Math.max(target.x, yah.x) + 170;
      const y0 = Math.min(target.y, yah.y) - 120, y1 = Math.max(target.y, yah.y) + 140;
      let w = Math.max(x1 - x0, 760), h = Math.max(y1 - y0, w / ratio);
      w = Math.max(w, h * ratio); h = w / ratio;
      if (w > MAP_W) { w = MAP_W; h = MAP_H; }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      vb = [Math.min(Math.max(cx - w / 2, 0), MAP_W - w), Math.min(Math.max(cy - h / 2, 0), MAP_H - h), w, h];
    }
    const k = vb[2] / MAP_W;            // keep pins the same size on screen when zoomed
    const r = Math.max(13, 27 * k);
    const pinSvg = (p, focus) => {
      const rr = focus ? r * 1.3 : r;
      const cls = `pin cat-${p.cat}${p.item && p.item.verify ? ' verify' : ''}${focus ? ' focus' : ''}${target && !focus ? ' dim' : ''}`;
      const inner = p.badge
        ? `<text text-anchor="middle" dy=".36em" fill="#fff" style="font:700 ${rr}px var(--font)">${p.badge}</text>`
        : `<svg class="pin-ico" x="${-rr * 0.58}" y="${-rr * 0.58}" width="${rr * 1.16}" height="${rr * 1.16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${window.LUKS_GFX.ICONS[p.icon || catIcon(p.cat)]}</svg>`;
      return `<g class="${cls}" transform="translate(${p.x} ${p.y})" data-action="focusPin" data-key="${p.key}" role="button" aria-label="${esc(p.title)}">
        ${focus ? `<circle class="pin-pulse" r="${rr * 1.2}"/>` : ''}
        <circle r="${rr * 1.6}" fill="transparent"/>
        <circle class="pin-bg" r="${rr}" style="stroke-width:${Math.max(2, 4 * k)}"/>${inner}</g>`;
    };
    let route = '';
    if (target) {
      const mx = (yah.x + target.x) / 2, my = Math.max(yah.y, target.y) + Math.min(120, Math.abs(yah.x - target.x) * 0.25) + 20 * k;
      const d = `M${yah.x} ${yah.y} Q${mx} ${my} ${target.x} ${target.y}`;
      route = `<path class="route-halo" d="${d}" style="stroke-width:${15 * Math.max(k, .5)}"/><path class="route" d="${d}" style="stroke-width:${7 * Math.max(k, .5)}"/>`;
    }
    const fs = Math.max(13, 22 * k);
    const label = t('youAreHere');
    const lw = label.length * fs * 0.56 + fs * 1.6;
    const yahSvg = `<g transform="translate(${yah.x} ${yah.y})">
        <circle class="yah-pulse" r="${22 * Math.max(k, .5)}"/><circle class="yah-dot" r="${12 * Math.max(k, .5)}" style="stroke-width:${Math.max(2, 5 * k)}"/>
        <g class="yah-label" transform="translate(0 ${30 * Math.max(k, .5)})"><rect x="${-lw / 2}" y="0" width="${lw}" height="${fs * 1.7}" rx="${fs * 0.85}"/>
        <text x="0" y="${fs * 1.17}" text-anchor="middle" style="font-size:${fs}px">${esc(label)}</text></g></g>`;
    const shown = pins.filter((p) => !target || p.key !== target.key);
    const tPin = target ? pinSvg({ key: target.key, x: target.x, y: target.y, cat: target.cat, icon: target.icon, item: target.item, title: target.title, badge: target.item && target.item.badge }, true) : '';
    return `<svg class="map-svg" viewBox="${vb.map((n) => n.toFixed(1)).join(' ')}" role="img" aria-label="${esc(t('mapNote'))}">
      <image href="assets/arealplan-luzern.jpg" x="0" y="0" width="${MAP_W}" height="${MAP_H}"/>
      ${route}${shown.map((p) => pinSvg(p, false)).join('')}${yahSvg}${tPin}
    </svg>`;
  }

  function pageMap(params) {
    const cat = params.get('cat') || 'all';
    const target = resolveTarget(params.get('focus'));
    const chipCats = ['all', 'emergency', 'info', 'food', 'wc', 'wc_access', 'baby', 'pharmacy', 'kiosk', 'atm', 'cash', 'lockers', 'parking', 'bus', 'chapel'];
    const chips = chipCats.map((c) => {
      const label = c === 'all' ? t('allCats') : t('cat_' + c);
      const ic = c === 'all' ? 'map' : catIcon(c);
      return `<button class="chip${c === cat ? ' on' : ''}" data-go="#/info/karte?cat=${c}" data-replace="1">${icon(ic)}${esc(label)}</button>`;
    }).join('');
    const pins = pinsOf(cat);
    const yah = C.terminalPos;

    let list;
    if (cat === 'all') {
      const ids = ['31', '33', '30', '21', '34', '51', '11', '46'];
      list = `<p class="section-label">${esc(t('buildings'))}</p>` + ids.map((id) => {
        const key = 'bld:' + id;
        return `<button class="loc-item${target && target.key === key ? ' on' : ''}" data-go="#/info/karte?cat=all&focus=${key}" data-replace="1">
          <span class="loc-ico">${icon('building')}</span>
          <span class="loc-main"><strong>${esc(buildingLabel(id))}</strong><span>${esc(t('gridRef'))} ${esc(building(id).grid)}</span></span>${icon('chevR')}</button>`;
      }).join('');
    } else {
      list = pins.slice().sort((a, b) => dist(a, yah) - dist(b, yah)).map((p, i) => `
        <button class="loc-item${target && target.key === p.key ? ' on' : ''}" data-go="#/info/karte?cat=${cat}&focus=${p.key}" data-replace="1">
          <span class="loc-ico${p.cat === 'emergency' ? ' alert' : ''}">${icon(catIcon(p.cat))}</span>
          <span class="loc-main"><strong>${esc(p.title)}</strong><span>${esc(locLine(p.item))}</span>${i === 0 ? `<span><span class="tag">${esc(t('nearest'))}</span> ${verifyTag(p.item)}</span>` : (p.item.verify && C.showVerifyHints ? `<span>${verifyTag(p.item)}</span>` : '')}</span>
          ${icon('chevR')}</button>`).join('');
    }

    const focusCard = target ? `<div class="focus-card">
        <span class="fc-ico">${icon(target.icon || catIcon(target.cat))}</span>
        <div><strong>${esc(target.title)}</strong><span>${esc(locLine(target.item))}</span>${target.item.verify && C.showVerifyHints ? `<br>${verifyTag(target.item)}` : ''}</div>
      </div>` : '';

    return `<section class="page map-page">
      ${topbar('inner')}
      <div class="page-body">
        ${pageHead(t('mapT'), target ? t('goTo') : t('mapS'))}
        <div class="chips" role="group">${chips}</div>
        ${focusCard}
        <div class="map-layout">
          <div class="map-card card">
            ${mapSvg(pins, target)}
            ${target ? `<button class="pill-btn map-zoom" data-go="#/info/karte?cat=${cat}" data-replace="1">${icon('map')}<span>${esc(t('zoomOut'))}</span></button>` : ''}
            <div class="map-caption"><span>${esc(t('mapNote'))} · Arealplan V20</span><span>N ↗</span></div>
          </div>
          <div class="loc-list">${list}</div>
        </div>
      </div>
      ${helpbar()}
    </section>`;
  }

  /* ---------- Restaurants ---------- */
  const qrCache = {};
  function qrSvg(url) {
    if (qrCache[url]) return qrCache[url];
    try {
      const q = window.qrcode(0, 'M');
      q.addData(url);
      q.make();
      qrCache[url] = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) { qrCache[url] = ''; }
    return qrCache[url];
  }
  function pageFood() {
    const cards = D.RESTAURANTS.map((r) => {
      const open = isOpen(r.hours);
      const status = open === null ? '' : `<span class="tag ${open ? 'ok' : 'closed'}">${esc(open ? t('openNow') : t('closedNow'))}</span>`;
      const hours = fmtHours(r.hours);
      return `<article class="card food-card">
        <div>
          <div class="food-head"><span class="tag">${esc(t(r.kind))}</span>${status}${verifyTag(r)}</div>
          <h2 class="food-name">${esc(r.name)}</h2>
          <p class="food-desc">${esc(L(r.desc))}</p>
          <div class="meta">
            <span>${icon('pin')}${esc(locLine(r))}</span>
            ${hours ? `<span>${icon('clock')}${esc(hours)}</span>` : ''}
          </div>
          ${r.x != null ? `<div class="food-actions"><button class="btn primary" data-go="#/info/karte?cat=food&focus=rest:${r.id}">${icon('map')}${esc(t('showOnMap'))}<span class="circ">${icon('arrowUR')}</span></button></div>` : ''}
        </div>
        <div class="qr-box"><div class="qr">${qrSvg(r.url)}</div><small>${esc(t('qrMenu'))}</small></div>
      </article>`;
    }).join('');
    return `<section class="page food-page">
      ${topbar('inner')}
      <div class="page-body">
        ${pageHead(t('hubEyebrow'), t('foodT'), t('qrMenuSub'))}
        <div class="food-grid">${cards}</div>
      </div>
      ${helpbar()}
    </section>`;
  }

  /* ---------- Facilities ---------- */
  function pageServices() {
    const yah = C.terminalPos;
    const tiles = D.CATS.filter((c) => c.services).map((c) => {
      const pins = pinsOf(c.id).sort((a, b) => dist(a, yah) - dist(b, yah));
      const near = pins[0];
      return `<button class="tile serv-card" data-go="#/info/karte?cat=${c.id}${near ? '&focus=' + near.key : ''}">
        <span class="tile-ico">${icon(c.icon)}</span>
        <span class="tile-title">${esc(t('cat_' + c.id))}</span>
        <span class="tile-sub">${esc(countLabel(pins.length))}</span>
        ${near ? `<span class="tile-alt">${esc(t('nearest'))}: ${esc(buildingLabel(near.item.building))}</span>` : ''}
        <span class="arrow-circ">${icon('arrowUR')}</span>
      </button>`;
    }).join('');
    return `<section class="page serv-page">
      ${topbar('inner')}
      <div class="page-body">
        ${pageHead(t('hubEyebrow'), t('servT'), t('servS'))}
        <div class="serv-grid">${tiles}</div>
      </div>
      ${helpbar()}
    </section>`;
  }

  /* ---------- Search ---------- */
  const norm = (s) => String(s).toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();

  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  let INDEX = null;
  function buildIndex() {
    const idx = [];
    const names = (o) => (typeof o === 'string' ? [o] : Object.values(o));
    D.DIRECTORY.filter((d) => !d.sample || C.showVerifyHints).forEach((d) => idx.push({
      type: d.type, item: d, names: names(d.name), kw: d.kw,
      label: () => L(d.name), go: `#/info/karte?focus=dir:${d.id}`,
    }));
    D.CATS.forEach((c) => idx.push({
      type: 'place', cat: c.id, item: {}, names: Object.keys(I.STRINGS).map((l) => t('cat_' + c.id, null, l)), kw: c.kw,
      label: () => t('cat_' + c.id), go: c.id === 'food' ? '#/info/gastro' : `#/info/karte?cat=${c.id}`,
    }));
    D.RESTAURANTS.forEach((r) => idx.push({
      type: 'food', item: r, names: [r.name], kw: [t(r.kind, null, 'de'), t(r.kind, null, 'en')],
      label: () => r.name, go: r.x != null ? `#/info/karte?cat=food&focus=rest:${r.id}` : '#/info/gastro',
    }));
    D.BUILDINGS.forEach((b) => idx.push({
      type: 'bld', item: { building: b.id }, names: [...names(b.name)], kw: [`haus ${b.id}`, `building ${b.id}`, b.id],
      label: () => buildingLabel(b.id), go: `#/info/karte?focus=bld:${b.id}`,
    }));
    idx.forEach((e) => { e.terms = [...e.names.map((n) => ({ s: n, n: norm(n), name: true })), ...e.kw.map((k) => ({ s: k, n: norm(k) }))]; });
    return idx;
  }

  function scoreTerm(q, tn) {
    if (!tn) return 0;
    if (tn === q) return 100;
    if (tn.startsWith(q)) return 88 - Math.min(10, (tn.length - q.length) * 0.5);
    const words = tn.split(' ');
    if (words.some((w) => w.startsWith(q))) return 76;
    if (q.length >= 3 && tn.includes(q)) return 62;
    if (q.length >= 5 && !/\d/.test(q)) { // typo tolerance only for real words
      const tol = q.length >= 8 ? 2 : 1;
      for (const w of words.concat(words.length > 1 ? [tn] : [])) {
        if (lev(q, w, tol) <= tol) return 50;
        if (w.length > q.length && lev(q, w.slice(0, q.length), tol) <= tol) return 42;
      }
    }
    return 0;
  }
  function bestMatch(entry, q) {
    let best = { score: 0, term: null };
    for (const term of entry.terms) {
      const s = scoreTerm(q, term.n) + (term.name ? 4 : 0);
      if (s > best.score && s > 4) best = { score: s, term };
    }
    return best;
  }
  function search(raw) {
    const q = norm(raw);
    if (q.length < 2) return [];
    INDEX = INDEX || buildIndex();
    let out = INDEX.map((e) => ({ e, ...bestMatch(e, q) })).filter((r) => r.score > 0);
    // Nothing matched the whole phrase: accept entries where every word of the query matches
    const tokens = q.split(' ').filter((x) => x.length >= 3);
    if (!out.length && tokens.length > 1) {
      out = INDEX.map((e) => {
        const parts = tokens.map((tk) => bestMatch(e, tk));
        return parts.every((pt) => pt.score > 0) ? { e, score: parts.reduce((a, pt) => a + pt.score, 0) / parts.length * 0.9, term: parts[0].term } : null;
      }).filter(Boolean);
    }
    const prio = { dept: 0, service: 1, place: 2, food: 3, doctor: 4, bld: 5 };
    return out.sort((a, b) => b.score - a.score || prio[a.e.type] - prio[b.e.type]).slice(0, 8);
  }

  function resultsHtml() {
    const q = state.query.trim();
    if (norm(q).length < 2) {
      const terms = t('popularTerms');
      const list = Array.isArray(terms) ? terms : I.t('popularTerms', null, 'de');
      return `<p class="section-label">${esc(t('popular'))}</p><div class="chips">${list.map((w) => `<button class="chip" data-action="chipSearch" data-q="${esc(w)}">${icon('search')}${esc(w)}</button>`).join('')}</div>`;
    }
    const res = search(q);
    if (!res.length) {
      return `<div class="empty"><strong>${esc(t('noResults'))}</strong>${esc(t('noResultsSub'))}<div class="sheet-actions" style="justify-content:center"><button class="btn primary" data-action="help">${icon('headset')}${esc(t('help'))}</button></div></div>`;
    }
    const typeLabel = { dept: 'typeDept', service: 'typeService', doctor: 'typeDoctor', place: 'typePlace', food: 'cat_food', bld: 'buildings' };
    return `<p class="section-label">${esc(t('results', { n: res.length }))}</p>` + res.map(({ e, term }) => {
      const label = e.label();
      const via = term && norm(term.s) !== norm(label) ? `<span class="tag">${esc(t('matchedVia'))} «${esc(term.s)}»</span>` : '';
      const where = e.type === 'place' ? countLabel(pinsOf(e.cat).length) : locLine(e.item);
      const ic = e.type === 'place' ? catIcon(e.cat) : typeIcon(e.type);
      return `<button class="result" data-go="${e.go}">
        <span class="loc-ico${e.cat === 'emergency' || e.item.id === 'emergency' ? ' alert' : ''}">${icon(ic)}</span>
        <span class="loc-main"><strong>${esc(label)}</strong><span>${esc(t(typeLabel[e.type]))} · ${esc(where)}</span>
          ${via || verifyTag(e.item) ? `<span class="via">${via}${verifyTag(e.item)}</span>` : ''}</span>
        <span class="go">${icon('map')}${esc(e.type === 'food' && e.item.x == null ? t('foodT') : t('showOnMap'))}</span>
      </button>`;
    }).join('');
  }

  function keyboardHtml() {
    const rows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
      ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
      ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'é', 'è', 'à', 'ç'],
    ];
    const key = (k) => `<button class="key" data-action="key" data-k="${k}" aria-label="${k}">${k}</button>`;
    return `<div class="osk card" aria-label="Keyboard">
      ${rows.map((r) => `<div class="osk-row">${r.map(key).join('')}</div>`).join('')}
      <div class="osk-row">
        <button class="key wide" data-action="clearQuery">${esc(t('clear'))}</button>
        <button class="key space" data-action="key" data-k=" ">${esc(t('space'))}</button>
        <button class="key wide" data-action="key" data-k="⌫" aria-label="Backspace">${icon('backspace')}</button>
      </div>
    </div>`;
  }

  function pageSearch() {
    return `<section class="page search-page">
      ${topbar('inner')}
      <div class="page-body">
        ${pageHead(t('searchT'), t('searchS'), t('searchExample'))}
        <label class="search-box">${icon('search')}
          <span class="sr-only">${esc(t('searchPlaceholder'))}</span>
          <input id="q" type="text" inputmode="none" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="${esc(t('searchPlaceholder'))}" value="${esc(state.query)}">
          <button class="icon-btn" data-action="clearQuery" aria-label="${esc(t('clear'))}">${icon('x')}</button>
        </label>
        <div class="results" id="results" aria-live="polite">${resultsHtml()}</div>
        ${keyboardHtml()}
      </div>
      ${helpbar()}
    </section>`;
  }
  function updateResults() {
    const el = $('#results');
    if (el) el.innerHTML = resultsHtml();
  }
  function mountSearch() {
    const input = $('#q');
    if (!input) return;
    input.addEventListener('input', () => { state.query = input.value; updateResults(); });
  }

  /* ======================================================================
     Overlays: help, ticket, scan, idle
     ====================================================================== */
  function openOverlay(html, kind) {
    closeOverlay();
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    o.addEventListener('click', (e) => { if (e.target === o && kind !== 'live') closeOverlay(); });
    document.body.appendChild(o);
    state.overlay = o;
    state.overlayKind = kind || '';
  }
  function setOverlay(html, kind) {
    if (!state.overlay) return openOverlay(html, kind);
    state.overlay.querySelector('.sheet').innerHTML = html;
    if (kind) state.overlayKind = kind;
  }
  function closeOverlay() {
    clearTimers();
    stopCamera();
    if (state.overlay) state.overlay.remove();
    state.overlay = null;
    state.overlayKind = '';
  }
  const closeBtn = () => `<button class="icon-btn sheet-close" data-action="close" aria-label="${esc(t('close'))}">${icon('x')}</button>`;

  /* --- Help --- */
  function notifyDesk(mode) {
    if (!C.help.notifyUrl) return;
    try {
      fetch(C.help.notifyUrl, {
        method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminal: C.terminalId, mode, lang: state.lang, at: new Date().toISOString() }),
      }).catch(() => {});
    } catch (e) { /* offline – the screen still guides the visitor */ }
  }
  function helpChoose() {
    const opt = (mode, ic, title, sub) => `<button class="opt" data-action="helpMode" data-mode="${mode}">
        <span class="opt-ico">${icon(ic)}</span><span><strong>${esc(t(title))}</strong><span>${esc(t(sub))}</span></span>
        <span class="arrow-circ">${icon('arrowUR')}</span></button>`;
    return `${closeBtn()}<p class="eyebrow">${esc(t('help'))}</p><h2>${esc(t('helpTitle'))}</h2><p class="lead">${esc(t('helpLead'))}</p>
      <div class="opts">${opt('video', 'video', 'video', 'videoSub')}${opt('phone', 'phone', 'phone', 'phoneSub')}${opt('volunteer', 'guide', 'volunteer', 'volunteerSub')}</div>`;
  }
  function helpConnecting(mode) {
    const ic = { video: 'video', phone: 'phone', volunteer: 'guide' }[mode];
    return `<div class="state"><div class="rings"><i></i><span class="core">${icon(ic)}</span></div>
      <p class="eyebrow">${esc(t(mode))}</p><h2>${esc(t('connecting'))}</h2></div>
      <div class="sheet-actions"><button class="btn" data-action="close">${esc(t('cancel'))}</button></div>`;
  }
  function helpLive(mode) {
    const end = `<div class="sheet-actions"><button class="btn primary" data-action="close">${icon('x')}${esc(t('endCall'))}</button></div>`;
    if (mode === 'video') {
      const media = C.help.videoUrl
        ? `<iframe class="video-frame" src="${esc(C.help.videoUrl)}" allow="camera; microphone; autoplay; fullscreen"></iframe>`
        : `<div class="video-mock"><span class="avatar">i</span><span class="who">${esc(t('cat_info'))} · LUKS</span><span class="self">${icon('guide')}</span></div>`;
      return `<p class="eyebrow">${esc(t('video'))}</p><h2>${esc(t('connectedVideo'))}</h2>${media}${end}`;
    }
    if (mode === 'phone') {
      return `<div class="state"><div class="rings"><i></i><span class="core">${icon('phone')}</span></div>
        <p class="eyebrow">${esc(t('phone'))}</p><h2>${esc(t('phoneLive'))}</h2>
        <p>${esc(t('phoneAlt'))} <strong>${esc(C.help.phoneNumber)}</strong></p></div>${end}`;
    }
    return `<div class="state"><div class="badge-ok">${icon('walk')}</div>
      <p class="eyebrow">${esc(t('volunteer'))}</p><h2>${esc(t('volunteerOnWay'))}</h2>
      <p>${esc(t('volunteerWait', { n: C.help.volunteerEtaMin }))}</p>
      <div class="eta"><i id="eta"></i></div>
      <span class="tag">${esc(t('terminal'))} ${esc(C.terminalId)}</span></div>
      <div class="sheet-actions"><button class="btn" data-action="close">${esc(t('done'))}</button></div>`;
  }
  function startHelp(mode) {
    notifyDesk(mode);
    setOverlay(helpConnecting(mode), 'live');
    later(() => {
      setOverlay(helpLive(mode), 'live');
      const bar = $('#eta');
      if (bar) {
        bar.style.transition = `width ${C.help.volunteerEtaMin * 60}s linear`;
        requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '100%'; }));
      }
    }, 2400);
  }

  /* --- Ticket --- */
  function nextTicket() {
    const day = new Date().toISOString().slice(0, 10);
    let n = 1;
    try {
      const saved = JSON.parse(localStorage.getItem('luks-ticket') || '{}');
      n = saved.day === day ? saved.n + 1 : 1;
      localStorage.setItem('luks-ticket', JSON.stringify({ day, n }));
    } catch (e) { n = Math.floor(Math.random() * 90) + 10; }
    return `${C.ticketPrefix} ${String(n).padStart(3, '0')}`;
  }
  function printTicket(no, waiting) {
    const area = $('#print-area');
    const now = new Date();
    area.innerHTML = `<div class="p-brand">LUKS Luzerner Kantonsspital</div><div class="p-sub">${esc(t('cat_info'))}</div>
      <hr><div class="p-text">${esc(t('ticketTitle'))}</div><div class="p-no">${esc(no)}</div>
      <div class="p-text">${esc(t('ticketWait'))}: ${waiting}</div><div class="p-text">${esc(t('ticketPlace'))}</div>
      <hr><div class="p-sub">${esc(fmtDate(now))} · ${esc(fmtTime(now))} · ${esc(C.terminalId)}</div>`;
    try { window.print(); } catch (e) { /* no printer attached */ }
  }
  function startTicket() {
    const no = nextTicket();
    const waiting = 1 + Math.floor(Math.random() * 5); // replace with the queue system's value
    openOverlay(`${closeBtn()}<div class="state"><p class="eyebrow">${esc(t('noQr'))}</p><h2>${esc(t('ticketPrinting'))}</h2>
        <div class="printer"><div class="printer-slot"></div><div class="paper-wrap"><div class="paper">
          <small>${esc(t('ticketNo'))}</small><b>${esc(no)}</b><hr><small>LUKS · ${esc(t('cat_info'))}</small>
        </div></div></div></div>`, 'ticket');
    later(() => {
      setOverlay(`${closeBtn()}<div class="state" style="padding-bottom:0"><div class="badge-ok">${icon('ticket')}</div>
          <p class="eyebrow">${esc(t('ticketTitle'))}</p><h2 style="font-size:4.4rem">${esc(no)}</h2><p>${esc(t('ticketSub'))}</p>
          <div class="ticket-facts"><div class="fact"><small>${esc(t('ticketWait'))}</small><b>${waiting}</b></div>
          <div class="fact"><small>${esc(t('cat_info'))}</small><b>${esc(t('house'))} 31</b></div></div></div>
        <div class="sheet-actions"><button class="btn" data-go="#/info/karte?cat=info&focus=place:info-31">${icon('map')}${esc(t('showOnMap'))}</button>
          <button class="btn primary" data-action="close">${icon('check')}${esc(t('done'))}</button></div>`);
      if (C.printTickets) later(() => printTicket(no, waiting), 300);
    }, 2200);
  }

  /* --- QR scan (keyboard-wedge scanner, camera via BarcodeDetector, or demo) --- */
  function parseQr(raw) {
    const s = String(raw || '').trim();
    let d = null, time = '', name = '';
    if (s === 'DEMO') {
      const at = new Date(Date.now() + 20 * 60000);
      at.setMinutes(Math.ceil(at.getMinutes() / 5) * 5);
      return { entry: byId(D.DIRECTORY, 'eye'), time: fmtTime(at), name: '' };
    }
    try {
      const j = JSON.parse(s);
      d = j.d || j.dept; time = j.t || j.time || ''; name = j.n || j.name || '';
    } catch (e) {
      if (/^LUKS[|;]/i.test(s)) [, d, time, name] = s.split(/[|;]/);
      else {
        try { const u = new URL(s); d = u.searchParams.get('dept'); time = u.searchParams.get('time') || ''; } catch (e2) { /* not a URL */ }
      }
    }
    const entry = d && byId(D.DIRECTORY, String(d).trim());
    if (!entry) return null;
    if (/^\d{4}-\d\d-\d\dT/.test(time)) time = fmtTime(new Date(time));
    return { entry, time: (time || '').slice(0, 5), name: (name || '').trim() };
  }
  function handleScan(raw) {
    openOverlay(`<div class="state"><div class="rings"><i></i><span class="core">${icon('qr')}</span></div><h2>${esc(t('scanning'))}</h2></div>`, 'scan');
    later(() => {
      const appt = parseQr(raw);
      if (!appt) {
        setOverlay(`${closeBtn()}<div class="state"><div class="badge-ok err">${icon('alert')}</div><h2>${esc(t('scanErr'))}</h2><p>${esc(t('scanErrSub'))}</p></div>
          <div class="sheet-actions"><button class="btn" data-action="close">${esc(t('tryAgain'))}</button><button class="btn primary" data-action="ticket">${icon('ticket')}${esc(t('noQr'))}</button></div>`);
        return;
      }
      const e = appt.entry;
      setOverlay(`${closeBtn()}<div class="state" style="padding-bottom:0"><div class="badge-ok">${icon('check')}</div>
          <p class="eyebrow">${esc(t('scanOkSub'))}</p><h2>${esc(t('scanOk'))}${appt.name ? ', ' + esc(appt.name) : ''}</h2>
          <div class="appt">${appt.time ? `<span class="time">${esc(appt.time)}</span>` : ''}<strong>${esc(L(e.name))}</strong><span>${esc(locLine(e))}</span></div></div>
        <div class="sheet-actions"><button class="btn" data-action="close">${esc(t('done'))}</button>
          <button class="btn primary" data-go="#/info/karte?focus=dir:${e.id}">${icon('walk')}${esc(t('goTo'))}<span class="circ">${icon('arrowUR')}</span></button></div>`);
    }, 1100);
  }
  async function startCamera() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return;
    openOverlay(`${closeBtn()}<p class="eyebrow">QR</p><h2>${esc(t('scanTitle'))}</h2><div class="camera-view"><video id="cam" playsinline muted></video></div>`, 'camera');
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const video = $('#cam');
      if (!video) return stopCamera();
      video.srcObject = state.stream;
      await video.play();
      every(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length) { const v = codes[0].rawValue; stopCamera(); handleScan(v); }
        } catch (e) { /* frame not ready */ }
      }, 350);
    } catch (e) { closeOverlay(); }
  }
  function stopCamera() {
    if (state.stream) { state.stream.getTracks().forEach((tr) => tr.stop()); state.stream = null; }
  }

  /* --- Idle reset --- */
  let lastActivity = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true, capture: true }));
  function showIdle() {
    let n = C.idleCountdown;
    openOverlay(`<div class="state"><p class="eyebrow">${esc(t('kioskName'))}</p><h2>${esc(t('idleTitle'))}</h2><p>${esc(t('idleSub'))}</p>
      <div class="countdown" id="cd">${n}</div></div>
      <div class="sheet-actions"><button class="btn" data-action="home">${icon('home')}${esc(t('home'))}</button>
      <button class="btn primary" data-action="close">${esc(t('stay'))}</button></div>`, 'idle');
    every(() => {
      n -= 1;
      const el = $('#cd');
      if (el) el.textContent = n;
      if (n <= 0) resetKiosk();
    }, 1000);
  }
  function resetKiosk() {
    closeOverlay();
    state.lang = C.defaultLang;
    state.query = '';
    state.extraOpen = false;
    state.large = false;
    document.documentElement.classList.remove('large');
    if (current().path !== '/') location.replace('#/');
    else render();
  }
  setInterval(() => {
    const idle = (Date.now() - lastActivity) / 1000;
    if (idle < C.idleSeconds) return;
    const atHome = current().path === '/';
    if (state.overlayKind === 'idle' || state.overlayKind === 'live') return;
    if (atHome && !state.overlay) {
      if (state.lang !== C.defaultLang || state.large) resetKiosk();
      return;
    }
    showIdle();
  }, 1000);

  /* --- Hardware QR scanner (acts as a keyboard, ends with Enter) --- */
  let scanBuf = '', scanTimer = 0;
  document.addEventListener('keydown', (e) => {
    if (current().path !== '/' || (state.overlay && state.overlayKind !== 'scan')) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter') {
      if (scanBuf.length >= 3) handleScan(scanBuf);
      scanBuf = '';
      return;
    }
    if (e.key.length === 1) {
      scanBuf += e.key;
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => { scanBuf = ''; }, 600);
    }
  });

  /* ======================================================================
     Router & events
     ====================================================================== */
  const ROUTES = [
    { re: /^\/?$/, page: pageLanding },
    { re: /^\/sprache$/, page: pageLanguage },
    { re: /^\/info$/, page: pageHub },
    { re: /^\/info\/karte$/, page: pageMap },
    { re: /^\/info\/gastro$/, page: pageFood },
    { re: /^\/info\/services$/, page: pageServices },
    { re: /^\/info\/suche$/, page: pageSearch, mount: mountSearch },
  ];
  const PARENT = { '/sprache': '#/', '/info': '#/sprache', '/info/karte': '#/info', '/info/gastro': '#/info', '/info/services': '#/info', '/info/suche': '#/info' };

  function current() {
    const raw = location.hash.replace(/^#/, '');
    const [path, qs = ''] = raw.split('?');
    return { path: path || '/', params: new URLSearchParams(qs) };
  }

  const particles = window.LUKS_PARTICLES.create($('#particles'));
  let lastPath = null;

  function render() {
    const { path, params } = current();
    const route = ROUTES.find((r) => r.re.test(path)) || ROUTES[0];
    const landing = route === ROUTES[0];
    document.documentElement.lang = state.lang;
    document.body.classList.toggle('is-landing', landing);
    if (landing) particles.start(); else particles.stop();
    const view = $('#view');
    view.innerHTML = route.page(params);
    if (route.mount) route.mount(params);
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
    tickClock();
  }

  function go(hash, replace) {
    if (location.hash === hash) render();
    else if (replace) location.replace(hash);
    else location.hash = hash;
  }

  const ACTIONS = {
    home: () => resetKiosk(),
    back: () => { const p = PARENT[current().path] || '#/'; go(p); },
    setLang: (el) => { state.lang = el.dataset.lang; render(); },
    pickLang: (el) => { state.lang = el.dataset.lang; state.extraOpen = false; go('#/info'); },
    toggleExtra: () => { state.extraOpen = !state.extraOpen; render(); },
    textSize: () => { state.large = !state.large; document.documentElement.classList.toggle('large', state.large); render(); },
    help: () => openOverlay(helpChoose(), 'help'),
    helpMode: (el) => startHelp(el.dataset.mode),
    close: () => closeOverlay(),
    ticket: () => startTicket(),
    demoScan: () => handleScan('DEMO'),
    camera: () => startCamera(),
    focusPin: (el) => {
      const { params } = current();
      go(`#/info/karte?cat=${params.get('cat') || 'all'}&focus=${el.dataset.key}`, true);
    },
    key: (el) => {
      const k = el.dataset.k;
      state.query = k === '⌫' ? state.query.slice(0, -1) : (state.query + k).slice(0, 40);
      const input = $('#q');
      if (input) input.value = state.query;
      updateResults();
    },
    clearQuery: () => { state.query = ''; const input = $('#q'); if (input) input.value = ''; updateResults(); },
    chipSearch: (el) => { state.query = el.dataset.q; const input = $('#q'); if (input) input.value = state.query; updateResults(); },
  };

  document.addEventListener('click', (e) => {
    const goEl = e.target.closest('[data-go]');
    const actEl = e.target.closest('[data-action]');
    // the innermost element wins
    if (actEl && (!goEl || goEl.contains(actEl))) {
      e.preventDefault();
      const fn = ACTIONS[actEl.dataset.action];
      if (fn) fn(actEl);
      return;
    }
    if (goEl) {
      e.preventDefault();
      if (state.overlay && goEl.closest('.overlay')) closeOverlay();
      go(goEl.dataset.go, !!goEl.dataset.replace);
    }
  });
  // keep the search field focused while typing on the on-screen keyboard
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('.key')) e.preventDefault(); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  function tickClock() {
    const now = new Date();
    document.querySelectorAll('.clock-time').forEach((el) => { el.textContent = fmtTime(now); });
    document.querySelectorAll('.clock-date').forEach((el) => { el.textContent = fmtDate(now); });
  }
  setInterval(tickClock, 10000);

  window.addEventListener('hashchange', () => { if (state.overlayKind !== 'live') closeOverlay(); render(); });
  render();
})();
