import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadDex,
  saveDex,
  mergeDex,
  loadConfig,
  saveConfig,
  loadTrainer,
  saveTrainer,
  defaultConfig,
  defaultTrainer,
  emptyDex,
  DexParseError,
} from "../src/storage/index.js";
import type { Dex } from "../src/schema/index.js";
import { buildSpecies, makeTempRepo, cleanup } from "./helpers.js";

let repo: string;
beforeEach(async () => {
  repo = await makeTempRepo();
});
afterEach(async () => {
  await cleanup(repo);
});

describe("dex round-trip", () => {
  it("saves and loads a dex unchanged", async () => {
    const path = join(repo, "dex.json");
    const dex: Dex = { version: 1, species: [buildSpecies()] };
    await saveDex(path, dex);
    const { dex: loaded, quarantined } = await loadDex(path);
    expect(quarantined).toHaveLength(0);
    expect(loaded).toEqual(dex);
  });

  it("returns an empty dex for a missing file", async () => {
    const { dex, quarantined } = await loadDex(join(repo, "nope.json"));
    expect(dex).toEqual(emptyDex());
    expect(quarantined).toHaveLength(0);
  });

  it("refuses to persist an invalid dex", async () => {
    const bad = { version: 1, species: [{ id: "x" }] } as unknown as Dex;
    await expect(saveDex(join(repo, "dex.json"), bad)).rejects.toThrow();
  });
});

describe("malformed dex handling", () => {
  it("quarantines bad species but loads the good ones", async () => {
    const path = join(repo, "dex.json");
    const payload = {
      version: 1,
      species: [buildSpecies({ id: "good" }), { id: "broken" }, { type: "null" }],
    };
    await writeFile(path, JSON.stringify(payload), "utf8");

    const { dex, quarantined } = await loadDex(path);
    expect(dex.species.map((s) => s.id)).toEqual(["good"]);
    expect(quarantined).toHaveLength(2);
    expect(quarantined[0].issues.length).toBeGreaterThan(0);
  });

  it("throws DexParseError on unparseable JSON", async () => {
    const path = join(repo, "dex.json");
    await writeFile(path, "{ this is not json", "utf8");
    await expect(loadDex(path)).rejects.toBeInstanceOf(DexParseError);
  });
});

describe("config & trainer round-trip", () => {
  it("saves and loads config", async () => {
    const path = join(repo, "config.json");
    const config = defaultConfig({ flair: "medium", team: true });
    await saveConfig(path, config);
    expect(await loadConfig(path)).toEqual(config);
  });

  it("falls back to defaults on a malformed config", async () => {
    const path = join(repo, "config.json");
    await writeFile(path, JSON.stringify({ flair: "neon" }), "utf8");
    expect(await loadConfig(path)).toEqual(defaultConfig());
  });

  it("saves and loads trainer", async () => {
    const path = join(repo, "trainer.local.json");
    const trainer = defaultTrainer("Ash");
    await saveTrainer(path, trainer);
    expect(await loadTrainer(path)).toEqual(trainer);
  });
});

describe("mergeDex", () => {
  const enc = (at: string) => ({ at, file: "src/a.ts", via: "manual" as const });

  it("unions species and merges encounters by id", () => {
    const base: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "x",
          dexNumber: 1,
          status: "caught",
          encounters: [enc("2026-01-01T00:00:00.000Z")],
          firstSeen: "2026-01-01T00:00:00.000Z",
          lastSeen: "2026-01-01T00:00:00.000Z",
        }),
      ],
    };
    const incoming: Dex = {
      version: 1,
      species: [
        buildSpecies({
          id: "x",
          dexNumber: 5,
          status: "nemesis",
          encounters: [enc("2026-02-01T00:00:00.000Z")],
          firstSeen: "2026-01-15T00:00:00.000Z",
          lastSeen: "2026-02-01T00:00:00.000Z",
        }),
        buildSpecies({ id: "y", dexNumber: 2 }),
      ],
    };

    const merged = mergeDex(base, incoming);
    expect(merged.species.map((s) => s.id).sort()).toEqual(["x", "y"]);

    const x = merged.species.find((s) => s.id === "x");
    expect(x?.encounters).toHaveLength(2);
    expect(x?.status).toBe("nemesis"); // most-progressed status wins
    expect(x?.dexNumber).toBe(1); // lowest assigned number kept
    expect(x?.firstSeen).toBe("2026-01-01T00:00:00.000Z");
    expect(x?.lastSeen).toBe("2026-02-01T00:00:00.000Z");
  });

  it("keeps a seal when either side is sealed", () => {
    const sealed = buildSpecies({
      id: "x",
      status: "sealed",
      seal: {
        kind: "test",
        reference: "tests/guard.test.ts",
        sealedAt: "2026-03-01T00:00:00.000Z",
      },
    });
    const plain = buildSpecies({
      id: "x",
      status: "recurring",
      lastSeen: "2026-04-01T00:00:00.000Z",
    });
    const merged = mergeDex({ version: 1, species: [plain] }, { version: 1, species: [sealed] });
    const x = merged.species.find((s) => s.id === "x");
    expect(x?.status).toBe("sealed");
    expect(x?.seal?.reference).toBe("tests/guard.test.ts");
  });
});
