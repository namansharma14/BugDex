import { resolvePaths } from "../storage/paths.js";
import { loadDex, saveDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { matchFile } from "../matcher/matcher.js";
import type { Match } from "../matcher/matcher.js";
import { recordEncounters } from "../matcher/record.js";
import { collectFiles, readFileSafe } from "../util/files.js";

export interface MatchInput {
  root: string;
  files: string[];
  now?: Date;
  record?: boolean;
  commit?: string;
}

export interface MatchOutput {
  matches: Match[];
  recorded: { speciesId: string; file: string; line?: number }[];
  debounced: { speciesId: string; file: string }[];
}

/**
 * Run the fast matcher over `files` and (unless disabled) record debounced
 * encounters back to the dex. Read-only on the trainer — surfacing a known bug
 * is passive and never grants XP on its own.
 */
export async function matchAndRecord(input: MatchInput): Promise<MatchOutput> {
  const paths = resolvePaths(input.root);
  const { dex } = await loadDex(paths.dex);
  const config = await loadConfig(paths.config);

  const matches: Match[] = [];
  for (const file of input.files) {
    const content = await readFileSafe(file);
    if (content === null) continue;
    matches.push(
      ...matchFile({
        file,
        content,
        dex,
        config: { minConfidence: config.minConfidence, enabledTypes: config.enabledTypes },
      }),
    );
  }

  if (input.record === false || matches.length === 0) {
    return { matches, recorded: [], debounced: [] };
  }

  const result = recordEncounters(dex, matches, {
    nemesisThreshold: config.nemesisThreshold,
    now: input.now,
    via: "matcher",
    ...(input.commit ? { commit: input.commit } : {}),
  });
  if (result.recorded.length > 0) await saveDex(paths.dex, result.dex);
  return { matches, recorded: result.recorded, debounced: result.debounced };
}

export interface MatchCliOptions {
  json?: boolean;
  record?: boolean;
  dir?: string;
}

/** `bugdex match [paths...]` — scan files for known species. */
export async function runMatch(paths: string[], opts: MatchCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();
  const inputs = paths.length > 0 ? paths : ["."];
  const files = await collectFiles(inputs);

  const { matches } = await matchAndRecord({ root, files, record: opts.record });
  const out = process.stdout;

  if (opts.json) {
    out.write(
      `${JSON.stringify(
        {
          matches: matches.map((m) => ({
            speciesId: m.speciesId,
            name: m.name,
            type: m.type,
            file: m.file,
            line: m.line,
            confidence: m.confidence,
            fix: m.fix,
          })),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (matches.length === 0) {
    out.write("No known species recognised. ✨\n");
    return;
  }
  for (const m of matches) {
    const where = m.line !== undefined ? `${m.file}:${m.line}` : m.file;
    const nemesis = m.status === "nemesis" ? " ⚠ NEMESIS" : "";
    out.write(`⚠ ${m.name} (${m.type}, ×${m.encounters})${nemesis} — ${where}\n`);
    if (m.fix.summary) out.write(`    fix: ${m.fix.summary}\n`);
  }
}
