import { site } from '../content';
import logo from '../assets/pbd-logo.png';

// PBD Project's logo, fixed top left on every page and linking home.
export default function Logo({ href }) {
  return (
    <a className="site-logo" href={href} aria-label={`${site.organisation}: back to the start`}>
      <img src={logo} alt={site.organisation} />
    </a>
  );
}
