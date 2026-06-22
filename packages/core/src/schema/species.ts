import { z } from "zod";
import { BUG_TYPES, RARITIES, STATUSES } from "../taxonomy/index.js";
import { signatureSchema } from "./signature.js";

/** A bug type, validated against the taxonomy's canonical list. */
export const bugTypeSchema = z.enum(BUG_TYPES);
/** A rarity tier. */
export const raritySchema = z.enum(RARITIES);
/** A species lifecycle status. */
export const statusSchema = z.enum(STATUSES);
/** Severity 1–5 (kept as a literal union so the type stays `1 | … | 5`). */
export const severitySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/** A single sighting of a species in the codebase. */
export const encounterSchema = z.object({
  at: z.string().min(1),
  file: z.string().min(1),
  line: z.number().int().positive().optional(),
  commit: z.string().optional(),
  via: z.enum(["matcher", "scan", "manual"]),
  resolvedBy: z.string().optional(),
});
export type Encounter = z.infer<typeof encounterSchema>;

/** A permanent guard that seals a bug class out of the codebase. */
export const sealSchema = z.object({
  kind: z.enum(["test", "lint-rule", "type", "assertion"]),
  reference: z.string().min(1),
  sealedAt: z.string().min(1),
});
export type Seal = z.infer<typeof sealSchema>;

/** A catalogued bug "species" — the heart of the dex. */
export const speciesSchema = z.object({
  id: z.string().min(1),
  dexNumber: z.number().int().positive(),
  name: z.string().min(1),
  commonName: z.string().min(1),
  type: bugTypeSchema,
  rarity: raritySchema,
  severity: severitySchema,
  description: z.string(),
  cwe: z.string().optional(),
  signatures: z.array(signatureSchema),
  fix: z.object({
    summary: z.string(),
    patch: z.string().optional(),
    explanation: z.string().optional(),
  }),
  status: statusSchema,
  seal: sealSchema.optional(),
  encounters: z.array(encounterSchema),
  firstSeen: z.string().min(1),
  lastSeen: z.string().min(1),
  tags: z.array(z.string()),
  discoveredBy: z.string().optional(),
});
export type Species = z.infer<typeof speciesSchema>;

/** Current on-disk dex format version. */
export const DEX_VERSION = 1 as const;

/** The species catalogue (`.bugdex/dex.json`). */
export const dexSchema = z.object({
  version: z.literal(DEX_VERSION),
  species: z.array(speciesSchema),
});
export type Dex = z.infer<typeof dexSchema>;
