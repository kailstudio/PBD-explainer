import { site } from '../content';

// The foot of every page: a frosted glass panel, like the cards, holding the
// site credit and the big PBD Project wordmark. The wordmark takes the colour
// of the current view (blue for Functions, red for Diseases & Conditions), is
// cropped by the panel's bottom edge, and links out to PBD Project's main site.
export default function Footer() {
  const { footer } = site;

  return (
    <footer className="site-footer">
      <div className="footer-panel card">
        <p className="footer-credit">
          {footer.madeBy}{' '}
          <a href={footer.studioUrl} target="_blank" rel="noopener noreferrer">
            {footer.studio}
          </a>
        </p>
        <a
          className="footer-wordmark"
          href={footer.orgUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={footer.wordmarkLabel}
        >
          {footer.wordmark}
        </a>
      </div>
    </footer>
  );
}
