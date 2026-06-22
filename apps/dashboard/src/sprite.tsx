// A deterministic identicon-style "sprite" per species: a 5×5 left-right
// mirrored grid seeded by the species id, tinted with its type colour.

function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function Sprite({
  seed,
  color,
  size = 72,
}: {
  seed: string;
  color: string;
  size?: number;
}): JSX.Element {
  const h = hash(seed);
  const grid = 5;
  const cell = size / grid;
  const rects: JSX.Element[] = [];

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < 3; x++) {
      const on = (h >>> (y * 3 + x)) & 1;
      if (!on) continue;
      for (const cx of x === 2 ? [2] : [x, grid - 1 - x]) {
        rects.push(
          <rect
            key={`${String(cx)}-${String(y)}`}
            x={cx * cell}
            y={y * cell}
            width={cell}
            height={cell}
            rx={cell * 0.18}
          />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      role="img"
      aria-label={`${seed} sprite`}
    >
      <rect x={0} y={0} width={size} height={size} rx={size * 0.12} fill="#0b1020" />
      <g fill={color}>{rects}</g>
    </svg>
  );
}
