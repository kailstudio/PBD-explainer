import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { findItem, site } from './content';
import { hubHref, useHashRoute } from './lib/useHashRoute';
import Detail from './components/Detail';
import Drift from './components/Drift';
import Hub from './components/Hub';
import Intro from './components/Intro';
import Peroxisome, { BODY_SHARE } from './components/Peroxisome';
import Logo from './components/Logo';
import Footer from './components/Footer';
import { useMediaQuery } from './lib/hooks';

// The peroxisome is drawn once, at this size, and never unmounts. Each page
// marks where it should sit with an empty [data-anchor] box; we measure that
// box and glide the canvas onto it, so hub -> detail is one continuous move.
const CANVAS = 560;
const GLIDE = { duration: 0.95, ease: [0.65, 0, 0.2, 1] };

export default function App() {
  const { view, itemId, partId } = useHashRoute();
  const item = itemId ? findItem(view, itemId) : null;
  const page = item ? 'detail' : 'hub';
  const routeKey = `${view}/${item?.id ?? ''}`;
  const still = useReducedMotion() ?? false;
  // The floating background proteins are kept for laptops and up; on a phone
  // they crowd the screen, so they are left out entirely.
  const phone = useMediaQuery('(max-width: 767px)');

  const rootRef = useRef(null);
  const latest = useRef({ page, routeKey });
  latest.current = { page, routeKey };
  const measuredFor = useRef(null);
  const glideUntil = useRef(0);
  const [slot, setSlot] = useState(null);
  const [hot, setHot] = useState(false);

  // The intro always sits above the hub, so scrolling up from the hub plays
  // it backwards. A first visit starts at the top of it; coming back from a
  // detail page lands on the hub, with the intro still there above. It is
  // left out only for reduced motion.
  const [showIntro, setShowIntro] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const lastPage = useRef(page);
  const replaying = useRef(false);
  useLayoutEffect(() => {
    const from = lastPage.current;
    lastPage.current = page;
    if (from === 'detail' && page === 'hub' && replaying.current) {
      // Logo or title clicked on a detail page: start over from the intro.
      replaying.current = false;
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else if (from === 'detail' && page === 'hub') {
      const intro = rootRef.current?.querySelector('.intro');
      window.scrollTo({ top: intro ? intro.offsetTop + intro.offsetHeight : 0, behavior: 'auto' });
    }
  }, [page]);
  // Clicking the logo or the site title works like a homepage link: back to the top of
  // the hub with the intro ready to play again from the start.
  const [introRun, setIntroRun] = useState(0);
  const replayIntro = useCallback(
    (event) => {
      event?.preventDefault();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.location.hash = hubHref(view);
        window.scrollTo({ top: 0 });
        return;
      }
      if (window.location.hash !== hubHref(view)) {
        replaying.current = true;
        window.location.hash = hubHref(view);
      }
      setShowIntro(true);
      setIntroRun((n) => n + 1);
    },
    [view],
  );
  useEffect(() => {
    if (introRun > 0) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [introRun]);

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
    if (page === 'detail') {
      // Land at the very top of the new page so the fixed logo never sits
      // over the organelle and breadcrumb. The outgoing page is still fading
      // out, so repeat for a few frames in case layout shifts underneath.
      const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      toTop();
      let frames = 0;
      let raf = requestAnimationFrame(function again() {
        toTop();
        if (++frames < 6) raf = requestAnimationFrame(again);
      });
      setHot(false);
      return () => cancelAnimationFrame(raf);
    }
    setHot(false);
  }, [routeKey, item, page]);

  const scale = slot ? slot.size / BODY_SHARE / CANVAS : 1;

  return (
    <MotionConfig reducedMotion="user">
      <div className="app" data-view={view} data-page={page} ref={rootRef}>
        <div className="backdrop" aria-hidden="true">
          <div className="glow" />
          <div className="pattern" data-kind="fine" />
          <div className="pattern" data-kind="large" />
          <div className="grain" />
        </div>
        {/* One logo for the whole site, fixed in the same spot on every page. */}
        <Logo href={hubHref(view)} onClick={replayIntro} />
        {!phone && <Drift view={view} still={still} />}

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
            // On phones the organelle snaps into place rather than flying across
            // the screen, which pulled attention away from the text.
            default: slot?.glide && !still && !phone ? GLIDE : { duration: 0 },
            opacity: { duration: 0.9 },
          }}
        >
          <div className="peroxisome-aura" aria-hidden="true" />
          <Peroxisome view={view} hot={hot} still={still} />
          {/* Decorative on every page: the logo and breadcrumb are the ways
              back, so the organelle is not one more home link. */}
          <div
            className="peroxisome-hit"
            role="img"
            aria-label={site.hubName}
            onPointerEnter={() => setHot(true)}
            onPointerLeave={() => setHot(false)}
          />
        </motion.div>

        {showIntro && page === 'hub' && <Intro key={introRun} onSkip={skipIntro} />}

        <div className="views">
          <AnimatePresence initial={false}>
            {page === 'hub' ? (
              <Hub key="hub" view={view} onLayout={measure} onHome={replayIntro} />
            ) : (
              <Detail key={routeKey} view={view} item={item} partId={partId} onLayout={measure} />
            )}
          </AnimatePresence>
        </div>
        <Footer />
      </div>
    </MotionConfig>
  );
}
