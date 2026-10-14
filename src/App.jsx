import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { findItem, site, VIEWS } from './content';
import { hubHref, useHashRoute } from './lib/useHashRoute';
import Detail from './components/Detail';
import BrandArt from './components/BrandArt';
import Drift from './components/Drift';
import Hub from './components/Hub';
import Intro from './components/Intro';
import Peroxisome, { BODY_SHARE } from './components/Peroxisome';

// The peroxisome is drawn once, at this size, and never unmounts. Each page
// marks where it should sit with an empty [data-anchor] box; we measure that
// box and glide the canvas onto it, so hub -> detail is one continuous move.
const CANVAS = 560;
const GLIDE = { duration: 0.95, ease: [0.65, 0, 0.2, 1] };

export default function App() {
  const { view, itemId } = useHashRoute();
  const item = itemId ? findItem(view, itemId) : null;
  const page = item ? 'detail' : 'hub';
  const routeKey = `${view}/${item?.id ?? ''}`;
  const still = useReducedMotion() ?? false;

  const rootRef = useRef(null);
  const latest = useRef({ page, routeKey });
  latest.current = { page, routeKey };
  const measuredFor = useRef(null);
  const glideUntil = useRef(0);
  const [slot, setSlot] = useState(null);
  const [hot, setHot] = useState(false);

  // The intro plays above the hub on a first visit that lands on the hub.
  // It is skipped for deep links and reduced motion, and retired once the
  // visitor opens a detail page, so coming back lands straight on the hub.
  const [showIntro, setShowIntro] = useState(
    () => page === 'hub' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (page === 'detail') setShowIntro(false);
  }, [page]);
  const skipIntro = useCallback(() => {
    const intro = rootRef.current?.querySelector('.intro');
    if (!intro) return;
    window.scrollTo({ top: intro.offsetTop + intro.offsetHeight, behavior: still ? 'auto' : 'smooth' });
  }, [still]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const anchors = root.querySelectorAll(`[data-anchor="${latest.current.page}"]`);
    const anchor = anchors[anchors.length - 1];
    if (!anchor) return;
    const box = anchor.getBoundingClientRect();
    const origin = root.getBoundingClientRect();
    if (box.width === 0) return;

    // Glide when the page changed; snap for resizes and first paint. Layout can
    // settle a beat after a page change, so keep gliding for the whole move.
    const pageKey = latest.current.page;
    const now = performance.now();
    if (measuredFor.current !== null && measuredFor.current !== pageKey) glideUntil.current = now + 1000;
    measuredFor.current = pageKey;
    const glide = now < glideUntil.current;

    const next = {
      x: box.left - origin.left + box.width / 2,
      y: box.top - origin.top + box.height / 2,
      size: box.width,
      glide,
    };
    setSlot((prev) =>
      prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && Math.abs(prev.size - next.size) < 0.5
        ? prev
        : next,
    );
  }, []);

  useEffect(() => {
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    observer.observe(rootRef.current);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [measure]);

  useEffect(() => {
    document.title = item
      ? `${item.label} | ${site.title}`
      : `${site.title} | ${site.organisation}`;
    if (page === 'detail') window.scrollTo({ top: 0 });
    setHot(false);
  }, [routeKey, item, page]);

  const scale = slot ? slot.size / BODY_SHARE / CANVAS : 1;

  // On a detail page, a click on empty space (anywhere outside the cards,
  // header and links) goes back to the hub. Ignored while selecting text.
  const onBackgroundClick = (event) => {
    if (page !== 'detail' || event.button !== 0) return;
    if (event.target.closest('.card, .detail-head, .detail-title, a, button')) return;
    if (window.getSelection()?.toString()) return;
    window.location.hash = hubHref(view);
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- mouse shortcut only; the orb and breadcrumbs are the keyboard route back */}
      <div className="app" data-view={view} data-page={page} ref={rootRef} onClick={onBackgroundClick}>
        <div className="backdrop" aria-hidden="true">
          <div className="wash" data-for="mechanisms" />
          <div className="wash" data-for="diseases" />
          <div className="pattern" data-kind="fine" />
          <div className="pattern" data-kind="large" />
          <div className="grain" />
        </div>
        <BrandArt />
        <Drift view={view} still={still} />

        <motion.div
          className="peroxisome"
          data-hot={hot || undefined}
          style={{ width: CANVAS, height: CANVAS }}
          initial={false}
          animate={
            slot
              ? { x: slot.x - CANVAS / 2, y: slot.y - CANVAS / 2, scale, opacity: 1 }
              : { opacity: 0 }
          }
          transition={{
            default: slot?.glide && !still ? GLIDE : { duration: 0 },
            opacity: { duration: 0.9 },
          }}
        >
          <div className="peroxisome-aura" aria-hidden="true" />
          <Peroxisome view={view} hot={hot} still={still} />
          {page === 'detail' ? (
            <a
              className="peroxisome-hit"
              href={hubHref(view)}
              aria-label={`Back to ${VIEWS[view].label}`}
              onPointerEnter={() => setHot(true)}
              onPointerLeave={() => setHot(false)}
            />
          ) : (
            <div
              className="peroxisome-hit"
              role="img"
              aria-label={site.hubName}
              onPointerEnter={() => setHot(true)}
              onPointerLeave={() => setHot(false)}
            />
          )}
        </motion.div>

        {showIntro && <Intro onSkip={skipIntro} />}

        <div className="views">
          <AnimatePresence initial={false}>
            {page === 'hub' ? (
              <Hub key="hub" view={view} onLayout={measure} />
            ) : (
              <Detail key={routeKey} view={view} item={item} onLayout={measure} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
