/**
 * BugDex core — public library surface.
 *
 * Re-exports the engine pieces (schema, taxonomy, storage, matcher,
 * progression, render, …) as they land in later milestones. For now this is
 * the stable entry point that the CLI and the npm package build against.
 */

/** Current BugDex version. Kept in sync with package.json at release time. */
export const VERSION = "0.1.0";
