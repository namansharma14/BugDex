#!/usr/bin/env node
import { VERSION } from "./index.js";

/**
 * BugDex CLI entrypoint.
 *
 * Real command wiring (init, match, catch, seal, dex, scan, dashboard …)
 * arrives in later milestones. For now it answers `--version` so the build
 * produces a runnable binary that the scaffold can verify.
 */
function main(argv: string[]): void {
  const args = argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  process.stdout.write(`bugdex v${VERSION}\n`);
}

main(process.argv);
