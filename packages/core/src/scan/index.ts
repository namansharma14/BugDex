/**
 * BugDex deep-scan IO (SPEC §7.4 / M5).
 *
 * Collect the diff + dex summary for the bug-hunter, de-duplicate candidates
 * against existing signatures, and generate signatures for confirmed species.
 * The discovery itself is the LLM's job; this module is the deterministic glue.
 */
export * from "./candidate.js";
export * from "./signature-gen.js";
export * from "./dedupe.js";
export * from "./collect.js";
