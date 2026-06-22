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
