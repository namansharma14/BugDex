import { trainerSchema } from "../schema/trainer.js";
import type { Trainer } from "../schema/trainer.js";
import { pathExists, readJsonFile, writeJsonFile } from "./io.js";
import { defaultTrainer } from "./defaults.js";

/**
 * Load trainer progress. A missing or malformed file yields a fresh trainer
 * (progress is local and disposable; we never crash on it).
 */
export async function loadTrainer(path: string, fallbackName = "Trainer"): Promise<Trainer> {
  if (!(await pathExists(path))) return defaultTrainer(fallbackName);
  const result = trainerSchema.safeParse(await readJsonFile(path));
  return result.success ? result.data : defaultTrainer(fallbackName);
}

/** Validate and persist trainer progress. */
export async function saveTrainer(path: string, trainer: Trainer): Promise<void> {
  await writeJsonFile(path, trainerSchema.parse(trainer));
}
