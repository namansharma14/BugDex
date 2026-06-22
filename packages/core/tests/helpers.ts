import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Species } from "../src/schema/index.js";

/** Create an isolated temp directory to act as a repo root. */
export async function makeTempRepo(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bugdex-"));
}

/** Recursively remove a temp directory. */
export async function cleanup(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

/** Build a valid {@link Species}, overriding any fields for the test at hand. */
export function buildSpecies(overrides: Partial<Species> = {}): Species {
  return {
    id: "voidling",
    dexNumber: 1,
    name: "VOIDLING",
    commonName: "Unguarded null dereference",
    type: "null",
    rarity: "common",
    severity: 2,
    description: "Accessing a property before a null check.",
    signatures: [{ kind: "regex", pattern: "\\.foo" }],
    fix: { summary: "Add a guard clause before deref." },
    status: "caught",
    encounters: [],
    firstSeen: "2026-01-01T00:00:00.000Z",
    lastSeen: "2026-01-01T00:00:00.000Z",
    tags: ["null-safety"],
    ...overrides,
  };
}
