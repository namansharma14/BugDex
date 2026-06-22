/** A rung on the trainer rank ladder (SPEC §5). */
export interface Rank {
  level: number;
  /** Rank name, stored in `trainer.rank`. */
  title: string;
  /** Flavour line, stored in `trainer.title`. */
  flavor: string;
  minXp: number;
  /** Seals required — gates the upper ranks so grinding XP alone can't max you out. */
  minSeals: number;
  /** Whether ≥1 caught species in every type is required ("regional dex complete"). */
  requiresRegionalDex: boolean;
}

export const RANKS: readonly Rank[] = [
  {
    level: 1,
    title: "Rookie Trainer",
    flavor: "Fresh out of the lab",
    minXp: 0,
    minSeals: 0,
    requiresRegionalDex: false,
  },
  {
    level: 2,
    title: "Bug Catcher",
    flavor: "Net at the ready",
    minXp: 200,
    minSeals: 0,
    requiresRegionalDex: false,
  },
  {
    level: 3,
    title: "Ace Trainer",
    flavor: "Reads stack traces for fun",
    minXp: 600,
    minSeals: 0,
    requiresRegionalDex: false,
  },
  {
    level: 4,
    title: "Gym Leader",
    flavor: "Seals bugs for sport",
    minXp: 1200,
    minSeals: 1,
    requiresRegionalDex: false,
  },
  {
    level: 5,
    title: "Elite Four",
    flavor: "Few bugs survive the encounter",
    minXp: 2400,
    minSeals: 5,
    requiresRegionalDex: false,
  },
  {
    level: 6,
    title: "Champion",
    flavor: "The codebase's apex predator",
    minXp: 4000,
    minSeals: 10,
    requiresRegionalDex: true,
  },
];

export interface RankContext {
  xp: number;
  seals: number;
  regionalDexComplete: boolean;
}

/** Does the trainer satisfy every requirement of `rank`? */
export function meetsRank(rank: Rank, ctx: RankContext): boolean {
  return (
    ctx.xp >= rank.minXp &&
    ctx.seals >= rank.minSeals &&
    (!rank.requiresRegionalDex || ctx.regionalDexComplete)
  );
}

/** The highest rank whose requirements are fully met. */
export function deriveRank(ctx: RankContext): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (meetsRank(rank, ctx)) current = rank;
  }
  return current;
}

/** The next rank the trainer is working toward, or undefined if maxed out. */
export function nextRank(ctx: RankContext): Rank | undefined {
  const current = deriveRank(ctx);
  return RANKS.find((rank) => rank.level === current.level + 1);
}
