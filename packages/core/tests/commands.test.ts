import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { copyFile } from "node:fs/promises";
import { join } from "node:path";
import { catchSpecies } from "../src/commands/catch.js";
import { sealSpecies } from "../src/commands/seal.js";
import { matchAndRecord } from "../src/commands/match.js";
import { runDex } from "../src/commands/dex.js";
import { runStats } from "../src/commands/stats.js";
import { init } from "../src/storage/init.js";
import { loadDex } from "../src/storage/dex.js";
import { loadTrainer } from "../src/storage/trainer.js";
import { resolvePaths } from "../src/storage/paths.js";
import { makeTempRepo, cleanup, FIXTURES_DIR } from "./helpers.js";

let repo: string;
const now = new Date("2026-06-01T12:00:00.000Z");

beforeEach(async () => {
  repo = await makeTempRepo();
  await init({ root: repo });
});
afterEach(async () => {
  await cleanup(repo);
});

describe("catchSpecies", () => {
  it("catalogues a new species and awards XP", async () => {
    const result = await catchSpecies({
      root: repo,
      type: "null",
      commonName: "Unguarded null dereference",
      severity: 2,
      fixSummary: "guard before deref",
      now,
    });

    expect(result.species.dexNumber).toBe(1);
    expect(result.species.rarity).toBe("common"); // severity 2 → common
    expect(result.species.status).toBe("caught");
    expect(result.xpAwarded).toBe(35); // 30 manual + 5 first-day streak
    expect(result.totalXp).toBe(35);

    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species).toHaveLength(1);
    const trainer = await loadTrainer(resolvePaths(repo).trainer);
    expect(trainer.xp).toBe(35);
    expect(trainer.stats.caught).toBe(1);
  });

  it("assigns incrementing dex numbers and unique ids", async () => {
    const a = await catchSpecies({ root: repo, type: "null", commonName: "Same Name", now });
    const b = await catchSpecies({ root: repo, type: "logic", commonName: "Same Name", now });
    expect(b.species.dexNumber).toBe(a.species.dexNumber + 1);
    expect(b.species.id).not.toBe(a.species.id);
  });
});

describe("sealSpecies", () => {
  it("seals a species, flips status, and grants a badge", async () => {
    const caught = await catchSpecies({ root: repo, type: "null", commonName: "Nullish", now });
    const sealed = await sealSpecies({
      root: repo,
      id: caught.species.id,
      kind: "test",
      reference: "tests/null_guard.test.ts",
      now, // same day → no extra streak bonus
    });

    expect(sealed.species.status).toBe("sealed");
    expect(sealed.species.seal?.reference).toBe("tests/null_guard.test.ts");
    expect(sealed.xpAwarded).toBe(120);
    expect(sealed.newBadges).toHaveLength(1);

    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species[0].status).toBe("sealed");
    const trainer = await loadTrainer(resolvePaths(repo).trainer);
    expect(trainer.stats.sealed).toBe(1);
  });

  it("rejects unknown or already-sealed species", async () => {
    await expect(
      sealSpecies({ root: repo, id: "ghost", kind: "test", reference: "t" }),
    ).rejects.toThrow(/No species/);

    const caught = await catchSpecies({ root: repo, type: "null", commonName: "Nullish", now });
    await sealSpecies({ root: repo, id: caught.species.id, kind: "test", reference: "t", now });
    await expect(
      sealSpecies({ root: repo, id: caught.species.id, kind: "test", reference: "t", now }),
    ).rejects.toThrow(/already sealed/);
  });
});

describe("matchAndRecord", () => {
  beforeEach(async () => {
    // Use the seeded dex and a buggy sample inside the temp repo.
    await copyFile(join(FIXTURES_DIR, "dex.json"), resolvePaths(repo).dex);
    await copyFile(join(FIXTURES_DIR, "samples", "weak_crypto.ts"), join(repo, "weak_crypto.ts"));
  });

  it("matches known species and records an encounter", async () => {
    const sample = join(repo, "weak_crypto.ts");
    const result = await matchAndRecord({ root: repo, files: [sample], now });

    expect(result.matches.map((m) => m.speciesId)).toContain("hashwraith");
    expect(result.recorded.length).toBeGreaterThan(0);

    const { dex } = await loadDex(resolvePaths(repo).dex);
    const hashwraith = dex.species.find((s) => s.id === "hashwraith");
    expect(hashwraith?.encounters).toHaveLength(1);
  });

  it("debounces a re-scan of the same file", async () => {
    const sample = join(repo, "weak_crypto.ts");
    await matchAndRecord({ root: repo, files: [sample], now });
    const second = await matchAndRecord({ root: repo, files: [sample], now });
    expect(second.recorded).toHaveLength(0);
  });

  it("does not record when recording is disabled", async () => {
    const sample = join(repo, "weak_crypto.ts");
    const result = await matchAndRecord({ root: repo, files: [sample], now, record: false });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.recorded).toHaveLength(0);
  });
});

describe("read-only commands", () => {
  it("runDex and runStats run without throwing", async () => {
    await catchSpecies({ root: repo, type: "null", commonName: "Nullish", now });
    const quiet = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    try {
      await expect(runDex({ dir: repo })).resolves.toBeUndefined();
      await expect(runStats({ dir: repo })).resolves.toBeUndefined();
    } finally {
      quiet.mockRestore();
    }
  });
});
