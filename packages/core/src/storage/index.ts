/**
 * BugDex storage — read / write / merge the `.bugdex/` directory.
 *
 * Everything is local and file-based; loads validate with the schemas and
 * quarantine (never crash on) malformed data.
 */
export * from "./paths.js";
export * from "./io.js";
export * from "./errors.js";
export * from "./defaults.js";
export * from "./dex.js";
export * from "./config.js";
export * from "./trainer.js";
export * from "./gitignore.js";
export * from "./init.js";
