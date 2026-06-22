import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./io.js";

const HEADER = "# BugDex — per-user trainer progress (personal by default)";

/**
 * Ensure `rule` is present in the repo's `.gitignore`, appending a small
 * labelled block if it isn't. Returns true if the file was modified.
 * Idempotent: a second call with the same rule is a no-op.
 */
export async function ensureGitignoreRule(root: string, rule: string): Promise<boolean> {
  const file = join(root, ".gitignore");
  const content = (await pathExists(file)) ? await readFile(file, "utf8") : "";

  const alreadyIgnored = content.split(/\r?\n/).some((line) => line.trim() === rule);
  if (alreadyIgnored) return false;

  const separator = content.length === 0 ? "" : content.endsWith("\n") ? "\n" : "\n\n";
  await writeFile(file, `${content}${separator}${HEADER}\n${rule}\n`, "utf8");
  return true;
}
