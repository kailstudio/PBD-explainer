import { useEffect, useRef } from 'react';

// The space around the organelle: a sparse field of specks drifting in the
// cytosol and, every so often, one small protein crossing the view at speed.
// Kept faint on purpose. It should register as "we are inside a cell" and
// then be forgotten.

const ACCENT = { mechanisms: [95, 216, 255], diseases: [255, 131, 102] };
const NEUTRAL = [150, 170, 190];
const rand = (min, max) => min + Math.random() * (max - min);

function makeSpecks(width, height) {
  const count = Math.round((width * height) / 30000);
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: rand(0.4, 1.3),
    alpha: rand(0.06, 0.3),
    vx: rand(-5, 5),
    vy: rand(-4, 4),
    phase: rand(0, Math.PI * 2),
    tinted: Math.random() < 0.35,
  }));
}

// Enters from one edge and leaves by another, on a line that misses the middle.
function makeProtein(width, height) {
  const fromLeft = Math.random() < 0.5;
  const high = Math.random() < 0.5;
  const start = { x: fromLeft ? -40 : width + 40, y: high ? rand(0.04, 0.3) * height : rand(0.7, 0.96) * height };
  const end = { x: fromLeft ? width + 40 : -40, y: start.y + rand(-0.14, 0.14) * height };
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  return { start, end, length, travelled: 0, speed: rand(1100, 1700), wobble: rand(4, 10), seed: rand(0, 10) };
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
    let protein = null;
    let nextProtein = rand(3, 6);
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
      if (still) draw(0);
    };

    const pointOn = (p, travelled) => {
      const t = travelled / p.length;
      const x = p.start.x + (p.end.x - p.start.x) * t;
      const y = p.start.y + (p.end.y - p.start.y) * t + Math.sin(travelled * 0.012 + p.seed) * p.wobble;
      return [x, y];
    };

    function draw(dt) {
      clock += dt;
      const goal = ACCENT[viewRef.current];
      tint = tint.map((c, i) => c + (goal[i] - c) * Math.min(1, dt * 3 || 1));
      ctx.clearRect(0, 0, width, height);

      for (const s of specks) {
        s.x = (s.x + s.vx * dt + width) % width;
        s.y = (s.y + s.vy * dt + height) % height;
        const twinkle = 0.75 + 0.25 * Math.sin(clock * 0.6 + s.phase);
        const [r, g, b] = s.tinted ? tint : NEUTRAL;
        ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${s.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (still) return;

      nextProtein -= dt;
      if (!protein && nextProtein <= 0) protein = makeProtein(width, height);
      if (protein) {
        protein.travelled += protein.speed * dt;
        const [r, g, b] = tint.map((c) => c | 0);
        const tail = 150;
        const steps = 14;
        ctx.lineCap = 'round';
        for (let i = 0; i < steps; i += 1) {
          const a = protein.travelled - (tail * i) / steps;
          const z = protein.travelled - (tail * (i + 1)) / steps;
          const [x1, y1] = pointOn(protein, a);
          const [x2, y2] = pointOn(protein, z);
          const fade = 1 - i / steps;
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.55 * fade * fade})`;
          ctx.lineWidth = 0.6 + 1.3 * fade;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        const [hx, hy] = pointOn(protein, protein.travelled);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(hx, hy, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (protein.travelled - tail > protein.length) {
          protein = null;
          nextProtein = rand(7, 15);
        }
      }
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
