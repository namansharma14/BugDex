import type { Dex, Encounter, Species } from "../schema/index.js";
import { computeStatus } from "../progression/nemesis.js";
import type { Match } from "./matcher.js";

/** Default debounce window: re-saving the same file within 5 min is one sighting. */
export const DEFAULT_DEBOUNCE_MS = 5 * 60_000;

export interface RecordEncountersOptions {
  nemesisThreshold: number;
  now?: Date;
  via?: Encounter["via"];
  debounceMs?: number;
  commit?: string;
}

export interface RecordEncountersResult {
  dex: Dex;
  recorded: { speciesId: string; file: string; line?: number }[];
  debounced: { speciesId: string; file: string }[];
}

/**
 * Record an encounter for each match, debounced per (species, file, source) so
 * re-saving a file doesn't spam sightings. Recomputes status (e.g. → nemesis)
 * for any species that gains an encounter. Pure: returns a new dex.
 */
export function recordEncounters(
  dex: Dex,
  matches: Match[],
  opts: RecordEncountersOptions,
): RecordEncountersResult {
  const now = opts.now ?? new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const via = opts.via ?? "matcher";
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  const original = new Map(dex.species.map((s) => [s.id, s] as const));
  const updated = new Map<string, Species>();
  const recorded: RecordEncountersResult["recorded"] = [];
  const debounced: RecordEncountersResult["debounced"] = [];

  for (const match of matches) {
    const base = updated.get(match.speciesId) ?? original.get(match.speciesId);
    if (!base) continue;

    const recently = base.encounters.some((e) => {
      if (e.file !== match.file || e.via !== via) return false;
      const t = Date.parse(e.at);
      return !Number.isNaN(t) && nowMs - t < debounceMs;
    });
    if (recently) {
      debounced.push({ speciesId: match.speciesId, file: match.file });
      continue;
    }

    const encounter: Encounter = {
      at: nowIso,
      file: match.file,
      via,
      ...(match.line !== undefined ? { line: match.line } : {}),
      ...(opts.commit ? { commit: opts.commit } : {}),
    };
    const encounters = [...base.encounters, encounter];
    updated.set(match.speciesId, {
      ...base,
      encounters,
      lastSeen: nowIso,
      status: computeStatus({
        encounters: encounters.length,
        sealed: base.seal != null,
        nemesisThreshold: opts.nemesisThreshold,
      }),
    });
    recorded.push({ speciesId: match.speciesId, file: match.file, line: match.line });
  }

  if (updated.size === 0) return { dex, recorded, debounced };
  return {
    dex: { version: dex.version, species: dex.species.map((s) => updated.get(s.id) ?? s) },
    recorded,
    debounced,
  };
}
