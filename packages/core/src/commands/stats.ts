import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { loadTrainer } from "../storage/trainer.js";
import { computeStats, regionalDexComplete } from "../progression/stats.js";
import { deriveRank, nextRank } from "../progression/ranks.js";

export interface StatsCliOptions {
  dir?: string;
}

/** `bugdex stats` — show the trainer card (rank, XP, stats, streak, badges). */
export async function runStats(opts: StatsCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();
  const paths = resolvePaths(root);
  const trainer = await loadTrainer(paths.trainer);
  const { dex } = await loadDex(paths.dex);

  // Recompute from the dex so the card is accurate even if passive matcher
  // encounters have updated the dex since the last XP event.
  const stats = computeStats(dex);
  const ctx = {
    xp: trainer.xp,
    seals: stats.sealed,
    regionalDexComplete: regionalDexComplete(dex),
  };
  const rank = deriveRank(ctx);
  const next = nextRank(ctx);

  const out = process.stdout;
  out.write(`${trainer.name} — ${rank.title}\n`);
  out.write(`  "${rank.flavor}"\n`);
  if (next) {
    const xpGap = Math.max(0, next.minXp - trainer.xp);
    const sealGap = Math.max(0, next.minSeals - stats.sealed);
    const parts = [`${xpGap} XP`];
    if (sealGap > 0) parts.push(`${sealGap} seal${sealGap === 1 ? "" : "s"}`);
    if (next.requiresRegionalDex && !ctx.regionalDexComplete) parts.push("regional dex");
    out.write(`  XP ${trainer.xp} — next: ${next.title} (need ${parts.join(", ")})\n`);
  } else {
    out.write(`  XP ${trainer.xp} — max rank reached\n`);
  }
  out.write(`  Caught ${stats.caught} · Encounters ${stats.encounters} · Sealed ${stats.sealed}\n`);
  out.write(`  Streak ${trainer.streak.current} (longest ${trainer.streak.longest})\n`);
  if (trainer.badges.length > 0) {
    out.write(`  Badges: ${trainer.badges.map((b) => b.label).join(", ")}\n`);
  }
}
