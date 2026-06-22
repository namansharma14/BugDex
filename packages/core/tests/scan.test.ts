import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import {
  snippetToRegex,
  generateSignature,
  findCoveringSpecies,
  collectScan,
  type Candidate,
} from "../src/scan/index.js";
import { catchFromScan } from "../src/commands/catch.js";
import { matchFile } from "../src/matcher/matcher.js";
import { loadDex } from "../src/storage/dex.js";
import { resolvePaths } from "../src/storage/paths.js";
import { init } from "../src/storage/init.js";
import type { Dex } from "../src/schema/index.js";
import { buildSpecies, makeTempRepo, cleanup, FIXTURES_DIR } from "./helpers.js";

describe("signature generation", () => {
  it("escapes metacharacters and flexes whitespace", () => {
    expect(snippetToRegex("db.query( x + y )")).toBe("db\\.query\\(\\s+x\\s+\\+\\s+y\\s+\\)");
  });

  it("prefers a supplied signature", () => {
    const signature = { kind: "regex", pattern: "foo" } as const;
    expect(generateSignature({ commonName: "x", type: "logic", signature })).toEqual(signature);
  });

  it("auto-generates a safe, language-scoped regex from a snippet", () => {
    const sig = generateSignature({
      commonName: "x",
      type: "memory",
      file: "a.ts",
      snippet: "memcpy(dst, src, n)",
    });
    expect(sig?.kind).toBe("regex");
    expect(sig).toMatchObject({ languages: ["typescript"] });
  });

  it("returns undefined with neither signature nor snippet", () => {
    expect(generateSignature({ commonName: "x", type: "logic" })).toBeUndefined();
  });
});

describe("findCoveringSpecies", () => {
  const dex: Dex = {
    version: 1,
    species: [
      buildSpecies({
        id: "rng",
        type: "crypto",
        signatures: [
          {
            kind: "regex",
            pattern: "Math\\.random\\(\\)",
            languages: ["typescript", "javascript"],
          },
        ],
      }),
    ],
  };

  it("matches an identical signature", () => {
    const c: Candidate = {
      commonName: "x",
      type: "crypto",
      signature: {
        kind: "regex",
        pattern: "Math\\.random\\(\\)",
        languages: ["typescript", "javascript"],
      },
    };
    expect(findCoveringSpecies(c, dex)?.id).toBe("rng");
  });

  it("matches a snippet an existing signature already catches", () => {
    const c: Candidate = {
      commonName: "x",
      type: "crypto",
      file: "a.ts",
      snippet: "const id = Math.random();",
    };
    expect(findCoveringSpecies(c, dex)?.id).toBe("rng");
  });

  it("returns undefined for a novel candidate", () => {
    const c: Candidate = {
      commonName: "x",
      type: "memory",
      file: "a.ts",
      snippet: "free(ptr); use(ptr);",
    };
    expect(findCoveringSpecies(c, dex)).toBeUndefined();
  });
});

describe("collectScan", () => {
  let repo: string;
  beforeEach(async () => {
    repo = await makeTempRepo();
    await init({ root: repo });
  });
  afterEach(async () => {
    await cleanup(repo);
  });

  it("collects files and a dex summary in path mode", async () => {
    await writeFile(join(repo, "a.ts"), "const x = Math.random();\n", "utf8");
    const col = await collectScan({ root: repo, paths: [join(repo, "a.ts")] });
    expect(col.mode).toBe("path");
    expect(col.files.map((f) => f.file)).toContain(join(repo, "a.ts"));
    expect(col.files[0].language).toBe("typescript");
    expect(col.dexSummary.count).toBe(0);
  });

  it("does not crash outside a git repo (diff mode)", async () => {
    const col = await collectScan({ root: repo });
    expect(col.mode).toBe("diff");
    expect(Array.isArray(col.files)).toBe(true);
  });
});

describe("catchFromScan", () => {
  let repo: string;
  const now = new Date("2026-06-01T12:00:00.000Z");
  beforeEach(async () => {
    repo = await makeTempRepo();
    await init({ root: repo });
  });
  afterEach(async () => {
    await cleanup(repo);
  });

  it("catalogues a novel candidate with a signature the fast matcher then recognises", async () => {
    const candidate = {
      commonName: "Use-after-free",
      type: "memory",
      severity: 4,
      file: "a.ts",
      snippet: "free(ptr); use(ptr);",
      fix: { summary: "Do not use a pointer after freeing it." },
    };
    const res = await catchFromScan({ root: repo, json: JSON.stringify(candidate), now });

    expect(res.added).toHaveLength(1);
    expect(res.skipped).toHaveLength(0);
    const species = res.added[0].species;
    expect(species.signatures.length).toBeGreaterThan(0);
    expect(species.rarity).toBe("rare"); // severity 4

    const { dex } = await loadDex(resolvePaths(repo).dex);
    const matches = matchFile({ file: "a.ts", content: "free(ptr); use(ptr);", dex });
    expect(matches.map((m) => m.speciesId)).toContain(species.id);
  });

  it("de-dupes a candidate already covered, recording an encounter instead", async () => {
    await copyFile(join(FIXTURES_DIR, "dex.json"), resolvePaths(repo).dex);
    const candidate = {
      commonName: "insecure rng",
      type: "crypto",
      file: "a.ts",
      snippet: "const id = Math.random();",
    };
    const res = await catchFromScan({ root: repo, json: JSON.stringify(candidate), now });

    expect(res.added).toHaveLength(0);
    expect(res.skipped[0]?.coveredBy).toBe("randoghast");
    const { dex } = await loadDex(resolvePaths(repo).dex);
    expect(dex.species.find((s) => s.id === "randoghast")?.encounters).toHaveLength(1);
  });

  it("awards discovery XP scaled by rarity", async () => {
    const candidate = {
      commonName: "Remote code execution",
      type: "injection",
      severity: 5,
      signature: { kind: "regex", pattern: "eval\\(" },
    };
    const res = await catchFromScan({ root: repo, json: JSON.stringify(candidate), now });
    // legendary discover = 50 × 8 = 400, plus the first-day streak bonus (+5).
    expect(res.added[0].xpAwarded).toBe(405);
  });
});
