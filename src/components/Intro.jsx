import { useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import Logo from './Logo';
import Peroxisome from './Peroxisome';

// The scroll-driven intro that sits above the hub on a first visit.
// Scrolling scrubs it forwards and back, like a timeline:
//   1. the orb's outline draws itself in, line by line
//   2. the membrane and core condense inside the lines (healthy, blue)
//   3. it starts to fail: the core darkens and turns red, the membrane
//      cracks and sheds shards and debris
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
    text: 'When it fails, the damage spreads: rare genetic disorders, and links to ageing, cancer and neurodegeneration.',
  },
  { from: 0.8, to: 1, text: 'Understanding the peroxisome is how we start to fix it.' },
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

// Irregular shards, placed around the membrane, each with a flight path out.
function makeShards(count) {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rnd() * 0.3;
    const r = 260 + rnd() * 40;
    const size = 26 + rnd() * 42;
    const corners = 5 + Math.floor(rnd() * 3);
    const pts = Array.from({ length: corners }, (_, k) => {
      const a = (k / corners) * Math.PI * 2 + rnd() * 0.6;
      const d = size * (0.55 + rnd() * 0.5);
      return `${(Math.cos(a) * d * 1.3).toFixed(1)},${(Math.sin(a) * d * 0.7).toFixed(1)}`;
    });
    const fly = 120 + rnd() * 260;
    return {
      x: 500 + Math.cos(angle) * r,
      y: 500 + Math.sin(angle) * r,
      dx: Math.cos(angle) * fly,
      dy: Math.sin(angle) * fly,
      spin: (rnd() - 0.5) * 140,
      tilt: (angle * 180) / Math.PI + 90,
      points: pts.join(' '),
      lag: rnd() * 0.06,
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
    const r = 180 + rnd() * 140;
    const fly = 80 + rnd() * 340;
    return {
      x: 500 + Math.cos(angle) * r,
      y: 500 + Math.sin(angle) * r,
      dx: Math.cos(angle) * fly,
      dy: Math.sin(angle) * fly,
      size: 1.5 + rnd() * 4,
      lag: rnd() * 0.03,
    };
  });
}

function Step({ progress, from, to, text }) {
  // Fade in just before `from`, out just before `to`; the last line stays.
  const last = to >= 1;
  const input = [Math.max(0, from - 0.04), Math.max(from, 0.001), last ? 0.999 : to - 0.03, last ? 1 : to];
  const opacity = useTransform(progress, input, [0, 1, 1, last ? 1 : 0]);
  const y = useTransform(progress, input, [24, 0, 0, last ? 0 : -24]);
  return (
    <motion.p className="intro-line" style={{ opacity, y }}>
      {text}
    </motion.p>
  );
}

function Drawn({ progress, from, to, children, fadeTo = 0.35 }) {
  const pathLength = useTransform(progress, [from, to], [0, 1]);
  // Lines stay strong while drawing, then settle back once the orb fills in.
  const opacity = useTransform(progress, [from, from + 0.01, 0.3, 0.38], [0, 1, 1, fadeTo]);
  return children({ pathLength, opacity });
}

function Shard({ shard, progress }) {
  const out = useTransform(progress, [0.52 + shard.lag, 0.72 + shard.lag, 0.8, 0.9], [0, 1, 1, 0]);
  const x = useTransform(out, (t) => shard.x + shard.dx * t);
  const y = useTransform(out, (t) => shard.y + shard.dy * t);
  const rotate = useTransform(out, (t) => shard.tilt + shard.spin * t);
  const opacity = useTransform(progress, [0.5 + shard.lag, 0.54 + shard.lag, 0.86, 0.9], [0, 1, 1, 0]);
  return (
    <motion.g style={{ x, y, rotate, opacity }}>
      <polygon className="intro-shard" points={shard.points} />
      <polygon className="intro-shard-dots" points={shard.points} />
    </motion.g>
  );
}

function Mote({ mote, progress }) {
  const out = useTransform(progress, [0.55 + mote.lag, 0.76 + mote.lag, 0.8, 0.88], [0, 1, 1, 0]);
  const cx = useTransform(out, (t) => mote.x + mote.dx * t);
  const cy = useTransform(out, (t) => mote.y + mote.dy * t);
  const opacity = useTransform(progress, [0.54, 0.58, 0.84, 0.88], [0, 0.8, 0.8, 0]);
  return <motion.circle className="intro-mote" cx={cx} cy={cy} r={mote.size} style={{ opacity }} />;
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

  const frostOpacity = useTransform(progress, [0.24, 0.42, 0.55, 0.72, 0.84, 0.94], [0, 1, 1, 0.2, 0.2, 1]);
  const cue = useTransform(progress, [0, 0.04], [1, 0]);
  const dotsRadius = useTransform(progress, [0.14, 0.24], [0, 180]);
  const dotsOpacity = useTransform(progress, [0.14, 0.16, 0.34, 0.42], [0, 1, 1, 0]);
  const endCue = useTransform(progress, [0.9, 0.96], [0, 1]);

  const outlines = useMemo(() => [blobPath(292, 0.4), blobPath(300, 2.1, 0.8), blobPath(284, 4.2, 1.2)], []);
  const shards = useMemo(() => makeShards(18), []);
  const debris = useMemo(() => makeDebris(70), []);
  const latitudes = [-120, -60, 0, 60, 120];
  const longitudes = [40, 95, 140];

  return (
    <section className="intro" ref={sectionRef} aria-label="Introduction">
      <div className="intro-stage">
        <div className="intro-top">
          <Logo />
          <button type="button" className="intro-skip" onClick={onSkip}>
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
              <pattern id="intro-dot" width="18" height="18" patternUnits="userSpaceOnUse">
                <circle cx="9" cy="9" r="2.2" />
              </pattern>
              <pattern id="shard-dot" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="6" cy="6" r="1.3" />
              </pattern>
              <mask id="intro-dots-mask">
                <motion.circle cx="515" cy="535" r={dotsRadius} fill="#fff" />
              </mask>
            </defs>

            {/* 1. outlines draw in */}
            {outlines.map((d, i) => (
              <Drawn key={d} progress={progress} from={0.03 + i * 0.03} to={0.14 + i * 0.03} fadeTo={i === 0 ? 0.4 : 0.15}>
                {({ pathLength, opacity }) => (
                  <motion.path d={d} className="intro-stroke" data-weight={i === 0 ? 'main' : 'fine'} style={{ pathLength, opacity }} />
                )}
              </Drawn>
            ))}
            <Drawn progress={progress} from={0.08} to={0.18} fadeTo={0.2}>
              {({ pathLength, opacity }) => (
                <motion.circle cx="515" cy="535" r="176" className="intro-stroke" data-weight="main" style={{ pathLength, opacity }} />
              )}
            </Drawn>
            {latitudes.map((dy, i) => (
              <Drawn key={`lat${dy}`} progress={progress} from={0.1 + i * 0.012} to={0.2 + i * 0.012} fadeTo={0}>
                {({ pathLength, opacity }) => (
                  <motion.ellipse
                    cx="515"
                    cy={535 + dy}
                    rx={Math.sqrt(176 * 176 - dy * dy)}
                    ry={Math.sqrt(176 * 176 - dy * dy) * 0.18}
                    className="intro-stroke"
                    data-weight="fine"
                    style={{ pathLength, opacity }}
                  />
                )}
              </Drawn>
            ))}
            {longitudes.map((rx, i) => (
              <Drawn key={`lon${rx}`} progress={progress} from={0.12 + i * 0.015} to={0.22 + i * 0.015} fadeTo={0}>
                {({ pathLength, opacity }) => (
                  <motion.ellipse cx="515" cy="535" rx={rx} ry="176" className="intro-stroke" data-weight="fine" style={{ pathLength, opacity }} />
                )}
              </Drawn>
            ))}

            {/* the dot lattice ripples out from the middle */}
            <motion.rect
              x="330"
              y="350"
              width="370"
              height="370"
              fill="url(#intro-dot)"
              className="intro-dots"
              mask="url(#intro-dots-mask)"
              style={{ opacity: dotsOpacity }}
            />

            {/* 3. shards and debris */}
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
