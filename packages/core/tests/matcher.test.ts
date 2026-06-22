import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDex } from "../src/storage/dex.js";
import { matchFile } from "../src/matcher/matcher.js";
import type { Dex } from "../src/schema/index.js";
import { isLikelySafeRegex, compileRegex } from "../src/matcher/regex-safety.js";
import { languageForFile, languageMatches } from "../src/matcher/language.js";
import { STRUCTURAL_RULES, type StructuralContext } from "../src/matcher/structural.js";
import { FIXTURES_DIR } from "./helpers.js";

let dex: Dex;

beforeAll(async () => {
  const result = await loadDex(join(FIXTURES_DIR, "dex.json"));
  expect(result.quarantined).toHaveLength(0); // the seeded dex is valid
  dex = result.dex;
});

async function idsFor(sample: string): Promise<string[]> {
  const file = join(FIXTURES_DIR, "samples", sample);
  const content = await readFile(file, "utf8");
  return matchFile({ file, content, dex }).map((m) => m.speciesId);
}

describe("matcher against fixtures", () => {
  it("ships seven catalogued species", () => {
    expect(dex.species).toHaveLength(7);
  });

  it("flags SQL injection (regex)", async () => {
    expect(await idsFor("sql_injection.ts")).toContain("parselmouth");
  });

  it("flags weak hashing and insecure randomness in one file", async () => {
    const ids = await idsFor("weak_crypto.ts");
    expect(ids).toContain("hashwraith");
    expect(ids).toContain("randoghast");
  });

  it("flags hardcoded secrets", async () => {
    expect(await idsFor("secrets.ts")).toContain("ghostkey");
  });

  it("flags an unguarded env dereference", async () => {
    expect(await idsFor("null_env.ts")).toContain("voidling");
  });

  it("flags loose equality (structural rule)", async () => {
    expect(await idsFor("loose_eq.js")).toContain("moongaze");
  });

  it("flags debug-in-source (python)", async () => {
    expect(await idsFor("settings.py")).toContain("debugmon");
  });

  it("finds nothing in a clean file (no false positives)", async () => {
    const file = join(FIXTURES_DIR, "samples", "clean.ts");
    const content = await readFile(file, "utf8");
    expect(matchFile({ file, content, dex })).toHaveLength(0);
  });

  it("reports high confidence with a line number and a fix", async () => {
    const file = join(FIXTURES_DIR, "samples", "sql_injection.ts");
    const content = await readFile(file, "utf8");
    const match = matchFile({ file, content, dex }).find((m) => m.speciesId === "parselmouth");
    expect(match?.confidence).toBe("high");
    expect(match?.line).toBeGreaterThan(0);
    expect(match?.fix.summary).toBeTruthy();
  });

  it("honours enabledTypes filtering", async () => {
    const file = join(FIXTURES_DIR, "samples", "weak_crypto.ts");
    const content = await readFile(file, "utf8");
    const matches = matchFile({ file, content, dex, config: { enabledTypes: ["null"] } });
    expect(matches).toHaveLength(0); // crypto disabled
  });
});

describe("regex safety", () => {
  it("accepts simple patterns and rejects catastrophic ones", () => {
    expect(isLikelySafeRegex("createHash\\(['\"]md5['\"]\\)")).toBe(true);
    expect(isLikelySafeRegex("(a+)+")).toBe(false);
    expect(isLikelySafeRegex("(.*)*")).toBe(false);
    expect(isLikelySafeRegex("a".repeat(1001))).toBe(false);
  });

  it("compiles defensively, stripping global/sticky flags", () => {
    expect(compileRegex("(")).toBeNull();
    expect(compileRegex("a", "gi")?.flags).toBe("i");
  });
});

describe("language matching", () => {
  it("maps extensions to languages", () => {
    expect(languageForFile("a.ts")).toBe("typescript");
    expect(languageForFile("a.py")).toBe("python");
    expect(languageForFile("a.txt")).toBeUndefined();
  });

  it("lets TypeScript inherit JavaScript signatures", () => {
    expect(languageMatches("typescript", ["javascript"])).toBe(true);
    expect(languageMatches("python", ["javascript"])).toBe(false);
    expect(languageMatches(undefined, undefined)).toBe(true);
    expect(languageMatches(undefined, ["python"])).toBe(false);
  });
});

describe("structural rules", () => {
  const ctx = (text: string): StructuralContext => ({
    content: text,
    lines: text.split("\n"),
    language: "javascript",
  });

  it("loose-equality flags == / != but not === / !==", () => {
    expect(STRUCTURAL_RULES["loose-equality"](ctx("if (a == b) {}"))).toBe(1);
    expect(STRUCTURAL_RULES["loose-equality"](ctx("if (a === b) {}"))).toBeUndefined();
    expect(STRUCTURAL_RULES["loose-equality"](ctx("const x = 5;"))).toBeUndefined();
    expect(STRUCTURAL_RULES["loose-equality"](ctx("a === b\nc != d"))).toBe(2);
  });
});
