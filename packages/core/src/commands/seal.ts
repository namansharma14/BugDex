import { resolvePaths } from "../storage/paths.js";
import { loadDex, saveDex } from "../storage/dex.js";
import { loadTrainer, saveTrainer } from "../storage/trainer.js";
import type { Badge, Dex, Seal, Species } from "../schema/index.js";
import { applyEvent } from "../progression/engine.js";
import { getGitUserName } from "../util/git.js";

const SEAL_KINDS = ["test", "lint-rule", "type", "assertion"] as const;
type SealKind = (typeof SEAL_KINDS)[number];

export interface SealInput {
  root: string;
  id: string;
  kind: SealKind;
  reference: string;
  now?: Date;
  trainerName?: string;
}

export interface SealResult {
  species: Species;
  xpAwarded: number;
  totalXp: number;
  rank: string;
  rankedUp: boolean;
  newBadges: Badge[];
}

/**
 * Seal a species: attach a permanent guard, flip its status to `sealed`, and
 * award the apex XP + badge. Throws if the species is unknown or already sealed.
 */
export async function sealSpecies(input: SealInput): Promise<SealResult> {
  const paths = resolvePaths(input.root);
  const { dex } = await loadDex(paths.dex);
  const trainer = await loadTrainer(paths.trainer, input.trainerName);
  const now = input.now ?? new Date();

  const index = dex.species.findIndex((s) => s.id === input.id);
  if (index === -1) throw new Error(`No species with id "${input.id}" in the dex.`);
  if (dex.species[index].status === "sealed") {
    throw new Error(`Species "${input.id}" is already sealed.`);
  }

  const seal: Seal = { kind: input.kind, reference: input.reference, sealedAt: now.toISOString() };
  const sealed: Species = { ...dex.species[index], seal, status: "sealed" };
  const species = [...dex.species];
  species[index] = sealed;
  const newDex: Dex = { version: dex.version, species };
  await saveDex(paths.dex, newDex);

  const applied = applyEvent(trainer, { kind: "seal", species: sealed }, newDex, now);
  await saveTrainer(paths.trainer, applied.trainer);

  return {
    species: sealed,
    xpAwarded: applied.xpAwarded,
    totalXp: applied.trainer.xp,
    rank: applied.trainer.rank,
    rankedUp: applied.rankedUp,
    newBadges: applied.newBadges,
  };
}

function isSealKind(value: string): value is SealKind {
  return (SEAL_KINDS as readonly string[]).includes(value);
}

export interface SealCliOptions {
  kind?: string;
  ref?: string;
  dir?: string;
}

/** `bugdex seal <id> --kind <kind> --ref <reference>`. */
export async function runSeal(id: string, opts: SealCliOptions): Promise<void> {
  if (!id)
    throw new Error(
      "Usage: bugdex seal <id> --kind <test|lint-rule|type|assertion> --ref <reference>",
    );
  const kind = opts.kind ?? "test";
  if (!isSealKind(kind)) {
    throw new Error(`--kind must be one of ${SEAL_KINDS.join(", ")} (got "${kind}").`);
  }
  if (!opts.ref) throw new Error("--ref <reference> is required (e.g. tests/null_guard.test.ts).");

  const root = opts.dir ?? process.cwd();
  const result = await sealSpecies({
    root,
    id,
    kind,
    reference: opts.ref,
    trainerName: (await getGitUserName(root)) ?? undefined,
  });

  const out = process.stdout;
  out.write(
    `🔒 Sealed ${result.species.name} via ${result.species.seal?.kind} (${result.species.seal?.reference})\n`,
  );
  out.write(`  +${result.xpAwarded} XP (total ${result.totalXp}) · rank: ${result.rank}\n`);
  if (result.rankedUp) out.write(`  ⭐ Ranked up to ${result.rank}!\n`);
  for (const badge of result.newBadges) out.write(`  🏅 Badge earned: ${badge.label}\n`);
}
