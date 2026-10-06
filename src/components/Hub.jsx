import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { site, VIEWS } from '../content';
import { itemHref } from '../lib/useHashRoute';
import { useElementSize, useMediaQuery } from '../lib/hooks';
import ViewToggle from './ViewToggle';

// Proportions of the ring, as shares of its overall size S.
const BODY = 0.36; // diameter of the peroxisome itself
const BEADS = 0.33; // distance from centre to each spoke's bead
const FILAMENT_FROM = 0.222; // where a filament leaves the glow
const BEAD_GAP = 11; // px kept clear between filament tip and bead

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Spokes run clockwise starting just right of the top. With an odd count one
// spoke lands at the very bottom; nothing ever sits dead centre at the top,
// so every label has room to open its description downwards.
function placeSpokes(items, radius) {
  const step = (Math.PI * 2) / items.length;
  return items.map((item, i) => {
    const angle = step / 2 + i * step;
    const ux = Math.sin(angle);
    const uy = -Math.cos(angle);
    const side = Math.abs(ux) < 0.2 ? 'below' : ux > 0 ? 'right' : 'left';
    return { item, ux, uy, x: ux * radius, y: uy * radius, side };
  });
}

const EASE = [0.22, 1, 0.36, 1];

const spokeMotion = {
  hidden: ({ ux, uy }) => ({ opacity: 0, x: -ux * 46, y: -uy * 46 }),
  shown: ({ i }) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.6, delay: 0.1 + i * 0.045, ease: EASE },
  }),
  gone: ({ ux, uy }) => ({
    opacity: 0,
    x: -ux * 46,
    y: -uy * 46,
    transition: { duration: 0.28, ease: 'easeIn' },
  }),
};

const filamentMotion = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: ({ i }) => ({
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.55, delay: 0.05 + i * 0.045, ease: EASE },
  }),
  gone: { pathLength: 0, opacity: 0, transition: { duration: 0.26, ease: 'easeIn' } },
};

function Ring({ view, width, height, onLayout }) {
  const [active, setActive] = useState(null);
  const items = VIEWS[view].items;

  const labelWidth = clamp(width * 0.2, 176, 240);
  const size = clamp(
    Math.min((width - 2 * labelWidth - 56) / (2 * BEADS), (height - 264) / (2 * BEADS)),
    300,
    940,
  );
  const cx = width / 2;
  const cy = height / 2;
  const spokes = placeSpokes(items, size * BEADS);
  const body = size * BODY;

  useLayoutEffect(() => {
    onLayout();
  }, [onLayout, size, cx, cy]);

  return (
    <div className="ring" style={{ '--label-width': `${labelWidth}px` }}>
      <div
        className="peroxisome-slot"
        data-anchor="hub"
        style={{ left: cx - body / 2, top: cy - body / 2, width: body, height: body }}
      />

      <AnimatePresence mode="wait" initial>
        <motion.div key={view} className="ring-layer" initial="hidden" animate="shown" exit="gone">
          <svg className="filaments" width={width} height={height} aria-hidden="true">
            {spokes.map(({ item, ux, uy }, i) => {
              const from = size * FILAMENT_FROM;
              const to = size * BEADS - BEAD_GAP;
              const line = {
                x1: cx + ux * from,
                y1: cy + uy * from,
                x2: cx + ux * to,
                y2: cy + uy * to,
              };
              const lit = active === item.id;
              return (
                <g key={item.id}>
                  <motion.line {...line} className="filament" custom={{ i }} variants={filamentMotion} />
                  <motion.line
                    {...line}
                    className="filament-glow"
                    initial={false}
                    animate={{ pathLength: lit ? 1 : 0, opacity: lit ? 1 : 0 }}
                    transition={{ duration: lit ? 0.38 : 0.25, ease: 'easeOut' }}
                  />
                  <motion.line
                    {...line}
                    className="filament-lit"
                    initial={false}
                    animate={{ pathLength: lit ? 1 : 0, opacity: lit ? 1 : 0 }}
                    transition={{ duration: lit ? 0.38 : 0.25, ease: 'easeOut' }}
                  />
                </g>
              );
            })}
          </svg>

          <ul className="spokes">
            {spokes.map(({ item, x, y, ux, uy, side }, i) => (
              <motion.li
                key={item.id}
                className="spoke"
                data-side={side}
                data-state={active === null ? 'rest' : active === item.id ? 'lit' : 'dim'}
                style={{ left: cx + x, top: cy + y }}
                custom={{ i, ux, uy }}
                variants={spokeMotion}
              >
                <a
                  href={itemHref(view, item.id)}
                  onPointerEnter={() => setActive(item.id)}
                  onPointerLeave={() => setActive((id) => (id === item.id ? null : id))}
                  onFocus={() => setActive(item.id)}
                  onBlur={() => setActive((id) => (id === item.id ? null : id))}
                >
                  <span className="bead" aria-hidden="true" />
                  <span className="spoke-text">
                    <span className="spoke-label">{item.hubLabel ?? item.label}</span>
                    <span className="spoke-summary">{item.summary}</span>
                  </span>
                </a>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Narrow and touch screens: the same items as a plain list under the organelle.
function Stack({ view, onLayout }) {
  const items = VIEWS[view].items;

  useLayoutEffect(() => {
    onLayout();
  }, [onLayout, view]);

  return (
    <div className="stack">
      <div className="peroxisome-slot" data-anchor="hub" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={view}
          className="stack-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.4 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          {items.map((item) => (
            <li key={item.id}>
              <a href={itemHref(view, item.id)}>
                <span className="bead" aria-hidden="true" />
                <span className="spoke-text">
                  <span className="spoke-label">{item.label}</span>
                  <span className="spoke-summary">{item.summary}</span>
                </span>
              </a>
            </li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </div>
  );
}

export default function Hub({ view, onLayout }) {
  const stageRef = useRef(null);
  const { width, height } = useElementSize(stageRef);
  const roomy = useMediaQuery('(min-width: 900px) and (min-height: 560px) and (hover: hover)');
  const present = useIsPresent();

  return (
    <motion.main
      className="hub"
      data-layout={roomy ? 'ring' : 'stack'}
      data-leaving={!present || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.25 } }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <header className="hub-intro">
        <div>
          <p className="org">{site.organisation}</p>
          <h1 className="hub-title">{site.title}</h1>
          <p className="hub-lede">{site.intro}</p>
        </div>
        <ViewToggle view={view} />
      </header>

      <div className="hub-stage" ref={stageRef}>
        {roomy ? (
          width > 0 && <Ring view={view} width={width} height={height} onLayout={onLayout} />
        ) : (
          <Stack view={view} onLayout={onLayout} />
        )}
      </div>
    </motion.main>
  );
}
