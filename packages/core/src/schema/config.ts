import { z } from "zod";
import { bugTypeSchema } from "./species.js";

/** Renderer verbosity: rich card, single status line, or silent. */
export const flairSchema = z.enum(["high", "medium", "off"]);
export type Flair = z.infer<typeof flairSchema>;

/** Minimum confidence the matcher will surface (default: high only). */
export const confidenceSchema = z.enum(["high", "medium"]);
export type Confidence = z.infer<typeof confidenceSchema>;

/** Current on-disk config format version. */
export const CONFIG_VERSION = 1 as const;

/** Project configuration (`.bugdex/config.json`). */
export const configSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  flair: flairSchema,
  enabledTypes: z.array(bugTypeSchema),
  minConfidence: confidenceSchema,
  languages: z.array(z.string()),
  nemesisThreshold: z.number().int().positive(),
  /** When true, the trainer file is committed (team leaderboard) not gitignored. */
  team: z.boolean(),
});
export type Config = z.infer<typeof configSchema>;
