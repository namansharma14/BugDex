import { join } from "node:path";

export const BUGDEX_DIR = ".bugdex";
export const DEX_FILE = "dex.json";
export const CONFIG_FILE = "config.json";
export const TRAINER_FILE = "trainer.local.json";
export const QUARANTINE_FILE = "quarantine.json";

/** Resolved absolute paths for a repo's `.bugdex/` files. */
export interface BugdexPaths {
  /** The repo root these paths are anchored to. */
  root: string;
  /** The `.bugdex/` directory. */
  dir: string;
  dex: string;
  config: string;
  trainer: string;
  quarantine: string;
}

/** Compute the `.bugdex/` file layout for a given repo root. */
export function resolvePaths(root: string): BugdexPaths {
  const dir = join(root, BUGDEX_DIR);
  return {
    root,
    dir,
    dex: join(dir, DEX_FILE),
    config: join(dir, CONFIG_FILE),
    trainer: join(dir, TRAINER_FILE),
    quarantine: join(dir, QUARANTINE_FILE),
  };
}
