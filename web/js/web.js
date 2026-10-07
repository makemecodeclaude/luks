/* LUKS website – content, motion and interaction */
(function () {
  'use strict';

  const C = window.LUKS_CONFIG;
  const D = window.LUKS_DATA;
  const I = window.LUKS_I18N;
  const { W, LANGS } = window.LUKS_WEB_I18N;
  const { icon, flag, ICONS } = window.LUKS_GFX;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAP_W = 2000, MAP_H = 777;

  /* ---------------------------------------------------------------- language */
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') || store.get('luks-web-lang') || (navigator.language || 'de').slice(0, 2);
  if (!LANGS.includes(lang)) lang = 'de';
  const t = (k, vars) => (W[lang] && W[lang][k] !== undefined ? W[lang][k] : W.de[k] !== undefined && !I.STRINGS.de[k] ? W.de[k] : I.t(k, vars, lang));
  const L = (o) => I.pick(o, lang);

  /* ---------------------------------------------------------------- helpers shared with the terminal */
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const building = (id) => byId(D.BUILDINGS, id);
  const catOf = (id) => byId(D.CATS, id);
  const catIcon = (c) => (catOf(c) ? catOf(c).icon : 'pin');
  const typeIcon = (type) => ({ dept: 'building', doctor: 'stethoscope', service: 'service', food: 'food', bld: 'building' }[type] || 'pin');
  const floorLabel = (n) => (n === undefined || n === null ? '' : n === 0 ? I.t('floor0', null, lang) : n > 0 ? I.t('floorN', { n }, lang) : I.t('floorMinus', null, lang));
  function buildingLabel(id) {
    const b = building(id);
    if (!b) return '';
    const nm = L(b.name);
    return /\d/.test(nm) ? nm : `${I.t('house', null, lang)} ${b.id} · ${nm}`;
  }
  function locLine(item) {
    if (!item.building) return I.t('locationTbd', null, lang);
    const b = building(item.building);
    const parts = [buildingLabel(item.building)];
    if (item.floor !== undefined) parts.push(floorLabel(item.floor));
    if (b) parts.push(`${I.t('gridRef', null, lang)} ${b.grid}`);
    return parts.join(' · ');
  }
  const verifyTag = (item) => (item && item.verify && C.showVerifyHints ? `<span class="tag verify">${esc(I.t('demo', null, lang))}</span>` : '');
  const placeTitle = (p) => (p.name ? L(p.name) : I.t('cat_' + p.cat, null, lang));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function allPins() {
    const pins = D.PLACES.map((p) => ({ key: 'place:' + p.id, cat: p.cat, x: p.x, y: p.y, title: placeTitle(p), item: p, badge: p.badge }));
    D.RESTAURANTS.filter((r) => r.x != null).forEach((r) => pins.push({ key: 'rest:' + r.id, cat: 'food', x: r.x, y: r.y, title: r.name, item: r }));
    return pins;
  }
  function resolveTarget(key) {
    if (!key) return null;
    const [kind, id] = key.split(':');
    if (kind === 'place') { const p = byId(D.PLACES, id); return p && { key, x: p.x, y: p.y, title: placeTitle(p), cat: p.cat, item: p, badge: p.badge }; }
    if (kind === 'rest') { const r = byId(D.RESTAURANTS, id); return r && r.x != null && { key, x: r.x, y: r.y, title: r.name, cat: 'food', item: r }; }
    if (kind === 'dir') { const d = byId(D.DIRECTORY, id); return d && { key, x: d.x, y: d.y, title: L(d.name), cat: 'dir', icon: typeIcon(d.type), item: d }; }
    if (kind === 'bld') { const b = building(id); return b && { key, x: b.x, y: b.y, title: buildingLabel(id), cat: 'bld', icon: 'building', item: { building: id } }; }
    return null;
  }

  /* ---------------------------------------------------------------- static text + language menu */
  function applyText() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
    $('#q').placeholder = I.t('searchPlaceholder', null, lang);
    const phone = C.help.phoneNumber;
    const tel = 'tel:' + phone.replace(/[^\d+]/g, '');
    $('#help-phone').textContent = phone;
    $('#help-phone').href = tel;
    $('#help-call').href = tel;

    const btn = $('#lang-btn');
    btn.innerHTML = `${flag(I.LANGS[lang].flag)}<span>${lang.toUpperCase()}</span>${icon('chevD')}`;
    btn.setAttribute('aria-label', I.t('language', null, lang));
    $('#lang-menu').innerHTML = LANGS.map((l) => `<button role="menuitem" data-lang="${l}" class="${l === lang ? 'on' : ''}">${flag(I.LANGS[l].flag)}<span>${esc(I.LANGS[l].name)}</span></button>`).join('');
  }
  function setupLangMenu() {
    const wrap = $('#lang'), btn = $('#lang-btn');
    const close = () => { wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); const o = wrap.classList.toggle('open'); btn.setAttribute('aria-expanded', String(o)); });
    document.addEventListener('click', close);
    $('#lang-menu').addEventListener('click', (e) => {
      const b = e.target.closest('[data-lang]');
      if (!b) return;
      store.set('luks-web-lang', b.dataset.lang);
      try { sessionStorage.setItem('luks-web-seen', '1'); } catch (err) { /* ignore */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', b.dataset.lang);
      url.hash = '';
      try { sessionStorage.setItem('luks-web-y', String(window.scrollY)); } catch (err) { /* ignore */ }
      location.href = url.toString();
    });
  }

  /* ---------------------------------------------------------------- dynamic sections */
  function buildHeroLinks() {
    const links = [['place:er-b', 'cat_emergency'], ['place:info-31', 'cat_info'], ['place:pharmacy-31', 'cat_pharmacy'], ['place:bus-1', 'cat_bus']];
    $('#hero-links').innerHTML = links.map(([key, label]) => `<li><a href="#map" data-focus="${key}">${esc(I.t(label, null, lang))}<span>${icon('arrowUR')}</span></a></li>`).join('');
  }

  function qrSvg(text) {
    try { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
    catch (e) { return ''; }
  }

  function buildRail() {
    const words = ['Röntgen', 'X-ray', 'Radiografia', 'göz doktoru', 'Blutentnahme', 'oculista', 'prise de sang'];
    const facility = D.CATS.filter((c) => c.services).map((c) => `<span>${icon(c.icon)}</span>`).join('');
    const visuals = {
      1: `<div class="cv cv-qr">${qrSvg('LUKS|eye|14:30')}</div>`,
      2: '<div class="cv cv-map"></div>',
      3: `<div class="cv cv-icon">${icon('food')}</div>`,
      4: `<div class="cv cv-grid">${facility}${facility}</div>`,
      5: `<div class="cv cv-words">${words.map((w, i) => `<span style="--i:${i}">${esc(w)}</span>`).join('')}</div>`,
      6: `<div class="cv cv-rings"><i></i><i></i><i></i><span>${icon('headset')}</span></div>`,
    };
    const links = { 1: '#checkin', 2: '#map', 3: '#food', 4: '#map', 5: '#search', 6: '#help' };
    const tone = { 1: 'dark', 2: 'light', 3: 'dark', 4: 'teal', 5: 'light', 6: 'navy' };
    $('#rail').innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `
      <a class="card card-${tone[n]}" href="${links[n]}" ${n === 4 ? 'data-cat="wc"' : ''} data-scroll>
        <div class="card-visual">${visuals[n]}</div>
        <div class="card-top"><span class="card-no">0${n}</span><h3>${esc(t('c' + n + '_t'))}</h3></div>
        <div class="card-bottom"><p>${esc(t('c' + n + '_d'))}</p><span class="card-arrow">${icon('arrowUR')}</span></div>
      </a>`).join('');
  }

  function buildSteps() {
    const ic = ['qr', 'camera', 'walk'];
    $('#steps').innerHTML = [1, 2, 3].map((n) => `
      <li class="step" data-reveal>
        <span class="step-no">0${n}</span>
        <span class="step-ico">${icon(ic[n - 1])}</span>
        <h3>${esc(t(`ci_s${n}t`))}</h3>
        <p>${esc(t(`ci_s${n}d`))}</p>
      </li>`).join('') + '<li class="steps-line" aria-hidden="true"><i></i></li>';
  }

  function buildFood() {
    $('#food-grid').innerHTML = D.RESTAURANTS.map((r) => `
      <article class="food-card" data-reveal>
        <div class="food-visual" aria-hidden="true"><span>${esc(r.name)}</span></div>
        <div class="food-body">
          <div class="food-tags"><span class="tag">${esc(I.t(r.kind, null, lang))}</span>${verifyTag(r)}</div>
          <h3 class="sr-only">${esc(r.name)}</h3>
          <p>${esc(L(r.desc))}</p>
          <p class="food-loc">${icon('pin')}${esc(locLine(r))}</p>
          <div class="food-foot">
            ${r.x != null ? `<a class="pill pill-soft small" href="#map" data-focus="rest:${r.id}">${icon('map')}<span>${esc(I.t('showOnMap', null, lang))}</span></a>` : '<span></span>'}
            <a class="food-qr" href="${esc(r.url)}" rel="noopener" title="${esc(I.t('qrMenu', null, lang))}">${qrSvg(r.url)}</a>
          </div>
        </div>
      </article>`).join('');
  }

  function buildNumbers() {
    const restaurants = D.RESTAURANTS.length;
    const emergencies = D.PLACES.filter((p) => p.cat === 'emergency').length;
    const items = [[emergencies, 'n1'], [restaurants, 'n2'], [Object.keys(I.LANGS).length, 'n3'], [24, 'n4']];
    $('#numbers').innerHTML = items.map(([n, k]) => `<div class="num" data-reveal><b data-count="${n}">${REDUCE ? n : 0}</b><span>${esc(t(k))}</span></div>`).join('');
  }

  /* ---------------------------------------------------------------- map */
  const map = { cat: 'all', focus: null, vb: { x: 0, y: 0, w: MAP_W, h: MAP_H }, base: 1 };
  const CHIP_CATS = ['all', 'emergency', 'info', 'food', 'wc', 'wc_access', 'baby', 'pharmacy', 'kiosk', 'atm', 'cash', 'lockers', 'parking', 'bus', 'chapel'];

  function buildMap() {
    $('#map-chips').innerHTML = CHIP_CATS.map((c) => `<button class="chip${c === map.cat ? ' on' : ''}" data-cat="${c}">${icon(c === 'all' ? 'map' : catIcon(c))}<span>${esc(c === 'all' ? I.t('allCats', null, lang) : I.t('cat_' + c, null, lang))}</span></button>`).join('');
    const pinSvg = (p) => {
      const inner = p.badge
        ? `<text text-anchor="middle" dy=".36em" class="pin-badge">${p.badge}</text>`
        : `<svg x="-13" y="-13" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ICONS[catIcon(p.cat)]}</svg>`;
      return `<g class="pin cat-${p.cat}${p.item.verify ? ' verify' : ''}" data-key="${p.key}" data-cat="${p.cat}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(p.title)}">
        <g class="pin-k"><g class="pin-in"><circle class="pin-hit" r="34"/><circle class="pin-bg" r="22"/><g class="pin-ico">${inner}</g></g></g></g>`;
    };
    $('#map-pins').innerHTML = allPins().map(pinSvg).join('');
    const y = C.terminalPos;
    $('#map-yah').innerHTML = `<g transform="translate(${y.x} ${y.y})"><g class="pin-k"><circle class="yah-pulse" r="22"/><circle class="yah-dot" r="11"/>
      <g class="yah-label"><rect x="-90" y="20" width="180" height="36" rx="18"/><text y="44" text-anchor="middle">${esc(t('map_entrance'))}</text></g></g></g>`;
    renderMapList();
    applyPinScale();
  }

  function pinsVisible() { return allPins().filter((p) => map.cat === 'all' || p.cat === map.cat); }

  function renderMapList() {
    const yah = C.terminalPos;
    let items;
    if (map.cat === 'all') items = ['place:info-31', 'place:er-b', 'place:er-a', 'place:pharmacy-31', 'rest:feingut', 'place:bus-1'].map(resolveTarget).filter(Boolean);
    else items = pinsVisible().sort((a, b) => dist(a, yah) - dist(b, yah));
    $('#map-list').innerHTML = items.map((p) => `<li><button class="map-item${map.focus === p.key ? ' on' : ''}" data-key="${p.key}">
        <span class="mi-ico${p.cat === 'emergency' ? ' alert' : ''}">${icon(p.icon || catIcon(p.cat))}</span>
        <span class="mi-txt"><strong>${esc(p.title)}</strong><small>${esc(locLine(p.item))}</small></span>${verifyTag(p.item)}${icon('arrowUR')}</button></li>`).join('');
    if (!REDUCE) gsap.from('#map-list li', { opacity: 0, y: 14, duration: 0.6, ease: 'expo.out', stagger: 0.035 });
  }

  function setCat(cat, animate = true) {
    map.cat = cat;
    $$('#map-chips .chip').forEach((c) => c.classList.toggle('on', c.dataset.cat === cat));
    $$('#map-pins .pin').forEach((g) => g.classList.toggle('off', cat !== 'all' && g.dataset.cat !== cat));
    if (animate && !REDUCE) {
      const on = $$('#map-pins .pin:not(.off) .pin-in');
      gsap.fromTo(on, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2)', stagger: 0.025, transformOrigin: '50% 50%' });
    }
    unfocus(false);
    renderMapList();
  }

  function applyPinScale() {
    const k = (map.vb.w / MAP_W) * map.base;
    $$('#map-pins .pin-k, #map-yah .pin-k').forEach((g) => g.setAttribute('transform', `scale(${k.toFixed(3)})`));
    $('#map-svg').setAttribute('viewBox', `${map.vb.x.toFixed(1)} ${map.vb.y.toFixed(1)} ${map.vb.w.toFixed(1)} ${map.vb.h.toFixed(1)}`);
  }
  function measureMap() {
    const px = $('#map-svg').getBoundingClientRect().width || 1000;
    map.base = Math.min(2.8, Math.max(1.25, 1350 / px));
    applyPinScale();
  }
  function zoomTo(vb) {
    gsap.to(map.vb, { ...vb, duration: REDUCE ? 0 : 1.3, ease: 'expo.inOut', onUpdate: applyPinScale });
  }

  function focusKey(key) {
    const tg = resolveTarget(key);
    if (!tg) return;
    map.focus = key;
    const yah = C.terminalPos, ratio = MAP_W / MAP_H;
    const x0 = Math.min(tg.x, yah.x) - 200, x1 = Math.max(tg.x, yah.x) + 200;
    const y0 = Math.min(tg.y, yah.y) - 140, y1 = Math.max(tg.y, yah.y) + 160;
    let w = Math.max(x1 - x0, 820), h = Math.max(y1 - y0, w / ratio);
    w = Math.max(w, h * ratio); h = w / ratio;
    if (w > MAP_W) { w = MAP_W; h = MAP_H; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    zoomTo({ x: Math.min(Math.max(cx - w / 2, 0), MAP_W - w), y: Math.min(Math.max(cy - h / 2, 0), MAP_H - h), w, h });
    const scroller = $('.map-scroll');
    if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollTo({ left: (scroller.scrollWidth - scroller.clientWidth) / 2, behavior: REDUCE ? 'auto' : 'smooth' });

    // route: soft curve from the main entrance, drawn on
    const mx = (yah.x + tg.x) / 2, my = Math.max(yah.y, tg.y) + Math.min(110, Math.abs(yah.x - tg.x) * 0.25);
    $('#map-route').innerHTML = `<path class="route-halo" d="M${yah.x} ${yah.y} Q${mx} ${my} ${tg.x} ${tg.y}"/><path class="route" d="M${yah.x} ${yah.y} Q${mx} ${my} ${tg.x} ${tg.y}"/>`;
    const path = $('#map-route .route'), halo = $('#map-route .route-halo');
    const len = path.getTotalLength();
    [path, halo].forEach((p) => { p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = `${len}`; });
    gsap.to([path, halo], { strokeDashoffset: 0, duration: REDUCE ? 0 : 1.4, delay: REDUCE ? 0 : 0.5, ease: 'power2.inOut' });

    $$('#map-pins .pin').forEach((g) => { g.classList.toggle('focus', g.dataset.key === key); g.classList.toggle('dim', g.dataset.key !== key); });
    const card = $('#map-card');
    card.innerHTML = `<span class="mc-ico${tg.cat === 'emergency' ? ' alert' : ''}">${tg.badge ? `<b>${tg.badge}</b>` : icon(tg.icon || catIcon(tg.cat))}</span>
      <div><strong>${esc(tg.title)}</strong><small>${esc(locLine(tg.item))}</small>${verifyTag(tg.item)}</div>
      <button class="mc-close" aria-label="${esc(I.t('close', null, lang))}">${icon('x')}</button>`;
    card.hidden = false;
    $('#map-reset').hidden = false;
    if (!REDUCE) gsap.fromTo(card, { y: 20, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, delay: 0.4, ease: 'expo.out' });
    $$('#map-list .map-item').forEach((b) => b.classList.toggle('on', b.dataset.key === key));
  }

  function unfocus(zoom = true) {
    map.focus = null;
    $('#map-route').innerHTML = '';
    $('#map-card').hidden = true;
    $('#map-reset').hidden = true;
    $$('#map-pins .pin').forEach((g) => g.classList.remove('focus', 'dim'));
    $$('#map-list .map-item').forEach((b) => b.classList.remove('on'));
    if (zoom) zoomTo({ x: 0, y: 0, w: MAP_W, h: MAP_H });
  }

  function goToMap(key, cat) {
    scrollToEl($('#map-chips'), () => {
      if (cat) setCat(cat);
      if (key) {
        const tg = resolveTarget(key);
        if (tg && map.cat !== 'all' && tg.cat !== map.cat) setCat('all', false);
        focusKey(key);
      }
    });
  }

  function setupMap() {
    $('#map-chips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) setCat(c.dataset.cat); });
    const pick = (e) => { const g = e.target.closest('.pin'); if (g && !g.classList.contains('off')) focusKey(g.dataset.key); };
    $('#map-pins').addEventListener('click', pick);
    $('#map-pins').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });
    $('#map-list').addEventListener('click', (e) => { const b = e.target.closest('.map-item'); if (b) focusKey(b.dataset.key); });
    $('#map-reset').addEventListener('click', () => unfocus());
    $('#map-card').addEventListener('click', (e) => { if (e.target.closest('.mc-close')) unfocus(); });
    window.addEventListener('resize', measureMap);
  }

  /* ---------------------------------------------------------------- search (same matching as the terminal) */
  const norm = (s) => String(s).toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function scoreTerm(q, tn) {
    if (!tn) return 0;
    if (tn === q) return 100;
    if (tn.startsWith(q)) return 88 - Math.min(10, (tn.length - q.length) * 0.5);
    const words = tn.split(' ');
    if (words.some((w) => w.startsWith(q))) return 76;
    if (q.length >= 3 && tn.includes(q)) return 62;
    if (q.length >= 5 && !/\d/.test(q)) {
      const tol = q.length >= 8 ? 2 : 1;
      for (const w of words.concat(words.length > 1 ? [tn] : [])) {
        if (lev(q, w, tol) <= tol) return 50;
        if (w.length > q.length && lev(q, w.slice(0, q.length), tol) <= tol) return 42;
      }
    }
    return 0;
  }
  let INDEX = null;
  function buildIndex() {
    const names = (o) => (typeof o === 'string' ? [o] : Object.values(o));
    const idx = [];
    D.DIRECTORY.filter((d) => !d.sample || C.showVerifyHints).forEach((d) => idx.push({ type: d.type, item: d, names: names(d.name), kw: d.kw, label: () => L(d.name), act: () => goToMap('dir:' + d.id) }));
    D.CATS.forEach((c) => idx.push({ type: 'place', cat: c.id, item: {}, names: Object.keys(I.STRINGS).map((l) => I.t('cat_' + c.id, null, l)), kw: c.kw, label: () => I.t('cat_' + c.id, null, lang), act: () => (c.id === 'food' ? scrollToEl($('#food')) : goToMap(null, c.id)) }));
    D.RESTAURANTS.forEach((r) => idx.push({ type: 'food', item: r, names: [r.name], kw: [], label: () => r.name, act: () => (r.x != null ? goToMap('rest:' + r.id) : scrollToEl($('#food'))) }));
    D.BUILDINGS.forEach((b) => idx.push({ type: 'bld', item: { building: b.id }, names: names(b.name), kw: [`haus ${b.id}`, `building ${b.id}`, b.id], label: () => buildingLabel(b.id), act: () => goToMap('bld:' + b.id) }));
    idx.forEach((e) => { e.terms = [...e.names.map((n) => ({ s: n, n: norm(n), name: true })), ...e.kw.map((k) => ({ s: k, n: norm(k) }))]; });
    return idx;
  }
  function bestMatch(e, q) {
    let best = { score: 0, term: null };
    for (const term of e.terms) { const s = scoreTerm(q, term.n) + (term.name ? 4 : 0); if (s > best.score && s > 4) best = { score: s, term }; }
    return best;
  }
  function search(raw) {
    const q = norm(raw);
    if (q.length < 2) return [];
    INDEX = INDEX || buildIndex();
    let out = INDEX.map((e) => ({ e, ...bestMatch(e, q) })).filter((r) => r.score > 0);
    const tokens = q.split(' ').filter((x) => x.length >= 3);
    if (!out.length && tokens.length > 1) {
      out = INDEX.map((e) => { const p = tokens.map((tk) => bestMatch(e, tk)); return p.every((x) => x.score > 0) ? { e, score: p.reduce((a, x) => a + x.score, 0) / p.length * 0.9, term: p[0].term } : null; }).filter(Boolean);
    }
    const prio = { dept: 0, service: 1, place: 2, food: 3, doctor: 4, bld: 5 };
    return out.sort((a, b) => b.score - a.score || prio[a.e.type] - prio[b.e.type]).slice(0, 6);
  }
  let lastResults = [];
  function renderResults() {
    const q = $('#q').value;
    const res = search(q);
    lastResults = res;
    const typeLabel = { dept: 'typeDept', service: 'typeService', doctor: 'typeDoctor', place: 'typePlace', food: 'cat_food', bld: 'buildings' };
    const el = $('#results');
    if (norm(q).length < 2) { el.innerHTML = ''; return; }
    if (!res.length) { el.innerHTML = `<li class="empty"><strong>${esc(I.t('noResults', null, lang))}</strong><span>${esc(I.t('noResultsSub', null, lang))}</span></li>`; return; }
    el.innerHTML = res.map(({ e, term }, i) => {
      const label = e.label();
      const via = term && norm(term.s) !== norm(label) ? `<span class="tag">${esc(I.t('matchedVia', null, lang))} «${esc(term.s)}»</span>` : '';
      const where = e.type === 'place' ? I.t('cat_' + e.cat, null, lang) : locLine(e.item);
      return `<li><button class="result" data-i="${i}">
        <span class="mi-ico${e.cat === 'emergency' || e.item.id === 'emergency' ? ' alert' : ''}">${icon(e.type === 'place' ? catIcon(e.cat) : typeIcon(e.type))}</span>
        <span class="mi-txt"><strong>${esc(label)}</strong><small>${esc(I.t(typeLabel[e.type], null, lang))} · ${esc(where)}</small><span class="via">${via}${verifyTag(e.item)}</span></span>
        ${icon('arrowUR')}</button></li>`;
    }).join('');
    if (!REDUCE) gsap.from('#results li', { opacity: 0, y: 16, filter: 'blur(6px)', duration: 0.6, ease: 'expo.out', stagger: 0.05 });
  }
  function setupSearch() {
    const terms = I.t('popularTerms', null, lang);
    $('#search-chips').innerHTML = (Array.isArray(terms) ? terms : []).map((w) => `<button class="chip" data-q="${esc(w)}">${icon('search')}<span>${esc(w)}</span></button>`).join('');
    let timer = 0;
    $('#q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(renderResults, 120); });
    $('#search-chips').addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) { $('#q').value = c.dataset.q; renderResults(); } });
    $('#results').addEventListener('click', (e) => { const b = e.target.closest('.result'); if (b) lastResults[+b.dataset.i].e.act(); });
  }

  /* ---------------------------------------------------------------- smooth scroll */
  let lenis = null;
  function setupScroll() {
    if (!REDUCE && window.Lenis) {
      lenis = new window.Lenis({ duration: 1.2, easing: (x) => Math.min(1, 1.001 - Math.pow(2, -10 * x)), smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  function scrollToEl(el, done) {
    if (!el) return;
    const offset = -Math.min(96, window.innerHeight * 0.1);
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4, onComplete: () => done && done() });
    else { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: REDUCE ? 'auto' : 'smooth' }); if (done) setTimeout(done, REDUCE ? 0 : 700); }
  }
  function setupLinks() {
    document.addEventListener('click', (e) => {
      const f = e.target.closest('[data-focus]');
      if (f) { e.preventDefault(); goToMap(f.dataset.focus); return; }
      const a = e.target.closest('a[data-scroll]');
      if (a && a.hash) {
        e.preventDefault();
        const cat = a.dataset.cat;
        scrollToEl(a.hash === '#top' ? document.body : $(a.hash), cat ? () => setCat(cat) : null);
      }
    });
  }

  /* ---------------------------------------------------------------- motion */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${esc(w)}</span>`).join(' ');
    return $$('.w', el);
  }

  function setupMotion(helix) {
    $$('[data-split]').forEach((el) => splitWords(el));
    if (REDUCE) { $$('.num b').forEach((b) => { b.textContent = b.dataset.count; }); return; }

    // headings: words come into focus one after another
    $$('[data-split]').forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.from($$('.w', el), {
        opacity: 0, yPercent: 45, filter: 'blur(14px)', duration: 1.2, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { opacity: 0, y: 28, filter: 'blur(10px)', duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
    $$('[data-reveal-scale]').forEach((el) => {
      gsap.from(el, { opacity: 0, scale: 0.94, y: 40, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });

    // hero: content drifts up and dissolves, the helix spins with the scroll and fades out
    gsap.to('.hero-inner', { yPercent: -25, opacity: 0, filter: 'blur(6px)', ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-foot, .scroll-cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '30% top', scrub: true } });
    gsap.to('#helix', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#statement', start: 'top 70%', end: 'center center', scrub: true } });
    ScrollTrigger.create({
      trigger: '#hero', start: 'top top', endTrigger: '#statement', end: 'center center',
      onUpdate: (self) => helix.setScroll(self.progress * 2.2, self.progress),
      onLeave: () => helix.stop(), onEnterBack: () => helix.start(),
    });

    // services: pinned horizontal rail on wide screens
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const rail = $('#rail');
      const distance = () => rail.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(rail).paddingLeft);
      const tween = gsap.to(rail, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: '#services', start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      $$('.card', rail).forEach((card) => {
        gsap.fromTo($('.card-visual', card), { xPercent: 12 }, { xPercent: -12, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      gsap.fromTo($$('.card', rail), { opacity: 0, y: 80, rotate: 2 }, { opacity: 1, y: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '#services', start: 'top 70%' } });
      return () => gsap.set(rail, { x: 0 });
    });
    mm.add('(max-width: 899px)', () => {
      gsap.from($$('#rail .card'), { opacity: 0, x: 60, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '#rail', start: 'top 85%' } });
    });

    // check-in: the connecting line fills as you scroll through the steps
    gsap.fromTo('.steps-line i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 75%', end: 'bottom 55%', scrub: true } });

    // map pins pop in once
    ScrollTrigger.create({
      trigger: '.map-frame', start: 'top 70%', once: true,
      onEnter: () => gsap.fromTo('#map-pins .pin-in', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, transformOrigin: '50% 50%', duration: 0.8, ease: 'back.out(2.2)', stagger: { each: 0.025, from: 'random' } }),
    });

    // counters
    $$('.num b').forEach((b) => {
      const o = { v: 0 };
      gsap.to(o, { v: +b.dataset.count, duration: 1.8, ease: 'expo.out', onUpdate: () => { b.textContent = Math.round(o.v); }, scrollTrigger: { trigger: b, start: 'top 85%' } });
    });

    // help section background follows the scroll slightly
    gsap.fromTo('#network', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '#help', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function setupNav() {
    const nav = $('#nav');
    const links = $$('.nav-links a');
    ScrollTrigger.create({ start: 40, end: 'max', onToggle: (self) => nav.classList.toggle('scrolled', self.isActive) });
    ['checkin', 'map', 'food', 'search'].forEach((id) => {
      ScrollTrigger.create({
        trigger: '#' + id, start: 'top 50%', end: 'bottom 50%',
        onToggle: (self) => { if (self.isActive) links.forEach((a) => a.classList.toggle('active', a.hash === '#' + id)); else $(`.nav-links a[href="#${id}"]`).classList.remove('active'); },
      });
    });
  }

  /* ---------------------------------------------------------------- loader + intro */
  function intro(helix) {
    const loader = $('#loader');
    let seen = false;
    try { seen = !!sessionStorage.getItem('luks-web-seen'); sessionStorage.setItem('luks-web-seen', '1'); } catch (e) { /* ignore */ }
    const img = new Image();
    const imgReady = new Promise((res) => { img.onload = img.onerror = res; img.src = '../assets/arealplan-luzern.jpg'; });
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const ready = Promise.race([Promise.all([imgReady, fontsReady]), new Promise((r) => setTimeout(r, 3500))]);

    const heroWords = $$('.hero [data-split] .w');
    const reveal = () => {
      document.body.classList.remove('is-loading');
      helix.start();
      if (REDUCE) return;
      gsap.from(heroWords, { opacity: 0, yPercent: 60, filter: 'blur(16px)', duration: 1.5, ease: 'expo.out', stagger: 0.07 });
      gsap.from('.hero .eyebrow, [data-hero-fade]', { opacity: 0, y: 24, filter: 'blur(8px)', duration: 1.3, ease: 'expo.out', stagger: 0.1, delay: 0.35 });
      gsap.from('#helix', { opacity: 0, scale: 1.08, duration: 2.4, ease: 'expo.out' });
      gsap.from('#nav', { y: -30, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.2 });
    };

    if (seen || REDUCE) {
      loader.remove();
      reveal();
      const y = (() => { try { return +sessionStorage.getItem('luks-web-y') || 0; } catch (e) { return 0; } })();
      if (y) { window.scrollTo(0, y); try { sessionStorage.removeItem('luks-web-y'); } catch (e) { /* ignore */ } }
      return;
    }

    const pct = $('#loader-pct'), arc = $('.ring-arc');
    const circ = 2 * Math.PI * 54;
    arc.style.strokeDasharray = `${circ}`;
    const p = { v: 0 };
    const counter = gsap.to(p, {
      v: 92, duration: 1.4, ease: 'power2.out',
      onUpdate: () => { pct.textContent = Math.round(p.v) + '%'; arc.style.strokeDashoffset = `${circ * (1 - p.v / 100)}`; },
    });
    ready.then(() => {
      counter.kill();
      gsap.timeline()
        .to(p, { v: 100, duration: 0.5, ease: 'power2.out', onUpdate: () => { pct.textContent = Math.round(p.v) + '%'; arc.style.strokeDashoffset = `${circ * (1 - p.v / 100)}`; } })
        .to('.loader-ring, .loader-pct', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, '+=0.1')
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
        .add(reveal, '-=0.55')
        .add(() => loader.remove());
    });
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    applyText();
    setupLangMenu();
    buildHeroLinks();
    buildRail();
    buildSteps();
    buildMap();
    buildFood();
    buildNumbers();
    setupMap();
    setupSearch();
    setupScroll();
    setupLinks();

    const helix = window.LUKS_SCENES.createHelix($('#helix'));
    helix.init();
    const network = window.LUKS_SCENES.createNetwork($('#network'));
    network.init();
    new IntersectionObserver((entries) => entries.forEach((en) => (en.isIntersecting ? network.start() : network.stop()))).observe($('#help'));

    setupMotion(helix);
    setupNav();
    measureMap();
    intro(helix);
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  boot();
})();
