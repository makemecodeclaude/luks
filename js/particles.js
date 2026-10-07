/* Soft organic dot field (inspired by the stippled cell imagery of the visual reference).
 * Renders a few curved "strands" and a ring out of thousands of small dots that drift gently.
 */
(function () {
  'use strict';

  const bez = (p, t) => {
    const u = 1 - t;
    return [
      u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
      u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
    ];
  };
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // Shapes in normalised canvas coordinates
  const STRANDS = [
    { w: 0.055, n: 0.34, f: (t) => bez([[1.08, -0.06], [0.72, 0.28], [0.8, 0.52], [0.38, 1.06]], t) },
    { w: 0.035, n: 0.16, f: (t) => bez([[0.5, -0.08], [0.6, 0.14], [0.84, 0.26], [1.08, 0.4]], t) },
    { w: 0.04, n: 0.2, f: (t) => bez([[0.2, 1.08], [0.46, 0.84], [0.68, 0.84], [1.08, 0.98]], t) },
    { w: 0.03, n: 0.3, ring: true, f: (t) => [0.8 + 0.17 * Math.cos(t * 2 * Math.PI), 0.62 + 0.19 * Math.sin(t * 2 * Math.PI) + 0.02 * Math.sin(t * 12)] },
  ];
  const COLORS = ['#1C4A73', '#2C6AA3', '#6FA4D6'];
  const BUCKETS = 6;

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, pts = [], raf = 0, running = false, last = 0;

    function generate() {
      pts = [];
      const total = Math.round(Math.min(12000, Math.max(3200, (w * h) / 80)));
      for (const s of STRANDS) {
        const count = Math.round(total * s.n);
        for (let i = 0; i < count; i++) {
          const t = Math.random();
          const [x, y] = s.f(t);
          const [x2, y2] = s.f(Math.min(1, t + 0.002));
          let nx = -(y2 - y), ny = x2 - x;
          const len = Math.hypot(nx, ny) || 1;
          nx /= len; ny /= len;
          const width = s.w * (0.55 + 0.9 * Math.abs(Math.sin(t * 7.3 + s.n * 10)));
          const off = gauss() * width;
          const density = Math.exp(-(off * off) / (2 * width * width));
          pts.push({
            x: (x + nx * off) * w,
            y: (y + ny * off) * h,
            r: (0.5 + Math.random() * 1.2) * dpr,
            b: Math.min(BUCKETS - 1, Math.floor((density * 0.85 + Math.random() * 0.25) * BUCKETS)),
            c: Math.random() < 0.7 ? 0 : (Math.random() < 0.6 ? 1 : 2),
            ph: Math.random() * Math.PI * 2,
            sp: 0.25 + Math.random() * 0.5,
            a: (0.6 + Math.random() * 2.2) * dpr,
          });
        }
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w;
      canvas.height = h;
      generate();
      draw(performance.now());
    }

    function draw(now) {
      const time = now / 1000;
      ctx.clearRect(0, 0, w, h);
      for (let c = 0; c < COLORS.length; c++) {
        ctx.fillStyle = COLORS[c];
        for (let b = 0; b < BUCKETS; b++) {
          ctx.globalAlpha = 0.1 + (b / (BUCKETS - 1)) * 0.75;
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (p.c !== c || p.b !== b) continue;
            const dx = reduce ? 0 : Math.sin(time * p.sp + p.ph) * p.a;
            const dy = reduce ? 0 : Math.cos(time * p.sp * 0.8 + p.ph) * p.a;
            ctx.fillRect(p.x + dx, p.y + dy, p.r, p.r);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      if (!running) return;
      if (now - last > 33) { draw(now); last = now; } // ~30 fps is plenty for a slow drift
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => { if (running) resize(); });

    return {
      start() {
        if (running) return;
        running = true;
        resize();
        if (!reduce) raf = requestAnimationFrame(loop);
      },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  }

  window.LUKS_PARTICLES = { create };
})();
