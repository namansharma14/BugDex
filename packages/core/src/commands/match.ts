import { isAbsolute, resolve } from "node:path";
import { resolvePaths } from "../storage/paths.js";
import { loadDex, saveDex } from "../storage/dex.js";
import { loadConfig } from "../storage/config.js";
import { matchFile } from "../matcher/matcher.js";
import type { Match } from "../matcher/matcher.js";
import { recordEncounters } from "../matcher/record.js";
import { collectFiles, readFileSafe } from "../util/files.js";
import { readHookInput } from "../util/stdin.js";

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

/** Build the PostToolUse `additionalContext` message from high-confidence matches. */
export function buildHookMessage(file: string, matches: Match[]): string {
  const count = matches.length === 1 ? "a known bug class" : `${matches.length} known bug classes`;
  const header = `⚠️ **BugDex** recognised ${count} in \`${file}\`:`;
  const lines = matches.map((m) => {
    const parts = [`${m.type}-type`];
    if (m.encounters > 0) parts.push(`caught ×${m.encounters} here`);
    if (m.line !== undefined) parts.push(`line ${m.line}`);
    const fix = m.fix.summary ? ` Known fix: _${m.fix.summary}_.` : "";
    const nemesis =
      m.status === "nemesis"
        ? ` This is a recurring **Nemesis** — consider sealing it with \`/bugdex:seal ${m.speciesId}\` and a test.`
        : "";
    return `- **${m.name}** (${parts.join(", ")}).${fix}${nemesis}`;
  });
  return [header, ...lines].join("\n");
}

/**
 * PostToolUse hook entry: read the hook JSON on stdin, match the edited file,
 * and emit `additionalContext` for high-confidence hits. Never blocks, never
 * throws — any error results in a silent, successful exit.
 */
export async function runMatchHook(): Promise<void> {
  try {
    const input = await readHookInput();
    const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
    const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;
    const filePath = typeof toolInput.file_path === "string" ? toolInput.file_path : undefined;
    if (!filePath) return;

    const file = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
    const config = await loadConfig(resolvePaths(cwd).config);
    if (config.flair === "off") return; // honour the user's quiet preference

    const { matches } = await matchAndRecord({ root: cwd, files: [file] });
    const high = matches.filter((m) => m.confidence === "high");
    if (high.length === 0) return;

    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: buildHookMessage(file, high),
        },
      })}\n`,
    );
  } catch {
    // The matcher must never block or break an edit; fail silent.
  }
}

export interface MatchCliOptions {
  json?: boolean;
  record?: boolean;
  hookInput?: boolean;
  dir?: string;
}

/** `bugdex match [paths...]` — scan files for known species. */
export async function runMatch(paths: string[], opts: MatchCliOptions): Promise<void> {
  if (opts.hookInput) {
    await runMatchHook();
    return;
  }

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
