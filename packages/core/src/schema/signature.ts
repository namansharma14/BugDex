import { z } from "zod";

/**
 * Signature schema — how the fast matcher re-recognises a bug class.
 *
 * A discriminated union on `kind`. `regex` and `structural` are live in v1;
 * `ast` (tree-sitter) and `fingerprint` (semantic) are reserved for later
 * phases but validated now so dex files written by future versions still load.
 */
export const signatureSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("regex"),
    pattern: z.string().min(1),
    flags: z.string().optional(),
    languages: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal("structural"),
    rule: z.string().min(1),
    languages: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal("ast"),
    language: z.string().min(1),
    query: z.string().min(1),
  }),
  z.object({
    kind: z.literal("fingerprint"),
    model: z.string().min(1),
    vector: z.array(z.number()),
    threshold: z.number(),
  }),
]);

export type Signature = z.infer<typeof signatureSchema>;
export type SignatureKind = Signature["kind"];
