export interface Streak {
  current: number;
  longest: number;
  lastActive: string;
}

const MS_PER_DAY = 86_400_000;

function dayIndex(ms: number): number {
  return Math.floor(ms / MS_PER_DAY);
}

export interface StreakUpdate {
  streak: Streak;
  /** True if this counted as a new active day (eligible for a streak bonus). */
  advanced: boolean;
}

/**
 * Advance a streak for activity at `now` (SPEC §5): same UTC day is a no-op;
 * the next day extends the streak; a gap resets it to 1.
 */
export function updateStreak(streak: Streak, now: Date): StreakUpdate {
  const today = dayIndex(now.getTime());
  const lastMs = Date.parse(streak.lastActive);
  const nowIso = now.toISOString();

  // Never active before (or unparseable) → start the streak.
  if (Number.isNaN(lastMs)) {
    return {
      streak: { current: 1, longest: Math.max(1, streak.longest), lastActive: nowIso },
      advanced: true,
    };
  }

  const last = dayIndex(lastMs);
  if (today <= last) {
    // Same day (or clock skew) — keep the count, just touch the timestamp.
    return { streak: { ...streak, lastActive: nowIso }, advanced: false };
  }
  if (today === last + 1) {
    const current = streak.current + 1;
    return {
      streak: { current, longest: Math.max(current, streak.longest), lastActive: nowIso },
      advanced: true,
    };
  }
  // Missed a day → reset.
  return {
    streak: { current: 1, longest: Math.max(1, streak.longest), lastActive: nowIso },
    advanced: true,
  };
}
