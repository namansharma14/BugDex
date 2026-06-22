import { collectScan } from "../scan/index.js";

export interface ScanCliOptions {
  collect?: boolean;
  diff?: boolean;
  dir?: string;
}

/**
 * `bugdex scan` — collect context for a deep hunt. The discovery itself runs
 * via the `/bugdex:scan` slash command (bug-hunter subagent); this CLI only
 * gathers the raw material (`--collect`) and, separately, `catch --from-scan`
 * persists confirmed candidates.
 */
export async function runScan(paths: string[], opts: ScanCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();

  if (!opts.collect) {
    process.stdout.write(
      [
        "bugdex scan — deep discovery runs via the `/bugdex:scan` slash command:",
        "it collects context (`bugdex scan --collect`), analyses it with the",
        "read-only bug-hunter subagent, then persists confirmed species with",
        "`bugdex catch --from-scan`.",
        "",
      ].join("\n"),
    );
    return;
  }

  const collection = await collectScan({
    root,
    paths: paths.length > 0 ? paths : undefined,
    diff: opts.diff,
  });
  process.stdout.write(`${JSON.stringify(collection, null, 2)}\n`);
}
