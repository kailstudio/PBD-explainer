import { useEffect, useRef } from 'react';

// The space around the organelle: faint specks drifting in the cytosol and a
// handful of tiled, lumpy proteins wandering about, nudging each other and
// bouncing off the edges. Kept soft on purpose. It should register as "we are
// inside a cell" and then be forgotten.

const ACCENT = { mechanisms: [130, 160, 245], diseases: [255, 120, 118] };
const rand = (min, max) => min + Math.random() * (max - min);

function makeSpecks(width, height) {
  const count = Math.round((width * height) / 30000);
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.5, 1.6),
    alpha: rand(0.12, 0.32),
    vx: rand(-5, 5),
    vy: rand(-4, 4),
    phase: rand(0, Math.PI * 2),
  }));
}

// A protein is a few overlapping lobes, so each one has its own lumpy shape.
function makeProtein(width, height, existing) {
  const r = rand(11, 26);
  const lobes = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => {
    const a = (i / 3) * Math.PI * 2 + rand(-0.6, 0.6);
    const d = i === 0 ? 0 : rand(0.35, 0.7) * r;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: i === 0 ? r * 0.75 : rand(0.4, 0.62) * r };
  });
  let x;
  let y;
  let tries = 0;
  do {
    x = rand(r, width - r);
    y = rand(r, height - r);
    tries += 1;
  } while (tries < 30 && existing.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r + 12));
  const speed = rand(14, 30);
  const heading = rand(0, Math.PI * 2);
  return {
    x,
    y,
    r,
    lobes,
    vx: Math.cos(heading) * speed,
    vy: Math.sin(heading) * speed,
    angle: rand(0, Math.PI * 2),
    spin: rand(-0.35, 0.35),
    squash: 0,
    shade: rand(0.55, 1),
  };
}

function step(proteins, width, height, dt) {
  for (const p of proteins) {
    // A little Brownian jostle, and a gentle pull back towards cruising speed.
    p.vx += rand(-18, 18) * dt;
    p.vy += rand(-18, 18) * dt;
    const speed = Math.hypot(p.vx, p.vy) || 1;
    const goal = 22;
    p.vx += (p.vx / speed) * (goal - speed) * 0.3 * dt;
    p.vy += (p.vy / speed) * (goal - speed) * 0.3 * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.angle += p.spin * dt;
    p.squash *= Math.exp(-dt * 5);

    if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); p.squash = 1; }
    if (p.x > width - p.r) { p.x = width - p.r; p.vx = -Math.abs(p.vx); p.squash = 1; }
    if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); p.squash = 1; }
    if (p.y > height - p.r) { p.y = height - p.r; p.vy = -Math.abs(p.vy); p.squash = 1; }
  }

  // Bumps: separate any overlapping pair and swap their speed along the line between them.
  for (let i = 0; i < proteins.length; i += 1) {
    for (let j = i + 1; j < proteins.length; j += 1) {
      const a = proteins[i];
      const b = proteins[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const min = a.r + b.r;
      if (dist >= min) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const push = (min - dist) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const ma = a.r * a.r;
      const mb = b.r * b.r;
      const va = a.vx * nx + a.vy * ny;
      const vb = b.vx * nx + b.vy * ny;
      if (va - vb <= 0) continue;
      const na = (va * (ma - mb) + 2 * mb * vb) / (ma + mb);
      const nb = (vb * (mb - ma) + 2 * ma * va) / (ma + mb);
      a.vx += (na - va) * nx;
      a.vy += (na - va) * ny;
      b.vx += (nb - vb) * nx;
      b.vy += (nb - vb) * ny;
      a.squash = 1;
      b.squash = 1;
      a.spin += rand(-0.3, 0.3);
      b.spin += rand(-0.3, 0.3);
    }
  }
}

// Each protein is drawn as a small cluster of square tiles: a grid laid over
// its lobes, each tile lit by how deep inside the shape it sits.
function drawProtein(ctx, p, [r, g, b]) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const s = 1 + p.squash * 0.12;
  ctx.scale(s, 1 / s);
  const light = (k) => `${Math.round(r + (255 - r) * k)}, ${Math.round(g + (255 - g) * k)}, ${Math.round(b + (255 - b) * k)}`;
  const cell = Math.max(4, Math.round(p.r / 3.2));
  const reach = Math.ceil((p.r * 1.4) / cell);
  for (let gy = -reach; gy <= reach; gy += 1) {
    for (let gx = -reach; gx <= reach; gx += 1) {
      const cx = (gx + 0.5) * cell;
      const cy = (gy + 0.5) * cell;
      let depth = 0;
      for (const lobe of p.lobes) {
        const d = Math.hypot(cx - lobe.dx, cy - lobe.dy) / lobe.r;
        depth = Math.max(depth, 1 - d);
      }
      if (depth <= 0) continue;
      const k = Math.min(1, depth * 1.6);
      ctx.fillStyle = `rgba(${light(0.7 - 0.45 * k)}, ${(0.12 + 0.4 * k) * p.shade})`;
      ctx.fillRect(gx * cell + 0.5, gy * cell + 0.5, cell - 1, cell - 1);
    }
  }
  ctx.restore();
}

export default function Drift({ view, still }) {
  const canvasRef = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let specks = [];
    let proteins = [];
    let tint = [...ACCENT[viewRef.current]];
    let frame = 0;
    let last = performance.now();
    let clock = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      specks = makeSpecks(width, height);
      const count = Math.max(5, Math.min(12, Math.round((width * height) / 120000)));
      proteins = [];
      for (let i = 0; i < count; i += 1) proteins.push(makeProtein(width, height, proteins));
      if (still) draw(0);
    };

    function draw(dt) {
      clock += dt;
      const goal = ACCENT[viewRef.current];
      tint = tint.map((c, i) => c + (goal[i] - c) * Math.min(1, dt * 3 || 1));
      const [r, g, b] = tint.map((c) => c | 0);
      ctx.clearRect(0, 0, width, height);

      for (const s of specks) {
        s.x = (s.x + s.vx * dt + width) % width;
        s.y = (s.y + s.vy * dt + height) % height;
        const twinkle = 0.75 + 0.25 * Math.sin(clock * 0.6 + s.phase);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${s.alpha * twinkle})`;
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      }

      if (!still) step(proteins, width, height, dt);
      for (const p of proteins) drawProtein(ctx, p, [r, g, b]);
    }

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(dt);
      frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    if (!still) frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
    // With reduced motion there is no loop, so redraw once when the view changes.
  }, [still, still ? view : null]);

  return <canvas ref={canvasRef} className="drift" aria-hidden="true" />;
}
