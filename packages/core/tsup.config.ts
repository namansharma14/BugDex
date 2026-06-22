import { defineConfig } from "tsup";

/**
 * Build configuration for the BugDex core.
 *
 * Produces the npm-publishable library (`index`) and the standalone CLI
 * (`cli`). The fully self-contained CommonJS bundle that the Claude Code
 * plugin invokes (`bin/bugdex.cjs`) is produced by a dedicated build in a
 * later milestone (M3).
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  shims: false,
});
