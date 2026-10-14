import { site } from '../content';
import logo from '../assets/pbd-logo-dark.png';

// PBD Project's logo on a small frosted glass badge.
export default function Logo({ href, size = 'large' }) {
  const img = <img src={logo} alt={site.organisation} />;
  return href ? (
    <a className="logo" data-size={size} href={href}>
      {img}
    </a>
  ) : (
    <span className="logo" data-size={size}>
      {img}
    </span>
  );
}
