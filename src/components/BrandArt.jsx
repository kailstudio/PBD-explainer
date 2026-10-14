// Brand graphics floating behind the page: two clusters of the PBD Project
// tiles (squares, some with one rounded corner) that gently breathe in and
// out, and a few sparks that slowly turn and twinkle. All decorative.

// [column, row, rounded corner or null, solid?]
const CLUSTER_A = [
  [0, 0, null, false],
  [1, 0, 'tl', false],
  [2, 1, 'br', false],
  [1, 2, null, false],
  [0, 3, 'tl', true],
  [2, 3, null, false],
  [1, 4, null, false],
];
const CLUSTER_B = [
  [1, 0, 'tl', false],
  [2, 1, 'br', true],
  [1, 2, null, false],
  [2, 2, 'tl', false],
  [0, 3, null, false],
];

const SPARKS = [
  { x: '6%', y: '56%', size: 18, turn: 38, delay: 0 },
  { x: '44%', y: '9%', size: 14, turn: 30, delay: -6 },
  { x: '95%', y: '44%', size: 22, turn: 46, delay: -12 },
  { x: '57%', y: '92%', size: 16, turn: 34, delay: -3 },
  { x: '31%', y: '74%', size: 12, turn: 28, delay: -9 },
  { x: '82%', y: '6%', size: 13, turn: 40, delay: -15 },
];

function Cluster({ tiles, className }) {
  return (
    <div className={`tiles ${className}`}>
      {tiles.map(([col, row, corner, solid], i) => (
        <span
          key={i}
          className="tile"
          data-corner={corner ?? undefined}
          data-solid={solid || undefined}
          style={{ '--col': col, '--row': row, '--i': i }}
        />
      ))}
    </div>
  );
}

export default function BrandArt() {
  return (
    <div className="brand-art" aria-hidden="true">
      <Cluster tiles={CLUSTER_A} className="tiles-a" />
      <Cluster tiles={CLUSTER_B} className="tiles-b" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="float-spark"
          style={{
            left: s.x,
            top: s.y,
            '--size': `${s.size}px`,
            '--turn': `${s.turn}s`,
            '--delay': `${s.delay}s`,
          }}
        >
          <span className="spark" />
        </span>
      ))}
    </div>
  );
}
