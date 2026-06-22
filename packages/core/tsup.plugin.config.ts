import { defineConfig } from "tsup";

/**
 * Builds the self-contained CommonJS bundle the Claude Code plugin ships and
 * invokes from hooks: `node "${CLAUDE_PLUGIN_ROOT}/bin/bugdex.cjs"`.
 *
 * Installed plugins are copied to a cache and can't reference files outside
 * their own directory, so every dependency (commander, zod) is inlined.
 */
export default defineConfig({
  entry: { bugdex: "src/cli.ts" },
  format: ["cjs"],
  target: "node22",
  outDir: "../../plugins/bugdex/bin",
  clean: false,
  dts: false,
  sourcemap: false,
  splitting: false,
  shims: false,
  noExternal: [/.*/],
});
