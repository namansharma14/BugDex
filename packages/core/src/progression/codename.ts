/**
 * Deterministic, memorable codename + id generation for species.
 *
 * Same seed always yields the same name, so it's reproducible and testable.
 */

/** FNV-1a, returned as an unsigned 32-bit int. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const ONSETS = [
  "v",
  "z",
  "gr",
  "k",
  "th",
  "n",
  "str",
  "ph",
  "x",
  "dr",
  "sk",
  "vor",
  "mal",
  "kr",
  "sn",
  "gl",
  "br",
  "rh",
  "sy",
  "tz",
];
const NUCLEI = ["a", "o", "i", "oo", "ae", "u", "e", "y"];
const CODAS = ["x", "th", "k", "n", "rg", "ss", "ng", "l", "sh", "ct"];
const SUFFIXES = ["ling", "oid", "ix", "or", "us", "ath", "mon", "ra", "ux", "eth"];

/** Generate an uppercase Pokémon-ish codename from a seed string. */
export function generateCodename(seed: string): string {
  const h = hash(seed);
  const pick = <T>(arr: readonly T[], shift: number): T => arr[(h >>> shift) % arr.length];
  return `${pick(ONSETS, 0)}${pick(NUCLEI, 5)}${pick(CODAS, 11)}${pick(SUFFIXES, 17)}`.toUpperCase();
}

/** Turn arbitrary text into a stable, url-safe slug for use as a species id. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? slug : "species";
}

/** Return `base`, or `base-2`, `base-3`, … so the result avoids `taken`. */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
