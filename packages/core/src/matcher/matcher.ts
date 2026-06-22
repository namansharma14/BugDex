import type { Config, Confidence, Dex, Signature, Species } from "../schema/index.js";
import type { BugType, Rarity, Severity, Status } from "../taxonomy/index.js";
import { languageForFile, languageMatches } from "./language.js";
import {
  compileRegex,
  isLikelySafeRegex,
  MAX_CONTENT_LENGTH,
  MAX_LINE_LENGTH,
} from "./regex-safety.js";
import { STRUCTURAL_RULES, type StructuralContext } from "./structural.js";

/** A recognised recurrence of a catalogued species in a file. */
export interface Match {
  speciesId: string;
  name: string;
  type: BugType;
  rarity: Rarity;
  severity: Severity;
  file: string;
  line?: number;
  confidence: Confidence;
  fix: { summary: string };
  status: Status;
  /** Encounter count so far (for messaging, e.g. "caught ×6"). */
  encounters: number;
}

export interface MatchFileOptions {
  file: string;
  content: string;
  dex: Dex;
  config?: Partial<Pick<Config, "minConfidence" | "enabledTypes">>;
}

const CONFIDENCE_ORDER: Record<Confidence, number> = { medium: 1, high: 2 };

function confidenceMeets(hit: Confidence, min: Confidence): boolean {
  return CONFIDENCE_ORDER[hit] >= CONFIDENCE_ORDER[min];
}

interface SpeciesHit {
  line?: number;
  confidence: Confidence;
}

function matchRegex(
  sig: Extract<Signature, { kind: "regex" }>,
  ctx: StructuralContext,
): number | undefined {
  if (!languageMatches(ctx.language, sig.languages)) return undefined;
  if (!isLikelySafeRegex(sig.pattern)) return undefined;
  const re = compileRegex(sig.pattern, sig.flags);
  if (!re) return undefined;
  for (let i = 0; i < ctx.lines.length; i++) {
    const line = ctx.lines[i];
    if (line.length > MAX_LINE_LENGTH) continue;
    if (re.test(line)) return i + 1;
  }
  return undefined;
}

function matchStructural(
  sig: Extract<Signature, { kind: "structural" }>,
  ctx: StructuralContext,
): number | undefined {
  if (!languageMatches(ctx.language, sig.languages)) return undefined;
  const rule = STRUCTURAL_RULES[sig.rule];
  return rule ? rule(ctx) : undefined;
}

/** Try a species' signatures in cost order; return the first hit. */
function matchSpecies(species: Species, ctx: StructuralContext): SpeciesHit | undefined {
  for (const sig of species.signatures) {
    if (sig.kind === "regex") {
      const line = matchRegex(sig, ctx);
      if (line !== undefined) return { line, confidence: "high" };
    } else if (sig.kind === "structural") {
      const line = matchStructural(sig, ctx);
      if (line !== undefined) return { line, confidence: "high" };
    }
    // `ast` and `fingerprint` are reserved for later phases; skipped in v1.
  }
  return undefined;
}

/**
 * The always-on fast matcher: recognise catalogued species in a single file.
 * Deterministic, offline, and LLM-free. Returns at most one match per species,
 * filtered to the configured minimum confidence (default: high only).
 */
export function matchFile(opts: MatchFileOptions): Match[] {
  const { file, content, dex } = opts;
  if (content.length > MAX_CONTENT_LENGTH) return [];

  const minConfidence = opts.config?.minConfidence ?? "high";
  const enabledTypes = opts.config?.enabledTypes;
  const ctx: StructuralContext = {
    content,
    lines: content.split(/\r?\n/),
    language: languageForFile(file),
  };

  const matches: Match[] = [];
  for (const species of dex.species) {
    if (enabledTypes && !enabledTypes.includes(species.type)) continue;
    const hit = matchSpecies(species, ctx);
    if (!hit || !confidenceMeets(hit.confidence, minConfidence)) continue;
    matches.push({
      speciesId: species.id,
      name: species.name,
      type: species.type,
      rarity: species.rarity,
      severity: species.severity,
      file,
      line: hit.line,
      confidence: hit.confidence,
      fix: { summary: species.fix.summary },
      status: species.status,
      encounters: species.encounters.length,
    });
  }
  return matches;
}
