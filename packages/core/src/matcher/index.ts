/**
 * BugDex fast matcher — the always-on layer (SPEC §6).
 *
 * Deterministic, offline, LLM-free recognition of catalogued species, plus
 * debounced encounter recording. Defends against ReDoS on shared dex content.
 */
export * from "./language.js";
export * from "./regex-safety.js";
export * from "./structural.js";
export * from "./matcher.js";
export * from "./record.js";
