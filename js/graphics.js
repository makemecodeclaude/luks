/* Inline SVG icons (24 × 24, stroke based) and flags. */
(function () {
  'use strict';

  const P = {
    mark: '<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3.4"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3M6.5 6.5h.01M17.5 6.5h.01M6.5 17.5h.01"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16.5v-5M12 7.5h.01"/>',
    headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    video: '<path d="m16 10 5-3v10l-5-3"/><rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5"/>',
    phone: '<path d="M21 16.4v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.6 5.2 2 2 0 0 1 4.6 3h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.6 10.8a16 16 0 0 0 4.6 4.6l1.2-1.2a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    guide: '<circle cx="9" cy="7" r="3.5"/><path d="M2.5 21v-1.5A5.5 5.5 0 0 1 8 14h2a5.5 5.5 0 0 1 5.5 5.5V21"/><path d="M16 3.5a3.5 3.5 0 0 1 0 7M18.5 14.2a5.5 5.5 0 0 1 3 4.9V21"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
    food: '<path d="M4 3v6a3 3 0 0 0 3 3v9M10 3v6a3 3 0 0 1-3 3M7 3v5"/><path d="M20 15V3c-2.5 1-4 3.5-4 7v5h4Zm0 0v6"/>',
    signpost: '<path d="M12 3v18M9 21h6"/><path d="M5 5.5h11l2.5 2.5L16 10.5H5zM19 13H8l-2.5 2.5L8 18h11z"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.5-4.5"/>',
    wc: '<circle cx="7" cy="4.5" r="1.8"/><circle cx="17" cy="4.5" r="1.8"/><path d="M5 9h4l.5 6H8.5v6h-3v-6H4.5zM12 3v18M17 8.5l3 7.5h-1.8v5h-2.4v-5H14z"/>',
    wheelchair: '<circle cx="15" cy="4" r="1.6"/><path d="m18 19 1-6.5-6.5.7M5.5 8.5l3-3 5 2.8-2.2 3.4"/><path d="M4.4 14.2a5 5 0 0 0 6.8 6.4M13.6 17.2a5 5 0 0 0-6.8-6.3"/>',
    baby: '<path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
    kiosk: '<path d="M4 9h16l-1.2-4.2A1 1 0 0 0 17.8 4H6.2a1 1 0 0 0-1 .8Z"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M5.5 11.5V20h13v-8.5M10 20v-5h4v5"/>',
    atm: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11M12 15v2"/>',
    emergency: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 7.5v9M7.5 12h9"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9.5 17V7h3.5a3 3 0 0 1 0 6H9.5"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3M8 14.5h.01M16 14.5h.01"/>',
    chapel: '<path d="M12 2.5v6M9.5 5h5"/><path d="M5 21V12l7-4 7 4v9z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
    arrowUR: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowL: '<path d="M20 12H4M11 19l-7-7 7-7"/>',
    arrowR: '<path d="M4 12h16M13 5l7 7-7 7"/>',
    arrowDown: '<path d="M12 4v16M5 13l7 7 7-7"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    textSize: '<path d="M3 7V5h11v2M8.5 5v14M6.5 19h4M14 12v-1.5h7V12M17.5 10.5V19M16 19h3"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5M12 16.5h.01"/>',
    backspace: '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><path d="m18 9-6 6M12 9l6 6"/>',
    stethoscope: '<path d="M5 3H4a1 1 0 0 0-1 1v5a5 5 0 0 0 10 0V4a1 1 0 0 0-1-1h-1"/><path d="M8 14v1a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20"/><path d="M10 6v4M8 8h4M8 14h.01M12 14h.01M8 17.5h.01M12 17.5h.01"/>',
    service: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="m9 21 2.5-6.5L14 17v4M7 12l2.5-4.5 4 1 2.5 3.5 3 .5M11.5 14.5 13.5 8"/>',
    camera: '<path d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5Z"/><circle cx="12" cy="13" r="3.5"/>',
  };

  function icon(name, cls) {
    return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || P.info}</svg>`;
  }

  /* Flags – drawn in a 30 × 20 box; the Swiss flag is square (20 × 20). */
  const F = {
    de: '<rect width="30" height="20" fill="#FFCE00"/><rect width="30" height="13.33" fill="#DD0000"/><rect width="30" height="6.67" fill="#000"/>',
    fr: '<rect width="30" height="20" fill="#ED2939"/><rect width="20" height="20" fill="#fff"/><rect width="10" height="20" fill="#002395"/>',
    it: '<rect width="30" height="20" fill="#CE2B37"/><rect width="20" height="20" fill="#fff"/><rect width="10" height="20" fill="#009246"/>',
    ch: '<rect width="20" height="20" fill="#DA291C"/><rect x="8.25" y="3.75" width="3.5" height="12.5" fill="#fff"/><rect x="3.75" y="8.25" width="12.5" height="3.5" fill="#fff"/>',
    us: (() => {
      let s = '<rect width="30" height="20" fill="#fff"/>';
      for (let i = 0; i < 13; i += 2) s += `<rect y="${(i * 20 / 13).toFixed(2)}" width="30" height="${(20 / 13).toFixed(2)}" fill="#B22234"/>`;
      s += '<rect width="12" height="10.77" fill="#3C3B6E"/>';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) s += `<circle cx="${1.4 + c * 2.3}" cy="${1.5 + r * 2.6}" r=".55" fill="#fff"/>`;
      return s;
    })(),
    pt: '<rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="4.2" fill="none" stroke="#FFE000" stroke-width="1.3"/><path d="M10.2 7.8h3.6v3.4a1.8 1.8 0 0 1-3.6 0Z" fill="#fff" stroke="#FF0000" stroke-width=".6"/>',
    es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
    tr: '<rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.25" cy="10" r="4" fill="#E30A17"/><path d="m16.3 10 3.3-1.1-2 2.8V8.3l2 2.8z" fill="#fff"/>',
    al: '<rect width="30" height="20" fill="#E41E20"/><g fill="#000"><path d="M15 6.2c-.6-.9-1.6-1.6-2.6-1.6l-.9.6.8.3c.6.2 1 .7 1.2 1.3l.6 1.4Z"/><path d="M15 6.2c.6-.9 1.6-1.6 2.6-1.6l.9.6-.8.3c-.6.2-1 .7-1.2 1.3l-.6 1.4Z"/><path d="M15 6.8c-1.1 0-1.6 1.2-1.6 3.4 0 2.6.6 4.4 1.6 5.6 1-1.2 1.6-3 1.6-5.6 0-2.2-.5-3.4-1.6-3.4Z"/><path d="M13.6 8.2 7.5 6.6l.9 1.4-1.6.2 1.4 1-1.5.6 1.6.8-1.2.9 1.8.4-.9 1.1 2 .1-.5 1.1 4-.9Z"/><path d="m16.4 8.2 6.1-1.6-.9 1.4 1.6.2-1.4 1 1.5.6-1.6.8 1.2.9-1.8.4.9 1.1-2 .1.5 1.1-4-.9Z"/><path d="m14.2 15.2-1.4 2.2 2.2-.9 2.2.9-1.4-2.2Z"/></g>',
  };

  function flag(code, cls) {
    const square = code === 'ch';
    return `<svg class="flag${square ? ' flag-sq' : ''}${cls ? ' ' + cls : ''}" viewBox="0 0 ${square ? '20 20' : '30 20'}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">${F[code] || ''}</svg>`;
  }

  window.LUKS_GFX = { icon, flag, ICONS: P };
})();
