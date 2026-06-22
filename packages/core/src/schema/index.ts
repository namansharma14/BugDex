/**
 * BugDex schemas — zod validators + inferred types for everything stored in
 * `.bugdex/`. Load untrusted data through these (never `eval`); validate on
 * read and quarantine what doesn't fit (see SPEC §3).
 */
export * from "./signature.js";
export * from "./species.js";
export * from "./config.js";
export * from "./trainer.js";
