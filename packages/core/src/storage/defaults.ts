import { BUG_TYPES } from "../taxonomy/index.js";
import type { BugType } from "../taxonomy/index.js";
import { CONFIG_VERSION } from "../schema/config.js";
import type { Config } from "../schema/config.js";
import { DEX_VERSION } from "../schema/species.js";
import type { Dex } from "../schema/species.js";
import { TRAINER_VERSION } from "../schema/trainer.js";
import type { Trainer } from "../schema/trainer.js";

/** Languages the fast matcher ships rules for in v1 (SPEC §11). */
export const DEFAULT_LANGUAGES = ["typescript", "javascript", "python"];
/** Encounters before a species becomes a Nemesis (SPEC §5). */
export const DEFAULT_NEMESIS_THRESHOLD = 3;

/** The rank/title every trainer starts at (see progression engine, M2). */
export const ROOKIE_RANK = "Rookie Trainer";
export const ROOKIE_TITLE = "Fresh out of the lab";

/** A fresh, empty dex. */
export function emptyDex(): Dex {
  return { version: DEX_VERSION, species: [] };
}

/** Default project config, optionally overridden (e.g. `{ team: true }`). */
export function defaultConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: CONFIG_VERSION,
    flair: "high",
    enabledTypes: [...BUG_TYPES],
    minConfidence: "high",
    languages: [...DEFAULT_LANGUAGES],
    nemesisThreshold: DEFAULT_NEMESIS_THRESHOLD,
    team: false,
    ...overrides,
  };
}

function zeroByType(): Record<BugType, number> {
  const out = {} as Record<BugType, number>;
  for (const type of BUG_TYPES) out[type] = 0;
  return out;
}

/** Sentinel "never active" timestamp so the first activity starts a streak. */
const NEVER_ACTIVE = new Date(0).toISOString();

/** A fresh trainer at rank 1 with zeroed stats. */
export function defaultTrainer(name: string): Trainer {
  return {
    version: TRAINER_VERSION,
    name,
    xp: 0,
    rank: ROOKIE_RANK,
    title: ROOKIE_TITLE,
    streak: { current: 0, longest: 0, lastActive: NEVER_ACTIVE },
    stats: { caught: 0, encounters: 0, sealed: 0, byType: zeroByType() },
    badges: [],
    history: [],
  };
}
