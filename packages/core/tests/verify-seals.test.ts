import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { verifySeals, refToPath } from "../src/commands/verify-seals.js";
import { catchSpecies } from "../src/commands/catch.js";
import { sealSpecies } from "../src/commands/seal.js";
import { init } from "../src/storage/init.js";
import { saveDex, loadDex } from "../src/storage/dex.js";
import { loadTrainer } from "../src/storage/trainer.js";
import { resolvePaths } from "../src/storage/paths.js";
import type { Dex } from "../src/schema/index.js";
import { buildSpecies, enc, makeTempRepo, cleanup } from "./helpers.js";

describe("refToPath", () => {
  it("extracts file paths and rejects bare ids", () => {
    expect(refToPath("tests/x.test.ts")).toBe("tests/x.test.ts");
    expect(refToPath("tests/x.test.ts::guards null")).toBe("tests/x.test.ts");
    expect(refToPath("src/x.ts:42")).toBe("src/x.ts");
    expect(refToPath("eslint:no-eval")).toBeNull();
    expect(refToPath("no-eval")).toBeNull();
  });
});

describe("verifySeals", () => {
  let repo: string;
  beforeEach(async () => {
    repo = await makeTempRepo();
    await init({ root: repo });
  });
  afterEach(async () => {
    await cleanup(repo);
  });

  it("leaves a seal intact when its guard file exists", async () => {
    const caught = await catchSpecies({ root: repo, type: "null", commonName: "Nullish" });
    await writeFile(join(repo, "guard.test.ts"), "// guard\n", "utf8");
    await sealSpecies({
      root: repo,
      id: caught.species.id,
      kind: "test",
      reference: "guard.test.ts",
    });

    const result = await verifySeals({ root: repo });
    expect(result.intact).toHaveLength(1);
    expect(result.broken).toHaveLength(0);
    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species[0].status).toBe("sealed");
  });

  it("reverts a seal whose guard file has vanished and drops the seal count", async () => {
    const caught = await catchSpecies({ root: repo, type: "null", commonName: "Nullish" });
    await sealSpecies({
      root: repo,
      id: caught.species.id,
      kind: "test",
      reference: "tests/gone.test.ts",
    });
    expect((await loadTrainer(resolvePaths(repo).trainer)).stats.sealed).toBe(1);

    const result = await verifySeals({ root: repo });
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].revertedTo).toBe("caught");

    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species[0].status).toBe("caught");
    expect(dex.species[0].seal).toBeUndefined();
    expect((await loadTrainer(resolvePaths(repo).trainer)).stats.sealed).toBe(0);
  });

  it("reverts a recurring bug all the way back to nemesis", async () => {
    const dex: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "voidling",
          status: "sealed",
          seal: {
            kind: "test",
            reference: "tests/gone.test.ts",
            sealedAt: "2026-01-01T00:00:00.000Z",
          },
          encounters: [
            enc("2026-01-01T00:00:00.000Z", "a.ts"),
            enc("2026-01-02T00:00:00.000Z", "b.ts"),
            enc("2026-01-03T00:00:00.000Z", "c.ts"),
          ],
        }),
      ],
    };
    await saveDex(resolvePaths(repo).dex, dex);

    const result = await verifySeals({ root: repo });
    expect(result.broken[0]?.revertedTo).toBe("nemesis");
  });

  it("marks a bare lint-rule reference as unverifiable", async () => {
    const caught = await catchSpecies({ root: repo, type: "logic", commonName: "Loose eq" });
    await sealSpecies({
      root: repo,
      id: caught.species.id,
      kind: "lint-rule",
      reference: "eqeqeq",
    });

    const result = await verifySeals({ root: repo });
    expect(result.unverifiable).toHaveLength(1);
    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species[0].status).toBe("sealed");
  });
});
