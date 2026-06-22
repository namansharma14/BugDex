import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { languageForFile } from "../matcher/language.js";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".bugdex"]);

export interface CollectOptions {
  maxFiles?: number;
}

/**
 * Expand a list of file/dir inputs into concrete file paths. Explicit files are
 * always included; directories are walked, keeping only known-language files and
 * skipping vendored/build dirs.
 */
export async function collectFiles(inputs: string[], opts: CollectOptions = {}): Promise<string[]> {
  const maxFiles = opts.maxFiles ?? 5000;
  const out: string[] = [];

  const walkDir = async (dir: string): Promise<void> => {
    if (out.length >= maxFiles) return;
    if (SKIP_DIRS.has(basename(dir))) return;
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= maxFiles) break;
      const full = join(dir, entry);
      const info = await stat(full).catch(() => null);
      if (!info) continue;
      if (info.isDirectory()) await walkDir(full);
      else if (info.isFile() && languageForFile(full)) out.push(full);
    }
  };

  for (const input of inputs) {
    const info = await stat(input).catch(() => null);
    if (!info) continue;
    if (info.isFile()) out.push(input);
    else if (info.isDirectory()) await walkDir(input);
  }
  return out;
}

/** Read a file as UTF-8, returning null instead of throwing on any error. */
export async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}
