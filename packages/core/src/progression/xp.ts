import { RARITY_XP_MULTIPLIER } from "../taxonomy/index.js";
import type { Rarity } from "../taxonomy/index.js";

/** XP rewards, every one mapped to a real engineering behaviour (SPEC §5). */
export const XP_REWARDS = {
  /** Discover a brand-new species via deep scan (multiplied by rarity). */
  discoverBase: 50,
  /** Manually catch a bug with `bugdex catch`. */
  manualCatch: 30,
  /** Win a battle: a flagged recurrence the dev then fixed. */
  battleWon: 15,
  /** Seal a Nemesis with a permanent guard — the apex move. */
  seal: 120,
  /** Bonus for extending a daily streak. */
  streakDay: 5,
} as const;

/** XP for discovering a new species of the given rarity (common ×1 … legendary ×8). */
export function discoverXp(rarity: Rarity): number {
  return XP_REWARDS.discoverBase * RARITY_XP_MULTIPLIER[rarity];
}
