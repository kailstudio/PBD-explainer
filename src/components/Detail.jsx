import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { site, VIEWS } from '../content';
import { hubHref } from '../lib/useHashRoute';
import RichText from './RichText';

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

  // Bring the panels into view when a box is picked, if they sit below the fold.
  useEffect(() => {
    if (!selectedId || !panelsRef.current) return;
    const box = panelsRef.current.getBoundingClientRect();
    if (box.top > window.innerHeight - 120) {
      panelsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedId]);

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
              <a href={hubHref(view)}>{site.hubName}</a>
            </li>
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
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    className="part"
                    data-selected={on || undefined}
                    aria-pressed={on}
                    aria-controls="detail-panels"
                    onClick={() => setSelectedId(part.id)}
                  >
                    <span className="part-label">
                      <span className="bead" aria-hidden="true" />
                      {part.label}
                    </span>
                    <span className="part-text">
                      <RichText>{part.text}</RichText>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

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
        </>
      )}
    </motion.article>
  );
}
