import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Best-effort `git config user.name` for seeding the trainer. Returns
 * undefined if git isn't available or the value isn't set — never throws.
 */
export async function getGitUserName(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await run("git", ["config", "user.name"], { cwd });
    const name = stdout.trim();
    return name.length > 0 ? name : undefined;
  } catch {
    return undefined;
  }
}

const MAX_DIFF_BUFFER = 16 * 1024 * 1024;

/** Best-effort `git diff <ref>`; empty string if unavailable. Never throws. */
export async function gitDiff(cwd: string, ref = "HEAD"): Promise<string> {
  try {
    const { stdout } = await run("git", ["diff", ref], { cwd, maxBuffer: MAX_DIFF_BUFFER });
    return stdout;
  } catch {
    return "";
  }
}

/** Files changed vs `ref` plus untracked files; empty if not a git repo. */
export async function gitChangedFiles(cwd: string, ref = "HEAD"): Promise<string[]> {
  const lines = async (args: string[]): Promise<string[]> => {
    try {
      const { stdout } = await run("git", args, { cwd, maxBuffer: MAX_DIFF_BUFFER });
      return stdout
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };
  const tracked = await lines(["diff", "--name-only", ref]);
  const untracked = await lines(["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...tracked, ...untracked])];
}
