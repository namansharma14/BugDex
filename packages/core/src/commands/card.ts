import { resolvePaths } from "../storage/paths.js";
import { loadDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { loadTrainer } from "../storage/trainer.js";
import { computeStats, regionalDexComplete } from "../progression/stats.js";
import { deriveRank, nextRank } from "../progression/ranks.js";
import type { Dex, Species, Trainer } from "../schema/index.js";
import { renderCard, resolveFlair, type CardData } from "../render/index.js";
import { readHookInput } from "../util/stdin.js";

function nemesisLines(nemeses: Species[]): string[] {
  return nemeses.map(
    (s) => `- ${s.name} (${s.type}, ×${s.encounters.length}) — seal with \`/bugdex:seal ${s.id}\``,
  );
}

/** Assemble the renderer's view-model from a trainer + dex. */
function buildCardData(trainer: Trainer, dex: Dex): CardData {
  const stats = computeStats(dex);
  const ctx = {
    xp: trainer.xp,
    seals: stats.sealed,
    regionalDexComplete: regionalDexComplete(dex),
  };
  const rank = deriveRank(ctx);
  const next = nextRank(ctx);

  return {
    name: trainer.name,
    rankTitle: rank.title,
    rankFlavor: rank.flavor,
    xp: trainer.xp,
    caught: stats.caught,
    sealed: stats.sealed,
    streak: trainer.streak.current,
    badges: trainer.badges.map((b) => b.label),
    next: next
      ? {
          title: next.title,
          floor: rank.minXp,
          ceil: next.minXp,
          sealsNeeded: Math.max(0, next.minSeals - stats.sealed),
          regionalNeeded: next.requiresRegionalDex && !ctx.regionalDexComplete,
        }
      : undefined,
    nemeses: dex.species
      .filter((s) => s.status === "nemesis")
      .map((s) => ({ id: s.id, name: s.name, type: s.type, encounters: s.encounters.length })),
  };
}

export interface CardCliOptions {
  hook?: boolean;
  dir?: string;
  flair?: string;
}

/** `bugdex card` — the trainer card plus any active Nemeses. */
export async function runCard(opts: CardCliOptions): Promise<void> {
  if (opts.hook) {
    await runCardHook(opts);
    return;
  }

  const root = opts.dir ?? process.cwd();
  const paths = resolvePaths(root);
  const config = await loadConfig(paths.config);
  const trainer = await loadTrainer(paths.trainer);
  const { dex } = await loadDex(paths.dex);

  const flair = resolveFlair(config.flair, opts.flair);
  process.stdout.write(`${renderCard(buildCardData(trainer, dex), flair)}\n`);
}

/** Compact, plain-text trainer card for the SessionStart hook's additionalContext. */
export function buildSessionCardContext(trainer: Trainer, dex: Dex): string {
  const data = buildCardData(trainer, dex);
  const xpLine = data.next
    ? `${data.xp} XP (${Math.max(0, data.next.ceil - data.xp)} to ${data.next.title})`
    : `${data.xp} XP (max rank)`;
  const header = `🎒 BugDex — ${data.name}: ${data.rankTitle} · ${xpLine} · ${data.caught} caught, ${data.sealed} sealed`;
  const nemeses = dex.species.filter((s) => s.status === "nemesis");
  return nemeses.length > 0
    ? [header, `Active Nemeses (${nemeses.length}):`, ...nemesisLines(nemeses)].join("\n")
    : header;
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
