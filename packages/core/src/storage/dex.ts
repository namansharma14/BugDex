import { dexSchema, speciesSchema, DEX_VERSION } from "../schema/species.js";
import type { Dex, Species, Signature } from "../schema/index.js";
import type { Status } from "../taxonomy/index.js";
import { STATUSES } from "../taxonomy/index.js";
import { DexParseError } from "./errors.js";
import { pathExists, readJsonFile, writeJsonFile } from "./io.js";
import { emptyDex } from "./defaults.js";

/** A dex entry that failed validation and was set aside instead of loaded. */
export interface QuarantinedEntry {
  /** Index of the entry within the original `species` array. */
  index: number;
  /** Human-readable validation problems (`path: message`). */
  issues: string[];
  /** The raw rejected value, preserved for inspection/repair. */
  raw: unknown;
}

export interface LoadDexResult {
  dex: Dex;
  quarantined: QuarantinedEntry[];
}

/**
 * Load and validate a dex file.
 *
 * - Missing file → an empty dex (not an error).
 * - Unparseable JSON → {@link DexParseError} (the whole file is unusable).
 * - A malformed *species* → quarantined, never crashes the load (SPEC §3).
 */
export async function loadDex(path: string): Promise<LoadDexResult> {
  if (!(await pathExists(path))) {
    return { dex: emptyDex(), quarantined: [] };
  }

  let parsed: unknown;
  try {
    parsed = await readJsonFile(path);
  } catch (err) {
    throw new DexParseError(path, err);
  }

  const root = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<
    string,
    unknown
  >;
  const rawSpecies = Array.isArray(root.species) ? root.species : [];

  const species: Species[] = [];
  const quarantined: QuarantinedEntry[] = [];
  rawSpecies.forEach((entry, index) => {
    const result = speciesSchema.safeParse(entry);
    if (result.success) {
      species.push(result.data);
    } else {
      quarantined.push({
        index,
        issues: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
        raw: entry,
      });
    }
  });

  return { dex: { version: DEX_VERSION, species }, quarantined };
}

/** Validate and persist a dex (only well-formed data ever hits disk). */
export async function saveDex(path: string, dex: Dex): Promise<void> {
  const validated = dexSchema.parse(dex);
  await writeJsonFile(path, validated);
}

const STATUS_RANK: Record<Status, number> = Object.fromEntries(
  STATUSES.map((s, i) => [s, i]),
) as Record<Status, number>;

function isoTime(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function earliest(a: string, b: string): string {
  return isoTime(a) <= isoTime(b) ? a : b;
}

function latest(a: string, b: string): string {
  return isoTime(a) >= isoTime(b) ? a : b;
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function mergeSpecies(a: Species, b: Species): Species {
  // The more recently-touched entry wins for scalar metadata.
  const newer = isoTime(b.lastSeen) >= isoTime(a.lastSeen) ? b : a;
  const sealed = a.status === "sealed" ? a : b.status === "sealed" ? b : undefined;

  return {
    ...newer,
    dexNumber: Math.min(a.dexNumber, b.dexNumber),
    signatures: dedupeBy<Signature>([...a.signatures, ...b.signatures], (s) => JSON.stringify(s)),
    tags: [...new Set([...a.tags, ...b.tags])],
    encounters: dedupeBy(
      [...a.encounters, ...b.encounters],
      (e) => `${e.at}|${e.file}|${e.line ?? ""}|${e.via}`,
    ).sort((x, y) => isoTime(x.at) - isoTime(y.at)),
    firstSeen: earliest(a.firstSeen, b.firstSeen),
    lastSeen: latest(a.lastSeen, b.lastSeen),
    status: STATUS_RANK[a.status] >= STATUS_RANK[b.status] ? a.status : b.status,
    seal: sealed?.seal ?? newer.seal,
  };
}

/**
 * Merge two dexes by species `id` (e.g. pulling a teammate's catches).
 * Encounters are unioned and de-duplicated; the most-progressed status and
 * any seal are preserved; `dexNumber` collapses to the lowest assigned.
 */
export function mergeDex(base: Dex, incoming: Dex): Dex {
  const byId = new Map<string, Species>();
  for (const s of base.species) byId.set(s.id, s);
  for (const s of incoming.species) {
    const existing = byId.get(s.id);
    byId.set(s.id, existing ? mergeSpecies(existing, s) : s);
  }
  const species = [...byId.values()].sort((a, b) => a.dexNumber - b.dexNumber);
  return { version: DEX_VERSION, species };
}
