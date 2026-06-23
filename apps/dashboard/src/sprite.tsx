// A deterministic pixel "mon" per species. The id hash picks one of six body
// archetypes (blob, biped, serpent, wide, winged, bug) so silhouettes differ
// like real creatures, then layers a topper (ears / horns / antenna / crest),
// an eye style, and an optional belly. Everything is symmetric, outlined,
// shaded, and tinted by the species' type colour.

const GRID = 13;
const C = 6; // centre column/row index
const INK = "#0b1020";

type Grid = boolean[][];

function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
// Unsigned slices of the hash (signed >> would break for high-bit hashes).
const bit = (h: number, i: number): number => (h >>> i) & 1;
const pick = (h: number, shift: number, n: number): number => (h >>> shift) % n;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex: string, target: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = hexToRgb(target);
  const c = (a: number, t: number): string =>
    Math.round(a + (t - a) * amt)
      .toString(16)
      .padStart(2, "0");
  return `#${c(r, tr)}${c(g, tg)}${c(b, tb)}`;
}

function blank(): Grid {
  return Array.from({ length: GRID }, () => Array<boolean>(GRID).fill(false));
}
function disc(g: Grid, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.02) g[y][x] = true;
    }
  }
}
function setSym(g: Grid, x: number, y: number): void {
  if (y < 0 || y >= GRID) return;
  if (x >= 0 && x < GRID) g[y][x] = true;
  const m = GRID - 1 - x;
  if (m >= 0 && m < GRID) g[y][m] = true;
}

interface Body {
  faceY: number;
  spread: number;
}

// `bit(h, 16)` is an independent "variant" axis so two mons of the same
// archetype still differ in silhouette, not just face.
function blob(g: Grid, h: number): Body {
  const r = 4.4 + bit(h, 2) * 0.6;
  if (bit(h, 16))
    disc(g, C, 7.4, r - 0.7, r + 0.3); // egg
  else disc(g, C, 7, r, r - 0.4); // round
  setSym(g, C - 2, 12); // feet
  return { faceY: 6, spread: 2 };
}
function biped(g: Grid, h: number): Body {
  disc(g, C, 3.4, 2.5, 2.5);
  disc(g, C, 8, 3.2, 3.4);
  for (const y of [10, 11, 12]) setSym(g, C - 2, y); // legs
  if (bit(h, 16)) for (const y of [7, 8]) setSym(g, C - 4, y); // arms
  return { faceY: 3, spread: 1 };
}
function serpent(g: Grid, h: number): Body {
  for (let y = 2; y <= 12; y++) {
    const rx = Math.max(1, 2.2 - (y > 8 ? (y - 8) * 0.45 : 0));
    disc(g, C, y, rx, 1.1);
  }
  disc(g, C, 2.4, 2.3 + bit(h, 2) * 0.4, 2.2); // head bulge
  if (bit(h, 16)) for (const y of [4, 6, 8, 10]) setSym(g, C - 3, y); // segments stick out
  return { faceY: 3, spread: 1 };
}
function wide(g: Grid, h: number): Body {
  disc(g, C, 7.2, 5, bit(h, 16) ? 3.5 : 2.7); // flat vs tall shell
  disc(g, C, 4.4, 1.9, 1.9); // head
  for (const dx of [-4, -1.5, 1.5, 4]) setSym(g, C + dx, 11); // four feet
  return { faceY: 4, spread: 1 };
}
function winged(g: Grid, h: number): Body {
  disc(g, C, 7, 2.6, 3.8);
  const span = 5 + bit(h, 2);
  for (let y = 4; y <= 8; y++) {
    const reach = span - Math.abs(y - 6);
    for (let x = C - reach; x <= C; x++) if (Math.abs(x - C) > 2) setSym(g, x, y);
  }
  if (bit(h, 16)) for (const y of [11, 12]) setSym(g, C - 1, y); // tail/legs
  return { faceY: 5, spread: 1 };
}
function bug(g: Grid, h: number): Body {
  disc(g, C, 3, 2, 1.8); // head
  disc(g, C, 6.5, 2.6, 2); // thorax
  const pointed = bit(h, 16) === 1;
  disc(g, C, 9.7, pointed ? 1.6 : 2.3, 2.2); // round vs pointed abdomen
  if (pointed) g[12][C] = true; // stinger
  for (const y of [5, 7, 9]) setSym(g, C - 3, y); // legs
  return { faceY: 3, spread: 1 };
}

const ARCHETYPES = [blob, biped, serpent, wide, winged, bug];

function topRow(g: Grid): number {
  for (let y = 0; y < GRID; y++) if (g[y].includes(true)) return y;
  return 0;
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
  const g = blank();
  const body = ARCHETYPES[h % ARCHETYPES.length](g, h);

  // Topper, drawn into the silhouette so it shares the outline.
  const top = topRow(g);
  const topper = pick(h, 5, 5); // 0 none · 1 ears · 2 horns · 3 antenna · 4 crest
  let antennaTip: { x: number; y: number } | null = null;
  if (topper === 1) {
    setSym(g, C - 2, top - 1);
    setSym(g, C - 2, top);
  } else if (topper === 2) {
    setSym(g, C - 1, top - 1);
    setSym(g, C - 1, top - 2);
  } else if (topper === 3) {
    g[Math.max(0, top - 1)][C] = true;
    g[Math.max(0, top - 2)][C] = true;
    antennaTip = { x: C, y: top - 3 };
  } else if (topper === 4) {
    g[Math.max(0, top - 1)][C] = true;
    g[Math.max(0, top - 2)][C] = true;
    setSym(g, C - 2, top - 1); // a little crest
  }

  const edge = mix(color, INK, 0.62);
  const shade = mix(color, INK, 0.3);
  const highlight = mix(color, "#ffffff", 0.42);
  const bellyColor = mix(color, "#ffffff", 0.24);

  // Optional belly: a lighter patch low-centre.
  const hasBelly = bit(h, 13) === 1;
  const belly = blank();
  if (hasBelly) disc(belly, C, body.faceY + 3, 1.9, 2.4);

  const isOn = (x: number, y: number): boolean =>
    x >= 0 && x < GRID && y >= 0 && y < GRID && g[y][x];

  const rects: JSX.Element[] = [];
  const px = (v: number): number => v * cell;

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!g[y][x]) continue;
      const boundary = !isOn(x - 1, y) || !isOn(x + 1, y) || !isOn(x, y - 1) || !isOn(x, y + 1);
      let fill = color;
      if (boundary) fill = edge;
      else if (y <= body.faceY - 1 && Math.abs(x - C) <= 1) fill = highlight;
      else if (hasBelly && belly[y][x]) fill = bellyColor;
      else if (y >= body.faceY + 4) fill = shade;
      rects.push(
        <rect
          key={`c${String(x)}-${String(y)}`}
          x={px(x)}
          y={px(y)}
          width={cell}
          height={cell}
          fill={fill}
        />,
      );
    }
  }

  if (antennaTip) {
    rects.push(
      <circle
        key="tip"
        cx={px(antennaTip.x + 0.5)}
        cy={px(antennaTip.y + 0.5)}
        r={cell * 0.55}
        fill={highlight}
      />,
    );
  }

  // Eyes — style varies per species.
  const style = pick(h, 8, 4); // 0 big · 1 beady · 2 angry · 3 sleepy
  for (const ex of [C - body.spread, C + body.spread]) {
    const ox = px(ex);
    const oy = px(body.faceY);
    if (style === 1) {
      rects.push(
        <rect
          key={`eye${String(ex)}`}
          x={ox + cell * 0.25}
          y={oy + cell * 0.25}
          width={cell * 0.5}
          height={cell * 0.5}
          fill={INK}
        />,
      );
      continue;
    }
    if (style === 3) {
      rects.push(
        <rect
          key={`eye${String(ex)}`}
          x={ox - cell * 0.05}
          y={oy + cell * 0.45}
          width={cell * 1.1}
          height={cell * 0.22}
          rx={cell * 0.1}
          fill={INK}
        />,
      );
      continue;
    }
    rects.push(
      <rect
        key={`sclera${String(ex)}`}
        x={ox - cell * 0.1}
        y={oy}
        width={cell * 1.2}
        height={cell * 1.15}
        rx={cell * 0.25}
        fill="#f5f7ff"
      />,
    );
    rects.push(
      <rect
        key={`pupil${String(ex)}`}
        x={ox + cell * 0.28}
        y={oy + cell * 0.32}
        width={cell * 0.5}
        height={cell * 0.6}
        rx={cell * 0.12}
        fill="#0a0a12"
      />,
    );
    rects.push(
      <rect
        key={`glint${String(ex)}`}
        x={ox + cell * 0.32}
        y={oy + cell * 0.36}
        width={cell * 0.18}
        height={cell * 0.18}
        fill="#ffffff"
      />,
    );
    if (style === 2) {
      rects.push(
        <rect
          key={`brow${String(ex)}`}
          x={ox - cell * 0.1}
          y={oy - cell * 0.15}
          width={cell * 1.2}
          height={cell * 0.35}
          fill={edge}
        />,
      );
    }
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
