import { useEffect, useRef } from 'react';

const SHADE = ' .:-=+*#%@';

const RIDGES = [
  { base: 0.58, amp: 5, f: [0.05, 0.13, 0.31], p: [0.0, 1.3, 2.1], px: 2, py: 0.4, speed: 0.5, ramp: ':.', step: 2, alpha: 0.28 },
  { base: 0.66, amp: 6, f: [0.04, 0.11, 0.27], p: [1.0, 2.2, 0.4], px: 5, py: 0.8, speed: 1.0, ramp: '=-:.', step: 2, alpha: 0.38 },
  { base: 0.75, amp: 7, f: [0.035, 0.09, 0.22], p: [2.0, 0.7, 1.6], px: 10, py: 1.4, speed: 1.8, ramp: '*=-:.', step: 3, alpha: 0.5 },
  { base: 0.86, amp: 6, f: [0.03, 0.08, 0.19], p: [0.5, 1.9, 2.8], px: 18, py: 2.2, speed: 3.0, ramp: '#*=-:.', step: 3, alpha: 0.65 },
];

const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export default function AsciiBackground({ levelsRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    let colors = { ink: '#888', accent: '#fff', boost: 1 };
    let w = 0, h = 0, cols = 0, rows = 0, cw = 8, chh = 14, fs = 13;
    let chars = [];
    let lay = new Int8Array(0);
    let raf = 0;
    let last = 0;
    let alive = true;

    const readColors = () => {
      const s = getComputedStyle(document.documentElement);
      colors = {
        ink: s.getPropertyValue('--ascii').trim() || '#888',
        accent: s.getPropertyValue('--accent').trim() || '#fff',
        boost: parseFloat(s.getPropertyValue('--ascii-boost')) || 1,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fs = Math.max(11, Math.min(16, Math.round(w / 110)));
      ctx.font = `${fs}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width;
      chh = Math.round(fs * 1.15);
      cols = Math.ceil(w / cw) + 1;
      rows = Math.ceil(h / chh) + 1;
      chars = new Array(cols * rows).fill(' ');
      lay = new Int8Array(cols * rows).fill(-1);
    };

    const onMove = (e) => {
      mouse.tx = (e.clientX / w) * 2 - 1;
      mouse.ty = (e.clientY / h) * 2 - 1;
    };

    const ridgeY = (x, L, sc, boost) => {
      let v = 0;
      for (let i = 0; i < L.f.length; i++) v += Math.sin(x * L.f[i] + L.p[i]) * (L.amp / (i + 1));
      return v * sc * boost;
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 28) return;
      last = now;

      const t = reduced ? 0 : now / 1000;
      const lv = levelsRef.current;
      const k = reduced ? 0 : 0.06;
      mouse.x += (mouse.tx - mouse.x) * k;
      mouse.y += (mouse.ty - mouse.y) * k;

      chars.fill(' ');
      lay.fill(-1);
      const asp = chh / cw;
      const sc = rows / 50;

      const starOff = Math.round(mouse.x * 3 + t * 0.4);
      const skyRows = Math.floor(rows * 0.72);
      for (let r = 0; r < skyRows; r++) {
        for (let c = 0; c < cols; c++) {
          const hs = hash(c + starOff, r);
          if (hs > 0.984) {
            const lvl = 0.5 + 0.5 * Math.sin(t * 2 + hs * 80) + lv.treble * 0.9;
            const i = r * cols + c;
            chars[i] = lvl > 1.1 ? '*' : lvl > 0.55 ? '+' : '.';
            lay[i] = 0;
          }
        }
      }

      const R = Math.min(cols * 0.15, rows * asp * 0.3) * (1 + lv.bass * 0.1);
      const cx = cols * 0.76 - mouse.x * 4;
      const cy = rows * 0.33 - mouse.y * 2;
      const a = t * 0.35;
      const lx = Math.cos(a) * 0.7, ly = -0.35, lz = 0.65;
      const rMin = Math.max(0, Math.floor(cy - R / asp - 1));
      const rMax = Math.min(rows - 1, Math.ceil(cy + R / asp + 1));
      const cMin = Math.max(0, Math.floor(cx - R - 1));
      const cMax = Math.min(cols - 1, Math.ceil(cx + R + 1));
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const dx = (c - cx) / R;
          const dy = ((r - cy) * asp) / R;
          const d2 = dx * dx + dy * dy;
          if (d2 >= 1) continue;
          const z = Math.sqrt(1 - d2);
          const b = Math.max(0, dx * lx + dy * ly + z * lz) + lv.bass * 0.2;
          const idx = Math.min(9, Math.floor(b * 9.99));
          if (idx > 0) {
            const i = r * cols + c;
            chars[i] = SHADE[idx];
            lay[i] = 1;
          }
        }
      }

      const tops = new Array(cols + 2);
      RIDGES.forEach((L, li) => {
        const boost = 1 + lv.bass * (0.1 + li * 0.12);
        const off = mouse.x * L.px + t * L.speed;
        const yShift = -mouse.y * L.py;
        for (let c = -1; c <= cols; c++) {
          tops[c + 1] = rows * L.base + yShift - ridgeY(c + off, L, sc, boost);
        }
        for (let c = 0; c < cols; c++) {
          const top = Math.round(tops[c + 1]);
          const slope = tops[c + 2] - tops[c];
          for (let r = Math.max(0, top); r < rows; r++) {
            const i = r * cols + c;
            const d = r - top;
            chars[i] =
              d === 0
                ? slope < -0.8 ? '/' : slope > 0.8 ? '\\' : '_'
                : L.ramp[Math.min(L.ramp.length - 1, Math.floor(d / L.step))];
            lay[i] = 2 + li;
          }
        }
      });

      ctx.clearRect(0, 0, w, h);
      const passes = [
        { li: 0, color: colors.ink, alpha: Math.min(1, 0.55 * colors.boost) },
        { li: 1, color: colors.accent, alpha: Math.min(1, (0.75 + lv.bass * 0.25) * colors.boost) },
        ...RIDGES.map((L, i) => ({
          li: i + 2,
          color: colors.ink,
          alpha: Math.min(1, (L.alpha + lv.mid * 0.25) * colors.boost),
        })),
      ];
      const total = cols * rows;
      for (const p of passes) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        for (let i = 0; i < total; i++) {
          if (lay[i] === p.li && chars[i] !== ' ') {
            ctx.fillText(chars[i], (i % cols) * cw, Math.floor(i / cols) * chh);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    readColors();
    resize();
    raf = requestAnimationFrame(frame);

    document.fonts?.load('13px "JetBrains Mono"').then(() => alive && resize());

    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [levelsRef]);

  return <canvas ref={canvasRef} className="ascii" aria-hidden="true" />;
}
