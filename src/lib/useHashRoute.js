import { useEffect, useState } from 'react';
import { VIEWS } from '../content';

// Routes:  #/mechanisms   #/diseases   #/mechanisms/<id>   #/diseases/<id>
// Hash routing needs no server config, so the build works on any static host.
function parse(hash) {
  const [first, second] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const view = VIEWS[first] ? first : 'mechanisms';
  return { view, itemId: second ?? null };
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export const hubHref = (view) => `#/${view}`;
export const itemHref = (view, itemId) => `#/${view}/${itemId}`;
