import { useMemo, useRef, useState } from 'react';
import { circOut, easeOut, motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import Peroxisome from './Peroxisome';

// The scroll-driven intro that sits above the hub on a first visit.
// Scrolling scrubs it forwards and back, like a timeline:
//   1. the orb's outline draws itself in, with an atom at its heart
//   2. the membrane and core condense inside the lines (healthy, blue)
//   3. it starts to fail: the core darkens and turns red, then the membrane
//      bursts, throwing out torn fragments and debris
//   4. the shards fly home and it heals, then hands over to the hub
// Every number below is a share of the whole scroll (0 to 1).

const STEPS = [
  { from: 0.02, to: 0.2, text: 'Inside almost every cell in your body…' },
  {
    from: 0.26,
    to: 0.44,
    text: '…sits the peroxisome. It breaks down fats and clears toxins the rest of the cell can’t handle.',
  },
  {
    from: 0.5,
    to: 0.72,
    text: 'When it fails, the damage spreads: rare genetic disorders, and links to aging, cancer and neurodegeneration.',
  },
  { from: 0.8, to: 1, text: 'Understanding the peroxisome', em: 'is how we start to fix it.' },
];

// Membrane outline: a soft, wavy closed loop around the centre of a 1000 box.
function blobPath(radius, seed, wave = 1) {
  const points = [];
  for (let i = 0; i <= 160; i += 1) {
    const a = (i / 160) * Math.PI * 2;
    const r =
      radius *
      (1 +
        wave * 0.035 * Math.sin(5 * a + seed) +
        wave * 0.022 * Math.sin(9 * a + seed * 1.7) +
        wave * 0.012 * Math.sin(14 * a + seed * 0.6));
    points.push(`${(500 + Math.cos(a) * r).toFixed(1)},${(500 + Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
}

const seeded = (start) => {
  let seed = start;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

const SHARD_COLOURS = ['#ffbfcb', '#ff8aa1', '#ff4f6a', '#e8400f', '#fdeef1', '#ff8aa1'];

// A torn bit of membrane: an irregular, softly rounded fleck centred on 0,0.
function fragmentPath(size, rnd) {
  const n = 5 + Math.floor(rnd() * 4);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
    const r = size * (0.45 + rnd() * 0.55);
    return [Math.cos(a) * r, Math.sin(a) * r * (0.55 + rnd() * 0.45)];
  });
  // Smooth closed curve through the midpoints, so the edges are soft, not cut.
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${mid(pts[n - 1], pts[0]).map((v) => v.toFixed(1)).join(',')}`;
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

// Fragments blown off the membrane, starting around its rim and flying
// outwards; bigger pieces travel less far, as in a real burst.
function makeShards(count) {
  const rnd = seeded(7);
  return Array.from({ length: count }, () => {
    const angle = rnd() * Math.PI * 2;
    const r = 200 + rnd() * 110;
    const size = 10 + rnd() * rnd() * 46;
    const fly = (160 + rnd() * 320) * (1.2 - size / 70);
    return {
      x: 500 + Math.cos(angle) * r,
      y: 500 + Math.sin(angle) * r,
      dx: Math.cos(angle + (rnd() - 0.5) * 0.4) * fly,
      dy: Math.sin(angle + (rnd() - 0.5) * 0.4) * fly + 30 * rnd(),
      spin: (rnd() - 0.5) * 260,
      tilt: rnd() * 360,
      d: fragmentPath(size, rnd),
      fill: SHARD_COLOURS[Math.floor(rnd() * SHARD_COLOURS.length)],
      lag: rnd() * 0.05,
    };
  });
}

function makeDebris(count) {
  let seed = 3;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, () => {
    const angle = rnd() * Math.PI * 2;
    const r = 170 + rnd() * 150;
    const fly = 60 + rnd() * rnd() * 520;
    return {
      x: 500 + Math.cos(angle) * r,
      y: 500 + Math.sin(angle) * r,
      dx: Math.cos(angle) * fly,
      dy: Math.sin(angle) * fly,
      size: 1 + rnd() * rnd() * 5,
      lag: rnd() * 0.03,
    };
  });
}

function Step({ progress, from, to, text, em }) {
  // Fade in just before `from`, out just before `to`; the last line stays.
  const last = to >= 1;
  const input = [Math.max(0, from - 0.04), Math.max(from, 0.001), last ? 0.999 : to - 0.03, last ? 1 : to];
  const opacity = useTransform(progress, input, [0, 1, 1, last ? 1 : 0]);
  const y = useTransform(progress, input, [24, 0, 0, last ? 0 : -24]);
  return (
    <motion.p className="intro-line" data-final={em ? true : undefined} style={{ opacity, y }}>
      {text}
      {em && (
        <>
          {' '}
          <span className="intro-em">{em}</span>
        </>
      )}
    </motion.p>
  );
}

// The atom drawn inside the orb, in this 1000-unit drawing.
const ATOM = { x: 500, y: 505 };
// A loose cluster of protons and neutrons: [dx, dy, r].
const NUCLEUS = [
  [0, 0, 26],
  [-30, -14, 22],
  [28, -18, 21],
  [-10, 30, 22],
  [30, 22, 19],
  [-34, 22, 17],
  [6, -36, 18],
];
// Three orbits, each a tilted ellipse.
const ORBITS = [
  { rx: 250, ry: 82, tilt: -28, tone: 'a', start: 0.15, turns: 1.1 },
  { rx: 250, ry: 82, tilt: 32, tone: 'b', start: 0.55, turns: -0.9 },
  { rx: 250, ry: 82, tilt: 92, tone: 'c', start: 0.85, turns: 1.3 },
];

// One electron per orbit. It appears once its orbit has drawn, then glides
// round as you scroll.
function Electron({ orbit, progress, index, opacity }) {
  const angle = useTransform(progress, [0, 1], [orbit.start, orbit.start + orbit.turns].map((t) => t * Math.PI * 2));
  const cx = useTransform(angle, (a) => ATOM.x + Math.cos(a) * orbit.rx);
  const cy = useTransform(angle, (a) => ATOM.y + Math.sin(a) * orbit.ry);
  const on = useTransform(progress, [0.18 + index * 0.025, 0.22 + index * 0.025], [0, 1]);
  const shown = useTransform([on, opacity], ([a, b]) => a * Math.min(1, b * 2.5));
  return (
    <motion.circle cx={cx} cy={cy} r={9} className="intro-electron" data-tone={orbit.tone} style={{ opacity: shown }} />
  );
}

function Drawn({ progress, from, to, children, fadeTo = 0.35 }) {
  const pathLength = useTransform(progress, [from, to], [0, 1]);
  // Lines stay strong while drawing, then settle back once the orb fills in.
  const opacity = useTransform(
    progress,
    [from, from + 0.01, 0.3, 0.38, 0.47, 0.52, 0.9, 0.96],
    [0, 1, 1, fadeTo, fadeTo, 0, 0, fadeTo],
  );
  return children({ pathLength, opacity });
}

function Shard({ shard, progress }) {
  // Fast burst that slows as it spreads (ease-out), then a gentle drift home.
  const out = useTransform(progress, [0.52 + shard.lag, 0.74 + shard.lag, 0.8, 0.9], [0, 1, 1, 0], {
    ease: [circOut, (t) => t, easeOut],
  });
  const x = useTransform(out, (t) => shard.x + shard.dx * t);
  const y = useTransform(out, (t) => shard.y + shard.dy * t);
  const rotate = useTransform(out, (t) => shard.tilt + shard.spin * t);
  const scale = useTransform(out, [0, 0.15, 1], [0.4, 1, 0.75]);
  const opacity = useTransform(progress, [0.5 + shard.lag, 0.53 + shard.lag, 0.84, 0.9], [0, 0.95, 0.75, 0]);
  return (
    <motion.g style={{ x, y, rotate, scale, opacity }}>
      <path className="intro-shard" d={shard.d} style={{ fill: shard.fill }} />
    </motion.g>
  );
}

function Mote({ mote, progress }) {
  const out = useTransform(progress, [0.53 + mote.lag, 0.76 + mote.lag, 0.8, 0.88], [0, 1, 1, 0], {
    ease: [circOut, (t) => t, easeOut],
  });
  const cx = useTransform(out, (t) => mote.x + mote.dx * t);
  const cy = useTransform(out, (t) => mote.y + mote.dy * t);
  const opacity = useTransform(progress, [0.52, 0.55, 0.7, 0.84, 0.88], [0, 0.95, 0.6, 0.5, 0]);
  return <motion.circle className="intro-mote" cx={cx} cy={cy} r={mote.size} style={{ opacity }} />;
}

// The moment it bursts: a soft flash and a pressure ring that races outwards.
function Burst({ progress }) {
  const ring = useTransform(progress, [0.51, 0.62], [0, 1], { ease: circOut });
  const r = useTransform(ring, [0, 1], [300, 520]);
  const ringOpacity = useTransform(progress, [0.51, 0.53, 0.62], [0, 0.55, 0]);
  const strokeWidth = useTransform(ring, [0, 1], [14, 1]);
  const flash = useTransform(progress, [0.5, 0.525, 0.6], [0, 0.6, 0]);
  return (
    <>
      <motion.circle cx="500" cy="500" r="330" fill="url(#intro-flash)" style={{ opacity: flash }} />
      <motion.circle cx="500" cy="500" r={r} className="intro-ring" style={{ opacity: ringOpacity, strokeWidth }} />
    </>
  );
}

export default function Intro({ onSkip }) {
  const sectionRef = useRef(null);
  const { scrollYProgress: progress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  // Scroll positions drive the orb directly, without re-rendering React.
  const fx = useRef({ reveal: 0, decay: 0 });
  const [orbView, setOrbView] = useState('mechanisms');
  const reveal = useTransform(progress, [0.2, 0.42], [0, 1]);
  const decay = useTransform(progress, [0.5, 0.74, 0.8, 0.93], [0, 1, 1, 0]);
  useMotionValueEvent(reveal, 'change', (v) => {
    fx.current.reveal = v;
  });
  useMotionValueEvent(decay, 'change', (v) => {
    fx.current.decay = v;
    const next = v > 0.12 ? 'diseases' : 'mechanisms';
    setOrbView((prev) => (prev === next ? prev : next));
  });

  const frostOpacity = useTransform(progress, [0.24, 0.42, 0.52, 0.6, 0.86, 0.94], [0, 1, 1, 0, 0, 1]);
  const cue = useTransform(progress, [0, 0.04], [1, 0]);
  const endCue = useTransform(progress, [0.9, 0.96], [0, 1]);

  const outlines = useMemo(() => [blobPath(292, 0.4), blobPath(300, 2.1, 0.8), blobPath(284, 4.2, 1.2)], []);
  const shards = useMemo(() => makeShards(34), []);
  const debris = useMemo(() => makeDebris(110), []);

  return (
    <section className="intro" ref={sectionRef} aria-label="Introduction">
      <div className="intro-stage">
        <div className="intro-top">
          <button type="button" className="intro-skip" onClick={onSkip}>
            <span className="spark skip-spark" aria-hidden="true" />
            Skip intro
          </button>
        </div>

        <div className="intro-orb">
          <motion.div className="intro-frost" style={{ opacity: frostOpacity }} aria-hidden="true" />
          <div className="intro-canvas">
            <Peroxisome view={orbView} hot={false} still={false} fx={fx} frost={false} fallback={false} />
          </div>

          <svg className="intro-lines" viewBox="0 0 1000 1000" aria-hidden="true">
            <defs>
              <radialGradient id="intro-flash">
                <stop offset="0%" stopColor="#ffd9df" stopOpacity="0.9" />
                <stop offset="55%" stopColor="#ff6f86" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ff6f86" stopOpacity="0" />
              </radialGradient>
              <filter id="intro-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.8" />
              </filter>
            </defs>

            {/* 1. outlines draw in */}
            {outlines.map((d, i) => (
              <Drawn key={d} progress={progress} from={0.03 + i * 0.03} to={0.14 + i * 0.03} fadeTo={i === 0 ? 0.4 : 0.15}>
                {({ pathLength, opacity }) => (
                  <motion.path d={d} className="intro-stroke" data-weight={i === 0 ? 'main' : 'fine'} style={{ pathLength, opacity }} />
                )}
              </Drawn>
            ))}
            {/* 2. an atom draws in at the heart: a nucleus cluster and three
                tilted orbits, with electrons that travel as you scroll */}
            {NUCLEUS.map(([dx, dy, r], i) => (
              <Drawn key={`n${i}`} progress={progress} from={0.07 + i * 0.008} to={0.13 + i * 0.008} fadeTo={0.25}>
                {({ pathLength, opacity }) => (
                  <motion.circle
                    cx={ATOM.x + dx}
                    cy={ATOM.y + dy}
                    r={r}
                    className="intro-stroke intro-nucleus"
                    data-tone={i % 2 ? 'b' : 'a'}
                    style={{ pathLength, opacity }}
                  />
                )}
              </Drawn>
            ))}
            {ORBITS.map((o, i) => (
              <Drawn key={`o${o.tilt}`} progress={progress} from={0.1 + i * 0.025} to={0.2 + i * 0.025} fadeTo={0.12}>
                {({ pathLength, opacity }) => (
                  <g transform={`rotate(${o.tilt} ${ATOM.x} ${ATOM.y})`}>
                    <motion.ellipse
                      cx={ATOM.x}
                      cy={ATOM.y}
                      rx={o.rx}
                      ry={o.ry}
                      className="intro-stroke intro-orbit"
                      data-tone={o.tone}
                      style={{ pathLength, opacity }}
                    />
                    <Electron orbit={o} progress={progress} index={i} opacity={opacity} />
                  </g>
                )}
              </Drawn>
            ))}

            {/* 3. the burst: flash, ring, fragments and debris */}
            <Burst progress={progress} />
            {debris.map((m, i) => (
              <Mote key={i} mote={m} progress={progress} />
            ))}
            {shards.map((s, i) => (
              <Shard key={i} shard={s} progress={progress} />
            ))}
          </svg>
        </div>

        <div className="intro-text">
          {STEPS.map((s) => (
            <Step key={s.from} progress={progress} {...s} />
          ))}
        </div>

        <motion.div className="intro-cue" style={{ opacity: cue }} aria-hidden="true">
          <span>Scroll</span>
          <span className="intro-cue-line" />
        </motion.div>
        <motion.div className="intro-cue" style={{ opacity: endCue }} aria-hidden="true">
          <span>Explore</span>
          <span className="intro-cue-line" />
        </motion.div>
      </div>
    </section>
  );
}
