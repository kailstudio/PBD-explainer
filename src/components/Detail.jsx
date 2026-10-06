import { useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { site, VIEWS } from '../content';
import { hubHref } from '../lib/useHashRoute';
import RichText from './RichText';

const EASE = [0.22, 1, 0.36, 1];

function Panel({ side, heading, part }) {
  const entries = part?.[side] ?? [];
  const reading = side === 'left' ? (part?.furtherReading ?? []) : [];
  const empty = entries.length === 0 && reading.length === 0;

  return (
    <aside className="panel" data-side={side} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={part?.id ?? 'none'}
          initial={{ opacity: 0, x: side === 'left' ? 14 : -14 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
        >
          {part && <p className="panel-topic">{part.panelTitle ?? part.label}</p>}
          <h2 className="panel-heading">{heading}</h2>

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
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

export default function Detail({ view, item, onLayout }) {
  const config = VIEWS[view];
  const parts = item.parts ?? [];
  const [selectedId, setSelectedId] = useState(parts[0]?.id ?? null);
  const selected = parts.find((part) => part.id === selectedId) ?? null;
  const present = useIsPresent();

  useLayoutEffect(() => {
    onLayout();
  }, [onLayout]);

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

      <h1 className="detail-title">{item.label}</h1>

      <div className="detail-grid" data-empty={parts.length === 0 || undefined}>
        {parts.length > 0 && <Panel side="left" heading={config.leftPanel} part={selected} />}

        <section className="detail-core">
          <p className="detail-lede">
            <RichText>{item.description ?? item.summary}</RichText>
          </p>

          {parts.length === 0 ? (
            <p className="panel-empty">{site.emptyPage}</p>
          ) : (
            <ul className="parts">
              {parts.map((part) => (
                <li
                  key={part.id}
                  className="part"
                  data-selected={part.id === selectedId || undefined}
                  onClick={() => setSelectedId(part.id)}
                >
                  <button
                    type="button"
                    className="part-pick"
                    aria-pressed={part.id === selectedId}
                  >
                    <span className="bead" aria-hidden="true" />
                    <span className="part-label">{part.label}</span>
                  </button>
                  <p className="part-text">
                    <RichText>{part.text}</RichText>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {parts.length > 0 && <Panel side="right" heading={config.rightPanel} part={selected} />}
      </div>
    </motion.article>
  );
}
