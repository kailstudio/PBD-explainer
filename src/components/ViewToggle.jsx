import { site, VIEWS, VIEW_IDS } from '../content';
import { hubHref } from '../lib/useHashRoute';

export default function ViewToggle({ view }) {
  return (
    <nav className="toggle" aria-label={site.startFrom}>
      <p className="toggle-lead">{site.startFrom}</p>
      <ul>
        {VIEW_IDS.map((id) => (
          <li key={id}>
            <a
              href={hubHref(id)}
              className="toggle-option"
              data-view={id}
              aria-current={id === view ? 'true' : undefined}
            >
              <span className="bead" aria-hidden="true" />
              <span className="toggle-text">
                <span className="toggle-label">{VIEWS[id].label}</span>
                <span className="toggle-hint">{VIEWS[id].hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
