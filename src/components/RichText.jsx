// Tiny inline formatter for the copy in /content, so editors never touch JSX.
//   **bold**            -> <strong>
//   [label](https://…)  -> external link (opens in a new tab)
//   [label](#/…)        -> link to another page of the explainer
const TOKEN = /(\*\*.+?\*\*|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

function render(text, keyPrefix = '') {
  return text.split(TOKEN).map((chunk, i) => {
    const key = `${keyPrefix}${i}`;
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return <strong key={key}>{render(chunk.slice(2, -2), `${key}-`)}</strong>;
    }
    const link = chunk.match(LINK);
    if (link) {
      const [, label, href] = link;
      const internal = href.startsWith('#');
      return (
        <a
          key={key}
          href={href}
          className={internal ? 'link link-internal' : 'link'}
          {...(internal ? {} : { target: '_blank', rel: 'noreferrer' })}
        >
          {label}
        </a>
      );
    }
    return chunk;
  });
}

export default function RichText({ children }) {
  return <>{render(children ?? '')}</>;
}
