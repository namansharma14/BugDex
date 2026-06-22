import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { loadTrainer } from "../storage/trainer.js";
import { computeStats, regionalDexComplete } from "../progression/stats.js";
import { deriveRank, nextRank } from "../progression/ranks.js";
import { BUG_TYPES, RARITIES, STATUSES, TAXONOMY } from "../taxonomy/index.js";
import type { BugType } from "../taxonomy/index.js";
import type { Config, Species } from "../schema/index.js";

export interface DashboardTrainer {
  name: string;
  rank: string;
  title: string;
  xp: number;
  caught: number;
  sealed: number;
  encounters: number;
  streak: { current: number; longest: number };
  badges: { id: string; label: string; earnedAt: string }[];
  next?: {
    title: string;
    floor: number;
    ceil: number;
    sealsNeeded: number;
    regionalNeeded: boolean;
  };
}

export interface DashboardRegional {
  covered: number;
  total: number;
  complete: boolean;
  byType: { type: BugType; count: number }[];
}

export interface DashboardState {
  trainer: DashboardTrainer;
  regional: DashboardRegional;
  species: Species[];
  taxonomy: typeof TAXONOMY;
  bugTypes: typeof BUG_TYPES;
  rarities: typeof RARITIES;
  statuses: typeof STATUSES;
  config: Pick<Config, "flair" | "minConfidence" | "nemesisThreshold" | "team" | "enabledTypes">;
}

/** Assemble everything the dashboard UI needs in a single payload. */
export async function buildDashboardState(root: string): Promise<DashboardState> {
  const paths = resolvePaths(root);
  const { dex } = await loadDex(paths.dex);
  const config = await loadConfig(paths.config);
  const trainer = await loadTrainer(paths.trainer);

  const stats = computeStats(dex);
  const complete = regionalDexComplete(dex);
  const ctx = { xp: trainer.xp, seals: stats.sealed, regionalDexComplete: complete };
  const rank = deriveRank(ctx);
  const next = nextRank(ctx);

  const byType = BUG_TYPES.map((type) => ({
    type,
    count: dex.species.filter((s) => s.type === type).length,
  }));

  return {
    trainer: {
      name: trainer.name,
      rank: rank.title,
      title: rank.flavor,
      xp: trainer.xp,
      caught: stats.caught,
      sealed: stats.sealed,
      encounters: stats.encounters,
      streak: { current: trainer.streak.current, longest: trainer.streak.longest },
      badges: trainer.badges,
      next: next
        ? {
            title: next.title,
            floor: rank.minXp,
            ceil: next.minXp,
            sealsNeeded: Math.max(0, next.minSeals - stats.sealed),
            regionalNeeded: next.requiresRegionalDex && !complete,
          }
        : undefined,
    },
    regional: {
      covered: byType.filter((t) => t.count > 0).length,
      total: BUG_TYPES.length,
      complete,
      byType,
    },
    species: [...dex.species].sort((a, b) => a.dexNumber - b.dexNumber),
    taxonomy: TAXONOMY,
    bugTypes: BUG_TYPES,
    rarities: RARITIES,
    statuses: STATUSES,
    config: {
      flair: config.flair,
      minConfidence: config.minConfidence,
      nemesisThreshold: config.nemesisThreshold,
      team: config.team,
      enabledTypes: config.enabledTypes,
    },
  };
}
