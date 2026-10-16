import { useEffect, useState } from 'react';
import { VIEWS } from '../content';

// Routes:  #/mechanisms   #/diseases   #/mechanisms/<id>   #/diseases/<id>
//          #/<view>/<id>/<part>  opens a page with one of its boxes already picked
// Hash routing needs no server config, so the build works on any static host.
function parse(hash) {
  const [first, second, third] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const view = VIEWS[first] ? first : 'mechanisms';
  return { view, itemId: second ?? null, partId: third ?? null };
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
