import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { loadTrainer } from "../storage/trainer.js";
import { computeStats, regionalDexComplete } from "../progression/stats.js";
import { deriveRank, nextRank } from "../progression/ranks.js";
import type { Dex, Species, Trainer } from "../schema/index.js";
import { readHookInput } from "../util/stdin.js";

function nemesisLines(nemeses: Species[]): string[] {
  return nemeses.map(
    (s) => `- ${s.name} (${s.type}, ×${s.encounters.length}) — seal with \`/bugdex:seal ${s.id}\``,
  );
}

function xpToNext(trainer: Trainer, dex: Dex): string {
  const stats = computeStats(dex);
  const ctx = {
    xp: trainer.xp,
    seals: stats.sealed,
    regionalDexComplete: regionalDexComplete(dex),
  };
  const next = nextRank(ctx);
  return next ? `${Math.max(0, next.minXp - trainer.xp)} to ${next.title}` : "max rank";
}

/** Compact one-or-few-line trainer card for the SessionStart hook. */
export function buildSessionCardContext(trainer: Trainer, dex: Dex): string {
  const stats = computeStats(dex);
  const ctx = {
    xp: trainer.xp,
    seals: stats.sealed,
    regionalDexComplete: regionalDexComplete(dex),
  };
  const rank = deriveRank(ctx);
  const header = `🎒 BugDex — ${trainer.name}: ${rank.title} · ${trainer.xp} XP (${xpToNext(trainer, dex)}) · ${stats.caught} caught, ${stats.sealed} sealed`;
  const nemeses = dex.species.filter((s) => s.status === "nemesis");
  return nemeses.length > 0
    ? [header, `Active Nemeses (${nemeses.length}):`, ...nemesisLines(nemeses)].join("\n")
    : header;
}

export interface CardCliOptions {
  hook?: boolean;
  dir?: string;
}

/** `bugdex card` — the trainer card plus any active Nemeses. */
export async function runCard(opts: CardCliOptions): Promise<void> {
  if (opts.hook) {
    await runCardHook(opts);
    return;
  }

  const root = opts.dir ?? process.cwd();
  const paths = resolvePaths(root);
  const trainer = await loadTrainer(paths.trainer);
  const { dex } = await loadDex(paths.dex);
  const stats = computeStats(dex);
  const ctx = {
    xp: trainer.xp,
    seals: stats.sealed,
    regionalDexComplete: regionalDexComplete(dex),
  };
  const rank = deriveRank(ctx);
  const nemeses = dex.species.filter((s) => s.status === "nemesis");

  const out = process.stdout;
  out.write(`🎒 ${trainer.name} — ${rank.title}\n`);
  out.write(`   "${rank.flavor}"\n`);
  out.write(`   ${trainer.xp} XP — ${xpToNext(trainer, dex)}\n`);
  out.write(
    `   Caught ${stats.caught} · Sealed ${stats.sealed} · Streak ${trainer.streak.current}\n`,
  );
  if (nemeses.length > 0) {
    out.write(`\n   ⚠ Active Nemeses (${nemeses.length}):\n`);
    for (const line of nemesisLines(nemeses)) out.write(`   ${line}\n`);
  }
}

/**
 * SessionStart hook entry: emit a compact trainer card + active Nemeses as
 * `additionalContext`. Honours flair=off, stays quiet on an empty dex, never
 * throws, never blocks.
 */
async function runCardHook(opts: CardCliOptions): Promise<void> {
  try {
    let root = opts.dir ?? process.cwd();
    if (!opts.dir) {
      const input = await readHookInput();
      if (typeof input.cwd === "string") root = input.cwd;
    }
    const paths = resolvePaths(root);
    const config = await loadConfig(paths.config);
    if (config.flair === "off") return;

    const trainer = await loadTrainer(paths.trainer);
    const { dex } = await loadDex(paths.dex);
    if (dex.species.length === 0) return; // nothing catalogued yet — stay quiet

    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: buildSessionCardContext(trainer, dex),
        },
      })}\n`,
    );
  } catch {
    // SessionStart must never break the session; fail silent.
  }
}
