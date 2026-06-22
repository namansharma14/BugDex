// A deterministic, Pokémon-ish pixel "mon" per species: a symmetric head + body
// silhouette with eyes, an outline, shading, and per-species variation (torso
// width, ears, antenna) — all seeded by the species id and tinted by its type
// colour.

const GRID = 11;
const CENTER = 5;
// Half-width (cells from the centre column) per row → a head + tapering body.
const ROW_WIDTH = [0, 1, 2, 2, 3, 4, 4, 3, 2, 2, 1];
const EYE_ROW = 3;
const INK = "#0b1020";

function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const bit = (h: number, i: number): number => (h >>> i) & 1;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend `hex` toward `target` by `amt` (0–1). */
function mix(hex: string, target: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = hexToRgb(target);
  const c = (a: number, t: number): string =>
    Math.round(a + (t - a) * amt)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r, tr)}${c(g, tg)}${c(b, tb)}`;
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
  const cell = size / GRID;

  // 1. Build the symmetric silhouette.
  const on: boolean[][] = [];
  for (let y = 0; y < GRID; y++) {
    let w = ROW_WIDTH[y];
    if (y >= 3 && y <= 7 && bit(h, y) === 1) w = Math.min(CENTER, w + 1); // chunkier torso
    on[y] = [];
    for (let x = 0; x < GRID; x++) on[y][x] = Math.abs(x - CENTER) <= w;
  }
  if (bit(h, 9) === 1) on[1][CENTER - 2] = on[1][CENTER + 2] = true; // ears
  if (bit(h, 10) === 1) on[0][CENTER] = true; // antenna / horn
  for (let y = GRID - 3; y < GRID; y++) on[y][CENTER] = false; // split the legs

  const isOn = (x: number, y: number): boolean =>
    x >= 0 && x < GRID && y >= 0 && y < GRID && on[y][x];

  // 2. Palette derived from the type colour.
  const edge = mix(color, INK, 0.62);
  const shade = mix(color, INK, 0.3);
  const highlight = mix(color, "#ffffff", 0.4);

  // 3. Body cells: outline on the boundary, shading low, a highlight up top.
  const rects: JSX.Element[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!on[y][x]) continue;
      const boundary = !isOn(x - 1, y) || !isOn(x + 1, y) || !isOn(x, y - 1) || !isOn(x, y + 1);
      let fill = color;
      if (boundary) fill = edge;
      else if (y >= 7) fill = shade;
      else if (y <= 2 && Math.abs(x - CENTER) <= 1) fill = highlight;
      rects.push(
        <rect
          key={`b${String(x)}-${String(y)}`}
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          fill={fill}
        />,
      );
    }
  }

  // 4. Eyes: two symmetric whites with pupils (and a glint), on the head.
  const eyeOff = ROW_WIDTH[EYE_ROW] >= 3 ? 2 : 1;
  for (const ex of [CENTER - eyeOff, CENTER + eyeOff]) {
    const x = ex * cell;
    const y = EYE_ROW * cell;
    rects.push(
      <rect key={`eye${String(ex)}`} x={x} y={y} width={cell} height={cell} fill="#f5f7ff" />,
    );
    rects.push(
      <rect
        key={`pupil${String(ex)}`}
        x={x + cell * 0.28}
        y={y + cell * 0.3}
        width={cell * 0.44}
        height={cell * 0.5}
        fill="#0a0a12"
      />,
    );
    rects.push(
      <rect
        key={`glint${String(ex)}`}
        x={x + cell * 0.3}
        y={y + cell * 0.34}
        width={cell * 0.16}
        height={cell * 0.16}
        fill="#ffffff"
      />,
    );
  }

  // 5. Optional mouth — a small dark notch under the eyes.
  if (bit(h, 12) === 1) {
    rects.push(
      <rect
        key="mouth"
        x={(CENTER - 0.5) * cell}
        y={(EYE_ROW + 1.6) * cell}
        width={cell}
        height={cell * 0.3}
        fill={edge}
      />,
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${String(size)} ${String(size)}`}
      role="img"
      aria-label={`${seed} sprite`}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={size} height={size} rx={size * 0.12} fill={INK} />
      {rects}
    </svg>
  );
}
