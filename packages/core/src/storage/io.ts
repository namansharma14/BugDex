import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Read and JSON-parse a file. Throws on missing file or invalid JSON. */
export async function readJsonFile(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as unknown;
}

/**
 * Write `data` as pretty JSON (2-space indent, trailing newline), creating
 * the parent directory if needed.
 */
export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** True if a path exists and is accessible. */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
