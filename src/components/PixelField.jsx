import { useEffect, useRef } from 'react';

// The page background as a field of large, faint tiles, each stepping in
// colour with its distance from a few soft focal points (after colour-field
// prints). One canvas per view; the page cross-fades between them.

const FIELDS = {
  mechanisms: {
    paper: [15, 16, 25],
    spots: [
      { x: 0.86, y: 0.06, r: 0.42, c: [44, 66, 170], w: 0.95 },
      { x: 0.06, y: 0.94, r: 0.4, c: [30, 52, 140], w: 0.8 },
      { x: 0.98, y: 0.86, r: 0.28, c: [20, 84, 120], w: 0.6 },
      { x: 0.08, y: 0.12, r: 0.26, c: [64, 58, 150], w: 0.5 },
    ],
  },
  diseases: {
    paper: [19, 14, 20],
    spots: [
      { x: 0.86, y: 0.06, r: 0.42, c: [150, 30, 50], w: 0.95 },
      { x: 0.06, y: 0.94, r: 0.4, c: [120, 26, 56], w: 0.8 },
      { x: 0.98, y: 0.86, r: 0.28, c: [140, 52, 36], w: 0.6 },
      { x: 0.08, y: 0.12, r: 0.26, c: [104, 30, 62], w: 0.5 },
    ],
  },
};

const STEPS = 7;

function draw(canvas, view) {
  const { paper, spots } = FIELDS[view];
  const w = window.innerWidth;
  const h = window.innerHeight;
  const tile = Math.max(44, Math.min(80, Math.round(w / 22)));
  canvas.width = Math.ceil(w / tile);
  canvas.height = Math.ceil(h / tile);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  const scale = Math.max(w, h);
  let seed = 9;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let j = 0; j < canvas.height; j += 1) {
    for (let i = 0; i < canvas.width; i += 1) {
      const px = (i + 0.5) * tile;
      const py = (j + 0.5) * tile;
      let total = 0;
      const col = [0, 0, 0];
      for (const s of spots) {
        const d = Math.hypot(px - s.x * w, py - s.y * h) / (s.r * scale);
        const k = s.w * 0.45 * Math.exp(-d * d);
        total += k;
        for (let c = 0; c < 3; c += 1) col[c] += s.c[c] * k;
      }
      const t = Math.min(0.7, total);
      const stepped = Math.round((t + (rnd() - 0.5) * 0.06) * STEPS) / STEPS;
      const k = (n) => (total > 0 ? col[n] / total : paper[n]);
      const o = (j * canvas.width + i) * 4;
      for (let c = 0; c < 3; c += 1) img.data[o + c] = paper[c] + (k(c) - paper[c]) * stepped;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export default function PixelField({ view }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const redraw = () => draw(canvas, view);
    redraw();
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, [view]);
  return <canvas ref={ref} className="pixel-field" data-for={view} />;
}
