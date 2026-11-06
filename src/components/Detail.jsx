import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { site, VIEWS } from '../content';
import { hubHref } from '../lib/useHashRoute';
import RichText from './RichText';
import { useMediaQuery } from '../lib/hooks';
import { Chevron } from './Hub';

const EASE = [0.22, 1, 0.36, 1];

// Reads top to bottom: title, what it is, then one box per sub-type. Picking
// a box opens the two detail panels below it, each headed by its topic.
function Panel({ side, heading, part, index }) {
  const entries = part[side] ?? [];
  const reading = side === 'left' ? (part.furtherReading ?? []) : [];
  const empty = entries.length === 0 && reading.length === 0;

  return (
    <motion.section
      className="panel card"
      data-side={side}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: index * 0.08, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <h2 className="panel-heading">
        <span className="spark heading-spark" aria-hidden="true" />
        {heading}
      </h2>
      {empty ? (
        <p className="panel-empty">{site.emptyPanel}</p>
      ) : (
        <>
          <ul className="panel-list">
            {entries.map((entry) => (
              <li key={entry}>
                <RichText>{entry}</RichText>
              </li>
            ))}
          </ul>
          {reading.length > 0 && (
            <>
              <h3 className="panel-subheading">{site.furtherReading}</h3>
              <ul className="panel-list">
                {reading.map((entry) => (
                  <li key={entry}>
                    <RichText>{entry}</RichText>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </motion.section>
  );
}

export default function Detail({ view, item, partId, onLayout }) {
  const config = VIEWS[view];
  const parts = item.parts ?? [];
  const [selectedId, setSelectedId] = useState(partId);
  // A link straight to one box (e.g. from another page) picks it.
  useEffect(() => {
    if (partId) setSelectedId(partId);
  }, [partId]);
  const selected = parts.find((part) => part.id === selectedId) ?? null;
  const present = useIsPresent();
  const panelsRef = useRef(null);

  useLayoutEffect(() => {
    onLayout();
  }, [onLayout]);

  // Phones and narrow screens: each card opens its detail right under itself
  // (and closes again on a second tap) instead of in panels below all cards.
  const inPlace = useMediaQuery('(max-width: 899px)');
  const pick = (id) => setSelectedId((current) => (inPlace && current === id ? null : id));

  // Picking a box scrolls what it opened up to the top of the screen, parked
  // just under the fixed logo so the logo never covers it.
  const firstPick = useRef(true);
  useEffect(() => {
    if (!selectedId) return;
    // A page opened straight onto a box (a deep link) still starts at the top.
    if (firstPick.current && partId) {
      firstPick.current = false;
      return;
    }
    firstPick.current = false;
    // Wait for the new content to mount (and, in place, for the card that
    // was open to fold away), so the target has settled before scrolling.
    const timer = window.setTimeout(
      () => {
        const target = inPlace ? document.getElementById(`part-${selectedId}`) : panelsRef.current;
        if (!target) return;
        // Clear the logo as it looks once scrolled (shrunk onto its pill).
        const clearance = inPlace ? 72 : 84;
        const top = target.getBoundingClientRect().top + window.scrollY - clearance;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      },
      inPlace ? 360 : 220,
    );
    return () => window.clearTimeout(timer);
  }, [selectedId, partId, inPlace]);

  return (
    <motion.article
      className="detail"
      data-leaving={!present || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6, delay: 0.4 } }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <header className="detail-head">
        <div className="peroxisome-slot" data-anchor="detail" />
        <nav aria-label="Breadcrumb">
          <ol className="crumbs">
            <li>
              <a href={hubHref(view)}>{config.label}</a>
            </li>
            <li aria-current="page">{item.label}</li>
          </ol>
        </nav>
      </header>

      <h1 className="detail-title">
        {item.label}
      </h1>
      <p className="detail-lede">
        <RichText>{item.description ?? item.summary}</RichText>
      </p>

      {parts.length === 0 ? (
        <p className="panel-empty">{site.emptyPage}</p>
      ) : (
        <>
          <p className="parts-lead">
            <span className="spark label-spark" aria-hidden="true" />
            {site.choosePart}
          </p>
          <ul className="parts" style={{ '--count': parts.length }}>
            {parts.map((part) => {
              const on = part.id === selectedId;
              const cta = on
                ? inPlace
                  ? site.cardClose
                  : site.cardOpen
                : `${site.cardCta} ${site.cardKeywords?.[part.id] ?? part.label}`;
              return (
                <li key={part.id} id={`part-${part.id}`} data-open={(inPlace && on) || undefined}>
                  <button
                    type="button"
                    className="part"
                    data-selected={on || undefined}
                    aria-pressed={inPlace ? undefined : on}
                    aria-expanded={inPlace ? on : undefined}
                    aria-controls={inPlace ? `part-panels-${part.id}` : 'detail-panels'}
                    onClick={() => pick(part.id)}
                  >
                    <span className="part-label">
                      <span className="bead" aria-hidden="true" />
                      {part.label}
                    </span>
                    <span className="part-text">
                      <RichText>{part.text}</RichText>
                    </span>
                    <span className="part-cta">
                      {cta}
                      <Chevron down={on} />
                    </span>
                  </button>
                  {inPlace && (
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div
                          key="open"
                          id={`part-panels-${part.id}`}
                          className="part-panels"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1, transition: { duration: 0.35, ease: EASE } }}
                          exit={{ height: 0, opacity: 0, transition: { duration: 0.25, ease: EASE } }}
                        >
                          <div className="panels-grid">
                            <Panel side="left" heading={config.leftPanel} part={part} index={0} />
                            <Panel side="right" heading={config.rightPanel} part={part} index={1} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </li>
              );
            })}
          </ul>

          {!inPlace && (
          <div className="panels" id="detail-panels" ref={panelsRef} aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <motion.div key={selected.id} className="panels-row">
                  <p className="panels-for">
                    <span className="spark label-spark" aria-hidden="true" />
                    {selected.panelTitle ?? selected.label}
                  </p>
                  <div className="panels-grid">
                    <Panel side="left" heading={config.leftPanel} part={selected} index={0} />
                    <Panel side="right" heading={config.rightPanel} part={selected} index={1} />
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="hint"
                  className="panels-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.12 } }}
                >
                  {site.pickHint}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          )}
        </>
      )}
    </motion.article>
  );
}
