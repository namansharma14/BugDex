import { join } from "node:path";
import { resolvePaths } from "../storage/paths.js";
import { loadDex, saveDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { loadTrainer, saveTrainer } from "../storage/trainer.js";
import { pathExists } from "../storage/io.js";
import { computeStatus } from "../progression/nemesis.js";
import { computeStats, regionalDexComplete } from "../progression/stats.js";
import { deriveRank } from "../progression/ranks.js";
import type { Status } from "../taxonomy/index.js";

/**
 * Extract a filesystem path from a seal reference, or null if it isn't one
 * (e.g. a bare lint-rule id like "eslint:no-eval"). Strips `::suite`, `#anchor`,
 * and `:line` suffixes.
 */
export function refToPath(reference: string): string | null {
  const base = reference.split("::")[0].split("#")[0].replace(/:\d+$/, "").trim();
  if (base.length === 0) return null;
  return /[/\\]/.test(base) || /\.[A-Za-z0-9]+$/.test(base) ? base : null;
}

export interface VerifySealsResult {
  checked: number;
  intact: { id: string; reference: string }[];
  unverifiable: { id: string; reference: string }[];
  broken: { id: string; name: string; reference: string; revertedTo: Status }[];
}

/**
 * Re-check every sealed species' guard. If a guard file has vanished, drop the
 * seal and revert the species toward nemesis (SPEC §5) — then recompute the
 * trainer's dex-derived stats and rank (no XP is clawed back, but a lost seal
 * can lower a seal-gated rank, keeping the game honest).
 */
export async function verifySeals(opts: { root: string }): Promise<VerifySealsResult> {
  const paths = resolvePaths(opts.root);
  const { dex } = await loadDex(paths.dex);
  const config = await loadConfig(paths.config);

  const intact: VerifySealsResult["intact"] = [];
  const unverifiable: VerifySealsResult["unverifiable"] = [];
  const broken: VerifySealsResult["broken"] = [];
  const species = [...dex.species];
  let changed = false;

  for (let i = 0; i < species.length; i++) {
    const s = species[i];
    if (s.status !== "sealed" || !s.seal) continue;

    const reference = s.seal.reference;
    const relPath = refToPath(reference);
    if (relPath === null) {
      unverifiable.push({ id: s.id, reference });
      continue;
    }
    if (await pathExists(join(opts.root, relPath))) {
      intact.push({ id: s.id, reference });
      continue;
    }

    const revertedTo = computeStatus({
      encounters: s.encounters.length,
      sealed: false,
      nemesisThreshold: config.nemesisThreshold,
    });
    species[i] = { ...s, seal: undefined, status: revertedTo };
    broken.push({ id: s.id, name: s.name, reference, revertedTo });
    changed = true;
  }

  if (changed) {
    const newDex = { version: dex.version, species };
    await saveDex(paths.dex, newDex);

    const trainer = await loadTrainer(paths.trainer);
    const stats = computeStats(newDex);
    const rank = deriveRank({
      xp: trainer.xp,
      seals: stats.sealed,
      regionalDexComplete: regionalDexComplete(newDex),
    });
    await saveTrainer(paths.trainer, { ...trainer, stats, rank: rank.title, title: rank.flavor });
  }

  return {
    checked: intact.length + unverifiable.length + broken.length,
    intact,
    unverifiable,
    broken,
  };
}

export interface VerifySealsCliOptions {
  dir?: string;
}

/** `bugdex verify-seals` — confirm sealed guards still exist. */
export async function runVerifySeals(opts: VerifySealsCliOptions): Promise<void> {
  const result = await verifySeals({ root: opts.dir ?? process.cwd() });
  const out = process.stdout;

  if (result.checked === 0) {
    out.write("No sealed species to verify.\n");
    return;
  }
  out.write(
    `Verified ${String(result.checked)} seal(s): ${String(result.intact.length)} intact, ` +
      `${String(result.broken.length)} broken, ${String(result.unverifiable.length)} unverifiable.\n`,
  );
  for (const b of result.broken) {
    out.write(
      `  ⚠ ${b.name}: guard "${b.reference}" is gone → reverted to ${b.revertedTo}. Re-seal it.\n`,
    );
  }
  for (const u of result.unverifiable) {
    out.write(`  ? ${u.id}: "${u.reference}" can't be auto-verified.\n`);
  }
}
