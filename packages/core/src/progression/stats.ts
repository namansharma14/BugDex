import { BUG_TYPES } from "../taxonomy/index.js";
import type { BugType } from "../taxonomy/index.js";
import type { Dex, Trainer } from "../schema/index.js";

/**
 * Trainer stats are a projection of the dex (the source of truth), recomputed
 * rather than incremented so they can never drift out of sync.
 */
export function computeStats(dex: Dex): Trainer["stats"] {
  const byType = {} as Record<BugType, number>;
  for (const type of BUG_TYPES) byType[type] = 0;

  let encounters = 0;
  let sealed = 0;
  for (const species of dex.species) {
    byType[species.type] += 1;
    encounters += species.encounters.length;
    if (species.status === "sealed") sealed += 1;
  }

  return { caught: dex.species.length, encounters, sealed, byType };
}

/** True when the dex holds ≥1 species of every bug type (SPEC §5). */
export function regionalDexComplete(dex: Dex): boolean {
  const present = new Set(dex.species.map((s) => s.type));
  return BUG_TYPES.every((type) => present.has(type));
}
