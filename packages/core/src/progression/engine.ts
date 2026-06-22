import type { Badge, Dex, Species, Trainer } from "../schema/index.js";
import { discoverXp, XP_REWARDS } from "./xp.js";
import { deriveRank } from "./ranks.js";
import { computeStats, regionalDexComplete } from "./stats.js";
import { updateStreak } from "./streak.js";

/** A progression-affecting event (SPEC §5). */
export type ProgressionEvent =
  | { kind: "catch"; species: Species; source: "manual" | "scan" }
  | { kind: "battle"; species: Species }
  | { kind: "seal"; species: Species };

export interface ApplyResult {
  trainer: Trainer;
  /** Total XP granted (event + any streak bonus). */
  xpAwarded: number;
  newBadges: Badge[];
  previousRank: string;
  rankedUp: boolean;
}

/** Base XP for an event, before streak bonuses. */
export function eventXp(event: ProgressionEvent): number {
  switch (event.kind) {
    case "catch":
      return event.source === "scan" ? discoverXp(event.species.rarity) : XP_REWARDS.manualCatch;
    case "battle":
      return XP_REWARDS.battleWon;
    case "seal":
      return XP_REWARDS.seal;
  }
}

/**
 * Apply an event to a trainer, given the dex *after* the corresponding
 * mutation. Awards XP, refreshes the dex-derived stats, re-derives rank/title,
 * advances the streak, grants seal badges, and appends history. Pure: returns
 * a new trainer, never mutates the input.
 */
export function applyEvent(
  trainer: Trainer,
  event: ProgressionEvent,
  dexAfter: Dex,
  now: Date = new Date(),
): ApplyResult {
  const previousRank = trainer.rank;
  const nowIso = now.toISOString();

  const { streak, advanced } = updateStreak(trainer.streak, now);
  const baseXp = eventXp(event);
  const xpAwarded = baseXp + (advanced ? XP_REWARDS.streakDay : 0);
  const xp = trainer.xp + xpAwarded;

  const stats = computeStats(dexAfter);
  const rank = deriveRank({
    xp,
    seals: stats.sealed,
    regionalDexComplete: regionalDexComplete(dexAfter),
  });

  const badges = [...trainer.badges];
  const newBadges: Badge[] = [];
  if (event.kind === "seal") {
    const id = `sealed:${event.species.id}`;
    if (!badges.some((b) => b.id === id)) {
      const badge: Badge = { id, label: `Sealed ${event.species.name}`, earnedAt: nowIso };
      badges.push(badge);
      newBadges.push(badge);
    }
  }

  const history = [...trainer.history];
  history.push({ at: nowIso, kind: event.kind, xp: baseXp, speciesId: event.species.id });
  if (advanced) history.push({ at: nowIso, kind: "streak", xp: XP_REWARDS.streakDay });

  const updated: Trainer = {
    ...trainer,
    xp,
    rank: rank.title,
    title: rank.flavor,
    streak,
    stats,
    badges,
    history,
  };

  return {
    trainer: updated,
    xpAwarded,
    newBadges,
    previousRank,
    rankedUp: rank.title !== previousRank,
  };
}
