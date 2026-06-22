#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "./index.js";
import { runInit, type InitCliOptions } from "./commands/init.js";
import { runCatch, type CatchCliOptions } from "./commands/catch.js";
import { runSeal, type SealCliOptions } from "./commands/seal.js";
import { runMatch, type MatchCliOptions } from "./commands/match.js";
import { runDex, type DexCliOptions } from "./commands/dex.js";
import { runStats, type StatsCliOptions } from "./commands/stats.js";
import { runCard, type CardCliOptions } from "./commands/card.js";
import { runScan, type ScanCliOptions } from "./commands/scan.js";
import { runDashboard, type DashboardCliOptions } from "./commands/dashboard.js";
import { runVerifySeals, type VerifySealsCliOptions } from "./commands/verify-seals.js";

const program = new Command();

program
  .name("bugdex")
  .description("A Pokédex for your codebase — catalogue, recognise, and gamify bug fixing.")
  .version(VERSION, "-v, --version", "print the BugDex version");

program
  .command("init")
  .description("Create a .bugdex/ directory (dex, config, trainer) in a repo.")
  .option("--team", "commit an anonymised team trainer instead of gitignoring it")
  .option("--force", "overwrite existing .bugdex files")
  .option("-C, --dir <path>", "target repo root (defaults to the current directory)")
  .action(async (opts: InitCliOptions) => {
    await runInit(opts);
  });

program
  .command("match")
  .argument("[paths...]", "files or directories to scan (defaults to the current directory)")
  .description("Recognise catalogued species in the given files (the fast matcher).")
  .option("--json", "emit matches as JSON")
  .option("--no-record", "do not record encounters")
  .option("--hook-input", "read a PostToolUse hook payload on stdin (never blocks)")
  .option("-C, --dir <path>", "repo root for .bugdex (defaults to the current directory)")
  .action(async (paths: string[], opts: MatchCliOptions) => {
    await runMatch(paths, opts);
  });

program
  .command("catch")
  .description("Manually catalogue a new bug species (or --from-scan to persist candidates).")
  .option(
    "--type <type>",
    "bug type (null|injection|concurrency|memory|logic|crypto|auth|resource|type|config)",
  )
  .option("--common <name>", 'plain-English name, e.g. "Unguarded null dereference"')
  .option("--from-scan [json]", "persist scan candidate JSON (reads stdin if no value given)")
  .option("--name <codename>", "memorable codename (auto-generated if omitted)")
  .option("--severity <1-5>", "severity 1–5 (default 3)")
  .option("--description <text>", "one-line dossier")
  .option("--fix <summary>", "how to fix it")
  .option("--pattern <regex>", "regex signature to re-catch this class")
  .option("--flags <flags>", "regex flags for --pattern")
  .option("--rule <name>", "named structural-rule signature")
  .option("--lang <langs>", "comma-separated languages the signature applies to")
  .option("--file <path>", "file where it was caught (records an encounter)")
  .option("--line <n>", "line number for the encounter")
  .option("--cwe <id>", "CWE id, e.g. CWE-89")
  .option("--tags <tags>", "comma-separated tags")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (opts: CatchCliOptions) => {
    await runCatch(opts);
  });

program
  .command("seal")
  .argument("<id>", "species id to seal")
  .description("Seal a species with a permanent guard (the apex move).")
  .option("--kind <kind>", "guard kind: test|lint-rule|type|assertion (default test)")
  .option("--ref <reference>", "reference to the guard, e.g. tests/null_guard.test.ts")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (id: string, opts: SealCliOptions) => {
    await runSeal(id, opts);
  });

program
  .command("dex")
  .description("List the catalogued species.")
  .option("--type <type>", "filter by bug type")
  .option("--status <status>", "filter by status (caught|recurring|nemesis|sealed)")
  .option("--flair <level>", "override flair: high | medium | off")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (opts: DexCliOptions) => {
    await runDex(opts);
  });

program
  .command("stats")
  .description("Show the trainer card (rank, XP, stats, streak, badges).")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (opts: StatsCliOptions) => {
    await runStats(opts);
  });

program
  .command("card")
  .description("Show a compact trainer card plus any active Nemeses.")
  .option("--hook", "emit SessionStart additionalContext JSON (reads stdin)")
  .option("--flair <level>", "override flair: high | medium | off")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (opts: CardCliOptions) => {
    await runCard(opts);
  });

program
  .command("scan")
  .argument("[paths...]", "files or directories to scan (default: the working-tree diff)")
  .description("Collect context for a deep bug hunt (used by /bugdex:scan).")
  .option("--collect", "emit the scan collection (files/diff + dex summary) as JSON")
  .option("--diff", "scan the git diff even when paths are given")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (paths: string[], opts: ScanCliOptions) => {
    await runScan(paths, opts);
  });

program
  .command("dashboard")
  .description("Serve the Pokédex web dashboard.")
  .option("--port <port>", "port to listen on (default 4317)")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (opts: DashboardCliOptions) => {
    await runDashboard(opts);
  });

program
  .command("verify-seals")
  .description("Re-check sealed guards still exist; revert toward nemesis if any vanished.")
  .option("-C, --dir <path>", "repo root (defaults to the current directory)")
  .action(async (opts: VerifySealsCliOptions) => {
    await runVerifySeals(opts);
  });

async function main(): Promise<void> {
  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  process.stderr.write(`bugdex: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
