#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "./index.js";
import { runInit } from "./commands/init.js";

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
  .action(async (opts: InitCommandOptions) => {
    await runInit(opts);
  });

interface InitCommandOptions {
  team?: boolean;
  force?: boolean;
  dir?: string;
}

async function main(): Promise<void> {
  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  process.stderr.write(`bugdex: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
