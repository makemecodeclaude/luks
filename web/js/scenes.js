/* Canvas scenes for the LUKS website
 * - helix:   a stippled 3D double helix (thousands of dots, perspective-projected, depth-shaded)
 * - network: drifting constellation of nodes and links for the help section
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ------------------------------------------------------------------ helix */
  function createHelix(canvas) {
    const ctx = canvas.getContext('2d');
    const BUCKETS = 10;
    // colour per depth bucket: front = deep navy, back = pale sky
    const FRONT = [23, 70, 112], BACK = [128, 176, 220];
    const fills = Array.from({ length: BUCKETS }, (_, i) => {
      const k = i / (BUCKETS - 1);
      return `rgb(${Math.round(lerp(FRONT[0], BACK[0], k))},${Math.round(lerp(FRONT[1], BACK[1], k))},${Math.round(lerp(FRONT[2], BACK[2], k))})`;
    });
    const alphas = Array.from({ length: BUCKETS }, (_, i) => lerp(0.95, 0.22, i / (BUCKETS - 1)));

    let w = 0, h = 0, dpr = 1, N = 0;
    let U, PHI, R, OX, OY, OZ, S, SX, SY, B, ORDER;
    let mx = 0, my = 0, tmx = 0, tmy = 0, scrollRot = 0, progress = 0;
    let raf = 0, running = false, t0 = performance.now();

    function generate() {
      const area = (w * h) / (dpr * dpr);
      N = Math.round(Math.min(34000, Math.max(9000, area / 34)));
      U = new Float32Array(N); PHI = new Float32Array(N); R = new Float32Array(N);
      OX = new Float32Array(N); OY = new Float32Array(N); OZ = new Float32Array(N); S = new Float32Array(N);
      SX = new Float32Array(N); SY = new Float32Array(N); B = new Uint8Array(N); ORDER = new Uint32Array(N);
      const turns = 2.1, rungs = Math.round(turns * 11);
      // a few dense "knots" along the backbones give the organic, clumped look
      const knots = Array.from({ length: 9 }, () => ({ u: Math.random() - 0.5, s: 0.02 + Math.random() * 0.04 }));
      for (let i = 0; i < N; i++) {
        const k = Math.random();
        let u, phi, r, sd;
        if (k < 0.62) {               // the two backbones
          if (Math.random() < 0.35) { const kn = knots[(Math.random() * knots.length) | 0]; u = kn.u + gauss() * kn.s; }
          else u = Math.random() - 0.5;
          phi = u * turns * TAU + (Math.random() < 0.5 ? 0 : Math.PI);
          r = 1;
          sd = 0.14 * (0.5 + 1.1 * Math.abs(Math.sin(u * 17 + 1.3)));
        } else if (k < 0.9) {         // base pairs between them
          const j = Math.floor(Math.random() * rungs);
          u = (j + 0.5) / rungs - 0.5 + gauss() * 0.002;
          phi = u * turns * TAU;
          r = Math.random() * 2 - 1;
          sd = 0.06;
        } else {                      // diffuse halo
          u = Math.random() - 0.5;
          phi = Math.random() * TAU;
          r = 1 + Math.abs(gauss()) * 0.3;
          sd = 0.16;
        }
        U[i] = u; PHI[i] = phi; R[i] = r;
        OX[i] = gauss() * sd; OY[i] = gauss() * sd; OZ[i] = gauss() * sd;
        S[i] = (0.7 + Math.random() * 1.5) * dpr;
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w; canvas.height = h;
      generate();
      draw(performance.now());
    }

    function draw(now) {
      const t = (now - t0) / 1000;
      mx = lerp(mx, tmx, 0.05); my = lerp(my, tmy, 0.05);
      const narrow = w / dpr < 760;
      const rad = Math.min(w, h) * (narrow ? 0.22 : 0.2);
      const len = Math.max(w, h) * 1.25;
      const a = t * 0.16 + scrollRot;
      const tilt = narrow ? -0.4 : -0.58;
      const pitch = 0.25 + my * 0.18, yaw = mx * 0.22;
      const cp = Math.cos(pitch), sp = Math.sin(pitch), cy0 = Math.cos(yaw), sy0 = Math.sin(yaw);
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const F = 1100 * dpr;
      const cx = w * (narrow ? 0.74 : 0.72) + mx * 18 * dpr;
      const cyy = h * 0.5 - progress * h * 0.35 + my * 12 * dpr;
      const counts = new Uint32Array(BUCKETS);

      for (let i = 0; i < N; i++) {
        const th = PHI[i] + a;
        let x = (R[i] * Math.cos(th) + OX[i]) * rad;
        let z = (R[i] * Math.sin(th) + OZ[i]) * rad;
        let y = U[i] * len + OY[i] * rad;
        // yaw (around y) and pitch (around x) follow the pointer
        let x1 = x * cy0 + z * sy0; let z1 = -x * sy0 + z * cy0;
        let y1 = y * cp - z1 * sp; let z2 = y * sp + z1 * cp;
        // tilt the helix diagonally in the screen plane
        const X = x1 * ct - y1 * st, Y = x1 * st + y1 * ct;
        const p = F / (F + z2);
        SX[i] = cx + X * p; SY[i] = cyy + Y * p;
        let d = (z2 / rad + 1.4) / 2.8;           // 0 = front, 1 = back
        d = d < 0 ? 0 : d > 0.999 ? 0.999 : d;
        const b = (d * BUCKETS) | 0;
        B[i] = b; counts[b]++;
      }
      // counting sort by depth bucket → back to front, one fillStyle per bucket
      const start = new Uint32Array(BUCKETS);
      for (let b = BUCKETS - 2; b >= 0; b--) start[b] = start[b + 1] + counts[b + 1];
      const pos = start.slice();
      for (let i = 0; i < N; i++) ORDER[pos[B[i]]++] = i;

      ctx.clearRect(0, 0, w, h);
      for (let b = BUCKETS - 1; b >= 0; b--) {
        ctx.fillStyle = fills[b];
        ctx.globalAlpha = alphas[b] * (narrow ? 0.5 : 1); // keep text readable on phones
        const end = start[b] + counts[b];
        for (let o = start[b]; o < end; o++) {
          const i = ORDER[o];
          const s = S[i] * (1.25 - B[i] / BUCKETS * 0.6);
          ctx.fillRect(SX[i], SY[i], s, s);
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(now) {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', () => resize());
    window.addEventListener('pointermove', (e) => {
      tmx = (e.clientX / window.innerWidth) * 2 - 1;
      tmy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    return {
      init() { resize(); },
      start() {
        if (running || reduce()) return;
        running = true;
        raf = requestAnimationFrame(loop);
      },
      stop() { running = false; cancelAnimationFrame(raf); },
      setScroll(rot, p) { scrollRot = rot; progress = p; if (!running) draw(performance.now()); },
    };
  }

  /* ---------------------------------------------------------------- network */
  function createNetwork(canvas) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, nodes = [], blobs = [], raf = 0, running = false;
    let px = -9999, py = -9999;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width * dpr));
      h = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = w; canvas.height = h;
      const count = Math.round(Math.min(130, Math.max(45, (w * h) / (dpr * dpr) / 9000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
        r: (0.8 + Math.random() * 1.8) * dpr,
      }));
      blobs = Array.from({ length: 7 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: (60 + Math.random() * 140) * dpr, ph: Math.random() * TAU }));
      draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(150,205,240,${0.10 + 0.05 * Math.sin(t / 1600 + b.ph)})`);
        g.addColorStop(1, 'rgba(150,205,240,0)');
        ctx.fillStyle = g;
        ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      }
      const max = 150 * dpr;
      ctx.lineWidth = 1 * dpr;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < max * max) {
            const k = 1 - Math.sqrt(d2) / max;
            ctx.strokeStyle = `rgba(190,226,248,${k * 0.32})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(214,238,252,0.9)';
      for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill(); }
    }

    function step(now) {
      if (!running) return;
      for (const n of nodes) {
        const dx = px - n.x, dy = py - n.y, d = Math.hypot(dx, dy);
        if (d < 200 * dpr && d > 1) { n.vx += dx / d * 0.012 * dpr; n.vy += dy / d * 0.012 * dpr; }
        n.vx *= 0.995; n.vy *= 0.995;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      draw(now);
      raf = requestAnimationFrame(step);
    }

    window.addEventListener('resize', () => resize());
    canvas.parentElement.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      px = (e.clientX - r.left) * dpr; py = (e.clientY - r.top) * dpr;
    }, { passive: true });
    canvas.parentElement.addEventListener('pointerleave', () => { px = py = -9999; });

    return {
      init() { resize(); },
      start() { if (running || reduce()) return; running = true; raf = requestAnimationFrame(step); },
      stop() { running = false; cancelAnimationFrame(raf); },
    };
  }

  window.LUKS_SCENES = { createHelix, createNetwork };
})();
