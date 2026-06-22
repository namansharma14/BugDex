/**
 * BugDex core — public library surface.
 *
 * Re-exports the engine pieces (taxonomy, schema, storage, …) as they land in
 * later milestones. This is the stable entry point the CLI and the npm package
 * build against.
 */

/** Current BugDex version. Kept in sync with package.json at release time. */
export const VERSION = "0.1.0";

export * from "./taxonomy/index.js";
export * from "./schema/index.js";
export * from "./storage/index.js";
