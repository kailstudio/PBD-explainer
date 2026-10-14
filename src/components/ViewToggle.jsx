import { AnimatePresence, motion } from 'framer-motion';
import { site, VIEWS, VIEW_IDS } from '../content';
import { hubHref } from '../lib/useHashRoute';

// A glass pill switch between the two views. The tinted glass thumb slides
// to whichever view is active, carrying the brand spark with it. Each option
// is a plain link, so it works with the keyboard and the back button.
const SLIDE = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 };

export default function ViewToggle({ view }) {
  return (
    <nav className="switch" aria-label={site.startFrom}>
      <p className="toggle-lead">{site.startFrom}</p>
      <div className="switch-track">
        {VIEW_IDS.map((id) => {
          const active = id === view;
          return (
            <a
              key={id}
              href={hubHref(id)}
              className="switch-option"
              data-view={id}
              aria-current={active ? 'true' : undefined}
            >
              {active && (
                <motion.span className="switch-thumb" layoutId="switch-thumb" transition={SLIDE} aria-hidden="true">
                  <span className="switch-shine" />
                </motion.span>
              )}
              <span className="switch-icon spark" aria-hidden="true" />
              <span className="switch-label">{VIEWS[id].label}</span>
            </a>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={view}
          className="switch-hint"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {VIEWS[view].hint}
        </motion.p>
      </AnimatePresence>
    </nav>
  );
}
