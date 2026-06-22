import { z } from "zod";
import { bugTypeSchema, raritySchema, severitySchema, signatureSchema } from "../schema/index.js";

/**
 * A discovery candidate emitted by the `bug-hunter` subagent and consumed by
 * `catch --from-scan`. Most fields are optional so the LLM's output is robust;
 * `commonName` and `type` are the minimum to catalogue something.
 */
export const candidateSchema = z.object({
  name: z.string().optional(),
  commonName: z.string().min(1),
  type: bugTypeSchema,
  severity: severitySchema.optional(),
  rarity: raritySchema.optional(),
  description: z.string().optional(),
  cwe: z.string().optional(),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  /** Offending code, used for de-duplication and signature generation. */
  snippet: z.string().optional(),
  fix: z.object({ summary: z.string(), patch: z.string().optional() }).optional(),
  signature: signatureSchema.optional(),
  tags: z.array(z.string()).optional(),
});
export type Candidate = z.infer<typeof candidateSchema>;

/** `catch --from-scan` accepts a single candidate or an array of them. */
export const candidatesSchema = z.union([candidateSchema, z.array(candidateSchema)]);

/** Normalise the parsed payload to an array. */
export function asCandidateArray(parsed: Candidate | Candidate[]): Candidate[] {
  return Array.isArray(parsed) ? parsed : [parsed];
}
