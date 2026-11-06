import { site, VIEWS, VIEW_IDS } from '../content';
import { hubHref } from '../lib/useHashRoute';
import logo from '../assets/pbd-logo.png';

// The foot of every page: a frosted glass panel, like the cards, with a way
// into each view, a clear link out to PBD Project's main site, the credits,
// and a big cropped wordmark that fades into the glass.
export default function Footer() {
  const { footer } = site;
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-panel card">
        <div className="footer-top">
          <div className="footer-brand">
            <a href={footer.orgUrl} target="_blank" rel="noopener noreferrer" className="footer-logo">
              <img src={logo} alt={site.organisation} />
            </a>
            <p className="footer-tagline">{footer.tagline}</p>
          </div>

          <nav className="footer-col" aria-label={footer.explore}>
            <p className="footer-heading">{footer.explore}</p>
            <ul>
              {VIEW_IDS.map((id) => (
                <li key={id}>
                  <a href={hubHref(id)} data-view={id}>
                    <span className="spark footer-spark" aria-hidden="true" />
                    {VIEWS[id].label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="footer-col">
            <p className="footer-heading">{footer.about}</p>
            <a className="footer-cta" href={footer.orgUrl} target="_blank" rel="noopener noreferrer">
              {footer.cta}
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5 11 11 5M6 5h5v5" />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {year}{' '}
            <a href={footer.orgUrl} target="_blank" rel="noopener noreferrer">
              {site.organisation}
            </a>
          </p>
          <p>
            {footer.madeBy}{' '}
            <a href={footer.studioUrl} target="_blank" rel="noopener noreferrer">
              {footer.studio}
            </a>
          </p>
        </div>

        <p className="footer-wordmark" aria-hidden="true">
          {footer.wordmark}
        </p>
      </div>
    </footer>
  );
}
