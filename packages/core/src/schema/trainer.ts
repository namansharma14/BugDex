import { z } from "zod";
import { bugTypeSchema } from "./species.js";

/** An earned achievement. */
export const badgeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  earnedAt: z.string().min(1),
});
export type Badge = z.infer<typeof badgeSchema>;

/** A single XP-affecting event in the trainer's timeline. */
export const historyEntrySchema = z.object({
  at: z.string().min(1),
  kind: z.string().min(1),
  xp: z.number(),
  speciesId: z.string().optional(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** Current on-disk trainer format version. */
export const TRAINER_VERSION = 1 as const;

/** Per-user progression (`.bugdex/trainer.local.json`; personal by default). */
export const trainerSchema = z.object({
  version: z.literal(TRAINER_VERSION),
  name: z.string(),
  xp: z.number().int().nonnegative(),
  rank: z.string(),
  title: z.string(),
  streak: z.object({
    current: z.number().int().nonnegative(),
    longest: z.number().int().nonnegative(),
    lastActive: z.string(),
  }),
  stats: z.object({
    caught: z.number().int().nonnegative(),
    encounters: z.number().int().nonnegative(),
    sealed: z.number().int().nonnegative(),
    byType: z.record(bugTypeSchema, z.number()),
  }),
  badges: z.array(badgeSchema),
  history: z.array(historyEntrySchema),
});
export type Trainer = z.infer<typeof trainerSchema>;
