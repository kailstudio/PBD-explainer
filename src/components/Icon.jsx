import { useEffect, useState } from 'react';
import { ICON_ART } from './iconArt';

// One icon from the set in the icons folder (converted by
// scripts/build-icons.py). The drawing stays still at rest; with `on` set,
// the parts its designer prepared move (sand runs, the virus turns, the tick
// draws in). The motion itself is in styles.css under "Icons".
export default function Icon({ id, on = false, className = '' }) {
  const art = ICON_ART[id];
  if (!art) return null;
  return (
    <svg
      className={`icon ${className}`}
      viewBox={art.viewBox}
      data-icon={id}
      data-on={on || undefined}
      data-stand-in={art.standIn || undefined}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: art.markup }}
    />
  );
}

// Plays an icon once, for `ms`, when it first appears (and again whenever
// `key` changes), so a page's icons show their motion without a hover.
export function usePlayOnce(ms = 2600, key = null) {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms, key]);
  return playing;
}
