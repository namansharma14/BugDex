import { mkdir } from "node:fs/promises";
import { resolvePaths } from "./paths.js";
import { defaultConfig, defaultTrainer, emptyDex } from "./defaults.js";
import { saveDex } from "./dex.js";
import { saveConfig } from "./config.js";
import { saveTrainer } from "./trainer.js";
import { pathExists } from "./io.js";
import { ensureGitignoreRule } from "./gitignore.js";
import { BUGDEX_DIR, TRAINER_FILE } from "./paths.js";

export interface InitOptions {
  /** Repo root to initialise. */
  root: string;
  /** Commit trainer progress as a team leaderboard instead of gitignoring it. */
  team?: boolean;
  /** Overwrite existing `.bugdex` files. */
  force?: boolean;
  /** Name to seed the trainer with. */
  trainerName?: string;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  gitignoreUpdated: boolean;
  team: boolean;
}

/** The path a personal trainer file is ignored under (POSIX-style for git). */
export const TRAINER_IGNORE_RULE = `${BUGDEX_DIR}/${TRAINER_FILE}`;

/**
 * Create (or top up) a repo's `.bugdex/` directory: an empty dex, default
 * config, and a fresh trainer. Existing files are kept unless `force` is set.
 * In personal mode the trainer file is added to `.gitignore`.
 */
export async function init(opts: InitOptions): Promise<InitResult> {
  const paths = resolvePaths(opts.root);
  const team = Boolean(opts.team);
  await mkdir(paths.dir, { recursive: true });

  const created: string[] = [];
  const skipped: string[] = [];

  const writeIfAbsent = async (target: string, write: () => Promise<void>): Promise<void> => {
    if (opts.force || !(await pathExists(target))) {
      await write();
      created.push(target);
    } else {
      skipped.push(target);
    }
  };

  await writeIfAbsent(paths.dex, () => saveDex(paths.dex, emptyDex()));
  await writeIfAbsent(paths.config, () => saveConfig(paths.config, defaultConfig({ team })));
  await writeIfAbsent(paths.trainer, () =>
    saveTrainer(paths.trainer, defaultTrainer(opts.trainerName ?? "Trainer")),
  );

  // Personal mode: keep per-user progress out of git. Team mode commits it.
  const gitignoreUpdated = team ? false : await ensureGitignoreRule(opts.root, TRAINER_IGNORE_RULE);

  return { created, skipped, gitignoreUpdated, team };
}
