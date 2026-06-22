import { relative, resolve } from "node:path";
import { init } from "../storage/index.js";
import { getGitUserName } from "../util/git.js";

export interface InitCliOptions {
  team?: boolean;
  force?: boolean;
  dir?: string;
}

/** `bugdex init` — scaffold a repo's `.bugdex/` directory and report what changed. */
export async function runInit(opts: InitCliOptions): Promise<void> {
  const root = resolve(opts.dir ?? process.cwd());
  const trainerName = (await getGitUserName(root)) ?? "Trainer";

  const result = await init({
    root,
    team: opts.team,
    force: opts.force,
    trainerName,
  });

  const rel = (p: string): string => relative(root, p) || p;
  const out = process.stdout;

  out.write("BugDex initialised.\n");
  if (result.created.length > 0) {
    out.write(`  created: ${result.created.map(rel).join(", ")}\n`);
  }
  if (result.skipped.length > 0) {
    out.write(`  kept:    ${result.skipped.map(rel).join(", ")} (use --force to overwrite)\n`);
  }
  out.write(
    `  mode:    ${result.team ? "team (trainer committed)" : "personal (trainer gitignored)"}\n`,
  );
  if (result.gitignoreUpdated) {
    out.write("  updated: .gitignore\n");
  }
  out.write("\nNext: run `bugdex --help` to see available commands.\n");
}
