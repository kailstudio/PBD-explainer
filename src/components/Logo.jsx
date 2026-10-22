import { site } from '../content';
import logo from '../assets/pbd-logo.png';

// PBD Project's logo, fixed top left on every page, linking to the PBD Project
// website (in a new tab, so the explainer stays open).
export const SITE_URL = 'https://www.pbdproject.org/';

export default function Logo() {
  return (
    <a className="site-logo" href={SITE_URL} target="_blank" rel="noopener noreferrer" aria-label={`${site.organisation} website (opens in a new tab)`}>
      <img src={logo} alt={site.organisation} />
    </a>
  );
}
