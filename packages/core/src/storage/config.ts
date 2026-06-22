import { configSchema } from "../schema/config.js";
import type { Config } from "../schema/config.js";
import { pathExists, readJsonFile, writeJsonFile } from "./io.js";
import { defaultConfig } from "./defaults.js";

/**
 * Load project config. A missing or malformed file falls back to defaults
 * rather than crashing (the matcher must never be blocked by a bad config).
 */
export async function loadConfig(path: string): Promise<Config> {
  if (!(await pathExists(path))) return defaultConfig();
  const result = configSchema.safeParse(await readJsonFile(path));
  return result.success ? result.data : defaultConfig();
}

/** Validate and persist config. */
export async function saveConfig(path: string, config: Config): Promise<void> {
  await writeJsonFile(path, configSchema.parse(config));
}
