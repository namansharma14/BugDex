import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  init,
  TRAINER_IGNORE_RULE,
  resolvePaths,
  loadConfig,
  loadDex,
  loadTrainer,
  ensureGitignoreRule,
} from "../src/storage/index.js";
import { pathExists } from "../src/storage/io.js";
import { makeTempRepo, cleanup } from "./helpers.js";

let repo: string;
beforeEach(async () => {
  repo = await makeTempRepo();
});
afterEach(async () => {
  await cleanup(repo);
});

describe("bugdex init", () => {
  it("creates a valid .bugdex/ in personal mode", async () => {
    const result = await init({ root: repo, trainerName: "Ash" });
    const paths = resolvePaths(repo);

    expect(result.created).toEqual([paths.dex, paths.config, paths.trainer]);
    expect(result.skipped).toEqual([]);
    expect(result.team).toBe(false);
    expect(result.gitignoreUpdated).toBe(true);

    // Everything written is schema-valid and loadable.
    expect((await loadDex(paths.dex)).dex.species).toEqual([]);
    expect((await loadConfig(paths.config)).team).toBe(false);
    expect((await loadTrainer(paths.trainer)).name).toBe("Ash");

    const gitignore = await readFile(join(repo, ".gitignore"), "utf8");
    expect(gitignore).toContain(TRAINER_IGNORE_RULE);
  });

  it("is idempotent: a second run keeps existing files", async () => {
    await init({ root: repo });
    const second = await init({ root: repo });
    const paths = resolvePaths(repo);

    expect(second.created).toEqual([]);
    expect(second.skipped).toEqual([paths.dex, paths.config, paths.trainer]);
    expect(second.gitignoreUpdated).toBe(false);

    // The ignore rule is present exactly once.
    const gitignore = await readFile(join(repo, ".gitignore"), "utf8");
    const occurrences = gitignore.split(TRAINER_IGNORE_RULE).length - 1;
    expect(occurrences).toBe(1);
  });

  it("overwrites with --force", async () => {
    await init({ root: repo });
    const forced = await init({ root: repo, force: true });
    const paths = resolvePaths(repo);
    expect(forced.created).toEqual([paths.dex, paths.config, paths.trainer]);
    expect(forced.skipped).toEqual([]);
  });

  it("commits the trainer in team mode (no gitignore rule)", async () => {
    const result = await init({ root: repo, team: true });
    expect(result.team).toBe(true);
    expect(result.gitignoreUpdated).toBe(false);

    const paths = resolvePaths(repo);
    expect((await loadConfig(paths.config)).team).toBe(true);
    expect(await pathExists(join(repo, ".gitignore"))).toBe(false);
  });

  it("appends to an existing .gitignore without clobbering it", async () => {
    await writeFile(join(repo, ".gitignore"), "node_modules/\n", "utf8");
    await init({ root: repo });

    const gitignore = await readFile(join(repo, ".gitignore"), "utf8");
    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain(TRAINER_IGNORE_RULE);
  });
});

describe("ensureGitignoreRule", () => {
  it("adds a rule once and is a no-op thereafter", async () => {
    expect(await ensureGitignoreRule(repo, ".bugdex/trainer.local.json")).toBe(true);
    expect(await ensureGitignoreRule(repo, ".bugdex/trainer.local.json")).toBe(false);
  });
});
