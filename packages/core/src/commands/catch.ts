import { resolvePaths } from "../storage/paths.js";
import { loadDex, saveDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { loadTrainer, saveTrainer } from "../storage/trainer.js";
import { speciesSchema } from "../schema/species.js";
import type { Badge, Dex, Encounter, Signature, Species } from "../schema/index.js";
import type { BugType, Severity } from "../taxonomy/index.js";
import { isBugType, rarityForSeverity } from "../taxonomy/index.js";
import { applyEvent } from "../progression/engine.js";
import { computeStatus } from "../progression/nemesis.js";
import { generateCodename, slugify, uniqueId } from "../progression/codename.js";
import { getGitUserName } from "../util/git.js";

export interface CatchInput {
  root: string;
  type: BugType;
  commonName: string;
  name?: string;
  severity?: Severity;
  description?: string;
  fixSummary?: string;
  fixPatch?: string;
  pattern?: string;
  flags?: string;
  structuralRule?: string;
  languages?: string[];
  file?: string;
  line?: number;
  cwe?: string;
  tags?: string[];
  source?: "manual" | "scan";
  discoveredBy?: string;
  now?: Date;
}

export interface CatchResult {
  species: Species;
  xpAwarded: number;
  totalXp: number;
  rank: string;
  rankedUp: boolean;
  newBadges: Badge[];
}

/**
 * Catalogue a new species and award progression. Builds a valid Species from
 * the input (auto-generating a codename/id when omitted), appends it to the
 * dex, then applies the catch event to the trainer.
 */
export async function catchSpecies(input: CatchInput): Promise<CatchResult> {
  const paths = resolvePaths(input.root);
  const { dex } = await loadDex(paths.dex);
  const config = await loadConfig(paths.config);
  const trainer = await loadTrainer(paths.trainer, input.discoveredBy);

  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const severity = input.severity ?? 3;
  const rarity = rarityForSeverity(severity);
  const name = (input.name ?? generateCodename(`${input.commonName}:${input.type}`)).toUpperCase();
  const taken = new Set(dex.species.map((s) => s.id));
  const id = uniqueId(slugify(input.name ?? input.commonName), taken);
  const dexNumber = dex.species.reduce((max, s) => Math.max(max, s.dexNumber), 0) + 1;

  const signatures: Signature[] = [];
  if (input.pattern) {
    signatures.push({
      kind: "regex",
      pattern: input.pattern,
      ...(input.flags ? { flags: input.flags } : {}),
      ...(input.languages ? { languages: input.languages } : {}),
    });
  }
  if (input.structuralRule) {
    signatures.push({
      kind: "structural",
      rule: input.structuralRule,
      ...(input.languages ? { languages: input.languages } : {}),
    });
  }

  const encounters: Encounter[] = [];
  if (input.file) {
    encounters.push({
      at: nowIso,
      file: input.file,
      via: input.source ?? "manual",
      ...(input.line !== undefined ? { line: input.line } : {}),
    });
  }

  const species: Species = speciesSchema.parse({
    id,
    dexNumber,
    name,
    commonName: input.commonName,
    type: input.type,
    rarity,
    severity,
    description: input.description ?? "",
    cwe: input.cwe,
    signatures,
    fix: { summary: input.fixSummary ?? "", patch: input.fixPatch },
    status: computeStatus({
      encounters: encounters.length,
      sealed: false,
      nemesisThreshold: config.nemesisThreshold,
    }),
    encounters,
    firstSeen: nowIso,
    lastSeen: nowIso,
    tags: input.tags ?? [],
    discoveredBy: input.discoveredBy ?? trainer.name,
  });

  const newDex: Dex = { version: dex.version, species: [...dex.species, species] };
  await saveDex(paths.dex, newDex);

  const applied = applyEvent(
    trainer,
    { kind: "catch", species, source: input.source ?? "manual" },
    newDex,
    now,
  );
  await saveTrainer(paths.trainer, applied.trainer);

  return {
    species,
    xpAwarded: applied.xpAwarded,
    totalXp: applied.trainer.xp,
    rank: applied.trainer.rank,
    rankedUp: applied.rankedUp,
    newBadges: applied.newBadges,
  };
}

export interface CatchCliOptions {
  type?: string;
  common?: string;
  name?: string;
  severity?: string;
  description?: string;
  fix?: string;
  pattern?: string;
  flags?: string;
  rule?: string;
  lang?: string;
  file?: string;
  line?: string;
  cwe?: string;
  tags?: string;
  dir?: string;
}

/** `bugdex catch` — manual catch from CLI flags. */
export async function runCatch(opts: CatchCliOptions): Promise<void> {
  if (!opts.type || !isBugType(opts.type)) {
    throw new Error(
      `--type is required and must be one of the ten bug types (got "${opts.type ?? ""}").`,
    );
  }
  if (!opts.common) {
    throw new Error("--common <plain-english name> is required.");
  }

  const severity = opts.severity ? Number(opts.severity) : 3;
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
    throw new Error(`--severity must be an integer 1–5 (got "${opts.severity ?? ""}").`);
  }

  const root = opts.dir ?? process.cwd();
  const result = await catchSpecies({
    root,
    type: opts.type,
    commonName: opts.common,
    name: opts.name,
    severity: severity as Severity,
    description: opts.description,
    fixSummary: opts.fix,
    pattern: opts.pattern,
    flags: opts.flags,
    structuralRule: opts.rule,
    languages: opts.lang
      ? opts.lang
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    file: opts.file,
    line: opts.line ? Number(opts.line) : undefined,
    cwe: opts.cwe,
    tags: opts.tags
      ? opts.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    discoveredBy: (await getGitUserName(root)) ?? undefined,
  });

  const out = process.stdout;
  out.write(
    `Caught #${result.species.dexNumber} ${result.species.name} — ${result.species.commonName}\n`,
  );
  out.write(
    `  ${result.species.type} · ${result.species.rarity} · sev ${result.species.severity}\n`,
  );
  out.write(`  +${result.xpAwarded} XP (total ${result.totalXp}) · rank: ${result.rank}\n`);
  if (result.rankedUp) out.write(`  ⭐ Ranked up to ${result.rank}!\n`);
  for (const badge of result.newBadges) out.write(`  🏅 Badge earned: ${badge.label}\n`);
}
