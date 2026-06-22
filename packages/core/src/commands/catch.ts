import { resolvePaths } from "../storage/paths.js";
import { loadDex, saveDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { loadTrainer, saveTrainer } from "../storage/trainer.js";
import { speciesSchema } from "../schema/species.js";
import type { Badge, Dex, Encounter, Signature, Species } from "../schema/index.js";
import type { BugType, Severity } from "../taxonomy/index.js";
import { isBugType, rarityForSeverity, severityRangeForRarity } from "../taxonomy/index.js";
import { applyEvent } from "../progression/engine.js";
import { computeStatus } from "../progression/nemesis.js";
import { generateCodename, slugify, uniqueId } from "../progression/codename.js";
import { recordEncounters } from "../matcher/record.js";
import type { Match } from "../matcher/matcher.js";
import {
  asCandidateArray,
  candidatesSchema,
  findCoveringSpecies,
  generateSignature,
  type Candidate,
} from "../scan/index.js";
import { getGitUserName } from "../util/git.js";
import { readStdin } from "../util/stdin.js";

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
  /** Pre-built signatures (used by --from-scan); overrides pattern/rule. */
  signatures?: Signature[];
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

  const signatures: Signature[] = input.signatures ? [...input.signatures] : [];
  if (!input.signatures) {
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

export interface FromScanResult {
  added: { species: Species; xpAwarded: number }[];
  skipped: { name: string; coveredBy: string }[];
  totalXp: number;
  rank: string;
}

/**
 * Persist confirmed scan candidates. Each is de-duplicated against the dex: a
 * candidate already covered by an existing signature is recorded as a scan
 * encounter (not a new species); a novel one is catalogued with discovery XP
 * and an auto-generated signature when the bug-hunter didn't supply one.
 */
export async function catchFromScan(opts: {
  root: string;
  json: string;
  discoveredBy?: string;
  now?: Date;
}): Promise<FromScanResult> {
  const candidates = asCandidateArray(candidatesSchema.parse(JSON.parse(opts.json)));
  const added: FromScanResult["added"] = [];
  const skipped: FromScanResult["skipped"] = [];

  for (const candidate of candidates) {
    const { dex } = await loadDex(resolvePaths(opts.root).dex);
    const covering = findCoveringSpecies(candidate, dex);
    if (covering) {
      await recordScanEncounter(opts.root, covering, candidate, opts.now);
      skipped.push({ name: candidate.name ?? candidate.commonName, coveredBy: covering.id });
      continue;
    }

    const signature = generateSignature(candidate);
    const severity =
      candidate.severity ?? (candidate.rarity ? severityRangeForRarity(candidate.rarity)[1] : 3);

    const result = await catchSpecies({
      root: opts.root,
      type: candidate.type,
      commonName: candidate.commonName,
      name: candidate.name,
      severity,
      description: candidate.description,
      fixSummary: candidate.fix?.summary,
      fixPatch: candidate.fix?.patch,
      cwe: candidate.cwe,
      tags: candidate.tags,
      signatures: signature ? [signature] : undefined,
      file: candidate.file,
      line: candidate.line,
      source: "scan",
      discoveredBy: opts.discoveredBy,
      now: opts.now,
    });
    added.push({ species: result.species, xpAwarded: result.xpAwarded });
  }

  const trainer = await loadTrainer(resolvePaths(opts.root).trainer);
  return { added, skipped, totalXp: trainer.xp, rank: trainer.rank };
}

/** Record a scan-sourced encounter on a species the candidate already matches. */
async function recordScanEncounter(
  root: string,
  species: Species,
  candidate: Candidate,
  now?: Date,
): Promise<void> {
  const paths = resolvePaths(root);
  const { dex } = await loadDex(paths.dex);
  const config = await loadConfig(paths.config);
  const match: Match = {
    speciesId: species.id,
    name: species.name,
    type: species.type,
    rarity: species.rarity,
    severity: species.severity,
    file: candidate.file ?? "scan",
    line: candidate.line,
    confidence: "high",
    fix: { summary: species.fix.summary },
    status: species.status,
    encounters: species.encounters.length,
  };
  const result = recordEncounters(dex, [match], {
    nemesisThreshold: config.nemesisThreshold,
    via: "scan",
    now,
  });
  if (result.recorded.length > 0) await saveDex(paths.dex, result.dex);
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
  fromScan?: string | boolean;
  dir?: string;
}

/** `bugdex catch` — manual catch, or `--from-scan` to persist scan candidates. */
export async function runCatch(opts: CatchCliOptions): Promise<void> {
  if (opts.fromScan !== undefined) {
    await runCatchFromScan(opts);
    return;
  }
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

/** `bugdex catch --from-scan <json|->` — persist confirmed scan candidates. */
async function runCatchFromScan(opts: CatchCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();
  let json = typeof opts.fromScan === "string" ? opts.fromScan : "";
  if (json === "" || json === "-") json = await readStdin();
  if (!json.trim()) {
    throw new Error("--from-scan needs JSON candidate(s) as an argument or on stdin.");
  }

  const result = await catchFromScan({
    root,
    json,
    discoveredBy: (await getGitUserName(root)) ?? undefined,
  });

  const out = process.stdout;
  for (const a of result.added) {
    out.write(
      `Caught #${a.species.dexNumber} ${a.species.name} — ${a.species.commonName} (+${a.xpAwarded} XP)\n`,
    );
  }
  for (const s of result.skipped) {
    out.write(`Skipped ${s.name} — already covered by ${s.coveredBy} (recorded an encounter)\n`);
  }
  if (result.added.length === 0 && result.skipped.length === 0) {
    out.write("No candidates to persist.\n");
  }
  out.write(`Total XP ${result.totalXp} · rank: ${result.rank}\n`);
}
