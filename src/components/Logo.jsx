import { useEffect, useState } from 'react';
import { site } from '../content';
import logo from '../assets/pbd-logo.png';

// PBD Project's logo, fixed top left on every page. In testing everyone who
// wanted to go back clicked it, so it takes you to the start of the explainer
// (same tab), replaying the intro from the top. Once the page scrolls it shrinks onto a small frosted pill, so
// text passing underneath never collides with it.
export default function Logo({ href, onClick }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Measured against the page itself (hub or detail), not the window, since
    // the intro can sit above the hub and leave the window already scrolled.
    const onScroll = () => {
      const page = document.querySelector('.hub, .detail');
      setScrolled(page ? page.getBoundingClientRect().top < -24 : window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
    const settle = window.setInterval(onScroll, 500);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onScroll);
      window.clearInterval(settle);
    };
  }, []);

  return (
    <a
      className="site-logo"
      data-scrolled={scrolled || undefined}
      href={href}
      onClick={onClick}
      aria-label={`${site.organisation}: back to the start of the explainer`}
    >
      <img src={logo} alt={site.organisation} />
    </a>
  );
}
